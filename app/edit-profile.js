// app/edit-profile.js - Editar Perfil - ProHome Dark Theme
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Image, Switch, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../src/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { updateUserProfile, changePassword, uploadAvatar } from '../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ProHome Dark Theme Colors
const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  card: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  teal: '#5DDED8',
  lime: '#D4FE48',
  purple: '#6366F1',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  green: '#10B981',
  red: '#EF4444',
};

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { 
    user, 
    refreshUser,
    refreshProfile,
    biometricEnabled,
    biometricAvailable,
    biometricType,
    getBiometricLabel,
    enableBiometric,
    disableBiometric,
  } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [biometricLoading, setBiometricLoading] = useState(false);
  
  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar_url || user?.profile_photo_url || null);
  const [newAvatarUri, setNewAvatarUri] = useState(null); // URI local de nueva imagen
  
  // Password form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('editProfile.permissionRequired'), t('editProfile.galleryAccess'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setAvatar(uri);
      setNewAvatarUri(uri); // Guardar para subir después
    }
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('editProfile.errors.nameRequired'));
      return;
    }

    setLoading(true);
    
    try {
      let avatarUrl = avatar;

      // Si hay nueva imagen, subirla primero
      if (newAvatarUri) {
        setUploadingImage(true);
        const uploadResult = await uploadAvatar(newAvatarUri, user?.id);
        setUploadingImage(false);
        
        if (uploadResult.success) {
          avatarUrl = uploadResult.url;
        } else {
          Alert.alert(t('common.error'), 'Error al subir la imagen');
          setLoading(false);
          return;
        }
      }

      // Actualizar perfil con todos los datos
      const res = await updateUserProfile({ 
        name, 
        phone,
        profile_photo_url: avatarUrl
      });
      
      setLoading(false);

      if (res.success) {
        setNewAvatarUri(null); // Limpiar
        Alert.alert(t('common.success'), t('editProfile.success.profileUpdated'));
        if (refreshUser) refreshUser();
        if (refreshProfile) refreshProfile();
        router.back();
      } else {
        Alert.alert(t('common.error'), res.error || t('editProfile.errors.updateFailed'));
      }
    } catch (error) {
      setLoading(false);
      Alert.alert(t('common.error'), error.message || t('editProfile.errors.updateFailed'));
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert(t('common.error'), t('editProfile.errors.passwordLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('editProfile.errors.passwordMismatch'));
      return;
    }

    setLoading(true);
    const res = await changePassword(newPassword);
    setLoading(false);

    if (res.success) {
      Alert.alert(t('common.success'), t('editProfile.success.passwordUpdated'));
      setNewPassword('');
      setConfirmPassword('');
    } else {
      Alert.alert(t('common.error'), res.error || t('editProfile.errors.passwordChangeFailed'));
    }
  };

  const handleToggleBiometric = async (value) => {
    setBiometricLoading(true);
    
    try {
      if (value) {
        const result = await enableBiometric();
        if (result.success) {
          Alert.alert(t('editProfile.biometric.activated'), t('editProfile.biometric.activatedMessage', { type: getBiometricLabel() }));
        } else {
          Alert.alert(t('common.error'), result.error || t('editProfile.errors.biometricActivateFailed'));
        }
      } else {
        Alert.alert(
          t('editProfile.biometric.deactivateTitle', { type: getBiometricLabel() }),
          t('editProfile.biometric.deactivateConfirm'),
          [
            { text: t('common.cancel'), style: 'cancel', onPress: () => setBiometricLoading(false) },
            {
              text: t('editProfile.biometric.deactivate'),
              style: 'destructive',
              onPress: async () => {
                const result = await disableBiometric();
                if (result.success) {
                  Alert.alert(t('editProfile.biometric.deactivated'), t('editProfile.biometric.deactivatedMessage', { type: getBiometricLabel() }));
                }
                setBiometricLoading(false);
              }
            }
          ]
        );
        return;
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('editProfile.errors.biometricConfigFailed'));
    } finally {
      if (value) setBiometricLoading(false);
    }
  };

  const getBiometricIcon = () => {
    if (biometricType === 'face') return 'scan-outline';
    if (biometricType === 'fingerprint') return 'finger-print-outline';
    return 'shield-checkmark-outline';
  };

  const biometricLabel = getBiometricLabel ? getBiometricLabel() : 'Biometría';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('editProfile.title')}</Text>
        <View style={{ width: scale(40) }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'info' && styles.tabActive]}
          onPress={() => setActiveTab('info')}
        >
          <Ionicons name="person-outline" size={18} color={activeTab === 'info' ? COLORS.background : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>{t('editProfile.tabs.info')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'password' && styles.tabActive]}
          onPress={() => setActiveTab('password')}
        >
          <Ionicons name="lock-closed-outline" size={18} color={activeTab === 'password' ? COLORS.background : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'password' && styles.tabTextActive]}>{t('editProfile.tabs.password')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'security' && styles.tabActive]}
          onPress={() => setActiveTab('security')}
        >
          <Ionicons name="shield-checkmark-outline" size={18} color={activeTab === 'security' ? COLORS.background : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'security' && styles.tabTextActive]}>{t('editProfile.tabs.security')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'info' ? (
          <View style={styles.section}>
            {/* Avatar */}
            <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage} disabled={uploadingImage}>
              {uploadingImage ? (
                <View style={styles.avatarPlaceholder}>
                  <ActivityIndicator color={COLORS.lime} size="large" />
                </View>
              ) : avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{name?.charAt(0)?.toUpperCase() || '?'}</Text>
                </View>
              )}
              <View style={styles.avatarEdit}>
                <Ionicons name="camera" size={16} color={COLORS.background} />
              </View>
              {newAvatarUri && (
                <View style={styles.newImageBadge}>
                  <Text style={styles.newImageBadgeText}>Nueva</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('editProfile.form.fullName')}</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Tu nombre"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('editProfile.form.email')}</Text>
              <View style={[styles.input, styles.inputDisabled]}>
                <Text style={styles.inputDisabledText}>{user?.email}</Text>
                <Ionicons name="lock-closed" size={16} color={COLORS.textMuted} />
              </View>
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('editProfile.form.phone')}</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+504 9999-9999"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
              onPress={handleUpdateProfile}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={COLORS.background} />
                  <Text style={[styles.saveBtnText, { marginLeft: 8 }]}>
                    {uploadingImage ? 'Subiendo imagen...' : 'Guardando...'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.saveBtnText}>{t('editProfile.saveChanges')}</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : activeTab === 'password' ? (
          <View style={styles.section}>
            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('editProfile.form.newPassword')}</Text>
              <View style={styles.passwordInput}>
                <TextInput
                  style={styles.passwordField}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t('editProfile.form.minChars')}
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('editProfile.form.confirmPassword')}</Text>
              <View style={styles.passwordInput}>
                <TextInput
                  style={styles.passwordField}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('editProfile.form.repeatPassword')}
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                />
              </View>
            </View>

            {/* Change Password Button */}
            <TouchableOpacity
              style={[styles.saveBtn, (loading || !newPassword) && styles.saveBtnDisabled]}
              onPress={handleChangePassword}
              disabled={loading || !newPassword}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.saveBtnText}>{t('editProfile.changePassword')}</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // Security Tab
          <View style={styles.section}>
            {/* Biometric Section */}
            <View style={styles.securityCard}>
              <View style={styles.securityIconContainer}>
                <Ionicons name={getBiometricIcon()} size={32} color={COLORS.lime} />
              </View>
              
              <Text style={styles.securityTitle}>
                {biometricAvailable ? biometricLabel : t('editProfile.security.biometric')}
              </Text>
              
              <Text style={styles.securityDescription}>
                {biometricAvailable 
                  ? t('editProfile.security.biometricDescription', { type: biometricLabel })
                  : t('editProfile.security.biometricUnavailable')
                }
              </Text>

              {biometricAvailable && (
                <View style={styles.toggleContainer}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>
                      {biometricEnabled ? t('editProfile.security.enabled') : t('editProfile.security.disabled')}
                    </Text>
                    <Text style={styles.toggleStatus}>
                      {biometricEnabled 
                        ? t('editProfile.security.canUse', { type: biometricLabel })
                        : t('editProfile.security.tapToEnable')
                      }
                    </Text>
                  </View>
                  
                  {biometricLoading ? (
                    <ActivityIndicator color={COLORS.lime} />
                  ) : (
                    <Switch
                      value={biometricEnabled}
                      onValueChange={handleToggleBiometric}
                      trackColor={{ false: COLORS.backgroundTertiary, true: 'rgba(212, 254, 72, 0.3)' }}
                      thumbColor={biometricEnabled ? COLORS.lime : COLORS.textMuted}
                      ios_backgroundColor={COLORS.backgroundTertiary}
                    />
                  )}
                </View>
              )}

              {!biometricAvailable && (
                <View style={styles.unavailableBox}>
                  <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.unavailableText}>
                    {t('editProfile.security.setupBiometric')}
                  </Text>
                </View>
              )}
            </View>

            {/* Security Info */}
            <View style={styles.securityInfoBox}>
              <View style={styles.securityInfoRow}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.green} />
                <Text style={styles.securityInfoText}>
                  {t('editProfile.security.info1')}
                </Text>
              </View>
              <View style={styles.securityInfoRow}>
                <Ionicons name="lock-closed" size={20} color={COLORS.green} />
                <Text style={styles.securityInfoText}>
                  {t('editProfile.security.info2')}
                </Text>
              </View>
              <View style={styles.securityInfoRow}>
                <Ionicons name="key" size={20} color={COLORS.green} />
                <Text style={styles.securityInfoText}>
                  {t('editProfile.security.info3')}
                </Text>
              </View>
            </View>
          </View>
        )}
        
        <View style={{ height: scale(100) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(16), paddingVertical: scale(12) },
  backBtn: { width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
  headerTitle: { fontSize: scale(18), fontWeight: '600', color: COLORS.textPrimary },
  
  // Tabs
  tabs: { flexDirection: 'row', paddingHorizontal: scale(16), paddingVertical: scale(8), gap: scale(8) },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(4), paddingVertical: scale(12), borderRadius: scale(12), backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder },
  tabActive: { backgroundColor: COLORS.lime, borderColor: COLORS.lime },
  tabText: { fontSize: scale(12), color: COLORS.textSecondary, fontWeight: '500' },
  tabTextActive: { color: COLORS.background, fontWeight: '600' },

  content: { flex: 1 },
  section: { padding: scale(20) },

  // Avatar
  avatarContainer: { alignSelf: 'center', marginBottom: scale(24), position: 'relative' },
  avatar: { width: scale(100), height: scale(100), borderRadius: scale(50) },
  avatarPlaceholder: { width: scale(100), height: scale(100), borderRadius: scale(50), backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: scale(36), fontWeight: '700', color: COLORS.textPrimary },
  avatarEdit: { position: 'absolute', bottom: 0, right: 0, width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: COLORS.lime, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: COLORS.background },
  newImageBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: COLORS.green, paddingHorizontal: scale(8), paddingVertical: scale(2), borderRadius: scale(8) },
  newImageBadgeText: { color: COLORS.textPrimary, fontSize: scale(10), fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },

  // Inputs
  inputGroup: { marginBottom: scale(16) },
  label: { fontSize: scale(14), fontWeight: '500', color: COLORS.textSecondary, marginBottom: scale(8) },
  input: { backgroundColor: COLORS.backgroundTertiary, borderRadius: scale(12), padding: scale(14), fontSize: scale(16), color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.cardBorder },
  inputDisabled: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputDisabledText: { fontSize: scale(16), color: COLORS.textMuted },

  passwordInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundTertiary, borderRadius: scale(12), paddingRight: scale(14), borderWidth: 1, borderColor: COLORS.cardBorder },
  passwordField: { flex: 1, padding: scale(14), fontSize: scale(16), color: COLORS.textPrimary },

  saveBtn: { backgroundColor: COLORS.lime, borderRadius: scale(12), padding: scale(16), alignItems: 'center', marginTop: scale(8) },
  saveBtnDisabled: { backgroundColor: COLORS.backgroundTertiary },
  saveBtnText: { color: COLORS.background, fontSize: scale(16), fontWeight: '600' },

  // Security Tab
  securityCard: {
    backgroundColor: COLORS.card,
    borderRadius: scale(16),
    padding: scale(24),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  securityIconContainer: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: 'rgba(212, 254, 72, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  securityTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  securityDescription: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scale(20),
    marginBottom: scale(24),
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: scale(16),
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  toggleInfo: { flex: 1 },
  toggleLabel: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  toggleStatus: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  unavailableBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(12),
    padding: scale(16),
    gap: scale(12),
    width: '100%',
  },
  unavailableText: {
    flex: 1,
    fontSize: scale(13),
    color: COLORS.textSecondary,
    lineHeight: scale(18),
  },
  securityInfoBox: {
    marginTop: scale(24),
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: scale(12),
    padding: scale(16),
    gap: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  securityInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  securityInfoText: {
    flex: 1,
    fontSize: scale(13),
    color: COLORS.green,
  },
});