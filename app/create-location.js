// app/create-location.js
// ISSY - Crear Nueva Ubicación / Create New Location
// ProHome Dark Theme - Accessible from home screen

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useTranslation } from '../src/hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.joinissy.com';

// ProHome Dark Theme Colors
const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  bgCardAlt: '#243B44',
  lime: '#AAFF00',
  cyan: '#00E5FF',
  teal: '#00BFA6',
  orange: '#FF8A50',
  purple: '#A78BFA',
  coral: '#FF6B6B',
  blue: '#60A5FA',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textDark: '#0F1A1E',
  border: 'rgba(255, 255, 255, 0.1)',
  success: '#10B981',
  danger: '#EF4444',
  gradientStart: '#00BFA6',
  gradientEnd: '#AAFF00',
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

const DEFAULT_SETTINGS = {
  allow_visitor_qr: true,
  allow_resident_qr: true,
  require_photo_on_entry: false,
  require_photo_on_exit: false,
  max_active_qr_per_resident: 10,
  qr_default_duration_hours: 24,
  enable_patrols: true,
  enable_incidents: true,
  enable_announcements: true,
};

export default function CreateLocationScreen() {
  const router = useRouter();
  const { token, refreshProfile } = useAuth();
  const { t } = useTranslation();

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState('residential');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Honduras');
  const [timezone, setTimezone] = useState('America/Tegucigalpa');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'settings'
  const [showAdvanced, setShowAdvanced] = useState(false);

  const getAuthHeaders = useCallback(async () => {
    const storedToken = token || await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${storedToken}`,
    };
  }, [token]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleCreate = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Campo requerido', 'El nombre de la ubicación es obligatorio.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Campo requerido', 'La dirección es obligatoria.');
      return;
    }

    setIsSaving(true);
    try {
      const headers = await getAuthHeaders();
      const body = {
        name: name.trim(),
        type,
        address: address.trim(),
        city: city.trim(),
        country: country.trim(),
        timezone,
        settings,
      };

      const response = await fetch(`${API_URL}/api/locations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al crear la ubicación');
      }

      Alert.alert(
        '¡Ubicación creada!',
        `"${name.trim()}" se ha creado correctamente.`,
        [{
          text: 'Continuar',
          onPress: () => {
            if (refreshProfile) refreshProfile();
            router.replace('/(tabs)/home');
          },
        }]
      );
    } catch (err) {
      console.error('Error creating location:', err);
      Alert.alert('Error', err.message || 'No se pudo crear la ubicación. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeConfig = (typeId) => LOCATION_TYPES.find(t => t.id === typeId) || LOCATION_TYPES[0];

  // ========== RENDER: Info Tab ==========
  const renderInfoTab = () => (
    <View style={styles.formSection}>
      {/* Name */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>
          <Ionicons name="text" size={14} color={COLORS.textSecondary} /> Nombre *
        </Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ej: Residencial Los Pinos"
          placeholderTextColor={COLORS.textMuted}
          maxLength={100}
        />
      </View>

      {/* Type */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>
          <Ionicons name="apps" size={14} color={COLORS.textSecondary} /> Tipo de Ubicación
        </Text>
        <View style={styles.typeSelector}>
          {LOCATION_TYPES.map((locType) => {
            const isSelected = type === locType.id;
            return (
              <TouchableOpacity
                key={locType.id}
                style={[
                  styles.typeOption,
                  isSelected && { borderColor: locType.color, backgroundColor: locType.color + '20' },
                ]}
                onPress={() => setType(locType.id)}
                activeOpacity={0.7}
              >
                <Ionicons name={locType.icon} size={20} color={isSelected ? locType.color : COLORS.textMuted} />
                <Text style={[styles.typeLabel, { color: isSelected ? locType.color : COLORS.textSecondary }]}>
                  {locType.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Address */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>
          <Ionicons name="location" size={14} color={COLORS.textSecondary} /> Dirección *
        </Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={address}
          onChangeText={setAddress}
          placeholder="Dirección completa de la ubicación"
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={2}
        />
      </View>

      {/* City */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>
          <Ionicons name="business" size={14} color={COLORS.textSecondary} /> Ciudad
        </Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="Ej: Tegucigalpa"
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      {/* Country */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>
          <Ionicons name="globe" size={14} color={COLORS.textSecondary} /> País
        </Text>
        <TextInput
          style={styles.input}
          value={country}
          onChangeText={setCountry}
          placeholder="Ej: Honduras"
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      {/* Timezone */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>
          <Ionicons name="time" size={14} color={COLORS.textSecondary} /> Zona Horaria
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.timezoneSelector}>
            {TIMEZONES.map((tz) => {
              const isSelected = timezone === tz.id;
              return (
                <TouchableOpacity
                  key={tz.id}
                  style={[
                    styles.timezoneOption,
                    isSelected && styles.timezoneOptionActive,
                  ]}
                  onPress={() => setTimezone(tz.id)}
                >
                  <Text style={[
                    styles.timezoneText,
                    isSelected && styles.timezoneTextActive,
                  ]}>
                    {tz.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );

  // ========== RENDER: Settings Tab ==========
  const renderSettingsTab = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionSubtitle}>
        Configura las opciones predeterminadas para esta ubicación. Podrás modificarlas después.
      </Text>

      <Text style={styles.settingsGroupTitle}>Control de Acceso</Text>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Permitir QR de Visitantes</Text>
          <Text style={styles.settingDescription}>Los residentes pueden generar QR para visitantes</Text>
        </View>
        <Switch
          value={settings.allow_visitor_qr}
          onValueChange={(v) => updateSetting('allow_visitor_qr', v)}
          trackColor={{ false: COLORS.bgCardAlt, true: COLORS.lime + '50' }}
          thumbColor={settings.allow_visitor_qr ? COLORS.lime : COLORS.textMuted}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Permitir QR de Residentes</Text>
          <Text style={styles.settingDescription}>QR permanente para residentes</Text>
        </View>
        <Switch
          value={settings.allow_resident_qr}
          onValueChange={(v) => updateSetting('allow_resident_qr', v)}
          trackColor={{ false: COLORS.bgCardAlt, true: COLORS.lime + '50' }}
          thumbColor={settings.allow_resident_qr ? COLORS.lime : COLORS.textMuted}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Foto al Entrar</Text>
          <Text style={styles.settingDescription}>Requerir foto del visitante al entrar</Text>
        </View>
        <Switch
          value={settings.require_photo_on_entry}
          onValueChange={(v) => updateSetting('require_photo_on_entry', v)}
          trackColor={{ false: COLORS.bgCardAlt, true: COLORS.lime + '50' }}
          thumbColor={settings.require_photo_on_entry ? COLORS.lime : COLORS.textMuted}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Foto al Salir</Text>
          <Text style={styles.settingDescription}>Requerir foto del visitante al salir</Text>
        </View>
        <Switch
          value={settings.require_photo_on_exit}
          onValueChange={(v) => updateSetting('require_photo_on_exit', v)}
          trackColor={{ false: COLORS.bgCardAlt, true: COLORS.lime + '50' }}
          thumbColor={settings.require_photo_on_exit ? COLORS.lime : COLORS.textMuted}
        />
      </View>

      <Text style={[styles.settingsGroupTitle, { marginTop: scale(24) }]}>Límites</Text>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Máximo QR activos por residente</Text>
        <TextInput
          style={styles.input}
          value={String(settings.max_active_qr_per_resident)}
          onChangeText={(v) => updateSetting('max_active_qr_per_resident', parseInt(v) || 10)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Duración por defecto del QR (horas)</Text>
        <TextInput
          style={styles.input}
          value={String(settings.qr_default_duration_hours)}
          onChangeText={(v) => updateSetting('qr_default_duration_hours', parseInt(v) || 24)}
          keyboardType="numeric"
        />
      </View>

      <Text style={[styles.settingsGroupTitle, { marginTop: scale(24) }]}>Módulos</Text>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Rondines (Patrullas)</Text>
          <Text style={styles.settingDescription}>Habilitar sistema de rondines</Text>
        </View>
        <Switch
          value={settings.enable_patrols}
          onValueChange={(v) => updateSetting('enable_patrols', v)}
          trackColor={{ false: COLORS.bgCardAlt, true: COLORS.lime + '50' }}
          thumbColor={settings.enable_patrols ? COLORS.lime : COLORS.textMuted}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Incidentes</Text>
          <Text style={styles.settingDescription}>Habilitar reporte de incidentes</Text>
        </View>
        <Switch
          value={settings.enable_incidents}
          onValueChange={(v) => updateSetting('enable_incidents', v)}
          trackColor={{ false: COLORS.bgCardAlt, true: COLORS.lime + '50' }}
          thumbColor={settings.enable_incidents ? COLORS.lime : COLORS.textMuted}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Anuncios</Text>
          <Text style={styles.settingDescription}>Habilitar sistema de anuncios</Text>
        </View>
        <Switch
          value={settings.enable_announcements}
          onValueChange={(v) => updateSetting('enable_announcements', v)}
          trackColor={{ false: COLORS.bgCardAlt, true: COLORS.lime + '50' }}
          thumbColor={settings.enable_announcements ? COLORS.lime : COLORS.textMuted}
        />
      </View>
    </View>
  );

  // ========== MAIN RENDER ==========
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nueva Ubicación</Text>
        <View style={{ width: scale(40) }} />
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
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === 'info' && renderInfoTab()}
          {activeTab === 'settings' && renderSettingsTab()}
          <View style={{ height: scale(100) }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Create Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.createBtn, isSaving && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color={COLORS.textDark} size="small" />
          ) : (
            <>
              <Ionicons name="add-circle" size={22} color={COLORS.textDark} />
              <Text style={styles.createBtnText}>Crear Ubicación</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Tabs
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
    paddingVertical: scale(14),
    gap: scale(6),
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.lime,
  },
  tabText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.lime,
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: scale(16),
  },

  // Form
  formSection: {
    marginBottom: scale(16),
  },
  formGroup: {
    marginBottom: scale(18),
  },
  formLabel: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: scale(8),
  },
  input: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(14),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    fontSize: scale(16),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputMultiline: {
    height: scale(80),
    textAlignVertical: 'top',
  },

  // Type Selector
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    gap: scale(6),
  },
  typeLabel: {
    fontSize: scale(13),
    fontWeight: '500',
  },

  // Timezone
  timezoneSelector: {
    flexDirection: 'row',
    gap: scale(8),
  },
  timezoneOption: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    borderRadius: scale(10),
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timezoneOptionActive: {
    backgroundColor: COLORS.lime + '20',
    borderColor: COLORS.lime,
  },
  timezoneText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  timezoneTextActive: {
    color: COLORS.lime,
    fontWeight: '600',
  },

  // Settings
  sectionSubtitle: {
    fontSize: scale(13),
    color: COLORS.textMuted,
    marginBottom: scale(20),
    lineHeight: scale(19),
  },
  settingsGroupTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(14),
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: scale(16),
  },
  settingLabel: {
    fontSize: scale(15),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  settingDescription: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },

  // Bottom Bar
  bottomBar: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    paddingBottom: Platform.OS === 'ios' ? scale(28) : scale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bgPrimary,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    paddingVertical: scale(16),
    borderRadius: scale(14),
    gap: scale(8),
  },
  createBtnDisabled: {
    backgroundColor: COLORS.bgCardAlt,
  },
  createBtnText: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textDark,
  },
});
