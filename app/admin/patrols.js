// app/admin/patrols.js
// ISSY Admin - Gestión de Rondines (Patrol Management) - Enhanced UI

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import MapView, { Marker, Circle, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const API_URL = 'https://api.joinissy.com/api';

const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  lime: '#D4FE48',
  teal: '#5DDED8',
  purple: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  blue: '#3B82F6',
  orange: '#F97316',
  pink: '#EC4899',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  border: 'rgba(255,255,255,0.1)',
};

// Checkpoint marker colors cycle
const CHECKPOINT_COLORS = [
  '#D4FE48', '#5DDED8', '#8B5CF6', '#F59E0B', '#3B82F6',
  '#EC4899', '#F97316', '#10B981', '#EF4444', '#06B6D4',
];

const VERIFICATION_METHODS = [
  { id: 'gps', label: 'GPS', icon: 'navigate', color: COLORS.blue, description: 'Verificación por proximidad GPS' },
  { id: 'qr', label: 'QR', icon: 'qr-code', color: COLORS.purple, description: 'Escaneo de código QR en punto' },
  { id: 'nfc', label: 'NFC', icon: 'radio', color: COLORS.teal, description: 'Lectura de etiqueta NFC' },
  { id: 'qr_nfc', label: 'QR + NFC', icon: 'layers', color: COLORS.warning, description: 'QR o NFC aceptados' },
];

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Lun', fullLabel: 'Lunes' },
  { id: 'tuesday', label: 'Mar', fullLabel: 'Martes' },
  { id: 'wednesday', label: 'Mié', fullLabel: 'Miércoles' },
  { id: 'thursday', label: 'Jue', fullLabel: 'Jueves' },
  { id: 'friday', label: 'Vie', fullLabel: 'Viernes' },
  { id: 'saturday', label: 'Sáb', fullLabel: 'Sábado' },
  { id: 'sunday', label: 'Dom', fullLabel: 'Domingo' },
];

const DEFAULT_ROUTE_FORM = {
  name: '',
  description: '',
  estimated_duration: '30',
  verification_method: 'gps',
  require_photo_at_checkpoint: false,
  require_photo_at_start: false,
  require_photo_at_end: false,
  allow_skip_checkpoint: false,
  max_skips_allowed: '0',
  geofence_radius: '50',
  is_active: true,
};

const DEFAULT_CHECKPOINT_FORM = {
  name: '',
  description: '',
  instructions: '',
  latitude: '',
  longitude: '',
  geofence_radius: '30',
  require_photo: false,
  require_notes: false,
  is_mandatory: true,
};

const DEFAULT_SCHEDULE_FORM = {
  time: '',
  days: [],
  tolerance_before: '15',
  tolerance_after: '15',
};

// Custom numbered marker component
const NumberedMarker = ({ number, color, size = 36, isActive = false }) => (
  <View style={[
    markerStyles.container,
    {
      width: size,
      height: size + 10,
    },
    isActive && { transform: [{ scale: 1.2 }] }
  ]}>
    <View style={[
      markerStyles.pin,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        borderWidth: isActive ? 3 : 2,
        borderColor: isActive ? '#FFFFFF' : 'rgba(0,0,0,0.3)',
      }
    ]}>
      <Text style={[
        markerStyles.number,
        { fontSize: size * 0.4, color: '#000000' }
      ]}>
        {number}
      </Text>
    </View>
    <View style={[markerStyles.triangle, { borderTopColor: color }]} />
  </View>
);

const markerStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  pin: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  number: { fontWeight: '800' },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
});

