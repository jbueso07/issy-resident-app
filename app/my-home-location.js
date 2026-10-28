// app/my-home-location.js
// ISSY Resident App - Mi ubicación (Bloque 6: el residente marca su casa).
// El residente se para en su casa, la app mejora la precisión del GPS hasta
// ~20 s y guarda la coordenada en /unit-locations/mine. Seguridad la usa en
// emergencias (snapshot en panic_events). No depende del mapa: en Android sin
// key de Google Maps se confirma con coordenadas y precisión.

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useAuth } from '../src/context/AuthContext';
import { getMyUnitLocations, setMyUnitLocation } from '../src/services/api';
import { neu } from '../src/theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// Mismo guard que app/admin/patrols.js: en Android react-native-maps usa Google
// Maps y sin android.config.googleMaps.apiKey el mapa renderiza gris.
const ANDROID_MAPS_KEY =
  Constants.expoConfig?.android?.config?.googleMaps?.apiKey || null;
const MAPS_AVAILABLE = Platform.OS !== 'android' || Boolean(ANDROID_MAPS_KEY);

// Contrato backend: precisión > 50 m → 422 LOW_ACCURACY. Validamos antes.
const MAX_ACCURACY_METERS = 50;
const GPS_WINDOW_MS = 20000;

const COLORS = {
  background: neu.bg,
  backgroundSecondary: neu.raised,
  card: neu.raised,
  cardBorder: neu.border,
  panic: neu.coral,
  panicMuted: neu.coral + '26',
  success: neu.teal,
  successMuted: neu.teal + '26',
  warning: neu.amber,
  warningMuted: neu.amber + '26',
  teal: neu.teal,
  tealMuted: neu.teal + '26',
  textPrimary: neu.text,
  textSecondary: neu.textLabel,
  textMuted: neu.textSoft,
};

// Fases del GPS para la unidad seleccionada (estados explícitos del encargo)
const GPS = {
  IDLE: 'idle',
  NO_PERMISSION: 'noPermission',
  SEARCHING: 'searching',
  LOW_ACCURACY: 'lowAccuracy',
  READY: 'ready',
  SAVING: 'saving',
  ERROR: 'error',
};

const unitKey = (u) => `${u.location_id}::${u.unit_number}`;

