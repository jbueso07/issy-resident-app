// app/edit-profile.js - Editar Perfil
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../src/context/AuthContext';
import { updateUserProfile, changePassword } from '../src/services/api';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // info, password
  
  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar_url || null);
  
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
      // TODO: Upload to server
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'info' && styles.tabActive]}
          onPress={() => setActiveTab('info')}
        >
          <Ionicons name="person-outline" size={18} color={activeTab === 'info' ? '#6366F1' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>Información</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'password' && styles.tabActive]}
          onPress={() => setActiveTab('password')}
        >
          <Ionicons name="lock-closed-outline" size={18} color={activeTab === 'password' ? '#6366F1' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'password' && styles.tabTextActive]}>Contraseña</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
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
                <Ionicons name="camera" size={16} color="#FFF" />
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
              />
            </View>

            {/* Email (readonly) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo electrónico</Text>
              <View style={[styles.input, styles.inputDisabled]}>
                <Text style={styles.inputDisabledText}>{user?.email}</Text>
                <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
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
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
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
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmar contraseña</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repite la contraseña"
                secureTextEntry={!showPassword}
              />
            </View>

            {/* Change Password Button */}
            <TouchableOpacity
              style={[styles.saveBtn, (loading || !newPassword) && styles.saveBtnDisabled]}
              onPress={handleChangePassword}
              disabled={loading || !newPassword}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Cambiar Contraseña</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  
  tabs: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F3F4F6' },
  tabActive: { backgroundColor: '#EEF2FF' },
  tabText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  tabTextActive: { color: '#6366F1' },

  content: { flex: 1 },
  section: { padding: 20 },

  avatarContainer: { alignSelf: 'center', marginBottom: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 36, fontWeight: '700', color: '#FFF' },
  avatarEdit: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF' },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  inputDisabled: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB' },
  inputDisabledText: { fontSize: 16, color: '#6B7280' },

  passwordInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingRight: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  passwordField: { flex: 1, padding: 14, fontSize: 16 },

  saveBtn: { backgroundColor: '#6366F1', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnDisabled: { backgroundColor: '#9CA3AF' },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
