// src/components/home/PressableScale.js
// ISSY - Botón base del Home v2: al presionar escala y oscurece, al soltar regresa con resorte.
// Solo Animated de React Native (sin dependencias nativas nuevas).

import { useRef } from 'react';
import { Pressable, Animated } from 'react-native';

export default function PressableScale({
  children,
  style,
  containerStyle,
  scaleTo = 0.95,
  dimTo = 0.85,
  onPressIn,
  onPressOut,
  disabled,
  ...pressableProps
}) {
  const pressed = useRef(new Animated.Value(0)).current;

  const handlePressIn = (e) => {
    Animated.timing(pressed, {
      toValue: 1,
      duration: 90,
      useNativeDriver: true,
    }).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e) => {
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
      { scale: pressed.interpolate({ inputRange: [0, 1], outputRange: [1, scaleTo] }) },
    ],
    opacity: pressed.interpolate({ inputRange: [0, 1], outputRange: [1, dimTo] }),
  };

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
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
