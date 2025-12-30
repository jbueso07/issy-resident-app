// app/admin/common-areas.js
// ISSY Resident App - Admin Common Areas Management (ProHome Dark Theme)

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Switch,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const API_URL = 'https://api.joinissy.com/api';

// ==========================================
// CONSTANTS
// ==========================================

const CATEGORIES = [
  { id: 'pool', icon: 'water', label: 'Piscina', color: '#3B82F6' },
  { id: 'gym', icon: 'barbell', label: 'Gimnasio', color: '#EF4444' },
  { id: 'court', icon: 'tennisball', label: 'Cancha', color: '#10B981' },
  { id: 'bbq', icon: 'flame', label: 'BBQ', color: '#F59E0B' },
  { id: 'salon', icon: 'sparkles', label: 'Salón', color: '#8B5CF6' },
  { id: 'playground', icon: 'happy', label: 'Juegos', color: '#EC4899' },
  { id: 'terrace', icon: 'sunny', label: 'Terraza', color: '#6366F1' },
  { id: 'garden', icon: 'leaf', label: 'Jardín', color: '#22C55E' },
  { id: 'parking', icon: 'car', label: 'Parking', color: '#64748B' },
  { id: 'other', icon: 'location', label: 'Otro', color: '#78716C' },
];

const DAYS_OF_WEEK = [
  { id: 0, label: 'Domingo', short: 'Dom' },
  { id: 1, label: 'Lunes', short: 'Lun' },
  { id: 2, label: 'Martes', short: 'Mar' },
  { id: 3, label: 'Miércoles', short: 'Mié' },
  { id: 4, label: 'Jueves', short: 'Jue' },
  { id: 5, label: 'Viernes', short: 'Vie' },
  { id: 6, label: 'Sábado', short: 'Sáb' },
];

