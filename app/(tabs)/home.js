// app/(tabs)/home.js
// ISSY Resident App - Home Dashboard con selector de ubicación y diseño Figma

import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Image,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import MaskedView from '@react-native-masked-view/masked-view';
import { Ionicons } from '@expo/vector-icons';

// Importar iconos SVG
import {
  StarIcon,
  BellIcon,
  CalendarIcon,
  CreditCardIcon,
  BuildingIcon,
  BriefcaseIcon,
  PlusIcon,
  ArrowRightIcon,
  LocationIcon,
} from '../../src/components/Icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Responsive scale basado en diseño de 375px
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ============ COLORES EXACTOS DE FIGMA ============
const COLORS = {
  lime: '#D4FE48',
  cyan: '#009FF5',
  orange: '#FF8C3A',
  purple: '#7B8CEF',
  navy: '#1A1A2E',
  black: '#000000',
  white: '#FFFFFF',
  background: '#FAFAFA',
  gray: '#6B7280',
  grayLight: '#F2F2F2',
  nameGradientStart: '#0FE0ED',
  nameGradientEnd: '#334A89',
  b2cGradientStart: '#11D6E6',
  b2cGradientEnd: '#D4FE48',
  locationPill: '#130F26',
  // Colores para Admin
  adminRed: '#FA5967',
  adminDark: '#1A1A2E',
  adminTeal: '#14B8A6',
  adminIndigo: '#6366F1',
};

// ============ SERVICIOS DE COMUNIDAD ============
const COMMUNITY_SERVICES = [
  { 
    id: 'visitors', 
    title: 'Visitantes', 
    subtitle: 'Genera códigos QR',
    route: '/(tabs)/visits',
    bgColor: COLORS.lime,
    textColor: COLORS.black,
    iconColor: COLORS.black,
    available: true,
  },
  { 
    id: 'announcements', 
    title: 'Anuncios', 
    subtitle: 'De tus comunidades',
    route: '/announcements',
    bgColor: COLORS.cyan,
    textColor: COLORS.white,
    iconColor: COLORS.white,
    available: true,
  },
  { 
    id: 'reservations', 
    title: 'Reservaciones', 
    subtitle: 'Áreas comunes',
    route: '/reservations',
    bgColor: COLORS.orange,
    textColor: COLORS.white,
    iconColor: COLORS.white,
    available: true,
  },
  { 
    id: 'payments', 
    title: 'Pagos', 
    subtitle: 'Estado de cuenta',
    route: '/(tabs)/payments',
    bgColor: COLORS.purple,
    textColor: COLORS.white,
    iconColor: COLORS.white,
    available: true,
  },
];

// ============ SERVICIOS B2C ============
const B2C_SERVICES = [
  { 
    id: 'pms', 
    title: 'Gestor de Propiedades', 
    subtitle: 'Administrar tus alquileres',
    route: '/pms',
    available: true,
  },
  { 
    id: 'finances',
    title: 'Finanzas Personales',
    subtitle: 'Control de Gastos',
    route: '/finances',
    available: true,
  },
];

