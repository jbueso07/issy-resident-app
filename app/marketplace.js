// app/marketplace.js
// ISSY - Marketplace Screen (Coming Soon)
// Línea gráfica ProHome consistente con home.js

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ============ COLORES PROHOME (idénticos a home.js) ============
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

// Categorías del marketplace
const CATEGORIES = [
  { id: 'all', label: 'Todos', icon: 'apps' },
  { id: 'services', label: 'Servicios', icon: 'construct' },
  { id: 'products', label: 'Productos', icon: 'cube' },
  { id: 'vehicles', label: 'Vehículos', icon: 'car' },
  { id: 'home', label: 'Hogar', icon: 'home' },
];

// Preview de items
const PREVIEW_ITEMS = [
  {
    id: 1,
    title: 'Jardinería profesional',
    category: 'Servicios',
    price: 'Desde L. 500',
    rating: 4.8,
    icon: 'leaf',
    color: COLORS.teal,
  },
  {
    id: 2,
    title: 'Limpieza del hogar',
    category: 'Servicios',
    price: 'Desde L. 350',
    rating: 4.9,
    icon: 'sparkles',
    color: COLORS.cyan,
  },
  {
    id: 3,
    title: 'Muebles usados',
    category: 'Hogar',
    price: 'Varios precios',
    rating: 4.5,
    icon: 'bed',
    color: COLORS.purple,
  },
  {
    id: 4,
    title: 'Reparaciones eléctricas',
    category: 'Servicios',
    price: 'Desde L. 400',
    rating: 4.7,
    icon: 'flash',
    color: COLORS.orange,
  },
];

// Beneficios
const BENEFITS = [
  {
    icon: 'shield-checkmark',
    title: 'Verificados',
    description: 'Proveedores validados por tu comunidad',
  },
  {
    icon: 'star',
    title: 'Reseñas reales',
    description: 'Opiniones de vecinos de confianza',
  },
  {
    icon: 'cash',
    title: 'Pagos seguros',
    description: 'Transacciones protegidas en la app',
  },
  {
    icon: 'location',
    title: 'Cerca de ti',
    description: 'Servicios en tu comunidad',
  },
];

