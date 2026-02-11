// app/marketplace-hub/booking/[id].js
// ISSY Marketplace - Booking Detail Screen
// Línea gráfica ProHome

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { getBookingById, cancelBooking } from '../../../src/services/marketplaceApi';

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

// Status config
const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: COLORS.yellow, icon: 'time', desc: 'Esperando confirmación del proveedor' },
  confirmed: { label: 'Confirmada', color: COLORS.blue, icon: 'checkmark-circle', desc: 'Tu reserva ha sido confirmada' },
  in_progress: { label: 'En Progreso', color: COLORS.cyan, icon: 'sync', desc: 'El servicio está en curso' },
  completed: { label: 'Completada', color: COLORS.green, icon: 'checkmark-done', desc: 'Servicio finalizado' },
  cancelled: { label: 'Cancelada', color: COLORS.red, icon: 'close-circle', desc: 'Esta reserva fue cancelada' },
  quote_requested: { label: 'Cotización Solicitada', color: COLORS.purple, icon: 'document-text', desc: 'Esperando cotización del proveedor' },
  quote_sent: { label: 'Cotización Recibida', color: COLORS.orange, icon: 'document', desc: 'Revisa la cotización del proveedor' },
  quote_accepted: { label: 'Cotización Aceptada', color: COLORS.teal, icon: 'checkmark', desc: 'Has aceptado la cotización' },
};

// Service icon mapping
const SERVICE_ICONS = {
  cleaning: 'sparkles',
  plumbing: 'water',
  electrical: 'flash',
  carpentry: 'hammer',
  painting: 'brush',
  landscaping: 'leaf',
  default: 'home',
};

