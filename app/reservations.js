// app/reservations.js
// ISSY Resident App - Reservaciones (ProHome Dark Theme)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../src/config/supabase';
import { useAuth } from '../src/context/AuthContext';
import { useTranslation } from '../src/hooks/useTranslation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ProHome Dark Theme Colors
const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  card: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  teal: '#5DDED8',
  tealDark: '#4BCDC7',
  lime: '#D4FE48',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  red: '#EF4444',
  yellow: '#F59E0B',
  green: '#10B981',
  blue: '#3B82F6',
};

// Info visual por tipo de área
const TYPE_INFO = {
  pool: { icon: 'water', color: '#3B82F6', label: 'Piscina' },
  gym: { icon: 'fitness', color: '#EF4444', label: 'Gimnasio' },
  court: { icon: 'tennisball', color: '#10B981', label: 'Cancha' },
  bbq: { icon: 'flame', color: '#F59E0B', label: 'BBQ' },
  salon: { icon: 'wine', color: '#8B5CF6', label: 'Salón' },
  playground: { icon: 'happy', color: '#EC4899', label: 'Parque' },
  terrace: { icon: 'sunny', color: '#6366F1', label: 'Terraza' },
  garden: { icon: 'leaf', color: '#22C55E', label: 'Jardín' },
  parking: { icon: 'car', color: '#64748B', label: 'Parqueo' },
  other: { icon: 'grid', color: '#78716C', label: 'Otro' }
};

// Imágenes por defecto
const DEFAULT_IMAGES = {
  court: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=300&fit=crop',
  pool: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=400&h=300&fit=crop',
  gym: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop',
  salon: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&h=300&fit=crop',
  garden: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400&h=300&fit=crop',
  bbq: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
  default: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop'
};

// Categorías agrupadas
const CATEGORIES = [
  { id: 'sports', label: 'DEPORTE', icon: 'tennisball', types: ['court', 'gym'] },
  { id: 'social', label: 'SALONES', icon: 'wine', types: ['salon', 'terrace'] },
  { id: 'outdoor', label: 'PARQUES', icon: 'leaf', types: ['garden', 'playground', 'bbq'] },
  { id: 'other', label: 'MÁS ÁREAS', icon: 'grid', types: ['pool', 'parking', 'other'] },
];

// Estados de reserva - Se traducen dinámicamente
const getStatusConfig = (t) => ({
  pending: { label: t('reservations.status.pending'), color: COLORS.yellow, bgColor: 'rgba(245, 158, 11, 0.2)' },
  approved: { label: t('reservations.status.approved'), color: COLORS.green, bgColor: 'rgba(16, 185, 129, 0.2)' },
  rejected: { label: t('reservations.status.rejected'), color: COLORS.red, bgColor: 'rgba(239, 68, 68, 0.2)' },
  cancelled: { label: t('reservations.status.cancelled'), color: COLORS.textMuted, bgColor: 'rgba(107, 114, 128, 0.2)' },
  expired: { label: t('reservations.status.expired'), color: COLORS.red, bgColor: 'rgba(239, 68, 68, 0.2)' },
});

