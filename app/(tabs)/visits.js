// app/(tabs)/visits.js
// ISSY Resident App - Visits Screen (Diseño Figma)

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { getMyQRCodes, generateQRCode, deleteQRCode } from '../../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Tipos de QR
const QR_TYPES = [
  { id: 'single', label: 'Uso Único', icon: '1️⃣' },
  { id: 'temporary', label: 'Temporal', icon: '📅' },
  { id: 'frequent', label: 'Permanente', icon: '🔄' },
];

// Días de la semana
const WEEKDAYS = [
  { id: 1, label: 'Lun', fullLabel: 'Lunes', backendName: 'monday', short: 'L' },
  { id: 2, label: 'Mar', fullLabel: 'Martes', backendName: 'tuesday', short: 'M' },
  { id: 3, label: 'Mié', fullLabel: 'Miércoles', backendName: 'wednesday', short: 'X' },
  { id: 4, label: 'Jue', fullLabel: 'Jueves', backendName: 'thursday', short: 'J' },
  { id: 5, label: 'Vie', fullLabel: 'Viernes', backendName: 'friday', short: 'V' },
  { id: 6, label: 'Sáb', fullLabel: 'Sábado', backendName: 'saturday', short: 'S' },
  { id: 0, label: 'Dom', fullLabel: 'Domingo', backendName: 'sunday', short: 'D' },
];

const WEEKDAYS_MAP = {
  'monday': 'L', 'tuesday': 'M', 'wednesday': 'X', 'thursday': 'J',
  'friday': 'V', 'saturday': 'S', 'sunday': 'D'
};

// Duraciones para QR único
const DURATIONS = [
  { value: 6, label: '6 hrs' },
  { value: 12, label: '12 hrs' },
  { value: 24, label: '24 hrs' },
];

// Colors
const COLORS = {
  background: '#FAFAFA',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#707883',
  grayLight: '#E5E7EB',
  lime: '#D4FE48',
  cyan: '#11DAE9',
  pink: '#FA5967',
  purple: '#7B8CEF',
  primary: '#009FF5',
};

// Helpers
const daysToBackendFormat = (dayIds) => {
  return dayIds.map(id => {
    const day = WEEKDAYS.find(w => w.id === id);
    return day ? day.backendName : null;
  }).filter(Boolean);
};

