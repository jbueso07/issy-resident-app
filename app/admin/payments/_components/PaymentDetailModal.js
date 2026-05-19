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
  Share,
  Dimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  Mail,
  Phone,
  Share2,
  XCircle,
  // Hotfix Android Play Store: `Download` removido — el botón fue eliminado
  // del visor de comprobantes junto con el permiso READ_MEDIA_IMAGES.
} from 'lucide-react-native';
// Sprint 3 hotfix commit 2: para descarga + share del comprobante (visor).
// Patrón portado de ChargeDetailModal legacy (D6 stack), libs ya instaladas.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
// Sprint 3 hotfix commit 2 (upgrade visor):
//   - react-native-image-zoom-viewer para zoom pinch + double-tap nativo.
//     Decisión: usamos esta lib (no zoom-toolkit) porque NO requiere
//     reanimated (proyecto no la tiene instalada y agregarla implica
//     crear babel.config.js + plugin nuevo). Usa RN Animated + PanResponder
//     interno, compat con newArch.
//
// Hotfix Android Play Store: `import * as MediaLibrary from 'expo-media-library'`
// removido. Lo usaba el botón Download del visor (saveToLibraryAsync), pero
// MediaLibrary requiere READ_MEDIA_IMAGES en Android 13+ y ese permiso ahora
// está blockedPermissions a nivel manifest (Google Play rechazó la declaración
// de uso puntual). El share sheet del sistema sigue ofreciendo "Guardar en
// Fotos" como opción nativa sin requerir el permiso.
import ImageViewer from 'react-native-image-zoom-viewer';
import { colors, spacing, typography, radii } from '../_styles/theme';
import {
  registerCashPayment as registerCashPaymentApi,
  sendPaymentReminder as sendReminderApi,
  createPaymentLink as createLinkApi,
  // Sprint 3 hotfix commit 2: cancel individual payment (1 residente).
  cancelPayment as cancelPaymentApi,
} from '../../../../src/services/api';
import usePayments from '../_hooks/usePayments';

