// app/(tabs)/home.js
// ISSY Resident App - Home v2: encabezado, residencial deslizable, acciones rápidas
// y secciones (Actividades recientes · Todas las funciones · Administración).
// La lógica de pánico, cambio de residencial y estados sin comunidad se conserva.

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useUserLocation } from '../../src/context/UserLocationContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../src/hooks/useTranslation';

import { createPanic, getMyActivePanic, cancelPanic, authFetch } from '../../src/services/api';
import HomeHeader from '../../src/components/home/HomeHeader';
import LocationCarousel, { getRoleLabel } from '../../src/components/home/LocationCarousel';
import QuickActions from '../../src/components/home/QuickActions';
import HomeSegments from '../../src/components/home/HomeSegments';
import RecentActivity from '../../src/components/home/RecentActivity';
import AllFunctions, { useHomeIconSize } from '../../src/components/home/AllFunctions';
import AdminPanel from '../../src/components/home/AdminPanel';
import { neu } from '../../src/theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ============ COLORES PROHOME ============
const COLORS = {
  bgPrimary: neu.bg,
  bgSecondary: neu.sunken,
  bgCard: neu.raised,
  bgCardAlt: neu.sunken,
  bgCardOff: neu.raised,
  
  lime: neu.teal,
  cyan: neu.teal,
  teal: neu.teal,
  orange: neu.amber,
  purple: neu.lilac,
  coral: neu.coral,
  indigo: neu.lilac,
  blue: neu.blue,
  
  textPrimary: neu.text,
  textSecondary: neu.textLabel,
  textMuted: neu.textSoft,
  textDark: neu.onAccent,
  
  border: neu.border,
  gradientStart: neu.teal,
  gradientEnd: neu.teal,
};

// ============ API ============
const API_URL = 'https://api.joinissy.com/api';

// Con más residenciales que esto, el modal de cambio lleva buscador
const LOCATION_SEARCH_MIN = 6;
const normalizeSearch = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

// authFetch: lee el token vigente de AsyncStorage y lo renueva si responde 401.
// Antes usaba el token de AuthContext, que queda vencido cuando authFetch lo renueva por su lado.
// Devuelve la misma forma de siempre: { success, data } o { success: false, error }.
const switchLocationAPI = async (locationId) => {
  try {
    return await authFetch('/auth/switch-location', {
      method: 'POST',
      body: JSON.stringify({ location_id: locationId }),
    });
  } catch (error) {
    console.error('Error switching location:', error);
    return { success: false, error: error.message };
  }
};

