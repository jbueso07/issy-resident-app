// app/create-event.js
// ISSY - Crear Evento con lista de invitados (Tanda 1).
// Backend: POST /api/events { name, event_date, start_time, end_time,
// location_id, guests: [{first_name, last_name}] } → { event, qr_code, qr_code_id }.
// Patrones: pasos de request-demo.js, lista dinámica de emergency-contacts.js,
// pickers dual iOS-modal/Android-inline de visits.js, share de visits.js.

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useUserLocation } from '../src/context/UserLocationContext';
import { useTranslation } from '../src/hooks/useTranslation';
import { createEvent } from '../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  card: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.1)',
  lime: '#D4FE48',
  teal: '#5DDED8',
  cyan: '#5DDED8',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  textDark: '#0F1A1A',
  red: '#EF4444',
  success: '#10B981',
};

// Fecha date-only en local (NUNCA toISOString: corrimiento -1 día en UTC-6,
// mismo bug ya corregido en pagos — commit f0aa780)
const formatDateForBackend = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatTimeForBackend = (date) => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const formatDateDisplay = (date) =>
  date.toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const formatTimeDisplay = (date) =>
  date.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', hour12: true });

export default function CreateEventScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  // location_id SIEMPRE del contexto (misma fuente que el INSERT de QRs de visita)
  const { selectedLocationId, locationName } = useUserLocation();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Paso 1 — datos del evento
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date(new Date().setHours(18, 0, 0, 0)));
  const [endTime, setEndTime] = useState(new Date(new Date().setHours(23, 0, 0, 0)));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Paso 2 — invitados (molde emergency-contacts: lista dinámica)
  const [guests, setGuests] = useState([{ first_name: '', last_name: '' }]);

  // Éxito
  const [created, setCreated] = useState(null); // { event, qr_code, qr_code_id }
  const cardRef = useRef(null);

  const crossesMidnight =
    formatTimeForBackend(endTime) <= formatTimeForBackend(startTime);

  // ── Validaciones ──
  const validateStep1 = () => {
    if (!eventName.trim()) {
      Alert.alert('Error', t('visits.events.errors.nameRequired', 'Poné un nombre para el evento'));
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateOnly = new Date(eventDate);
    dateOnly.setHours(0, 0, 0, 0);
    if (dateOnly < today) {
      Alert.alert('Error', t('visits.events.errors.dateInPast', 'La fecha debe ser hoy o futura'));
      return false;
    }
    // end <= start es cruce de medianoche: permitido, el backend suma 24h.
    return true;
  };

  const cleanGuests = () =>
    guests
      .map((g) => ({ first_name: g.first_name.trim(), last_name: g.last_name.trim() }))
      .filter((g) => g.first_name || g.last_name);

  const validateStep2 = () => {
    const list = cleanGuests();
    if (list.length < 1) {
      Alert.alert('Error', t('visits.events.errors.guestsRequired', 'Agregá al menos 1 invitado'));
      return false;
    }
    const incomplete = list.some((g) => !g.first_name || !g.last_name);
    if (incomplete) {
      Alert.alert('Error', t('visits.events.errors.guestIncomplete', 'Cada invitado necesita nombre y apellido'));
      return false;
    }
    return true;
  };

  // ── Invitados ──
  const addGuest = () => setGuests((prev) => [...prev, { first_name: '', last_name: '' }]);

  const removeGuest = (index) =>
    setGuests((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const updateGuest = (index, field, value) =>
    setGuests((prev) => prev.map((g, i) => (i === index ? { ...g, [field]: value } : g)));

  const guestCount = cleanGuests().filter((g) => g.first_name && g.last_name).length;

  // ── Submit ──
  const handleCreate = async () => {
    if (!validateStep2()) return;
    if (!selectedLocationId) {
      Alert.alert('Error', t('visits.events.errors.noLocation', 'No se pudo determinar tu comunidad'));
      return;
    }
    setLoading(true);
    try {
      const result = await createEvent({
        name: eventName.trim(),
        event_date: formatDateForBackend(eventDate),
        start_time: formatTimeForBackend(startTime),
        end_time: formatTimeForBackend(endTime),
        location_id: selectedLocationId,
        guests: cleanGuests(),
      });
      if (result.success && result.data?.qr_code) {
        setCreated(result.data);
        setStep(3);
      } else {
        Alert.alert('Error', result.error || t('visits.events.errors.createFailed', 'No se pudo crear el evento'));
      }
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', t('visits.events.errors.createFailed', 'No se pudo crear el evento'));
    } finally {
      setLoading(false);
    }
  };

  // ── Compartir (patrón captureRef + Sharing de visits.js) ──
  const handleShare = async () => {
    try {
      if (!cardRef.current) return;
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `${t('visits.events.share', 'Compartir QR')} - ${eventName.trim()}`,
          UTI: 'public.png',
        });
      }
    } catch (error) {
      console.error('Error sharing event QR:', error);
      Alert.alert('Error', t('visits.events.errors.shareFailed', 'No se pudo compartir el QR'));
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      router.back();
    }
  };

  // ── Render ──
  const renderStepDots = () => (
    <View style={styles.stepDots}>
      {[1, 2].map((s) => (
        <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]} />
      ))}
    </View>
  );

  const renderPickerModalIOS = (visible, onClose, value, mode, onChange, minimumDate) => (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.pickerModalOverlay}>
        <View style={styles.pickerModalContent}>
          <View style={styles.pickerModalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.pickerModalCancel} maxFontSizeMultiplier={1.2}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.pickerModalDone} maxFontSizeMultiplier={1.2}>{t('common.done') || 'Listo'}</Text>
            </TouchableOpacity>
          </View>
          {/* iOS: el spinner hereda el esquema de color del SISTEMA, no el del
              contenedor. Sin themeVariant/textColor explicitos, un iPhone en
              modo oscuro pinta el texto en blanco y queda invisible sobre un
              fondo claro. Se fijan ambos siempre, no se asume el tema. */}
          <DateTimePicker
            value={value}
            mode={mode}
            display="spinner"
            themeVariant="dark"
            textColor="#FFFFFF"
            minimumDate={minimumDate}
            onChange={(event, d) => {
              if (d) onChange(d);
            }}
          />
        </View>
      </View>
    </Modal>
  );

  // ─── Vista de éxito (paso 3) ───
  if (step === 3 && created) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View style={{ width: scale(40) }} />
          <Text style={styles.headerTitle} maxFontSizeMultiplier={1.2}>
            {t('visits.events.successTitle', '¡Evento creado!')}
          </Text>
          <View style={{ width: scale(40) }} />
        </View>

        <ScrollView contentContainerStyle={styles.successScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.successSubtitle} maxFontSizeMultiplier={1.2}>
            {t('visits.events.successSubtitle', 'Compartí este QR con tus invitados')}
          </Text>

          {/* Tarjeta compartible (se captura completa con captureRef) */}
          <View ref={cardRef} collapsable={false} style={styles.shareCard}>
            <Text style={styles.shareCardEvent} maxFontSizeMultiplier={1.2}>{eventName.trim()}</Text>
            <Text style={styles.shareCardCommunity} maxFontSizeMultiplier={1.2}>
              {locationName || 'Mi Comunidad'}
            </Text>
            <Text style={styles.shareCardDate} maxFontSizeMultiplier={1.2}>
              {formatDateDisplay(eventDate)}
            </Text>
            <Text style={styles.shareCardHours} maxFontSizeMultiplier={1.2}>
              {formatTimeDisplay(startTime)} — {formatTimeDisplay(endTime)}
              {crossesMidnight ? ` (${t('visits.events.endsNextDay', 'día siguiente')})` : ''}
            </Text>
            <View style={styles.qrWrapper}>
              {/* El payload es el string plano qr_code — igual que visits.js:1763 */}
              <QRCode value={created.qr_code} size={200} backgroundColor="white" color="#1A3D4D" />
            </View>
            <Text style={styles.shareCardCode} maxFontSizeMultiplier={1.2}>{created.qr_code}</Text>
            <Text style={styles.shareCardGuests} maxFontSizeMultiplier={1.2}>
              {guestCount} {t('visits.events.guests', 'invitados')}
            </Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="share-outline" size={20} color={COLORS.textDark} style={{ marginRight: scale(8) }} />
            <Text style={styles.primaryButtonText} maxFontSizeMultiplier={1.2}>
              {t('visits.events.share', 'Compartir QR')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.secondaryButtonText} maxFontSizeMultiplier={1.2}>
              {t('visits.events.done', 'Listo')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Pasos 1 y 2 ───
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBack} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={1.2}>
            {t('visits.events.title', 'Crear evento')}
          </Text>
          <View style={{ width: scale(40) }} />
        </View>

        {renderStepDots()}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {step === 1 ? (
            <>
              <Text style={styles.stepTitle} maxFontSizeMultiplier={1.2}>
                {t('visits.events.step1Title', 'Datos del evento')}
              </Text>

              <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>
                {t('visits.events.eventName', 'Nombre del evento')} *
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('visits.events.eventNamePlaceholder', 'Ej: Cumpleaños de Ana')}
                placeholderTextColor={COLORS.textMuted}
                value={eventName}
                onChangeText={setEventName}
                maxFontSizeMultiplier={1.2}
              />

              <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>
                {t('visits.events.date', 'Fecha')} *
              </Text>
              <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.teal} style={{ marginRight: scale(8) }} />
                <Text style={styles.dateInputText} maxFontSizeMultiplier={1.2}>{formatDateDisplay(eventDate)}</Text>
              </TouchableOpacity>

              <View style={styles.timeRow}>
                <View style={{ flex: 1, marginRight: scale(8) }}>
                  <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>
                    {t('visits.events.startTime', 'Hora de inicio')} *
                  </Text>
                  <TouchableOpacity style={styles.dateInput} onPress={() => setShowStartTimePicker(true)}>
                    <Ionicons name="time-outline" size={18} color={COLORS.teal} style={{ marginRight: scale(8) }} />
                    <Text style={styles.dateInputText} maxFontSizeMultiplier={1.2}>{formatTimeDisplay(startTime)}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, marginLeft: scale(8) }}>
                  <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>
                    {t('visits.events.endTime', 'Hora límite de ingreso')} *
                  </Text>
                  <TouchableOpacity style={styles.dateInput} onPress={() => setShowEndTimePicker(true)}>
                    <Ionicons name="time-outline" size={18} color={COLORS.teal} style={{ marginRight: scale(8) }} />
                    <Text style={styles.dateInputText} maxFontSizeMultiplier={1.2}>{formatTimeDisplay(endTime)}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {crossesMidnight && (
                <View style={styles.hintRow}>
                  <Ionicons name="moon-outline" size={14} color={COLORS.textSecondary} style={{ marginRight: scale(6) }} />
                  <Text style={styles.hintText} maxFontSizeMultiplier={1.2}>
                    {t('visits.events.crossesMidnight', 'El ingreso cierra al día siguiente')}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => validateStep1() && setStep(2)}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText} maxFontSizeMultiplier={1.2}>
                  {t('visits.events.next', 'Siguiente')}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.textDark} style={{ marginLeft: scale(8) }} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.guestsHeader}>
                <Text style={styles.stepTitle} maxFontSizeMultiplier={1.2}>
                  {t('visits.events.step2Title', 'Invitados')}
                </Text>
                <View style={styles.guestCountBadge}>
                  <Text style={styles.guestCountText} maxFontSizeMultiplier={1.2}>
                    {guestCount} {t('visits.events.guests', 'invitados')}
                  </Text>
                </View>
              </View>

              {guests.map((guest, index) => (
                <View key={index} style={styles.guestRow}>
                  <TextInput
                    style={[styles.input, styles.guestInput, { marginRight: scale(8) }]}
                    placeholder={t('visits.events.firstName', 'Nombre')}
                    placeholderTextColor={COLORS.textMuted}
                    value={guest.first_name}
                    onChangeText={(v) => updateGuest(index, 'first_name', v)}
                    maxFontSizeMultiplier={1.2}
                  />
                  <TextInput
                    style={[styles.input, styles.guestInput]}
                    placeholder={t('visits.events.lastName', 'Apellido')}
                    placeholderTextColor={COLORS.textMuted}
                    value={guest.last_name}
                    onChangeText={(v) => updateGuest(index, 'last_name', v)}
                    maxFontSizeMultiplier={1.2}
                  />
                  <TouchableOpacity
                    style={styles.removeGuestBtn}
                    onPress={() => removeGuest(index)}
                    disabled={guests.length === 1}
                  >
                    <Ionicons
                      name="close-circle"
                      size={22}
                      color={guests.length === 1 ? COLORS.textMuted : COLORS.red}
                    />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.addGuestBtn} onPress={addGuest} activeOpacity={0.7}>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.lime} style={{ marginRight: scale(8) }} />
                <Text style={styles.addGuestText} maxFontSizeMultiplier={1.2}>
                  {t('visits.events.addGuest', 'Agregar invitado')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, loading && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.textDark} />
                ) : (
                  <>
                    <Ionicons name="qr-code-outline" size={20} color={COLORS.textDark} style={{ marginRight: scale(8) }} />
                    <Text style={styles.primaryButtonText} maxFontSizeMultiplier={1.2}>
                      {t('visits.events.create', 'Crear evento')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: scale(60) }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Pickers: patrón dual de visits.js — modal spinner en iOS, inline en Android */}
      {Platform.OS === 'ios' ? (
        <>
          {renderPickerModalIOS(showDatePicker, () => setShowDatePicker(false), eventDate, 'date', setEventDate, new Date())}
          {renderPickerModalIOS(showStartTimePicker, () => setShowStartTimePicker(false), startTime, 'time', setStartTime)}
          {renderPickerModalIOS(showEndTimePicker, () => setShowEndTimePicker(false), endTime, 'time', setEndTime)}
        </>
      ) : (
        <>
          {showDatePicker && (
            <DateTimePicker
              value={eventDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) setEventDate(date);
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
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerBack: {
    width: scale(40),
    height: scale(40),
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: scale(17),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  stepDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(12),
  },
  stepDot: {
    width: scale(28),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: COLORS.card,
  },
  stepDotActive: {
    backgroundColor: COLORS.lime,
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(16),
  },
  stepTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(16),
  },
  inputLabel: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginBottom: scale(6),
    marginTop: scale(12),
  },
  input: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    fontSize: scale(15),
    color: COLORS.textPrimary,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
  },
  dateInputText: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(10),
  },
  hintText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    borderRadius: scale(14),
    paddingVertical: scale(15),
    marginTop: scale(28),
  },
  primaryButtonText: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textDark,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: scale(14),
    marginTop: scale(12),
  },
  secondaryButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // Invitados
  guestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guestCountBadge: {
    backgroundColor: COLORS.teal + '20',
    borderRadius: scale(10),
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    marginBottom: scale(16),
  },
  guestCountText: {
    fontSize: scale(12),
    fontWeight: '600',
    color: COLORS.teal,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  guestInput: {
    flex: 1,
  },
  removeGuestBtn: {
    marginLeft: scale(8),
    padding: scale(4),
  },
  addGuestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(12),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.lime + '60',
    paddingVertical: scale(12),
    marginTop: scale(6),
  },
  addGuestText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.lime,
  },

  // Éxito / tarjeta compartible
  successScroll: {
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingBottom: scale(40),
  },
  successSubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(8),
    marginBottom: scale(16),
    textAlign: 'center',
  },
  shareCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(20),
    alignItems: 'center',
    paddingVertical: scale(24),
    paddingHorizontal: scale(16),
  },
  shareCardEvent: {
    fontSize: scale(20),
    fontWeight: '800',
    color: '#1A3D4D',
    textAlign: 'center',
  },
  shareCardCommunity: {
    fontSize: scale(14),
    fontWeight: '600',
    color: '#5DA8A4',
    marginTop: scale(4),
  },
  shareCardDate: {
    fontSize: scale(13),
    color: '#4A6572',
    marginTop: scale(10),
    textTransform: 'capitalize',
  },
  shareCardHours: {
    fontSize: scale(13),
    color: '#4A6572',
    marginTop: scale(2),
  },
  qrWrapper: {
    backgroundColor: '#FFFFFF',
    padding: scale(12),
    borderRadius: scale(12),
    marginTop: scale(16),
  },
  shareCardCode: {
    fontSize: scale(13),
    fontWeight: '700',
    color: '#1A3D4D',
    marginTop: scale(10),
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  shareCardGuests: {
    fontSize: scale(12),
    color: '#4A6572',
    marginTop: scale(4),
  },

  // iOS Picker Modal (mismos nombres/estilos que visits.js)
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  // Mismo patron que visits.js (:3045): fondo oscuro. El spinner de iOS se
  // pinta en claro sobre este fondo; ver renderPickerModalIOS.
  pickerModalContent: {
    backgroundColor: '#1C2E35',
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    paddingBottom: scale(30),
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  pickerModalCancel: {
    fontSize: scale(15),
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  pickerModalDone: {
    fontSize: scale(15),
    color: '#AAFF00',
    fontWeight: '600',
  },
});
