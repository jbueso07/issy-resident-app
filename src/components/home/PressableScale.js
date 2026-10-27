// src/components/home/PressableScale.js
// ISSY - Botón base del Home v2: al presionar escala y oscurece, al soltar regresa con resorte.
// Solo Animated de React Native (sin dependencias nativas nuevas).
//
// variant="neu" (piel i5): en relieve; al presionar pasa a hundido y escala a .965, sin oscurecer.
// - neuSurface="self" (por defecto): el relieve va en `style`.
// - neuSurface="none": el relieve lo pone el hijo; children puede ser ({ pressed }) => ...
//   (p. ej. solo el círculo de una acción rápida, no su etiqueta).

import { useRef, useState } from 'react';
import { Pressable, Animated } from 'react-native';
import { neuSurface as NEU_SURFACE } from '../../theme/tokens';

export const getNeuSurface = (pressed, small = false) =>
  pressed ? (small ? NEU_SURFACE.sunkenSm : NEU_SURFACE.sunken) : small ? NEU_SURFACE.raisedSm : NEU_SURFACE.raised;

export default function PressableScale({
  children,
  style,
  containerStyle,
  variant,
  neuSurface = 'self',
  scaleTo,
  dimTo,
  onPressIn,
  onPressOut,
  disabled,
  ...pressableProps
}) {
  const isNeu = variant === 'neu';
  const toScale = scaleTo ?? (isNeu ? 0.965 : 0.95);
  const toDim = dimTo ?? (isNeu ? 1 : 0.85);
  const pressed = useRef(new Animated.Value(0)).current;
  const [isPressed, setIsPressed] = useState(false);

  const handlePressIn = (e) => {
    if (isNeu) setIsPressed(true);
    Animated.timing(pressed, {
      toValue: 1,
      duration: 90,
      useNativeDriver: true,
    }).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e) => {
    if (isNeu) setIsPressed(false);
    Animated.spring(pressed, {
      toValue: 0,
      friction: 4,
      tension: 160,
      useNativeDriver: true,
    }).start();
    onPressOut?.(e);
  };

  const animatedStyle = {
    transform: [
      { scale: pressed.interpolate({ inputRange: [0, 1], outputRange: [1, toScale] }) },
    ],
    opacity: pressed.interpolate({ inputRange: [0, 1], outputRange: [1, toDim] }),
  };

  const surfaceStyle = isNeu && neuSurface === 'self' ? getNeuSurface(isPressed) : null;

  return (
    <Pressable
      {...pressableProps}
      style={containerStyle}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole={pressableProps.accessibilityRole || 'button'}
      accessibilityState={{ disabled: !!disabled, ...pressableProps.accessibilityState }}
    >
      <Animated.View style={[style, surfaceStyle, animatedStyle]}>
        {typeof children === 'function' ? children({ pressed: isPressed }) : children}
      </Animated.View>
    </Pressable>
  );
}
