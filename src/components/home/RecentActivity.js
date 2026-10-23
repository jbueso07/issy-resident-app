// src/components/home/RecentActivity.js
// ISSY - Actividades recientes del Home v2, construidas con GET /notifications.
// - Quita duplicados (el backend guarda algunos tipos dos veces).
// - Ocultar es solo en este teléfono (AsyncStorage `hidden_activity_<userId>`).
// - Una notificación sin leer se marca leída tras 2,5 s visible en pantalla (una sola vez).
// GET /notifications no filtra por residencial: se muestran todas (filtro por residencial = Etapa 2).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  AppState,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { authFetch } from '../../services/api';
import { sendTokenToBackend } from '../../hooks/useNotifications';
import { getNotificationGroup, getNotificationRoute } from '../../utils/notificationRoute';
import PressableScale from './PressableScale';
import { colors, radius, spacing, scale, MAX_FONT_SCALE } from '../../theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PAGE_LIMIT = 30;
const READ_AFTER_MS = 2500;
const VISIBILITY_TICK_MS = 500;
const UNDO_MS = 5000;
const MAX_STORED_HIDDEN = 500;
const HIDE_ACTION_WIDTH = scale(92);
// Alto de la barra de pestañas que flota sobre el contenido (sin el área segura)
const TAB_BAR_OVERLAP = scale(110);

const GROUP_COLORS = {
  visit: colors.teal,
  report: colors.orange,
  announcement: colors.cyan,
  reservation: colors.amber,
  payment: colors.purple,
  emergency: colors.danger,
  account: colors.textSecondary,
};

const LOCALES = { es: 'es-HN', en: 'en-US', fr: 'fr-FR', pt: 'pt-BR' };

// Mismo type + title + minuto de created_at = un solo elemento (conserva todos los ids)
const dedupe = (list) => {
  const byKey = new Map();
  list.forEach((n) => {
    const minute = Math.floor(new Date(n.created_at).getTime() / 60000);
    const key = `${n.type}|${n.title}|${minute}`;
    const kept = byKey.get(key);
    if (kept) {
      kept.ids.push(String(n.id));
      if (n.read === false) kept.read = false;
    } else {
      byKey.set(key, { ...n, key: String(n.id), ids: [String(n.id)] });
    }
  });
  return Array.from(byKey.values());
};

