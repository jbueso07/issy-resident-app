// src/components/VisitorSuggestions.js
// ISSY - Lista de visitas anteriores bajo "Nombre del visitante" (formulario "Nuevo QR").
// Tocar una fila la elige; mantener presionada o deslizar a la izquierda la quita de sugerencias.
// Pantallas de QR: el texto no escala.

import { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './home/PressableScale';
import { colors, radius, spacing, scale } from '../theme/tokens';

const REMOVE_ACTION_WIDTH = scale(88);

function SuggestionRow({ item, isLast, t, onSelect, onRemove }) {
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
        // Solo gestos claramente horizontales; el desplazamiento vertical sigue en el formulario
        onMoveShouldSetPanResponderCapture: (_, g) =>
          Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => {
          const x = Math.min(0, Math.max(-REMOVE_ACTION_WIDTH * 1.2, offsetRef.current + g.dx));
          translateX.setValue(x);
        },
        onPanResponderRelease: (_, g) => {
          const x = offsetRef.current + g.dx;
          animateTo(x < -REMOVE_ACTION_WIDTH / 2 || g.vx < -0.5 ? -REMOVE_ACTION_WIDTH : 0);
        },
        onPanResponderTerminate: () => animateTo(offsetRef.current),
      }),
    [animateTo, translateX]
  );

  // El botón Quitar no se ve hasta deslizar
  const actionOpacity = translateX.interpolate({
    inputRange: [-REMOVE_ACTION_WIDTH, -REMOVE_ACTION_WIDTH * 0.3, 0],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  });

  const removeLabel = t('visits.suggestions.remove', 'Quitar de sugerencias');

  const handlePress = () => {
    if (open) {
      animateTo(0);
      return;
    }
    onSelect(item);
  };

  const confirmRemove = () => {
    Alert.alert(item.name, undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: removeLabel, style: 'destructive', onPress: () => onRemove(item) },
    ]);
  };

  const initial = (item.name.trim().charAt(0) || '?').toUpperCase();

  return (
    <View style={[styles.rowWrap, !isLast && styles.rowDivider]}>
      <Animated.View style={[styles.removeAction, { opacity: actionOpacity }]}>
        <PressableScale style={styles.removeButton} onPress={() => onRemove(item)} accessibilityLabel={removeLabel}>
          <Ionicons name="close-circle-outline" size={20} color={colors.text} />
          <Text style={styles.removeText} allowFontScaling={false}>
            {t('visits.suggestions.removeShort', 'Quitar')}
          </Text>
        </PressableScale>
      </Animated.View>

      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <PressableScale
          style={styles.row}
          onPress={handlePress}
          onLongPress={confirmRemove}
          delayLongPress={450}
          scaleTo={0.98}
          accessibilityRole="button"
          accessibilityLabel={item.phone ? `${item.name}, ${item.phone}` : item.name}
          accessibilityHint={t('visits.suggestions.hint', 'Toca para usar sus datos. Mantén presionado para quitarla.')}
          accessibilityActions={[{ name: 'remove', label: removeLabel }]}
          onAccessibilityAction={(e) => e.nativeEvent.actionName === 'remove' && onRemove(item)}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText} allowFontScaling={false}>{initial}</Text>
          </View>
          <View style={styles.rowText}>
            <Text style={styles.name} numberOfLines={1} allowFontScaling={false}>
              {item.parts.map((part, index) => (
                <Text key={index} style={part.bold ? styles.nameBold : null} allowFontScaling={false}>
                  {part.text}
                </Text>
              ))}
            </Text>
            {!!item.phone && (
              <Text style={styles.phone} numberOfLines={1} allowFontScaling={false}>
                {item.phone}
              </Text>
            )}
          </View>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

export default function VisitorSuggestions({ items, t, onSelect, onRemove }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.container} accessibilityLabel={t('visits.suggestions.title', 'Visitas anteriores')}>
      {items.map((item, index) => (
        <SuggestionRow
          key={item.name}
          item={item}
          isLast={index === items.length - 1}
          t={t}
          onSelect={onSelect}
          onRemove={onRemove}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: -scale(spacing.sm),
    marginBottom: scale(spacing.lg),
    backgroundColor: colors.card,
    borderRadius: scale(radius.md),
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  rowWrap: {
    backgroundColor: colors.danger,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  removeAction: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: REMOVE_ACTION_WIDTH,
  },
  removeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(2),
  },
  removeText: {
    color: colors.text,
    fontSize: scale(12),
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(spacing.md),
    paddingVertical: scale(spacing.sm + 2),
    backgroundColor: colors.card,
    gap: scale(spacing.md),
  },
  avatar: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    backgroundColor: colors.well,
    borderWidth: 1,
    borderColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.teal,
    fontSize: scale(15),
    fontWeight: '700',
  },
  rowText: {
    flex: 1,
  },
  name: {
    color: colors.textSecondary,
    fontSize: scale(15),
  },
  nameBold: {
    color: colors.text,
    fontWeight: '700',
  },
  phone: {
    marginTop: scale(2),
    color: colors.textMuted,
    fontSize: scale(12),
  },
});
