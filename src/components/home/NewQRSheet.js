// src/components/home/NewQRSheet.js
// ISSY - Hoja "Nuevo QR" que sale del botón + de la barra.
// Una vez / Frecuente / Temporal abren Visitas con el modal de crear y el tipo preseleccionado;
// Evento abre /create-event. Se cierra con el fondo, al elegir o con el botón atrás de Android.

import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Animated, Pressable, Dimensions, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../../hooks/useTranslation';
import PressableScale from './PressableScale';
import { colors, radius, spacing, scale, MAX_FONT_SCALE } from '../../theme/tokens';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function NewQRSheet({ visible, onClose, locationName }) {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  // Se mantiene montado mientras corre la animación de salida
  const [mounted, setMounted] = useState(visible);
  const pendingRouteRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.setValue(0);
      Animated.spring(progress, { toValue: 1, friction: 9, tension: 70, useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(progress, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setMounted(false);
        const route = pendingRouteRef.current;
        pendingRouteRef.current = null;
        if (route) router.push(route);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const OPTIONS = [
    {
      key: 'single',
      icon: 'flash-outline',
      color: colors.coral,
      label: t('home2.newQR.types.single', 'Una vez'),
      description: t('home2.newQR.typesDesc.single', 'Para una visita de un solo día'),
      route: { pathname: '/(tabs)/visits', params: { tab: 'visitors', create: '1', type: 'single' } },
    },
    {
      key: 'frequent',
      icon: 'infinite-outline',
      color: colors.lime,
      label: t('home2.newQR.types.frequent', 'Frecuente'),
      description: t('home2.newQR.typesDesc.frequent', 'Para quien viene seguido, en días fijos'),
      route: { pathname: '/(tabs)/visits', params: { tab: 'visitors', create: '1', type: 'frequent' } },
    },
    {
      key: 'temporary',
      icon: 'calendar-outline',
      color: colors.purple,
      label: t('home2.newQR.types.temporary', 'Temporal'),
      description: t('home2.newQR.typesDesc.temporary', 'Válido entre dos fechas'),
      route: { pathname: '/(tabs)/visits', params: { tab: 'visitors', create: '1', type: 'temporary' } },
    },
    {
      key: 'event',
      icon: 'people-outline',
      color: colors.amber,
      label: t('home2.newQR.types.event', 'Evento'),
      description: t('home2.newQR.typesDesc.event', 'Un QR para varios invitados'),
      route: '/create-event',
    },
  ];

  const handleSelect = (option) => {
    // Navegar cuando la hoja termina de cerrarse, para que no quede encima de la pantalla nueva
    pendingRouteRef.current = option.route;
    onClose?.();
  };

  if (!mounted) return null;

  const backdropStyle = { opacity: progress };
  const sheetStyle = {
    transform: [
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT * 0.5, 0] }) },
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
    ],
    opacity: progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { paddingBottom: insets.bottom + scale(spacing.lg) }, sheetStyle]}
          accessibilityViewIsModal
        >
          <View style={styles.handle} />
          <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {t('home2.newQR.title', 'Nuevo QR')}
          </Text>
          {!!locationName && (
            <Text style={styles.subtitle} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={2}>
              {t('home2.newQR.forLocation', { name: locationName, defaultValue: 'Para {{name}}' })}
            </Text>
          )}

          <View style={styles.options}>
            {OPTIONS.map((option) => (
              <PressableScale
                key={option.key}
                style={styles.option}
                onPress={() => handleSelect(option)}
                accessibilityLabel={`${option.label}. ${option.description}`}
              >
                <View style={[styles.optionIcon, { backgroundColor: `${option.color}26` }]}>
                  <Ionicons name={option.icon} size={scale(22)} color={option.color} />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    {option.label}
                  </Text>
                  <Text style={styles.optionDescription} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    {option.description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={scale(18)} color={colors.textMuted} />
              </PressableScale>
            ))}
          </View>

          <PressableScale style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {t('common.cancel')}
            </Text>
          </PressableScale>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: scale(radius.xl),
    borderTopRightRadius: scale(radius.xl),
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    paddingTop: scale(spacing.sm),
    paddingHorizontal: scale(spacing.lg),
  },
  handle: {
    alignSelf: 'center',
    width: scale(40),
    height: scale(4),
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: scale(spacing.md),
  },
  title: {
    fontSize: scale(20),
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: scale(14),
    color: colors.textSecondary,
    marginTop: scale(2),
  },
  options: {
    gap: scale(spacing.sm),
    marginTop: scale(spacing.lg),
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(spacing.md),
    padding: scale(spacing.md),
    borderRadius: scale(radius.md),
    backgroundColor: colors.card,
  },
  optionIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(radius.sm),
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: scale(15),
    fontWeight: '600',
    color: colors.text,
  },
  optionDescription: {
    fontSize: scale(13),
    color: colors.textSecondary,
    marginTop: scale(2),
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: scale(spacing.md),
    marginTop: scale(spacing.sm),
  },
  cancelText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
