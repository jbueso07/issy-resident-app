// app/(tabs)/home.js
// ISSY Resident App - Home Dashboard (Diseño Final con Iconos SVG)

import { useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import MaskedView from '@react-native-masked-view/masked-view';

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
  SwapIcon,
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

  const getUserName = () => {
    return profile?.name || user?.email?.split('@')[0] || 'Usuario';
  };

  const getUserInitials = () => {
    const name = profile?.name || user?.email || 'U';
    return name.charAt(0).toUpperCase();
  };

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
            {/* Imagen de fondo del header */}
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
            
            {/* Greeting */}
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
          {/* Imagen de fondo del header */}
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
                  {profile?.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{getUserInitials()}</Text>
                  )}
                </View>
                
                {/* Location Pill */}
                <View style={styles.locationPill}>
                  <View style={styles.locationIconCircle}>
                    <LocationIcon size={14} color={COLORS.white} />
                  </View>
                  <Text style={styles.locationText} numberOfLines={1}>
                    {profile?.location_name || profile?.location?.name || 'Mi ubicación'}
                  </Text>
                  <SwapIcon size={14} color={COLORS.white} />
                </View>
              </View>
            </View>
          </View>
          
          {/* Greeting */}
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingText}>¡Hola de nuevo! 👋</Text>
            <GradientText text={getUserName()} style={styles.userName} />
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
        <Text style={styles.sectionTitle}>Servicios de tu comunida</Text>
        
        <View style={styles.communityGrid}>
          {COMMUNITY_SERVICES.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[styles.communityCard, { backgroundColor: service.bgColor }]}
              onPress={() => handleServicePress(service)}
              activeOpacity={0.8}
            >
              {/* Icon */}
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
              
              {/* Arrow */}
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

        <View style={{ height: scale(120) }} />
      </ScrollView>
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
    marginHorizontal: scale(13),
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
  
  // Location Pill
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#130F26',
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
});