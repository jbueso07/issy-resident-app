// app/admin/payments/_components/cards/KpiCard.js
// ISSY Admin - KpiCard (Sprint 3 D4)
//
// Card horizontal para KPIs financieros del header de Lista-Cobros (mockup #1).
// Estructura visual: border-left de color, icon arriba, label uppercase,
// valor en estilo mono-data. Va dentro de un ScrollView horizontal de la
// tab para que en mobile angosto el usuario pueda scroll los 3+ KPIs.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radii } from '../../_styles/theme';

// Accent → color mapping (border-left, icon, valor)
const ACCENT_COLORS = {
  primary: colors.primaryContainer,  // #c8f328 (lime)
  warning: colors.tertiaryFixedDim,  // #ffba20
  info: colors.secondaryContainer,   // #00c19f (teal)
};

/**
 * @param {Object} props
 * @param {string} props.label - texto en uppercase (ej. "Cobrado")
 * @param {string} props.value - valor formateado (ej. "$12.4k" o "5")
 * @param {React.ComponentType} props.icon - componente icono lucide-react-native
 * @param {'primary' | 'warning' | 'info'} [props.accent='primary']
 */
function KpiCard({ label, value, icon: IconComponent, accent = 'primary' }) {
  const accentColor = ACCENT_COLORS[accent] || ACCENT_COLORS.primary;

  return (
    <View style={[styles.card, { borderLeftColor: accentColor }]}>
      {IconComponent ? (
        <IconComponent
          size={22}
          color={accentColor}
          strokeWidth={2}
          style={styles.icon}
        />
      ) : null}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, { color: accentColor }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 128,
    padding: spacing.gutter,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.lg,
    borderLeftWidth: 4,
  },
  icon: {
    marginBottom: 8,
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  value: {
    ...typography.bodyLg,
    fontWeight: '700',
    // RN no tiene true mono variant; tabular-nums alinea dígitos
    fontVariant: ['tabular-nums'],
  },
});

export default KpiCard;
