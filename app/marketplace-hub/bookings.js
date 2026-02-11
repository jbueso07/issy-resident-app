// app/marketplace-hub/bookings.js
// ISSY Marketplace - My Bookings Screen
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { getMyBookings } from '../../src/services/marketplaceApi';

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
  coral: '#FF6B6B',
  green: '#10B981',
  blue: '#60A5FA',
  yellow: '#FBBF24',
  red: '#EF4444',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textDark: '#0F1A1E',

  border: 'rgba(255, 255, 255, 0.1)',
};

// Status config
const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: COLORS.yellow, icon: 'time' },
  confirmed: { label: 'Confirmada', color: COLORS.blue, icon: 'checkmark-circle' },
  in_progress: { label: 'En Progreso', color: COLORS.cyan, icon: 'sync' },
  completed: { label: 'Completada', color: COLORS.green, icon: 'checkmark-done' },
  cancelled: { label: 'Cancelada', color: COLORS.red, icon: 'close-circle' },
  quote_requested: { label: 'Cotización Solicitada', color: COLORS.purple, icon: 'document-text' },
  quote_sent: { label: 'Cotización Recibida', color: COLORS.orange, icon: 'document' },
  quote_accepted: { label: 'Cotización Aceptada', color: COLORS.teal, icon: 'checkmark' },
};

// Tabs
const TABS = [
  { id: 'active', label: 'Activas' },
  { id: 'completed', label: 'Completadas' },
  { id: 'cancelled', label: 'Canceladas' },
];

export default function BookingsScreen() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('active');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    loadBookings();
  }, [activeTab]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const statusFilter = activeTab === 'active' ? 'active'
        : activeTab === 'completed' ? 'completed'
        : activeTab === 'cancelled' ? 'cancelled'
        : undefined;

      const result = await getMyBookings({ status: statusFilter });
      if (result.success) {
        const bookingsData = Array.isArray(result.data) ? result.data : (result.data?.bookings || []);
        setBookings(bookingsData.map(b => ({
          ...b,
          bookingNumber: b.booking_number || b.bookingNumber || `BK-${b.id?.slice(0, 8) || ''}`,
          serviceTitle: b.service_title || b.serviceTitle || b.service?.title || 'Servicio',
          providerName: b.provider_name || b.providerName || b.provider?.business_name || 'Proveedor',
          scheduledDate: b.scheduled_date || b.scheduledDate,
          scheduledTime: b.scheduled_time || b.scheduledTime,
          totalPrice: b.total_price || b.totalPrice || b.total_amount,
          icon: b.icon || 'briefcase',
          color: b.color || '#00BFA6',
          hasRated: b.has_rated || b.hasRated || false,
        })));
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  }, [activeTab]);

  const handleBookingPress = (bookingId) => {
    router.push(`/marketplace-hub/booking/${bookingId}`);
  };

  const handleRatePress = (booking) => {
    router.push({
      pathname: '/marketplace-hub/booking/rate',
      params: {
        bookingId: booking.id,
        serviceTitle: booking.serviceTitle,
        providerName: booking.providerName,
      },
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Por definir';
    const date = new Date(dateString);
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    return date.toLocaleDateString('es-ES', options);
  };

  const renderBookingItem = ({ item }) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => handleBookingPress(item.id)}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.bookingHeader}>
          <View style={[styles.bookingIcon, { backgroundColor: `${item.color}20` }]}>
            <Ionicons name={item.icon} size={24} color={item.color} />
          </View>
          <View style={styles.bookingHeaderInfo}>
            <Text style={styles.bookingTitle} numberOfLines={1}>{item.serviceTitle}</Text>
            <Text style={styles.bookingProvider}>{item.providerName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}20` }]}>
            <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.bookingDetails}>
          <View style={styles.bookingDetailItem}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.bookingDetailText}>
              {formatDate(item.scheduledDate)}
              {item.scheduledTime && ` a las ${item.scheduledTime}`}
            </Text>
          </View>
          {item.totalPrice && (
            <View style={styles.bookingDetailItem}>
              <Ionicons name="cash-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.bookingDetailText}>L. {item.totalPrice}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.bookingFooter}>
          <Text style={styles.bookingNumber}>{item.bookingNumber}</Text>
          {item.status === 'completed' && !item.hasRated && (
            <TouchableOpacity
              style={styles.rateButton}
              onPress={(e) => {
                e.stopPropagation();
                handleRatePress(item);
              }}
            >
              <Ionicons name="star-outline" size={16} color={COLORS.orange} />
              <Text style={styles.rateButtonText}>Calificar</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Mis Reservas</Text>
            <Text style={styles.headerSubtitle}>Historial de servicios</Text>
          </View>
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

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.teal} />
          </View>
        ) : bookings.length > 0 ? (
          <FlatList
            data={bookings}
            renderItem={renderBookingItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.teal}
                colors={[COLORS.teal]}
              />
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Sin reservas</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'active'
                ? 'No tienes reservas activas'
                : activeTab === 'completed'
                ? 'No tienes reservas completadas'
                : 'No tienes reservas canceladas'}
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push('/marketplace-hub')}
            >
              <Text style={styles.exploreButtonText}>Explorar Servicios</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },

  // ============ HEADER ============
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(16),
    gap: scale(12),
  },
  backButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },

  // ============ TABS ============
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: scale(16),
    marginBottom: scale(16),
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(12),
    padding: scale(4),
  },
  tab: {
    flex: 1,
    paddingVertical: scale(10),
    alignItems: 'center',
    borderRadius: scale(8),
  },
  tabActive: {
    backgroundColor: COLORS.bgCardAlt,
  },
  tabText: {
    fontSize: scale(13),
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.textPrimary,
  },

  // ============ CONTENT ============
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(100),
  },

  // ============ BOOKING CARD ============
  bookingCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(14),
    gap: scale(12),
  },
  bookingIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingHeaderInfo: {
    flex: 1,
  },
  bookingTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  bookingProvider: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(8),
    gap: scale(4),
  },
  statusText: {
    fontSize: scale(11),
    fontWeight: '600',
  },
  bookingDetails: {
    flexDirection: 'row',
    gap: scale(20),
    paddingTop: scale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bookingDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  bookingDetailText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: scale(14),
    paddingTop: scale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bookingNumber: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    fontFamily: 'monospace',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.orange}15`,
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(8),
    gap: scale(6),
  },
  rateButtonText: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.orange,
  },

  // ============ EMPTY STATE ============
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(40),
  },
  emptyTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  emptyText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: scale(24),
  },
  exploreButton: {
    backgroundColor: COLORS.teal,
    paddingHorizontal: scale(24),
    paddingVertical: scale(12),
    borderRadius: scale(12),
  },
  exploreButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textDark,
  },
});
