// app/(tabs)/home.js
// ISSY Resident App - Home Dashboard ProHome Style + i18n
// Admin carrusel horizontal, Más Servicios horizontal, Font accessibility

import { useState, useCallback, useMemo } from 'react';
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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../src/hooks/useTranslation';

// Importar iconos SVG
import {
  StarIcon,
  BellIcon,
  CalendarIcon,
  CreditCardIcon,
  BuildingIcon,
  BriefcaseIcon,
  PlusIcon,
} from '../../src/components/Icons';

import NotificationBell from '../../src/components/NotificationBell';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ============ COLORES PROHOME ============
const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  bgCardAlt: '#243B44',
  bgCardOff: '#1A2630',
  
  lime: '#AAFF00',
  cyan: '#00E5FF',
  teal: '#00BFA6',
  orange: '#FF8A50',
  purple: '#A78BFA',
  coral: '#FF6B6B',
  indigo: '#818CF8',
  blue: '#60A5FA',
  
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textDark: '#0F1A1E',
  
  border: 'rgba(255, 255, 255, 0.1)',
  gradientStart: '#00BFA6',
  gradientEnd: '#AAFF00',
};

// ============ SERVICE ICON COMPONENT ============
const ServiceIcon = ({ serviceId, color, size = 24 }) => {
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

// ============ QUICK ACTION ICON ============
const QuickActionIcon = ({ actionId, color, size = 28 }) => {
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

// ============ API ============
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
    return await response.json();
  } catch (error) {
    console.error('Error switching location:', error);
    return { success: false, error: error.message };
  }
};

