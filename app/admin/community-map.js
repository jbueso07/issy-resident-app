// app/admin/community-map.js
// ISSY - Mapa de la Comunidad (Fase 3.2 del Botón de Emergencia).
// El admin ubica cada unidad de la comunidad en el mapa. Esa coordenada se
// snapshot-ea en panic_events cuando un residente activa el botón, para que
// el guardia sepa exactamente a dónde ir.

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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useAuth } from '../../src/context/AuthContext';
import { authFetch } from '../../src/services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// Centro default: Tegucigalpa. Se ajusta al primer pin real que exista en la comunidad.
const DEFAULT_REGION = {
  latitude: 14.0723,
  longitude: -87.1921,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

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
  const [notesInput, setNotesInput] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [pendingCoords, setPendingCoords] = useState(null);
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
            location_name: l.name || 'Sin nombre',
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
          location_name: ul.location_name || ul.location?.name || 'Sin nombre',
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
      Alert.alert('Error', 'No se pudieron cargar las unidades');
    } finally {
      setLoading(false);
    }
  }, [selectedLocationId]);

  useEffect(() => {
    if (selectedLocationId) fetchUnits();
  }, [selectedLocationId, fetchUnits]);

  const handleMapPress = (event) => {
    if (!selectedUnit) {
      Alert.alert(
        'Selecciona una unidad',
        'Primero elegí una unidad de la lista lateral para poder ubicarla en el mapa.'
      );
      return;
    }
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setPendingCoords({ latitude, longitude });
    setNotesInput(units.find((u) => u.unit_number === selectedUnit)?.notes || '');
    setShowNotesModal(true);
  };

  const handleMarkerDragEnd = (unit, event) => {
    if (!['admin', 'superadmin'].includes(profile?.role) && !isAdminOfLocation(unit)) return;
    const { latitude, longitude } = event.nativeEvent.coordinate;
    Alert.alert(
      'Mover pin',
      `¿Actualizar la ubicación de ${unit.unit_number}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, guardar',
          onPress: async () => savePin(unit.unit_number, latitude, longitude, unit.notes),
        },
      ]
    );
  };

  const isAdminOfLocation = () => {
    // Ya filtramos en useEffect: solo mostramos locations donde soy admin.
    return true;
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
      setPendingCoords(null);
      setShowNotesModal(false);
    } catch (error) {
      console.error('Error saving pin:', error);
      Alert.alert('Error', 'No se pudo guardar la ubicación');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!pendingCoords || !selectedUnit) return;
    await savePin(selectedUnit, pendingCoords.latitude, pendingCoords.longitude, notesInput.trim());
  };

  const mappedUnits = units.filter((u) => u.has_pin);
  const unmappedUnits = units.filter((u) => !u.has_pin);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerBody}>
          <Text style={styles.headerTitle}>Mapa de la Comunidad</Text>
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
            <Text style={styles.headerSubtitle}>Sin comunidad seleccionada</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => setShowSidebar(!showSidebar)} style={styles.toggleSidebarBtn}>
          <Ionicons
            name={showSidebar ? 'list' : 'list-outline'}
            size={22}
            color={showSidebar ? COLORS.panic : COLORS.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Barra de estado del "modo ubicar" */}
      {selectedUnit && (
        <View style={styles.selectedBar}>
          <Ionicons name="pin" size={16} color="#FFFFFF" />
          <Text style={styles.selectedBarText}>
            Ubicando: {selectedUnit} — tap en el mapa
          </Text>
          <TouchableOpacity onPress={() => setSelectedUnit(null)}>
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {locations.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>
            No sos admin de ninguna comunidad todavía.
          </Text>
        </View>
      ) : (
        <View style={styles.body}>
          {/* Mapa */}
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
                  description={unit.notes || 'Sin notas'}
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

          {/* Sidebar */}
          {showSidebar && (
            <View style={styles.sidebar}>
              <View style={styles.statsBar}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.total}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.mapped}</Text>
                  <Text style={styles.statLabel}>Con pin</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: COLORS.warning }]}>{stats.unmapped}</Text>
                  <Text style={styles.statLabel}>Sin pin</Text>
                </View>
              </View>

              <ScrollView style={styles.unitsList} contentContainerStyle={{ paddingBottom: scale(20) }}>
                {unmappedUnits.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Sin ubicar ({unmappedUnits.length})</Text>
                    {unmappedUnits.map((u) => (
                      <TouchableOpacity
                        key={u.unit_number}
                        style={[
                          styles.unitRow,
                          styles.unitRowUnmapped,
                          selectedUnit === u.unit_number && styles.unitRowSelected,
                        ]}
                        onPress={() => setSelectedUnit(u.unit_number)}
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
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                {mappedUnits.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: scale(16) }]}>
                      Ya ubicadas ({mappedUnits.length})
                    </Text>
                    {mappedUnits.map((u) => (
                      <TouchableOpacity
                        key={u.unit_number}
                        style={[styles.unitRow, styles.unitRowMapped]}
                        onPress={() =>
                          mapRef.current?.animateToRegion(
                            {
                              latitude: u.latitude,
                              longitude: u.longitude,
                              latitudeDelta: 0.005,
                              longitudeDelta: 0.005,
                            },
                            500
                          )
                        }
                      >
                        <Ionicons name="pin" size={16} color={COLORS.success} />
                        <Text style={styles.unitRowText}>{u.unit_number}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* Modal: notas antes de guardar */}
      <Modal
        visible={showNotesModal}
        transparent
        animationType="fade"
        onRequestClose={() => !saving && setShowNotesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ubicar {selectedUnit}</Text>
            <Text style={styles.modalSubtitle}>
              Coordenadas: {pendingCoords?.latitude.toFixed(6)}, {pendingCoords?.longitude.toFixed(6)}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nota (opcional): puerta principal, portón trasero…"
              placeholderTextColor={COLORS.textMuted}
              value={notesInput}
              onChangeText={setNotesInput}
              maxLength={200}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowNotesModal(false)}
                disabled={saving}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleConfirmSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>Guardar pin</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
            <Text style={styles.modalTitle}>Seleccionar comunidad</Text>
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
              <Text style={styles.modalBtnCancelText}>Cerrar</Text>
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
  selectedBarText: { color: '#FFFFFF', flex: 1, fontSize: scale(13), fontWeight: '500' },

  body: { flex: 1, flexDirection: 'row' },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sidebar: {
    width: SCREEN_WIDTH * 0.42,
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
  unitRowUnmapped: { backgroundColor: 'rgba(245, 158, 11, 0.08)' },
  unitRowMapped: { backgroundColor: 'rgba(16, 185, 129, 0.08)' },
  unitRowSelected: {
    borderColor: COLORS.panic,
    backgroundColor: 'rgba(226, 75, 74, 0.15)',
  },
  unitRowText: { color: COLORS.textPrimary, fontSize: scale(13), fontWeight: '500', flex: 1 },
  unitRowTextSelected: { color: COLORS.panic },

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
  modalSubtitle: { color: COLORS.textMuted, fontSize: scale(11), marginBottom: scale(14) },
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
