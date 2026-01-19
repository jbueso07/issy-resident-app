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
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/context/AuthContext';
import { useAdminLocation } from '../../src/context/AdminLocationContext';
import { LocationHeader, LocationPickerModal } from '../../src/components/AdminLocationPicker';
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

const getTabs = (t) => [
  { id: 'guard', label: t('admin.settings.tabs.guard'), icon: 'shield-checkmark' },
  { id: 'location', label: t('admin.settings.tabs.location'), icon: 'settings' },
  { id: 'users', label: t('admin.settings.tabs.users'), icon: 'people' },
  { id: 'blacklist', label: t('admin.settings.tabs.blacklist'), icon: 'ban' },
];

const getSuspensionReasons = (t) => [
  { value: 'unpaid', label: t('admin.settings.suspensionReasons.unpaid'), icon: 'card' },
  { value: 'moved_out', label: t('admin.settings.suspensionReasons.movedOut'), icon: 'home' },
  { value: 'rule_violation', label: t('admin.settings.suspensionReasons.ruleViolation'), icon: 'warning' },
  { value: 'admin_suspended', label: t('admin.settings.suspensionReasons.adminSuspended'), icon: 'shield' },
  { value: 'other', label: t('admin.settings.suspensionReasons.other'), icon: 'document-text' },
];

