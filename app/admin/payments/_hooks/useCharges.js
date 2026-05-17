// app/admin/payments/hooks/useCharges.js
// ISSY Admin - Charges Hook
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { API_URL, getDefaultFormData } from '../_constants';
import { getAuthHeaders, validateChargeForm, getPaymentTypeLabel } from '../_helpers';

/**
 * Stats agregadas server-side por cada cobro padre.
 * Sprint 2 D4 (backend): getCharges devuelve estas stats ya calculadas.
 * @typedef {Object} ChargeStats
 * @property {number} total_payments
 * @property {number} paid_count
 * @property {number} pending_count
 * @property {number} proof_submitted_count
 * @property {number} rejected_count
 * @property {number} cancelled_count
 * @property {number} total_amount_expected
 * @property {number} total_amount_collected
 */

/**
 * Cobro padre tal como lo expone el backend post-Sprint 2 D4.
 * Cada cobro masivo es UNA entrada (no aplanado por residente).
 * El detalle per-residente se obtiene con useChargePayments(chargeId).
 * @typedef {Object} Charge
 * @property {string} id
 * @property {string} title
 * @property {number} amount
 * @property {'active'|'cancelled'} status
 * @property {'all'|'specific'} applies_to
 * @property {boolean} is_recurring
 * @property {string|null} cancelled_at - ISO timestamp; null si no cancelado
 * @property {ChargeStats} stats
 */

