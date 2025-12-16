// app/admin/settings.js
// ISSY Resident App - Admin: Configuraciones

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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.joinissy.com';

const COLORS = {
  primary: '#6366F1',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  navy: '#1A1A2E',
  white: '#FFFFFF',
  background: '#F3F4F6',
  gray: '#6B7280',
  grayLight: '#E5E7EB',
  grayLighter: '#F9FAFB',
};

const TABS = [
  { id: 'guard', label: '🔐 Guard App' },
  { id: 'location', label: '⚙️ Ubicación' },
  { id: 'users', label: '👥 Usuarios' },
  { id: 'blacklist', label: '🚫 Lista Negra' },
];

const SUSPENSION_REASONS = [
  { value: 'unpaid', label: '💰 Falta de Pago' },
  { value: 'moved_out', label: '🏠 Ya no reside' },
  { value: 'rule_violation', label: '⚠️ Violación de Reglas' },
  { value: 'admin_suspended', label: '🛡️ Suspensión Admin' },
  { value: 'other', label: '📝 Otra Razón' },
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
  }, [activeTab]);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const loadData = async () => {
    if (!locationId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      
      if (activeTab === 'guard') {
        const res = await fetch(`${API_URL}/api/admin/settings/guard-app/${locationId}`, { headers });
        const data = await res.json();
        setGuardSettings(data);
      } else if (activeTab === 'location') {
        const res = await fetch(`${API_URL}/api/admin/settings/location/${locationId}`, { headers });
        const data = await res.json();
        setLocationSettings(data);
      } else if (activeTab === 'users') {
        const res = await fetch(`${API_URL}/api/admin/users/payment-status?location_id=${locationId}`, { headers });
        const data = await res.json();
        setUsersPaymentStatus(Array.isArray(data) ? data : []);
        
        const overdueRes = await fetch(`${API_URL}/api/admin/payments/overdue?location_id=${locationId}`, { headers });
        const overdueData = await overdueRes.json();
        setOverdueUsers(Array.isArray(overdueData) ? overdueData : []);
      } else if (activeTab === 'blacklist') {
        const res = await fetch(`${API_URL}/api/admin/blacklist?location_id=${locationId}`, { headers });
        const data = await res.json();
        setBlacklist(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [activeTab]);

  // Guard Settings handlers
  const handleGuardSettingChange = (key, value) => {
    setGuardSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveGuardSettings = async () => {
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/admin/settings/guard-app/${locationId}`, {
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

  // Location Settings handlers
  const handleLocationSettingChange = (key, value) => {
    setLocationSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveLocationSettings = async () => {
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/admin/settings/location/${locationId}`, {
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
        body: JSON.stringify(suspendForm),
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
                body: JSON.stringify({ notes: 'Reactivado desde app móvil' }),
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

  const viewSuspensionHistory = async (userId) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/suspension-history`, { headers });
      const data = await res.json();
      setSuspensionHistory(Array.isArray(data) ? data : []);
      setShowHistoryModal(true);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar historial');
    }
  };

  const runAutoSuspension = async () => {
    Alert.alert(
      'Suspensión Automática',
      '¿Ejecutar suspensión automática por pagos vencidos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ejecutar',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const res = await fetch(`${API_URL}/api/admin/payments/auto-suspend`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ locationId }),
              });
              const data = await res.json();
              Alert.alert('Completado', `Usuarios suspendidos: ${data.suspended_count || 0}`);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'No se pudo ejecutar');
            }
          }
        }
      ]
    );
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
  const SettingToggle = ({ label, description, value, onChange }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: COLORS.grayLight, true: COLORS.primary + '50' }}
        thumbColor={value ? COLORS.primary : COLORS.gray}
      />
    </View>
  );

  // Number input component
  const SettingNumber = ({ label, description, value, onChange }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <TextInput
        style={styles.numberInput}
        value={String(value || 0)}
        onChangeText={(text) => onChange(parseInt(text) || 0)}
        keyboardType="number-pad"
      />
    </View>
  );

  if (loading && !guardSettings && !locationSettings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
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
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>⚙️ Configuración</Text>
          <Text style={styles.headerSubtitle}>Administración</Text>
        </View>
        <View style={{ width: 40 }} />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Guard App Tab */}
        {activeTab === 'guard' && guardSettings && (
          <View>
            {/* Procesos de Acceso - Nueva sección */}
            <TouchableOpacity
              style={styles.navigationButton}
              onPress={() => router.push(`/admin/access-process?locationId=${locationId}`)}
            >
              <View style={styles.navigationButtonContent}>
                <Text style={styles.navigationButtonTitle}>📷 Procesos de Acceso</Text>
                <Text style={styles.navigationButtonDescription}>Configurar qué datos capturar al registrar visitantes</Text>
              </View>
              <Text style={styles.navigationButtonArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Permisos de Acceso</Text>
              <SettingToggle
                label="Escanear QR"
                description="Permitir escaneo de códigos"
                value={guardSettings.can_scan_qr}
                onChange={(v) => handleGuardSettingChange('can_scan_qr', v)}
              />
              <SettingToggle
                label="Entrada Manual"
                description="Registro sin QR"
                value={guardSettings.can_manual_entry}
                onChange={(v) => handleGuardSettingChange('can_manual_entry', v)}
              />
              <SettingToggle
                label="Ver Historial"
                description="Historial de visitas"
                value={guardSettings.can_view_visitor_history}
                onChange={(v) => handleGuardSettingChange('can_view_visitor_history', v)}
              />
              <SettingToggle
                label="Directorio Residentes"
                description="Ver lista de residentes"
                value={guardSettings.can_view_resident_directory}
                onChange={(v) => handleGuardSettingChange('can_view_resident_directory', v)}
              />
              <SettingToggle
                label="Llamar Residentes"
                description="Llamadas directas"
                value={guardSettings.can_call_residents}
                onChange={(v) => handleGuardSettingChange('can_call_residents', v)}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Permisos de Registro</Text>
              <SettingToggle
                label="Registrar Incidentes"
                description="Crear reportes"
                value={guardSettings.can_register_incidents}
                onChange={(v) => handleGuardSettingChange('can_register_incidents', v)}
              />
              <SettingToggle
                label="Subir Fotos"
                description="Tomar fotografías"
                value={guardSettings.can_upload_photos}
                onChange={(v) => handleGuardSettingChange('can_upload_photos', v)}
              />
              <SettingToggle
                label="Registrar Vehículos"
                description="Capturar placas"
                value={guardSettings.can_register_vehicles}
                onChange={(v) => handleGuardSettingChange('can_register_vehicles', v)}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Aprobaciones</Text>
              <SettingToggle
                label="Aprobar Visitantes"
                description="Permitir entrada"
                value={guardSettings.can_approve_visitors}
                onChange={(v) => handleGuardSettingChange('can_approve_visitors', v)}
              />
              <SettingToggle
                label="Denegar Visitantes"
                description="Rechazar entrada"
                value={guardSettings.can_deny_visitors}
                onChange={(v) => handleGuardSettingChange('can_deny_visitors', v)}
              />
              <SettingToggle
                label="Auto-aprobar Pre-registrados"
                description="Aprobación automática"
                value={guardSettings.auto_approve_preregistered}
                onChange={(v) => handleGuardSettingChange('auto_approve_preregistered', v)}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Alertas</Text>
              <SettingToggle
                label="Alerta Lista Negra"
                description="Visitante bloqueado"
                value={guardSettings.alert_on_blacklisted}
                onChange={(v) => handleGuardSettingChange('alert_on_blacklisted', v)}
              />
              <SettingToggle
                label="Alerta QR Expirado"
                description="Código vencido"
                value={guardSettings.alert_on_expired_qr}
                onChange={(v) => handleGuardSettingChange('alert_on_expired_qr', v)}
              />
              <SettingToggle
                label="Alerta Residente Suspendido"
                description="Usuario bloqueado"
                value={guardSettings.alert_on_suspended_resident}
                onChange={(v) => handleGuardSettingChange('alert_on_suspended_resident', v)}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Emergencias</Text>
              <SettingToggle
                label="Botón de Pánico"
                description="Permitir alertas de emergencia"
                value={guardSettings.panic_button_enabled ?? true}
                onChange={(v) => handleGuardSettingChange('panic_button_enabled', v)}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={saveGuardSettings}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Guardando...' : '💾 Guardar Cambios'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Location Settings Tab */}
        {activeTab === 'location' && locationSettings && (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Configuración de Pagos</Text>
              <SettingToggle
                label="Auto-suspender por Mora"
                description="Suspender usuarios con pagos vencidos"
                value={locationSettings.auto_suspend_on_overdue}
                onChange={(v) => handleLocationSettingChange('auto_suspend_on_overdue', v)}
              />
              <SettingNumber
                label="Días de Mora"
                description="Días antes de suspender"
                value={locationSettings.overdue_days_before_suspend}
                onChange={(v) => handleLocationSettingChange('overdue_days_before_suspend', v)}
              />
              <SettingNumber
                label="Pagos Vencidos"
                description="Cantidad para suspender"
                value={locationSettings.overdue_payments_threshold}
                onChange={(v) => handleLocationSettingChange('overdue_payments_threshold', v)}
              />
              <SettingToggle
                label="Recordatorios de Pago"
                description="Enviar notificaciones"
                value={locationSettings.send_payment_reminders}
                onChange={(v) => handleLocationSettingChange('send_payment_reminders', v)}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Control de Acceso</Text>
              <SettingToggle
                label="Pre-registro de Visitantes"
                description="Permitir pre-registro"
                value={locationSettings.allow_visitor_preregistration}
                onChange={(v) => handleLocationSettingChange('allow_visitor_preregistration', v)}
              />
              <SettingNumber
                label="QR Activos por Usuario"
                description="Máximo permitido"
                value={locationSettings.max_active_qr_per_user}
                onChange={(v) => handleLocationSettingChange('max_active_qr_per_user', v)}
              />
              <SettingNumber
                label="Validez de QR (horas)"
                description="Duración por defecto"
                value={locationSettings.default_qr_validity_hours}
                onChange={(v) => handleLocationSettingChange('default_qr_validity_hours', v)}
              />
              <SettingToggle
                label="Requerir ID"
                description="Obligar identificación"
                value={locationSettings.require_visitor_id}
                onChange={(v) => handleLocationSettingChange('require_visitor_id', v)}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Comunicación</Text>
              <SettingToggle
                label="Anuncios"
                description="Sistema de anuncios"
                value={locationSettings.enable_announcements}
                onChange={(v) => handleLocationSettingChange('enable_announcements', v)}
              />
              <SettingToggle
                label="Alertas de Emergencia"
                description="Botón de pánico"
                value={locationSettings.enable_emergency_alerts}
                onChange={(v) => handleLocationSettingChange('enable_emergency_alerts', v)}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenidades</Text>
              <SettingToggle
                label="Reservaciones"
                description="Áreas comunes"
                value={locationSettings.enable_amenity_reservations}
                onChange={(v) => handleLocationSettingChange('enable_amenity_reservations', v)}
              />
              <SettingNumber
                label="Reservaciones/Semana"
                description="Máximo por usuario"
                value={locationSettings.max_reservations_per_week}
                onChange={(v) => handleLocationSettingChange('max_reservations_per_week', v)}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={saveLocationSettings}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Guardando...' : '💾 Guardar Cambios'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <View>
            {/* Overdue Alert */}
            {overdueUsers.length > 0 && (
              <View style={styles.alertBanner}>
                <Text style={styles.alertIcon}>⚠️</Text>
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
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{usr.name}</Text>
                  <Text style={styles.userEmail}>{usr.email}</Text>
                  <View style={styles.userMeta}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: usr.is_active ? COLORS.success + '20' : COLORS.danger + '20' }
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        { color: usr.is_active ? COLORS.success : COLORS.danger }
                      ]}>
                        {usr.is_active ? '✅ Activo' : '❌ Suspendido'}
                      </Text>
                    </View>
                    {usr.overdue_payments > 0 && (
                      <View style={[styles.statusBadge, { backgroundColor: COLORS.warning + '20' }]}>
                        <Text style={[styles.statusBadgeText, { color: COLORS.warning }]}>
                          ⚠️ {usr.overdue_payments} vencidos
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
                      <Text style={[styles.actionButtonText, { color: COLORS.danger }]}>Suspender</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: COLORS.success + '15' }]}
                      onPress={() => handleReactivateUser(usr.id)}
                    >
                      <Text style={[styles.actionButtonText, { color: COLORS.success }]}>Reactivar</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: COLORS.primary + '15' }]}
                    onPress={() => { setSelectedUser(usr); viewSuspensionHistory(usr.id); }}
                  >
                    <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>📋</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {usersPaymentStatus.filter(u => u.role === 'user').length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>👥</Text>
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
              <Text style={styles.addButtonText}>➕ Agregar a Lista Negra</Text>
            </TouchableOpacity>

            {blacklist.map(item => (
              <View key={item.id} style={styles.blacklistCard}>
                <View style={styles.blacklistInfo}>
                  <Text style={styles.blacklistName}>{item.visitor_name || 'Sin nombre'}</Text>
                  {item.visitor_phone && (
                    <Text style={styles.blacklistDetail}>📱 {item.visitor_phone}</Text>
                  )}
                  {item.visitor_id_number && (
                    <Text style={styles.blacklistDetail}>🪪 {item.visitor_id_number}</Text>
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
                  <Text style={styles.removeButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}

            {blacklist.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🚫</Text>
                <Text style={styles.emptyTitle}>Lista negra vacía</Text>
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
        <SafeAreaView style={styles.modalContainer}>
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
              placeholderTextColor={COLORS.gray}
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
        <SafeAreaView style={styles.modalContainer}>
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
              placeholderTextColor={COLORS.gray}
            />

            <Text style={styles.inputLabel}>Teléfono</Text>
            <TextInput
              style={styles.input}
              value={blacklistForm.visitor_phone}
              onChangeText={(text) => setBlacklistForm(prev => ({ ...prev, visitor_phone: text }))}
              placeholder="Teléfono"
              placeholderTextColor={COLORS.gray}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Número de Identificación</Text>
            <TextInput
              style={styles.input}
              value={blacklistForm.visitor_id_number}
              onChangeText={(text) => setBlacklistForm(prev => ({ ...prev, visitor_id_number: text }))}
              placeholder="ID / DNI"
              placeholderTextColor={COLORS.gray}
            />

            <Text style={styles.inputLabel}>Razón *</Text>
            <TextInput
              style={styles.textArea}
              value={blacklistForm.reason}
              onChangeText={(text) => setBlacklistForm(prev => ({ ...prev, reason: text }))}
              placeholder="Razón por la que se agrega..."
              placeholderTextColor={COLORS.gray}
              multiline
              numberOfLines={2}
            />

            <Text style={styles.inputLabel}>Notas Adicionales</Text>
            <TextInput
              style={styles.textArea}
              value={blacklistForm.notes}
              onChangeText={(text) => setBlacklistForm(prev => ({ ...prev, notes: text }))}
              placeholder="Notas adicionales..."
              placeholderTextColor={COLORS.gray}
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
        <SafeAreaView style={styles.modalContainer}>
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
                    <Text style={[
                      styles.historyBadgeText,
                      { color: item.action === 'suspended' ? COLORS.danger : COLORS.success }
                    ]}>
                      {item.action === 'suspended' ? '❌ Suspendido' : '✅ Reactivado'}
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
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.gray, fontSize: 14 },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: 24, color: COLORS.navy },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.navy },
  headerSubtitle: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  
  // Tabs
  tabsContainer: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight, flexGrow: 0, height: 52 },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: 'center' },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: COLORS.grayLighter, height: 36, justifyContent: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, color: COLORS.gray, fontWeight: '500' },
  tabTextActive: { color: COLORS.white },
  
  // Content
  content: { flex: 1 },
  scrollContent: { padding: 16 },
  
  // Sections
  section: { backgroundColor: COLORS.white, borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.navy, padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  
  // Settings
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.grayLighter },
  settingInfo: { flex: 1, marginRight: 12 },
  settingLabel: { fontSize: 15, fontWeight: '500', color: COLORS.navy },
  settingDescription: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  numberInput: { width: 60, height: 36, backgroundColor: COLORS.grayLighter, borderRadius: 8, textAlign: 'center', fontSize: 15, color: COLORS.navy },
  
  // Save Button
  saveButton: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  
  // Alert Banner
  alertBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.warning + '15', borderRadius: 12, padding: 14, marginBottom: 16 },
  alertIcon: { fontSize: 24, marginRight: 12 },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '600', color: COLORS.navy },
  alertSubtitle: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  alertButton: { backgroundColor: COLORS.warning, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  alertButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  
  // User Card
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 10 },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600', color: COLORS.navy },
  userEmail: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  userMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 12, fontWeight: '500' },
  suspensionReason: { fontSize: 12, color: COLORS.danger, marginTop: 6 },
  userActions: { flexDirection: 'column', gap: 6 },
  actionButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionButtonText: { fontSize: 12, fontWeight: '600' },
  
  // Add Button
  addButton: { backgroundColor: COLORS.danger, padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  addButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  
  // Blacklist Card
  blacklistCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 10 },
  blacklistInfo: { flex: 1 },
  blacklistName: { fontSize: 15, fontWeight: '600', color: COLORS.navy },
  blacklistDetail: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  blacklistReason: { fontSize: 13, color: COLORS.danger, marginTop: 6 },
  blacklistDate: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  removeButton: { padding: 10 },
  removeButtonText: { fontSize: 20 },
  
  // Empty
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 16, color: COLORS.gray },
  
  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.white },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  modalCancel: { fontSize: 16, color: COLORS.gray },
  modalTitle: { fontSize: 17, fontWeight: '600', color: COLORS.navy },
  modalDone: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  modalContent: { flex: 1, padding: 16 },
  modalUserInfo: { alignItems: 'center', marginBottom: 24 },
  modalUserName: { fontSize: 18, fontWeight: '600', color: COLORS.navy },
  modalUserEmail: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  
  // Form
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.navy, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: COLORS.grayLighter, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.navy },
  textArea: { backgroundColor: COLORS.grayLighter, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.navy, minHeight: 80, textAlignVertical: 'top' },
  reasonOption: { padding: 14, borderRadius: 10, backgroundColor: COLORS.grayLighter, marginBottom: 8 },
  reasonOptionActive: { backgroundColor: COLORS.primary + '20', borderWidth: 1, borderColor: COLORS.primary },
  reasonOptionText: { fontSize: 15, color: COLORS.gray },
  reasonOptionTextActive: { color: COLORS.primary, fontWeight: '500' },
  
  // History
  historyItem: { backgroundColor: COLORS.grayLighter, borderRadius: 10, padding: 14, marginBottom: 10 },
  historyBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  historyBadgeText: { fontSize: 13, fontWeight: '500' },
  historyReason: { fontSize: 14, color: COLORS.navy, marginBottom: 4 },
  historyMessage: { fontSize: 13, color: COLORS.gray, marginBottom: 8 },
  historyDate: { fontSize: 12, color: COLORS.gray },
  historyBy: { fontSize: 12, color: COLORS.gray, marginTop: 4 },

  // Navigation Button
  navigationButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.white, 
    marginBottom: 16, 
    padding: 16, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: COLORS.grayLight 
  },
  navigationButtonContent: { 
    flex: 1 
  },
  navigationButtonTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: COLORS.navy, 
    marginBottom: 4 
  },
  navigationButtonDescription: { 
    fontSize: 13, 
    color: COLORS.gray 
  },
  navigationButtonArrow: { 
    fontSize: 24, 
    color: COLORS.gray, 
    marginLeft: 8 
  },
});