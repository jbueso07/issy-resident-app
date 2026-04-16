// app/airin/reservation.js
// ISSY × Airin - Reservar Mesa
// Línea gráfica ProHome

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../src/context/AuthContext';
import {
  getReservationSettings,
  createReservation,
} from '../../src/services/airinService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ============ COLORES PROHOME ============
const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  bgCardAlt: '#243B44',

  orange: '#FF6B35',
  cyan: '#00E5FF',
  teal: '#00BFA6',
  coral: '#FF6B6B',
  green: '#10B981',
  lime: '#AAFF00',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',

  border: 'rgba(255, 255, 255, 0.1)',
};

export default function ReservationScreen() {
  const { slug } = useLocalSearchParams();
  const { profile } = useAuth();

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reservationResult, setReservationResult] = useState(null);

  // Form state
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const result = await getReservationSettings(slug);
      if (result.success) {
        setSettings(result.data);
        // Set defaults from settings
        if (result.data?.min_party_size) {
          setPartySize(result.data.min_party_size);
        }
      }
    } catch (err) {
      console.error('Error fetching reservation settings:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Validation
  const minParty = settings?.min_party_size || 1;
  const maxParty = settings?.max_party_size || 20;

  const adjustPartySize = (delta) => {
    setPartySize((prev) => {
      const next = prev + delta;
      if (next < minParty) return minParty;
      if (next > maxParty) return maxParty;
      return next;
    });
  };

  const formatDate = (d) =>
    d.toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' });

  const formatTime = (t) =>
    t.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', hour12: true });

  // Submit
  const handleSubmit = async () => {
    // Combine date + time
    const reservationDate = new Date(date);
    reservationDate.setHours(time.getHours(), time.getMinutes(), 0, 0);

    // Basic validation
    if (reservationDate <= new Date()) {
      Alert.alert('Fecha inválida', 'La reservación debe ser en el futuro');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        restaurant_slug: slug,
        source: 'issy_app',
        date: reservationDate.toISOString(),
        party_size: partySize,
        notes: notes.trim() || undefined,
        customer_name: profile?.full_name || profile?.name || 'Cliente ISSY',
        customer_phone: profile?.phone || '',
      };

      const result = await createReservation(data);

      if (result.success) {
        setReservationResult(result.data);
        setSubmitted(true);
      } else {
        Alert.alert('Error', result.error || 'No se pudo crear la reservación');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ============ LOADING ============
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }

  // ============ CONFIRMATION ============
  if (submitted && reservationResult) {
    const status = reservationResult.status || 'pending';
    const isConfirmed = status === 'confirmed';

    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.confirmationCard}>
          <View style={[styles.confirmIcon, { backgroundColor: (isConfirmed ? COLORS.green : COLORS.orange) + '20' }]}>
            <Ionicons
              name={isConfirmed ? 'checkmark-circle' : 'time'}
              size={56}
              color={isConfirmed ? COLORS.green : COLORS.orange}
            />
          </View>

          <Text style={styles.confirmTitle}>
            {isConfirmed ? '¡Reservación confirmada!' : 'Reservación pendiente'}
          </Text>
          <Text style={styles.confirmSubtitle}>
            {isConfirmed
              ? 'Tu mesa está reservada. ¡Te esperamos!'
              : 'El restaurante confirmará tu reservación pronto'}
          </Text>

          {reservationResult.id && (
            <Text style={styles.confirmId}>
              Reservación #{reservationResult.id}
            </Text>
          )}

          <View style={styles.confirmDetails}>
            <View style={styles.confirmDetailRow}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.confirmDetailText}>{formatDate(date)}</Text>
            </View>
            <View style={styles.confirmDetailRow}>
              <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.confirmDetailText}>{formatTime(time)}</Text>
            </View>
            <View style={styles.confirmDetailRow}>
              <Ionicons name="people-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.confirmDetailText}>{partySize} personas</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => router.replace('/airin')}
          >
            <Text style={styles.confirmButtonText}>Volver a restaurantes</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ============ FORM ============
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.formContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Party Size */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Número de personas</Text>
        <View style={styles.partySizeRow}>
          <TouchableOpacity
            style={[styles.partySizeButton, partySize <= minParty && styles.partySizeButtonDisabled]}
            onPress={() => adjustPartySize(-1)}
            disabled={partySize <= minParty}
          >
            <Ionicons name="remove" size={22} color={partySize <= minParty ? COLORS.textMuted : COLORS.textPrimary} />
          </TouchableOpacity>

          <View style={styles.partySizeDisplay}>
            <Text style={styles.partySizeNumber}>{partySize}</Text>
            <Text style={styles.partySizeLabel}>personas</Text>
          </View>

          <TouchableOpacity
            style={[styles.partySizeButton, partySize >= maxParty && styles.partySizeButtonDisabled]}
            onPress={() => adjustPartySize(1)}
            disabled={partySize >= maxParty}
          >
            <Ionicons name="add" size={22} color={partySize >= maxParty ? COLORS.textMuted : COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.formHint}>Mín. {minParty} · Máx. {maxParty}</Text>
      </View>

      {/* Date */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Fecha</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.orange} />
          <Text style={styles.pickerButtonText}>{formatDate(date)}</Text>
          <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) setDate(selectedDate);
            }}
            themeVariant="dark"
          />
        )}
      </View>

      {/* Time */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Hora</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => setShowTimePicker(true)}>
          <Ionicons name="time-outline" size={20} color={COLORS.orange} />
          <Text style={styles.pickerButtonText}>{formatTime(time)}</Text>
          <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        {showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minuteInterval={15}
            onChange={(event, selectedTime) => {
              setShowTimePicker(Platform.OS === 'ios');
              if (selectedTime) setTime(selectedTime);
            }}
            themeVariant="dark"
          />
        )}
      </View>

      {/* Notes */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Notas (opcional)</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Alergias, celebración, preferencia de mesa..."
          placeholderTextColor={COLORS.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={COLORS.textPrimary} size="small" />
        ) : (
          <>
            <Ionicons name="restaurant-outline" size={20} color={COLORS.textPrimary} />
            <Text style={styles.submitButtonText}>Reservar mesa</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: scale(40) }} />
    </ScrollView>
  );
}

