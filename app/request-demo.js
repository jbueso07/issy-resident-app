// app/request-demo.js - Solicitar Demo B2B
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { createDemoRequest } from '../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  card: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  purple: '#6366F1',
  lime: '#D4FE48',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  green: '#10B981',
  red: '#EF4444',
};

const ROLE_OPTIONS = [
  { value: 'community_admin', label: 'Administrador de comunidad' },
  { value: 'board_member', label: 'Miembro de junta directiva' },
  { value: 'owner_resident', label: 'Propietario/Residente' },
  { value: 'management_company', label: 'Empresa de administración' },
  { value: 'developer', label: 'Desarrollador inmobiliario' },
  { value: 'other', label: 'Otro' },
];

const COMMUNITY_TYPES = [
  { value: 'horizontal', label: 'Residencial horizontal (casas)' },
  { value: 'vertical', label: 'Condominio vertical (apartamentos)' },
  { value: 'mixed', label: 'Uso mixto (residencial + comercial)' },
  { value: 'office', label: 'Edificio de oficinas' },
  { value: 'industrial', label: 'Parque industrial' },
  { value: 'commercial', label: 'Plaza comercial' },
  { value: 'other', label: 'Otro' },
];

const CURRENT_SYSTEMS = [
  { value: 'none', label: 'No tenemos sistema de control' },
  { value: 'manual', label: 'Bitácora manual (papel)' },
  { value: 'qr', label: 'Sistema con QR' },
  { value: 'rfid', label: 'Tarjetas/Tags RFID' },
  { value: 'biometric', label: 'Biométricos' },
  { value: 'other_digital', label: 'Otro sistema digital' },
];

const TIMELINE_OPTIONS = [
  { value: 'asap', label: 'Lo antes posible' },
  { value: '1-3months', label: 'En 1-3 meses' },
  { value: '3-6months', label: 'En 3-6 meses' },
  { value: 'exploring', label: 'Solo explorando opciones' },
];

const COUNTRIES = [
  { value: 'HN', label: '🇭🇳 Honduras' },
  { value: 'GT', label: '🇬🇹 Guatemala' },
  { value: 'SV', label: '🇸🇻 El Salvador' },
  { value: 'NI', label: '🇳🇮 Nicaragua' },
  { value: 'CR', label: '🇨🇷 Costa Rica' },
  { value: 'PA', label: '🇵🇦 Panamá' },
  { value: 'MX', label: '🇲🇽 México' },
  { value: 'US', label: '🇺🇸 Estados Unidos' },
  { value: 'OTHER', label: '🌎 Otro' },
];

