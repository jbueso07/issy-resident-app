// src/components/home/AllFunctions.js
// ISSY - "Todas las funciones" del Home v2: buscador, tamaño de iconos (guardado) y pellizcar.
// Sin Mis finanzas ni Marketplace (su código sigue en home.js y en sus rutas).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, PanResponder } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../../hooks/useTranslation';
import FunctionGrid, { GRID_SIZES } from './FunctionGrid';
import PressableScale from './PressableScale';
import { colors, radius, spacing, scale, MAX_FONT_SCALE } from '../../theme/tokens';

const ICON_SIZE_KEY = 'home_icon_size';
const DEFAULT_ICON_SIZE = 1;
const MAX_ICON_SIZE = GRID_SIZES.length - 1;
// Cuánto deben abrirse o cerrarse los dedos para cambiar un nivel
const PINCH_OUT_RATIO = 1.25;
const PINCH_IN_RATIO = 0.8;

const clampSize = (value) => Math.min(MAX_ICON_SIZE, Math.max(0, value));

// Tamaño de iconos compartido con AdminPanel; el home puede usar este hook y pasarlo a ambos
export function useHomeIconSize() {
  const [size, setSize] = useState(DEFAULT_ICON_SIZE);

  useEffect(() => {
    AsyncStorage.getItem(ICON_SIZE_KEY)
      .then((raw) => {
        const parsed = Number.parseInt(raw, 10);
        if (!Number.isNaN(parsed)) setSize(clampSize(parsed));
      })
      .catch((error) => console.error('Error reading icon size:', error));
  }, []);

  const updateSize = useCallback((next) => {
    const value = clampSize(next);
    setSize(value);
    AsyncStorage.setItem(ICON_SIZE_KEY, String(value)).catch((error) =>
      console.error('Error saving icon size:', error)
    );
  }, []);

  return [size, updateSize];
}

const normalize = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const distance = (touches) => {
  const [a, b] = touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
};

// Iconos del selector: 9 cuadritos, 4 cuadros y 1 cuadro
const GRID_ICON_CELLS = [3, 2, 1];
function GridSizeIcon({ cells, color }) {
  const viewBox = 18;
  const gap = 2;
  const cell = (viewBox - gap * (cells - 1)) / cells;
  const rects = [];
  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      rects.push(
        <Rect
          key={`${row}-${col}`}
          x={col * (cell + gap)}
          y={row * (cell + gap)}
          width={cell}
          height={cell}
          rx={cells === 1 ? 3 : 1.5}
          fill={color}
        />
      );
    }
  }
  return (
    <Svg width={scale(18)} height={scale(18)} viewBox={`0 0 ${viewBox} ${viewBox}`}>
      {rects}
    </Svg>
  );
}

