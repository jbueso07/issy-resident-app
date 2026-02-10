// app/admin/locations.js
// ISSY Admin - Gestión de Ubicaciones/Comunidades (Locations Management)

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useTranslation } from '../../src/hooks/useTranslation';
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
  blue: '#3B82F6',
  orange: '#F97316',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  border: 'rgba(255,255,255,0.1)',
};

const LOCATION_TYPES = [
  { id: 'residential', label: 'Residencial', icon: 'home', color: COLORS.teal },
  { id: 'commercial', label: 'Comercial', icon: 'business', color: COLORS.blue },
  { id: 'industrial', label: 'Industrial', icon: 'construct', color: COLORS.orange },
  { id: 'mixed', label: 'Mixto', icon: 'layers', color: COLORS.purple },
];

const TIMEZONES = [
  { id: 'America/Tegucigalpa', label: 'Honduras (UTC-6)' },
  { id: 'America/Guatemala', label: 'Guatemala (UTC-6)' },
  { id: 'America/El_Salvador', label: 'El Salvador (UTC-6)' },
  { id: 'America/Mexico_City', label: 'México Central (UTC-6)' },
  { id: 'America/Panama', label: 'Panamá (UTC-5)' },
  { id: 'America/Bogota', label: 'Colombia (UTC-5)' },
  { id: 'America/Lima', label: 'Perú (UTC-5)' },
  { id: 'America/New_York', label: 'Este USA (UTC-5)' },
  { id: 'America/Los_Angeles', label: 'Pacífico USA (UTC-8)' },
  { id: 'Europe/Madrid', label: 'España (UTC+1)' },
];

const DEFAULT_FORM = {
  name: '',
  type: 'residential',
  address: '',
  city: '',
  country: 'Honduras',
  timezone: 'America/Tegucigalpa',
  settings: {
    allow_visitor_qr: true,
    allow_resident_qr: true,
    require_photo_on_entry: false,
    require_photo_on_exit: false,
    max_active_qr_per_resident: 10,
    qr_default_duration_hours: 24,
    enable_patrols: true,
    enable_incidents: true,
    enable_announcements: true,
  },
};

