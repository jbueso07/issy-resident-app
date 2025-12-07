// app/(tabs)/home.js
// ISSY Resident App - Home Dashboard
// Detecta si usuario tiene ubicación y muestra contenido apropiado

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Servicios de Comunidad (requieren ubicación)
const COMMUNITY_SERVICES = [
  { 
    id: 'visitors', 
    icon: '🎫', 
    title: 'Visitantes', 
    subtitle: 'Genera códigos QR',
    route: '/(tabs)/visits',
    color: '#6366F1',
    available: true 
  },
  { 
    id: 'announcements', 
    icon: '📢', 
    title: 'Anuncios', 
    subtitle: 'De tu comunidad',
    route: '/announcements',
    color: '#F59E0B',
    available: true,
    comingSoon: false
  },
  { 
    id: 'reservations', 
    icon: '📅', 
    title: 'Reservaciones', 
    subtitle: 'Áreas comunes',
    route: '/reservations',
    color: '#10B981',
    available: true,
    comingSoon: false
  },
  { 
    id: 'payments', 
    icon: '💳', 
    title: 'Pagos', 
    subtitle: 'Estado de cuenta',
    route: '/(tabs)/payments',
    color: '#EC4899',
    available: true 
  },
];

// Servicios B2C (disponibles para todos)
const B2C_SERVICES = [
  { 
    id: 'pms', 
    icon: '🏠', 
    title: 'Gestor de Propiedades', 
    subtitle: 'Administra tus alquileres',
    route: '/pms',
    color: '#8B5CF6',
    badge: 'PMS',
    available: true,
    comingSoon: false  // ✅ Ya disponible
  },
  { 
    id: 'finances',
    icon: '💰',
    title: 'Finanzas Personales',
    subtitle: 'Control de gastos',
    route: '/finances',
    color: '#10B981',
    available: true
  },
  { 
    id: 'marketplace', 
    icon: '🛒', 
    title: 'Marketplace', 
    subtitle: 'Servicios para tu hogar',
    route: null,
    color: '#F59E0B',
    badge: 'Próximamente',
    available: false,
    comingSoon: true
  },
];

// Acciones rápidas para usuarios con ubicación
const QUICK_ACTIONS = [
  { id: 'qr', icon: '➕', label: 'Nuevo QR', route: '/(tabs)/visits' },
  { id: 'reserve', icon: '📅', label: 'Reservar', route: '/reservations' },
  { id: 'announce', icon: '📢', label: 'Anuncios', route: '/announcements' },
  { id: 'pay', icon: '💳', label: 'Pagar', route: '/(tabs)/payments' },
];

