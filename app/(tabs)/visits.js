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
import { useUserLocation } from '../../src/context/UserLocationContext';
import { UserLocationSelector, UserLocationPickerModal } from '../../src/components/UserLocationPicker';
import { getMyQRCodes, generateQRCode, deleteQRCode, getResidentQRSecret, lookupUserForQR, getQRSharingMode } from '../../src/services/api';
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

// ============ DELIVERY / RIDESHARE PROVIDERS BY COUNTRY ============
const DELIVERY_PROVIDERS = {
  HN: {
    label: 'Honduras',
    providers: [
      { id: 'hugo', name: 'Hugo', color: '#FF6B00', icon: 'bicycle', initial: 'H' },
      { id: 'rappi', name: 'Rappi', color: '#FF441F', icon: 'bag-handle', initial: 'R' },
      { id: 'uber_eats', name: 'Uber Eats', color: '#06C167', icon: 'fast-food', initial: 'UE' },
      { id: 'pedidosya', name: 'PedidosYa', color: '#FF0044', icon: 'restaurant', initial: 'PY' },
      { id: 'uber', name: 'Uber', color: '#276EF1', icon: 'car', initial: 'U' },
      { id: 'indriver', name: 'InDriver', color: '#2FD058', icon: 'car-sport', initial: 'iD' },
      { id: 'otro', name: 'Otro', color: '#8B5CF6', icon: 'cube', initial: '?' },
    ],
  },
  US: {
    label: 'United States',
    providers: [
      { id: 'uber_eats', name: 'Uber Eats', color: '#06C167', icon: 'fast-food', initial: 'UE' },
      { id: 'doordash', name: 'DoorDash', color: '#FF3008', icon: 'bag-handle', initial: 'DD' },
      { id: 'grubhub', name: 'Grubhub', color: '#F63440', icon: 'restaurant', initial: 'GH' },
      { id: 'amazon', name: 'Amazon', color: '#FF9900', icon: 'cube', initial: 'A' },
      { id: 'uber', name: 'Uber', color: '#276EF1', icon: 'car', initial: 'U' },
      { id: 'lyft', name: 'Lyft', color: '#FF00BF', icon: 'car-sport', initial: 'L' },
      { id: 'otro', name: 'Other', color: '#8B5CF6', icon: 'cube', initial: '?' },
    ],
  },
  MX: {
    label: 'México',
    providers: [
      { id: 'rappi', name: 'Rappi', color: '#FF441F', icon: 'bag-handle', initial: 'R' },
      { id: 'uber_eats', name: 'Uber Eats', color: '#06C167', icon: 'fast-food', initial: 'UE' },
      { id: 'didi_food', name: 'DiDi Food', color: '#FF7B00', icon: 'restaurant', initial: 'DD' },
      { id: 'uber', name: 'Uber', color: '#276EF1', icon: 'car', initial: 'U' },
      { id: 'didi', name: 'DiDi', color: '#FF7B00', icon: 'car-sport', initial: 'D' },
      { id: 'otro', name: 'Otro', color: '#8B5CF6', icon: 'cube', initial: '?' },
    ],
  },
  GT: {
    label: 'Guatemala',
    providers: [
      { id: 'hugo', name: 'Hugo', color: '#FF6B00', icon: 'bicycle', initial: 'H' },
      { id: 'uber_eats', name: 'Uber Eats', color: '#06C167', icon: 'fast-food', initial: 'UE' },
      { id: 'pedidosya', name: 'PedidosYa', color: '#FF0044', icon: 'restaurant', initial: 'PY' },
      { id: 'uber', name: 'Uber', color: '#276EF1', icon: 'car', initial: 'U' },
      { id: 'otro', name: 'Otro', color: '#8B5CF6', icon: 'cube', initial: '?' },
    ],
  },
  SV: {
    label: 'El Salvador',
    providers: [
      { id: 'hugo', name: 'Hugo', color: '#FF6B00', icon: 'bicycle', initial: 'H' },
      { id: 'uber_eats', name: 'Uber Eats', color: '#06C167', icon: 'fast-food', initial: 'UE' },
      { id: 'pedidosya', name: 'PedidosYa', color: '#FF0044', icon: 'restaurant', initial: 'PY' },
      { id: 'uber', name: 'Uber', color: '#276EF1', icon: 'car', initial: 'U' },
      { id: 'otro', name: 'Otro', color: '#8B5CF6', icon: 'cube', initial: '?' },
    ],
  },
  DEFAULT: {
    label: 'International',
    providers: [
      { id: 'uber_eats', name: 'Uber Eats', color: '#06C167', icon: 'fast-food', initial: 'UE' },
      { id: 'uber', name: 'Uber', color: '#276EF1', icon: 'car', initial: 'U' },
      { id: 'delivery', name: 'Delivery', color: '#FF6B00', icon: 'bicycle', initial: 'D' },
      { id: 'otro', name: 'Other', color: '#8B5CF6', icon: 'cube', initial: '?' },
    ],
  },
};