// ============ FILA DESLIZABLE ============
function ActivityRow({ item, route, timeLabel, groupLabel, hideLabel, swipeHint, onPress, onHide, registerNode }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const offsetRef = useRef(0);
  const [open, setOpen] = useState(false);

  const animateTo = useCallback(
    (toValue) => {
      offsetRef.current = toValue;
      setOpen(toValue !== 0);
      Animated.spring(translateX, { toValue, friction: 9, tension: 80, useNativeDriver: true }).start();
    },
    [translateX]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Solo gestos claramente horizontales; el desplazamiento vertical sigue en el ScrollView
        onMoveShouldSetPanResponderCapture: (_, g) =>
          Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => {
          const x = Math.min(0, Math.max(-HIDE_ACTION_WIDTH * 1.2, offsetRef.current + g.dx));
          translateX.setValue(x);
        },
        onPanResponderRelease: (_, g) => {
          const x = offsetRef.current + g.dx;
          animateTo(x < -HIDE_ACTION_WIDTH / 2 || g.vx < -0.5 ? -HIDE_ACTION_WIDTH : 0);
        },
        onPanResponderTerminate: () => animateTo(offsetRef.current),
      }),
    [animateTo, translateX]
  );

  // El botón Ocultar no se ve hasta deslizar
  const actionOpacity = translateX.interpolate({
    inputRange: [-HIDE_ACTION_WIDTH, -HIDE_ACTION_WIDTH * 0.3, 0],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  });

  const color = GROUP_COLORS[getNotificationGroup(item.type)];
  const isUnread = item.read === false;

  const handlePress = () => {
    if (open) {
      animateTo(0);
      return;
    }
    onPress?.();
  };

  const handleHide = () => {
    animateTo(0);
    onHide();
  };

  return (
    <View ref={registerNode} collapsable={false} style={styles.rowWrap}>
      <Animated.View style={[styles.hideAction, { opacity: actionOpacity }]}>
        <PressableScale style={styles.hideButton} onPress={handleHide} accessibilityLabel={hideLabel}>
          <Ionicons name="eye-off-outline" size={scale(20)} color={colors.text} />
          <Text style={styles.hideText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {hideLabel}
          </Text>
        </PressableScale>
      </Animated.View>

      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <PressableScale
          style={styles.row}
          onPress={handlePress}
          disabled={!route && !open}
          scaleTo={0.98}
          accessibilityLabel={`${groupLabel}. ${item.title || ''}. ${item.message || ''}. ${timeLabel}`}
          accessibilityHint={swipeHint}
          accessibilityActions={[{ name: 'hide', label: hideLabel }]}
          onAccessibilityAction={(e) => e.nativeEvent.actionName === 'hide' && onHide()}
        >
          <View style={styles.rowHeader}>
            {isUnread && <View style={[styles.unreadDot, { backgroundColor: color }]} />}
            <Text style={[styles.group, { color }]} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>
              {groupLabel}
            </Text>
            <Text style={styles.time} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>
              {timeLabel}
            </Text>
          </View>
          <View style={styles.rowBody}>
            <View style={styles.rowText}>
              <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>
                {item.title}
              </Text>
              {!!item.message && (
                <Text style={styles.message} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>
                  {item.message}
                </Text>
              )}
            </View>
            {route && <Ionicons name="chevron-forward" size={scale(18)} color={colors.textMuted} />}
          </View>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

// ============ COMPONENTE PRINCIPAL ============
export default function RecentActivity({ isAdmin = false, onLoaded, refreshKey }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id;
  const storageKey = userId ? `hidden_activity_${userId}` : null;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [hiddenLoaded, setHiddenLoaded] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [lastHidden, setLastHidden] = useState(null);
  const [focused, setFocused] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [permission, setPermission] = useState(null);

  const rowNodes = useRef(new Map());
  const seenRef = useRef(new Map());
  const markedRef = useRef(new Set());
  const undoTimerRef = useRef(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  // ---------- Carga ----------
  const load = useCallback(async () => {
    try {
      const res = await authFetch(`/notifications?page=1&limit=${PAGE_LIMIT}`);
      setItems(dedupe(Array.isArray(res?.data) ? res.data : []));
      setLoadError(false);
    } catch (error) {
      console.error('Error loading recent activity:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkPermission = useCallback(async () => {
    try {
      const { status, canAskAgain } = await Notifications.getPermissionsAsync();
      setPermission({ granted: status === 'granted', canAskAgain });
    } catch (error) {
      setPermission(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      load();
      checkPermission();
      return () => setFocused(false);
    }, [load, checkPermission])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
      // Al volver de los ajustes del teléfono, revisar de nuevo el permiso
      if (state === 'active') checkPermission();
    });
    return () => sub.remove();
  }, [checkPermission]);

  useEffect(() => () => clearTimeout(undoTimerRef.current), []);

  // "Jalar para actualizar" del home: recargar cuando cambie refreshKey (no al montar; eso ya lo hace el foco)
  const refreshKeyRef = useRef(refreshKey);
  useEffect(() => {
    if (refreshKeyRef.current === refreshKey) return;
    refreshKeyRef.current = refreshKey;
    load();
  }, [refreshKey, load]);

  // ---------- Ocultas (solo este teléfono) ----------
  useEffect(() => {
    let cancelled = false;
    setHiddenLoaded(false);
    (async () => {
      let stored = [];
      if (storageKey) {
        try {
          const raw = await AsyncStorage.getItem(storageKey);
          const parsed = raw ? JSON.parse(raw) : [];
          stored = Array.isArray(parsed) ? parsed.map(String) : [];
        } catch (error) {
          console.error('Error reading hidden activity:', error);
        }
      }
      if (!cancelled) {
        setHiddenIds(stored);
        setHiddenLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const persistHidden = useCallback(
    (next) => {
      const trimmed = next.slice(-MAX_STORED_HIDDEN);
      setHiddenIds(trimmed);
      if (!storageKey) return;
      AsyncStorage.setItem(storageKey, JSON.stringify(trimmed)).catch((error) =>
        console.error('Error saving hidden activity:', error)
      );
    },
    [storageKey]
  );

  const hiddenSet = useMemo(() => new Set(hiddenIds), [hiddenIds]);
  const isHidden = useCallback((item) => item.ids.some((id) => hiddenSet.has(id)), [hiddenSet]);
  const visibleItems = useMemo(() => items.filter((item) => !isHidden(item)), [items, isHidden]);
  const hiddenItems = useMemo(() => items.filter(isHidden), [items, isHidden]);

  const hideItem = (item) => {
    persistHidden([...hiddenIds.filter((id) => !item.ids.includes(id)), ...item.ids]);
    setLastHidden(item);
    clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setLastHidden(null), UNDO_MS);
  };

  const unhideItem = (item) => {
    persistHidden(hiddenIds.filter((id) => !item.ids.includes(id)));
  };

  const handleUndo = () => {
    if (!lastHidden) return;
    unhideItem(lastHidden);
    clearTimeout(undoTimerRef.current);
    setLastHidden(null);
  };

  useEffect(() => {
    if (hiddenItems.length === 0) setShowHidden(false);
  }, [hiddenItems.length]);

  // El home decide con qué sección arrancar (failed: la carga falló y no hay nada que mostrar)
  useEffect(() => {
    if (!loading && hiddenLoaded) {
      onLoadedRef.current?.(visibleItems.length, { failed: loadError && items.length === 0 });
    }
  }, [loading, hiddenLoaded, visibleItems.length, loadError, items.length]);

  // ---------- Marcar leídas al verlas 2,5 s ----------
  const markRead = useCallback((item) => {
    const ids = item.ids.filter((id) => !markedRef.current.has(id));
    if (ids.length === 0) return;
    ids.forEach((id) => markedRef.current.add(id));
    setItems((prev) => prev.map((i) => (i.key === item.key ? { ...i, read: true } : i)));
    ids.forEach((id) =>
      authFetch(`/notifications/${id}/read`, { method: 'PATCH' }).catch((error) =>
        console.error('Error marking activity as read:', error)
      )
    );
  }, []);

  useEffect(() => {
    const pending = visibleItems.filter(
      (item) => item.read === false && item.ids.some((id) => !markedRef.current.has(id))
    );
    if (!focused || !appActive || pending.length === 0) return undefined;

    const timer = setInterval(() => {
      const now = Date.now();
      // Lo que queda detrás de la barra de abajo no cuenta como visto
      const visibleBottom = Dimensions.get('window').height - TAB_BAR_OVERLAP - insets.bottom;
      pending.forEach((item) => {
        const node = rowNodes.current.get(item.key);
        if (!node) return;
        node.measureInWindow((x, y, width, height) => {
          const centerY = y + height / 2;
          const centerX = x + width / 2;
          const onScreen =
            height > 0 && centerY > 0 && centerY < visibleBottom && centerX > 0 && centerX < SCREEN_WIDTH;
          const seen = seenRef.current.get(item.key);
          if (!onScreen) {
            seenRef.current.delete(item.key);
            return;
          }
          // Si hubo una pausa (otra pantalla, app en segundo plano), el conteo empieza de nuevo
          const since = seen && now - seen.last <= VISIBILITY_TICK_MS * 3 ? seen.since : now;
          seenRef.current.set(item.key, { since, last: now });
          if (now - since >= READ_AFTER_MS) markRead(item);
        });
      });
    }, VISIBILITY_TICK_MS);

    return () => clearInterval(timer);
  }, [focused, appActive, visibleItems, markRead, insets.bottom]);

  // ---------- Permiso de notificaciones ----------
  const registerPushToken = async () => {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) return;
      const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
      if (pushToken) await sendTokenToBackend(pushToken);
    } catch (error) {
      console.error('Error registering push token from home:', error);
    }
  };

  const handleEnableNotifications = async () => {
    if (permission?.canAskAgain === false) {
      Linking.openSettings();
      return;
    }
    try {
      const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
      setPermission({ granted: status === 'granted', canAskAgain });
      // Sin esto el token no llega al backend hasta el siguiente arranque de la app
      if (status === 'granted') registerPushToken();
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  // ---------- Textos ----------
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return t('notifications.time.now');
    if (diffMins < 60) return t('notifications.time.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('notifications.time.hoursAgo', { count: diffHours });
    if (diffDays === 1) return t('notifications.time.yesterday');
    if (diffDays < 7) return t('notifications.time.daysAgo', { count: diffDays });
    return date.toLocaleDateString(LOCALES[language] || LOCALES.es, { day: 'numeric', month: 'short' });
  };

  const groupLabel = (type) => {
    const group = getNotificationGroup(type);
    return t(`home2.activityGroups.${group}`);
  };

  const hideLabel = t('home2.hide', 'Ocultar');
  const swipeHint = t('home2.swipeToHide', 'Desliza a la izquierda para ocultar');

  const openItem = (route) => {
    if (route) router.push(route);
  };

  // ---------- Render ----------
  const renderEmpty = () => (
    <View style={styles.card}>
      <Ionicons name="time-outline" size={scale(28)} color={colors.textMuted} />
      <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {t('home2.emptyTitle', 'Aún no tienes actividad')}
      </Text>
      <Text style={styles.cardText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {t('home2.emptySub', 'Aquí verás tus visitas, pagos y avisos.')}
      </Text>
      {permission && !permission.granted && (
        <View style={styles.permissionBlock}>
          <Text style={styles.cardText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {t('home2.enableNotifs', 'Activa las notificaciones para saber cuándo llega tu visita')}
          </Text>
          <PressableScale style={styles.primaryButton} onPress={handleEnableNotifications}>
            <Text style={styles.primaryButtonText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {permission.canAskAgain === false
                ? t('home2.openSettingsCta', 'Abrir ajustes')
                : t('home2.enableNotifsCta', 'Activar notificaciones')}
            </Text>
          </PressableScale>
        </View>
      )}
    </View>
  );

  const renderError = () => (
    <View style={styles.card}>
      <Ionicons name="cloud-offline-outline" size={scale(28)} color={colors.textMuted} />
      <Text style={styles.cardTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {t('home2.loadError', 'No pudimos cargar tu actividad')}
      </Text>
      <PressableScale
        style={styles.primaryButton}
        onPress={() => {
          setLoading(true);
          load();
        }}
      >
        <Text style={styles.primaryButtonText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {t('common.retry')}
        </Text>
      </PressableScale>
    </View>
  );

  const renderBody = () => {
    if (loading && items.length === 0) {
      return (
        <View style={styles.card}>
          <ActivityIndicator color={colors.cyan} />
        </View>
      );
    }
    if (loadError && items.length === 0) return renderError();
    if (visibleItems.length === 0) return renderEmpty();
    return (
      <View style={styles.list}>
        {visibleItems.map((item) => {
          const route = getNotificationRoute(item, { isAdmin });
          return (
            <ActivityRow
              key={item.key}
              item={item}
              route={route}
              timeLabel={formatTime(item.created_at)}
              groupLabel={groupLabel(item.type)}
              hideLabel={hideLabel}
              swipeHint={swipeHint}
              onPress={() => openItem(route)}
              onHide={() => hideItem(item)}
              registerNode={(node) => {
                if (node) rowNodes.current.set(item.key, node);
                else rowNodes.current.delete(item.key);
              }}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {lastHidden && (
        <View style={styles.undoBar} accessibilityLiveRegion="polite">
          <View style={styles.undoText}>
            <Text style={styles.undoTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {t('home2.hiddenForYou', 'Oculto solo para ti')}
            </Text>
            <Text style={styles.undoSub} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {t('home2.hiddenForYouSub', 'Sigue en Notificaciones')}
            </Text>
          </View>
          <PressableScale style={styles.undoButton} onPress={handleUndo} hitSlop={8}>
            <Text style={styles.undoButtonText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {t('home2.undo', 'Deshacer')}
            </Text>
          </PressableScale>
        </View>
      )}

      {renderBody()}

      {hiddenItems.length > 0 && (
        <PressableScale
          style={styles.showHiddenButton}
          onPress={() => setShowHidden((prev) => !prev)}
          hitSlop={8}
          accessibilityState={{ expanded: showHidden }}
        >
          <Text style={styles.showHiddenText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {showHidden
              ? t('home2.closeHidden', 'Cerrar ocultas')
              : t('home2.showHidden', { n: hiddenItems.length, defaultValue: 'Ver ocultas ({{n}})' })}
          </Text>
        </PressableScale>
      )}

      {showHidden && (
        <View style={styles.list}>
          {hiddenItems.map((item) => (
            <View key={item.key} style={[styles.row, styles.hiddenRow]}>
              <View style={styles.rowText}>
                <Text
                  style={[styles.group, { color: GROUP_COLORS[getNotificationGroup(item.type)] }]}
                  maxFontSizeMultiplier={MAX_FONT_SCALE}
                  numberOfLines={1}
                >
                  {groupLabel(item.type)}
                </Text>
                <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
              <PressableScale style={styles.unhideButton} onPress={() => unhideItem(item)}>
                <Text style={styles.unhideText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {t('home2.unhide', 'Mostrar')}
                </Text>
              </PressableScale>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: scale(spacing.lg),
  },
  list: {
    gap: scale(spacing.sm),
  },
  rowWrap: {
    borderRadius: scale(radius.md),
    overflow: 'hidden',
  },
  row: {
    backgroundColor: colors.card,
    borderRadius: scale(radius.md),
    paddingVertical: scale(spacing.md),
    paddingHorizontal: scale(spacing.lg),
    gap: scale(spacing.xs),
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  unreadDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: radius.pill,
  },
  group: {
    flex: 1,
    fontSize: scale(11),
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  time: {
    fontSize: scale(12),
    color: colors.textMuted,
  },
  rowBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(spacing.sm),
  },
  rowText: {
    flex: 1,
  },
  title: {
    fontSize: scale(15),
    fontWeight: '600',
    color: colors.text,
  },
  message: {
    fontSize: scale(13),
    color: colors.textSecondary,
    marginTop: scale(2),
  },
  hideAction: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: colors.well,
    borderRadius: scale(radius.md),
  },
  hideButton: {
    width: HIDE_ACTION_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(2),
  },
  hideText: {
    fontSize: scale(12),
    fontWeight: '600',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: scale(radius.lg),
    padding: scale(spacing.xl),
    alignItems: 'center',
    gap: scale(spacing.sm),
  },
  cardTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  cardText: {
    fontSize: scale(13),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  permissionBlock: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: scale(spacing.md),
    marginTop: scale(spacing.sm),
    paddingTop: scale(spacing.md),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryButton: {
    paddingHorizontal: scale(spacing.xl),
    paddingVertical: scale(spacing.md),
    borderRadius: radius.pill,
    backgroundColor: colors.cyan,
  },
  primaryButtonText: {
    fontSize: scale(14),
    fontWeight: '700',
    color: colors.textDark,
    textAlign: 'center',
  },
  undoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(spacing.md),
    marginBottom: scale(spacing.sm),
    paddingVertical: scale(spacing.md),
    paddingHorizontal: scale(spacing.lg),
    borderRadius: scale(radius.md),
    backgroundColor: colors.well,
    borderWidth: 1,
    borderColor: colors.border,
  },
  undoText: {
    flex: 1,
  },
  undoTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: colors.text,
  },
  undoSub: {
    fontSize: scale(12),
    color: colors.textSecondary,
    marginTop: scale(2),
  },
  undoButton: {
    paddingHorizontal: scale(spacing.md),
    paddingVertical: scale(spacing.sm),
  },
  undoButtonText: {
    fontSize: scale(14),
    fontWeight: '700',
    color: colors.cyan,
  },
  showHiddenButton: {
    alignSelf: 'center',
    marginTop: scale(spacing.md),
    paddingHorizontal: scale(spacing.md),
    paddingVertical: scale(spacing.sm),
  },
  showHiddenText: {
    fontSize: scale(13),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  hiddenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(spacing.md),
    opacity: 0.6,
  },
  unhideButton: {
    paddingHorizontal: scale(spacing.md),
    paddingVertical: scale(spacing.sm),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unhideText: {
    fontSize: scale(13),
    fontWeight: '600',
    color: colors.text,
  },
});
