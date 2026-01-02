// app/(tabs)/visits.js
// ISSY Resident App - Visits Screen (ProHome Dark Style)

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useTranslation } from '../../src/hooks/useTranslation';
import { getMyQRCodes, generateQRCode, deleteQRCode, getResidentQRSecret } from '../../src/services/api';
import CompactResidentQR from '../../src/components/CompactResidentQR';
import AccessTabs from '../../src/components/AccessTabs';
import MyAccessesTab from '../../src/components/MyAccessesTab';

// Logo ISSY
const IssyLogoNegro = require('../../assets/isologotipo-negro.png');

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
  indigo: '#818CF8',
  blue: '#60A5FA',
  pink: '#F472B6',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textDark: '#0F1A1E',

  border: 'rgba(255, 255, 255, 0.1)',
  gradientStart: '#00BFA6',
  gradientEnd: '#AAFF00',
};

// QR types - defined dynamically in component with translations

// Weekdays - defined dynamically in component with translations

const WEEKDAYS_MAP = {
  'monday': 'L', 'tuesday': 'M', 'wednesday': 'M', 'thursday': 'J',
  'friday': 'V', 'saturday': 'S', 'sunday': 'D'
};

// Duraciones para QR único
const DURATIONS = [
  { value: 6, label: '6 hrs' },
  { value: 12, label: '12 hrs' },
  { value: 24, label: '24 hrs' },
];

// Helper moved inside component

const formatTimeForBackend = (date) => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export default function Visits() {
  const { profile } = useAuth();
  const { t, language } = useTranslation();
  const qrRef = useRef(null);

  // Dynamic QR types with translations
  const QR_TYPES = useMemo(() => [
    { id: 'single', label: t('visits.qrTypes.single'), icon: 'flash-outline', color: COLORS.coral },
    { id: 'temporary', label: t('visits.qrTypes.temporary'), icon: 'calendar-outline', color: COLORS.purple },
    { id: 'frequent', label: t('visits.qrTypes.frequent'), icon: 'infinite-outline', color: COLORS.lime },
  ], [t, language]);

  // Dynamic weekdays with translations
  const WEEKDAYS = useMemo(() => [
    { id: 1, label: t('visits.weekdays.mon'), fullLabel: t('visits.weekdays.monday'), backendName: 'monday', short: 'L' },
    { id: 2, label: t('visits.weekdays.tue'), fullLabel: t('visits.weekdays.tuesday'), backendName: 'tuesday', short: 'M' },
    { id: 3, label: t('visits.weekdays.wed'), fullLabel: t('visits.weekdays.wednesday'), backendName: 'wednesday', short: 'M' },
    { id: 4, label: t('visits.weekdays.thu'), fullLabel: t('visits.weekdays.thursday'), backendName: 'thursday', short: 'J' },
    { id: 5, label: t('visits.weekdays.fri'), fullLabel: t('visits.weekdays.friday'), backendName: 'friday', short: 'V' },
    { id: 6, label: t('visits.weekdays.sat'), fullLabel: t('visits.weekdays.saturday'), backendName: 'saturday', short: 'S' },
    { id: 0, label: t('visits.weekdays.sun'), fullLabel: t('visits.weekdays.sunday'), backendName: 'sunday', short: 'D' },
  ], [t, language]);

  // Helper to convert day ids to backend format
  const daysToBackendFormat = useCallback((dayIds) => {
    return dayIds.map(id => {
      const day = WEEKDAYS.find(w => w.id === id);
      return day ? day.backendName : null;
    }).filter(Boolean);
  }, [WEEKDAYS]);

  const cardRef = useRef(null);

  // Lista de QRs
  const [qrCodes, setQrCodes] = useState([]);
  const [loadingQRs, setLoadingQRs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedQR, setSelectedQR] = useState(null);
  const [sharingImage, setSharingImage] = useState(false);

  // Resident QR TOTP
  const [residentQRData, setResidentQRData] = useState(null);
  const [loadingResidentQR, setLoadingResidentQR] = useState(true);
  const [activeTab, setActiveTab] = useState("myqr");

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

  useEffect(() => {
    loadResidentQRSecret();
  }, []);

  const loadResidentQRSecret = async () => {
    try {
      const result = await getResidentQRSecret();
      if (result.success) {
        setResidentQRData(result.data);
      }
    } catch (error) {
      console.error("Error loading resident QR:", error);
    } finally {
      setLoadingResidentQR(false);
    }
  };
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
      Alert.alert('Error', t('visits.errors.visitorNameRequired'));
      return;
    }
    if (!visitorPhone.trim()) {
      Alert.alert('Error', t('visits.errors.phoneRequired'));
      return;
    }
    if ((qrType === 'temporary' || qrType === 'frequent') && selectedDays.length === 0) {
      Alert.alert('Error', t('visits.errors.selectDays'));
      return;
    }

    setLoading(true);

    let qrData = {
      visitor_name: visitorName.trim(),
      visitor_phone: visitorPhone.trim(),
      visitor_id: visitorId.trim() || null,
      qr_type: qrType,
        house_number: profile?.house_number || profile?.apartment_number || null,
      house_number: profile?.house_number || profile?.apartment_number || null,  // ✅ Agregado
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

  try {
    const result = await generateQRCode(qrData);

    if (result.success) {
      Alert.alert(t('visits.success.title'), t('visits.success.message'));
      setShowCreateModal(false);
      resetForm();
      loadQRCodes();
    } else {
      Alert.alert('Error', result.error || t('visits.errors.generateError'));
    }
  } catch (error) {
    console.error('Error generating QR:', error);
    Alert.alert('Error', t('visits.errors.generateError'));
  } finally {
    setLoading(false);
  }
};

