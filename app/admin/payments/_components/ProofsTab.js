// app/admin/payments/_components/ProofsTab.js
// ISSY Admin - Proofs Tab (Sprint 3 D11 refactor)
//
// Lista paginada de comprobantes pendientes (status='proof_submitted').
// Reusa `usePayments` (refactor D10 con paginación interna). El listado
// pre-D11 venía de `useProofs.fetchPendingProofs` (endpoint legacy
// /admin/payments/pending sin paginación) — ahora todo sale de
// /admin/payments con el filter `status=proof_submitted`.
//
// IMPORTANTE: `useProofs` queda VIVO solo para mutations (verifyProof /
// rejectProof / revertPayment) que se siguen disparando desde index.js
// y desde ProofReviewModal legacy. Cleanup completo del fetch en D13.
//
// El callback `onProofPress` viene de index.js y abre <ProofReviewModal>
// (legacy, sin tocar en D11). El shape del payment que se pasa es
// compatible con el modal (mismo backend).

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { FileText, AlertCircle } from 'lucide-react-native';
import { colors, spacing, typography, radii } from '../_styles/theme';
import usePayments from '../_hooks/usePayments';
import ProofCard from './cards/ProofCard';

/**
 * @param {Object} props
 * @param {(payment: Object) => void} props.onProofPress - abre ProofReviewModal
 *   (legacy) en index.js. NO modificar el flow de verificación en D11.
 */
export function ProofsTab({ onProofPress }) {
  const { t } = useTranslation();

  // Sprint 3 D11: hook nuevo con filter dedicado. Page size 20, idéntico
  // a ChargesTab post-D10.
  const {
    data: pendingProofs,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    error,
    loadMore,
    refresh,
    refetch,
  } = usePayments({ status: 'proof_submitted' });

  // Render de cada card. Discrimina solo por payment (sin headers — la spec
  // confirma single-view para D11, sin month grouper).
  const renderItem = ({ item }) => (
    <ProofCard
      payment={item}
      onPress={(payment) => {
        if (onProofPress) onProofPress(payment);
      }}
    />
  );

  // Footer: spinner mientras carga la siguiente página
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMoreWrap}>
        <ActivityIndicator size="small" color={colors.primaryContainer} />
      </View>
    );
  };

  // Empty / error states
  const renderEmpty = () => {
    if (loading) return null; // spinner principal abajo
    if (error) {
      return (
        <View style={styles.emptyWrap}>
          <AlertCircle size={48} color={colors.error} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>
            {t('admin.payments.proofs.errorTitle', 'No se pudo cargar')}
          </Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={refetch}>
            <Text style={styles.retryBtnText}>
              {t('common.retry', 'Reintentar')}
            </Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.emptyWrap}>
        <FileText size={48} color={colors.onSurfaceVariant} strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>
          {t('admin.payments.proofs.emptyTitle', 'Sin comprobantes pendientes')}
        </Text>
        <Text style={styles.emptySubtitle}>
          {t(
            'admin.payments.proofs.emptySubtitle',
            'Todos los comprobantes están verificados.'
          )}
        </Text>
      </View>
    );
  };

  // Loading inicial (sin data, sin error)
  const showFullSpinner = loading && pendingProofs.length === 0 && !error;

  return (
    <View style={styles.container}>
      {/* KPI header: contador de pendientes. Si hay más páginas, muestra "N+".
          Solo se renderiza cuando hay items (no en empty/loading/error). */}
      {!loading && pendingProofs.length > 0 && (
        <View style={styles.kpiHeader}>
          <Text style={styles.kpiCount}>
            {pendingProofs.length}{hasMore ? '+' : ''}
          </Text>
          <Text style={styles.kpiLabel}>
            {t(
              'admin.payments.proofs.pendingCount',
              'comprobantes pendientes de verificación'
            )}
          </Text>
        </View>
      )}

      {showFullSpinner ? (
        <View style={styles.fullSpinner}>
          <ActivityIndicator size="large" color={colors.primaryContainer} />
        </View>
      ) : (
        <FlatList
          data={pendingProofs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          // Scroll infinito (mismo patrón que ChargesTab post-D10)
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          // Pull-to-refresh interno (el global del index.js ya no aplica
          // a este tab — post-D11)
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primaryContainer}
              colors={[colors.primaryContainer]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // KPI header: número grande + label descriptivo
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.unit * 2,
    paddingHorizontal: spacing.containerPadding,
    paddingVertical: spacing.unit * 3,
  },
  kpiCount: {
    ...typography.headlineMd,
    color: colors.primaryContainer,
    fontVariant: ['tabular-nums'],
  },
  kpiLabel: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: 80,
    flexGrow: 1,
  },
  fullSpinner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMoreWrap: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerHigh,
  },
  retryBtnText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
});

export default ProofsTab;
