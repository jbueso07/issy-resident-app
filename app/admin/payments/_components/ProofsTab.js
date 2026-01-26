// app/admin/payments/components/ProofsTab.js
// ISSY Admin - Proofs/Receipts Tab Component

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, scale } from '../_constants';
import { formatCurrency, formatDateTime } from '../_helpers';

export function ProofsTab({
  pendingProofs,
  loadingProofs,
  onProofPress,
}) {
  const { t } = useTranslation();

  if (loadingProofs) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.lime} />
        <Text style={styles.loadingText}>{t('admin.payments.loadingProofs', 'Cargando comprobantes...')}</Text>
      </View>
    );
  }

  if (pendingProofs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-done-circle-outline" size={64} color={COLORS.success} />
        <Text style={styles.emptyTitle}>{t('admin.payments.empty.noProofs', '¡Todo al día!')}</Text>
        <Text style={styles.emptySubtitle}>
          {t('admin.payments.empty.noProofsSubtitle', 'No hay comprobantes pendientes de verificar')}
        </Text>
      </View>
    );
  }

  return (
    <>
      {/* Pending Count Banner */}
      <View style={styles.pendingBanner}>
        <Ionicons name="document-text" size={20} color={COLORS.blue} />
        <Text style={styles.pendingBannerText}>
          {t('admin.payments.pendingCount', { count: pendingProofs.length }, `${pendingProofs.length} comprobante(s) pendiente(s)`)}
        </Text>
      </View>

      {/* Proofs List */}
      {pendingProofs.map((proof) => (
        <ProofCard
          key={proof.id}
          proof={proof}
          onPress={() => onProofPress(proof)}
          t={t}
        />
      ))}
    </>
  );
}

// Proof Card Sub-component
function ProofCard({ proof, onPress, t }) {
  return (
    <TouchableOpacity 
      style={styles.proofCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.proofHeader}>
        <View style={styles.proofIconContainer}>
          <Ionicons name="document-attach" size={24} color={COLORS.blue} />
        </View>
        <View style={styles.proofInfo}>
          <Text style={styles.proofTitle}>
            {proof.charge?.title || proof.concept || t('admin.payments.proofPayment', 'Comprobante de Pago')}
          </Text>
          <Text style={styles.proofUser}>
            {proof.user?.full_name || proof.user?.name || t('common.user', 'Usuario')}
          </Text>
          <Text style={styles.proofDate}>
            {t('admin.payments.submittedAt', 'Enviado')}: {formatDateTime(proof.created_at)}
          </Text>
        </View>
        <Text style={styles.proofAmount}>{formatCurrency(proof.amount, proof.currency)}</Text>
      </View>
      
      <View style={styles.proofPreview}>
        {proof.proof_url && (
          <Image 
            source={{ uri: proof.proof_url }} 
            style={styles.proofThumbnail}
            resizeMode="cover"
          />
        )}
        <View style={styles.proofActions}>
          <Text style={styles.proofActionHint}>{t('admin.payments.tapToReview', 'Toca para revisar')}</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(60),
  },
  loadingText: {
    marginTop: scale(12),
    color: COLORS.textSecondary,
    fontSize: scale(14),
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: scale(60),
  },
  emptyTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: scale(16),
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.textMuted,
    marginTop: scale(4),
    textAlign: 'center',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.blue + '15',
    padding: scale(12),
    borderRadius: scale(10),
    marginBottom: scale(16),
    gap: scale(8),
  },
  pendingBannerText: {
    fontSize: scale(14),
    color: COLORS.blue,
    fontWeight: '500',
  },
  proofCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.blue + '30',
  },
  proofHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  proofIconContainer: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: COLORS.blue + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  proofInfo: {
    flex: 1,
  },
  proofTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  proofUser: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  proofDate: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    marginTop: scale(4),
  },
  proofAmount: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.lime,
  },
  proofPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(12),
    paddingTop: scale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  proofThumbnail: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(8),
    backgroundColor: COLORS.backgroundTertiary,
  },
  proofActions: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  proofActionHint: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginRight: scale(4),
  },
});

export default ProofsTab;