export default function LocationsScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { t } = useTranslation();

  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'settings' | 'stats'

  // Check if user is superadmin
  const isSuperAdmin = user?.role === 'superadmin';

  const getAuthHeaders = useCallback(async () => {
    const storedToken = token || await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${storedToken}`,
    };
  }, [token]);

  const fetchLocations = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/locations`, { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al cargar ubicaciones');
      }

      setLocations(data.data || []);
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLocations(false);
  };

  const openCreateModal = () => {
    setFormData(DEFAULT_FORM);
    setModalMode('create');
    setActiveTab('info');
    setShowModal(true);
  };

  const openEditModal = (location) => {
    setSelectedLocation(location);
    setFormData({
      name: location.name || '',
      type: location.type || 'residential',
      address: location.address || '',
      city: location.city || '',
      country: location.country || 'Honduras',
      timezone: location.timezone || 'America/Tegucigalpa',
      settings: {
        ...DEFAULT_FORM.settings,
        ...(location.settings || {}),
      },
    });
    setModalMode('edit');
    setActiveTab('info');
    setShowModal(true);
  };

  const openViewModal = (location) => {
    setSelectedLocation(location);
    setModalMode('view');
    setActiveTab('info');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedLocation(null);
    setFormData(DEFAULT_FORM);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }
    if (!formData.address.trim()) {
      Alert.alert('Error', 'La dirección es requerida');
      return;
    }

    setIsSaving(true);
    try {
      const headers = await getAuthHeaders();
      const url = modalMode === 'create'
        ? `${API_URL}/api/locations`
        : `${API_URL}/api/locations/${selectedLocation.id}`;

      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al guardar');
      }

      Alert.alert(
        'Éxito',
        modalMode === 'create'
          ? 'Ubicación creada correctamente'
          : 'Ubicación actualizada correctamente'
      );

      closeModal();
      fetchLocations();
    } catch (err) {
      console.error('Error saving location:', err);
      Alert.alert('Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (location) => {
    Alert.alert(
      location.is_active ? 'Desactivar Ubicación' : 'Activar Ubicación',
      `¿Estás seguro de ${location.is_active ? 'desactivar' : 'activar'} "${location.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: location.is_active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(
                `${API_URL}/api/locations/${location.id}/toggle`,
                { method: 'PUT', headers }
              );

              if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Error al cambiar estado');
              }

              fetchLocations();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (location) => {
    Alert.alert(
      'Eliminar Ubicación',
      `¿Estás seguro de eliminar "${location.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(
                `${API_URL}/api/locations/${location.id}`,
                { method: 'DELETE', headers }
              );

              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.message || 'Error al eliminar');
              }

              Alert.alert('Éxito', 'Ubicación eliminada correctamente');
              fetchLocations();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const updateFormField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateSettingsField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      settings: { ...prev.settings, [field]: value },
    }));
  };

  const getTypeConfig = (type) => {
    return LOCATION_TYPES.find(t => t.id === type) || LOCATION_TYPES[0];
  };

  // Render location card
  const renderLocationCard = (location) => {
    const typeConfig = getTypeConfig(location.type);

    return (
      <TouchableOpacity
        key={location.id}
        style={[styles.card, !location.is_active && styles.cardInactive]}
        onPress={() => openViewModal(location)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: typeConfig.color + '20' }]}>
            <Ionicons name={typeConfig.icon} size={24} color={typeConfig.color} />
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>{location.name}</Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>{location.address}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: location.is_active ? COLORS.success + '20' : COLORS.danger + '20' }
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: location.is_active ? COLORS.success : COLORS.danger }
            ]} />
            <Text style={[
              styles.statusText,
              { color: location.is_active ? COLORS.success : COLORS.danger }
            ]}>
              {location.is_active ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
        </View>

        <View style={styles.cardStats}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={16} color={COLORS.textSecondary} />
            <Text style={styles.statValue}>{location.member_count || 0}</Text>
            <Text style={styles.statLabel}>Miembros</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="location" size={16} color={COLORS.textSecondary} />
            <Text style={styles.statValue}>{location.city || '-'}</Text>
            <Text style={styles.statLabel}>Ciudad</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="globe" size={16} color={COLORS.textSecondary} />
            <Text style={styles.statValue}>{typeConfig.label}</Text>
            <Text style={styles.statLabel}>Tipo</Text>
          </View>
        </View>

        {isSuperAdmin && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openEditModal(location)}
            >
              <Ionicons name="pencil" size={18} color={COLORS.blue} />
              <Text style={[styles.actionText, { color: COLORS.blue }]}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleToggleStatus(location)}
            >
              <Ionicons
                name={location.is_active ? 'pause-circle' : 'play-circle'}
                size={18}
                color={location.is_active ? COLORS.warning : COLORS.success}
              />
              <Text style={[
                styles.actionText,
                { color: location.is_active ? COLORS.warning : COLORS.success }
              ]}>
                {location.is_active ? 'Desactivar' : 'Activar'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(location)}
            >
              <Ionicons name="trash" size={18} color={COLORS.danger} />
              <Text style={[styles.actionText, { color: COLORS.danger }]}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render form modal
  const renderModal = () => (
    <Modal
      visible={showModal}
      animationType="slide"
      transparent={true}
      onRequestClose={closeModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {modalMode === 'create' ? 'Nueva Ubicación' :
               modalMode === 'edit' ? 'Editar Ubicación' : 'Detalles'}
            </Text>
            {modalMode !== 'view' && (
              <TouchableOpacity
                onPress={handleSave}
                style={styles.modalSaveBtn}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={COLORS.lime} />
                ) : (
                  <Text style={styles.modalSaveText}>Guardar</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'info' && styles.tabActive]}
              onPress={() => setActiveTab('info')}
            >
              <Ionicons
                name="information-circle"
                size={20}
                color={activeTab === 'info' ? COLORS.lime : COLORS.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
                Información
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
              onPress={() => setActiveTab('settings')}
            >
              <Ionicons
                name="settings"
                size={20}
                color={activeTab === 'settings' ? COLORS.lime : COLORS.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>
                Configuración
              </Text>
            </TouchableOpacity>
            {modalMode === 'view' && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
                onPress={() => setActiveTab('stats')}
              >
                <Ionicons
                  name="stats-chart"
                  size={20}
                  color={activeTab === 'stats' ? COLORS.lime : COLORS.textSecondary}
                />
                <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>
                  Estadísticas
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'info' && renderInfoTab()}
            {activeTab === 'settings' && renderSettingsTab()}
            {activeTab === 'stats' && modalMode === 'view' && renderStatsTab()}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderInfoTab = () => (
    <View style={styles.formSection}>
      {/* Name */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Nombre *</Text>
        <TextInput
          style={styles.input}
          value={modalMode === 'view' ? selectedLocation?.name : formData.name}
          onChangeText={(v) => updateFormField('name', v)}
          placeholder="Ej: Residencial Los Pinos"
          placeholderTextColor={COLORS.textMuted}
          editable={modalMode !== 'view'}
        />
      </View>

      {/* Type */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Tipo de Ubicación</Text>
        <View style={styles.typeSelector}>
          {LOCATION_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeOption,
                (modalMode === 'view' ? selectedLocation?.type : formData.type) === type.id &&
                  { borderColor: type.color, backgroundColor: type.color + '20' }
              ]}
              onPress={() => modalMode !== 'view' && updateFormField('type', type.id)}
              disabled={modalMode === 'view'}
            >
              <Ionicons name={type.icon} size={20} color={type.color} />
              <Text style={[styles.typeLabel, { color: type.color }]}>{type.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Address */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Dirección *</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={modalMode === 'view' ? selectedLocation?.address : formData.address}
          onChangeText={(v) => updateFormField('address', v)}
          placeholder="Dirección completa"
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={2}
          editable={modalMode !== 'view'}
        />
      </View>

      {/* City */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Ciudad</Text>
        <TextInput
          style={styles.input}
          value={modalMode === 'view' ? selectedLocation?.city : formData.city}
          onChangeText={(v) => updateFormField('city', v)}
          placeholder="Ej: Tegucigalpa"
          placeholderTextColor={COLORS.textMuted}
          editable={modalMode !== 'view'}
        />
      </View>

      {/* Country */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>País</Text>
        <TextInput
          style={styles.input}
          value={modalMode === 'view' ? selectedLocation?.country : formData.country}
          onChangeText={(v) => updateFormField('country', v)}
          placeholder="Ej: Honduras"
          placeholderTextColor={COLORS.textMuted}
          editable={modalMode !== 'view'}
        />
      </View>

      {/* Timezone */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Zona Horaria</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.timezoneSelector}>
            {TIMEZONES.map((tz) => (
              <TouchableOpacity
                key={tz.id}
                style={[
                  styles.timezoneOption,
                  (modalMode === 'view' ? selectedLocation?.timezone : formData.timezone) === tz.id &&
                    styles.timezoneOptionActive
                ]}
                onPress={() => modalMode !== 'view' && updateFormField('timezone', tz.id)}
                disabled={modalMode === 'view'}
              >
                <Text style={[
                  styles.timezoneText,
                  (modalMode === 'view' ? selectedLocation?.timezone : formData.timezone) === tz.id &&
                    styles.timezoneTextActive
                ]}>
                  {tz.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );

  const renderSettingsTab = () => {
    const settings = modalMode === 'view'
      ? (selectedLocation?.settings || {})
      : formData.settings;
    const isEditable = modalMode !== 'view';

    return (
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Control de Acceso</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Permitir QR de Visitantes</Text>
            <Text style={styles.settingDescription}>Los residentes pueden generar QR para visitantes</Text>
          </View>
          <Switch
            value={settings.allow_visitor_qr}
            onValueChange={(v) => isEditable && updateSettingsField('allow_visitor_qr', v)}
            trackColor={{ false: COLORS.backgroundTertiary, true: COLORS.lime + '50' }}
            thumbColor={settings.allow_visitor_qr ? COLORS.lime : COLORS.textMuted}
            disabled={!isEditable}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Permitir QR de Residentes</Text>
            <Text style={styles.settingDescription}>QR permanente para residentes</Text>
          </View>
          <Switch
            value={settings.allow_resident_qr}
            onValueChange={(v) => isEditable && updateSettingsField('allow_resident_qr', v)}
            trackColor={{ false: COLORS.backgroundTertiary, true: COLORS.lime + '50' }}
            thumbColor={settings.allow_resident_qr ? COLORS.lime : COLORS.textMuted}
            disabled={!isEditable}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Foto al Entrar</Text>
            <Text style={styles.settingDescription}>Requerir foto del visitante al entrar</Text>
          </View>
          <Switch
            value={settings.require_photo_on_entry}
            onValueChange={(v) => isEditable && updateSettingsField('require_photo_on_entry', v)}
            trackColor={{ false: COLORS.backgroundTertiary, true: COLORS.lime + '50' }}
            thumbColor={settings.require_photo_on_entry ? COLORS.lime : COLORS.textMuted}
            disabled={!isEditable}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Foto al Salir</Text>
            <Text style={styles.settingDescription}>Requerir foto del visitante al salir</Text>
          </View>
          <Switch
            value={settings.require_photo_on_exit}
            onValueChange={(v) => isEditable && updateSettingsField('require_photo_on_exit', v)}
            trackColor={{ false: COLORS.backgroundTertiary, true: COLORS.lime + '50' }}
            thumbColor={settings.require_photo_on_exit ? COLORS.lime : COLORS.textMuted}
            disabled={!isEditable}
          />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Límites</Text>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Máximo QR activos por residente</Text>
          <TextInput
            style={styles.input}
            value={String(settings.max_active_qr_per_resident || 10)}
            onChangeText={(v) => isEditable && updateSettingsField('max_active_qr_per_resident', parseInt(v) || 10)}
            keyboardType="numeric"
            editable={isEditable}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Duración por defecto del QR (horas)</Text>
          <TextInput
            style={styles.input}
            value={String(settings.qr_default_duration_hours || 24)}
            onChangeText={(v) => isEditable && updateSettingsField('qr_default_duration_hours', parseInt(v) || 24)}
            keyboardType="numeric"
            editable={isEditable}
          />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Módulos</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Rondines (Patrullas)</Text>
            <Text style={styles.settingDescription}>Habilitar sistema de rondines</Text>
          </View>
          <Switch
            value={settings.enable_patrols}
            onValueChange={(v) => isEditable && updateSettingsField('enable_patrols', v)}
            trackColor={{ false: COLORS.backgroundTertiary, true: COLORS.lime + '50' }}
            thumbColor={settings.enable_patrols ? COLORS.lime : COLORS.textMuted}
            disabled={!isEditable}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Incidentes</Text>
            <Text style={styles.settingDescription}>Habilitar reporte de incidentes</Text>
          </View>
          <Switch
            value={settings.enable_incidents}
            onValueChange={(v) => isEditable && updateSettingsField('enable_incidents', v)}
            trackColor={{ false: COLORS.backgroundTertiary, true: COLORS.lime + '50' }}
            thumbColor={settings.enable_incidents ? COLORS.lime : COLORS.textMuted}
            disabled={!isEditable}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Anuncios</Text>
            <Text style={styles.settingDescription}>Habilitar sistema de anuncios</Text>
          </View>
          <Switch
            value={settings.enable_announcements}
            onValueChange={(v) => isEditable && updateSettingsField('enable_announcements', v)}
            trackColor={{ false: COLORS.backgroundTertiary, true: COLORS.lime + '50' }}
            thumbColor={settings.enable_announcements ? COLORS.lime : COLORS.textMuted}
            disabled={!isEditable}
          />
        </View>
      </View>
    );
  };

  const renderStatsTab = () => {
    if (!selectedLocation) return null;

    return (
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Estadísticas de la Ubicación</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={28} color={COLORS.teal} />
            <Text style={styles.statCardValue}>{selectedLocation.member_count || 0}</Text>
            <Text style={styles.statCardLabel}>Miembros</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="qr-code" size={28} color={COLORS.purple} />
            <Text style={styles.statCardValue}>-</Text>
            <Text style={styles.statCardLabel}>QR Activos</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="enter" size={28} color={COLORS.blue} />
            <Text style={styles.statCardValue}>-</Text>
            <Text style={styles.statCardLabel}>Accesos Hoy</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="calendar" size={28} color={COLORS.orange} />
            <Text style={styles.statCardValue}>-</Text>
            <Text style={styles.statCardLabel}>Accesos 30 días</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Creada:</Text>
            <Text style={styles.infoValue}>
              {selectedLocation.created_at
                ? new Date(selectedLocation.created_at).toLocaleDateString('es-HN')
                : '-'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Última actualización:</Text>
            <Text style={styles.infoValue}>
              {selectedLocation.updated_at
                ? new Date(selectedLocation.updated_at).toLocaleDateString('es-HN')
                : '-'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID:</Text>
            <Text style={[styles.infoValue, { fontSize: 11 }]}>{selectedLocation.id}</Text>
          </View>
        </View>
      </View>
    );
  };

  // Main render
  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
          <Text style={styles.loadingText}>Cargando ubicaciones...</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Ubicaciones</Text>
            <Text style={styles.headerSubtitle}>{locations.length} comunidades</Text>
          </View>
          {isSuperAdmin && (
            <TouchableOpacity onPress={openCreateModal} style={styles.addButton}>
              <Ionicons name="add" size={24} color={COLORS.background} />
            </TouchableOpacity>
          )}
        </View>

        {/* Error State */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => fetchLocations()}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.lime}
              colors={[COLORS.lime]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {locations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No hay ubicaciones</Text>
              <Text style={styles.emptySubtitle}>
                {isSuperAdmin
                  ? 'Crea tu primera ubicación para comenzar'
                  : 'No tienes acceso a ninguna ubicación'}
              </Text>
              {isSuperAdmin && (
                <TouchableOpacity style={styles.emptyButton} onPress={openCreateModal}>
                  <Ionicons name="add" size={20} color={COLORS.background} />
                  <Text style={styles.emptyButtonText}>Crear Ubicación</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            locations.map(renderLocationCard)
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Modal */}
        {renderModal()}
      </SafeAreaView>
    </View>
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
    marginTop: 16,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lime,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger + '20',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 14,
  },
  retryText: {
    color: COLORS.lime,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardInactive: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardStats: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundTertiary,
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lime,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.background,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.lime,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.lime,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.lime,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  formSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundSecondary,
    gap: 6,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  timezoneSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  timezoneOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timezoneOptionActive: {
    backgroundColor: COLORS.lime + '20',
    borderColor: COLORS.lime,
  },
  timezoneText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  timezoneTextActive: {
    color: COLORS.lime,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: (SCREEN_WIDTH - 56) / 2,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  statCardLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
});