// Quick access durations
const QUICK_DURATIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hr' },
  { value: 120, label: '2 hrs' },
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
  const { selectedLocationId, locationName, hasMultipleLocations, loading: locationLoading } = useUserLocation();
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
  const [residentQRDisabled, setResidentQRDisabled] = useState(false); // ✅ Track if feature is disabled
  const [activeTab, setActiveTab] = useState("myqr");

  // Form states
  const [qrType, setQrType] = useState('single');
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorId, setVisitorId] = useState('');
  const [loading, setLoading] = useState(false);

  // User lookup states (in-app sharing)
  const [foundUser, setFoundUser] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [sendInApp, setSendInApp] = useState(false);
  const [sharingMode, setSharingMode] = useState('any'); // 'any' | 'app_only' | 'app_preferred'

  // Quick Delivery states
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [quickDuration, setQuickDuration] = useState(60);
  const [quickDriverName, setQuickDriverName] = useState('');
  const [quickDriverPhone, setQuickDriverPhone] = useState('');
  const [generatingQuick, setGeneratingQuick] = useState(false);

  // Get country-specific providers (default to HN for now, later from user profile/location)
  const userCountry = profile?.country_code || 'HN';
  const deliveryProviders = useMemo(() => {
    return DELIVERY_PROVIDERS[userCountry] || DELIVERY_PROVIDERS.DEFAULT;
  }, [userCountry]);

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
    if (selectedLocationId) {
      loadResidentQRSecret();
    }
  }, [selectedLocationId]);

  const loadResidentQRSecret = async () => {
    if (!selectedLocationId) return;
    setResidentQRDisabled(false); // Reset disabled state
    try {
      const result = await getResidentQRSecret(selectedLocationId);
      if (result.success) {
        setResidentQRData(result.data);
      } else if (result.error?.includes('no está habilitado') || result.reason === 'FEATURE_DISABLED') {
        // ✅ Feature is disabled by admin
        setResidentQRDisabled(true);
        setResidentQRData(null);
      }
    } catch (error) {
      console.error("Error loading resident QR:", error);
    } finally {
      setLoadingResidentQR(false);
    }
  };
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    if (selectedLocationId) {
      loadQRCodes();
    }
  }, [selectedLocationId]);

  // Load sharing mode for location
  useEffect(() => {
    if (selectedLocationId) {
      getQRSharingMode(selectedLocationId).then(result => {
        if (result.success) setSharingMode(result.mode);
      });
    }
  }, [selectedLocationId]);

  // Debounced phone/email lookup for in-app sharing
  useEffect(() => {
    const cleanPhone = visitorPhone.replace(/[\s\-\(\)]/g, '');
    // Check if input looks like email
    const isEmail = visitorPhone.includes('@') && visitorPhone.includes('.');
    const shouldLookup = isEmail ? visitorPhone.trim().length >= 5 : cleanPhone.length >= 8;

    if (shouldLookup) {
      const timer = setTimeout(async () => {
        setLookupLoading(true);
        try {
          // Pass as email if it contains @, otherwise as phone
          const result = isEmail
            ? await lookupUserForQR(null, visitorPhone.trim())
            : await lookupUserForQR(cleanPhone);
          if (result.success && result.data?.found) {
            setFoundUser(result.data.user);
            // Auto-enable in-app if mode is app_only or app_preferred
            if (sharingMode === 'app_only' || sharingMode === 'app_preferred') {
              setSendInApp(true);
            }
          } else {
            setFoundUser(null);
            setSendInApp(false);
          }
        } catch (e) {
          setFoundUser(null);
        } finally {
          setLookupLoading(false);
        }
      }, 600);
      return () => clearTimeout(timer);
    } else {
      setFoundUser(null);
      setSendInApp(false);
    }
  }, [visitorPhone, sharingMode]);

  const loadQRCodes = async () => {
    if (!selectedLocationId) return;
    try {
      const result = await getMyQRCodes(selectedLocationId);
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
    setFoundUser(null);
    setSendInApp(false);
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

  const handleQuickDeliveryQR = async () => {
    if (!selectedProvider) return;

    setGeneratingQuick(true);

    const now = new Date();
    const validUntil = new Date(now.getTime() + quickDuration * 60 * 1000);
    const driverLabel = quickDriverName.trim() || selectedProvider.name;
    const visitorLabel = `${selectedProvider.name} - ${driverLabel}`;
    const phoneToSave = quickDriverPhone.trim() || 'N/A';

    const qrData = {
      visitor_name: visitorLabel,
      visitor_phone: phoneToSave,
      visitor_id: null,
      qr_type: 'single',
      valid_from: now.toISOString(),
      valid_until: validUntil.toISOString(),
      house_number: profile?.house_number || profile?.apartment_number || null,
      is_delivery: true,
      delivery_provider: selectedProvider.id,
    };

    try {
      const result = await generateQRCode(qrData);

      if (result.success) {
        // Close modal and reset
        setShowQuickModal(false);
        setSelectedProvider(null);
        setQuickDriverName('');
        setQuickDriverPhone('');
        setQuickDuration(60);

        // Reload QR codes
        loadQRCodes();

        // Show the QR modal
        const newQR = result.data;
        if (newQR) {
          setSelectedQR(newQR);
          setShowQRModal(true);

          // If phone provided, auto-share QR image after modal renders
          if (phoneToSave !== 'N/A' && phoneToSave.length >= 8) {
            const communityName = locationName || 'la residencial';
            const expiryTime = validUntil.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });

            // Wait for QR modal to render, then capture and share
            setTimeout(async () => {
              try {
                if (cardRef.current) {
                  const uri = await captureRef(cardRef, {
                    format: 'png',
                    quality: 1,
                    result: 'tmpfile',
                  });

                  if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, {
                      mimeType: 'image/png',
                      dialogTitle: `Código de acceso - ${selectedProvider.name}`,
                      UTI: 'public.png',
                    });
                  }
                }
              } catch (e) {
                console.log('Auto-share skipped:', e.message);
              }
            }, 1200);
          }
        }
      } else {
        Alert.alert('Error', result.error || 'No se pudo generar el QR');
      }
    } catch (error) {
      console.error('Error generating quick QR:', error);
      Alert.alert('Error', 'Error al generar QR rápido');
    } finally {
      setGeneratingQuick(false);
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
    if (!visitorPhone.trim() && !sendInApp) {
      Alert.alert('Error', t('visits.errors.phoneRequired'));
      return;
    }
    if (sharingMode === 'app_only' && !foundUser) {
      Alert.alert('Error', 'Esta comunidad solo permite enviar códigos QR dentro de la app ISSY. El destinatario debe ser usuario de ISSY.');
      return;
    }
    if ((qrType === 'temporary' || qrType === 'frequent') && selectedDays.length === 0) {
      Alert.alert('Error', t('visits.errors.selectDays'));
      return;
    }

    setLoading(true);

    let qrData = {
      visitor_name: visitorName.trim(),
      visitor_phone: visitorPhone.trim() || 'N/A',
      visitor_id: visitorId.trim() || null,
      qr_type: qrType,
      house_number: profile?.house_number || profile?.apartment_number || null,
    };

    // In-app sharing data
    if (sendInApp && foundUser) {
      qrData.recipient_user_id = foundUser.id;
      qrData.delivery_method = 'in_app';
      qrData.sent_at = new Date().toISOString();
    }

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
      if (sendInApp && foundUser) {
        Alert.alert(
          '✅ Enviado', 
          `El código QR fue enviado a ${foundUser.name} dentro de ISSY. Lo verá en su pestaña "Mis Accesos".`
        );
      } else {
        Alert.alert(t('visits.success.title'), t('visits.success.message'));
      }
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
          {hasMultipleLocations ? (
            <UserLocationSelector style={styles.subtitle} />
          ) : (
            <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>{t('visits.subtitle')}</Text>
          )}
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

        {/* Message when Resident QR is disabled by admin */}
        {activeTab === 'myqr' && residentQRDisabled && !loadingResidentQR && (
          <View style={styles.disabledQRContainer}>
            <Ionicons name="qr-code-outline" size={scale(48)} color={COLORS.textMuted} />
            <Text style={styles.disabledQRTitle}>{t('visits.residentQrDisabled.title') || 'QR de Residente No Disponible'}</Text>
            <Text style={styles.disabledQRText}>{t('visits.residentQrDisabled.message') || 'El administrador de tu comunidad ha deshabilitado esta función.'}</Text>
          </View>
        )}

        {/* Tab: Visitantes */}
        {activeTab === 'visitors' && (
          <>
            {/* ============================================ */}
            {/* QUICK DELIVERY / UBER ACCESS */}
            {/* ============================================ */}
            <View style={styles.quickAccessSection}>
              <View style={styles.quickAccessHeader}>
                <Ionicons name="flash" size={20} color={COLORS.orange} />
                <Text style={styles.quickAccessTitle} maxFontSizeMultiplier={1.2}>Acceso Rápido</Text>
              </View>
              <Text style={styles.quickAccessSubtitle} maxFontSizeMultiplier={1.2}>
                Genera un QR rápido para delivery o transporte
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.providersRow}
              >
                {deliveryProviders.providers.map((provider) => (
                  <TouchableOpacity
                    key={provider.id}
                    style={styles.providerButton}
                    onPress={() => {
                      setSelectedProvider(provider);
                      setQuickDuration(60);
                      setQuickDriverName('');
                      setQuickDriverPhone('');
                      setShowQuickModal(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.providerLogoContainer, { backgroundColor: provider.color + '20', borderColor: provider.color + '50' }]}>
                      <Ionicons name={provider.icon} size={28} color={provider.color} />
                    </View>
                    <Text style={styles.providerName} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                      {provider.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

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

            {/* User Lookup Result */}
            {lookupLoading && (
              <View style={styles.lookupRow}>
                <ActivityIndicator size="small" color={COLORS.cyan} />
                <Text style={styles.lookupSearching}>Buscando usuario ISSY...</Text>
              </View>
            )}

            {foundUser && !lookupLoading && (
              <View style={styles.foundUserCard}>
                <View style={styles.foundUserInfo}>
                  <View style={styles.foundUserAvatar}>
                    {foundUser.profile_image ? (
                      <Image source={{ uri: foundUser.profile_image }} style={styles.foundUserAvatarImg} />
                    ) : (
                      <Text style={styles.foundUserAvatarText}>
                        {foundUser.name?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.foundUserName}>{foundUser.name}</Text>
                    <Text style={styles.foundUserUnit}>
                      {foundUser.house_number ? `Casa ${foundUser.house_number}` : 'Usuario ISSY'}
                    </Text>
                  </View>
                  <View style={styles.foundUserBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.teal} />
                    <Text style={styles.foundUserBadgeText}>ISSY</Text>
                  </View>
                </View>

                {/* In-App Toggle */}
                <TouchableOpacity
                  style={[styles.inAppToggle, sendInApp && styles.inAppToggleActive]}
                  onPress={() => setSendInApp(!sendInApp)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={sendInApp ? 'paper-plane' : 'paper-plane-outline'} 
                    size={18} 
                    color={sendInApp ? COLORS.textDark : COLORS.teal} 
                  />
                  <Text style={[styles.inAppToggleText, sendInApp && styles.inAppToggleTextActive]}>
                    {sendInApp ? 'Se enviará dentro de ISSY' : 'Enviar dentro de ISSY'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* App-only mode warning */}
            {sharingMode === 'app_only' && !foundUser && visitorPhone.length >= 8 && !lookupLoading && (
              <View style={styles.appOnlyWarning}>
                <Ionicons name="alert-circle" size={18} color={COLORS.orange} />
                <Text style={styles.appOnlyWarningText}>
                  Esta comunidad requiere que los códigos QR se envíen dentro de ISSY. El destinatario debe tener la app instalada.
                </Text>
              </View>
            )}

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
    {/* ============================================ */}
    {/* QUICK DELIVERY MODAL */}
    {/* ============================================ */}
    <Modal
      visible={showQuickModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowQuickModal(false)}
    >
      <View style={styles.modalContainer}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowQuickModal(false);
              setSelectedProvider(null);
            }}>
              <Text style={styles.modalCancel} maxFontSizeMultiplier={1.2}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle} maxFontSizeMultiplier={1.2}>Acceso Rápido</Text>
            <View style={{ width: scale(60) }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedProvider && (
              <>
                {/* Provider Header */}
                <View style={styles.quickProviderHeader}>
                  <View style={[styles.quickProviderLogo, { backgroundColor: selectedProvider.color + '20', borderColor: selectedProvider.color }]}>
                    <Ionicons name={selectedProvider.icon} size={40} color={selectedProvider.color} />
                  </View>
                  <Text style={styles.quickProviderName} maxFontSizeMultiplier={1.2}>{selectedProvider.name}</Text>
                  <Text style={styles.quickProviderDesc} maxFontSizeMultiplier={1.2}>
                    Se generará un QR de uso único para el conductor
                  </Text>
                </View>

                {/* Driver Name (Optional) */}
                <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>Nombre del conductor (opcional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Juan Carlos"
                  placeholderTextColor={COLORS.textMuted}
                  value={quickDriverName}
                  onChangeText={setQuickDriverName}
                  maxFontSizeMultiplier={1.2}
                />

                {/* Driver Phone (Optional - for WhatsApp) */}
                <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>Teléfono del conductor (opcional)</Text>
                <View style={styles.phoneInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="9999-9999"
                    placeholderTextColor={COLORS.textMuted}
                    value={quickDriverPhone}
                    onChangeText={setQuickDriverPhone}
                    keyboardType="phone-pad"
                    maxFontSizeMultiplier={1.2}
                  />
                  {quickDriverPhone.trim().length >= 8 && (
                    <View style={styles.whatsappBadge}>
                      <Ionicons name="share-outline" size={16} color="#25D366" />
                      <Text style={styles.whatsappBadgeText} maxFontSizeMultiplier={1.2}>Se compartirá el QR automáticamente</Text>
                    </View>
                  )}
                </View>

                {/* Duration Selector */}
                <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>Tiempo de acceso</Text>
                <View style={styles.durationSelector}>
                  {QUICK_DURATIONS.map((d) => (
                    <TouchableOpacity
                      key={d.value}
                      style={[styles.durationButton, quickDuration === d.value && { backgroundColor: selectedProvider.color, borderColor: selectedProvider.color }]}
                      onPress={() => setQuickDuration(d.value)}
                    >
                      <Text style={[styles.durationLabel, quickDuration === d.value && styles.durationLabelActive]} maxFontSizeMultiplier={1.2}>
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Info Note */}
                <View style={styles.quickInfoNote}>
                  <Ionicons name="information-circle" size={20} color={COLORS.cyan} />
                  <Text style={styles.quickInfoText} maxFontSizeMultiplier={1.2}>
                    No necesitás guardar el número. Si lo ingresás, al generar el QR se abrirá WhatsApp directo para enviárselo al conductor. El QR expira automáticamente.
                  </Text>
                </View>

                {/* Generate Button */}
                <TouchableOpacity
                  style={[styles.quickGenerateButton, { backgroundColor: selectedProvider.color }, generatingQuick && { opacity: 0.6 }]}
                  onPress={handleQuickDeliveryQR}
                  disabled={generatingQuick}
                >
                  {generatingQuick ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="flash" size={22} color="#fff" style={{ marginRight: scale(8) }} />
                      <Text style={styles.quickGenerateText} maxFontSizeMultiplier={1.2}>
                        Generar QR para {selectedProvider.name}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            <View style={{ height: scale(40) }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>

    <UserLocationPickerModal />
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

  // Disabled QR Message
  disabledQRContainer: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(24),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: scale(16),
  },
  disabledQRTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: scale(12),
    marginBottom: scale(8),
  },
  disabledQRText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scale(20),
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

  // ============ QUICK DELIVERY SECTION ============
  quickAccessSection: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickAccessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(4),
  },
  quickAccessTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  quickAccessSubtitle: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginBottom: scale(14),
  },
  providersRow: {
    flexDirection: 'row',
    gap: scale(12),
    paddingRight: scale(8),
  },
  providerButton: {
    alignItems: 'center',
    width: scale(72),
  },
  providerLogoContainer: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: scale(6),
  },
  providerLogo: {
    width: scale(56),
    height: scale(56),
  },
  providerName: {
    fontSize: scale(11),
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // ============ QUICK DELIVERY MODAL ============
  quickProviderHeader: {
    alignItems: 'center',
    paddingVertical: scale(24),
  },
  quickProviderLogo: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(24),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
    marginBottom: scale(12),
  },
  quickProviderLogoImage: {
    width: scale(80),
    height: scale(80),
  },
  quickProviderName: {
    fontSize: scale(22),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  quickProviderDesc: {
    fontSize: scale(13),
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: scale(20),
  },
  quickInfoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.cyan + '10',
    padding: scale(14),
    borderRadius: scale(12),
    marginTop: scale(20),
    gap: scale(10),
  },
  quickInfoText: {
    flex: 1,
    fontSize: scale(12),
    color: COLORS.cyan,
    lineHeight: scale(18),
  },
  quickGenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(16),
    borderRadius: scale(14),
    marginTop: scale(24),
  },
  quickGenerateText: {
    fontSize: scale(16),
    fontWeight: '700',
    color: '#fff',
  },
  phoneInputRow: {
    position: 'relative',
  },
  whatsappBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: scale(8),
    paddingVertical: scale(6),
    paddingHorizontal: scale(12),
    backgroundColor: '#25D36615',
    borderRadius: scale(8),
    alignSelf: 'flex-start',
  },
  whatsappBadgeText: {
    fontSize: scale(12),
    color: '#25D366',
    fontWeight: '600',
  },

  // ============ USER LOOKUP / IN-APP SHARING ============
  lookupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginTop: scale(8),
    paddingVertical: scale(6),
  },
  lookupSearching: {
    fontSize: scale(12),
    color: COLORS.cyan,
  },
  foundUserCard: {
    backgroundColor: COLORS.teal + '15',
    borderRadius: scale(12),
    padding: scale(12),
    marginTop: scale(10),
    borderWidth: 1,
    borderColor: COLORS.teal + '30',
  },
  foundUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  foundUserAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.teal + '30',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  foundUserAvatarImg: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
  },
  foundUserAvatarText: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.teal,
  },
  foundUserName: {
    fontSize: scale(14),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  foundUserUnit: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  foundUserBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: COLORS.teal + '20',
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(8),
  },
  foundUserBadgeText: {
    fontSize: scale(11),
    fontWeight: '700',
    color: COLORS.teal,
  },
  inAppToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    marginTop: scale(10),
    paddingVertical: scale(10),
    borderRadius: scale(10),
    backgroundColor: COLORS.bgCardAlt,
    borderWidth: 1,
    borderColor: COLORS.teal + '30',
  },
  inAppToggleActive: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  inAppToggleText: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.teal,
  },
  inAppToggleTextActive: {
    color: COLORS.textDark,
  },
  appOnlyWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(8),
    marginTop: scale(8),
    padding: scale(10),
    backgroundColor: COLORS.orange + '15',
    borderRadius: scale(10),
  },
  appOnlyWarningText: {
    flex: 1,
    fontSize: scale(12),
    color: COLORS.orange,
    lineHeight: scale(17),
  },
});