// ProHome Dark Theme Colors
const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  card: 'rgba(255, 255, 255, 0.05)',
  lime: '#D4FE48',
  teal: '#5DDED8',
  cyan: '#00E5FF',
  purple: '#6366F1',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  border: 'rgba(255,255,255,0.1)',
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function AdminCommonAreas() {
  const router = useRouter();
  const { user, profile, token } = useAuth();

  // State
  const [areas, setAreas] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [schedules, setSchedules] = useState([]);

  // Image upload
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state
  const [form, setForm] = useState(getInitialForm());

  // Permissions
  const isSuperAdmin = profile?.role === 'superadmin';
  const isAdmin = ['admin', 'superadmin'].includes(profile?.role);

  // ==========================================
  // INITIAL FORM
  // ==========================================

  function getInitialForm() {
    return {
      name: '',
      description: '',
      category: 'other',
      is_paid: false,
      price_per_hour: '',
      capacity: '10',
      min_hours: '1',
      max_hours: '4',
      max_advance_days: '30',
      requires_approval: false,
      location_id: profile?.location_id || '',
      is_24_hours: false,
      available_from: '08:00',
      available_until: '20:00',
      image_url: '',
    };
  }

  // ==========================================
  // DATA LOADING
  // ==========================================

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    await Promise.all([
      loadAreas(),
      loadStats(),
      isSuperAdmin ? loadLocations() : Promise.resolve(),
    ]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const loadAreas = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/common-areas`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      console.log('Areas response:', data);
      if (data.success || response.ok) {
        setAreas(data.data || data || []);
      }
    } catch (error) {
      console.error('Error loading areas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/locations`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success || response.ok) {
        setLocations(data.data || data || []);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const loadStats = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/common-areas/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success || response.ok) {
        setStats(data.data || data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadSchedules = async (areaId) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/common-areas/${areaId}/schedules`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success || response.ok) {
        setSchedules(data.data || data || []);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
      setSchedules([]);
    }
  };

  // ==========================================
  // IMAGE HANDLING
  // ==========================================

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para subir imágenes.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      console.log('ImagePicker result:', result);

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const uploadImage = async (uri) => {
    try {
      setUploadingImage(true);

      const formData = new FormData();
      formData.append('image', {
        uri,
        type: 'image/jpeg',
        name: 'area-image.jpg',
      });

      const response = await fetch(`${API_URL}/upload/common-area-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setForm((prev) => ({ ...prev, image_url: data.data.url }));
      } else {
        Alert.alert('Error', data.error || 'No se pudo subir la imagen');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'No se pudo subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  // ==========================================
  // CRUD OPERATIONS
  // ==========================================

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    try {
      const payload = {
        name: form.name,
        description: form.description,
        type: form.category,
        capacity: parseInt(form.capacity) || 10,
        hourly_rate: form.is_paid ? parseFloat(form.price_per_hour) || 0 : 0,
        min_duration_hours: parseInt(form.min_hours) || 1,
        max_duration_hours: parseInt(form.max_hours) || 4,
        max_advance_days: parseInt(form.max_advance_days) || 30,
        requires_approval: form.requires_approval,
        location_id: form.location_id || profile?.location_id,
        is_24_hours: form.is_24_hours,
        available_from: form.available_from,
        available_until: form.available_until,
        image_url: form.image_url,
        is_active: true,
      };

      const url = editingArea
        ? `${API_URL}/common-areas/${editingArea.id}`
        : `${API_URL}/common-areas`;

      const response = await fetch(url, {
        method: editingArea ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success || response.ok) {
        Alert.alert('Éxito', editingArea ? 'Área actualizada' : 'Área creada');
        setShowModal(false);
        resetForm();
        loadAreas();
      } else {
        Alert.alert('Error', data.error || 'No se pudo guardar');
      }
    } catch (error) {
      console.error('Error saving area:', error);
      Alert.alert('Error', 'No se pudo guardar el área');
    }
  };

  const handleEdit = (area) => {
    setEditingArea(area);
    setForm({
      name: area.name || '',
      description: area.description || '',
      category: area.type || 'other',
      is_paid: (area.hourly_rate || 0) > 0,
      price_per_hour: area.hourly_rate?.toString() || '',
      capacity: area.capacity?.toString() || '10',
      min_hours: area.min_duration_hours?.toString() || '1',
      max_hours: area.max_duration_hours?.toString() || '4',
      max_advance_days: area.max_advance_days?.toString() || '30',
      requires_approval: area.requires_approval || false,
      location_id: area.location_id || '',
      is_24_hours: area.is_24_hours || false,
      available_from: area.available_from || '08:00',
      available_until: area.available_until || '20:00',
      image_url: area.image_url || '',
    });
    setShowModal(true);
  };

  const handleDelete = (area) => {
    Alert.alert(
      'Eliminar Área',
      `¿Estás seguro de eliminar "${area.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/common-areas/${area.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });

              if (response.ok) {
                Alert.alert('Éxito', 'Área eliminada');
                loadAreas();
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (area) => {
    try {
      const response = await fetch(`${API_URL}/common-areas/${area.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !area.is_active }),
      });

      if (response.ok) {
        loadAreas();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar');
    }
  };

  const handleManageSchedule = async (area) => {
    setSelectedArea(area);
    await loadSchedules(area.id);
    setShowScheduleModal(true);
  };

  const resetForm = () => {
    setEditingArea(null);
    setForm(getInitialForm());
  };

  // ==========================================
  // HELPERS
  // ==========================================

  const getCategoryInfo = (categoryId) => {
    return CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[CATEGORIES.length - 1];
  };

  const formatCurrency = (amount) => {
    return `L ${parseFloat(amount || 0).toFixed(2)}`;
  };

  // ==========================================
  // RENDER
  // ==========================================

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>No tienes permisos para ver esta página</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Áreas Comunes</Text>
          <Text style={styles.headerSubtitle}>Gestiona los espacios</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            resetForm();
            setShowModal(true);
          }}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={COLORS.lime}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="business" size={24} color={COLORS.purple} />
              <Text style={styles.statValue}>{stats.total_areas || 0}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="calendar" size={24} color={COLORS.success} />
              <Text style={[styles.statValue, { color: COLORS.success }]}>
                {stats.total_reservations_this_month || 0}
              </Text>
              <Text style={styles.statLabel}>Reservas</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="hourglass" size={24} color={COLORS.warning} />
              <Text style={[styles.statValue, { color: COLORS.warning }]}>
                {stats.pending_approvals || 0}
              </Text>
              <Text style={styles.statLabel}>Pendientes</Text>
            </View>
          </View>
        )}

        {/* Areas List */}
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.lime} />
            <Text style={styles.loadingText}>Cargando áreas...</Text>
          </View>
        ) : areas.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="water-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No hay áreas comunes</Text>
            <Text style={styles.emptySubtitle}>Crea tu primera área para que los residentes puedan reservar</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => {
                resetForm();
                setShowModal(true);
              }}
            >
              <Ionicons name="add-circle" size={20} color={COLORS.background} />
              <Text style={styles.emptyButtonText}>Crear área</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.areasGrid}>
            {areas.map((area) => (
              <AreaCard
                key={area.id}
                area={area}
                category={getCategoryInfo(area.type)}
                isSuperAdmin={isSuperAdmin}
                onEdit={() => handleEdit(area)}
                onDelete={() => handleDelete(area)}
                onToggle={() => handleToggleActive(area)}
                onSchedule={() => handleManageSchedule(area)}
                formatCurrency={formatCurrency}
              />
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingArea ? 'Editar' : 'Nueva'} Área</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.modalSave}>Guardar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Image Picker */}
            <Text style={styles.sectionLabel}>Imagen</Text>
            <TouchableOpacity onPress={pickImage} disabled={uploadingImage}>
              {uploadingImage ? (
                <View style={styles.imagePlaceholder}>
                  <ActivityIndicator color={COLORS.lime} />
                  <Text style={styles.imagePlaceholderText}>Subiendo...</Text>
                </View>
              ) : form.image_url ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: form.image_url }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setForm((prev) => ({ ...prev, image_url: '' }))}
                  >
                    <Ionicons name="close-circle" size={28} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={40} color={COLORS.textMuted} />
                  <Text style={styles.imagePlaceholderText}>Agregar imagen</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Location (SuperAdmin only) */}
            {isSuperAdmin && (
              <>
                <Text style={styles.sectionLabel}>Ubicación</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerContainer}>
                  {locations.map((loc) => (
                    <TouchableOpacity
                      key={loc.id}
                      style={[
                        styles.locationChip,
                        form.location_id === loc.id && styles.locationChipActive,
                      ]}
                      onPress={() => setForm((prev) => ({ ...prev, location_id: loc.id }))}
                    >
                      <Text
                        style={[
                          styles.locationChipText,
                          form.location_id === loc.id && styles.locationChipTextActive,
                        ]}
                      >
                        {loc.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Name */}
            <Text style={styles.sectionLabel}>Nombre *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
              placeholder="Ej: Piscina principal"
              placeholderTextColor={COLORS.textMuted}
            />

            {/* Description */}
            <Text style={styles.sectionLabel}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(text) => setForm((prev) => ({ ...prev, description: text }))}
              placeholder="Describe el área..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
            />

            {/* Category */}
            <Text style={styles.sectionLabel}>Categoría</Text>
            <View style={styles.categoriesGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryItem,
                    form.category === cat.id && { borderColor: cat.color, backgroundColor: `${cat.color}30` },
                  ]}
                  onPress={() => setForm((prev) => ({ ...prev, category: cat.id }))}
                >
                  <Ionicons name={cat.icon} size={20} color={form.category === cat.id ? cat.color : COLORS.textMuted} />
                  <Text style={[styles.categoryLabel, form.category === cat.id && { color: cat.color }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Capacity */}
            <Text style={styles.sectionLabel}>Capacidad (personas)</Text>
            <TextInput
              style={styles.input}
              value={form.capacity}
              onChangeText={(text) => setForm((prev) => ({ ...prev, capacity: text }))}
              keyboardType="number-pad"
              placeholder="10"
              placeholderTextColor={COLORS.textMuted}
            />

            {/* Is Paid */}
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Ionicons name="cash" size={20} color={form.is_paid ? COLORS.lime : COLORS.textMuted} />
                <View>
                  <Text style={styles.switchLabel}>Es de pago</Text>
                  <Text style={styles.switchHint}>Cobra por hora de uso</Text>
                </View>
              </View>
              <Switch
                value={form.is_paid}
                onValueChange={(value) => setForm((prev) => ({ ...prev, is_paid: value }))}
                trackColor={{ false: COLORS.backgroundTertiary, true: COLORS.lime + '50' }}
                thumbColor={form.is_paid ? COLORS.lime : COLORS.textMuted}
              />
            </View>

            {form.is_paid && (
              <>
                <Text style={styles.sectionLabel}>Precio por hora (L)</Text>
                <TextInput
                  style={styles.input}
                  value={form.price_per_hour}
                  onChangeText={(text) => setForm((prev) => ({ ...prev, price_per_hour: text }))}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                />
              </>
            )}

            {/* Requires Approval */}
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Ionicons name="hand-left" size={20} color={form.requires_approval ? COLORS.warning : COLORS.textMuted} />
                <View>
                  <Text style={styles.switchLabel}>Requiere aprobación</Text>
                  <Text style={styles.switchHint}>Las reservas deben ser aprobadas</Text>
                </View>
              </View>
              <Switch
                value={form.requires_approval}
                onValueChange={(value) => setForm((prev) => ({ ...prev, requires_approval: value }))}
                trackColor={{ false: COLORS.backgroundTertiary, true: COLORS.warning + '50' }}
                thumbColor={form.requires_approval ? COLORS.warning : COLORS.textMuted}
              />
            </View>

            {/* Schedule Section */}
            <View style={styles.scheduleSection}>
              <Text style={styles.scheduleSectionTitle}>Horario de Disponibilidad</Text>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Ionicons name="moon" size={20} color={form.is_24_hours ? COLORS.teal : COLORS.textMuted} />
                  <Text style={styles.switchLabel}>Disponible 24 horas</Text>
                </View>
                <Switch
                  value={form.is_24_hours}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, is_24_hours: value }))}
                  trackColor={{ false: COLORS.backgroundTertiary, true: COLORS.teal + '50' }}
                  thumbColor={form.is_24_hours ? COLORS.teal : COLORS.textMuted}
                />
              </View>

              {!form.is_24_hours && (
                <View style={styles.timeRow}>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>Apertura</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={form.available_from}
                      onChangeText={(text) => setForm((prev) => ({ ...prev, available_from: text }))}
                      placeholder="08:00"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>Cierre</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={form.available_until}
                      onChangeText={(text) => setForm((prev) => ({ ...prev, available_until: text }))}
                      placeholder="20:00"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Rules Section */}
            <View style={styles.rulesSection}>
              <Text style={styles.rulesSectionTitle}>Reglas de Reserva</Text>
              <View style={styles.rulesRow}>
                <View style={styles.ruleField}>
                  <Text style={styles.ruleLabel}>Mínimo (hrs)</Text>
                  <TextInput
                    style={styles.ruleInput}
                    value={form.min_hours}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, min_hours: text }))}
                    keyboardType="number-pad"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
                <View style={styles.ruleField}>
                  <Text style={styles.ruleLabel}>Máximo (hrs)</Text>
                  <TextInput
                    style={styles.ruleInput}
                    value={form.max_hours}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, max_hours: text }))}
                    keyboardType="number-pad"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
                <View style={styles.ruleField}>
                  <Text style={styles.ruleLabel}>Anticipación (días)</Text>
                  <TextInput
                    style={styles.ruleInput}
                    value={form.max_advance_days}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, max_advance_days: text }))}
                    keyboardType="number-pad"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Schedule Modal */}
      <Modal visible={showScheduleModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
              <Text style={styles.modalCancel}>Cerrar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Horarios</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.scheduleNote}>
              Configura los horarios específicos para cada día. Los días desactivados no permitirán reservas.
            </Text>

            {DAYS_OF_WEEK.map((day) => (
              <ScheduleRow
                key={day.id}
                day={day}
                schedule={schedules.find((s) => s.day_of_week === day.id)}
                areaId={selectedArea?.id}
                token={token}
                onSaved={() => loadSchedules(selectedArea?.id)}
              />
            ))}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ==========================================