export default function MarketplaceScreen() {
  const [email, setEmail] = useState('');
  const [notified, setNotified] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const handleNotify = () => {
    if (email.includes('@')) {
      setNotified(true);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
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
            <Text style={styles.headerSubtitle}>Compra y vende en tu comunidad</Text>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Pronto</Text>
          </View>
        </View>

        {/* Hero Banner */}
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
          style={styles.heroBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroIconContainer}>
            <Ionicons name="storefront" size={scale(48)} color={COLORS.textDark} />
          </View>
          <Text style={styles.heroTitle}>Tu mercado local digital</Text>
          <Text style={styles.heroDescription}>
            Pronto podrás comprar, vender e intercambiar productos y servicios 
            con personas verificadas de tu comunidad.
          </Text>
        </LinearGradient>

        {/* Categorías Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categorías</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat.id && styles.categoryChipActive
                ]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={cat.icon} 
                  size={16} 
                  color={selectedCategory === cat.id ? COLORS.textDark : COLORS.textSecondary} 
                />
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === cat.id && styles.categoryChipTextActive
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Preview Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vista previa</Text>
          <Text style={styles.sectionSubtitle}>Así se verán los servicios disponibles</Text>
          
          <View style={styles.previewGrid}>
            {PREVIEW_ITEMS.map((item) => (
              <View key={item.id} style={styles.previewCard}>
                <View style={[styles.previewIconContainer, { backgroundColor: `${item.color}30` }]}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <Text style={styles.previewTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.previewCategory}>{item.category}</Text>
                <View style={styles.previewFooter}>
                  <Text style={styles.previewPrice}>{item.price}</Text>
                  <View style={styles.previewRating}>
                    <Ionicons name="star" size={12} color={COLORS.orange} />
                    <Text style={styles.previewRatingText}>{item.rating}</Text>
                  </View>
                </View>
                {/* Overlay de bloqueo */}
                <View style={styles.previewOverlay}>
                  <Ionicons name="lock-closed" size={16} color={COLORS.textMuted} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Beneficios */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>¿Por qué usar el Marketplace?</Text>
          
          <View style={styles.benefitsContainer}>
            {BENEFITS.map((benefit, index) => (
              <View key={index} style={styles.benefitCard}>
                <View style={styles.benefitIconContainer}>
                  <Ionicons name={benefit.icon} size={20} color={COLORS.orange} />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  <Text style={styles.benefitDescription}>{benefit.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Notificación */}
        <View style={styles.notifySection}>
          <View style={styles.notifyCard}>
            <Ionicons name="notifications" size={32} color={COLORS.orange} />
            <Text style={styles.notifyTitle}>
              {notified ? '¡Te avisaremos!' : 'Sé el primero en enterarte'}
            </Text>
            <Text style={styles.notifyDescription}>
              {notified 
                ? 'Recibirás una notificación cuando el Marketplace esté disponible.'
                : 'Te notificaremos cuando lancemos el Marketplace en tu comunidad.'
              }
            </Text>
            
            {!notified ? (
              <View style={styles.notifyInputContainer}>
                <TextInput
                  style={styles.notifyInput}
                  placeholder="tu@email.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  style={styles.notifyButton}
                  onPress={handleNotify}
                  activeOpacity={0.8}
                >
                  <Text style={styles.notifyButtonText}>Avisar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.notifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.teal} />
                <Text style={styles.notifiedText}>Registrado</Text>
              </View>
            )}
          </View>
        </View>

        {/* Espacio final */}
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
  comingSoonBadge: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(8),
  },
  comingSoonText: {
    fontSize: scale(10),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // ============ HERO BANNER ============
  heroBanner: {
    borderRadius: scale(20),
    padding: scale(24),
    alignItems: 'center',
    marginHorizontal: scale(16),
    marginBottom: scale(24),
  },
  heroIconContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  heroTitle: {
    fontSize: scale(22),
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  heroDescription: {
    fontSize: scale(14),
    color: COLORS.textDark,
    textAlign: 'center',
    lineHeight: scale(20),
    opacity: 0.8,
  },

  // ============ SECTIONS ============
  section: {
    marginBottom: scale(24),
    paddingHorizontal: scale(16),
  },
  sectionTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  sectionSubtitle: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginBottom: scale(16),
  },

  // ============ CATEGORIES ============
  categoriesContainer: {
    paddingVertical: scale(4),
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(6),
    marginRight: scale(8),
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

  // ============ PREVIEW GRID ============
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  previewCard: {
    width: (SCREEN_WIDTH - scale(44)) / 2,
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    overflow: 'hidden',
  },
  previewIconContainer: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  previewTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  previewCategory: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginBottom: scale(10),
  },
  previewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewPrice: {
    fontSize: scale(12),
    fontWeight: '600',
    color: COLORS.orange,
  },
  previewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  previewRatingText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 26, 30, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: scale(16),
  },

  // ============ BENEFITS ============
  benefitsContainer: {
    gap: scale(12),
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    padding: scale(14),
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(14),
  },
  benefitIconContainer: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: `${COLORS.orange}30`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(2),
  },
  benefitDescription: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },

  // ============ NOTIFY ============
  notifySection: {
    paddingHorizontal: scale(16),
    marginBottom: scale(24),
  },
  notifyCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(20),
    padding: scale(24),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notifyTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: scale(12),
    marginBottom: scale(8),
  },
  notifyDescription: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: scale(20),
    lineHeight: scale(20),
  },
  notifyInputContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: scale(8),
  },
  notifyInput: {
    flex: 1,
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    fontSize: scale(14),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notifyButton: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: scale(20),
    paddingVertical: scale(12),
    borderRadius: scale(12),
    justifyContent: 'center',
  },
  notifyButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  notifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.teal}20`,
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    gap: scale(8),
  },
  notifiedText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.teal,
  },
});