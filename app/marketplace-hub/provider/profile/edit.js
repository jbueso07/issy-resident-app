// app/marketplace-hub/provider/profile/edit.js
// ISSY Marketplace - Edit Provider Profile
// Línea gráfica ProHome

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { getMyProviderProfile, updateProviderProfile } from '../../../../src/services/marketplaceApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ============ COLORES PROHOME ============
const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  bgCardAlt: '#243B44',
  lime: '#AAFF00',
  cyan: '#00E5FF',
  teal: '#00BFA6',
  red: '#EF4444',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  border: 'rgba(255, 255, 255, 0.1)',
};

export default function EditProviderProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    instagram: '',
    facebook: '',
    years_experience: '',
    service_area: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const result = await getMyProviderProfile();
      if (result.success) {
        const profile = result.data;
        setFormData({
          business_name: profile.business_name || '',
          description: profile.description || '',
          phone: profile.phone || '',
          email: profile.email || '',
          address: profile.address || '',
          website: profile.website || '',
          instagram: profile.instagram || '',
          facebook: profile.facebook || '',
          years_experience: profile.years_experience?.toString() || '',
          service_area: profile.service_area || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.business_name.trim()) {
      Alert.alert('Error', 'El nombre del negocio es requerido');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
      };

      const result = await updateProviderProfile(dataToSave);

      if (result.success) {
        Alert.alert('Éxito', 'Perfil actualizado correctamente', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', result.error || 'No se pudo actualizar el perfil');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.teal} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={scale(24)} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.bgPrimary} />
          ) : (
            <Text style={styles.saveButtonText}>Guardar</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Business Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información del Negocio</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre del Negocio *</Text>
              <TextInput
                style={styles.input}
                placeholder="Tu nombre o nombre del negocio"
                placeholderTextColor={COLORS.textMuted}
                value={formData.business_name}
                onChangeText={(v) => updateField('business_name', v)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe tu negocio, experiencia y especialidades..."
                placeholderTextColor={COLORS.textMuted}
                value={formData.description}
                onChangeText={(v) => updateField('description', v)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Años de Experiencia</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 5"
                placeholderTextColor={COLORS.textMuted}
                value={formData.years_experience}
                onChangeText={(v) => updateField('years_experience', v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Área de Servicio</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Ciudad de México, Zona Metropolitana"
                placeholderTextColor={COLORS.textMuted}
                value={formData.service_area}
                onChangeText={(v) => updateField('service_area', v)}
              />
            </View>
          </View>

          {/* Contact Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información de Contacto</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                style={styles.input}
                placeholder="+52 55 1234 5678"
                placeholderTextColor={COLORS.textMuted}
                value={formData.phone}
                onChangeText={(v) => updateField('phone', v)}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor={COLORS.textMuted}
                value={formData.email}
                onChangeText={(v) => updateField('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Dirección</Text>
              <TextInput
                style={styles.input}
                placeholder="Tu dirección de negocio"
                placeholderTextColor={COLORS.textMuted}
                value={formData.address}
                onChangeText={(v) => updateField('address', v)}
              />
            </View>
          </View>

          {/* Social Media */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Redes Sociales</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sitio Web</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="globe-outline" size={scale(20)} color={COLORS.textMuted} />
                <TextInput
                  style={styles.inputIcon}
                  placeholder="www.tunegocio.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={formData.website}
                  onChangeText={(v) => updateField('website', v)}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Instagram</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="logo-instagram" size={scale(20)} color={COLORS.textMuted} />
                <TextInput
                  style={styles.inputIcon}
                  placeholder="@tunegocio"
                  placeholderTextColor={COLORS.textMuted}
                  value={formData.instagram}
                  onChangeText={(v) => updateField('instagram', v)}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Facebook</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="logo-facebook" size={scale(20)} color={COLORS.textMuted} />
                <TextInput
                  style={styles.inputIcon}
                  placeholder="facebook.com/tunegocio"
                  placeholderTextColor={COLORS.textMuted}
                  value={formData.facebook}
                  onChangeText={(v) => updateField('facebook', v)}
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  saveButton: {
    backgroundColor: COLORS.lime,
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderRadius: scale(8),
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.bgPrimary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: scale(16),
  },
  section: {
    marginBottom: scale(24),
  },
  sectionTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: scale(12),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: scale(16),
  },
  label: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  input: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(12),
    padding: scale(14),
    fontSize: scale(15),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: scale(100),
    textAlignVertical: 'top',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIcon: {
    flex: 1,
    padding: scale(14),
    paddingLeft: scale(10),
    fontSize: scale(15),
    color: COLORS.textPrimary,
  },
  bottomSpacer: {
    height: scale(100),
  },
});
