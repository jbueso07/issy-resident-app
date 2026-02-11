// app/marketplace-hub/index.js
// ISSY Marketplace - Home Screen
// Línea gráfica ProHome

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { getFeaturedServices, getServices } from '../../src/services/marketplaceApi';

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
  indigo: '#818CF8',
  blue: '#60A5FA',
  green: '#10B981',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textDark: '#0F1A1E',

  border: 'rgba(255, 255, 255, 0.1)',
  gradientStart: '#00BFA6',
  gradientEnd: '#AAFF00',
};

// ============ CATEGORÍAS ============
const CATEGORIES = [
  { id: 'home', name: 'Hogar', icon: 'home', color: COLORS.teal },
  { id: 'beauty', name: 'Belleza', icon: 'sparkles', color: COLORS.purple },
  { id: 'tech', name: 'Tecnología', icon: 'laptop', color: COLORS.blue },
  { id: 'health', name: 'Salud', icon: 'fitness', color: COLORS.green },
  { id: 'education', name: 'Educación', icon: 'school', color: COLORS.indigo },
  { id: 'automotive', name: 'Automotriz', icon: 'car', color: COLORS.orange },
  { id: 'events', name: 'Eventos', icon: 'calendar', color: COLORS.coral },
  { id: 'pets', name: 'Mascotas', icon: 'paw', color: COLORS.cyan },
];


