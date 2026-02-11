// app/marketplace-hub/service/[id].js
// ISSY Marketplace - Service Detail Screen
// Línea gráfica ProHome

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { getServiceById } from '../../../src/services/marketplaceApi';

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
  coral: '#FF6B6B',
  green: '#10B981',
  blue: '#60A5FA',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textDark: '#0F1A1E',

  border: 'rgba(255, 255, 255, 0.1)',
  gradientStart: '#00BFA6',
  gradientEnd: '#AAFF00',
};

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState(null);
  const [selectedTab, setSelectedTab] = useState('details');

  const isPrime = profile?.is_prime || false;

  useEffect(() => {
    loadService();
  }, [id]);

  const loadService = async () => {
    setLoading(true);
    try {
      const result = await getServiceById(id);
      if (result.success && result.data) {
        const s = result.data;
        setService({
          ...s,
          title: s.title || s.name,
          provider: s.provider || {
            id: s.provider_id,
            name: s.provider_name || 'Proveedor',
            avatar: s.provider_avatar || null,
            rating: s.provider_rating || 0,
            reviews: s.provider_reviews || 0,
            verified: s.provider_verified || false,
            responseTime: s.response_time || '< 2 horas',
            completedJobs: s.completed_jobs || 0,
          },
          category: s.category_name || s.category || '',
          subcategory: s.subcategory_name || s.subcategory || '',
          pricingType: s.pricing_type || s.pricingType || 'fixed',
          basePrice: s.base_price || s.basePrice || 0,
          priceRange: s.price_range || s.priceRange || { min: 0, max: 0 },
          priceUnit: s.price_unit || s.priceUnit || 'servicio',
          estimatedDuration: s.estimated_duration || s.estimatedDuration || 60,
          bookingType: s.booking_type || s.bookingType || 'both',
          rating: s.avg_rating || s.rating || 0,
          totalRatings: s.total_reviews || s.totalRatings || 0,
          images: s.images || [],
          icon: s.icon || 'briefcase',
          color: s.color || '#00BFA6',
          primeDiscount: s.prime_discount || s.primeDiscount || 0,
          includes: s.includes || s.service_includes || [],
          requirements: s.requirements || [],
          faqs: s.faqs || [],
        });
      } else {
        setService(null);
      }
    } catch (error) {
      console.error('Error loading service:', error);
      setService(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = () => {
    router.push({
      pathname: '/marketplace-hub/booking/create',
      params: {
        serviceId: id,
        bookingType: 'instant',
      },
    });
  };

  const handleRequestQuote = () => {
    router.push({
      pathname: '/marketplace-hub/booking/create',
      params: {
        serviceId: id,
        bookingType: 'quote',
      },
    });
  };

  const handleContactProvider = () => {
    Alert.alert(
      'Contactar Proveedor',
      'Para contactar al proveedor, primero debes crear una reserva o solicitar una cotización.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Solicitar Cotización', onPress: handleRequestQuote },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.teal} />
      </SafeAreaView>
    );
  }

  if (!service) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.textMuted} />
        <Text style={styles.errorText}>Servicio no encontrado</Text>
      </SafeAreaView>
    );
  }

  const finalPrice = isPrime && service.primeDiscount
    ? service.basePrice * (1 - service.primeDiscount / 100)
    : service.basePrice;

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent' },
        }}
      />

      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Image */}
          <View style={[styles.heroContainer, { backgroundColor: `${service.color}20` }]}>
            <Ionicons name={service.icon} size={80} color={service.color} />
            {isPrime && service.primeDiscount && (
              <View style={styles.heroDiscountBadge}>
                <Ionicons name="diamond" size={14} color={COLORS.textDark} />
                <Text style={styles.heroDiscountText}>-{service.primeDiscount}% Prime</Text>
              </View>
            )}
          </View>

          {/* Service Info */}
          <View style={styles.infoSection}>
            <Text style={styles.serviceCategory}>{service.category} • {service.subcategory}</Text>
            <Text style={styles.serviceTitle}>{service.title}</Text>

            {/* Rating */}
            <View style={styles.ratingRow}>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= Math.round(service.rating) ? 'star' : 'star-outline'}
                    size={16}
                    color={COLORS.orange}
                  />
                ))}
              </View>
              <Text style={styles.ratingText}>{service.rating}</Text>
              <Text style={styles.reviewsText}>({service.totalRatings} reseñas)</Text>
            </View>

            {/* Price */}
            <View style={styles.priceSection}>
              {isPrime && service.primeDiscount ? (
                <>
                  <Text style={styles.originalPrice}>L. {service.basePrice}</Text>
                  <Text style={styles.finalPrice}>L. {finalPrice.toFixed(0)}</Text>
                </>
              ) : (
                <Text style={styles.finalPrice}>L. {service.basePrice}</Text>
              )}
              <Text style={styles.priceUnit}>/{service.priceUnit}</Text>
            </View>
          </View>

          {/* Provider Card */}
          <TouchableOpacity
            style={styles.providerCard}
            onPress={() => router.push(`/marketplace-hub/provider/${service.provider.id}`)}
            activeOpacity={0.8}
          >
            <View style={styles.providerAvatar}>
              {service.provider.avatar ? (
                <Image source={{ uri: service.provider.avatar }} style={styles.providerAvatarImage} />
              ) : (
                <Ionicons name="person" size={24} color={COLORS.textMuted} />
              )}
              {service.provider.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={10} color={COLORS.textDark} />
                </View>
              )}
            </View>
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>{service.provider.name}</Text>
              <View style={styles.providerStats}>
                <Ionicons name="star" size={12} color={COLORS.orange} />
                <Text style={styles.providerStatText}>{service.provider.rating}</Text>
                <Text style={styles.providerStatSeparator}>•</Text>
                <Text style={styles.providerStatText}>{service.provider.completedJobs} trabajos</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {['details', 'includes', 'reviews'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, selectedTab === tab && styles.tabActive]}
                onPress={() => setSelectedTab(tab)}
              >
                <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                  {tab === 'details' ? 'Detalles' : tab === 'includes' ? 'Incluye' : 'Reseñas'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {selectedTab === 'details' && (
              <>
                <Text style={styles.sectionTitle}>Descripción</Text>
                <Text style={styles.description}>{service.description}</Text>

                <Text style={styles.sectionTitle}>Información</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Ionicons name="time-outline" size={20} color={COLORS.teal} />
                    <Text style={styles.infoLabel}>Duración estimada</Text>
                    <Text style={styles.infoValue}>{service.estimatedDuration} min</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="flash-outline" size={20} color={COLORS.teal} />
                    <Text style={styles.infoLabel}>Respuesta</Text>
                    <Text style={styles.infoValue}>{service.provider.responseTime}</Text>
                  </View>
                </View>

                {service.faqs?.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Preguntas Frecuentes</Text>
                    {service.faqs.map((faq, index) => (
                      <View key={index} style={styles.faqItem}>
                        <Text style={styles.faqQuestion}>{faq.question}</Text>
                        <Text style={styles.faqAnswer}>{faq.answer}</Text>
                      </View>
                    ))}
                  </>
                )}
              </>
            )}

            {selectedTab === 'includes' && (
              <>
                <Text style={styles.sectionTitle}>El servicio incluye</Text>
                {service.includes?.map((item, index) => (
                  <View key={index} style={styles.includeItem}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.green} />
                    <Text style={styles.includeText}>{item}</Text>
                  </View>
                ))}

                {service.requirements?.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Requisitos</Text>
                    {service.requirements.map((item, index) => (
                      <View key={index} style={styles.includeItem}>
                        <Ionicons name="information-circle" size={20} color={COLORS.orange} />
                        <Text style={styles.includeText}>{item}</Text>
                      </View>
                    ))}
                  </>
                )}
              </>
            )}

            {selectedTab === 'reviews' && (
              <View style={styles.reviewsPlaceholder}>
                <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.reviewsPlaceholderText}>
                  Las reseñas aparecerán aquí
                </Text>
              </View>
            )}
          </View>

          {/* Bottom Padding */}
          <View style={{ height: scale(120) }} />
        </ScrollView>

        {/* Bottom Action Bar */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomPriceSection}>
            <Text style={styles.bottomPriceLabel}>Desde</Text>
            <Text style={styles.bottomPrice}>L. {finalPrice.toFixed(0)}</Text>
          </View>
          <View style={styles.bottomButtons}>
            {service.bookingType === 'both' || service.bookingType === 'request' ? (
              <TouchableOpacity
                style={styles.quoteButton}
                onPress={handleRequestQuote}
                activeOpacity={0.8}
              >
                <Text style={styles.quoteButtonText}>Cotizar</Text>
              </TouchableOpacity>
            ) : null}
            {service.bookingType === 'both' || service.bookingType === 'instant' ? (
              <TouchableOpacity
                style={styles.bookButton}
                onPress={handleBookNow}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  style={styles.bookButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.bookButtonText}>Reservar</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: scale(16),
    color: COLORS.textMuted,
    marginTop: scale(16),
  },
  scrollContent: {
    paddingBottom: scale(20),
  },

  // ============ HERO ============
  heroContainer: {
    height: scale(220),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  heroDiscountBadge: {
    position: 'absolute',
    top: scale(60),
    right: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lime,
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(8),
    gap: scale(4),
  },
  heroDiscountText: {
    fontSize: scale(12),
    fontWeight: '700',
    color: COLORS.textDark,
  },

  // ============ INFO SECTION ============
  infoSection: {
    padding: scale(16),
  },
  serviceCategory: {
    fontSize: scale(13),
    color: COLORS.teal,
    fontWeight: '500',
    marginBottom: scale(8),
  },
  serviceTitle: {
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(12),
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(16),
    gap: scale(8),
  },
  ratingStars: {
    flexDirection: 'row',
    gap: scale(2),
  },
  ratingText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  reviewsText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: scale(8),
  },
  originalPrice: {
    fontSize: scale(16),
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  finalPrice: {
    fontSize: scale(28),
    fontWeight: '700',
    color: COLORS.orange,
  },
  priceUnit: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },

  // ============ PROVIDER CARD ============
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    marginHorizontal: scale(16),
    padding: scale(14),
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(12),
  },
  providerAvatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: COLORS.bgCardAlt,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  providerAvatarImage: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    backgroundColor: COLORS.teal,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.bgCard,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  providerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  providerStatText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  providerStatSeparator: {
    color: COLORS.textMuted,
  },

  // ============ TABS ============
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: scale(16),
    marginTop: scale(20),
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(12),
    padding: scale(4),
  },
  tab: {
    flex: 1,
    paddingVertical: scale(10),
    alignItems: 'center',
    borderRadius: scale(8),
  },
  tabActive: {
    backgroundColor: COLORS.bgCardAlt,
  },
  tabText: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.textPrimary,
  },

  // ============ TAB CONTENT ============
  tabContent: {
    padding: scale(16),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: scale(16),
    marginBottom: scale(12),
  },
  description: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    lineHeight: scale(22),
  },
  infoGrid: {
    flexDirection: 'row',
    gap: scale(12),
  },
  infoItem: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    padding: scale(14),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: scale(8),
  },
  infoLabel: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  faqItem: {
    backgroundColor: COLORS.bgCard,
    padding: scale(14),
    borderRadius: scale(12),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  faqQuestion: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  faqAnswer: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    lineHeight: scale(20),
  },
  includeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    paddingVertical: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  includeText: {
    flex: 1,
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  reviewsPlaceholder: {
    alignItems: 'center',
    paddingVertical: scale(40),
  },
  reviewsPlaceholderText: {
    fontSize: scale(14),
    color: COLORS.textMuted,
    marginTop: scale(12),
  },

  // ============ BOTTOM BAR ============
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    paddingBottom: scale(30),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: scale(16),
  },
  bottomPriceSection: {
    flex: 1,
  },
  bottomPriceLabel: {
    fontSize: scale(12),
    color: COLORS.textMuted,
  },
  bottomPrice: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: scale(10),
  },
  quoteButton: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  quoteButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.teal,
  },
  bookButton: {
    borderRadius: scale(12),
    overflow: 'hidden',
  },
  bookButtonGradient: {
    paddingHorizontal: scale(24),
    paddingVertical: scale(14),
  },
  bookButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textDark,
  },
});
