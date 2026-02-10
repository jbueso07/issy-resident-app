// app/marketplace-hub/provider/register.js
// ISSY Marketplace - Provider Registration Screen
// Línea gráfica ProHome

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';

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
  orange: '#FF8A50',
  purple: '#A78BFA',
  green: '#10B981',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textDark: '#0F1A1E',

  border: 'rgba(255, 255, 255, 0.1)',
  gradientStart: '#00BFA6',
  gradientEnd: '#AAFF00',
};

const BUSINESS_TYPES = [
  { id: 'individual', label: 'Persona Física', icon: 'person', desc: 'Ofreces servicios como individuo' },
  { id: 'company', label: 'Empresa', icon: 'business', desc: 'Tienes una empresa registrada' },
];

const SERVICE_CATEGORIES = [
  { id: 'home', name: 'Hogar', icon: 'home' },
  { id: 'beauty', name: 'Belleza', icon: 'sparkles' },
  { id: 'tech', name: 'Tecnología', icon: 'laptop' },
  { id: 'health', name: 'Salud', icon: 'fitness' },
  { id: 'education', name: 'Educación', icon: 'school' },
  { id: 'automotive', name: 'Automotriz', icon: 'car' },
  { id: 'events', name: 'Eventos', icon: 'calendar' },
  { id: 'pets', name: 'Mascotas', icon: 'paw' },
];