export default function AllFunctions({ featureFlags = {}, size: sizeProp, onSizeChange }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [ownSize, setOwnSize] = useHomeIconSize();

  // Controlado por el home (size + onSizeChange) o con su propio estado guardado
  const controlled = sizeProp !== undefined;
  const size = controlled ? clampSize(sizeProp) : ownSize;
  const changeSize = useCallback(
    (next) => {
      const value = clampSize(next);
      if (controlled) onSizeChange?.(value);
      else setOwnSize(value);
    },
    [controlled, onSizeChange, setOwnSize]
  );

  const groups = useMemo(() => {
    const list = [
      {
        key: 'access',
        title: t('home2.groups.access', 'Acceso y seguridad'),
        color: colors.teal,
        items: [
          { key: 'myqr', label: t('home2.functions.myQR', 'Mi QR'), icon: 'qr-code-outline', color: colors.cyan, route: '/(tabs)/visits', params: { tab: 'myqr' } },
          { key: 'visitors', label: t('home2.functions.visitors', 'Visitantes'), icon: 'people-outline', color: colors.teal, route: '/(tabs)/visits', params: { tab: 'visitors' } },
          { key: 'invitations', label: t('home2.functions.myAccesses', 'Mis accesos'), icon: 'key-outline', color: colors.lime, route: '/(tabs)/visits', params: { tab: 'invitations' } },
          { key: 'events', label: t('home2.functions.events', 'Eventos'), icon: 'calendar-outline', color: colors.amber, route: '/create-event' },
          { key: 'requests', label: t('home2.functions.requests', 'Solicitudes'), icon: 'hand-left-outline', color: colors.orange, route: '/access-requests-history' },
          { key: 'credentials', label: t('home2.functions.credentials', 'Credenciales'), icon: 'id-card-outline', color: colors.purple, route: '/my-credentials' },
          { key: 'emergency-contacts', label: t('home2.functions.emergencyContacts', 'Contactos de emergencia'), icon: 'call-outline', color: colors.danger, route: '/emergency-contacts' },
          { key: 'my-location', label: t('home2.functions.myLocation', 'Mi ubicación'), icon: 'location-outline', color: colors.coral, route: '/my-home-location' },
        ],
      },
      {
        key: 'community',
        title: t('home2.groups.community', 'Comunidad'),
        color: colors.cyan,
        items: [
          { key: 'announcements', label: t('home2.functions.announcements', 'Anuncios'), icon: 'megaphone-outline', color: colors.cyan, route: '/announcements' },
          { key: 'incidents', label: t('home2.functions.reports', 'Reportes'), icon: 'alert-circle-outline', color: colors.orange, route: '/incidents' },
          { key: 'reservations', label: t('home2.functions.reservations', 'Reservaciones'), icon: 'calendar-number-outline', color: colors.amber, route: '/reservations' },
          { key: 'notifications', label: t('home2.functions.notifications', 'Notificaciones'), icon: 'notifications-outline', color: colors.teal, route: '/notifications' },
        ],
      },
      {
        key: 'payments',
        title: t('home2.groups.paymentsHome', 'Pagos y hogar'),
        color: colors.purple,
        items: [
          { key: 'payments', label: t('home2.functions.payments', 'Pagos'), icon: 'card-outline', color: colors.purple, route: '/(tabs)/payments' },
          { key: 'payment-methods', label: t('home2.functions.paymentMethods', 'Métodos de pago'), icon: 'wallet-outline', color: colors.cyan, route: '/payment-methods' },
          { key: 'my-unit', label: t('home2.functions.myUnit', 'Mi unidad'), icon: 'home-outline', color: colors.teal, route: '/my-unit' },
        ],
      },
    ];

    // Servicios: solo con algo encendido
    const services = [];
    if (featureFlags.airin_restaurants === true) {
      services.push({ key: 'airin', label: t('home2.functions.restaurants', 'Restaurantes'), icon: 'restaurant-outline', color: colors.orange, route: '/airin' });
    }
    if (services.length > 0) {
      list.push({ key: 'services', title: t('home2.groups.services', 'Servicios'), color: colors.orange, items: services });
    }
    return list;
  }, [t, featureFlags]);

  const filteredGroups = useMemo(() => {
    const q = normalize(query);
    if (!q) return groups;
    return groups
      .map((group) =>
        normalize(group.title).includes(q)
          ? group
          : { ...group, items: group.items.filter((item) => normalize(item.label).includes(q)) }
      )
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  // ---------- Pellizcar (2 dedos): abrir sube un nivel, cerrar baja uno, una vez por gesto ----------
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const changeSizeRef = useRef(changeSize);
  changeSizeRef.current = changeSize;
  const pinchRef = useRef({ start: null, done: false });

  const pinchResponder = useMemo(
    () =>
      PanResponder.create({
        // Un dedo nunca se captura: el desplazamiento vertical sigue en el ScrollView
        onStartShouldSetPanResponderCapture: (e) => e.nativeEvent.touches.length === 2,
        onMoveShouldSetPanResponderCapture: (e) => e.nativeEvent.touches.length === 2,
        onPanResponderGrant: () => {
          pinchRef.current = { start: null, done: false };
        },
        onPanResponderMove: (e) => {
          const { touches } = e.nativeEvent;
          if (touches.length !== 2 || pinchRef.current.done) return;
          const current = distance(touches);
          if (!pinchRef.current.start) {
            pinchRef.current.start = current;
            return;
          }
          const ratio = current / pinchRef.current.start;
          if (ratio >= PINCH_OUT_RATIO && sizeRef.current < MAX_ICON_SIZE) {
            pinchRef.current.done = true;
            changeSizeRef.current(sizeRef.current + 1);
          } else if (ratio <= PINCH_IN_RATIO && sizeRef.current > 0) {
            pinchRef.current.done = true;
            changeSizeRef.current(sizeRef.current - 1);
          }
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: () => {
          pinchRef.current = { start: null, done: false };
        },
        onPanResponderTerminate: () => {
          pinchRef.current = { start: null, done: false };
        },
      }),
    []
  );

  const sizeLabels = [
    t('home2.iconSizeSmall', 'Iconos pequeños'),
    t('home2.iconSizeMedium', 'Iconos medianos'),
    t('home2.iconSizeLarge', 'Iconos grandes'),
  ];

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.search}>
          <Ionicons name="search" size={scale(18)} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('home2.searchFunction', 'Buscar función')}
            placeholderTextColor={colors.textMuted}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel={t('home2.searchFunction', 'Buscar función')}
          />
          {query.length > 0 && (
            <PressableScale onPress={() => setQuery('')} hitSlop={10} accessibilityLabel={t('common.close')}>
              <Ionicons name="close-circle" size={scale(18)} color={colors.textMuted} />
            </PressableScale>
          )}
        </View>

        <View style={styles.sizeSelector} accessibilityRole="radiogroup">
          {GRID_ICON_CELLS.map((cells, index) => {
            const isActive = index === size;
            return (
              <PressableScale
                key={cells}
                style={[styles.sizeButton, isActive && styles.sizeButtonActive]}
                onPress={() => changeSize(index)}
                accessibilityRole="radio"
                accessibilityLabel={sizeLabels[index]}
                accessibilityState={{ selected: isActive }}
              >
                <GridSizeIcon cells={cells} color={isActive ? colors.textDark : colors.textSecondary} />
              </PressableScale>
            );
          })}
        </View>
      </View>

      <View {...pinchResponder.panHandlers}>
        {filteredGroups.length > 0 ? (
          <FunctionGrid groups={filteredGroups} size={size} />
        ) : (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={scale(26)} color={colors.textMuted} />
            <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {t('home2.noFunctionResults', 'No encontramos esa función')}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.hint} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {t('home2.profileHint', 'Perfil, soporte e idioma están en la pestaña Perfil')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: scale(spacing.lg),
    gap: scale(spacing.md),
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(spacing.sm),
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(spacing.sm),
    minHeight: scale(44),
    paddingHorizontal: scale(spacing.md),
    borderRadius: scale(radius.md),
    backgroundColor: colors.card,
  },
  searchInput: {
    flex: 1,
    fontSize: scale(14),
    color: colors.text,
    paddingVertical: scale(spacing.sm),
  },
  sizeSelector: {
    flexDirection: 'row',
    padding: scale(3),
    borderRadius: scale(radius.md),
    backgroundColor: colors.card,
  },
  sizeButton: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(radius.sm),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeButtonActive: {
    backgroundColor: colors.cyan,
  },
  empty: {
    alignItems: 'center',
    gap: scale(spacing.sm),
    paddingVertical: scale(spacing.xl),
    borderRadius: scale(radius.lg),
    backgroundColor: colors.card,
  },
  emptyText: {
    fontSize: scale(14),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  hint: {
    fontSize: scale(12),
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: scale(spacing.xs),
  },
});
