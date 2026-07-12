// app/admin/payments/_components/cards/ProofCard.js
// ISSY Admin - Card de comprobante pendiente (Sprint 3 D11)
//
// Card horizontal con thumbnail del proof + info del cobro/residente + badge
// "PENDIENTE". Usado por ProofsTab para listar los comprobantes con
// status='proof_submitted'.
//
// Shape esperado: payment de getAllPayments (D2). Memory D2: el endpoint
// hace spread `...p` en la response, lo que preserva `proof_of_payment`
// (campo original) + `proof_url` (alias). El componente usa fallback
// chain `proof_url || proof_of_payment`.

import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { FileText, User, Clock, ChevronRight } from 'lucide-react-native';
import { colors, spacing, typography, radii } from '../../_styles/theme';

/**
 * @param {Object} props
 * @param {Object} props.payment - shape de getAllPayments (D2) con joins
 *   payment.charge, payment.user, payment.unit o payment.user_locations.
 * @param {(payment: Object) => void} [props.onPress]
 */
export function ProofCard({ payment, onPress }) {
  if (!payment) return null;

  // Fallback chain: alias `proof_url` (D2) o el campo original `proof_of_payment`.
  const proofUrl = payment.proof_url || payment.proof_of_payment || null;
  const userName = payment.user?.name || payment.user?.full_name || 'Residente';
  const chargeTitle = payment.charge?.title || 'Cobro';
  // Algunos shapes vienen con `unit`, otros con `user_locations` (legacy).
  const unitNumber =
    payment.unit?.unit_number ||
    payment.user_locations?.unit_number ||
    null;
  const amount = parseFloat(payment.amount || 0).toFixed(2);
  const currency = payment.currency || 'HNL';

  // Formato corto de fecha (cuándo se envió el proof). Si es hoy, agrego hora;
  // si es antes, día/mes solamente. El detalle completo está en el modal.
  const submittedAt = formatSubmittedAt(payment.created_at);

  return (
    <Pressable
      onPress={() => onPress?.(payment)}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Comprobante de ${userName} por ${currency} ${amount}`}
    >
      {/* Thumbnail. Si no hay URL, fallback con FileText icon.
          RN no tiene un onError native fallback elegante; trade-off D11. */}
      <View style={styles.thumbWrap}>
        {proofUrl ? (
          <Image
            source={{ uri: proofUrl }}
            style={styles.thumb}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbFallback}>
            <FileText size={32} color={colors.onSurfaceVariant} strokeWidth={1.5} />
          </View>
        )}
      </View>

      {/* Info principal */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {chargeTitle}
        </Text>

        <View style={styles.metaRow}>
          <User size={12} color={colors.onSurfaceVariant} strokeWidth={2} />
          <Text style={styles.metaText} numberOfLines={1}>
            {userName}
            {unitNumber ? ` · Casa ${unitNumber}` : ''}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Clock size={12} color={colors.onSurfaceVariant} strokeWidth={2} />
          <Text style={styles.metaText}>Enviado: {submittedAt}</Text>
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.amount}>
            {currency} {amount}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PENDIENTE</Text>
          </View>
        </View>
      </View>

      {/* Chevron — CTA visual */}
      <ChevronRight size={20} color={colors.onSurfaceVariant} strokeWidth={2} />
    </Pressable>
  );
}

/**
 * Formato corto de fecha de envío.
 *   - Hoy → "Hoy 14:32"
 *   - Ayer → "Ayer 09:15"
 *   - Otro → "12 oct"
 */
function formatSubmittedAt(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '—';

  const now = new Date();
  const isSameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  const hhmm = d.toLocaleTimeString('es-HN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  if (isSameDay) return `Hoy ${hhmm}`;
  if (isYesterday) return `Ayer ${hhmm}`;

  return d.toLocaleDateString('es-HN', { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.md,
    padding: spacing.unit * 2,
    marginBottom: spacing.unit * 1.5,
    gap: spacing.unit * 2,
  },
  cardPressed: {
    backgroundColor: colors.surfaceContainerHigh,
    opacity: 0.95,
  },
  thumbWrap: {
    width: 64,
    height: 80,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerHigh,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: spacing.unit / 2,
  },
  title: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.unit / 2,
  },
  // Theme no expone `bodySm` — uso bodyMd con fontSize override (12).
  metaText: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.unit / 2,
  },
  amount: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  // Badge "PENDIENTE" — usa tertiaryFixedDim (amber) para señalar acción
  // requerida sin alarma roja. Texto sobre fondo amber: onPrimaryFixed
  // como contrast accessible (no tenemos onTertiary token).
  badge: {
    paddingHorizontal: spacing.unit * 1.5,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.tertiaryFixedDim,
  },
  badgeText: {
    ...typography.labelSm,
    color: colors.onPrimaryFixed,
    fontSize: 10,
    letterSpacing: 0.5,
    fontWeight: '700',
  },
});

export default ProofCard;
