// app/index.js
// ISSY - Animación de entrada (después del splash nativo), solo con Animated de React Native.
// El logo a color va por piezas: las letras están quietas desde el primer cuadro (sobre el mismo
// fondo que el splash nativo), el arco baja y se asienta, y al final aparece el punto de la i con
// un pequeño rebote. Las 3 capas (assets/logos/issy-logo-*.png) miden lo mismo
// que el logo completo y se apilan, así que el último cuadro es idéntico al logo del encabezado.
// - Dura menos de 1.5 s y navega en cuanto termina (y la sesión ya cargó).
// - Con "reducir movimiento": el logo completo aparece de una vez, sin movimiento.
// - Si la app se va al fondo a medio camino, se salta al final. Esta pantalla solo existe al abrir
//   la app desde cerrada; al volver del fondo no se repite.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Image, StyleSheet, Animated, Easing, AccessibilityInfo, AppState } from 'react-native';
import { useAuth } from '../src/context/AuthContext';

// Mismo fondo que la pantalla de carga nativa (app.json → splash.backgroundColor): el paso del
// splash del binario a esta pantalla no cambia de color.
const SPLASH_BG = '#0F1A1E';

const LOGO_LETTERS = require('../assets/logos/issy-logo-letters.png');
const LOGO_ARC = require('../assets/logos/issy-logo-arc.png');
const LOGO_DOT = require('../assets/logos/issy-logo-dot.png');

// Medidas de las capas (600×486) y centro del punto dentro de ellas
const LOGO_W = 600;
const LOGO_H = 486;
const DOT_CX = 33.5;
const DOT_CY = 142.5;

const WIDTH = 220;
const HEIGHT = (WIDTH * LOGO_H) / LOGO_W;
const K = WIDTH / LOGO_W;
// Desplazamiento del centro del punto respecto al centro de la capa (para escalar sobre el punto)
const DOT_DX = (DOT_CX - LOGO_W / 2) * K;
const DOT_DY = (DOT_CY - LOGO_H / 2) * K;

// Tiempos (ms), desde que se sabe si está "reducir movimiento": total ≈ 1250
const ARC_DELAY = 80;
const ARC_DROP = 520;
const DOT_DELAY = 660;
const DOT_POP = 380;
const HOLD = 210;
const REDUCED_HOLD = 450;

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [animationDone, setAnimationDone] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(null); // null = todavía no se sabe

  // Las letras se ven desde el primer cuadro (mismo fondo que el splash nativo): el splash del
  // binario se desvanece directo sobre ellas, sin un cuadro vacío en medio.
  const arcOpacity = useRef(new Animated.Value(0)).current;
  const arcY = useRef(new Animated.Value(-48)).current;
  const dotOpacity = useRef(new Animated.Value(0)).current;
  const dotScale = useRef(new Animated.Value(0.2)).current;
  const animationRef = useRef(null);
  const finishedRef = useRef(false);

  // Último cuadro: todo en su lugar (= logo completo)
  const settle = () => {
    arcOpacity.setValue(1);
    arcY.setValue(0);
    dotOpacity.setValue(1);
    dotScale.setValue(1);
  };

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    animationRef.current?.stop();
    settle();
    setAnimationDone(true);
  };

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => { if (!cancelled) setReduceMotion(!!enabled); })
      .catch(() => { if (!cancelled) setReduceMotion(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return undefined;

    let animation;
    if (reduceMotion) {
      // Sin movimiento: el logo completo aparece de una vez
      settle();
      animation = Animated.delay(REDUCED_HOLD);
    } else {
      animation = Animated.sequence([
        Animated.parallel([
          Animated.sequence([
            Animated.delay(ARC_DELAY),
            Animated.parallel([
              Animated.timing(arcOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
              // Baja, pasa un poquito y se asienta
              Animated.timing(arcY, {
                toValue: 0,
                duration: ARC_DROP,
                easing: Easing.out(Easing.back(1.6)),
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.sequence([
            Animated.delay(DOT_DELAY),
            Animated.parallel([
              Animated.timing(dotOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
              // Rebote corto: crece de más y regresa a su tamaño
              Animated.timing(dotScale, {
                toValue: 1,
                duration: DOT_POP,
                easing: Easing.out(Easing.back(3)),
                useNativeDriver: true,
              }),
            ]),
          ]),
        ]),
        Animated.delay(HOLD),
      ]);
    }
    animationRef.current = animation;
    animation.start(() => finish());

    // Si la app se va al fondo a medio camino, se salta al final
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') finish();
    });
    return () => {
      sub.remove();
      animation.stop();
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (!loading && animationDone) {
      if (user) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [user, loading, animationDone]);

  return (
    <View style={styles.container}>
      <View
        style={styles.logo}
        accessible
        accessibilityRole="image"
        accessibilityLabel="ISSY"
      >
        <Image source={LOGO_LETTERS} style={styles.layer} resizeMode="contain" />
        <Animated.Image
          source={LOGO_ARC}
          style={[styles.layer, { opacity: arcOpacity, transform: [{ translateY: arcY }] }]}
          resizeMode="contain"
        />
        <Animated.Image
          source={LOGO_DOT}
          style={[
            styles.layer,
            {
              opacity: dotOpacity,
              transform: [
                { translateX: DOT_DX },
                { translateY: DOT_DY },
                { scale: dotScale },
                { translateX: -DOT_DX },
                { translateY: -DOT_DY },
              ],
            },
          ]}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: WIDTH,
    height: HEIGHT,
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: WIDTH,
    height: HEIGHT,
  },
});