const handleDeleteQR = async (qr, e) => {
  if (e) e.stopPropagation();

  Alert.alert(
    t('visits.deleteQR'),
    t('visits.deleteConfirm', { name: qr.visitor_name }),
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const result = await deleteQRCode(qr.id);
          if (result.success) {
            loadQRCodes();
          } else {
            Alert.alert('Error', t('visits.errors.deleteError'));
          }
        },
      },
    ]
  );
};

const handleShareQRImage = async (qr) => {
  if (!cardRef.current) {
    Alert.alert('Error', t('visits.errors.captureError'));
    return;
  }

  setSharingImage(true);

  try {
    const uri = await captureRef(cardRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Compartir código QR - ISSY',
        UTI: 'public.png',
      });
    } else {
      Alert.alert('Error', t('visits.errors.shareError'));
    }
  } catch (error) {
    console.error('Error sharing image:', error);
    Alert.alert('Error', t('visits.errors.shareError'));
  } finally {
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
  const found = QR_TYPES.find(t => t.id === type);
  if (found) {
    return {
      bg: found.color,
      text: type === 'frequent' ? COLORS.textDark : COLORS.textPrimary,
      label: found.label.toUpperCase()
    };
  }
  return { bg: COLORS.bgCardAlt, text: COLORS.textPrimary, label: type.toUpperCase() };
};

const isQRActive = (qr) => {
  if (qr.status === 'used') return false;
  if (qr.status === 'expired') return false;
  if (qr.valid_until && new Date(qr.valid_until) < new Date()) return false;
  return true;
};

// Texto de validez para la lista de cards
const getCardValidityText = (qr) => {
  if (qr.qr_type === 'single') {
    return `${t('visits.status.valid')}: ${formatValidDate(qr.valid_until)}`;
  } else if (qr.qr_type === 'temporary') {
    return `${t('visits.status.valid')}: ${formatDateShort(qr.valid_from)} - ${formatDateShort(qr.valid_until)}`;
  } else if (qr.qr_type === 'frequent') {
    return `${t('visits.status.valid')}: ${t('visits.status.permanent')}`;
  }
  return '';
};

const getTimeText = (qr) => {
  if (qr.is_24_7) return t('visits.access247');
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
  return t('visits.access247');
};

// Obtener días activos como array booleano
const getActiveDays = (qr) => {
  if (!qr.access_days) return [true, true, true, true, true, true, true];

  try {
    const parsed = typeof qr.access_days === 'string'
      ? JSON.parse(qr.access_days)
      : qr.access_days;

    const WEEKDAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return WEEKDAY_ORDER.map(day => parsed.includes(day));
  } catch {
    return [true, true, true, true, true, true, true];
  }
};

const hostName = profile?.name || 'Residente ISSY';
const communityName = profile?.current_location?.name || profile?.location?.name || 'Mi Comunidad';
// house_number viene de current_location (que es un user_location con el campo)
const houseNumber = profile?.current_location?.house_number || profile?.house_number || '';

