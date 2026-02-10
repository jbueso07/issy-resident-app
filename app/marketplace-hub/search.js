// app/marketplace-hub/search.js
// ISSY Marketplace - Search Screen
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
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, Stack } from 'expo-router';

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
};

// Categorías
const CATEGORIES = [
  { id: 'all', name: 'Todos', icon: 'apps' },
  { id: 'home', name: 'Hogar', icon: 'home' },
  { id: 'beauty', name: 'Belleza', icon: 'sparkles' },
  { id: 'tech', name: 'Tecnología', icon: 'laptop' },
  { id: 'health', name: 'Salud', icon: 'fitness' },
  { id: 'education', name: 'Educación', icon: 'school' },
  { id: 'automotive', name: 'Automotriz', icon: 'car' },
  { id: 'events', name: 'Eventos', icon: 'calendar' },
  { id: 'pets', name: 'Mascotas', icon: 'paw' },
];

// Opciones de ordenamiento
const SORT_OPTIONS = [
  { id: 'featured', label: 'Destacados' },
  { id: 'rating', label: 'Mejor Calificados' },
  { id: 'price_low', label: 'Precio: Menor a Mayor' },
  { id: 'price_high', label: 'Precio: Mayor a Menor' },
  { id: 'newest', label: 'Más Recientes' },
  { id: 'popular', label: 'Más Populares' },
];

// Mock de servicios
const MOCK_SERVICES = [
  {
    id: '1',
    title: 'Limpieza Profesional',
    provider: 'CleanPro Services',
    category: 'home',
    price: 450,
    rating: 4.9,
    reviews: 128,
    icon: 'sparkles',
    color: COLORS.teal,
  },
  {
    id: '2',
    title: 'Plomería Express',
    provider: 'Fix-It Rápido',
    category: 'home',
    price: 350,
    rating: 4.7,
    reviews: 89,
    icon: 'water',
    color: COLORS.blue,
  },
  {
    id: '3',
    title: 'Electricista Certificado',
    provider: 'ElectroSafe',
    category: 'home',
    price: 400,
    rating: 4.8,
    reviews: 156,
    icon: 'flash',
    color: COLORS.orange,
  },
  {
    id: '4',
    title: 'Jardinería y Paisajismo',
    provider: 'GreenThumb Pro',
    category: 'home',
    price: 500,
    rating: 4.6,
    reviews: 72,
    icon: 'leaf',
    color: COLORS.green,
  },
  {
    id: '5',
    title: 'Clases de Yoga',
    provider: 'Zen Studio',
    category: 'health',
    price: 200,
    rating: 4.9,
    reviews: 234,
    icon: 'body',
    color: COLORS.purple,
  },
  {
    id: '6',
    title: 'Peluquería a Domicilio',
    provider: 'Style at Home',
    category: 'beauty',
    price: 350,
    rating: 4.8,
    reviews: 189,
    icon: 'cut',
    color: COLORS.coral,
  },
];

