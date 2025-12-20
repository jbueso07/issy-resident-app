// app/admin/reservations.js
// ISSY Resident App - Admin Panel para Gestión de Reservas
// Aprobar/Rechazar solicitudes pendientes

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
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/config/supabase';
import { useAuth } from '../../src/context/AuthContext';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: '#F59E0B', bgColor: '#FEF3C7', icon: 'time' },
  approved: { label: 'Aprobada', color: '#10B981', bgColor: '#D1FAE5', icon: 'checkmark-circle' },
  rejected: { label: 'Rechazada', color: '#EF4444', bgColor: '#FEE2E2', icon: 'close-circle' },
  cancelled: { label: 'Cancelada', color: '#6B7280', bgColor: '#F3F4F6', icon: 'ban' },
};

const TYPE_INFO = {
  pool: { icon: 'water', color: '#3B82F6' },
  gym: { icon: 'fitness', color: '#EF4444' },
  court: { icon: 'tennisball', color: '#10B981' },
  bbq: { icon: 'flame', color: '#F59E0B' },
  salon: { icon: 'wine', color: '#8B5CF6' },
  playground: { icon: 'happy', color: '#EC4899' },
  terrace: { icon: 'sunny', color: '#6366F1' },
  garden: { icon: 'leaf', color: '#22C55E' },
  other: { icon: 'grid', color: '#78716C' }
};