export default function AdminPatrols() {
  const { t } = useTranslation();
  const { user, profile, isSuperAdmin } = useAuth();
  const router = useRouter();

  // State
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // Route form
  const [routeForm, setRouteForm] = useState(DEFAULT_ROUTE_FORM);

  // Checkpoints
  const [checkpoints, setCheckpoints] = useState([]);
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState(null);
  const [checkpointForm, setCheckpointForm] = useState(DEFAULT_CHECKPOINT_FORM);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [selectedCheckpointIndex, setSelectedCheckpointIndex] = useState(null);

  // Schedules
  const [schedules, setSchedules] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(DEFAULT_SCHEDULE_FORM);

  // Stats
  const [stats, setStats] = useState({
    totalRoutes: 0,
    activeRoutes: 0,
    totalCheckpoints: 0,
    completedPatrols: 0,
  });

  // Location picker (for superadmin)
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Picker states
  const [showVerificationPicker, setShowVerificationPicker] = useState(false);

  const userRole = profile?.role || user?.role || 'user';
  const userLocationId = profile?.location_id || user?.location_id;
  const isAdmin = ['admin', 'superadmin'].includes(userRole);
  const isSuperAdminUser = userRole === 'superadmin' || isSuperAdmin?.();

  // Calculate map region from checkpoints
  const mapRegion = useMemo(() => {
    const validCheckpoints = checkpoints.filter(
      cp => cp.latitude && cp.longitude && !isNaN(parseFloat(cp.latitude)) && !isNaN(parseFloat(cp.longitude))
    );

    if (validCheckpoints.length === 0) {
      return {
        latitude: 15.5,
        longitude: -88.0,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    const lats = validCheckpoints.map(cp => parseFloat(cp.latitude));
    const lngs = validCheckpoints.map(cp => parseFloat(cp.longitude));

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const deltaLat = Math.max((maxLat - minLat) * 1.5, 0.003);
    const deltaLng = Math.max((maxLng - minLng) * 1.5, 0.003);

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: deltaLat,
      longitudeDelta: deltaLng,
    };
  }, [checkpoints]);

  // Polyline coordinates for route line
  const routeLineCoords = useMemo(() => {
    return checkpoints
      .filter(cp => cp.latitude && cp.longitude && !isNaN(parseFloat(cp.latitude)))
      .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))
      .map(cp => ({
        latitude: parseFloat(cp.latitude),
        longitude: parseFloat(cp.longitude),
      }));
  }, [checkpoints]);

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Acceso Denegado', 'No tienes permisos para acceder a esta sección');
      router.back();
      return;
    }

    if (isSuperAdminUser) {
      fetchLocations();
    } else {
      setSelectedLocationId(userLocationId);
    }
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      fetchRoutes();
    }
  }, [selectedLocationId]);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchLocations = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/locations`, { headers });
      const data = await res.json();

      if (data.success || Array.isArray(data)) {
        const list = data.data || data;
        setLocations(list);
        if (list.length > 0 && !selectedLocationId) {
          setSelectedLocationId(list[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      if (userLocationId) {
        setSelectedLocationId(userLocationId);
      }
    }
  };

  const fetchRoutes = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${API_URL}/patrols/routes?location_id=${selectedLocationId}`,
        { headers }
      );
      const data = await res.json();

      if (data.success) {
        const routesList = Array.isArray(data.data) ? data.data : (data.data?.routes || []);
        setRoutes(routesList);

        const activeCount = routesList.filter(r => r.is_active).length;
        const checkpointsCount = routesList.reduce((acc, r) => acc + (r.checkpoints_count || r.checkpoints?.length || 0), 0);

        setStats({
          totalRoutes: routesList.length,
          activeRoutes: activeCount,
          totalCheckpoints: checkpointsCount,
          completedPatrols: data.completed_patrols_count || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRoutes();
  }, [selectedLocationId]);

  // ─── Route CRUD ──────────────────────────────────────────

  const handleOpenCreateRouteModal = () => {
    setEditingRoute(null);
    setRouteForm(DEFAULT_ROUTE_FORM);
    setCheckpoints([]);
    setSchedules([]);
    setActiveTab('info');
    setShowRouteModal(true);
  };

  const handleOpenEditRouteModal = (route) => {
    setEditingRoute(route);
    setRouteForm({
      name: route.name || '',
      description: route.description || '',
      estimated_duration: String(route.estimated_duration_minutes || route.estimated_duration || 30),
      verification_method: route.verification_method || 'gps',
      require_photo_at_checkpoint: route.require_photo_at_checkpoint || false,
      require_photo_at_start: route.require_photo_at_start || false,
      require_photo_at_end: route.require_photo_at_end || false,
      allow_skip_checkpoint: route.allow_skip_checkpoint || false,
      max_skips_allowed: String(route.max_skip_allowed || route.max_skips_allowed || 0),
      geofence_radius: String(route.geofence_radius_meters || route.geofence_radius || 50),
      is_active: route.is_active !== false,
    });
    setCheckpoints(route.checkpoints || []);
    setSchedules(route.schedules || []);
    setActiveTab('info');
    setShowRouteModal(true);
  };

  const handleCloseRouteModal = () => {
    setShowRouteModal(false);
    setEditingRoute(null);
    setRouteForm(DEFAULT_ROUTE_FORM);
    setCheckpoints([]);
    setSchedules([]);
  };

  const handleSaveRoute = async () => {
    if (!routeForm.name.trim()) {
      Alert.alert('Error', 'El nombre de la ruta es requerido');
      return;
    }

    if (!selectedLocationId) {
      Alert.alert('Error', 'Debes seleccionar una ubicación primero');
      return;
    }

    setFormLoading(true);
    try {
      const headers = await getAuthHeaders();
      const payload = {
        name: routeForm.name.trim(),
        description: routeForm.description.trim() || null,
        estimated_duration_minutes: parseInt(routeForm.estimated_duration) || 30,
        verification_method: routeForm.verification_method,
        require_photo_at_checkpoint: routeForm.require_photo_at_checkpoint,
        require_photo_at_start: routeForm.require_photo_at_start,
        require_photo_at_end: routeForm.require_photo_at_end,
        allow_skip_checkpoint: routeForm.allow_skip_checkpoint,
        max_skip_allowed: parseInt(routeForm.max_skips_allowed) || 0,
        geofence_radius_meters: parseInt(routeForm.geofence_radius) || 50,
        is_active: routeForm.is_active,
        location_id: selectedLocationId,
      };

      let response;
      if (editingRoute) {
        response = await fetch(`${API_URL}/patrols/routes/${editingRoute.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(`${API_URL}/patrols/routes`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (response.ok && data.success) {
        if (!editingRoute && data.data) {
          const newRoute = data.data.route || data.data;
          setEditingRoute(newRoute);
          setCheckpoints(newRoute.checkpoints || []);
        }

        fetchRoutes();
        Alert.alert(
          'Éxito',
          editingRoute
            ? 'Ruta actualizada correctamente'
            : 'Ruta creada. Ahora ve a la pestaña "Puntos" para agregar puntos de control.'
        );

        // Auto-switch to checkpoints tab after creating
        if (!editingRoute) {
          setTimeout(() => setActiveTab('checkpoints'), 500);
        }
      } else {
        const errorMsg = data.message || data.error || JSON.stringify(data);
        Alert.alert('Error', `No se pudo guardar la ruta:\n\n${errorMsg}`);
      }
    } catch (error) {
      Alert.alert('Error', `Error de conexión:\n\n${error.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleRouteActive = async (route) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/patrols/routes/${route.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_active: !route.is_active }),
      });
      if (response.ok) fetchRoutes();
    } catch (error) {
      console.error('Error toggling route:', error);
    }
  };

  const handleDeleteRoute = async (route) => {
    Alert.alert(
      'Eliminar Ruta',
      `¿Estás seguro de eliminar "${route.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(`${API_URL}/patrols/routes/${route.id}`, {
                method: 'DELETE',
                headers,
              });
              if (response.ok) {
                fetchRoutes();
                Alert.alert('Éxito', 'Ruta eliminada correctamente');
              } else {
                const data = await response.json();
                Alert.alert('Error', data.error || 'No se pudo eliminar la ruta');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la ruta');
            }
          },
        },
      ]
    );
  };

  // ─── Checkpoint CRUD ─────────────────────────────────────

  const handleOpenCreateCheckpointModal = () => {
    setEditingCheckpoint(null);
    const newForm = { ...DEFAULT_CHECKPOINT_FORM };

    // Auto-name with sequence number
    const nextNum = checkpoints.length + 1;
    newForm.name = `Punto ${nextNum}`;

    // If we have existing checkpoints, center near last one
    if (checkpoints.length > 0) {
      const last = checkpoints[checkpoints.length - 1];
      if (last.latitude && last.longitude) {
        // Offset slightly so markers don't overlap
        newForm.latitude = (parseFloat(last.latitude) + 0.0002).toFixed(6);
        newForm.longitude = (parseFloat(last.longitude) + 0.0002).toFixed(6);
      }
    }

    setCheckpointForm(newForm);
    setShowRouteModal(false);
    setTimeout(() => setShowCheckpointModal(true), 300);
  };

  const handleOpenEditCheckpointModal = (checkpoint) => {
    setEditingCheckpoint(checkpoint);
    setCheckpointForm({
      name: checkpoint.name || '',
      description: checkpoint.description || '',
      instructions: checkpoint.instructions || '',
      latitude: String(checkpoint.latitude || ''),
      longitude: String(checkpoint.longitude || ''),
      geofence_radius: String(checkpoint.geofence_radius_meters || checkpoint.geofence_radius || 30),
      require_photo: checkpoint.require_photo || false,
      require_notes: checkpoint.require_notes || false,
      is_mandatory: checkpoint.is_mandatory !== false,
    });
    setShowRouteModal(false);
    setTimeout(() => setShowCheckpointModal(true), 300);
  };

  const handleCloseCheckpointModal = () => {
    setShowCheckpointModal(false);
    setEditingCheckpoint(null);
    setCheckpointForm(DEFAULT_CHECKPOINT_FORM);
    setTimeout(() => setShowRouteModal(true), 300);
  };

  const handleGetCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se requiere acceso a la ubicación');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCheckpointForm({
        ...checkpointForm,
        latitude: String(location.coords.latitude.toFixed(6)),
        longitude: String(location.coords.longitude.toFixed(6)),
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la ubicación');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSaveCheckpoint = async () => {
    if (!checkpointForm.name.trim()) {
      Alert.alert('Error', 'El nombre del punto de control es requerido');
      return;
    }

    if (!checkpointForm.latitude || !checkpointForm.longitude) {
      Alert.alert('Error', 'Las coordenadas GPS son requeridas. Toca el mapa o usa tu ubicación actual.');
      return;
    }

    if (!editingRoute || !editingRoute.id) {
      Alert.alert('Error', 'Guarda la ruta primero antes de agregar puntos.');
      return;
    }

    setFormLoading(true);
    try {
      const headers = await getAuthHeaders();
      const payload = {
        name: checkpointForm.name.trim(),
        description: checkpointForm.description.trim() || null,
        instructions: checkpointForm.instructions.trim() || null,
        latitude: parseFloat(checkpointForm.latitude),
        longitude: parseFloat(checkpointForm.longitude),
        geofence_radius_meters: parseInt(checkpointForm.geofence_radius) || 30,
        require_photo: checkpointForm.require_photo,
        require_notes: checkpointForm.require_notes,
        is_mandatory: checkpointForm.is_mandatory,
        sequence_order: editingCheckpoint ? editingCheckpoint.sequence_order : checkpoints.length + 1,
      };

      let response;
      if (editingCheckpoint) {
        response = await fetch(`${API_URL}/patrols/checkpoints/${editingCheckpoint.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(`${API_URL}/patrols/routes/${editingRoute.id}/checkpoints`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (response.ok && data.success) {
        const newCheckpoint = data.data?.checkpoint || data.data || { ...payload, id: Date.now().toString() };
        if (editingCheckpoint) {
          setCheckpoints(checkpoints.map(cp =>
            cp.id === editingCheckpoint.id ? { ...cp, ...newCheckpoint } : cp
          ));
        } else {
          setCheckpoints([...checkpoints, newCheckpoint]);
        }

        handleCloseCheckpointModal();
        fetchRoutes();
        Alert.alert('Éxito', editingCheckpoint ? 'Punto actualizado' : `"${payload.name}" agregado como punto #${payload.sequence_order}`);
      } else {
        const errorMsg = data.message || data.error || JSON.stringify(data);
        Alert.alert('Error', `No se pudo guardar el punto:\n\n${errorMsg}`);
      }
    } catch (error) {
      Alert.alert('Error', `Error al guardar:\n\n${error.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCheckpoint = async (checkpoint, index) => {
    Alert.alert(
      'Eliminar Punto de Control',
      `¿Eliminar "${checkpoint.name}" (Punto #${index + 1})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(`${API_URL}/patrols/checkpoints/${checkpoint.id}`, {
                method: 'DELETE',
                headers,
              });
              if (response.ok) {
                const updated = checkpoints.filter(cp => cp.id !== checkpoint.id);
                // Re-sequence
                updated.forEach((cp, i) => { cp.sequence_order = i + 1; });
                setCheckpoints(updated);
                fetchRoutes();
              } else {
                const data = await response.json();
                Alert.alert('Error', data.error || 'No se pudo eliminar');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el punto');
            }
          },
        },
      ]
    );
  };

  const handleMoveCheckpoint = (checkpoint, direction) => {
    const currentIndex = checkpoints.findIndex(cp => cp.id === checkpoint.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= checkpoints.length) return;

    const newCheckpoints = [...checkpoints];
    [newCheckpoints[currentIndex], newCheckpoints[newIndex]] = [newCheckpoints[newIndex], newCheckpoints[currentIndex]];
    newCheckpoints.forEach((cp, index) => { cp.sequence_order = index + 1; });
    setCheckpoints(newCheckpoints);
  };

  const handleGenerateQR = async (checkpoint) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/patrols/checkpoints/${checkpoint.id}/generate-qr`, {
        method: 'POST',
        headers,
      });
      const data = await response.json();
      if (response.ok && data.success) {
        Alert.alert('Éxito', 'Código QR generado: ' + (data.data?.qr_code || 'Ver en panel web'));
      } else {
        Alert.alert('Error', data.error || 'No se pudo generar el código QR');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al generar QR');
    }
  };

  const handleLinkNFC = (checkpoint) => {
    Alert.alert(
      'Vincular NFC',
      'Para vincular una etiqueta NFC:\n\n1. Acércate al punto de control\n2. Usa la app de guardia\n3. Escanea la etiqueta NFC\n4. El sistema la vinculará automáticamente',
      [{ text: 'Entendido' }]
    );
  };

  // ─── Schedule operations ─────────────────────────────────

  const handleOpenScheduleModal = () => {
    setScheduleForm(DEFAULT_SCHEDULE_FORM);
    setShowRouteModal(false);
    setTimeout(() => setShowScheduleModal(true), 300);
  };

  const handleCloseScheduleModal = () => {
    setShowScheduleModal(false);
    setScheduleForm(DEFAULT_SCHEDULE_FORM);
    setTimeout(() => setShowRouteModal(true), 300);
  };

  const handleAddSchedule = () => {
    if (!scheduleForm.time) { Alert.alert('Error', 'La hora es requerida'); return; }
    if (scheduleForm.days.length === 0) { Alert.alert('Error', 'Selecciona al menos un día'); return; }

    const newSchedule = {
      id: Date.now(),
      ...scheduleForm,
      tolerance_before: parseInt(scheduleForm.tolerance_before) || 15,
      tolerance_after: parseInt(scheduleForm.tolerance_after) || 15,
    };
    setSchedules([...schedules, newSchedule]);
    handleCloseScheduleModal();
  };

  const handleDeleteSchedule = (schedule) => {
    setSchedules(schedules.filter(s => s.id !== schedule.id));
  };

  const toggleScheduleDay = (dayId) => {
    if (scheduleForm.days.includes(dayId)) {
      setScheduleForm({ ...scheduleForm, days: scheduleForm.days.filter(d => d !== dayId) });
    } else {
      setScheduleForm({ ...scheduleForm, days: [...scheduleForm.days, dayId] });
    }
  };

  // ─── Helpers ─────────────────────────────────────────────

  const getVerificationMethodInfo = (methodId) => {
    return VERIFICATION_METHODS.find(m => m.id === methodId) || VERIFICATION_METHODS[0];
  };

  const getCurrentLocationName = () => {
    const location = locations.find(l => l.id === selectedLocationId);
    return location?.name || 'Seleccionar';
  };

  const getCheckpointColor = (index) => {
    return CHECKPOINT_COLORS[index % CHECKPOINT_COLORS.length];
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const formatDistanceShort = (meters) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const renderToggle = (label, value, onChange, description = null) => (
    <View style={styles.toggleItem}>
      <View style={styles.toggleTextContainer}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description && <Text style={styles.toggleDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: COLORS.backgroundTertiary, true: COLORS.teal + '60' }}
        thumbColor={value ? COLORS.teal : COLORS.textMuted}
      />
    </View>
  );

  // ─── RENDER: Route Map Overview (Checkpoints Tab) ────────

  const renderRouteMapOverview = () => {
    const validCheckpoints = checkpoints.filter(
      cp => cp.latitude && cp.longitude && !isNaN(parseFloat(cp.latitude))
    );

    if (validCheckpoints.length === 0) return null;

    return (
      <View style={styles.routeMapContainer}>
        <View style={styles.routeMapHeader}>
          <Ionicons name="map" size={18} color={COLORS.lime} />
          <Text style={styles.routeMapTitle}>Vista de Ruta</Text>
          <Text style={styles.routeMapSubtitle}>{validCheckpoints.length} puntos</Text>
        </View>
        <MapView
          style={styles.routeMap}
          provider={PROVIDER_GOOGLE}
          region={mapRegion}
          showsUserLocation
          showsMyLocationButton={false}
          scrollEnabled={true}
          zoomEnabled={true}
        >
          {/* Route polyline */}
          {routeLineCoords.length >= 2 && (
            <Polyline
              coordinates={routeLineCoords}
              strokeColor={COLORS.lime}
              strokeWidth={3}
              lineDashPattern={[10, 5]}
            />
          )}

          {/* Checkpoint markers with numbers */}
          {validCheckpoints.map((cp, index) => (
            <Marker
              key={cp.id || index}
              coordinate={{
                latitude: parseFloat(cp.latitude),
                longitude: parseFloat(cp.longitude),
              }}
              onPress={() => setSelectedCheckpointIndex(index)}
              anchor={{ x: 0.5, y: 1 }}
            >
              <NumberedMarker
                number={index + 1}
                color={getCheckpointColor(index)}
                isActive={selectedCheckpointIndex === index}
              />
            </Marker>
          ))}

          {/* Geofence circles */}
          {validCheckpoints.map((cp, index) => (
            <Circle
              key={`circle-${cp.id || index}`}
              center={{
                latitude: parseFloat(cp.latitude),
                longitude: parseFloat(cp.longitude),
              }}
              radius={parseInt(cp.geofence_radius_meters || cp.geofence_radius || 30)}
              fillColor={getCheckpointColor(index) + '20'}
              strokeColor={getCheckpointColor(index) + '60'}
              strokeWidth={1}
            />
          ))}
        </MapView>

        {/* Selected checkpoint info overlay */}
        {selectedCheckpointIndex !== null && validCheckpoints[selectedCheckpointIndex] && (
          <View style={styles.mapInfoOverlay}>
            <View style={[styles.mapInfoDot, { backgroundColor: getCheckpointColor(selectedCheckpointIndex) }]} />
            <View style={styles.mapInfoContent}>
              <Text style={styles.mapInfoName}>
                #{selectedCheckpointIndex + 1} {validCheckpoints[selectedCheckpointIndex].name}
              </Text>
              <Text style={styles.mapInfoCoords}>
                {parseFloat(validCheckpoints[selectedCheckpointIndex].latitude).toFixed(5)}, {parseFloat(validCheckpoints[selectedCheckpointIndex].longitude).toFixed(5)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.mapInfoClose}
              onPress={() => setSelectedCheckpointIndex(null)}
            >
              <Ionicons name="close" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ─── RENDER: Enhanced Checkpoint Card ────────────────────

  const renderCheckpointCard = (checkpoint, index) => {
    const color = getCheckpointColor(index);
    const prevCheckpoint = index > 0 ? checkpoints[index - 1] : null;
    let distFromPrev = null;

    if (prevCheckpoint && prevCheckpoint.latitude && checkpoint.latitude) {
      distFromPrev = calculateDistance(
        parseFloat(prevCheckpoint.latitude),
        parseFloat(prevCheckpoint.longitude),
        parseFloat(checkpoint.latitude),
        parseFloat(checkpoint.longitude)
      );
    }

    return (
      <View key={checkpoint.id || index}>
        {/* Distance connector from previous point */}
        {distFromPrev !== null && (
          <View style={styles.distanceConnector}>
            <View style={[styles.connectorLine, { backgroundColor: COLORS.textMuted + '40' }]} />
            <View style={styles.distanceBadge}>
              <Ionicons name="walk-outline" size={12} color={COLORS.textSecondary} />
              <Text style={styles.distanceText}>{formatDistanceShort(distFromPrev)}</Text>
            </View>
            <View style={[styles.connectorLine, { backgroundColor: COLORS.textMuted + '40' }]} />
          </View>
        )}

        <View style={[styles.checkpointCard, selectedCheckpointIndex === index && { borderColor: color }]}>
          {/* Header row with number + info */}
          <View style={styles.checkpointHeader}>
            <TouchableOpacity
              style={[styles.checkpointNumber, { backgroundColor: color }]}
              onPress={() => setSelectedCheckpointIndex(selectedCheckpointIndex === index ? null : index)}
            >
              <Text style={styles.checkpointNumberText}>{index + 1}</Text>
            </TouchableOpacity>

            <View style={styles.checkpointInfo}>
              <Text style={styles.checkpointName}>{checkpoint.name}</Text>
              {checkpoint.description ? (
                <Text style={styles.checkpointDescription} numberOfLines={1}>{checkpoint.description}</Text>
              ) : null}
            </View>

            {/* Quick status badges */}
            <View style={styles.checkpointBadges}>
              {checkpoint.is_mandatory && (
                <View style={[styles.cpBadge, { backgroundColor: COLORS.danger + '20' }]}>
                  <Text style={[styles.cpBadgeText, { color: COLORS.danger }]}>Obligatorio</Text>
                </View>
              )}
              {checkpoint.require_photo && (
                <View style={[styles.cpBadge, { backgroundColor: COLORS.purple + '20' }]}>
                  <Ionicons name="camera" size={10} color={COLORS.purple} />
                </View>
              )}
            </View>
          </View>

          {/* Coordinates + geofence info */}
          <View style={styles.checkpointCoordRow}>
            <View style={styles.coordChip}>
              <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
              <Text style={styles.coordChipText}>
                {checkpoint.latitude ? parseFloat(checkpoint.latitude).toFixed(5) : '---'},{' '}
                {checkpoint.longitude ? parseFloat(checkpoint.longitude).toFixed(5) : '---'}
              </Text>
            </View>
            <View style={styles.coordChip}>
              <Ionicons name="radio-outline" size={12} color={COLORS.teal} />
              <Text style={[styles.coordChipText, { color: COLORS.teal }]}>
                {checkpoint.geofence_radius_meters || checkpoint.geofence_radius || 30}m radio
              </Text>
            </View>
          </View>

          {/* Actions row */}
          <View style={styles.checkpointActions}>
            <TouchableOpacity
              style={[styles.cpActionBtn, index === 0 && styles.cpActionBtnDisabled]}
              onPress={() => handleMoveCheckpoint(checkpoint, 'up')}
              disabled={index === 0}
            >
              <Ionicons name="arrow-up" size={16} color={index === 0 ? COLORS.textMuted : COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cpActionBtn, index === checkpoints.length - 1 && styles.cpActionBtnDisabled]}
              onPress={() => handleMoveCheckpoint(checkpoint, 'down')}
              disabled={index === checkpoints.length - 1}
            >
              <Ionicons name="arrow-down" size={16} color={index === checkpoints.length - 1 ? COLORS.textMuted : COLORS.textSecondary} />
            </TouchableOpacity>

            <View style={styles.cpActionSpacer} />

            <TouchableOpacity style={styles.cpActionBtn} onPress={() => handleGenerateQR(checkpoint)}>
              <Ionicons name="qr-code-outline" size={16} color={COLORS.purple} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.cpActionBtn} onPress={() => handleLinkNFC(checkpoint)}>
              <Ionicons name="radio-outline" size={16} color={COLORS.teal} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.cpActionBtn} onPress={() => handleOpenEditCheckpointModal(checkpoint)}>
              <Ionicons name="create-outline" size={16} color={COLORS.blue} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.cpActionBtn} onPress={() => handleDeleteCheckpoint(checkpoint, index)}>
              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ─── LOADING ─────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
          <Text style={styles.loadingText}>Cargando rutas de rondín...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── MAIN RENDER ─────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Gestión de Rondines</Text>
          {isSuperAdminUser && locations.length > 1 ? (
            <TouchableOpacity
              style={styles.locationSelector}
              onPress={() => setShowLocationPicker(true)}
            >
              <Ionicons name="location" size={14} color={COLORS.teal} />
              <Text style={styles.locationText} numberOfLines={1}>{getCurrentLocationName()}</Text>
              <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : (
            <Text style={styles.headerSubtitle}>{getCurrentLocationName()}</Text>
          )}
        </View>
        <TouchableOpacity onPress={handleOpenCreateRouteModal} style={styles.addButton}>
          <Ionicons name="add" size={24} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {[
          { icon: 'map', color: COLORS.lime, value: stats.totalRoutes, label: 'Rutas' },
          { icon: 'checkmark-circle', color: COLORS.success, value: stats.activeRoutes, label: 'Activas' },
          { icon: 'flag', color: COLORS.teal, value: stats.totalCheckpoints, label: 'Puntos' },
          { icon: 'walk', color: COLORS.purple, value: stats.completedPatrols, label: 'Rondines' },
        ].map((stat, i) => (
          <View key={i} style={styles.statCard}>
            <Ionicons name={stat.icon} size={20} color={stat.color} />
            <Text style={[styles.statNumber, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Routes List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.lime} />}
      >
        {routes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="map-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Sin Rutas de Rondín</Text>
            <Text style={styles.emptySubtitle}>Crea rutas para que los guardias realicen rondines</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleOpenCreateRouteModal}>
              <Ionicons name="add" size={20} color={COLORS.background} />
              <Text style={styles.emptyButtonText}>Crear Ruta</Text>
            </TouchableOpacity>
          </View>
        ) : (
          routes.map((route) => {
            const verificationInfo = getVerificationMethodInfo(route.verification_method);
            const cpCount = route.checkpoints_count || route.checkpoints?.length || 0;
            return (
              <View key={route.id} style={styles.routeCard}>
                <View style={styles.routeHeader}>
                  <View style={[styles.routeIcon, { backgroundColor: route.is_active ? COLORS.teal + '20' : COLORS.danger + '20' }]}>
                    <Ionicons name="map" size={24} color={route.is_active ? COLORS.teal : COLORS.danger} />
                  </View>
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeName}>{route.name}</Text>
                    {route.description && <Text style={styles.routeDescription} numberOfLines={2}>{route.description}</Text>}
                    <View style={styles.routeMeta}>
                      <View style={styles.metaItem}>
                        <Ionicons name="flag-outline" size={14} color={cpCount > 0 ? COLORS.teal : COLORS.warning} />
                        <Text style={[styles.metaText, cpCount === 0 && { color: COLORS.warning }]}>
                          {cpCount} puntos{cpCount === 0 ? ' ⚠️' : ''}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.metaText}>{route.estimated_duration_minutes || route.estimated_duration || 30} min</Text>
                      </View>
                      <View style={[styles.methodBadge, { backgroundColor: verificationInfo.color + '20' }]}>
                        <Ionicons name={verificationInfo.icon} size={12} color={verificationInfo.color} />
                        <Text style={[styles.methodText, { color: verificationInfo.color }]}>{verificationInfo.label}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.statusRow}>
                  <View style={[styles.statusBadge, { backgroundColor: route.is_active ? COLORS.success + '20' : COLORS.danger + '20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: route.is_active ? COLORS.success : COLORS.danger }]} />
                    <Text style={[styles.statusText, { color: route.is_active ? COLORS.success : COLORS.danger }]}>
                      {route.is_active ? 'Activa' : 'Inactiva'}
                    </Text>
                  </View>
                  <Switch
                    value={route.is_active}
                    onValueChange={() => handleToggleRouteActive(route)}
                    trackColor={{ false: COLORS.backgroundTertiary, true: COLORS.success + '60' }}
                    thumbColor={route.is_active ? COLORS.success : COLORS.textMuted}
                  />
                </View>

                <View style={styles.routeActions}>
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenEditRouteModal(route)}>
                    <Ionicons name="create-outline" size={18} color={COLORS.teal} />
                    <Text style={[styles.actionButtonText, { color: COLORS.teal }]}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteRoute(route)}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    <Text style={[styles.actionButtonText, { color: COLORS.danger }]}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════
          ROUTE CREATE/EDIT MODAL
          ═══════════════════════════════════════════════════════ */}
      <Modal visible={showRouteModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCloseRouteModal}>
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleCloseRouteModal}>
                  <Text style={styles.modalCancel}>Cerrar</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{editingRoute ? 'Editar Ruta' : 'Nueva Ruta'}</Text>
                <TouchableOpacity onPress={handleSaveRoute} disabled={formLoading}>
                  {formLoading ? <ActivityIndicator size="small" color={COLORS.lime} /> : <Text style={styles.modalSave}>Guardar</Text>}
                </TouchableOpacity>
              </View>

              {/* Tabs */}
              <View style={styles.tabContainer}>
                {[
                  { id: 'info', label: 'Información', icon: 'information-circle-outline' },
                  { id: 'checkpoints', label: `Puntos (${checkpoints.length})`, icon: 'flag-outline' },
                  { id: 'schedules', label: 'Horarios', icon: 'time-outline' },
                ].map(tab => (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                    onPress={() => setActiveTab(tab.id)}
                    disabled={tab.id !== 'info' && !editingRoute}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={16}
                      color={activeTab === tab.id ? COLORS.lime : (tab.id !== 'info' && !editingRoute) ? COLORS.textMuted : COLORS.textSecondary}
                    />
                    <Text style={[
                      styles.tabText,
                      activeTab === tab.id && styles.tabTextActive,
                      tab.id !== 'info' && !editingRoute && { opacity: 0.4 }
                    ]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="always" onScrollBeginDrag={Keyboard.dismiss}>

                {/* ── INFO TAB ── */}
                {activeTab === 'info' && (
                  <>
                    <Text style={styles.inputLabel}>Nombre *</Text>
                    <TextInput
                      style={styles.input}
                      value={routeForm.name}
                      onChangeText={(text) => setRouteForm({ ...routeForm, name: text })}
                      placeholder="Ej: Rondín Perimetral Norte"
                      placeholderTextColor={COLORS.textMuted}
                    />

                    <Text style={styles.inputLabel}>Descripción</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={routeForm.description}
                      onChangeText={(text) => setRouteForm({ ...routeForm, description: text })}
                      placeholder="Descripción de la ruta..."
                      placeholderTextColor={COLORS.textMuted}
                      multiline
                      numberOfLines={3}
                    />

                    <Text style={styles.inputLabel}>Duración Estimada (minutos)</Text>
                    <TextInput
                      style={styles.input}
                      value={routeForm.estimated_duration}
                      onChangeText={(text) => setRouteForm({ ...routeForm, estimated_duration: text })}
                      placeholder="30"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numeric"
                    />

                    <Text style={styles.inputLabel}>Método de Verificación</Text>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => { Keyboard.dismiss(); setShowVerificationPicker(true); }}
                    >
                      <View style={styles.pickerButtonContent}>
                        <Ionicons name={getVerificationMethodInfo(routeForm.verification_method).icon} size={20} color={getVerificationMethodInfo(routeForm.verification_method).color} />
                        <View>
                          <Text style={styles.pickerButtonText}>{getVerificationMethodInfo(routeForm.verification_method).label}</Text>
                          <Text style={styles.pickerButtonHint}>{getVerificationMethodInfo(routeForm.verification_method).description}</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    <Text style={[styles.sectionTitle, { marginTop: scale(24) }]}>Requisitos de Fotos</Text>
                    {renderToggle('Foto en cada punto de control', routeForm.require_photo_at_checkpoint, (val) => setRouteForm({ ...routeForm, require_photo_at_checkpoint: val }), 'El guardia debe tomar foto en cada punto')}
                    {renderToggle('Foto al iniciar rondín', routeForm.require_photo_at_start, (val) => setRouteForm({ ...routeForm, require_photo_at_start: val }))}
                    {renderToggle('Foto al finalizar rondín', routeForm.require_photo_at_end, (val) => setRouteForm({ ...routeForm, require_photo_at_end: val }))}

                    <Text style={[styles.sectionTitle, { marginTop: scale(24) }]}>Configuración de Saltos</Text>
                    {renderToggle('Permitir saltar puntos', routeForm.allow_skip_checkpoint, (val) => setRouteForm({ ...routeForm, allow_skip_checkpoint: val }), 'El guardia puede omitir puntos no obligatorios')}

                    {routeForm.allow_skip_checkpoint && (
                      <>
                        <Text style={styles.inputLabel}>Máximo de saltos permitidos</Text>
                        <TextInput style={styles.input} value={routeForm.max_skips_allowed} onChangeText={(text) => setRouteForm({ ...routeForm, max_skips_allowed: text })} placeholder="0" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                      </>
                    )}

                    <Text style={[styles.sectionTitle, { marginTop: scale(24) }]}>Geofence</Text>
                    <Text style={styles.inputLabel}>Radio de geofence (metros)</Text>
                    <TextInput style={styles.input} value={routeForm.geofence_radius} onChangeText={(text) => setRouteForm({ ...routeForm, geofence_radius: text })} placeholder="50" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                    <Text style={styles.inputHint}>Distancia máxima del punto para validar la visita</Text>
                  </>
                )}

                {/* ── CHECKPOINTS TAB ── */}
                {activeTab === 'checkpoints' && (
                  <>
                    {!editingRoute ? (
                      <View style={styles.infoNote}>
                        <Ionicons name="information-circle" size={20} color={COLORS.warning} />
                        <Text style={[styles.infoNoteText, { color: COLORS.warning }]}>Guarda la ruta primero para agregar puntos de control</Text>
                      </View>
                    ) : (
                      <>
                        {/* Route Map Overview */}
                        {renderRouteMapOverview()}

                        {/* Add checkpoint button */}
                        <TouchableOpacity style={styles.addCheckpointButton} onPress={handleOpenCreateCheckpointModal}>
                          <Ionicons name="add-circle" size={20} color={COLORS.background} />
                          <Text style={styles.addCheckpointButtonText}>
                            Agregar Punto #{checkpoints.length + 1}
                          </Text>
                        </TouchableOpacity>

                        {checkpoints.length === 0 ? (
                          <View style={styles.emptyCheckpoints}>
                            <View style={styles.emptyCheckpointsIcon}>
                              <Ionicons name="flag-outline" size={40} color={COLORS.textMuted} />
                            </View>
                            <Text style={styles.emptyCheckpointsText}>Sin puntos de control</Text>
                            <Text style={styles.emptyCheckpointsSubtext}>
                              Los puntos definen la ruta que el guardia debe seguir durante el rondín. Cada punto tiene coordenadas GPS y un radio de verificación.
                            </Text>
                          </View>
                        ) : (
                          <>
                            {/* Route summary */}
                            <View style={styles.routeSummary}>
                              <View style={styles.routeSummaryItem}>
                                <Text style={styles.routeSummaryValue}>{checkpoints.length}</Text>
                                <Text style={styles.routeSummaryLabel}>Puntos</Text>
                              </View>
                              <View style={styles.routeSummaryDivider} />
                              <View style={styles.routeSummaryItem}>
                                <Text style={styles.routeSummaryValue}>
                                  {checkpoints.filter(cp => cp.is_mandatory).length}
                                </Text>
                                <Text style={styles.routeSummaryLabel}>Obligatorios</Text>
                              </View>
                              <View style={styles.routeSummaryDivider} />
                              <View style={styles.routeSummaryItem}>
                                <Text style={styles.routeSummaryValue}>
                                  {routeLineCoords.length >= 2
                                    ? formatDistanceShort(
                                        routeLineCoords.reduce((total, coord, i) => {
                                          if (i === 0) return 0;
                                          return total + calculateDistance(
                                            routeLineCoords[i - 1].latitude, routeLineCoords[i - 1].longitude,
                                            coord.latitude, coord.longitude
                                          );
                                        }, 0)
                                      )
                                    : '0m'}
                                </Text>
                                <Text style={styles.routeSummaryLabel}>Distancia</Text>
                              </View>
                            </View>

                            {/* Checkpoint list */}
                            {checkpoints.map((cp, index) => renderCheckpointCard(cp, index))}
                          </>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* ── SCHEDULES TAB ── */}
                {activeTab === 'schedules' && (
                  <>
                    {!editingRoute ? (
                      <View style={styles.infoNote}>
                        <Ionicons name="information-circle" size={20} color={COLORS.warning} />
                        <Text style={[styles.infoNoteText, { color: COLORS.warning }]}>Guarda la ruta primero para agregar horarios</Text>
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity style={styles.addCheckpointButton} onPress={handleOpenScheduleModal}>
                          <Ionicons name="add-circle" size={20} color={COLORS.background} />
                          <Text style={styles.addCheckpointButtonText}>Agregar Horario</Text>
                        </TouchableOpacity>

                        {schedules.length === 0 ? (
                          <View style={styles.emptyCheckpoints}>
                            <View style={styles.emptyCheckpointsIcon}>
                              <Ionicons name="time-outline" size={40} color={COLORS.textMuted} />
                            </View>
                            <Text style={styles.emptyCheckpointsText}>Sin horarios programados</Text>
                            <Text style={styles.emptyCheckpointsSubtext}>Opcional: programa horarios para los rondines automáticos</Text>
                          </View>
                        ) : (
                          schedules.map((schedule) => (
                            <View key={schedule.id} style={styles.scheduleCard}>
                              <View style={styles.scheduleInfo}>
                                <Text style={styles.scheduleTime}>{schedule.time}</Text>
                                <View style={styles.scheduleDays}>
                                  {DAYS_OF_WEEK.map((day) => (
                                    <View key={day.id} style={[styles.scheduleDayChip, schedule.days.includes(day.id) && styles.scheduleDayChipActive]}>
                                      <Text style={[styles.scheduleDayText, schedule.days.includes(day.id) && styles.scheduleDayTextActive]}>{day.label}</Text>
                                    </View>
                                  ))}
                                </View>
                                <Text style={styles.scheduleTolerance}>Tolerancia: -{schedule.tolerance_before}min / +{schedule.tolerance_after}min</Text>
                              </View>
                              <TouchableOpacity style={styles.deleteScheduleBtn} onPress={() => handleDeleteSchedule(schedule)}>
                                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                              </TouchableOpacity>
                            </View>
                          ))
                        )}

                        <View style={[styles.infoNote, { marginTop: scale(20) }]}>
                          <Ionicons name="information-circle" size={20} color={COLORS.teal} />
                          <Text style={styles.infoNoteText}>Los horarios son opcionales. Sin horarios, los guardias pueden iniciar rondines en cualquier momento.</Text>
                        </View>
                      </>
                    )}
                  </>
                )}

                <View style={{ height: 50 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>

          {/* Verification Picker */}
          {showVerificationPicker && (
            <View style={styles.pickerOverlayModal}>
              <TouchableOpacity style={styles.pickerOverlayBg} onPress={() => setShowVerificationPicker(false)} activeOpacity={1} />
              <View style={styles.pickerContent}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Método de Verificación</Text>
                  <TouchableOpacity onPress={() => setShowVerificationPicker(false)}>
                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                {VERIFICATION_METHODS.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={[styles.typeItem, method.id === routeForm.verification_method && styles.typeItemActive]}
                    onPress={() => { setRouteForm({ ...routeForm, verification_method: method.id }); setShowVerificationPicker(false); }}
                  >
                    <Ionicons name={method.icon} size={24} color={method.id === routeForm.verification_method ? COLORS.lime : method.color} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.typeItemText, method.id === routeForm.verification_method && styles.typeItemTextActive]}>{method.label}</Text>
                      <Text style={{ fontSize: scale(11), color: COLORS.textMuted, marginTop: 2 }}>{method.description}</Text>
                    </View>
                    {method.id === routeForm.verification_method && <Ionicons name="checkmark" size={20} color={COLORS.lime} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* ═══════════════════════════════════════════════════════
          CHECKPOINT CREATE/EDIT MODAL
          ═══════════════════════════════════════════════════════ */}
      <Modal visible={showCheckpointModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCloseCheckpointModal}>
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCloseCheckpointModal}>
                <Text style={styles.modalCancel}>Cancelar</Text>
              </TouchableOpacity>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>{editingCheckpoint ? 'Editar Punto' : 'Nuevo Punto'}</Text>
                {!editingCheckpoint && (
                  <Text style={styles.modalSubtitle}>Punto #{checkpoints.length + 1} de la ruta</Text>
                )}
              </View>
              <TouchableOpacity onPress={handleSaveCheckpoint} disabled={formLoading}>
                {formLoading ? <ActivityIndicator size="small" color={COLORS.lime} /> : <Text style={styles.modalSave}>Guardar</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="always">
              {/* Checkpoint number badge */}
              <View style={styles.cpModalBadge}>
                <View style={[styles.cpModalBadgeCircle, { backgroundColor: getCheckpointColor(editingCheckpoint ? checkpoints.findIndex(cp => cp.id === editingCheckpoint.id) : checkpoints.length) }]}>
                  <Text style={styles.cpModalBadgeNumber}>
                    {editingCheckpoint ? checkpoints.findIndex(cp => cp.id === editingCheckpoint.id) + 1 : checkpoints.length + 1}
                  </Text>
                </View>
                <View>
                  <Text style={styles.cpModalBadgeLabel}>
                    {editingCheckpoint ? 'Editando punto de control' : 'Nuevo punto de control'}
                  </Text>
                  {checkpoints.length > 0 && !editingCheckpoint && (
                    <Text style={styles.cpModalBadgeHint}>
                      Punto anterior: {checkpoints[checkpoints.length - 1]?.name || `Punto ${checkpoints.length}`}
                    </Text>
                  )}
                </View>
              </View>

              <Text style={styles.inputLabel}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={checkpointForm.name}
                onChangeText={(text) => setCheckpointForm({ ...checkpointForm, name: text })}
                placeholder="Ej: Puerta Principal"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={checkpointForm.description}
                onChangeText={(text) => setCheckpointForm({ ...checkpointForm, description: text })}
                placeholder="Descripción del punto..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={2}
              />

              <Text style={styles.inputLabel}>Instrucciones para el Guardia</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={checkpointForm.instructions}
                onChangeText={(text) => setCheckpointForm({ ...checkpointForm, instructions: text })}
                placeholder="Qué debe verificar el guardia..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.sectionTitle, { marginTop: scale(20) }]}>Ubicación GPS *</Text>

              <TouchableOpacity style={styles.locationButton} onPress={handleGetCurrentLocation} disabled={gettingLocation}>
                {gettingLocation ? (
                  <ActivityIndicator size="small" color={COLORS.background} />
                ) : (
                  <>
                    <Ionicons name="navigate" size={18} color={COLORS.background} />
                    <Text style={styles.locationButtonText}>Usar mi ubicación actual</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Map with existing checkpoints + new one */}
              <View style={styles.mapContainer}>
                <View style={styles.mapHeaderBar}>
                  <Ionicons name="map-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.mapHint}>Toca el mapa para seleccionar ubicación</Text>
                </View>
                <MapView
                  style={styles.map}
                  provider={PROVIDER_GOOGLE}
                  initialRegion={{
                    latitude: checkpointForm.latitude ? parseFloat(checkpointForm.latitude) : 15.5,
                    longitude: checkpointForm.longitude ? parseFloat(checkpointForm.longitude) : -88.0,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  region={checkpointForm.latitude && checkpointForm.longitude ? {
                    latitude: parseFloat(checkpointForm.latitude),
                    longitude: parseFloat(checkpointForm.longitude),
                    latitudeDelta: 0.003,
                    longitudeDelta: 0.003,
                  } : undefined}
                  onPress={(e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setCheckpointForm({
                      ...checkpointForm,
                      latitude: latitude.toFixed(6),
                      longitude: longitude.toFixed(6),
                    });
                  }}
                  showsUserLocation
                  showsMyLocationButton
                >
                  {/* Show existing checkpoints as numbered markers */}
                  {checkpoints.map((cp, index) => {
                    if (!cp.latitude || !cp.longitude || (editingCheckpoint && cp.id === editingCheckpoint.id)) return null;
                    return (
                      <Marker
                        key={cp.id || index}
                        coordinate={{
                          latitude: parseFloat(cp.latitude),
                          longitude: parseFloat(cp.longitude),
                        }}
                        anchor={{ x: 0.5, y: 1 }}
                      >
                        <NumberedMarker number={index + 1} color={getCheckpointColor(index)} size={28} />
                      </Marker>
                    );
                  })}

                  {/* Current checkpoint being edited/created */}
                  {checkpointForm.latitude && checkpointForm.longitude && (
                    <>
                      <Marker
                        coordinate={{
                          latitude: parseFloat(checkpointForm.latitude),
                          longitude: parseFloat(checkpointForm.longitude),
                        }}
                        draggable
                        onDragEnd={(e) => {
                          const { latitude, longitude } = e.nativeEvent.coordinate;
                          setCheckpointForm({
                            ...checkpointForm,
                            latitude: latitude.toFixed(6),
                            longitude: longitude.toFixed(6),
                          });
                        }}
                        anchor={{ x: 0.5, y: 1 }}
                      >
                        <NumberedMarker
                          number={editingCheckpoint ? checkpoints.findIndex(cp => cp.id === editingCheckpoint.id) + 1 : checkpoints.length + 1}
                          color={getCheckpointColor(editingCheckpoint ? checkpoints.findIndex(cp => cp.id === editingCheckpoint.id) : checkpoints.length)}
                          size={40}
                          isActive
                        />
                      </Marker>
                      <Circle
                        center={{
                          latitude: parseFloat(checkpointForm.latitude),
                          longitude: parseFloat(checkpointForm.longitude),
                        }}
                        radius={parseInt(checkpointForm.geofence_radius) || 30}
                        fillColor="rgba(212, 254, 72, 0.15)"
                        strokeColor={COLORS.lime}
                        strokeWidth={2}
                      />
                    </>
                  )}

                  {/* Route line including new point */}
                  {checkpoints.length > 0 && checkpointForm.latitude && checkpointForm.longitude && (
                    <Polyline
                      coordinates={[
                        ...checkpoints
                          .filter(cp => cp.latitude && cp.longitude && !(editingCheckpoint && cp.id === editingCheckpoint.id))
                          .map(cp => ({ latitude: parseFloat(cp.latitude), longitude: parseFloat(cp.longitude) })),
                        { latitude: parseFloat(checkpointForm.latitude), longitude: parseFloat(checkpointForm.longitude) },
                      ]}
                      strokeColor={COLORS.lime + '80'}
                      strokeWidth={2}
                      lineDashPattern={[8, 4]}
                    />
                  )}
                </MapView>
              </View>

              <View style={styles.coordsRow}>
                <View style={styles.coordInput}>
                  <Text style={styles.coordLabel}>Latitud</Text>
                  <TextInput style={styles.input} value={checkpointForm.latitude} onChangeText={(text) => setCheckpointForm({ ...checkpointForm, latitude: text })} placeholder="0.000000" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                </View>
                <View style={styles.coordInput}>
                  <Text style={styles.coordLabel}>Longitud</Text>
                  <TextInput style={styles.input} value={checkpointForm.longitude} onChangeText={(text) => setCheckpointForm({ ...checkpointForm, longitude: text })} placeholder="0.000000" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                </View>
              </View>

              <Text style={styles.inputLabel}>Radio de Geofence (metros)</Text>
              <TextInput style={styles.input} value={checkpointForm.geofence_radius} onChangeText={(text) => setCheckpointForm({ ...checkpointForm, geofence_radius: text })} placeholder="30" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
              <Text style={styles.inputHint}>El guardia debe estar dentro de este radio para verificar el punto</Text>

              <Text style={[styles.sectionTitle, { marginTop: scale(20) }]}>Requisitos</Text>
              {renderToggle('Requerir foto', checkpointForm.require_photo, (val) => setCheckpointForm({ ...checkpointForm, require_photo: val }), 'El guardia debe tomar una foto')}
              {renderToggle('Requerir notas', checkpointForm.require_notes, (val) => setCheckpointForm({ ...checkpointForm, require_notes: val }), 'El guardia debe escribir observaciones')}
              {renderToggle('Es obligatorio', checkpointForm.is_mandatory, (val) => setCheckpointForm({ ...checkpointForm, is_mandatory: val }), 'El guardia no puede saltar este punto')}

              <View style={{ height: 50 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ═══════════════════════════════════════════════════════
          SCHEDULE MODAL
          ═══════════════════════════════════════════════════════ */}
      <Modal visible={showScheduleModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCloseScheduleModal}>
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCloseScheduleModal}><Text style={styles.modalCancel}>Cancelar</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Nuevo Horario</Text>
            <TouchableOpacity onPress={handleAddSchedule}><Text style={styles.modalSave}>Agregar</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Hora del Rondín *</Text>
            <TextInput style={styles.input} value={scheduleForm.time} onChangeText={(text) => setScheduleForm({ ...scheduleForm, time: text })} placeholder="HH:MM (ej: 14:30)" placeholderTextColor={COLORS.textMuted} />

            <Text style={[styles.sectionTitle, { marginTop: scale(20) }]}>Días de la Semana *</Text>
            <View style={styles.daysContainer}>
              {DAYS_OF_WEEK.map((day) => (
                <TouchableOpacity key={day.id} style={[styles.dayButton, scheduleForm.days.includes(day.id) && styles.dayButtonActive]} onPress={() => toggleScheduleDay(day.id)}>
                  <Text style={[styles.dayButtonText, scheduleForm.days.includes(day.id) && styles.dayButtonTextActive]}>{day.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: scale(20) }]}>Tolerancia</Text>
            <Text style={styles.inputLabel}>Tolerancia antes (minutos)</Text>
            <TextInput style={styles.input} value={scheduleForm.tolerance_before} onChangeText={(text) => setScheduleForm({ ...scheduleForm, tolerance_before: text })} placeholder="15" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
            <Text style={styles.inputLabel}>Tolerancia después (minutos)</Text>
            <TextInput style={styles.input} value={scheduleForm.tolerance_after} onChangeText={(text) => setScheduleForm({ ...scheduleForm, tolerance_after: text })} placeholder="15" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />

            <View style={styles.infoNote}>
              <Ionicons name="information-circle" size={20} color={COLORS.teal} />
              <Text style={styles.infoNoteText}>El guardia puede iniciar el rondín dentro de la ventana de tolerancia.</Text>
            </View>
            <View style={{ height: 50 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Location Picker */}
      {showLocationPicker && (
        <View style={styles.pickerOverlay}>
          <TouchableOpacity style={styles.pickerOverlayBg} onPress={() => setShowLocationPicker(false)} />
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Seleccionar Ubicación</Text>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {locations.map((loc) => (
                <TouchableOpacity key={loc.id} style={[styles.typeItem, loc.id === selectedLocationId && styles.typeItemActive]} onPress={() => { setSelectedLocationId(loc.id); setShowLocationPicker(false); }}>
                  <Ionicons name="business" size={20} color={loc.id === selectedLocationId ? COLORS.lime : COLORS.textSecondary} />
                  <Text style={[styles.typeItemText, loc.id === selectedLocationId && styles.typeItemTextActive]}>{loc.name}</Text>
                  {loc.id === selectedLocationId && <Ionicons name="checkmark" size={20} color={COLORS.lime} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: scale(12), color: COLORS.textSecondary, fontSize: scale(14) },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: scale(12) },
  backButton: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: COLORS.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
  headerTitleContainer: { flex: 1, marginLeft: scale(12) },
  headerTitle: { fontSize: scale(18), fontWeight: '700', color: COLORS.textPrimary },
  headerSubtitle: { fontSize: scale(12), color: COLORS.textSecondary, marginTop: scale(2) },
  locationSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundSecondary, paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(8), marginTop: scale(4), gap: scale(4), alignSelf: 'flex-start' },
  locationText: { fontSize: scale(12), color: COLORS.textSecondary, maxWidth: scale(150) },
  addButton: { width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: COLORS.lime, alignItems: 'center', justifyContent: 'center' },

  // Stats
  statsContainer: { flexDirection: 'row', paddingHorizontal: scale(16), paddingVertical: scale(12), gap: scale(8) },
  statCard: { flex: 1, backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(12), padding: scale(12), alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statNumber: { fontSize: scale(20), fontWeight: '700', marginTop: scale(4) },
  statLabel: { fontSize: scale(10), color: COLORS.textSecondary, marginTop: scale(2), textAlign: 'center' },

  // Content
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: scale(16) },

  // Route Card
  routeCard: { backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(16), padding: scale(16), marginBottom: scale(12), borderWidth: 1, borderColor: COLORS.border },
  routeHeader: { flexDirection: 'row', marginBottom: scale(12) },
  routeIcon: { width: scale(50), height: scale(50), borderRadius: scale(14), alignItems: 'center', justifyContent: 'center', marginRight: scale(12) },
  routeInfo: { flex: 1 },
  routeName: { fontSize: scale(16), fontWeight: '700', color: COLORS.textPrimary },
  routeDescription: { fontSize: scale(13), color: COLORS.textSecondary, marginTop: scale(4) },
  routeMeta: { flexDirection: 'row', alignItems: 'center', marginTop: scale(8), gap: scale(12), flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  metaText: { fontSize: scale(12), color: COLORS.textSecondary },
  methodBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(8), paddingVertical: scale(4), borderRadius: scale(6), gap: scale(4) },
  methodText: { fontSize: scale(11), fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: scale(12), borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border, marginBottom: scale(12) },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(8), gap: scale(6) },
  statusDot: { width: scale(8), height: scale(8), borderRadius: scale(4) },
  statusText: { fontSize: scale(12), fontWeight: '600' },
  routeActions: { flexDirection: 'row', justifyContent: 'space-around' },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: scale(4), padding: scale(8) },
  actionButtonText: { fontSize: scale(12), fontWeight: '500' },

  // Empty
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: scale(60) },
  emptyTitle: { fontSize: scale(18), fontWeight: '600', color: COLORS.textPrimary, marginTop: scale(16) },
  emptySubtitle: { fontSize: scale(14), color: COLORS.textSecondary, marginTop: scale(4), textAlign: 'center' },
  emptyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lime, paddingHorizontal: scale(20), paddingVertical: scale(12), borderRadius: scale(10), marginTop: scale(20), gap: scale(8) },
  emptyButtonText: { fontSize: scale(14), fontWeight: '600', color: COLORS.background },

  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(16), paddingVertical: scale(12), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalCancel: { fontSize: scale(16), color: COLORS.textSecondary },
  modalTitle: { fontSize: scale(17), fontWeight: '600', color: COLORS.textPrimary },
  modalTitleContainer: { alignItems: 'center' },
  modalSubtitle: { fontSize: scale(12), color: COLORS.teal, marginTop: scale(2) },
  modalSave: { fontSize: scale(16), color: COLORS.lime, fontWeight: '600' },
  modalContent: { flex: 1, padding: scale(16) },

  // Tabs
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: scale(14), alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: scale(6) },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.lime },
  tabText: { fontSize: scale(13), color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.lime, fontWeight: '600' },

  // Form
  inputLabel: { fontSize: scale(14), fontWeight: '600', color: COLORS.textPrimary, marginBottom: scale(8), marginTop: scale(16) },
  input: { backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(10), paddingHorizontal: scale(16), paddingVertical: scale(14), fontSize: scale(15), color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  textArea: { height: scale(80), textAlignVertical: 'top' },
  inputHint: { fontSize: scale(12), color: COLORS.textMuted, marginTop: scale(4) },
  sectionTitle: { fontSize: scale(16), fontWeight: '700', color: COLORS.textPrimary, marginBottom: scale(12) },

  // Toggle
  toggleItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(10), padding: scale(14), marginBottom: scale(10), borderWidth: 1, borderColor: COLORS.border },
  toggleTextContainer: { flex: 1, marginRight: scale(12) },
  toggleLabel: { fontSize: scale(14), fontWeight: '500', color: COLORS.textPrimary },
  toggleDescription: { fontSize: scale(12), color: COLORS.textMuted, marginTop: scale(4) },

  // Picker
  pickerButton: { backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(10), paddingHorizontal: scale(16), paddingVertical: scale(14), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border },
  pickerButtonContent: { flexDirection: 'row', alignItems: 'center', gap: scale(10), flex: 1 },
  pickerButtonText: { fontSize: scale(15), color: COLORS.textPrimary },
  pickerButtonHint: { fontSize: scale(11), color: COLORS.textMuted, marginTop: 2 },
  pickerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  pickerOverlayModal: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 1000 },
  pickerOverlayBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)' },
  pickerContent: { backgroundColor: COLORS.background, borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), padding: scale(20), maxHeight: '60%' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(16) },
  pickerTitle: { fontSize: scale(18), fontWeight: '700', color: COLORS.textPrimary },
  typeItem: { flexDirection: 'row', alignItems: 'center', padding: scale(14), borderRadius: scale(10), marginBottom: scale(8), backgroundColor: COLORS.backgroundSecondary, gap: scale(12) },
  typeItemActive: { backgroundColor: COLORS.lime + '15', borderWidth: 1, borderColor: COLORS.lime },
  typeItemText: { flex: 1, fontSize: scale(15), color: COLORS.textSecondary },
  typeItemTextActive: { color: COLORS.lime, fontWeight: '600' },

  // ─── Route Map Overview ───
  routeMapContainer: { marginBottom: scale(16), borderRadius: scale(16), overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.backgroundSecondary },
  routeMapHeader: { flexDirection: 'row', alignItems: 'center', padding: scale(12), gap: scale(8), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  routeMapTitle: { fontSize: scale(14), fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  routeMapSubtitle: { fontSize: scale(12), color: COLORS.textSecondary },
  routeMap: { width: '100%', height: scale(220) },
  mapInfoOverlay: { flexDirection: 'row', alignItems: 'center', padding: scale(10), borderTopWidth: 1, borderTopColor: COLORS.border, gap: scale(8) },
  mapInfoDot: { width: scale(10), height: scale(10), borderRadius: scale(5) },
  mapInfoContent: { flex: 1 },
  mapInfoName: { fontSize: scale(13), fontWeight: '600', color: COLORS.textPrimary },
  mapInfoCoords: { fontSize: scale(11), color: COLORS.textMuted },
  mapInfoClose: { padding: scale(4) },

  // ─── Route Summary ───
  routeSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(12), padding: scale(14), marginBottom: scale(16), borderWidth: 1, borderColor: COLORS.border },
  routeSummaryItem: { alignItems: 'center' },
  routeSummaryValue: { fontSize: scale(20), fontWeight: '700', color: COLORS.lime },
  routeSummaryLabel: { fontSize: scale(11), color: COLORS.textSecondary, marginTop: scale(2) },
  routeSummaryDivider: { width: 1, height: scale(30), backgroundColor: COLORS.border },

  // ─── Enhanced Checkpoint Card ───
  distanceConnector: { flexDirection: 'row', alignItems: 'center', paddingVertical: scale(4), paddingHorizontal: scale(20) },
  connectorLine: { flex: 1, height: 1 },
  distanceBadge: { flexDirection: 'row', alignItems: 'center', gap: scale(4), paddingHorizontal: scale(10), paddingVertical: scale(3), backgroundColor: COLORS.backgroundTertiary, borderRadius: scale(10) },
  distanceText: { fontSize: scale(11), color: COLORS.textSecondary },

  checkpointCard: { backgroundColor: COLORS.backgroundTertiary, borderRadius: scale(14), padding: scale(14), marginBottom: scale(4), borderWidth: 1.5, borderColor: COLORS.border },
  checkpointHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(10) },
  checkpointNumber: { width: scale(38), height: scale(38), borderRadius: scale(19), alignItems: 'center', justifyContent: 'center', marginRight: scale(12) },
  checkpointNumberText: { fontSize: scale(16), fontWeight: '800', color: '#000000' },
  checkpointInfo: { flex: 1 },
  checkpointName: { fontSize: scale(15), fontWeight: '700', color: COLORS.textPrimary },
  checkpointDescription: { fontSize: scale(12), color: COLORS.textSecondary, marginTop: scale(2) },
  checkpointBadges: { flexDirection: 'row', gap: scale(4), flexWrap: 'wrap' },
  cpBadge: { paddingHorizontal: scale(6), paddingVertical: scale(3), borderRadius: scale(6) },
  cpBadgeText: { fontSize: scale(10), fontWeight: '600' },

  checkpointCoordRow: { flexDirection: 'row', gap: scale(8), marginBottom: scale(10), flexWrap: 'wrap' },
  coordChip: { flexDirection: 'row', alignItems: 'center', gap: scale(4), backgroundColor: COLORS.backgroundSecondary, paddingHorizontal: scale(8), paddingVertical: scale(5), borderRadius: scale(8) },
  coordChipText: { fontSize: scale(11), color: COLORS.textSecondary },

  checkpointActions: { flexDirection: 'row', gap: scale(6), borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: scale(10) },
  cpActionBtn: { width: scale(34), height: scale(34), borderRadius: scale(8), backgroundColor: COLORS.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
  cpActionBtnDisabled: { opacity: 0.3 },
  cpActionSpacer: { flex: 1 },

  // ─── Checkpoint Modal Badge ───
  cpModalBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundSecondary, padding: scale(14), borderRadius: scale(12), marginBottom: scale(8), gap: scale(12), borderWidth: 1, borderColor: COLORS.border },
  cpModalBadgeCircle: { width: scale(44), height: scale(44), borderRadius: scale(22), alignItems: 'center', justifyContent: 'center' },
  cpModalBadgeNumber: { fontSize: scale(18), fontWeight: '800', color: '#000000' },
  cpModalBadgeLabel: { fontSize: scale(14), fontWeight: '600', color: COLORS.textPrimary },
  cpModalBadgeHint: { fontSize: scale(12), color: COLORS.textSecondary, marginTop: scale(2) },

  // Checkpoints - general
  addCheckpointButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.teal, paddingVertical: scale(14), borderRadius: scale(12), gap: scale(8), marginBottom: scale(16) },
  addCheckpointButtonText: { fontSize: scale(15), fontWeight: '600', color: COLORS.background },
  emptyCheckpoints: { alignItems: 'center', paddingVertical: scale(40) },
  emptyCheckpointsIcon: { width: scale(80), height: scale(80), borderRadius: scale(40), backgroundColor: COLORS.backgroundSecondary, alignItems: 'center', justifyContent: 'center', marginBottom: scale(12) },
  emptyCheckpointsText: { fontSize: scale(16), fontWeight: '600', color: COLORS.textPrimary, marginTop: scale(4) },
  emptyCheckpointsSubtext: { fontSize: scale(13), color: COLORS.textMuted, textAlign: 'center', marginTop: scale(8), paddingHorizontal: scale(20), lineHeight: scale(20) },

  // Location button
  locationButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.blue, paddingVertical: scale(12), borderRadius: scale(10), gap: scale(8), marginBottom: scale(12) },
  locationButtonText: { fontSize: scale(14), fontWeight: '600', color: '#FFFFFF' },
  mapContainer: { marginBottom: scale(16), borderRadius: scale(12), overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  mapHeaderBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6), paddingVertical: scale(8), backgroundColor: COLORS.backgroundTertiary },
  mapHint: { fontSize: scale(12), color: COLORS.textSecondary },
  map: { width: '100%', height: scale(250) },
  coordsRow: { flexDirection: 'row', gap: scale(12) },
  coordInput: { flex: 1 },
  coordLabel: { fontSize: scale(12), fontWeight: '600', color: COLORS.textSecondary, marginBottom: scale(6) },

  // Schedules
  scheduleCard: { backgroundColor: COLORS.backgroundTertiary, borderRadius: scale(12), padding: scale(14), marginBottom: scale(10), flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  scheduleInfo: { flex: 1 },
  scheduleTime: { fontSize: scale(20), fontWeight: '700', color: COLORS.lime, marginBottom: scale(8) },
  scheduleDays: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(4), marginBottom: scale(6) },
  scheduleDayChip: { paddingHorizontal: scale(8), paddingVertical: scale(4), borderRadius: scale(4), backgroundColor: COLORS.backgroundSecondary },
  scheduleDayChipActive: { backgroundColor: COLORS.teal + '30' },
  scheduleDayText: { fontSize: scale(10), color: COLORS.textMuted, fontWeight: '600' },
  scheduleDayTextActive: { color: COLORS.teal },
  scheduleTolerance: { fontSize: scale(11), color: COLORS.textMuted },
  deleteScheduleBtn: { width: scale(40), height: scale(40), borderRadius: scale(8), backgroundColor: COLORS.danger + '20', alignItems: 'center', justifyContent: 'center' },
  daysContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
  dayButton: { paddingHorizontal: scale(16), paddingVertical: scale(12), borderRadius: scale(10), backgroundColor: COLORS.backgroundSecondary, borderWidth: 1, borderColor: COLORS.border },
  dayButtonActive: { backgroundColor: COLORS.teal + '20', borderColor: COLORS.teal },
  dayButtonText: { fontSize: scale(14), fontWeight: '600', color: COLORS.textSecondary },
  dayButtonTextActive: { color: COLORS.teal },

  // Info Note
  infoNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.teal + '15', padding: scale(16), borderRadius: scale(10), marginTop: scale(16), gap: scale(10) },
  infoNoteText: { flex: 1, fontSize: scale(13), color: COLORS.teal, lineHeight: scale(20) },
});