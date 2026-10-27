// src/theme/homeFont.js
// ISSY - Lexend Deca para los componentes del home (piel i5).
// Solo JavaScript + los .ttf como assets: expo-font ya viene en el binario, así que sale por OTA.
// Se piden solo 4 pesos (no el índice del paquete, que arrastraría los 9 archivos).
// Mientras carga o si falla, el texto queda con la letra del sistema y su fontWeight de siempre.

import { useCallback } from 'react';
import { useFonts } from 'expo-font';

const FAMILIES = {
  400: 'LexendDeca_400Regular',
  500: 'LexendDeca_500Medium',
  600: 'LexendDeca_600SemiBold',
  700: 'LexendDeca_700Bold',
};

const FONT_MAP = {
  [FAMILIES[400]]: require('@expo-google-fonts/lexend-deca/400Regular/LexendDeca_400Regular.ttf'),
  [FAMILIES[500]]: require('@expo-google-fonts/lexend-deca/500Medium/LexendDeca_500Medium.ttf'),
  [FAMILIES[600]]: require('@expo-google-fonts/lexend-deca/600SemiBold/LexendDeca_600SemiBold.ttf'),
  [FAMILIES[700]]: require('@expo-google-fonts/lexend-deca/700Bold/LexendDeca_700Bold.ttf'),
};

// const font = useHomeFont(); <Text style={[styles.title, font(700)]}>
// Con la fuente cargada cambia la familia por peso (en Android fontWeight con fuente propia elige mal).
export function useHomeFont() {
  const [loaded] = useFonts(FONT_MAP);
  return useCallback(
    (weight = 400) => (loaded ? { fontFamily: FAMILIES[weight] || FAMILIES[400], fontWeight: 'normal' } : null),
    [loaded]
  );
}
