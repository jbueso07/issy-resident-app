// app/reservations.js
// ISSY Resident App - Reservaciones con slots de disponibilidad
// Sincronizado con la versión web

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

const { width } = Dimensions.get('window');

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

export default function ReservationsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  
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
      setAvailability(data);
    } catch (error) {
      console.error('Error loading availability:', error);
      setAvailability(null);
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

  const getMaxDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + (selectedArea?.advance_booking_days || 30));
    return date.toISOString().split('T')[0];
  };

  const getTypeInfo = (type) => TYPE_INFO[type] || TYPE_INFO.other;

  const getAreaImage = (area) => {
    if (!area) return DEFAULT_IMAGES.default;
    return area.image_url || DEFAULT_IMAGES[area.type] || DEFAULT_IMAGES.default;
  };

  const getAreasForCategory = (categoryTypes) => {
    return areas.filter(area => categoryTypes.includes(area.type));
  };

  const isAreaPaid = (area) => area?.hourly_rate && parseFloat(area.hourly_rate) > 0;

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

  const isReservationActive = (reservation) => {
    const today = getTodayDate();
    return reservation.reservation_date >= today && 
           (reservation.status === 'approved' || reservation.status === 'pending');
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
        Alert.alert('Límite', 'Puedes seleccionar máximo dos turnos');
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
          if (sortedSlots[i].start_time !== sortedSlots[i-1].end_time) {
            isConsecutive = false;
            break;
          }
        }

        if (isConsecutive) {
          setSelectedSlots(sortedSlots);
        } else {
          Alert.alert('Error', 'Los turnos deben ser consecutivos');
        }
      }
    }
  };

  const handleSubmitReservation = async () => {
    if (!selectedArea || selectedSlots.length === 0) {
      Alert.alert('Error', 'Selecciona un área y horario');
      return;
    }

    const userId = profile?.id || user?.id;
    if (!userId) {
      Alert.alert('Error', 'No se pudo identificar el usuario');
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
        Alert.alert('Error', data.error || 'Error al crear la reserva');
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
      Alert.alert('Error', 'Error al crear la reserva');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelReservation = async (reservation) => {
    Alert.alert(
      'Cancelar Reserva',
      '¿Estás seguro de cancelar esta reserva?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('area_reservations')
                .update({
                  status: 'cancelled',
                  cancelled_at: new Date().toISOString(),
                  cancelled_by: profile?.id || user?.id
                })
                .eq('id', reservation.id);

              if (error) throw error;
              loadMyReservations();
              Alert.alert('Listo', 'Reserva cancelada');
            } catch (error) {
              Alert.alert('Error', 'No se pudo cancelar');
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D4FE48" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reservas</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Create Button */}
      <View style={styles.createButtonContainer}>
        <TouchableOpacity style={styles.createButton} onPress={handleOpenCreate}>
          <Ionicons name="calendar" size={20} color="#000" />
          <Text style={styles.createButtonText}>Crear Reserva</Text>
        </TouchableOpacity>
      </View>

      {/* My Reservations */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mis Reservas</Text>
      </View>

      <FlatList
        data={myReservations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4FE48" />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No tienes reservas</Text>
            <Text style={styles.emptySubtitle}>Crea una nueva reserva para comenzar</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isActive = isReservationActive(item);
          const area = getAreaById(item.area_id);
          
          return (
            <TouchableOpacity 
              style={styles.reservationCard}
              onPress={() => handleViewDetail(item)}
            >
              <Image
                source={{ uri: getAreaImage(area) }}
                style={styles.reservationImage}
              />
              <View style={styles.reservationInfo}>
                <Text style={styles.reservationAreaName}>{area?.name || 'Área'}</Text>
                <Text style={styles.reservationDate}>
                  {formatDate(item.reservation_date)}
                </Text>
                <Text style={styles.reservationTime}>
                  {formatTime(item.start_time)} - {formatTime(item.end_time)}
                </Text>
              </View>
              <View style={styles.reservationActions}>
                <View style={[styles.statusBadge, { backgroundColor: isActive ? '#D4FE48' : '#FEE2E2' }]}>
                  <Text style={styles.statusText}>{isActive ? 'ACTIVA' : 'PASADA'}</Text>
                </View>
                {isActive && (
                  <TouchableOpacity onPress={() => handleCancelReservation(item)}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Create Reservation Modal */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Crear nueva reserva</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Category Selection */}
            <Text style={styles.modalLabel}>Selecciona el área</Text>
            
            {CATEGORIES.map(category => {
              const categoryAreas = getAreasForCategory(category.types);
              if (categoryAreas.length === 0) return null;

              return (
                <View key={category.id} style={styles.categoryContainer}>
                  <TouchableOpacity
                    style={styles.categoryButton}
                    onPress={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                  >
                    <Text style={styles.categoryButtonText}>{category.label}</Text>
                    <Ionicons 
                      name={expandedCategory === category.id ? "chevron-down" : "chevron-forward"} 
                      size={20} 
                      color="#000" 
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
                                Capacidad: {area.capacity} personas
                              </Text>
                            </View>
                            <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
                              {isSelected && <Ionicons name="checkmark" size={16} color="#000" />}
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
                <Text style={styles.modalLabel}>Selecciona día</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.datesScroll}
                >
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
                <Text style={styles.modalLabel}>Selecciona horario disponible</Text>
                
                {loadingAvailability ? (
                  <ActivityIndicator color="#D4FE48" style={{ marginVertical: 20 }} />
                ) : !availability?.available ? (
                  <Text style={styles.noAvailability}>
                    {availability?.reason || 'No disponible para esta fecha'}
                  </Text>
                ) : (
                  <View style={styles.slotsGrid}>
                    {availability.slots?.map((slot, idx) => {
                      const isSelected = selectedSlots.some(
                        s => s.start_time === slot.start_time && s.end_time === slot.end_time
                      );
                      
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.slotButton,
                            !slot.available && styles.slotUnavailable,
                            isSelected && styles.slotSelected
                          ]}
                          onPress={() => handleSlotToggle(slot)}
                          disabled={!slot.available}
                        >
                          <Text style={[
                            styles.slotText,
                            !slot.available && styles.slotTextUnavailable,
                            isSelected && styles.slotTextSelected
                          ]}>
                            {formatTime(slot.start_time)}
                          </Text>
                          <Text style={[
                            styles.slotTextSmall,
                            !slot.available && styles.slotTextUnavailable,
                            isSelected && styles.slotTextSelected
                          ]}>
                            {formatTime(slot.end_time)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                
                {availability?.available && (
                  <Text style={styles.slotHint}>Puedes seleccionar máximo 2 turnos consecutivos</Text>
                )}
              </>
            )}

            {/* Attendees */}
            {selectedArea && selectedSlots.length > 0 && (
              <>
                <Text style={styles.modalLabel}>Cantidad de personas</Text>
                <View style={styles.attendeesContainer}>
                  <TouchableOpacity
                    style={styles.attendeeButton}
                    onPress={() => setAttendees(Math.max(1, attendees - 1))}
                  >
                    <Ionicons name="remove" size={24} color="#FFF" />
                  </TouchableOpacity>
                  <Text style={styles.attendeesText}>{attendees}</Text>
                  <TouchableOpacity
                    style={styles.attendeeButton}
                    onPress={() => setAttendees(Math.min(selectedArea.capacity || 20, attendees + 1))}
                  >
                    <Ionicons name="add" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.capacityHint}>
                  Capacidad máxima: {selectedArea.capacity} personas
                </Text>
              </>
            )}

            {/* Submit Button */}
            {selectedArea && selectedSlots.length > 0 && (
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmitReservation}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Ionicons name="arrow-forward" size={20} color="#000" />
                    <Text style={styles.submitButtonText}>Crear Reserva</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
        {selectedReservation && (() => {
          const detailArea = getAreaById(selectedReservation.area_id);
          return (
            <View style={styles.detailModalContainer}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>{detailArea?.name || 'Área'}</Text>
                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                  <Ionicons name="close-circle" size={32} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <Image source={{ uri: getAreaImage(detailArea) }} style={styles.detailImage} />

              <View style={styles.detailContent}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar" size={24} color="#D4FE48" />
                  <Text style={styles.detailText}>{formatDate(selectedReservation.reservation_date)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time" size={24} color="#D4FE48" />
                  <Text style={styles.detailText}>
                    {formatTime(selectedReservation.start_time)} - {formatTime(selectedReservation.end_time)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="people" size={24} color="#D4FE48" />
                  <Text style={styles.detailText}>{selectedReservation.attendees || 1} personas</Text>
                </View>

                <View style={styles.codeContainer}>
                  <Text style={styles.codeLabel}>Código de reserva</Text>
                  <Text style={styles.codeValue}>
                    {selectedReservation.id.substring(0, 8).toUpperCase()}
                  </Text>
                </View>

                {detailArea?.rules && (
                  <View style={styles.rulesContainer}>
                    <Text style={styles.rulesTitle}>Reglas del área:</Text>
                    <Text style={styles.rulesText}>{detailArea.rules}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })()}
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.successContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color="#D4FE48" />
            </View>
            <Text style={styles.successTitle}>¡Reserva creada!</Text>
            <Text style={styles.successSubtitle}>Tu reserva ha sido registrada exitosamente</Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successButtonText}>Ver mis reservas</Text>
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
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  createButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4FE48',
    borderRadius: 50,
    paddingVertical: 16,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  reservationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  reservationImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
  },
  reservationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reservationAreaName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  reservationDate: {
    fontSize: 14,
    color: '#374151',
    marginTop: 2,
  },
  reservationTime: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  reservationActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 20,
    marginBottom: 12,
  },
  categoryContainer: {
    marginBottom: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#D4FE48',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  areasContainer: {
    marginTop: 8,
  },
  areaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  areaOptionSelected: {
    borderColor: '#D4FE48',
    backgroundColor: 'rgba(212,254,72,0.1)',
  },
  areaIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaOptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  areaOptionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFF',
  },
  areaOptionCapacity: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#D4FE48',
    backgroundColor: '#D4FE48',
  },
  datesScroll: {
    marginBottom: 8,
  },
  dateChip: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dateChipSelected: {
    backgroundColor: '#D4FE48',
    borderColor: '#D4FE48',
  },
  dateDayName: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'capitalize',
  },
  dateDayNum: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginVertical: 2,
  },
  dateMonth: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'capitalize',
  },
  dateTextSelected: {
    color: '#000',
  },
  noAvailability: {
    color: '#F59E0B',
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotButton: {
    width: (width - 60) / 3,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  slotUnavailable: {
    opacity: 0.3,
  },
  slotSelected: {
    backgroundColor: '#D4FE48',
    borderColor: '#D4FE48',
  },
  slotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  slotTextSmall: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  slotTextUnavailable: {
    color: '#6B7280',
  },
  slotTextSelected: {
    color: '#000',
  },
  slotHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 12,
  },
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  attendeeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeesText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
    minWidth: 50,
    textAlign: 'center',
  },
  capacityHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4FE48',
    borderRadius: 50,
    paddingVertical: 16,
    marginTop: 30,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },

  // Detail Modal
  detailModalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  detailImage: {
    width: '100%',
    height: 200,
  },
  detailContent: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  detailText: {
    fontSize: 16,
    color: '#374151',
  },
  codeContainer: {
    backgroundColor: '#D4FE48',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  codeLabel: {
    fontSize: 12,
    color: '#000',
    opacity: 0.6,
  },
  codeValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 2,
    marginTop: 4,
  },
  rulesContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  rulesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  rulesText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  // Success Modal
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  successContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    width: '100%',
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  successButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: '#D4FE48',
    borderRadius: 50,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});