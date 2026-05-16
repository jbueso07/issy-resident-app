// app/admin/payments/_components/ChargesTab.js
// ISSY Admin - Lista-Cobros tab (Sprint 3 D4 refactor)
//
// Vista plana por pago individual (un row = un community_payment).
// Header: KPIs visuales (Sprint 3 D4) + search bar (debounced) + filter button
//         (deshabilitado en D4, D6 lo activa) + chips de status (D4).
// Body: FlatList de ChargeCard.
//
// NO incluido todavía (entran en D5-D7):
//   - filtros avanzados (botón tune) → D6
//   - month grouper con bar chart → D7
//   - scroll infinito / paginación → D7
//   - pull-to-refresh → D7
//
// Mantengo la firma de props (charges/stats/filter/setFilter/PAYMENT_STATUS/
// PAYMENT_TYPES) para compat con el consumer `app/admin/payments/index.js`.
// `charges` se usa como cache para resolver shape completo del cobro padre
// cuando se tap'ea un card. `stats` alimenta los KPIs. El resto se ignora.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Search,
  X,
  SlidersHorizontal,
  Inbox,
  SearchX,
  AlertCircle,
  CheckCircle2,
  Clock,
  Hourglass,
} from 'lucide-react-native';
import { formatCurrency } from '../_helpers';
import { colors, spacing, typography, radii } from '../_styles/theme';
import usePayments from '../_hooks/usePayments';
import ChargeCard from './cards/ChargeCard';
import KpiCard from './cards/KpiCard';
import StatusChips from './StatusChips';
import { AdvancedFiltersSheet, countAdvancedFilters } from './AdvancedFiltersSheet';

const SEARCH_DEBOUNCE_MS = 300;

export function ChargesTab({
  // `stats` alimenta los 3 KpiCard (post D4). Viene de useCharges via index.js.
  stats,
  // Sprint 3 D5: `charges` ya no se usa como cache de lookup — el callback
  // onChargePress ahora pasa el payment directo (el modal nuevo PaymentDetailModal
  // consume shape de getAllPayments, no de getCharges). Lo dejamos en la firma
  // para no romper la API del consumer (index.js sigue pasándolo).
  // eslint-disable-next-line no-unused-vars
  charges,
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

  // Status chip (Sprint 3 D4): Todos / Activos / Cancelados.
  // 'all' no envía el param (backend lista todo); 'active' lo agrega como
  // tal y el endpoint lo expande a NOT IN ('paid','cancelled') post-D4.
  const [statusChip, setStatusChip] = useState('all');
  useEffect(() => {
    setParams({ status: statusChip === 'all' ? undefined : statusChip });
  }, [statusChip, setParams]);

  // Sprint 3 D9: sheet de filtros avanzados (rango fechas + monto + método
  // + unit). El sheet mantiene su propio draft local y aplica via setParams.
  const [filtersSheetVisible, setFiltersSheetVisible] = useState(false);
  const advancedFilterCount = countAdvancedFilters(params);

  // Render del item de la FlatList.
  // Sprint 3 D5: el callback ahora pasa el payment directo (no el charge
  // adapter del D3). El consumidor (index.js) abre PaymentDetailModal nuevo
  // que consume shape de getAllPayments.
  const renderItem = ({ item }) => (
    <ChargeCard
      payment={item}
      onPress={() => {
        if (onChargePress) onChargePress(item);
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
      {/* KPIs (Sprint 3 D4): ScrollView horizontal con 3 KpiCard.
          Datos: `stats` prop (viene de useCharges via index.js). NO se filtra
          por search ni chips — son totales del location. D9 evaluará si conviene
          agregar endpoint /admin/payments/stats con filtros aplicados. */}
      {stats && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpisRow}
        >
          <KpiCard
            label={t('admin.payments.stats.collected', 'Cobrado')}
            value={formatCurrency(stats.total_collected || 0)}
            icon={CheckCircle2}
            accent="primary"
          />
          <KpiCard
            label={t('admin.payments.stats.pending', 'Pendiente')}
            value={formatCurrency(stats.total_pending || 0)}
            icon={Clock}
            accent="warning"
          />
          <KpiCard
            label={t('admin.payments.stats.proofs', 'En verificación')}
            value={String(stats.pending_proofs || 0)}
            icon={Hourglass}
            accent="info"
          />
        </ScrollView>
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
        {/* Filter button (Sprint 3 D9 lo activa con AdvancedFiltersSheet).
            Badge con conteo de filtros avanzados activos. */}
        <Pressable
          style={styles.filterBtn}
          onPress={() => setFiltersSheetVisible(true)}
          accessibilityLabel="Abrir filtros avanzados"
        >
          <SlidersHorizontal size={20} color={colors.onSurfaceVariant} strokeWidth={2} />
          {advancedFilterCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{advancedFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Status chips (Sprint 3 D4): Todos / Activos / Cancelados */}
      <View style={styles.chipsWrap}>
        <StatusChips value={statusChip} onChange={setStatusChip} />
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

      {/* Sprint 3 D9: Sheet de filtros avanzados. Aplica via setParams,
          mergea con los params existentes (status, search no se tocan). */}
      <AdvancedFiltersSheet
        visible={filtersSheetVisible}
        currentParams={params}
        onApply={(newParams) => {
          setParams((p) => ({ ...p, ...newParams }));
        }}
        onClose={() => setFiltersSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // KPIs row (Sprint 3 D4): horizontal scroll de KpiCard
  kpisRow: {
    paddingHorizontal: spacing.containerPadding,
    gap: spacing.cardGap,
    marginTop: 12,
    marginBottom: 8,
  },
  // Wrapper para StatusChips (chips ya tienen su propio padding/gap interno)
  chipsWrap: {
    marginBottom: 8,
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
    position: 'relative',
  },
  // Legacy: usado por el placeholder pre-D9 — mantenido por si algún consumer
  // externo lo referencia. Sprint D9 ya no lo aplica.
  filterBtnDisabled: {
    opacity: 0.5,
  },
  // Sprint 3 D9: badge contador en el botón "tune"
  filterBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    ...typography.labelSm,
    color: colors.onPrimaryContainer,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
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
