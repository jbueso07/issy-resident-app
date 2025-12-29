// app/services.js
// ISSY Resident App - Servicios (Coming Soon)
// ProHome Dark Theme - Mismo estilo que marketplace.js

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ProHome Dark Theme Colors (idénticos a marketplace.js)
const COLORS = {
  bgPrimary: '#0F1A1A',
  bgSecondary: '#1A2C2C',
  bgCard: '#243636',
  teal: '#5DDED8',
  lime: '#D4FE48',
  purple: '#8B5CF6',
  orange: '#F97316',
  cyan: '#06B6D4',
  coral: '#F43F5E',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
};

export default function ServicesScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={scale(22)} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Servicios</Text>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonBadgeText}>Próximamente</Text>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Icon */}
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={[COLORS.purple, COLORS.coral]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <Ionicons name="construct" size={scale(56)} color={COLORS.textPrimary} />
          </LinearGradient>
        </View>

        {/* Title */}
        <Text style={styles.title}>Expertos a tu alcance</Text>
        <Text style={styles.subtitle}>
          Estamos preparando un directorio de profesionales verificados donde encontrarás servicios de confianza para tu hogar.
        </Text>

        {/* Features Preview */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: 'rgba(93, 222, 216, 0.15)' }]}>
              <Ionicons name="search" size={scale(22)} color={COLORS.teal} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Busca Expertos</Text>
              <Text style={styles.featureDescription}>Plomeros, electricistas, y más</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <Ionicons name="star" size={scale(22)} color={COLORS.purple} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Reseñas Verificadas</Text>
              <Text style={styles.featureDescription}>Opiniones de tu comunidad</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: 'rgba(212, 254, 72, 0.15)' }]}>
              <Ionicons name="checkmark-circle" size={scale(22)} color={COLORS.lime} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Profesionales Verificados</Text>
              <Text style={styles.featureDescription}>Validados por ISSY</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: 'rgba(249, 115, 22, 0.15)' }]}>
              <Ionicons name="chatbubbles" size={scale(22)} color={COLORS.orange} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Contacto Directo</Text>
              <Text style={styles.featureDescription}>Chatea y agenda citas</Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.ctaContainer}>
          <Text style={styles.ctaText}>Te notificaremos cuando esté listo</Text>
          <View style={styles.notifyBadge}>
            <Ionicons name="notifications" size={scale(16)} color={COLORS.purple} />
            <Text style={styles.notifyText}>Notificaciones activadas</Text>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: scale(120) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: COLORS.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerTitle: {
    flex: 1,
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  comingSoonBadge: {
    backgroundColor: COLORS.purple,
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(12),
  },
  comingSoonBadgeText: {
    color: COLORS.textPrimary,
    fontSize: scale(12),
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    alignItems: 'center',
    paddingTop: scale(20),
  },
  iconContainer: {
    marginBottom: scale(24),
  },
  iconGradient: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: scale(28),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(12),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scale(22),
    marginBottom: scale(32),
    paddingHorizontal: scale(10),
  },
  featuresContainer: {
    width: '100%',
    gap: scale(12),
    marginBottom: scale(32),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  featureIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(14),
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(2),
  },
  featureDescription: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  ctaContainer: {
    alignItems: 'center',
  },
  ctaText: {
    fontSize: scale(14),
    color: COLORS.textMuted,
    marginBottom: scale(12),
  },
  notifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  notifyText: {
    color: COLORS.purple,
    fontSize: scale(13),
    fontWeight: '600',
    marginLeft: scale(8),
  },
});