// app/reservations.js
// ISSY Resident App - Pantalla de Reservaciones

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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  getCommonAreas, 
  getMyReservations, 
  createReservation, 
  cancelReservation 
} from '../src/services/api';

export default function ReservationsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('areas'); // 'areas' | 'myreservations'
  const [commonAreas, setCommonAreas] = useState([]);
  const [myReservations, setMyReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [reservationModal, setReservationModal] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);
  const [reservationDate, setReservationDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000));
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [areasResult, reservationsResult] = await Promise.all([
        getCommonAreas(),
        getMyReservations()
      ]);
      
      if (areasResult.success) {
        setCommonAreas(areasResult.data || []);
      }
      if (reservationsResult.success) {
        setMyReservations(reservationsResult.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleOpenReservation = (area) => {
    setSelectedArea(area);
    setReservationDate(new Date());
    setStartTime(new Date());
    setEndTime(new Date(Date.now() + 2 * 60 * 60 * 1000));
    setNotes('');
    setReservationModal(true);
  };

  const handleCreateReservation = async () => {
    if (!selectedArea) return;

    setSubmitting(true);
    try {
      // Combinar fecha con horas
      const startDateTime = new Date(reservationDate);
      startDateTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
      
      const endDateTime = new Date(reservationDate);
      endDateTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

      const result = await createReservation({
        common_area_id: selectedArea.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        notes: notes || null,
      });

      if (result.success) {
        Alert.alert('¡Éxito!', 'Tu reservación ha sido creada');
        setReservationModal(false);
        fetchData();
      } else {
        Alert.alert('Error', result.error || 'No se pudo crear la reservación');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al crear la reservación');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelReservation = (reservation) => {
    Alert.alert(
      'Cancelar Reservación',
      '¿Estás seguro que deseas cancelar esta reservación?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Sí, cancelar', 
          style: 'destructive',
          onPress: async () => {
            const result = await cancelReservation(reservation.id);
            if (result.success) {
              Alert.alert('Cancelada', 'La reservación ha sido cancelada');
              fetchData();
            } else {
              Alert.alert('Error', result.error || 'No se pudo cancelar');
            }
          }
        },
      ]
    );
  };

  const getAreaIcon = (type) => {
    switch (type) {
      case 'pool': return 'water-outline';
      case 'gym': return 'fitness-outline';
      case 'party_room': return 'wine-outline';
      case 'bbq': return 'flame-outline';
      case 'court': return 'tennisball-outline';
      case 'meeting_room': return 'people-outline';
      case 'rooftop': return 'sunny-outline';
      default: return 'grid-outline';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'pending': return 'Pendiente';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderAreaCard = ({ item }) => (
    <TouchableOpacity
      style={styles.areaCard}
      onPress={() => handleOpenReservation(item)}
      activeOpacity={0.7}
    >
      <View style={styles.areaIconContainer}>
        <LinearGradient
          colors={['#FC6447', '#FF5A5F']}
          style={styles.areaIconGradient}
        >
          <Ionicons name={getAreaIcon(item.type)} size={28} color="#FFFFFF" />
        </LinearGradient>
      </View>
      <View style={styles.areaInfo}>
        <Text style={styles.areaName}>{item.name}</Text>
        <Text style={styles.areaCapacity}>
          <Ionicons name="people-outline" size={14} color="#6B7280" /> Capacidad: {item.capacity || 'N/A'} personas
        </Text>
        {item.hourly_rate && (
          <Text style={styles.areaPrice}>
            L. {item.hourly_rate}/hora
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
    </TouchableOpacity>
  );

  const renderReservationCard = ({ item }) => {
    const isPast = new Date(item.end_time) < new Date();
    const canCancel = item.status !== 'cancelled' && !isPast;

    return (
      <View style={[styles.reservationCard, isPast && styles.pastReservation]}>
        <View style={styles.reservationHeader}>
          <View style={styles.reservationIconContainer}>
            <Ionicons 
              name={getAreaIcon(item.common_area?.type)} 
              size={24} 
              color="#FC6447" 
            />
          </View>
          <View style={styles.reservationInfo}>
            <Text style={styles.reservationAreaName}>
              {item.common_area?.name || 'Área común'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.reservationDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>
              {formatDateTime(item.start_time)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>
              {new Date(item.start_time).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })} - {new Date(item.end_time).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {canCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelReservation(item)}
          >
            <Text style={styles.cancelButtonText}>Cancelar Reservación</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmptyAreas = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="grid-outline" size={64} color="#D1D5DB" />
      </View>
      <Text style={styles.emptyTitle}>No hay áreas disponibles</Text>
      <Text style={styles.emptySubtitle}>
        Tu comunidad aún no tiene áreas comunes registradas
      </Text>
    </View>
  );

  const renderEmptyReservations = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
      </View>
      <Text style={styles.emptyTitle}>Sin reservaciones</Text>
      <Text style={styles.emptySubtitle}>
        Aún no tienes reservaciones. Explora las áreas disponibles para reservar.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => setActiveTab('areas')}
      >
        <Text style={styles.emptyButtonText}>Ver Áreas Comunes</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FC6447" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reservaciones</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'areas' && styles.activeTab]}
          onPress={() => setActiveTab('areas')}
        >
          <Text style={[styles.tabText, activeTab === 'areas' && styles.activeTabText]}>
            Áreas Comunes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'myreservations' && styles.activeTab]}
          onPress={() => setActiveTab('myreservations')}
        >
          <Text style={[styles.tabText, activeTab === 'myreservations' && styles.activeTabText]}>
            Mis Reservaciones
          </Text>
          {myReservations.filter(r => r.status !== 'cancelled').length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {myReservations.filter(r => r.status !== 'cancelled').length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={activeTab === 'areas' ? commonAreas : myReservations}
        renderItem={activeTab === 'areas' ? renderAreaCard : renderReservationCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FC6447']}
            tintColor="#FC6447"
          />
        }
        ListEmptyComponent={activeTab === 'areas' ? renderEmptyAreas : renderEmptyReservations}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal de Nueva Reservación */}
      <Modal
        visible={reservationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setReservationModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setReservationModal(false)}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Nueva Reservación</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedArea && (
              <>
                {/* Área seleccionada */}
                <View style={styles.selectedAreaCard}>
                  <LinearGradient
                    colors={['#FC6447', '#FF5A5F']}
                    style={styles.selectedAreaIcon}
                  >
                    <Ionicons name={getAreaIcon(selectedArea.type)} size={32} color="#FFFFFF" />
                  </LinearGradient>
                  <View>
                    <Text style={styles.selectedAreaName}>{selectedArea.name}</Text>
                    <Text style={styles.selectedAreaCapacity}>
                      Capacidad: {selectedArea.capacity || 'N/A'} personas
                    </Text>
                  </View>
                </View>

                {/* Fecha */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Fecha</Text>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                    <Text style={styles.dateInputText}>
                      {reservationDate.toLocaleDateString('es-HN', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Hora inicio */}
                <View style={styles.timeRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.formLabel}>Hora Inicio</Text>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => setShowStartTimePicker(true)}
                    >
                      <Ionicons name="time-outline" size={20} color="#6B7280" />
                      <Text style={styles.dateInputText}>
                        {startTime.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.formLabel}>Hora Fin</Text>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => setShowEndTimePicker(true)}
                    >
                      <Ionicons name="time-outline" size={20} color="#6B7280" />
                      <Text style={styles.dateInputText}>
                        {endTime.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Notas */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Notas (opcional)</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Ej: Fiesta de cumpleaños para 15 personas"
                    placeholderTextColor="#9CA3AF"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Precio si aplica */}
                {selectedArea.hourly_rate && (
                  <View style={styles.priceInfo}>
                    <Text style={styles.priceLabel}>Costo estimado</Text>
                    <Text style={styles.priceValue}>
                      L. {(selectedArea.hourly_rate * Math.ceil((endTime - startTime) / (1000 * 60 * 60))).toFixed(2)}
                    </Text>
                  </View>
                )}

                {/* Botón de reservar */}
                <TouchableOpacity
                  style={[styles.reserveButton, submitting && styles.reserveButtonDisabled]}
                  onPress={handleCreateReservation}
                  disabled={submitting}
                >
                  <LinearGradient
                    colors={submitting ? ['#D1D5DB', '#D1D5DB'] : ['#FC6447', '#FF5A5F']}
                    style={styles.reserveButtonGradient}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.reserveButtonText}>Confirmar Reservación</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>

          {/* Date/Time Pickers */}
          {showDatePicker && (
            <DateTimePicker
              value={reservationDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) setReservationDate(date);
              }}
            />
          )}
          {showStartTimePicker && (
            <DateTimePicker
              value={startTime}
              mode="time"
              display="default"
              onChange={(event, time) => {
                setShowStartTimePicker(false);
                if (time) setStartTime(time);
              }}
            />
          )}
          {showEndTimePicker && (
            <DateTimePicker
              value={endTime}
              mode="time"
              display="default"
              onChange={(event, time) => {
                setShowEndTimePicker(false);
                if (time) setEndTime(time);
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
    color: '#1F2937',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#FC6447',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  tabBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FC6447',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  areaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  areaIconContainer: {
    marginRight: 14,
  },
  areaIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaInfo: {
    flex: 1,
  },
  areaName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  areaCapacity: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  areaPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FC6447',
  },
  reservationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pastReservation: {
    opacity: 0.6,
  },
  reservationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reservationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reservationInfo: {
    flex: 1,
  },
  reservationAreaName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  reservationDetails: {
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#FC6447',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  selectedAreaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 16,
  },
  selectedAreaIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedAreaName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  selectedAreaCapacity: {
    fontSize: 14,
    color: '#6B7280',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateInputText: {
    fontSize: 15,
    color: '#1F2937',
    textTransform: 'capitalize',
  },
  timeRow: {
    flexDirection: 'row',
  },
  notesInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FC6447',
  },
  reserveButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 40,
  },
  reserveButtonDisabled: {
    opacity: 0.7,
  },
  reserveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  reserveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});