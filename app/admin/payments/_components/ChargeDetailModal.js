// app/admin/payments/components/ChargeDetailModal.js
// ISSY Admin - Charge Detail Modal Component
//
// Sprint 2 D6: refactor a 2 vistas internas:
//   - view='parent': detalle del cobro masivo + stats grandes + lista paginada
//                    de residentes (FlatList con useChargePayments).
//                    Botón "Cancelar cobro masivo".
//   - view='payment': detalle de un pago individual + botón "Cancelar este
//                     pago" (POST /admin/payments/:id/cancel).
//
// Pendiente Sprint D7: confirmación robusta tipo "Escriba CANCELAR",
// manejo fino de 409/422, botones verify/reject/revert reactivados.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { COLORS, scale, API_URL } from '../_constants';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getAuthHeaders,
  formatRelativeDueDate,
  formatAppliesToLabel,
  formatRecurringPeriodLabel,
  formatRelativeCancelledAt,
} from '../_helpers';
import { useChargePayments } from '../_hooks/useChargePayments';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Chips de filtro para la lista de pagos del cobro (por status del community_payment).
const STATUS_FILTER_CHIPS = [
  { key: null, labelKey: 'admin.payments.detail.filter.all', fallback: 'Todos' },
  { key: 'pending', labelKey: 'admin.payments.detail.filter.pending', fallback: 'Pendiente' },
  { key: 'paid', labelKey: 'admin.payments.detail.filter.paid', fallback: 'Pagado' },
  { key: 'proof_submitted', labelKey: 'admin.payments.detail.filter.proof', fallback: 'Comprobante' },
  { key: 'rejected', labelKey: 'admin.payments.detail.filter.rejected', fallback: 'Rechazado' },
  { key: 'cancelled', labelKey: 'admin.payments.detail.filter.cancelled', fallback: 'Cancelado' },
];

