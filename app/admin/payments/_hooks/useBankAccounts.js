// app/admin/payments/_hooks/useBankAccounts.js
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { getAuthHeaders } from '../_helpers';
import { API_URL, getDefaultBankAccountForm } from '../_constants';

export function useBankAccounts(locationId) {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState(null);
  const [bankAccountForm, setBankAccountForm] = useState(getDefaultBankAccountForm());

  const fetchBankAccounts = useCallback(async () => {
    if (!locationId) return;
    
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_URL}/api/community-payments/admin/bank-accounts?location_id=${locationId}`,
        { headers }
      );
      const data = await response.json();
      
      if (data.success) {
        setBankAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  const saveBankAccount = useCallback(async () => {
    if (!locationId) return false;
    
    if (!bankAccountForm.bank_name?.trim()) {
      Alert.alert('Error', 'El nombre del banco es requerido');
      return false;
    }
    if (!bankAccountForm.account_number?.trim()) {
      Alert.alert('Error', 'El número de cuenta es requerido');
      return false;
    }

    try {
      setSaving(true);
      const headers = await getAuthHeaders();
      
      const payload = {
        location_id: locationId,
        ...bankAccountForm,
      };

      const url = editingBankAccount
        ? `${API_URL}/api/community-payments/admin/bank-accounts/${editingBankAccount.id}`
        : `${API_URL}/api/community-payments/admin/bank-accounts`;
      
      const method = editingBankAccount ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Éxito', editingBankAccount ? 'Cuenta actualizada' : 'Cuenta agregada');
        setBankAccountForm(getDefaultBankAccountForm());
        setEditingBankAccount(null);
        fetchBankAccounts();
        return true;
      } else {
        Alert.alert('Error', data.error || 'Error al guardar');
        return false;
      }
    } catch (error) {
      console.error('Error saving bank account:', error);
      Alert.alert('Error', 'Error de conexión');
      return false;
    } finally {
      setSaving(false);
    }
  }, [locationId, bankAccountForm, editingBankAccount, fetchBankAccounts]);

  const deleteBankAccount = useCallback(async (accountId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_URL}/api/community-payments/admin/bank-accounts/${accountId}`,
        {
          method: 'DELETE',
          headers,
        }
      );
      const data = await response.json();

      if (data.success) {
        Alert.alert('Éxito', 'Cuenta eliminada');
        fetchBankAccounts();
        return true;
      } else {
        Alert.alert('Error', data.error || 'Error al eliminar');
        return false;
      }
    } catch (error) {
      console.error('Error deleting bank account:', error);
      Alert.alert('Error', 'Error de conexión');
      return false;
    }
  }, [fetchBankAccounts]);

  const setDefaultBankAccount = useCallback(async (accountId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_URL}/api/community-payments/admin/bank-accounts/${accountId}/default`,
        {
          method: 'POST',
          headers,
        }
      );
      const data = await response.json();

      if (data.success) {
        Alert.alert('Éxito', 'Cuenta predeterminada actualizada');
        fetchBankAccounts();
        return true;
      } else {
        Alert.alert('Error', data.error || 'Error al actualizar');
        return false;
      }
    } catch (error) {
      console.error('Error setting default:', error);
      Alert.alert('Error', 'Error de conexión');
      return false;
    }
  }, [fetchBankAccounts]);

  const editBankAccount = useCallback((account) => {
    setEditingBankAccount(account);
    setBankAccountForm({
      bank_name: account.bank_name || '',
      account_number: account.account_number || '',
      account_name: account.account_name || '',
      account_type: account.account_type || 'savings',
      instructions: account.instructions || '',
      is_default: account.is_default || false,
    });
  }, []);

  const resetBankAccountForm = useCallback(() => {
    setBankAccountForm(getDefaultBankAccountForm());
    setEditingBankAccount(null);
  }, []);

  const updateBankAccountForm = useCallback((updates) => {
    setBankAccountForm(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    bankAccounts,
    loading,
    saving,
    editingBankAccount,
    bankAccountForm,
    fetchBankAccounts,
    saveBankAccount,
    deleteBankAccount,
    setDefaultBankAccount,
    editBankAccount,
    resetBankAccountForm,
    updateBankAccountForm,
  };
}

export default useBankAccounts;
