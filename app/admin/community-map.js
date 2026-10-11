// app/admin/community-map.js
// ISSY - Mapa de la Comunidad (Fase 3.2 del Botón de Emergencia).
// El admin ubica cada unidad de la comunidad en el mapa. Esa coordenada se
// snapshot-ea en panic_events cuando un residente activa el botón, para que
// el guardia sepa exactamente a dónde ir.
// Bloque 6: guard MAPS_AVAILABLE (Android sin key → lista + formulario),
// coordenadas manuales, "Usar mi ubicación actual", eliminar pin, quién/cuándo
// marcó, errores reales del backend y textos vía t().

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useAuth } from '../../src/context/AuthContext';
import { authFetch, deleteUnitLocation } from '../../src/services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// Mismo guard que app/admin/patrols.js: en Android react-native-maps SIEMPRE
// usa Google Maps y sin android.config.googleMaps.apiKey renderiza gris.
const ANDROID_MAPS_KEY =
  Constants.expoConfig?.android?.config?.googleMaps?.apiKey || null;
const MAPS_AVAILABLE = Platform.OS !== 'android' || Boolean(ANDROID_MAPS_KEY);

// Centro default: Tegucigalpa. Se ajusta al primer pin real que exista en la comunidad.
const DEFAULT_REGION = {
  latitude: 14.0723,
  longitude: -87.1921,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const EMPTY_FORM = { latitude: '', longitude: '', notes: '' };

const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  card: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.1)',
  panic: '#E24B4A',
  success: '#10B981',
  warning: '#F59E0B',
  teal: '#5DDED8',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
};

