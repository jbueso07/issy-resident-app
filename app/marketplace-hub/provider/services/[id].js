// app/marketplace-hub/provider/services/[id].js
// ISSY Marketplace - Edit Service Screen
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
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { getServiceById, updateService, getCategories } from '../../../../src/services/marketplaceApi';

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
  red: '#EF4444',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  border: 'rgba(255, 255, 255, 0.1)',
};

const PRICING_TYPES = [
  { id: 'fixed', label: 'Precio Fijo', icon: 'pricetag' },
  { id: 'hourly', label: 'Por Hora', icon: 'time' },
  { id: 'quote', label: 'Cotización', icon: 'document-text' },
];

export default function EditServiceScreen() {
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    pricing_type: 'fixed',
    base_price: '',
    duration_minutes: '',
    includes: '',
    requirements: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [serviceResult, categoriesResult] = await Promise.all([
        getServiceById(id),
        getCategories(),
      ]);

      if (categoriesResult.success) {
        setCategories(categoriesResult.data.categories || categoriesResult.data || []);
      }

      if (serviceResult.success) {
        const service = serviceResult.data;
        setFormData({
          name: service.name || '',
          description: service.description || '',
          category_id: service.category_id || service.category?.id || '',
          pricing_type: service.pricing_type || 'fixed',
          base_price: service.base_price?.toString() || '',
          duration_minutes: service.duration_minutes?.toString() || '',
          includes: Array.isArray(service.includes) ? service.includes.join('\n') : '',
          requirements: Array.isArray(service.requirements) ? service.requirements.join('\n') : '',
        });
      }
    } catch (error) {
      console.error('Error loading service:', error);
      Alert.alert('Error', 'No se pudo cargar el servicio');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es requerida';
    }
    if (!formData.category_id) {
      newErrors.category_id = 'Selecciona una categoría';
    }
    if (formData.pricing_type !== 'quote' && !formData.base_price) {
      newErrors.base_price = 'El precio es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const serviceData = {
        ...formData,
        base_price: formData.base_price ? parseFloat(formData.base_price) : null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        includes: formData.includes ? formData.includes.split('\n').filter(i => i.trim()) : [],
        requirements: formData.requirements ? formData.requirements.split('\n').filter(r => r.trim()) : [],
      };

      const result = await updateService(id, serviceData);

      if (result.success) {
        Alert.alert(
          '¡Éxito!',
          'Servicio actualizado correctamente',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', result.error || 'No se pudo actualizar el servicio');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al actualizar el servicio');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
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
        <Text style={styles.headerTitle}>Editar Servicio</Text>
        <View style={styles.headerSpacer} />
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
          {/* Nombre */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre del Servicio *</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Ej: Limpieza profunda de hogar"
              placeholderTextColor={COLORS.textMuted}
              value={formData.name}
              onChangeText={(v) => updateField('name', v)}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Descripción */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descripción *</Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.description && styles.inputError]}
              placeholder="Describe detalladamente tu servicio..."
              placeholderTextColor={COLORS.textMuted}
              value={formData.description}
              onChangeText={(v) => updateField('description', v)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          {/* Categoría */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Categoría *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryOptions}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      formData.category_id === cat.id && styles.categoryOptionActive,
                    ]}
                    onPress={() => updateField('category_id', cat.id)}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        formData.category_id === cat.id && styles.categoryOptionTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            {errors.category_id && <Text style={styles.errorText}>{errors.category_id}</Text>}
          </View>

          {/* Tipo de Precio */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo de Precio</Text>
            <View style={styles.pricingOptions}>
              {PRICING_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.pricingOption,
                    formData.pricing_type === type.id && styles.pricingOptionActive,
                  ]}
                  onPress={() => updateField('pricing_type', type.id)}
                >
                  <Ionicons
                    name={type.icon}
                    size={scale(20)}
                    color={formData.pricing_type === type.id ? COLORS.bgPrimary : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.pricingOptionText,
                      formData.pricing_type === type.id && styles.pricingOptionTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Precio */}
          {formData.pricing_type !== 'quote' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Precio {formData.pricing_type === 'hourly' ? 'por Hora' : 'Base'} *
              </Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={[styles.input, styles.priceInput, errors.base_price && styles.inputError]}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                  value={formData.base_price}
                  onChangeText={(v) => updateField('base_price', v.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                />
              </View>
              {errors.base_price && <Text style={styles.errorText}>{errors.base_price}</Text>}
            </View>
          )}

          {/* Duración */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Duración Estimada (minutos)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 60"
              placeholderTextColor={COLORS.textMuted}
              value={formData.duration_minutes}
              onChangeText={(v) => updateField('duration_minutes', v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
            />
          </View>

          {/* Qué incluye */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>¿Qué incluye? (uno por línea)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Materiales de limpieza&#10;Equipo profesional&#10;Garantía de satisfacción"
              placeholderTextColor={COLORS.textMuted}
              value={formData.includes}
              onChangeText={(v) => updateField('includes', v)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Requisitos */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Requisitos (uno por línea)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Acceso a agua&#10;Estacionamiento disponible"
              placeholderTextColor={COLORS.textMuted}
              value={formData.requirements}
              onChangeText={(v) => updateField('requirements', v)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.bgPrimary} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={scale(20)} color={COLORS.bgPrimary} />
                <Text style={styles.submitButtonText}>Guardar Cambios</Text>
              </>
            )}
          </TouchableOpacity>
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
  headerSpacer: {
    width: scale(40),
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: scale(16),
    paddingBottom: scale(100),
  },
  inputGroup: {
    marginBottom: scale(20),
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
  inputError: {
    borderColor: COLORS.red,
  },
  textArea: {
    minHeight: scale(100),
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: scale(12),
    color: COLORS.red,
    marginTop: scale(4),
  },
  categoryOptions: {
    flexDirection: 'row',
    gap: scale(8),
  },
  categoryOption: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryOptionActive: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  categoryOptionText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  categoryOptionTextActive: {
    color: COLORS.bgPrimary,
    fontWeight: '600',
  },
  pricingOptions: {
    flexDirection: 'row',
    gap: scale(8),
  },
  pricingOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(6),
  },
  pricingOptionActive: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  pricingOptionText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  pricingOptionTextActive: {
    color: COLORS.bgPrimary,
    fontWeight: '600',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.lime,
    marginRight: scale(8),
  },
  priceInput: {
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    paddingVertical: scale(16),
    borderRadius: scale(12),
    gap: scale(8),
    marginTop: scale(12),
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.bgPrimary,
  },
});
