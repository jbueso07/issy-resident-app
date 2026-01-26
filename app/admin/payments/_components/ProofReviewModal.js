// app/admin/payments/components/ProofReviewModal.js
// ISSY Admin - Proof Review Modal Component

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, scale } from '../_constants';
import { formatCurrency, formatDateTime } from '../_helpers';

export function ProofReviewModal({
  visible,
  onClose,
  proof,
  rejectReason,
  onRejectReasonChange,
  onVerify,
  onReject,
  processing,
}) {
  const { t } = useTranslation();

  if (!proof) return null;

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
          <Text style={styles.modalTitle}>{t('admin.payments.reviewProof', 'Revisar Comprobante')}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Proof Image */}
          {proof.proof_url && (
            <View style={styles.proofImageContainer}>
              <Image 
                source={{ uri: proof.proof_url }} 
                style={styles.proofImage}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Proof Details */}
          <View style={styles.proofDetails}>
            <View style={styles.proofDetailRow}>
              <Text style={styles.proofDetailLabel}>{t('admin.payments.proof.resident', 'Residente')}:</Text>
              <Text style={styles.proofDetailValue}>
                {proof.user?.full_name || proof.user?.name || '-'}
              </Text>
            </View>
            <View style={styles.proofDetailRow}>
              <Text style={styles.proofDetailLabel}>{t('admin.payments.proof.concept', 'Concepto')}:</Text>
              <Text style={styles.proofDetailValue}>
                {proof.charge?.title || proof.concept || '-'}
              </Text>
            </View>
            <View style={styles.proofDetailRow}>
              <Text style={styles.proofDetailLabel}>{t('admin.payments.proof.amount', 'Monto')}:</Text>
              <Text style={[styles.proofDetailValue, styles.amountValue]}>
                {formatCurrency(proof.amount, proof.currency)}
              </Text>
            </View>
            <View style={styles.proofDetailRow}>
              <Text style={styles.proofDetailLabel}>{t('admin.payments.proof.reference', 'Referencia')}:</Text>
              <Text style={styles.proofDetailValue}>
                {proof.reference || proof.proof_reference || '-'}
              </Text>
            </View>
            <View style={styles.proofDetailRow}>
              <Text style={styles.proofDetailLabel}>{t('admin.payments.proof.notes', 'Notas')}:</Text>
              <Text style={styles.proofDetailValue}>
                {proof.notes || '-'}
              </Text>
            </View>
            <View style={[styles.proofDetailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.proofDetailLabel}>{t('admin.payments.proof.submittedAt', 'Fecha envío')}:</Text>
              <Text style={styles.proofDetailValue}>
                {formatDateTime(proof.created_at)}
              </Text>
            </View>
          </View>

          {/* Reject Reason Input */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.payments.proof.rejectReason', 'Razón de rechazo (si aplica)')}</Text>
            <TextInput
              style={[styles.formInput, styles.formInputMultiline]}
              value={rejectReason}
              onChangeText={onRejectReasonChange}
              placeholder={t('admin.payments.proof.rejectReasonPlaceholder', 'Ej: Imagen borrosa, monto incorrecto...')}
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={onReject}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color={COLORS.textPrimary} />
              ) : (
                <>
                  <Ionicons name="close-circle" size={22} color={COLORS.textPrimary} />
                  <Text style={styles.actionButtonText}>{t('admin.payments.proof.reject', 'Rechazar')}</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={onVerify}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color={COLORS.background} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.background} />
                  <Text style={[styles.actionButtonText, { color: COLORS.background }]}>
                    {t('admin.payments.proof.approve', 'Aprobar')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

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
  proofImageContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(16),
    overflow: 'hidden',
    marginBottom: scale(16),
  },
  proofImage: {
    width: '100%',
    height: scale(300),
  },
  proofDetails: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
  },
  proofDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  proofDetailLabel: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  proofDetailValue: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  amountValue: {
    color: COLORS.lime,
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: scale(20),
  },
  formLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  formInput: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    fontSize: scale(16),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formInputMultiline: {
    minHeight: scale(80),
    textAlignVertical: 'top',
    paddingTop: scale(14),
  },
  actionButtons: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: scale(8),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(16),
    borderRadius: scale(12),
    gap: scale(8),
  },
  rejectButton: {
    backgroundColor: COLORS.danger,
  },
  approveButton: {
    backgroundColor: COLORS.lime,
  },
  actionButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});

export default ProofReviewModal;
