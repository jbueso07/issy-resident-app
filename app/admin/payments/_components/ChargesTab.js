// app/admin/payments/_components/ChargesTab.js
// ISSY Admin - Lista-Cobros tab (Sprint 3 D3 refactor)
//
// Vista plana por pago individual (un row = un community_payment).
// Header: search bar (debounced) + filter button (deshabilitado en D3, D6 lo activa).
// Body: FlatList de ChargeCard.
//
// NO incluido en D3 (entran en D4-D7):
//   - chips de status (Todos/Activos/Cancelados)
//   - KPIs financieros
//   - filtros avanzados (botón tune)
//   - month grouper con bar chart
//   - scroll infinito / paginación
//   - pull-to-refresh
//
// Mantengo la firma de props (charges/stats/filter/setFilter/PAYMENT_STATUS/
// PAYMENT_TYPES) para compat con el consumer `app/admin/payments/index.js`,
// pero internamente ignoro las del hook legacy y uso `usePayments` (nuevo D3).

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Search, X, SlidersHorizontal, Inbox, SearchX, AlertCircle } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS as LEGACY_COLORS, scale } from '../_constants';
import { formatCurrency } from '../_helpers';
import { colors, spacing, typography, radii } from '../_styles/theme';
import usePayments from '../_hooks/usePayments';
import ChargeCard from './cards/ChargeCard';

const SEARCH_DEBOUNCE_MS = 300;

