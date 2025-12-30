// app/admin/reservations.js
// ISSY Resident App - Admin Panel para Gestión de Reservas (ProHome Dark Theme)

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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/config/supabase';
import { useAuth } from '../../src/context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ProHome Dark Theme Colors
const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  lime: '#D4FE48',
  teal: '#5DDED8',
  purple: '#6366F1',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  border: 'rgba(255,255,255,0.1)',
};

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: COLORS.warning, bgColor: COLORS.warning + '20', icon: 'time' },
  approved: { label: 'Aprobada', color: COLORS.success, bgColor: COLORS.success + '20', icon: 'checkmark-circle' },
  rejected: { label: 'Rechazada', color: COLORS.danger, bgColor: COLORS.danger + '20', icon: 'close-circle' },
  cancelled: { label: 'Cancelada', color: COLORS.textMuted, bgColor: COLORS.backgroundTertiary, icon: 'ban' },
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
  
  const [activeTab, setActiveTab] = useState('pending');
  const [reservations, setReservations] = useState([]);
  const [areas, setAreas] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(null);
  
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
        .select('id, name, email, phone');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const getAreaById = (id) => areas.find(a => a.id === id);
  const getUserById = (id) => users.find(u => u.id === id);
  const getTypeInfo = (type) => TYPE_INFO[type] || TYPE_INFO.other;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-HN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  const handleApprove = async (reservation) => {
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
      
      Alert.alert('Listo', 'Reserva aprobada');
      loadReservations();
      setShowDetailModal(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo aprobar la reserva');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = (reservation) => {
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

  const filteredReservations = activeTab === 'pending'
    ? reservations.filter(r => r.status === 'pending')
    : reservations;

  const pendingCount = reservations.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
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
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Reservas</Text>
        <View style={{ width: scale(40) }} />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="time" size={24} color={COLORS.warning} />
          <Text style={[styles.statNumber, { color: COLORS.warning }]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
          <Text style={[styles.statNumber, { color: COLORS.success }]}>
            {reservations.filter(r => r.status === 'approved').length}
          </Text>
          <Text style={styles.statLabel}>Aprobadas</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="close-circle" size={24} color={COLORS.danger} />
          <Text style={[styles.statNumber, { color: COLORS.danger }]}>
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
          <Ionicons 
            name="hourglass" 
            size={16} 
            color={activeTab === 'pending' ? COLORS.background : COLORS.textSecondary} 
          />
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
          <Ionicons 
            name="list" 
            size={16} 
            color={activeTab === 'all' ? COLORS.background : COLORS.textSecondary} 
          />
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
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={COLORS.lime} 
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={COLORS.textMuted} />
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
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.areaIcon, { backgroundColor: typeInfo.color + '30' }]}>
                  <Ionicons name={typeInfo.icon} size={24} color={typeInfo.color} />
                </View>
                <View style={styles.cardHeaderInfo}>
                  <Text style={styles.areaName}>{area?.name || 'Área'}</Text>
                  <View style={styles.userRow}>
                    <Ionicons name="person" size={12} color={COLORS.textSecondary} />
                    <Text style={styles.userName}>{reqUser?.name || 'Usuario'}</Text>
                  </View>
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
                  <Ionicons name="calendar" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.infoText}>{formatDate(item.reservation_date)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="time" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.infoText}>
                    {formatTime(item.start_time)} - {formatTime(item.end_time)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="people" size={16} color={COLORS.textSecondary} />
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
                    <Ionicons name="close" size={20} color={COLORS.danger} />
                    <Text style={styles.rejectButtonText}>Rechazar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApprove(item)}
                    disabled={processing === item.id}
                  >
                    {processing === item.id ? (
                      <ActivityIndicator color={COLORS.background} size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={20} color={COLORS.background} />
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
            <SafeAreaView style={styles.modalContainer} edges={['top']}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                  <Ionicons name="close" size={28} color={COLORS.textPrimary} />
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
                    <Ionicons name="information-circle" size={20} color={COLORS.teal} />
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
                      <Ionicons name="close-circle" size={24} color={COLORS.danger} />
                      <Text style={styles.modalRejectText}>Rechazar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalApproveButton]}
                      onPress={() => handleApprove(selectedReservation)}
                      disabled={processing === selectedReservation.id}
                    >
                      {processing === selectedReservation.id ? (
                        <ActivityIndicator color={COLORS.background} size="small" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={24} color={COLORS.background} />
                          <Text style={styles.modalApproveText}>Aprobar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Metadata */}
                <View style={styles.metadataCard}>
                  <Text style={styles.metadataText}>
                    Creado: {new Date(selectedReservation.created_at).toLocaleString('es-HN')}
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
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: scale(12),
    fontSize: scale(14),
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
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
    alignItems: 'center',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: scale(4),
  },
  statLabel: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    gap: scale(10),
    marginBottom: scale(8),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(12),
    borderRadius: scale(12),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(6),
  },
  activeTab: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  tabText: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.background,
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: COLORS.danger,
    borderRadius: scale(10),
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    marginLeft: scale(4),
  },
  tabBadgeText: {
    fontSize: scale(11),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  
  // List
  listContent: {
    padding: scale(16),
    paddingBottom: scale(100),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: scale(60),
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
    marginTop: scale(4),
    textAlign: 'center',
    paddingHorizontal: scale(40),
  },
  
  // Reservation Card
  reservationCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  areaIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
    marginLeft: scale(12),
  },
  areaName: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: scale(2),
  },
  userName: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(8),
    gap: scale(4),
  },
  statusText: {
    fontSize: scale(12),
    fontWeight: '500',
  },
  cardBody: {
    gap: scale(8),
    paddingBottom: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  infoText: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: scale(12),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(12),
    borderRadius: scale(10),
    gap: scale(6),
  },
  rejectButton: {
    backgroundColor: COLORS.danger + '20',
  },
  rejectButtonText: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.danger,
  },
  approveButton: {
    backgroundColor: COLORS.lime,
  },
  approveButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.background,
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
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: scale(16),
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    gap: scale(8),
    marginBottom: scale(16),
  },
  statusBannerText: {
    fontSize: scale(16),
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginBottom: scale(4),
  },
  sectionValue: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionSubtext: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  rulesCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.teal + '15',
    borderRadius: scale(12),
    padding: scale(12),
    gap: scale(8),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.teal + '30',
  },
  rulesText: {
    flex: 1,
    fontSize: scale(13),
    color: COLORS.teal,
  },
  modalActions: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: scale(20),
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    gap: scale(8),
  },
  modalRejectButton: {
    backgroundColor: COLORS.danger + '20',
  },
  modalRejectText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.danger,
  },
  modalApproveButton: {
    backgroundColor: COLORS.lime,
  },
  modalApproveText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.background,
  },
  metadataCard: {
    marginTop: 'auto',
    paddingTop: scale(16),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  metadataText: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});