export default function MarketplaceHomeScreen() {
  const { user, profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredServices, setFeaturedServices] = useState([]);
  const [popularServices, setPopularServices] = useState([]);
  const [error, setError] = useState(null);

  // Simular estado Prime
  const isPrime = profile?.is_prime || false;

  // Load data from APIs
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [featuredRes, popularRes] = await Promise.all([
        getFeaturedServices(),
        getServices({ limit: 8 }),
      ]);

      if (featuredRes.success && featuredRes.data) {
        setFeaturedServices(featuredRes.data);
      }

      if (popularRes.success && popularRes.data) {
        setPopularServices(popularRes.data);
      }
    } catch (err) {
      console.error('Error loading marketplace data:', err);
      setError('No se pudieron cargar los servicios. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push({
        pathname: '/marketplace-hub/search',
        params: { q: searchQuery },
      });
    }
  };

  const handleServicePress = (serviceId) => {
    router.push(`/marketplace-hub/service/${serviceId}`);
  };

  const handleCategoryPress = (categoryId) => {
    router.push(`/marketplace-hub/category/${categoryId}`);
  };

  // ============ RENDER EMPTY STATE ============
  const renderEmptyState = (message = 'No hay servicios disponibles aún') => (
    <View style={styles.emptyState}>
      <Ionicons name="briefcase-outline" size={40} color={COLORS.textMuted} />
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );

  // ============ RENDER SERVICE CARD ============
  const renderServiceCard = (service, isLarge = false) => {
    // Handle API data shape with fallbacks
    const providerName = service.provider_name || service.provider?.business_name || service.provider || 'Proveedor';
    const price = service.base_price || service.price || 0;
    const rating = service.avg_rating || service.rating || 0;
    const reviews = service.total_reviews || service.reviews || 0;
    const icon = service.icon || 'briefcase';
    const color = service.color || COLORS.teal;
    const primeDiscount = service.prime_discount || service.primeDiscount || 0;

    return (
      <TouchableOpacity
        key={service.id}
        style={[styles.serviceCard, isLarge && styles.serviceCardLarge]}
        onPress={() => handleServicePress(service.id)}
        activeOpacity={0.8}
      >
        {/* Image or Icon */}
        <View style={[styles.serviceImageContainer, { backgroundColor: `${color}20` }]}>
          {service.image ? (
            <Image source={{ uri: service.image }} style={styles.serviceImage} />
          ) : (
            <Ionicons name={icon} size={isLarge ? 40 : 32} color={color} />
          )}
          {isPrime && primeDiscount > 0 && (
            <View style={styles.primeDiscountBadge}>
              <Text style={styles.primeDiscountText}>-{primeDiscount}%</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceTitle} numberOfLines={1}>{service.title}</Text>
          <Text style={styles.serviceProvider} numberOfLines={1}>{providerName}</Text>

          <View style={styles.serviceFooter}>
            <View style={styles.servicePriceContainer}>
              <Text style={styles.servicePrice}>L. {price}</Text>
              <Text style={styles.servicePriceUnit}>/servicio</Text>
            </View>
            <View style={styles.serviceRating}>
              <Ionicons name="star" size={12} color={COLORS.orange} />
              <Text style={styles.serviceRatingText}>{rating.toFixed(1)}</Text>
              <Text style={styles.serviceReviews}>({reviews})</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.teal}
            colors={[COLORS.teal]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Marketplace</Text>
            <Text style={styles.headerSubtitle}>Servicios cerca de ti</Text>
          </View>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/marketplace-hub/bookings')}
            activeOpacity={0.7}
          >
            <Ionicons name="receipt-outline" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar servicios..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => router.push('/marketplace-hub/search')}
            activeOpacity={0.7}
          >
            <Ionicons name="options" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Prime Banner (if not Prime) */}
        {!isPrime && (
          <TouchableOpacity
            style={styles.primeBanner}
            activeOpacity={0.9}
            onPress={() => router.push('/my-subscription')}
          >
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              style={styles.primeBannerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.primeBannerContent}>
                <Ionicons name="diamond" size={28} color={COLORS.textDark} />
                <View style={styles.primeBannerText}>
                  <Text style={styles.primeBannerTitle}>ISSY Prime</Text>
                  <Text style={styles.primeBannerSubtitle}>
                    Ahorra hasta 15% en todos los servicios
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={COLORS.textDark} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={COLORS.coral} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categorías</Text>
            <TouchableOpacity onPress={() => router.push('/marketplace-hub/search')}>
              <Text style={styles.sectionLink}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(category.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryIcon, { backgroundColor: `${category.color}20` }]}>
                  <Ionicons name={category.icon} size={24} color={category.color} />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Featured Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Servicios Destacados</Text>
            <TouchableOpacity onPress={() => router.push('/marketplace-hub/search?filter=featured')}>
              <Text style={styles.sectionLink}>Ver más</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.teal} />
            </View>
          ) : featuredServices.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.servicesHorizontal}
            >
              {featuredServices.map((service) => renderServiceCard(service, true))}
            </ScrollView>
          ) : (
            renderEmptyState('No hay servicios destacados disponibles')
          )}
        </View>

        {/* Popular Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Más Populares</Text>
            <TouchableOpacity onPress={() => router.push('/marketplace-hub/search?filter=popular')}>
              <Text style={styles.sectionLink}>Ver más</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.teal} />
            </View>
          ) : popularServices.length > 0 ? (
            <View style={styles.servicesGrid}>
              {popularServices.map((service) => renderServiceCard(service))}
            </View>
          ) : (
            renderEmptyState('No hay servicios populares disponibles')
          )}
        </View>

        {/* Become Provider CTA */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.providerCTA}
            onPress={() => router.push('/marketplace-hub/provider/register')}
            activeOpacity={0.8}
          >
            <View style={styles.providerCTAIcon}>
              <Ionicons name="briefcase" size={32} color={COLORS.orange} />
            </View>
            <View style={styles.providerCTAContent}>
              <Text style={styles.providerCTATitle}>¿Ofreces servicios?</Text>
              <Text style={styles.providerCTASubtitle}>
                Únete como proveedor y llega a miles de clientes
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Bottom Padding */}
        <View style={{ height: scale(100) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  scrollContent: {
    paddingBottom: scale(20),
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
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  headerButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // ============ SEARCH ============
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    marginBottom: scale(20),
    gap: scale(10),
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(14),
    paddingHorizontal: scale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
    height: scale(48),
    gap: scale(10),
  },
  searchInput: {
    flex: 1,
    fontSize: scale(15),
    color: COLORS.textPrimary,
  },
  filterButton: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(14),
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // ============ PRIME BANNER ============
  primeBanner: {
    marginHorizontal: scale(16),
    marginBottom: scale(24),
    borderRadius: scale(16),
    overflow: 'hidden',
  },
  primeBannerGradient: {
    padding: scale(16),
  },
  primeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
  },
  primeBannerText: {
    flex: 1,
  },
  primeBannerTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textDark,
  },
  primeBannerSubtitle: {
    fontSize: scale(13),
    color: COLORS.textDark,
    opacity: 0.8,
  },

  // ============ SECTIONS ============
  section: {
    marginBottom: scale(24),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    marginBottom: scale(14),
  },
  sectionTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionLink: {
    fontSize: scale(14),
    color: COLORS.teal,
    fontWeight: '500',
  },

  // ============ CATEGORIES ============
  categoriesContainer: {
    paddingHorizontal: scale(16),
    gap: scale(12),
  },
  categoryCard: {
    alignItems: 'center',
    width: scale(80),
  },
  categoryIcon: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  categoryName: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // ============ SERVICES ============
  servicesHorizontal: {
    paddingHorizontal: scale(16),
    gap: scale(14),
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: scale(16),
    gap: scale(14),
  },
  serviceCard: {
    width: (SCREEN_WIDTH - scale(46)) / 2,
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  serviceCardLarge: {
    width: scale(180),
  },
  serviceImageContainer: {
    height: scale(100),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  primeDiscountBadge: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    backgroundColor: COLORS.lime,
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
  },
  primeDiscountText: {
    fontSize: scale(10),
    fontWeight: '700',
    color: COLORS.textDark,
  },
  serviceInfo: {
    padding: scale(12),
  },
  serviceTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  serviceProvider: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginBottom: scale(10),
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servicePriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  servicePrice: {
    fontSize: scale(14),
    fontWeight: '700',
    color: COLORS.orange,
  },
  servicePriceUnit: {
    fontSize: scale(10),
    color: COLORS.textMuted,
    marginLeft: scale(2),
  },
  serviceRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  serviceRatingText: {
    fontSize: scale(12),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  serviceReviews: {
    fontSize: scale(10),
    color: COLORS.textMuted,
  },

  // ============ PROVIDER CTA ============
  providerCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    marginHorizontal: scale(16),
    padding: scale(16),
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(14),
  },
  providerCTAIcon: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(14),
    backgroundColor: `${COLORS.orange}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerCTAContent: {
    flex: 1,
  },
  providerCTATitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  providerCTASubtitle: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },

  // ============ LOADING & EMPTY STATE ============
  loadingContainer: {
    paddingVertical: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: scale(16),
  },
  emptyStateText: {
    fontSize: scale(14),
    color: COLORS.textMuted,
    marginTop: scale(12),
    textAlign: 'center',
  },

  // ============ ERROR BANNER ============
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.coral}15`,
    marginHorizontal: scale(16),
    marginBottom: scale(16),
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: `${COLORS.coral}30`,
    gap: scale(10),
  },
  errorText: {
    flex: 1,
    fontSize: scale(13),
    color: COLORS.coral,
    fontWeight: '500',
  },
});
