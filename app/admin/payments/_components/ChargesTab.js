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
import { formatCurrency, formatDate, isOverdue, groupChargesByPeriod, calculateCollectionPercentage } from '../_helpers';

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

  // Group charges by period
  const groupedCharges = useMemo(() => {
    if (!charges || charges.length === 0) return [];
    return groupChargesByPeriod(charges);
  }, [charges]);

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

      {/* Charges List - Grouped by Period */}
      {charges.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cash-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>{t('admin.payments.empty.noCharges', 'No hay cobros')}</Text>
          <Text style={styles.emptySubtitle}>{t('admin.payments.empty.createFirst', 'Crea tu primer cobro')}</Text>
          <TouchableOpacity style={styles.createButton} onPress={onCreatePress}>
            <Ionicons name="add-circle" size={20} color={COLORS.background} />
            <Text style={styles.createButtonText}>{t('admin.payments.newCharge', 'Nuevo Cobro')}</Text>
          </TouchableOpacity>
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
              paymentStatus={paymentStatus}
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
function ChargeCard({ charge, paymentStatus, onPress, t, getPaymentTypeIconFn, compact }) {
  const status = charge.display_status || charge.payment_status || charge.status || 'pending';
  const statusInfo = paymentStatus[status] || paymentStatus.pending;
  const chargeIsOverdue = status === 'pending' && isOverdue(charge.due_date);
  const displayStatus = chargeIsOverdue ? paymentStatus.overdue : statusInfo;
  
  const payment = charge.payment || charge.payments?.[0];
  const userName = payment?.user?.name || payment?.user?.full_name || charge.user?.name || charge.user_name || t('common.user', 'Usuario');
  const userUnit = payment?.user?.unit_number || charge.user?.unit_number || '';
  
  return (
    <TouchableOpacity
      style={[styles.chargeCard, compact && styles.chargeCardCompact]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconContainer, compact && styles.cardIconContainerCompact, { backgroundColor: COLORS.teal + '20' }]}>
          <Ionicons 
            name={getPaymentTypeIconFn(charge.charge_type || charge.payment_type)} 
            size={compact ? 16 : 20} 
            color={COLORS.teal} 
          />
        </View>
        <View style={styles.cardHeaderLeft}>
          <Text style={[styles.chargeConcept, compact && styles.chargeConceptCompact]}>
            {charge.title || charge.concept || t('admin.payments.types.maintenance', 'Mantenimiento')}
          </Text>
          <Text style={styles.chargeUser}>
            {userUnit ? `${userUnit} - ${userName}` : userName}
          </Text>
        </View>
        <View style={styles.cardHeaderRight}>
          <Text style={[styles.chargeAmount, compact && styles.chargeAmountCompact]}>
            {formatCurrency(charge.amount, charge.currency)}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <View style={[styles.statusBadge, { backgroundColor: displayStatus.color + '20' }]}>
          <Ionicons name={displayStatus.icon} size={12} color={displayStatus.color} />
          <Text style={[styles.statusText, { color: displayStatus.color }]}>
            {displayStatus.label}
          </Text>
        </View>
        <View style={styles.dueDateContainer}>
          <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
          <Text style={styles.dueDate}>{formatDate(charge.due_date)}</Text>
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
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
    gap: scale(4),
  },
  statusText: {
    fontSize: scale(11),
    fontWeight: '500',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  dueDate: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
  },
});

export default ChargesTab;
