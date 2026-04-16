// app/airin/index.js
// ISSY × Airin - Lista de Restaurantes
// Línea gráfica ProHome

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getRestaurants } from '../../src/services/airinService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ============ COLORES PROHOME ============
const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  bgCardAlt: '#243B44',

  orange: '#FF6B35',
  lime: '#AAFF00',
  cyan: '#00E5FF',
  teal: '#00BFA6',
  coral: '#FF6B6B',
  green: '#10B981',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',

  border: 'rgba(255, 255, 255, 0.1)',
};

// ============ SKELETON LOADER ============
const SkeletonCard = () => (
  <View style={styles.card}>
    <View style={[styles.skeletonBox, { width: scale(64), height: scale(64), borderRadius: scale(12) }]} />
    <View style={styles.cardContent}>
      <View style={[styles.skeletonBox, { width: '60%', height: scale(14), borderRadius: scale(4) }]} />
      <View style={[styles.skeletonBox, { width: '40%', height: scale(12), borderRadius: scale(4), marginTop: scale(6) }]} />
      <View style={styles.cardMeta}>
        <View style={[styles.skeletonBox, { width: scale(40), height: scale(12), borderRadius: scale(4) }]} />
        <View style={[styles.skeletonBox, { width: scale(60), height: scale(12), borderRadius: scale(4) }]} />
      </View>
    </View>
  </View>
);

export default function AirinRestaurantsScreen() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchRestaurants = useCallback(async () => {
    try {
      setError(null);
      const result = await getRestaurants();
      if (result.success) {
        setRestaurants(Array.isArray(result.data) ? result.data : []);
      } else {
        setError(result.error || 'No se pudieron cargar los restaurantes');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRestaurants();
  }, [fetchRestaurants]);

  const handleRestaurantPress = (restaurant) => {
    router.push(`/airin/${restaurant.slug}`);
  };

  // ============ RENDER ============
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Restaurantes</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.orange]} />
        }
      >
        {/* Powered by Airin badge */}
        <View style={styles.poweredByRow}>
          <Ionicons name="restaurant" size={16} color={COLORS.orange} />
          <Text style={styles.poweredByText}>Powered by Airin</Text>
        </View>

        {/* Loading State */}
        {loading && (
          <View>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </View>
        )}

        {/* Error State */}
        {!loading && error && (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.coral} />
            <Text style={styles.emptyTitle}>Error al cargar</Text>
            <Text style={styles.emptySubtitle}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchRestaurants}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {!loading && !error && restaurants.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Sin restaurantes</Text>
            <Text style={styles.emptySubtitle}>No hay restaurantes disponibles en tu comunidad</Text>
          </View>
        )}

        {/* Restaurant List */}
        {!loading && restaurants.map((restaurant) => (
          <TouchableOpacity
            key={restaurant.id || restaurant.slug}
            style={styles.card}
            onPress={() => handleRestaurantPress(restaurant)}
            activeOpacity={0.7}
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              {restaurant.logo_url ? (
                <Image source={{ uri: restaurant.logo_url }} style={styles.logo} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Ionicons name="restaurant" size={28} color={COLORS.orange} />
                </View>
              )}
            </View>

            {/* Info */}
            <View style={styles.cardContent}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>{restaurant.name}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: restaurant.is_open ? COLORS.green + '20' : COLORS.textMuted + '30' }
                ]}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: restaurant.is_open ? COLORS.green : COLORS.textMuted }
                  ]} />
                  <Text style={[
                    styles.statusText,
                    { color: restaurant.is_open ? COLORS.green : COLORS.textMuted }
                  ]}>
                    {restaurant.is_open ? 'Abierto' : 'Cerrado'}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardCategory} numberOfLines={1}>
                {restaurant.category || 'Restaurante'}
              </Text>

              <View style={styles.cardMeta}>
                {restaurant.rating != null && (
                  <View style={styles.metaItem}>
                    <Ionicons name="star" size={14} color={COLORS.orange} />
                    <Text style={styles.metaText}>{Number(restaurant.rating).toFixed(1)}</Text>
                  </View>
                )}
                {restaurant.delivery_time && (
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.metaText}>{restaurant.delivery_time}</Text>
                  </View>
                )}
                {restaurant.delivery_fee != null && (
                  <View style={styles.metaItem}>
                    <Ionicons name="bicycle-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.metaText}>
                      {Number(restaurant.delivery_fee) === 0 ? 'Gratis' : `L ${restaurant.delivery_fee}`}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        ))}

        <View style={{ height: scale(40) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============ ESTILOS ============
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerRight: {
    width: scale(40),
  },
  scrollContent: {
    paddingHorizontal: scale(16),
  },
  poweredByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: scale(16),
  },
  poweredByText: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(14),
    padding: scale(14),
    marginBottom: scale(10),
  },
  logoContainer: {
    marginRight: scale(12),
  },
  logo: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(12),
    backgroundColor: COLORS.bgCardAlt,
  },
  logoPlaceholder: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(12),
    backgroundColor: COLORS.orange + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(2),
  },
  cardTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: scale(8),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(10),
    gap: scale(4),
  },
  statusDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  statusText: {
    fontSize: scale(10),
    fontWeight: '600',
  },
  cardCategory: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginBottom: scale(6),
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  metaText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // Skeleton
  skeletonBox: {
    backgroundColor: COLORS.bgCardAlt,
    opacity: 0.5,
  },

  // Empty / Error
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(60),
    gap: scale(8),
  },
  emptyTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: scale(8),
  },
  emptySubtitle: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: scale(32),
  },
  retryButton: {
    marginTop: scale(16),
    backgroundColor: COLORS.orange,
    paddingHorizontal: scale(24),
    paddingVertical: scale(10),
    borderRadius: scale(20),
  },
  retryButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