export default function ReservationsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { t, language } = useTranslation();

  // Get locale based on language
  const getLocale = () => {
    const locales = { es: 'es-HN', en: 'en-US', fr: 'fr-FR', pt: 'pt-BR' };
    return locales[language] || 'es-HN';
  };

  // Status config with translations
  const STATUS_CONFIG = getStatusConfig(t);

  const [areas, setAreas] = useState([]);
  const [myReservations, setMyReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);

  // Create form state
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [availability, setAvailability] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [attendees, setAttendees] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([loadAreas(), loadMyReservations()]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAreas = async () => {
    try {
      const locationId = profile?.location_id || user?.location_id;
      if (!locationId) return;

      const { data, error } = await supabase
        .from('common_areas')
        .select('*')
        .eq('is_active', true)
        .eq('location_id', locationId)
        .order('name');

      if (error) throw error;
      setAreas(data || []);
    } catch (error) {
      console.error('Error loading areas:', error);
    }
  };

  const loadMyReservations = async () => {
    try {
      const userId = profile?.id || user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('area_reservations')
        .select('*')
        .eq('user_id', userId)
        .order('reservation_date', { ascending: false });

      if (error) throw error;
      setMyReservations(data || []);
    } catch (error) {
      console.error('Error loading reservations:', error);
    }
  };

  const loadAvailability = async (areaId, date) => {
    try {
      setLoadingAvailability(true);
      setSelectedSlots([]);

      const { data, error } = await supabase.rpc('get_area_availability', {
        p_area_id: areaId,
        p_date: date
      });

      if (error) throw error;
      
      // Handle different response formats
      if (Array.isArray(data)) {
        setAvailability(data);
      } else if (data && Array.isArray(data.slots)) {
        setAvailability(data.slots);
      } else {
        setAvailability([]);
      }
    } catch (error) {
      console.error('Error loading availability:', error);
      setAvailability([]);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  // Helpers
  function getTodayDate() {
    return new Date().toISOString().split('T')[0];
  }

  const getTypeInfo = (type) => TYPE_INFO[type] || TYPE_INFO.other;

  const getAreaImage = (area) => {
    if (!area) return DEFAULT_IMAGES.default;
    return area.image_url || DEFAULT_IMAGES[area.type] || DEFAULT_IMAGES.default;
  };

  const getAreasForCategory = (categoryTypes) => {
    return areas.filter(area => categoryTypes.includes(area.type));
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'p.m.' : 'a.m.';
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hour}:${minutes || '00'} ${ampm}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-HN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-HN', {
      day: 'numeric',
      month: 'short'
    });
  };

  const canUserCancel = (reservation) => {
    const today = getTodayDate();
    if (!['pending', 'approved'].includes(reservation.status)) return false;
    if (reservation.reservation_date < today) return false;
    return true;
  };

  const getAreaById = (areaId) => areas.find(a => a.id === areaId);

  // Handlers
  const handleOpenCreate = () => {
    setSelectedArea(null);
    setSelectedDate(getTodayDate());
    setSelectedSlots([]);
    setAttendees(2);
    setExpandedCategory(null);
    setAvailability(null);
    setShowCreateModal(true);
  };

  const handleSelectArea = (area) => {
    setSelectedArea(area);
    setSelectedSlots([]);
    if (selectedDate) {
      loadAvailability(area.id, selectedDate);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedSlots([]);
    if (selectedArea) {
      loadAvailability(selectedArea.id, date);
    }
  };

  const handleSlotToggle = (slot) => {
    if (!slot.available) return;

    const slotKey = `${slot.start_time}-${slot.end_time}`;
    const isSelected = selectedSlots.some(s => `${s.start_time}-${s.end_time}` === slotKey);

    if (isSelected) {
      setSelectedSlots(selectedSlots.filter(s => `${s.start_time}-${s.end_time}` !== slotKey));
    } else {
      if (selectedSlots.length >= 2) {
        Alert.alert(t('common.limit'), t('reservations.errors.maxSlots'));
        return;
      }

      if (selectedSlots.length === 0) {
        setSelectedSlots([slot]);
      } else {
        const sortedSlots = [...selectedSlots, slot].sort((a, b) =>
          a.start_time.localeCompare(b.start_time)
        );

        let isConsecutive = true;
        for (let i = 1; i < sortedSlots.length; i++) {
          if (sortedSlots[i].start_time !== sortedSlots[i - 1].end_time) {
            isConsecutive = false;
            break;
          }
        }

        if (isConsecutive) {
          setSelectedSlots(sortedSlots);
        } else {
          Alert.alert('Error', t('reservations.errors.consecutiveSlots'));
        }
      }
    }
  };

  const handleSubmitReservation = async () => {
    if (!selectedArea || selectedSlots.length === 0) {
      Alert.alert('Error', t('reservations.errors.selectAreaAndTime'));
      return;
    }

    const userId = profile?.id || user?.id;
    if (!userId) {
      Alert.alert('Error', t('reservations.errors.userNotFound'));
      return;
    }

    try {
      setSubmitting(true);

      const startTime = selectedSlots[0].start_time;
      const endTime = selectedSlots[selectedSlots.length - 1].end_time;

      const { data, error } = await supabase.rpc('create_reservation', {
        p_area_id: selectedArea.id,
        p_user_id: userId,
        p_date: selectedDate,
        p_start_time: startTime,
        p_end_time: endTime,
        p_purpose: null,
        p_attendees: attendees,
        p_notes: null
      });

      if (error) throw error;

      if (data.success) {
        setShowCreateModal(false);
        setShowSuccessModal(true);
        loadMyReservations();
      } else {
        Alert.alert('Error', data.error || t('reservations.errors.createError'));
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
      Alert.alert('Error', t('reservations.errors.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelReservation = async (reservation) => {
    const statusLabel = STATUS_CONFIG[reservation.status]?.label || reservation.status;

    Alert.alert(
      t('reservations.cancelReservation'),
      t('reservations.cancelConfirm', { status: statusLabel.toLowerCase() }),
      [
        { text: 'No', style: 'cancel' },
        {
          text: t('common.yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('area_reservations')
                .update({
                  status: 'cancelled',
                  cancelled_at: new Date().toISOString(),
                  cancelled_by: profile?.id || user?.id,
                  cancellation_reason: 'Cancelled by user'
                })
                .eq('id', reservation.id);

              if (error) throw error;
              loadMyReservations();
              setShowDetailModal(false);
              Alert.alert(t('common.done'), t('reservations.cancelSuccess'));
            } catch (error) {
              Alert.alert('Error', t('reservations.errors.cancelError'));
            }
          }
        }
      ]
    );
  };

  const handleViewDetail = (reservation) => {
    setSelectedReservation(reservation);
    setShowDetailModal(true);
  };

  // Generate dates for date picker
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    const maxDays = selectedArea?.advance_booking_days || 30;

    for (let i = 0; i < Math.min(maxDays, 14); i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      dates.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('es-HN', { weekday: 'short' }),
        dayNum: date.getDate(),
        month: date.toLocaleDateString('es-HN', { month: 'short' })
      });
    }
    return dates;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.teal} />
          <Text style={styles.loadingText}>{t('reservations.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Separate active and past reservations
  const today = getTodayDate();
  const activeReservations = myReservations.filter(r => 
    r.reservation_date >= today && ['pending', 'approved'].includes(r.status)
  );
  const pastReservations = myReservations.filter(r => 
    r.reservation_date < today || !['pending', 'approved'].includes(r.status)
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('reservations.title')}</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={COLORS.teal} 
          />
        }
      >
        {/* Create Button */}
        <TouchableOpacity style={styles.createButton} onPress={handleOpenCreate}>
          <View style={styles.createButtonIcon}>
            <Ionicons name="calendar" size={22} color={COLORS.background} />
          </View>
          <View style={styles.createButtonContent}>
            <Text style={styles.createButtonText}>{t('reservations.createButton')}</Text>
            <Text style={styles.createButtonSubtext}>{t('reservations.createButtonSubtext')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.background} />
        </TouchableOpacity>

        {/* Active Reservations */}
        {activeReservations.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('reservations.upcoming')}</Text>
              <Text style={styles.sectionCount}>{activeReservations.length}</Text>
            </View>

            {activeReservations.map((item) => {
              const area = getAreaById(item.area_id);
              const typeInfo = getTypeInfo(area?.type);
              const status = STATUS_CONFIG[item.status];

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.reservationCard}
                  onPress={() => handleViewDetail(item)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: getAreaImage(area) }}
                    style={styles.reservationImage}
                  />
                  <View style={styles.reservationOverlay}>
                    <View style={styles.reservationContent}>
                      <View style={styles.reservationHeader}>
                        <View style={[styles.typeIcon, { backgroundColor: typeInfo.color + '30' }]}>
                          <Ionicons name={typeInfo.icon} size={16} color={typeInfo.color} />
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
                          <Text style={[styles.statusText, { color: status.color }]}>
                            {status.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.reservationAreaName}>{area?.name || 'Área'}</Text>
                      <View style={styles.reservationMeta}>
                        <Ionicons name="calendar-outline" size={14} color={COLORS.teal} />
                        <Text style={styles.reservationDate}>{formatShortDate(item.reservation_date)}</Text>
                        <View style={styles.metaDot} />
                        <Ionicons name="time-outline" size={14} color={COLORS.teal} />
                        <Text style={styles.reservationTime}>
                          {formatTime(item.start_time)} - {formatTime(item.end_time)}
                        </Text>
                      </View>
                    </View>
                    {canUserCancel(item) && (
                      <TouchableOpacity 
                        style={styles.cancelButton}
                        onPress={() => handleCancelReservation(item)}
                      >
                        <Ionicons name="close-circle" size={24} color={COLORS.red} />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Past/Inactive Reservations */}
        {pastReservations.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: scale(24) }]}>
              <Text style={styles.sectionTitle}>{t('reservations.history')}</Text>
              <Text style={styles.sectionCount}>{pastReservations.length}</Text>
            </View>

            {pastReservations.slice(0, 5).map((item) => {
              const area = getAreaById(item.area_id);
              const status = STATUS_CONFIG[item.status];

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.historyCard}
                  onPress={() => handleViewDetail(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.historyContent}>
                    <Text style={styles.historyAreaName}>{area?.name || 'Área'}</Text>
                    <Text style={styles.historyDate}>{formatDate(item.reservation_date)}</Text>
                  </View>
                  <View style={[styles.statusBadgeSmall, { backgroundColor: status.bgColor }]}>
                    <Text style={[styles.statusTextSmall, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Empty State */}
        {myReservations.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.teal} />
            </View>
            <Text style={styles.emptyTitle}>{t('reservations.empty.title')}</Text>
            <Text style={styles.emptySubtitle}>{t('reservations.empty.subtitle')}</Text>
          </View>
        )}

        <View style={{ height: scale(100) }} />
      </ScrollView>

      {/* Create Reservation Modal */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('reservations.newReservation')}</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Category Selection */}
            <Text style={styles.modalLabel}>{t('reservations.selectArea')}</Text>

            {CATEGORIES.map(category => {
              const categoryAreas = getAreasForCategory(category.types);
              if (categoryAreas.length === 0) return null;

              return (
                <View key={category.id} style={styles.categoryContainer}>
                  <TouchableOpacity
                    style={styles.categoryButton}
                    onPress={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                  >
                    <View style={styles.categoryLeft}>
                      <Ionicons name={category.icon} size={20} color={COLORS.teal} />
                      <Text style={styles.categoryButtonText}>{category.label}</Text>
                    </View>
                    <Ionicons
                      name={expandedCategory === category.id ? "chevron-down" : "chevron-forward"}
                      size={20}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>

                  {expandedCategory === category.id && (
                    <View style={styles.areasContainer}>
                      {categoryAreas.map(area => {
                        const typeInfo = getTypeInfo(area.type);
                        const isSelected = selectedArea?.id === area.id;

                        return (
                          <TouchableOpacity
                            key={area.id}
                            style={[styles.areaOption, isSelected && styles.areaOptionSelected]}
                            onPress={() => handleSelectArea(area)}
                          >
                            <View style={[styles.areaIcon, { backgroundColor: typeInfo.color + '30' }]}>
                              <Ionicons name={typeInfo.icon} size={24} color={typeInfo.color} />
                            </View>
                            <View style={styles.areaOptionInfo}>
                              <Text style={styles.areaOptionName}>{area.name}</Text>
                              <Text style={styles.areaOptionCapacity}>
                                {t('reservations.capacity')}: {area.capacity}
                              </Text>
                            </View>
                            <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
                              {isSelected && <Ionicons name="checkmark" size={16} color={COLORS.background} />}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Date Selection */}
            {selectedArea && (
              <>
                <Text style={styles.modalLabel}>{t('reservations.selectDate')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesScroll}>
                  {generateDates().map(d => (
                    <TouchableOpacity
                      key={d.date}
                      style={[styles.dateChip, selectedDate === d.date && styles.dateChipSelected]}
                      onPress={() => handleDateChange(d.date)}
                    >
                      <Text style={[styles.dateDayName, selectedDate === d.date && styles.dateTextSelected]}>
                        {d.dayName}
                      </Text>
                      <Text style={[styles.dateDayNum, selectedDate === d.date && styles.dateTextSelected]}>
                        {d.dayNum}
                      </Text>
                      <Text style={[styles.dateMonth, selectedDate === d.date && styles.dateTextSelected]}>
                        {d.month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Time Slots */}
            {selectedArea && selectedDate && (
              <>
                <Text style={styles.modalLabel}>{t('reservations.selectTime')}</Text>

                {loadingAvailability ? (
                  <ActivityIndicator color={COLORS.teal} style={{ marginVertical: 20 }} />
                ) : !availability || !Array.isArray(availability) || availability.length === 0 ? (
                  <Text style={styles.noAvailability}>{t('reservations.noSlots')}</Text>
                ) : (
                  <>
                    <View style={styles.slotsGrid}>
                      {(Array.isArray(availability) ? availability : []).map((slot, idx) => {
                        const slotKey = `${slot.start_time}-${slot.end_time}`;
                        const isSelected = selectedSlots.some(s => `${s.start_time}-${s.end_time}` === slotKey);

                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[
                              styles.slotButton,
                              !slot.available && styles.slotUnavailable,
                              isSelected && styles.slotSelected,
                            ]}
                            onPress={() => handleSlotToggle(slot)}
                            disabled={!slot.available}
                          >
                            <Text style={[
                              styles.slotText,
                              !slot.available && styles.slotTextUnavailable,
                              isSelected && styles.slotTextSelected,
                            ]}>
                              {formatTime(slot.start_time)}
                            </Text>
                            <Text style={[
                              styles.slotTextSmall,
                              isSelected && styles.slotTextSelected,
                            ]}>
                              {formatTime(slot.end_time)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <Text style={styles.slotHint}>{t('reservations.slotsHint')}</Text>
                  </>
                )}
              </>
            )}

            {/* Attendees */}
            {selectedSlots.length > 0 && (
              <>
                <Text style={styles.modalLabel}>{t('reservations.attendees')}</Text>
                <View style={styles.attendeesContainer}>
                  <TouchableOpacity
                    style={styles.attendeeButton}
                    onPress={() => setAttendees(Math.max(1, attendees - 1))}
                  >
                    <Ionicons name="remove" size={24} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.attendeesText}>{attendees}</Text>
                  <TouchableOpacity
                    style={styles.attendeeButton}
                    onPress={() => setAttendees(Math.min(selectedArea?.capacity || 50, attendees + 1))}
                  >
                    <Ionicons name="add" size={24} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.capacityHint}>
                  {t('reservations.capacity')}: {selectedArea?.capacity}
                </Text>
              </>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, (!selectedSlots.length || submitting) && styles.submitButtonDisabled]}
              onPress={handleSubmitReservation}
              disabled={!selectedSlots.length || submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.background} />
                  <Text style={styles.submitButtonText}>{t('reservations.submitButton')}</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: scale(40) }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.detailModalContainer}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.detailTitle}>{t('reservations.title')}</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedReservation && (
            <ScrollView style={styles.detailContent}>
              {(() => {
                const area = getAreaById(selectedReservation.area_id);
                const status = STATUS_CONFIG[selectedReservation.status];

                return (
                  <>
                    <Image
                      source={{ uri: getAreaImage(area) }}
                      style={styles.detailImage}
                    />

                    <View style={styles.detailBody}>
                      <View style={[styles.detailStatusBadge, { backgroundColor: status.bgColor }]}>
                        <Text style={[styles.detailStatusText, { color: status.color }]}>
                          {status.label}
                        </Text>
                      </View>

                      <Text style={styles.detailAreaName}>{area?.name || 'Área'}</Text>

                      <View style={styles.detailRow}>
                        <Ionicons name="calendar" size={20} color={COLORS.teal} />
                        <Text style={styles.detailText}>
                          {formatDate(selectedReservation.reservation_date)}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Ionicons name="time" size={20} color={COLORS.teal} />
                        <Text style={styles.detailText}>
                          {formatTime(selectedReservation.start_time)} - {formatTime(selectedReservation.end_time)}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Ionicons name="people" size={20} color={COLORS.teal} />
                        <Text style={styles.detailText}>
                          {selectedReservation.attendees || 1} {t('reservations.attendees').toLowerCase()}
                        </Text>
                      </View>

                      {selectedReservation.confirmation_code && (
                        <View style={styles.codeContainer}>
                          <Text style={styles.codeLabel}>{t('reservations.reservationCode').toUpperCase()}</Text>
                          <Text style={styles.codeValue}>{selectedReservation.confirmation_code}</Text>
                        </View>
                      )}

                      {canUserCancel(selectedReservation) && (
                        <TouchableOpacity
                          style={styles.cancelDetailButton}
                          onPress={() => handleCancelReservation(selectedReservation)}
                        >
                          <Ionicons name="close-circle-outline" size={20} color={COLORS.red} />
                          <Text style={styles.cancelDetailButtonText}>{t('reservations.cancelReservation')}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                );
              })()}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.successContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color={COLORS.green} />
            </View>
            <Text style={styles.successTitle}>{t('reservations.success.title')}</Text>
            <Text style={styles.successSubtitle}>
              {t('reservations.success.subtitle')}
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successButtonText}>{t('reservations.success.button')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: scale(12),
    fontSize: scale(14),
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Content
  scrollContent: {
    paddingHorizontal: scale(20),
  },

  // Create Button
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lime,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(24),
  },
  createButtonIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  createButtonContent: {
    flex: 1,
  },
  createButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.background,
  },
  createButtonSubtext: {
    fontSize: scale(12),
    color: 'rgba(0,0,0,0.6)',
    marginTop: scale(2),
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionCount: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.teal,
    backgroundColor: COLORS.card,
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(10),
  },

  // Reservation Card
  reservationCard: {
    borderRadius: scale(16),
    overflow: 'hidden',
    marginBottom: scale(12),
    height: scale(140),
  },
  reservationImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  reservationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: scale(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reservationContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  typeIcon: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(8),
  },
  statusText: {
    fontSize: scale(11),
    fontWeight: '600',
  },
  reservationAreaName: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  reservationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reservationDate: {
    fontSize: scale(13),
    color: COLORS.textPrimary,
    marginLeft: scale(4),
  },
  metaDot: {
    width: scale(4),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: COLORS.textMuted,
    marginHorizontal: scale(8),
  },
  reservationTime: {
    fontSize: scale(13),
    color: COLORS.textPrimary,
    marginLeft: scale(4),
  },
  cancelButton: {
    alignSelf: 'flex-start',
  },

  // History Card
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(8),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  historyContent: {
    flex: 1,
  },
  historyAreaName: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  historyDate: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  statusBadgeSmall: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
  },
  statusTextSmall: {
    fontSize: scale(10),
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(60),
  },
  emptyIconContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  emptyTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  modalTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: scale(20),
    paddingTop: scale(20),
  },
  modalLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(12),
    marginTop: scale(16),
  },

  // Categories
  categoryContainer: {
    marginBottom: scale(8),
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: scale(12),
    padding: scale(16),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  categoryButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  areasContainer: {
    marginTop: scale(8),
    gap: scale(8),
  },
  areaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: scale(12),
    padding: scale(12),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  areaOptionSelected: {
    borderColor: COLORS.lime,
    backgroundColor: 'rgba(212,254,72,0.1)',
  },
  areaIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaOptionInfo: {
    flex: 1,
    marginLeft: scale(12),
  },
  areaOptionName: {
    fontSize: scale(15),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  areaOptionCapacity: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  radioButton: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.lime,
    backgroundColor: COLORS.lime,
  },

  // Date Selection
  datesScroll: {
    marginBottom: scale(8),
  },
  dateChip: {
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    marginRight: scale(10),
    borderRadius: scale(12),
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  dateChipSelected: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  dateDayName: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  dateDayNum: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginVertical: scale(2),
  },
  dateMonth: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  dateTextSelected: {
    color: COLORS.background,
  },

  // Time Slots
  noAvailability: {
    color: COLORS.yellow,
    textAlign: 'center',
    paddingVertical: scale(20),
    fontSize: scale(14),
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
  },
  slotButton: {
    width: (SCREEN_WIDTH - 60) / 3,
    paddingVertical: scale(12),
    borderRadius: scale(10),
    backgroundColor: COLORS.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  slotUnavailable: {
    opacity: 0.3,
  },
  slotSelected: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  slotText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  slotTextSmall: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  slotTextUnavailable: {
    color: COLORS.textMuted,
  },
  slotTextSelected: {
    color: COLORS.background,
  },
  slotHint: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginTop: scale(12),
  },

  // Attendees
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(20),
  },
  attendeeButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  attendeesText: {
    fontSize: scale(32),
    fontWeight: '700',
    color: COLORS.textPrimary,
    minWidth: scale(50),
    textAlign: 'center',
  },
  capacityHint: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: scale(8),
  },

  // Submit Button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    borderRadius: scale(50),
    paddingVertical: scale(16),
    marginTop: scale(30),
    gap: scale(8),
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.background,
  },

  // Detail Modal
  detailModalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
  },
  detailTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  detailContent: {
    flex: 1,
  },
  detailImage: {
    width: '100%',
    height: scale(200),
  },
  detailBody: {
    padding: scale(20),
  },
  detailStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    marginBottom: scale(16),
  },
  detailStatusText: {
    fontSize: scale(14),
    fontWeight: '600',
  },
  detailAreaName: {
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(20),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginBottom: scale(16),
  },
  detailText: {
    fontSize: scale(16),
    color: COLORS.textSecondary,
  },
  codeContainer: {
    backgroundColor: COLORS.lime,
    borderRadius: scale(16),
    padding: scale(20),
    alignItems: 'center',
    marginTop: scale(20),
  },
  codeLabel: {
    fontSize: scale(12),
    color: COLORS.background,
    opacity: 0.6,
  },
  codeValue: {
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.background,
    letterSpacing: 2,
    marginTop: scale(4),
  },
  cancelDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(24),
    paddingVertical: scale(14),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    gap: scale(8),
  },
  cancelDetailButtonText: {
    fontSize: scale(16),
    fontWeight: '500',
    color: COLORS.red,
  },

  // Success Modal
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(40),
  },
  successContent: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(24),
    padding: scale(40),
    alignItems: 'center',
    width: '100%',
  },
  successIcon: {
    marginBottom: scale(20),
  },
  successTitle: {
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  successSubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(8),
    textAlign: 'center',
  },
  successButton: {
    marginTop: scale(24),
    paddingVertical: scale(14),
    paddingHorizontal: scale(32),
    backgroundColor: COLORS.lime,
    borderRadius: scale(50),
  },
  successButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.background,
  },
});