export function ChargeDetailModal({
  visible,
  onClose,
  charge,
  onCancelCharge,
  onPaymentChanged,   // Sprint D6: callback opcional para refrescar lista padre tras cancel individual
  onVerifyProof,      // Sprint D7: pendiente reactivar
  onRejectProof,      // Sprint D7: pendiente reactivar
  onRevertPayment,    // Sprint D7: pendiente reactivar
  PAYMENT_STATUS,
  PAYMENT_TYPES,
}) {
  const { t } = useTranslation();

  // State del modal: vistas internas + payment seleccionado
  const [view, setView] = useState('parent'); // 'parent' | 'payment'
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Image viewer fullscreen (existente, sin cambios funcionales)
  const [viewingImage, setViewingImage] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [sharing, setSharing] = useState(false);

  // UI state para resaltar el chip activo del filtro de status
  const [statusFilterUI, setStatusFilterUI] = useState(null);

  // Hook paginado para los community_payments del cobro.
  // chargeId=null cuando !visible → idle (no fetch).
  const {
    charge: chargeFull,
    payments,
    pagination,
    loading,
    error,
    refresh,
    loadMore,
    setStatusFilter,
  } = useChargePayments(visible ? charge?.id : null, { autoLoad: true });

  // Reset state cuando el modal se cierra
  useEffect(() => {
    if (!visible) {
      setView('parent');
      setSelectedPayment(null);
      setStatusFilterUI(null);
      setActionLoading(false);
    }
  }, [visible]);

  const handleSetStatusFilter = useCallback(
    (status) => {
      setStatusFilterUI(status);
      setStatusFilter(status);
    },
    [setStatusFilter]
  );

  const openPaymentView = useCallback((payment) => {
    setSelectedPayment(payment);
    setView('payment');
  }, []);

  const backToParentView = useCallback(() => {
    setSelectedPayment(null);
    setView('parent');
  }, []);

  const getPaymentTypeLabelLocal = (type) => {
    return PAYMENT_TYPES?.find((pt) => pt.value === type)?.label || type;
  };

  const openImageFullscreen = (url) => {
    setSelectedImageUrl(url);
    setViewingImage(true);
  };

  const closeImageFullscreen = () => {
    setViewingImage(false);
  };

  const shareImage = async () => {
    if (!selectedImageUrl) return;
    try {
      setSharing(true);
      const filename = `comprobante_${Date.now()}.jpg`;
      const localUri = FileSystem.cacheDirectory + filename;
      const downloadResult = await FileSystem.downloadAsync(selectedImageUrl, localUri);
      if (downloadResult.status === 200) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'image/jpeg',
            dialogTitle: t('admin.payments.detail.shareProof', 'Compartir comprobante'),
          });
        } else {
          Alert.alert('Error', t('admin.payments.detail.sharingNotAvailable', 'Compartir no disponible'));
        }
      }
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert('Error', t('admin.payments.detail.shareError', 'Error al compartir'));
    } finally {
      setSharing(false);
    }
  };

  // TODO Sprint 2 D7: reactivar botones verify/reject/revert en PaymentView.
  // Las funciones se mantienen acá para que D7 las re-conecte a la UI sin
  // tener que re-escribir la lógica.
  // eslint-disable-next-line no-unused-vars
  const handleVerify = async (payment) => {
    if (onVerifyProof) {
      setActionLoading(true);
      await onVerifyProof(payment);
      setActionLoading(false);
    }
  };
  // eslint-disable-next-line no-unused-vars
  const handleReject = async (payment) => {
    Alert.prompt(
      'Rechazar Comprobante',
      'Ingresa la razón del rechazo:',
      async (reason) => {
        if (reason && reason.trim()) {
          if (onRejectProof) {
            setActionLoading(true);
            await onRejectProof(payment, reason.trim());
            setActionLoading(false);
          }
        } else {
          Alert.alert('Error', 'La razón es requerida');
        }
      },
      'plain-text',
      '',
      'default'
    );
  };
  // eslint-disable-next-line no-unused-vars
  const handleRevert = async (payment) => {
    if (onRevertPayment) {
      setActionLoading(true);
      await onRevertPayment(payment);
      setActionLoading(false);
    }
  };

  // Cancelar cobro masivo (vista padre): delega al consumidor.
  // El consumidor cierra el modal y refresca la lista.
  const handleCancelMassiveCharge = useCallback(() => {
    Alert.alert(
      t('admin.payments.cancelCharge', 'Cancelar Cobro'),
      t(
        'admin.payments.cancelChargeConfirm',
        '¿Estás seguro de cancelar este cobro masivo?'
      ),
      [
        { text: t('common.no', 'No'), style: 'cancel' },
        {
          text: t('common.yes', 'Sí'),
          style: 'destructive',
          onPress: () => {
            if (onCancelCharge) onCancelCharge();
          },
        },
      ]
    );
  }, [onCancelCharge, t]);

  // Cancelar UN pago individual (vista pago): llama el endpoint nuevo
  // POST /admin/payments/:id/cancel.
  const cancelSinglePayment = useCallback(
    async (payment) => {
      if (!payment?.id) return;
      Alert.alert(
        t('admin.payments.cancelPayment', 'Cancelar este pago'),
        t(
          'admin.payments.cancelPaymentConfirm',
          '¿Estás seguro de cancelar este pago? El cobro padre y los demás residentes no se ven afectados.'
        ),
        [
          { text: t('common.no', 'No'), style: 'cancel' },
          {
            text: t('common.yes', 'Sí'),
            style: 'destructive',
            onPress: async () => {
              setActionLoading(true);
              try {
                const headers = await getAuthHeaders();
                const response = await fetch(
                  API_URL +
                    '/api/community-payments/admin/payments/' +
                    payment.id +
                    '/cancel',
                  {
                    method: 'POST',
                    headers: { ...headers, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: null }),
                  }
                );
                const json = await response.json();
                if (!response.ok || !json.success) {
                  Alert.alert(
                    t('admin.payments.cancel.error', 'No se pudo cancelar'),
                    json.error || t('common.error', 'Error desconocido')
                  );
                  return;
                }
                Alert.alert(
                  t('common.success', 'Éxito'),
                  t('admin.payments.cancel.paymentSuccess', 'Pago cancelado')
                );
                backToParentView();
                refresh();
                if (onPaymentChanged) onPaymentChanged();
              } catch (err) {
                console.error('Error cancelling single payment:', err);
                Alert.alert(
                  t('common.error', 'Error'),
                  err.message || 'Error'
                );
              } finally {
                setActionLoading(false);
              }
            },
          },
        ]
      );
    },
    [t, refresh, backToParentView, onPaymentChanged]
  );

  if (!charge) return null;

  // Fullscreen Image View — sin cambios funcionales respecto a la versión previa.
  if (viewingImage && selectedImageUrl) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeImageFullscreen}
      >
        <View style={styles.fullscreenContainer}>
          <SafeAreaView style={styles.fullscreenSafeArea}>
            <View style={styles.fullscreenHeader}>
              <TouchableOpacity style={styles.fullscreenButton} onPress={closeImageFullscreen}>
                <Ionicons name="arrow-back" size={26} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.fullscreenTitle}>
                {t('admin.payments.detail.proof', 'Comprobante')}
              </Text>
              <TouchableOpacity
                style={styles.fullscreenButton}
                onPress={shareImage}
                disabled={sharing}
              >
                {sharing ? (
                  <ActivityIndicator size="small" color={COLORS.lime} />
                ) : (
                  <Ionicons name="share-outline" size={24} color={COLORS.lime} />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.fullscreenImageContainer}>
              <Image
                source={{ uri: selectedImageUrl }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    );
  }

  // Normal modal: dispatch por view
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        {view === 'parent' ? (
          <ParentView
            t={t}
            charge={charge}
            chargeFull={chargeFull}
            payments={payments}
            pagination={pagination}
            loading={loading}
            error={error}
            refresh={refresh}
            loadMore={loadMore}
            statusFilterUI={statusFilterUI}
            onSetStatusFilter={handleSetStatusFilter}
            onClose={onClose}
            onChargeTypeLabel={getPaymentTypeLabelLocal}
            onCancelMassiveCharge={handleCancelMassiveCharge}
            onPaymentPress={openPaymentView}
            PAYMENT_STATUS={PAYMENT_STATUS}
          />
        ) : (
          <PaymentView
            t={t}
            charge={charge}
            payment={selectedPayment}
            actionLoading={actionLoading}
            onClose={onClose}
            onBack={backToParentView}
            onOpenImage={openImageFullscreen}
            onCancelPayment={cancelSinglePayment}
            PAYMENT_STATUS={PAYMENT_STATUS}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ============================================
// Vista padre — detalle del cobro masivo
// ============================================
function ParentView({
  t,
  charge,
  chargeFull,
  payments,
  pagination,
  loading,
  error,
  refresh,
  loadMore,
  statusFilterUI,
  onSetStatusFilter,
  onClose,
  onChargeTypeLabel,
  onCancelMassiveCharge,
  onPaymentPress,
  PAYMENT_STATUS,
}) {
  // Stats vienen de charge.stats (del listado de getCharges D4).
  // chargeFull queda disponible si se necesita info adicional refrescada del endpoint.
  const stats = charge.stats || {
    paid_count: 0,
    total_payments: 0,
    total_amount_expected: 0,
    total_amount_collected: 0,
  };
  const isCancelled = charge.status === 'cancelled';
  const totalForBar = stats.total_payments > 0 ? stats.total_payments : 1;
  const progressPct = Math.min(100, Math.round((stats.paid_count / totalForBar) * 100));

  const dueDateInfo = !isCancelled ? formatRelativeDueDate(charge.due_date, t) : null;
  const appliesLabel = formatAppliesToLabel(charge, t);
  const recurringLabel = charge.is_recurring
    ? formatRecurringPeriodLabel(charge.recurring_period, t)
    : null;

  const totalResidents = pagination?.total ?? stats.total_payments ?? 0;
  const showFullSpinner = loading && payments.length === 0;
  const showInlineSpinner = loading && payments.length > 0;
  const showEmpty = !loading && !error && payments.length === 0;

  return (
    <>
      {/* Header */}
      <View style={styles.modalHeader}>
        <View style={{ width: scale(60) }} />
        <Text style={styles.modalTitle}>
          {t('admin.payments.detail.massiveCharge', 'Cobro masivo')}
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.modalCancel}>{t('common.close', 'Cerrar')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PaymentListItem
            payment={item}
            t={t}
            PAYMENT_STATUS={PAYMENT_STATUS}
            currency={charge.currency}
            onPress={() => onPaymentPress(item)}
          />
        )}
        contentContainerStyle={styles.modalContentList}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <View>
            {/* Charge summary */}
            <View style={styles.detailSection}>
              <View style={styles.summaryHeader}>
                <View style={[styles.summaryIcon, { backgroundColor: COLORS.teal + '20' }]}>
                  <Ionicons name="cash-outline" size={22} color={COLORS.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.summaryTitle,
                      isCancelled && styles.chargeTitleCancelled,
                    ]}
                  >
                    {charge.title || '-'}
                  </Text>
                  {charge.charge_type ? (
                    <Text style={styles.summarySubtitle}>
                      {onChargeTypeLabel(charge.charge_type)}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.summaryAmountRow}>
                <Text style={styles.summaryAmount}>
                  {formatCurrency(charge.amount, charge.currency)}
                </Text>
                {dueDateInfo?.label ? (
                  <View style={styles.summaryDueDate}>
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color={
                        dueDateInfo.severity === 'overdue'
                          ? COLORS.danger
                          : dueDateInfo.severity === 'today'
                          ? COLORS.warning
                          : COLORS.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.summaryDueDateText,
                        dueDateInfo.severity === 'overdue' && { color: COLORS.danger },
                        dueDateInfo.severity === 'today' && { color: COLORS.warning },
                      ]}
                    >
                      {dueDateInfo.label}
                    </Text>
                  </View>
                ) : isCancelled ? (
                  <Text style={styles.summaryCancelledNote}>
                    {formatRelativeCancelledAt(charge.cancelled_at, t)}
                  </Text>
                ) : null}
              </View>

              {charge.description ? (
                <Text style={styles.summaryDescription}>{charge.description}</Text>
              ) : null}

              {/* Type badges */}
              <View style={styles.typeBadgesRow}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{appliesLabel}</Text>
                </View>
                {recurringLabel ? (
                  <View style={styles.typeBadge}>
                    <Ionicons name="repeat" size={11} color={COLORS.textSecondary} />
                    <Text style={styles.typeBadgeText}>{recurringLabel}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Stats card grande */}
            <View style={styles.statsCard}>
              <Text style={styles.statsCardTitle}>
                {t(
                  'admin.payments.detail.statsTitle',
                  `${stats.paid_count} / ${stats.total_payments} residentes pagaron`,
                  { paid: stats.paid_count, total: stats.total_payments }
                )}
              </Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${progressPct}%`,
                      backgroundColor:
                        progressPct >= 80
                          ? COLORS.success
                          : progressPct >= 50
                          ? COLORS.warning
                          : COLORS.danger,
                    },
                  ]}
                />
              </View>
              <Text style={styles.statsCardAmount}>
                {t(
                  'admin.payments.detail.amountStats',
                  `Cobrado: ${formatCurrency(stats.total_amount_collected, charge.currency)} de ${formatCurrency(stats.total_amount_expected, charge.currency)}`,
                  {
                    collected: formatCurrency(stats.total_amount_collected, charge.currency),
                    expected: formatCurrency(stats.total_amount_expected, charge.currency),
                  }
                )}
              </Text>
            </View>

            {/* Residentes section header */}
            <Text style={styles.sectionTitle}>
              {t(
                'admin.payments.detail.residentsCount',
                `Residentes (${totalResidents})`,
                { count: totalResidents }
              )}
            </Text>

            {/* Filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterChipsScroll}
              contentContainerStyle={styles.filterChipsRow}
            >
              {STATUS_FILTER_CHIPS.map((chip) => {
                const active = statusFilterUI === chip.key;
                return (
                  <TouchableOpacity
                    key={chip.key ?? 'all'}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => onSetStatusFilter(chip.key)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {t(chip.labelKey, chip.fallback)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Error banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={20} color={COLORS.danger} />
                <Text style={styles.errorBannerText}>{error}</Text>
                <TouchableOpacity onPress={refresh}>
                  <Text style={styles.errorBannerRetry}>
                    {t('common.retry', 'Reintentar')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          showFullSpinner ? (
            <View style={styles.listSpinner}>
              <ActivityIndicator size="large" color={COLORS.lime} />
            </View>
          ) : showEmpty ? (
            <View style={styles.listEmpty}>
              <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.listEmptyText}>
                {t('admin.payments.detail.noPayments', 'No hay pagos para mostrar')}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View>
            {showInlineSpinner ? (
              <View style={styles.listInlineSpinner}>
                <ActivityIndicator size="small" color={COLORS.textSecondary} />
              </View>
            ) : null}

            {/* Cancel masivo button — solo si active */}
            {charge.status === 'active' ? (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancelMassiveCharge}
              >
                <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
                <Text style={styles.cancelButtonText}>
                  {t('admin.payments.cancelMassiveCharge', 'Cancelar cobro masivo')}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.cancelledFooterNote}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
                <Text style={styles.cancelledFooterText}>
                  {formatRelativeCancelledAt(charge.cancelled_at, t)}
                </Text>
              </View>
            )}

            <View style={{ height: scale(80) }} />
          </View>
        }
      />
    </>
  );
}

// ============================================
// Item de la lista de pagos (vista padre)
// ============================================
function PaymentListItem({ payment, t, PAYMENT_STATUS, currency, onPress }) {
  const status = payment.status || 'pending';
  const statusInfo =
    PAYMENT_STATUS?.[status] ||
    { label: status, color: COLORS.textSecondary, icon: 'help-circle' };

  return (
    <TouchableOpacity style={styles.paymentListItem} onPress={onPress} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <Text style={styles.paymentListItemName}>
          {payment.user_name || t('common.user', 'Usuario')}
        </Text>
        <Text style={styles.paymentListItemUnit}>
          {payment.unit_number
            ? `${t('admin.payments.unit', 'Apto')} ${payment.unit_number}`
            : payment.user_email || '-'}
        </Text>
      </View>
      <View style={styles.paymentListItemRight}>
        <Text style={styles.paymentListItemAmount}>
          {formatCurrency(payment.amount, currency)}
        </Text>
        <View
          style={[
            styles.paymentListItemStatus,
            { backgroundColor: statusInfo.color + '20' },
          ]}
        >
          <Ionicons name={statusInfo.icon} size={11} color={statusInfo.color} />
          <Text style={[styles.paymentListItemStatusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

// ============================================
// Vista pago individual
// ============================================
function PaymentView({
  t,
  charge,
  payment,
  actionLoading,
  onClose,
  onBack,
  onOpenImage,
  onCancelPayment,
  PAYMENT_STATUS,
}) {
  if (!payment) return null;

  const status = payment.status || 'pending';
  const statusInfo =
    PAYMENT_STATUS?.[status] ||
    { label: status, color: COLORS.textSecondary, icon: 'help-circle' };

  const dueDateInfo = formatRelativeDueDate(charge.due_date, t);
  const canCancel = ['pending', 'proof_submitted', 'rejected', 'not_started'].includes(status);
  const proofUrl = payment.proof_of_payment || payment.proof_url;

  return (
    <>
      {/* Header con back + close */}
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>
          {t('admin.payments.detail.singlePayment', 'Pago individual')}
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.modalCancel}>{t('common.close', 'Cerrar')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalContent}>
        {/* User info card */}
        <View style={styles.detailSection}>
          <View style={styles.userInfoHeader}>
            <View style={[styles.userInfoIcon, { backgroundColor: COLORS.teal + '20' }]}>
              <Ionicons name="person-circle-outline" size={24} color={COLORS.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userInfoName}>
                {payment.user_name || t('common.user', 'Usuario')}
              </Text>
              <Text style={styles.userInfoMeta}>
                {payment.unit_number
                  ? `${t('admin.payments.unit', 'Apto')} ${payment.unit_number}`
                  : ''}
                {payment.unit_number && (payment.user_email || payment.user_phone) ? ' · ' : ''}
                {payment.user_email || ''}
              </Text>
              {payment.user_phone ? (
                <Text style={styles.userInfoMeta}>{payment.user_phone}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusInfo.color + '20' }]}>
          <Ionicons name={statusInfo.icon} size={22} color={statusInfo.color} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>

        {/* Payment details */}
        <Text style={styles.sectionTitle}>
          {t('admin.payments.detail.paymentDetails', 'Detalle del pago')}
        </Text>

        <View style={styles.detailSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t('admin.payments.detail.amount', 'Monto')}:
            </Text>
            <Text style={[styles.detailValue, styles.amountValue]}>
              {formatCurrency(payment.amount, charge.currency)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t('admin.payments.detail.verifiedAmount', 'Monto verificado')}:
            </Text>
            <Text style={styles.detailValue}>
              {payment.verified_amount != null
                ? formatCurrency(payment.verified_amount, charge.currency)
                : '—'}
            </Text>
          </View>

          {dueDateInfo?.label ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {t('admin.payments.detail.dueDate', 'Vencimiento')}:
              </Text>
              <Text style={styles.detailValue}>{dueDateInfo.label}</Text>
            </View>
          ) : null}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t('admin.payments.detail.method', 'Método')}:
            </Text>
            <Text style={styles.detailValue}>
              {payment.payment_method === 'card'
                ? t('admin.payments.method.card', 'Tarjeta')
                : payment.payment_method === 'proof'
                ? t('admin.payments.method.proof', 'Comprobante')
                : payment.payment_method || '—'}
            </Text>
          </View>

          {payment.paid_at ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {t('admin.payments.detail.paidAt', 'Pagado')}:
              </Text>
              <Text style={styles.detailValue}>{formatDateTime(payment.paid_at)}</Text>
            </View>
          ) : null}

          {payment.verified_at ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {t('admin.payments.detail.verifiedAt', 'Verificado')}:
              </Text>
              <Text style={styles.detailValue}>{formatDateTime(payment.verified_at)}</Text>
            </View>
          ) : null}

          {payment.proof_submitted_at ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {t('admin.payments.detail.submittedAt', 'Enviado')}:
              </Text>
              <Text style={styles.detailValue}>{formatDateTime(payment.proof_submitted_at)}</Text>
            </View>
          ) : null}

          {payment.proof_reference ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {t('admin.payments.detail.reference', 'Referencia')}:
              </Text>
              <Text style={styles.detailValue}>{payment.proof_reference}</Text>
            </View>
          ) : null}

          {payment.rejection_reason ? (
            <View style={[styles.detailRow, styles.detailRowColumn]}>
              <Text style={styles.detailLabel}>
                {t('admin.payments.detail.rejectionReason', 'Razón del rechazo')}:
              </Text>
              <Text style={[styles.detailValue, styles.detailValueFull]}>
                {payment.rejection_reason}
              </Text>
            </View>
          ) : null}

          {payment.cancelled_at ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {t('admin.payments.detail.cancelledAt', 'Cancelado')}:
              </Text>
              <Text style={styles.detailValue}>{formatDateTime(payment.cancelled_at)}</Text>
            </View>
          ) : null}

          {payment.cancellation_reason ? (
            <View style={[styles.detailRow, styles.detailRowColumn]}>
              <Text style={styles.detailLabel}>
                {t('admin.payments.detail.cancellationReason', 'Razón de cancelación')}:
              </Text>
              <Text style={[styles.detailValue, styles.detailValueFull]}>
                {payment.cancellation_reason}
              </Text>
            </View>
          ) : null}

          {/* Proof image clickable */}
          {proofUrl ? (
            <View style={styles.proofImageContainer}>
              <Text style={styles.proofImageLabel}>
                {t('admin.payments.detail.proof', 'Comprobante')}:
              </Text>
              <TouchableOpacity
                onPress={() => onOpenImage(proofUrl)}
                activeOpacity={0.7}
                style={styles.proofImageWrapper}
              >
                <Image
                  source={{ uri: proofUrl }}
                  style={styles.proofImage}
                  resizeMode="contain"
                />
                <View style={styles.expandOverlay}>
                  <Ionicons name="expand-outline" size={20} color="#fff" />
                  <Text style={styles.expandText}>
                    {t('admin.payments.detail.tapToExpand', 'Toca para ampliar')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Charge reference */}
        <View style={styles.parentChargeRef}>
          <Ionicons name="link-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.parentChargeRefText} numberOfLines={2}>
            {t('admin.payments.detail.partOf', 'Pago de:')} "{charge.title}"
          </Text>
        </View>

        {/* TODO Sprint 2 D7: reactivar botones aquí.
            - Verify:  hasPendingProof(payment) && handleVerify(payment)
            - Reject:  hasPendingProof(payment) && handleReject(payment)
            - Revert:  payment.status === 'paid' && handleRevert(payment)
            Las funciones handleVerify/handleReject/handleRevert ya existen
            en el componente padre con la lógica conectada a las props. */}

        {/* Cancel single payment button */}
        {canCancel ? (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => onCancelPayment(payment)}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={COLORS.danger} />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
                <Text style={styles.cancelButtonText}>
                  {t('admin.payments.cancelThisPayment', 'Cancelar este pago')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        <View style={{ height: scale(80) }} />
      </ScrollView>
    </>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  // Modal shell (existente)
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCancel: {
    fontSize: scale(16),
    color: COLORS.textSecondary,
  },
  modalTitle: {
    fontSize: scale(17),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: scale(16),
  },
  modalContentList: {
    padding: scale(16),
    paddingBottom: scale(40),
  },
  backButton: {
    width: scale(60),
    paddingVertical: scale(4),
  },

  // Status banner (existente)
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(16),
    borderRadius: scale(12),
    marginBottom: scale(16),
    gap: scale(8),
  },
  statusText: {
    fontSize: scale(16),
    fontWeight: '600',
  },

  // Detail rows (existente)
  detailSection: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailRowColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  detailValueFull: {
    maxWidth: '100%',
    textAlign: 'left',
    marginTop: scale(4),
  },
  amountValue: {
    color: COLORS.lime,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: scale(8),
    marginBottom: scale(12),
  },

  // Charge summary (NUEVO)
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginBottom: scale(12),
  },
  summaryIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: scale(17),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summarySubtitle: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  summaryAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  summaryAmount: {
    fontSize: scale(22),
    fontWeight: '700',
    color: COLORS.lime,
  },
  summaryDueDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  summaryDueDateText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  summaryCancelledNote: {
    fontSize: scale(12),
    color: COLORS.textMuted,
  },
  summaryDescription: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginBottom: scale(8),
  },
  chargeTitleCancelled: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },

  // Type badges (NUEVO)
  typeBadgesRow: {
    flexDirection: 'row',
    gap: scale(6),
    flexWrap: 'wrap',
    marginTop: scale(4),
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(6),
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(4),
  },
  typeBadgeText: {
    fontSize: scale(10),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // Stats card grande (NUEVO)
  statsCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsCardTitle: {
    fontSize: scale(15),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  statsCardAmount: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(8),
  },
  progressBarContainer: {
    height: scale(8),
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(4),
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: scale(4),
  },

  // Filter chips (NUEVO)
  filterChipsScroll: {
    marginBottom: scale(12),
    marginHorizontal: scale(-16),
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: scale(8),
    paddingHorizontal: scale(16),
  },
  filterChip: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(16),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  filterChipText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.background,
    fontWeight: '600',
  },

  // Error / empty / loading (NUEVO)
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger + '15',
    padding: scale(12),
    borderRadius: scale(10),
    marginBottom: scale(12),
    gap: scale(8),
  },
  errorBannerText: {
    flex: 1,
    fontSize: scale(13),
    color: COLORS.danger,
  },
  errorBannerRetry: {
    fontSize: scale(13),
    color: COLORS.danger,
    fontWeight: '600',
  },
  listSpinner: {
    paddingVertical: scale(40),
    alignItems: 'center',
  },
  listInlineSpinner: {
    paddingVertical: scale(12),
    alignItems: 'center',
  },
  listEmpty: {
    paddingVertical: scale(40),
    alignItems: 'center',
    gap: scale(12),
  },
  listEmptyText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },

  // Payment list item (NUEVO)
  paymentListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(12),
    marginBottom: scale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(8),
  },
  paymentListItemName: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  paymentListItemUnit: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  paymentListItemRight: {
    alignItems: 'flex-end',
    gap: scale(4),
  },
  paymentListItemAmount: {
    fontSize: scale(13),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  paymentListItemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(5),
    gap: scale(3),
  },
  paymentListItemStatusText: {
    fontSize: scale(10),
    fontWeight: '500',
  },

  // User info (PaymentView, NUEVO)
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  userInfoIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfoName: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userInfoMeta: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },

  // Parent charge reference (NUEVO)
  parentChargeRef: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(4),
    marginBottom: scale(12),
  },
  parentChargeRefText: {
    flex: 1,
    fontSize: scale(12),
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },

  // Proof image (existente)
  proofImageContainer: {
    marginTop: scale(12),
  },
  proofImageLabel: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginBottom: scale(8),
  },
  proofImageWrapper: {
    position: 'relative',
    borderRadius: scale(12),
    overflow: 'hidden',
  },
  proofImage: {
    width: '100%',
    height: scale(200),
    backgroundColor: COLORS.backgroundTertiary,
  },
  expandOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: scale(8),
    gap: scale(6),
  },
  expandText: {
    color: '#fff',
    fontSize: scale(13),
    fontWeight: '500',
  },

  // Action buttons (existente — preservado para D7)
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: scale(16),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    gap: scale(6),
  },
  rejectButton: {
    backgroundColor: COLORS.danger + '15',
  },
  approveButton: {
    backgroundColor: COLORS.success,
  },
  rejectButtonText: {
    color: COLORS.danger,
    fontWeight: '600',
    fontSize: scale(14),
  },
  revertButton: {
    backgroundColor: COLORS.warning + '15',
  },
  revertButtonText: {
    color: COLORS.warning,
    fontWeight: '600',
    fontSize: scale(14),
  },
  approveButtonText: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: scale(14),
  },

  // Cancel button (existente — usado tanto por cobro masivo como por pago individual)
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger + '15',
    padding: scale(16),
    borderRadius: scale(12),
    marginTop: scale(8),
    gap: scale(6),
  },
  cancelButtonText: {
    color: COLORS.danger,
    fontWeight: '600',
    fontSize: scale(14),
  },
  cancelledFooterNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(12),
    marginTop: scale(8),
    gap: scale(6),
  },
  cancelledFooterText: {
    fontSize: scale(13),
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },

  // Fullscreen Image Styles (existente)
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenSafeArea: {
    flex: 1,
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(8),
    paddingVertical: scale(8),
  },
  fullscreenButton: {
    width: scale(48),
    height: scale(48),
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenTitle: {
    fontSize: scale(17),
    fontWeight: '600',
    color: '#fff',
  },
  fullscreenImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
});

export default ChargeDetailModal;
