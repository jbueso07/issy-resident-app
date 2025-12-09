// src/components/Icons.js
// ISSY - Iconos SVG personalizados
// Para usar: import { StarIcon, BellIcon, ... } from '../src/components/Icons';

import Svg, { Path, G } from 'react-native-svg';

// ============ ICONOS DE SERVICIOS ============

// Estrella - Visitantes
export const StarIcon = ({ size = 24, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 -7 512 512">
    <Path
      fill={color}
      d="M389.5 498.4c-6.4 0-12.8-1.6-18.7-4.7l-110.2-58.9c-2.9-1.5-6.3-1.5-9.1 0l-110.2 58.9c-13.5 7.2-29.5 6.1-41.9-2.8-12.6-9.1-18.8-24.3-16.2-39.7l21-124.7c.6-3.4-.5-6.9-3-9.4l-89.1-88.3c-11-10.9-14.8-26.8-10-41.6 4.8-14.6 17.1-25 32.2-27.3l123.2-18.2c3.2-.5 6.1-2.6 7.5-5.6l55.1-113.5c6.8-14 20.5-22.6 35.9-22.6s29.1 8.7 35.9 22.6l55.1 113.5c1.5 3 4.3 5.1 7.5 5.6l123.2 18.2c15.1 2.2 27.4 12.7 32.2 27.3 4.8 14.8 1 30.7-10 41.6l-89.1 88.3c-2.4 2.4-3.5 5.9-3 9.4l21 124.7c2.6 15.4-3.6 30.6-16.2 39.7-6.9 5-15 7.5-23.2 7.5z"
    />
  </Svg>
);

// Campana/Notificación - Anuncios
export const BellIcon = ({ size = 24, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <G fill={color}>
      <Path d="M12 2C10.9 2 10 2.9 10 4v.3C7.7 5.2 6 7.4 6 10v4l-2 2v1h16v-1l-2-2v-4c0-2.6-1.7-4.8-4-5.7V4c0-1.1-.9-2-2-2z" />
      <Path d="M14 19h-4c0 1.1.9 2 2 2s2-.9 2-2z" />
    </G>
  </Svg>
);

// Calendario/Cita - Reservaciones
export const CalendarIcon = ({ size = 24, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <G fill={color}>
      <Path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z" />
      <Path d="M7 12h2v2H7zM7 16h2v2H7zM11 12h2v2h-2zM11 16h2v2h-2zM15 12h2v2h-2zM15 16h2v2h-2z" />
    </G>
  </Svg>
);

// Tarjeta de crédito - Pagos
export const CreditCardIcon = ({ size = 24, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <G fill={color}>
      <Path d="M3 6h8v3H3z" />
      <Path d="M3 13h18v6c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-6z" />
      <Path d="M12 3h7c1.1 0 2 .9 2 2v4H12V3z" />
    </G>
  </Svg>
);

// Edificio - Gestor de Propiedades
export const BuildingIcon = ({ size = 24, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill={color}
      d="M5 3v18h6v-4h2v4h6V3H5zm4 14H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"
    />
  </Svg>
);

// Maletín - Finanzas Personales
export const BriefcaseIcon = ({ size = 24, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <G fill={color}>
      <Path d="M10 4V2c0-.5.5-1 1-1h2c.5 0 1 .5 1 1v2h6c1.1 0 2 .9 2 2v5H2V6c0-1.1.9-2 2-2h6z" />
      <Path d="M2 13h20v7c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-7z" />
    </G>
  </Svg>
);

// ============ ICONOS DE QUICK ACTIONS ============

// Agregar/Plus - Nuevo QR
export const PlusIcon = ({ size = 24, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Path
      fill={color}
      d="M50 2.5c-26.3 0-47.5 21.2-47.5 47.5s21.3 47.5 47.5 47.5c26.3 0 47.5-21.3 47.5-47.5 0-26.3-21.2-47.5-47.5-47.5zm20.6 53.2h-14.9v14.9c0 3.1-2.5 5.7-5.7 5.7-3.1 0-5.7-2.5-5.7-5.7v-14.9h-14.9c-3.1 0-5.7-2.5-5.7-5.7 0-3.1 2.5-5.7 5.7-5.7h14.9v-14.9c0-3.1 2.5-5.7 5.7-5.7 3.1 0 5.7 2.5 5.7 5.7v14.9h14.9c3.1 0 5.7 2.5 5.7 5.7-.1 3.1-2.6 5.7-5.7 5.7z"
    />
  </Svg>
);

// Flecha derecha
export const ArrowRightIcon = ({ size = 24, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill={color}
      d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"
    />
  </Svg>
);

// ============ ICONOS DE TAB BAR ============

// Casa/Home
export const HomeIcon = ({ size = 24, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 512 512">
    <G fill={color}>
      <Path d="M256 319.8c-35.3 0-64 28.7-64 64v128h128v-128c0-35.3-28.7-64-64-64z" />
      <Path d="M362.7 383.8v128H448c35.3 0 64-28.7 64-64V253.3c0-11.1-4.3-21.7-12-29.7L318.7 27.6c-32-34.6-86-36.7-120.6-4.7-1.6 1.5-3.2 3.1-4.7 4.7L12.4 223.5c-7.9 8-12.4 18.8-12.4 30.1v194.3c0 35.3 28.7 64 64 64h85.3v-128c.4-58.2 47.4-105.7 104.1-107 58.9-1.4 109.1 46.9 109.6 107z" />
    </G>
  </Svg>
);

// Chat burbujas - Visitas
export const ChatIcon = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <G fill={color}>
      <Path d="M4 4h10c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2H6l-2 2v-2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <Path d="M20 8h-4v6c0 2.2-1.8 4-4 4H8v2c0 1.1.9 2 2 2h6l4 4v-4h0c1.1 0 2-.9 2-2v-6c0-1.1-.9-2-2-2z" />
    </G>
  </Svg>
);

// Audífonos/Soporte
export const HeadsetIcon = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill={color}
      d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"
    />
  </Svg>
);

// Usuario/Perfil
export const UserIcon = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <G fill={color}>
      <Path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
      <Path d="M12 14c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4z" />
    </G>
  </Svg>
);

// Ubicación/Pin
export const LocationIcon = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill={color}
      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
    />
  </Svg>
);

// Intercambiar
export const SwapIcon = ({ size = 16, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill={color}
      d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"
    />
  </Svg>
);