export default function Home() {
  const { user, profile, hasLocation, refreshProfile } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const userHasLocation = hasLocation ? hasLocation() : !!profile?.location_id;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (refreshProfile) {
      await refreshProfile();
    }
    setRefreshing(false);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días!';
    if (hour < 18) return '¡Buenas tardes!';
    return '¡Buenas noches!';
  };

  const handleServicePress = (service) => {
    if (service.comingSoon || !service.available) {
      // Mostrar que está próximamente
      return;
    }
    if (service.route) {
      router.push(service.route);
    }
  };

  const handleQuickAction = (action) => {
    if (action.route) {
      router.push(action.route);
    }
  };

  const handleJoinCommunity = () => {
    router.push('/join-community');
  };

  // ========================================
  // RENDER: Usuario SIN ubicación
  // ========================================
  if (!userHasLocation) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.userName}>{profile?.name || user?.email || 'Usuario'}</Text>
          </View>

          {/* Card: Únete a tu comunidad */}
          <View style={styles.joinCommunityCard}>
            <LinearGradient
              colors={['#EEF2FF', '#E0E7FF']}
              style={styles.joinCommunityGradient}
            >
              <View style={styles.joinCommunityIcon}>
                <Text style={styles.joinCommunityEmoji}>🏡</Text>
              </View>
              <Text style={styles.joinCommunityTitle}>¿Vives en una comunidad privada?</Text>
              <Text style={styles.joinCommunitySubtitle}>
                Únete a tu comunidad para acceder al control de acceso, reservaciones y más beneficios.
              </Text>
              <TouchableOpacity
                style={styles.joinCommunityButton}
                onPress={handleJoinCommunity}
                activeOpacity={0.8}
              >
                <Text style={styles.joinCommunityButtonText}>Unirme a mi comunidad</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Servicios B2C */}
          <Text style={styles.sectionTitle}>Servicios Disponibles</Text>
          <Text style={styles.sectionSubtitle}>Explora nuestras soluciones para tu día a día</Text>
          
          <View style={styles.servicesGrid}>
            {B2C_SERVICES.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceCard,
                  !service.available && styles.serviceCardDisabled
                ]}
                onPress={() => handleServicePress(service)}
                activeOpacity={service.available ? 0.7 : 1}
              >
                {service.badge && (
                  <View style={[
                    styles.serviceBadge,
                    (service.comingSoon || !service.available) && styles.serviceBadgeGray
                  ]}>
                    <Text style={[
                      styles.serviceBadgeText,
                      (service.comingSoon || !service.available) && styles.serviceBadgeTextGray
                    ]}>
                      {service.badge}
                    </Text>
                  </View>
                )}
                <View style={[styles.serviceIconContainer, { backgroundColor: service.color + '20' }]}>
                  <Text style={styles.serviceIcon}>{service.icon}</Text>
                </View>
                <Text style={styles.serviceTitle}>{service.title}</Text>
                <Text style={styles.serviceSubtitle}>{service.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ========================================
  // RENDER: Usuario CON ubicación
  // ========================================
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()} 👋</Text>
          <Text style={styles.userName}>{profile?.name || user?.email || 'Residente'}</Text>
          {(profile?.location_name || profile?.location?.name) && (
            <View style={styles.locationBadge}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationName}>
                {profile?.location_name || profile?.location?.name}
              </Text>
            </View>
          )}
        </View>

        {/* Acciones Rápidas */}
        <View style={styles.quickActionsContainer}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionButton}
              onPress={() => handleQuickAction(action)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={action.route ? ['#6366F1', '#8B5CF6'] : ['#E5E7EB', '#D1D5DB']}
                style={styles.quickActionGradient}
              >
                <Text style={styles.quickActionIcon}>{action.icon}</Text>
              </LinearGradient>
              <Text style={[
                styles.quickActionLabel,
                !action.route && styles.quickActionLabelDisabled
              ]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Servicios de Comunidad */}
        <Text style={styles.sectionTitle}>Servicios de tu Comunidad</Text>
        
        <View style={styles.servicesGrid}>
          {COMMUNITY_SERVICES.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={styles.serviceCard}
              onPress={() => handleServicePress(service)}
              activeOpacity={0.7}
            >
              {service.comingSoon && (
                <View style={styles.serviceBadgeGray}>
                  <Text style={styles.serviceBadgeTextGray}>Pronto</Text>
                </View>
              )}
              <View style={[styles.serviceIconContainer, { backgroundColor: service.color + '20' }]}>
                <Text style={styles.serviceIcon}>{service.icon}</Text>
              </View>
              <Text style={styles.serviceTitle}>{service.title}</Text>
              <Text style={styles.serviceSubtitle}>{service.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Servicios B2C */}
        <Text style={styles.sectionTitle}>Más Servicios</Text>
        <Text style={styles.sectionSubtitle}>Soluciones personales para ti</Text>
        
        <View style={styles.servicesGrid}>
          {B2C_SERVICES.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[
                styles.serviceCard,
                !service.available && styles.serviceCardDisabled
              ]}
              onPress={() => handleServicePress(service)}
              activeOpacity={service.available ? 0.7 : 1}
            >
              {service.badge && (
                <View style={[
                  styles.serviceBadge,
                  (service.comingSoon || !service.available) && styles.serviceBadgeGray
                ]}>
                  <Text style={[
                    styles.serviceBadgeText,
                    (service.comingSoon || !service.available) && styles.serviceBadgeTextGray
                  ]}>
                    {service.badge}
                  </Text>
                </View>
              )}
              <View style={[styles.serviceIconContainer, { backgroundColor: service.color + '20' }]}>
                <Text style={styles.serviceIcon}>{service.icon}</Text>
              </View>
              <Text style={styles.serviceTitle}>{service.title}</Text>
              <Text style={styles.serviceSubtitle}>{service.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Actividad Reciente */}
        <Text style={styles.sectionTitle}>Actividad Reciente</Text>
        <View style={styles.activityCard}>
          <Text style={styles.activityEmptyIcon}>📋</Text>
          <Text style={styles.activityEmptyText}>No hay actividad reciente</Text>
          <Text style={styles.activityEmptySubtext}>
            Tus últimas acciones aparecerán aquí
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280',
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 4,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  locationName: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  // Quick Actions
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  quickActionButton: {
    alignItems: 'center',
  },
  quickActionGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionIcon: {
    fontSize: 24,
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  quickActionLabelDisabled: {
    color: '#9CA3AF',
  },
  // Section
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  // Services Grid
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  serviceCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  serviceCardDisabled: {
    opacity: 0.6,
  },
  serviceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  serviceBadgeGray: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  serviceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  serviceBadgeTextGray: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  serviceIcon: {
    fontSize: 24,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  serviceSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  // Join Community Card
  joinCommunityCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  joinCommunityGradient: {
    padding: 24,
    alignItems: 'center',
  },
  joinCommunityIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  joinCommunityEmoji: {
    fontSize: 40,
  },
  joinCommunityTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  joinCommunitySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  joinCommunityButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  joinCommunityButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Activity Card
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    marginHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityEmptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  activityEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  activityEmptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
});