// app/admin/payments/_components/cards/ChargeCard.js
// ISSY Admin - ChargeCard (Sprint 3 D3)
//
// Card visual para Lista-Cobros (mockup #1). Cada card representa UN
// community_payment (no un community_charge padre): muestra el cobro
// asociado, el residente afectado, su unidad, el monto y un badge de
// status. Si está vencido y no pagado, se sobre-escribe el badge a
// VENCIDO y se agrega border-left rojo.

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  Wrench,
  Shield,
  Droplet,
  AlertCircle,
  Zap,
  Receipt,
  Calendar,
} from 'lucide-react-native';
import { colors, spacing, typography, radii } from '../../_styles/theme';

// Mapping charge_type → icono lucide
const CHARGE_TYPE_ICONS = {
  maintenance: Wrench,
  security: Shield,
  water: Droplet,
  extraordinary: AlertCircle,
  service: Zap,
  other: Receipt,
};

// Mapping status → badge config
// Sobre-escrito por "VENCIDO" si charge.due_date < hoy y status !∈ {paid, cancelled}.
const STATUS_BADGE = {
  paid: {
    label: 'PAGADO',
    bg: colors.primaryContainer,
    fg: colors.onPrimaryContainer,
  },
  pending: {
    label: 'PENDIENTE',
    bg: colors.tertiaryFixedDim + '1a', // 10% opacity hex
    fg: colors.tertiaryFixedDim,
  },
  proof_submitted: {
    label: 'EN VERIFICACIÓN',
    bg: colors.secondaryContainer + '1a',
    fg: colors.secondaryContainer,
  },
  rejected: {
    label: 'RECHAZADO',
    bg: colors.error + '1a',
    fg: colors.error,
  },
  cancelled: {
    label: 'CANCELADO',
    bg: colors.outline + '1a',
    fg: colors.outline,
  },
  not_started: {
    label: 'NO INICIADO',
    bg: colors.outlineVariant + '33', // 20% opacity
    fg: colors.onSurfaceVariant,
  },
};

const OVERDUE_BADGE = {
  label: 'VENCIDO',
  bg: colors.error + '1a',
  fg: colors.error,
};

// Helper: "DD MMM" en español (sin date-fns)
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTHS_ES[d.getUTCMonth()];
  return `${day} ${month}`;
};

// Helper: ¿la fecha es < hoy UTC?
const isDateInPast = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setUTCHours(0, 0, 0, 0);
  return target < today;
};

// Formato L 250.00 (Lempiras) o $ 250.00 (USD)
const formatCurrency = (amount, currency) => {
  const symbol = currency === 'USD' ? '$' : 'L';
  const n = parseFloat(amount || 0);
  return `${symbol} ${n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * @param {Object} props
 * @param {Object} props.payment - row del endpoint /admin/payments
 * @param {() => void} [props.onPress] - tap handler
 */
function ChargeCard({ payment, onPress }) {
  const charge = payment?.charge || {};
  const user = payment?.user || {};
  const unit = payment?.unit || {};

  const status = payment?.status || 'pending';
  const dueDate = charge?.due_date || null;
  const isOverdue =
    isDateInPast(dueDate) && status !== 'paid' && status !== 'cancelled';

  const badge = isOverdue ? OVERDUE_BADGE : (STATUS_BADGE[status] || STATUS_BADGE.pending);

  // Date label
  const dateLabel = useMemo(() => {
    if (isOverdue) return `Venció ${formatShortDate(dueDate)}`;
    if (status === 'paid' && payment.paid_at) return `Pagado ${formatShortDate(payment.paid_at)}`;
    if (dueDate) return `Vence ${formatShortDate(dueDate)}`;
    return '';
  }, [isOverdue, status, dueDate, payment.paid_at]);

  // Icon del charge_type
  const IconComponent = CHARGE_TYPE_ICONS[charge?.charge_type] || Receipt;

  // Residente subtitle
  const unitLabel = unit?.unit_number ? `Casa ${unit.unit_number}` : '';
  const userName = user?.name || 'Residente';
  const subtitle = unitLabel ? `${unitLabel} • ${userName}` : userName;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isOverdue && styles.cardOverdue,
        pressed && styles.cardPressed,
      ]}
      android_ripple={{ color: colors.surfaceContainerHigh }}
    >
      {/* Top row: icon + title/subtitle + amount */}
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <IconComponent size={20} color={colors.onSurfaceVariant} strokeWidth={2} />
        </View>
        <View style={styles.titleCol}>
          <Text style={styles.title} numberOfLines={1}>
            {charge?.title || 'Cobro'}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Text style={styles.amount} numberOfLines={1}>
          {formatCurrency(payment?.amount, payment?.currency)}
        </Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Bottom row: status badge + date */}
      <View style={styles.bottomRow}>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
        </View>
        {dateLabel ? (
          <View style={styles.dateWrap}>
            <Calendar size={12} color={colors.onSurfaceVariant} strokeWidth={2} />
            <Text style={styles.dateText}>{dateLabel}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
    padding: spacing.gutter,
    marginBottom: spacing.cardGap,
  },
  cardOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  cardPressed: {
    opacity: 0.7,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  amount: {
    ...typography.monoData,
    color: colors.onSurface,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginVertical: 12,
    opacity: 0.5,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  badgeText: {
    ...typography.labelSm,
    fontWeight: '700',
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
});

export default ChargeCard;