export default function CommunityMapScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user, profile, isSuperAdmin } = useAuth();

  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [units, setUnits] = useState([]);
  const [stats, setStats] = useState({ total: 0, mapped: 0, unmapped: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinForm, setPinForm] = useState(EMPTY_FORM);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [deletingUnit, setDeletingUnit] = useState(null);
  const mapRef = useRef(null);

  // Cargar comunidades donde soy admin
  useEffect(() => {
    let cancelled = false;

    const loadLocations = async () => {
      // Fix superadmin: acceso global — user_locations no alcanza (un
      // superadmin puede no tener filas con rol admin ahí). Misma detección
      // y mismo endpoint que app/admin/incidents.js (fetchLocations):
      // GET /locations devuelve { success, data: [{ id, name, ... }] }.
      const userRole = profile?.role || user?.role || 'user';
      const isSuperAdminUser = userRole === 'superadmin' || isSuperAdmin?.();

      if (isSuperAdminUser) {
        try {
          const data = await authFetch('/locations', { method: 'GET' });
          const list = Array.isArray(data) ? data : data?.data || [];
          // Mapear al shape que ya consume el resto de la pantalla
          // ({ location_id, location_name, role }) — nada más cambia.
          const mapped = (Array.isArray(list) ? list : []).map((l) => ({
            location_id: l.id,
            location_name: l.name || t('common.noName'),
            role: 'superadmin',
          }));
          if (cancelled) return;
          setLocations(mapped);
          if (mapped.length > 0 && !selectedLocationId) {
            setSelectedLocationId(mapped[0].location_id);
          } else if (mapped.length === 0) {
            setLoading(false);
          }
        } catch (error) {
          console.error('Error loading locations:', error);
          if (!cancelled) {
            setLocations([]);
            setLoading(false);
          }
        }
        return;
      }

      // Admin normal: derivación original desde user_locations (sin cambios).
      const adminLocations = (profile?.user_locations || [])
        .filter((ul) => ul.is_active && ['admin', 'superadmin'].includes(ul.role))
        .map((ul) => ({
          location_id: ul.location_id,
          location_name: ul.location_name || ul.location?.name || t('common.noName'),
          role: ul.role,
        }));

      // Deduplicar por location_id
      const uniqueLocations = Array.from(
        new Map(adminLocations.map((l) => [l.location_id, l])).values()
      );

      setLocations(uniqueLocations);
      if (uniqueLocations.length > 0 && !selectedLocationId) {
        setSelectedLocationId(uniqueLocations[0].location_id);
      } else if (uniqueLocations.length === 0) {
        setLoading(false);
      }
    };

    loadLocations();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const selectedLocation = useMemo(
    () => locations.find((l) => l.location_id === selectedLocationId),
    [locations, selectedLocationId]
  );

  // Cargar unidades de la location seleccionada
  const fetchUnits = useCallback(async () => {
    if (!selectedLocationId) return;
    setLoading(true);
    try {
      const data = await authFetch(`/unit-locations/${selectedLocationId}`, { method: 'GET' });
      const res = data.data || data;
      setUnits(res.units || []);
      setStats(res.stats || { total: 0, mapped: 0, unmapped: 0 });

      // Centrar mapa en el primer pin si existe
      const firstMapped = (res.units || []).find((u) => u.has_pin);
      if (firstMapped && mapRef.current) {
        setTimeout(() => {
          mapRef.current?.animateToRegion(
            {
              latitude: firstMapped.latitude,
              longitude: firstMapped.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            },
            600
          );
        }, 300);
      }
    } catch (error) {
      console.error('Error loading units:', error);
      Alert.alert(t('common.error'), error?.message || t('communityMap.loadError'));
    } finally {
      setLoading(false);
    }
  }, [selectedLocationId, t]);

  useEffect(() => {
    if (selectedLocationId) fetchUnits();
  }, [selectedLocationId, fetchUnits]);

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

  const setByLabel = (unit) => {
    if (unit.set_by_role === 'resident') return t('communityMap.markedByResident');
    if (unit.set_by_role === 'admin') return t('communityMap.markedByAdmin');
    return null;
  };

  // ---- Modal de pin (coordenadas manuales / GPS / tap en mapa) ----
  const openPinModal = (unitNumber, coords = null) => {
    const unit = units.find((u) => u.unit_number === unitNumber);
    setSelectedUnit(unitNumber);
    setLocationAccuracy(null);
    setPinForm({
      latitude: coords
        ? coords.latitude.toFixed(6)
        : unit?.has_pin && Number.isFinite(unit.latitude) ? String(unit.latitude) : '',
      longitude: coords
        ? coords.longitude.toFixed(6)
        : unit?.has_pin && Number.isFinite(unit.longitude) ? String(unit.longitude) : '',
      notes: unit?.notes || '',
    });
    setShowPinModal(true);
  };

  const closePinModal = () => {
    if (saving) return;
    setShowPinModal(false);
  };

  const handleMapPress = (event) => {
    if (!selectedUnit) {
      Alert.alert(t('communityMap.selectUnitTitle'), t('communityMap.selectUnitMsg'));
      return;
    }
    const { latitude, longitude } = event.nativeEvent.coordinate;
    openPinModal(selectedUnit, { latitude, longitude });
  };

  const handleMarkerDragEnd = (unit, event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    Alert.alert(
      t('communityMap.movePinTitle'),
      t('communityMap.movePinMsg', { unit: unit.unit_number }),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: () => fetchUnits() },
        {
          text: t('communityMap.yesSave'),
          onPress: async () => savePin(unit.unit_number, latitude, longitude, unit.notes),
        },
      ]
    );
  };

  const savePin = async (unitNumber, latitude, longitude, notes) => {
    setSaving(true);
    try {
      await authFetch('/unit-locations', {
        method: 'PUT',
        body: JSON.stringify({
          location_id: selectedLocationId,
          unit_number: unitNumber,
          latitude,
          longitude,
          notes: notes || null,
        }),
      });
      await fetchUnits();
      setSelectedUnit(null);
      setShowPinModal(false);
      setPinForm(EMPTY_FORM);
      setLocationAccuracy(null);
    } catch (error) {
      console.error('Error saving pin:', error);
      // Mensaje real del backend (authFetch ya lo extrae de data.message/error)
      Alert.alert(t('common.error'), error?.message || t('communityMap.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!selectedUnit) return;
    if (!pinForm.latitude || !pinForm.longitude) {
      Alert.alert(t('common.error'), t('communityMap.coordsRequired'));
      return;
    }
    const lat = parseFloat(String(pinForm.latitude).replace(',', '.'));
    const lng = parseFloat(String(pinForm.longitude).replace(',', '.'));
    if (
      !Number.isFinite(lat) || !Number.isFinite(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180
    ) {
      Alert.alert(t('common.error'), t('communityMap.invalidCoords'));
      return;
    }
    await savePin(selectedUnit, lat, lng, pinForm.notes.trim());
  };

  const handleUseMyLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('communityMap.permissionDenied'));
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setPinForm((prev) => ({
        ...prev,
        latitude: location.coords.latitude.toFixed(6),
        longitude: location.coords.longitude.toFixed(6),
      }));
      setLocationAccuracy(
        Number.isFinite(location.coords.accuracy) ? Math.round(location.coords.accuracy) : null
      );
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert(t('common.error'), error?.message || t('communityMap.locationError'));
    } finally {
      setGettingLocation(false);
    }
  };

  const handleDeletePin = (unit) => {
    Alert.alert(
      t('communityMap.deletePin'),
      t('communityMap.deleteMsg', { unit: unit.unit_number }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeletingUnit(unit.unit_number);
            const result = await deleteUnitLocation(selectedLocationId, unit.unit_number);
            setDeletingUnit(null);
            if (result.success) {
              if (selectedUnit === unit.unit_number) setSelectedUnit(null);
              await fetchUnits();
              Alert.alert(t('communityMap.deletePin'), t('communityMap.deleted'));
            } else {
              Alert.alert(t('common.error'), result.error || t('communityMap.deleteError'));
            }
          },
        },
      ]
    );
  };

  const handleUnmappedPress = (u) => {
    if (MAPS_AVAILABLE) {
      setSelectedUnit(u.unit_number);
    } else {
      openPinModal(u.unit_number);
    }
  };

  const handleMappedPress = (u) => {
    if (MAPS_AVAILABLE) {
      mapRef.current?.animateToRegion(
        {
          latitude: u.latitude,
          longitude: u.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        500
      );
    } else {
      openPinModal(u.unit_number);
    }
  };

  const mappedUnits = units.filter((u) => u.has_pin);
  const unmappedUnits = units.filter((u) => !u.has_pin);

  // ---- Render: lista de unidades (sidebar con mapa; cuerpo completo sin mapa) ----
  const renderUnitsList = () => (
    <>
      <View style={styles.statsBar}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>{t('communityMap.total')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.mapped}</Text>
          <Text style={styles.statLabel}>{t('communityMap.withPin')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.warning }]}>{stats.unmapped}</Text>
          <Text style={styles.statLabel}>{t('communityMap.withoutPin')}</Text>
        </View>
      </View>

      <ScrollView style={styles.unitsList} contentContainerStyle={{ paddingBottom: scale(20) }}>
        {!MAPS_AVAILABLE && (
          <View style={styles.noMapCard}>
            <Ionicons name="map-outline" size={18} color={COLORS.teal} />
            <Text style={styles.noMapText}>{t('communityMap.noMapAndroid')}</Text>
          </View>
        )}
        {loading && !MAPS_AVAILABLE && (
          <ActivityIndicator size="small" color={COLORS.panic} style={{ marginVertical: scale(10) }} />
        )}
        {unmappedUnits.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              {t('communityMap.unmapped', { count: unmappedUnits.length })}
            </Text>
            {unmappedUnits.map((u) => (
              <TouchableOpacity
                key={u.unit_number}
                style={[
                  styles.unitRow,
                  styles.unitRowUnmapped,
                  selectedUnit === u.unit_number && styles.unitRowSelected,
                ]}
                onPress={() => handleUnmappedPress(u)}
              >
                <Ionicons
                  name="pin-outline"
                  size={16}
                  color={selectedUnit === u.unit_number ? COLORS.panic : COLORS.warning}
                />
                <Text
                  style={[
                    styles.unitRowText,
                    selectedUnit === u.unit_number && styles.unitRowTextSelected,
                  ]}
                >
                  {u.unit_number}
                </Text>
                {!MAPS_AVAILABLE && (
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                )}
              </TouchableOpacity>
            ))}
          </>
        )}
        {mappedUnits.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: scale(16) }]}>
              {t('communityMap.mapped', { count: mappedUnits.length })}
            </Text>
            {mappedUnits.map((u) => {
              const by = setByLabel(u);
              const when = formatDate(u.set_at);
              return (
                <View key={u.unit_number} style={[styles.unitRow, styles.unitRowMapped]}>
                  <TouchableOpacity style={styles.unitRowMain} onPress={() => handleMappedPress(u)}>
                    <Ionicons name="pin" size={16} color={COLORS.success} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.unitRowText}>{u.unit_number}</Text>
                      {(by || when) && (
                        <Text style={styles.unitRowMeta} numberOfLines={2}>
                          {[by, when ? t('communityMap.markedAt', { date: when }) : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.unitRowAction}
                    onPress={() => openPinModal(u.unit_number)}
                    accessibilityLabel={t('communityMap.edit')}
                  >
                    <Ionicons name="create-outline" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.unitRowAction}
                    onPress={() => handleDeletePin(u)}
                    disabled={deletingUnit === u.unit_number}
                    accessibilityLabel={t('communityMap.deletePin')}
                  >
                    {deletingUnit === u.unit_number ? (
                      <ActivityIndicator size="small" color={COLORS.panic} />
                    ) : (
                      <Ionicons name="trash-outline" size={16} color={COLORS.panic} />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </>
  );

  const renderMap = () => (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={DEFAULT_REGION}
        onPress={handleMapPress}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {mappedUnits.map((unit) => (
          <Marker
            key={unit.unit_number}
            coordinate={{ latitude: unit.latitude, longitude: unit.longitude }}
            title={unit.unit_number}
            description={[setByLabel(unit), unit.notes || t('communityMap.noNotes')]
              .filter(Boolean)
              .join(' · ')}
            draggable
            onDragEnd={(e) => handleMarkerDragEnd(unit, e)}
            pinColor="green"
          />
        ))}
      </MapView>
      {loading && (
        <View style={styles.mapLoading}>
          <ActivityIndicator size="large" color={COLORS.panic} />
        </View>
      )}
    </View>
  );

  const selectedUnitData = units.find((u) => u.unit_number === selectedUnit);
  const selectedUnitWhen = selectedUnitData ? formatDate(selectedUnitData.set_at) : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerBody}>
          <Text style={styles.headerTitle}>{t('communityMap.title')}</Text>
          {selectedLocation ? (
            <TouchableOpacity
              style={styles.locationSwitcher}
              onPress={() => locations.length > 1 && setShowLocationPicker(true)}
            >
              <Text style={styles.locationSwitcherText} numberOfLines={1}>
                {selectedLocation.location_name}
              </Text>
              {locations.length > 1 && (
                <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
              )}
            </TouchableOpacity>
          ) : (
            <Text style={styles.headerSubtitle}>{t('communityMap.noCommunity')}</Text>
          )}
        </View>
        {MAPS_AVAILABLE && (
          <TouchableOpacity onPress={() => setShowSidebar(!showSidebar)} style={styles.toggleSidebarBtn}>
            <Ionicons
              name={showSidebar ? 'list' : 'list-outline'}
              size={22}
              color={showSidebar ? COLORS.panic : COLORS.textPrimary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Barra de estado del "modo ubicar" (solo con mapa) */}
      {MAPS_AVAILABLE && selectedUnit && !showPinModal && (
        <View style={styles.selectedBar}>
          <Ionicons name="pin" size={16} color="#FFFFFF" />
          <View style={{ flex: 1 }}>
            <Text style={styles.selectedBarText}>
              {t('communityMap.locating', { unit: selectedUnit })}
            </Text>
            <Text style={styles.selectedBarHint}>{t('communityMap.tapMapHint')}</Text>
          </View>
          <TouchableOpacity
            style={styles.selectedBarBtn}
            onPress={() => openPinModal(selectedUnit)}
            accessibilityLabel={t('communityMap.enterCoords')}
          >
            <Ionicons name="create-outline" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedUnit(null)}>
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {locations.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>{t('communityMap.notAdmin')}</Text>
        </View>
      ) : MAPS_AVAILABLE ? (
        <View style={styles.body}>
          {renderMap()}
          {showSidebar && <View style={styles.sidebar}>{renderUnitsList()}</View>}
        </View>
      ) : (
        <View style={styles.bodyNoMap}>{renderUnitsList()}</View>
      )}

      {/* Modal: ubicar unidad (coordenadas manuales / GPS / tap en mapa) */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={closePinModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {t('communityMap.pinModalTitle', { unit: selectedUnit || '' })}
            </Text>
            {selectedUnitData?.has_pin && (
              <Text style={styles.modalSubtitle}>
                {[
                  setByLabel(selectedUnitData),
                  selectedUnitWhen ? t('communityMap.markedAt', { date: selectedUnitWhen }) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            )}

            <View style={styles.coordsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{t('communityMap.latitude')}</Text>
                <TextInput
                  style={styles.input}
                  value={pinForm.latitude}
                  onChangeText={(text) => setPinForm((prev) => ({ ...prev, latitude: text }))}
                  placeholder="14.072300"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numbers-and-punctuation"
                  editable={!saving}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{t('communityMap.longitude')}</Text>
                <TextInput
                  style={styles.input}
                  value={pinForm.longitude}
                  onChangeText={(text) => setPinForm((prev) => ({ ...prev, longitude: text }))}
                  placeholder="-87.192100"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numbers-and-punctuation"
                  editable={!saving}
                />
              </View>
            </View>
            <Text style={styles.inputHint}>{t('communityMap.coordsHint')}</Text>

            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={handleUseMyLocation}
              disabled={gettingLocation || saving}
            >
              {gettingLocation ? (
                <ActivityIndicator size="small" color={COLORS.teal} />
              ) : (
                <Ionicons name="navigate-outline" size={16} color={COLORS.teal} />
              )}
              <Text style={styles.gpsBtnText}>
                {gettingLocation ? t('communityMap.gettingLocation') : t('communityMap.useMyLocation')}
              </Text>
            </TouchableOpacity>
            {locationAccuracy !== null && (
              <Text style={styles.accuracyText}>
                {t('communityMap.accuracy', { meters: locationAccuracy })}
              </Text>
            )}

            <TextInput
              style={styles.modalInput}
              placeholder={t('communityMap.notePlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={pinForm.notes}
              onChangeText={(text) => setPinForm((prev) => ({ ...prev, notes: text }))}
              maxLength={200}
              multiline
              editable={!saving}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={closePinModal}
                disabled={saving}
              >
                <Text style={styles.modalBtnCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleConfirmSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>{t('communityMap.savePin')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: selector de comunidad (si hay varias) */}
      <Modal
        visible={showLocationPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerCard}>
            <Text style={styles.modalTitle}>{t('communityMap.selectCommunity')}</Text>
            <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.5 }}>
              {locations.map((loc) => (
                <TouchableOpacity
                  key={loc.location_id}
                  style={[
                    styles.pickerRow,
                    selectedLocationId === loc.location_id && styles.pickerRowActive,
                  ]}
                  onPress={() => {
                    setSelectedLocationId(loc.location_id);
                    setSelectedUnit(null);
                    setShowLocationPicker(false);
                  }}
                >
                  <Text style={styles.pickerRowText}>{loc.location_name}</Text>
                  {selectedLocationId === loc.location_id && (
                    <Ionicons name="checkmark" size={20} color={COLORS.teal} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnCancel, { marginTop: scale(12) }]}
              onPress={() => setShowLocationPicker(false)}
            >
              <Text style={styles.modalBtnCancelText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  locationSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: 2,
  },
  locationSwitcherText: {
    color: COLORS.textSecondary,
    fontSize: scale(12),
    maxWidth: SCREEN_WIDTH - scale(140),
  },
  toggleSidebarBtn: { padding: scale(6) },

  selectedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: COLORS.panic,
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
  },
  selectedBarText: { color: '#FFFFFF', fontSize: scale(13), fontWeight: '500' },
  selectedBarHint: { color: 'rgba(255,255,255,0.8)', fontSize: scale(11), marginTop: 1 },
  selectedBarBtn: {
    padding: scale(6),
    borderRadius: scale(8),
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  body: { flex: 1, flexDirection: 'row' },
  bodyNoMap: { flex: 1 },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sidebar: {
    width: SCREEN_WIDTH * 0.48,
    backgroundColor: COLORS.background,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.cardBorder,
  },
  statsBar: {
    flexDirection: 'row',
    gap: scale(6),
    padding: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: scale(8),
    padding: scale(8),
    alignItems: 'center',
  },
  statValue: { color: COLORS.textPrimary, fontSize: scale(16), fontWeight: '700' },
  statLabel: { color: COLORS.textMuted, fontSize: scale(10), marginTop: 2 },

  noMapCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(8),
    backgroundColor: 'rgba(93, 222, 216, 0.08)',
    borderRadius: scale(10),
    padding: scale(10),
    marginBottom: scale(12),
  },
  noMapText: { flex: 1, color: COLORS.textSecondary, fontSize: scale(12), lineHeight: scale(17) },

  unitsList: { flex: 1, padding: scale(10) },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: scale(11),
    fontWeight: '600',
    marginBottom: scale(6),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    padding: scale(10),
    borderRadius: scale(8),
    marginBottom: scale(4),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  unitRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: scale(8), minWidth: 0 },
  unitRowAction: { padding: scale(4) },
  unitRowUnmapped: { backgroundColor: 'rgba(245, 158, 11, 0.08)' },
  unitRowMapped: { backgroundColor: 'rgba(16, 185, 129, 0.08)' },
  unitRowSelected: {
    borderColor: COLORS.panic,
    backgroundColor: 'rgba(226, 75, 74, 0.15)',
  },
  unitRowText: { color: COLORS.textPrimary, fontSize: scale(13), fontWeight: '500', flex: 1 },
  unitRowTextSelected: { color: COLORS.panic },
  unitRowMeta: { color: COLORS.textMuted, fontSize: scale(10), marginTop: 2 },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(20),
    gap: scale(10),
  },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', fontSize: scale(14) },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(20),
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: scale(16),
    padding: scale(20),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  pickerCard: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: scale(16),
    padding: scale(16),
  },
  modalTitle: { color: COLORS.textPrimary, fontSize: scale(16), fontWeight: '600', marginBottom: scale(4) },
  modalSubtitle: { color: COLORS.textMuted, fontSize: scale(11), marginBottom: scale(10) },
  coordsRow: { flexDirection: 'row', gap: scale(8), marginTop: scale(8) },
  inputLabel: { color: COLORS.textSecondary, fontSize: scale(11), marginBottom: scale(4) },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    color: COLORS.textPrimary,
    fontSize: scale(13),
  },
  inputHint: { color: COLORS.textMuted, fontSize: scale(10), marginTop: scale(6), marginBottom: scale(10) },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    borderWidth: 1,
    borderColor: 'rgba(93, 222, 216, 0.4)',
    borderRadius: scale(10),
    paddingVertical: scale(10),
    marginBottom: scale(6),
  },
  gpsBtnText: { color: COLORS.teal, fontSize: scale(13), fontWeight: '500' },
  accuracyText: { color: COLORS.textSecondary, fontSize: scale(11), textAlign: 'center', marginBottom: scale(6) },
  modalInput: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: scale(10),
    padding: scale(12),
    color: COLORS.textPrimary,
    fontSize: scale(13),
    minHeight: scale(60),
    textAlignVertical: 'top',
    marginTop: scale(8),
    marginBottom: scale(14),
  },
  modalActions: { flexDirection: 'row', gap: scale(8) },
  modalBtn: {
    flex: 1,
    padding: scale(12),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(44),
  },
  modalBtnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalBtnCancelText: { color: COLORS.textSecondary, fontSize: scale(14) },
  modalBtnConfirm: { backgroundColor: COLORS.panic },
  modalBtnConfirmText: { color: '#FFFFFF', fontSize: scale(14), fontWeight: '600' },

  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(14),
    borderRadius: scale(10),
    marginBottom: scale(4),
  },
  pickerRowActive: { backgroundColor: 'rgba(93, 222, 216, 0.1)' },
  pickerRowText: { color: COLORS.textPrimary, fontSize: scale(14), flex: 1 },
});