export default function ProviderRegisterScreen() {
  const { profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Business Type
  const [businessType, setBusinessType] = useState(null);

  // Step 2: Business Info
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(profile?.email || '');
  const [website, setWebsite] = useState('');

  // Step 3: Categories
  const [selectedCategories, setSelectedCategories] = useState([]);

  const totalSteps = 3;

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return businessType !== null;
      case 2:
        return businessName.trim().length >= 3 && phone.trim().length >= 8;
      case 3:
        return selectedCategories.length > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      // Simular registro
      await new Promise(resolve => setTimeout(resolve, 2000));

      Alert.alert(
        '¡Registro Exitoso!',
        'Tu solicitud ha sido enviada. Ahora debes completar la verificación KYC para activar tu cuenta.',
        [
          {
            text: 'Continuar',
            onPress: () => router.replace('/marketplace-hub/provider/kyc'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar tu registro. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tipo de Negocio</Text>
      <Text style={styles.stepDescription}>
        Selecciona cómo te registrarás como proveedor de servicios
      </Text>

      {BUSINESS_TYPES.map(type => (
        <TouchableOpacity
          key={type.id}
          style={[
            styles.optionCard,
            businessType === type.id && styles.optionCardSelected,
          ]}
          onPress={() => setBusinessType(type.id)}
          activeOpacity={0.8}
        >
          <View style={[
            styles.optionIcon,
            businessType === type.id && styles.optionIconSelected,
          ]}>
            <Ionicons
              name={type.icon}
              size={28}
              color={businessType === type.id ? COLORS.textDark : COLORS.teal}
            />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionLabel}>{type.label}</Text>
            <Text style={styles.optionDesc}>{type.desc}</Text>
          </View>
          {businessType === type.id && (
            <Ionicons name="checkmark-circle" size={24} color={COLORS.teal} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Información del Negocio</Text>
      <Text style={styles.stepDescription}>
        Cuéntanos sobre tu negocio o servicios
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nombre del Negocio *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Ej: CleanPro Services"
          placeholderTextColor={COLORS.textMuted}
          value={businessName}
          onChangeText={setBusinessName}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Descripción</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Describe los servicios que ofreces..."
          placeholderTextColor={COLORS.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Teléfono de Contacto *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="+504 9999-9999"
          placeholderTextColor={COLORS.textMuted}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email de Contacto</Text>
        <TextInput
          style={styles.textInput}
          placeholder="contacto@tuempresa.com"
          placeholderTextColor={COLORS.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Sitio Web (Opcional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="https://tuempresa.com"
          placeholderTextColor={COLORS.textMuted}
          value={website}
          onChangeText={setWebsite}
          keyboardType="url"
          autoCapitalize="none"
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Categorías de Servicio</Text>
      <Text style={styles.stepDescription}>
        Selecciona las categorías en las que ofreces servicios (puedes seleccionar varias)
      </Text>

      <View style={styles.categoriesGrid}>
        {SERVICE_CATEGORIES.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryCard,
              selectedCategories.includes(category.id) && styles.categoryCardSelected,
            ]}
            onPress={() => toggleCategory(category.id)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.categoryIcon,
              selectedCategories.includes(category.id) && styles.categoryIconSelected,
            ]}>
              <Ionicons
                name={category.icon}
                size={24}
                color={selectedCategories.includes(category.id) ? COLORS.textDark : COLORS.teal}
              />
            </View>
            <Text style={[
              styles.categoryName,
              selectedCategories.includes(category.id) && styles.categoryNameSelected,
            ]}>
              {category.name}
            </Text>
            {selectedCategories.includes(category.id) && (
              <View style={styles.categoryCheck}>
                <Ionicons name="checkmark" size={14} color={COLORS.textDark} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Conviértete en Proveedor</Text>
              <Text style={styles.headerSubtitle}>Paso {currentStep} de {totalSteps}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(currentStep / totalSteps) * 100}%` },
                ]}
              />
            </View>
          </View>

          {/* Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}

            {/* Bottom Padding */}
            <View style={{ height: scale(100) }} />
          </ScrollView>

          {/* Bottom Bar */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[
                styles.nextButton,
                !canProceed() && styles.nextButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={submitting || !canProceed()}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.textDark} />
              ) : (
                <LinearGradient
                  colors={canProceed() ? [COLORS.gradientStart, COLORS.gradientEnd] : [COLORS.bgCardAlt, COLORS.bgCardAlt]}
                  style={styles.nextButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={[
                    styles.nextButtonText,
                    !canProceed() && { color: COLORS.textMuted },
                  ]}>
                    {currentStep === totalSteps ? 'Enviar Solicitud' : 'Continuar'}
                  </Text>
                  <Ionicons
                    name={currentStep === totalSteps ? 'checkmark' : 'arrow-forward'}
                    size={20}
                    color={canProceed() ? COLORS.textDark : COLORS.textMuted}
                  />
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  keyboardView: {
    flex: 1,
  },

  // ============ HEADER ============
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(16),
    gap: scale(12),
  },
  backButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },

  // ============ PROGRESS ============
  progressContainer: {
    paddingHorizontal: scale(16),
    marginBottom: scale(20),
  },
  progressBar: {
    height: scale(4),
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(2),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.teal,
    borderRadius: scale(2),
  },

  // ============ CONTENT ============
  scrollContent: {
    paddingHorizontal: scale(16),
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(10),
  },
  stepDescription: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
    marginBottom: scale(24),
    lineHeight: scale(22),
  },

  // ============ OPTIONS (Step 1) ============
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    padding: scale(18),
    borderRadius: scale(16),
    marginBottom: scale(14),
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: scale(14),
  },
  optionCardSelected: {
    borderColor: COLORS.teal,
    backgroundColor: `${COLORS.teal}10`,
  },
  optionIcon: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(14),
    backgroundColor: `${COLORS.teal}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIconSelected: {
    backgroundColor: COLORS.teal,
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  optionDesc: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },

  // ============ INPUTS (Step 2) ============
  inputGroup: {
    marginBottom: scale(20),
  },
  inputLabel: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: scale(10),
  },
  textInput: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(14),
    padding: scale(16),
    fontSize: scale(15),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: scale(100),
    textAlignVertical: 'top',
  },

  // ============ CATEGORIES (Step 3) ============
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  categoryCard: {
    width: (SCREEN_WIDTH - scale(56)) / 2,
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(16),
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    position: 'relative',
  },
  categoryCardSelected: {
    borderColor: COLORS.teal,
    backgroundColor: `${COLORS.teal}10`,
  },
  categoryIcon: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(14),
    backgroundColor: `${COLORS.teal}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  categoryIconSelected: {
    backgroundColor: COLORS.teal,
  },
  categoryName: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  categoryNameSelected: {
    color: COLORS.textPrimary,
  },
  categoryCheck: {
    position: 'absolute',
    top: scale(10),
    right: scale(10),
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: COLORS.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ============ BOTTOM BAR ============
  bottomBar: {
    backgroundColor: COLORS.bgSecondary,
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    paddingBottom: scale(30),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  nextButton: {
    borderRadius: scale(14),
    overflow: 'hidden',
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(16),
    gap: scale(8),
  },
  nextButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textDark,
  },
});