export default function AdminSettings() {
  const { t } = useTranslation();
  const TABS = getTabs(t);
  const SUSPENSION_REASONS = getSuspensionReasons(t);
  const { user, profile } = useAuth();
  const { selectedLocationId, loading: locationLoading } = useAdminLocation();
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
      Alert.alert(t('admin.settings.accessDenied'), t('admin.settings.noPermissions'));
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
        Alert.alert(t('common.success'), t('admin.settings.success.saved'));
      } else {
        Alert.alert(t('common.error'), t('admin.settings.errors.saveFailed'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('admin.settings.errors.saveFailed'));
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
        Alert.alert(t('common.success'), t('admin.settings.success.saved'));
      } else {
        Alert.alert(t('common.error'), t('admin.settings.errors.saveFailed'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('admin.settings.errors.saveFailed'));
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
        Alert.alert(t('common.success'), t('admin.settings.success.userSuspended'));
        setShowSuspendModal(false);
        setSuspendForm({ reason: 'admin_suspended', message: '' });
        loadData();
      } else {
        Alert.alert(t('common.error'), t('admin.settings.errors.suspendFailed'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('admin.settings.errors.suspendFailed'));
    }
  };

  const handleReactivateUser = async (userId) => {
    Alert.alert(
      t('admin.settings.reactivateTitle'),
      t('admin.settings.reactivateConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.settings.reactivate'),
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const res = await fetch(`${API_URL}/api/admin/users/${userId}/reactivate`, {
                method: 'POST',
                headers,
              });
              if (res.ok) {
                Alert.alert(t('common.success'), t('admin.settings.success.userReactivated'));
                loadData();
              } else {
                Alert.alert(t('common.error'), t('admin.settings.errors.reactivateFailed'));
              }
            } catch (error) {
              Alert.alert(t('common.error'), t('admin.settings.errors.reactivateFailed'));
            }
          }
        }
      ]
    );
  };

  const runAutoSuspension = async () => {
    Alert.alert(
      t('admin.settings.suspendUsersTitle'),
      t('admin.settings.suspendUsersConfirm', { count: overdueUsers.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.settings.suspend'),
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
                Alert.alert(t('common.success'), t('admin.settings.success.usersSuspended'));
                loadData();
              } else {
                Alert.alert(t('common.error'), t('admin.settings.errors.operationFailed'));
              }
            } catch (error) {
              Alert.alert(t('common.error'), t('admin.settings.errors.operationFailed'));
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
      Alert.alert(t('common.error'), t('admin.settings.errors.reasonRequired'));
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
        Alert.alert(t('common.success'), t('admin.settings.success.addedToBlacklist'));
        setShowBlacklistModal(false);
        setBlacklistForm({ visitor_name: '', visitor_phone: '', visitor_id_number: '', reason: '', notes: '' });
        loadData();
      } else {
        Alert.alert(t('common.error'), t('admin.settings.errors.addFailed'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('admin.settings.errors.addFailed'));
    }
  };

  const handleRemoveFromBlacklist = async (id) => {
    Alert.alert(
      t('admin.settings.blacklist.removeTitle'),
      t('admin.settings.blacklist.removeConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const res = await fetch(`${API_URL}/api/admin/blacklist/${id}`, {
                method: 'DELETE',
                headers,
              });
              if (res.ok) {
                Alert.alert(t('common.success'), t('admin.settings.success.removedFromBlacklist'));
                loadData();
              }
            } catch (error) {
              Alert.alert(t('common.error'), t('admin.settings.errors.removeFailed'));
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
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
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
          <Text style={styles.headerTitle}>{t('admin.settings.title')}</Text>
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
                <Text style={styles.navigationButtonTitle}>{t('admin.settings.guard.accessProcess')}</Text>
                <Text style={styles.navigationButtonDescription}>
                  {t('admin.settings.guard.accessProcessDesc')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="key" size={20} color={COLORS.lime} />
                <Text style={styles.sectionTitle}>{t('admin.settings.guard.accessPermissions')}</Text>
              </View>
              <SettingToggle
                label={t('admin.settings.guard.scanQr')}
                description={t('admin.settings.guard.scanQrDesc')}
                value={guardSettings.can_scan_qr}
                onChange={(v) => handleGuardSettingChange('can_scan_qr', v)}
                icon="qr-code"
              />
              <SettingToggle
                label={t('admin.settings.guard.manualEntry')}
                description={t('admin.settings.guard.manualEntryDesc')}
                value={guardSettings.can_manual_entry}
                onChange={(v) => handleGuardSettingChange('can_manual_entry', v)}
                icon="create"
              />
              <SettingToggle
                label={t('admin.settings.guard.viewHistory')}
                description={t('admin.settings.guard.viewHistoryDesc')}
                value={guardSettings.can_view_visitor_history}
                onChange={(v) => handleGuardSettingChange('can_view_visitor_history', v)}
                icon="time"
              />
              <SettingToggle
                label={t('admin.settings.guard.residentDirectory')}
                description={t('admin.settings.guard.residentDirectoryDesc')}
                value={guardSettings.can_view_resident_directory}
                onChange={(v) => handleGuardSettingChange('can_view_resident_directory', v)}
                icon="people"
              />
              <SettingToggle
                label={t('admin.settings.guard.callResidents')}
                description={t('admin.settings.guard.callResidentsDesc')}
                value={guardSettings.can_call_residents}
                onChange={(v) => handleGuardSettingChange('can_call_residents', v)}
                icon="call"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text" size={20} color={COLORS.purple} />
                <Text style={styles.sectionTitle}>{t('admin.settings.guard.registrationPermissions')}</Text>
              </View>
              <SettingToggle
                label={t('admin.settings.guard.registerIncidents')}
                description={t('admin.settings.guard.registerIncidentsDesc')}
                value={guardSettings.can_register_incidents}
                onChange={(v) => handleGuardSettingChange('can_register_incidents', v)}
                icon="alert-circle"
              />
              <SettingToggle
                label={t('admin.settings.guard.uploadPhotos')}
                description={t('admin.settings.guard.uploadPhotosDesc')}
                value={guardSettings.can_upload_photos}
                onChange={(v) => handleGuardSettingChange('can_upload_photos', v)}
                icon="camera"
              />
              <SettingToggle
                label={t('admin.settings.guard.registerVehicles')}
                description={t('admin.settings.guard.registerVehiclesDesc')}
                value={guardSettings.can_register_vehicles}
                onChange={(v) => handleGuardSettingChange('can_register_vehicles', v)}
                icon="car"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.sectionTitle}>{t('admin.settings.guard.approvals')}</Text>
              </View>
              <SettingToggle
                label={t('admin.settings.guard.approveVisitors')}
                description={t('admin.settings.guard.approveVisitorsDesc')}
                value={guardSettings.can_approve_visitors}
                onChange={(v) => handleGuardSettingChange('can_approve_visitors', v)}
                icon="checkmark"
              />
              <SettingToggle
                label={t('admin.settings.guard.denyVisitors')}
                description={t('admin.settings.guard.denyVisitorsDesc')}
                value={guardSettings.can_deny_visitors}
                onChange={(v) => handleGuardSettingChange('can_deny_visitors', v)}
                icon="close"
              />
              <SettingToggle
                label={t('admin.settings.guard.autoApprove')}
                description={t('admin.settings.guard.autoApproveDesc')}
                value={guardSettings.auto_approve_preregistered}
                onChange={(v) => handleGuardSettingChange('auto_approve_preregistered', v)}
                icon="flash"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="notifications" size={20} color={COLORS.warning} />
                <Text style={styles.sectionTitle}>{t('admin.settings.guard.alerts')}</Text>
              </View>
              <SettingToggle
                label={t('admin.settings.guard.alertBlacklist')}
                description={t('admin.settings.guard.alertBlacklistDesc')}
                value={guardSettings.alert_on_blacklisted}
                onChange={(v) => handleGuardSettingChange('alert_on_blacklisted', v)}
                icon="ban"
              />
              <SettingToggle
                label={t('admin.settings.guard.alertExpiredQr')}
                description={t('admin.settings.guard.alertExpiredQrDesc')}
                value={guardSettings.alert_on_expired_qr}
                onChange={(v) => handleGuardSettingChange('alert_on_expired_qr', v)}
                icon="timer"
              />
              <SettingToggle
                label={t('admin.settings.guard.alertSuspendedResident')}
                description={t('admin.settings.guard.alertSuspendedResidentDesc')}
                value={guardSettings.alert_on_suspended_resident}
                onChange={(v) => handleGuardSettingChange('alert_on_suspended_resident', v)}
                icon="person-remove"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="warning" size={20} color={COLORS.danger} />
                <Text style={styles.sectionTitle}>{t('admin.settings.guard.emergencies')}</Text>
              </View>
              <SettingToggle
                label={t('admin.settings.guard.panicButton')}
                description={t('admin.settings.guard.panicButtonDesc')}
                value={guardSettings.panic_button_enabled ?? true}
                onChange={(v) => handleGuardSettingChange('panic_button_enabled', v)}
                icon="alert"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="videocam" size={20} color={COLORS.teal} />
                <Text style={styles.sectionTitle}>{t('admin.settings.guard.cameraConfig')}</Text>
              </View>
              <View style={styles.cameraOptions}>
                {[
                  { value: 'phone', label: t('admin.settings.guard.cameraPhone'), icon: 'phone-portrait' },
                  { value: 'ip_camera', label: t('admin.settings.guard.cameraIp'), icon: 'videocam' },
                  { value: 'both', label: t('admin.settings.guard.cameraBoth'), icon: 'albums' },
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
                  <Text style={styles.inputLabel}>{t('admin.settings.guard.ipCameraUrl')}</Text>
                  <TextInput
                    style={styles.input}
                    value={guardSettings.ip_camera_url || ''}
                    onChangeText={(v) => handleGuardSettingChange('ip_camera_url', v)}
                    placeholder="rtsp://192.168.1.100:554/stream"
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="none"
                  />
                  <Text style={styles.inputLabel}>{t('admin.settings.guard.ipCameraUser')}</Text>
                  <TextInput
                    style={styles.input}
                    value={guardSettings.ip_camera_username || ''}
                    onChangeText={(v) => handleGuardSettingChange('ip_camera_username', v)}
                    placeholder="admin"
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="none"
                  />
                  <Text style={styles.inputLabel}>{t('admin.settings.guard.ipCameraPassword')}</Text>
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
                  <Text style={styles.saveButtonText}>{t('admin.settings.saveChanges')}</Text>
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
                <Text style={styles.sectionTitle}>{t('admin.settings.location.paymentConfig')}</Text>
              </View>
              <SettingToggle
                label={t('admin.settings.location.autoSuspend')}
                description={t('admin.settings.location.autoSuspendDesc')}
                value={locationSettings.auto_suspend_on_overdue}
                onChange={(v) => handleLocationSettingChange('auto_suspend_on_overdue', v)}
                icon="pause-circle"
              />
              <SettingNumber
                label={t('admin.settings.location.overdueDays')}
                description={t('admin.settings.location.overdueDaysDesc')}
                value={locationSettings.overdue_days_before_suspend}
                onChange={(v) => handleLocationSettingChange('overdue_days_before_suspend', v)}
                icon="calendar"
              />
              <SettingNumber
                label={t('admin.settings.location.overduePayments')}
                description={t('admin.settings.location.overduePaymentsDesc')}
                value={locationSettings.overdue_payments_threshold}
                onChange={(v) => handleLocationSettingChange('overdue_payments_threshold', v)}
                icon="receipt"
              />
              <SettingToggle
                label={t('admin.settings.location.paymentReminders')}
                description={t('admin.settings.location.paymentRemindersDesc')}
                value={locationSettings.send_payment_reminders}
                onChange={(v) => handleLocationSettingChange('send_payment_reminders', v)}
                icon="notifications"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.blue} />
                <Text style={styles.sectionTitle}>{t('admin.settings.location.accessControl')}</Text>
              </View>
              <SettingToggle
                label={t('admin.settings.location.visitorPreregistration')}
                description={t('admin.settings.location.visitorPreregistrationDesc')}
                value={locationSettings.allow_visitor_preregistration}
                onChange={(v) => handleLocationSettingChange('allow_visitor_preregistration', v)}
                icon="person-add"
              />
              <SettingNumber
                label={t('admin.settings.location.maxActiveQr')}
                description={t('admin.settings.location.maxActiveQrDesc')}
                value={locationSettings.max_active_qr_per_user}
                onChange={(v) => handleLocationSettingChange('max_active_qr_per_user', v)}
                icon="qr-code"
              />
              <SettingNumber
                label={t('admin.settings.location.qrValidity')}
                description={t('admin.settings.location.qrValidityDesc')}
                value={locationSettings.default_qr_validity_hours}
                onChange={(v) => handleLocationSettingChange('default_qr_validity_hours', v)}
                icon="time"
              />
              <SettingToggle
                label={t('admin.settings.location.requireId')}
                description={t('admin.settings.location.requireIdDesc')}
                value={locationSettings.require_visitor_id}
                onChange={(v) => handleLocationSettingChange('require_visitor_id', v)}
                icon="id-card"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="megaphone" size={20} color={COLORS.purple} />
                <Text style={styles.sectionTitle}>{t('admin.settings.location.communication')}</Text>
              </View>
              <SettingToggle
                label={t('admin.settings.location.announcements')}
                description={t('admin.settings.location.announcementsDesc')}
                value={locationSettings.enable_announcements}
                onChange={(v) => handleLocationSettingChange('enable_announcements', v)}
                icon="megaphone"
              />
              <SettingToggle
                label={t('admin.settings.location.emergencyAlerts')}
                description={t('admin.settings.location.emergencyAlertsDesc')}
                value={locationSettings.enable_emergency_alerts}
                onChange={(v) => handleLocationSettingChange('enable_emergency_alerts', v)}
                icon="warning"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar" size={20} color={COLORS.success} />
                <Text style={styles.sectionTitle}>{t('admin.settings.location.amenities')}</Text>
              </View>
              <SettingToggle
                label={t('admin.settings.location.reservations')}
                description={t('admin.settings.location.reservationsDesc')}
                value={locationSettings.enable_amenity_reservations}
                onChange={(v) => handleLocationSettingChange('enable_amenity_reservations', v)}
                icon="calendar"
              />
              <SettingNumber
                label={t('admin.settings.location.maxReservations')}
                description={t('admin.settings.location.maxReservationsDesc')}
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
                  <Text style={styles.saveButtonText}>{t('admin.settings.saveChanges')}</Text>
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
                  <Text style={styles.alertTitle}>{t('admin.settings.users.overdueAlert', { count: overdueUsers.length })}</Text>
                  <Text style={styles.alertSubtitle}>
                    {t('admin.settings.users.total')}: L {overdueUsers.reduce((sum, u) => sum + parseFloat(u.total_overdue || 0), 0).toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity style={styles.alertButton} onPress={runAutoSuspension}>
                  <Text style={styles.alertButtonText}>{t('admin.settings.suspend')}</Text>
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
                        {usr.is_active ? t('admin.settings.users.active') : t('admin.settings.users.suspended')}
                      </Text>
                    </View>
                    {usr.overdue_payments > 0 && (
                      <View style={[styles.statusBadge, { backgroundColor: COLORS.warning + '20' }]}>
                        <Ionicons name="alert-circle" size={12} color={COLORS.warning} />
                        <Text style={[styles.statusBadgeText, { color: COLORS.warning }]}>
                          {usr.overdue_payments} {t('admin.settings.users.overdue')}
                        </Text>
                      </View>
                    )}
                  </View>
                  {!usr.is_active && usr.suspension_reason && (
                    <Text style={styles.suspensionReason}>
                      {t('admin.settings.users.reason')}: {SUSPENSION_REASONS.find(r => r.value === usr.suspension_reason)?.label || usr.suspension_reason}
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
                <Text style={styles.emptyTitle}>{t('admin.settings.users.noUsers')}</Text>
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
              <Text style={styles.addButtonText}>{t('admin.settings.blacklist.addToBlacklist')}</Text>
            </TouchableOpacity>

            {blacklist.map(item => (
              <View key={item.id} style={styles.blacklistCard}>
                <View style={styles.blacklistIcon}>
                  <Ionicons name="ban" size={24} color={COLORS.danger} />
                </View>
                <View style={styles.blacklistInfo}>
                  <Text style={styles.blacklistName}>{item.visitor_name || t('common.noName')}</Text>
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
                <Text style={styles.emptyTitle}>{t('admin.settings.blacklist.emptyTitle')}</Text>
                <Text style={styles.emptySubtitle}>{t('admin.settings.blacklist.emptySubtitle')}</Text>
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
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('admin.settings.suspendModal.title')}</Text>
            <TouchableOpacity onPress={handleSuspendUser}>
              <Text style={styles.modalDone}>{t('common.confirm')}</Text>
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

            <Text style={styles.inputLabel}>{t('admin.settings.suspendModal.reason')}</Text>
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

            <Text style={styles.inputLabel}>{t('admin.settings.suspendModal.message')}</Text>
            <TextInput
              style={styles.textArea}
              value={suspendForm.message}
              onChangeText={(text) => setSuspendForm(prev => ({ ...prev, message: text }))}
              placeholder={t('admin.settings.suspendModal.messagePlaceholder')}
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
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('admin.settings.blacklist.addToBlacklist')}</Text>
            <TouchableOpacity onPress={handleAddToBlacklist}>
              <Text style={styles.modalDone}>{t('common.add')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>{t('admin.settings.blacklist.form.name')}</Text>
            <TextInput
              style={styles.input}
              value={blacklistForm.visitor_name}
              onChangeText={(text) => setBlacklistForm(prev => ({ ...prev, visitor_name: text }))}
              placeholder={t('admin.settings.blacklist.form.namePlaceholder')}
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.inputLabel}>{t('admin.settings.blacklist.form.phone')}</Text>
            <TextInput
              style={styles.input}
              value={blacklistForm.visitor_phone}
              onChangeText={(text) => setBlacklistForm(prev => ({ ...prev, visitor_phone: text }))}
              placeholder={t('admin.settings.blacklist.form.phone')}
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>{t('admin.settings.blacklist.form.idNumber')}</Text>
            <TextInput
              style={styles.input}
              value={blacklistForm.visitor_id_number}
              onChangeText={(text) => setBlacklistForm(prev => ({ ...prev, visitor_id_number: text }))}
              placeholder={t('admin.settings.blacklist.form.idPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.inputLabel}>{t('admin.settings.blacklist.form.reason')} *</Text>
            <TextInput
              style={styles.textArea}
              value={blacklistForm.reason}
              onChangeText={(text) => setBlacklistForm(prev => ({ ...prev, reason: text }))}
              placeholder={t('admin.settings.blacklist.form.reasonPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={2}
            />

            <Text style={styles.inputLabel}>{t('admin.settings.blacklist.form.notes')}</Text>
            <TextInput
              style={styles.textArea}
              value={blacklistForm.notes}
              onChangeText={(text) => setBlacklistForm(prev => ({ ...prev, notes: text }))}
              placeholder={t('admin.settings.blacklist.form.notesPlaceholder')}
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
              <Text style={styles.modalCancel}>{t('common.close')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('admin.settings.historyModal.title')}</Text>
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
                      {item.action === 'suspended' ? t('admin.settings.historyModal.suspended') : t('admin.settings.historyModal.reactivated')}
                    </Text>
                  </View>
                  {item.reason && (
                    <Text style={styles.historyReason}>
                      {t('admin.settings.users.reason')}: {SUSPENSION_REASONS.find(r => r.value === item.reason)?.label || item.reason}
                    </Text>
                  )}
                  {item.message && <Text style={styles.historyMessage}>{item.message}</Text>}
                  <Text style={styles.historyDate}>
                    {new Date(item.performed_at).toLocaleString()}
                  </Text>
                  {item.performed_by_user && (
                    <Text style={styles.historyBy}>{t('admin.settings.historyModal.by')}: {item.performed_by_user.name}</Text>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={64} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>{t('admin.settings.historyModal.noHistory')}</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    <LocationPickerModal />
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