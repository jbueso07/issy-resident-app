// app/marketplace-hub/booking/rate.js
// ISSY Marketplace - Rate Service Screen
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
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { rateBooking } from '../../../src/services/marketplaceApi';

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
  green: '#10B981',
  red: '#EF4444',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textDark: '#0F1A1E',

  border: 'rgba(255, 255, 255, 0.1)',
  gradientStart: '#00BFA6',
  gradientEnd: '#AAFF00',
  starColor: '#FFB800',
};

export default function RateServiceScreen() {
  const { bookingId, serviceTitle, providerName } = useLocalSearchParams();

  const [submitting, setSubmitting] = useState(false);
  const [overallRating, setOverallRating] = useState(0);
  const [categories, setCategories] = useState([
    { id: 'quality', label: 'Calidad del Servicio', value: 0 },
    { id: 'punctuality', label: 'Puntualidad', value: 0 },
    { id: 'communication', label: 'Comunicación', value: 0 },
    { id: 'professionalism', label: 'Profesionalismo', value: 0 },
  ]);
  const [comment, setComment] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(null);

  const updateCategoryRating = (id, value) => {
    setCategories(prev =>
      prev.map(cat => (cat.id === id ? { ...cat, value } : cat))
    );
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      Alert.alert('Calificación Requerida', 'Por favor selecciona una calificación general');
      return;
    }

    setSubmitting(true);

    try {
      const ratingData = {
        rating: overallRating,
        quality: categories.find(c => c.id === 'quality')?.value || 0,
        punctuality: categories.find(c => c.id === 'punctuality')?.value || 0,
        communication: categories.find(c => c.id === 'communication')?.value || 0,
        professionalism: categories.find(c => c.id === 'professionalism')?.value || 0,
        comment: comment.trim(),
        would_recommend: wouldRecommend,
      };

      const response = await rateBooking(bookingId, ratingData);

      if (response.success) {
        Alert.alert(
          '¡Gracias por tu Opinión!',
          'Tu calificación ayuda a otros usuarios a encontrar los mejores proveedores.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/marketplace-hub/bookings'),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'No se pudo enviar tu calificación. Intenta de nuevo.');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar tu calificación. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating, onSelect, size = 32) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity
            key={star}
            onPress={() => onSelect(star)}
            style={styles.starButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={size}
              color={star <= rating ? COLORS.starColor : COLORS.textMuted}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getRatingLabel = (rating) => {
    switch (rating) {
      case 1:
        return 'Muy malo';
      case 2:
        return 'Malo';
      case 3:
        return 'Regular';
      case 4:
        return 'Bueno';
      case 5:
        return 'Excelente';
      default:
        return 'Toca para calificar';
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Calificar Servicio',
          presentation: 'modal',
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.headerCard}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.teal} />
            </View>
            <Text style={styles.headerTitle}>¡Servicio Completado!</Text>
            <Text style={styles.headerSubtitle}>{serviceTitle || 'Servicio'}</Text>
            <Text style={styles.providerName}>por {providerName || 'Proveedor'}</Text>
          </View>

          {/* Overall Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Calificación General</Text>
            <View style={styles.ratingCard}>
              {renderStars(overallRating, setOverallRating, 44)}
              <Text
                style={[
                  styles.ratingLabel,
                  { color: overallRating > 0 ? COLORS.starColor : COLORS.textMuted },
                ]}
              >
                {getRatingLabel(overallRating)}
              </Text>
            </View>
          </View>

          {/* Category Ratings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalles (Opcional)</Text>
            {categories.map(category => (
              <View key={category.id} style={styles.categoryRow}>
                <Text style={styles.categoryLabel}>{category.label}</Text>
                {renderStars(category.value, v => updateCategoryRating(category.id, v), 24)}
              </View>
            ))}
          </View>

          {/* Would Recommend */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>¿Recomendarías a este proveedor?</Text>
            <View style={styles.recommendRow}>
              <TouchableOpacity
                style={[
                  styles.recommendOption,
                  wouldRecommend === true && styles.recommendOptionYes,
                ]}
                onPress={() => setWouldRecommend(true)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="thumbs-up"
                  size={28}
                  color={wouldRecommend === true ? COLORS.green : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.recommendText,
                    wouldRecommend === true && { color: COLORS.green },
                  ]}
                >
                  Sí
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.recommendOption,
                  wouldRecommend === false && styles.recommendOptionNo,
                ]}
                onPress={() => setWouldRecommend(false)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="thumbs-down"
                  size={28}
                  color={wouldRecommend === false ? COLORS.red : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.recommendText,
                    wouldRecommend === false && { color: COLORS.red },
                  ]}
                >
                  No
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Comment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comentario (Opcional)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Comparte tu experiencia con otros usuarios..."
              placeholderTextColor={COLORS.textMuted}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{comment.length}/500</Text>
          </View>

          {/* Tips */}
          <View style={styles.tipsCard}>
            <Ionicons name="bulb-outline" size={20} color={COLORS.orange} />
            <Text style={styles.tipsText}>
              Tu opinión es valiosa. Sé honesto y respetuoso para ayudar a otros usuarios y al proveedor a mejorar.
            </Text>
          </View>

          {/* Bottom Padding */}
          <View style={{ height: scale(140) }} />
        </ScrollView>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              overallRating === 0 && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting || overallRating === 0}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.textDark} />
            ) : (
              <LinearGradient
                colors={overallRating > 0 ? [COLORS.gradientStart, COLORS.gradientEnd] : [COLORS.bgCardAlt, COLORS.bgCardAlt]}
                style={styles.submitButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={overallRating > 0 ? COLORS.textDark : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.submitButtonText,
                    overallRating === 0 && { color: COLORS.textMuted },
                  ]}
                >
                  Enviar Calificación
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.replace('/marketplace-hub/bookings')}
          >
            <Text style={styles.skipButtonText}>Omitir por ahora</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  scrollContent: {
    padding: scale(16),
  },

  // ============ HEADER ============
  headerCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(20),
    padding: scale(24),
    alignItems: 'center',
    marginBottom: scale(24),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerIconContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: `${COLORS.teal}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  headerTitle: {
    fontSize: scale(22),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  headerSubtitle: {
    fontSize: scale(16),
    color: COLORS.textSecondary,
    marginBottom: scale(4),
  },
  providerName: {
    fontSize: scale(14),
    color: COLORS.textMuted,
  },

  // ============ SECTIONS ============
  section: {
    marginBottom: scale(24),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(14),
  },

  // ============ RATING ============
  ratingCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(20),
    padding: scale(24),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: scale(8),
  },
  starButton: {
    padding: scale(4),
  },
  ratingLabel: {
    marginTop: scale(12),
    fontSize: scale(16),
    fontWeight: '600',
  },

  // ============ CATEGORIES ============
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    padding: scale(14),
    borderRadius: scale(14),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryLabel: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },

  // ============ RECOMMEND ============
  recommendRow: {
    flexDirection: 'row',
    gap: scale(14),
  },
  recommendOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: scale(20),
    borderRadius: scale(14),
    backgroundColor: COLORS.bgCard,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: scale(8),
  },
  recommendOptionYes: {
    backgroundColor: `${COLORS.green}10`,
    borderColor: COLORS.green,
  },
  recommendOptionNo: {
    backgroundColor: `${COLORS.red}10`,
    borderColor: COLORS.red,
  },
  recommendText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  // ============ COMMENT ============
  commentInput: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(14),
    padding: scale(16),
    fontSize: scale(15),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: scale(120),
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: scale(6),
  },

  // ============ TIPS ============
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.orange}10`,
    padding: scale(16),
    borderRadius: scale(14),
    gap: scale(12),
    alignItems: 'flex-start',
  },
  tipsText: {
    flex: 1,
    fontSize: scale(13),
    color: COLORS.textSecondary,
    lineHeight: scale(20),
  },

  // ============ BOTTOM BAR ============
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bgSecondary,
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    paddingBottom: scale(34),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  submitButton: {
    width: '100%',
    borderRadius: scale(14),
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(16),
    gap: scale(8),
  },
  submitButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textDark,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: scale(12),
    marginTop: scale(8),
  },
  skipButtonText: {
    fontSize: scale(14),
    color: COLORS.textMuted,
  },
});
