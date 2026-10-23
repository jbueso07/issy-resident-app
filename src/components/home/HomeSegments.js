// src/components/home/HomeSegments.js
// ISSY - Selector de secciones del Home v2 (2 o 3): píldora cian animada y entrada suave del contenido.
// children: el contenido de la sección activa, o una función (activeKey) => contenido.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import PressableScale from './PressableScale';
import { colors, radius, spacing, scale, MAX_FONT_SCALE } from '../../theme/tokens';

const TRACK_PADDING = scale(4);
const CONTENT_SHIFT = scale(16);

export default function HomeSegments({ segments, value, onChange, children }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const count = segments.length;
  const activeIndex = Math.max(0, segments.findIndex((s) => s.key === value));
  const segmentWidth = trackWidth > 0 ? (trackWidth - TRACK_PADDING * 2) / count : 0;
  const useShort = count >= 3;

  const pillX = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(1)).current;
  const prevIndexRef = useRef(activeIndex);
  // Se calcula en el render, antes de que el efecto actualice prevIndexRef
  const direction = activeIndex >= prevIndexRef.current ? 1 : -1;

  // Píldora: se mueve sin animar cuando cambia el ancho (primer layout, rotación)
  useEffect(() => {
    pillX.setValue(activeIndex * segmentWidth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentWidth]);

  // useLayoutEffect: el contenido nuevo arranca invisible desde el primer cuadro
  useLayoutEffect(() => {
    if (prevIndexRef.current === activeIndex) return;
    prevIndexRef.current = activeIndex;

    Animated.spring(pillX, {
      toValue: activeIndex * segmentWidth,
      friction: 9,
      tension: 90,
      useNativeDriver: true,
    }).start();

    content.setValue(0);
    Animated.timing(content, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const contentStyle = {
    opacity: content,
    transform: [
      {
        translateX: content.interpolate({
          inputRange: [0, 1],
          outputRange: [CONTENT_SHIFT * direction, 0],
        }),
      },
    ],
  };

  return (
    <View>
      <View
        style={styles.track}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        accessibilityRole="tablist"
      >
        {segmentWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[styles.pill, { width: segmentWidth, transform: [{ translateX: pillX }] }]}
          />
        )}
        {segments.map((segment, index) => {
          const isActive = index === activeIndex;
          const label = useShort ? segment.shortLabel || segment.label : segment.label;
          return (
            <PressableScale
              key={segment.key}
              containerStyle={styles.segment}
              style={styles.segmentInner}
              onPress={() => !isActive && onChange?.(segment.key)}
              accessibilityRole="tab"
              accessibilityLabel={segment.label}
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[styles.label, isActive && styles.labelActive]}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                numberOfLines={1}
              >
                {label}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <Animated.View key={value} style={[styles.content, contentStyle]}>
        {typeof children === 'function' ? children(value) : children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    marginHorizontal: scale(spacing.lg),
    padding: TRACK_PADDING,
    borderRadius: radius.pill,
    backgroundColor: colors.well,
  },
  pill: {
    position: 'absolute',
    top: TRACK_PADDING,
    bottom: TRACK_PADDING,
    left: TRACK_PADDING,
    borderRadius: radius.pill,
    backgroundColor: colors.cyan,
  },
  segment: {
    flex: 1,
  },
  segmentInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    paddingHorizontal: scale(spacing.xs),
  },
  label: {
    fontSize: scale(13),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.textDark,
  },
  content: {
    marginTop: scale(spacing.lg),
  },
});
