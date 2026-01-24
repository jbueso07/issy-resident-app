// app/admin/payment-config.js
// ISSY Superadmin - Configuración de Pagos por Ubicación
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.joinissy.com';

const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  lime: '#D4FE48',
  teal: '#5DDED8',
  purple: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  error: '#EF4444',
  blue: '#3B82F6',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  border: 'rgba(255,255,255,0.1)',
  surface: '#1A2C2C',
};

export default function PaymentConfig() {
  const { t } = useTranslation();
  const { user, profile, isSuperAdmin } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locations, setLocations] = useState([]);
  
  // Modal states
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [configForm, setConfigForm] = useState({
    clinpays_api_token: '',
    card_payments_enabled: false,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (!isSuperAdmin()) {
      Alert.alert(
        t('common.accessDenied', 'Acceso Denegado'),
        t('superadmin.onlySuperadmin', 'Solo superadministradores pueden acceder a esta sección')
      );
      router.back();
      return;
    }
    fetchPaymentOverview();
  }, []);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchPaymentOverview = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/superadmin/payment-overview`, { headers });
      const data = await response.json();
      
      if (data.success) {
        setLocations(data.data || []);
      } else {
        Alert.alert(t('common.error', 'Error'), data.error || 'Error al cargar ubicaciones');
      }
    } catch (error) {
      console.error('Error fetching payment overview:', error);
      Alert.alert(t('common.error', 'Error'), 'Error de conexión');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openConfigModal = async (location) => {
    setSelectedLocation(location);
    setTestResult(null);
    
    // Fetch current config for this location
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/superadmin/locations/${location.id}/payment-config`, { headers });
      const data = await response.json();
      
      if (data.success) {
        setConfigForm({
          clinpays_api_token: '', // Never show existing token, only allow new input
          card_payments_enabled: data.data.card_payments_enabled || false,
        });
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    }
    
    setShowConfigModal(true);
  };

  const handleTestConnection = async () => {
    if (!configForm.clinpays_api_token && !selectedLocation?.has_clinpays_token) {
      Alert.alert(t('common.error', 'Error'), t('superadmin.enterTokenFirst', 'Ingresa el API token primero'));
      return;
    }

    setTesting(true);
    setTestResult(null);
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/superadmin/locations/${selectedLocation.id}/test-connection`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          api_token: configForm.clinpays_api_token || undefined, // Use existing if not provided
        }),
      });
      const data = await response.json();
      
      setTestResult({
        success: data.success,
        message: data.success 
          ? t('superadmin.connectionSuccess', 'Conexión exitosa') 
          : (data.error || t('superadmin.connectionFailed', 'Error de conexión')),
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: t('superadmin.connectionFailed', 'Error de conexión'),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!configForm.clinpays_api_token && !selectedLocation?.has_clinpays_token) {
      Alert.alert(t('common.error', 'Error'), t('superadmin.enterToken', 'Ingresa el API token de Clinpays'));
      return;
    }

    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      
      // Save credentials if provided
      if (configForm.clinpays_api_token) {
        const credResponse = await fetch(`${API_URL}/api/superadmin/locations/${selectedLocation.id}/payment-credentials`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            provider: 'clinpays',
            api_token: configForm.clinpays_api_token,
          }),
        });
        const credData = await credResponse.json();
        if (!credData.success) {
          Alert.alert(t('common.error', 'Error'), credData.error || 'Error al guardar credenciales');
          setSaving(false);
          return;
        }
      }

      // Update card payments status
      const statusResponse = await fetch(`${API_URL}/api/superadmin/locations/${selectedLocation.id}/card-payments`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          enabled: configForm.card_payments_enabled,
        }),
      });
      const statusData = await statusResponse.json();
      
      if (statusData.success) {
        Alert.alert(
          t('common.success', 'Éxito'),
          t('superadmin.configSaved', 'Configuración guardada correctamente')
        );
        setShowConfigModal(false);
        fetchPaymentOverview();
      } else {
        Alert.alert(t('common.error', 'Error'), statusData.error || 'Error al guardar');
      }
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const toggleCardPayments = async (location, enabled) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/superadmin/locations/${location.id}/card-payments`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ enabled }),
      });
      const data = await response.json();
      
      if (data.success) {
        fetchPaymentOverview();
      } else {
        Alert.alert(t('common.error', 'Error'), data.error || 'Error al actualizar');
      }
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), 'Error de conexión');
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPaymentOverview();
  }, []);

  const getStatusColor = (location) => {
    if (!location.has_clinpays_token) return COLORS.textMuted;
    if (location.card_payments_enabled) return COLORS.success;
    return COLORS.warning;
  };

  const getStatusText = (location) => {
    if (!location.has_clinpays_token) return t('superadmin.notConfigured', 'Sin configurar');
    if (location.card_payments_enabled) return t('superadmin.active', 'Activo');
    return t('superadmin.inactive', 'Inactivo');
  };

  const renderLocationCard = (location) => (
    <View key={location.id} style={styles.locationCard}>
      <View style={styles.locationHeader}>
        <View style={styles.locationInfo}>
          <Text style={styles.locationName}>{location.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(location) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(location) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(location) }]}>
              {getStatusText(location)}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.configButton}
          onPress={() => openConfigModal(location)}
        >
          <Ionicons name="settings-outline" size={20} color={COLORS.teal} />
        </TouchableOpacity>
      </View>

      <View style={styles.locationDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={18} color={COLORS.textMuted} />
          <Text style={styles.detailLabel}>{t('superadmin.cardPayments', 'Pagos con tarjeta')}:</Text>
          <Switch
            value={location.card_payments_enabled}
            onValueChange={(value) => toggleCardPayments(location, value)}
            trackColor={{ false: COLORS.border, true: COLORS.lime + '50' }}
            thumbColor={location.card_payments_enabled ? COLORS.lime : COLORS.textMuted}
            disabled={!location.has_clinpays_token}
          />
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="key-outline" size={18} color={COLORS.textMuted} />
          <Text style={styles.detailLabel}>{t('superadmin.clinpaysToken', 'Token Clinpays')}:</Text>
          <Text style={[styles.detailValue, { color: location.has_clinpays_token ? COLORS.success : COLORS.textMuted }]}>
            {location.has_clinpays_token 
              ? t('superadmin.configured', '✓ Configurado') 
              : t('superadmin.notSet', 'No configurado')}
          </Text>
        </View>

        {location.bank_accounts_count !== undefined && (
          <View style={styles.detailRow}>
            <Ionicons name="wallet-outline" size={18} color={COLORS.textMuted} />
            <Text style={styles.detailLabel}>{t('superadmin.bankAccounts', 'Cuentas bancarias')}:</Text>
            <Text style={styles.detailValue}>{location.bank_accounts_count}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderConfigModal = () => (
    <Modal
      visible={showConfigModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowConfigModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t('superadmin.configurePayments', 'Configurar Pagos')}
            </Text>
            <TouchableOpacity onPress={() => setShowConfigModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {selectedLocation && (
            <Text style={styles.modalSubtitle}>{selectedLocation.name}</Text>
          )}

          <ScrollView style={styles.modalBody}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="card" size={18} color={COLORS.teal} /> Clinpays
              </Text>
              <Text style={styles.sectionDescription}>
                {t('superadmin.clinpaysDescription', 'Ingresa el API token proporcionado por Clinpays para habilitar pagos con tarjeta en esta ubicación.')}
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('superadmin.apiToken', 'API Token')}</Text>
                <TextInput
                  style={styles.formInput}
                  value={configForm.clinpays_api_token}
                  onChangeText={(text) => setConfigForm({ ...configForm, clinpays_api_token: text })}
                  placeholder={selectedLocation?.has_clinpays_token 
                    ? t('superadmin.tokenPlaceholderExisting', '••••••••••••••• (ya configurado)') 
                    : t('superadmin.tokenPlaceholder', 'sk_live_xxxxx...')}
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={true}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={[styles.testButton, testing && styles.testButtonDisabled]}
                onPress={handleTestConnection}
                disabled={testing}
              >
                {testing ? (
                  <ActivityIndicator size="small" color={COLORS.teal} />
                ) : (
                  <>
                    <Ionicons name="flash-outline" size={18} color={COLORS.teal} />
                    <Text style={styles.testButtonText}>
                      {t('superadmin.testConnection', 'Probar Conexión')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {testResult && (
                <View style={[styles.testResult, testResult.success ? styles.testResultSuccess : styles.testResultError]}>
                  <Ionicons 
                    name={testResult.success ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={testResult.success ? COLORS.success : COLORS.error} 
                  />
                  <Text style={[styles.testResultText, { color: testResult.success ? COLORS.success : COLORS.error }]}>
                    {testResult.message}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="toggle" size={18} color={COLORS.purple} /> {t('superadmin.status', 'Estado')}
              </Text>
              
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>
                    {t('superadmin.enableCardPayments', 'Habilitar pagos con tarjeta')}
                  </Text>
                  <Text style={styles.toggleDescription}>
                    {t('superadmin.enableCardPaymentsDesc', 'Los residentes podrán pagar con tarjeta de crédito/débito')}
                  </Text>
                </View>
                <Switch
                  value={configForm.card_payments_enabled}
                  onValueChange={(value) => setConfigForm({ ...configForm, card_payments_enabled: value })}
                  trackColor={{ false: COLORS.border, true: COLORS.lime + '50' }}
                  thumbColor={configForm.card_payments_enabled ? COLORS.lime : COLORS.textMuted}
                />
              </View>
            </View>

            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color={COLORS.warning} />
              <Text style={styles.warningText}>
                {t('superadmin.credentialsWarning', 'Las credenciales se guardan de forma segura y encriptada. Asegúrate de probar la conexión antes de habilitar pagos.')}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowConfigModal(false)}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancelar')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveCredentials}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.background} />
              ) : (
                <Text style={styles.saveButtonText}>{t('common.save', 'Guardar')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
          <Text style={styles.loadingText}>{t('common.loading', 'Cargando...')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {t('superadmin.paymentConfig', 'Configuración de Pagos')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {t('superadmin.paymentConfigDesc', 'Gestiona credenciales por ubicación')}
          </Text>
        </View>
        <View style={styles.superadminBadge}>
          <Ionicons name="shield-checkmark" size={16} color={COLORS.purple} />
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{locations.length}</Text>
          <Text style={styles.summaryLabel}>{t('superadmin.totalLocations', 'Ubicaciones')}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { color: COLORS.success }]}>
            {locations.filter(l => l.card_payments_enabled).length}
          </Text>
          <Text style={styles.summaryLabel}>{t('superadmin.withCardPayments', 'Con tarjeta')}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { color: COLORS.warning }]}>
            {locations.filter(l => !l.has_clinpays_token).length}
          </Text>
          <Text style={styles.summaryLabel}>{t('superadmin.pending', 'Pendientes')}</Text>
        </View>
      </View>

      {/* Locations List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.lime}
          />
        }
      >
        {locations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              {t('superadmin.noLocations', 'No hay ubicaciones registradas')}
            </Text>
          </View>
        ) : (
          locations.map(renderLocationCard)
        )}
      </ScrollView>

      {renderConfigModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: scale(12),
    color: COLORS.textSecondary,
    fontSize: scale(14),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: scale(8),
    marginRight: scale(8),
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginTop: scale(2),
  },
  superadminBadge: {
    backgroundColor: COLORS.purple + '20',
    padding: scale(8),
    borderRadius: scale(20),
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: scale(16),
    gap: scale(12),
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: scale(16),
    borderRadius: scale(12),
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.lime,
  },
  summaryLabel: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    marginTop: scale(4),
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: scale(16),
  },
  locationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(6),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
    gap: scale(6),
  },
  statusDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  statusText: {
    fontSize: scale(12),
    fontWeight: '500',
  },
  configButton: {
    padding: scale(10),
    backgroundColor: COLORS.teal + '15',
    borderRadius: scale(10),
  },
  locationDetails: {
    gap: scale(12),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  detailLabel: {
    flex: 1,
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: scale(13),
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(48),
  },
  emptyText: {
    fontSize: scale(14),
    color: COLORS.textMuted,
    marginTop: scale(12),
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: scale(14),
    color: COLORS.teal,
    paddingHorizontal: scale(20),
    paddingBottom: scale(8),
  },
  modalBody: {
    padding: scale(20),
  },
  section: {
    marginBottom: scale(24),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  sectionDescription: {
    fontSize: scale(13),
    color: COLORS.textMuted,
    marginBottom: scale(16),
    lineHeight: scale(18),
  },
  formGroup: {
    marginBottom: scale(16),
  },
  formLabel: {
    fontSize: scale(13),
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: scale(8),
  },
  formInput: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    padding: scale(14),
    fontSize: scale(14),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(12),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: COLORS.teal,
    gap: scale(8),
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    color: COLORS.teal,
    fontSize: scale(14),
    fontWeight: '500',
  },
  testResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(12),
    borderRadius: scale(10),
    marginTop: scale(12),
    gap: scale(8),
  },
  testResultSuccess: {
    backgroundColor: COLORS.success + '15',
  },
  testResultError: {
    backgroundColor: COLORS.error + '15',
  },
  testResultText: {
    fontSize: scale(13),
    fontWeight: '500',
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundSecondary,
    padding: scale(16),
    borderRadius: scale(12),
  },
  toggleInfo: {
    flex: 1,
    marginRight: scale(12),
  },
  toggleLabel: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  toggleDescription: {
    fontSize: scale(12),
    color: COLORS.textMuted,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.warning + '10',
    padding: scale(14),
    borderRadius: scale(10),
    gap: scale(10),
    marginBottom: scale(20),
  },
  warningText: {
    flex: 1,
    fontSize: scale(12),
    color: COLORS.warning,
    lineHeight: scale(18),
  },
  modalFooter: {
    flexDirection: 'row',
    padding: scale(20),
    gap: scale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    flex: 1,
    padding: scale(16),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: scale(16),
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: scale(16),
    borderRadius: scale(12),
    backgroundColor: COLORS.lime,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.background,
    fontSize: scale(16),
    fontWeight: '600',
  },
});
