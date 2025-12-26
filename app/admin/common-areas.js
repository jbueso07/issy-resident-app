// app/admin/common-areas.js
// ISSY Resident App - Admin Common Areas Management (React Native)

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
const API_URL = 'https://api.joinissy.com/api';

// ==========================================
// CONSTANTS
// ==========================================

const CATEGORIES = [
  { id: 'pool', icon: '🏊', label: 'Piscina', color: '#3B82F6' },
  { id: 'gym', icon: '🏋️', label: 'Gimnasio', color: '#EF4444' },
  { id: 'court', icon: '🎾', label: 'Cancha', color: '#10B981' },
  { id: 'bbq', icon: '🍖', label: 'BBQ', color: '#F59E0B' },
  { id: 'salon', icon: '🎉', label: 'Salón', color: '#8B5CF6' },
  { id: 'playground', icon: '🛝', label: 'Juegos', color: '#EC4899' },
  { id: 'terrace', icon: '🌇', label: 'Terraza', color: '#6366F1' },
  { id: 'garden', icon: '🌳', label: 'Jardín', color: '#22C55E' },
  { id: 'parking', icon: '🅿️', label: 'Parking', color: '#64748B' },
  { id: 'other', icon: '📍', label: 'Otro', color: '#78716C' },
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

const COLORS = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  gray: '#6B7280',
  grayLight: '#F3F4F6',
  grayDark: '#374151',
  white: '#FFFFFF',
  black: '#111827',
  background: '#F9FAFB',
  border: '#E5E7EB',
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
    loadData();
  }, []);

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
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/common-areas`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

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

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    const locationId = isSuperAdmin ? form.location_id : profile?.location_id;
    if (!locationId) {
      Alert.alert('Error', 'Debes seleccionar una ubicación');
      return;
    }

    try {
      const payload = {
        location_id: locationId,
        name: form.name.trim(),
        type: form.category,
        description: form.description.trim() || null,
        capacity: parseInt(form.capacity) || 10,
        hourly_rate: form.is_paid ? parseFloat(form.price_per_hour) || 0 : 0,
        min_duration_hours: parseInt(form.min_hours) || 1,
        max_duration_hours: parseInt(form.max_hours) || 4,
        advance_booking_days: parseInt(form.max_advance_days) || 30,
        requires_approval: form.requires_approval,
        is_24_hours: form.is_24_hours,
        available_from: form.is_24_hours ? '00:00:00' : form.available_from + ':00',
        available_until: form.is_24_hours ? '23:59:00' : form.available_until + ':00',
        image_url: form.image_url || null,
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

      if (response.ok) {
        Alert.alert('Éxito', editingArea ? 'Área actualizada' : 'Área creada');
        setShowModal(false);
        resetForm();
        loadAreas();
        loadStats();
      } else {
        Alert.alert('Error', data.error || 'No se pudo guardar el área');
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
      max_advance_days: area.advance_booking_days?.toString() || '30',
      requires_approval: area.requires_approval || false,
      location_id: area.location_id || '',
      is_24_hours: area.is_24_hours || false,
      available_from: area.available_from?.substring(0, 5) || '08:00',
      available_until: area.available_until?.substring(0, 5) || '20:00',
      image_url: area.image_url || '',
    });
    setShowModal(true);
  };

  const handleDelete = (area) => {
    Alert.alert(
      'Eliminar área',
      `¿Estás seguro de eliminar "${area.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/common-areas/${area.id}`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (response.ok) {
                loadAreas();
                loadStats();
              } else {
                Alert.alert('Error', 'No se pudo eliminar el área');
              }
            } catch (error) {
              console.error('Error deleting area:', error);
              Alert.alert('Error', 'No se pudo eliminar el área');
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
      console.error('Error toggling area:', error);
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
      <SafeAreaView style={styles.container}>
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
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Áreas Comunes</Text>
          <Text style={styles.headerSubtitle}>Gestiona los espacios de tu comunidad</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            resetForm();
            setShowModal(true);
          }}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        {stats && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.statsContainer}
            contentContainerStyle={styles.statsContent}
          >
            <StatCard icon="🏢" label="Total áreas" value={stats.total_areas || 0} color={COLORS.primary} />
            <StatCard
              icon="📅"
              label="Reservas del mes"
              value={stats.total_reservations_this_month || 0}
              color={COLORS.success}
            />
            <StatCard
              icon="💰"
              label="Ingresos del mes"
              value={formatCurrency(stats.revenue_this_month)}
              color={COLORS.warning}
            />
            <StatCard
              icon="⏳"
              label="Pendientes"
              value={stats.pending_approvals || 0}
              color={COLORS.danger}
            />
          </ScrollView>
        )}

        {/* Areas List */}
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando áreas...</Text>
          </View>
        ) : areas.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏊</Text>
            <Text style={styles.emptyTitle}>No hay áreas comunes</Text>
            <Text style={styles.emptySubtitle}>Crea tu primera área para que los residentes puedan reservar</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => {
                resetForm();
                setShowModal(true);
              }}
            >
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
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingArea ? 'Editar área' : 'Nueva área'}</Text>
            <TouchableOpacity onPress={handleSubmit}>
              <Text style={styles.modalSave}>Guardar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Image */}
            <Text style={styles.sectionLabel}>📷 Imagen del área</Text>
            <TouchableOpacity
              style={styles.imagePickerContainer}
              onPress={pickImage}
              disabled={uploadingImage}
            >
              {form.image_url ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: form.image_url }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setForm((prev) => ({ ...prev, image_url: '' }))}
                  >
                    <Ionicons name="close-circle" size={28} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ) : uploadingImage ? (
                <View style={styles.imagePlaceholder}>
                  <ActivityIndicator color={COLORS.primary} />
                  <Text style={styles.imagePlaceholderText}>Subiendo imagen...</Text>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera" size={40} color={COLORS.gray} />
                  <Text style={styles.imagePlaceholderText}>Agregar imagen</Text>
                  <Text style={styles.imagePlaceholderHint}>JPG, PNG (máx. 5MB)</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Location (SuperAdmin only) */}
            {isSuperAdmin && (
              <>
                <Text style={styles.sectionLabel}>📍 Ubicación *</Text>
                <View style={styles.pickerContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                </View>
              </>
            )}

            {/* Name */}
            <Text style={styles.sectionLabel}>Nombre *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
              placeholder="Ej: Piscina principal"
              placeholderTextColor={COLORS.gray}
            />

            {/* Description */}
            <Text style={styles.sectionLabel}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(text) => setForm((prev) => ({ ...prev, description: text }))}
              placeholder="Describe el área..."
              placeholderTextColor={COLORS.gray}
              multiline
              numberOfLines={3}
            />

            {/* Category */}
            <Text style={styles.sectionLabel}>Categoría *</Text>
            <View style={styles.categoriesGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryItem,
                    form.category === cat.id && { borderColor: cat.color, backgroundColor: `${cat.color}15` },
                  ]}
                  onPress={() => setForm((prev) => ({ ...prev, category: cat.id }))}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Capacity */}
            <Text style={styles.sectionLabel}>👥 Capacidad (personas)</Text>
            <TextInput
              style={styles.input}
              value={form.capacity}
              onChangeText={(text) => setForm((prev) => ({ ...prev, capacity: text }))}
              keyboardType="number-pad"
              placeholder="10"
              placeholderTextColor={COLORS.gray}
            />

            {/* Is Paid */}
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>💵 Es de pago</Text>
                <Text style={styles.switchHint}>Cobra por hora de uso</Text>
              </View>
              <Switch
                value={form.is_paid}
                onValueChange={(value) => setForm((prev) => ({ ...prev, is_paid: value }))}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
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
                  placeholderTextColor={COLORS.gray}
                />
              </>
            )}

            {/* Requires Approval */}
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>✋ Requiere aprobación</Text>
                <Text style={styles.switchHint}>Las reservas deben ser aprobadas por un admin</Text>
              </View>
              <Switch
                value={form.requires_approval}
                onValueChange={(value) => setForm((prev) => ({ ...prev, requires_approval: value }))}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>

            {/* Schedule Section */}
            <View style={styles.scheduleSection}>
              <Text style={styles.scheduleSectionTitle}>🕐 Horario de Disponibilidad</Text>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>🌙 Disponible 24 horas</Text>
                </View>
                <Switch
                  value={form.is_24_hours}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, is_24_hours: value }))}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
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
                      placeholderTextColor={COLORS.gray}
                    />
                  </View>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>Cierre</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={form.available_until}
                      onChangeText={(text) => setForm((prev) => ({ ...prev, available_until: text }))}
                      placeholder="20:00"
                      placeholderTextColor={COLORS.gray}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Booking Rules */}
            <View style={styles.rulesSection}>
              <Text style={styles.rulesSectionTitle}>📋 Reglas de Reserva</Text>

              <View style={styles.rulesRow}>
                <View style={styles.ruleField}>
                  <Text style={styles.ruleLabel}>Mín. horas</Text>
                  <TextInput
                    style={styles.ruleInput}
                    value={form.min_hours}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, min_hours: text }))}
                    keyboardType="number-pad"
                    placeholder="1"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                <View style={styles.ruleField}>
                  <Text style={styles.ruleLabel}>Máx. horas</Text>
                  <TextInput
                    style={styles.ruleInput}
                    value={form.max_hours}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, max_hours: text }))}
                    keyboardType="number-pad"
                    placeholder="4"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                <View style={styles.ruleField}>
                  <Text style={styles.ruleLabel}>Días anticipación</Text>
                  <TextInput
                    style={styles.ruleInput}
                    value={form.max_advance_days}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, max_advance_days: text }))}
                    keyboardType="number-pad"
                    placeholder="30"
                    placeholderTextColor={COLORS.gray}
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
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
              <Text style={styles.modalCancel}>Cerrar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Horarios: {selectedArea?.name}</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.scheduleNote}>
              Configura horarios específicos por día. Si no configuras un día, se usará el horario general del área.
            </Text>

            {DAYS_OF_WEEK.map((day) => {
              const schedule = schedules.find((s) => s.day_of_week === day.id);
              return (
                <ScheduleRow
                  key={day.id}
                  day={day}
                  schedule={schedule}
                  areaId={selectedArea?.id}
                  token={token}
                  onSaved={() => loadSchedules(selectedArea?.id)}
                />
              );
            })}

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

