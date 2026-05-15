// app/admin/payments/_components/PaymentDetailModal.js
// ISSY Admin - PaymentDetailModal (Sprint 3 D5)
//
// Modal de detalle por-residente. Recibe UN community_payment y muestra:
//   - Profile card del residente (nombre, casa, rol)
//   - Main payment card (monto grande, badge de status, fecha)
//   - Breakdown simple (charge.title + amount + total)
//   - Acciones (Registrar Efectivo funcional; otras placeholder)
//   - Historial reciente del residente (últimos pagos paid)
//
// El modal **NO reemplaza** al ChargeDetailModal legacy (que muestra cobro
// padre con stats). Coexisten: legacy queda para refactor futuro; nuevo
// se abre desde Lista-Cobros via ChargesTab.
//
// Acciones funcionales (D5):
//   - Registrar Efectivo → endpoint nuevo /admin/payments/:id/register-cash
//
// Acciones placeholder (planificadas):
//   - Tarjeta → payWithCard filtra por user_id===req.user.id, admin no puede invocarlo
//   - Adjuntar Comprobante → submitProofOfPayment mismo problema
//   - Generar Link de Pago → Sprint D7 (Clinpays)
//   - Mostrar QR → Sprint D8 (reusa link)
//   - Enviar Recordatorio → Sprint D6 (backend nuevo)

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  X,
  Banknote,
  CreditCard,
  Link as LinkIcon,
  QrCode,
  Paperclip,
  Bell,
  Calendar,
  CheckCircle2,
} from 'lucide-react-native';
import { colors, spacing, typography, radii } from '../_styles/theme';
import {
  registerCashPayment as registerCashPaymentApi,
  sendPaymentReminder as sendReminderApi,
} from '../../../../src/services/api';
import usePayments from '../_hooks/usePayments';

// =============== Helpers locales ===============

const MONTHS_ES_LONG = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MONTHS_ES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const formatLongDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS_ES_LONG[d.getUTCMonth()]}, ${d.getUTCFullYear()}`;
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS_ES_SHORT[d.getUTCMonth()]}`;
};

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

