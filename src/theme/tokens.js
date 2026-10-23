// src/theme/tokens.js
// ISSY - Tokens de diseño del Home v2 (piel actual de producción)
// Solo los usan los componentes nuevos de src/components/home/.
// No migrar aquí los colores de otras pantallas en esta etapa.

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Misma escala que home.js: diseño base en 375 de ancho
export const scale = (size) => (SCREEN_WIDTH / 375) * size;

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
  danger: '#E24B4A',
  dangerSoft: '#F09595',

  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.58)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textDark: '#0F1A1E',

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

export default { colors, gradients, radius, spacing, scale, MAX_FONT_SCALE };