// ============ SERVICIOS DE ADMINISTRADOR ============
const ADMIN_SERVICES = [
  { 
    id: 'create-announcement', 
    title: 'Crear Anuncios', 
    subtitle: 'Publicar en tu comunidad',
    route: '/admin/announcements',
    bgColor: COLORS.cyan,
    textColor: COLORS.white,
    icon: '📢',
    available: true,
  },
  { 
    id: 'community-management', 
    title: 'Gestión de Comunidad', 
    subtitle: 'Miembros y configuración',
    route: '/admin/community-management',
    bgColor: '#10B981',
    textColor: COLORS.white,
    icon: '🏘️',
    available: true,
  },
  { 
    id: 'common-areas', 
    title: 'Áreas Comunes', 
    subtitle: 'Configurar espacios y reglas',
    route: '/admin/common-areas',
    bgColor: COLORS.adminTeal,
    textColor: COLORS.white,
    icon: '🏊',
    available: true,
  },
  { 
    id: 'reservations-admin', 
    title: 'Gestión de Reservas', 
    subtitle: 'Aprobar solicitudes',
    route: '/admin/reservations',
    bgColor: COLORS.orange,
    textColor: COLORS.white,
    icon: '📅',
    available: true,
  },
  { 
    id: 'incidents', 
    title: 'Gestión de Incidentes', 
    subtitle: 'Atender reportes y tickets',
    route: '/admin/incidents',
    bgColor: '#EF4444',
    textColor: COLORS.white,
    icon: '🚨',
    available: true,
  },
  { 
    id: 'payment-manager', 
    title: 'Gestor de Cobros', 
    subtitle: 'Cuotas y pagos',
    route: '/admin/payments',
    bgColor: COLORS.purple,
    textColor: COLORS.white,
    icon: '💰',
    available: true,
  },
  { 
    id: 'expenses', 
    title: 'Gastos', 
    subtitle: 'Control de egresos',
    route: '/admin/expenses',
    bgColor: COLORS.adminRed,
    textColor: COLORS.white,
    icon: '📊',
    available: true,
  },
  { 
    id: 'users', 
    title: 'Usuarios', 
    subtitle: 'Residentes y roles',
    route: '/admin/users',
    bgColor: COLORS.adminIndigo,
    textColor: COLORS.white,
    icon: '👥',
    available: true,
  },
  { 
    id: 'admin-settings', 
    title: 'Configuración', 
    subtitle: 'Guard App, usuarios, blacklist',
    route: '/admin/settings',
    bgColor: COLORS.adminIndigo,
    textColor: COLORS.white,
    icon: '⚙️',
    available: true,
  },
  { 
    id: 'access-reports', 
    title: 'Control de Acceso', 
    subtitle: 'Auditoría de visitantes',
    route: '/admin/access-reports',
    bgColor: '#3B82F6',
    textColor: COLORS.white,
    icon: '📊',
    available: true,
  },
  { 
    id: 'reports', 
    title: 'Reportes', 
    subtitle: 'Estadísticas y métricas',
    route: '/admin/reports',
    bgColor: COLORS.lime,
    textColor: COLORS.black,
    icon: '📈',
    available: true,
  },
];

// ============ QUICK ACTIONS ============
const QUICK_ACTIONS = [
  { 
    id: 'qr', 
    label: 'Nuevo QR', 
    route: '/(tabs)/visits',
    iconBg: COLORS.lime,
    iconColor: COLORS.black,
  },
  { 
    id: 'reserve', 
    label: 'Reservas', 
    route: '/reservations',
    iconBg: COLORS.orange,
    iconColor: COLORS.white,
  },
  { 
    id: 'announce', 
    label: 'Anuncios', 
    route: '/announcements',
    iconBg: COLORS.cyan,
    iconColor: COLORS.white,
  },
  { 
    id: 'pay', 
    label: 'Pagos', 
    route: '/(tabs)/payments',
    iconBg: COLORS.purple,
    iconColor: COLORS.white,
  },
];