const StatCard = ({ icon, label, value, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const AreaCard = ({ area, category, isSuperAdmin, onEdit, onDelete, onToggle, onSchedule, formatCurrency }) => (
  <View style={[styles.areaCard, !area.is_active && styles.areaCardInactive]}>
    {/* Image */}
    {area.image_url ? (
      <Image source={{ uri: area.image_url }} style={styles.areaImage} />
    ) : (
      <View style={[styles.areaImagePlaceholder, { backgroundColor: `${category.color}20` }]}>
        <Text style={styles.areaImageIcon}>{category.icon}</Text>
      </View>
    )}

    {/* Content */}
    <View style={styles.areaContent}>
      <View style={styles.areaHeader}>
        <View style={styles.areaHeaderLeft}>
          <View style={[styles.areaCategoryBadge, { backgroundColor: `${category.color}20` }]}>
            <Text style={styles.areaCategoryIcon}>{category.icon}</Text>
          </View>
          <View>
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
        <Text style={styles.areaLocation}>📍 {area.location.name}</Text>
      )}

      {area.description && <Text style={styles.areaDescription} numberOfLines={2}>{area.description}</Text>}

      {/* Info Badges */}
      <View style={styles.areaBadges}>
        <View style={styles.areaBadge}>
          <Text style={styles.areaBadgeText}>👥 {area.capacity || 10}</Text>
        </View>
        <View style={styles.areaBadge}>
          <Text style={styles.areaBadgeText}>⏱️ {area.min_duration_hours || 1}-{area.max_duration_hours || 4}h</Text>
        </View>
        {(area.hourly_rate || 0) > 0 && (
          <View style={[styles.areaBadge, styles.areaBadgeHighlight]}>
            <Text style={[styles.areaBadgeText, styles.areaBadgeTextHighlight]}>💵 {formatCurrency(area.hourly_rate)}</Text>
          </View>
        )}
        {area.requires_approval && (
          <View style={[styles.areaBadge, styles.areaBadgeHighlight]}>
            <Text style={[styles.areaBadgeText, styles.areaBadgeTextHighlight]}>✋ Aprobación</Text>
          </View>
        )}
      </View>

      {/* Schedule Info */}
      <Text style={styles.areaSchedule}>
        🕐 {area.is_24_hours ? '24 horas' : `${area.available_from?.substring(0, 5)} - ${area.available_until?.substring(0, 5)}`}
      </Text>

      {/* Actions */}
      <View style={styles.areaActions}>
        <TouchableOpacity style={styles.areaAction} onPress={onEdit}>
          <Text style={styles.areaActionText}>✏️ Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.areaAction} onPress={onSchedule}>
          <Text style={styles.areaActionText}>📅 Horarios</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.areaAction} onPress={onToggle}>
          <Text style={styles.areaActionText}>{area.is_active ? '⏸️' : '▶️'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.areaAction, styles.areaActionDanger]} onPress={onDelete}>
          <Text style={styles.areaActionText}>🗑️</Text>
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
        // Delete schedule
        if (schedule?.id) {
          await fetch(`${API_URL}/common-areas/${areaId}/schedules/${schedule.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } else {
        // Create/Update schedule
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
        onValueChange={(value) => {
          setIsEnabled(value);
        }}
        trackColor={{ false: COLORS.border, true: COLORS.success }}
      />
      <Text style={[styles.scheduleDay, isEnabled && styles.scheduleDayActive]}>{day.label}</Text>

      {isEnabled && (
        <>
          <TextInput
            style={styles.scheduleTimeInput}
            value={startTime}
            onChangeText={setStartTime}
            placeholder="08:00"
          />
          <Text style={styles.scheduleTimeSeparator}>-</Text>
          <TextInput
            style={styles.scheduleTimeInput}
            value={endTime}
            onChangeText={setEndTime}
            placeholder="20:00"
          />
          <TouchableOpacity style={styles.scheduleSaveButton} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="checkmark" size={18} color={COLORS.white} />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
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
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.gray,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 16,
  },

  // Stats
  statsContainer: {
    marginTop: 16,
  },
  statsContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    minWidth: 140,
    borderLeftWidth: 4,
    marginRight: 12,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.black,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },

  // Areas Grid
  areasGrid: {
    padding: 16,
    gap: 16,
  },
  areaCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  areaCardInactive: {
    opacity: 0.6,
  },
  areaImage: {
    width: '100%',
    height: 160,
  },
  areaImagePlaceholder: {
    width: '100%',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaImageIcon: {
    fontSize: 64,
    opacity: 0.5,
  },
  areaContent: {
    padding: 16,
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  areaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  areaCategoryBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaCategoryIcon: {
    fontSize: 20,
  },
  areaName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  areaCategoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  areaStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
  },
  areaStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusActiveText: {
    color: '#065F46',
  },
  statusInactiveText: {
    color: '#DC2626',
  },
  areaLocation: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 8,
  },
  areaDescription: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18,
    marginBottom: 12,
  },
  areaBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  areaBadge: {
    backgroundColor: COLORS.grayLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  areaBadgeHighlight: {
    backgroundColor: '#FEF3C7',
  },
  areaBadgeText: {
    fontSize: 12,
    color: COLORS.grayDark,
  },
  areaBadgeTextHighlight: {
    color: '#92400E',
  },
  areaSchedule: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 12,
  },
  areaActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginTop: 4,
  },
  areaAction: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: COLORS.grayLight,
    borderRadius: 8,
    alignItems: 'center',
  },
  areaActionDanger: {
    backgroundColor: '#FEE2E2',
  },
  areaActionText: {
    fontSize: 12,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.black,
  },
  modalCancel: {
    fontSize: 16,
    color: COLORS.gray,
  },
  modalSave: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.grayDark,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.black,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    marginBottom: 8,
  },
  locationChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.grayLight,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  locationChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  locationChipText: {
    fontSize: 14,
    color: COLORS.grayDark,
  },
  locationChipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryItem: {
    width: (SCREEN_WIDTH - 64) / 5,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.grayLight,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 10,
    color: COLORS.grayDark,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  switchLabel: {
    fontSize: 15,
    color: COLORS.black,
    fontWeight: '500',
  },
  switchHint: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  scheduleSection: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  scheduleSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 4,
  },
  timeInput: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.black,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rulesSection: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  rulesSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.grayDark,
    marginBottom: 12,
  },
  rulesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ruleField: {
    flex: 1,
  },
  ruleLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginBottom: 4,
  },
  ruleInput: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.black,
    textAlign: 'center',
  },

  // Image picker
  imagePickerContainer: {
    marginBottom: 8,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.white,
    borderRadius: 14,
  },
  imagePlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '500',
    marginTop: 8,
  },
  imagePlaceholderHint: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },

  // Schedule Modal
  scheduleNote: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 16,
    lineHeight: 18,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.grayLight,
    borderRadius: 10,
    marginBottom: 8,
    gap: 12,
  },
  scheduleRowActive: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  scheduleDay: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
  },
  scheduleDayActive: {
    color: '#166534',
  },
  scheduleTimeInput: {
    width: 70,
    backgroundColor: COLORS.white,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scheduleTimeSeparator: {
    color: COLORS.gray,
  },
  scheduleSaveButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});