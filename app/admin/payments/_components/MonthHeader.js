// app/admin/payments/_components/MonthHeader.js
// ISSY Admin - MonthHeader (Sprint 3 D10)
//
// Header de mes para Lista-Cobros con mini bar chart cobrado vs pendiente.
// Renderiza encima de cada grupo de payments del mes correspondiente.
//
// Las stats vienen calculadas por `groupByMonth` desde los items VISIBLES
// (paginated). Si el admin scrollea más, los totals se actualizan al
// re-renderizar — comportamiento esperado.

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { colors, spacing, typography, radii } from '../_styles/theme';

/**
 * @param {Object} props
 * @param {string} props.label - "Octubre 2025"
 * @param {{ collected: number, pending: number, total: number, count: number }} props.stats
 * @param {string} [props.currency='HNL']
 * @param {boolean} [props.collapsed=false] - si true, muestra chevron derecha (mes oculto).
 *   Hotfix month grouper: agregado en post-D10 para permitir colapsar grupos
 *   de mes. Si `onToggle` no se provee, el chevron NO se renderiza y el
 *   componente queda en modo "siempre expandido" (retrocompat con consumers
 *   que no quieran la feature).
 * @param {() => void} [props.onToggle] - handler de tap sobre el header.
 */
export function MonthHeader({
  label,
  stats,
  currency = 'HNL',
  collapsed = false,
  onToggle,
}) {
  const { collected = 0, pending = 0, total = 0, count = 0 } = stats || {};

  // % por segmento (flex en el bar chart)
  const collectedPct = total > 0 ? (collected / total) * 100 : 0;
  const pendingPct = total > 0 ? (pending / total) * 100 : 0;

  // Formato compacto sin decimales para el header (la card individual
  // tiene los decimales completos)
  const fmt = (n) => parseFloat(n || 0).toFixed(0);

  // Hotfix month grouper: Pressable solo "activo" si hay handler. Sin
  // handler queda inerte (disabled=true) y no muestra chevron — preserva
  // el comportamiento original del componente para consumers que no
  // quieran la feature de colapsar.
  const Chevron = collapsed ? ChevronRight : ChevronDown;

  return (
    <Pressable
      style={styles.wrap}
      onPress={onToggle}
      disabled={!onToggle}
      accessibilityRole={onToggle ? 'button' : undefined}
      accessibilityLabel={
        onToggle
          ? `${label}, ${collapsed ? 'expandir' : 'colapsar'}`
          : undefined
      }
    >
      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.topRowRight}>
          <Text style={styles.count}>
            {count} {count === 1 ? 'cobro' : 'cobros'}
          </Text>
          {onToggle ? (
            <Chevron
              size={20}
              color={colors.onSurface}
              strokeWidth={2}
            />
          ) : null}
        </View>
      </View>

      {/* Bar chart 2-segmentos. Si total=0 (todos cancelled) muestra un
          tracker neutro para que el header no se vea vacío. */}
      <View style={styles.bar}>
        {total > 0 ? (
          <>
            {collectedPct > 0 ? (
              <View style={[styles.barSegmentCollected, { flex: collectedPct }]} />
            ) : null}
            {pendingPct > 0 ? (
              <View style={[styles.barSegmentPending, { flex: pendingPct }]} />
            ) : null}
          </>
        ) : (
          <View style={styles.barEmpty} />
        )}
      </View>

      {/* Numbers + leyenda */}
      <View style={styles.numbersRow}>
        <View style={styles.numberItem}>
          <View style={[styles.numberDot, { backgroundColor: colors.primaryContainer }]} />
          <Text style={styles.numberLabel}>
            Cobrado: {currency} {fmt(collected)}
          </Text>
        </View>
        <View style={styles.numberItem}>
          <View style={[styles.numberDot, { backgroundColor: colors.outline }]} />
          <Text style={styles.numberLabel}>
            Pendiente: {currency} {fmt(pending)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.unit * 3,
    paddingVertical: spacing.unit * 2,
    backgroundColor: colors.surfaceContainerLow,
    marginTop: spacing.unit * 2,
    marginBottom: spacing.unit,
    borderRadius: radii.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.unit,
  },
  // Hotfix month grouper: cluster a la derecha del topRow (count + chevron).
  // alignItems del topRow cambió de 'baseline' a 'center' para que el chevron
  // (que tiene altura propia mayor que el text) quede vertical-centered.
  topRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.unit,
  },
  label: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: '700',
  },
  count: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
  },
  bar: {
    height: 6,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: spacing.unit,
  },
  barSegmentCollected: {
    backgroundColor: colors.primaryContainer,
    height: '100%',
  },
  barSegmentPending: {
    backgroundColor: colors.outline,
    height: '100%',
  },
  barEmpty: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHigh,
  },
  numbersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.unit * 2,
  },
  numberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.unit,
  },
  numberDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  numberLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
  },
});

export default MonthHeader;
