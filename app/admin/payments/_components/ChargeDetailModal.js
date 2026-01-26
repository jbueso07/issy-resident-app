// app/admin/payments/components/ChargeDetailModal.js
// ISSY Admin - Charge Detail Modal Component

import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { COLORS, scale } from '../_constants';
import { formatCurrency, formatDate, formatDateTime } from '../_helpers';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ChargeDetailModal({
  visible,
  onClose,
  charge,
  onCancelCharge,
  onVerifyProof,
  onRejectProof,
  PAYMENT_STATUS,
  PAYMENT_TYPES,
}) {
  const { t } = useTranslation();
  const [viewingImage, setViewingImage] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);
  const [sharing, setSharing] = useState(false);
  
  const getPaymentTypeLabelLocal = (type) => {
    return PAYMENT_TYPES?.find(pt => pt.value === type)?.label || type;
  };

  if (!charge) return null;

  const status = charge.display_status || charge.status || 'pending';
  const statusInfo = PAYMENT_STATUS?.[status] || PAYMENT_STATUS?.pending || { label: 'Pendiente', color: COLORS.warning, icon: 'time' };

  const canCancel = (status === 'pending' || charge.status === 'active') && 
                   !charge.payment?.paid_at;

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
      
      const downloadResult = await FileSystem.downloadAsync(
        selectedImageUrl,
        localUri
      );
      
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

  const handleVerify = async (payment) => {
    console.log("handleVerify llamado, onVerifyProof:", !!onVerifyProof);
    if (onVerifyProof) {
      setProcessingAction('verify');
      await onVerifyProof(payment);
      setProcessingAction(null);
    }
  };

  const handleReject = async (payment) => {
    if (onRejectProof) {
      setProcessingAction('reject');
      await onRejectProof(payment);
      setProcessingAction(null);
    }
  };

  const hasPendingProof = (payment) => {
    return payment.status === 'proof_submitted' || 
           (payment.proof_of_payment && !payment.paid_at && !payment.rejected_at);
  };

  // Fullscreen Image View
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
            {/* Header */}
            <View style={styles.fullscreenHeader}>
              <TouchableOpacity 
                style={styles.fullscreenButton}
                onPress={closeImageFullscreen}
              >
                <Ionicons name="arrow-back" size={26} color="#fff" />
              </TouchableOpacity>
              
              <Text style={styles.fullscreenTitle}>{t('admin.payments.detail.proof', 'Comprobante')}</Text>
              
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
            
            {/* Image */}
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

  // Normal Detail View
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancel}>{t('common.close', 'Cerrar')}</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{t('admin.payments.chargeDetail', 'Detalle del Cobro')}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Status Banner */}
          <View style={[styles.statusBanner, { backgroundColor: statusInfo.color + '20' }]}>
            <Ionicons name={statusInfo.icon} size={24} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>

          {/* Charge Info */}
          <View style={styles.detailSection}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.payments.detail.concept', 'Concepto')}:</Text>
              <Text style={styles.detailValue}>{charge.title || '-'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.payments.detail.amount', 'Monto')}:</Text>
              <Text style={[styles.detailValue, styles.amountValue]}>
                {formatCurrency(charge.amount, charge.currency)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.payments.detail.dueDate', 'Vencimiento')}:</Text>
              <Text style={styles.detailValue}>{formatDate(charge.due_date)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.payments.detail.type', 'Tipo')}:</Text>
              <Text style={styles.detailValue}>{getPaymentTypeLabelLocal(charge.charge_type)}</Text>
            </View>

            {charge.description && (
              <View style={[styles.detailRow, styles.detailRowColumn]}>
                <Text style={styles.detailLabel}>{t('admin.payments.detail.description', 'Descripción')}:</Text>
                <Text style={[styles.detailValue, styles.detailValueFull]}>
                  {charge.description}
                </Text>
              </View>
            )}
          </View>

          {/* Payment Info */}
          {(charge.payment || charge.payments?.length > 0) && (
            <>
              <Text style={styles.sectionTitle}>
                {t('admin.payments.detail.paymentInfo', 'Información del Pago')}
              </Text>
              
              {(charge.payments || [charge.payment]).filter(Boolean).map((payment, idx) => (
                <View key={payment.id || idx} style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('admin.payments.detail.resident', 'Residente')}:</Text>
                    <Text style={styles.detailValue}>
                      {payment.user?.unit_number ? `${payment.user.unit_number} - ` : ''}
                      {payment.user?.name || payment.user?.full_name || '-'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('admin.payments.detail.method', 'Método')}:</Text>
                    <Text style={styles.detailValue}>
                      {payment.payment_method === 'card' ? 'Tarjeta' : 
                       payment.payment_method === 'proof' ? 'Comprobante' : 
                       payment.payment_method || '-'}
                    </Text>
                  </View>

                  {payment.paid_at && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('admin.payments.detail.paidAt', 'Pagado')}:</Text>
                      <Text style={styles.detailValue}>{formatDateTime(payment.paid_at)}</Text>
                    </View>
                  )}

                  {payment.proof_submitted_at && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('admin.payments.detail.submittedAt', 'Enviado')}:</Text>
                      <Text style={styles.detailValue}>{formatDateTime(payment.proof_submitted_at)}</Text>
                    </View>
                  )}

                  {payment.proof_reference && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('admin.payments.detail.reference', 'Referencia')}:</Text>
                      <Text style={styles.detailValue}>{payment.proof_reference}</Text>
                    </View>
                  )}

                  {/* Proof Image - Clickable */}
                  {(payment.proof_of_payment || payment.proof_url) && (
                    <View style={styles.proofImageContainer}>
                      <Text style={styles.proofImageLabel}>
                        {t('admin.payments.detail.proof', 'Comprobante')}:
                      </Text>
                      <TouchableOpacity 
                        onPress={() => openImageFullscreen(payment.proof_of_payment || payment.proof_url)}
                        activeOpacity={0.7}
                        style={styles.proofImageWrapper}
                      >
                        <Image 
                          source={{ uri: payment.proof_of_payment || payment.proof_url }} 
                          style={styles.proofImage}
                          resizeMode="contain"
                        />
                        <View style={styles.expandOverlay}>
                          <Ionicons name="expand-outline" size={20} color="#fff" />
                          <Text style={styles.expandText}>{t('admin.payments.detail.tapToExpand', 'Toca para ampliar')}</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Approve/Reject Buttons */}
                  {hasPendingProof(payment) && (onVerifyProof || onRejectProof) && (
                    <View style={styles.actionButtonsContainer}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleReject(payment)}
                        disabled={processingAction !== null}
                      >
                        {processingAction === 'reject' ? (
                          <ActivityIndicator size="small" color={COLORS.danger} />
                        ) : (
                          <>
                            <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                            <Text style={styles.rejectButtonText}>
                              {t('admin.payments.reject', 'Rechazar')}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleVerify(payment)}
                        disabled={processingAction !== null}
                      >
                        {processingAction === 'verify' ? (
                          <ActivityIndicator size="small" color={COLORS.background} />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={20} color={COLORS.background} />
                            <Text style={styles.approveButtonText}>
                              {t('admin.payments.approve', 'Aprobar')}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}

          {/* Cancel Button */}
          {canCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancelCharge}
            >
              <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
              <Text style={styles.cancelButtonText}>{t('admin.payments.cancelCharge', 'Cancelar Cobro')}</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  approveButtonText: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: scale(14),
  },
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
  // Fullscreen Image Styles
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
