// src/components/home/QuickActions.js
// ISSY - Acciones rápidas del Home v2: Nuevo QR · Reportar · Pagar · Emergencia.
// Emergencia: la lógica sigue en home.js (onPanicLongPress = handlePanicLongPress, mismo delayLongPress 2000).
// Aquí solo se agrega el anillo de progreso visual mientras se mantiene presionado.

import { useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect } from 'react-native-svg';
import { useTranslation } from '../../hooks/useTranslation';
import { PlusIcon, CreditCardIcon } from '../Icons';
import PressableScale, { getNeuSurface } from './PressableScale';
import { useHomeFont } from '../../theme/homeFont';
import { scale, fs, MAX_FONT_SCALE, neu } from '../../theme/tokens';

const PANIC_HOLD_MS = 2000;

// Círculos de 64 en relieve (piel i5)
const BOX = scale(64);
const BOX_RADIUS = BOX / 2;
const RING_STROKE = 3;
// Perímetro del anillo (con radio = mitad del lado, el rectángulo redondeado es un círculo)
const RING_SIZE = BOX - RING_STROKE;
const RING_RADIUS = BOX_RADIUS - RING_STROKE / 2;
const RING_LENGTH = 4 * (RING_SIZE - 2 * RING_RADIUS) + 2 * Math.PI * RING_RADIUS;

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export default function QuickActions({ onPanicLongPress }) {
  const router = useRouter();
  const { t } = useTranslation();
  const font = useHomeFont();
  const holdProgress = useRef(new Animated.Value(0)).current;

  const ACTIONS = [
    { id: 'qr', label: t('home2.actions.newQR', 'Nuevo QR'), route: '/(tabs)/visits', params: { tab: 'visitors', create: '1' } },
    { id: 'report', label: t('home2.actions.report', 'Reportar'), route: '/incidents', params: { create: '1' } },
    { id: 'pay', label: t('home2.actions.pay', 'Pagar'), route: '/(tabs)/payments' },
    { id: 'panic', label: t('home2.actions.emergency', 'Emergencia'), isPanic: true },
  ];

  const handlePress = (action) => {
    // El botón de emergencia se maneja con onLongPress, no aquí
    if (action.isPanic) return;
    router.push(action.params ? { pathname: action.route, params: action.params } : action.route);
  };

  const startHold = () => {
    holdProgress.setValue(0);
    Animated.timing(holdProgress, {
      toValue: 1,
      duration: PANIC_HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  };

  const resetHold = () => {
    holdProgress.stopAnimation();
    holdProgress.setValue(0);
  };

  const renderIcon = (action) => {
    switch (action.id) {
      case 'qr':
        return <PlusIcon size={scale(24)} color={neu.teal} />;
      case 'report':
        return <Ionicons name="alert-circle-outline" size={scale(24)} color={neu.amber} />;
      case 'pay':
        return <CreditCardIcon size={scale(24)} color={neu.lilac} />;
      case 'panic':
        return <Ionicons name="warning" size={scale(24)} color={neu.coral} />;
      default:
        return null;
    }
  };

  // pressed: el círculo pasa de relieve a hundido mientras se mantiene presionado
  const renderBox = (action, pressed) => (
    <View style={[styles.box, getNeuSurface(pressed)]}>
      {renderIcon(action)}
      {action.isPanic && (
        <Svg style={styles.ring} width={BOX} height={BOX} pointerEvents="none">
          <AnimatedRect
            x={RING_STROKE / 2}
            y={RING_STROKE / 2}
            width={RING_SIZE}
            height={RING_SIZE}
            rx={RING_RADIUS}
            ry={RING_RADIUS}
            fill="none"
            stroke={neu.coral}
            strokeWidth={RING_STROKE}
            strokeLinecap="butt"
            strokeDasharray={`${RING_LENGTH} ${RING_LENGTH}`}
            strokeDashoffset={holdProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [RING_LENGTH, 0],
            })}
          />
        </Svg>
      )}
    </View>
  );

  return (
    <View style={styles.row}>
      {ACTIONS.map((action) => (
        <PressableScale
          key={action.id}
          variant="neu"
          neuSurface="none"
          containerStyle={styles.item}
          style={styles.itemInner}
          onPress={() => handlePress(action)}
          onLongPress={action.isPanic ? onPanicLongPress : undefined}
          delayLongPress={action.isPanic ? PANIC_HOLD_MS : undefined}
          onPressIn={action.isPanic ? startHold : undefined}
          onPressOut={action.isPanic ? resetHold : undefined}
          accessibilityLabel={action.label}
          accessibilityHint={action.isPanic ? t('home2.actions.hold', 'Mantén presionado 2 segundos') : undefined}
          accessibilityActions={action.isPanic ? [{ name: 'longpress', label: t('home2.actions.emergency', 'Emergencia') }] : undefined}
          onAccessibilityAction={action.isPanic ? (e) => e.nativeEvent.actionName === 'longpress' && onPanicLongPress?.() : undefined}
        >
          {({ pressed }) => (
            <>
              {renderBox(action, pressed)}
              {/* Una sola línea y mismo tamaño en todas: "Emergencia" se partía en Android */}
              <Text
                style={[styles.label, action.isPanic && styles.labelPanic, font(500)]}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                numberOfLines={1}
              >
                {action.label}
              </Text>
            </>
          )}
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: scale(10),
    gap: scale(6),
    marginBottom: scale(24),
  },
  item: {
    flex: 1,
  },
  itemInner: {
    alignItems: 'center',
  },
  box: {
    width: BOX,
    height: BOX,
    borderRadius: BOX_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(10),
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  label: {
    alignSelf: 'stretch',
    fontSize: fs(12),
    fontWeight: '500',
    color: neu.textLabel,
    textAlign: 'center',
  },
  labelPanic: {
    color: neu.coral,
  },
});
