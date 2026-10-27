// src/components/home/HomeSegments.js
// ISSY - Selector de secciones del Home v2 (2 o 3): carril hundido, píldora en relieve que se desliza
// y entrada suave del contenido.
// children: el contenido de la sección activa, o una función (activeKey) => contenido.
// loading: el contenido se monta pero no se ve (con un indicador en su lugar); al pasar a false entra suave.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, ActivityIndicator } from 'react-native';
import PressableScale from './PressableScale';
import { useHomeFont } from '../../theme/homeFont';
import { radius, spacing, scale, MAX_FONT_SCALE, neu, neuSurface } from '../../theme/tokens';

const TRACK_PADDING = scale(5);
const CONTENT_SHIFT = scale(16);

export default function HomeSegments({ segments, value, onChange, loading = false, children }) {
  const font = useHomeFont();
  const [trackWidth, setTrackWidth] = useState(0);
  const count = segments.length;
  const activeIndex = Math.max(0, segments.findIndex((s) => s.key === value));
  const segmentWidth = trackWidth > 0 ? (trackWidth - TRACK_PADDING * 2) / count : 0;
  const useShort = count >= 3;

  const pillX = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(1)).current;
  const prevIndexRef = useRef(activeIndex);
  const wasLoadingRef = useRef(loading);
  // Se calcula en el render, antes de que el efecto actualice prevIndexRef
  const direction = activeIndex >= prevIndexRef.current ? 1 : -1;

  // Píldora: se mueve sin animar cuando cambia el ancho (primer layout, rotación)
  useEffect(() => {
    pillX.setValue(activeIndex * segmentWidth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentWidth]);

  const playEntry = () => {
    content.setValue(0);
    Animated.timing(content, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

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

    playEntry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  // Al terminar de cargar, el contenido aparece con la misma entrada suave
  useLayoutEffect(() => {
    if (wasLoadingRef.current && !loading) playEntry();
    wasLoadingRef.current = loading;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

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
        style={[styles.track, neuSurface.sunken]}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        accessibilityRole="tablist"
      >
        {segmentWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[styles.pill, neuSurface.raisedSm, { width: segmentWidth, transform: [{ translateX: pillX }] }]}
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
                style={[styles.label, isActive && styles.labelActive, font(600)]}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {label}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <Animated.View key={value} style={[styles.content, contentStyle]}>
        {/* Mientras carga: montado (para que cargue) pero invisible y fuera del lector de pantalla */}
        <View
          style={loading && styles.hidden}
          pointerEvents={loading ? 'none' : 'auto'}
          accessibilityElementsHidden={loading}
          importantForAccessibility={loading ? 'no-hide-descendants' : 'auto'}
        >
          {typeof children === 'function' ? children(value) : children}
        </View>
        {loading && (
          <View style={styles.loading} pointerEvents="none">
            <ActivityIndicator size="small" color={neu.teal} />
          </View>
        )}
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
    backgroundColor: neu.bg,
  },
  pill: {
    position: 'absolute',
    top: TRACK_PADDING,
    bottom: TRACK_PADDING,
    left: TRACK_PADDING,
    borderRadius: radius.pill,
    backgroundColor: neu.bg,
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
    color: neu.textSoft,
  },
  labelActive: {
    color: neu.teal,
  },
  content: {
    marginTop: scale(spacing.lg),
  },
  hidden: {
    opacity: 0,
  },
  loading: {
    position: 'absolute',
    top: scale(spacing.xl),
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