export default function SearchScreen() {
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState(params.q || '');
  const [selectedCategory, setSelectedCategory] = useState(params.category || 'all');
  const [sortBy, setSortBy] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState([]);

  // Filtros avanzados
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    searchServices();
  }, [searchQuery, selectedCategory, sortBy]);

  const searchServices = async () => {
    setLoading(true);
    // Simular búsqueda
    await new Promise(resolve => setTimeout(resolve, 500));

    let filtered = [...MOCK_SERVICES];

    // Filtrar por categoría
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(s => s.category === selectedCategory);
    }

    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.provider.toLowerCase().includes(query)
      );
    }

    // Filtrar por rating
    if (minRating > 0) {
      filtered = filtered.filter(s => s.rating >= minRating);
    }

    // Filtrar por precio
    filtered = filtered.filter(s =>
      s.price >= priceRange.min && s.price <= priceRange.max
    );

    // Ordenar
    switch (sortBy) {
      case 'price_low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'popular':
        filtered.sort((a, b) => b.reviews - a.reviews);
        break;
      default:
        break;
    }

    setServices(filtered);
    setLoading(false);
  };

  const handleServicePress = (serviceId) => {
    router.push(`/marketplace-hub/service/${serviceId}`);
  };

  const renderServiceItem = ({ item }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => handleServicePress(item.id)}
      activeOpacity={0.8}
    >
      <View style={[styles.serviceIcon, { backgroundColor: `${item.color}20` }]}>
        <Ionicons name={item.icon} size={28} color={item.color} />
      </View>
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.serviceProvider} numberOfLines={1}>{item.provider}</Text>
        <View style={styles.serviceFooter}>
          <Text style={styles.servicePrice}>L. {item.price}</Text>
          <View style={styles.serviceRating}>
            <Ionicons name="star" size={12} color={COLORS.orange} />
            <Text style={styles.serviceRatingText}>{item.rating}</Text>
            <Text style={styles.serviceReviews}>({item.reviews})</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Search Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar servicios..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={!params.q}
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
            onPress={() => setShowFilters(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="options" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === category.id && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(category.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={category.icon}
                  size={16}
                  color={selectedCategory === category.id ? COLORS.textDark : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === category.id && styles.categoryChipTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Sort Bar */}
        <View style={styles.sortBar}>
          <Text style={styles.resultsCount}>
            {services.length} resultado{services.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => {
              const currentIndex = SORT_OPTIONS.findIndex(o => o.id === sortBy);
              const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length;
              setSortBy(SORT_OPTIONS[nextIndex].id);
            }}
          >
            <Ionicons name="swap-vertical" size={16} color={COLORS.teal} />
            <Text style={styles.sortText}>
              {SORT_OPTIONS.find(o => o.id === sortBy)?.label}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.teal} />
          </View>
        ) : services.length > 0 ? (
          <FlatList
            data={services}
            renderItem={renderServiceItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptyText}>
              No encontramos servicios que coincidan con tu búsqueda
            </Text>
          </View>
        )}

        {/* Filters Modal */}
        <Modal
          visible={showFilters}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowFilters(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Sort Options */}
              <Text style={styles.filterSectionTitle}>Ordenar por</Text>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.filterOption}
                  onPress={() => setSortBy(option.id)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      sortBy === option.id && styles.filterOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {sortBy === option.id && (
                    <Ionicons name="checkmark" size={20} color={COLORS.teal} />
                  )}
                </TouchableOpacity>
              ))}

              {/* Rating Filter */}
              <Text style={styles.filterSectionTitle}>Calificación mínima</Text>
              <View style={styles.ratingOptions}>
                {[0, 3, 3.5, 4, 4.5].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingChip,
                      minRating === rating && styles.ratingChipActive,
                    ]}
                    onPress={() => setMinRating(rating)}
                  >
                    {rating > 0 && (
                      <Ionicons
                        name="star"
                        size={14}
                        color={minRating === rating ? COLORS.textDark : COLORS.orange}
                      />
                    )}
                    <Text
                      style={[
                        styles.ratingChipText,
                        minRating === rating && styles.ratingChipTextActive,
                      ]}
                    >
                      {rating === 0 ? 'Todos' : `${rating}+`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setSortBy('featured');
                  setMinRating(0);
                  setPriceRange({ min: 0, max: 10000 });
                }}
              >
                <Text style={styles.clearButtonText}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  setShowFilters(false);
                  searchServices();
                }}
              >
                <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },

  // ============ HEADER ============
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    gap: scale(10),
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
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    height: scale(44),
    gap: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: scale(15),
    color: COLORS.textPrimary,
  },
  filterButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // ============ CATEGORIES ============
  categoriesSection: {
    paddingVertical: scale(8),
  },
  categoriesContainer: {
    paddingHorizontal: scale(16),
    gap: scale(8),
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(6),
  },
  categoryChipActive: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  categoryChipText: {
    fontSize: scale(13),
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: COLORS.textDark,
  },

  // ============ SORT BAR ============
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  resultsCount: {
    fontSize: scale(13),
    color: COLORS.textMuted,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  sortText: {
    fontSize: scale(13),
    color: COLORS.teal,
    fontWeight: '500',
  },

  // ============ RESULTS ============
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(100),
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
  serviceReviews: {
    fontSize: scale(11),
    color: COLORS.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(40),
  },
  emptyTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  emptyText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // ============ MODAL ============
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: scale(16),
  },
  filterSectionTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: scale(16),
    marginBottom: scale(12),
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterOptionText: {
    fontSize: scale(15),
    color: COLORS.textPrimary,
  },
  filterOptionTextActive: {
    color: COLORS.teal,
    fontWeight: '600',
  },
  ratingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    gap: scale(6),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratingChipActive: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  ratingChipText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  ratingChipTextActive: {
    color: COLORS.textDark,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: scale(16),
    gap: scale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  clearButton: {
    flex: 1,
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  applyButton: {
    flex: 2,
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: COLORS.teal,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textDark,
  },
});