// Render QR Card - Todo el card es touchable
const renderQRCard = (qr) => {
  const typeConfig = getQRTypeConfig(qr.qr_type);
  const active = isQRActive(qr);

  return (
    <TouchableOpacity
      key={qr.id}
      style={styles.qrCard}
      onPress={() => {
        setSelectedQR(qr);
        setShowQRModal(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.qrCardContent}>
        {/* Top row with badges */}
        <View style={styles.qrCardTopRow}>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.bg }]}>
            <Text style={[styles.typeBadgeText, { color: typeConfig.text }]} maxFontSizeMultiplier={1.2}>
              {typeConfig.label}
            </Text>
          </View>

          {active ? (
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statusBadge}
            >
              <Text style={[styles.statusBadgeText, { color: COLORS.textDark }]} maxFontSizeMultiplier={1.2}>{t('visits.status.active')}</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: COLORS.bgCardAlt }]}>
              <Text style={styles.statusBadgeText} maxFontSizeMultiplier={1.2}>{t('visits.status.expired')}</Text>
            </View>
          )}
        </View>

        {/* Visitor info */}
        <Text style={styles.visitorName} maxFontSizeMultiplier={1.2}>{qr.visitor_name}</Text>
        <Text style={styles.visitorPhone} maxFontSizeMultiplier={1.2}>{qr.visitor_phone}</Text>
        <Text style={styles.validDate} maxFontSizeMultiplier={1.2}>{getCardValidityText(qr)}</Text>

        {/* Action row */}
        <View style={styles.cardActionsRow}>
          {/* Ver QR button */}
          <TouchableOpacity
            style={styles.viewQRButton}
            onPress={() => {
              setSelectedQR(qr);
              setShowQRModal(true);
            }}
          >
            <Ionicons name="qr-code-outline" size={18} color={COLORS.cyan} />
            <Text style={styles.viewQRButtonText} maxFontSizeMultiplier={1.2}>{t('visits.viewQR')}</Text>
          </TouchableOpacity>

          {/* Delete button */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => handleDeleteQR(qr, e)}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.coral} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

