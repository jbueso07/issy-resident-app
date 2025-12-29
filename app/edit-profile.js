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
import { updateUserProfile, changePassword } from '../src/services/api';

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
  const [activeTab, setActiveTab] = useState('info');
  const [biometricLoading, setBiometricLoading] = useState(false);
  
  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar_url || user?.profile_photo_url || null);
  
  // Password form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    setLoading(true);
    const res = await updateUserProfile({ name, phone });
    setLoading(false);

    if (res.success) {
      Alert.alert('Éxito', 'Perfil actualizado');
      if (refreshUser) refreshUser();
      if (refreshProfile) refreshProfile();
      router.back();
    } else {
      Alert.alert('Error', res.error || 'No se pudo actualizar');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    const res = await changePassword(newPassword);
    setLoading(false);

    if (res.success) {
      Alert.alert('Éxito', 'Contraseña actualizada');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      Alert.alert('Error', res.error || 'No se pudo cambiar la contraseña');
    }
  };

  const handleToggleBiometric = async (value) => {
    setBiometricLoading(true);
    
    try {
      if (value) {
        const result = await enableBiometric();
        if (result.success) {
          Alert.alert('¡Activado!', `${getBiometricLabel()} ha sido activado correctamente.`);
        } else {
          Alert.alert('Error', result.error || 'No se pudo activar la biometría');
        }
      } else {
        Alert.alert(
          'Desactivar ' + getBiometricLabel(),
          '¿Estás seguro de desactivar el inicio rápido?',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => setBiometricLoading(false) },
            {
              text: 'Desactivar',
              style: 'destructive',
              onPress: async () => {
                const result = await disableBiometric();
                if (result.success) {
                  Alert.alert('Desactivado', `${getBiometricLabel()} ha sido desactivado.`);
                }
                setBiometricLoading(false);
              }
            }
          ]
        );
        return;
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al cambiar la configuración');
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
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={{ width: scale(40) }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'info' && styles.tabActive]}
          onPress={() => setActiveTab('info')}
        >
          <Ionicons name="person-outline" size={18} color={activeTab === 'info' ? COLORS.background : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>Info</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'password' && styles.tabActive]}
          onPress={() => setActiveTab('password')}
        >
          <Ionicons name="lock-closed-outline" size={18} color={activeTab === 'password' ? COLORS.background : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'password' && styles.tabTextActive]}>Contraseña</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'security' && styles.tabActive]}
          onPress={() => setActiveTab('security')}
        >
          <Ionicons name="shield-checkmark-outline" size={18} color={activeTab === 'security' ? COLORS.background : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'security' && styles.tabTextActive]}>Seguridad</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'info' ? (
          <View style={styles.section}>
            {/* Avatar */}
            <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{name?.charAt(0)?.toUpperCase() || '?'}</Text>
                </View>
              )}
              <View style={styles.avatarEdit}>
                <Ionicons name="camera" size={16} color={COLORS.background} />
              </View>
            </TouchableOpacity>

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre completo</Text>
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
              <Text style={styles.label}>Correo electrónico</Text>
              <View style={[styles.input, styles.inputDisabled]}>
                <Text style={styles.inputDisabledText}>{user?.email}</Text>
                <Ionicons name="lock-closed" size={16} color={COLORS.textMuted} />
              </View>
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Teléfono</Text>
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
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.saveBtnText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : activeTab === 'password' ? (
          <View style={styles.section}>
            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nueva contraseña</Text>
              <View style={styles.passwordInput}>
                <TextInput
                  style={styles.passwordField}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Mínimo 6 caracteres"
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
              <Text style={styles.label}>Confirmar contraseña</Text>
              <View style={styles.passwordInput}>
                <TextInput
                  style={styles.passwordField}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repite la contraseña"
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
                <Text style={styles.saveBtnText}>Cambiar Contraseña</Text>
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
                {biometricAvailable ? biometricLabel : 'Biometría'}
              </Text>
              
              <Text style={styles.securityDescription}>
                {biometricAvailable 
                  ? `Usa ${biometricLabel} para iniciar sesión más rápido sin necesidad de escribir tu contraseña.`
                  : 'La autenticación biométrica no está disponible en este dispositivo.'
                }
              </Text>

              {biometricAvailable && (
                <View style={styles.toggleContainer}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>
                      {biometricEnabled ? 'Activado' : 'Desactivado'}
                    </Text>
                    <Text style={styles.toggleStatus}>
                      {biometricEnabled 
                        ? `Puedes usar ${biometricLabel} para iniciar sesión`
                        : 'Toca el switch para activar'
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
                    Configura Face ID o Touch ID en los ajustes de tu dispositivo para usar esta función.
                  </Text>
                </View>
              )}
            </View>

            {/* Security Info */}
            <View style={styles.securityInfoBox}>
              <View style={styles.securityInfoRow}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.green} />
                <Text style={styles.securityInfoText}>
                  Tus datos biométricos nunca salen de tu dispositivo
                </Text>
              </View>
              <View style={styles.securityInfoRow}>
                <Ionicons name="lock-closed" size={20} color={COLORS.green} />
                <Text style={styles.securityInfoText}>
                  Las credenciales se almacenan de forma segura
                </Text>
              </View>
              <View style={styles.securityInfoRow}>
                <Ionicons name="key" size={20} color={COLORS.green} />
                <Text style={styles.securityInfoText}>
                  Siempre puedes usar tu contraseña como alternativa
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
  avatarContainer: { alignSelf: 'center', marginBottom: scale(24) },
  avatar: { width: scale(100), height: scale(100), borderRadius: scale(50) },
  avatarPlaceholder: { width: scale(100), height: scale(100), borderRadius: scale(50), backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: scale(36), fontWeight: '700', color: COLORS.textPrimary },
  avatarEdit: { position: 'absolute', bottom: 0, right: 0, width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: COLORS.lime, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: COLORS.background },

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