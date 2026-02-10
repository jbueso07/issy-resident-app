// app/marketplace-hub/provider/bookings.js
// ISSY Marketplace - Provider Bookings Management
// Línea gráfica ProHome

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { getProviderBookings, updateBookingStatus, sendQuote } from '../../../src/services/marketplaceApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ============ COLORES PROHOME ============
const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  bgCardAlt: '#243B44',
  lime: '#AAFF00',
  cyan: '#00E5FF',
  teal: '#00BFA6',
  orange: '#FF8A50',
  purple: '#A78BFA',
  green: '#10B981',
  blue: '#60A5FA',
  yellow: '#FBBF24',
  red: '#EF4444',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  border: 'rgba(255, 255, 255, 0.1)',
};

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: COLORS.yellow, icon: 'time' },
  quote_requested: { label: 'Cotización', color: COLORS.orange, icon: 'document-text' },
  quote_sent: { label: 'Cotización Enviada', color: COLORS.purple, icon: 'paper-plane' },
  confirmed: { label: 'Confirmado', color: COLORS.teal, icon: 'checkmark-circle' },
  in_progress: { label: 'En Progreso', color: COLORS.blue, icon: 'play-circle' },
  completed: { label: 'Completado', color: COLORS.green, icon: 'checkmark-done' },
  cancelled: { label: 'Cancelado', color: COLORS.red, icon: 'close-circle' },
};

const TABS = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'active', label: 'Activos' },
  { id: 'completed', label: 'Historial' },
];