return (
  <View style={styles.container}>
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.cyan]}
            tintColor={COLORS.cyan}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title} maxFontSizeMultiplier={1.2}>{t('visits.title')}</Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>{t('visits.subtitle')}</Text>
        </View>

        {/* Tabs */}
        <AccessTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab: Mi QR */}
        {activeTab === 'myqr' && residentQRData && (
          <CompactResidentQR
            secret={residentQRData.secret}
            userId={residentQRData.userId}
            locationName={residentQRData.locationName}
            houseNumber={residentQRData.houseNumber}
            fullName={residentQRData.fullName}
            onError={(error) => Alert.alert("Error", error)}
          />
        )}

        {/* Tab: Visitantes */}
        {activeTab === 'visitors' && (
          <>
            {/* Create QR Button */}
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createButtonGradient}
              >
                <Ionicons name="add-circle" size={24} color={COLORS.textDark} />
                <Text style={styles.createButtonText} maxFontSizeMultiplier={1.2}>{t('visits.createButton')}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* QR List Section */}
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>{t('visits.activeCodes')}</Text>

            {loadingQRs ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.cyan} />
              </View>
            ) : qrCodes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="qr-code-outline" size={48} color={COLORS.textMuted} />
                </View>
                <Text style={styles.emptyText} maxFontSizeMultiplier={1.2}>{t('visits.empty.title')}</Text>
                <Text style={styles.emptySubtext} maxFontSizeMultiplier={1.2}>{t('visits.empty.subtitle')}</Text>
              </View>
            ) : (
              qrCodes.map((qr) => renderQRCard(qr))
            )}
          </>
        )}

        {/* Tab: Mis Accesos */}
        {activeTab === 'invitations' && (
          <MyAccessesTab />
        )}

        <View style={{ height: scale(100) }} />
      </ScrollView>
    </SafeAreaView>

    {/* ============================================ */}
    {/* CREATE QR MODAL */}
    {/* ============================================ */}
    <Modal
      visible={showCreateModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowCreateModal(false)}
    >
      <View style={styles.modalContainer}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalCancel} maxFontSizeMultiplier={1.2}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle} maxFontSizeMultiplier={1.2}>{t('visits.newQRCode')}</Text>
            <View style={{ width: scale(60) }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* QR Type Selector */}
            <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>{t('visits.qrType')}</Text>
            <View style={styles.typeSelector}>
              {QR_TYPES.map((type) => {
                const isSelected = qrType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeButton,
                      isSelected && { backgroundColor: type.color, borderColor: type.color }
                    ]}
                    onPress={() => setQrType(type.id)}
                  >
                    <Ionicons
                      name={type.icon}
                      size={18}
                      color={isSelected ? (type.id === 'frequent' ? COLORS.textDark : COLORS.textPrimary) : type.color}
                      style={{ marginRight: scale(6) }}
                    />
                    <Text style={[
                      styles.typeLabel,
                      isSelected && { color: type.id === 'frequent' ? COLORS.textDark : COLORS.textPrimary }
                    ]} maxFontSizeMultiplier={1.2}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Visitor Info */}
            <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>{t('visits.visitorName')} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t('visits.visitorNamePlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={visitorName}
              onChangeText={setVisitorName}
              maxFontSizeMultiplier={1.2}
            />

            <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>{t('visits.visitorPhone')} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t('visits.visitorPhonePlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={visitorPhone}
              onChangeText={setVisitorPhone}
              keyboardType="phone-pad"
              maxFontSizeMultiplier={1.2}
            />

            <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>{t('visits.visitorId')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('visits.visitorIdPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={visitorId}
              onChangeText={setVisitorId}
              maxFontSizeMultiplier={1.2}
            />

            {/* SINGLE QR OPTIONS */}
            {qrType === 'single' && (
              <>
                <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>{t('visits.visitDate')} *</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.dateInputText} maxFontSizeMultiplier={1.2}>{formatDate(visitDate)}</Text>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>

                <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>{t('visits.startTime')}</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowTimePicker(true)}>
                  <Text style={styles.dateInputText} maxFontSizeMultiplier={1.2}>{formatTime(visitTime)}</Text>
                  <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>

                <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>{t('visits.duration')}</Text>
                <View style={styles.durationSelector}>
                  {DURATIONS.map((d) => (
                    <TouchableOpacity
                      key={d.value}
                      style={[styles.durationButton, duration === d.value && styles.durationButtonActive]}
                      onPress={() => setDuration(d.value)}
                    >
                      <Text style={[styles.durationLabel, duration === d.value && styles.durationLabelActive]} maxFontSizeMultiplier={1.2}>
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
                <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>{t('visits.dateRange')} *</Text>
                <View style={styles.dateRangeRow}>
                  <TouchableOpacity
                    style={[styles.dateInput, { flex: 1, marginRight: scale(8) }]}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Text style={styles.dateInputText} maxFontSizeMultiplier={1.2}>{formatDate(startDate)}</Text>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dateInput, { flex: 1 }]}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Text style={styles.dateInputText} maxFontSizeMultiplier={1.2}>{formatDate(endDate)}</Text>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>{t('visits.accessSchedule')}</Text>
                <TouchableOpacity style={styles.checkboxRow} onPress={() => setAccess247(!access247)}>
                  <View style={[styles.checkbox, access247 && styles.checkboxChecked]}>
                    {access247 && <Ionicons name="checkmark" size={16} color={COLORS.textDark} />}
                  </View>
                  <Text style={styles.checkboxLabel} maxFontSizeMultiplier={1.2}>{t('visits.access247')}</Text>
                </TouchableOpacity>

                {!access247 && (
                  <View style={styles.dateRangeRow}>
                    <TouchableOpacity
                      style={[styles.dateInput, { flex: 1, marginRight: scale(8) }]}
                      onPress={() => setShowStartTimePicker(true)}
                    >
                      <Text style={styles.dateInputText} maxFontSizeMultiplier={1.2}>{formatTime(startTime)}</Text>
                      <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dateInput, { flex: 1 }]}
                      onPress={() => setShowEndTimePicker(true)}
                    >
                      <Text style={styles.dateInputText} maxFontSizeMultiplier={1.2}>{formatTime(endTime)}</Text>
                      <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>{t('visits.accessDays')}</Text>
                <TouchableOpacity style={styles.checkboxRow} onPress={toggleAllDays}>
                  <View style={[styles.checkbox, allDays && styles.checkboxChecked]}>
                    {allDays && <Ionicons name="checkmark" size={16} color={COLORS.textDark} />}
                  </View>
                  <Text style={styles.checkboxLabel} maxFontSizeMultiplier={1.2}>{t('visits.allDays')}</Text>
                </TouchableOpacity>

                <View style={styles.daysGrid}>
                  {WEEKDAYS.map((day) => (
                    <TouchableOpacity
                      key={day.id}
                      style={styles.dayCheckboxRow}
                      onPress={() => toggleDay(day.id)}
                    >
                      <View style={[styles.checkbox, selectedDays.includes(day.id) && styles.checkboxChecked]}>
                        {selectedDays.includes(day.id) && <Ionicons name="checkmark" size={16} color={COLORS.textDark} />}
                      </View>
                      <Text style={styles.dayCheckboxLabel} maxFontSizeMultiplier={1.2}>{day.fullLabel}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* FREQUENT/PERMANENT QR OPTIONS */}
            {qrType === 'frequent' && (
              <>
                <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>{t('visits.accessSchedule')}</Text>
                <TouchableOpacity style={styles.checkboxRow} onPress={() => setAccess247(!access247)}>
                  <View style={[styles.checkbox, access247 && styles.checkboxChecked]}>
                    {access247 && <Ionicons name="checkmark" size={16} color={COLORS.textDark} />}
                  </View>
                  <Text style={styles.checkboxLabel} maxFontSizeMultiplier={1.2}>{t('visits.access247')}</Text>
                </TouchableOpacity>

                {!access247 && (
                  <View style={styles.dateRangeRow}>
                    <TouchableOpacity
                      style={[styles.dateInput, { flex: 1, marginRight: scale(8) }]}
                      onPress={() => setShowStartTimePicker(true)}
                    >
                      <Text style={styles.dateInputText} maxFontSizeMultiplier={1.2}>{formatTime(startTime)}</Text>
                      <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dateInput, { flex: 1 }]}
                      onPress={() => setShowEndTimePicker(true)}
                    >
                      <Text style={styles.dateInputText} maxFontSizeMultiplier={1.2}>{formatTime(endTime)}</Text>
                      <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>{t('visits.accessDays')}</Text>
                <TouchableOpacity style={styles.checkboxRow} onPress={toggleAllDays}>
                  <View style={[styles.checkbox, allDays && styles.checkboxChecked]}>
                    {allDays && <Ionicons name="checkmark" size={16} color={COLORS.textDark} />}
                  </View>
                  <Text style={styles.checkboxLabel} maxFontSizeMultiplier={1.2}>{t('visits.allDays')}</Text>
                </TouchableOpacity>

                <View style={styles.daysGrid}>
                  {WEEKDAYS.map((day) => (
                    <TouchableOpacity
                      key={day.id}
                      style={styles.dayCheckboxRow}
                      onPress={() => toggleDay(day.id)}
                    >
                      <View style={[styles.checkbox, selectedDays.includes(day.id) && styles.checkboxChecked]}>
                        {selectedDays.includes(day.id) && <Ionicons name="checkmark" size={16} color={COLORS.textDark} />}
                      </View>
                      <Text style={styles.dayCheckboxLabel} maxFontSizeMultiplier={1.2}>{day.fullLabel}</Text>
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
                <Text style={styles.cancelButtonText} maxFontSizeMultiplier={1.2}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.generateButton, loading && styles.buttonDisabled]}
                onPress={handleCreateQR}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.textDark} size="small" />
                ) : (
                  <>
                    <Ionicons name="qr-code" size={20} color={COLORS.textDark} style={{ marginRight: scale(8) }} />
                    <Text style={styles.generateButtonText} maxFontSizeMultiplier={1.2}>{t('visits.generateQR')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ height: scale(40) }} />
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
      </View>
    </Modal>

    {/* ============================================ */}
    {/* VIEW QR MODAL - Diseño glassmorphism claro */}
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
              {/* QR Card - Diseño glassmorphism claro para compartir */}
              <View
                ref={cardRef}
                style={styles.shareableCard}
                collapsable={false}
              >
                {/* Header */}
                <View style={styles.shareableHeader}>
                  <Text style={styles.shareableVisitorName} maxFontSizeMultiplier={1.2}>{selectedQR.visitor_name}</Text>
                  <Text style={styles.shareableCommunity} maxFontSizeMultiplier={1.2}>{communityName}</Text>
                  <Text style={styles.shareableAuthorized} maxFontSizeMultiplier={1.2}>
                    {t('visits.authorizedBy')}: <Text style={styles.shareableHostName}>{hostName}</Text>
                  </Text>
                </View>

                {/* QR Type Pills */}
                <View style={styles.qrTypePills}>
                  {['single', 'temporary', 'frequent'].map((type) => (
                    <View
                      key={type}
                      style={[
                        styles.qrTypePill,
                        selectedQR.qr_type === type && styles.qrTypePillActive
                      ]}
                    >
                      <Text style={[
                        styles.qrTypePillText,
                        selectedQR.qr_type === type && styles.qrTypePillTextActive
                      ]} maxFontSizeMultiplier={1.2}>
                        {getQRTypeLabel(type)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* QR Code Card */}
                <View style={styles.qrCodeCard}>
                  <View style={styles.qrCodeWrapper}>
                    <QRCode
                      value={selectedQR.qr_code || selectedQR.id}
                      size={220}
                      backgroundColor="white"
                      color="#1A3D4D"
                      getRef={(ref) => (qrRef.current = ref)}
                    />
                  </View>

                  {/* Manual Code */}
                  <View style={styles.manualCodeSection}>
                    <Text style={styles.manualCodeLabel} maxFontSizeMultiplier={1.2}>{t('visits.manualCode')}</Text>
                    <Text style={styles.manualCode} maxFontSizeMultiplier={1.2}>
                      {(selectedQR.qr_code || selectedQR.id).substring(0, 10).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.showGuardText} maxFontSizeMultiplier={1.2}>{t('visits.showToGuard')}</Text>
                </View>

                {/* Info Cards */}
                {selectedQR.qr_type === 'single' ? (
                  // QR Único: 3 cards
                  <View style={styles.infoCardsRow}>
                    <View style={styles.infoCard}>
                      <View style={styles.infoCardIcon}>
                        <Ionicons name="time-outline" size={16} color="#1A3D4D" />
                      </View>
                      <Text style={styles.infoCardLabel} maxFontSizeMultiplier={1.2}>{t('visits.schedule')}</Text>
                      <Text style={styles.infoCardValue} maxFontSizeMultiplier={1.2}>{getTimeText(selectedQR)}</Text>
                    </View>
                    <View style={styles.infoCard}>
                      <View style={styles.infoCardIcon}>
                        <Ionicons name="home-outline" size={16} color="#1A3D4D" />
                      </View>
                      <Text style={styles.infoCardLabel} maxFontSizeMultiplier={1.2}>{t('visits.house')}</Text>
                      <Text style={styles.infoCardValue} maxFontSizeMultiplier={1.2}>{houseNumber}</Text>
                    </View>
                    <View style={styles.infoCard}>
                      <View style={styles.infoCardIcon}>
                        <Ionicons name="calendar-outline" size={16} color="#1A3D4D" />
                      </View>
                      <Text style={styles.infoCardLabel} maxFontSizeMultiplier={1.2}>{t('visits.date')}</Text>
                      <Text style={styles.infoCardValue} maxFontSizeMultiplier={1.2}>{formatDateShort(selectedQR.valid_from)}</Text>
                    </View>
                  </View>
                ) : (
                  // QR Temporal/Frecuente: Días + 3 cards
                  <>
                    {/* Fila de días */}
                    <View style={styles.daysRowCard}>
                      <Text style={styles.daysRowLabel} maxFontSizeMultiplier={1.2}>{t('visits.accessDaysLabel')}</Text>
                      <View style={styles.daysRowPills}>
                        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => {
                          const activeDays = getActiveDays(selectedQR);
                          return (
                            <View
                              key={index}
                              style={[
                                styles.dayPill,
                                activeDays[index] && styles.dayPillActive
                              ]}
                            >
                              <Text style={[
                                styles.dayPillText,
                                activeDays[index] && styles.dayPillTextActive
                              ]} maxFontSizeMultiplier={1.2}>{day}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>

                    {/* 3 Info Cards */}
                    <View style={styles.infoCardsRow}>
                      <View style={styles.infoCard}>
                        <View style={styles.infoCardIcon}>
                          <Ionicons name="time-outline" size={16} color="#1A3D4D" />
                        </View>
                        <Text style={styles.infoCardLabel} maxFontSizeMultiplier={1.2}>{t('visits.schedule')}</Text>
                        <Text style={styles.infoCardValue} maxFontSizeMultiplier={1.2}>{getTimeText(selectedQR)}</Text>
                      </View>
                      <View style={styles.infoCard}>
                        <View style={styles.infoCardIcon}>
                          <Ionicons name="home-outline" size={16} color="#1A3D4D" />
                        </View>
                        <Text style={styles.infoCardLabel} maxFontSizeMultiplier={1.2}>{t('visits.house')}</Text>
                        <Text style={styles.infoCardValue} maxFontSizeMultiplier={1.2}>{houseNumber}</Text>
                      </View>
                      <View style={styles.infoCard}>
                        <View style={styles.infoCardIcon}>
                          <Ionicons name="checkmark-circle-outline" size={16} color="#1A3D4D" />
                        </View>
                        <Text style={styles.infoCardLabel} maxFontSizeMultiplier={1.2}>{t('visits.valid')}</Text>
                        <Text style={styles.infoCardValue} maxFontSizeMultiplier={1.2}>
                          {selectedQR.qr_type === 'frequent'
                            ? t('visits.always')
                            : `${formatDateShort(selectedQR.valid_from)} - ${formatDateShort(selectedQR.valid_until)}`
                          }
                        </Text>
                      </View>
                    </View>
                  </>
                )}

                {/* Footer - Logo ISSY */}
                <View style={styles.shareableFooter}>
                  <Text style={styles.poweredByText} maxFontSizeMultiplier={1.2}>Powered by</Text>
                  <Image
                    source={IssyLogoNegro}
                    style={styles.issyLogoImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.websiteText} maxFontSizeMultiplier={1.2}>www.joinissy.com</Text>
                </View>
              </View>

              {/* Share Button */}
              <TouchableOpacity
                style={styles.shareButtonPrimary}
                onPress={() => handleShareQRImage(selectedQR)}
                disabled={sharingImage}
              >
                {sharingImage ? (
                  <ActivityIndicator color={COLORS.textDark} size="small" />
                ) : (
                  <>
                    <Ionicons name="share-outline" size={20} color={COLORS.textDark} style={{ marginRight: scale(8) }} />
                    <Text style={styles.shareButtonPrimaryText} maxFontSizeMultiplier={1.2}>{t('visits.shareQR')}</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowQRModal(false)}
              >
                <Text style={styles.closeModalButtonText} maxFontSizeMultiplier={1.2}>{t('visits.close')}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(16),
  },

  // Header
  header: {
    paddingTop: scale(10),
    paddingBottom: scale(16),
  },
  title: {
    fontSize: scale(28),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(4),
  },

  // Create Button
  createButton: {
    borderRadius: scale(14),
    overflow: 'hidden',
    marginTop: scale(8),
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(16),
    paddingHorizontal: scale(20),
  },
  createButtonText: {
    color: COLORS.textDark,
    fontSize: scale(15),
    fontWeight: '600',
    marginLeft: scale(10),
  },

  // Section Title
  sectionTitle: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: scale(24),
    marginBottom: scale(12),
  },

  // Loading
  loadingContainer: {
    padding: scale(40),
    alignItems: 'center',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    padding: scale(40),
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIconBox: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: COLORS.bgCardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  emptyText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptySubtext: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(8),
  },

  // QR Card
  qrCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    marginBottom: scale(12),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrCardContent: {
    padding: scale(16),
  },
  qrCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  typeBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(6),
  },
  typeBadgeText: {
    fontSize: scale(10),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(6),
  },
  statusBadgeText: {
    fontSize: scale(10),
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  visitorName: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  visitorPhone: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginBottom: scale(4),
  },
  validDate: {
    fontSize: scale(12),
    color: COLORS.textMuted,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: scale(16),
    paddingTop: scale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  viewQRButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCardAlt,
    paddingVertical: scale(10),
    borderRadius: scale(10),
    marginRight: scale(10),
  },
  viewQRButtonText: {
    color: COLORS.cyan,
    fontSize: scale(14),
    fontWeight: '600',
    marginLeft: scale(6),
  },
  deleteButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(10),
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal Container
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCancel: {
    fontSize: scale(16),
    color: COLORS.cyan,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: scale(16),
    paddingTop: scale(20),
  },

  // Form Inputs
  inputLabel: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: scale(8),
    marginTop: scale(16),
  },
  input: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(12),
    padding: scale(16),
    fontSize: scale(16),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateInput: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(12),
    padding: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateInputText: {
    fontSize: scale(16),
    color: COLORS.textPrimary,
  },
  dateRangeRow: {
    flexDirection: 'row',
  },

  // Type Selector
  typeSelector: {
    flexDirection: 'row',
    gap: scale(8),
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(12),
    paddingHorizontal: scale(8),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  typeLabel: {
    fontSize: scale(11),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  // Duration Selector
  durationSelector: {
    flexDirection: 'row',
    gap: scale(12),
  },
  durationButton: {
    flex: 1,
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
  },
  durationButtonActive: {
    borderColor: COLORS.cyan,
    backgroundColor: COLORS.cyan + '20',
  },
  durationLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  durationLabelActive: {
    color: COLORS.cyan,
  },

  // Checkboxes
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(12),
  },
  checkbox: {
    width: scale(24),
    height: scale(24),
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: scale(6),
    marginRight: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCard,
  },
  checkboxChecked: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  checkboxLabel: {
    fontSize: scale(16),
    color: COLORS.textPrimary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    paddingVertical: scale(8),
  },
  dayCheckboxLabel: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    marginTop: scale(24),
    gap: scale(12),
  },
  cancelButton: {
    flex: 1,
    padding: scale(16),
    borderRadius: scale(12),
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  generateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    padding: scale(16),
    borderRadius: scale(12),
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    color: COLORS.textDark,
    fontSize: scale(16),
    fontWeight: '600',
  },

  // QR Modal Overlay
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  qrModalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(16),
    paddingTop: scale(60),
    paddingBottom: scale(40),
  },

  // ============ SHAREABLE CARD - Glassmorphism claro ============
  shareableCard: {
    width: scale(340),
    backgroundColor: '#E3F2EE',
    borderRadius: scale(44),
    padding: scale(24),
    paddingTop: scale(28),
    paddingBottom: scale(20),
  },

  // Header del card compartible
  shareableHeader: {
    alignItems: 'center',
    marginBottom: scale(20),
  },
  shareableVisitorName: {
    fontSize: scale(32),
    fontWeight: '700',
    color: '#1A3D4D',
    marginBottom: scale(6),
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  shareableCommunity: {
    fontSize: scale(17),
    fontWeight: '600',
    color: '#3D5A6C',
    marginBottom: scale(6),
    textAlign: 'center',
  },
  shareableAuthorized: {
    fontSize: scale(13),
    color: '#7A9E9E',
    fontWeight: '500',
  },
  shareableHostName: {
    color: '#3D5A6C',
    fontWeight: '600',
  },

  // Pills de tipo QR
  qrTypePills: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(8),
    marginBottom: scale(18),
  },
  qrTypePill: {
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  qrTypePillActive: {
    backgroundColor: '#1A3D4D',
    borderColor: 'rgba(26, 61, 77, 0.3)',
  },
  qrTypePillText: {
    fontSize: scale(13),
    fontWeight: '600',
    color: '#6B8A8A',
  },
  qrTypePillTextActive: {
    color: '#FFFFFF',
  },

  // Card del QR
  qrCodeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: scale(26),
    padding: scale(20),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
  },
  qrCodeWrapper: {
    backgroundColor: '#FFFFFF',
    padding: scale(12),
    borderRadius: scale(18),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: scale(14),
  },
  manualCodeSection: {
    width: '100%',
    backgroundColor: 'rgba(26, 61, 77, 0.05)',
    borderRadius: scale(10),
    paddingVertical: scale(10),
    paddingHorizontal: scale(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(26, 61, 77, 0.08)',
    marginBottom: scale(10),
  },
  manualCodeLabel: {
    fontSize: scale(10),
    color: '#8AABAB',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  manualCode: {
    fontSize: scale(13),
    fontWeight: '600',
    color: '#3D5A6C',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  showGuardText: {
    fontSize: scale(13),
    color: '#7A9E9E',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Days Row Card
  daysRowCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: scale(14),
    paddingVertical: scale(10),
    paddingHorizontal: scale(14),
    marginBottom: scale(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  daysRowLabel: {
    fontSize: scale(9),
    color: '#7A9E9E',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  daysRowPills: {
    flexDirection: 'row',
    gap: scale(4),
  },
  dayPill: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(6),
    backgroundColor: '#E3EAEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillActive: {
    backgroundColor: '#1A3D4D',
  },
  dayPillText: {
    fontSize: scale(9),
    fontWeight: '700',
    color: '#A0B5B5',
  },
  dayPillTextActive: {
    color: '#FFFFFF',
  },

  // Info Cards Row
  infoCardsRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: scale(20),
  },
  infoCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: scale(16),
    paddingVertical: scale(12),
    paddingHorizontal: scale(8),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  infoCardIcon: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(9),
    backgroundColor: '#E8EDEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(6),
  },
  infoCardLabel: {
    fontSize: scale(9),
    color: '#7A9E9E',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: scale(4),
  },
  infoCardValue: {
    fontSize: scale(11),
    fontWeight: '700',
    color: '#1A3D4D',
    textAlign: 'center',
    lineHeight: scale(14),
  },

  // Footer
  shareableFooter: {
    alignItems: 'center',
  },
  poweredByText: {
    fontSize: scale(10),
    color: '#9CBBBB',
    fontWeight: '500',
    marginBottom: scale(4),
  },
  issyLogoImage: {
    width: scale(80),
    height: scale(30),
    marginBottom: scale(4),
  },
  websiteText: {
    fontSize: scale(10),
    color: '#5A7A7A',
    fontWeight: '500',
  },

  // Share Button
  shareButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    paddingVertical: scale(16),
    paddingHorizontal: scale(32),
    borderRadius: scale(14),
    marginTop: scale(20),
    width: scale(300),
  },
  shareButtonPrimaryText: {
    color: COLORS.textDark,
    fontSize: scale(16),
    fontWeight: '600',
  },
  closeModalButton: {
    marginTop: scale(16),
    paddingVertical: scale(12),
    paddingHorizontal: scale(32),
  },
  closeModalButtonText: {
    color: COLORS.textPrimary,
    fontSize: scale(16),
    fontWeight: '500',
  },
});