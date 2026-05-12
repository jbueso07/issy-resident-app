// app/admin/payments/components/ChargesTab.js
// ISSY Admin - Charges Tab Component with Period Grouping

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, scale, getFilterOptions } from '../_constants';
import {
  formatCurrency,
  groupChargesByPeriod,
  calculateCollectionPercentage,
  formatRelativeDueDate,
  formatRecurringPeriodLabel,
  formatAppliesToLabel,
  formatRelativeCancelledAt,
} from '../_helpers';

// TODO Sprint 2 D7: el set FILTER_OPTIONS del frontend incluye opciones
// (paid/pending/overdue) que el backend post-D4 no soporta — `community_charges`
// solo tiene status 'active'|'cancelled'. Filtros mismatch devuelven listas
// vacías. Ajustar getFilterOptions a ('all', 'active', 'cancelled') o agregar
// mapeo en el hook antes de mandar al backend.

export function ChargesTab({
  charges,
  stats,
  loading,
  filter,
  setFilter,
  onChargePress,
  onCreatePress,
  PAYMENT_STATUS,
  PAYMENT_TYPES,
}) {
  const { t } = useTranslation();
  const FILTER_OPTIONS = getFilterOptions(t);
  const [expandedPeriods, setExpandedPeriods] = useState({});

  const getPaymentTypeIconLocal = (type) => {
    return PAYMENT_TYPES?.find(pt => pt.value === type)?.icon || 'document-text';
  };

  // Group charges by period (con filtro de cancelados aplicado por el helper)
  const groupedCharges = useMemo(() => {
    if (!charges || charges.length === 0) return [];
    return groupChargesByPeriod(charges, filter);
  }, [charges, filter]);

  // Initialize all periods as expanded on first render
  useMemo(() => {
    if (groupedCharges.length > 0 && Object.keys(expandedPeriods).length === 0) {
      const initial = {};
      groupedCharges.forEach((group, idx) => {
        // Expand first 2 periods by default
        initial[group.key] = idx < 2;
      });
      setExpandedPeriods(initial);
    }
  }, [groupedCharges]);

  const togglePeriod = (key) => {
    setExpandedPeriods(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.lime} />
        <Text style={styles.loadingText}>{t('admin.payments.loading', 'Cargando...')}</Text>
      </View>
    );
  }

  return (
    <>
      {/* Stats Cards */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
            <Text style={[styles.statValue, { color: COLORS.success }]}>
              {formatCurrency(stats.total_collected || 0)}
            </Text>
            <Text style={styles.statLabel}>{t('admin.payments.stats.collected', 'Cobrado')}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={22} color={COLORS.warning} />
            <Text style={[styles.statValue, { color: COLORS.warning }]}>
              {formatCurrency(stats.total_pending || 0)}
            </Text>
            <Text style={styles.statLabel}>{t('admin.payments.stats.pending', 'Pendiente')}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="hourglass" size={22} color={COLORS.blue} />
            <Text style={[styles.statValue, { color: COLORS.blue }]}>
              {stats.pending_proofs || 0}
            </Text>
            <Text style={styles.statLabel}>{t('admin.payments.stats.proofs', 'Por verificar')}</Text>
          </View>
        </View>
      )}

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
        <View style={styles.filters}>
          {FILTER_OPTIONS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterButton, filter === f.key && styles.filterButtonActive]}
              onPress={() => setFilter(f.key)}
            >
              <Ionicons
                name={f.icon}
                size={16}
                color={filter === f.key ? COLORS.background : COLORS.textSecondary}
              />
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Banner sutil cuando se muestran cancelados (Sprint 2 D7) */}
      {filter === 'cancelled' ? (
        <View style={styles.cancelledBanner}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.cancelledBannerText}>
            {t(
              'admin.payments.banner.cancelled',
              'Mostrando cobros cancelados (historial)'
            )}
          </Text>
        </View>
      ) : null}

      {/* Charges List - Grouped by Period */}
      {charges.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={filter === 'cancelled' ? 'archive-outline' : 'cash-outline'}
            size={64}
            color={COLORS.textMuted}
          />
          <Text style={styles.emptyTitle}>
            {filter === 'cancelled'
              ? t('admin.payments.empty.noCancelled', 'No hay cobros cancelados')
              : t('admin.payments.empty.noCharges', 'No hay cobros')}
          </Text>
          {filter !== 'cancelled' ? (
            <>
              <Text style={styles.emptySubtitle}>
                {t('admin.payments.empty.createFirst', 'Crea tu primer cobro')}
              </Text>
              <TouchableOpacity style={styles.createButton} onPress={onCreatePress}>
                <Ionicons name="add-circle" size={20} color={COLORS.background} />
                <Text style={styles.createButtonText}>
                  {t('admin.payments.newCharge', 'Nuevo Cobro')}
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      ) : (
        groupedCharges.map((group) => (
          <PeriodSection
            key={group.key}
            group={group}
            expanded={expandedPeriods[group.key]}
            onToggle={() => togglePeriod(group.key)}
            onChargePress={onChargePress}
            paymentStatus={PAYMENT_STATUS}
            getPaymentTypeIconFn={getPaymentTypeIconLocal}
            t={t}
          />
        ))
      )}
    </>
  );
}