export default function Home() {
  const { user, profile, token, hasLocation, refreshProfile } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [switchingLocation, setSwitchingLocation] = useState(false);
  
  // Estados para toggles
  const [activeServices, setActiveServices] = useState({
    visitors: true,
    announcements: true,
    reservations: false,
    payments: false,
  });
  
  const [activeAdminServices, setActiveAdminServices] = useState({
    'create-announcement': true,
    'community-management': true,
    'common-areas': true,
    'reservations-admin': true,
    'incidents': true,
    'payment-manager': false,
    'expenses': false,
    'users': false,
    'admin-settings': false,
    'access-reports': false,
    'reports': false,
  });

  // ============ SERVICIOS CON TRADUCCIONES ============
  const COMMUNITY_SERVICES = useMemo(() => [
    { 
      id: 'visitors', 
      title: t('services.access'), 
      subtitle: t('services.accessDesc'),
      route: '/(tabs)/visits',
      activeColor: COLORS.teal,
      available: true,
    },
    { 
      id: 'announcements', 
      title: t('services.announcements'), 
      subtitle: t('services.announcementsDesc'),
      route: '/announcements',
      activeColor: COLORS.cyan,
      available: true,
    },
    { 
      id: 'reservations', 
      title: t('services.reservations'), 
      subtitle: t('services.reservationsDesc'),
      route: '/reservations',
      activeColor: COLORS.orange,
      available: true,
    },
    { 
      id: 'payments', 
      title: t('services.payments'), 
      subtitle: t('services.paymentsDesc'),
      route: '/(tabs)/payments',
      activeColor: COLORS.purple,
      available: true,
    },
  ], [t]);

  const B2C_SERVICES = useMemo(() => [
    { 
      id: 'pms', 
      title: t('services.pms'), 
      subtitle: t('services.pmsDesc'),
      route: '/pms',
      icon: 'business-outline',
      color: COLORS.teal,
      available: true,
    },
    { 
      id: 'finances',
      title: t('services.finances'),
      subtitle: t('services.financesDesc'),
      route: '/finances',
      icon: 'wallet-outline',
      color: COLORS.lime,
      available: true,
    },
    { 
      id: 'marketplace',
      title: t('services.marketplace'),
      subtitle: t('services.marketplaceDesc'),
      route: '/marketplace',
      icon: 'storefront-outline',
      color: COLORS.orange,
      available: true,
    },
    { 
      id: 'services',
      title: t('services.servicesTitle'),
      subtitle: t('services.servicesDesc'),
      route: '/services',
      icon: 'construct-outline',
      color: COLORS.purple,
      available: true,
    },
  ], [t]);

  const ADMIN_SERVICES = useMemo(() => [
  {
    id: 'locations',
    title: t('adminMenu.locations', 'Ubicaciones'),
    subtitle: t('adminMenu.locationsDesc', 'Gestionar comunidades'),
    route: '/admin/locations',
    activeColor: COLORS.lime,
    icon: 'location-outline',
    superAdminOnly: true,
  },
  {
    id: 'create-announcement',
    title: t('adminMenu.announcements'),
    subtitle: t('adminMenu.announcementsDesc'),
    route: '/admin/announcements',
    activeColor: COLORS.cyan,
    icon: 'megaphone-outline',
  },
  { 
    id: 'community-management', 
    title: t('adminMenu.community'), 
    subtitle: t('adminMenu.communityDesc'),
    route: '/admin/community-management',
    activeColor: COLORS.teal,
    icon: 'people-outline',
  },
  { 
    id: 'common-areas', 
    title: t('adminMenu.commonAreas'), 
    subtitle: t('adminMenu.commonAreasDesc'),
    route: '/admin/common-areas',
    activeColor: COLORS.teal,
    icon: 'fitness-outline',
  },
  { 
    id: 'reservations-admin', 
    title: t('adminMenu.reservationsAdmin'), 
    subtitle: t('adminMenu.reservationsAdminDesc'),
    route: '/admin/reservations',
    activeColor: COLORS.orange,
    icon: 'calendar-outline',
  },
  { 
    id: 'incidents', 
    title: t('adminMenu.incidents'), 
    subtitle: t('adminMenu.incidentsDesc'),
    route: '/admin/incidents',
    activeColor: COLORS.coral,
    icon: 'warning-outline',
  },
  { 
    id: 'payment-manager', 
    title: t('adminMenu.paymentManager'), 
    subtitle: t('adminMenu.paymentManagerDesc'),
    route: '/admin/payments',
    activeColor: COLORS.purple,
    icon: 'card-outline',
  },
  { 
    id: 'expenses', 
    title: t('adminMenu.expenses'), 
    subtitle: t('adminMenu.expensesDesc'),
    route: '/admin/expenses',
    activeColor: COLORS.coral,
    icon: 'trending-down-outline',
  },
  { 
    id: 'users', 
    title: t('adminMenu.users'), 
    subtitle: t('adminMenu.usersDesc'),
    route: '/admin/users',
    activeColor: COLORS.indigo,
    icon: 'person-outline',
  },
  { 
    id: 'admin-settings', 
    title: t('adminMenu.settings'), 
    subtitle: t('adminMenu.settingsDesc'),
    route: '/admin/settings',
    activeColor: COLORS.indigo,
    icon: 'settings-outline',
  },
  { 
    id: 'guard-shifts', 
    title: t('adminMenu.guardShifts'), 
    subtitle: t('adminMenu.guardShiftsDesc'),
    route: '/admin/guard-shifts',
    activeColor: COLORS.blue,
    icon: 'time-outline',
  },
  { 
    id: 'gates', 
    title: t('adminMenu.gates'), 
    subtitle: t('adminMenu.gatesDesc'),
    route: '/admin/gates',
    activeColor: COLORS.teal,
    icon: 'business-outline',
  },
  { 
    id: 'access-reports', 
    title: t('adminMenu.accessReports'), 
    subtitle: t('adminMenu.accessReportsDesc'),
    route: '/admin/access-reports',
    activeColor: COLORS.blue,
    icon: 'shield-checkmark-outline',
  },
  {
    id: 'reports',
    title: t('adminMenu.reports'),
    subtitle: t('adminMenu.reportsDesc'),
    route: '/admin/reports',
    activeColor: COLORS.lime,
    icon: 'analytics-outline',
  },
  {
    id: 'patrols',
    title: t('adminMenu.patrols', 'Rondines'),
    subtitle: t('adminMenu.patrolsDesc', 'Gestionar rutas y checkpoints'),
    route: '/admin/patrols',
    activeColor: COLORS.orange,
    icon: 'footsteps-outline',
  },
  {
    id: 'patrol-reports',
    title: t('adminMenu.patrolReports', 'Reportes de Rondines'),
    subtitle: t('adminMenu.patrolReportsDesc', 'Historial y estadísticas'),
    route: '/admin/patrol-reports',
    activeColor: COLORS.cyan,
    icon: 'stats-chart-outline',
  },
  {
    id: 'marketplace-admin',
    title: 'Marketplace',
    subtitle: 'Proveedores, servicios y configuración',
    route: '/admin/marketplace',
    activeColor: COLORS.teal,
    icon: 'storefront-outline',
    superAdminOnly: true,
  },
], [t]);

  const QUICK_ACTIONS = useMemo(() => [
    { id: 'qr', label: t('home.quickActions.newQR'), route: '/(tabs)/visits' },
    { id: 'reserve', label: t('home.quickActions.reservations'), route: '/reservations' },
    { id: 'announce', label: t('home.quickActions.announcements'), route: '/announcements' },
    { id: 'pay', label: t('home.quickActions.payments'), route: '/(tabs)/payments' },
  ], [t]);

  const userHasLocation = hasLocation ? hasLocation() : !!profile?.location_id;
  const userLocations = profile?.user_locations || [];
  const hasMultipleLocations = userLocations.length > 1;
  const currentLocation = profile?.current_location || profile?.location || null;
  const userRole = profile?.role || user?.role || 'user';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (refreshProfile) await refreshProfile();
    setRefreshing(false);
  }, [refreshProfile]);

  const handleServicePress = (service) => {
    if (!service.available || !service.route) return;
    router.push(service.route);
  };

  const handleQuickAction = (action) => {
    if (action.route) router.push(action.route);
  };

  const handleJoinCommunity = () => router.push('/join-community');
  const handleCreateLocation = () => router.push('/create-location');

  const handleSwitchLocation = async (location) => {
    if (!location?.location_id || switchingLocation) return;
    setSwitchingLocation(true);
    try {
      const result = await switchLocationAPI(token, location.location_id);
      if (result.success) {
        await refreshProfile();
        setShowLocationModal(false);
      }
    } catch (error) {
      console.error('Error:', error);
    }
    setSwitchingLocation(false);
  };

  const toggleService = (serviceId) => {
    setActiveServices(prev => ({ ...prev, [serviceId]: !prev[serviceId] }));
  };

  const toggleAdminService = (serviceId) => {
    setActiveAdminServices(prev => ({ ...prev, [serviceId]: !prev[serviceId] }));
  };

  const getUserName = () => profile?.name || user?.email?.split('@')[0] || t('profile.user');
  const getUserInitials = () => (profile?.name || user?.email || 'U').charAt(0).toUpperCase();
  const getCurrentLocationName = () => currentLocation?.name || profile?.location?.name || t('home.myCommunity');
  const getResidentCount = () => currentLocation?.member_count || profile?.location?.member_count || 0;

  // ========================================
  // RENDER: Location Modal
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
            <Text style={styles.modalTitle} maxFontSizeMultiplier={1.2}>{t('home.changeLocation')}</Text>
            <TouchableOpacity onPress={() => setShowLocationModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
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
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationItemName} maxFontSizeMultiplier={1.2} numberOfLines={1}>
                      {loc.name}
                    </Text>
                    {loc.address && (
                      <Text style={styles.locationItemAddress} maxFontSizeMultiplier={1.1} numberOfLines={1}>
                        {loc.address}
                      </Text>
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
              <Text style={styles.switchingText} maxFontSizeMultiplier={1.2}>{t('home.switchingLocation')}</Text>
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
          {/* Header con Avatar y Campana */}
          <View style={styles.homeHeader}>
            <View style={styles.homeHeaderLeft}>
              {(user?.avatar_url || user?.profile_photo_url) ? (
                <Image 
                  source={{ uri: user?.avatar_url || user?.profile_photo_url }} 
                  style={styles.avatarImage} 
                />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>{getUserInitials()}</Text>
                </View>
              )}
              <View>
                <Text style={styles.greetingText}>{t('home.greeting', { name: getUserName().split(' ')[0] })}</Text>
                <Text style={styles.greetingSubtext}>{t('home.welcomeBack')}</Text>
              </View>
            </View>
            <NotificationBell />
          </View>

          <View style={styles.joinCard}>
            <View style={styles.joinIconContainer}>
              <Text style={styles.joinIcon}>🏡</Text>
            </View>
            <Text style={styles.joinTitle} maxFontSizeMultiplier={1.2}>{t('home.joinCommunity.title')}</Text>
            <Text style={styles.joinSubtitle} maxFontSizeMultiplier={1.2}>
              {t('home.joinCommunity.subtitle')}
            </Text>
            <TouchableOpacity style={styles.joinButton} onPress={handleJoinCommunity}>
              <Text style={styles.joinButtonText} maxFontSizeMultiplier={1.2}>{t('home.joinCommunity.button')}</Text>
            </TouchableOpacity>
          </View>

          {/* Create Location Card */}
          <View style={styles.createLocationCard}>
            <View style={styles.createLocationIconContainer}>
              <Ionicons name="add-circle" size={scale(36)} color={COLORS.lime} />
            </View>
            <Text style={styles.createLocationTitle} maxFontSizeMultiplier={1.2}>
              {t('home.createLocation.title', 'Crear Ubicación')}
            </Text>
            <Text style={styles.createLocationSubtitle} maxFontSizeMultiplier={1.2}>
              {t('home.createLocation.subtitle', 'Registra una nueva comunidad o residencial para tus clientes')}
            </Text>
            <TouchableOpacity style={styles.createLocationButton} onPress={handleCreateLocation}>
              <Ionicons name="add" size={18} color={COLORS.textDark} />
              <Text style={styles.createLocationButtonText} maxFontSizeMultiplier={1.2}>
                {t('home.createLocation.button', 'Crear Nueva Ubicación')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* B2C Services - Horizontal Scroll */}
          <Text style={[styles.sectionTitle, { paddingHorizontal: scale(16) }]} maxFontSizeMultiplier={1.2}>
            {t('home.moreServices')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {B2C_SERVICES.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[styles.b2cCardHorizontal, !service.available && styles.cardDisabled]}
                onPress={() => handleServicePress(service)}
                disabled={!service.available}
              >
                <View style={[styles.b2cIconBoxH, { backgroundColor: service.color + '20' }]}>
                  <Ionicons name={service.icon} size={24} color={service.color} />
                </View>
                <Text style={styles.b2cTitleH} maxFontSizeMultiplier={1.2} numberOfLines={2}>
                  {service.title}
                </Text>
                <Text style={styles.b2cSubtitleH} maxFontSizeMultiplier={1.1} numberOfLines={1}>
                  {service.subtitle}
                </Text>
                {!service.available && (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText} maxFontSizeMultiplier={1}>{t('common.comingSoon')}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

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
        {/* Header con Avatar y Campana */}
        <View style={styles.homeHeader}>
          <View style={styles.homeHeaderLeft}>
            {(user?.avatar_url || user?.profile_photo_url) ? (
              <Image 
                source={{ uri: user?.avatar_url || user?.profile_photo_url }} 
                style={styles.avatarImage} 
              />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{getUserInitials()}</Text>
              </View>
            )}
            <View>
              <Text style={styles.greetingText}>{t('home.greeting', { name: getUserName().split(' ')[0] })}</Text>
              <Text style={styles.greetingSubtext}>{t('home.welcomeBack')}</Text>
            </View>
          </View>
          <NotificationBell />
        </View>

        {/* Location Card - Gradient */}
        <TouchableOpacity 
          style={styles.locationCard}
          onPress={() => hasMultipleLocations && setShowLocationModal(true)}
          activeOpacity={hasMultipleLocations ? 0.8 : 1}
        >
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.locationGradient}
          >
            <View style={styles.locationContent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.locationName} maxFontSizeMultiplier={1.2} numberOfLines={1}>
                  {getCurrentLocationName()}
                </Text>
                <Text style={styles.locationCount} maxFontSizeMultiplier={1.1}>
                  {getResidentCount()} {t('home.residents')}
                </Text>
              </View>
              <View style={styles.locationPinContainer}>
                <Ionicons name="location" size={24} color={COLORS.coral} />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          {QUICK_ACTIONS.map((action, index) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionItem}
              onPress={() => handleQuickAction(action)}
            >
              {index === 0 ? (
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.lime]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickActionBoxActive}
                >
                  <QuickActionIcon actionId={action.id} color={COLORS.textDark} size={28} />
                </LinearGradient>
              ) : (
                <View style={styles.quickActionBox}>
                  <QuickActionIcon actionId={action.id} color={COLORS.textMuted} size={24} />
                </View>
              )}
              <Text style={[
                styles.quickActionLabel,
                index === 0 && styles.quickActionLabelActive
              ]} maxFontSizeMultiplier={1.2}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Services Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>
            {t('home.services')} <Text style={styles.sectionCount}>({COMMUNITY_SERVICES.length})</Text>
          </Text>
          <TouchableOpacity>
            <Text style={styles.sectionLink} maxFontSizeMultiplier={1.2}>{t('home.viewAll')}</Text>
          </TouchableOpacity>
        </View>

        {/* Community Services Grid */}
        <View style={styles.servicesGrid}>
          {COMMUNITY_SERVICES.map((service) => {
            const isActive = activeServices[service.id];
            return (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceCard,
                  isActive ? { backgroundColor: service.activeColor } : styles.serviceCardOff
                ]}
                onPress={() => handleServicePress(service)}
                activeOpacity={0.8}
              >
                <View style={styles.serviceHeader}>
                  <View style={{ flex: 1 }} />
                  <Switch
                    value={isActive}
                    onValueChange={() => toggleService(service.id)}
                    trackColor={{ false: COLORS.bgCardAlt, true: 'rgba(255,255,255,0.3)' }}
                    thumbColor={COLORS.textPrimary}
                    style={styles.toggle}
                  />
                </View>

                <View style={[
                  styles.serviceIconBox,
                  isActive ? styles.serviceIconBoxActive : styles.serviceIconBoxOff
                ]}>
                  <ServiceIcon 
                    serviceId={service.id} 
                    color={isActive ? service.activeColor : COLORS.textMuted}
                    size={24}
                  />
                </View>

                <Text style={[
                  styles.serviceTitle,
                  !isActive && styles.serviceTitleOff
                ]} maxFontSizeMultiplier={1.2} numberOfLines={1}>{service.title}</Text>
                <Text style={[
                  styles.serviceSubtitle,
                  !isActive && styles.serviceSubtitleOff
                ]} maxFontSizeMultiplier={1.1} numberOfLines={1}>{service.subtitle}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Más Servicios - Horizontal Scroll */}
        <Text style={[styles.sectionTitle, { marginTop: scale(24) }]} maxFontSizeMultiplier={1.2}>
          {t('home.moreServices')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {B2C_SERVICES.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[styles.b2cCardHorizontal, !service.available && styles.cardDisabled]}
              onPress={() => handleServicePress(service)}
              disabled={!service.available}
            >
              <View style={[styles.b2cIconBoxH, { backgroundColor: service.color + '20' }]}>
                <Ionicons name={service.icon} size={24} color={service.color} />
              </View>
              <Text style={styles.b2cTitleH} maxFontSizeMultiplier={1.2} numberOfLines={2}>
                {service.title}
              </Text>
              <Text style={styles.b2cSubtitleH} maxFontSizeMultiplier={1.1} numberOfLines={1}>
                {service.subtitle}
              </Text>
              {!service.available && (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText} maxFontSizeMultiplier={1}>{t('common.comingSoon')}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ADMIN SECTION - Horizontal Carousel */}
        {isAdmin && (
          <>
            <View style={styles.adminSectionHeader}>
              <Text style={styles.adminSectionTitle} maxFontSizeMultiplier={1.2}>{t('home.admin')}</Text>
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText} maxFontSizeMultiplier={1}>
                  {userRole === 'superadmin' ? 'Super Admin' : 'Admin'}
                </Text>
              </View>
            </View>
            
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.adminCarousel}
              decelerationRate="fast"
              snapToInterval={scale(160) + scale(12)}
            >
              {ADMIN_SERVICES.filter(service =>
                !service.superAdminOnly || userRole === 'superadmin'
              ).map((service) => {
                const isActive = activeAdminServices[service.id];
                return (
                  <TouchableOpacity
                    key={service.id}
                    style={[
                      styles.adminCardCarousel,
                      isActive ? { backgroundColor: service.activeColor } : styles.adminCardOff
                    ]}
                    onPress={() => router.push(service.route)}
                    activeOpacity={0.8}
                  >
                    {/* Toggle Header */}
                    <View style={styles.adminCardHeader}>
                      <View style={{ flex: 1 }} />
                      <Switch
                        value={isActive}
                        onValueChange={() => toggleAdminService(service.id)}
                        trackColor={{ false: COLORS.bgCardAlt, true: 'rgba(255,255,255,0.3)' }}
                        thumbColor={COLORS.textPrimary}
                        style={styles.toggleSmall}
                      />
                    </View>

                    {/* Icon */}
                    <View style={[
                      styles.adminIconBox,
                      isActive ? styles.adminIconBoxActive : styles.adminIconBoxOff
                    ]}>
                      <Ionicons 
                        name={service.icon} 
                        size={28} 
                        color={isActive ? service.activeColor : COLORS.textMuted} 
                      />
                    </View>

                    {/* Content */}
                    <Text style={[
                      styles.adminCardTitle,
                      !isActive && styles.adminCardTitleOff
                    ]} maxFontSizeMultiplier={1.2} numberOfLines={2}>
                      {service.title}
                    </Text>
                    <Text style={[
                      styles.adminCardSubtitle,
                      !isActive && styles.adminCardSubtitleOff
                    ]} maxFontSizeMultiplier={1.1} numberOfLines={1}>
                      {service.subtitle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        <View style={{ height: scale(120) }} />
      </ScrollView>

      {renderLocationModal()}
    </SafeAreaView>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  scrollContent: {
    paddingTop: scale(10),
  },

  // ============ HOME HEADER ============
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    marginBottom: scale(16),
  },
  homeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  avatarCircle: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textDark,
  },
  // ESTILO AGREGADO PARA MOSTRAR LA FOTO DE PERFIL
  avatarImage: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    borderWidth: 2,
    borderColor: COLORS.teal,
  },
  greetingText: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  greetingSubtext: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },

  // ============ LOCATION CARD ============
  locationCard: {
    borderRadius: scale(20),
    overflow: 'hidden',
    marginHorizontal: scale(16),
    marginBottom: scale(20),
  },
  locationGradient: {
    padding: scale(20),
    borderRadius: scale(20),
  },
  locationContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationName: {
    fontSize: scale(22),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  locationCount: {
    fontSize: scale(13),
    color: 'rgba(255,255,255,0.8)',
  },
  locationPinContainer: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ============ QUICK ACTIONS ============
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scale(24),
    paddingHorizontal: scale(16),
  },
  quickActionItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionBoxActive: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(8),
  },
  quickActionBox: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(16),
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionLabel: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  quickActionLabelActive: {
    color: COLORS.teal,
  },

  // ============ SECTION HEADER ============
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(14),
    paddingHorizontal: scale(16),
  },
  sectionTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
    paddingHorizontal: scale(16),
  },
  sectionCount: {
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  sectionLink: {
    fontSize: scale(14),
    color: COLORS.cyan,
    fontWeight: '500',
  },

  // ============ SERVICES GRID ============
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
  },
  serviceCard: {
    width: (SCREEN_WIDTH - scale(44)) / 2,
    borderRadius: scale(20),
    padding: scale(14),
    marginBottom: scale(12),
    minHeight: scale(155),
  },
  serviceCardOff: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  toggle: {
    transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }],
  },
  toggleSmall: {
    transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }],
  },
  serviceIconBox: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(10),
  },
  serviceIconBoxActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  serviceIconBoxOff: {
    backgroundColor: COLORS.bgCardAlt,
  },
  serviceTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(2),
  },
  serviceTitleOff: {
    color: COLORS.textSecondary,
  },
  serviceSubtitle: {
    fontSize: scale(11),
    color: 'rgba(255,255,255,0.8)',
  },
  serviceSubtitleOff: {
    color: COLORS.textMuted,
  },

  // ============ B2C HORIZONTAL ============
  horizontalScroll: {
    paddingLeft: scale(16),
    paddingRight: scale(8),
    paddingTop: scale(12),
    paddingBottom: scale(4),
  },
  b2cCardHorizontal: {
    width: scale(140),
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(14),
    marginRight: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: scale(140),
  },
  cardDisabled: {
    opacity: 0.6,
  },
  b2cIconBoxH: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
  },
  b2cTitleH: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  b2cSubtitleH: {
    fontSize: scale(11),
    color: COLORS.textMuted,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: scale(10),
    right: scale(10),
    backgroundColor: COLORS.orange,
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(8),
  },
  comingSoonText: {
    fontSize: scale(9),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // ============ ADMIN SECTION ============
  adminSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(24),
    marginBottom: scale(14),
    paddingHorizontal: scale(16),
  },
  adminSectionTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  adminBadge: {
    marginLeft: scale(10),
    backgroundColor: COLORS.coral,
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(8),
  },
  adminBadgeText: {
    color: COLORS.textPrimary,
    fontSize: scale(10),
    fontWeight: '700',
  },

  // ============ ADMIN CAROUSEL ============
  adminCarousel: {
    paddingLeft: scale(16),
    paddingRight: scale(8),
    paddingBottom: scale(4),
  },
  adminCardCarousel: {
    width: scale(160),
    borderRadius: scale(20),
    padding: scale(14),
    marginRight: scale(12),
    minHeight: scale(180),
  },
  adminCardOff: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  adminCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  adminIconBox: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
  },
  adminIconBoxActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  adminIconBoxOff: {
    backgroundColor: COLORS.bgCardAlt,
  },
  adminCardTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  adminCardTitleOff: {
    color: COLORS.textSecondary,
  },
  adminCardSubtitle: {
    fontSize: scale(11),
    color: 'rgba(255,255,255,0.8)',
  },
  adminCardSubtitleOff: {
    color: COLORS.textMuted,
  },

  // ============ JOIN CARD ============
  joinCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(20),
    padding: scale(24),
    alignItems: 'center',
    marginBottom: scale(24),
    marginHorizontal: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  joinIconContainer: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(35),
    backgroundColor: COLORS.bgCardAlt,
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
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  joinSubtitle: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: scale(20),
    lineHeight: scale(18),
  },
  joinButton: {
    backgroundColor: COLORS.teal,
    paddingHorizontal: scale(28),
    paddingVertical: scale(12),
    borderRadius: scale(12),
  },
  joinButtonText: {
    color: COLORS.textPrimary,
    fontSize: scale(14),
    fontWeight: '600',
  },

  // ============ CREATE LOCATION CARD ============
  createLocationCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(20),
    padding: scale(24),
    alignItems: 'center',
    marginBottom: scale(24),
    marginHorizontal: scale(16),
    borderWidth: 1,
    borderColor: COLORS.lime + '30',
  },
  createLocationIconContainer: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(35),
    backgroundColor: COLORS.lime + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  createLocationTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  createLocationSubtitle: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: scale(20),
    lineHeight: scale(18),
  },
  createLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lime,
    paddingHorizontal: scale(28),
    paddingVertical: scale(12),
    borderRadius: scale(12),
    gap: scale(6),
  },
  createLocationButtonText: {
    color: COLORS.textDark,
    fontSize: scale(14),
    fontWeight: '600',
  },

  // ============ MODAL ============
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.bgSecondary,
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
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
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
    backgroundColor: COLORS.bgCardAlt,
  },
  locationItemActive: {
    backgroundColor: 'rgba(170,255,0,0.15)',
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
    backgroundColor: COLORS.textMuted,
    marginRight: scale(12),
  },
  locationDotActive: {
    backgroundColor: COLORS.lime,
  },
  locationItemName: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  locationItemAddress: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  switchingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,26,30,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
  },
  switchingText: {
    marginTop: scale(12),
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
});