// app/marketplace-hub/booking/create.js
// ISSY Marketplace - Create Booking Screen
// Línea gráfica ProHome

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getServiceById, createBooking, requestQuote } from '../../../src/services/marketplaceApi';

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

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textDark: '#0F1A1E',

  border: 'rgba(255, 255, 255, 0.1)',
  gradientStart: '#00BFA6',
  gradientEnd: '#AAFF00',
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

export default function CreateBookingScreen() {
  const { serviceId, bookingType } = useLocalSearchParams();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [service, setService] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  // Form state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [hours, setHours] = useState(2);

  // Quote specific
  const [quoteDescription, setQuoteDescription] = useState('');

  const isPrime = profile?.is_prime || false;
  const isQuote = bookingType === 'quote';

  useEffect(() => {
    loadService();
  }, [serviceId]);

  const loadService = async () => {
    setLoading(true);
    try {
      const response = await getServiceById(serviceId);
      if (response.success && response.data) {
        const apiData = response.data;
        // Map API response to component fields with fallbacks
        const mappedService = {
          id: apiData.id || serviceId,
          title: apiData.title || 'Servicio',
          provider: {
            id: apiData.provider?.id || apiData.provider_id || 'p1',
            name: apiData.provider?.business_name || apiData.provider?.name || 'Proveedor',
            avatar: apiData.provider?.avatar_url || null,
            rating: apiData.provider?.rating || 0,
          },
          basePrice: parseFloat(apiData.base_price || apiData.basePrice || 150),
          priceUnit: apiData.price_unit || apiData.priceUnit || 'hora',
          estimatedDuration: parseInt(apiData.estimated_duration || apiData.estimatedDuration || 180),
          primeDiscount: parseFloat(apiData.prime_discount || apiData.primeDiscount || 15),
          serviceFee: parseFloat(apiData.service_fee || apiData.serviceFee || 0.05),
          icon: SERVICE_ICONS[apiData.category] || SERVICE_ICONS.default,
          color: SERVICE_COLORS[apiData.category] || SERVICE_COLORS.default,
        };
        setService(mappedService);
      } else {
        setService(null);
      }
    } catch (error) {
      console.error('Error loading service:', error);
      setService(null);
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = () => {
    if (!service) return { subtotal: 0, discount: 0, fee: 0, total: 0 };

    const subtotal = service.basePrice * hours;
    const discount = isPrime && service.primeDiscount
      ? subtotal * (service.primeDiscount / 100)
      : 0;
    const afterDiscount = subtotal - discount;
    const fee = afterDiscount * service.serviceFee;
    const total = afterDiscount + fee;

    return { subtotal, discount, fee, total };
  };

  const handleSubmit = async () => {
    if (!address.trim()) {
      Alert.alert('Dirección Requerida', 'Por favor ingresa la dirección del servicio');
      return;
    }

    setSubmitting(true);

    try {
      const bookingData = {
        service_id: serviceId,
        address,
        scheduled_date: selectedDate.toISOString().split('T')[0],
        scheduled_time: selectedTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        notes: isQuote ? quoteDescription : notes,
      };

      // Add duration for instant bookings
      if (!isQuote) {
        bookingData.hours = hours;
      }

      const response = isQuote
        ? await requestQuote(bookingData)
        : await createBooking(bookingData);

      if (response.success) {
        Alert.alert(
          isQuote ? '¡Cotización Enviada!' : '¡Reserva Confirmada!',
          isQuote
            ? 'El proveedor te enviará una cotización pronto.'
            : 'Tu reserva ha sido confirmada. Recibirás una notificación de confirmación.',
          [
            {
              text: 'Ver Mis Reservas',
              onPress: () => router.replace('/marketplace-hub/bookings'),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'No se pudo procesar tu solicitud. Intenta de nuevo.');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar tu solicitud. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const onDateChange = (event, selected) => {
    setShowDatePicker(false);
    if (selected) {
      setSelectedDate(selected);
    }
  };

  const onTimeChange = (event, selected) => {
    setShowTimePicker(false);
    if (selected) {
      setSelectedTime(selected);
    }
  };

  const formatDate = (date) => {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    return date.toLocaleDateString('es-ES', options);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.teal} />
      </SafeAreaView>
    );
  }

  const prices = calculatePrice();

  return (
    <>
      <Stack.Screen
        options={{
          title: isQuote ? 'Solicitar Cotización' : 'Nueva Reserva',
        }}
      />

      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Service Info */}
          <View style={styles.serviceCard}>
            <View style={[styles.serviceIcon, { backgroundColor: `${service.color}20` }]}>
              <Ionicons name={service.icon} size={32} color={service.color} />
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceTitle}>{service.title}</Text>
              <Text style={styles.serviceProvider}>{service.provider.name}</Text>
            </View>
          </View>

          {/* Booking Type Badge */}
          <View style={styles.bookingTypeBadge}>
            <Ionicons
              name={isQuote ? 'document-text' : 'flash'}
              size={16}
              color={isQuote ? COLORS.purple : COLORS.teal}
            />
            <Text style={[styles.bookingTypeText, { color: isQuote ? COLORS.purple : COLORS.teal }]}>
              {isQuote ? 'Solicitud de Cotización' : 'Reserva Instantánea'}
            </Text>
          </View>

          {/* Date & Time Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isQuote ? 'Fecha Preferida' : 'Fecha y Hora'}
            </Text>

            {/* Date Picker */}
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={COLORS.teal} />
              <View style={styles.pickerContent}>
                <Text style={styles.pickerLabel}>Fecha</Text>
                <Text style={styles.pickerValue}>{formatDate(selectedDate)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                minimumDate={new Date()}
                textColor={COLORS.textPrimary}
              />
            )}

            {/* Time Picker */}
            {!isQuote && (
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={COLORS.teal} />
                <View style={styles.pickerContent}>
                  <Text style={styles.pickerLabel}>Hora</Text>
                  <Text style={styles.pickerValue}>{formatTime(selectedTime)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}

            {showTimePicker && (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onTimeChange}
                textColor={COLORS.textPrimary}
              />
            )}
          </View>

          {/* Duration (for instant booking) */}
          {!isQuote && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Duración</Text>
              <View style={styles.hoursSelector}>
                <TouchableOpacity
                  style={styles.hoursButton}
                  onPress={() => setHours(Math.max(1, hours - 1))}
                >
                  <Ionicons name="remove" size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <View style={styles.hoursDisplay}>
                  <Text style={styles.hoursValue}>{hours}</Text>
                  <Text style={styles.hoursLabel}>hora{hours !== 1 ? 's' : ''}</Text>
                </View>
                <TouchableOpacity
                  style={styles.hoursButton}
                  onPress={() => setHours(Math.min(8, hours + 1))}
                >
                  <Ionicons name="add" size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dirección del Servicio</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ingresa la dirección completa..."
              placeholderTextColor={COLORS.textMuted}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Notes / Quote Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isQuote ? 'Describe lo que necesitas' : 'Notas adicionales (opcional)'}
            </Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder={isQuote
                ? 'Describe detalladamente el trabajo que necesitas...'
                : 'Instrucciones especiales o detalles adicionales...'}
              placeholderTextColor={COLORS.textMuted}
              value={isQuote ? quoteDescription : notes}
              onChangeText={isQuote ? setQuoteDescription : setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Price Summary (for instant booking) */}
          {!isQuote && (
            <View style={styles.priceSection}>
              <Text style={styles.sectionTitle}>Resumen de Precio</Text>
              <View style={styles.priceCard}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>
                    {service.basePrice} x {hours} hora{hours !== 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.priceValue}>L. {prices.subtotal.toFixed(0)}</Text>
                </View>

                {prices.discount > 0 && (
                  <View style={styles.priceRow}>
                    <View style={styles.discountLabel}>
                      <Ionicons name="diamond" size={14} color={COLORS.lime} />
                      <Text style={styles.priceLabelGreen}>Descuento Prime ({service.primeDiscount}%)</Text>
                    </View>
                    <Text style={styles.priceValueGreen}>-L. {prices.discount.toFixed(0)}</Text>
                  </View>
                )}

                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Tarifa de servicio (5%)</Text>
                  <Text style={styles.priceValue}>L. {prices.fee.toFixed(0)}</Text>
                </View>

                <View style={[styles.priceRow, styles.priceTotalRow]}>
                  <Text style={styles.priceTotalLabel}>Total</Text>
                  <Text style={styles.priceTotalValue}>L. {prices.total.toFixed(0)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Bottom Padding */}
          <View style={{ height: scale(120) }} />
        </ScrollView>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          {!isQuote && (
            <View style={styles.bottomPriceSection}>
              <Text style={styles.bottomPriceLabel}>Total</Text>
              <Text style={styles.bottomPrice}>L. {prices.total.toFixed(0)}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.submitButton, isQuote && { flex: 1 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              style={styles.submitButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.textDark} />
              ) : (
                <>
                  <Ionicons
                    name={isQuote ? 'paper-plane' : 'checkmark-circle'}
                    size={20}
                    color={COLORS.textDark}
                  />
                  <Text style={styles.submitButtonText}>
                    {isQuote ? 'Enviar Solicitud' : 'Confirmar Reserva'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
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
  scrollContent: {
    padding: scale(16),
  },

  // ============ SERVICE CARD ============
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    padding: scale(16),
    borderRadius: scale(16),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(14),
  },
  serviceIcon: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(16),
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

  // ============ BOOKING TYPE ============
  bookingTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    marginBottom: scale(20),
    gap: scale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bookingTypeText: {
    fontSize: scale(13),
    fontWeight: '600',
  },

  // ============ SECTIONS ============
  section: {
    marginBottom: scale(24),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(12),
  },

  // ============ PICKER ============
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    padding: scale(16),
    borderRadius: scale(14),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(14),
  },
  pickerContent: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginBottom: scale(4),
  },
  pickerValue: {
    fontSize: scale(15),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },

  // ============ HOURS SELECTOR ============
  hoursSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCard,
    padding: scale(16),
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(24),
  },
  hoursButton: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: COLORS.bgCardAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hoursDisplay: {
    alignItems: 'center',
  },
  hoursValue: {
    fontSize: scale(32),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  hoursLabel: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },

  // ============ TEXT INPUT ============
  textInput: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(14),
    padding: scale(16),
    fontSize: scale(15),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: scale(100),
    textAlignVertical: 'top',
  },

  // ============ PRICE ============
  priceSection: {
    marginBottom: scale(20),
  },
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
    paddingVertical: scale(10),
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
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.orange,
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
    gap: scale(16),
  },
  bottomPriceSection: {
    flex: 1,
  },
  bottomPriceLabel: {
    fontSize: scale(12),
    color: COLORS.textMuted,
  },
  bottomPrice: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  submitButton: {
    borderRadius: scale(14),
    overflow: 'hidden',
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
    paddingVertical: scale(16),
    gap: scale(8),
  },
  submitButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textDark,
  },
});