// Hotfix 4: width explícito para el ImageViewer. react-native-image-zoom-viewer
// @3.0.1 no se mide bien dentro de Modal fullScreen — necesita un width
// concreto. Solo width; el height lo da el flex: 1 del padre.
const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

  // Sprint 3 hotfix commit 2: info usuario extendida.
  //   - email viene del JOIN user (siempre disponible si el user existe).
  //   - phone agregado al SELECT del backend en este mismo commit.
  //   - joined_at viene del user_locations join (en payment.unit.joined_at).
  // Si algún campo viene null/undefined → "—" como fallback.
  const email = user?.email || null;
  const phone = user?.phone || null;
  const joinedAt = unit?.joined_at || null;
  const joinedLabel = joinedAt ? formatLongDate(joinedAt) : null;

  return (
    <View style={styles.profileCard}>
      <View style={styles.profileTopRow}>
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

      {/* Info extendida — email, phone, joined_at */}
      <View style={styles.profileExtraWrap}>
        <View style={styles.profileExtraRow}>
          <Mail size={14} color={colors.onSurfaceVariant} strokeWidth={2} />
          <Text style={styles.profileExtraText} numberOfLines={1}>
            {email || '—'}
          </Text>
        </View>
        <View style={styles.profileExtraRow}>
          <Phone size={14} color={colors.onSurfaceVariant} strokeWidth={2} />
          <Text style={styles.profileExtraText} numberOfLines={1}>
            {phone || '—'}
          </Text>
        </View>
        <View style={styles.profileExtraRow}>
          <Calendar size={14} color={colors.onSurfaceVariant} strokeWidth={2} />
          <Text style={styles.profileExtraText} numberOfLines={1}>
            Miembro desde: {joinedLabel || '—'}
          </Text>
        </View>
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

function RecentHistory({ userId, t, currentPaymentId, locationId }) {
  // Pull últimos paid del residente. Pedimos 4 y descartamos el actual si aparece,
  // dejando hasta 3 visibles. Sin loadMore en D5 (placeholder de "Ver todo").
  // Hotfix super admin: location_id explícito — sin él, super admin (sin
  // req.user.location_id) caía al fallback del backend con 0 resultados.
  // Mismo patrón que ChargesTab/ProofsTab post-hotfix.
  const { data, loading } = usePayments({
    user_id: userId,
    status: 'paid',
    limit: 4,
    location_id: locationId,
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
    // Hotfix sistémico super admin: pasar payment.location_id para que el
    // backend lo resuelva via getAdminLocationId (req.user.location_id es
    // null para super admin).
    const result = await registerCashPaymentApi(
      payment.id,
      {
        amount: parseFloat(amount),
        notes: notes.trim() || undefined,
      },
      payment.location_id
    );
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

// =============== Sub-componente: Payment Link Sub-Modal (Sprint 3 D7) ===

function PaymentLinkSubModal({ visible, payment, onClose, t }) {
  // State machine local: 'form' | 'loading' | 'result' | 'error'
  const [phase, setPhase] = useState('form');
  const [sendEmail, setSendEmail] = useState(true);
  const [linkData, setLinkData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const residentEmail = payment?.user?.email || null;
  const hasEmail = !!residentEmail;

  // Reset cuando se cierra
  React.useEffect(() => {
    if (!visible) {
      setPhase('form');
      setSendEmail(true);
      setLinkData(null);
      setErrorMsg('');
      setCopied(false);
    }
  }, [visible]);

  // Si el residente NO tiene email, forzar sendEmail=false (checkbox queda disabled)
  React.useEffect(() => {
    if (visible && !hasEmail) {
      setSendEmail(false);
    }
  }, [visible, hasEmail]);

  const handleGenerate = async () => {
    if (!payment?.id) return;
    setPhase('loading');
    // Hotfix sistémico super admin: pasar location_id.
    const result = await createLinkApi(payment.id, { sendEmail }, payment.location_id);
    if (!result.success) {
      setErrorMsg(
        result.error ||
          t('admin.payments.detail.linkError', 'No se pudo generar el link')
      );
      setPhase('error');
      return;
    }
    setLinkData(result.data);
    setPhase('result');
  };

  const handleCopy = async () => {
    if (!linkData?.url) return;
    try {
      await Clipboard.setStringAsync(linkData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard error:', err);
    }
  };

  const handleShare = async () => {
    if (!linkData?.url) return;
    try {
      const chargeTitle = payment?.charge?.title || 'Pago pendiente';
      await Share.share({
        message: t(
          'admin.payments.detail.linkShareMessage',
          `${chargeTitle}: ${linkData.url}`,
          { title: chargeTitle, url: linkData.url }
        ),
        url: linkData.url, // iOS-only, mejora preview
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.subModalOverlay}>
        <View style={styles.subModalCard}>
          {/* -------- PHASE: form -------- */}
          {phase === 'form' && (
            <>
              <Text style={styles.subModalTitle}>
                {t('admin.payments.detail.linkTitle', 'Generar Link de Pago')}
              </Text>
              <Text style={styles.subModalSubtitle}>
                {t(
                  'admin.payments.detail.linkDesc',
                  'Se generará un link de Clinpays válido por 24 horas. El residente puede pagar desde su navegador.'
                )}
              </Text>

              {/* Resumen */}
              <View style={styles.linkSummaryBox}>
                <Text style={styles.linkSummaryLabel}>
                  {t('admin.payments.detail.linkSummaryAmount', 'Monto')}
                </Text>
                <Text style={styles.linkSummaryValue}>
                  {payment?.currency || 'HNL'}{' '}
                  {parseFloat(payment?.amount || 0).toFixed(2)}
                </Text>
                <Text style={styles.linkSummaryLabel}>
                  {t('admin.payments.detail.linkSummaryConcept', 'Concepto')}
                </Text>
                <Text style={styles.linkSummaryValue}>
                  {payment?.charge?.title || '—'}
                </Text>
              </View>

              {/* Checkbox email */}
              <Pressable
                onPress={() => hasEmail && setSendEmail((v) => !v)}
                disabled={!hasEmail}
                style={[
                  styles.checkboxRow,
                  !hasEmail && styles.checkboxRowDisabled,
                ]}
              >
                <View style={[styles.checkbox, sendEmail && styles.checkboxChecked]}>
                  {sendEmail && (
                    <CheckCircle2
                      size={14}
                      color={colors.onPrimaryContainer}
                      strokeWidth={2.5}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkboxLabel}>
                    {t(
                      'admin.payments.detail.linkSendEmail',
                      'Enviar por email al residente'
                    )}
                  </Text>
                  {hasEmail ? (
                    <Text style={styles.checkboxSublabel}>{residentEmail}</Text>
                  ) : (
                    <Text style={styles.checkboxSublabelMuted}>
                      {t(
                        'admin.payments.detail.linkNoEmail',
                        'El residente no tiene email registrado'
                      )}
                    </Text>
                  )}
                </View>
              </Pressable>

              <View style={styles.subModalBtnRow}>
                <Pressable onPress={onClose} style={styles.subModalBtnCancel}>
                  <Text style={styles.subModalBtnCancelText}>
                    {t('common.cancel', 'Cancelar')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleGenerate}
                  style={styles.subModalBtnConfirm}
                >
                  <Text style={styles.subModalBtnConfirmText}>
                    {t('admin.payments.detail.linkGenerate', 'Generar')}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {/* -------- PHASE: loading -------- */}
          {phase === 'loading' && (
            <View style={styles.linkLoadingWrap}>
              <ActivityIndicator size="large" color={colors.primaryContainer} />
              <Text style={styles.linkLoadingText}>
                {t('admin.payments.detail.linkGenerating', 'Generando link...')}
              </Text>
            </View>
          )}

          {/* -------- PHASE: result -------- */}
          {phase === 'result' && linkData && (
            <>
              <Text style={styles.subModalTitle}>
                {t('admin.payments.detail.linkReady', 'Link Generado')}
              </Text>
              <Text style={styles.subModalSubtitle}>
                {t(
                  'admin.payments.detail.linkReadyDesc',
                  'Compartí el link con el residente. Vence en 24 horas.'
                )}
              </Text>

              <View style={styles.linkUrlBox}>
                <Text
                  style={styles.linkUrlText}
                  numberOfLines={2}
                  ellipsizeMode="middle"
                >
                  {linkData.url}
                </Text>
              </View>

              {/* Feedback email */}
              {linkData.email?.sent ? (
                <View style={styles.linkEmailSentBadge}>
                  <CheckCircle2
                    size={14}
                    color={colors.primaryContainer}
                    strokeWidth={2.5}
                  />
                  <Text style={styles.linkEmailSentText}>
                    {t(
                      'admin.payments.detail.linkEmailSent',
                      `Enviado a ${linkData.email.recipient}`,
                      { email: linkData.email.recipient }
                    )}
                  </Text>
                </View>
              ) : null}
              {linkData.email?.requested &&
              !linkData.email?.sent &&
              linkData.email?.skipped_reason === 'resident_has_no_email' ? (
                <Text style={styles.linkEmailNoteMuted}>
                  {t(
                    'admin.payments.detail.linkEmailSkipped',
                    'El residente no tiene email registrado. Compartí el link manualmente.'
                  )}
                </Text>
              ) : null}
              {linkData.email?.requested &&
              !linkData.email?.sent &&
              linkData.email?.error ? (
                <Text style={styles.linkEmailNoteMuted}>
                  {t(
                    'admin.payments.detail.linkEmailError',
                    'No se pudo enviar el email automáticamente. Compartí el link manualmente.'
                  )}
                </Text>
              ) : null}

              <View style={styles.linkActionsRow}>
                <Pressable onPress={handleCopy} style={styles.linkActionBtn}>
                  <Text style={styles.linkActionBtnText}>
                    {copied
                      ? t('admin.payments.detail.linkCopied', '¡Copiado!')
                      : t('admin.payments.detail.linkCopy', 'Copiar')}
                  </Text>
                </Pressable>
                <Pressable onPress={handleShare} style={styles.linkActionBtn}>
                  <Text style={styles.linkActionBtnText}>
                    {t('admin.payments.detail.linkShare', 'Compartir')}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={onClose}
                style={[
                  styles.subModalBtnConfirm,
                  { marginTop: spacing.unit * 3, alignSelf: 'stretch' },
                ]}
              >
                <Text style={styles.subModalBtnConfirmText}>
                  {t('common.close', 'Cerrar')}
                </Text>
              </Pressable>
            </>
          )}

          {/* -------- PHASE: error -------- */}
          {phase === 'error' && (
            <>
              <Text style={styles.subModalTitle}>{t('common.error', 'Error')}</Text>
              <Text style={styles.subModalSubtitle}>{errorMsg}</Text>
              <View style={styles.subModalBtnRow}>
                <Pressable onPress={onClose} style={styles.subModalBtnCancel}>
                  <Text style={styles.subModalBtnCancelText}>
                    {t('common.close', 'Cerrar')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setPhase('form')}
                  style={styles.subModalBtnConfirm}
                >
                  <Text style={styles.subModalBtnConfirmText}>
                    {t('common.retry', 'Reintentar')}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// =============== Sub-componente: Payment QR Sub-Modal (Sprint 3 D8) ===

function PaymentQRSubModal({ visible, payment, onClose, t }) {
  // State machine local: 'loading' | 'result' | 'error'.
  // No tiene 'form' — el link se genera automáticamente al abrir.
  const [phase, setPhase] = useState('loading');
  const [linkData, setLinkData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Auto-generar link al abrir el modal. Reusa endpoint create-link de D7
  // con sendEmail=false (no queremos mandar email también).
  React.useEffect(() => {
    let cancelled = false;

    async function generateLink() {
      if (!payment?.id) return;
      setPhase('loading');
      // Hotfix sistémico super admin: pasar location_id.
      const result = await createLinkApi(
        payment.id,
        { sendEmail: false },
        payment.location_id
      );
      if (cancelled) return;
      if (!result.success) {
        setErrorMsg(
          result.error ||
            t('admin.payments.detail.qrError', 'No se pudo generar el QR')
        );
        setPhase('error');
        return;
      }
      setLinkData(result.data);
      setPhase('result');
    }

    if (visible) {
      generateLink();
    }

    return () => {
      cancelled = true;
    };
  }, [visible, payment?.id, t]);

  // Reset cuando se cierra
  React.useEffect(() => {
    if (!visible) {
      setPhase('loading');
      setLinkData(null);
      setErrorMsg('');
      setCopied(false);
    }
  }, [visible]);

  const handleCopy = async () => {
    if (!linkData?.url) return;
    try {
      await Clipboard.setStringAsync(linkData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard error:', err);
    }
  };

  const handleRetry = () => {
    if (!payment?.id) return;
    setPhase('loading');
    setErrorMsg('');
    (async () => {
      // Hotfix sistémico super admin: pasar location_id.
      const result = await createLinkApi(
        payment.id,
        { sendEmail: false },
        payment.location_id
      );
      if (!result.success) {
        setErrorMsg(
          result.error ||
            t('admin.payments.detail.qrError', 'No se pudo generar el QR')
        );
        setPhase('error');
        return;
      }
      setLinkData(result.data);
      setPhase('result');
    })();
  };

  // Resumen para mostrar debajo del QR
  const residentName =
    payment?.user?.name || t('admin.payments.detail.qrResident', 'Residente');
  const amount = parseFloat(payment?.amount || 0).toFixed(2);
  const currency = payment?.currency || 'HNL';
  const chargeTitle = payment?.charge?.title || '—';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.subModalOverlay}>
        <View style={styles.subModalCard}>
          <Text style={styles.subModalTitle}>
            {t('admin.payments.detail.qrTitle', 'QR de Pago')}
          </Text>

          {/* -------- PHASE: loading -------- */}
          {phase === 'loading' && (
            <View style={styles.qrLoadingWrap}>
              <ActivityIndicator size="large" color={colors.primaryContainer} />
              <Text style={styles.qrLoadingText}>
                {t('admin.payments.detail.qrGenerating', 'Generando QR...')}
              </Text>
            </View>
          )}

          {/* -------- PHASE: result -------- */}
          {phase === 'result' && linkData?.url && (
            <>
              <Text style={styles.subModalSubtitle}>
                {t(
                  'admin.payments.detail.qrDesc',
                  'El residente puede escanear este QR para pagar. Vence en 24 horas.'
                )}
              </Text>

              {/* QR centrado con fondo blanco fijo para máximo contraste de scan.
                  Los colores son hardcoded (no del theme MD3) intencionalmente. */}
              <View style={styles.qrWrap}>
                <QRCode
                  value={linkData.url}
                  size={240}
                  backgroundColor="#ffffff"
                  color="#000000"
                />
              </View>

              {/* Info debajo del QR */}
              <View style={styles.qrInfoBox}>
                <Text style={styles.qrInfoLabel}>
                  {t('admin.payments.detail.qrInfoResident', 'Residente')}
                </Text>
                <Text style={styles.qrInfoValue}>{residentName}</Text>

                <Text style={styles.qrInfoLabel}>
                  {t('admin.payments.detail.qrInfoAmount', 'Monto')}
                </Text>
                <Text style={styles.qrInfoValue}>
                  {currency} {amount}
                </Text>

                <Text style={styles.qrInfoLabel}>
                  {t('admin.payments.detail.qrInfoConcept', 'Concepto')}
                </Text>
                <Text style={styles.qrInfoValue}>{chargeTitle}</Text>
              </View>

              {/* URL truncada + botón Copiar */}
              <View style={styles.qrUrlBox}>
                <Text
                  style={styles.qrUrlText}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {linkData.url}
                </Text>
                <Pressable onPress={handleCopy} style={styles.qrCopyBtn}>
                  <Text style={styles.qrCopyBtnText}>
                    {copied
                      ? t('admin.payments.detail.linkCopied', '¡Copiado!')
                      : t('admin.payments.detail.linkCopy', 'Copiar')}
                  </Text>
                </Pressable>
              </View>

              <Pressable onPress={onClose} style={styles.subModalBtnConfirm}>
                <Text style={styles.subModalBtnConfirmText}>
                  {t('common.close', 'Cerrar')}
                </Text>
              </Pressable>
            </>
          )}

          {/* -------- PHASE: error -------- */}
          {phase === 'error' && (
            <>
              <Text style={styles.subModalSubtitle}>{errorMsg}</Text>
              <View style={styles.subModalBtnRow}>
                <Pressable onPress={onClose} style={styles.subModalBtnCancel}>
                  <Text style={styles.subModalBtnCancelText}>
                    {t('common.close', 'Cerrar')}
                  </Text>
                </Pressable>
                <Pressable onPress={handleRetry} style={styles.subModalBtnConfirm}>
                  <Text style={styles.subModalBtnConfirmText}>
                    {t('common.retry', 'Reintentar')}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
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
  // Sprint 3 hotfix commit 2: callback compartido tras cancel-payment
  // exitoso. Mismo contrato que onRegisterCashSuccess — index.js debería
  // refrescar la lista de cobros + cerrar el modal.
  // Hotfix commit 3: comment editado — el otro caso (cancel-charge) ya no
  // existe porque se removió el botón "Cancelar Cobro Completo".
  onCancelSuccess,
  // Hotfix commit 3: removida la prop `onCancelCharge` — el botón
  // "Cancelar Cobro Completo" se eliminó (UX confuso en vista por-residente).
}) {
  const { t } = useTranslation();
  const [cashModalVisible, setCashModalVisible] = useState(false);
  // Sprint 3 D6: loading state del botón "Enviar Recordatorio"
  const [reminderLoading, setReminderLoading] = useState(false);
  // Sprint 3 D7: visibility del sub-modal de "Generar Link de Pago"
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  // Sprint 3 D8: visibility del sub-modal de "Mostrar QR"
  const [qrModalVisible, setQrModalVisible] = useState(false);
  // Sprint 3 hotfix commit 2: visor fullscreen del comprobante de pago
  const [proofViewerVisible, setProofViewerVisible] = useState(false);
  // Sprint 3 hotfix commit 2: loading state de los 2 cancel buttons
  const [cancelLoading, setCancelLoading] = useState(false);

  // Reset sub-modales / loading cuando se cierra el principal
  React.useEffect(() => {
    if (!visible) {
      setCashModalVisible(false);
      setReminderLoading(false);
      setLinkModalVisible(false);
      setQrModalVisible(false);
      setProofViewerVisible(false);
      setCancelLoading(false);
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
            // Hotfix sistémico super admin: pasar location_id.
            const result = await sendReminderApi(payment.id, payment.location_id);
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

  // Sprint 3 hotfix commit 2: handler "Cancelar este Pago" (1 residente).
  // Alert.prompt iOS-only para razón. En Android se usa Alert.alert (sin prompt
  // de texto nativo) — la razón queda vacía allá. Aceptable para hotfix.
  const handleCancelThisPayment = () => {
    if (!payment?.id || cancelLoading) return;
    const doCancel = async (reason) => {
      setCancelLoading(true);
      try {
        const result = await cancelPaymentApi(
          payment.id,
          reason || '',
          payment.location_id
        );
        if (!result || !result.success) {
          Alert.alert(
            t('common.error', 'Error'),
            (result && result.error) ||
              t('admin.payments.detail.cancelPaymentError', 'No se pudo cancelar el pago')
          );
          return;
        }
        Alert.alert(
          t('common.success', 'Éxito'),
          t('admin.payments.detail.cancelPaymentSuccess', 'Pago cancelado')
        );
        if (onCancelSuccess) onCancelSuccess(result.data);
        onClose();
      } finally {
        setCancelLoading(false);
      }
    };

    if (Alert.prompt) {
      // iOS: prompt nativo con campo de texto para la razón
      Alert.prompt(
        t('admin.payments.detail.cancelPaymentTitle', 'Cancelar este Pago'),
        t(
          'admin.payments.detail.cancelPaymentBody',
          'Solo se cancela este pago (1 residente). Ingresá razón opcional.'
        ),
        [
          { text: t('common.cancel', 'Cancelar'), style: 'cancel' },
          {
            text: t('admin.payments.detail.confirm', 'Confirmar'),
            style: 'destructive',
            onPress: (reason) => doCancel(reason),
          },
        ],
        'plain-text'
      );
    } else {
      // Android: confirm sin razón
      Alert.alert(
        t('admin.payments.detail.cancelPaymentTitle', 'Cancelar este Pago'),
        t(
          'admin.payments.detail.cancelPaymentBodyAndroid',
          'Solo se cancela este pago (1 residente).'
        ),
        [
          { text: t('common.cancel', 'Cancelar'), style: 'cancel' },
          {
            text: t('admin.payments.detail.confirm', 'Confirmar'),
            style: 'destructive',
            onPress: () => doCancel(''),
          },
        ]
      );
    }
  };

  // Hotfix commit 3: handler `handleCancelEntireCharge` eliminado junto al
  // botón "Cancelar Cobro Completo" (UX confuso en vista por-residente).

  // Sprint 3 hotfix commit 2 (upgrade visor): handler de Compartir.
  // El share descarga a cache local + abre el share-sheet del sistema, que
  // ofrece "Guardar en Fotos" como opción nativa (sin requerir permisos
  // explícitos de la app).
  //
  // Hotfix Android Play Store: removidos el state `proofDownloading`, el
  // hook `MediaLibrary.usePermissions`, y el handler `handleDownloadProof`.
  // El botón Download del visor se eliminó porque MediaLibrary.saveToLibraryAsync
  // requiere READ_MEDIA_IMAGES en Android 13+, permiso ahora blockedPermissions
  // a nivel manifest (Google Play rechazó uso puntual).
  const [proofSharing, setProofSharing] = useState(false);
  const proofUri = payment?.proof_url || payment?.proof_of_payment || null;

  const handleShareProof = async () => {
    if (!proofUri || proofSharing) return;
    try {
      setProofSharing(true);
      const filename = `comprobante_${Date.now()}.jpg`;
      const localUri = FileSystem.cacheDirectory + filename;
      const downloadResult = await FileSystem.downloadAsync(proofUri, localUri);
      if (downloadResult.status === 200) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'image/jpeg',
            dialogTitle: t(
              'admin.payments.detail.shareProof',
              'Compartir comprobante'
            ),
          });
        } else {
          Alert.alert(
            t('common.error', 'Error'),
            t(
              'admin.payments.detail.sharingNotAvailable',
              'Compartir no disponible'
            )
          );
        }
      }
    } catch (err) {
      console.error('Error sharing proof:', err);
      Alert.alert(
        t('common.error', 'Error'),
        t('admin.payments.detail.shareError', 'Error al compartir')
      );
    } finally {
      setProofSharing(false);
    }
  };

  // Hotfix Android Play Store: handler `handleDownloadProof` eliminado junto
  // al botón Download del visor. Usaba MediaLibrary.saveToLibraryAsync que
  // requiere READ_MEDIA_IMAGES en Android 13+, permiso ahora blockedPermissions.
  // El usuario puede guardar via Share → "Guardar en Fotos" del share sheet.

  if (!payment) {
    return null;
  }

  const status = payment?.status || 'pending';
  const isPaid = status === 'paid';
  const isCancelled = status === 'cancelled';
  const isProofSubmitted = status === 'proof_submitted';
  const canRegisterCash = !isPaid && !isCancelled;
  // Sprint 3 hotfix commit 2: los 2 cancel buttons visibles solo si el payment
  // no está ya en estado final (paid/cancelled).
  const canCancel = !isPaid && !isCancelled;

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

          {/* Sprint 3 hotfix commit 2: Visor de comprobantes (regresión).
              Existía en ChargeDetailModal legacy; recuperado acá. Solo se
              renderiza si el payment tiene proof_url (fallback chain a
              proof_of_payment per memory D2). Thumbnail tap → fullscreen. */}
          {(payment.proof_url || payment.proof_of_payment) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('admin.payments.detail.proofTitle', 'Comprobante de Pago')}
              </Text>
              <Pressable
                onPress={() => setProofViewerVisible(true)}
                style={styles.proofThumbWrap}
                accessibilityRole="button"
                accessibilityLabel={t('admin.payments.detail.openProof', 'Abrir comprobante')}
              >
                <Image
                  source={{ uri: payment.proof_url || payment.proof_of_payment }}
                  style={styles.proofThumbImg}
                  resizeMode="cover"
                />
              </Pressable>
              <Text style={styles.proofThumbHint}>
                {t('admin.payments.detail.tapToView', 'Tocá para ver, descargar o compartir')}
              </Text>
            </View>
          )}

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
                  onPress={() => setLinkModalVisible(true)}
                />
                <ActionButton
                  icon={QrCode}
                  label={t('admin.payments.detail.qrLabel', 'Mostrar QR')}
                  primary={false}
                  disabled={false}
                  onPress={() => setQrModalVisible(true)}
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

              {/* Sprint 3 hotfix commit 2: cancel button para el payment
                  individual (1 residente). El detalle del modal es por-residente,
                  así que solo cancelamos el pago de este residente.
                  Hotfix commit 3: removido el botón "Cancelar Cobro Completo"
                  (charge entero, todos los residentes) — UX confuso para una
                  vista por-residente. La acción a nivel charge debería vivir
                  en la pantalla de listado, no acá. */}
              {canCancel ? (
                <View style={styles.cancelBtnWrap}>
                  <Pressable
                    onPress={handleCancelThisPayment}
                    disabled={cancelLoading}
                    style={[
                      styles.cancelBtn,
                      cancelLoading && styles.cancelBtnDisabled,
                    ]}
                  >
                    {cancelLoading ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <XCircle size={16} color={colors.error} strokeWidth={2} />
                    )}
                    <Text style={styles.cancelBtnText}>
                      {t(
                        'admin.payments.detail.cancelThisPayment',
                        'Cancelar este Pago'
                      )}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          )}

          {/* Historial reciente */}
          {/* Hotfix super admin: pasamos location_id del propio payment para
              que el fetch de historial scope correctamente cuando el admin
              es super admin (req.user.location_id = null). */}
          <RecentHistory
            userId={payment?.user_id}
            currentPaymentId={payment?.id}
            locationId={payment?.location_id}
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

        {/* Sprint 3 D7: Payment Link sub-modal (Clinpays Option Lite) */}
        <PaymentLinkSubModal
          visible={linkModalVisible}
          payment={payment}
          onClose={() => setLinkModalVisible(false)}
          t={t}
        />

        {/* Sprint 3 D8: Payment QR sub-modal (reusa create-link con sendEmail=false) */}
        <PaymentQRSubModal
          visible={qrModalVisible}
          payment={payment}
          onClose={() => setQrModalVisible(false)}
          t={t}
        />

        {/* Sprint 3 hotfix commit 2: Proof Viewer fullscreen con zoom.
            Hotfix Android Play Store: props onDownload + downloading removidas
            junto con el botón Download del header. */}
        <ProofViewerSubModal
          visible={proofViewerVisible}
          uri={proofUri}
          onClose={() => setProofViewerVisible(false)}
          onShare={handleShareProof}
          sharing={proofSharing}
          t={t}
        />
      </SafeAreaView>
    </Modal>
  );
}

// =============== Sub-componente: Proof Viewer (Hotfix commit 2) ===============

/**
 * Visor fullscreen del comprobante. Sprint 3 hotfix commit 2 (upgrade):
 *   - Body: <ImageViewer> de react-native-image-zoom-viewer con zoom pinch
 *     + double-tap + pan nativo (RN Animated + PanResponder interno).
 *   - Header: 2 botones — Close (izq), Compartir (der).
 *
 * Hotfix Android Play Store: botón Download removido — el permiso
 * READ_MEDIA_IMAGES (que requiere MediaLibrary.saveToLibraryAsync para
 * Android 13+) ahora está blockedPermissions a nivel manifest. El usuario
 * puede guardar a galería via Share → "Guardar en Fotos" del share sheet.
 */
function ProofViewerSubModal({
  visible,
  uri,
  onClose,
  onShare,
  sharing,
  t,
}) {
  // Hotfix 4: useSafeAreaInsets en vez de SafeAreaView edges. El SafeAreaView
  // del react-native-safe-area-context se comporta inconsistente dentro de
  // <Modal presentationStyle="fullScreen"> — los edges={['top']} no
  // aplicaban el padding correctamente y los iconos del header quedaban
  // tapados por el status bar / Dynamic Island. El hook devuelve los insets
  // directamente, y aplicamos paddingTop manual a un <View> normal.
  // Hook debe llamarse al top-level (regla de hooks), por eso va antes del
  // early-return `if (!uri)`.
  const insets = useSafeAreaInsets();
  if (!uri) return null;
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.proofViewerContainer}>
        <View
          style={[styles.proofViewerSafeArea, { paddingTop: insets.top }]}
        >
          <View style={styles.proofViewerHeader}>
            <Pressable onPress={onClose} style={styles.proofViewerHeaderBtn} hitSlop={8}>
              <ArrowLeft size={24} color="#fff" strokeWidth={2} />
            </Pressable>
            <Text style={styles.proofViewerTitle}>
              {t('admin.payments.detail.proof', 'Comprobante')}
            </Text>
            <View style={styles.proofViewerHeaderActions}>
              {/* Hotfix Android Play Store: botón Download eliminado. Usaba
                  MediaLibrary.saveToLibraryAsync que requiere READ_MEDIA_IMAGES
                  en Android 13+, permiso ahora bloqueado a nivel manifest.
                  El usuario puede guardar via Share → "Guardar en Fotos" del
                  share sheet del sistema (iOS y Android lo ofrecen). */}
              <Pressable
                onPress={onShare}
                disabled={sharing}
                style={styles.proofViewerHeaderBtn}
                hitSlop={8}
                accessibilityLabel={t('admin.payments.detail.shareProof', 'Compartir comprobante')}
              >
                {sharing ? (
                  <ActivityIndicator size="small" color={colors.primaryContainer} />
                ) : (
                  <Share2 size={22} color={colors.primaryContainer} strokeWidth={2} />
                )}
              </Pressable>
            </View>
          </View>
          {/* Body: ImageViewer con flex: 1 + width explícito de SCREEN_WIDTH.
              Hotfix 4: removido el <View proofViewerImageWrap> envolvente
              porque react-native-image-zoom-viewer@3.0.1 tiene measurement
              bug cuando se anida dentro de View con alignItems/justifyContent
              center. ImageViewer pasa a ser hijo directo del View con
              flex:1 (padre) — su style {flex:1, width: SCREEN_WIDTH} le da
              las dimensiones que la lib internamente espera. */}
          <ImageViewer
            imageUrls={[{ url: uri }]}
            enableImageZoom
            enableSwipeDown={false}
            saveToLocalByLongPress={false}
            backgroundColor="#000"
            renderIndicator={() => null}
            loadingRender={() => (
              <ActivityIndicator size="large" color={colors.primaryContainer} />
            )}
            style={{ flex: 1, width: SCREEN_WIDTH }}
          />
        </View>
      </View>
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
  // Hotfix commit 2: ahora es columna para alojar topRow (avatar+name) +
  // extraWrap (email/phone/miembro desde) apilados verticalmente.
  profileCard: {
    padding: 16,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
    gap: 12,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  // Hotfix commit 2: info usuario extendida
  profileExtraWrap: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  profileExtraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileExtraText: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    flex: 1,
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

  // Sprint 3 D7: Payment Link sub-modal
  linkSummaryBox: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.md,
    padding: 12,
    gap: 4,
    marginVertical: 4,
  },
  linkSummaryLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  linkSummaryValue: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
    marginBottom: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  checkboxRowDisabled: {
    opacity: 0.5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  checkboxLabel: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '500',
  },
  checkboxSublabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  checkboxSublabelMuted: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginTop: 2,
  },
  linkLoadingWrap: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  linkLoadingText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  linkUrlBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    marginVertical: 8,
  },
  linkUrlText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  linkEmailSentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.primaryContainer + '1a',
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
  },
  linkEmailSentText: {
    ...typography.labelMd,
    color: colors.primaryContainer,
    fontWeight: '600',
  },
  linkEmailNoteMuted: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  linkActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  linkActionBtn: {
    flex: 1,
    backgroundColor: colors.secondaryContainer,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkActionBtnText: {
    ...typography.labelMd,
    color: colors.onSecondaryContainer,
    fontWeight: '700',
  },

  // Sprint 3 D8: Payment QR sub-modal
  qrLoadingWrap: {
    alignItems: 'center',
    paddingVertical: spacing.unit * 8,
  },
  qrLoadingText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.unit * 3,
  },
  qrWrap: {
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    padding: spacing.unit * 3,
    borderRadius: radii.md,
    marginVertical: spacing.unit * 3,
  },
  qrInfoBox: {
    backgroundColor: colors.surfaceContainerHigh,
    padding: spacing.unit * 3,
    borderRadius: radii.md,
    marginBottom: spacing.unit * 3,
  },
  qrInfoLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.unit * 1.5,
  },
  qrInfoValue: {
    ...typography.bodyLg,
    color: colors.onSurface,
    marginBottom: spacing.unit,
  },
  qrUrlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.unit * 2,
    borderRadius: radii.md,
    marginBottom: spacing.unit * 3,
    gap: spacing.unit * 2,
  },
  qrUrlText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    flex: 1,
    fontVariant: ['tabular-nums'],
  },
  qrCopyBtn: {
    paddingHorizontal: spacing.unit * 3,
    paddingVertical: spacing.unit,
    borderRadius: radii.pill,
    backgroundColor: colors.secondaryContainer,
  },
  qrCopyBtnText: {
    ...typography.labelMd,
    color: colors.onSecondaryContainer,
    fontWeight: '700',
  },

  // ============================================
  // Sprint 3 hotfix commit 2 — visor de comprobantes
  // ============================================
  proofThumbWrap: {
    width: '100%',
    height: 180,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerHigh,
  },
  proofThumbImg: {
    width: '100%',
    height: '100%',
  },
  proofThumbHint: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  // Visor fullscreen (sub-modal)
  proofViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  proofViewerSafeArea: {
    flex: 1,
  },
  proofViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerPadding,
    paddingVertical: 12,
  },
  proofViewerHeaderBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sprint 3 hotfix commit 2 (upgrade visor): cluster de Share a la derecha
  // del header. Hotfix Android Play Store: contenía Download + Share, ahora
  // solo Share. El View wrap se mantiene para preservar el spacing del header.
  proofViewerHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  proofViewerTitle: {
    ...typography.bodyLg,
    color: '#fff',
    fontWeight: '600',
  },
  // Hotfix 4: `proofViewerImageWrap` eliminado — el ImageViewer ahora es
  // hijo directo del container con paddingTop, sin View envolvente
  // (el wrap causaba el measurement bug que renderizaba pantalla negra).
  proofViewerImage: {
    width: '100%',
    height: '100%',
  },

  // ============================================
  // Sprint 3 hotfix commit 2 — cancel buttons
  // ============================================
  cancelBtnWrap: {
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: 'transparent',
  },
  cancelBtnText: {
    ...typography.bodyMd,
    color: colors.error,
    fontWeight: '600',
  },
  // Hotfix commit 3: estilos `cancelBtnDanger` y `cancelBtnDangerText`
  // eliminados — solo los usaba el botón "Cancelar Cobro Completo" que
  // se removió en este mismo commit.
  cancelBtnDisabled: {
    opacity: 0.5,
  },
});

export default PaymentDetailModal;
