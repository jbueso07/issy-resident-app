// app/marketplace-hub/category/[id].js
// ISSY Marketplace - Category Screen
// Línea gráfica ProHome

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, Stack } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const COLORS = {
  bgPrimary: '#0F1A1E',
  bgCard: '#1C2E35',
  teal: '#00BFA6',
  orange: '#FF8A50',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  border: 'rgba(255, 255, 255, 0.1)',
};

const CATEGORIES = {
  home: { name: 'Hogar', icon: 'home', color: '#00BFA6' },
  beauty: { name: 'Belleza', icon: 'sparkles', color: '#A78BFA' },
  tech: { name: 'Tecnología', icon: 'laptop', color: '#60A5FA' },
  health: { name: 'Salud', icon: 'fitness', color: '#10B981' },
  education: { name: 'Educación', icon: 'school', color: '#818CF8' },
  automotive: { name: 'Automotriz', icon: 'car', color: '#FF8A50' },
  events: { name: 'Eventos', icon: 'calendar', color: '#FF6B6B' },
  pets: { name: 'Mascotas', icon: 'paw', color: '#00E5FF' },
};

const MOCK_SERVICES = [
  { id: '1', title: 'Limpieza Profesional', provider: 'CleanPro', price: 450, rating: 4.9, reviews: 128 },
  { id: '2', title: 'Plomería Express', provider: 'Fix-It', price: 350, rating: 4.7, reviews: 89 },
  { id: '3', title: 'Electricista', provider: 'ElectroSafe', price: 400, rating: 4.8, reviews: 156 },
];

export default function CategoryScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);

  const category = CATEGORIES[id] || { name: 'Categoría', icon: 'apps', color: COLORS.teal };

  useEffect(() => {
    loadServices();
  }, [id]);

  const loadServices = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setServices(MOCK_SERVICES);
    setLoading(false);
  };

  const renderService = ({ item }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => router.push(`/marketplace-hub/service/${item.id}`)}
      activeOpacity={0.8}
    >
      <View style={[styles.serviceIcon, { backgroundColor: `${category.color}20` }]}>
        <Ionicons name={category.icon} size={24} color={category.color} />
      </View>
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceTitle}>{item.title}</Text>
        <Text style={styles.serviceProvider}>{item.provider}</Text>
        <View style={styles.serviceFooter}>
          <Text style={styles.servicePrice}>L. {item.price}</Text>
          <View style={styles.serviceRating}>
            <Ionicons name="star" size={12} color={COLORS.orange} />
            <Text style={styles.serviceRatingText}>{item.rating}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{ title: category.name }} />

      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Category Header */}
        <View style={styles.categoryHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: `${category.color}20` }]}>
            <Ionicons name={category.icon} size={32} color={category.color} />
          </View>
          <Text style={styles.categoryTitle}>{category.name}</Text>
          <Text style={styles.categoryCount}>{services.length} servicios disponibles</Text>
        </View>

        {/* Services List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.teal} />
          </View>
        ) : (
          <FlatList
            data={services}
            renderItem={renderService}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  categoryHeader: {
    alignItems: 'center',
    padding: scale(24),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryIcon: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  categoryTitle: {
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(6),
  },
  categoryCount: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: scale(16),
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    padding: scale(14),
    borderRadius: scale(14),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(12),
  },
  serviceIcon: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
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
  serviceProvider: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginBottom: scale(8),
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servicePrice: {
    fontSize: scale(15),
    fontWeight: '700',
    color: COLORS.orange,
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
});