// Service colors
const SERVICE_COLORS = {
  cleaning: COLORS.teal,
  plumbing: COLORS.blue,
  electrical: COLORS.yellow,
  carpentry: COLORS.orange,
  painting: COLORS.purple,
  landscaping: COLORS.green,
  default: COLORS.teal,
};

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadBooking();
  }, [id]);

  const loadBooking = async () => {
    setLoading(true);
    try {
      const response = await getBookingById(id);
      if (response.success && response.data) {
        const apiData = response.data;
        // Map API response to component fields with fallbacks
        const mappedBooking = {
          id: apiData.id || id,
          bookingNumber: apiData.booking_number || apiData.bookingNumber || 'BK-' + id,
          status: apiData.status || 'pending',
          bookingType: apiData.booking_type || apiData.bookingType || 'instant',
          service: {
            id: apiData.service?.id || apiData.service_id || 's1',
            title: apiData.service?.title || apiData.service_title || 'Servicio',
            icon: SERVICE_ICONS[apiData.service?.category] || SERVICE_ICONS.default,
            color: SERVICE_COLORS[apiData.service?.category] || SERVICE_COLORS.default,
          },
          provider: {
            id: apiData.provider?.id || apiData.provider_id || 'p1',
            name: apiData.provider?.business_name || apiData.provider?.name || 'Proveedor',
            phone: apiData.provider?.phone || '',
            rating: apiData.provider?.rating || 0,
            verified: apiData.provider?.is_verified || false,
          },
          scheduledDate: apiData.scheduled_date || apiData.scheduledDate || new Date().toISOString().split('T')[0],
          scheduledTime: apiData.scheduled_time || apiData.scheduledTime || '09:00',
          estimatedEndTime: apiData.estimated_end_time || apiData.estimatedEndTime || '12:00',
          location: {
            address: apiData.location?.address || apiData.address || '',
            instructions: apiData.location?.instructions || apiData.instructions || '',
          },
          pricing: {
            subtotal: parseFloat(apiData.pricing?.subtotal || apiData.subtotal || 0),
            primeDiscount: parseFloat(apiData.pricing?.prime_discount || apiData.primeDiscount || 0),
            serviceFee: parseFloat(apiData.pricing?.service_fee || apiData.serviceFee || 0),
            total: parseFloat(apiData.pricing?.total || apiData.total || 0),
          },
          notes: apiData.notes || '',
          createdAt: apiData.created_at || apiData.createdAt || new Date().toISOString(),
          hasRated: apiData.has_rated || apiData.hasRated || false,
        };
        setBooking(mappedBooking);
      } else {
        setBooking(null);
      }
    } catch (error) {
      console.error('Error loading booking:', error);
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  const handleContactProvider = () => {
    if (booking?.provider?.phone) {
      Linking.openURL(`tel:${booking.provider.phone}`);
    }
  };

  const handleOpenChat = () => {
    router.push({
      pathname: '/marketplace-hub/chat/conversation-1',
      params: { bookingId: id },
    });
  };

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancelar Reserva',
      '¿Estás seguro de que deseas cancelar esta reserva? Esta acción no se puede deshacer.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const response = await cancelBooking(id, 'Cancelada por el usuario');
              setCancelling(false);

              if (response.success) {
                Alert.alert('Reserva Cancelada', 'Tu reserva ha sido cancelada exitosamente.');
                router.back();
              } else {
                Alert.alert('Error', response.error || 'No se pudo cancelar la reserva. Intenta de nuevo.');
              }
            } catch (error) {
              setCancelling(false);
              Alert.alert('Error', 'No se pudo cancelar la reserva. Intenta de nuevo.');
            }
          },
        },
      ]
    );
  };

  const handleRateService = () => {
    router.push({
      pathname: '/marketplace-hub/booking/rate',
      params: {
        bookingId: id,
        serviceTitle: booking.service.title,
        providerName: booking.provider.name,
      },
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('es-ES', options);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.teal} />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.textMuted} />
        <Text style={styles.errorText}>Reserva no encontrada</Text>
      </SafeAreaView>
    );
  }

  const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const canCancel = ['pending', 'confirmed', 'quote_requested', 'quote_sent'].includes(booking.status);
  const canRate = booking.status === 'completed' && !booking.hasRated;

  return (
    <>
      <Stack.Screen
        options={{
          title: booking.bookingNumber,
        }}
      />

      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Status Banner */}
          <View style={[styles.statusBanner, { backgroundColor: `${statusConfig.color}15` }]}>
            <View style={[styles.statusIconContainer, { backgroundColor: `${statusConfig.color}20` }]}>
              <Ionicons name={statusConfig.icon} size={32} color={statusConfig.color} />
            </View>
            <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
            <Text style={styles.statusDesc}>{statusConfig.desc}</Text>
          </View>

          {/* Service Card */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Servicio</Text>
            <TouchableOpacity
              style={styles.serviceCard}
              onPress={() => router.push(`/marketplace-hub/service/${booking.service.id}`)}
              activeOpacity={0.8}
            >
              <View style={[styles.serviceIcon, { backgroundColor: `${booking.service.color}20` }]}>
                <Ionicons name={booking.service.icon} size={28} color={booking.service.color} />
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceTitle}>{booking.service.title}</Text>
                <Text style={styles.serviceProvider}>{booking.provider.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fecha y Hora</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.teal} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Fecha</Text>
                  <Text style={styles.infoValue}>{formatDate(booking.scheduledDate)}</Text>
                </View>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={20} color={COLORS.teal} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Horario</Text>
                  <Text style={styles.infoValue}>
                    {booking.scheduledTime} - {booking.estimatedEndTime}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ubicación</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color={COLORS.teal} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Dirección</Text>
                  <Text style={styles.infoValue}>{booking.location.address}</Text>
                  {booking.location.instructions && (
                    <Text style={styles.infoNote}>{booking.location.instructions}</Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumen de Pago</Text>
            <View style={styles.priceCard}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Subtotal</Text>
                <Text style={styles.priceValue}>L. {booking.pricing.subtotal.toFixed(2)}</Text>
              </View>
              {booking.pricing.primeDiscount > 0 && (
                <View style={styles.priceRow}>
                  <View style={styles.discountLabel}>
                    <Ionicons name="diamond" size={14} color={COLORS.lime} />
                    <Text style={styles.priceLabelGreen}>Descuento Prime</Text>
                  </View>
                  <Text style={styles.priceValueGreen}>-L. {booking.pricing.primeDiscount.toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Tarifa de servicio</Text>
                <Text style={styles.priceValue}>L. {booking.pricing.serviceFee.toFixed(2)}</Text>
              </View>
              <View style={[styles.priceRow, styles.priceTotalRow]}>
                <Text style={styles.priceTotalLabel}>Total</Text>
                <Text style={styles.priceTotalValue}>L. {booking.pricing.total.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* Notes */}
          {booking.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notas</Text>
              <View style={styles.notesCard}>
                <Text style={styles.notesText}>{booking.notes}</Text>
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleOpenChat}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-outline" size={20} color={COLORS.teal} />
              <Text style={styles.actionButtonText}>Enviar Mensaje</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleContactProvider}
              activeOpacity={0.8}
            >
              <Ionicons name="call-outline" size={20} color={COLORS.teal} />
              <Text style={styles.actionButtonText}>Llamar Proveedor</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Padding */}
          <View style={{ height: scale(120) }} />
        </ScrollView>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          {canCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelBooking}
              disabled={cancelling}
              activeOpacity={0.8}
            >
              {cancelling ? (
                <ActivityIndicator color={COLORS.red} size="small" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={20} color={COLORS.red} />
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {canRate && (
            <TouchableOpacity
              style={styles.rateButton}
              onPress={handleRateService}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                style={styles.rateButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="star" size={20} color={COLORS.textDark} />
                <Text style={styles.rateButtonText}>Calificar Servicio</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
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
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: scale(16),
    color: COLORS.textMuted,
    marginTop: scale(16),
  },
  scrollContent: {
    padding: scale(16),
  },

  // ============ STATUS BANNER ============
  statusBanner: {
    alignItems: 'center',
    padding: scale(24),
    borderRadius: scale(20),
    marginBottom: scale(24),
  },
  statusIconContainer: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  statusLabel: {
    fontSize: scale(18),
    fontWeight: '700',
    marginBottom: scale(6),
  },
  statusDesc: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // ============ SECTIONS ============
  section: {
    marginBottom: scale(24),
  },
  sectionTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: scale(12),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ============ SERVICE CARD ============
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    padding: scale(16),
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(14),
  },
  serviceIcon: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  serviceProvider: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },

  // ============ INFO CARD ============
  infoCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(14),
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginBottom: scale(4),
  },
  infoValue: {
    fontSize: scale(15),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  infoNote: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(6),
    fontStyle: 'italic',
  },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: scale(14),
  },

  // ============ PRICE CARD ============
  priceCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(8),
  },
  priceLabel: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  priceValue: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
  },
  discountLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  priceLabelGreen: {
    fontSize: scale(14),
    color: COLORS.green,
  },
  priceValueGreen: {
    fontSize: scale(14),
    color: COLORS.green,
  },
  priceTotalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: scale(8),
    paddingTop: scale(14),
  },
  priceTotalLabel: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  priceTotalValue: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.orange,
  },

  // ============ NOTES ============
  notesCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notesText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    lineHeight: scale(22),
  },

  // ============ ACTIONS ============
  actionsSection: {
    flexDirection: 'row',
    gap: scale(12),
    marginBottom: scale(24),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCard,
    paddingVertical: scale(14),
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: COLORS.teal,
    gap: scale(8),
  },
  actionButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.teal,
  },

  // ============ BOTTOM BAR ============
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    paddingBottom: scale(30),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: scale(12),
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(14),
    borderRadius: scale(14),
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.red,
    gap: scale(8),
  },
  cancelButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.red,
  },
  rateButton: {
    flex: 1,
    borderRadius: scale(14),
    overflow: 'hidden',
  },
  rateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(14),
    gap: scale(8),
  },
  rateButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textDark,
  },
});