// Period Section Component
function PeriodSection({ group, expanded, onToggle, onChargePress, paymentStatus, getPaymentTypeIconFn, t }) {
  const percentage = calculateCollectionPercentage(group.collected, group.total);
  
  return (
    <View style={styles.periodSection}>
      {/* Period Header - Collapsible */}
      <TouchableOpacity 
        style={styles.periodHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.periodHeaderLeft}>
          <Ionicons 
            name={expanded ? 'chevron-down' : 'chevron-forward'} 
            size={20} 
            color={COLORS.textSecondary} 
          />
          <Text style={styles.periodTitle}>{group.label}</Text>
          <View style={styles.periodBadge}>
            <Text style={styles.periodBadgeText}>{group.charges.length}</Text>
          </View>
        </View>
        
        <View style={styles.periodHeaderRight}>
          <Text style={styles.periodPercentage}>{percentage}%</Text>
        </View>
      </TouchableOpacity>

      {/* Period Stats Bar */}
      <View style={styles.periodStatsBar}>
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${percentage}%`,
                backgroundColor: percentage >= 80 ? COLORS.success : 
                                 percentage >= 50 ? COLORS.warning : COLORS.danger
              }
            ]} 
          />
        </View>
        <View style={styles.periodStatsRow}>
          <View style={styles.periodStat}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
            <Text style={[styles.periodStatText, { color: COLORS.success }]}>
              {formatCurrency(group.collected)}
            </Text>
          </View>
          <View style={styles.periodStat}>
            <Ionicons name="time" size={14} color={COLORS.warning} />
            <Text style={[styles.periodStatText, { color: COLORS.warning }]}>
              {formatCurrency(group.pending)}
            </Text>
          </View>
          <View style={styles.periodStat}>
            <Text style={styles.periodStatLabel}>{t('admin.payments.period.total', 'Total')}:</Text>
            <Text style={styles.periodStatTotal}>{formatCurrency(group.total)}</Text>
          </View>
        </View>
      </View>

      {/* Charges in Period */}
      {expanded && (
        <View style={styles.periodCharges}>
          {group.charges.map((charge) => (
            <ChargeCard
              key={charge.id}
              charge={charge}
              onPress={() => onChargePress(charge)}
              t={t}
              getPaymentTypeIconFn={getPaymentTypeIconFn}
              compact={true}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// Charge Card Sub-component
// Sprint 2 D5: 1 card = 1 cobro padre (no por residente).
// Lee de charge.stats agregadas server-side.
function ChargeCard({ charge, onPress, t, getPaymentTypeIconFn, compact }) {
  const stats = charge.stats || {
    paid_count: 0,
    total_payments: 0,
    total_amount_expected: 0,
    total_amount_collected: 0,
  };
  const isCancelled = charge.status === 'cancelled';
  const hasResidents = stats.total_payments > 0;
  const isCompleted = !isCancelled && hasResidents && stats.paid_count === stats.total_payments;
  const isInProgress = !isCancelled && hasResidents && stats.paid_count < stats.total_payments;

  // Stats badge: color y texto dependen del estado
  let statsBadgeColor;
  let statsBadgeIcon;
  let statsBadgeText;
  if (isCancelled) {
    statsBadgeColor = COLORS.textMuted;
    statsBadgeIcon = 'close-circle';
    statsBadgeText = formatRelativeCancelledAt(charge.cancelled_at, t);
  } else if (isCompleted) {
    statsBadgeColor = COLORS.success;
    statsBadgeIcon = 'checkmark-circle';
    statsBadgeText = t(
      'admin.payments.stats.allPaid',
      `${stats.paid_count} de ${stats.total_payments} pagaron`,
      { paid: stats.paid_count, total: stats.total_payments }
    );
  } else if (isInProgress) {
    statsBadgeColor = COLORS.warning;
    statsBadgeIcon = 'time';
    statsBadgeText = t(
      'admin.payments.stats.partial',
      `${stats.paid_count} de ${stats.total_payments} pagaron`,
      { paid: stats.paid_count, total: stats.total_payments }
    );
  } else {
    // active + sin residentes (edge case post-D3 roster vacío)
    statsBadgeColor = COLORS.textMuted;
    statsBadgeIcon = 'people-outline';
    statsBadgeText = t('admin.payments.stats.noResidents', 'Sin residentes');
  }

  // Due date relativo (solo cards no canceladas)
  const dueDateInfo = !isCancelled ? formatRelativeDueDate(charge.due_date, t) : null;
  let dueDateColor = COLORS.textSecondary;
  if (dueDateInfo) {
    if (dueDateInfo.severity === 'overdue') dueDateColor = COLORS.danger;
    else if (dueDateInfo.severity === 'today') dueDateColor = COLORS.warning;
  }

  // Type badges
  const appliesLabel = formatAppliesToLabel(charge, t);
  const recurringLabel = charge.is_recurring
    ? formatRecurringPeriodLabel(charge.recurring_period, t)
    : null;

  return (
    <TouchableOpacity
      style={[
        styles.chargeCard,
        compact && styles.chargeCardCompact,
        isCancelled && styles.chargeCardCancelled,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header: icon + title + amount */}
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.cardIconContainer,
            compact && styles.cardIconContainerCompact,
            { backgroundColor: COLORS.teal + '20' },
          ]}
        >
          <Ionicons
            name={getPaymentTypeIconFn(charge.charge_type || charge.payment_type)}
            size={compact ? 16 : 20}
            color={COLORS.teal}
          />
        </View>
        <View style={styles.cardHeaderLeft}>
          <Text
            style={[
              styles.chargeConcept,
              compact && styles.chargeConceptCompact,
              isCancelled && styles.chargeTitleCancelled,
            ]}
          >
            {charge.title || t('admin.payments.types.maintenance', 'Mantenimiento')}
          </Text>
        </View>
        <View style={styles.cardHeaderRight}>
          <Text style={[styles.chargeAmount, compact && styles.chargeAmountCompact]}>
            {formatCurrency(charge.amount, charge.currency)}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </View>
      </View>

      {/* Middle: stats badge + due date relativo */}
      <View style={styles.cardMiddle}>
        <View style={[styles.statsBadge, { backgroundColor: statsBadgeColor + '20' }]}>
          <Ionicons name={statsBadgeIcon} size={12} color={statsBadgeColor} />
          <Text style={[styles.statusText, { color: statsBadgeColor }]}>
            {statsBadgeText}
          </Text>
        </View>
        {dueDateInfo && !!dueDateInfo.label && (
          <View style={styles.dueDateContainer}>
            <Ionicons name="calendar-outline" size={12} color={dueDateColor} />
            <Text style={[styles.dueDate, { color: dueDateColor }]}>
              {dueDateInfo.label}
            </Text>
          </View>
        )}
      </View>

      {/* Footer: applies_to + recurring badges */}
      <View style={styles.cardFooter}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{appliesLabel}</Text>
        </View>
        {recurringLabel && (
          <View style={styles.typeBadge}>
            <Ionicons name="repeat" size={11} color={COLORS.textSecondary} />
            <Text style={styles.typeBadgeText}>{recurringLabel}</Text>
          </View>
        )}
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
  statsContainer: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: scale(16),
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: scale(12),
    borderRadius: scale(12),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: scale(13),
    fontWeight: '700',
    marginTop: scale(4),
  },
  statLabel: {
    fontSize: scale(10),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  filtersScroll: {
    marginBottom: scale(16),
    marginHorizontal: scale(-16),
  },
  filters: {
    flexDirection: 'row',
    gap: scale(8),
    paddingHorizontal: scale(16),
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(6),
  },
  filterButtonActive: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  filterText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.background,
  },
  // Banner sutil cuando filter === 'cancelled' (Sprint 2 D7)
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    marginBottom: scale(12),
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(8),
    gap: scale(6),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelledBannerText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    flex: 1,
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lime,
    paddingHorizontal: scale(20),
    paddingVertical: scale(12),
    borderRadius: scale(10),
    marginTop: scale(20),
    gap: scale(8),
  },
  createButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.background,
  },
  // Period Section Styles
  periodSection: {
    marginBottom: scale(16),
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundTertiary,
    paddingHorizontal: scale(12),
    paddingVertical: scale(12),
    borderRadius: scale(12),
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  periodHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  periodTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
    textTransform: 'capitalize',
  },
  periodBadge: {
    backgroundColor: COLORS.teal + '30',
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(10),
  },
  periodBadgeText: {
    fontSize: scale(12),
    fontWeight: '600',
    color: COLORS.teal,
  },
  periodHeaderRight: {
    alignItems: 'flex-end',
  },
  periodPercentage: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.lime,
  },
  periodStatsBar: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    borderBottomLeftRadius: scale(12),
    borderBottomRightRadius: scale(12),
  },
  progressBarContainer: {
    height: scale(6),
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(3),
    marginBottom: scale(8),
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: scale(3),
  },
  periodStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  periodStatText: {
    fontSize: scale(12),
    fontWeight: '600',
  },
  periodStatLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  periodStatTotal: {
    fontSize: scale(12),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  periodCharges: {
    marginTop: scale(8),
  },
  // Charge Card Styles
  chargeCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chargeCardCompact: {
    padding: scale(12),
    marginBottom: scale(8),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  cardIconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  cardIconContainerCompact: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
    marginRight: scale(10),
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: scale(4),
  },
  chargeConcept: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  chargeConceptCompact: {
    fontSize: scale(14),
  },
  chargeUser: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  chargeAmount: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  chargeAmountCompact: {
    fontSize: scale(15),
  },
  cardMiddle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
    gap: scale(8),
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
    gap: scale(4),
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
    gap: scale(4),
    flexShrink: 1,
  },
  statusText: {
    fontSize: scale(11),
    fontWeight: '500',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    flexShrink: 0,
  },
  dueDate: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
  },
  chargeCardCancelled: {
    opacity: 0.6,
  },
  chargeTitleCancelled: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
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
});

export default ChargesTab;