export default function AdminReservationsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all'
  const [reservations, setReservations] = useState([]);
  const [areas, setAreas] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(null);
  
  // Detail modal
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const locationId = profile?.location_id || user?.location_id;

  useEffect(() => {
    if (locationId) {
      fetchData();
    }
  }, [locationId]);

  const fetchData = async () => {
    try {
      await Promise.all([loadReservations(), loadAreas(), loadUsers()]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('area_reservations')
        .select('*')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error('Error loading reservations:', error);
    }
  };

  const loadAreas = async () => {
    try {
      const { data, error } = await supabase
        .from('common_areas')
        .select('id, name, type, capacity, rules')
        .eq('location_id', locationId);

      if (error) throw error;
      setAreas(data || []);
    } catch (error) {
      console.error('Error loading areas:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, phone, profile_photo_url')
        .eq('location_id', locationId);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [locationId]);

  // Helpers
  const getAreaById = (areaId) => areas.find(a => a.id === areaId);
  const getUserById = (userId) => users.find(u => u.id === userId);
  const getTypeInfo = (type) => TYPE_INFO[type] || TYPE_INFO.other;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-HN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'p.m.' : 'a.m.';
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hour}:${minutes || '00'} ${ampm}`;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-HN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Actions
  const handleApprove = async (reservation) => {
    Alert.alert(
      'Aprobar Reserva',
      '¿Confirmas aprobar esta reserva?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          onPress: async () => {
            setProcessing(reservation.id);
            try {
              const { error } = await supabase
                .from('area_reservations')
                .update({
                  status: 'approved',
                  approved_at: new Date().toISOString(),
                  approved_by: profile?.id || user?.id
                })
                .eq('id', reservation.id);

              if (error) throw error;
              
              Alert.alert('¡Listo!', 'Reserva aprobada');
              loadReservations();
              setShowDetailModal(false);
            } catch (error) {
              Alert.alert('Error', 'No se pudo aprobar la reserva');
            } finally {
              setProcessing(null);
            }
          }
        }
      ]
    );
  };

  const handleReject = async (reservation) => {
    Alert.alert(
      'Rechazar Reserva',
      '¿Estás seguro de rechazar esta reserva?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            setProcessing(reservation.id);
            try {
              const { error } = await supabase
                .from('area_reservations')
                .update({
                  status: 'rejected',
                  rejected_at: new Date().toISOString(),
                  rejected_by: profile?.id || user?.id
                })
                .eq('id', reservation.id);

              if (error) throw error;
              
              Alert.alert('Listo', 'Reserva rechazada');
              loadReservations();
              setShowDetailModal(false);
            } catch (error) {
              Alert.alert('Error', 'No se pudo rechazar la reserva');
            } finally {
              setProcessing(null);
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

  // Filter reservations based on tab
  const filteredReservations = activeTab === 'pending'
    ? reservations.filter(r => r.status === 'pending')
    : reservations;

  const pendingCount = reservations.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D4FE48" />
          <Text style={styles.loadingText}>Cargando reservas...</Text>
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
        <Text style={styles.headerTitle}>Gestión de Reservas</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="time" size={24} color="#F59E0B" />
          <Text style={styles.statNumber}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.statNumber}>
            {reservations.filter(r => r.status === 'approved').length}
          </Text>
          <Text style={styles.statLabel}>Aprobadas</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
          <Ionicons name="close-circle" size={24} color="#EF4444" />
          <Text style={styles.statNumber}>
            {reservations.filter(r => r.status === 'rejected').length}
          </Text>
          <Text style={styles.statLabel}>Rechazadas</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pendientes
          </Text>
          {pendingCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            Todas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reservations List */}
      <FlatList
        data={filteredReservations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4FE48" />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>
              {activeTab === 'pending' ? 'No hay solicitudes pendientes' : 'No hay reservas'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'pending' 
                ? 'Las nuevas solicitudes aparecerán aquí' 
                : 'Cuando los residentes hagan reservas, aparecerán aquí'}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const area = getAreaById(item.area_id);
          const reqUser = getUserById(item.user_id);
          const typeInfo = getTypeInfo(area?.type);
          const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;

          return (
            <TouchableOpacity 
              style={styles.reservationCard}
              onPress={() => handleViewDetail(item)}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.areaIcon, { backgroundColor: typeInfo.color + '20' }]}>
                  <Ionicons name={typeInfo.icon} size={24} color={typeInfo.color} />
                </View>
                <View style={styles.cardHeaderInfo}>
                  <Text style={styles.areaName}>{area?.name || 'Área'}</Text>
                  <Text style={styles.userName}>
                    <Ionicons name="person" size={12} color="#6B7280" /> {reqUser?.name || 'Usuario'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                  <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
                  <Text style={[styles.statusText, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar" size={16} color="#6B7280" />
                  <Text style={styles.infoText}>{formatDate(item.reservation_date)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="time" size={16} color="#6B7280" />
                  <Text style={styles.infoText}>
                    {formatTime(item.start_time)} - {formatTime(item.end_time)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="people" size={16} color="#6B7280" />
                  <Text style={styles.infoText}>{item.attendees || 1} personas</Text>
                </View>
              </View>

              {item.status === 'pending' && (
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(item)}
                    disabled={processing === item.id}
                  >
                    <Ionicons name="close" size={20} color="#EF4444" />
                    <Text style={styles.rejectButtonText}>Rechazar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApprove(item)}
                    disabled={processing === item.id}
                  >
                    {processing === item.id ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={20} color="#000" />
                        <Text style={styles.approveButtonText}>Aprobar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
        {selectedReservation && (() => {
          const detailArea = getAreaById(selectedReservation.area_id);
          const detailUser = getUserById(selectedReservation.user_id);
          const statusConfig = STATUS_CONFIG[selectedReservation.status] || STATUS_CONFIG.pending;

          return (
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                  <Ionicons name="close" size={28} color="#000" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Detalle de Reserva</Text>
                <View style={{ width: 28 }} />
              </View>

              <View style={styles.modalContent}>
                {/* Status */}
                <View style={[styles.statusBanner, { backgroundColor: statusConfig.bgColor }]}>
                  <Ionicons name={statusConfig.icon} size={24} color={statusConfig.color} />
                  <Text style={[styles.statusBannerText, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>

                {/* Area Info */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Área</Text>
                  <Text style={styles.sectionValue}>{detailArea?.name}</Text>
                  {detailArea?.capacity && (
                    <Text style={styles.sectionSubtext}>Capacidad: {detailArea.capacity} personas</Text>
                  )}
                </View>

                {/* User Info */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Solicitante</Text>
                  <Text style={styles.sectionValue}>{detailUser?.name || 'Usuario'}</Text>
                  <Text style={styles.sectionSubtext}>{detailUser?.email}</Text>
                  {detailUser?.phone && (
                    <Text style={styles.sectionSubtext}>{detailUser.phone}</Text>
                  )}
                </View>

                {/* Date/Time Info */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Fecha y Hora</Text>
                  <Text style={styles.sectionValue}>{formatDate(selectedReservation.reservation_date)}</Text>
                  <Text style={styles.sectionSubtext}>
                    {formatTime(selectedReservation.start_time)} - {formatTime(selectedReservation.end_time)}
                  </Text>
                  <Text style={styles.sectionSubtext}>
                    {selectedReservation.attendees || 1} personas
                  </Text>
                </View>

                {/* Notes */}
                {selectedReservation.notes && (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Notas</Text>
                    <Text style={styles.sectionSubtext}>{selectedReservation.notes}</Text>
                  </View>
                )}

                {/* Rules */}
                {detailArea?.rules && (
                  <View style={styles.rulesCard}>
                    <Ionicons name="information-circle" size={20} color="#3B82F6" />
                    <Text style={styles.rulesText}>{detailArea.rules}</Text>
                  </View>
                )}

                {/* Actions for pending */}
                {selectedReservation.status === 'pending' && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalRejectButton]}
                      onPress={() => handleReject(selectedReservation)}
                      disabled={processing === selectedReservation.id}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                      <Text style={styles.modalRejectText}>Rechazar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalApproveButton]}
                      onPress={() => handleApprove(selectedReservation)}
                      disabled={processing === selectedReservation.id}
                    >
                      {processing === selectedReservation.id ? (
                        <ActivityIndicator color="#000" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={24} color="#000" />
                          <Text style={styles.modalApproveText}>Aprobar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Metadata */}
                <View style={styles.metadataCard}>
                  <Text style={styles.metadataText}>
                    Código: {selectedReservation.id.substring(0, 8).toUpperCase()}
                  </Text>
                  <Text style={styles.metadataText}>
                    Creada: {formatDateTime(selectedReservation.created_at)}
                  </Text>
                </View>
              </View>
            </SafeAreaView>
          );
        })()}
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
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#D4FE48',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#000',
  },
  tabBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  
  // List
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
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  
  // Reservation Card
  reservationCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  areaIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  areaName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  userName: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardBody: {
    gap: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  rejectButton: {
    backgroundColor: '#FEE2E2',
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#EF4444',
  },
  approveButton: {
    backgroundColor: '#D4FE48',
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  statusBannerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  sectionSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  rulesCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  rulesText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  modalRejectButton: {
    backgroundColor: '#FEE2E2',
  },
  modalRejectText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  modalApproveButton: {
    backgroundColor: '#D4FE48',
  },
  modalApproveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  metadataCard: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  metadataText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});