// SUB COMPONENTS
// ==========================================

const AreaCard = ({ area, category, isSuperAdmin, onEdit, onDelete, onToggle, onSchedule, formatCurrency }) => (
  <View style={[styles.areaCard, !area.is_active && styles.areaCardInactive]}>
    {/* Image */}
    {area.image_url ? (
      <Image source={{ uri: area.image_url }} style={styles.areaImage} />
    ) : (
      <View style={[styles.areaImagePlaceholder, { backgroundColor: `${category.color}20` }]}>
        <Ionicons name={category.icon} size={48} color={category.color} style={{ opacity: 0.6 }} />
      </View>
    )}

    {/* Content */}
    <View style={styles.areaContent}>
      <View style={styles.areaHeader}>
        <View style={styles.areaHeaderLeft}>
          <View style={[styles.areaCategoryBadge, { backgroundColor: `${category.color}30` }]}>
            <Ionicons name={category.icon} size={18} color={category.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.areaName}>{area.name}</Text>
            <Text style={[styles.areaCategoryLabel, { color: category.color }]}>{category.label}</Text>
          </View>
        </View>
        <View style={[styles.areaStatusBadge, area.is_active ? styles.statusActive : styles.statusInactive]}>
          <Text style={[styles.areaStatusText, area.is_active ? styles.statusActiveText : styles.statusInactiveText]}>
            {area.is_active ? 'Activo' : 'Inactivo'}
          </Text>
        </View>
      </View>

      {isSuperAdmin && area.location && (
        <View style={styles.areaLocationRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.areaLocation}>{area.location.name}</Text>
        </View>
      )}

      {/* Info Badges */}
      <View style={styles.areaBadges}>
        <View style={styles.areaBadge}>
          <Ionicons name="people" size={14} color={COLORS.textSecondary} />
          <Text style={styles.areaBadgeText}>{area.capacity || 10}</Text>
        </View>
        <View style={styles.areaBadge}>
          <Ionicons name="time" size={14} color={COLORS.textSecondary} />
          <Text style={styles.areaBadgeText}>{area.min_duration_hours || 1}-{area.max_duration_hours || 4}h</Text>
        </View>
        {(area.hourly_rate || 0) > 0 && (
          <View style={[styles.areaBadge, styles.areaBadgeHighlight]}>
            <Ionicons name="cash" size={14} color={COLORS.warning} />
            <Text style={[styles.areaBadgeText, { color: COLORS.warning }]}>{formatCurrency(area.hourly_rate)}</Text>
          </View>
        )}
      </View>

      {/* Schedule Info */}
      <View style={styles.areaScheduleRow}>
        <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
        <Text style={styles.areaSchedule}>
          {area.is_24_hours ? '24 horas' : `${area.available_from?.substring(0, 5)} - ${area.available_until?.substring(0, 5)}`}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.areaActions}>
        <TouchableOpacity style={styles.areaAction} onPress={onEdit}>
          <Ionicons name="pencil" size={16} color={COLORS.teal} />
          <Text style={[styles.areaActionText, { color: COLORS.teal }]}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.areaAction} onPress={onSchedule}>
          <Ionicons name="calendar" size={16} color={COLORS.purple} />
          <Text style={[styles.areaActionText, { color: COLORS.purple }]}>Horarios</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.areaActionIcon} onPress={onToggle}>
          <Ionicons name={area.is_active ? 'pause' : 'play'} size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.areaActionIcon, styles.areaActionDanger]} onPress={onDelete}>
          <Ionicons name="trash" size={18} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const ScheduleRow = ({ day, schedule, areaId, token, onSaved }) => {
  const [isEnabled, setIsEnabled] = useState(!!schedule);
  const [startTime, setStartTime] = useState(schedule?.start_time?.substring(0, 5) || '08:00');
  const [endTime, setEndTime] = useState(schedule?.end_time?.substring(0, 5) || '20:00');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!areaId) return;

    try {
      setSaving(true);

      if (!isEnabled) {
        if (schedule?.id) {
          await fetch(`${API_URL}/common-areas/${areaId}/schedules/${schedule.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } else {
        const payload = {
          day_of_week: day.id,
          start_time: startTime,
          end_time: endTime,
          block_duration_minutes: 60,
        };

        const url = schedule?.id
          ? `${API_URL}/common-areas/${areaId}/schedules/${schedule.id}`
          : `${API_URL}/common-areas/${areaId}/schedules`;

        await fetch(url, {
          method: schedule?.id ? 'PUT' : 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      onSaved?.();
    } catch (error) {
      console.error('Error saving schedule:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.scheduleRow, isEnabled && styles.scheduleRowActive]}>
      <Switch
        value={isEnabled}
        onValueChange={(value) => setIsEnabled(value)}
        trackColor={{ false: COLORS.backgroundTertiary, true: COLORS.success + '50' }}
        thumbColor={isEnabled ? COLORS.success : COLORS.textMuted}
      />
      <Text style={[styles.scheduleDay, isEnabled && styles.scheduleDayActive]}>{day.label}</Text>

      {isEnabled && (
        <>
          <TextInput
            style={styles.scheduleTimeInput}
            value={startTime}
            onChangeText={setStartTime}
            placeholder="08:00"
            placeholderTextColor={COLORS.textMuted}
          />
          <Text style={styles.scheduleTimeSeparator}>-</Text>
          <TextInput
            style={styles.scheduleTimeInput}
            value={endTime}
            onChangeText={setEndTime}
            placeholder="20:00"
            placeholderTextColor={COLORS.textMuted}
          />
          <TouchableOpacity style={styles.scheduleSaveButton} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.textPrimary} />
            ) : (
              <Ionicons name="checkmark" size={18} color={COLORS.textPrimary} />
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: scale(12),
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  addButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(40),
  },
  loadingText: {
    marginTop: scale(12),
    color: COLORS.textSecondary,
    fontSize: scale(14),
  },
  errorText: {
    color: COLORS.danger,
    fontSize: scale(16),
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    gap: scale(10),
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(14),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: scale(22),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: scale(6),
  },
  statLabel: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: scale(40),
    marginTop: scale(40),
  },
  emptyTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: scale(16),
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: scale(8),
    marginBottom: scale(24),
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: COLORS.lime,
    paddingHorizontal: scale(24),
    paddingVertical: scale(12),
    borderRadius: scale(12),
  },
  emptyButtonText: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: scale(14),
  },

  // Areas Grid
  areasGrid: {
    padding: scale(16),
  },
  areaCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(16),
    overflow: 'hidden',
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  areaCardInactive: {
    opacity: 0.6,
  },
  areaImage: {
    width: '100%',
    height: scale(160),
  },
  areaImagePlaceholder: {
    width: '100%',
    height: scale(140),
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaContent: {
    padding: scale(16),
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(10),
  },
  areaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    flex: 1,
  },
  areaCategoryBadge: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaName: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  areaCategoryLabel: {
    fontSize: scale(12),
    fontWeight: '500',
    marginTop: scale(2),
  },
  areaStatusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  statusActive: {
    backgroundColor: COLORS.success + '30',
  },
  statusInactive: {
    backgroundColor: COLORS.danger + '30',
  },
  areaStatusText: {
    fontSize: scale(11),
    fontWeight: '600',
  },
  statusActiveText: {
    color: COLORS.success,
  },
  statusInactiveText: {
    color: COLORS.danger,
  },
  areaLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginBottom: scale(8),
  },
  areaLocation: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  areaBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: scale(10),
  },
  areaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: COLORS.backgroundTertiary,
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(8),
  },
  areaBadgeHighlight: {
    backgroundColor: COLORS.warning + '20',
  },
  areaBadgeText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  areaScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: scale(12),
  },
  areaSchedule: {
    fontSize: scale(12),
    color: COLORS.textMuted,
  },
  areaActions: {
    flexDirection: 'row',
    gap: scale(8),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: scale(12),
  },
  areaAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingVertical: scale(10),
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(10),
  },
  areaActionIcon: {
    width: scale(42),
    paddingVertical: scale(10),
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaActionDanger: {
    backgroundColor: COLORS.danger + '20',
  },
  areaActionText: {
    fontSize: scale(12),
    fontWeight: '500',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: scale(17),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalCancel: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
  },
  modalSave: {
    fontSize: scale(15),
    color: COLORS.lime,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: scale(16),
  },
  sectionLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
    marginTop: scale(16),
  },
  input: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    fontSize: scale(15),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: scale(80),
    textAlignVertical: 'top',
  },
  pickerContainer: {
    marginBottom: scale(8),
  },
  locationChip: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(20),
    marginRight: scale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationChipActive: {
    borderColor: COLORS.lime,
    backgroundColor: COLORS.lime + '20',
  },
  locationChipText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  locationChipTextActive: {
    color: COLORS.lime,
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  categoryItem: {
    width: (SCREEN_WIDTH - scale(64)) / 5,
    paddingVertical: scale(12),
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryLabel: {
    fontSize: scale(10),
    color: COLORS.textSecondary,
    marginTop: scale(4),
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  switchLabel: {
    fontSize: scale(15),
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  switchHint: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginTop: scale(2),
  },
  scheduleSection: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginTop: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scheduleSectionTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.teal,
    marginBottom: scale(12),
  },
  timeRow: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: scale(12),
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginBottom: scale(4),
  },
  timeInput: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(8),
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    fontSize: scale(15),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rulesSection: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginTop: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rulesSectionTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(12),
  },
  rulesRow: {
    flexDirection: 'row',
    gap: scale(12),
  },
  ruleField: {
    flex: 1,
  },
  ruleLabel: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
    marginBottom: scale(4),
  },
  ruleInput: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(8),
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    fontSize: scale(15),
    color: COLORS.textPrimary,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Image picker
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: scale(180),
    borderRadius: scale(12),
  },
  removeImageButton: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    backgroundColor: COLORS.background,
    borderRadius: scale(14),
  },
  imagePlaceholder: {
    width: '100%',
    height: scale(140),
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: scale(14),
    color: COLORS.textMuted,
    fontWeight: '500',
    marginTop: scale(8),
  },

  // Schedule Modal
  scheduleNote: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginBottom: scale(16),
    lineHeight: scale(18),
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(12),
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    marginBottom: scale(8),
    gap: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scheduleRowActive: {
    backgroundColor: COLORS.success + '15',
    borderColor: COLORS.success + '50',
  },
  scheduleDay: {
    flex: 1,
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  scheduleDayActive: {
    color: COLORS.success,
  },
  scheduleTimeInput: {
    width: scale(70),
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(6),
    paddingHorizontal: scale(10),
    paddingVertical: scale(8),
    fontSize: scale(14),
    textAlign: 'center',
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scheduleTimeSeparator: {
    color: COLORS.textSecondary,
  },
  scheduleSaveButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(6),
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});