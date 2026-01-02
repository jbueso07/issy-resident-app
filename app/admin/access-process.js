// app/admin/access-process.js
// ISSY Resident App - Admin: Procesos de Acceso (ProHome Dark Theme) + i18n

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../../src/hooks/useTranslation';

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
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  border: 'rgba(255,255,255,0.1)',
};

export default function AccessProcessScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const router = useRouter();
  const locationId = params.locationId;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState('no_data');
  const [preferences, setPreferences] = useState({
    require_exit_registration: false,
    require_companion: false,
    use_qr_for_residents: false,
    can_request_resident_approval: true,
  });

  // Access processes with translations
  const ACCESS_PROCESSES = [
    {
      id: 'no_data',
      title: t('admin.accessProcess.processes.noData.title'),
      description: t('admin.accessProcess.processes.noData.description'),
      time: t('admin.accessProcess.processes.noData.time'),
      photos: 0,
      requiresId: false,
      requiresPlate: false,
      icon: 'flash',
    },
    {
      id: 'photo_1',
      title: t('admin.accessProcess.processes.photo1.title'),
      description: t('admin.accessProcess.processes.photo1.description'),
      time: t('admin.accessProcess.processes.photo1.time'),
      photos: 1,
      requiresId: false,
      requiresPlate: false,
      icon: 'camera',
    },
    {
      id: 'photo_2',
      title: t('admin.accessProcess.processes.photo2.title'),
      description: t('admin.accessProcess.processes.photo2.description'),
      time: t('admin.accessProcess.processes.photo2.time'),
      photos: 2,
      requiresId: false,
      requiresPlate: false,
      icon: 'images',
    },
    {
      id: 'photo_3',
      title: t('admin.accessProcess.processes.photo3.title'),
      description: t('admin.accessProcess.processes.photo3.description'),
      time: t('admin.accessProcess.processes.photo3.time'),
      photos: 3,
      requiresId: false,
      requiresPlate: false,
      icon: 'albums',
    },
    {
      id: 'photo_1_id',
      title: t('admin.accessProcess.processes.photo1Id.title'),
      description: t('admin.accessProcess.processes.photo1Id.description'),
      time: t('admin.accessProcess.processes.photo1Id.time'),
      photos: 1,
      requiresId: true,
      requiresPlate: false,
      icon: 'id-card',
    },
    {
      id: 'photo_1_id_plate',
      title: t('admin.accessProcess.processes.photo1IdPlate.title'),
      description: t('admin.accessProcess.processes.photo1IdPlate.description'),
      time: t('admin.accessProcess.processes.photo1IdPlate.time'),
      photos: 1,
      requiresId: true,
      requiresPlate: true,
      icon: 'car',
    },
    {
      id: 'photo_2_id_plate',
      title: t('admin.accessProcess.processes.photo2IdPlate.title'),
      description: t('admin.accessProcess.processes.photo2IdPlate.description'),
      time: t('admin.accessProcess.processes.photo2IdPlate.time'),
      photos: 2,
      requiresId: true,
      requiresPlate: true,
      icon: 'car-sport',
    },
    {
      id: 'full',
      title: t('admin.accessProcess.processes.full.title'),
      description: t('admin.accessProcess.processes.full.description'),
      time: t('admin.accessProcess.processes.full.time'),
      photos: 3,
      requiresId: true,
      requiresPlate: true,
      icon: 'shield-checkmark',
    },
  ];

  // Security preferences with translations
  const SECURITY_PREFERENCES = [
    {
      id: 'require_exit_registration',
      title: t('admin.accessProcess.preferences.exitRegistration.title'),
      description: t('admin.accessProcess.preferences.exitRegistration.description'),
      icon: 'log-out',
    },
    {
      id: 'require_companion',
      title: t('admin.accessProcess.preferences.companion.title'),
      description: t('admin.accessProcess.preferences.companion.description'),
      icon: 'people',
    },
    {
      id: 'use_qr_for_residents',
      title: t('admin.accessProcess.preferences.qrResidents.title'),
      description: t('admin.accessProcess.preferences.qrResidents.description'),
      icon: 'qr-code',
    },
    {
      id: 'can_request_resident_approval',
      title: t('admin.accessProcess.preferences.residentApproval.title'),
      description: t('admin.accessProcess.preferences.residentApproval.description'),
      icon: 'checkmark-circle',
    },
  ];

  useEffect(() => {
    if (locationId) {
      fetchSettings();
    } else {
      setLoading(false);
      Alert.alert(t('common.error'), t('admin.accessProcess.errors.locationNotFound'));
    }
  }, [locationId]);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/admin/settings/guard-app/${locationId}`, {
        headers,
      });
      
      if (response.ok) {
        const data = await response.json();
        const settings = data.data || data;
        
        if (settings) {
          setSelectedProcess(settings.access_process || 'no_data');
          setPreferences({
            require_exit_registration: settings.require_exit_registration || false,
            require_companion: settings.require_companion || false,
            use_qr_for_residents: settings.use_qr_for_residents || false,
            can_request_resident_approval: settings.can_request_resident_approval ?? true,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_URL}/api/admin/settings/guard-app/${locationId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          access_process: selectedProcess,
          ...preferences,
        }),
      });

      if (response.ok) {
        Alert.alert(t('common.success'), t('admin.accessProcess.success.saved'), [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert(t('common.error'), t('admin.accessProcess.errors.saveFailed'));
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert(t('common.error'), t('admin.accessProcess.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (key) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{t('admin.accessProcess.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('admin.accessProcess.subtitle')}</Text>
          </View>
          <View style={{ width: scale(40) }} />
        </View>
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
          <Text style={styles.headerTitle}>{t('admin.accessProcess.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('admin.accessProcess.subtitle')}</Text>
        </View>
        <View style={{ width: scale(40) }} />
      </View>
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Access Process Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="camera" size={20} color={COLORS.lime} />
            <Text style={styles.sectionTitle}>{t('admin.accessProcess.processSection')}</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            {t('admin.accessProcess.processDescription')}
          </Text>
          
          {ACCESS_PROCESSES.map((process) => {
            const isSelected = selectedProcess === process.id;
            return (
              <TouchableOpacity
                key={process.id}
                style={[
                  styles.processOption,
                  isSelected && styles.processOptionSelected,
                ]}
                onPress={() => setSelectedProcess(process.id)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.processIconContainer,
                  isSelected && styles.processIconContainerSelected,
                ]}>
                  <Ionicons 
                    name={process.icon} 
                    size={20} 
                    color={isSelected ? COLORS.background : COLORS.textMuted} 
                  />
                </View>
                
                <View style={styles.processContent}>
                  <Text style={[
                    styles.processTitle,
                    isSelected && styles.processTitleSelected,
                  ]}>
                    {process.title}
                  </Text>
                  <View style={styles.processTime}>
                    <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                    <Text style={styles.processTimeText}>{process.time}</Text>
                  </View>
                  <View style={styles.processTags}>
                    {process.photos > 0 && (
                      <View style={styles.tag}>
                        <Ionicons name="camera" size={10} color={COLORS.textSecondary} />
                        <Text style={styles.tagText}>
                          {process.photos} {process.photos === 1 ? t('admin.accessProcess.tags.photo') : t('admin.accessProcess.tags.photos')}
                        </Text>
                      </View>
                    )}
                    {process.requiresId && (
                      <View style={styles.tag}>
                        <Ionicons name="id-card" size={10} color={COLORS.textSecondary} />
                        <Text style={styles.tagText}>{t('admin.accessProcess.tags.id')}</Text>
                      </View>
                    )}
                    {process.requiresPlate && (
                      <View style={styles.tag}>
                        <Ionicons name="car" size={10} color={COLORS.textSecondary} />
                        <Text style={styles.tagText}>{t('admin.accessProcess.tags.plate')}</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={[
                  styles.radio,
                  isSelected && styles.radioSelected,
                ]}>
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color={COLORS.background} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Security Preferences Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.teal} />
            <Text style={styles.sectionTitle}>{t('admin.accessProcess.preferencesSection')}</Text>
          </View>
          
          {SECURITY_PREFERENCES.map((pref) => {
            const isActive = preferences[pref.id];
            return (
              <TouchableOpacity
                key={pref.id}
                style={styles.preferenceRow}
                onPress={() => togglePreference(pref.id)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.preferenceIcon,
                  isActive && styles.preferenceIconActive,
                ]}>
                  <Ionicons 
                    name={pref.icon} 
                    size={20} 
                    color={isActive ? COLORS.lime : COLORS.textMuted} 
                  />
                </View>
                
                <View style={styles.preferenceContent}>
                  <Text style={[
                    styles.preferenceTitle,
                    isActive && styles.preferenceTitleActive,
                  ]}>
                    {pref.title}
                  </Text>
                  <Text style={styles.preferenceDescription}>{pref.description}</Text>
                </View>
                
                <View style={[
                  styles.checkbox,
                  isActive && styles.checkboxChecked,
                ]}>
                  {isActive && (
                    <Ionicons name="checkmark" size={16} color={COLORS.background} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: scale(120) }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <>
              <Ionicons name="save" size={20} color={COLORS.background} />
              <Text style={styles.saveButtonText}>{t('admin.accessProcess.saveChanges')}</Text>
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
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: scale(12),
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: scale(16),
  },
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
    gap: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    paddingHorizontal: scale(16),
    paddingBottom: scale(12),
  },
  processOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(14),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  processOptionSelected: {
    backgroundColor: COLORS.lime + '10',
  },
  processIconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    backgroundColor: COLORS.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  processIconContainerSelected: {
    backgroundColor: COLORS.lime,
  },
  processContent: {
    flex: 1,
  },
  processTitle: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  processTitleSelected: {
    color: COLORS.lime,
    fontWeight: '600',
  },
  processTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginBottom: scale(6),
  },
  processTimeText: {
    fontSize: scale(12),
    color: COLORS.textMuted,
  },
  processTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundTertiary,
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(6),
    gap: scale(4),
  },
  tagText: {
    fontSize: scale(10),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  radio: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: scale(8),
  },
  radioSelected: {
    borderColor: COLORS.lime,
    backgroundColor: COLORS.lime,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(14),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  preferenceIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    backgroundColor: COLORS.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  preferenceIconActive: {
    backgroundColor: COLORS.lime + '20',
  },
  preferenceContent: {
    flex: 1,
    marginRight: scale(12),
  },
  preferenceTitle: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  preferenceTitleActive: {
    color: COLORS.lime,
  },
  preferenceDescription: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  checkbox: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(6),
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: scale(16),
    paddingBottom: scale(32),
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.lime,
    paddingVertical: scale(16),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.background,
    fontSize: scale(16),
    fontWeight: '700',
  },
});