export function ChargesTab({
  // Sprint 3 D3: `charges` (cache de useCharges del padre) se USA como lookup
  // para resolver el shape completo del charge cuando el usuario toca un card.
  // El ChargeDetailModal espera shape completo de community_charges (con stats,
  // is_recurring, description, cancelled_at, currency, status); el payment del
  // endpoint D2 solo trae 5 campos en `payment.charge`. El fallback defensivo
  // cubre race conditions donde el cache aún no tiene el charge buscado.
  charges,
  // `stats` se RESTAURA en D3 con look-and-feel legacy (KPIs Cobrado /
  // Pendiente / Por verificar). D4 los migrará al diseño nuevo del mockup.
  stats,
  // Props legacy ignoradas internamente — el componente usa usePayments propio
  // eslint-disable-next-line no-unused-vars
  loading: _loadingLegacy,
  // eslint-disable-next-line no-unused-vars
  filter,
  // eslint-disable-next-line no-unused-vars
  setFilter,
  // eslint-disable-next-line no-unused-vars
  PAYMENT_STATUS,
  // eslint-disable-next-line no-unused-vars
  PAYMENT_TYPES,
  onChargePress,
  // eslint-disable-next-line no-unused-vars
  onCreatePress,
}) {
  const { t } = useTranslation();

  // Hook nuevo: consume /admin/payments (endpoint D2)
  const { data, loading, error, pagination, setParams, refetch } = usePayments();

  // Search input (controlled) + debounce a setParams
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const handle = setTimeout(() => {
      // Trim + vacío → null para que el backend no aplique el filter
      const next = searchInput.trim();
      setParams({ search: next.length > 0 ? next : undefined });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput, setParams]);

  const handleClearSearch = () => setSearchInput('');

  // Render del item de la FlatList
  const renderItem = ({ item }) => (
    <ChargeCard
      payment={item}
      onPress={() => {
        if (!onChargePress) return;
        // Buscar el charge completo desde el cache de useCharges (prop charges)
        const fullCharge = charges?.find((c) => c.id === item.charge_id);
        if (fullCharge) {
          onChargePress(fullCharge);
          return;
        }
        // Fallback defensivo si el charge no está en el cache (race condition)
        onChargePress({
          ...(item.charge || {}),
          id: item.charge_id,
          currency: item.currency,
          amount: item.charge?.amount ?? item.amount,
          status: 'active',
          stats: {
            total_amount_collected: 0,
            total_amount_expected: item.amount || 0,
            paid_count: 0,
            total_payments: 0,
          },
          is_recurring: false,
          recurring_period: null,
          description: '',
          cancelled_at: null,
        });
      }}
    />
  );

  // Empty / error / loading states
  const renderEmpty = () => {
    if (loading) {
      // ListEmptyComponent se renderiza con data vacía; el spinner principal
      // está en el contenedor (abajo).
      return null;
    }
    if (error) {
      return (
        <View style={styles.emptyState}>
          <AlertCircle size={48} color={colors.error} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>
            {t('admin.payments.list.errorTitle', 'No se pudo cargar')}
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
    if (searchInput.trim().length > 0) {
      return (
        <View style={styles.emptyState}>
          <SearchX size={48} color={colors.onSurfaceVariant} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>
            {t(
              'admin.payments.list.noResults',
              `Sin resultados para "${searchInput.trim()}"`
            )}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Inbox size={48} color={colors.onSurfaceVariant} strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>
          {t('admin.payments.list.empty', 'No hay cobros aún')}
        </Text>
      </View>
    );
  };

  // Loading inicial (sin data y sin error): spinner full
  const showFullSpinner = loading && data.length === 0 && !error;

  return (
    <View style={styles.container}>
      {/* Stats Cards (legacy COLORS/Ionicons) — Sprint 3 D3: restaurado tal cual
          el diseño anterior para evitar regresión funcional. D4 los migrará al
          look del mockup nuevo. */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={22} color={LEGACY_COLORS.success} />
            <Text style={[styles.statValue, { color: LEGACY_COLORS.success }]}>
              {formatCurrency(stats.total_collected || 0)}
            </Text>
            <Text style={styles.statLabel}>{t('admin.payments.stats.collected', 'Cobrado')}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={22} color={LEGACY_COLORS.warning} />
            <Text style={[styles.statValue, { color: LEGACY_COLORS.warning }]}>
              {formatCurrency(stats.total_pending || 0)}
            </Text>
            <Text style={styles.statLabel}>{t('admin.payments.stats.pending', 'Pendiente')}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="hourglass" size={22} color={LEGACY_COLORS.blue} />
            <Text style={[styles.statValue, { color: LEGACY_COLORS.blue }]}>
              {stats.pending_proofs || 0}
            </Text>
            <Text style={styles.statLabel}>{t('admin.payments.stats.proofs', 'Por verificar')}</Text>
          </View>
        </View>
      )}

      {/* Header: search bar + filter button (placeholder D6) */}
      <View style={styles.header}>
        <View style={styles.searchWrap}>
          <Search size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder={t(
              'admin.payments.list.searchPlaceholder',
              'Buscar residente o cargo...'
            )}
            placeholderTextColor={colors.onSurfaceVariant}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchInput.length > 0 ? (
            <Pressable onPress={handleClearSearch} hitSlop={8}>
              <X size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
        {/* Filter button — Sprint 3 D6 lo activa con modal de filtros avanzados */}
        <Pressable
          style={[styles.filterBtn, styles.filterBtnDisabled]}
          disabled={true}
          accessibilityLabel="Filtros (próximamente)"
        >
          <SlidersHorizontal size={20} color={colors.onSurfaceVariant} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Body */}
      {showFullSpinner ? (
        <View style={styles.fullSpinner}>
          <ActivityIndicator size="large" color={colors.primaryContainer} />
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
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
  // Stats Cards (legacy look) — Sprint 3 D3: restaurado para evitar regresión.
  // D4 los migra al diseño nuevo.
  statsContainer: {
    flexDirection: 'row',
    gap: scale(10),
    marginHorizontal: spacing.containerPadding,
    marginTop: 12,
    marginBottom: scale(8),
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: scale(12),
    borderRadius: scale(12),
    backgroundColor: LEGACY_COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: LEGACY_COLORS.border,
  },
  statValue: {
    fontSize: scale(13),
    fontWeight: '700',
    marginTop: scale(4),
  },
  statLabel: {
    fontSize: scale(10),
    color: LEGACY_COLORS.textSecondary,
    marginTop: scale(2),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.containerPadding,
    paddingVertical: 12,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    padding: 0, // RN agrega padding default en Android
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnDisabled: {
    opacity: 0.5,
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
  emptyState: {
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

export default ChargesTab;
