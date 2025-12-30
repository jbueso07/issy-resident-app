// app/admin/settings.js
// ISSY Resident App - Admin: Configuraciones (ProHome Dark Theme)

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
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.joinissy.com';

// ProHome Dark Theme Colors
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
  blue: '#3B82F6',
  pink: '#EC4899',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  border: 'rgba(255,255,255,0.1)',
};

const TABS = [
  { id: 'guard', label: 'Guard App', icon: 'shield-checkmark' },
  { id: 'location', label: 'Ubicación', icon: 'settings' },
  { id: 'users', label: 'Usuarios', icon: 'people' },
  { id: 'blacklist', label: 'Lista Negra', icon: 'ban' },
];

const SUSPENSION_REASONS = [
  { value: 'unpaid', label: 'Falta de Pago', icon: 'card' },
  { value: 'moved_out', label: 'Ya no reside', icon: 'home' },
  { value: 'rule_violation', label: 'Violación de Reglas', icon: 'warning' },
  { value: 'admin_suspended', label: 'Suspensión Admin', icon: 'shield' },
  { value: 'other', label: 'Otra Razón', icon: 'document-text' },
];

export default function AdminSettings() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('guard');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [guardSettings, setGuardSettings] = useState(null);
  const [locationSettings, setLocationSettings] = useState(null);
  const [usersPaymentStatus, setUsersPaymentStatus] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [overdueUsers, setOverdueUsers] = useState([]);

  // Modal states
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [suspensionHistory, setSuspensionHistory] = useState([]);

  // Form states
  const [suspendForm, setSuspendForm] = useState({
    reason: 'admin_suspended',
    message: '',
  });

  const [blacklistForm, setBlacklistForm] = useState({
    visitor_name: '',
    visitor_phone: '',
    visitor_id_number: '',
    reason: '',
    notes: '',
  });

  const userRole = profile?.role || user?.role || 'user';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);
  const locationId = profile?.location_id || user?.location_id;

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Acceso Denegado', 'No tienes permisos');
      router.back();
      return;
    }
    loadData();
  }, []);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const loadData = async () => {
    try {
      const headers = await getAuthHeaders();

      // Load guard settings
      const guardRes = await fetch(`${API_URL}/api/admin/guard-settings/${locationId}`, { headers });
      if (guardRes.ok) {
        const guardData = await guardRes.json();
        setGuardSettings(guardData.data || guardData);
      } else {
        setGuardSettings(getDefaultGuardSettings());
      }

      // Load location settings
      const locationRes = await fetch(`${API_URL}/api/admin/location-settings/${locationId}`, { headers });
      if (locationRes.ok) {
        const locationData = await locationRes.json();
        setLocationSettings(locationData.data || locationData);
      } else {
        setLocationSettings(getDefaultLocationSettings());
      }

      // Load users with payment status
      const usersRes = await fetch(`${API_URL}/api/admin/users/payment-status?location_id=${locationId}`, { headers });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const users = usersData.data || usersData || [];
        setUsersPaymentStatus(users);
        setOverdueUsers(users.filter(u => u.overdue_payments > 0));
      }

      // Load blacklist
      const blacklistRes = await fetch(`${API_URL}/api/admin/blacklist?location_id=${locationId}`, { headers });
      if (blacklistRes.ok) {
        const blacklistData = await blacklistRes.json();
        setBlacklist(blacklistData.data || blacklistData || []);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getDefaultGuardSettings = () => ({
    can_scan_qr: true,
    can_manual_entry: true,
    can_view_visitor_history: true,
    can_view_resident_directory: true,
    can_call_residents: true,
    can_register_incidents: true,
    can_upload_photos: true,
    can_register_vehicles: true,
    can_approve_visitors: true,
    can_deny_visitors: true,
    auto_approve_preregistered: true,
    alert_on_blacklisted: true,
    alert_on_expired_qr: true,
    alert_on_suspended_resident: true,
    panic_button_enabled: true,
    camera_mode: 'phone',
  });

  const getDefaultLocationSettings = () => ({
    auto_suspend_on_overdue: false,
    overdue_days_before_suspend: 30,
    overdue_payments_threshold: 2,
    send_payment_reminders: true,
    allow_visitor_preregistration: true,
    max_active_qr_per_user: 5,
    default_qr_validity_hours: 24,
    require_visitor_id: false,
    enable_announcements: true,
    enable_emergency_alerts: true,
    enable_amenity_reservations: true,
    max_reservations_per_week: 3,
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  // Guard settings handlers
  const handleGuardSettingChange = (key, value) => {
    setGuardSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveGuardSettings = async () => {
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/admin/guard-settings/${locationId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(guardSettings),
      });
      if (res.ok) {
        Alert.alert('Éxito', 'Configuración guardada');
      } else {
        Alert.alert('Error', 'No se pudo guardar');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  // Location settings handlers
  const handleLocationSettingChange = (key, value) => {
    setLocationSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveLocationSettings = async () => {
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/admin/location-settings/${locationId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(locationSettings),
      });
      if (res.ok) {
        Alert.alert('Éxito', 'Configuración guardada');
      } else {
        Alert.alert('Error', 'No se pudo guardar');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  // User suspension handlers
  const handleSuspendUser = async () => {
    if (!selectedUser) return;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/admin/users/${selectedUser.id}/suspend`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reason: suspendForm.reason,
          message: suspendForm.message,
        }),
      });

      if (res.ok) {
        Alert.alert('Éxito', 'Usuario suspendido');
        setShowSuspendModal(false);
        setSuspendForm({ reason: 'admin_suspended', message: '' });
        loadData();
      } else {
        Alert.alert('Error', 'No se pudo suspender');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo suspender');
    }
  };

  const handleReactivateUser = async (userId) => {
    Alert.alert(
      'Reactivar Usuario',
      '¿Estás seguro de reactivar este usuario?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reactivar',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const res = await fetch(`${API_URL}/api/admin/users/${userId}/reactivate`, {
                method: 'POST',
                headers,
              });
              if (res.ok) {
                Alert.alert('Éxito', 'Usuario reactivado');
                loadData();
              } else {
                Alert.alert('Error', 'No se pudo reactivar');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo reactivar');
            }
          }
        }
      ]
    );
  };

  const runAutoSuspension = async () => {
    Alert.alert(
      'Suspender Usuarios',
      `¿Suspender ${overdueUsers.length} usuarios con pagos vencidos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Suspender',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const res = await fetch(`${API_URL}/api/admin/users/auto-suspend`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ location_id: locationId }),
              });
              if (res.ok) {
                Alert.alert('Éxito', 'Usuarios suspendidos');
                loadData();
              } else {
                Alert.alert('Error', 'No se pudo completar');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo completar');
            }
          }
        }
      ]
    );
  };

  const viewSuspensionHistory = async (userId) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/suspension-history`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSuspensionHistory(data.data || data || []);
        setShowHistoryModal(true);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  // Blacklist handlers
  const handleAddToBlacklist = async () => {
    if (!blacklistForm.reason.trim()) {
      Alert.alert('Error', 'La razón es requerida');
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/admin/blacklist`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...blacklistForm, location_id: locationId }),
      });

      if (res.ok) {
        Alert.alert('Éxito', 'Agregado a lista negra');
        setShowBlacklistModal(false);
        setBlacklistForm({ visitor_name: '', visitor_phone: '', visitor_id_number: '', reason: '', notes: '' });
        loadData();
      } else {
        Alert.alert('Error', 'No se pudo agregar');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar');
    }
  };

  const handleRemoveFromBlacklist = async (id) => {
    Alert.alert(
      'Eliminar',
      '¿Eliminar de la lista negra?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const res = await fetch(`${API_URL}/api/admin/blacklist/${id}`, {
                method: 'DELETE',
                headers,
              });
              if (res.ok) {
                Alert.alert('Éxito', 'Eliminado de lista negra');
                loadData();
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          }
        }
      ]
    );
  };

  // Toggle component
  const SettingToggle = ({ label, description, value, onChange, icon }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingIconContainer}>
        <Ionicons name={icon || 'toggle'} size={20} color={COLORS.teal} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: COLORS.backgroundTertiary, true: COLORS.lime + '50' }}
        thumbColor={value ? COLORS.lime : COLORS.textMuted}
        ios_backgroundColor={COLORS.backgroundTertiary}
      />
    </View>
  );

  // Number input component
  const SettingNumber = ({ label, description, value, onChange, icon }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingIconContainer}>
        <Ionicons name={icon || 'options'} size={20} color={COLORS.teal} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <TextInput
        style={styles.numberInput}
        value={String(value || 0)}
        onChangeText={(text) => onChange(parseInt(text) || 0)}
        keyboardType="number-pad"
        placeholderTextColor={COLORS.textMuted}
      />
    </View>
  );

  if (loading && !guardSettings && !locationSettings) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Configuración</Text>
          <Text style={styles.headerSubtitle}>Administración</Text>
        </View>
        <View style={{ width: scale(40) }} />
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons 
              name={tab.icon} 
              size={16} 
              color={activeTab === tab.id ? COLORS.background : COLORS.textSecondary} 
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={COLORS.lime}
          />
        }
      >
        {/* Guard App Tab */}
        {activeTab === 'guard' && guardSettings && (
          <View>
            {/* Navigation to Access Process */}
            <TouchableOpacity
              style={styles.navigationButton}
              onPress={() => router.push(`/admin/access-process?locationId=${locationId}`)}
            >
              <View style={styles.navigationButtonIcon}>
                <Ionicons name="camera" size={24} color={COLORS.lime} />
              </View>
              <View style={styles.navigationButtonContent}>
                <Text style={styles.navigationButtonTitle}>Procesos de Acceso</Text>
                <Text style={styles.navigationButtonDescription}>
                  Configurar qué datos capturar al registrar visitantes
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="key" size={20} color={COLORS.lime} />
                <Text style={styles.sectionTitle}>Permisos de Acceso</Text>
              </View>
              <SettingToggle
                label="Escanear QR"
                description="Permitir escaneo de códigos"
                value={guardSettings.can_scan_qr}
                onChange={(v) => handleGuardSettingChange('can_scan_qr', v)}
                icon="qr-code"
              />
              <SettingToggle
                label="Entrada Manual"
                description="Registro sin QR"
                value={guardSettings.can_manual_entry}
                onChange={(v) => handleGuardSettingChange('can_manual_entry', v)}
                icon="create"
              />
              <SettingToggle
                label="Ver Historial"
                description="Historial de visitas"
                value={guardSettings.can_view_visitor_history}
                onChange={(v) => handleGuardSettingChange('can_view_visitor_history', v)}
                icon="time"
              />
              <SettingToggle
                label="Directorio Residentes"
                description="Ver lista de residentes"
                value={guardSettings.can_view_resident_directory}
                onChange={(v) => handleGuardSettingChange('can_view_resident_directory', v)}
                icon="people"
              />
              <SettingToggle
                label="Llamar Residentes"
                description="Llamadas directas"
                value={guardSettings.can_call_residents}
                onChange={(v) => handleGuardSettingChange('can_call_residents', v)}
                icon="call"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text" size={20} color={COLORS.purple} />
                <Text style={styles.sectionTitle}>Permisos de Registro</Text>
              </View>
              <SettingToggle
                label="Registrar Incidentes"
                description="Crear reportes"
                value={guardSettings.can_register_incidents}
                onChange={(v) => handleGuardSettingChange('can_register_incidents', v)}
                icon="alert-circle"
              />
              <SettingToggle
                label="Subir Fotos"
                description="Tomar fotografías"
                value={guardSettings.can_upload_photos}
                onChange={(v) => handleGuardSettingChange('can_upload_photos', v)}
                icon="camera"
              />
              <SettingToggle
                label="Registrar Vehículos"
                description="Capturar placas"
                value={guardSettings.can_register_vehicles}
                onChange={(v) => handleGuardSettingChange('can_register_vehicles', v)}
                icon="car"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.sectionTitle}>Aprobaciones</Text>
              </View>
              <SettingToggle
                label="Aprobar Visitantes"
                description="Permitir entrada"
                value={guardSettings.can_approve_visitors}
                onChange={(v) => handleGuardSettingChange('can_approve_visitors', v)}
                icon="checkmark"
              />
              <SettingToggle
                label="Denegar Visitantes"
                description="Rechazar entrada"
                value={guardSettings.can_deny_visitors}
                onChange={(v) => handleGuardSettingChange('can_deny_visitors', v)}
                icon="close"
              />
              <SettingToggle
                label="Auto-aprobar Pre-registrados"
                description="Aprobación automática"
                value={guardSettings.auto_approve_preregistered}
                onChange={(v) => handleGuardSettingChange('auto_approve_preregistered', v)}
                icon="flash"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="notifications" size={20} color={COLORS.warning} />
                <Text style={styles.sectionTitle}>Alertas</Text>
              </View>
              <SettingToggle
                label="Alerta Lista Negra"
                description="Visitante bloqueado"
                value={guardSettings.alert_on_blacklisted}
                onChange={(v) => handleGuardSettingChange('alert_on_blacklisted', v)}
                icon="ban"
              />
              <SettingToggle
                label="Alerta QR Expirado"
                description="Código vencido"
                value={guardSettings.alert_on_expired_qr}
                onChange={(v) => handleGuardSettingChange('alert_on_expired_qr', v)}
                icon="timer"
              />
              <SettingToggle
                label="Alerta Residente Suspendido"
                description="Usuario bloqueado"
                value={guardSettings.alert_on_suspended_resident}
                onChange={(v) => handleGuardSettingChange('alert_on_suspended_resident', v)}
                icon="person-remove"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="warning" size={20} color={COLORS.danger} />
                <Text style={styles.sectionTitle}>Emergencias</Text>
              </View>
              <SettingToggle
                label="Botón de Pánico"
                description="Permitir alertas de emergencia"
                value={guardSettings.panic_button_enabled ?? true}
                onChange={(v) => handleGuardSettingChange('panic_button_enabled', v)}
                icon="alert"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="videocam" size={20} color={COLORS.teal} />
                <Text style={styles.sectionTitle}>Configuración de Cámara</Text>
              </View>
              <View style={styles.cameraOptions}>
                {[
                  { value: 'phone', label: 'Teléfono', icon: 'phone-portrait' },
                  { value: 'ip_camera', label: 'Cámara IP', icon: 'videocam' },
                  { value: 'both', label: 'Ambas', icon: 'albums' },
                ].map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.cameraOption,
                      guardSettings.camera_mode === option.value && styles.cameraOptionActive
                    ]}
                    onPress={() => handleGuardSettingChange('camera_mode', option.value)}
                  >
                    <Ionicons 
                      name={option.icon} 
                      size={20} 
                      color={guardSettings.camera_mode === option.value ? COLORS.background : COLORS.textSecondary} 
                    />
                    <Text style={[
                      styles.cameraOptionText,
                      guardSettings.camera_mode === option.value && styles.cameraOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {(guardSettings.camera_mode === 'ip_camera' || guardSettings.camera_mode === 'both') && (
                <View style={styles.ipCameraConfig}>
                  <Text style={styles.inputLabel}>URL de Cámara IP</Text>
                  <TextInput
                    style={styles.input}
                    value={guardSettings.ip_camera_url || ''}
                    onChangeText={(v) => handleGuardSettingChange('ip_camera_url', v)}
                    placeholder="rtsp://192.168.1.100:554/stream"
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="none"
                  />
                  <Text style={styles.inputLabel}>Usuario</Text>
                  <TextInput
                    style={styles.input}
                    value={guardSettings.ip_camera_username || ''}
                    onChangeText={(v) => handleGuardSettingChange('ip_camera_username', v)}
                    placeholder="admin"
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="none"
                  />
                  <Text style={styles.inputLabel}>Contraseña</Text>
                  <TextInput
                    style={styles.input}
                    value={guardSettings.ip_camera_password || ''}
                    onChangeText={(v) => handleGuardSettingChange('ip_camera_password', v)}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry
                  />
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={saveGuardSettings}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.background} />
              ) : (
                <>
                  <Ionicons name="save" size={20} color={COLORS.background} />
                  <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Location Settings Tab */}
        {activeTab === 'location' && locationSettings && (
          <View>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="card" size={20} color={COLORS.warning} />
                <Text style={styles.sectionTitle}>Configuración de Pagos</Text>
              </View>
              <SettingToggle
                label="Auto-suspender por Mora"
                description="Suspender usuarios con pagos vencidos"
                value={locationSettings.auto_suspend_on_overdue}
                onChange={(v) => handleLocationSettingChange('auto_suspend_on_overdue', v)}
                icon="pause-circle"
              />
              <SettingNumber
                label="Días de Mora"
                description="Días antes de suspender"
                value={locationSettings.overdue_days_before_suspend}
                onChange={(v) => handleLocationSettingChange('overdue_days_before_suspend', v)}
                icon="calendar"
              />
              <SettingNumber
                label="Pagos Vencidos"
                description="Cantidad para suspender"
                value={locationSettings.overdue_payments_threshold}
                onChange={(v) => handleLocationSettingChange('overdue_payments_threshold', v)}
                icon="receipt"
              />
              <SettingToggle
                label="Recordatorios de Pago"
                description="Enviar notificaciones"
                value={locationSettings.send_payment_reminders}
                onChange={(v) => handleLocationSettingChange('send_payment_reminders', v)}
                icon="notifications"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.blue} />
                <Text style={styles.sectionTitle}>Control de Acceso</Text>
              </View>
              <SettingToggle
                label="Pre-registro de Visitantes"
                description="Permitir pre-registro"
                value={locationSettings.allow_visitor_preregistration}
                onChange={(v) => handleLocationSettingChange('allow_visitor_preregistration', v)}
                icon="person-add"
              />
              <SettingNumber
                label="QR Activos por Usuario"
                description="Máximo permitido"
                value={locationSettings.max_active_qr_per_user}
                onChange={(v) => handleLocationSettingChange('max_active_qr_per_user', v)}
                icon="qr-code"
              />
              <SettingNumber
                label="Validez de QR (horas)"
                description="Duración por defecto"
                value={locationSettings.default_qr_validity_hours}
                onChange={(v) => handleLocationSettingChange('default_qr_validity_hours', v)}
                icon="time"
              />
              <SettingToggle
                label="Requerir ID"
                description="Obligar identificación"
                value={locationSettings.require_visitor_id}
                onChange={(v) => handleLocationSettingChange('require_visitor_id', v)}
                icon="id-card"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="megaphone" size={20} color={COLORS.purple} />
                <Text style={styles.sectionTitle}>Comunicación</Text>
              </View>
              <SettingToggle
                label="Anuncios"
                description="Sistema de anuncios"
                value={locationSettings.enable_announcements}
                onChange={(v) => handleLocationSettingChange('enable_announcements', v)}
                icon="megaphone"
              />
              <SettingToggle
                label="Alertas de Emergencia"
                description="Botón de pánico"
                value={locationSettings.enable_emergency_alerts}
                onChange={(v) => handleLocationSettingChange('enable_emergency_alerts', v)}
                icon="warning"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar" size={20} color={COLORS.success} />
                <Text style={styles.sectionTitle}>Amenidades</Text>
              </View>
              <SettingToggle
                label="Reservaciones"
                description="Áreas comunes"
                value={locationSettings.enable_amenity_reservations}
                onChange={(v) => handleLocationSettingChange('enable_amenity_reservations', v)}
                icon="calendar"
              />
              <SettingNumber
                label="Reservaciones/Semana"
                description="Máximo por usuario"
                value={locationSettings.max_reservations_per_week}
                onChange={(v) => handleLocationSettingChange('max_reservations_per_week', v)}
                icon="repeat"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={saveLocationSettings}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.background} />
              ) : (
                <>
                  <Ionicons name="save" size={20} color={COLORS.background} />
                  <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <View>
            {/* Overdue Alert */}
            {overdueUsers.length > 0 && (
              <View style={styles.alertBanner}>
                <Ionicons name="warning" size={28} color={COLORS.warning} />
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>{overdueUsers.length} usuarios con pagos vencidos</Text>
                  <Text style={styles.alertSubtitle}>
                    Total: L {overdueUsers.reduce((sum, u) => sum + parseFloat(u.total_overdue || 0), 0).toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity style={styles.alertButton} onPress={runAutoSuspension}>
                  <Text style={styles.alertButtonText}>Suspender</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Users List */}
            {usersPaymentStatus.filter(u => u.role === 'user').map(usr => (
              <View key={usr.id} style={styles.userCard}>
                <View style={styles.userAvatarContainer}>
                  <View style={[styles.userAvatar, { backgroundColor: usr.is_active ? COLORS.success + '30' : COLORS.danger + '30' }]}>
                    <Text style={[styles.userAvatarText, { color: usr.is_active ? COLORS.success : COLORS.danger }]}>
                      {(usr.name || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{usr.name}</Text>
                  <Text style={styles.userEmail}>{usr.email}</Text>
                  <View style={styles.userMeta}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: usr.is_active ? COLORS.success + '20' : COLORS.danger + '20' }
                    ]}>
                      <Ionicons 
                        name={usr.is_active ? 'checkmark-circle' : 'close-circle'} 
                        size={12} 
                        color={usr.is_active ? COLORS.success : COLORS.danger} 
                      />
                      <Text style={[
                        styles.statusBadgeText,
                        { color: usr.is_active ? COLORS.success : COLORS.danger }
                      ]}>
                        {usr.is_active ? 'Activo' : 'Suspendido'}
                      </Text>
                    </View>
                    {usr.overdue_payments > 0 && (
                      <View style={[styles.statusBadge, { backgroundColor: COLORS.warning + '20' }]}>
                        <Ionicons name="alert-circle" size={12} color={COLORS.warning} />
                        <Text style={[styles.statusBadgeText, { color: COLORS.warning }]}>
                          {usr.overdue_payments} vencidos
                        </Text>
                      </View>
                    )}
                  </View>
                  {!usr.is_active && usr.suspension_reason && (
                    <Text style={styles.suspensionReason}>
                      Razón: {SUSPENSION_REASONS.find(r => r.value === usr.suspension_reason)?.label || usr.suspension_reason}
                    </Text>
                  )}
                </View>
                <View style={styles.userActions}>
                  {usr.is_active ? (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: COLORS.danger + '15' }]}
                      onPress={() => { setSelectedUser(usr); setShowSuspendModal(true); }}
                    >
                      <Ionicons name="pause-circle" size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: COLORS.success + '15' }]}
                      onPress={() => handleReactivateUser(usr.id)}
                    >
                      <Ionicons name="play-circle" size={16} color={COLORS.success} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: COLORS.teal + '15' }]}
                    onPress={() => { setSelectedUser(usr); viewSuspensionHistory(usr.id); }}
                  >
                    <Ionicons name="document-text" size={16} color={COLORS.teal} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {usersPaymentStatus.filter(u => u.role === 'user').length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No hay usuarios</Text>
              </View>
            )}
          </View>
        )}

        {/* Blacklist Tab */}
        {activeTab === 'blacklist' && (
          <View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowBlacklistModal(true)}
            >
              <Ionicons name="add-circle" size={20} color={COLORS.textPrimary} />
              <Text style={styles.addButtonText}>Agregar a Lista Negra</Text>
            </TouchableOpacity>

            {blacklist.map(item => (
              <View key={item.id} style={styles.blacklistCard}>
                <View style={styles.blacklistIcon}>
                  <Ionicons name="ban" size={24} color={COLORS.danger} />
                </View>
                <View style={styles.blacklistInfo}>
                  <Text style={styles.blacklistName}>{item.visitor_name || 'Sin nombre'}</Text>
                  {item.visitor_phone && (
                    <View style={styles.blacklistDetailRow}>
                      <Ionicons name="call" size={14} color={COLORS.textMuted} />
                      <Text style={styles.blacklistDetail}>{item.visitor_phone}</Text>
                    </View>
                  )}
                  {item.visitor_id_number && (
                    <View style={styles.blacklistDetailRow}>
                      <Ionicons name="id-card" size={14} color={COLORS.textMuted} />
                      <Text style={styles.blacklistDetail}>{item.visitor_id_number}</Text>
                    </View>
                  )}
                  <Text style={styles.blacklistReason}>{item.reason}</Text>
                  <Text style={styles.blacklistDate}>
                    {new Date(item.added_at).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveFromBlacklist(item.id)}
                >
                  <Ionicons name="trash" size={20} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))}

            {blacklist.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="ban-outline" size={64} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>Lista negra vacía</Text>
                <Text style={styles.emptySubtitle}>No hay visitantes bloqueados</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Suspend Modal */}
      <Modal
        visible={showSuspendModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSuspendModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSuspendModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Suspender Usuario</Text>
            <TouchableOpacity onPress={handleSuspendUser}>
              <Text style={styles.modalDone}>Confirmar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedUser && (
              <View style={styles.modalUserInfo}>
                <View style={[styles.modalUserAvatar, { backgroundColor: COLORS.danger + '30' }]}>
                  <Text style={[styles.modalUserAvatarText, { color: COLORS.danger }]}>
                    {(selectedUser.name || 'U')[0].toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.modalUserName}>{selectedUser.name}</Text>
                <Text style={styles.modalUserEmail}>{selectedUser.email}</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Razón de Suspensión</Text>
            {SUSPENSION_REASONS.map(reason => (
              <TouchableOpacity
                key={reason.value}
                style={[
                  styles.reasonOption,
                  suspendForm.reason === reason.value && styles.reasonOptionActive
                ]}
                onPress={() => setSuspendForm(prev => ({ ...prev, reason: reason.value }))}
              >
                <Ionicons 
                  name={reason.icon} 
                  size={20} 
                  color={suspendForm.reason === reason.value ? COLORS.danger : COLORS.textSecondary} 
                />
                <Text style={[
                  styles.reasonOptionText,
                  suspendForm.reason === reason.value && styles.reasonOptionTextActive
                ]}>
                  {reason.label}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.inputLabel}>Mensaje para el Usuario (opcional)</Text>
            <TextInput
              style={styles.textArea}
              value={suspendForm.message}
              onChangeText={(text) => setSuspendForm(prev => ({ ...prev, message: text }))}
              placeholder="Mensaje que verá el usuario..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Blacklist Modal */}
      <Modal
        visible={showBlacklistModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBlacklistModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowBlacklistModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Agregar a Lista Negra</Text>
            <TouchableOpacity onPress={handleAddToBlacklist}>
              <Text style={styles.modalDone}>Agregar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={blacklistForm.visitor_name}
              onChangeText={(text) => setBlacklistForm(prev => ({ ...prev, visitor_name: text }))}
              placeholder="Nombre del visitante"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.inputLabel}>Teléfono</Text>
            <TextInput
              style={styles.input}
              value={blacklistForm.visitor_phone}
              onChangeText={(text) => setBlacklistForm(prev => ({ ...prev, visitor_phone: text }))}
              placeholder="Teléfono"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Número de Identificación</Text>
            <TextInput
              style={styles.input}
              value={blacklistForm.visitor_id_number}
              onChangeText={(text) => setBlacklistForm(prev => ({ ...prev, visitor_id_number: text }))}
              placeholder="ID / DNI"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.inputLabel}>Razón *</Text>
            <TextInput
              style={styles.textArea}
              value={blacklistForm.reason}
              onChangeText={(text) => setBlacklistForm(prev => ({ ...prev, reason: text }))}
              placeholder="Razón por la que se agrega..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={2}
            />

            <Text style={styles.inputLabel}>Notas Adicionales</Text>
            <TextInput
              style={styles.textArea}
              value={blacklistForm.notes}
              onChangeText={(text) => setBlacklistForm(prev => ({ ...prev, notes: text }))}
              placeholder="Notas adicionales..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={2}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
              <Text style={styles.modalCancel}>Cerrar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Historial</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {suspensionHistory.length > 0 ? (
              suspensionHistory.map((item, index) => (
                <View key={index} style={styles.historyItem}>
                  <View style={[
                    styles.historyBadge,
                    { backgroundColor: item.action === 'suspended' ? COLORS.danger + '20' : COLORS.success + '20' }
                  ]}>
                    <Ionicons 
                      name={item.action === 'suspended' ? 'close-circle' : 'checkmark-circle'} 
                      size={14} 
                      color={item.action === 'suspended' ? COLORS.danger : COLORS.success} 
                    />
                    <Text style={[
                      styles.historyBadgeText,
                      { color: item.action === 'suspended' ? COLORS.danger : COLORS.success }
                    ]}>
                      {item.action === 'suspended' ? 'Suspendido' : 'Reactivado'}
                    </Text>
                  </View>
                  {item.reason && (
                    <Text style={styles.historyReason}>
                      Razón: {SUSPENSION_REASONS.find(r => r.value === item.reason)?.label || item.reason}
                    </Text>
                  )}
                  {item.message && <Text style={styles.historyMessage}>{item.message}</Text>}
                  <Text style={styles.historyDate}>
                    {new Date(item.performed_at).toLocaleString()}
                  </Text>
                  {item.performed_by_user && (
                    <Text style={styles.historyBy}>Por: {item.performed_by_user.name}</Text>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={64} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>Sin historial</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: scale(12), 
    color: COLORS.textSecondary, 
    fontSize: scale(14) 
  },

  // Header
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: scale(16), 
    paddingVertical: scale(12),
  },
  backButton: { 
    width: scale(40), 
    height: scale(40), 
    borderRadius: scale(20),
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitleContainer: { 
    flex: 1, 
    marginLeft: scale(12) 
  },
  headerTitle: { 
    fontSize: scale(18), 
    fontWeight: '700', 
    color: COLORS.textPrimary 
  },
  headerSubtitle: { 
    fontSize: scale(12), 
    color: COLORS.textSecondary, 
    marginTop: scale(2) 
  },

  // Tabs
  tabsContainer: { 
    flexGrow: 0, 
    maxHeight: scale(56),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabsContent: { 
    paddingHorizontal: scale(12), 
    paddingVertical: scale(8), 
    gap: scale(8), 
    alignItems: 'center' 
  },
  tab: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16), 
    paddingVertical: scale(10), 
    borderRadius: scale(12), 
    backgroundColor: COLORS.backgroundSecondary,
    gap: scale(6),
  },
  tabActive: { 
    backgroundColor: COLORS.lime 
  },
  tabText: { 
    fontSize: scale(13), 
    color: COLORS.textSecondary, 
    fontWeight: '500' 
  },
  tabTextActive: { 
    color: COLORS.background,
    fontWeight: '600',
  },

  // Content
  content: { 
    flex: 1 
  },
  scrollContent: { 
    padding: scale(16) 
  },

  // Sections
  section: { 
    backgroundColor: COLORS.backgroundSecondary, 
    borderRadius: scale(12), 
    marginBottom: scale(16), 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: scale(10),
  },
  sectionTitle: { 
    fontSize: scale(15), 
    fontWeight: '600', 
    color: COLORS.textPrimary,
  },

  // Settings
  settingRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: scale(14), 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border,
  },
  settingIconContainer: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    backgroundColor: COLORS.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  settingInfo: { 
    flex: 1, 
    marginRight: scale(12) 
  },
  settingLabel: { 
    fontSize: scale(14), 
    fontWeight: '500', 
    color: COLORS.textPrimary 
  },
  settingDescription: { 
    fontSize: scale(12), 
    color: COLORS.textSecondary, 
    marginTop: scale(2) 
  },
  numberInput: { 
    width: scale(60), 
    height: scale(36), 
    backgroundColor: COLORS.backgroundTertiary, 
    borderRadius: scale(8), 
    textAlign: 'center', 
    fontSize: scale(15), 
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Navigation Button
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    marginBottom: scale(16),
    padding: scale(16),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  navigationButtonIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(12),
    backgroundColor: COLORS.lime + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  navigationButtonContent: {
    flex: 1,
  },
  navigationButtonTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  navigationButtonDescription: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },

  // Camera Config
  cameraOptions: { 
    flexDirection: 'row', 
    padding: scale(16), 
    gap: scale(8) 
  },
  cameraOption: { 
    flex: 1, 
    paddingVertical: scale(12), 
    borderRadius: scale(10), 
    backgroundColor: COLORS.backgroundTertiary, 
    alignItems: 'center',
    gap: scale(6),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cameraOptionActive: { 
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  cameraOptionText: { 
    fontSize: scale(12), 
    color: COLORS.textSecondary, 
    fontWeight: '500' 
  },
  cameraOptionTextActive: { 
    color: COLORS.background 
  },
  ipCameraConfig: { 
    paddingHorizontal: scale(16), 
    paddingBottom: scale(16) 
  },

  // Save Button
  saveButton: { 
    flexDirection: 'row',
    backgroundColor: COLORS.lime, 
    padding: scale(16), 
    borderRadius: scale(12), 
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: scale(8),
    gap: scale(8),
  },
  saveButtonDisabled: { 
    opacity: 0.7 
  },
  saveButtonText: { 
    color: COLORS.background, 
    fontSize: scale(16), 
    fontWeight: '600' 
  },

  // Alert Banner
  alertBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.warning + '15', 
    borderRadius: scale(12), 
    padding: scale(14), 
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
  },
  alertContent: { 
    flex: 1,
    marginLeft: scale(12),
  },
  alertTitle: { 
    fontSize: scale(14), 
    fontWeight: '600', 
    color: COLORS.textPrimary 
  },
  alertSubtitle: { 
    fontSize: scale(13), 
    color: COLORS.textSecondary, 
    marginTop: scale(2) 
  },
  alertButton: { 
    backgroundColor: COLORS.warning, 
    paddingHorizontal: scale(14), 
    paddingVertical: scale(8), 
    borderRadius: scale(8) 
  },
  alertButtonText: { 
    color: COLORS.background, 
    fontSize: scale(13), 
    fontWeight: '600' 
  },

  // User Card
  userCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.backgroundSecondary, 
    borderRadius: scale(12), 
    padding: scale(14), 
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userAvatarContainer: {
    marginRight: scale(12),
  },
  userAvatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: scale(18),
    fontWeight: '600',
  },
  userInfo: { 
    flex: 1 
  },
  userName: { 
    fontSize: scale(15), 
    fontWeight: '600', 
    color: COLORS.textPrimary 
  },
  userEmail: { 
    fontSize: scale(13), 
    color: COLORS.textSecondary, 
    marginTop: scale(2) 
  },
  userMeta: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: scale(6), 
    marginTop: scale(8) 
  },
  statusBadge: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8), 
    paddingVertical: scale(4), 
    borderRadius: scale(6),
    gap: scale(4),
  },
  statusBadgeText: { 
    fontSize: scale(11), 
    fontWeight: '500' 
  },
  suspensionReason: { 
    fontSize: scale(12), 
    color: COLORS.danger, 
    marginTop: scale(6) 
  },
  userActions: { 
    flexDirection: 'column', 
    gap: scale(6) 
  },
  actionButton: { 
    width: scale(36),
    height: scale(36),
    borderRadius: scale(8), 
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Add Button
  addButton: { 
    flexDirection: 'row',
    backgroundColor: COLORS.danger, 
    padding: scale(14), 
    borderRadius: scale(12), 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: scale(16),
    gap: scale(8),
  },
  addButtonText: { 
    color: COLORS.textPrimary, 
    fontSize: scale(15), 
    fontWeight: '600' 
  },

  // Blacklist Card
  blacklistCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.backgroundSecondary, 
    borderRadius: scale(12), 
    padding: scale(14), 
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  blacklistIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.danger + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  blacklistInfo: { 
    flex: 1 
  },
  blacklistName: { 
    fontSize: scale(15), 
    fontWeight: '600', 
    color: COLORS.textPrimary 
  },
  blacklistDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: scale(4),
  },
  blacklistDetail: { 
    fontSize: scale(13), 
    color: COLORS.textSecondary,
  },
  blacklistReason: { 
    fontSize: scale(13), 
    color: COLORS.danger, 
    marginTop: scale(6) 
  },
  blacklistDate: { 
    fontSize: scale(12), 
    color: COLORS.textMuted, 
    marginTop: scale(4) 
  },
  removeButton: { 
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    backgroundColor: COLORS.danger + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty
  emptyContainer: { 
    alignItems: 'center', 
    paddingVertical: scale(40) 
  },
  emptyTitle: { 
    fontSize: scale(16), 
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: scale(16),
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.textMuted,
    marginTop: scale(4),
  },

  // Modal
  modalContainer: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  modalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: scale(16), 
    paddingVertical: scale(12), 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  modalCancel: { 
    fontSize: scale(16), 
    color: COLORS.textSecondary 
  },
  modalTitle: { 
    fontSize: scale(17), 
    fontWeight: '600', 
    color: COLORS.textPrimary 
  },
  modalDone: { 
    fontSize: scale(16), 
    color: COLORS.lime, 
    fontWeight: '600' 
  },
  modalContent: { 
    flex: 1, 
    padding: scale(16) 
  },
  modalUserInfo: { 
    alignItems: 'center', 
    marginBottom: scale(24) 
  },
  modalUserAvatar: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
  },
  modalUserAvatarText: {
    fontSize: scale(24),
    fontWeight: '600',
  },
  modalUserName: { 
    fontSize: scale(18), 
    fontWeight: '600', 
    color: COLORS.textPrimary 
  },
  modalUserEmail: { 
    fontSize: scale(14), 
    color: COLORS.textSecondary, 
    marginTop: scale(4) 
  },

  // Form
  inputLabel: { 
    fontSize: scale(14), 
    fontWeight: '600', 
    color: COLORS.textPrimary, 
    marginBottom: scale(8), 
    marginTop: scale(16) 
  },
  input: { 
    backgroundColor: COLORS.backgroundSecondary, 
    borderRadius: scale(10), 
    paddingHorizontal: scale(14), 
    paddingVertical: scale(12), 
    fontSize: scale(15), 
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: { 
    backgroundColor: COLORS.backgroundSecondary, 
    borderRadius: scale(10), 
    paddingHorizontal: scale(14), 
    paddingVertical: scale(12), 
    fontSize: scale(15), 
    color: COLORS.textPrimary, 
    minHeight: scale(80), 
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reasonOption: { 
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(14), 
    borderRadius: scale(10), 
    backgroundColor: COLORS.backgroundSecondary, 
    marginBottom: scale(8),
    gap: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reasonOptionActive: { 
    backgroundColor: COLORS.danger + '15', 
    borderColor: COLORS.danger 
  },
  reasonOptionText: { 
    fontSize: scale(15), 
    color: COLORS.textSecondary 
  },
  reasonOptionTextActive: { 
    color: COLORS.danger, 
    fontWeight: '500' 
  },

  // History
  historyItem: { 
    backgroundColor: COLORS.backgroundSecondary, 
    borderRadius: scale(10), 
    padding: scale(14), 
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyBadge: { 
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start', 
    paddingHorizontal: scale(10), 
    paddingVertical: scale(4), 
    borderRadius: scale(6), 
    marginBottom: scale(8),
    gap: scale(6),
  },
  historyBadgeText: { 
    fontSize: scale(13), 
    fontWeight: '500' 
  },
  historyReason: { 
    fontSize: scale(14), 
    color: COLORS.textPrimary, 
    marginBottom: scale(4) 
  },
  historyMessage: { 
    fontSize: scale(13), 
    color: COLORS.textSecondary, 
    marginBottom: scale(8) 
  },
  historyDate: { 
    fontSize: scale(12), 
    color: COLORS.textMuted 
  },
  historyBy: { 
    fontSize: scale(12), 
    color: COLORS.textMuted, 
    marginTop: scale(4) 
  },
});