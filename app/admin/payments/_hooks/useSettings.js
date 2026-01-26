// app/admin/payments/hooks/useSettings.js
// ISSY Admin - Settings Hook

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { API_URL } from '../_constants';
import { getAuthHeaders } from '../_helpers';

const DEFAULT_SETTINGS = {
  card_payments_enabled: true,
  proof_payments_enabled: true,
  bank_name: '',
  bank_account_number: '',
  bank_account_name: '',
  bank_instructions: '',
};

export function useSettings(t) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  /**
   * Fetch settings from API
   */
  const fetchSettings = useCallback(async () => {
    try {
      setLoadingSettings(true);
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_URL}/api/community-payments/settings`, { headers });
      const data = await response.json();

      if (data.success && data.data) {
        setSettings({
          card_payments_enabled: data.data.card_payments_enabled ?? true,
          proof_payments_enabled: data.data.proof_payments_enabled ?? true,
          bank_name: data.data.bank_name || '',
          bank_account_number: data.data.bank_account_number || '',
          bank_account_name: data.data.bank_account_name || '',
          bank_instructions: data.data.bank_instructions || '',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  /**
   * Save settings to API
   */
  const saveSettings = useCallback(async () => {
    setSavingSettings(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/community-payments/admin/settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(
          t('common.success', 'Éxito'),
          t('admin.payments.success.settingsSaved', 'Configuración guardada')
        );
        return true;
      } else {
        Alert.alert(t('common.error', 'Error'), data.error || t('admin.payments.errors.saveFailed', 'Error al guardar'));
        return false;
      }
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), t('admin.payments.errors.saveFailed', 'Error al guardar'));
      return false;
    } finally {
      setSavingSettings(false);
    }
  }, [settings, t]);

  /**
   * Update a single setting
   */
  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Update multiple settings at once
   */
  const updateSettings = useCallback((updates) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    // State
    settings,
    loadingSettings,
    savingSettings,
    
    // Actions
    fetchSettings,
    saveSettings,
    updateSetting,
    updateSettings,
    setSettings,
  };
}