export default function Home() {
  const { user, profile, hasLocation, refreshProfile } = useAuth();
  const { selectLocation } = useUserLocation();
  const router = useRouter();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [showPanicModal, setShowPanicModal] = useState(false);
  const [sendingPanic, setSendingPanic] = useState(false);
  const [panicLongPressReady, setPanicLongPressReady] = useState(false);
  const [activePanic, setActivePanic] = useState(null);  // { id, reference_number, minutes_ago, responders_count, last_responder, can_cancel, unit_number }
  // has_home_pin de /panic/my-active: undefined = aún no cargó (no mostrar aviso)
  const [hasHomePin, setHasHomePin] = useState(undefined);
  const [showCancelPanicModal, setShowCancelPanicModal] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState('otro');
  const [cancellingPanic, setCancellingPanic] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [switchingLocation, setSwitchingLocation] = useState(false);

  // Feature flags (loaded from backend, fail-safe = hidden)
  const [featureFlags, setFeatureFlags] = useState({});

  useEffect(() => {
    const loadFeatureFlags = async () => {
      try {
        const res = await fetch(`${API_URL}/feature-flags`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const flags = {};
          json.data.forEach(f => { flags[f.key] = f.enabled; });
          setFeatureFlags(flags);
        }
      } catch (e) {
        // Fail-safe: flags stay empty → flagged features hidden
        console.warn('[FeatureFlags] Could not load:', e.message);
      }
    };
    loadFeatureFlags();
  }, []);

  // Home v2: refresco de actividades, sección activa y tamaño de iconos
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeSegment, setActiveSegment] = useState('recent');
  // La sección inicial se decide una sola vez por apertura del home
  const initialSegmentDecidedRef = useRef(false);
  const [segmentDecided, setSegmentDecided] = useState(false);
  const [iconSize, setIconSize] = useHomeIconSize();

  const userHasLocation = hasLocation ? hasLocation() : !!profile?.location_id;
  const userLocations = profile?.user_locations || [];

  // Check if user has pending approval (registered with code but not yet approved)
  const isPendingApproval = profile?.pending_locations?.some(ul => ul.status === 'pending')
    && !userLocations.some(ul => ul.status === 'active');
  const currentLocation = profile?.current_location || profile?.location || null;
  const userRole = profile?.role || user?.role || 'user';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshKey((key) => key + 1);
    if (refreshProfile) await refreshProfile();
    setRefreshing(false);
  }, [refreshProfile]);

  // Handler cuando el mantener-presionado completa 2 segundos: abre el modal
  const handlePanicLongPress = () => {
    setPanicLongPressReady(true);
    setShowPanicModal(true);
  };

  // Confirmación final: dispara al backend
  const handleConfirmPanic = async () => {
    if (sendingPanic) return;
    setSendingPanic(true);
    try {
      const locationId = profile?.location_id || null;
      const result = await createPanic({ locationId });
      if (result.success) {
        setShowPanicModal(false);
        Alert.alert(
          '🚨 Emergencia activada',
          `Se notificó a seguridad. Referencia: ${result.data?.panic_event?.reference_number || ''}`,
          [{ text: 'OK' }]
        );
      } else if (result.alreadyActive) {
        setShowPanicModal(false);
        Alert.alert(
          'Emergencia ya activa',
          'Ya tienes una emergencia activa. El personal de seguridad está avisado.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          result.error || 'No se pudo activar la emergencia. Intenta de nuevo.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error activando emergencia:', error);
      Alert.alert('Error', 'Error inesperado. Intenta de nuevo.', [{ text: 'OK' }]);
    } finally {
      setSendingPanic(false);
      setPanicLongPressReady(false);
    }
  };

  // Polling: consultar cada 15s si el usuario tiene una emergencia activa.
  // Actualiza banner con estado más reciente (ack, minutos, etc).
  const currentLocationId = profile?.location_id || null;
  const fetchMyActivePanic = useCallback(async () => {
    try {
      // X-Location-Id igual que createPanic: has_home_pin se calcula para esa membresía
      const result = await getMyActivePanic({ locationId: currentLocationId });
      if (result.success && result.data) {
        if (result.data.has_active && result.data.event) {
          setActivePanic(result.data.event);
        } else {
          setActivePanic(null);
        }
        if (typeof result.data.has_home_pin === 'boolean') {
          setHasHomePin(result.data.has_home_pin);
        }
      }
    } catch (error) {
      console.error('Error polling panic:', error);
    }
  }, [currentLocationId]);

  useEffect(() => {
    // Inicial + intervalo
    fetchMyActivePanic();
    const interval = setInterval(fetchMyActivePanic, 15000);
    return () => clearInterval(interval);
  }, [fetchMyActivePanic]);

  // Al volver de /my-home-location refrescamos sin esperar el próximo poll
  useFocusEffect(
    useCallback(() => {
      fetchMyActivePanic();
    }, [fetchMyActivePanic])
  );

  const goToMyHomeLocation = () => router.push('/my-home-location');

  // Desde el modal de pánico: cierra el modal y lleva a marcar la casa (no dispara)
  const handleMarkHomeFromPanic = () => {
    setShowPanicModal(false);
    setPanicLongPressReady(false);
    goToMyHomeLocation();
  };

  // Handlers para el modal de cancelación del banner
  const handleOpenCancelPanicModal = () => {
    setSelectedCancelReason('otro');
    setShowCancelPanicModal(true);
  };

  const handleCloseCancelPanicModal = () => {
    if (cancellingPanic) return;
    setShowCancelPanicModal(false);
  };

  const handleConfirmCancelPanic = async () => {
    if (!activePanic || cancellingPanic) return;
    setCancellingPanic(true);
    try {
      const result = await cancelPanic(activePanic.id, { reason: selectedCancelReason });
      if (result.success) {
        setActivePanic(null);
        setShowCancelPanicModal(false);
        Alert.alert('Emergencia cancelada', 'Se notificó al personal de seguridad.', [{ text: 'OK' }]);
      } else {
        Alert.alert('Error', result.error || 'No se pudo cancelar la emergencia', [{ text: 'OK' }]);
      }
    } catch (error) {
      console.error('Error cancelling panic:', error);
      Alert.alert('Error', 'Error inesperado al cancelar', [{ text: 'OK' }]);
    } finally {
      setCancellingPanic(false);
    }
  };

  const handleCancelPanic = () => {
    setShowPanicModal(false);
    setPanicLongPressReady(false);
  };

  const handleJoinCommunity = () => router.push('/join-community');
  const handleCreateLocation = () => router.push('/create-location');

  const handleSwitchLocation = async (location) => {
    if (!location?.location_id || switchingLocation) return;
    setSwitchingLocation(true);
    try {
      const result = await switchLocationAPI(location.location_id);
      if (result.success) {
        // Sincronizar UserLocationContext (fuente del location_id en los QRs):
        // sin esto, el INSERT de QRs sigue usando la comunidad anterior.
        await selectLocation(location.location_id);
        await refreshProfile();
        setShowLocationModal(false);
      } else {
        Alert.alert(t('home2.switchFailed', 'No se pudo cambiar de residencial. Intenta de nuevo.'));
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert(t('home2.switchFailed', 'No se pudo cambiar de residencial. Intenta de nuevo.'));
    }
    setSwitchingLocation(false);
  };

  const getCurrentLocationName = () => currentLocation?.name || profile?.location?.name || t('home.myCommunity');

  // ============ SECCIONES ============
  const isSuperAdmin = userRole === 'superadmin';
  const segments = [
    { key: 'recent', label: t('home2.segments.recent', 'Actividades recientes'), shortLabel: t('home2.segments.recentShort', 'Recientes') },
    { key: 'functions', label: t('home2.segments.functions', 'Todas las funciones'), shortLabel: t('home2.segments.functionsShort', 'Funciones') },
    ...(isAdmin ? [{ key: 'admin', label: t('home2.segments.admin', 'Administración'), shortLabel: t('home2.segments.adminShort', 'Admin') }] : []),
  ];

  // Solo la primera carga decide: si Recientes llega vacía, arrancar en Todas las funciones.
  // Si la carga falla, se queda en Recientes para que se vea Reintentar.
  // Si después el usuario vuelve a Recientes y está vacía, se queda ahí con su mensaje.
  const handleRecentLoaded = useCallback((count, { failed = false } = {}) => {
    if (initialSegmentDecidedRef.current) return;
    initialSegmentDecidedRef.current = true;
    if (count === 0 && !failed) setActiveSegment('functions');
    setSegmentDecided(true);
  }, []);

  // Si el usuario elige una sección antes de que Recientes termine de cargar, esa elección decide
  const handleSegmentChange = (key) => {
    initialSegmentDecidedRef.current = true;
    setSegmentDecided(true);
    setActiveSegment(key);
  };

  const renderSegment = (key) => {
    if (key === 'functions') {
      return <AllFunctions featureFlags={featureFlags} size={iconSize} onSizeChange={setIconSize} />;
    }
    if (key === 'admin') {
      return <AdminPanel isSuperAdmin={isSuperAdmin} locationName={getCurrentLocationName()} size={iconSize} />;
    }
    return (
      <RecentActivity
        isAdmin={isAdmin}
        refreshKey={refreshKey}
        onLoaded={handleRecentLoaded}
        locationId={currentLocationId}
      />
    );
  };

  // ========================================
  // RENDER: Location Modal
  // ========================================
  // ========================================
  // RENDER: Panic Modal (confirmación de emergencia)
  // ========================================
  const renderPanicModal = () => (
    <Modal
      visible={showPanicModal}
      animationType="fade"
      transparent
      onRequestClose={handleCancelPanic}
    >
      <View style={styles.panicModalOverlay}>
        <View style={styles.panicModalContent}>
          <View style={styles.panicModalIconWrap}>
            <Ionicons name="warning" size={44} color={neu.text} />
          </View>
          <Text style={styles.panicModalTitle} maxFontSizeMultiplier={1.2}>
            ¿Activar alerta de emergencia?
          </Text>
          <Text style={styles.panicModalSubtitle} maxFontSizeMultiplier={1.2}>
            Se notificará al guardia, administradores y tus contactos personales.
          </Text>
          {hasHomePin === false ? (
            // Sin casa marcada: ofrecer marcarla, pero NUNCA bloquear el disparo
            <View style={styles.panicModalHomePinBlock}>
              <View style={styles.panicModalHomePinHeader}>
                <Ionicons name="home-outline" size={18} color={neu.amber} />
                <Text style={styles.panicModalHomePinTitle} maxFontSizeMultiplier={1.2}>
                  {t('home.panicModal.markFirstTitle')}
                </Text>
              </View>
              <Text style={styles.panicModalHomePinText} maxFontSizeMultiplier={1.2}>
                {t('home.panicModal.markFirstText')}
              </Text>
              <TouchableOpacity
                style={[styles.panicModalButton, styles.panicModalButtonMarkHome]}
                onPress={handleMarkHomeFromPanic}
                disabled={sendingPanic}
              >
                <Text style={styles.panicModalButtonMarkHomeText}>{t('home.panicModal.markNow')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.panicModalButton, styles.panicModalButtonConfirm]}
                onPress={handleConfirmPanic}
                disabled={sendingPanic}
              >
                {sendingPanic ? (
                  <ActivityIndicator size="small" color={neu.text} />
                ) : (
                  <Text style={styles.panicModalButtonConfirmText}>{t('home.panicModal.continueWithout')}</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.panicModalButton, styles.panicModalButtonConfirm]}
              onPress={handleConfirmPanic}
              disabled={sendingPanic}
            >
              {sendingPanic ? (
                <ActivityIndicator size="small" color={neu.text} />
              ) : (
                <Text style={styles.panicModalButtonConfirmText}>Sí, enviar alerta</Text>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.panicModalButton, styles.panicModalButtonCancel]}
            onPress={handleCancelPanic}
            disabled={sendingPanic}
          >
            <Text style={styles.panicModalButtonCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ========================================
  // RENDER: Cancel Panic Modal (motivos)
  // ========================================
  const CANCEL_REASONS = [
    { key: 'falsa_alarma', label: 'Falsa alarma', icon: 'checkmark-circle-outline' },
    { key: 'ya_me_atendieron', label: 'Ya me atendieron', icon: 'shield-checkmark-outline' },
    { key: 'prefiero_llamar_directo', label: 'Prefiero llamar directo', icon: 'call-outline' },
    { key: 'otro', label: 'Otro motivo', icon: 'ellipsis-horizontal-outline' },
  ];

  const renderCancelPanicModal = () => (
    <Modal
      visible={showCancelPanicModal}
      animationType="fade"
      transparent
      onRequestClose={handleCloseCancelPanicModal}
    >
      <View style={styles.panicModalOverlay}>
        <View style={styles.cancelPanicModalContent}>
          <Text style={styles.cancelPanicModalTitle} maxFontSizeMultiplier={1.2}>
            Cancelar emergencia
          </Text>
          <Text style={styles.cancelPanicModalSubtitle} maxFontSizeMultiplier={1.2}>
            ¿Por qué quieres cancelar?
          </Text>

          <View style={styles.cancelReasonsList}>
            {CANCEL_REASONS.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[
                  styles.cancelReasonRow,
                  selectedCancelReason === r.key && styles.cancelReasonRowActive,
                ]}
                onPress={() => setSelectedCancelReason(r.key)}
                disabled={cancellingPanic}
              >
                <Ionicons
                  name={r.icon}
                  size={20}
                  color={selectedCancelReason === r.key ? neu.coral : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.cancelReasonLabel,
                    selectedCancelReason === r.key && styles.cancelReasonLabelActive,
                  ]}
                  maxFontSizeMultiplier={1.2}
                >
                  {r.label}
                </Text>
                {selectedCancelReason === r.key && (
                  <Ionicons name="checkmark" size={18} color={neu.coral} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.panicModalButton, styles.panicModalButtonConfirm]}
            onPress={handleConfirmCancelPanic}
            disabled={cancellingPanic}
          >
            {cancellingPanic ? (
              <ActivityIndicator size="small" color={neu.text} />
            ) : (
              <Text style={styles.panicModalButtonConfirmText}>Confirmar cancelación</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.panicModalButton, styles.panicModalButtonCancel]}
            onPress={handleCloseCancelPanicModal}
            disabled={cancellingPanic}
          >
            <Text style={styles.panicModalButtonCancelText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Lista de residenciales: nombre, rol y casa; buscador (sin acentos) con más de 6.
  // La actual se marca con el mismo location_id que usa la tarjeta (profile.location_id).
  const closeLocationModal = () => setShowLocationModal(false);

  useEffect(() => {
    if (!showLocationModal) setLocationSearch('');
  }, [showLocationModal]);

  const showLocationSearch = userLocations.length > LOCATION_SEARCH_MIN;
  const locationQuery = normalizeSearch(locationSearch);
  const visibleLocations = locationQuery
    ? userLocations.filter((loc) => normalizeSearch(loc.name).includes(locationQuery))
    : userLocations;

  const renderLocationModal = () => (
    <Modal
      visible={showLocationModal}
      animationType="slide"
      transparent
      onRequestClose={closeLocationModal}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} maxFontSizeMultiplier={1.2}>{t('home.changeLocation')}</Text>
            <TouchableOpacity onPress={closeLocationModal}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {showLocationSearch && (
            <View style={styles.locationSearch}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.locationSearchInput}
                value={locationSearch}
                onChangeText={setLocationSearch}
                placeholder={t('home2.locationSearch', 'Buscar residencial')}
                placeholderTextColor={COLORS.textMuted}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                maxFontSizeMultiplier={1.2}
                accessibilityLabel={t('home2.locationSearch', 'Buscar residencial')}
              />
              {locationSearch.length > 0 && (
                <TouchableOpacity onPress={() => setLocationSearch('')} hitSlop={10} accessibilityLabel={t('common.close')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )}

          <ScrollView style={styles.locationList} keyboardShouldPersistTaps="handled">
            {visibleLocations.length === 0 && (
              <Text style={styles.locationEmpty} maxFontSizeMultiplier={1.2}>
                {t('home2.noLocationResults', 'No encontramos esa residencial')}
              </Text>
            )}
            {visibleLocations.map((loc, index) => {
              const isCurrent = loc.location_id === currentLocationId;
              const detail = [
                getRoleLabel(loc.role, t),
                loc.house_number ? `${t('myUnit.details.unit')} ${loc.house_number}` : null,
              ].filter(Boolean).join(' · ');
              return (
                <TouchableOpacity
                  key={loc.location_id || index}
                  style={[styles.locationItem, isCurrent && styles.locationItemActive]}
                  onPress={() => handleSwitchLocation(loc)}
                  disabled={switchingLocation || isCurrent}
                  accessibilityState={{ selected: isCurrent }}
                >
                  <View style={styles.locationItemLeft}>
                    <View style={[styles.locationDot, isCurrent && styles.locationDotActive]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locationItemName} maxFontSizeMultiplier={1.2} numberOfLines={1}>
                        {loc.name}
                      </Text>
                      {!!detail && (
                        <Text style={styles.locationItemAddress} maxFontSizeMultiplier={1.1} numberOfLines={1}>
                          {detail}
                        </Text>
                      )}
                    </View>
                  </View>
                  {isCurrent && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.lime} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {switchingLocation && (
            <View style={styles.switchingOverlay}>
              <ActivityIndicator size="large" color={COLORS.cyan} />
              <Text style={styles.switchingText} maxFontSizeMultiplier={1.2}>{t('home.switchingLocation')}</Text>
            </View>
          )}
        </View>
      </View>
      </KeyboardAvoidingView>
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[neu.teal]} tintColor={neu.teal} />
          }
        >
          <HomeHeader />

          {isPendingApproval && (
            <View style={{ backgroundColor: neu.raised, margin: 16, padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 3, borderLeftColor: neu.teal }}>
              <Ionicons name="time-outline" size={24} color={neu.teal} />
              <Text style={{ color: neu.text, flex: 1, fontSize: 14 }}>Tu solicitud está pendiente de aprobación por el administrador.</Text>
            </View>
          )}

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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[neu.teal]} tintColor={neu.teal} />
        }
      >
        <HomeHeader />

        {/* Residencial deslizable: ancho completo (sin margen lateral) */}
        <LocationCarousel
          locations={userLocations}
          currentLocationId={currentLocationId}
          user={profile || user}
          onSwitchLocation={handleSwitchLocation}
          switching={switchingLocation}
          onOpenLocationList={() => setShowLocationModal(true)}
        />

        {/* Banner de Emergencia Activa */}
        {activePanic && (
          <View style={styles.panicBannerContainer}>
            <View style={styles.panicBanner}>
              <View style={styles.panicBannerIconWrap}>
                <Ionicons name="warning" size={22} color={neu.text} />
              </View>
              <View style={styles.panicBannerBody}>
                <Text style={styles.panicBannerTitle} maxFontSizeMultiplier={1.2}>
                  🚨 Emergencia activa
                </Text>
                <Text style={styles.panicBannerSubtitle} maxFontSizeMultiplier={1.2}>
                  {activePanic.last_responder
                    ? `${activePanic.last_responder.name} está en camino`
                    : `Reportada hace ${activePanic.minutes_ago} min · Ref: ${activePanic.reference_number}`}
                </Text>
              </View>
              {activePanic.can_cancel && (
                <TouchableOpacity
                  style={styles.panicBannerCancelButton}
                  onPress={handleOpenCancelPanicModal}
                >
                  <Text style={styles.panicBannerCancelText}>Cancelar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Aviso persistente: marcar la casa (solo cuando el backend dice has_home_pin === false) */}
        {hasHomePin === false && (
          <View style={styles.homePinCardContainer}>
            <TouchableOpacity style={styles.homePinCard} onPress={goToMyHomeLocation} activeOpacity={0.85}>
              <View style={styles.homePinIconWrap}>
                <Ionicons name="home-outline" size={20} color={neu.amber} />
              </View>
              <View style={styles.homePinBody}>
                <Text style={styles.homePinTitle} maxFontSizeMultiplier={1.2}>
                  {t('home.homePin.title')}
                </Text>
                <Text style={styles.homePinSubtitle} maxFontSizeMultiplier={1.2}>
                  {t('home.homePin.subtitle')}
                </Text>
              </View>
              <View style={styles.homePinCta}>
                <Text style={styles.homePinCtaText} maxFontSizeMultiplier={1.2}>{t('home.homePin.cta')}</Text>
                <Ionicons name="chevron-forward" size={14} color={neu.amber} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Acciones rápidas: Emergencia usa el mismo handlePanicLongPress (2 s) */}
        <QuickActions onPanicLongPress={handlePanicLongPress} />

        <HomeSegments
          segments={segments}
          value={activeSegment}
          onChange={handleSegmentChange}
          loading={!segmentDecided}
        >
          {renderSegment}
        </HomeSegments>

        <View style={{ height: scale(120) }} />
      </ScrollView>

      {renderPanicModal()}
      {renderCancelPanicModal()}
      {renderLocationModal()}
    </SafeAreaView>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  // Piel i5: fondo neu solo en el home
  container: {
    flex: 1,
    backgroundColor: neu.bg,
  },
  scrollContent: {
    paddingTop: scale(10),
  },

  panicModalOverlay: {
    flex: 1,
    backgroundColor: neu.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(24),
  },
  panicModalContent: {
    width: '100%',
    backgroundColor: neu.raised,
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: neu.coral,
    padding: scale(24),
    alignItems: 'center',
  },
  panicModalIconWrap: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(16),
    backgroundColor: neu.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  panicModalTitle: {
    color: neu.text,
    fontSize: scale(18),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: scale(8),
  },
  panicModalSubtitle: {
    color: neu.textSoft,
    fontSize: scale(13),
    textAlign: 'center',
    lineHeight: scale(18),
    marginBottom: scale(20),
  },
  panicModalButton: {
    width: '100%',
    padding: scale(14),
    borderRadius: scale(12),
    alignItems: 'center',
    marginBottom: scale(8),
  },
  panicModalButtonConfirm: {
    backgroundColor: neu.coral,
  },
  panicModalButtonConfirmText: {
    color: neu.text,
    fontSize: scale(15),
    fontWeight: '600',
  },
  panicModalButtonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: neu.border,
  },
  panicModalButtonCancelText: {
    color: neu.textSoft,
    fontSize: scale(15),
  },
  panicModalHomePinBlock: {
    width: '100%',
    backgroundColor: neu.amber + '14',
    borderWidth: 1,
    borderColor: neu.amber + '59',
    borderRadius: scale(14),
    padding: scale(12),
    marginBottom: scale(8),
  },
  panicModalHomePinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: scale(4),
  },
  panicModalHomePinTitle: {
    color: neu.text,
    fontSize: scale(14),
    fontWeight: '600',
  },
  panicModalHomePinText: {
    color: neu.textLabel,
    fontSize: scale(12),
    lineHeight: scale(17),
    marginBottom: scale(12),
  },
  panicModalButtonMarkHome: {
    backgroundColor: neu.amber,
  },
  panicModalButtonMarkHomeText: {
    color: neu.onAccent,
    fontSize: scale(15),
    fontWeight: '600',
  },
  // ============ AVISO: MARCAR MI CASA ============
  homePinCardContainer: {
    paddingHorizontal: scale(16),
    marginBottom: scale(16),
  },
  homePinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: neu.amber + '59',
    borderRadius: scale(14),
    padding: scale(12),
    gap: scale(10),
  },
  homePinIconWrap: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    backgroundColor: neu.amber + '26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homePinBody: {
    flex: 1,
    minWidth: 0,
  },
  homePinTitle: {
    color: COLORS.textPrimary,
    fontSize: scale(13),
    fontWeight: '600',
  },
  homePinSubtitle: {
    color: COLORS.textMuted,
    fontSize: scale(11),
    marginTop: 2,
  },
  homePinCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  homePinCtaText: {
    color: neu.amber,
    fontSize: scale(12),
    fontWeight: '600',
  },
  // ============ PANIC BANNER (emergencia activa) ============
  panicBannerContainer: {
    paddingHorizontal: scale(16),
    marginBottom: scale(20),
  },
  panicBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: neu.coral + '26',
    borderWidth: 1,
    borderColor: neu.coral,
    borderRadius: scale(14),
    padding: scale(12),
    gap: scale(10),
  },
  panicBannerIconWrap: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(10),
    backgroundColor: neu.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panicBannerBody: {
    flex: 1,
    minWidth: 0,
  },
  panicBannerTitle: {
    color: neu.text,
    fontSize: scale(14),
    fontWeight: '600',
  },
  panicBannerSubtitle: {
    color: neu.coral,
    fontSize: scale(11),
    marginTop: 2,
  },
  panicBannerCancelButton: {
    backgroundColor: neu.raised,
    borderWidth: 1,
    borderColor: neu.border,
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(8),
  },
  panicBannerCancelText: {
    color: neu.text,
    fontSize: scale(11),
    fontWeight: '600',
  },
  // ============ CANCEL PANIC MODAL ============
  cancelPanicModalContent: {
    width: '100%',
    backgroundColor: neu.raised,
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: neu.coral,
    padding: scale(20),
  },
  cancelPanicModalTitle: {
    color: neu.text,
    fontSize: scale(18),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: scale(4),
  },
  cancelPanicModalSubtitle: {
    color: neu.textSoft,
    fontSize: scale(13),
    textAlign: 'center',
    marginBottom: scale(16),
  },
  cancelReasonsList: {
    gap: scale(8),
    marginBottom: scale(16),
  },
  cancelReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    padding: scale(12),
    borderRadius: scale(10),
    backgroundColor: neu.raised,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cancelReasonRowActive: {
    backgroundColor: neu.coral + '1F',
    borderColor: neu.coral,
  },
  cancelReasonLabel: {
    flex: 1,
    color: neu.textLabel,
    fontSize: scale(14),
  },
  cancelReasonLabelActive: {
    color: neu.text,
    fontWeight: '600',
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

  // ============ MODAL ============
  modalOverlay: {
    flex: 1,
    backgroundColor: neu.overlay,
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
    backgroundColor: neu.teal + '26',
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
  locationSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginHorizontal: scale(20),
    marginTop: scale(12),
    paddingHorizontal: scale(12),
    minHeight: scale(44),
    borderRadius: scale(12),
    backgroundColor: COLORS.bgCardAlt,
  },
  locationSearchInput: {
    flex: 1,
    fontSize: scale(14),
    color: COLORS.textPrimary,
    paddingVertical: scale(8),
  },
  locationEmpty: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: scale(24),
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