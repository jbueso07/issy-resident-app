// app/admin/payments/hooks/useCharges.js
// ISSY Admin - Charges Hook

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { API_URL, getDefaultFormData } from '../_constants';
import { getAuthHeaders, validateChargeForm, getPaymentTypeLabel } from '../_helpers';

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
   * Fetch charges and stats from API
   */
  const fetchCharges = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      
      if (filter !== 'all') params.append('status', filter);
      if (selectedLocationId) params.append('location_id', selectedLocationId);
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      const [chargesRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/community-payments/admin/charges${queryString}`, { headers }),
        fetch(`${API_URL}/api/community-payments/admin/stats${queryString}`, { headers }),
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
      const url = `${API_URL}/api/community-payments/admin/residents${selectedLocationId ? `?location_id=${selectedLocationId}` : ''}`;
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
      };

      const response = await fetch(`${API_URL}/api/community-payments/admin/charges`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const count = data.data?.charges_created || 1;
        Alert.alert(
          t('common.success', 'Éxito'),
          t('admin.payments.success.chargesCreated', { count }, `Se crearon ${count} cobro(s) exitosamente`)
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
   * Cancel a charge
   */
  const cancelCharge = useCallback(async (charge) => {
    return new Promise((resolve) => {
      Alert.alert(
        t('admin.payments.cancelCharge', 'Cancelar Cobro'),
        t('admin.payments.cancelChargeConfirm', '¿Estás seguro de cancelar este cobro?'),
        [
          { text: t('common.no', 'No'), style: 'cancel', onPress: () => resolve(false) },
          {
            text: t('common.yes', 'Sí'),
            style: 'destructive',
            onPress: async () => {
              try {
                const headers = await getAuthHeaders();
                const response = await fetch(`${API_URL}/api/community-payments/admin/charges/${charge.id}`, {
                  method: 'DELETE',
                  headers,
                });

                if (response.ok) {
                  Alert.alert(t('common.success', 'Éxito'), t('admin.payments.success.chargeCancelled', 'Cobro cancelado'));
                  fetchCharges();
                  resolve(true);
                } else {
                  resolve(false);
                }
              } catch (error) {
                Alert.alert(t('common.error', 'Error'), t('admin.payments.errors.cancelFailed', 'Error al cancelar'));
                resolve(false);
              }
            },
          },
        ]
      );
    });
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
      return 'close'; // Signal to close picker
    } else if (formData.target === 'multiple') {
      const alreadySelected = selectedUsers.find(u => u.id === selectedUser.id);
      if (alreadySelected) {
        setSelectedUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      } else {
        setSelectedUsers(prev => [...prev, selectedUser]);
      }
      return 'keep'; // Signal to keep picker open
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
    // State
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
    
    // Actions
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
