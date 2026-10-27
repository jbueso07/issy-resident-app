// src/theme/tokens.js
// ISSY - Tokens de diseño del Home v2 (piel actual de producción)
// Solo los usan los componentes nuevos de src/components/home/.
// No migrar aquí los colores de otras pantallas en esta etapa.

import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Misma escala que home.js: diseño base en 375 de ancho
export const scale = (size) => (SCREEN_WIDTH / 375) * size;
// Letra del home: crece solo el 40% de lo que crece scale() (en pantallas anchas se veía grande y pesada)
export const fs = (size) => size + (scale(size) - size) * 0.4;

// ============ COLORES ============
export const colors = {
  bg: '#0F1A1E',
  card: '#1C2E35',
  well: '#152328',

  cyan: '#00E5FF',
  lime: '#AAFF00',
  teal: '#00BFA6',
  coral: '#FF5E5B',
  orange: '#FF8A50',
  purple: '#A78BFA',
  amber: '#FBBF24',
  indigo: '#818CF8',
  blue: '#60A5FA',
  danger: '#E24B4A',
  dangerSoft: '#F09595',

  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.58)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textDark: '#0F1A1E',
  // Texto y fondos sobre el degradado de marca
  textDarkSecondary: 'rgba(15, 26, 30, 0.68)',
  darkOverlay: 'rgba(15, 26, 30, 0.14)',

  border: 'rgba(255, 255, 255, 0.1)',
};

export const gradients = {
  brand: [colors.teal, colors.lime],
};

// ============ MEDIDAS (sin escalar; usar con scale()) ============
export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

// Tope de letra para los componentes nuevos del home (las pantallas de QR no escalan)
export const MAX_FONT_SCALE = 1.6;

// ============ TEMA NEU (piel i5 del home: relieve y hundido) ============
// Solo para las pantallas del home. boxShadow necesita la nueva arquitectura (RN 0.81 la tiene)
// y en Android: sombras externas desde Android 9 (API 28), internas desde Android 10 (API 29).
// Más viejo: RN no dibuja la sombra; se usa un borde sutil para que las formas no desaparezcan.
const NEU_LIGHT = 'rgba(255, 255, 255, 0.06)';
const NEU_DARK = 'rgba(0, 0, 0, 0.5)';

export const neu = {
  bg: '#1E272A',
  // Superficies en relieve (tarjeta, acciones, recientes, barra, botones del encabezado)
  raised: '#253135',
  // Superficies hundidas (chips, carril del selector, círculo de ícono en recientes)
  sunken: '#202A2D',
  // Solo respaldo (Android viejo) y fondo detrás de filas deslizables
  bgDeep: '#1A2326',
  light: NEU_LIGHT,
  dark: NEU_DARK,

  teal: '#4FD3B8',
  coral: '#F2766B',
  amber: '#F2BE55',
  lilac: '#A594F5',
  blue: '#8FC9F5',

  text: '#E4ECEB',
  textLabel: '#C9D1D0',
  textSoft: '#9A9FA4',
};

const NEU_SHADOWS = {
  raised: `-5px -5px 12px ${NEU_LIGHT}, 6px 6px 14px ${NEU_DARK}`,
  sunken: `inset -5px -5px 12px ${NEU_LIGHT}, inset 6px 6px 14px ${NEU_DARK}`,
  // Mitad de distancia y desenfoque para piezas chicas (chips, pastilla del selector, botón QR)
  raisedSm: `-2.5px -2.5px 6px ${NEU_LIGHT}, 3px 3px 7px ${NEU_DARK}`,
  sunkenSm: `inset -2.5px -2.5px 6px ${NEU_LIGHT}, inset 3px 3px 7px ${NEU_DARK}`,
};

const ANDROID_API = Platform.OS === 'android' ? Platform.Version : null;
const CAN_OUTSET = ANDROID_API === null || ANDROID_API >= 28;
const CAN_INSET = ANDROID_API === null || ANDROID_API >= 29;

const RAISED_FALLBACK = { borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' };
const SUNKEN_FALLBACK = { backgroundColor: neu.bgDeep, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.25)' };

// Estilos listos (traen su color de fondo): style={[styles.x, neuSurface.raised]}
export const neuSurface = {
  raised: { backgroundColor: neu.raised, ...(CAN_OUTSET ? { boxShadow: NEU_SHADOWS.raised } : RAISED_FALLBACK) },
  sunken: { backgroundColor: neu.sunken, ...(CAN_INSET ? { boxShadow: NEU_SHADOWS.sunken } : SUNKEN_FALLBACK) },
  raisedSm: { backgroundColor: neu.raised, ...(CAN_OUTSET ? { boxShadow: NEU_SHADOWS.raisedSm } : RAISED_FALLBACK) },
  sunkenSm: { backgroundColor: neu.sunken, ...(CAN_INSET ? { boxShadow: NEU_SHADOWS.sunkenSm } : SUNKEN_FALLBACK) },
};

// Colores de la piel actual → su equivalente neu (íconos de funciones y de recientes)
const NEU_ACCENTS = {
  [colors.teal]: neu.teal,
  [colors.lime]: neu.teal,
  [colors.cyan]: neu.blue,
  [colors.blue]: neu.blue,
  [colors.purple]: neu.lilac,
  [colors.indigo]: neu.lilac,
  [colors.orange]: neu.amber,
  [colors.amber]: neu.amber,
  [colors.coral]: neu.coral,
  [colors.danger]: neu.coral,
  [colors.textSecondary]: neu.textSoft,
};
export const toNeuAccent = (color) => NEU_ACCENTS[color] || color || neu.textSoft;

export default { colors, gradients, radius, spacing, scale, fs, MAX_FONT_SCALE, neu, neuSurface, toNeuAccent };