export default function ProviderBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [quoteData, setQuoteData] = useState({ price: '', message: '' });

  const fetchBookings = useCallback(async () => {
    try {
      let statusFilter = '';
      switch (activeTab) {
        case 'pending':
          statusFilter = 'pending,quote_requested';
          break;
        case 'active':
          statusFilter = 'confirmed,in_progress,quote_sent';
          break;
        case 'completed':
          statusFilter = 'completed,cancelled';
          break;
      }

      const result = await getProviderBookings({ status: statusFilter });
      if (result.success) {
        setBookings(result.data.bookings || result.data || []);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      const result = await updateBookingStatus(bookingId, newStatus);
      if (result.success) {
        fetchBookings();
        Alert.alert('Éxito', 'Estado actualizado correctamente');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const handleSendQuote = async () => {
    if (!quoteData.price) {
      Alert.alert('Error', 'Ingresa un precio para la cotización');
      return;
    }

    try {
      const result = await sendQuote(selectedBooking.id, {
        price: parseFloat(quoteData.price),
        message: quoteData.message,
      });

      if (result.success) {
        setQuoteModalVisible(false);
        setQuoteData({ price: '', message: '' });
        setSelectedBooking(null);
        fetchBookings();
        Alert.alert('Éxito', 'Cotización enviada correctamente');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar la cotización');
    }
  };

  const openQuoteModal = (booking) => {
    setSelectedBooking(booking);
    setQuoteModalVisible(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderBookingCard = ({ item }) => {
    const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => router.push(`/marketplace-hub/booking/${item.id}`)}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.customerInfo}>
            <View style={styles.customerAvatar}>
              <Text style={styles.avatarText}>
                {item.customer?.name?.charAt(0) || 'C'}
              </Text>
            </View>
            <View>
              <Text style={styles.customerName}>{item.customer?.name || 'Cliente'}</Text>
              <Text style={styles.bookingDate}>{formatDate(item.scheduled_date)}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}20` }]}>
            <Ionicons name={statusInfo.icon} size={scale(12)} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* Service Info */}
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{item.service?.name || 'Servicio'}</Text>
          {item.notes && (
            <Text style={styles.serviceNotes} numberOfLines={2}>{item.notes}</Text>
          )}
        </View>

        {/* Price */}
        {item.total_price && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Precio:</Text>
            <Text style={styles.priceValue}>${item.total_price}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.cardActions}>
          {item.status === 'quote_requested' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.lime }]}
              onPress={() => openQuoteModal(item)}
            >
              <Ionicons name="paper-plane" size={scale(16)} color={COLORS.bgPrimary} />
              <Text style={styles.actionBtnTextDark}>Enviar Cotización</Text>
            </TouchableOpacity>
          )}

          {item.status === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.teal }]}
                onPress={() => handleStatusUpdate(item.id, 'confirmed')}
              >
                <Ionicons name="checkmark" size={scale(16)} color={COLORS.textPrimary} />
                <Text style={styles.actionBtnText}>Confirmar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.bgCardAlt }]}
                onPress={() => handleStatusUpdate(item.id, 'cancelled')}
              >
                <Ionicons name="close" size={scale(16)} color={COLORS.red} />
                <Text style={[styles.actionBtnText, { color: COLORS.red }]}>Rechazar</Text>
              </TouchableOpacity>
            </>
          )}

          {item.status === 'confirmed' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.blue }]}
              onPress={() => handleStatusUpdate(item.id, 'in_progress')}
            >
              <Ionicons name="play" size={scale(16)} color={COLORS.textPrimary} />
              <Text style={styles.actionBtnText}>Iniciar</Text>
            </TouchableOpacity>
          )}

          {item.status === 'in_progress' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.green }]}
              onPress={() => handleStatusUpdate(item.id, 'completed')}
            >
              <Ionicons name="checkmark-done" size={scale(16)} color={COLORS.textPrimary} />
              <Text style={styles.actionBtnText}>Completar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => router.push(`/marketplace-hub/chat/${item.conversation_id || item.id}`)}
          >
            <Ionicons name="chatbubble" size={scale(18)} color={COLORS.cyan} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={scale(60)} color={COLORS.textMuted} />
      <Text style={styles.emptyTitle}>Sin Reservas</Text>
      <Text style={styles.emptyText}>
        {activeTab === 'pending'
          ? 'No tienes reservas pendientes de atender'
          : activeTab === 'active'
          ? 'No tienes reservas activas en este momento'
          : 'Aún no tienes historial de reservas'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={scale(24)} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Reservas</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bookings List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.teal} />
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBookingCard}
          keyExtractor={(item) => item.id?.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.teal}
              colors={[COLORS.teal]}
            />
          }
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Quote Modal */}
      <Modal
        visible={quoteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQuoteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enviar Cotización</Text>
              <TouchableOpacity onPress={() => setQuoteModalVisible(false)}>
                <Ionicons name="close" size={scale(24)} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedBooking && (
              <View style={styles.modalServiceInfo}>
                <Text style={styles.modalServiceName}>{selectedBooking.service?.name}</Text>
                <Text style={styles.modalCustomerName}>
                  Para: {selectedBooking.customer?.name}
                </Text>
              </View>
            )}

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Precio ($)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
                value={quoteData.price}
                onChangeText={(v) => setQuoteData(prev => ({ ...prev, price: v.replace(/[^0-9.]/g, '') }))}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Mensaje (opcional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Detalles de la cotización..."
                placeholderTextColor={COLORS.textMuted}
                value={quoteData.message}
                onChangeText={(v) => setQuoteData(prev => ({ ...prev, message: v }))}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSendQuote}>
              <Ionicons name="paper-plane" size={scale(18)} color={COLORS.bgPrimary} />
              <Text style={styles.modalSubmitText}>Enviar Cotización</Text>
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
    backgroundColor: COLORS.bgPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSpacer: {
    width: scale(40),
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    gap: scale(8),
  },
  tab: {
    flex: 1,
    paddingVertical: scale(10),
    borderRadius: scale(8),
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.teal,
  },
  tabText: {
    fontSize: scale(13),
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.bgPrimary,
    fontWeight: '600',
  },
  listContent: {
    padding: scale(16),
    paddingBottom: scale(100),
  },
  bookingCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(12),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  customerAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.bgPrimary,
  },
  customerName: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  bookingDate: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  statusText: {
    fontSize: scale(11),
    fontWeight: '500',
  },
  serviceInfo: {
    paddingVertical: scale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: scale(12),
  },
  serviceName: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  serviceNotes: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  priceLabel: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  priceValue: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.lime,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    borderRadius: scale(8),
    gap: scale(6),
  },
  actionBtnText: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  actionBtnTextDark: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.bgPrimary,
  },
  chatBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(8),
    backgroundColor: COLORS.bgCardAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(32),
    paddingTop: scale(60),
  },
  emptyTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  emptyText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scale(20),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.bgSecondary,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    padding: scale(20),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  modalTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalServiceInfo: {
    backgroundColor: COLORS.bgCard,
    padding: scale(12),
    borderRadius: scale(12),
    marginBottom: scale(16),
  },
  modalServiceName: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalCustomerName: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(4),
  },
  modalInputGroup: {
    marginBottom: scale(16),
  },
  modalLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  modalInput: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(12),
    padding: scale(14),
    fontSize: scale(15),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTextArea: {
    minHeight: scale(80),
    textAlignVertical: 'top',
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    paddingVertical: scale(16),
    borderRadius: scale(12),
    gap: scale(8),
    marginTop: scale(8),
  },
  modalSubmitText: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.bgPrimary,
  },
});