export default function RequestDemoScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { vertical = 'access' } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: '',
    community_name: '',
    community_type: '',
    units_count: '',
    access_points: '1',
    country: '',
    city: '',
    current_system: '',
    timeline: '',
    comments: '',
  });

  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.full_name.trim()) newErrors.full_name = 'Requerido';
    if (!formData.email.trim()) newErrors.email = 'Requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email inválido';
    if (!formData.phone.trim()) newErrors.phone = 'Requerido';
    if (!formData.role) newErrors.role = 'Selecciona una opción';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.community_name.trim()) newErrors.community_name = 'Requerido';
    if (!formData.community_type) newErrors.community_type = 'Selecciona una opción';
    if (!formData.units_count.trim()) newErrors.units_count = 'Requerido';
    else if (isNaN(formData.units_count) || parseInt(formData.units_count) < 1) newErrors.units_count = 'Número inválido';
    if (!formData.country) newErrors.country = 'Selecciona una opción';
    if (!formData.city.trim()) newErrors.city = 'Requerido';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    if (!formData.current_system) newErrors.current_system = 'Selecciona una opción';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;

    setLoading(true);
    
    const result = await createDemoRequest({
      ...formData,
      vertical,
      units_count: parseInt(formData.units_count),
      access_points: parseInt(formData.access_points) || 1,
    });

    setLoading(false);

    if (result.success) {
      Alert.alert(
        '¡Solicitud Enviada!',
        'Gracias por tu interés. Nuestro equipo te contactará en las próximas 24-48 horas.',
        [{ text: 'Entendido', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Error', result.error || 'No se pudo enviar la solicitud. Intenta de nuevo.');
    }
  };

  const renderSelectField = (label, field, options, required = true) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}{required ? ' *' : ''}</Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              formData[field] === option.value && styles.optionButtonActive
            ]}
            onPress={() => updateField(field, option.value)}
          >
            <Text style={[
              styles.optionText,
              formData[field] === option.value && styles.optionTextActive
            ]}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors[field] ? <Text style={styles.errorText}>{errors[field]}</Text> : null}
    </View>
  );

  const renderTextField = (label, field, placeholder, keyboardType = 'default', required = true) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}{required ? ' *' : ''}</Text>
      <TextInput
        style={[styles.textInput, errors[field] && styles.textInputError]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        value={formData[field]}
        onChangeText={(text) => updateField(field, text)}
        keyboardType={keyboardType}
        autoCapitalize={field === 'email' ? 'none' : 'sentences'}
      />
      {errors[field] ? <Text style={styles.errorText}>{errors[field]}</Text> : null}
    </View>
  );

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>{'📋 Información de Contacto'}</Text>
      <Text style={styles.stepSubtitle}>{'Cuéntanos sobre ti para poder contactarte'}</Text>
      
      {renderTextField('Nombre completo', 'full_name', 'Ej: Juan Pérez')}
      {renderTextField('Correo electrónico', 'email', 'Ej: juan@empresa.com', 'email-address')}
      {renderTextField('Teléfono (WhatsApp)', 'phone', 'Ej: +504 9999-9999', 'phone-pad')}
      {renderSelectField('¿Cuál es tu rol?', 'role', ROLE_OPTIONS)}
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>{'🏢 Información de la Comunidad'}</Text>
      <Text style={styles.stepSubtitle}>{'Detalles sobre tu comunidad o proyecto'}</Text>
      
      {renderTextField('Nombre de la comunidad', 'community_name', 'Ej: Residencial Las Palmas')}
      {renderSelectField('Tipo de comunidad', 'community_type', COMMUNITY_TYPES)}
      {renderTextField('Cantidad de unidades', 'units_count', 'Ej: 150', 'numeric')}
      {renderTextField('Puntos de acceso (entradas)', 'access_points', 'Ej: 2', 'numeric')}
      {renderSelectField('País', 'country', COUNTRIES)}
      {renderTextField('Ciudad', 'city', 'Ej: Tegucigalpa')}
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>{'⚙️ Situación Actual'}</Text>
      <Text style={styles.stepSubtitle}>{'Ayúdanos a entender tu situación'}</Text>
      
      {renderSelectField('¿Qué sistema de acceso usan actualmente?', 'current_system', CURRENT_SYSTEMS)}
      {renderSelectField('¿Cuándo planeas implementar?', 'timeline', TIMELINE_OPTIONS, false)}
      
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{'Comentarios adicionales (opcional)'}</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="¿Tienes alguna necesidad específica o pregunta?"
          placeholderTextColor={COLORS.textMuted}
          value={formData.comments}
          onChangeText={(text) => updateField('comments', text)}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{'Solicitar Demo'}</Text>
          <View style={{ width: scale(40) }} />
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={styles.progressItem}>
              <View style={[
                styles.progressDot,
                s <= step && styles.progressDotActive,
                s < step && styles.progressDotCompleted
              ]}>
                {s < step ? (
                  <Ionicons name="checkmark" size={14} color={COLORS.background} />
                ) : (
                  <Text style={[styles.progressNumber, s <= step && styles.progressNumberActive]}>{s}</Text>
                )}
              </View>
              {s < 3 ? <View style={[styles.progressLine, s < step && styles.progressLineActive]} /> : null}
            </View>
          ))}
        </View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 ? renderStep1() : null}
          {step === 2 ? renderStep2() : null}
          {step === 3 ? renderStep3() : null}
          
          <View style={{ height: scale(100) }} />
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          {step < 3 ? (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>{'Continuar'}</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.background} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <>
                  <Ionicons name="send" size={20} color={COLORS.background} />
                  <Text style={styles.submitBtnText}>{'Enviar Solicitud'}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(40),
    paddingVertical: scale(16),
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    borderColor: COLORS.purple,
    backgroundColor: COLORS.purple,
  },
  progressDotCompleted: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  progressNumber: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  progressNumberActive: {
    color: COLORS.textPrimary,
  },
  progressLine: {
    width: scale(40),
    height: 2,
    backgroundColor: COLORS.cardBorder,
    marginHorizontal: scale(4),
  },
  progressLineActive: {
    backgroundColor: COLORS.green,
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(20),
  },
  stepTitle: {
    fontSize: scale(22),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  stepSubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginBottom: scale(24),
  },
  fieldContainer: {
    marginBottom: scale(20),
  },
  fieldLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  textInput: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(14),
    fontSize: scale(16),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  textInputError: {
    borderColor: COLORS.red,
  },
  textArea: {
    height: scale(100),
    textAlignVertical: 'top',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  optionButton: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  optionButtonActive: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purple,
  },
  optionText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  optionTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  errorText: {
    fontSize: scale(12),
    color: COLORS.red,
    marginTop: scale(4),
  },
  footer: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: COLORS.lime,
    paddingVertical: scale(16),
    borderRadius: scale(12),
  },
  nextBtnText: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.background,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: COLORS.green,
    paddingVertical: scale(16),
    borderRadius: scale(12),
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