export default function MyHomeLocationScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();

  // Carga de unidades: 'loading' | 'ok' | 'notMember' | 'error'
  const [loadState, setLoadState] = useState('loading');
  const [loadError, setLoadError] = useState(null);
  const [units, setUnits] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);

  // GPS
  const [gpsPhase, setGpsPhase] = useState(GPS.IDLE);
  const [bestFix, setBestFix] = useState(null); // { latitude, longitude, accuracy }
  const [gpsError, setGpsError] = useState(null);
  // Error del backend al guardar (403 PIN_OWNED_BY_OTHER, etc.)
  const [saveBlocked, setSaveBlocked] = useState(null); // 'ownedByOther' | 'notMember' | null

  const watchRef = useRef(null);
  const timerRef = useRef(null);
  const bestFixRef = useRef(null);

  const stopWatching = useCallback(() => {
    if (watchRef.current) {
      try { watchRef.current.remove(); } catch (e) { /* noop */ }
      watchRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopWatching(), [stopWatching]);

  const loadUnits = useCallback(async () => {
    setLoadState('loading');
    setLoadError(null);
    const result = await getMyUnitLocations();
    if (!result.success) {
      if (result.status === 404 || result.code === 'NOT_MEMBER') {
        setLoadState('notMember');
      } else {
        setLoadState('error');
        setLoadError(result.error || null);
      }
      return;
    }
    const list = Array.isArray(result.data?.units) ? result.data.units : [];
    setUnits(list);
    setLoadState('ok');
    setSelectedKey((prev) => {
      if (prev && list.some((u) => unitKey(u) === prev)) return prev;
      // Preferir la comunidad activa del perfil
      const preferred = list.find((u) => u.location_id === profile?.location_id) || list[0];
      return preferred ? unitKey(preferred) : null;
    });
  }, [profile?.location_id]);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const selectedUnit = useMemo(
    () => units.find((u) => unitKey(u) === selectedKey) || null,
    [units, selectedKey]
  );

  const resetGps = useCallback(() => {
    stopWatching();
    bestFixRef.current = null;
    setBestFix(null);
    setGpsError(null);
    setSaveBlocked(null);
    setGpsPhase(GPS.IDLE);
  }, [stopWatching]);

  const handleSelectUnit = (u) => {
    if (unitKey(u) === selectedKey) return;
    resetGps();
    setSelectedKey(unitKey(u));
  };

  // ---- GPS: pedir permiso y mejorar precisión hasta ~20 s ----
  const startLocating = useCallback(async () => {
    stopWatching();
    bestFixRef.current = null;
    setBestFix(null);
    setGpsError(null);
    setSaveBlocked(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsPhase(GPS.NO_PERMISSION);
        return;
      }
    } catch (error) {
      console.error('Location permission error:', error);
      setGpsPhase(GPS.NO_PERMISSION);
      return;
    }

    setGpsPhase(GPS.SEARCHING);

    try {
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 1000,
          distanceInterval: 0,
        },
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords || {};
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
          const acc = Number.isFinite(accuracy) ? accuracy : Number.POSITIVE_INFINITY;
          const current = bestFixRef.current;
          if (!current || acc < current.accuracy) {
            const fix = { latitude, longitude, accuracy: acc };
            bestFixRef.current = fix;
            setBestFix(fix);
            // En cuanto la precisión alcanza, habilitamos Guardar (seguimos
            // mejorando hasta que venza la ventana o el usuario guarde).
            if (acc <= MAX_ACCURACY_METERS) setGpsPhase(GPS.READY);
          }
        }
      );
    } catch (error) {
      console.error('watchPositionAsync error:', error);
      setGpsError(error?.message || null);
      setGpsPhase(GPS.ERROR);
      return;
    }

    timerRef.current = setTimeout(() => {
      stopWatching();
      const best = bestFixRef.current;
      if (best && best.accuracy <= MAX_ACCURACY_METERS) {
        setGpsPhase(GPS.READY);
      } else if (best) {
        setGpsPhase(GPS.LOW_ACCURACY);
      } else {
        setGpsPhase(GPS.ERROR);
      }
    }, GPS_WINDOW_MS);
  }, [stopWatching]);

  // ---- Guardar ----
  const handleSave = async () => {
    const fix = bestFixRef.current;
    if (!selectedUnit || !fix || fix.accuracy > MAX_ACCURACY_METERS) return;
    stopWatching();
    setGpsPhase(GPS.SAVING);

    const result = await setMyUnitLocation({
      location_id: selectedUnit.location_id,
      unit_number: selectedUnit.unit_number,
      latitude: fix.latitude,
      longitude: fix.longitude,
      accuracy_meters: Math.round(fix.accuracy),
    });

    if (result.success) {
      const saved = result.data?.unit_location;
      if (saved) {
        setUnits((prev) => prev.map((u) => (unitKey(u) === unitKey(saved) ? { ...u, ...saved } : u)));
      } else {
        await loadUnits();
      }
      bestFixRef.current = null;
      setBestFix(null);
      setGpsPhase(GPS.IDLE);
      Alert.alert(t('myHomeLocation.saved'), t('myHomeLocation.savedSuccess'), [{ text: t('common.ok') }]);
      return;
    }

    if (result.code === 'PIN_OWNED_BY_OTHER' || result.status === 403) {
      setSaveBlocked('ownedByOther');
      setGpsPhase(GPS.IDLE);
      return;
    }
    if (result.code === 'NOT_MEMBER' || result.status === 404) {
      setSaveBlocked('notMember');
      setGpsPhase(GPS.IDLE);
      return;
    }
    if (result.code === 'LOW_ACCURACY' || result.status === 422) {
      setGpsPhase(GPS.LOW_ACCURACY);
      return;
    }
    if (result.code === 'INVALID_COORDS' || result.status === 400) {
      setGpsError(t('myHomeLocation.invalidCoords'));
      setGpsPhase(GPS.ERROR);
      return;
    }
    setGpsError(result.error || t('myHomeLocation.saveError'));
    setGpsPhase(GPS.ERROR);
  };

  const handleOpenSettings = () => {
    Linking.openSettings().catch(() => {});
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    try {
      return d.toLocaleString(i18n.language || 'es', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch (e) {
      return d.toLocaleString();
    }
  };

  const roundedAccuracy = bestFix && Number.isFinite(bestFix.accuracy) ? Math.round(bestFix.accuracy) : null;

  // ---- Render helpers ----
  const renderUnitChips = () => {
    if (units.length <= 1) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('myHomeLocation.selectUnit')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {units.map((u) => {
            const active = unitKey(u) === selectedKey;
            return (
              <TouchableOpacity
                key={unitKey(u)}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => handleSelectUnit(u)}
              >
                <Ionicons
                  name={u.has_pin ? 'location' : 'location-outline'}
                  size={14}
                  color={active ? COLORS.background : u.has_pin ? COLORS.success : COLORS.textSecondary}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                  {t('myHomeLocation.unitChip', { community: u.location_name, unit: u.unit_number })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderSavedState = () => {
    if (!selectedUnit) return null;
    if (!selectedUnit.has_pin) {
      return (
        <View style={styles.statusCard}>
          <Ionicons name="location-outline" size={20} color={COLORS.warning} />
          <Text style={styles.statusText}>{t('myHomeLocation.notMarked')}</Text>
        </View>
      );
    }
    const byLabel = selectedUnit.set_by_me
      ? t('myHomeLocation.markedByYou')
      : selectedUnit.source === 'admin'
        ? t('myHomeLocation.markedByAdmin')
        : t('myHomeLocation.markedByOther');
    return (
      <View style={[styles.statusCard, styles.statusCardSuccess]}>
        <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
        <View style={{ flex: 1 }}>
          <Text style={styles.statusTitle}>{t('myHomeLocation.saved')}</Text>
          <Text style={styles.statusText}>{byLabel}</Text>
          {!!selectedUnit.set_at && (
            <Text style={styles.statusMeta}>
              {t('myHomeLocation.savedAt', { date: formatDate(selectedUnit.set_at) })}
            </Text>
          )}
          {Number.isFinite(selectedUnit.accuracy_meters) && (
            <Text style={styles.statusMeta}>
              {t('myHomeLocation.accuracy', { meters: Math.round(selectedUnit.accuracy_meters) })}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderMapPreview = () => {
    const coords = bestFix
      ? { latitude: bestFix.latitude, longitude: bestFix.longitude }
      : selectedUnit?.has_pin && Number.isFinite(selectedUnit.latitude)
        ? { latitude: selectedUnit.latitude, longitude: selectedUnit.longitude }
        : null;
    if (!coords) return null;

    if (!MAPS_AVAILABLE) {
      return (
        <View style={styles.coordsCard}>
          <Ionicons name="navigate-outline" size={18} color={COLORS.teal} />
          <View style={{ flex: 1 }}>
            <Text style={styles.coordsText}>
              {t('myHomeLocation.coords', { lat: coords.latitude.toFixed(5), lng: coords.longitude.toFixed(5) })}
            </Text>
            <Text style={styles.coordsHint}>{t('myHomeLocation.noMapHint')}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.mapWrap}>
        <MapView
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          region={{ ...coords, latitudeDelta: 0.003, longitudeDelta: 0.003 }}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          pointerEvents="none"
        >
          <Marker coordinate={coords} pinColor={bestFix ? 'red' : 'green'} />
        </MapView>
        <Text style={styles.mapHint}>{t('myHomeLocation.mapHint')}</Text>
      </View>
    );
  };

  const renderGpsBlock = () => {
    if (!selectedUnit) return null;

    // Bloqueos que vienen del backend o de can_edit
    const blocked = saveBlocked === 'ownedByOther' || (selectedUnit.has_pin && selectedUnit.can_edit === false);
    if (blocked) {
      return (
        <View style={[styles.statusCard, styles.statusCardWarning]}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.warning} />
          <Text style={styles.statusText}>{t('myHomeLocation.ownedByOther')}</Text>
        </View>
      );
    }
    if (saveBlocked === 'notMember') {
      return (
        <View style={[styles.statusCard, styles.statusCardWarning]}>
          <Ionicons name="alert-circle-outline" size={20} color={COLORS.warning} />
          <Text style={styles.statusText}>{t('myHomeLocation.notMember')}</Text>
        </View>
      );
    }

    switch (gpsPhase) {
      case GPS.NO_PERMISSION:
        return (
          <View style={[styles.statusCard, styles.statusCardWarning, styles.statusCardColumn]}>
            <View style={styles.statusRow}>
              <Ionicons name="location-outline" size={20} color={COLORS.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>{t('myHomeLocation.noPermissionTitle')}</Text>
                <Text style={styles.statusText}>{t('myHomeLocation.noPermission')}</Text>
              </View>
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handleOpenSettings}>
                <Text style={styles.btnSecondaryText}>{t('myHomeLocation.openSettings')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={startLocating}>
                <Text style={styles.btnPrimaryText}>{t('myHomeLocation.retry')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case GPS.SEARCHING:
      case GPS.READY:
      case GPS.SAVING: {
        const canSave = gpsPhase === GPS.READY && bestFix && bestFix.accuracy <= MAX_ACCURACY_METERS;
        const stillSearching = gpsPhase === GPS.SEARCHING;
        return (
          <View style={styles.gpsCard}>
            <View style={styles.statusRow}>
              {stillSearching || gpsPhase === GPS.SAVING ? (
                <ActivityIndicator size="small" color={COLORS.teal} />
              ) : (
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              )}
              <Text style={[styles.statusText, { flex: 1 }]}>
                {gpsPhase === GPS.SAVING
                  ? t('common.loading')
                  : canSave
                    ? t('myHomeLocation.accuracyOk', { meters: roundedAccuracy })
                    : roundedAccuracy !== null && Number.isFinite(roundedAccuracy)
                      ? t('myHomeLocation.searching', { meters: roundedAccuracy })
                      : t('myHomeLocation.searchingNoFix')}
              </Text>
            </View>
            {renderMapPreview()}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={resetGps}
                disabled={gpsPhase === GPS.SAVING}
              >
                <Text style={styles.btnSecondaryText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, !canSave && styles.btnDisabled]}
                onPress={handleSave}
                disabled={!canSave || gpsPhase === GPS.SAVING}
              >
                {gpsPhase === GPS.SAVING ? (
                  <ActivityIndicator size="small" color={COLORS.background} />
                ) : (
                  <Text style={styles.btnPrimaryText}>{t('myHomeLocation.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      case GPS.LOW_ACCURACY:
        return (
          <View style={[styles.statusCard, styles.statusCardWarning, styles.statusCardColumn]}>
            <View style={styles.statusRow}>
              <Ionicons name="radio-outline" size={20} color={COLORS.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>{t('myHomeLocation.lowAccuracyTitle')}</Text>
                <Text style={styles.statusText}>
                  {t('myHomeLocation.lowAccuracy', { meters: roundedAccuracy ?? '—' })}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={startLocating}>
              <Text style={styles.btnPrimaryText}>{t('myHomeLocation.retry')}</Text>
            </TouchableOpacity>
          </View>
        );

      case GPS.ERROR:
        return (
          <View style={[styles.statusCard, styles.statusCardWarning, styles.statusCardColumn]}>
            <View style={styles.statusRow}>
              <Ionicons name="alert-circle-outline" size={20} color={COLORS.panic} />
              <Text style={[styles.statusText, { flex: 1 }]}>
                {gpsError || t('myHomeLocation.gpsError')}
              </Text>
            </View>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={startLocating}>
              <Text style={styles.btnPrimaryText}>{t('myHomeLocation.retry')}</Text>
            </TouchableOpacity>
          </View>
        );

      case GPS.IDLE:
      default:
        return (
          <>
            {renderMapPreview()}
            <TouchableOpacity style={styles.mainAction} onPress={startLocating} activeOpacity={0.85}>
              <Ionicons name="home" size={22} color={COLORS.background} />
              <Text style={styles.mainActionText}>
                {selectedUnit.has_pin ? t('myHomeLocation.update') : t('myHomeLocation.action')}
              </Text>
            </TouchableOpacity>
          </>
        );
    }
  };

  const renderBody = () => {
    if (loadState === 'loading') {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.teal} />
          <Text style={styles.centerText}>{t('myHomeLocation.loading')}</Text>
        </View>
      );
    }
    if (loadState === 'notMember') {
      return (
        <View style={styles.center}>
          <Ionicons name="home-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.centerText}>{t('myHomeLocation.notMember')}</Text>
        </View>
      );
    }
    if (loadState === 'error') {
      return (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.centerText}>{loadError || t('myHomeLocation.loadError')}</Text>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={loadUnits}>
            <Text style={styles.btnPrimaryText}>{t('myHomeLocation.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (units.length === 0) {
      return (
        <View style={styles.center}>
          <Ionicons name="home-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.centerText}>{t('myHomeLocation.noUnits')}</Text>
        </View>
      );
    }

    return (
      <>
        {renderUnitChips()}
        {selectedUnit && (
          <View style={styles.section}>
            <Text style={styles.unitTitle}>
              {t('myHomeLocation.unitChip', { community: selectedUnit.location_name, unit: selectedUnit.unit_number })}
            </Text>
            {renderSavedState()}
            {renderGpsBlock()}
          </View>
        )}
        <View style={styles.privacyCard}>
          <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.teal} />
          <Text style={styles.privacyText}>{t('myHomeLocation.privacy')}</Text>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerBody}>
          <Text style={styles.headerTitle}>{t('myHomeLocation.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('myHomeLocation.subtitle')}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {renderBody()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    gap: scale(8),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  backBtn: { padding: scale(4) },
  headerBody: { flex: 1 },
  headerTitle: { color: COLORS.textPrimary, fontSize: scale(17), fontWeight: '600' },
  headerSubtitle: { color: COLORS.textSecondary, fontSize: scale(12), marginTop: 2 },
  content: { padding: scale(16), paddingBottom: scale(40), gap: scale(16) },

  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: scale(60), gap: scale(12) },
  centerText: { color: COLORS.textSecondary, textAlign: 'center', fontSize: scale(14), lineHeight: scale(20) },

  section: { gap: scale(10) },
  sectionLabel: { color: COLORS.textSecondary, fontSize: scale(12), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  unitTitle: { color: COLORS.textPrimary, fontSize: scale(16), fontWeight: '600' },

  chipsRow: { gap: scale(8), paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    maxWidth: SCREEN_WIDTH * 0.7,
  },
  chipActive: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  chipText: { color: COLORS.textPrimary, fontSize: scale(13) },
  chipTextActive: { color: COLORS.background, fontWeight: '600' },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(10),
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: scale(14),
    padding: scale(14),
  },
  statusCardSuccess: { backgroundColor: COLORS.successMuted, borderColor: neu.teal + '59' },
  statusCardWarning: { backgroundColor: COLORS.warningMuted, borderColor: neu.amber + '59' },
  statusCardColumn: { flexDirection: 'column', gap: scale(12) },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: scale(10) },
  statusTitle: { color: COLORS.textPrimary, fontSize: scale(14), fontWeight: '600', marginBottom: 2 },
  statusText: { color: COLORS.textSecondary, fontSize: scale(13), lineHeight: scale(19) },
  statusMeta: { color: COLORS.textMuted, fontSize: scale(12), marginTop: 2 },

  gpsCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: neu.teal + '59',
    borderRadius: scale(14),
    padding: scale(14),
    gap: scale(12),
  },

  mapWrap: { borderRadius: scale(12), overflow: 'hidden', gap: scale(6) },
  map: { width: '100%', height: scale(160), borderRadius: scale(12) },
  mapHint: { color: COLORS.textMuted, fontSize: scale(12) },
  coordsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    backgroundColor: COLORS.tealMuted,
    borderRadius: scale(12),
    padding: scale(12),
  },
  coordsText: { color: COLORS.textPrimary, fontSize: scale(13), fontWeight: '500' },
  coordsHint: { color: COLORS.textMuted, fontSize: scale(12), marginTop: 2 },

  mainAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
    backgroundColor: COLORS.teal,
    borderRadius: scale(14),
    paddingVertical: scale(16),
  },
  mainActionText: { color: COLORS.background, fontSize: scale(16), fontWeight: '700' },

  actionsRow: { flexDirection: 'row', gap: scale(8) },
  btn: {
    flex: 1,
    paddingVertical: scale(12),
    paddingHorizontal: scale(12),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(44),
  },
  btnPrimary: { backgroundColor: COLORS.teal },
  btnPrimaryText: { color: COLORS.background, fontSize: scale(14), fontWeight: '600' },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.cardBorder },
  btnSecondaryText: { color: COLORS.textSecondary, fontSize: scale(14) },
  btnDisabled: { opacity: 0.4 },

  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(10),
    backgroundColor: COLORS.card,
    borderRadius: scale(12),
    padding: scale(12),
  },
  privacyText: { flex: 1, color: COLORS.textSecondary, fontSize: scale(12), lineHeight: scale(18) },
});
