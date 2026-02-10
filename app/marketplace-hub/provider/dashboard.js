// app/marketplace-hub/provider/dashboard.js
// ISSY Marketplace - Provider Dashboard
// Línea gráfica ProHome

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import {
  getMyProviderProfile,
  updateProviderProfile,
  getProviderBookings,
  getProviderEarnings,
} from '../../../src/services/marketplaceApi';

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
  textDark: '#0F1A1E',

  border: 'rgba(255, 255, 255, 0.1)',
  gradientStart: '#00BFA6',
  gradientEnd: '#AAFF00',
};

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: COLORS.yellow },
  confirmed: { label: 'Confirmada', color: COLORS.blue },
  in_progress: { label: 'En Progreso', color: COLORS.cyan },
  completed: { label: 'Completada', color: COLORS.green },
  cancelled: { label: 'Cancelada', color: COLORS.red },
  quote_requested: { label: 'Cotización', color: COLORS.purple },
  quote_sent: { label: 'Cotización Enviada', color: COLORS.orange },
};

export default function ProviderDashboardScreen() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providerData, setProviderData] = useState(null);
  const [stats, setStats] = useState({
    today: { bookings: 0, earnings: 0, newMessages: 0 },
    month: { bookings: 0, earnings: 0, pendingPayout: 0 },
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(true);

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch provider profile
      const profileResult = await getMyProviderProfile();
      if (profileResult.success && profileResult.data) {
        setProviderData(profileResult.data);
        setIsAcceptingOrders(profileResult.data.is_available !== false);
      }

      // Fetch earnings
      const earningsResult = await getProviderEarnings('month');
      if (earningsResult.success && earningsResult.data) {
        const earningsData = earningsResult.data;
        setStats(prev => ({
          ...prev,
          today: {
            bookings: earningsData.today_bookings || 0,
            earnings: earningsData.today_earnings || 0,
            newMessages: earningsData.unread_messages || 0,
          },
          month: {
            bookings: earningsData.month_bookings || earningsData.total_bookings || 0,
            earnings: earningsData.month_earnings || earningsData.total_earnings || 0,
            pendingPayout: earningsData.pending_payout || earningsData.available_balance || 0,
          },
        }));
      }

      // Fetch recent bookings (pending + confirmed)
      const bookingsResult = await getProviderBookings({
        status: 'pending,confirmed,quote_requested,in_progress',
        limit: 5
      });
      if (bookingsResult.success) {
        const bookings = bookingsResult.data.bookings || bookingsResult.data || [];
        setRecentBookings(bookings.slice(0, 5));
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleToggleAvailability = async (value) => {
    setIsAcceptingOrders(value);
    try {
      const result = await updateProviderProfile({ is_available: value });
      if (!result.success) {
        // Revert if failed
        setIsAcceptingOrders(!value);
        Alert.alert('Error', 'No se pudo actualizar la disponibilidad');
      }
    } catch (error) {
      setIsAcceptingOrders(!value);
      Alert.alert('Error', 'No se pudo actualizar la disponibilidad');
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return `L. ${num.toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    // Handle both "HH:MM" and "HH:MM:SS" formats
    return timeString.substring(0, 5);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={COLORS.teal} />
        <Text style={styles.loadingText}>Cargando dashboard...</Text>
      </SafeAreaView>
    );
  }

  const businessName = providerData?.business_name || providerData?.name || profile?.full_name || 'Mi Negocio';
  const isVerified = providerData?.kyc_status === 'approved' || providerData?.verification_status === 'approved';
  const rating = providerData?.average_rating || providerData?.rating || 0;
  const totalRatings = providerData?.total_ratings || providerData?.reviews_count || 0;
  const responseRate = providerData?.response_rate || 0;
  const responseTime = providerData?.avg_response_time || 0;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.teal}
              colors={[COLORS.teal]}
            />
          }
          contentContainerStyle={styles.scrollContent}
        >
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
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerTitle} numberOfLines={1}>{businessName}</Text>
                {isVerified && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.teal} />
                )}
              </View>
              <Text style={styles.headerSubtitle}>Panel de Proveedor</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/marketplace-hub/provider/settings')}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Accepting Orders Toggle */}
          <View style={styles.toggleCard}>
            <View style={styles.toggleInfo}>
              <View style={[
                styles.toggleStatusDot,
                { backgroundColor: isAcceptingOrders ? COLORS.green : COLORS.red }
              ]} />
              <View>
                <Text style={styles.toggleTitle}>
                  {isAcceptingOrders ? 'Aceptando Pedidos' : 'No Disponible'}
                </Text>
                <Text style={styles.toggleSubtitle}>
                  {isAcceptingOrders ? 'Los clientes pueden reservar' : 'Pausaste tu disponibilidad'}
                </Text>
              </View>
            </View>
            <Switch
              value={isAcceptingOrders}
              onValueChange={handleToggleAvailability}
              trackColor={{ false: COLORS.bgCardAlt, true: `${COLORS.green}50` }}
              thumbColor={isAcceptingOrders ? COLORS.green : COLORS.textMuted}
              ios_backgroundColor={COLORS.bgCardAlt}
            />
          </View>

          {/* Quick Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hoy</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${COLORS.blue}20` }]}>
                  <Ionicons name="calendar" size={20} color={COLORS.blue} />
                </View>
                <Text style={styles.statValue}>{stats.today.bookings}</Text>
                <Text style={styles.statLabel}>Reservas</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${COLORS.green}20` }]}>
                  <Ionicons name="cash" size={20} color={COLORS.green} />
                </View>
                <Text style={styles.statValue}>{formatCurrency(stats.today.earnings)}</Text>
                <Text style={styles.statLabel}>Ganancias</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${COLORS.purple}20` }]}>
                  <Ionicons name="chatbubbles" size={20} color={COLORS.purple} />
                </View>
                <Text style={styles.statValue}>{stats.today.newMessages}</Text>
                <Text style={styles.statLabel}>Mensajes</Text>
              </View>
            </View>
          </View>

          {/* Monthly Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Este Mes</Text>
            <View style={styles.monthCard}>
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                style={styles.monthCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.monthCardContent}>
                  <View>
                    <Text style={styles.monthEarningsLabel}>Ganancias Totales</Text>
                    <Text style={styles.monthEarningsValue}>
                      {formatCurrency(stats.month.earnings)}
                    </Text>
                  </View>
                  <View style={styles.monthStats}>
                    <View style={styles.monthStatItem}>
                      <Text style={styles.monthStatValue}>{stats.month.bookings}</Text>
                      <Text style={styles.monthStatLabel}>Reservas</Text>
                    </View>
                    <View style={styles.monthStatItem}>
                      <Text style={styles.monthStatValue}>
                        {formatCurrency(stats.month.pendingPayout)}
                      </Text>
                      <Text style={styles.monthStatLabel}>Por Cobrar</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/marketplace-hub/provider/services')}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${COLORS.teal}20` }]}>
                  <Ionicons name="list" size={24} color={COLORS.teal} />
                </View>
                <Text style={styles.actionLabel}>Mis Servicios</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/marketplace-hub/provider/bookings')}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${COLORS.blue}20` }]}>
                  <Ionicons name="calendar" size={24} color={COLORS.blue} />
                </View>
                <Text style={styles.actionLabel}>Reservas</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/marketplace-hub/provider/earnings')}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${COLORS.green}20` }]}>
                  <Ionicons name="wallet" size={24} color={COLORS.green} />
                </View>
                <Text style={styles.actionLabel}>Ganancias</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/marketplace-hub/provider/messages')}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${COLORS.purple}20` }]}>
                  <Ionicons name="chatbubbles" size={24} color={COLORS.purple} />
                </View>
                <Text style={styles.actionLabel}>Mensajes</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Bookings */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Próximas Reservas</Text>
              <TouchableOpacity onPress={() => router.push('/marketplace-hub/provider/bookings')}>
                <Text style={styles.sectionLink}>Ver todas</Text>
              </TouchableOpacity>
            </View>

            {recentBookings.length === 0 ? (
              <View style={styles.emptyBookings}>
                <Ionicons name="calendar-outline" size={40} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No hay reservas pendientes</Text>
              </View>
            ) : (
              recentBookings.map(booking => {
                const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
                const customerName = booking.customer?.name || booking.user?.full_name || 'Cliente';
                const serviceName = booking.service?.title || booking.service?.name || 'Servicio';
                const scheduledDate = booking.scheduled_date || booking.date;
                const scheduledTime = booking.scheduled_time || booking.time;
                const totalPrice = booking.total_amount || booking.total_price || booking.price;

                return (
                  <TouchableOpacity
                    key={booking.id}
                    style={styles.bookingCard}
                    onPress={() => router.push(`/marketplace-hub/booking/${booking.id}`)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.bookingInfo}>
                      <Text style={styles.bookingCustomer}>{customerName}</Text>
                      <Text style={styles.bookingService}>{serviceName}</Text>
                      <View style={styles.bookingMeta}>
                        <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
                        <Text style={styles.bookingMetaText}>
                          {formatDate(scheduledDate)} {scheduledTime ? `a las ${formatTime(scheduledTime)}` : ''}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.bookingRight}>
                      <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}20` }]}>
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>
                          {statusConfig.label}
                        </Text>
                      </View>
                      {totalPrice && (
                        <Text style={styles.bookingPrice}>{formatCurrency(totalPrice)}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Performance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tu Desempeño</Text>
            <View style={styles.performanceCard}>
              <View style={styles.performanceItem}>
                <View style={styles.performanceHeader}>
                  <Ionicons name="star" size={18} color={COLORS.orange} />
                  <Text style={styles.performanceLabel}>Calificación</Text>
                </View>
                <Text style={styles.performanceValue}>{rating.toFixed(1)}</Text>
                <Text style={styles.performanceSubtext}>{totalRatings} reseñas</Text>
              </View>
              <View style={styles.performanceDivider} />
              <View style={styles.performanceItem}>
                <View style={styles.performanceHeader}>
                  <Ionicons name="checkmark-done" size={18} color={COLORS.teal} />
                  <Text style={styles.performanceLabel}>Completados</Text>
                </View>
                <Text style={styles.performanceValue}>{providerData?.completed_jobs || 0}</Text>
                <Text style={styles.performanceSubtext}>trabajos</Text>
              </View>
              <View style={styles.performanceDivider} />
              <View style={styles.performanceItem}>
                <View style={styles.performanceHeader}>
                  <Ionicons name="time" size={18} color={COLORS.cyan} />
                  <Text style={styles.performanceLabel}>Respuesta</Text>
                </View>
                <Text style={styles.performanceValue}>{responseTime || '< 1'}h</Text>
                <Text style={styles.performanceSubtext}>promedio</Text>
              </View>
            </View>
          </View>

          {/* Bottom Padding */}
          <View style={{ height: scale(100) }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: scale(16),
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  scrollContent: {
    paddingBottom: scale(20),
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  headerTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  headerSubtitle: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  settingsButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // ============ TOGGLE CARD ============
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard,
    marginHorizontal: scale(16),
    padding: scale(16),
    borderRadius: scale(16),
    marginBottom: scale(24),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  toggleStatusDot: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
  },
  toggleTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  toggleSubtitle: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },

  // ============ SECTIONS ============
  section: {
    marginBottom: scale(24),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    marginBottom: scale(14),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    paddingHorizontal: scale(16),
    marginBottom: scale(14),
  },
  sectionLink: {
    fontSize: scale(14),
    color: COLORS.teal,
    fontWeight: '500',
  },

  // ============ STATS ============
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    gap: scale(12),
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(16),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  statValue: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  statLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },

  // ============ MONTH CARD ============
  monthCard: {
    marginHorizontal: scale(16),
    borderRadius: scale(20),
    overflow: 'hidden',
  },
  monthCardGradient: {
    padding: scale(20),
  },
  monthCardContent: {
    gap: scale(16),
  },
  monthEarningsLabel: {
    fontSize: scale(14),
    color: COLORS.textDark,
    opacity: 0.8,
  },
  monthEarningsValue: {
    fontSize: scale(32),
    fontWeight: '700',
    color: COLORS.textDark,
  },
  monthStats: {
    flexDirection: 'row',
    gap: scale(24),
  },
  monthStatItem: {
    flex: 1,
  },
  monthStatValue: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textDark,
  },
  monthStatLabel: {
    fontSize: scale(12),
    color: COLORS.textDark,
    opacity: 0.7,
  },

  // ============ ACTIONS ============
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: scale(16),
    gap: scale(12),
  },
  actionCard: {
    width: (SCREEN_WIDTH - scale(56)) / 2,
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(16),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(10),
  },
  actionIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },

  // ============ BOOKINGS ============
  emptyBookings: {
    alignItems: 'center',
    paddingVertical: scale(32),
    marginHorizontal: scale(16),
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: {
    marginTop: scale(12),
    fontSize: scale(14),
    color: COLORS.textMuted,
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    marginHorizontal: scale(16),
    padding: scale(16),
    borderRadius: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingCustomer: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  bookingService: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginBottom: scale(8),
  },
  bookingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  bookingMetaText: {
    fontSize: scale(12),
    color: COLORS.textMuted,
  },
  bookingRight: {
    alignItems: 'flex-end',
    gap: scale(8),
  },
  statusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(8),
  },
  statusText: {
    fontSize: scale(11),
    fontWeight: '600',
  },
  bookingPrice: {
    fontSize: scale(15),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // ============ PERFORMANCE ============
  performanceCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    marginHorizontal: scale(16),
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  performanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: scale(8),
  },
  performanceLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  performanceValue: {
    fontSize: scale(22),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(2),
  },
  performanceSubtext: {
    fontSize: scale(10),
    color: COLORS.textMuted,
  },
  performanceDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: scale(12),
  },
});