// ============ COMPONENTE TEXTO CON GRADIENTE ============
const GradientText = ({ text, style }) => {
  return (
    <MaskedView
      maskElement={
        <Text style={[style, { backgroundColor: 'transparent' }]}>{text}</Text>
      }
    >
      <LinearGradient
        colors={[COLORS.nameGradientStart, COLORS.nameGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={[style, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
};

// ============ COMPONENTE DE ICONO PARA SERVICIOS ============
const ServiceIcon = ({ serviceId, color, size = 22 }) => {
  switch (serviceId) {
    case 'visitors':
      return <StarIcon size={size} color={color} />;
    case 'announcements':
      return <BellIcon size={size} color={color} />;
    case 'reservations':
      return <CalendarIcon size={size} color={color} />;
    case 'payments':
      return <CreditCardIcon size={size} color={color} />;
    default:
      return null;
  }
};

// ============ COMPONENTE DE ICONO PARA QUICK ACTIONS ============
const QuickActionIcon = ({ actionId, color, size = 24 }) => {
  switch (actionId) {
    case 'qr':
      return <PlusIcon size={size} color={color} />;
    case 'reserve':
      return <CalendarIcon size={size} color={color} />;
    case 'announce':
      return <BellIcon size={size} color={color} />;
    case 'pay':
      return <CreditCardIcon size={size} color={color} />;
    default:
      return null;
  }
};

// ============ API CALL TO SWITCH LOCATION ============
const API_URL = 'https://api.joinissy.com/api';

const switchLocationAPI = async (token, locationId) => {
  try {
    const response = await fetch(`${API_URL}/auth/switch-location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ location_id: locationId }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error switching location:', error);
    return { success: false, error: error.message };
  }
};

export default function Home() {
  const { user, profile, token, hasLocation, refreshProfile } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [switchingLocation, setSwitchingLocation] = useState(false);

  const userHasLocation = hasLocation ? hasLocation() : !!profile?.location_id;
  
  // Get user locations from profile
  const userLocations = profile?.user_locations || [];
  const hasMultipleLocations = userLocations.length > 1;
  const currentLocation = profile?.current_location || profile?.location || null;
  
  // Verificar si el usuario es admin o superadmin
  const userRole = profile?.role || user?.role || 'user';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (refreshProfile) {
      await refreshProfile();
    }
    setRefreshing(false);
  }, [refreshProfile]);

  const handleServicePress = (service) => {
    if (!service.available || !service.route) return;
    router.push(service.route);
  };

  const handleQuickAction = (action) => {
    if (action.route) {
      router.push(action.route);
    }
  };

  const handleJoinCommunity = () => {
    router.push('/join-community');
  };

  const handleAdminServicePress = (service) => {
    if (!service.available || !service.route) return;
    router.push(service.route);
  };

  const handleSwitchLocation = async (location) => {
    if (!location?.location_id || switchingLocation) return;
    
    setSwitchingLocation(true);
    try {
      const result = await switchLocationAPI(token, location.location_id);
      if (result.success) {
        await refreshProfile();
        setShowLocationModal(false);
      } else {
        console.error('Error switching location:', result.error);
      }
    } catch (error) {
      console.error('Error:', error);
    }
    setSwitchingLocation(false);
  };

  const getUserName = () => {
    return profile?.name || user?.email?.split('@')[0] || 'Usuario';
  };

  const getUserInitials = () => {
    const name = profile?.name || user?.email || 'U';
    return name.charAt(0).toUpperCase();
  };

  const getCurrentLocationName = () => {
    if (currentLocation?.name) return currentLocation.name;
    if (profile?.location?.name) return profile.location.name;
    return 'Mi ubicación';
  };

  // ========================================
  // RENDER: Location Selector Modal
  // ========================================
  const renderLocationModal = () => (
    <Modal
      visible={showLocationModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowLocationModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cambiar ubicación</Text>
            <TouchableOpacity onPress={() => setShowLocationModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.black} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.locationList}>
            {userLocations.map((loc, index) => (
              <TouchableOpacity
                key={loc.location_id || index}
                style={[
                  styles.locationItem,
                  loc.location_id === currentLocation?.location_id && styles.locationItemActive
                ]}
                onPress={() => handleSwitchLocation(loc)}
                disabled={switchingLocation}
              >
                <View style={styles.locationItemLeft}>
                  <View style={[
                    styles.locationDot,
                    loc.location_id === currentLocation?.location_id && styles.locationDotActive
                  ]} />
                  <View>
                    <Text style={styles.locationItemName}>{loc.name}</Text>
                    {loc.address && (
                      <Text style={styles.locationItemAddress} numberOfLines={1}>
                        {loc.address}
                      </Text>
                    )}
                    {loc.role && loc.role !== 'user' && (
                      <View style={styles.locationRoleBadge}>
                        <Text style={styles.locationRoleText}>
                          {loc.role === 'admin' ? 'Admin' : loc.role === 'superadmin' ? 'Super Admin' : loc.role}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                {loc.location_id === currentLocation?.location_id && (
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.lime} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {switchingLocation && (
            <View style={styles.switchingOverlay}>
              <ActivityIndicator size="large" color={COLORS.cyan} />
              <Text style={styles.switchingText}>Cambiando ubicación...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  // ========================================
  // RENDER: Usuario SIN ubicación
  // ========================================
  if (!userHasLocation) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.cyan]} />
          }
        >
          {/* Header Card */}
          <View style={styles.headerCard}>
            <View style={styles.headerImageContainer}>
              <Image
                source={require('../../assets/header-gradient.png')}
                style={styles.headerImage}
                resizeMode="cover"
              />
              <View style={styles.headerOverlay}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    {profile?.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarText}>{getUserInitials()}</Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
            
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText}>¡Hola de nuevo! 👋</Text>
              <GradientText text={getUserName()} style={styles.userName} />
            </View>
          </View>

          {/* Join Community Card */}
          <View style={styles.joinCard}>
            <View style={styles.joinIconContainer}>
              <Text style={styles.joinIcon}>🏡</Text>
            </View>
            <Text style={styles.joinTitle}>¿Vives en una comunidad privada?</Text>
            <Text style={styles.joinSubtitle}>
              Únete para acceder al control de acceso, reservaciones y más.
            </Text>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={handleJoinCommunity}
              activeOpacity={0.8}
            >
              <Text style={styles.joinButtonText}>Unirme a mi comunidad</Text>
            </TouchableOpacity>
          </View>

          {/* B2C Services */}
          <Text style={styles.sectionTitle}>Mas Servicios</Text>
          <Text style={styles.sectionSubtitle}>Soluciones personales</Text>
          
          <View style={styles.b2cGrid}>
            {B2C_SERVICES.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.b2cCard}
                onPress={() => handleServicePress(service)}
                activeOpacity={0.7}
              >
                <View style={styles.b2cTopSection}>
                  <Text style={styles.b2cTitle}>{service.title}</Text>
                  <View style={styles.b2cIconBox}>
                    {service.id === 'pms' ? (
                      <BuildingIcon size={22} color={COLORS.black} />
                    ) : (
                      <BriefcaseIcon size={22} color={COLORS.black} />
                    )}
                  </View>
                </View>
                <LinearGradient
                  colors={[COLORS.b2cGradientStart, COLORS.b2cGradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.b2cBottomSection}
                >
                  <Text style={styles.b2cSubtitle}>{service.subtitle}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: scale(120) }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ========================================
  // RENDER: Usuario CON ubicación
  // ========================================
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.cyan]} />
        }
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerImageContainer}>
            <Image
              source={require('../../assets/header-gradient.png')}
              style={styles.headerImage}
              resizeMode="cover"
            />
            <View style={styles.headerOverlay}>
              <View style={styles.headerRow}>
                {/* Avatar */}
                <View style={styles.avatar}>
                  {profile?.avatar_url || profile?.profile_photo_url ? (
                    <Image 
                      source={{ uri: profile.avatar_url || profile.profile_photo_url }} 
                      style={styles.avatarImage} 
                    />
                  ) : (
                    <Text style={styles.avatarText}>{getUserInitials()}</Text>
                  )}
                </View>
                
                {/* Location Pill - Solo si tiene múltiples ubicaciones */}
                {hasMultipleLocations ? (
                  <TouchableOpacity 
                    style={styles.locationPill}
                    onPress={() => setShowLocationModal(true)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.locationIconCircle}>
                      <Ionicons name="location" size={14} color={COLORS.white} />
                    </View>
                    <Text style={styles.locationText} numberOfLines={1}>
                      {getCurrentLocationName()}
                    </Text>
                    <Ionicons name="swap-horizontal" size={15} color={COLORS.white} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.locationPillStatic}>
                    <View style={styles.locationIconCircle}>
                      <Ionicons name="location" size={14} color={COLORS.white} />
                    </View>
                    <Text style={styles.locationText} numberOfLines={1}>
                      {getCurrentLocationName()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          
          {/* Greeting */}
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingText}>¡Hola de nuevo! 👋</Text>
            <GradientText text={getUserName()} style={styles.userName} />
            {isAdmin && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>
                  {userRole === 'superadmin' ? '👑 Super Admin' : '🛡️ Administrador'}
                </Text>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsRow}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionItem}
                onPress={() => handleQuickAction(action)}
                activeOpacity={0.7}
              >
                <View style={styles.quickActionBox}>
                  <View style={[styles.quickActionIconCircle, { backgroundColor: action.iconBg }]}>
                    <QuickActionIcon 
                      actionId={action.id} 
                      color={action.iconColor} 
                      size={20} 
                    />
                  </View>
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Community Services */}
        <Text style={styles.sectionTitle}>Servicios de tu comunidad</Text>
        
        <View style={styles.communityGrid}>
          {COMMUNITY_SERVICES.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[styles.communityCard, { backgroundColor: service.bgColor }]}
              onPress={() => handleServicePress(service)}
              activeOpacity={0.8}
            >
              <View style={styles.communityIconBox}>
                <ServiceIcon 
                  serviceId={service.id} 
                  color={service.iconColor} 
                  size={22} 
                />
              </View>
              
              <View style={styles.communityContent}>
                <Text style={[styles.communityTitle, { color: service.textColor }]}>
                  {service.title}
                </Text>
                <Text style={[styles.communitySubtitle, { color: service.textColor }]}>
                  {service.subtitle}
                </Text>
              </View>
              
              <View style={styles.communityArrow}>
                <ArrowRightIcon size={24} color={service.textColor} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* B2C Services */}
        <Text style={styles.sectionTitle}>Mas Servicios</Text>
        <Text style={styles.sectionSubtitle}>Soluciones personales</Text>
        
        <View style={styles.b2cGrid}>
          {B2C_SERVICES.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={styles.b2cCard}
              onPress={() => handleServicePress(service)}
              activeOpacity={0.7}
            >
              <View style={styles.b2cTopSection}>
                <Text style={styles.b2cTitle}>{service.title}</Text>
                <View style={styles.b2cIconBox}>
                  {service.id === 'pms' ? (
                    <BuildingIcon size={22} color={COLORS.black} />
                  ) : (
                    <BriefcaseIcon size={22} color={COLORS.black} />
                  )}
                </View>
              </View>
              <LinearGradient
                colors={[COLORS.b2cGradientStart, COLORS.b2cGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.b2cBottomSection}
              >
                <Text style={styles.b2cSubtitle}>{service.subtitle}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* ADMIN SECTION */}
        {isAdmin && (
          <>
            <View style={styles.adminSectionHeader}>
              <Text style={styles.adminSectionTitle}>Administrar</Text>
              <View style={styles.adminSectionBadge}>
                <Text style={styles.adminSectionBadgeText}>
                  {userRole === 'superadmin' ? 'Super Admin' : 'Admin'}
                </Text>
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>Gestiona tu comunidad</Text>
            
            <View style={styles.adminGrid}>
              {ADMIN_SERVICES.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[styles.adminCard, { backgroundColor: service.bgColor }]}
                  onPress={() => handleAdminServicePress(service)}
                  activeOpacity={0.8}
                >
                  <View style={styles.adminIconBox}>
                    <Text style={styles.adminIcon}>{service.icon}</Text>
                  </View>
                  
                  <View style={styles.adminContent}>
                    <Text style={[styles.adminCardTitle, { color: service.textColor }]}>
                      {service.title}
                    </Text>
                    <Text style={[styles.adminCardSubtitle, { color: service.textColor }]}>
                      {service.subtitle}
                    </Text>
                  </View>
                  
                  <View style={styles.adminArrow}>
                    <ArrowRightIcon size={20} color={service.textColor} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={{ height: scale(120) }} />
      </ScrollView>

      {/* Location Switcher Modal */}
      {renderLocationModal()}
    </SafeAreaView>
  );
}

// ============ ESTILOS ============
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  
  // ============ HEADER CARD ============
  headerCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: scale(12),
    marginTop: scale(10),
    borderRadius: scale(13),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  headerImageContainer: {
    height: scale(121),
    overflow: 'hidden',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: scale(20),
    paddingHorizontal: scale(16),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarContainer: {
    alignItems: 'flex-start',
  },
  avatar: {
    width: scale(58),
    height: scale(58),
    borderRadius: scale(29),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: scale(24),
    fontWeight: '600',
    color: COLORS.navy,
  },
  
  // Location Pill (Figma: 240x43, #130F26, radius 30)
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.locationPill,
    paddingVertical: scale(10),
    paddingLeft: scale(6),
    paddingRight: scale(12),
    borderRadius: scale(30),
    maxWidth: scale(240),
    height: scale(43),
  },
  locationPillStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.locationPill,
    paddingVertical: scale(10),
    paddingLeft: scale(6),
    paddingRight: scale(16),
    borderRadius: scale(30),
    maxWidth: scale(200),
    height: scale(43),
  },
  locationIconCircle: {
    width: scale(31),
    height: scale(31),
    borderRadius: scale(15.5),
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(8),
  },
  locationText: {
    color: COLORS.grayLight,
    fontSize: scale(14),
    fontWeight: '400',
    flex: 1,
    textAlign: 'center',
  },
  
  // Greeting
  greetingContainer: {
    paddingHorizontal: scale(17),
    paddingTop: scale(12),
    paddingBottom: scale(8),
  },
  greetingText: {
    fontSize: scale(11),
    fontWeight: '400',
    color: COLORS.black,
  },
  userName: {
    fontSize: scale(20),
    fontWeight: '800',
    marginTop: scale(4),
  },
  
  // Admin Badge
  adminBadge: {
    marginTop: scale(6),
    backgroundColor: COLORS.adminDark,
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
    alignSelf: 'flex-start',
  },
  adminBadgeText: {
    color: COLORS.white,
    fontSize: scale(10),
    fontWeight: '600',
  },
  
  // ============ QUICK ACTIONS ============
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingTop: scale(8),
    paddingBottom: scale(16),
  },
  quickActionItem: {
    alignItems: 'center',
  },
  quickActionBox: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(13),
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(6),
  },
  quickActionIconCircle: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: scale(11),
    fontWeight: '400',
    color: COLORS.navy,
    textAlign: 'center',
  },
  
  // ============ SECTIONS ============
  sectionTitle: {
    fontSize: scale(14),
    fontWeight: '400',
    color: COLORS.navy,
    paddingHorizontal: scale(21),
    marginTop: scale(20),
    marginBottom: scale(2),
  },
  sectionSubtitle: {
    fontSize: scale(11),
    fontWeight: '400',
    color: COLORS.black,
    paddingHorizontal: scale(21),
    marginBottom: scale(12),
  },
  
  // ============ COMMUNITY SERVICES ============
  communityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: scale(16),
    justifyContent: 'space-between',
    marginTop: scale(8),
  },
  communityCard: {
    width: (SCREEN_WIDTH - scale(42)) / 2,
    height: scale(113),
    borderRadius: scale(13),
    padding: scale(14),
    position: 'relative',
    marginBottom: scale(10),
  },
  communityIconBox: {
    marginBottom: scale(8),
  },
  communityContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  communityTitle: {
    fontSize: scale(14),
    fontWeight: '400',
  },
  communitySubtitle: {
    fontSize: scale(11),
    fontWeight: '400',
    marginTop: scale(2),
    opacity: 0.9,
  },
  communityArrow: {
    position: 'absolute',
    bottom: scale(14),
    right: scale(14),
  },
  
  // ============ B2C SERVICES ============
  b2cGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: scale(16),
    justifyContent: 'space-between',
  },
  b2cCard: {
    width: (SCREEN_WIDTH - scale(42)) / 2,
    borderRadius: scale(13),
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    marginBottom: scale(10),
  },
  b2cTopSection: {
    height: scale(93),
    padding: scale(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
  },
  b2cTitle: {
    fontSize: scale(14),
    fontWeight: '400',
    color: COLORS.black,
    flex: 1,
    paddingRight: scale(8),
  },
  b2cIconBox: {
    width: scale(22),
    height: scale(22),
  },
  b2cBottomSection: {
    paddingHorizontal: scale(13),
    paddingVertical: scale(10),
  },
  b2cSubtitle: {
    fontSize: scale(11),
    fontWeight: '400',
    color: COLORS.black,
  },
  
  // ============ ADMIN SECTION ============
  adminSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(21),
    marginTop: scale(24),
    marginBottom: scale(2),
  },
  adminSectionTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.adminDark,
  },
  adminSectionBadge: {
    marginLeft: scale(10),
    backgroundColor: COLORS.adminRed,
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(8),
  },
  adminSectionBadgeText: {
    color: COLORS.white,
    fontSize: scale(9),
    fontWeight: '700',
  },
  adminGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: scale(16),
    justifyContent: 'space-between',
  },
  adminCard: {
    width: (SCREEN_WIDTH - scale(42)) / 2,
    height: scale(100),
    borderRadius: scale(13),
    padding: scale(12),
    position: 'relative',
    marginBottom: scale(10),
  },
  adminIconBox: {
    marginBottom: scale(6),
  },
  adminIcon: {
    fontSize: scale(22),
  },
  adminContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  adminCardTitle: {
    fontSize: scale(13),
    fontWeight: '500',
  },
  adminCardSubtitle: {
    fontSize: scale(10),
    fontWeight: '400',
    marginTop: scale(2),
    opacity: 0.85,
  },
  adminArrow: {
    position: 'absolute',
    bottom: scale(12),
    right: scale(12),
  },
  
  // ============ JOIN COMMUNITY ============
  joinCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: scale(16),
    marginTop: scale(20),
    borderRadius: scale(16),
    padding: scale(24),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  joinIconContainer: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(35),
    backgroundColor: COLORS.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  joinIcon: {
    fontSize: scale(36),
  },
  joinTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  joinSubtitle: {
    fontSize: scale(13),
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: scale(20),
    lineHeight: scale(18),
  },
  joinButton: {
    backgroundColor: COLORS.purple,
    paddingHorizontal: scale(28),
    paddingVertical: scale(12),
    borderRadius: scale(10),
  },
  joinButtonText: {
    color: COLORS.white,
    fontSize: scale(14),
    fontWeight: '600',
  },

  // ============ LOCATION MODAL ============
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? scale(34) : scale(20),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  modalTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.black,
  },
  locationList: {
    paddingHorizontal: scale(20),
    paddingTop: scale(12),
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(14),
    paddingHorizontal: scale(12),
    borderRadius: scale(12),
    marginBottom: scale(8),
    backgroundColor: COLORS.grayLight,
  },
  locationItemActive: {
    backgroundColor: '#E8FFF0',
    borderWidth: 1,
    borderColor: COLORS.lime,
  },
  locationItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: COLORS.gray,
    marginRight: scale(12),
  },
  locationDotActive: {
    backgroundColor: COLORS.lime,
  },
  locationItemName: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.black,
  },
  locationItemAddress: {
    fontSize: scale(12),
    color: COLORS.gray,
    marginTop: scale(2),
  },
  locationRoleBadge: {
    backgroundColor: COLORS.adminDark,
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(6),
    marginTop: scale(4),
    alignSelf: 'flex-start',
  },
  locationRoleText: {
    fontSize: scale(10),
    color: COLORS.white,
    fontWeight: '600',
  },
  switchingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
  },
  switchingText: {
    marginTop: scale(12),
    fontSize: scale(14),
    color: COLORS.gray,
  },
});