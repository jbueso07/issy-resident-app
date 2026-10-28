// app/(tabs)/visits.js
// ISSY Resident App - Visits Screen (ProHome Dark Style)

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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
  Linking,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Sharing from 'expo-sharing';
// Hotfix QR: FileSystem (legacy API) para verificar que el archivo del captureRef
// existe y no está vacío antes de pasarlo al share. En expo-file-system v19
// (SDK 54), getInfoAsync vive en /legacy — la default exporta la nueva File API.
import * as FileSystem from 'expo-file-system/legacy';
import { captureRef } from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useTranslation } from '../../src/hooks/useTranslation';
import { useUserLocation } from '../../src/context/UserLocationContext';
import { UserLocationSelector, UserLocationPickerModal } from '../../src/components/UserLocationPicker';
import { getMyQRCodes, generateQRCode, deleteQRCode, getResidentQRSecret, lookupUserForQR, getQRSharingMode, getRecentVisitors } from '../../src/services/api';
import CompactResidentQR from '../../src/components/CompactResidentQR';
import AccessTabs from '../../src/components/AccessTabs';
import MyAccessesTab from '../../src/components/MyAccessesTab';
import { hasKnownNoHome } from '../../src/components/home/LocationCarousel';
import PressableScale from '../../src/components/home/PressableScale';
import { colors as tk, radius, spacing, neu, neuSurface, fs } from '../../src/theme/tokens';
import { useHomeFont } from '../../src/theme/homeFont';
import { TYPE_COLORS } from '../../src/utils/receivedQR';
import { getMyQRStatusLine, getMyQRSummary, filterMyQRs, MY_QR_FILTERS } from '../../src/utils/myQRStatus';
import {
  loadSuggestionPrefs,
  hideSuggestion,
  buildSuggestionsFromQRs,
  applySuggestionPrefs,
  matchSuggestions,
  normalizeVisitorName,
} from '../../src/utils/visitorSuggestions';
import VisitorSuggestions from '../../src/components/VisitorSuggestions';

// Logo ISSY
const IssyLogoNegro = require('../../assets/isologotipo-negro.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ============ COLORES PROHOME ============
const COLORS = {
  bgPrimary: neu.bg,
  bgSecondary: neu.sunken,
  bgCard: neu.raised,
  bgCardAlt: neu.sunken,

  lime: neu.teal,
  cyan: neu.teal,
  teal: neu.teal,
  orange: neu.amber,
  purple: neu.lilac,
  coral: neu.coral,
  indigo: neu.lilac,
  blue: neu.blue,
  pink: neu.lilac,

  textPrimary: neu.text,
  textSecondary: neu.textLabel,
  textMuted: neu.textSoft,
  textDark: neu.onAccent,

  border: neu.border,
  gradientStart: neu.teal,
  gradientEnd: neu.teal,
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
      { id: 'rappi', name: 'Rappi', color: '#FF441F', icon: 'bag-handle', initial: 'R' },
      { id: 'uber_eats', name: 'Uber Eats', color: '#06C167', icon: 'fast-food', initial: 'UE' },
      { id: 'pedidosya', name: 'PedidosYa', color: '#FF0044', icon: 'restaurant', initial: 'PY' },
      { id: 'uber', name: 'Uber', color: '#276EF1', icon: 'car', initial: 'U' },
      { id: 'indriver', name: 'InDriver', color: '#2FD058', icon: 'car-sport', initial: 'iD' },
      { id: 'otro', name: 'Otro', color: neu.lilac, icon: 'cube', initial: '?' },
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
      { id: 'otro', name: 'Other', color: neu.lilac, icon: 'cube', initial: '?' },
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
      { id: 'otro', name: 'Otro', color: neu.lilac, icon: 'cube', initial: '?' },
    ],
  },
  GT: {
    label: 'Guatemala',
    providers: [
      { id: 'uber_eats', name: 'Uber Eats', color: '#06C167', icon: 'fast-food', initial: 'UE' },
      { id: 'pedidosya', name: 'PedidosYa', color: '#FF0044', icon: 'restaurant', initial: 'PY' },
      { id: 'uber', name: 'Uber', color: '#276EF1', icon: 'car', initial: 'U' },
      { id: 'otro', name: 'Otro', color: neu.lilac, icon: 'cube', initial: '?' },
    ],
  },
  SV: {
    label: 'El Salvador',
    providers: [
      { id: 'uber_eats', name: 'Uber Eats', color: '#06C167', icon: 'fast-food', initial: 'UE' },
      { id: 'pedidosya', name: 'PedidosYa', color: '#FF0044', icon: 'restaurant', initial: 'PY' },
      { id: 'uber', name: 'Uber', color: '#276EF1', icon: 'car', initial: 'U' },
      { id: 'otro', name: 'Otro', color: neu.lilac, icon: 'cube', initial: '?' },
    ],
  },
  DEFAULT: {
    label: 'International',
    providers: [
      { id: 'uber_eats', name: 'Uber Eats', color: '#06C167', icon: 'fast-food', initial: 'UE' },
      { id: 'uber', name: 'Uber', color: '#276EF1', icon: 'car', initial: 'U' },
      { id: 'delivery', name: 'Delivery', color: '#FF6B00', icon: 'bicycle', initial: 'D' },
      { id: 'otro', name: 'Other', color: neu.lilac, icon: 'cube', initial: '?' },
    ],
  },
};

// Quick access durations
// Hotfix QR: removida la opción de 30 min, agregada la de 3 hrs (más útil
// para residentes que mandan QR a delivery con ventana amplia).
const QUICK_DURATIONS = [
  { value: 60, label: '1 hr' },
  { value: 120, label: '2 hrs' },
  { value: 180, label: '3 hrs' },
];

// Helper moved inside component

