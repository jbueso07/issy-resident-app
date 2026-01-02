// app/admin/common-areas.js
// ISSY Resident App - Admin Common Areas Management (ProHome Dark Theme) + i18n

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
import { useTranslation } from '../../src/hooks/useTranslation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const API_URL = 'https://api.joinissy.com/api';

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

export default function AdminCommonAreas() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile, token } = useAuth();

  // Categories with translations
  const CATEGORIES = [
    { id: 'pool', icon: 'water', label: t('admin.commonAreas.categories.pool'), color: '#3B82F6' },
    { id: 'gym', icon: 'barbell', label: t('admin.commonAreas.categories.gym'), color: '#EF4444' },
    { id: 'court', icon: 'tennisball', label: t('admin.commonAreas.categories.court'), color: '#10B981' },
    { id: 'bbq', icon: 'flame', label: t('admin.commonAreas.categories.bbq'), color: '#F59E0B' },
    { id: 'salon', icon: 'sparkles', label: t('admin.commonAreas.categories.salon'), color: '#8B5CF6' },
    { id: 'playground', icon: 'happy', label: t('admin.commonAreas.categories.playground'), color: '#EC4899' },
    { id: 'terrace', icon: 'sunny', label: t('admin.commonAreas.categories.terrace'), color: '#6366F1' },
    { id: 'garden', icon: 'leaf', label: t('admin.commonAreas.categories.garden'), color: '#22C55E' },
    { id: 'parking', icon: 'car', label: t('admin.commonAreas.categories.parking'), color: '#64748B' },
    { id: 'other', icon: 'location', label: t('admin.commonAreas.categories.other'), color: '#78716C' },
  ];

  // Days of week with translations
  const DAYS_OF_WEEK = [
    { id: 0, label: t('admin.commonAreas.days.sunday'), short: t('admin.commonAreas.daysShort.sun') },
    { id: 1, label: t('admin.commonAreas.days.monday'), short: t('admin.commonAreas.daysShort.mon') },
    { id: 2, label: t('admin.commonAreas.days.tuesday'), short: t('admin.commonAreas.daysShort.tue') },
    { id: 3, label: t('admin.commonAreas.days.wednesday'), short: t('admin.commonAreas.daysShort.wed') },
    { id: 4, label: t('admin.commonAreas.days.thursday'), short: t('admin.commonAreas.daysShort.thu') },
    { id: 5, label: t('admin.commonAreas.days.friday'), short: t('admin.commonAreas.daysShort.fri') },
    { id: 6, label: t('admin.commonAreas.days.saturday'), short: t('admin.commonAreas.daysShort.sat') },
  ];

  // State
  const [areas, setAreas] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState(getInitialForm());

  const isSuperAdmin = profile?.role === 'superadmin';
  const isAdmin = ['admin', 'superadmin'].includes(profile?.role);

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

  useEffect(() => {
    if (token) loadData();
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
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/locations`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(t('admin.commonAreas.permissionRequired'), t('admin.commonAreas.photoPermission'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('common.error'), t('admin.commonAreas.errors.imageSelectFailed'));
    }
  };

  const uploadImage = async (uri) => {
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', { uri, type: 'image/jpeg', name: 'area-image.jpg' });
      const response = await fetch(`${API_URL}/upload/common-area-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        body: formData,
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setForm((prev) => ({ ...prev, image_url: data.data.url }));
      } else {
        Alert.alert(t('common.error'), data.error || t('admin.commonAreas.errors.imageUploadFailed'));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert(t('common.error'), t('admin.commonAreas.errors.imageUploadFailed'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert(t('common.error'), t('admin.commonAreas.errors.nameRequired'));
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
      const url = editingArea ? `${API_URL}/common-areas/${editingArea.id}` : `${API_URL}/common-areas`;
      const response = await fetch(url, {
        method: editingArea ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success || response.ok) {
        Alert.alert(t('common.success'), editingArea ? t('admin.commonAreas.success.updated') : t('admin.commonAreas.success.created'));
        setShowModal(false);
        resetForm();
        loadAreas();
      } else {
        Alert.alert(t('common.error'), data.error || t('admin.commonAreas.errors.saveFailed'));
      }
    } catch (error) {
      console.error('Error saving area:', error);
      Alert.alert(t('common.error'), t('admin.commonAreas.errors.saveFailed'));
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
      t('admin.commonAreas.deleteTitle'),
      t('admin.commonAreas.deleteMessage', { name: area.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/common-areas/${area.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (response.ok) {
                Alert.alert(t('common.success'), t('admin.commonAreas.success.deleted'));
                loadAreas();
              }
            } catch (error) {
              Alert.alert(t('common.error'), t('admin.commonAreas.errors.deleteFailed'));
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
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !area.is_active }),
      });
      if (response.ok) loadAreas();
    } catch (error) {
      Alert.alert(t('common.error'), t('admin.commonAreas.errors.updateFailed'));
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

  const getCategoryInfo = (categoryId) => {
    return CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[CATEGORIES.length - 1];
  };

  const formatCurrency = (amount) => `L ${parseFloat(amount || 0).toFixed(2)}`;

  // Area Card Component
  const AreaCard = ({ area, category, onEdit, onDelete, onToggle, onSchedule }) => (
    <View style={styles.areaCard}>
      {area.image_url && <Image source={{ uri: area.image_url }} style={styles.areaImage} />}
      <View style={styles.areaContent}>
        <View style={styles.areaHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
            <Ionicons name={category.icon} size={20} color={category.color} />
          </View>
          <View style={styles.areaInfo}>
            <Text style={styles.areaName}>{area.name}</Text>
            <Text style={styles.areaCategory}>{category.label}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: area.is_active ? COLORS.success + '20' : COLORS.danger + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: area.is_active ? COLORS.success : COLORS.danger }]} />
            <Text style={[styles.statusText, { color: area.is_active ? COLORS.success : COLORS.danger }]}>
              {area.is_active ? t('admin.commonAreas.active') : t('admin.commonAreas.inactive')}
            </Text>
          </View>
        </View>
        {area.description && <Text style={styles.areaDescription} numberOfLines={2}>{area.description}</Text>}
        <View style={styles.areaMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="people" size={14} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{area.capacity} {t('admin.commonAreas.people')}</Text>
          </View>
          {area.hourly_rate > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="cash" size={14} color={COLORS.lime} />
              <Text style={[styles.metaText, { color: COLORS.lime }]}>{formatCurrency(area.hourly_rate)}/hr</Text>
            </View>
          )}
          {area.requires_approval && (
            <View style={styles.metaItem}>
              <Ionicons name="hand-left" size={14} color={COLORS.warning} />
              <Text style={[styles.metaText, { color: COLORS.warning }]}>{t('admin.commonAreas.approval')}</Text>
            </View>
          )}
        </View>
        <View style={styles.areaActions}>
          <TouchableOpacity style={styles.areaAction} onPress={onEdit}>
            <Ionicons name="pencil" size={16} color={COLORS.teal} />
            <Text style={[styles.areaActionText, { color: COLORS.teal }]}>{t('common.edit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.areaAction} onPress={onSchedule}>
            <Ionicons name="calendar" size={16} color={COLORS.purple} />
            <Text style={[styles.areaActionText, { color: COLORS.purple }]}>{t('admin.commonAreas.schedule')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.areaActionIcon, styles.areaActionDanger]} onPress={onDelete}>
            <Ionicons name="trash" size={16} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Schedule Row Component
  const ScheduleRow = ({ day, schedule, areaId, onSaved }) => {
    const [isActive, setIsActive] = useState(schedule?.is_active || false);
    const [openTime, setOpenTime] = useState(schedule?.open_time || '08:00');
    const [closeTime, setCloseTime] = useState(schedule?.close_time || '20:00');
    const [saving, setSaving] = useState(false);

    const handleSaveSchedule = async () => {
      setSaving(true);
      try {
        const response = await fetch(`${API_URL}/common-areas/${areaId}/schedules`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ day_of_week: day.id, is_active: isActive, open_time: openTime, close_time: closeTime }),
        });
        if (response.ok) onSaved();
      } catch (error) {
        console.error('Error saving schedule:', error);
      } finally {
        setSaving(false);
      }
    };

    return (
      <View style={[styles.scheduleRow, isActive && styles.scheduleRowActive]}>
        <Switch
          value={isActive}
          onValueChange={setIsActive}
          trackColor={{ false: COLORS.backgroundTertiary, true: COLORS.success + '50' }}
          thumbColor={isActive ? COLORS.success : COLORS.textMuted}
        />
        <Text style={[styles.scheduleDay, isActive && styles.scheduleDayActive]}>{day.label}</Text>
        <TextInput
          style={styles.scheduleTimeInput}
          value={openTime}
          onChangeText={setOpenTime}
          editable={isActive}
          placeholder="08:00"
          placeholderTextColor={COLORS.textMuted}
        />
        <Text style={styles.scheduleTimeSeparator}>-</Text>
        <TextInput
          style={styles.scheduleTimeInput}
          value={closeTime}
          onChangeText={setCloseTime}
          editable={isActive}
          placeholder="20:00"
          placeholderTextColor={COLORS.textMuted}
        />
        <TouchableOpacity style={styles.scheduleSaveButton} onPress={handleSaveSchedule} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={COLORS.textPrimary} /> : <Ionicons name="checkmark" size={18} color={COLORS.textPrimary} />}
        </TouchableOpacity>
      </View>
    );
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{t('admin.commonAreas.noPermission')}</Text>
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
          <Text style={styles.headerTitle}>{t('admin.commonAreas.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('admin.commonAreas.subtitle')}</Text>
        </View>
        <TouchableOpacity onPress={() => { resetForm(); setShowModal(true); }} style={styles.addButton}>
          <Ionicons name="add" size={24} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.lime} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="business" size={24} color={COLORS.purple} />
              <Text style={styles.statValue}>{stats.total_areas || 0}</Text>
              <Text style={styles.statLabel}>{t('admin.commonAreas.stats.total')}</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="calendar" size={24} color={COLORS.success} />
              <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.total_reservations_this_month || 0}</Text>
              <Text style={styles.statLabel}>{t('admin.commonAreas.stats.reservations')}</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="hourglass" size={24} color={COLORS.warning} />
              <Text style={[styles.statValue, { color: COLORS.warning }]}>{stats.pending_approvals || 0}</Text>
              <Text style={styles.statLabel}>{t('admin.commonAreas.stats.pending')}</Text>
            </View>
          </View>
        )}

        {/* Areas List */}
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.lime} />
            <Text style={styles.loadingText}>{t('admin.commonAreas.loading')}</Text>
          </View>
        ) : areas.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="water-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>{t('admin.commonAreas.empty.title')}</Text>
            <Text style={styles.emptySubtitle}>{t('admin.commonAreas.empty.subtitle')}</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => { resetForm(); setShowModal(true); }}>
              <Ionicons name="add-circle" size={20} color={COLORS.background} />
              <Text style={styles.emptyButtonText}>{t('admin.commonAreas.createArea')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.areasGrid}>
            {areas.map((area) => (
              <AreaCard
                key={area.id}
                area={area}
                category={getCategoryInfo(area.type)}
                onEdit={() => handleEdit(area)}
                onDelete={() => handleDelete(area)}
                onToggle={() => handleToggleActive(area)}
                onSchedule={() => handleManageSchedule(area)}
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
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingArea ? t('admin.commonAreas.editArea') : t('admin.commonAreas.newArea')}</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.modalSave}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Image Picker */}
            <Text style={styles.sectionLabel}>{t('admin.commonAreas.form.image')}</Text>
            <TouchableOpacity onPress={pickImage} disabled={uploadingImage}>
              {uploadingImage ? (
                <View style={styles.imagePlaceholder}>
                  <ActivityIndicator color={COLORS.lime} />
                  <Text style={styles.imagePlaceholderText}>{t('admin.commonAreas.uploading')}</Text>
                </View>
              ) : form.image_url ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: form.image_url }} style={styles.imagePreview} />
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => setForm((prev) => ({ ...prev, image_url: '' }))}>
                    <Ionicons name="close-circle" size={28} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={40} color={COLORS.textMuted} />
                  <Text style={styles.imagePlaceholderText}>{t('admin.commonAreas.addImage')}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Location (SuperAdmin only) */}
            {isSuperAdmin && (
              <>
                <Text style={styles.sectionLabel}>{t('admin.commonAreas.form.location')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerContainer}>
                  {locations.map((loc) => (
                    <TouchableOpacity
                      key={loc.id}
                      style={[styles.locationChip, form.location_id === loc.id && styles.locationChipActive]}
                      onPress={() => setForm((prev) => ({ ...prev, location_id: loc.id }))}
                    >
                      <Text style={[styles.locationChipText, form.location_id === loc.id && styles.locationChipTextActive]}>{loc.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Name */}
            <Text style={styles.sectionLabel}>{t('admin.commonAreas.form.name')} *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
              placeholder={t('admin.commonAreas.form.namePlaceholder')}
              placeholderTextColor={COLORS.textMuted}
            />

            {/* Description */}
            <Text style={styles.sectionLabel}>{t('admin.commonAreas.form.description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(text) => setForm((prev) => ({ ...prev, description: text }))}
              placeholder={t('admin.commonAreas.form.descriptionPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
            />

            {/* Category */}
            <Text style={styles.sectionLabel}>{t('admin.commonAreas.form.category')}</Text>
            <View style={styles.categoriesGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryItem, form.category === cat.id && { borderColor: cat.color, backgroundColor: `${cat.color}30` }]}
                  onPress={() => setForm((prev) => ({ ...prev, category: cat.id }))}
                >
                  <Ionicons name={cat.icon} size={20} color={form.category === cat.id ? cat.color : COLORS.textMuted} />
                  <Text style={[styles.categoryLabel, form.category === cat.id && { color: cat.color }]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Capacity */}
            <Text style={styles.sectionLabel}>{t('admin.commonAreas.form.capacity')}</Text>
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
                  <Text style={styles.switchLabel}>{t('admin.commonAreas.form.isPaid')}</Text>
                  <Text style={styles.switchHint}>{t('admin.commonAreas.form.isPaidHint')}</Text>
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
                <Text style={styles.sectionLabel}>{t('admin.commonAreas.form.pricePerHour')}</Text>
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
                  <Text style={styles.switchLabel}>{t('admin.commonAreas.form.requiresApproval')}</Text>
                  <Text style={styles.switchHint}>{t('admin.commonAreas.form.requiresApprovalHint')}</Text>
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
              <Text style={styles.scheduleSectionTitle}>{t('admin.commonAreas.scheduleSection.title')}</Text>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Ionicons name="moon" size={20} color={form.is_24_hours ? COLORS.teal : COLORS.textMuted} />
                  <Text style={styles.switchLabel}>{t('admin.commonAreas.form.is24Hours')}</Text>
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
                    <Text style={styles.timeLabel}>{t('admin.commonAreas.form.openTime')}</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={form.available_from}
                      onChangeText={(text) => setForm((prev) => ({ ...prev, available_from: text }))}
                      placeholder="08:00"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>{t('admin.commonAreas.form.closeTime')}</Text>
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
              <Text style={styles.rulesSectionTitle}>{t('admin.commonAreas.rulesSection.title')}</Text>
              <View style={styles.rulesRow}>
                <View style={styles.ruleField}>
                  <Text style={styles.ruleLabel}>{t('admin.commonAreas.form.minHours')}</Text>
                  <TextInput
                    style={styles.ruleInput}
                    value={form.min_hours}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, min_hours: text }))}
                    keyboardType="number-pad"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
                <View style={styles.ruleField}>
                  <Text style={styles.ruleLabel}>{t('admin.commonAreas.form.maxHours')}</Text>
                  <TextInput
                    style={styles.ruleInput}
                    value={form.max_hours}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, max_hours: text }))}
                    keyboardType="number-pad"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
                <View style={styles.ruleField}>
                  <Text style={styles.ruleLabel}>{t('admin.commonAreas.form.advanceDays')}</Text>
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
              <Text style={styles.modalCancel}>{t('common.close')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('admin.commonAreas.schedules')}</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.scheduleNote}>{t('admin.commonAreas.scheduleNote')}</Text>
            {DAYS_OF_WEEK.map((day) => (
              <ScheduleRow
                key={day.id}
                day={day}
                schedule={schedules.find((s) => s.day_of_week === day.id)}
                areaId={selectedArea?.id}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: scale(60) },
  errorText: { color: COLORS.danger, fontSize: scale(16) },
  loadingText: { color: COLORS.textSecondary, marginTop: scale(12), fontSize: scale(14) },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: scale(12) },
  backButton: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: COLORS.backgroundSecondary, justifyContent: 'center', alignItems: 'center' },
  headerTitleContainer: { flex: 1, marginLeft: scale(12) },
  headerTitle: { fontSize: scale(18), fontWeight: '700', color: COLORS.textPrimary },
  headerSubtitle: { fontSize: scale(12), color: COLORS.textSecondary, marginTop: scale(2) },
  addButton: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: COLORS.lime, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: scale(16) },
  statsContainer: { flexDirection: 'row', gap: scale(10), marginBottom: scale(16) },
  statCard: { flex: 1, backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(12), padding: scale(14), alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: scale(22), fontWeight: '700', color: COLORS.textPrimary, marginTop: scale(8) },
  statLabel: { fontSize: scale(11), color: COLORS.textSecondary, marginTop: scale(4) },
  emptyState: { alignItems: 'center', paddingVertical: scale(60) },
  emptyTitle: { fontSize: scale(18), fontWeight: '600', color: COLORS.textPrimary, marginTop: scale(16) },
  emptySubtitle: { fontSize: scale(14), color: COLORS.textSecondary, marginTop: scale(8), textAlign: 'center', paddingHorizontal: scale(20) },
  emptyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lime, paddingHorizontal: scale(20), paddingVertical: scale(12), borderRadius: scale(10), marginTop: scale(24), gap: scale(8) },
  emptyButtonText: { color: COLORS.background, fontSize: scale(14), fontWeight: '600' },
  areasGrid: { gap: scale(12) },
  areaCard: { backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(14), overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  areaImage: { width: '100%', height: scale(140) },
  areaContent: { padding: scale(14) },
  areaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(10) },
  categoryIcon: { width: scale(40), height: scale(40), borderRadius: scale(10), justifyContent: 'center', alignItems: 'center' },
  areaInfo: { flex: 1, marginLeft: scale(10) },
  areaName: { fontSize: scale(16), fontWeight: '600', color: COLORS.textPrimary },
  areaCategory: { fontSize: scale(12), color: COLORS.textSecondary, marginTop: scale(2) },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(8), paddingVertical: scale(4), borderRadius: scale(8), gap: scale(4) },
  statusDot: { width: scale(6), height: scale(6), borderRadius: scale(3) },
  statusText: { fontSize: scale(10), fontWeight: '600' },
  areaDescription: { fontSize: scale(13), color: COLORS.textSecondary, lineHeight: scale(18), marginBottom: scale(10) },
  areaMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(12), marginBottom: scale(12) },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  metaText: { fontSize: scale(12), color: COLORS.textMuted },
  areaActions: { flexDirection: 'row', gap: scale(8), borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: scale(12) },
  areaAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6), paddingVertical: scale(10), backgroundColor: COLORS.backgroundTertiary, borderRadius: scale(10) },
  areaActionIcon: { width: scale(42), paddingVertical: scale(10), backgroundColor: COLORS.backgroundTertiary, borderRadius: scale(10), alignItems: 'center', justifyContent: 'center' },
  areaActionDanger: { backgroundColor: COLORS.danger + '20' },
  areaActionText: { fontSize: scale(12), fontWeight: '500' },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: scale(12), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: scale(17), fontWeight: '600', color: COLORS.textPrimary },
  modalCancel: { fontSize: scale(15), color: COLORS.textSecondary },
  modalSave: { fontSize: scale(15), color: COLORS.lime, fontWeight: '600' },
  modalContent: { flex: 1, padding: scale(16) },
  sectionLabel: { fontSize: scale(14), fontWeight: '600', color: COLORS.textPrimary, marginBottom: scale(8), marginTop: scale(16) },
  input: { backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(10), paddingHorizontal: scale(14), paddingVertical: scale(12), fontSize: scale(15), color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  textArea: { minHeight: scale(80), textAlignVertical: 'top' },
  pickerContainer: { marginBottom: scale(8) },
  locationChip: { paddingHorizontal: scale(16), paddingVertical: scale(10), backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(20), marginRight: scale(8), borderWidth: 1, borderColor: COLORS.border },
  locationChipActive: { borderColor: COLORS.lime, backgroundColor: COLORS.lime + '20' },
  locationChipText: { fontSize: scale(14), color: COLORS.textSecondary },
  locationChipTextActive: { color: COLORS.lime, fontWeight: '600' },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
  categoryItem: { width: (SCREEN_WIDTH - scale(64)) / 5, paddingVertical: scale(12), alignItems: 'center', backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(10), borderWidth: 1, borderColor: COLORS.border },
  categoryLabel: { fontSize: scale(10), color: COLORS.textSecondary, marginTop: scale(4) },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: scale(14), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  switchInfo: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  switchLabel: { fontSize: scale(15), color: COLORS.textPrimary, fontWeight: '500' },
  switchHint: { fontSize: scale(12), color: COLORS.textMuted, marginTop: scale(2) },
  scheduleSection: { backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(12), padding: scale(16), marginTop: scale(16), borderWidth: 1, borderColor: COLORS.border },
  scheduleSectionTitle: { fontSize: scale(14), fontWeight: '600', color: COLORS.teal, marginBottom: scale(12) },
  timeRow: { flexDirection: 'row', gap: scale(12), marginTop: scale(12) },
  timeField: { flex: 1 },
  timeLabel: { fontSize: scale(12), color: COLORS.textSecondary, marginBottom: scale(4) },
  timeInput: { backgroundColor: COLORS.backgroundTertiary, borderRadius: scale(8), paddingHorizontal: scale(12), paddingVertical: scale(10), fontSize: scale(15), color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  rulesSection: { backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(12), padding: scale(16), marginTop: scale(16), borderWidth: 1, borderColor: COLORS.border },
  rulesSectionTitle: { fontSize: scale(14), fontWeight: '600', color: COLORS.textPrimary, marginBottom: scale(12) },
  rulesRow: { flexDirection: 'row', gap: scale(12) },
  ruleField: { flex: 1 },
  ruleLabel: { fontSize: scale(11), color: COLORS.textSecondary, marginBottom: scale(4) },
  ruleInput: { backgroundColor: COLORS.backgroundTertiary, borderRadius: scale(8), paddingHorizontal: scale(12), paddingVertical: scale(10), fontSize: scale(15), color: COLORS.textPrimary, textAlign: 'center', borderWidth: 1, borderColor: COLORS.border },
  imagePreviewContainer: { position: 'relative' },
  imagePreview: { width: '100%', height: scale(180), borderRadius: scale(12) },
  removeImageButton: { position: 'absolute', top: scale(8), right: scale(8), backgroundColor: COLORS.background, borderRadius: scale(14) },
  imagePlaceholder: { width: '100%', height: scale(140), backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(12), borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { fontSize: scale(14), color: COLORS.textMuted, fontWeight: '500', marginTop: scale(8) },
  scheduleNote: { fontSize: scale(13), color: COLORS.textSecondary, marginBottom: scale(16), lineHeight: scale(18) },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', padding: scale(12), backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(10), marginBottom: scale(8), gap: scale(12), borderWidth: 1, borderColor: COLORS.border },
  scheduleRowActive: { backgroundColor: COLORS.success + '15', borderColor: COLORS.success + '50' },
  scheduleDay: { flex: 1, fontSize: scale(14), fontWeight: '500', color: COLORS.textSecondary },
  scheduleDayActive: { color: COLORS.success },
  scheduleTimeInput: { width: scale(70), backgroundColor: COLORS.backgroundTertiary, borderRadius: scale(6), paddingHorizontal: scale(10), paddingVertical: scale(8), fontSize: scale(14), textAlign: 'center', color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  scheduleTimeSeparator: { color: COLORS.textSecondary },
  scheduleSaveButton: { width: scale(32), height: scale(32), borderRadius: scale(6), backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center' },
});