const formatCurrency = (amount, currency) => {
  const symbol = currency === 'USD' ? '$' : 'L';
  const n = parseFloat(amount || 0);
  return `${symbol} ${n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const ROLE_LABELS = {
  owner: 'Propietario',
  tenant: 'Inquilino',
  family: 'Familiar',
  admin: 'Administrador',
};
const roleLabel = (role) => ROLE_LABELS[role] || 'Residente';

const STATUS_LABEL = {
  paid: 'PAGADO',
  pending: 'PENDIENTE',
  proof_submitted: 'EN VERIFICACIÓN',
  rejected: 'RECHAZADO',
  cancelled: 'CANCELADO',
  not_started: 'NO INICIADO',
};

const getInitial = (name) => (name && typeof name === 'string' && name.length > 0 ? name[0].toUpperCase() : '?');

// =============== Sub-componente: Profile Card ===============

function ResidentProfileCard({ user, unit }) {
  const photo = user?.profile_photo_url || null;
  const name = user?.name || 'Residente';
  const unitNumber = unit?.unit_number;
  const role = roleLabel(unit?.role);
  const subtitle = unitNumber ? `Casa ${unitNumber} • ${role}` : role;

  return (
    <View style={styles.profileCard}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.profileAvatar} />
      ) : (
        <View style={[styles.profileAvatar, styles.profileAvatarPlaceholder]}>
          <Text style={styles.profileAvatarInitial}>{getInitial(name)}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.profileName} numberOfLines={1}>{name}</Text>
        <Text style={styles.profileSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
    </View>
  );
}

// =============== Sub-componente: Main Payment Card ===============

function MainPaymentCard({ payment }) {
  const status = payment?.status || 'pending';
  const dueDate = payment?.charge?.due_date || null;
  const isOverdue =
    isDateInPast(dueDate) && status !== 'paid' && status !== 'cancelled';

  const badgeLabel = isOverdue ? 'VENCIDO' : (STATUS_LABEL[status] || status.toUpperCase());
  const badgeColor = isOverdue
    ? colors.error
    : status === 'paid'
    ? colors.primaryContainer
    : status === 'cancelled'
    ? colors.outline
    : status === 'proof_submitted'
    ? colors.secondaryContainer
    : status === 'rejected'
    ? colors.error
    : colors.tertiaryFixedDim;

  let dateLabel;
  if (status === 'paid' && payment.paid_at) {
    dateLabel = `Pagado el: ${formatLongDate(payment.paid_at)}`;
  } else if (isOverdue && dueDate) {
    dateLabel = `Venció el: ${formatLongDate(dueDate)}`;
  } else if (dueDate) {
    dateLabel = `Vence el: ${formatLongDate(dueDate)}`;
  } else {
    dateLabel = '';
  }

  return (
    <View style={[styles.mainCard, isOverdue && styles.mainCardOverdue]}>
      <Text style={styles.mainLabel}>TOTAL A PAGAR</Text>
      <Text style={styles.mainAmount}>{formatCurrency(payment?.amount, payment?.currency)}</Text>
      <Text style={styles.mainCurrency}>{payment?.currency || 'HNL'}</Text>
      <View style={[styles.statusBadge, { backgroundColor: badgeColor + '1a' }]}>
        <Text style={[styles.statusBadgeText, { color: badgeColor }]}>{badgeLabel}</Text>
      </View>
      {dateLabel ? (
        <View style={styles.mainDateRow}>
          <Calendar size={14} color={colors.onSurfaceVariant} strokeWidth={2} />
          <Text style={styles.mainDateText}>{dateLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

// =============== Sub-componente: Breakdown ===============

function BreakdownSection({ payment, t }) {
  // D5 versión simple (A del spec): charge.title + amount + total = amount.
  // No invento campos. Si más adelante hay surcharge/discount, los agregamos.
  const title = payment?.charge?.title || 'Cobro';
  const amount = payment?.amount;
  const currency = payment?.currency;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {t('admin.payments.detail.breakdown', 'Desglose de Conceptos')}
      </Text>
      <View style={styles.breakdownRow}>
        <Text style={styles.breakdownConcept} numberOfLines={2}>{title}</Text>
        <Text style={styles.breakdownAmount}>{formatCurrency(amount, currency)}</Text>
      </View>
      <View style={styles.breakdownDivider} />
      <View style={styles.breakdownRow}>
        <Text style={styles.breakdownTotalLabel}>
          {t('admin.payments.detail.total', 'Total Liquidación')}
        </Text>
        <Text style={styles.breakdownTotalAmount}>{formatCurrency(amount, currency)}</Text>
      </View>
    </View>
  );
}

// =============== Sub-componente: Action Buttons grid ===============

function ActionButton({ icon: Icon, label, primary, disabled, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionBtn,
        primary ? styles.actionBtnPrimary : styles.actionBtnSecondary,
        (disabled || pressed) && styles.actionBtnDisabled,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Icon
        size={22}
        color={primary ? colors.onPrimaryContainer : colors.onSurface}
        strokeWidth={2}
      />
      <Text
        style={[
          styles.actionBtnText,
          primary ? styles.actionBtnTextPrimary : styles.actionBtnTextSecondary,
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// =============== Sub-componente: Recent History ===============

function RecentHistory({ userId, t, currentPaymentId }) {
  // Pull últimos paid del residente. Pedimos 4 y descartamos el actual si aparece,
  // dejando hasta 3 visibles. Sin loadMore en D5 (placeholder de "Ver todo").
  const { data, loading } = usePayments({
    user_id: userId,
    status: 'paid',
    limit: 4,
  });

  const items = useMemo(
    () => (data || []).filter((p) => p.id !== currentPaymentId).slice(0, 3),
    [data, currentPaymentId]
  );

  if (!userId) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>
          {t('admin.payments.detail.recentHistory', 'Historial Reciente')}
        </Text>
        <Pressable disabled={true}>
          <Text style={[styles.linkText, styles.linkDisabled]}>
            {t('common.viewAll', 'Ver todo')}
          </Text>
        </Pressable>
      </View>
      {loading && items.length === 0 ? (
        <View style={styles.historyEmptyWrap}>
          <ActivityIndicator size="small" color={colors.onSurfaceVariant} />
        </View>
      ) : items.length === 0 ? (
        <Text style={styles.historyEmpty}>
          {t('admin.payments.detail.noHistory', 'Sin historial reciente')}
        </Text>
      ) : (
        items.map((p) => (
          <View key={p.id} style={styles.historyRow}>
            <CheckCircle2 size={16} color={colors.primaryContainer} strokeWidth={2} />
            <Text style={styles.historyTitle} numberOfLines={1}>
              {p.charge?.title || 'Cobro'}
            </Text>
            <Text style={styles.historyAmount}>
              {formatCurrency(p.verified_amount ?? p.amount, p.currency)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

// =============== Sub-componente: Cash Register Sub-Modal ===============

function CashRegisterSubModal({
  visible,
  payment,
  onClose,
  onSuccess,
  t,
}) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset state cuando se cierra
  React.useEffect(() => {
    if (visible && payment) {
      // Pre-poblar con monto del payment
      setAmount(String(payment.amount ?? ''));
      setNotes('');
    } else if (!visible) {
      setAmount('');
      setNotes('');
      setLoading(false);
    }
  }, [visible, payment]);

  const canConfirm = !loading && parseFloat(amount) > 0;

  const handleConfirm = async () => {
    if (!canConfirm || !payment?.id) return;
    setLoading(true);
    const result = await registerCashPaymentApi(payment.id, {
      amount: parseFloat(amount),
      notes: notes.trim() || undefined,
    });
    setLoading(false);
    if (!result.success) {
      Alert.alert(
        t('common.error', 'Error'),
        result.error || t('admin.payments.detail.cashError', 'No se pudo registrar el pago en efectivo')
      );
      return;
    }
    Alert.alert(
      t('common.success', 'Éxito'),
      t('admin.payments.detail.cashSuccess', 'Pago en efectivo registrado')
    );
    if (onSuccess) onSuccess(result.data);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.subModalOverlay}>
        <View style={styles.subModalCard}>
          <Text style={styles.subModalTitle}>
            {t('admin.payments.detail.cashTitle', 'Registrar pago en efectivo')}
          </Text>
          <Text style={styles.subModalSubtitle}>
            {t('admin.payments.detail.cashDesc', 'Confirmá el monto recibido y agregá notas si querés.')}
          </Text>

          <Text style={styles.subModalLabel}>
            {t('admin.payments.detail.amountLabel', 'Monto recibido')}
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.onSurfaceVariant}
            style={styles.subModalInput}
            editable={!loading}
          />

          <Text style={styles.subModalLabel}>
            {t('admin.payments.detail.notesLabel', 'Notas (opcional)')}
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t('admin.payments.detail.notesPlaceholder', 'Ej. Recibido en oficina, comprobante #123')}
            placeholderTextColor={colors.onSurfaceVariant}
            style={[styles.subModalInput, styles.subModalInputMulti]}
            multiline
            numberOfLines={3}
            maxLength={500}
            editable={!loading}
            textAlignVertical="top"
          />

          <View style={styles.subModalBtnRow}>
            <Pressable onPress={onClose} disabled={loading} style={styles.subModalBtnCancel}>
              <Text style={styles.subModalBtnCancelText}>
                {t('common.cancel', 'Cancelar')}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              disabled={!canConfirm}
              style={[styles.subModalBtnConfirm, !canConfirm && styles.subModalBtnDisabled]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.onPrimaryContainer} />
              ) : (
                <Text style={styles.subModalBtnConfirmText}>
                  {t('admin.payments.detail.cashConfirm', 'Confirmar pago')}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// =============== Main Component ===============

export function PaymentDetailModal({
  visible,
  payment,
  onClose,
  onRegisterCashSuccess,
}) {
  const { t } = useTranslation();
  const [cashModalVisible, setCashModalVisible] = useState(false);
  // Sprint 3 D6: loading state del botón "Enviar Recordatorio"
  const [reminderLoading, setReminderLoading] = useState(false);

  // Reset sub-modales / loading cuando se cierra el principal
  React.useEffect(() => {
    if (!visible) {
      setCashModalVisible(false);
      setReminderLoading(false);
    }
  }, [visible]);

  // Sprint 3 D6: handler real para "Enviar Recordatorio".
  // Confirmación → POST /admin/payments/:id/send-reminder → Alert resultado.
  // Backend hace throttle 1/día por payment; el caso 409 muestra mensaje
  // específico en lugar del genérico.
  const handleSendReminder = () => {
    if (!payment?.id || reminderLoading) return;
    Alert.alert(
      t('admin.payments.detail.reminderConfirmTitle', 'Enviar recordatorio'),
      t(
        'admin.payments.detail.reminderConfirmBody',
        `¿Enviar push notification a ${payment.user?.name || 'el residente'} para recordarle este cobro?`,
        { name: payment.user?.name || 'el residente' }
      ),
      [
        { text: t('common.cancel', 'Cancelar'), style: 'cancel' },
        {
          text: t('admin.payments.detail.send', 'Enviar'),
          onPress: async () => {
            setReminderLoading(true);
            const result = await sendReminderApi(payment.id);
            setReminderLoading(false);
            if (!result.success) {
              const errStr = result.error || '';
              // Caso throttle backend (409 con "already sent today")
              const isThrottled = errStr.includes('already sent today');
              // Caso sin push token (422)
              const isNoToken =
                errStr.includes('no valid push token') ||
                errStr.includes('No push token') ||
                errStr.includes('Resident user record not found');
              Alert.alert(
                t('common.error', 'Error'),
                isThrottled
                  ? t(
                      'admin.payments.detail.reminderThrottle',
                      'Ya se envió un recordatorio hoy a este residente. Esperá hasta mañana para enviar otro.'
                    )
                  : isNoToken
                  ? t(
                      'admin.payments.detail.reminderNoToken',
                      'El residente no tiene la app instalada o nunca habilitó notificaciones. No se pudo enviar el recordatorio.'
                    )
                  : errStr ||
                    t(
                      'admin.payments.detail.reminderError',
                      'No se pudo enviar el recordatorio.'
                    )
              );
              return;
            }
            Alert.alert(
              t('common.success', 'Éxito'),
              t(
                'admin.payments.detail.reminderSuccess',
                'Recordatorio enviado al residente.'
              )
            );
          },
        },
      ]
    );
  };

  if (!payment) {
    return null;
  }

  const status = payment?.status || 'pending';
  const isPaid = status === 'paid';
  const isCancelled = status === 'cancelled';
  const isProofSubmitted = status === 'proof_submitted';
  const canRegisterCash = !isPaid && !isCancelled;

  const placeholderAlert = (label) => {
    Alert.alert(
      t('common.comingSoon', 'Próximamente'),
      t(
        'admin.payments.detail.comingSoonMsg',
        `"${label}" se habilitará en un próximo sprint.`,
        { label }
      )
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerBtn} hitSlop={8}>
            <ArrowLeft size={22} color={colors.onSurface} strokeWidth={2} />
          </Pressable>
          <Text style={styles.headerTitle}>
            {t('admin.payments.detail.title', 'Detalle de Cobro')}
          </Text>
          <Pressable onPress={onClose} style={styles.headerBtn} hitSlop={8}>
            <X size={22} color={colors.onSurfaceVariant} strokeWidth={2} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Profile */}
          <ResidentProfileCard user={payment.user} unit={payment.unit} />

          {/* Main payment card */}
          <MainPaymentCard payment={payment} />

          {/* Breakdown */}
          <BreakdownSection payment={payment} t={t} />

          {/* Acciones (oculto si pagado/cancelado) */}
          {isPaid ? (
            <View style={[styles.section, styles.paidNoticeWrap]}>
              <CheckCircle2 size={20} color={colors.primaryContainer} strokeWidth={2} />
              <Text style={styles.paidNoticeText}>
                {t('admin.payments.detail.alreadyPaid', 'Este cobro ya está pagado')}
              </Text>
            </View>
          ) : isCancelled ? (
            <View style={[styles.section, styles.cancelledNoticeWrap]}>
              <Text style={styles.cancelledNoticeText}>
                {t('admin.payments.detail.cancelledNotice', 'Este cobro fue cancelado')}
              </Text>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('admin.payments.detail.options', 'Opciones de Cobro')}
              </Text>
              {isProofSubmitted ? (
                <View style={styles.banner}>
                  <Text style={styles.bannerText}>
                    {t(
                      'admin.payments.detail.proofPendingBanner',
                      'Pendiente de verificación. Podés registrar efectivo si preferís ese método.'
                    )}
                  </Text>
                </View>
              ) : null}

              <View style={styles.actionsGrid}>
                <ActionButton
                  icon={Banknote}
                  label={t('admin.payments.detail.registerCash', 'Registrar Efectivo')}
                  primary={true}
                  disabled={!canRegisterCash}
                  onPress={() => setCashModalVisible(true)}
                />
                <ActionButton
                  icon={CreditCard}
                  label={t('admin.payments.detail.cardLabel', 'Tarjeta')}
                  primary={false}
                  disabled={false}
                  onPress={() => placeholderAlert(t('admin.payments.detail.cardLabel', 'Tarjeta'))}
                />
                <ActionButton
                  icon={LinkIcon}
                  label={t('admin.payments.detail.linkLabel', 'Generar Link')}
                  primary={false}
                  disabled={false}
                  onPress={() => placeholderAlert(t('admin.payments.detail.linkLabel', 'Generar Link'))}
                />
                <ActionButton
                  icon={QrCode}
                  label={t('admin.payments.detail.qrLabel', 'Mostrar QR')}
                  primary={false}
                  disabled={false}
                  onPress={() => placeholderAlert(t('admin.payments.detail.qrLabel', 'Mostrar QR'))}
                />
              </View>

              {/* Adjuntar Comprobante + Enviar Recordatorio */}
              <Pressable
                onPress={() => placeholderAlert(t('admin.payments.detail.attachProof', 'Adjuntar Comprobante'))}
                style={styles.attachBtn}
              >
                <Paperclip size={18} color={colors.secondaryContainer} strokeWidth={2} />
                <Text style={styles.attachBtnText}>
                  {t('admin.payments.detail.attachProof', 'Adjuntar Comprobante')}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSendReminder}
                disabled={reminderLoading}
                style={[
                  styles.reminderBtn,
                  reminderLoading && styles.reminderBtnDisabled,
                ]}
              >
                {reminderLoading ? (
                  <ActivityIndicator size="small" color={colors.onSurfaceVariant} />
                ) : (
                  <Bell size={16} color={colors.onSurfaceVariant} strokeWidth={2} />
                )}
                <Text style={styles.reminderBtnText}>
                  {t('admin.payments.detail.sendReminder', 'Enviar Recordatorio')}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Historial reciente */}
          <RecentHistory
            userId={payment?.user_id}
            currentPaymentId={payment?.id}
            t={t}
          />
        </ScrollView>

        {/* Cash sub-modal */}
        <CashRegisterSubModal
          visible={cashModalVisible}
          payment={payment}
          onClose={() => setCashModalVisible(false)}
          onSuccess={() => {
            // 1. cerrar el sub-modal lo hace handleConfirm via onClose
            // 2. avisar al padre para refetch lista
            if (onRegisterCashSuccess) onRegisterCashSuccess();
            // 3. cerrar el modal principal también — el payment ya cambió de estado
            onClose();
          }}
          t={t}
        />
      </SafeAreaView>
    </Modal>
  );
}

// =============== Styles ===============

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerPadding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: spacing.containerPadding,
    paddingVertical: 16,
    gap: 16,
    paddingBottom: 48,
  },

  // Profile
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  profileAvatarPlaceholder: {
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarInitial: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  profileName: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
  },
  profileSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },

  // Main card
  mainCard: {
    padding: 20,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xl,
    alignItems: 'flex-start',
    gap: 6,
  },
  mainCardOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  mainLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  mainAmount: {
    ...typography.displayLg,
    color: colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  mainCurrency: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: -4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
    marginTop: 4,
  },
  statusBadgeText: {
    ...typography.labelSm,
    fontWeight: '700',
  },
  mainDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  mainDateText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },

  // Sections (breakdown, opciones, historial)
  section: {
    padding: 16,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
    gap: 12,
  },
  sectionTitle: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Breakdown
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  breakdownConcept: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  breakdownAmount: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    opacity: 0.5,
  },
  breakdownTotalLabel: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
  },
  breakdownTotalAmount: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Banner
  banner: {
    padding: 10,
    backgroundColor: colors.tertiaryFixedDim + '1a',
    borderRadius: radii.md,
  },
  bannerText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },

  // Acciones grid
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '48%',
    padding: 14,
    borderRadius: radii.lg,
    alignItems: 'center',
    gap: 6,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primaryContainer,
  },
  actionBtnSecondary: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    ...typography.labelMd,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionBtnTextPrimary: {
    color: colors.onPrimaryContainer,
  },
  actionBtnTextSecondary: {
    color: colors.onSurface,
  },

  // Adjuntar comprobante
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.secondaryContainer,
  },
  attachBtnText: {
    ...typography.bodyMd,
    color: colors.secondaryContainer,
    fontWeight: '600',
  },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  reminderBtnDisabled: {
    opacity: 0.5,
  },
  reminderBtnText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },

  // Paid / cancelled notice
  paidNoticeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paidNoticeText: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
    flex: 1,
  },
  cancelledNoticeWrap: {
    alignItems: 'center',
  },
  cancelledNoticeText: {
    ...typography.bodyLg,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },

  // Historial
  linkText: {
    ...typography.labelMd,
    color: colors.primaryContainer,
    fontWeight: '600',
  },
  linkDisabled: {
    opacity: 0.4,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  historyTitle: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  historyAmount: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
  },
  historyEmpty: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  historyEmptyWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },

  // Cash sub-modal
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  subModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xl,
    padding: 20,
    gap: 10,
  },
  subModalTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  subModalSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  subModalLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: 6,
  },
  subModalInput: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.md,
    padding: 12,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  subModalInputMulti: {
    minHeight: 70,
  },
  subModalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  subModalBtnCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  subModalBtnCancelText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  subModalBtnConfirm: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.primaryContainer,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subModalBtnDisabled: {
    opacity: 0.5,
  },
  subModalBtnConfirmText: {
    ...typography.bodyMd,
    color: colors.onPrimaryContainer,
    fontWeight: '700',
  },
});

export default PaymentDetailModal;