const formatTimeForBackend = (date) => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export default function Visits() {
  const font = useHomeFont();
  const { profile, user } = useAuth();
  const userId = user?.id || profile?.id;
  const { t, language } = useTranslation();
  const { userLocations, selectedLocationId, selectedLocation, locationName, hasMultipleLocations, loading: locationLoading } = useUserLocation();
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
  // Pull-to-refresh también recarga "Mis accesos" (QR recibidos)
  const [accessesRefreshKey, setAccessesRefreshKey] = useState(0);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedQR, setSelectedQR] = useState(null);
  const [sharingImage, setSharingImage] = useState(false);
  // Opción A: id del QR pendiente de compartir mientras se abre el modal y se monta cardRef.
  const [pendingShare, setPendingShare] = useState(null);

  // Resident QR TOTP
  const [residentQRData, setResidentQRData] = useState(null);
  const [loadingResidentQR, setLoadingResidentQR] = useState(true);
  const [residentQRDisabled, setResidentQRDisabled] = useState(false); // ✅ Track if feature is disabled
  // Sin casa en la residencial seleccionada: aviso en vez de QR
  const [residentQRNoHome, setResidentQRNoHome] = useState(false);
  // Formulario de QR: teléfono e identificación en una sección plegable (opcionales)
  const [showMoreData, setShowMoreData] = useState(false);
  const [activeTab, setActiveTab] = useState("myqr");

  // Mejora 2: secciones colapsables de codigos por tipo. "single" (Una vez) abierta por defecto.
  // Lista K1: filtro en pastillas (activos, frecuentes, temporales, eventos, historial)
  const [qrFilter, setQrFilter] = useState('active');

  // Mejora 1: acceso directo desde el boton "Nuevo QR" del home.
  // Lee params de navegacion para abrir el tab Visitantes + el modal de crear.
  const { tab: navTab, create: navCreate, type: navType } = useLocalSearchParams();
  const navRouter = useRouter();
  useEffect(() => {
    if (navTab) setActiveTab(String(navTab));
    // Tipo preseleccionado desde la hoja "Nuevo QR" (single | temporary | frequent)
    if (['single', 'temporary', 'frequent'].includes(navType)) setQrType(navType);
    if (navCreate === '1') {
      setShowCreateModal(true);
    }
    // one-shot: limpiar para que tocar dos veces el mismo acceso siempre funcione
    if (navTab || navCreate || navType) {
      navRouter.setParams({ tab: undefined, create: undefined, type: undefined });
    }
  }, [navTab, navCreate, navType]);

  // Al abrir el formulario, la sección "más datos" aparece desplegada si ya trae teléfono o
  // identificación (hoy el formulario siempre abre vacío; queda para un futuro "reutilizar/editar")
  // o si la comunidad exige enviar dentro de ISSY (app_only), donde el teléfono hace falta.
  useEffect(() => {
    if (!showCreateModal) return;
    const hasExtraData = !!visitorPhone.trim() || (!requireVisitorId && !!visitorId.trim());
    setShowMoreData(hasExtraData || sharingMode === 'app_only');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreateModal]);

  const toggleMoreData = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowMoreData((open) => !open);
  };

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
  // Identidad del visitante obligatoria solo si la comunidad tiene require_visitor_id
  const [requireVisitorId, setRequireVisitorId] = useState(false);
  // Cuántos datos opcionales hay escritos dentro de la sección (para "Más datos (N)")
  const extraDataCount = (visitorPhone.trim() ? 1 : 0) + (!requireVisitorId && visitorId.trim() ? 1 : 0);

  // Sugerencias de visitas anteriores bajo "Nombre del visitante"
  const [suggestionPrefs, setSuggestionPrefs] = useState(null);
  // null: sin respuesta del backend (aún no desplegado o falló) → se arman con los QR cargados
  const [remoteSuggestions, setRemoteSuggestions] = useState(null);
  const [nameFocused, setNameFocused] = useState(false);
  // Tras elegir una, la lista no vuelve a abrirse hasta que se escriba otra vez
  const [suggestionPicked, setSuggestionPicked] = useState(false);
  const suggestionsRequestIdRef = useRef(0);

  useEffect(() => {
    if (!showCreateModal) return undefined;
    const requestId = ++suggestionsRequestIdRef.current;
    const isStale = () => requestId !== suggestionsRequestIdRef.current;
    setRemoteSuggestions(null);
    (async () => {
      const prefs = await loadSuggestionPrefs(userId);
      if (isStale()) return;
      setSuggestionPrefs(prefs);
      // Interruptor apagado: no se pide nada
      if (!prefs.enabled) return;
      const result = await getRecentVisitors({ limit: 50, since: prefs.cutoff || undefined });
      if (isStale()) return;
      setRemoteSuggestions(result.success ? result.data : null);
    })();
    return () => {
      suggestionsRequestIdRef.current += 1;
    };
  }, [showCreateModal, userId]);

  const allSuggestions = useMemo(() => {
    if (!suggestionPrefs?.enabled) return [];
    const base = remoteSuggestions ?? buildSuggestionsFromQRs(qrCodes);
    return applySuggestionPrefs(base, suggestionPrefs);
  }, [suggestionPrefs, remoteSuggestions, qrCodes]);

  const visibleSuggestions = useMemo(
    () => (nameFocused && !suggestionPicked ? matchSuggestions(allSuggestions, visitorName) : []),
    [allSuggestions, nameFocused, suggestionPicked, visitorName]
  );

  const handleVisitorNameChange = (text) => {
    setVisitorName(text);
    setSuggestionPicked(false);
  };

  // Llena nombre, teléfono e identidad; con teléfono abre "más datos" (la búsqueda ISSY corre sola)
  const selectSuggestion = (item) => {
    setSuggestionPicked(true);
    setVisitorName(item.name);
    setVisitorPhone(item.phone || '');
    setVisitorId(item.visitor_id || '');
    if (item.phone && !showMoreData) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowMoreData(true);
    }
  };

  const removeSuggestion = async (item) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    // Se oculta al instante; luego se guarda
    const hiddenAt = new Date().toISOString();
    setSuggestionPrefs((prefs) =>
      prefs ? { ...prefs, hidden: { ...prefs.hidden, [normalizeVisitorName(item.name)]: hiddenAt } } : prefs
    );
    const saved = await hideSuggestion(userId, item.name);
    setSuggestionPrefs(saved);
  };

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

  // Al cambiar de residencial: Mi QR se vacía al momento (nunca el QR de la otra) y recarga
  useEffect(() => {
    if (selectedLocationId) {
      setResidentQRData(null);
      setLoadingResidentQR(true);
      loadResidentQRSecret();
    }
  }, [selectedLocationId]);

  // Solo cuenta la respuesta más reciente (al cambiar rápido de residencial)
  const residentQRRequestIdRef = useRef(0);
  const loadResidentQRSecret = async () => {
    if (!selectedLocationId) return;
    const requestId = ++residentQRRequestIdRef.current;
    const isStale = () => requestId !== residentQRRequestIdRef.current;
    setResidentQRDisabled(false); // Reset disabled state
    setResidentQRNoHome(false);
    // Sin casa "con certeza" (cuando /auth/me ya manda unit_number): no se pide el secreto
    const membership = profile?.user_locations?.find((l) => l.location_id === selectedLocationId);
    if (hasKnownNoHome(membership)) {
      setResidentQRData(null);
      setResidentQRNoHome(true);
      setLoadingResidentQR(false);
      return;
    }
    setLoadingResidentQR(true);
    try {
      const result = await getResidentQRSecret(selectedLocationId);
      if (isStale()) return;
      if (result.success) {
        setResidentQRData(result.data);
      } else {
        // Cualquier fallo limpia el QR anterior: nunca se muestra el de otra residencial
        setResidentQRData(null);
        if (result.noHome) {
          setResidentQRNoHome(true);
        } else if (result.error?.includes('no está habilitado') || result.reason === 'FEATURE_DISABLED') {
          // ✅ Feature is disabled by admin
          setResidentQRDisabled(true);
        }
      }
    } catch (error) {
      if (isStale()) return;
      console.error("Error loading resident QR:", error);
    } finally {
      if (!isStale()) setLoadingResidentQR(false);
    }
  };
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Al cambiar de residencial: la lista (y los números de arriba) se vacían al momento y recargan
  useEffect(() => {
    if (selectedLocationId) {
      setQrCodes([]);
      setLoadingQRs(true);
      loadQRCodes();
    }
  }, [selectedLocationId]);

  // Refresh QR list every time user navigates back to this tab
  useFocusEffect(
    useCallback(() => {
      if (selectedLocationId) {
        loadQRCodes();
      }
    }, [selectedLocationId])
  );

  // Load sharing mode for location
  useEffect(() => {
    // cancelled: si la residencial cambia antes de la respuesta, se descarta la anterior
    let cancelled = false;
    if (selectedLocationId) {
      getQRSharingMode(selectedLocationId).then(result => {
        if (cancelled) return;
        if (result.success) setSharingMode(result.mode);
        setRequireVisitorId(result.requireVisitorId === true);
      });
    }
    return () => {
      cancelled = true;
    };
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

  // Solo cuenta la respuesta más reciente (al cambiar rápido de residencial)
  const qrRequestIdRef = useRef(0);
  const loadQRCodes = async () => {
    if (!selectedLocationId) {
      setLoadingQRs(false);
      return;
    }
    const requestId = ++qrRequestIdRef.current;
    const isStale = () => requestId !== qrRequestIdRef.current;
    try {
      // Activos + historial (últimos 30) + último ingreso; un backend viejo ignora los extras
      const result = await getMyQRCodes(selectedLocationId, { includeExpired: true, historyLimit: 30, includeUsage: true });
      if (isStale()) return;
      if (result.success) {
        setQrCodes(result.data || []);
      }
    } catch (error) {
      if (isStale()) return;
      console.error('Error loading QRs:', error);
    } finally {
      if (!isStale()) {
        setLoadingQRs(false);
        setRefreshing(false);
      }
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadQRCodes();
    setAccessesRefreshKey((key) => key + 1);
  }, []);

  const resetForm = () => {
    setQrType('single');
    setSuggestionPicked(false);
    setNameFocused(false);
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

  // Cerrar sin crear: no queda nada escrito a medias
  const closeCreateModal = () => {
    setShowCreateModal(false);
    resetForm();
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
      location_id: selectedLocationId,
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

          // Si hay teléfono válido, abrir WhatsApp con deep link
          if (phoneToSave !== 'N/A' && phoneToSave.length >= 8) {
            const communityName = locationName || 'la residencial';
            // Hotfix QR: si la expiración cae al día siguiente (ej. duration=2h
            // a las 23:00 → expira 01:00 AM mañana), mostrar fecha + hora en
            // el mensaje de WhatsApp para evitar confusión.
            const isNextDay = validUntil.getDate() !== now.getDate();
            const expiryTime = isNextDay
              ? validUntil.toLocaleString('es-HN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })
              : validUntil.toLocaleTimeString('es-HN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                });

            // Formatear teléfono: limpiar y agregar código de país si falta
            let phoneFormatted = phoneToSave.replace(/[\s\-\(\)]/g, '');
            if (!phoneFormatted.startsWith('+')) {
              phoneFormatted = `+504${phoneFormatted}`;
            }

            const driverName = quickDriverName.trim() || 'conductor';
            const qrCode = newQR.qr_code || newQR.id || '';
            const qrViewUrl = `https://api.joinissy.com/api/qr/view/${qrCode}`;
            const mensaje = `Hola ${driverName}, te comparto tu código de acceso para ${communityName}. Código: ${qrCode}. Válido hasta las ${expiryTime}. Muéstralo al guardia o acércalo al lector de la entrada. Ver QR aquí: ${qrViewUrl}`;
            const waUrl = `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(mensaje)}`;

            setTimeout(async () => {
              try {
                const supported = await Linking.canOpenURL(waUrl);
                if (supported) {
                  await Linking.openURL(waUrl);
                } else {
                  // Fallback: Share Sheet genérico si WhatsApp no está instalado
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
                }
              } catch (e) {
                console.log('WhatsApp share failed, trying fallback:', e.message);
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
                } catch (fallbackErr) {
                  console.log('Fallback share also failed:', fallbackErr.message);
                }
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
    if (requireVisitorId && !visitorId.trim()) {
      Alert.alert('Error', t('visits.errors.visitorIdRequired'));
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
      location_id: selectedLocationId,
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
    // Hotfix QR: esperar 150ms para asegurar que el card terminó de renderizar
    // completo antes de capturar. Sin esto, con expiraciones que cruzan al día
    // siguiente (ej. duration=120 a las 23:00) el captureRef agarra un frame
    // incompleto y el PNG resultante es corrupto → Sharing falla con
    // "no se puede adjuntar el objeto".
    await new Promise((resolve) => setTimeout(resolve, 150));

    const uri = await captureRef(cardRef, {
      format: 'png',
      quality: 0.9, // 0.9 en vez de 1: archivos más livianos, más confiables
      result: 'tmpfile',
    });

    // Hotfix QR: verificar que el archivo capturado existe y NO está vacío
    // antes de pasarlo al share. Si el captureRef falló silenciosamente
    // (URI válido pero sin contenido), detectamos el error acá y mostramos
    // un mensaje útil en vez del genérico "no se puede adjuntar el objeto".
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists || fileInfo.size === 0) {
      throw new Error('La captura del QR falló o quedó vacía. Intentá de nuevo.');
    }

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
    // Hotfix QR: log detallado para diagnóstico futuro + mensaje al usuario
    // con el detalle del error en vez del genérico.
    console.error('[handleShareQRImage] Error:', error.message, error);
    Alert.alert(
      'Error al compartir',
      error.message || t('visits.errors.shareError')
    );
  } finally {
    setSharingImage(false);
  }
};

// Opción A — auto-compartir imagen desde una tarjeta:
// abre el modal por detrás, espera a que cardRef se monte, comparte la misma
// imagen que el modal, y luego cierra el modal para volver a la lista.
useEffect(() => {
  if (!showQRModal || !pendingShare) return;
  if (!selectedQR || selectedQR.id !== pendingShare) return;
  const timer = setTimeout(async () => {
    try {
      if (cardRef.current) {
        await handleShareQRImage(selectedQR);
      }
    } finally {
      setPendingShare(null);
      setShowQRModal(false);
    }
  }, 500);
  return () => clearTimeout(timer);
}, [showQRModal, pendingShare, selectedQR]);

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

// Ventana real de INGRESO de un evento. valid_from/valid_until ya vienen
// calculados por el backend desde event_date + start_time/end_time en la zona
// horaria de la comunidad, asi que no hace falta joinear con events.
// No se usan is_24_7 ni access_days: createEvent los deja en false/null, y los
// fallbacks genericos de getTimeText/getActiveDays mentian "Acceso 24/7" y
// "todos los dias" en la tarjeta que termina viendo el invitado.
const getEventEntryWindow = (qr) => {
  if (!qr?.valid_from || !qr?.valid_until) return '';
  const from = new Date(qr.valid_from);
  const until = new Date(qr.valid_until);
  const hhmm = (d) => d.toLocaleTimeString('es-HN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
  // Mismo criterio que el mensaje de WhatsApp de delivery: si el limite de
  // ingreso cae al dia siguiente (evento 21:00 -> 02:00), mostrar la fecha.
  const isNextDay = until.getDate() !== from.getDate();
  return isNextDay
    ? `${hhmm(from)} – ${formatDateShort(until)} ${hhmm(until)}`
    : `${hhmm(from)} – ${hhmm(until)}`;
};

const hostName = profile?.name || 'Residente ISSY';

// Mapa location_id -> membresía, armado con las membresías ya cargadas por
// UserLocationContext. Evita pedir nada extra al backend.
// Sin useMemo a propósito: son 1-3 entradas y este bloque vive después de
// varios early-returns del cuerpo del componente; un hook aquí sería frágil.
const membershipByLocationId = {};
(userLocations || []).forEach(ul => {
  const id = ul.location_id || ul.location?.id || ul.id;
  if (id) membershipByLocationId[id] = ul;
});

// Comunidad y casa de UN QR concreto, resueltas desde su propio location_id.
// Antes se usaba la comunidad *seleccionada* para rotular cualquier QR de la
// lista: un QR grabado en otra comunidad se mostraba con el nombre de la
// comunidad activa (el guardia lo rechazaba con "no válido para esta ubicación").
const getQRCommunityInfo = (qr) => {
  const membership = qr?.location_id ? membershipByLocationId[qr.location_id] : null;

  if (membership) {
    return {
      name: membership.location?.name || membership.name || 'Mi Comunidad',
      houseNumber: membership.house_number || '',
    };
  }

  // Sin QR seleccionado, o QR de una comunidad que ya no está entre las
  // membresías activas (baja de la comunidad o del residente): etiqueta neutra
  // antes que un nombre incorrecto. Nunca se rotula con la comunidad
  // seleccionada: esa suposición es justamente el bug que se corrige acá.
  return { name: 'Comunidad no disponible', houseNumber: '' };
};

const selectedQRCommunity = getQRCommunityInfo(selectedQR);
const communityName = selectedQRCommunity.name;
const houseNumber = selectedQRCommunity.houseNumber;

// Render QR Card - Todo el card es touchable
const renderQRCard = (qr) => {
  const typeColor = TYPE_COLORS[qr.qr_type] || tk.cyan;
  const past = !isQRActive(qr);
  // Estado ("Entró hoy…", "Aún no llega", "Día 3 de 8"…); sin datos, la vigencia de siempre
  const statusLine =
    getMyQRStatusLine(qr, t, language) ||
    (qr.qr_type === 'event'
      ? `${formatDateShort(qr.valid_from)} · ${getEventEntryWindow(qr)}`
      : getCardValidityText(qr));

  // TODO(Tanda 2): los eventos deberían abrir `/event-detail?id=${qr.id}` (lista de invitados);
  // por ahora abren el mismo modal de QR que una visita.
  const openQR = () => {
    setSelectedQR(qr);
    setShowQRModal(true);
  };

  return (
    <PressableScale
      key={qr.id}
      variant="neu"
      style={[styles.k1Card, past && styles.k1CardPast]}
      onPress={openQR}
      scaleTo={0.98}
      accessibilityLabel={`${qr.visitor_name}. ${statusLine}`}
    >
      <View style={styles.k1CardTop}>
        <Text style={[styles.k1Name, font(600)]} maxFontSizeMultiplier={1.2} numberOfLines={1}>{qr.visitor_name}</Text>
        <View style={[styles.k1Chip, neuSurface.sunkenSm]}>
          <Text style={[styles.k1ChipText, { color: typeColor }, font(600)]} maxFontSizeMultiplier={1.2}>
            {t(`home2.receivedQR.types.${qr.qr_type}`, qr.qr_type)}
          </Text>
        </View>
      </View>
      {!!statusLine && (
        <View style={styles.k1StatusRow}>
          <View style={[styles.k1Dot, { backgroundColor: past ? tk.textMuted : typeColor }]} />
          <Text style={[styles.k1Status, font(400)]} maxFontSizeMultiplier={1.2} numberOfLines={2}>{statusLine}</Text>
        </View>
      )}

      {/* Acciones de siempre */}
      <View style={styles.cardActionsRow}>
        <PressableScale variant="neu" neuSmall containerStyle={{ flex: 1 }} style={styles.viewQRButton} onPress={openQR}>
          <Ionicons name="qr-code-outline" size={18} color={COLORS.cyan} />
          <Text style={[styles.viewQRButtonText, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.viewQR')}</Text>
        </PressableScale>

        {/* Share button — comparte la MISMA imagen del QR que el modal (Opción A) */}
        <PressableScale variant="neu"
          containerStyle={{ flex: 1 }}
          style={styles.viewQRButton}
          onPress={() => {
            setSelectedQR(qr);
            setShowQRModal(true);
            setPendingShare(qr.id);
          }}
        >
          <Ionicons name="share-outline" size={18} color={COLORS.cyan} />
          <Text style={[styles.viewQRButtonText, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.shareQR')}</Text>
        </PressableScale>

        <PressableScale variant="neu" style={styles.deleteButton} onPress={(e) => handleDeleteQR(qr, e)}>
          <Ionicons name="trash-outline" size={18} color={COLORS.coral} />
        </PressableScale>
      </View>
    </PressableScale>
  );
};

// Tres números + pastillas + tarjetas del filtro elegido
const renderMyQRList = () => {
  const summary = getMyQRSummary(qrCodes);
  const visible = filterMyQRs(qrCodes, qrFilter);
  const stats = [
    { key: 'active', value: summary.active, label: t('visits.list.statActive', 'QR activos'), color: tk.lime },
    { key: 'today', value: summary.expectedToday, label: t('visits.list.statExpectedToday', 'Esperados hoy'), color: tk.cyan },
    { key: 'week', value: summary.expiringThisWeek, label: t('visits.list.statExpiringWeek', 'Vencen esta semana'), color: tk.amber },
  ];
  return (
    <>
      <View style={styles.k1Stats}>
        {stats.map((stat) => (
          <View key={stat.key} style={styles.k1Stat}>
            <Text style={[styles.k1StatValue, { color: stat.color }, font(600)]} maxFontSizeMultiplier={1.2}>{stat.value}</Text>
            <Text style={[styles.k1StatLabel, font(400)]} maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.k1Pills}
        accessibilityRole="tablist"
      >
        {MY_QR_FILTERS.map((filter) => {
          const selected = filter === qrFilter;
          return (
            <PressableScale
              key={filter}
              variant="neu"
              neuSurface="none"
              style={[styles.k1Pill, selected && styles.k1PillActive]}
              onPress={() => setQrFilter(filter)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.k1PillText, selected && styles.k1PillTextActive, font(selected ? 600 : 500)]} maxFontSizeMultiplier={1.2}>
                {t(`visits.list.filters.${filter}`)}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>

      {visible.length === 0 ? (
        <Text style={[styles.k1Empty, font(400)]} maxFontSizeMultiplier={1.2}>
          {t('visits.list.emptyFilter', 'No hay códigos aquí')}
        </Text>
      ) : (
        visible.map((qr) => renderQRCard(qr))
      )}

      {qrFilter === 'event' && (
        <PressableScale variant="neu" style={styles.qrSectionCreateBtn} onPress={() => navRouter.push('/create-event')}>
          <Ionicons name="add-circle-outline" size={18} color={COLORS.lime} style={{ marginRight: scale(6) }} />
          <Text style={[styles.qrSectionCreateText, font(600)]} maxFontSizeMultiplier={1.2}>
            {t('visits.events.createButton', 'Crear evento')}
          </Text>
        </PressableScale>
      )}
    </>
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
          <Text style={[styles.title, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.title')}</Text>
          {hasMultipleLocations ? (
            <UserLocationSelector style={styles.subtitle} />
          ) : (
            <Text style={[styles.subtitle, font(400)]} maxFontSizeMultiplier={1.2}>{t('visits.subtitle')}</Text>
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

        {/* Sin casa registrada en esta residencial: aviso, ningún QR */}
        {activeTab === 'myqr' && residentQRNoHome && !loadingResidentQR && (
          <View style={styles.disabledQRContainer}>
            <Ionicons name="home-outline" size={scale(48)} color={COLORS.textMuted} />
            <Text style={[styles.disabledQRTitle, { textAlign: 'center' }, font(600)]} maxFontSizeMultiplier={1.2}>
              {t('home2.noHome.title', {
                name: locationName || profile?.user_locations?.find((l) => l.location_id === selectedLocationId)?.name || '',
                defaultValue: 'No tienes una casa registrada en {{name}}',
              })}
            </Text>
            <Text style={[styles.disabledQRText, font(400)]} maxFontSizeMultiplier={1.2}>
              {t('home2.noHome.subtitle', 'Pídele al administrador que registre tu casa')}
            </Text>
          </View>
        )}

        {/* Message when Resident QR is disabled by admin */}
        {activeTab === 'myqr' && residentQRDisabled && !loadingResidentQR && (
          <View style={styles.disabledQRContainer}>
            <Ionicons name="qr-code-outline" size={scale(48)} color={COLORS.textMuted} />
            <Text style={[styles.disabledQRTitle, font(600)]}>{t('visits.residentQrDisabled.title') || 'QR de Residente No Disponible'}</Text>
            <Text style={[styles.disabledQRText, font(400)]}>{t('visits.residentQrDisabled.message') || 'El administrador de tu comunidad ha deshabilitado esta función.'}</Text>
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
                <Text style={[styles.quickAccessTitle, font(600)]} maxFontSizeMultiplier={1.2}>Acceso Rápido</Text>
              </View>
              <Text style={[styles.quickAccessSubtitle, font(400)]} maxFontSizeMultiplier={1.2}>
                Genera un QR rápido para delivery o transporte
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.providersScroll}
                contentContainerStyle={styles.providersRow}
              >
                {deliveryProviders.providers.map((provider) => (
                  <PressableScale variant="neu"
                    key={provider.id}
                    neuSurface="none"
                    scaleTo={0.96}
                    style={styles.providerButton}
                    onPress={() => {
                      setSelectedProvider(provider);
                      setQuickDuration(60);
                      setQuickDriverName('');
                      setQuickDriverPhone('');
                      setShowQuickModal(true);
                    }}
                  >
                    {({ pressed }) => (
                      <>
                        <View style={[styles.providerLogoContainer, pressed && neuSurface.sunkenSm]}>
                          <Ionicons name={provider.icon} size={28} color={provider.color} />
                        </View>
                        <Text style={[styles.providerName, font(600)]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                          {provider.name}
                        </Text>
                      </>
                    )}
                  </PressableScale>
                ))}
              </ScrollView>
            </View>

            {/* Create QR Button */}
            <PressableScale variant="neu"
              neuFill={neu.teal}
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <View style={styles.createButtonGradient}>
                <Ionicons name="add-circle" size={24} color={neu.onAccent} />
                <Text style={[styles.createButtonText, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.createButton')}</Text>
              </View>
            </PressableScale>

            {/* Mis QR (K1): resumen, filtros y tarjetas */}

            {loadingQRs ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.cyan} />
              </View>
            ) : qrCodes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconBox, neuSurface.sunken]}>
                  <Ionicons name="qr-code-outline" size={48} color={COLORS.textMuted} />
                </View>
                <Text style={[styles.emptyText, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.empty.title')}</Text>
                <Text style={[styles.emptySubtext, font(400)]} maxFontSizeMultiplier={1.2}>{t('visits.empty.subtitle')}</Text>
              </View>
            ) : (
              renderMyQRList()
            )}
          </>
        )}

        {/* Tab: Mis Accesos */}
        {activeTab === 'invitations' && (
          <MyAccessesTab refreshKey={accessesRefreshKey} />
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
      onRequestClose={closeCreateModal}
    >
      <View style={styles.modalContainer}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeCreateModal}>
              <Text style={[styles.modalCancel, font(500)]} maxFontSizeMultiplier={1.2}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.newQRCode')}</Text>
            <View style={{ width: scale(60) }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* QR Type Selector */}
            <Text style={[styles.inputLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.qrType')}</Text>
            <View style={styles.typeSelector}>
              {QR_TYPES.map((type) => {
                const isSelected = qrType === type.id;
                return (
                  <PressableScale variant="neu"
                    key={type.id}
                    neuSurface="none"
                    containerStyle={{ flex: 1 }}
                    style={[styles.typeButton, isSelected && styles.typeButtonActive]}
                    onPress={() => setQrType(type.id)}
                  >
                    <Ionicons
                      name={type.icon}
                      size={18}
                      color={isSelected ? neu.teal : type.color}
                      style={{ marginRight: scale(6) }}
                    />
                    <Text style={[
                      styles.typeLabel,
                      isSelected && styles.typeLabelActive
                    , font(isSelected ? 600 : 500)]} maxFontSizeMultiplier={1.2} numberOfLines={1}>
                      {type.label}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>

            {/* Visitor Info */}
            <Text style={[styles.inputLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.visitorName')} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t('visits.visitorNamePlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={visitorName}
              onChangeText={handleVisitorNameChange}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              autoCorrect={false}
              maxFontSizeMultiplier={1.2}
            />
            {/* Visitas anteriores: con 2 letras o más, hasta 6 */}
            <VisitorSuggestions
              items={visibleSuggestions}
              t={t}
              onSelect={selectSuggestion}
              onRemove={removeSuggestion}
            />

            {/* Identificación obligatoria en esta comunidad: siempre visible, fuera de la sección */}
            {requireVisitorId && (
              <>
              <Text style={[styles.inputLabel, font(600)]} maxFontSizeMultiplier={1.2}>
                {t('visits.visitorId')}{requireVisitorId ? ' *' : ''}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('visits.visitorIdPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                value={visitorId}
                onChangeText={setVisitorId}
                maxFontSizeMultiplier={1.2}
              />
              </>
            )}

            {/* Teléfono e identificación (opcionales) en una sección plegable; cerrarla no borra lo escrito */}
            <PressableScale
              style={styles.moreDataButton}
              onPress={toggleMoreData}
              scaleTo={0.98}
              accessibilityState={{ expanded: showMoreData }}
            >
              <View style={styles.moreDataTextWrap}>
                <Text style={[styles.moreDataText, font(600)]} maxFontSizeMultiplier={1.2}>
                  {extraDataCount > 0
                    ? t('visits.moreDataCount', { n: extraDataCount, defaultValue: 'Más datos ({{n}})' })
                    : t('visits.addMoreData', '+ Agregar más datos (opcional)')}
                </Text>
                {/* Qué hay adentro, solo con la sección cerrada */}
                {!showMoreData && (
                  <Text style={[styles.moreDataHint, font(400)]} maxFontSizeMultiplier={1.2}>
                    {requireVisitorId
                      ? t('visits.moreDataHint.phoneOnly', 'Teléfono para enviarlo por ISSY')
                      : t('visits.moreDataHint.full', 'Teléfono para enviarlo por ISSY · Identificación')}
                  </Text>
                )}
              </View>
              <Ionicons name={showMoreData ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} />
            </PressableScale>

            {showMoreData && (
              <>
              <Text style={[styles.inputLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.visitorPhone')}</Text>
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
                  <Text style={[styles.lookupSearching, font(400)]}>Buscando usuario ISSY...</Text>
                </View>
              )}

              {foundUser && !lookupLoading && (
                <View style={styles.foundUserCard}>
                  <View style={styles.foundUserInfo}>
                    <View style={styles.foundUserAvatar}>
                      {foundUser.profile_image ? (
                        <Image source={{ uri: foundUser.profile_image }} style={styles.foundUserAvatarImg} />
                      ) : (
                        <Text style={[styles.foundUserAvatarText, font(600)]}>
                          {foundUser.name?.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.foundUserName, font(600)]}>{foundUser.name}</Text>
                      <Text style={[styles.foundUserUnit, font(400)]}>
                        {foundUser.house_number ? `Casa ${foundUser.house_number}` : 'Usuario ISSY'}
                      </Text>
                    </View>
                    <View style={styles.foundUserBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.teal} />
                      <Text style={[styles.foundUserBadgeText, font(600)]}>ISSY</Text>
                    </View>
                  </View>

                  {/* In-App Toggle */}
                  <PressableScale variant="neu"
                    neuSurface="none"
                    style={[styles.inAppToggle, sendInApp && styles.inAppToggleActive]}
                    onPress={() => setSendInApp(!sendInApp)}
                  >
                    <Ionicons 
                      name={sendInApp ? 'paper-plane' : 'paper-plane-outline'} 
                      size={18} 
                      color={sendInApp ? neu.teal : neu.textLabel} 
                    />
                    <Text style={[styles.inAppToggleText, sendInApp && styles.inAppToggleTextActive, font(sendInApp ? 600 : 500)]}>
                      {sendInApp ? 'Se enviará dentro de ISSY' : 'Enviar dentro de ISSY'}
                    </Text>
                  </PressableScale>
                </View>
              )}

              {/* App-only mode warning */}
              {sharingMode === 'app_only' && !foundUser && visitorPhone.length >= 8 && !lookupLoading && (
                <View style={styles.appOnlyWarning}>
                  <Ionicons name="alert-circle" size={18} color={COLORS.orange} />
                  <Text style={[styles.appOnlyWarningText, font(400)]}>
                    Esta comunidad requiere que los códigos QR se envíen dentro de ISSY. El destinatario debe tener la app instalada.
                  </Text>
                </View>
              )}

              {!requireVisitorId && (
                <>
                <Text style={[styles.inputLabel, font(600)]} maxFontSizeMultiplier={1.2}>
                {t('visits.visitorId')}{requireVisitorId ? ' *' : ''}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('visits.visitorIdPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                value={visitorId}
                onChangeText={setVisitorId}
                maxFontSizeMultiplier={1.2}
              />
                </>
              )}
              </>
            )}

            {/* SINGLE QR OPTIONS */}
            {qrType === 'single' && (
              <>
                <Text style={[styles.inputLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.visitDate')} *</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                  <Text style={[styles.dateInputText, font(400)]} maxFontSizeMultiplier={1.2}>{formatDate(visitDate)}</Text>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>

                <Text style={[styles.inputLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.startTime')}</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowTimePicker(true)}>
                  <Text style={[styles.dateInputText, font(400)]} maxFontSizeMultiplier={1.2}>{formatTime(visitTime)}</Text>
                  <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>

                <Text style={[styles.inputLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.duration')}</Text>
                <View style={styles.durationSelector}>
                  {DURATIONS.map((d) => (
                    <PressableScale variant="neu"
                      key={d.value}
                      neuSurface="none"
                      containerStyle={{ flex: 1 }}
                      style={[styles.durationButton, duration === d.value && styles.durationButtonActive]}
                      onPress={() => setDuration(d.value)}
                    >
                      <Text style={[styles.durationLabel, duration === d.value && styles.durationLabelActive, font(duration === d.value ? 600 : 500)]} maxFontSizeMultiplier={1.2}>
                        {d.label}
                      </Text>
                    </PressableScale>
                  ))}
                </View>
              </>
            )}

            {/* TEMPORARY QR OPTIONS */}
            {qrType === 'temporary' && (
              <>
                <Text style={[styles.inputLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.dateRange')} *</Text>
                <View style={styles.dateRangeRow}>
                  <TouchableOpacity
                    style={[styles.dateInput, { flex: 1, marginRight: scale(8) }]}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Text style={[styles.dateInputText, font(400)]} maxFontSizeMultiplier={1.2}>{formatDate(startDate)}</Text>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dateInput, { flex: 1 }]}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Text style={[styles.dateInputText, font(400)]} maxFontSizeMultiplier={1.2}>{formatDate(endDate)}</Text>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inputLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.accessSchedule')}</Text>
                <TouchableOpacity style={styles.checkboxRow} onPress={() => setAccess247(!access247)}>
                  <View style={[styles.checkbox, access247 && styles.checkboxChecked]}>
                    {access247 && <Ionicons name="checkmark" size={16} color={neu.teal} />}
                  </View>
                  <Text style={[styles.checkboxLabel, font(400)]} maxFontSizeMultiplier={1.2}>{t('visits.access247')}</Text>
                </TouchableOpacity>

                {!access247 && (
                  <View style={styles.dateRangeRow}>
                    <TouchableOpacity
                      style={[styles.dateInput, { flex: 1, marginRight: scale(8) }]}
                      onPress={() => setShowStartTimePicker(true)}
                    >
                      <Text style={[styles.dateInputText, font(400)]} maxFontSizeMultiplier={1.2}>{formatTime(startTime)}</Text>
                      <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dateInput, { flex: 1 }]}
                      onPress={() => setShowEndTimePicker(true)}
                    >
                      <Text style={[styles.dateInputText, font(400)]} maxFontSizeMultiplier={1.2}>{formatTime(endTime)}</Text>
                      <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={[styles.inputLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.accessDays')}</Text>
                <TouchableOpacity style={styles.checkboxRow} onPress={toggleAllDays}>
                  <View style={[styles.checkbox, allDays && styles.checkboxChecked]}>
                    {allDays && <Ionicons name="checkmark" size={16} color={neu.teal} />}
                  </View>
                  <Text style={[styles.checkboxLabel, font(400)]} maxFontSizeMultiplier={1.2}>{t('visits.allDays')}</Text>
                </TouchableOpacity>

                <View style={styles.daysGrid}>
                  {WEEKDAYS.map((day) => (
                    <TouchableOpacity
                      key={day.id}
                      style={styles.dayCheckboxRow}
                      onPress={() => toggleDay(day.id)}
                    >
                      <View style={[styles.checkbox, selectedDays.includes(day.id) && styles.checkboxChecked]}>
                        {selectedDays.includes(day.id) && <Ionicons name="checkmark" size={16} color={neu.teal} />}
                      </View>
                      <Text style={[styles.dayCheckboxLabel, font(400)]} maxFontSizeMultiplier={1.2}>{day.fullLabel}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* FREQUENT/PERMANENT QR OPTIONS */}
            {qrType === 'frequent' && (
              <>
                <Text style={[styles.inputLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.accessSchedule')}</Text>
                <TouchableOpacity style={styles.checkboxRow} onPress={() => setAccess247(!access247)}>
                  <View style={[styles.checkbox, access247 && styles.checkboxChecked]}>
                    {access247 && <Ionicons name="checkmark" size={16} color={neu.teal} />}
                  </View>
                  <Text style={[styles.checkboxLabel, font(400)]} maxFontSizeMultiplier={1.2}>{t('visits.access247')}</Text>
                </TouchableOpacity>

                {!access247 && (
                  <View style={styles.dateRangeRow}>
                    <TouchableOpacity
                      style={[styles.dateInput, { flex: 1, marginRight: scale(8) }]}
                      onPress={() => setShowStartTimePicker(true)}
                    >
                      <Text style={[styles.dateInputText, font(400)]} maxFontSizeMultiplier={1.2}>{formatTime(startTime)}</Text>
                      <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dateInput, { flex: 1 }]}
                      onPress={() => setShowEndTimePicker(true)}
                    >
                      <Text style={[styles.dateInputText, font(400)]} maxFontSizeMultiplier={1.2}>{formatTime(endTime)}</Text>
                      <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={[styles.inputLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.accessDays')}</Text>
                <TouchableOpacity style={styles.checkboxRow} onPress={toggleAllDays}>
                  <View style={[styles.checkbox, allDays && styles.checkboxChecked]}>
                    {allDays && <Ionicons name="checkmark" size={16} color={neu.teal} />}
                  </View>
                  <Text style={[styles.checkboxLabel, font(400)]} maxFontSizeMultiplier={1.2}>{t('visits.allDays')}</Text>
                </TouchableOpacity>

                <View style={styles.daysGrid}>
                  {WEEKDAYS.map((day) => (
                    <TouchableOpacity
                      key={day.id}
                      style={styles.dayCheckboxRow}
                      onPress={() => toggleDay(day.id)}
                    >
                      <View style={[styles.checkbox, selectedDays.includes(day.id) && styles.checkboxChecked]}>
                        {selectedDays.includes(day.id) && <Ionicons name="checkmark" size={16} color={neu.teal} />}
                      </View>
                      <Text style={[styles.dayCheckboxLabel, font(400)]} maxFontSizeMultiplier={1.2}>{day.fullLabel}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <PressableScale variant="neu"
                containerStyle={{ flex: 1 }}
                style={styles.cancelButton}
                onPress={closeCreateModal}
              >
                <Text style={[styles.cancelButtonText, font(600)]} maxFontSizeMultiplier={1.2}>{t('common.cancel')}</Text>
              </PressableScale>
              <PressableScale variant="neu"
                neuFill={neu.teal}
                containerStyle={[{ flex: 1 }, loading && styles.buttonDisabled]}
                style={styles.generateButton}
                onPress={handleCreateQR}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={neu.onAccent} size="small" />
                ) : (
                  <>
                    <Ionicons name="qr-code" size={20} color={neu.onAccent} style={{ marginRight: scale(8) }} />
                    <Text style={[styles.generateButtonText, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.generateQR')}</Text>
                  </>
                )}
              </PressableScale>
            </View>

            <View style={{ height: scale(40) }} />
          </ScrollView>
        </SafeAreaView>

        {/* Date/Time Pickers - wrapped in Modal for iOS */}
        {Platform.OS === 'ios' ? (
          <>
            <Modal visible={showDatePicker} transparent animationType="slide">
              <View style={styles.pickerModalOverlay}>
                <View style={styles.pickerModalContent}>
                  <View style={styles.pickerModalHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={[styles.pickerModalCancel, font(500)]}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={[styles.pickerModalDone, font(600)]}>{t('common.done') || 'Listo'}</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={visitDate}
                    mode="date"
                    display="spinner"
                    minimumDate={new Date()}
                    onChange={(event, date) => {
                      if (date) setVisitDate(date);
                    }}
                  />
                </View>
              </View>
            </Modal>

            <Modal visible={showTimePicker} transparent animationType="slide">
              <View style={styles.pickerModalOverlay}>
                <View style={styles.pickerModalContent}>
                  <View style={styles.pickerModalHeader}>
                    <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                      <Text style={[styles.pickerModalCancel, font(500)]}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                      <Text style={[styles.pickerModalDone, font(600)]}>{t('common.done') || 'Listo'}</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={visitTime}
                    mode="time"
                    display="spinner"
                    onChange={(event, time) => {
                      if (time) setVisitTime(time);
                    }}
                  />
                </View>
              </View>
            </Modal>

            <Modal visible={showStartDatePicker} transparent animationType="slide">
              <View style={styles.pickerModalOverlay}>
                <View style={styles.pickerModalContent}>
                  <View style={styles.pickerModalHeader}>
                    <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                      <Text style={[styles.pickerModalCancel, font(500)]}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                      <Text style={[styles.pickerModalDone, font(600)]}>{t('common.done') || 'Listo'}</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="spinner"
                    minimumDate={new Date()}
                    onChange={(event, date) => {
                      if (date) setStartDate(date);
                    }}
                  />
                </View>
              </View>
            </Modal>

            <Modal visible={showEndDatePicker} transparent animationType="slide">
              <View style={styles.pickerModalOverlay}>
                <View style={styles.pickerModalContent}>
                  <View style={styles.pickerModalHeader}>
                    <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                      <Text style={[styles.pickerModalCancel, font(500)]}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                      <Text style={[styles.pickerModalDone, font(600)]}>{t('common.done') || 'Listo'}</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="spinner"
                    minimumDate={startDate}
                    onChange={(event, date) => {
                      if (date) setEndDate(date);
                    }}
                  />
                </View>
              </View>
            </Modal>

            <Modal visible={showStartTimePicker} transparent animationType="slide">
              <View style={styles.pickerModalOverlay}>
                <View style={styles.pickerModalContent}>
                  <View style={styles.pickerModalHeader}>
                    <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                      <Text style={[styles.pickerModalCancel, font(500)]}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                      <Text style={[styles.pickerModalDone, font(600)]}>{t('common.done') || 'Listo'}</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={startTime}
                    mode="time"
                    display="spinner"
                    onChange={(event, time) => {
                      if (time) setStartTime(time);
                    }}
                  />
                </View>
              </View>
            </Modal>

            <Modal visible={showEndTimePicker} transparent animationType="slide">
              <View style={styles.pickerModalOverlay}>
                <View style={styles.pickerModalContent}>
                  <View style={styles.pickerModalHeader}>
                    <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                      <Text style={[styles.pickerModalCancel, font(500)]}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                      <Text style={[styles.pickerModalDone, font(600)]}>{t('common.done') || 'Listo'}</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={endTime}
                    mode="time"
                    display="spinner"
                    onChange={(event, time) => {
                      if (time) setEndTime(time);
                    }}
                  />
                </View>
              </View>
            </Modal>
          </>
        ) : (
          <>
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
          </>
        )}
      </View>
    </Modal>

    {/* ============================================ */}
    {/* VIEW QR MODAL - Diseño glassmorphism claro */}
    {/* ============================================ */}
    {showQRModal && (
    <Modal
      visible={showQRModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => { setShowQRModal(false); setSelectedQR(null); }}
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
                  <Text style={[styles.shareableVisitorName, font(600)]} maxFontSizeMultiplier={1.2}>{selectedQR.visitor_name}</Text>
                  <Text style={[styles.shareableCommunity, font(600)]} maxFontSizeMultiplier={1.2}>{communityName}</Text>
                  <Text style={[styles.shareableAuthorized, font(500)]} maxFontSizeMultiplier={1.2}>
                    {t('visits.authorizedBy')}: <Text style={[styles.shareableHostName, font(600)]}>{hostName}</Text>
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
                      , font(600)]} maxFontSizeMultiplier={1.2}>
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
                    <Text style={[styles.manualCodeLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.manualCode')}</Text>
                    <Text style={[styles.manualCode, font(600)]} maxFontSizeMultiplier={1.2}>
                      {/* Completo: la garita valida qr_code exacto (.eq), un código recortado no existe */}
                      {(selectedQR.qr_code || selectedQR.id).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.showGuardText, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.showToGuard')}</Text>
                </View>

                {/* Info Cards */}
                {selectedQR.qr_type === 'single' ? (
                  // QR Único: 3 cards
                  <View style={styles.infoCardsRow}>
                    <View style={styles.infoCard}>
                      <View style={styles.infoCardIcon}>
                        <Ionicons name="time-outline" size={16} color={neu.onAccent} />
                      </View>
                      <Text style={[styles.infoCardLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.schedule')}</Text>
                      <Text style={[styles.infoCardValue, font(600)]} maxFontSizeMultiplier={1.2}>{getTimeText(selectedQR)}</Text>
                    </View>
                    <View style={styles.infoCard}>
                      <View style={styles.infoCardIcon}>
                        <Ionicons name="home-outline" size={16} color={neu.onAccent} />
                      </View>
                      <Text style={[styles.infoCardLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.house')}</Text>
                      <Text style={[styles.infoCardValue, font(600)]} maxFontSizeMultiplier={1.2}>{houseNumber}</Text>
                    </View>
                    <View style={styles.infoCard}>
                      <View style={styles.infoCardIcon}>
                        <Ionicons name="calendar-outline" size={16} color={neu.onAccent} />
                      </View>
                      <Text style={[styles.infoCardLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.date')}</Text>
                      <Text style={[styles.infoCardValue, font(600)]} maxFontSizeMultiplier={1.2}>{formatDateShort(selectedQR.valid_from)}</Text>
                    </View>
                  </View>
                ) : selectedQR.qr_type === 'event' ? (
                  // Evento: horario real de ingreso y SIN fila de dias permitidos
                  // (no aplica a un evento de un dia). Rotulo "Ingreso" y no
                  // "Horario": valid_until es la hora limite de ENTRADA, no el fin
                  // del evento (migrations/003: end_time = hora limite de ingreso).
                  <View style={styles.infoCardsRow}>
                    <View style={styles.infoCard}>
                      <View style={styles.infoCardIcon}>
                        <Ionicons name="time-outline" size={16} color={neu.onAccent} />
                      </View>
                      <Text style={[styles.infoCardLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.events.entryLabel', 'Ingreso')}</Text>
                      <Text style={[styles.infoCardValue, font(600)]} maxFontSizeMultiplier={1.2}>{getEventEntryWindow(selectedQR)}</Text>
                    </View>
                    <View style={styles.infoCard}>
                      <View style={styles.infoCardIcon}>
                        <Ionicons name="home-outline" size={16} color={neu.onAccent} />
                      </View>
                      <Text style={[styles.infoCardLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.house')}</Text>
                      <Text style={[styles.infoCardValue, font(600)]} maxFontSizeMultiplier={1.2}>{houseNumber}</Text>
                    </View>
                    <View style={styles.infoCard}>
                      <View style={styles.infoCardIcon}>
                        <Ionicons name="calendar-outline" size={16} color={neu.onAccent} />
                      </View>
                      <Text style={[styles.infoCardLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.date')}</Text>
                      <Text style={[styles.infoCardValue, font(600)]} maxFontSizeMultiplier={1.2}>{formatDateShort(selectedQR.valid_from)}</Text>
                    </View>
                  </View>
                ) : (
                  // QR Temporal/Frecuente: Días + 3 cards
                  <>
                    {/* Fila de días */}
                    <View style={styles.daysRowCard}>
                      <Text style={[styles.daysRowLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.accessDaysLabel')}</Text>
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
                          <Ionicons name="time-outline" size={16} color={neu.onAccent} />
                        </View>
                        <Text style={[styles.infoCardLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.schedule')}</Text>
                        <Text style={[styles.infoCardValue, font(600)]} maxFontSizeMultiplier={1.2}>{getTimeText(selectedQR)}</Text>
                      </View>
                      <View style={styles.infoCard}>
                        <View style={styles.infoCardIcon}>
                          <Ionicons name="home-outline" size={16} color={neu.onAccent} />
                        </View>
                        <Text style={[styles.infoCardLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.house')}</Text>
                        <Text style={[styles.infoCardValue, font(600)]} maxFontSizeMultiplier={1.2}>{houseNumber}</Text>
                      </View>
                      <View style={styles.infoCard}>
                        <View style={styles.infoCardIcon}>
                          <Ionicons name="checkmark-circle-outline" size={16} color={neu.onAccent} />
                        </View>
                        <Text style={[styles.infoCardLabel, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.valid')}</Text>
                        <Text style={[styles.infoCardValue, font(600)]} maxFontSizeMultiplier={1.2}>
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
                  <Text style={[styles.poweredByText, font(500)]} maxFontSizeMultiplier={1.2}>Powered by</Text>
                  <Image
                    source={IssyLogoNegro}
                    style={styles.issyLogoImage}
                    resizeMode="contain"
                  />
                  <Text style={[styles.websiteText, font(500)]} maxFontSizeMultiplier={1.2}>www.joinissy.com</Text>
                </View>
              </View>

              {/* Share Button */}
              <PressableScale variant="neu"
                neuFill={neu.teal}
                containerStyle={sharingImage && styles.buttonDisabled}
                style={styles.shareButtonPrimary}
                onPress={() => handleShareQRImage(selectedQR)}
                disabled={sharingImage}
              >
                {sharingImage ? (
                  <ActivityIndicator color={neu.onAccent} size="small" />
                ) : (
                  <>
                    <Ionicons name="share-outline" size={20} color={neu.onAccent} style={{ marginRight: scale(8) }} />
                    <Text style={[styles.shareButtonPrimaryText, font(600)]} maxFontSizeMultiplier={1.2}>{t('visits.shareQR')}</Text>
                  </>
                )}
              </PressableScale>

              {/* Close Button */}
              <PressableScale variant="neu"
                style={styles.closeModalButton}
                onPress={() => { setShowQRModal(false); setSelectedQR(null); }}
              >
                <Text style={[styles.closeModalButtonText, font(500)]} maxFontSizeMultiplier={1.2}>{t('visits.close')}</Text>
              </PressableScale>
            </>
          )}
        </ScrollView>
      </View>
      </Modal>
    )}
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
              <Text style={[styles.modalCancel, font(500)]} maxFontSizeMultiplier={1.2}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, font(600)]} maxFontSizeMultiplier={1.2}>Acceso Rápido</Text>
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
                  <Text style={[styles.quickProviderName, font(600)]} maxFontSizeMultiplier={1.2}>{selectedProvider.name}</Text>
                  <Text style={[styles.quickProviderDesc, font(400)]} maxFontSizeMultiplier={1.2}>
                    Se generará un QR de uso único para el conductor
                  </Text>
                </View>

                {/* Driver Name (Optional) */}
                <Text style={[styles.inputLabel, font(600)]} maxFontSizeMultiplier={1.2}>Nombre del conductor (opcional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Juan Carlos"
                  placeholderTextColor={COLORS.textMuted}
                  value={quickDriverName}
                  onChangeText={setQuickDriverName}
                  maxFontSizeMultiplier={1.2}
                />

                {/* Driver Phone (Optional - for WhatsApp) */}
                <Text style={[styles.inputLabel, font(600)]} maxFontSizeMultiplier={1.2}>Teléfono del conductor (opcional)</Text>
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
                      <Text style={[styles.whatsappBadgeText, font(600)]} maxFontSizeMultiplier={1.2}>Se compartirá el QR automáticamente</Text>
                    </View>
                  )}
                </View>

                {/* Duration Selector */}
                <Text style={[styles.inputLabel, font(600)]} maxFontSizeMultiplier={1.2}>Tiempo de acceso</Text>
                <View style={styles.durationSelector}>
                  {QUICK_DURATIONS.map((d) => (
                    <PressableScale variant="neu"
                      key={d.value}
                      neuSurface="none"
                      containerStyle={{ flex: 1 }}
                      style={[styles.durationButton, quickDuration === d.value && styles.durationButtonActive]}
                      onPress={() => setQuickDuration(d.value)}
                    >
                      <Text style={[styles.durationLabel, quickDuration === d.value && styles.durationLabelActive, font(quickDuration === d.value ? 600 : 500)]} maxFontSizeMultiplier={1.2}>
                        {d.label}
                      </Text>
                    </PressableScale>
                  ))}
                </View>

                {/* Info Note */}
                <View style={styles.quickInfoNote}>
                  <Ionicons name="information-circle" size={20} color={COLORS.cyan} />
                  <Text style={[styles.quickInfoText, font(400)]} maxFontSizeMultiplier={1.2}>
                    No necesitás guardar el número. Si lo ingresás, al generar el QR se abrirá WhatsApp directo para enviárselo al conductor. El QR expira automáticamente.
                  </Text>
                </View>

                {/* Generate Button */}
                <PressableScale variant="neu"
                  neuFill={selectedProvider.color}
                  containerStyle={generatingQuick && styles.buttonDisabled}
                  style={[styles.quickGenerateButton, { backgroundColor: selectedProvider.color }]}
                  onPress={handleQuickDeliveryQR}
                  disabled={generatingQuick}
                >
                  {generatingQuick ? (
                    <ActivityIndicator color={neu.text} size="small" />
                  ) : (
                    <>
                      <Ionicons name="flash" size={22} color={neu.text} style={{ marginRight: scale(8) }} />
                      <Text style={[styles.quickGenerateText, font(600)]} maxFontSizeMultiplier={1.2}>
                        Generar QR para {selectedProvider.name}
                      </Text>
                    </>
                  )}
                </PressableScale>
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
    fontSize: fs(26),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: fs(14),
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
    fontSize: fs(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: scale(12),
    marginBottom: scale(8),
  },
  disabledQRText: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scale(20),
  },

  // Create Button
  createButton: {
    borderRadius: scale(14),
    overflow: 'hidden',
    marginTop: scale(8),
    ...neuSurface.raised,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(16),
    paddingHorizontal: scale(20),
    backgroundColor: neu.teal,
  },
  createButtonText: {
    color: neu.onAccent,
    fontSize: fs(15),
    fontWeight: '600',
    marginLeft: scale(10),
  },

  // Section Title
  sectionTitle: {
    fontSize: fs(14),
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: scale(24),
    marginBottom: scale(12),
  },
  qrSection: {
    marginBottom: scale(10),
  },
  qrSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: scale(14),
    paddingVertical: scale(14),
    paddingHorizontal: scale(14),
    ...neuSurface.raised,
  },
  qrSectionTitle: {
    flex: 1,
    fontSize: fs(15),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  qrSectionCount: {
    fontSize: fs(13),
    color: COLORS.textSecondary,
    marginRight: scale(8),
  },
  qrSectionSoon: {
    fontSize: fs(12),
    color: COLORS.textMuted,
    marginRight: scale(8),
  },
  qrSectionBody: {
    marginTop: scale(8),
  },
  qrSectionEmpty: {
    fontSize: fs(13),
    color: COLORS.textMuted,
    paddingVertical: scale(16),
    textAlign: 'center',
  },
  qrSectionCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(12),
    paddingVertical: scale(12),
    marginTop: scale(8),
    ...neuSurface.raisedSm,
  },
  qrSectionCreateText: {
    fontSize: fs(14),
    fontWeight: '600',
    color: COLORS.lime,
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
    borderRadius: scale(16),
    ...neuSurface.raised,
  },
  emptyIconBox: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  emptyText: {
    fontSize: fs(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptySubtext: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
    marginTop: scale(8),
  },

  // QR Card
  qrCard: {
    borderRadius: scale(16),
    marginBottom: scale(12),
    overflow: 'hidden',
    ...neuSurface.raised,
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
    ...neuSurface.sunkenSm,
  },
  typeBadgeText: {
    fontSize: fs(10),
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(6),
    ...neuSurface.sunkenSm,
  },
  statusBadgeText: {
    fontSize: fs(10),
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  visitorName: {
    fontSize: fs(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  visitorPhone: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
    marginBottom: scale(4),
  },
  validDate: {
    fontSize: fs(12),
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    borderRadius: scale(10),
    marginRight: scale(10),
    ...neuSurface.raisedSm,
  },
  viewQRButtonText: {
    color: COLORS.cyan,
    fontSize: fs(14),
    fontWeight: '600',
    marginLeft: scale(6),
  },
  deleteButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    ...neuSurface.raisedSm,
  },

  // Modal Container
  modalContainer: {
    flex: 1,
    backgroundColor: neu.bg,
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
    fontSize: fs(16),
    color: COLORS.cyan,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: fs(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: scale(16),
    paddingTop: scale(20),
  },

  // Form Inputs
  moreDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: scale(12),
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    borderRadius: scale(12),
    ...neuSurface.raisedSm,
  },
  // ===== Lista K1 (Mis QR) =====
  k1Stats: {
    flexDirection: 'row',
    gap: scale(spacing.sm),
    marginTop: scale(spacing.md),
    marginBottom: scale(spacing.md),
  },
  k1Stat: {
    flex: 1,
    padding: scale(spacing.md),
    borderRadius: scale(radius.md),
    ...neuSurface.sunken,
  },
  k1StatValue: {
    fontSize: fs(22),
    fontWeight: '600',
  },
  k1StatLabel: {
    fontSize: fs(12),
    color: tk.textSecondary,
    marginTop: scale(2),
  },
  k1Pills: {
    gap: scale(spacing.sm),
    paddingBottom: scale(spacing.md),
  },
  k1Pill: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: radius.pill,
    ...neuSurface.raisedSm,
  },
  k1PillActive: {
    ...neuSurface.sunkenSm,
  },
  k1PillText: {
    fontSize: fs(13),
    fontWeight: '500',
    color: neu.textLabel,
  },
  k1PillTextActive: {
    color: neu.teal,
    fontWeight: '600',
  },
  k1Card: {
    borderRadius: scale(radius.md),
    padding: scale(spacing.lg),
    marginBottom: scale(spacing.md),
    gap: scale(spacing.sm),
    ...neuSurface.raised,
  },
  k1CardPast: {
    opacity: 0.6,
  },
  k1CardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(spacing.sm),
  },
  k1Name: {
    flex: 1,
    fontSize: fs(16),
    fontWeight: '600',
    color: tk.text,
  },
  k1Chip: {
    paddingHorizontal: scale(10),
    borderRadius: radius.pill,
    height: scale(26),
    justifyContent: 'center',
  },
  k1ChipText: {
    fontSize: fs(11),
    fontWeight: '600',
  },
  k1StatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(spacing.sm),
  },
  k1Dot: {
    width: scale(8),
    height: scale(8),
    borderRadius: radius.pill,
  },
  k1Status: {
    flex: 1,
    fontSize: fs(13),
    color: tk.textSecondary,
  },
  k1Empty: {
    fontSize: fs(14),
    color: tk.textSecondary,
    textAlign: 'center',
    paddingVertical: scale(spacing.xl),
  },
  moreDataTextWrap: {
    flex: 1,
  },
  moreDataText: {
    fontSize: fs(14),
    fontWeight: '600',
    color: COLORS.cyan,
  },
  moreDataHint: {
    fontSize: fs(12),
    color: COLORS.textMuted,
    marginTop: scale(2),
  },
  inputLabel: {
    fontSize: fs(13),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: scale(8),
    marginTop: scale(16),
  },
  input: {
    borderRadius: scale(12),
    padding: scale(16),
    fontSize: fs(16),
    color: COLORS.textPrimary,
    ...neuSurface.sunken,
  },
  dateInput: {
    borderRadius: scale(12),
    padding: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...neuSurface.sunken,
  },
  dateInputText: {
    fontSize: fs(16),
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(12),
    paddingHorizontal: scale(8),
    borderRadius: scale(12),
    ...neuSurface.raisedSm,
  },
  typeButtonActive: {
    ...neuSurface.sunkenSm,
  },
  typeLabelActive: {
    color: neu.teal,
    fontWeight: '600',
  },
  typeLabel: {
    fontSize: fs(11),
    fontWeight: '500',
    color: neu.textLabel,
  },

  // Duration Selector
  durationSelector: {
    flexDirection: 'row',
    gap: scale(12),
  },
  durationButton: {
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    borderRadius: scale(12),
    alignItems: 'center',
    ...neuSurface.raisedSm,
  },
  durationButtonActive: {
    ...neuSurface.sunkenSm,
  },
  durationLabel: {
    fontSize: fs(14),
    fontWeight: '500',
    color: neu.textLabel,
  },
  durationLabelActive: {
    color: neu.teal,
    fontWeight: '600',
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
    borderRadius: scale(6),
    marginRight: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    ...neuSurface.sunkenSm,
  },
  checkboxChecked: {

  },
  checkboxLabel: {
    fontSize: fs(16),
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
    fontSize: fs(14),
    color: COLORS.textPrimary,
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    marginTop: scale(24),
    gap: scale(12),
  },
  cancelButton: {
    padding: scale(16),
    borderRadius: scale(12),
    alignItems: 'center',
    ...neuSurface.raisedSm,
  },
  cancelButtonText: {
    fontSize: fs(16),
    fontWeight: '600',
    color: neu.textLabel,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(16),
    borderRadius: scale(12),
    ...neuSurface.raised,
    backgroundColor: neu.teal,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  generateButtonText: {
    color: neu.onAccent,
    fontSize: fs(16),
    fontWeight: '600',
  },

  // QR Modal Overlay
  qrModalOverlay: {
    flex: 1,
    backgroundColor: neu.overlay,
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
    fontSize: fs(32),
    fontWeight: '600',
    color: neu.onAccent,
    marginBottom: scale(6),
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  shareableCommunity: {
    fontSize: fs(17),
    fontWeight: '600',
    color: '#3D5A6C',
    marginBottom: scale(6),
    textAlign: 'center',
  },
  shareableAuthorized: {
    fontSize: fs(13),
    color: neu.textSoft,
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
    backgroundColor: neu.textLabel,
    borderWidth: 1,
    borderColor: neu.textLabel,
  },
  qrTypePillActive: {
    backgroundColor: neu.sunken,
    borderColor: 'rgba(26, 61, 77, 0.3)',
  },
  qrTypePillText: {
    fontSize: fs(13),
    fontWeight: '600',
    color: '#6B8A8A',
  },
  qrTypePillTextActive: {
    color: neu.text,
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
    fontSize: fs(10),
    color: '#8AABAB',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  manualCode: {
    fontSize: fs(13),
    fontWeight: '600',
    color: '#3D5A6C',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  showGuardText: {
    fontSize: fs(13),
    color: neu.textSoft,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Days Row Card
  daysRowCard: {
    backgroundColor: neu.textLabel,
    borderRadius: scale(14),
    paddingVertical: scale(10),
    paddingHorizontal: scale(14),
    marginBottom: scale(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: neu.textLabel,
  },
  daysRowLabel: {
    fontSize: fs(9),
    color: neu.textSoft,
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
    backgroundColor: neu.sunken,
  },
  dayPillText: {
    fontSize: fs(9),
    fontWeight: '600',
    color: '#A0B5B5',
  },
  dayPillTextActive: {
    color: neu.text,
  },

  // Info Cards Row
  infoCardsRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: scale(20),
  },
  infoCard: {
    flex: 1,
    backgroundColor: neu.textLabel,
    borderRadius: scale(16),
    paddingVertical: scale(12),
    paddingHorizontal: scale(8),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: neu.textLabel,
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
    fontSize: fs(9),
    color: neu.textSoft,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: scale(4),
  },
  infoCardValue: {
    fontSize: fs(11),
    fontWeight: '600',
    color: neu.onAccent,
    textAlign: 'center',
    lineHeight: scale(14),
  },

  // Footer
  shareableFooter: {
    alignItems: 'center',
  },
  poweredByText: {
    fontSize: fs(10),
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
    fontSize: fs(10),
    color: '#5A7A7A',
    fontWeight: '500',
  },

  // Share Button
  shareButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(16),
    paddingHorizontal: scale(32),
    borderRadius: scale(14),
    marginTop: scale(20),
    width: scale(300),
    ...neuSurface.raised,
    backgroundColor: neu.teal,
  },
  shareButtonPrimaryText: {
    color: neu.onAccent,
    fontSize: fs(16),
    fontWeight: '600',
  },
  closeModalButton: {
    marginTop: scale(16),
    paddingVertical: scale(12),
    paddingHorizontal: scale(32),
    ...neuSurface.raisedSm,
    borderRadius: scale(14),
  },
  closeModalButtonText: {
    color: COLORS.textPrimary,
    fontSize: fs(16),
    fontWeight: '500',
  },

  // ============ QUICK DELIVERY SECTION ============
  quickAccessSection: {
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
    ...neuSurface.raised,
  },
  quickAccessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(4),
  },
  quickAccessTitle: {
    fontSize: fs(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  quickAccessSubtitle: {
    fontSize: fs(12),
    color: COLORS.textMuted,
    marginBottom: scale(14),
  },
  // Espacio para que la sombra de cada tarjeta no se recorte; los márgenes negativos lo devuelven
  providersScroll: {
    marginHorizontal: -scale(12),
    marginVertical: -scale(12),
  },
  providersRow: {
    flexDirection: 'row',
    gap: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: scale(12),
  },
  providerButton: {
    alignItems: 'center',
    width: scale(72),
    ...neuSurface.raisedSm,
    borderRadius: scale(16),
  },
  providerLogoContainer: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: scale(6),
  },
  providerLogo: {
    width: scale(56),
    height: scale(56),
  },
  providerName: {
    fontSize: fs(11),
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
    fontSize: fs(22),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  quickProviderDesc: {
    fontSize: fs(13),
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: scale(20),
  },
  quickInfoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: scale(14),
    borderRadius: scale(12),
    marginTop: scale(20),
    gap: scale(10),
    ...neuSurface.sunken,
  },
  quickInfoText: {
    flex: 1,
    fontSize: fs(12),
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
    ...neuSurface.raised,
  },
  quickGenerateText: {
    fontSize: fs(16),
    fontWeight: '600',
    color: neu.text,
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
    fontSize: fs(12),
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
    fontSize: fs(12),
    color: COLORS.cyan,
  },
  foundUserCard: {
    borderRadius: scale(12),
    padding: scale(12),
    marginTop: scale(10),
    ...neuSurface.sunken,
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
    fontSize: fs(16),
    fontWeight: '600',
    color: COLORS.teal,
  },
  foundUserName: {
    fontSize: fs(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  foundUserUnit: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
  },
  foundUserBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(8),
    ...neuSurface.sunkenSm,
  },
  foundUserBadgeText: {
    fontSize: fs(11),
    fontWeight: '600',
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
    ...neuSurface.raisedSm,
  },
  inAppToggleActive: {
    ...neuSurface.sunkenSm,
  },
  inAppToggleText: {
    fontSize: fs(13),
    fontWeight: '500',
    color: neu.textLabel,
  },
  inAppToggleTextActive: {
    color: neu.teal,
    fontWeight: '600',
  },
  appOnlyWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(8),
    marginTop: scale(8),
    padding: scale(10),
    borderRadius: scale(10),
    ...neuSurface.sunken,
  },
  appOnlyWarningText: {
    flex: 1,
    fontSize: fs(12),
    color: COLORS.orange,
    lineHeight: scale(17),
  },

  // iOS DateTimePicker Modal styles
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: neu.overlay,
  },
  pickerModalContent: {
    backgroundColor: neu.raised,
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
    borderBottomColor: neu.border,
  },
  pickerModalCancel: {
    fontSize: fs(15),
    color: neu.textLabel,
    fontWeight: '500',
  },
  pickerModalDone: {
    fontSize: fs(15),
    color: neu.teal,
    fontWeight: '600',
  },
});