export function useCharges(t, selectedLocationId) {
  const [charges, setCharges] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  
  // Users state for charge creation
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState(getDefaultFormData());
  /**
   * Fetch charges and stats from API.
   *
   * Sprint 2 D4: el endpoint /admin/charges ahora devuelve 1 entrada por cobro
   * padre con `stats` agregadas server-side (paid_count, pending_count,
   * total_amount_collected, etc.). NO se aplana por residente. Para detalle
   * per-residente usar useChargePayments(chargeId).
   *
   * @returns {Promise<{charges: Charge[], stats: object}>}
   */
  const fetchCharges = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      
      if (filter !== 'all') params.append('status', filter);
      if (selectedLocationId) params.append('location_id', selectedLocationId);
      
      const queryString = params.toString() ? '?' + params.toString() : '';
      
      const [chargesRes, statsRes] = await Promise.all([
        fetch(API_URL + '/api/community-payments/admin/charges' + queryString, { headers }),
        fetch(API_URL + '/api/community-payments/admin/stats' + queryString, { headers }),
      ]);
      const chargesData = await chargesRes.json();
      const statsData = await statsRes.json();
      if (chargesData.success) {
        setCharges(chargesData.data || []);
      }
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('Error fetching charges:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, selectedLocationId]);
  /**
   * Fetch users/residents for charge creation
   */
  const fetchUsers = useCallback(async () => {
    if (users.length > 0) return users;
    setLoadingUsers(true);
    try {
      const headers = await getAuthHeaders();
      const url = API_URL + '/api/community-payments/admin/residents' + (selectedLocationId ? '?location_id=' + selectedLocationId : '');
      const response = await fetch(url, { headers });
      const data = await response.json();
      if (data.success) {
        setUsers(data.data || []);
        return data.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    } finally {
      setLoadingUsers(false);
    }
  }, [selectedLocationId, users.length]);
  /**
   * Create a new charge
   */
  const createCharge = useCallback(async () => {
    const validation = validateChargeForm(formData, selectedUsers, t);
    if (!validation.valid) {
      Alert.alert(t('common.error', 'Error'), validation.error);
      return false;
    }
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      
      let userIds = [];
      if (formData.target === 'single') {
        userIds = [formData.user_id];
      } else if (formData.target === 'multiple') {
        userIds = selectedUsers.map(u => u.id);
      }
      const payload = {
        target: formData.target,
        user_ids: userIds,
        charge_type: formData.payment_type,
        title: formData.title || getPaymentTypeLabel(formData.payment_type, t),
        description: formData.description,
        amount: parseFloat(formData.amount),
        currency: 'HNL',
        due_date: formData.due_date,
        allowed_payment_methods: formData.allowed_payment_methods,
        location_id: selectedLocationId,
        is_recurring: formData.is_recurring || false,
        recurring_period: formData.is_recurring ? formData.recurring_period : null,
      };
      const response = await fetch(API_URL + '/api/community-payments/admin/charges', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const count = data.data?.charges_created || 1;
        Alert.alert(
          t('common.success', 'Éxito'),
          t('admin.payments.success.chargesCreated', { count }, 'Se crearon ' + count + ' cobro(s) exitosamente')
        );
        resetForm();
        fetchCharges();
        return true;
      } else {
        Alert.alert(t('common.error', 'Error'), data.error || t('admin.payments.errors.createFailed', 'Error al crear cobro'));
        return false;
      }
    } catch (error) {
      console.error('Error creating charge:', error);
      Alert.alert(t('common.error', 'Error'), t('admin.payments.errors.createFailed', 'Error al crear cobro'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [formData, selectedUsers, selectedLocationId, t, fetchCharges]);
  /**
   * Cancel a charge.
   *
   * Sprint 2 D7: la confirmación ahora la maneja el componente que llama
   * (típicamente ChargeDetailModal con CancelConfirmationModal), así que
   * el hook ya no muestra su propio Alert de confirmación. El reason
   * (opcional) se envía en el body del DELETE para que el backend lo
   * persista en community_charges.cancellation_reason.
   *
   * @param {Object} charge - cobro padre a cancelar
   * @param {string|null} [reason] - razón opcional
   * @returns {Promise<boolean>} true si éxito
   */
  const cancelCharge = useCallback(async (charge, reason = null) => {
    try {
      const headers = await getAuthHeaders();
      // Hotfix sistémico super admin: incluir location_id en body. El charge
      // trae location_id en su shape; si no, fallback a selectedLocationId del
      // hook context (mismo que usa createCharge en línea 144).
      const response = await fetch(
        API_URL + '/api/community-payments/admin/charges/' + charge.id,
        {
          method: 'DELETE',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason,
            location_id: charge.location_id || selectedLocationId || null,
          }),
        }
      );

      if (response.ok) {
        Alert.alert(
          t('common.success', 'Éxito'),
          t('admin.payments.success.chargeCancelled', 'Cobro cancelado')
        );
        fetchCharges();
        return true;
      }

      // Manejo fino de errores con switch sobre response.status (Sprint 2 D7)
      const json = await response.json().catch(() => ({}));
      let errorTitle = t('common.error', 'Error');
      let errorMessage =
        json.error || t('admin.payments.errors.cancelFailed', 'Error al cancelar');

      switch (response.status) {
        case 409:
          errorTitle = t('admin.payments.error.alreadyCancelled', 'Ya cancelado');
          errorMessage = t(
            'admin.payments.error.chargeAlreadyCancelledMsg',
            'Este cobro ya fue cancelado previamente.'
          );
          break;
        case 403:
          errorTitle = t('common.forbidden', 'Sin permisos');
          errorMessage = t(
            'admin.payments.error.noPermission',
            'No tenés permisos para esta acción.'
          );
          break;
        case 404:
          errorTitle = t('common.notFound', 'No encontrado');
          errorMessage = t(
            'admin.payments.error.chargeNotFound',
            'El cobro ya no existe o fue eliminado.'
          );
          break;
        case 500:
        case 502:
        case 503:
          errorTitle = t('common.serverError', 'Error del servidor');
          errorMessage = t(
            'admin.payments.error.serverRetry',
            'Algo falló del lado del servidor. Probá de nuevo en un momento.'
          );
          break;
      }

      Alert.alert(errorTitle, errorMessage);
      return false;
    } catch (error) {
      console.error('Error cancelling charge:', error);
      Alert.alert(
        t('common.error', 'Error'),
        t('admin.payments.errors.cancelFailed', 'Error al cancelar')
      );
      return false;
    }
  }, [t, fetchCharges]);
  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setFormData(getDefaultFormData());
    setSelectedUsers([]);
  }, []);
  /**
   * Clear users when location changes
   */
  const clearUsers = useCallback(() => {
    setUsers([]);
  }, []);
  /**
   * Handle user selection for charges
   */
  const handleSelectUser = useCallback((selectedUser) => {
    if (formData.target === 'single') {
      setFormData(prev => ({
        ...prev,
        user_id: selectedUser.id,
        user_name: selectedUser.name || selectedUser.full_name || selectedUser.email,
      }));
      return 'close';
    } else if (formData.target === 'multiple') {
      const alreadySelected = selectedUsers.find(u => u.id === selectedUser.id);
      if (alreadySelected) {
        setSelectedUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      } else {
        setSelectedUsers(prev => [...prev, selectedUser]);
      }
      return 'keep';
    }
  }, [formData.target, selectedUsers]);
  /**
   * Update form data
   */
  const updateFormData = useCallback((updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);
  /**
   * Refresh charges
   */
  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchCharges();
  }, [fetchCharges]);
  return {
    charges,
    stats,
    loading,
    refreshing,
    filter,
    saving,
    users,
    loadingUsers,
    selectedUsers,
    formData,
    fetchCharges,
    fetchUsers,
    createCharge,
    cancelCharge,
    resetForm,
    clearUsers,
    handleSelectUser,
    updateFormData,
    setFilter,
    setSelectedUsers,
    refresh,
  };
}
