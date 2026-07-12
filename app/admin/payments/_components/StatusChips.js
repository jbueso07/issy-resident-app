// app/admin/payments/_components/StatusChips.js
// ISSY Admin - StatusChips (Sprint 3 D4)
//
// 3 chips de filtro para la tab Lista-Cobros: Todos | Activos | Cancelados.
// "Activos" en el backend (Sprint 3 D4) = community_payments con
// status NOT IN ('paid', 'cancelled'); requiere acción del admin.
//
// Mapping:
//   'all'       → Todos       (sin filtro status en el endpoint)
//   'active'    → Activos     (status=active en el endpoint)
//   'cancelled' → Cancelados  (status=cancelled en el endpoint)

import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography, radii } from '../_styles/theme';

const CHIPS = [
  { value: 'all', labelKey: 'admin.payments.chips.all', fallback: 'Todos' },
  { value: 'active', labelKey: 'admin.payments.chips.active', fallback: 'Activos' },
  { value: 'cancelled', labelKey: 'admin.payments.chips.cancelled', fallback: 'Cancelados' },
];

/**
 * @param {Object} props
 * @param {'all' | 'active' | 'cancelled'} props.value - chip activa
 * @param {(next: string) => void} props.onChange
 */
function StatusChips({ value, onChange }) {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {CHIPS.map((chip) => {
        const isActive = value === chip.value;
        return (
          <Pressable
            key={chip.value}
            onPress={() => onChange(chip.value)}
            style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.chipText,
                isActive ? styles.chipTextActive : styles.chipTextInactive,
              ]}
              numberOfLines={1}
            >
              {t(chip.labelKey, chip.fallback)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.unit * 2,
    paddingHorizontal: spacing.containerPadding,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  chipActive: {
    backgroundColor: colors.primaryContainer,
  },
  chipInactive: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  chipText: {
    ...typography.labelMd,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.onPrimaryContainer,
  },
  chipTextInactive: {
    color: colors.onSurfaceVariant,
  },
});

export default StatusChips;
