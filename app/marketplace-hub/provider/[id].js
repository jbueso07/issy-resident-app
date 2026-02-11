// app/marketplace-hub/provider/[id].js
// ISSY Marketplace - Provider Public Profile
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { getProviderById } from '../../../src/services/marketplaceApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  bgCardAlt: '#243B44',
  teal: '#00BFA6',
  orange: '#FF8A50',
  green: '#10B981',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  border: 'rgba(255, 255, 255, 0.1)',
};


export default function ProviderProfileScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    loadProvider();
  }, [id]);

  const loadProvider = async () => {
    setLoading(true);
    try {
      const response = await getProviderById(id);
      if (response.success && response.data) {
        const apiData = response.data;
        // Map API response to component fields with fallbacks
        const mappedProvider = {
          id: apiData.id || id,
          businessName: apiData.business_name || apiData.businessName || 'Proveedor',
          description: apiData.description || 'Sin descripción disponible',
          rating: parseFloat(apiData.rating || apiData.avg_rating || 0),
          totalRatings: parseInt(apiData.total_ratings || apiData.ratings_count || 0),
          completedJobs: parseInt(apiData.completed_jobs || apiData.completedJobs || 0),
          responseTime: parseInt(apiData.response_time || apiData.responseTime || 0),
          responseRate: parseInt(apiData.response_rate || apiData.responseRate || 0),
          memberSince: apiData.member_since || apiData.memberSince || new Date().toISOString().substring(0, 7),
          isVerified: apiData.is_verified || apiData.isVerified || false,
          categories: Array.isArray(apiData.categories) ? apiData.categories : [apiData.category || 'Servicios'],
          services: Array.isArray(apiData.services) ? apiData.services.map(svc => ({
            id: svc.id || svc.service_id || '',
            title: svc.title || svc.service_title || 'Servicio',
            price: parseFloat(svc.price || svc.base_price || 0),
            rating: parseFloat(svc.rating || svc.avg_rating || 0),
          })) : [],
        };
        setProvider(mappedProvider);
      } else {
        setProvider(null);
      }
    } catch (error) {
      console.error('Error loading provider:', error);
      setProvider(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.teal} />
      </SafeAreaView>
    );
  }

  if (!provider) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.textMuted} />
        <Text style={styles.errorText}>Proveedor no encontrado</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: provider.businessName }} />

      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Ionicons name="business" size={48} color={COLORS.teal} />
              {provider.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={14} color={COLORS.bgPrimary} />
                </View>
              )}
            </View>
            <Text style={styles.businessName}>{provider.businessName}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={18} color={COLORS.orange} />
              <Text style={styles.ratingText}>{provider.rating}</Text>
              <Text style={styles.ratingCount}>({provider.totalRatings} reseñas)</Text>
            </View>
            <View style={styles.categoriesRow}>
              {provider.categories.map((cat, index) => (
                <View key={index} style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{cat}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Acerca de</Text>
            <Text style={styles.description}>{provider.description}</Text>
          </View>

          {/* Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estadísticas</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{provider.completedJobs}</Text>
                <Text style={styles.statLabel}>Trabajos</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{provider.responseRate}%</Text>
                <Text style={styles.statLabel}>Respuesta</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{provider.responseTime}m</Text>
                <Text style={styles.statLabel}>Tiempo Resp.</Text>
              </View>
            </View>
          </View>

          {/* Services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Servicios</Text>
            {provider.services.map(service => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                onPress={() => router.push(`/marketplace-hub/service/${service.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceTitle}>{service.title}</Text>
                  <View style={styles.serviceRating}>
                    <Ionicons name="star" size={12} color={COLORS.orange} />
                    <Text style={styles.serviceRatingText}>{service.rating}</Text>
                  </View>
                </View>
                <Text style={styles.servicePrice}>L. {service.price}</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Bottom Padding */}
          <View style={{ height: scale(100) }} />
        </ScrollView>
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

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    padding: scale(24),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarContainer: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: `${COLORS.teal}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(16),
    position: 'relative',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: COLORS.teal,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.bgPrimary,
  },
  businessName: {
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: scale(12),
  },
  ratingText: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  ratingCount: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  categoriesRow: {
    flexDirection: 'row',
    gap: scale(8),
  },
  categoryBadge: {
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(12),
  },
  categoryBadgeText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },

  // Sections
  section: {
    padding: scale(16),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(12),
  },
  description: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    lineHeight: scale(22),
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  statLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },

  // Services
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    padding: scale(14),
    borderRadius: scale(14),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(12),
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  serviceRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  serviceRatingText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  servicePrice: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.orange,
  },
});