const formatTimeForBackend = (date) => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export default function Visits() {
  const { profile } = useAuth();
  const qrRef = useRef(null);
  
  // Lista de QRs
  const [qrCodes, setQrCodes] = useState([]);
  const [loadingQRs, setLoadingQRs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedQR, setSelectedQR] = useState(null);
  const [sharingImage, setSharingImage] = useState(false);
  
  // Form states
  const [qrType, setQrType] = useState('single');
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorId, setVisitorId] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Single QR states
  const [visitDate, setVisitDate] = useState(new Date());
  const [visitTime, setVisitTime] = useState(new Date());
  const [duration, setDuration] = useState(6);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Temporary QR states
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  // Shared schedule states
  const [access247, setAccess247] = useState(false);
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);
  const [allDays, setAllDays] = useState(false);
  const [startTime, setStartTime] = useState(new Date(new Date().setHours(9, 0, 0)));
  const [endTime, setEndTime] = useState(new Date(new Date().setHours(18, 0, 0)));
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    loadQRCodes();
  }, []);

  const loadQRCodes = async () => {
    try {
      const result = await getMyQRCodes();
      if (result.success) {
        setQrCodes(result.data || []);
      }
    } catch (error) {
      console.error('Error loading QRs:', error);
    } finally {
      setLoadingQRs(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadQRCodes();
  }, []);

  const resetForm = () => {
    setQrType('single');
    setVisitorName('');
    setVisitorPhone('');
    setVisitorId('');
    setVisitDate(new Date());
    setVisitTime(new Date());
    setDuration(6);
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setAccess247(false);
    setSelectedDays([1, 2, 3, 4, 5]);
    setAllDays(false);
    setStartTime(new Date(new Date().setHours(9, 0, 0)));
    setEndTime(new Date(new Date().setHours(18, 0, 0)));
  };

  const toggleAllDays = () => {
    if (allDays) {
      setAllDays(false);
      setSelectedDays([1, 2, 3, 4, 5]);
    } else {
      setAllDays(true);
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    }
  };

  const toggleDay = (dayId) => {
    if (selectedDays.includes(dayId)) {
      const newDays = selectedDays.filter(d => d !== dayId);
      setSelectedDays(newDays);
      setAllDays(false);
    } else {
      const newDays = [...selectedDays, dayId].sort();
      setSelectedDays(newDays);
      if (newDays.length === 7) setAllDays(true);
    }
  };

  const handleCreateQR = async () => {
    if (!visitorName.trim()) {
      Alert.alert('Error', 'Ingresa el nombre del visitante');
      return;
    }
    if (!visitorPhone.trim()) {
      Alert.alert('Error', 'Ingresa el número de teléfono');
      return;
    }
    if ((qrType === 'temporary' || qrType === 'frequent') && selectedDays.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un día de acceso');
      return;
    }

    setLoading(true);

    try {
      let qrData = {
        visitor_name: visitorName.trim(),
        visitor_phone: visitorPhone.trim(),
        visitor_id: visitorId.trim() || null,
        qr_type: qrType,
      };

      if (qrType === 'single') {
        const validFrom = new Date(visitDate);
        validFrom.setHours(visitTime.getHours(), visitTime.getMinutes(), 0);
        const validUntil = new Date(validFrom);
        validUntil.setHours(validUntil.getHours() + duration);
        qrData.valid_from = validFrom.toISOString();
        qrData.valid_until = validUntil.toISOString();
      } else if (qrType === 'temporary') {
        const validFrom = new Date(startDate);
        validFrom.setHours(0, 0, 0);
        const validUntil = new Date(endDate);
        validUntil.setHours(23, 59, 59);
        qrData.valid_from = validFrom.toISOString();
        qrData.valid_until = validUntil.toISOString();
        qrData.is_24_7 = access247;
        qrData.access_days = JSON.stringify(daysToBackendFormat(selectedDays));
        qrData.access_time_start = access247 ? '00:00' : formatTimeForBackend(startTime);
        qrData.access_time_end = access247 ? '23:59' : formatTimeForBackend(endTime);
      } else if (qrType === 'frequent') {
        qrData.valid_from = new Date().toISOString();
        qrData.valid_until = new Date('2099-12-31').toISOString();
        qrData.is_24_7 = access247;
        qrData.access_days = JSON.stringify(daysToBackendFormat(selectedDays));
        qrData.access_time_start = access247 ? '00:00' : formatTimeForBackend(startTime);
        qrData.access_time_end = access247 ? '23:59' : formatTimeForBackend(endTime);
      }

      const result = await generateQRCode(qrData);

      if (result.success) {
        Alert.alert('¡Listo!', 'Código QR generado exitosamente');
        setShowCreateModal(false);
        resetForm();
        loadQRCodes();
      } else {
        Alert.alert('Error', result.error || 'No se pudo generar el QR');
      }
    } catch (error) {
      console.error('Error generating QR:', error);
      Alert.alert('Error', 'Ocurrió un error al generar el QR');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQR = async (qr) => {
    Alert.alert(
      'Eliminar QR',
      `¿Estás seguro de eliminar el QR de ${qr.visitor_name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteQRCode(qr.id);
            if (result.success) {
              loadQRCodes();
            } else {
              Alert.alert('Error', 'No se pudo eliminar el QR');
            }
          },
        },
      ]
    );
  };

  // Compartir QR como texto
  const handleShareQR = async (qr) => {
    try {
      const hostName = profile?.name || 'Residente ISSY';
      const communityName = profile?.location_name || 'Mi Comunidad';
      
      const message = `━━━━━━━━━━━━━━━━━━━━━\n` +
        `       🏠 *ISSY*\n` +
        `    Control de Acceso\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👤 *${qr.visitor_name}*\n` +
        `    ¡Te esperamos!\n\n` +
        `┌─────────────────────┐\n` +
        `│ 🏡 Anfitrión: ${hostName}\n` +
        `│ 📍 Ubicación: ${communityName}\n` +
        `│ 📅 Válido: ${getValidityText(qr)}\n` +
        `│ 🕐 Horario: ${getTimeText(qr)}\n` +
        `└─────────────────────┘\n\n` +
        `🔑 Código: ${(qr.qr_code || qr.id).substring(0, 12)}\n\n` +
        `📱 Muestra este código al guardia\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `Powered by ISSY • joinissy.com`;

      await Share.share({
        message,
        title: 'Código QR de Acceso - ISSY',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Compartir QR como imagen
  const handleShareQRImage = async (qr) => {
    if (!qrRef.current) {
      handleShareQR(qr);
      return;
    }

    setSharingImage(true);
    
    try {
      qrRef.current.toDataURL(async (dataURL) => {
        try {
          const filename = FileSystem.cacheDirectory + `qr_issy_${qr.id.substring(0, 8)}.png`;
          await FileSystem.writeAsStringAsync(filename, dataURL, {
            encoding: 'base64',
          });
          
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(filename, {
              mimeType: 'image/png',
              dialogTitle: 'Compartir código QR - ISSY',
              UTI: 'public.png',
            });
          } else {
            handleShareQR(qr);
          }
        } catch (writeError) {
          console.error('Error writing/sharing file:', writeError);
          handleShareQR(qr);
        } finally {
          setSharingImage(false);
        }
      });
    } catch (error) {
      console.error('Error sharing image:', error);
      handleShareQR(qr);
      setSharingImage(false);
    }
  };

  // Formatters
  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-HN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('es-HN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatTimeFromString = (timeString) => {
    if (!timeString) return '';
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'p.m.' : 'a.m.';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    }
    return timeString;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatValidDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', {
      day: '2-digit',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).replace(',', ',');
  };

  const getQRTypeLabel = (type) => {
    const found = QR_TYPES.find(t => t.id === type);
    return found?.label || type;
  };

  const getQRTypeConfig = (type) => {
    switch (type) {
      case 'single': 
        return { bg: COLORS.pink, text: COLORS.white, label: 'USO ÚNICO' };
      case 'temporary': 
        return { bg: COLORS.purple, text: COLORS.white, label: 'TEMPORAL' };
      case 'frequent': 
        return { bg: COLORS.lime, text: COLORS.black, label: 'PERMANENTE' };
      default: 
        return { bg: COLORS.gray, text: COLORS.white, label: type.toUpperCase() };
    }
  };

  const isQRActive = (qr) => {
    if (qr.status === 'used') return false;
    if (qr.status === 'expired') return false;
    if (qr.valid_until && new Date(qr.valid_until) < new Date()) return false;
    return true;
  };

  const getValidityText = (qr) => {
    if (qr.qr_type === 'single') {
      return formatDateShort(qr.valid_from);
    } else if (qr.qr_type === 'temporary') {
      return `${formatDateShort(qr.valid_from)} - ${formatDateShort(qr.valid_until)}`;
    } else if (qr.qr_type === 'frequent') {
      return 'Permanente';
    }
    return '';
  };

  const getTimeText = (qr) => {
    if (qr.is_24_7) return '24 Horas';
    if (qr.access_time_start && qr.access_time_end) {
      return `${formatTimeFromString(qr.access_time_start)} - ${formatTimeFromString(qr.access_time_end)}`;
    }
    if (qr.qr_type === 'single' && qr.valid_from) {
      const date = new Date(qr.valid_from);
      return date.toLocaleTimeString('es-HN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
    return '24 Horas';
  };

  const getDaysText = (qr) => {
    if (qr.access_days) {
      try {
        const parsed = typeof qr.access_days === 'string' 
          ? JSON.parse(qr.access_days) 
          : qr.access_days;
        if (parsed.length === 7) return 'L-M-X-J-V-S-D';
        return parsed.map(d => WEEKDAYS_MAP[d] || d).join('-');
      } catch {
        return 'L-M-X-J-V-S-D';
      }
    }
    return 'L-M-X-J-V-S-D';
  };

  const hostName = profile?.name || 'Residente ISSY';
  const communityName = profile?.location_name || 'Mi Comunidad';

  // Render QR Card
  const renderQRCard = (qr) => {
    const typeConfig = getQRTypeConfig(qr.qr_type);
    const active = isQRActive(qr);

    return (
      <View key={qr.id} style={styles.qrCard}>
        <View style={styles.qrCardContent}>
          {/* Top row with badges */}
          <View style={styles.qrCardTopRow}>
            <View style={[styles.typeBadge, { backgroundColor: typeConfig.bg }]}>
              <Text style={[styles.typeBadgeText, { color: typeConfig.text }]}>
                {typeConfig.label}
              </Text>
            </View>
            
            {active ? (
              <LinearGradient
                colors={[COLORS.lime, COLORS.cyan]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.statusBadge}
              >
                <Text style={styles.statusBadgeText}>ACTIVO</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: '#9CA3AF' }]}>
                <Text style={[styles.statusBadgeText, { color: COLORS.white }]}>EXPIRADO</Text>
              </View>
            )}
          </View>

          {/* Visitor info */}
          <Text style={styles.visitorName}>{qr.visitor_name}</Text>
          <Text style={styles.visitorPhone}>{qr.visitor_phone}</Text>
          <Text style={styles.validDate}>Válido: {formatValidDate(qr.valid_until)}</Text>

          {/* Action buttons */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleShareQR(qr)}
            >
              <Ionicons name="share-outline" size={18} color={COLORS.black} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteQR(qr)}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.black} />
            </TouchableOpacity>
          </View>
        </View>

        {/* View QR button (invisible touch area) */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() => {
            setSelectedQR(qr);
            setShowQRModal(true);
          }}
          activeOpacity={0.7}
        />
        
        {/* Action buttons need to be above the touch area */}
        <View style={styles.actionButtonsOverlay}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShareQR(qr)}
          >
            <Ionicons name="share-outline" size={18} color={COLORS.black} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteQR(qr)}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.black} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[COLORS.primary]} 
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Visitantes</Text>
          <Text style={styles.subtitle}>Gestiona el acceso de tus visitantes</Text>
        </View>

        {/* Create QR Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={30} color={COLORS.black} />
          <Text style={styles.createButtonText}>Generar Código QR</Text>
        </TouchableOpacity>

        {/* QR List Section */}
        <Text style={styles.sectionTitle}>Códigos QR ({qrCodes.length})</Text>

        {loadingQRs ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : qrCodes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="qr-code-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No has generado códigos QR</Text>
            <Text style={styles.emptySubtext}>Toca el botón de arriba para crear uno</Text>
          </View>
        ) : (
          qrCodes.map((qr) => renderQRCard(qr))
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ============================================ */}
      {/* CREATE QR MODAL */}
      {/* ============================================ */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Generar Código QR</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* QR Type Selector */}
            <Text style={styles.inputLabel}>Tipo de Código QR</Text>
            <View style={styles.typeSelector}>
              {QR_TYPES.map((type) => {
                const config = getQRTypeConfig(type.id);
                const isSelected = qrType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeButton, 
                      isSelected && { backgroundColor: config.bg, borderColor: config.bg }
                    ]}
                    onPress={() => setQrType(type.id)}
                  >
                    <Text style={[
                      styles.typeLabel, 
                      isSelected && { color: config.text }
                    ]}>
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Visitor Info */}
            <Text style={styles.inputLabel}>Nombre del Visitante *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa el nombre completo"
              placeholderTextColor="#9CA3AF"
              value={visitorName}
              onChangeText={setVisitorName}
            />

            <Text style={styles.inputLabel}>Número de Teléfono *</Text>
            <TextInput
              style={styles.input}
              placeholder="+504 1234-5678"
              placeholderTextColor="#9CA3AF"
              value={visitorPhone}
              onChangeText={setVisitorPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Número de Identidad (Opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Identidad o pasaporte"
              placeholderTextColor="#9CA3AF"
              value={visitorId}
              onChangeText={setVisitorId}
            />

            {/* SINGLE QR OPTIONS */}
            {qrType === 'single' && (
              <>
                <Text style={styles.inputLabel}>Fecha de Visita *</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.dateInputText}>{formatDate(visitDate)}</Text>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.gray} />
                </TouchableOpacity>

                <Text style={styles.inputLabel}>Hora de Inicio</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowTimePicker(true)}>
                  <Text style={styles.dateInputText}>{formatTime(visitTime)}</Text>
                  <Ionicons name="time-outline" size={20} color={COLORS.gray} />
                </TouchableOpacity>

                <Text style={styles.inputLabel}>Duración del Acceso</Text>
                <View style={styles.durationSelector}>
                  {DURATIONS.map((d) => (
                    <TouchableOpacity
                      key={d.value}
                      style={[styles.durationButton, duration === d.value && styles.durationButtonActive]}
                      onPress={() => setDuration(d.value)}
                    >
                      <Text style={[styles.durationLabel, duration === d.value && styles.durationLabelActive]}>
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* TEMPORARY QR OPTIONS */}
            {qrType === 'temporary' && (
              <>
                <Text style={styles.inputLabel}>Rango de Fechas *</Text>
                <View style={styles.dateRangeRow}>
                  <TouchableOpacity
                    style={[styles.dateInput, { flex: 1, marginRight: 8 }]}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Text style={styles.dateInputText}>{formatDate(startDate)}</Text>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.gray} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dateInput, { flex: 1 }]}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Text style={styles.dateInputText}>{formatDate(endDate)}</Text>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.gray} />
                  </TouchableOpacity>
                </View>

                {/* Schedule options for temporary */}
                <Text style={styles.inputLabel}>Horario de Acceso</Text>
                <TouchableOpacity style={styles.checkboxRow} onPress={() => setAccess247(!access247)}>
                  <View style={[styles.checkbox, access247 && styles.checkboxChecked]}>
                    {access247 && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Acceso 24/7</Text>
                </TouchableOpacity>

                {!access247 && (
                  <>
                    <View style={styles.dateRangeRow}>
                      <TouchableOpacity
                        style={[styles.dateInput, { flex: 1, marginRight: 8 }]}
                        onPress={() => setShowStartTimePicker(true)}
                      >
                        <Text style={styles.dateInputText}>{formatTime(startTime)}</Text>
                        <Ionicons name="time-outline" size={20} color={COLORS.gray} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.dateInput, { flex: 1 }]}
                        onPress={() => setShowEndTimePicker(true)}
                      >
                        <Text style={styles.dateInputText}>{formatTime(endTime)}</Text>
                        <Ionicons name="time-outline" size={20} color={COLORS.gray} />
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                <Text style={styles.inputLabel}>Días de Acceso</Text>
                <TouchableOpacity style={styles.checkboxRow} onPress={toggleAllDays}>
                  <View style={[styles.checkbox, allDays && styles.checkboxChecked]}>
                    {allDays && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Todos los días</Text>
                </TouchableOpacity>

                <View style={styles.daysGrid}>
                  {WEEKDAYS.map((day) => (
                    <TouchableOpacity
                      key={day.id}
                      style={styles.dayCheckboxRow}
                      onPress={() => toggleDay(day.id)}
                    >
                      <View style={[styles.checkbox, selectedDays.includes(day.id) && styles.checkboxChecked]}>
                        {selectedDays.includes(day.id) && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={styles.dayCheckboxLabel}>{day.fullLabel}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* FREQUENT/PERMANENT QR OPTIONS */}
            {qrType === 'frequent' && (
              <>
                <Text style={styles.inputLabel}>Horario de Acceso</Text>
                <TouchableOpacity style={styles.checkboxRow} onPress={() => setAccess247(!access247)}>
                  <View style={[styles.checkbox, access247 && styles.checkboxChecked]}>
                    {access247 && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Acceso 24/7</Text>
                </TouchableOpacity>

                {!access247 && (
                  <>
                    <View style={styles.dateRangeRow}>
                      <TouchableOpacity
                        style={[styles.dateInput, { flex: 1, marginRight: 8 }]}
                        onPress={() => setShowStartTimePicker(true)}
                      >
                        <Text style={styles.dateInputText}>{formatTime(startTime)}</Text>
                        <Ionicons name="time-outline" size={20} color={COLORS.gray} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.dateInput, { flex: 1 }]}
                        onPress={() => setShowEndTimePicker(true)}
                      >
                        <Text style={styles.dateInputText}>{formatTime(endTime)}</Text>
                        <Ionicons name="time-outline" size={20} color={COLORS.gray} />
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                <Text style={styles.inputLabel}>Días de Acceso</Text>
                <TouchableOpacity style={styles.checkboxRow} onPress={toggleAllDays}>
                  <View style={[styles.checkbox, allDays && styles.checkboxChecked]}>
                    {allDays && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Todos los días</Text>
                </TouchableOpacity>

                <View style={styles.daysGrid}>
                  {WEEKDAYS.map((day) => (
                    <TouchableOpacity
                      key={day.id}
                      style={styles.dayCheckboxRow}
                      onPress={() => toggleDay(day.id)}
                    >
                      <View style={[styles.checkbox, selectedDays.includes(day.id) && styles.checkboxChecked]}>
                        {selectedDays.includes(day.id) && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={styles.dayCheckboxLabel}>{day.fullLabel}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.generateButton, loading && styles.buttonDisabled]}
                onPress={handleCreateQR}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="qr-code" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                    <Text style={styles.generateButtonText}>Generar QR</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>

        {/* Date/Time Pickers */}
        {showDatePicker && (
          <DateTimePicker
            value={visitDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) setVisitDate(date);
            }}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={visitTime}
            mode="time"
            display="default"
            onChange={(event, time) => {
              setShowTimePicker(false);
              if (time) setVisitTime(time);
            }}
          />
        )}
        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(event, date) => {
              setShowStartDatePicker(false);
              if (date) setStartDate(date);
            }}
          />
        )}
        {showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            minimumDate={startDate}
            onChange={(event, date) => {
              setShowEndDatePicker(false);
              if (date) setEndDate(date);
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
      </Modal>

      {/* ============================================ */}
      {/* VIEW QR MODAL */}
      {/* ============================================ */}
      <Modal
        visible={showQRModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.qrModalOverlay}>
          <ScrollView
            contentContainerStyle={styles.qrModalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {selectedQR && (
              <>
                {/* QR Card */}
                <View style={styles.qrCardPremium}>
                  {/* Header */}
                  <LinearGradient
                    colors={['#6366F1', '#8B5CF6']}
                    style={styles.qrCardHeader}
                  >
                    <View style={styles.qrCardHeaderTop}>
                      <View style={styles.qrCardLogoContainer}>
                        <Text style={styles.qrCardLogoText}>ISSY</Text>
                        <Text style={styles.qrCardLogoSubtext}>Control de Acceso</Text>
                      </View>
                      <View style={[styles.qrCardTypeBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <Text style={styles.qrCardTypeBadgeText}>
                          {getQRTypeLabel(selectedQR.qr_type).toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.qrCardVisitorName}>{selectedQR.visitor_name}</Text>
                    <Text style={styles.qrCardWelcomeText}>¡Te esperamos!</Text>

                    <View style={styles.qrCardInfoGrid}>
                      <View style={styles.qrCardInfoItem}>
                        <Text style={styles.qrCardInfoLabel}>ANFITRIÓN</Text>
                        <Text style={styles.qrCardInfoValue}>{hostName}</Text>
                      </View>
                      <View style={styles.qrCardInfoItem}>
                        <Text style={styles.qrCardInfoLabel}>UBICACIÓN</Text>
                        <Text style={styles.qrCardInfoValue}>{communityName}</Text>
                      </View>
                    </View>

                    <View style={styles.qrCardInfoGrid}>
                      <View style={styles.qrCardInfoItem}>
                        <Text style={styles.qrCardInfoLabel}>VÁLIDO</Text>
                        <Text style={styles.qrCardInfoValue}>{getValidityText(selectedQR)}</Text>
                      </View>
                      <View style={styles.qrCardInfoItem}>
                        <Text style={styles.qrCardInfoLabel}>HORARIO</Text>
                        <Text style={styles.qrCardInfoValue}>{getTimeText(selectedQR)}</Text>
                      </View>
                    </View>

                    {(selectedQR.qr_type === 'temporary' || selectedQR.qr_type === 'frequent') && (
                      <View style={styles.qrCardDaysRow}>
                        <Text style={styles.qrCardDaysLabel}>DÍAS: </Text>
                        <Text style={styles.qrCardDaysValue}>{getDaysText(selectedQR)}</Text>
                      </View>
                    )}
                  </LinearGradient>

                  {/* QR Code Section */}
                  <View style={styles.qrCardQRSection}>
                    <View style={styles.qrCardQRContainer}>
                      <QRCode
                        value={selectedQR.qr_code || selectedQR.id}
                        size={180}
                        backgroundColor="white"
                        getRef={(ref) => (qrRef.current = ref)}
                      />
                    </View>
                    <Text style={styles.qrCardQRCode}>
                      {(selectedQR.qr_code || selectedQR.id).substring(0, 12).toUpperCase()}
                    </Text>

                    <View style={styles.qrCardInstructionBox}>
                      <Ionicons name="scan-outline" size={18} color="#4B5563" style={{ marginRight: 10 }} />
                      <Text style={styles.qrCardInstructionText}>
                        Muestra este código al guardia de seguridad
                      </Text>
                    </View>
                  </View>

                  {/* Footer */}
                  <LinearGradient
                    colors={['#6366F1', '#8B5CF6']}
                    style={styles.qrCardFooter}
                  >
                    <View style={styles.qrCardBrandingContainer}>
                      <Text style={styles.qrCardPoweredBy}>Powered by</Text>
                      <Text style={styles.qrCardBrandName}>ISSY</Text>
                      <Text style={styles.qrCardWebsite}>joinissy.com</Text>
                    </View>
                  </LinearGradient>
                </View>

                {/* Share Buttons */}
                <View style={styles.shareButtonsContainer}>
                  <TouchableOpacity
                    style={styles.shareButtonPrimary}
                    onPress={() => handleShareQRImage(selectedQR)}
                    disabled={sharingImage}
                  >
                    {sharingImage ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="image-outline" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
                        <Text style={styles.shareButtonPrimaryText}>Compartir QR</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.shareButtonSecondary}
                    onPress={() => handleShareQR(selectedQR)}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#6366F1" style={{ marginRight: 8 }} />
                    <Text style={styles.shareButtonSecondaryText}>Texto</Text>
                  </TouchableOpacity>
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setShowQRModal(false)}
                >
                  <Text style={styles.closeModalButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 21,
  },
  
  // Header
  header: {
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.black,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.black,
    marginTop: 4,
  },

  // Create Button
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    borderRadius: 13,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  createButtonText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: '400',
    marginLeft: 10,
  },

  // Section Title
  sectionTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.black,
    marginTop: 24,
    marginBottom: 12,
  },

  // Loading
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: COLORS.white,
    borderRadius: 13,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },

  // QR Card
  qrCard: {
    backgroundColor: COLORS.white,
    borderRadius: 13,
    marginBottom: 12,
    padding: 16,
    position: 'relative',
  },
  qrCardContent: {
    zIndex: 1,
  },
  qrCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 5,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 5,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    color: COLORS.black,
  },
  visitorName: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.black,
    marginBottom: 4,
  },
  visitorPhone: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.gray,
    marginBottom: 4,
  },
  validDate: {
    fontSize: 10,
    color: COLORS.gray,
  },
  cardActions: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    right: 0,
    gap: 8,
    opacity: 0, // Hidden, we use the overlay
  },
  actionButtonsOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  actionButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
    backgroundColor: COLORS.white,
  },
  modalCancel: {
    color: COLORS.primary,
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.black,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },

  // Form
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.black,
  },
  dateInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInputText: {
    fontSize: 16,
    color: COLORS.black,
  },
  dateRangeRow: {
    flexDirection: 'row',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.grayLight,
    borderRadius: 10,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  durationSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  durationButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.grayLight,
    borderRadius: 12,
  },
  durationButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  durationLabelActive: {
    color: COLORS.primary,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#374151',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    paddingVertical: 8,
  },
  dayCheckboxLabel: {
    fontSize: 14,
    color: '#374151',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  generateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },

  // Premium QR Modal
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  qrModalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  qrCardPremium: {
    width: SCREEN_WIDTH - 40,
    maxWidth: 360,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  qrCardHeader: {
    padding: 20,
    paddingBottom: 16,
  },
  qrCardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  qrCardLogoContainer: {
    flexDirection: 'column',
  },
  qrCardLogoText: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 2,
  },
  qrCardLogoSubtext: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  qrCardTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  qrCardTypeBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  qrCardVisitorName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  qrCardWelcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
  },
  qrCardInfoGrid: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  qrCardInfoItem: {
    flex: 1,
  },
  qrCardInfoLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  qrCardInfoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  qrCardDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  qrCardDaysLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  qrCardDaysValue: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '700',
    letterSpacing: 1,
  },
  qrCardQRSection: {
    backgroundColor: COLORS.white,
    padding: 20,
    alignItems: 'center',
  },
  qrCardQRContainer: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  qrCardQRCode: {
    marginTop: 12,
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  qrCardInstructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  qrCardInstructionText: {
    fontSize: 11,
    color: '#4B5563',
    flex: 1,
  },
  qrCardFooter: {
    padding: 16,
  },
  qrCardBrandingContainer: {
    alignItems: 'center',
  },
  qrCardPoweredBy: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
  },
  qrCardBrandName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 2,
  },
  qrCardWebsite: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  shareButtonsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  shareButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    flex: 1,
  },
  shareButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  shareButtonPrimaryText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  shareButtonSecondaryText: {
    color: '#6366F1',
    fontSize: 15,
    fontWeight: '600',
  },
  closeModalButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  closeModalButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
});