// ============ ESTILOS ============
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(20),
  },
  formContent: {
    paddingHorizontal: scale(20),
    paddingTop: scale(20),
  },

  // Form
  formGroup: {
    marginBottom: scale(24),
  },
  formLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(10),
  },
  formHint: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    marginTop: scale(6),
    textAlign: 'center',
  },

  // Party Size
  partySizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(20),
  },
  partySizeButton: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  partySizeButtonDisabled: {
    opacity: 0.4,
  },
  partySizeDisplay: {
    alignItems: 'center',
    minWidth: scale(60),
  },
  partySizeNumber: {
    fontSize: scale(36),
    fontWeight: '700',
    color: COLORS.orange,
  },
  partySizeLabel: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginTop: -scale(2),
  },

  // Pickers
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(12),
    padding: scale(14),
    gap: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: scale(15),
    color: COLORS.textPrimary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },

  // Text Area
  textArea: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(12),
    padding: scale(14),
    fontSize: scale(14),
    color: COLORS.textPrimary,
    minHeight: scale(80),
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Submit
  submitButton: {
    backgroundColor: COLORS.orange,
    borderRadius: scale(14),
    paddingVertical: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    marginTop: scale(8),
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Confirmation
  confirmationCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(20),
    padding: scale(28),
    alignItems: 'center',
    width: '100%',
  },
  confirmIcon: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(48),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(20),
  },
  confirmTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
    textAlign: 'center',
  },
  confirmSubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  confirmId: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginBottom: scale(20),
  },
  confirmDetails: {
    width: '100%',
    gap: scale(10),
    marginBottom: scale(24),
  },
  confirmDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  confirmDetailText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  confirmButton: {
    backgroundColor: COLORS.teal,
    borderRadius: scale(14),
    paddingVertical: scale(14),
    paddingHorizontal: scale(28),
    width: '100%',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: scale(15),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
