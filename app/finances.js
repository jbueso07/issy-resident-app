import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Alert,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppModal } from '../src/components';
import {
  getFinanceDashboard,
  getTransactions,
  createTransaction,
  getCategories,
  getFinanceGoals,
  createFinanceGoal,
  addGoalContribution,
  getPersonalizedTips,
  markTipAsRead,
  sendTipFeedback,
  getUpcomingInvoices,
  createInvoice,
  markInvoicePaid,
  getBudgetsStatus,
  createBudget,
  deleteBudget,
  getFinancePlans,
  getFinanceUsageLimits,
  upgradeFinancePlan,
  getPaymentMethods,
  subscribeToPlan
} from '../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ProHome Dark Theme Colors - Mejorados
const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  card: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  teal: '#5DDED8',
  tealDark: '#4BCDC7',
  lime: '#D4FE48',
  purple: '#8B5CF6',
  purpleLight: '#A78BFA',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  // Colores mejorados
  green: '#22C55E',
  greenBg: 'rgba(34, 197, 94, 0.12)',
  greenBorder: 'rgba(34, 197, 94, 0.35)',
  red: '#F43F5E',
  redBg: 'rgba(244, 63, 94, 0.12)',
  redBorder: 'rgba(244, 63, 94, 0.35)',
  yellow: '#F59E0B',
  blue: '#3B82F6',
};

export default function FinancesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tips, setTips] = useState([]);
  const [upcomingInvoices, setUpcomingInvoices] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [plans, setPlans] = useState([]);
  const [limits, setLimits] = useState(null);
  
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showInvoiceDetailModal, setShowInvoiceDetailModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedTip, setSelectedTip] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  const [transactionType, setTransactionType] = useState('expense');
  const [transactionForm, setTransactionForm] = useState({ amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0] });
  const [goalForm, setGoalForm] = useState({ name: '', target_amount: '', icon: '🎯' });
  const [contributionAmount, setContributionAmount] = useState('');
  const [invoiceForm, setInvoiceForm] = useState({ vendor_name: '', amount: '', category: '', due_date: '', description: '' });
  const [budgetForm, setBudgetForm] = useState({ category: '', amount: '', icon: '💰' });

  const loadData = useCallback(async () => {
    try {
      const [dashRes, transRes, goalsRes, catRes, tipsRes, invoicesRes, budgetsRes, plansRes, limitsRes] = await Promise.all([
        getFinanceDashboard().catch(() => ({ success: false })),
        getTransactions({ limit: 10 }).catch(() => ({ success: false })),
        getFinanceGoals().catch(() => ({ success: false })),
        getCategories().catch(() => ({ success: false })),
        getPersonalizedTips(i18n.language).catch(() => ({ success: false })),
        getUpcomingInvoices(14).catch(() => ({ success: false })),
        getBudgetsStatus().catch(() => ({ success: false })),
        getFinancePlans().catch(() => ({ success: false })),
        getFinanceUsageLimits().catch(() => ({ success: false }))
      ]);
      
      if (dashRes.success) setDashboard(dashRes.data);
      if (transRes.success) setTransactions(transRes.data || []);
      if (goalsRes.success) setGoals(goalsRes.data || []);
      if (catRes.success) setCategories(catRes.data || []);
      if (tipsRes.success) setTips(tipsRes.data || []);
      if (invoicesRes.success) setUpcomingInvoices(invoicesRes.data || []);
      if (budgetsRes.success) setBudgets(budgetsRes.data || []);
      if (plansRes.success) setPlans(plansRes.data || []);
      if (limitsRes.success) setLimits(limitsRes.data);
    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const checkLimit = (type) => {
    if (!limits) return true;
    if (limits.is_premium) return true;
    
    switch(type) {
      case 'transaction':
        if (!limits.transactions.unlimited && limits.transactions.remaining <= 0) {
          setShowUpgradeModal(true);
          return false;
        }
        break;
      case 'goal':
        if (!limits.goals.unlimited && limits.goals.remaining <= 0) {
          setShowUpgradeModal(true);
          return false;
        }
        break;
      case 'budget':
        if (!limits.budgets.available) {
          setShowUpgradeModal(true);
          return false;
        }
        break;
      case 'invoice':
        if (!limits.invoices.available) {
          setShowUpgradeModal(true);
          return false;
        }
        break;
    }
    return true;
  };

  const handleTipPress = async (tip) => {
    setSelectedTip(tip);
    setShowTipModal(true);
    if (tip.id && !tip.id.startsWith('dynamic_')) await markTipAsRead(tip.id);
  };

  const handleTipFeedback = async (helpful) => {
    if (selectedTip?.id && !selectedTip.id.startsWith('dynamic_')) await sendTipFeedback(selectedTip.id, helpful);
    setShowTipModal(false);
    setSelectedTip(null);
    const tipsRes = await getPersonalizedTips(i18n.language);
    if (tipsRes.success) setTips(tipsRes.data || []);
  };

  const dismissTip = async () => {
    if (selectedTip?.id && !selectedTip.id.startsWith('dynamic_')) await sendTipFeedback(selectedTip.id, null, true);
    setShowTipModal(false);
    setSelectedTip(null);
    setTips(tips.filter(t => t.id !== selectedTip?.id));
  };

  const handleCreateTransaction = async () => {
    if (!transactionForm.amount || !transactionForm.category) { Alert.alert(t('common.error'), t('finances.errors.amountCategoryRequired')); return; }
    try {
      const res = await createTransaction({ type: transactionType, amount: parseFloat(transactionForm.amount), category: transactionForm.category, description: transactionForm.description, date: transactionForm.date });
      if (res.success) { Alert.alert(t('finances.success.transactionTitle'), t('finances.success.transactionRegistered')); setShowTransactionModal(false); setTransactionForm({ amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0] }); loadData(); }
      else Alert.alert(t('common.error'), res.error || t('finances.errors.registerFailed'));
    } catch (error) { Alert.alert(t('common.error'), t('finances.errors.transactionError')); }
  };

  const handleCreateGoal = async () => {
    if (!goalForm.name || !goalForm.target_amount) { Alert.alert(t('common.error'), t('finances.errors.goalNameAmountRequired')); return; }
    try {
      const res = await createFinanceGoal({ name: goalForm.name, target_amount: parseFloat(goalForm.target_amount), icon: goalForm.icon, deadline: goalForm.deadline || null });
      if (res.success) { Alert.alert(t('finances.success.goalTitle'), t('finances.success.goalCreated')); setShowGoalModal(false); setGoalForm({ name: '', target_amount: '', icon: '🎯' }); loadData(); }
      else Alert.alert(t('common.error'), res.error || t('finances.errors.createGoalFailed'));
    } catch (error) { Alert.alert(t('common.error'), t('finances.errors.goalError')); }
  };

  const handleAddContribution = async () => {
    if (!contributionAmount || parseFloat(contributionAmount) <= 0) { Alert.alert(t('common.error'), t('finances.errors.validAmountRequired')); return; }
    try {
      const res = await addGoalContribution(selectedGoal.id, { amount: parseFloat(contributionAmount) });
      if (res.success) { Alert.alert(t('finances.success.contributionTitle'), res.message || t('finances.success.contributionAdded')); setShowContributionModal(false); setContributionAmount(''); setSelectedGoal(null); loadData(); }
      else Alert.alert(t('common.error'), res.error || t('finances.errors.contributionFailed'));
    } catch (error) { Alert.alert(t('common.error'), t('finances.errors.contributionError')); }
  };

  const handleCreateInvoice = async () => {
    if (!invoiceForm.vendor_name || !invoiceForm.amount) { Alert.alert(t('common.error'), t('finances.errors.vendorAmountRequired')); return; }
    try {
      const res = await createInvoice({ vendor_name: invoiceForm.vendor_name, amount: parseFloat(invoiceForm.amount), category: invoiceForm.category || 'Servicios', due_date: invoiceForm.due_date || null, description: invoiceForm.description });
      if (res.success) { Alert.alert(t('finances.success.invoiceTitle'), res.message || t('finances.success.invoiceRegistered')); setShowInvoiceModal(false); setInvoiceForm({ vendor_name: '', amount: '', category: '', due_date: '', description: '' }); loadData(); }
      else Alert.alert(t('common.error'), res.error || t('finances.errors.registerFailed'));
    } catch (error) { Alert.alert(t('common.error'), t('finances.errors.invoiceError')); }
  };

  const handlePayInvoice = async () => {
    if (!selectedInvoice) return;
    try {
      const res = await markInvoicePaid(selectedInvoice.id);
      if (res.success) { Alert.alert(t('finances.success.paidTitle'), res.message || t('finances.success.invoicePaid')); setShowInvoiceDetailModal(false); setSelectedInvoice(null); loadData(); }
      else Alert.alert(t('common.error'), res.error);
    } catch (error) { Alert.alert(t('common.error'), t('finances.errors.markPaidError')); }
  };

  const handleCreateBudget = async () => {
    if (!budgetForm.category || !budgetForm.amount) { Alert.alert(t('common.error'), t('finances.errors.categoryAmountRequired')); return; }
    try {
      const res = await createBudget({ category: budgetForm.category, amount: parseFloat(budgetForm.amount), icon: budgetForm.icon });
      if (res.success) { Alert.alert(t('finances.success.budgetTitle'), res.message || t('finances.success.budgetCreated')); setShowBudgetModal(false); setBudgetForm({ category: '', amount: '', icon: '💰' }); loadData(); }
      else Alert.alert(t('common.error'), res.error || t('finances.errors.createFailed'));
    } catch (error) { Alert.alert(t('common.error'), t('finances.errors.budgetError')); }
  };

  const handleDeleteBudget = async (budgetId) => {
    Alert.alert(t('finances.deleteBudget.title'), t('finances.deleteBudget.confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        const res = await deleteBudget(budgetId);
        if (res.success) loadData();
        else Alert.alert(t('common.error'), res.error);
      }}
    ]);
  };

  const handleUpgrade = async (planName) => {
    try {
      const methodsRes = await getPaymentMethods();
      
      if (!methodsRes.success || !methodsRes.data || methodsRes.data.length === 0) {
        Alert.alert(
          t('finances.upgrade.paymentRequired'),
          t('finances.upgrade.addPaymentMethod'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('finances.upgrade.addCard'), onPress: () => { setShowUpgradeModal(false); router.push('/payment-methods'); }}
          ]
        );
        return;
      }

      const defaultMethod = methodsRes.data.find(m => m.is_default) || methodsRes.data[0];
      
      Alert.alert(
        t('finances.upgrade.confirmTitle'),
        t('finances.upgrade.confirmMessage', { plan: planName, lastFour: defaultMethod.last_four }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('finances.upgrade.subscribe'), onPress: async () => {
            try {
              const selectedPlan = plans.find(p => p.name === planName || p.display_name === planName);
              if (!selectedPlan) { Alert.alert(t('common.error'), t('finances.errors.planNotFound')); return; }
              const result = await subscribeToPlan(selectedPlan.id, defaultMethod.id, 'monthly');
              if (result.success) {
                Alert.alert(t('finances.success.congratsTitle'), result.message || t('finances.success.subscriptionActivated'),
                  [{ text: 'OK', onPress: () => { setShowUpgradeModal(false); loadData(); }}]
                );
              } else { Alert.alert(t('common.error'), result.error || t('finances.errors.subscriptionFailed')); }
            } catch (error) { Alert.alert(t('common.error'), t('finances.errors.subscriptionError') + ': ' + error.message); }
          }}
        ]
      );
    } catch (error) { Alert.alert(t('common.error'), t('finances.errors.paymentMethodsError') + ': ' + error.message); }
  };

  const formatCurrency = (amount) => `L ${parseFloat(amount || 0).toLocaleString('es-HN', { minimumFractionDigits: 0 })}`;
  const getProgressPercentage = (current, target) => Math.min((parseFloat(current) / parseFloat(target)) * 100, 100);
  const getLevelInfo = (level) => {
    const levels = { 1: { name: 'Principiante', color: COLORS.textMuted }, 2: { name: 'Aprendiz', color: COLORS.green }, 3: { name: 'Intermedio', color: COLORS.blue }, 4: { name: 'Avanzado', color: COLORS.purple }, 5: { name: 'Experto', color: COLORS.yellow } };
    return levels[Math.min(level, 5)] || levels[1];
  };
  const getUrgencyColor = (urgency) => ({ overdue: COLORS.red, urgent: COLORS.yellow, soon: COLORS.blue, ok: COLORS.green }[urgency] || COLORS.textMuted);
  const getUrgencyText = (urgency, days) => {
    if (urgency === 'overdue') return `Vencida hace ${Math.abs(days)} días`;
    if (urgency === 'urgent') return `Vence en ${days} días`;
    return `${days} días restantes`;
  };
  const getBudgetStatusColor = (status) => ({ exceeded: COLORS.red, warning: COLORS.yellow, ok: COLORS.green }[status] || COLORS.textMuted);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>{t('finances.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = dashboard?.stats || { level: 1, xp: 0, current_streak: 0 };
  const levelInfo = getLevelInfo(stats.level);
  const xpProgress = (stats.xp % 100);
  const isPremium = limits?.is_premium || false;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('finances.title')}</Text>
        {isPremium ? (
          <View style={styles.premiumBadgeHeader}><Text style={styles.premiumBadgeHeaderText}>💎 PRO</Text></View>
        ) : (
          <TouchableOpacity onPress={() => setShowUpgradeModal(true)} style={styles.upgradeButtonSmall}>
            <Text style={styles.upgradeButtonSmallText}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.purple} />} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={styles.statValue}>{stats.current_streak}</Text>
              <Text style={styles.statLabel}>{t('finances.stats.streak')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>⭐</Text>
              <Text style={styles.statValue}>{t('finances.stats.level', { level: stats.level })}</Text>
              <Text style={styles.statLabel}>{levelInfo.name}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>✨</Text>
              <Text style={styles.statValue}>{stats.xp}</Text>
              <Text style={styles.statLabel}>XP</Text>
            </View>
          </View>
          <View style={styles.xpContainer}>
            <View style={styles.xpBarBg}>
              <View style={[styles.xpBarFill, { width: `${xpProgress}%` }]} />
            </View>
            <Text style={styles.xpText}>{t('finances.stats.xpProgress', { current: stats.xp % 100, nextLevel: stats.level + 1 })}</Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity style={[styles.tab, activeTab === 'dashboard' && styles.tabActive]} onPress={() => setActiveTab('dashboard')}>
            <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>💰 {t('finances.tabs.dashboard')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'invoices' && styles.tabActive]} onPress={() => setActiveTab('invoices')}>
            <Text style={[styles.tabText, activeTab === 'invoices' && styles.tabTextActive]}>🧾 {t('finances.tabs.invoices')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'budgets' && styles.tabActive]} onPress={() => setActiveTab('budgets')}>
            <Text style={[styles.tabText, activeTab === 'budgets' && styles.tabTextActive]}>📊 {t('finances.tabs.budget')}</Text>
          </TouchableOpacity>
        </View>

        {/* Usage Limit Banner */}
        {!isPremium && limits && (
          <TouchableOpacity style={styles.limitBanner} onPress={() => setShowUpgradeModal(true)}>
            <View style={styles.limitBannerIcon}>
              <Ionicons name="diamond" size={20} color={COLORS.purple} />
            </View>
            <View style={styles.limitBannerContent}>
              <Text style={styles.limitBannerTitle}>Plan Gratuito</Text>
              <Text style={styles.limitBannerText}>
                {limits.transactions?.remaining > 0 
                  ? `${limits.transactions.remaining} transacciones restantes`
                  : '¡Límite alcanzado! Upgrade para continuar'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.purple} />
          </TouchableOpacity>
        )}

        {activeTab === 'dashboard' && (
          <>
            {/* Tips Section */}
            {tips.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💡 {t('finances.sections.tipsForYou')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tipsScroll}>
                  {tips.map((tip, index) => (
                    <TouchableOpacity key={tip.id || index} style={[styles.tipCard, tip.is_premium && styles.tipCardPremium]} onPress={() => handleTipPress(tip)}>
                      {tip.is_premium && <View style={styles.premiumBadge}><Text style={styles.premiumBadgeText}>PRO</Text></View>}
                      <Text style={styles.tipIcon}>{tip.icon || '💡'}</Text>
                      <Text style={styles.tipTitle} numberOfLines={2}>{tip.title}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Invoice Alert */}
            {upcomingInvoices.length > 0 && (
              <TouchableOpacity style={styles.invoiceAlert} onPress={() => setActiveTab('invoices')}>
                <Text style={styles.invoiceAlertIcon}>⚠️</Text>
                <View style={styles.invoiceAlertContent}>
                  <Text style={styles.invoiceAlertTitle}>{t('finances.invoiceAlert', { count: upcomingInvoices.length })}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.yellow} />
              </TouchableOpacity>
            )}

            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>{t('finances.balance.monthBalance')}</Text>
              <Text style={[styles.balanceAmount, { color: (dashboard?.summary?.balance || dashboard?.month?.balance || 0) >= 0 ? COLORS.green : COLORS.red }]}>
                {formatCurrency(dashboard?.summary?.balance || dashboard?.month?.balance || 0)}
              </Text>
              <View style={styles.balanceRow}>
                <View style={styles.balanceItem}>
                  <View style={[styles.balanceItemIconBox, { backgroundColor: COLORS.greenBg }]}>
                    <Ionicons name="trending-up" size={18} color={COLORS.green} />
                  </View>
                  <Text style={styles.balanceItemLabel}>{t('finances.balance.income')}</Text>
                  <Text style={[styles.balanceItemValue, { color: COLORS.green }]}>{formatCurrency(dashboard?.summary?.income || dashboard?.month?.income || 0)}</Text>
                </View>
                <View style={styles.balanceDivider} />
                <View style={styles.balanceItem}>
                  <View style={[styles.balanceItemIconBox, { backgroundColor: COLORS.redBg }]}>
                    <Ionicons name="trending-down" size={18} color={COLORS.red} />
                  </View>
                  <Text style={styles.balanceItemLabel}>{t('finances.balance.expenses')}</Text>
                  <Text style={[styles.balanceItemValue, { color: COLORS.red }]}>{formatCurrency(dashboard?.summary?.expenses || dashboard?.month?.expenses || 0)}</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions - MEJORADOS */}
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.quickActionIncome} 
                onPress={() => { if (checkLimit('transaction')) { setTransactionType('income'); setShowTransactionModal(true); } }}
              >
                <View style={styles.quickActionIconIncome}>
                  <Ionicons name="add" size={26} color={COLORS.green} />
                </View>
                <Text style={styles.quickActionTextIncome}>{t('finances.quickActions.income')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionExpense} 
                onPress={() => { if (checkLimit('transaction')) { setTransactionType('expense'); setShowTransactionModal(true); } }}
              >
                <View style={styles.quickActionIconExpense}>
                  <Ionicons name="remove" size={26} color={COLORS.red} />
                </View>
                <Text style={styles.quickActionTextExpense}>{t('finances.quickActions.expense')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionGoal} 
                onPress={() => { if (checkLimit('goal')) setShowGoalModal(true); }}
              >
                <View style={styles.quickActionIconGoal}>
                  <Ionicons name="flag" size={24} color={COLORS.teal} />
                </View>
                <Text style={styles.quickActionTextGoal}>{t('finances.quickActions.goal')}</Text>
              </TouchableOpacity>
            </View>

            {/* Goals Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🎯 {t('finances.sections.myGoals')}</Text>
                <TouchableOpacity onPress={() => { if (checkLimit('goal')) setShowGoalModal(true); }}>
                  <Text style={styles.sectionAction}>+ {t('finances.new')}</Text>
                </TouchableOpacity>
              </View>
              {goals.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🎯</Text>
                  <Text style={styles.emptyText}>{t('finances.empty.noGoals')}</Text>
                  <Text style={styles.emptySubtext}>{t('finances.empty.createGoalHint')}</Text>
                </View>
              ) : goals.map(goal => (
                <TouchableOpacity key={goal.id} style={styles.goalCard} onPress={() => { setSelectedGoal(goal); setShowContributionModal(true); }}>
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalIcon}>{goal.icon}</Text>
                    <View style={styles.goalInfo}>
                      <Text style={styles.goalName}>{goal.name}</Text>
                      <Text style={styles.goalProgress}>{formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}</Text>
                    </View>
                    <Text style={styles.goalPercentage}>{Math.round(getProgressPercentage(goal.current_amount, goal.target_amount))}%</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${getProgressPercentage(goal.current_amount, goal.target_amount)}%`, backgroundColor: COLORS.teal }]} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Transactions Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 {t('finances.sections.latestTransactions')}</Text>
              {transactions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📝</Text>
                  <Text style={styles.emptyText}>{t('finances.empty.noTransactions')}</Text>
                </View>
              ) : transactions.slice(0, 5).map(trans => (
                <View key={trans.id} style={styles.transactionItem}>
                  <View style={[styles.transactionIconBox, { backgroundColor: trans.type === 'income' ? COLORS.greenBg : COLORS.redBg }]}>
                    <Ionicons name={trans.type === 'income' ? 'trending-up' : 'trending-down'} size={18} color={trans.type === 'income' ? COLORS.green : COLORS.red} />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionCategory}>{trans.category}</Text>
                    <Text style={styles.transactionDate}>{new Date(trans.date).toLocaleDateString('es-HN', { day: '2-digit', month: 'short' })}</Text>
                  </View>
                  <Text style={[styles.transactionAmount, { color: trans.type === 'income' ? COLORS.green : COLORS.red }]}>
                    {trans.type === 'income' ? '+' : '-'}{formatCurrency(trans.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {activeTab === 'invoices' && (
          <>
            {!isPremium && (
              <TouchableOpacity style={styles.premiumFeatureBanner} onPress={() => setShowUpgradeModal(true)}>
                <Ionicons name="diamond" size={24} color={COLORS.yellow} />
                <View style={styles.premiumFeatureContent}>
                  <Text style={styles.premiumFeatureTitle}>{t('finances.premium.featureTitle')}</Text>
                  <Text style={styles.premiumFeatureText}>{t('finances.premium.invoicesFeature')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.yellow} />
              </TouchableOpacity>
            )}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🧾 {t('finances.sections.pendingInvoices')}</Text>
              <TouchableOpacity onPress={() => { if (checkLimit('invoice')) setShowInvoiceModal(true); }}>
                <Text style={styles.sectionAction}>+ {t('finances.new')}</Text>
              </TouchableOpacity>
            </View>
            {upcomingInvoices.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🧾</Text>
                <Text style={styles.emptyText}>{t('finances.empty.noInvoices')}</Text>
                <TouchableOpacity style={styles.emptyButton} onPress={() => { if (checkLimit('invoice')) setShowInvoiceModal(true); }}>
                  <Text style={styles.emptyButtonText}>{t('finances.registerInvoice')}</Text>
                </TouchableOpacity>
              </View>
            ) : upcomingInvoices.map(invoice => (
              <TouchableOpacity key={invoice.id} style={styles.invoiceCard} onPress={() => { setSelectedInvoice(invoice); setShowInvoiceDetailModal(true); }}>
                <View style={[styles.invoiceUrgencyBar, { backgroundColor: getUrgencyColor(invoice.urgency) }]} />
                <View style={styles.invoiceContent}>
                  <View style={styles.invoiceHeader}>
                    <Text style={styles.invoiceVendor}>{invoice.vendor_name}</Text>
                    <Text style={[styles.invoiceAmount, { color: getUrgencyColor(invoice.urgency) }]}>{formatCurrency(invoice.amount)}</Text>
                  </View>
                  <Text style={[styles.invoiceDue, { color: getUrgencyColor(invoice.urgency) }]}>{getUrgencyText(invoice.urgency, invoice.days_until_due)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {activeTab === 'budgets' && (
          <>
            {!isPremium && (
              <TouchableOpacity style={styles.premiumFeatureBanner} onPress={() => setShowUpgradeModal(true)}>
                <Ionicons name="diamond" size={24} color={COLORS.yellow} />
                <View style={styles.premiumFeatureContent}>
                  <Text style={styles.premiumFeatureTitle}>{t('finances.premium.featureTitle')}</Text>
                  <Text style={styles.premiumFeatureText}>{t('finances.premium.budgetsFeature')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.yellow} />
              </TouchableOpacity>
            )}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📊 {t('finances.sections.myBudgets')}</Text>
              <TouchableOpacity onPress={() => { if (checkLimit('budget')) setShowBudgetModal(true); }}>
                <Text style={styles.sectionAction}>+ {t('finances.new')}</Text>
              </TouchableOpacity>
            </View>
            {budgets.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyText}>{t('finances.empty.noBudgets')}</Text>
                <Text style={styles.emptySubtext}>{t('finances.empty.createBudgetHint')}</Text>
                <TouchableOpacity style={styles.emptyButton} onPress={() => { if (checkLimit('budget')) setShowBudgetModal(true); }}>
                  <Text style={styles.emptyButtonText}>{t('finances.createBudget')}</Text>
                </TouchableOpacity>
              </View>
            ) : budgets.map(budget => (
              <TouchableOpacity key={budget.id} style={styles.budgetCard} onLongPress={() => handleDeleteBudget(budget.id)}>
                <View style={styles.budgetHeader}>
                  <Text style={styles.budgetIcon}>{budget.icon}</Text>
                  <View style={styles.budgetInfo}>
                    <Text style={styles.budgetCategory}>{budget.category}</Text>
                    <Text style={styles.budgetAmounts}>{formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}</Text>
                  </View>
                  <View style={[styles.budgetStatus, { backgroundColor: getBudgetStatusColor(budget.status) + '20' }]}>
                    <Text style={[styles.budgetStatusText, { color: getBudgetStatusColor(budget.status) }]}>{budget.percentage}%</Text>
                  </View>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(budget.percentage, 100)}%`, backgroundColor: getBudgetStatusColor(budget.status) }]} />
                </View>
                <View style={styles.budgetFooter}>
                  <Text style={styles.budgetRemaining}>
                    {budget.remaining >= 0 ? t('finances.budget.available', { amount: formatCurrency(budget.remaining) }) : t('finances.budget.exceeded', { amount: formatCurrency(Math.abs(budget.remaining)) })}
                  </Text>
                  <Text style={[styles.budgetStatusLabel, { color: getBudgetStatusColor(budget.status) }]}>
                    {budget.status === 'exceeded' ? t('finances.budget.statusExceeded') : budget.status === 'warning' ? t('finances.budget.statusWarning') : t('finances.budget.statusOk')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {budgets.length > 0 && <Text style={styles.budgetHint}>{t('finances.budget.deleteHint')}</Text>}
          </>
        )}

        <View style={{ height: scale(100) }} />
      </ScrollView>

      {/* Transaction Modal */}
      <AppModal visible={showTransactionModal} onClose={() => setShowTransactionModal(false)}>
        <Text style={styles.modalTitle}>{transactionType === 'income' ? `💵 ${t('finances.modals.newIncome')}` : `💸 ${t('finances.modals.newExpense')}`}</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity style={[styles.typeButton, transactionType === 'income' && styles.typeButtonActiveIncome]} onPress={() => setTransactionType('income')}>
            <Text style={[styles.typeButtonText, transactionType === 'income' && styles.typeButtonTextActive]}>{t('finances.quickActions.income')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.typeButton, transactionType === 'expense' && styles.typeButtonActiveExpense]} onPress={() => setTransactionType('expense')}>
            <Text style={[styles.typeButtonText, transactionType === 'expense' && styles.typeButtonTextActive]}>{t('finances.quickActions.expense')}</Text>
          </TouchableOpacity>
        </View>
        <TextInput style={styles.input} placeholder={t('finances.form.amount')} placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={transactionForm.amount} onChangeText={(v) => setTransactionForm({ ...transactionForm, amount: v })} />
        <View style={styles.categoryGrid}>
          {categories.filter(c => c.type === transactionType || c.type === 'both').map(cat => (
            <TouchableOpacity key={cat.id} style={[styles.categoryChip, transactionForm.category === cat.name && { backgroundColor: cat.color || COLORS.purple }]} onPress={() => setTransactionForm({ ...transactionForm, category: cat.name })}>
              <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
              <Text style={[styles.categoryChipText, transactionForm.category === cat.name && { color: '#FFF' }]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={styles.input} placeholder={t('finances.form.descriptionOptional')} placeholderTextColor={COLORS.textMuted} value={transactionForm.description} onChangeText={(v) => setTransactionForm({ ...transactionForm, description: v })} />
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowTransactionModal(false)}><Text style={styles.cancelButtonText}>{t('common.cancel')}</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: transactionType === 'income' ? COLORS.green : COLORS.red }]} onPress={handleCreateTransaction}><Text style={styles.saveButtonText}>{t('common.save')}</Text></TouchableOpacity>
        </View>
      </AppModal>

      {/* Goal Modal */}
      <AppModal visible={showGoalModal} onClose={() => setShowGoalModal(false)}>
        <Text style={styles.modalTitle}>🎯 {t('finances.modals.newGoal')}</Text>
        <TextInput style={styles.input} placeholder={t('finances.form.goalName')} placeholderTextColor={COLORS.textMuted} value={goalForm.name} onChangeText={(v) => setGoalForm({ ...goalForm, name: v })} />
        <TextInput style={styles.input} placeholder={t('finances.form.targetAmount')} placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={goalForm.target_amount} onChangeText={(v) => setGoalForm({ ...goalForm, target_amount: v })} />
        <View style={styles.iconSelector}>
          {['🎯', '🏠', '🚗', '✈️', '💻', '📱', '🎓', '💍', '🏖️', '💰'].map(icon => (
            <TouchableOpacity key={icon} style={[styles.iconOption, goalForm.icon === icon && styles.iconOptionActive]} onPress={() => setGoalForm({ ...goalForm, icon })}>
              <Text style={styles.iconOptionText}>{icon}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowGoalModal(false)}><Text style={styles.cancelButtonText}>{t('common.cancel')}</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: COLORS.purple }]} onPress={handleCreateGoal}><Text style={styles.saveButtonText}>{t('common.create')}</Text></TouchableOpacity>
        </View>
      </AppModal>

      {/* Contribution Modal */}
      <AppModal visible={showContributionModal} onClose={() => { setShowContributionModal(false); setSelectedGoal(null); }}>
        <Text style={styles.modalTitle}>💰 {t('finances.modals.contributeTo', { name: selectedGoal?.name })}</Text>
        {selectedGoal && (
          <View style={styles.goalPreview}>
            <Text style={styles.goalPreviewText}>{formatCurrency(selectedGoal.current_amount)} / {formatCurrency(selectedGoal.target_amount)}</Text>
            <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${getProgressPercentage(selectedGoal.current_amount, selectedGoal.target_amount)}%`, backgroundColor: COLORS.purple }]} /></View>
          </View>
        )}
        <TextInput style={styles.input} placeholder={t('finances.form.contributionAmount')} placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={contributionAmount} onChangeText={setContributionAmount} />
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowContributionModal(false); setSelectedGoal(null); }}><Text style={styles.cancelButtonText}>{t('common.cancel')}</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: COLORS.green }]} onPress={handleAddContribution}><Text style={styles.saveButtonText}>{t('finances.contribute')}</Text></TouchableOpacity>
        </View>
      </AppModal>

      {/* Invoice Modal */}
      <AppModal visible={showInvoiceModal} onClose={() => setShowInvoiceModal(false)}>
        <Text style={styles.modalTitle}>🧾 {t('finances.modals.newInvoice')}</Text>
        <TextInput style={styles.input} placeholder={t('finances.form.vendor')} placeholderTextColor={COLORS.textMuted} value={invoiceForm.vendor_name} onChangeText={(v) => setInvoiceForm({ ...invoiceForm, vendor_name: v })} />
        <TextInput style={styles.input} placeholder={t('finances.form.amount')} placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={invoiceForm.amount} onChangeText={(v) => setInvoiceForm({ ...invoiceForm, amount: v })} />
        <TextInput style={styles.input} placeholder={t('finances.form.categoryExample')} placeholderTextColor={COLORS.textMuted} value={invoiceForm.category} onChangeText={(v) => setInvoiceForm({ ...invoiceForm, category: v })} />
        <TextInput style={styles.input} placeholder={t('finances.form.dueDate')} placeholderTextColor={COLORS.textMuted} value={invoiceForm.due_date} onChangeText={(v) => setInvoiceForm({ ...invoiceForm, due_date: v })} />
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowInvoiceModal(false)}><Text style={styles.cancelButtonText}>{t('common.cancel')}</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: COLORS.yellow }]} onPress={handleCreateInvoice}><Text style={styles.saveButtonText}>{t('finances.register')}</Text></TouchableOpacity>
        </View>
      </AppModal>

      {/* Invoice Detail Modal */}
      <AppModal visible={showInvoiceDetailModal} onClose={() => { setShowInvoiceDetailModal(false); setSelectedInvoice(null); }}>
        {selectedInvoice && (
          <View>
            <Text style={styles.modalTitle}>🧾 {selectedInvoice.vendor_name}</Text>
            <View style={[styles.invoiceDetailStatus, { backgroundColor: getUrgencyColor(selectedInvoice.urgency) + '20' }]}>
              <Text style={[styles.invoiceDetailStatusText, { color: getUrgencyColor(selectedInvoice.urgency) }]}>{getUrgencyText(selectedInvoice.urgency, selectedInvoice.days_until_due)}</Text>
            </View>
            <View style={styles.invoiceDetailRow}><Text style={styles.invoiceDetailLabel}>{t('finances.invoiceDetail.amount')}:</Text><Text style={styles.invoiceDetailValue}>{formatCurrency(selectedInvoice.amount)}</Text></View>
            <View style={styles.invoiceDetailRow}><Text style={styles.invoiceDetailLabel}>{t('finances.invoiceDetail.dueDate')}:</Text><Text style={styles.invoiceDetailValue}>{new Date(selectedInvoice.due_date).toLocaleDateString('es-HN')}</Text></View>
            <TouchableOpacity style={styles.payButton} onPress={handlePayInvoice}><Text style={styles.payButtonText}>✅ {t('finances.invoiceDetail.markAsPaid')}</Text></TouchableOpacity>
          </View>
        )}
      </AppModal>

      {/* Budget Modal */}
      <AppModal visible={showBudgetModal} onClose={() => setShowBudgetModal(false)}>
        <Text style={styles.modalTitle}>📊 {t('finances.modals.newBudget')}</Text>
        <TextInput style={styles.input} placeholder={t('finances.form.budgetCategory')} placeholderTextColor={COLORS.textMuted} value={budgetForm.category} onChangeText={(v) => setBudgetForm({ ...budgetForm, category: v })} />
        <TextInput style={styles.input} placeholder={t('finances.form.monthlyLimit')} placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={budgetForm.amount} onChangeText={(v) => setBudgetForm({ ...budgetForm, amount: v })} />
        <View style={styles.iconSelector}>
          {['💰', '🍔', '🚗', '🏠', '💡', '📱', '🎮', '👕', '💊', '📚'].map(icon => (
            <TouchableOpacity key={icon} style={[styles.iconOption, budgetForm.icon === icon && styles.iconOptionActive]} onPress={() => setBudgetForm({ ...budgetForm, icon })}>
              <Text style={styles.iconOptionText}>{icon}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowBudgetModal(false)}><Text style={styles.cancelButtonText}>{t('common.cancel')}</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: COLORS.blue }]} onPress={handleCreateBudget}><Text style={styles.saveButtonText}>{t('common.create')}</Text></TouchableOpacity>
        </View>
      </AppModal>

      {/* Tip Modal */}
      <AppModal visible={showTipModal} onClose={() => { setShowTipModal(false); setSelectedTip(null); }}>
        {selectedTip && (
          <View>
            <Text style={styles.tipModalIcon}>{selectedTip.icon || '💡'}</Text>
            <Text style={styles.tipModalTitle}>{selectedTip.title}</Text>
            <Text style={styles.tipModalContent}>{selectedTip.content}</Text>
            <Text style={styles.tipModalQuestion}>¿Te fue útil?</Text>
            <View style={styles.tipModalFeedback}>
              <TouchableOpacity style={[styles.feedbackButton, styles.feedbackButtonYes]} onPress={() => handleTipFeedback(true)}><Text style={styles.feedbackButtonText}>👍 Sí</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.feedbackButton, styles.feedbackButtonNo]} onPress={() => handleTipFeedback(false)}><Text style={styles.feedbackButtonText}>👎 No</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.dismissButton} onPress={dismissTip}><Text style={styles.dismissButtonText}>No mostrar más</Text></TouchableOpacity>
          </View>
        )}
      </AppModal>

      {/* Upgrade Modal - MEJORADO */}
      <AppModal visible={showUpgradeModal} onClose={() => setShowUpgradeModal(false)}>
        <View style={styles.upgradeHeader}>
          <View style={styles.upgradeDiamondIcon}>
            <Ionicons name="diamond" size={32} color={COLORS.purple} />
          </View>
          <Text style={styles.upgradeModalTitle}>{t('finances.upgrade.unlockAll')}</Text>
          <Text style={styles.upgradeModalSubtitle}>{t('finances.upgrade.getControl')}</Text>
        </View>
        
        {/* Plan Premium */}
        <View style={styles.planCardPremium}>
          <View style={styles.planBadgePopular}>
            <Text style={styles.planBadgeText}>⭐ {t('finances.upgrade.popular')}</Text>
          </View>
          <Text style={styles.planNamePremium}>Premium</Text>
          <View style={styles.planPriceRow}>
            <Text style={styles.planPriceCurrency}>$</Text>
            <Text style={styles.planPriceAmount}>2.99</Text>
            <Text style={styles.planPricePeriod}>/{t('finances.upgrade.month')}</Text>
          </View>
          <Text style={styles.planYearlyPrice}>{t('finances.upgrade.yearlyPrice', { price: '29.99', save: '16' })}</Text>
          
          <View style={styles.planFeaturesList}>
            <View style={styles.planFeatureRow}>
              <View style={styles.planFeatureIconGreen}><Ionicons name="infinite" size={14} color={COLORS.green} /></View>
              <Text style={styles.planFeatureText}>{t('finances.upgrade.features.unlimitedTransactions')}</Text>
            </View>
            <View style={styles.planFeatureRow}>
              <View style={styles.planFeatureIconGreen}><Ionicons name="flag" size={14} color={COLORS.green} /></View>
              <Text style={styles.planFeatureText}>{t('finances.upgrade.features.unlimitedGoals')}</Text>
            </View>
            <View style={styles.planFeatureRow}>
              <View style={styles.planFeatureIconGreen}><Ionicons name="pie-chart" size={14} color={COLORS.green} /></View>
              <Text style={styles.planFeatureText}>{t('finances.upgrade.features.categoryBudgets')}</Text>
            </View>
            <View style={styles.planFeatureRow}>
              <View style={styles.planFeatureIconGreen}><Ionicons name="document-text" size={14} color={COLORS.green} /></View>
              <Text style={styles.planFeatureText}>{t('finances.upgrade.features.invoiceManagement')}</Text>
            </View>
            <View style={styles.planFeatureRow}>
              <View style={styles.planFeatureIconGreen}><Ionicons name="bulb" size={14} color={COLORS.green} /></View>
              <Text style={styles.planFeatureText}>{t('finances.upgrade.features.personalizedTips')}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.planButtonPremium} onPress={() => handleUpgrade('Premium')}>
            <Text style={styles.planButtonText}>{t('finances.upgrade.getPremium')}</Text>
          </TouchableOpacity>
        </View>

        {/* Plan Pro */}
        <View style={styles.planCardPro}>
          <View style={styles.planBadgeBestValue}>
            <Text style={styles.planBadgeText}>💎 {t('finances.upgrade.bestValue')}</Text>
          </View>
          <Text style={styles.planNamePro}>Pro</Text>
          <View style={styles.planPriceRow}>
            <Text style={styles.planPriceCurrency}>$</Text>
            <Text style={styles.planPriceAmount}>4.99</Text>
            <Text style={styles.planPricePeriod}>/{t('finances.upgrade.month')}</Text>
          </View>
          <Text style={styles.planYearlyPrice}>{t('finances.upgrade.yearlyPrice', { price: '49.99', save: '17' })}</Text>
          
          <View style={styles.planFeaturesList}>
            <View style={styles.planFeatureRow}>
              <View style={styles.planFeatureIconTeal}><Ionicons name="checkmark-circle" size={14} color={COLORS.teal} /></View>
              <Text style={styles.planFeatureText}>{t('finances.upgrade.features.allPremium')}</Text>
            </View>
            <View style={styles.planFeatureRow}>
              <View style={styles.planFeatureIconTeal}><Ionicons name="analytics" size={14} color={COLORS.teal} /></View>
              <Text style={styles.planFeatureText}>{t('finances.upgrade.features.advancedReports')}</Text>
            </View>
            <View style={styles.planFeatureRow}>
              <View style={styles.planFeatureIconTeal}><Ionicons name="cloud-download" size={14} color={COLORS.teal} /></View>
              <Text style={styles.planFeatureText}>{t('finances.upgrade.features.exportExcelPdf')}</Text>
            </View>
            <View style={styles.planFeatureRow}>
              <View style={styles.planFeatureIconTeal}><Ionicons name="notifications" size={14} color={COLORS.teal} /></View>
              <Text style={styles.planFeatureText}>{t('finances.upgrade.features.smartAlerts')}</Text>
            </View>
            <View style={styles.planFeatureRow}>
              <View style={styles.planFeatureIconTeal}><Ionicons name="shield-checkmark" size={14} color={COLORS.teal} /></View>
              <Text style={styles.planFeatureText}>{t('finances.upgrade.features.prioritySupport')}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.planButtonPro} onPress={() => handleUpgrade('Pro')}>
            <Text style={styles.planButtonTextPro}>{t('finances.upgrade.getPro')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.skipButton} onPress={() => setShowUpgradeModal(false)}>
          <Text style={styles.skipButtonText}>{t('finances.upgrade.maybeLater')}</Text>
        </TouchableOpacity>
      </AppModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: scale(12), 
    color: COLORS.textSecondary, 
    fontSize: scale(16) 
  },
  
  // Header
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  backButton: { 
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { 
    color: COLORS.textPrimary, 
    fontSize: scale(20), 
    fontWeight: '700' 
  },
  premiumBadgeHeader: { 
    backgroundColor: COLORS.lime, 
    paddingHorizontal: scale(12), 
    paddingVertical: scale(6), 
    borderRadius: scale(12) 
  },
  premiumBadgeHeaderText: { 
    color: COLORS.background, 
    fontSize: scale(12), 
    fontWeight: '700' 
  },
  upgradeButtonSmall: { 
    backgroundColor: COLORS.purple, 
    paddingHorizontal: scale(14), 
    paddingVertical: scale(8), 
    borderRadius: scale(12) 
  },
  upgradeButtonSmallText: { 
    color: COLORS.textPrimary, 
    fontSize: scale(12), 
    fontWeight: '600' 
  },
  
  scrollContent: {
    paddingHorizontal: scale(20),
  },
  
  // Stats Card
  statsCard: {
    backgroundColor: COLORS.card,
    borderRadius: scale(20),
    padding: scale(20),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around',
    marginBottom: scale(16),
  },
  statItem: { 
    alignItems: 'center',
    flex: 1,
  },
  statEmoji: {
    fontSize: scale(24),
    marginBottom: scale(4),
  },
  statValue: { 
    color: COLORS.textPrimary, 
    fontSize: scale(18), 
    fontWeight: '700' 
  },
  statLabel: { 
    color: COLORS.textSecondary, 
    fontSize: scale(12), 
    marginTop: scale(2) 
  },
  statDivider: { 
    width: 1, 
    backgroundColor: COLORS.cardBorder,
  },
  xpContainer: { 
    alignItems: 'center' 
  },
  xpBarBg: { 
    width: '100%', 
    height: scale(8), 
    backgroundColor: COLORS.backgroundTertiary, 
    borderRadius: scale(4), 
    overflow: 'hidden' 
  },
  xpBarFill: { 
    height: '100%', 
    backgroundColor: COLORS.lime, 
    borderRadius: scale(4) 
  },
  xpText: { 
    color: COLORS.textSecondary, 
    fontSize: scale(12), 
    marginTop: scale(8) 
  },
  
  // Tab Switcher
  tabSwitcher: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.card, 
    borderRadius: scale(16), 
    padding: scale(4),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tab: { 
    flex: 1, 
    paddingVertical: scale(12), 
    alignItems: 'center', 
    borderRadius: scale(12) 
  },
  tabActive: { 
    backgroundColor: COLORS.purple 
  },
  tabText: { 
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.textPrimary,
  },
  
  // Limit Banner
  limitBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(139, 92, 246, 0.15)', 
    borderRadius: scale(16), 
    padding: scale(16), 
    marginBottom: scale(16), 
    borderWidth: 1, 
    borderColor: 'rgba(139, 92, 246, 0.3)' 
  },
  limitBannerIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  limitBannerContent: { 
    flex: 1 
  },
  limitBannerTitle: { 
    fontSize: scale(14), 
    fontWeight: '700', 
    color: COLORS.purple 
  },
  limitBannerText: { 
    fontSize: scale(12), 
    color: COLORS.purpleLight,
    marginTop: scale(2),
  },
  
  // Section
  section: {
    marginBottom: scale(20),
  },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: scale(12) 
  },
  sectionTitle: { 
    fontSize: scale(18), 
    fontWeight: '700', 
    color: COLORS.textPrimary 
  },
  sectionAction: { 
    color: COLORS.teal, 
    fontSize: scale(14), 
    fontWeight: '600' 
  },
  
  // Tips
  tipsScroll: { 
    marginHorizontal: scale(-20), 
    paddingHorizontal: scale(20) 
  },
  tipCard: { 
    width: scale(140), 
    backgroundColor: COLORS.card, 
    borderRadius: scale(16), 
    padding: scale(14), 
    marginRight: scale(12),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tipCardPremium: { 
    backgroundColor: 'rgba(245, 158, 11, 0.15)', 
    borderColor: 'rgba(245, 158, 11, 0.3)' 
  },
  premiumBadge: { 
    position: 'absolute', 
    top: scale(8), 
    right: scale(8), 
    backgroundColor: COLORS.yellow, 
    paddingHorizontal: scale(6), 
    paddingVertical: scale(2), 
    borderRadius: scale(4) 
  },
  premiumBadgeText: { 
    color: COLORS.background, 
    fontSize: scale(9), 
    fontWeight: '700' 
  },
  tipIcon: { 
    fontSize: scale(28), 
    marginBottom: scale(6) 
  },
  tipTitle: { 
    fontSize: scale(13), 
    fontWeight: '600', 
    color: COLORS.textPrimary 
  },
  
  // Invoice Alert
  invoiceAlert: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(245, 158, 11, 0.15)', 
    borderRadius: scale(16), 
    padding: scale(16), 
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  invoiceAlertIcon: {
    fontSize: scale(24),
    marginRight: scale(12),
  },
  invoiceAlertContent: { 
    flex: 1,
  },
  invoiceAlertTitle: { 
    fontSize: scale(15), 
    fontWeight: '600', 
    color: COLORS.yellow 
  },
  
  // Balance Card
  balanceCard: { 
    backgroundColor: COLORS.card, 
    borderRadius: scale(20), 
    padding: scale(24), 
    alignItems: 'center', 
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  balanceLabel: { 
    color: COLORS.textSecondary, 
    fontSize: scale(14), 
    marginBottom: scale(8) 
  },
  balanceAmount: { 
    fontSize: scale(36), 
    fontWeight: '700', 
    marginBottom: scale(20) 
  },
  balanceRow: { 
    flexDirection: 'row', 
    width: '100%' 
  },
  balanceItem: { 
    flex: 1, 
    alignItems: 'center' 
  },
  balanceItemIconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(8),
  },
  balanceDivider: { 
    width: 1, 
    backgroundColor: COLORS.cardBorder 
  },
  balanceItemLabel: { 
    color: COLORS.textSecondary, 
    fontSize: scale(12), 
    marginBottom: scale(4) 
  },
  balanceItemValue: { 
    fontSize: scale(16), 
    fontWeight: '600' 
  },
  
  // Quick Actions - MEJORADOS
  quickActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: scale(20),
    gap: scale(10),
  },
  quickActionIncome: { 
    flex: 1, 
    alignItems: 'center', 
    paddingVertical: scale(16), 
    paddingHorizontal: scale(8),
    borderRadius: scale(16),
    backgroundColor: COLORS.greenBg,
    borderWidth: 1.5,
    borderColor: COLORS.greenBorder,
  },
  quickActionExpense: { 
    flex: 1, 
    alignItems: 'center', 
    paddingVertical: scale(16), 
    paddingHorizontal: scale(8),
    borderRadius: scale(16),
    backgroundColor: COLORS.redBg,
    borderWidth: 1.5,
    borderColor: COLORS.redBorder,
  },
  quickActionGoal: { 
    flex: 1, 
    alignItems: 'center', 
    paddingVertical: scale(16), 
    paddingHorizontal: scale(8),
    borderRadius: scale(16),
    backgroundColor: 'rgba(93, 222, 216, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(93, 222, 216, 0.35)',
  },
  quickActionIconIncome: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(12),
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(8),
  },
  quickActionIconExpense: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(12),
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(8),
  },
  quickActionIconGoal: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(12),
    backgroundColor: 'rgba(93, 222, 216, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(8),
  },
  quickActionTextIncome: { 
    fontSize: scale(13), 
    fontWeight: '600',
    color: COLORS.green,
  },
  quickActionTextExpense: { 
    fontSize: scale(13), 
    fontWeight: '600',
    color: COLORS.red,
  },
  quickActionTextGoal: { 
    fontSize: scale(13), 
    fontWeight: '600',
    color: COLORS.teal,
  },
  
  // Empty State
  emptyState: { 
    backgroundColor: COLORS.card, 
    borderRadius: scale(16), 
    padding: scale(32), 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  emptyIcon: { 
    fontSize: scale(48), 
    marginBottom: scale(12) 
  },
  emptyText: { 
    color: COLORS.textSecondary, 
    fontSize: scale(16), 
    marginBottom: scale(8) 
  },
  emptySubtext: { 
    color: COLORS.textMuted, 
    fontSize: scale(13), 
    marginBottom: scale(16),
    textAlign: 'center',
  },
  emptyButton: { 
    backgroundColor: COLORS.teal, 
    paddingHorizontal: scale(24), 
    paddingVertical: scale(12), 
    borderRadius: scale(12) 
  },
  emptyButtonText: { 
    color: COLORS.background, 
    fontWeight: '600' 
  },
  
  // Goal Card
  goalCard: { 
    backgroundColor: COLORS.card, 
    borderRadius: scale(16), 
    padding: scale(16), 
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  goalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: scale(12) 
  },
  goalIcon: { 
    fontSize: scale(32), 
    marginRight: scale(12) 
  },
  goalInfo: { 
    flex: 1 
  },
  goalName: { 
    fontSize: scale(16), 
    fontWeight: '600', 
    color: COLORS.textPrimary, 
    marginBottom: scale(2) 
  },
  goalProgress: { 
    fontSize: scale(13), 
    color: COLORS.textSecondary 
  },
  goalPercentage: { 
    fontSize: scale(18), 
    fontWeight: '700', 
    color: COLORS.purple 
  },
  progressBarBg: { 
    height: scale(8), 
    backgroundColor: COLORS.backgroundTertiary, 
    borderRadius: scale(4), 
    overflow: 'hidden' 
  },
  progressBarFill: { 
    height: '100%', 
    borderRadius: scale(4) 
  },
  
  // Transaction Item
  transactionItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.card, 
    borderRadius: scale(12), 
    padding: scale(12), 
    marginBottom: scale(8),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  transactionIconBox: { 
    width: scale(40), 
    height: scale(40), 
    borderRadius: scale(12), 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: scale(12) 
  },
  transactionInfo: { 
    flex: 1 
  },
  transactionCategory: { 
    fontSize: scale(15), 
    fontWeight: '500', 
    color: COLORS.textPrimary 
  },
  transactionDate: { 
    fontSize: scale(12), 
    color: COLORS.textMuted 
  },
  transactionAmount: { 
    fontSize: scale(16), 
    fontWeight: '600' 
  },
  
  // Premium Feature Banner
  premiumFeatureBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(245, 158, 11, 0.15)', 
    borderRadius: scale(16), 
    padding: scale(16), 
    marginBottom: scale(16), 
    borderWidth: 1, 
    borderColor: 'rgba(245, 158, 11, 0.3)' 
  },
  premiumFeatureContent: { 
    flex: 1,
    marginLeft: scale(12),
  },
  premiumFeatureTitle: { 
    fontSize: scale(14), 
    fontWeight: '700', 
    color: COLORS.yellow 
  },
  premiumFeatureText: { 
    fontSize: scale(12), 
    color: COLORS.textSecondary 
  },
  
  // Invoice Card
  invoiceCard: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.card, 
    borderRadius: scale(16), 
    marginBottom: scale(12), 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  invoiceUrgencyBar: { 
    width: scale(4) 
  },
  invoiceContent: { 
    flex: 1, 
    padding: scale(16) 
  },
  invoiceHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: scale(4) 
  },
  invoiceVendor: { 
    fontSize: scale(16), 
    fontWeight: '600', 
    color: COLORS.textPrimary 
  },
  invoiceAmount: { 
    fontSize: scale(18), 
    fontWeight: '700' 
  },
  invoiceDue: { 
    fontSize: scale(13), 
    fontWeight: '500' 
  },
  invoiceDetailStatus: { 
    padding: scale(12), 
    borderRadius: scale(12), 
    marginBottom: scale(16), 
    alignItems: 'center' 
  },
  invoiceDetailStatusText: { 
    fontSize: scale(14), 
    fontWeight: '600' 
  },
  invoiceDetailRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: scale(12), 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.cardBorder 
  },
  invoiceDetailLabel: { 
    fontSize: scale(14), 
    color: COLORS.textSecondary 
  },
  invoiceDetailValue: { 
    fontSize: scale(14), 
    fontWeight: '600', 
    color: COLORS.textPrimary 
  },
  payButton: { 
    backgroundColor: COLORS.green, 
    padding: scale(16), 
    borderRadius: scale(12), 
    alignItems: 'center', 
    marginTop: scale(20) 
  },
  payButtonText: { 
    color: COLORS.textPrimary, 
    fontSize: scale(16), 
    fontWeight: '700' 
  },
  
  // Budget Card
  budgetCard: { 
    backgroundColor: COLORS.card, 
    borderRadius: scale(16), 
    padding: scale(16), 
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  budgetHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: scale(12) 
  },
  budgetIcon: { 
    fontSize: scale(32), 
    marginRight: scale(12) 
  },
  budgetInfo: { 
    flex: 1 
  },
  budgetCategory: { 
    fontSize: scale(16), 
    fontWeight: '600', 
    color: COLORS.textPrimary, 
    marginBottom: scale(2) 
  },
  budgetAmounts: { 
    fontSize: scale(13), 
    color: COLORS.textSecondary 
  },
  budgetStatus: { 
    paddingHorizontal: scale(12), 
    paddingVertical: scale(6), 
    borderRadius: scale(12) 
  },
  budgetStatusText: { 
    fontSize: scale(14), 
    fontWeight: '700' 
  },
  budgetFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: scale(12) 
  },
  budgetRemaining: { 
    fontSize: scale(13), 
    color: COLORS.textSecondary 
  },
  budgetStatusLabel: { 
    fontSize: scale(13), 
    fontWeight: '600' 
  },
  budgetHint: { 
    textAlign: 'center', 
    color: COLORS.textMuted, 
    fontSize: scale(12), 
    marginTop: scale(8) 
  },
  
  // Modal Styles
  modalTitle: { 
    fontSize: scale(20), 
    fontWeight: '700', 
    color: COLORS.textPrimary, 
    marginBottom: scale(20), 
    textAlign: 'center' 
  },
  typeSelector: { 
    flexDirection: 'row', 
    marginBottom: scale(16),
    gap: scale(8),
  },
  typeButton: { 
    flex: 1, 
    padding: scale(12), 
    borderRadius: scale(12), 
    backgroundColor: COLORS.backgroundTertiary, 
    alignItems: 'center' 
  },
  typeButtonActiveIncome: { 
    backgroundColor: 'rgba(34, 197, 94, 0.2)' 
  },
  typeButtonActiveExpense: { 
    backgroundColor: 'rgba(244, 63, 94, 0.2)' 
  },
  typeButtonText: { 
    fontWeight: '600', 
    color: COLORS.textSecondary 
  },
  typeButtonTextActive: { 
    color: COLORS.textPrimary 
  },
  input: { 
    backgroundColor: COLORS.backgroundTertiary, 
    borderRadius: scale(12), 
    padding: scale(16), 
    fontSize: scale(16), 
    marginBottom: scale(12),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  categoryGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginBottom: scale(12),
    gap: scale(8),
  },
  categoryChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.backgroundTertiary, 
    borderRadius: scale(20), 
    paddingVertical: scale(8), 
    paddingHorizontal: scale(12),
  },
  categoryChipIcon: { 
    marginRight: scale(6) 
  },
  categoryChipText: { 
    fontSize: scale(13), 
    color: COLORS.textSecondary 
  },
  iconSelector: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'center', 
    marginBottom: scale(16),
    gap: scale(8),
  },
  iconOption: { 
    width: scale(48), 
    height: scale(48), 
    borderRadius: scale(24), 
    backgroundColor: COLORS.backgroundTertiary, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  iconOptionActive: { 
    backgroundColor: 'rgba(93, 222, 216, 0.2)', 
    borderWidth: 2, 
    borderColor: COLORS.teal 
  },
  iconOptionText: { 
    fontSize: scale(22) 
  },
  goalPreview: { 
    backgroundColor: COLORS.backgroundTertiary, 
    borderRadius: scale(12), 
    padding: scale(16), 
    marginBottom: scale(16) 
  },
  goalPreviewText: { 
    textAlign: 'center', 
    color: COLORS.textSecondary, 
    marginBottom: scale(12) 
  },
  modalButtons: { 
    flexDirection: 'row', 
    marginTop: scale(8),
    gap: scale(8),
  },
  cancelButton: { 
    flex: 1, 
    padding: scale(16), 
    borderRadius: scale(12), 
    backgroundColor: COLORS.backgroundTertiary, 
    alignItems: 'center' 
  },
  cancelButtonText: { 
    color: COLORS.textSecondary, 
    fontWeight: '600' 
  },
  saveButton: { 
    flex: 1, 
    padding: scale(16), 
    borderRadius: scale(12), 
    alignItems: 'center' 
  },
  saveButtonText: { 
    color: COLORS.textPrimary, 
    fontWeight: '600' 
  },
  
  // Tip Modal
  tipModalIcon: { 
    fontSize: scale(56), 
    textAlign: 'center', 
    marginBottom: scale(12) 
  },
  tipModalTitle: { 
    fontSize: scale(18), 
    fontWeight: '700', 
    color: COLORS.textPrimary, 
    textAlign: 'center', 
    marginBottom: scale(12) 
  },
  tipModalContent: { 
    fontSize: scale(15), 
    color: COLORS.textSecondary, 
    lineHeight: scale(22), 
    textAlign: 'center', 
    marginBottom: scale(16) 
  },
  tipModalQuestion: { 
    fontSize: scale(14), 
    fontWeight: '600', 
    color: COLORS.textMuted, 
    textAlign: 'center', 
    marginBottom: scale(12) 
  },
  tipModalFeedback: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginBottom: scale(12),
    gap: scale(12),
  },
  feedbackButton: { 
    paddingHorizontal: scale(28), 
    paddingVertical: scale(12), 
    borderRadius: scale(12),
  },
  feedbackButtonYes: { 
    backgroundColor: 'rgba(34, 197, 94, 0.2)' 
  },
  feedbackButtonNo: { 
    backgroundColor: 'rgba(244, 63, 94, 0.2)' 
  },
  feedbackButtonText: { 
    fontSize: scale(15), 
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dismissButton: { 
    alignItems: 'center', 
    padding: scale(12) 
  },
  dismissButtonText: { 
    color: COLORS.textMuted, 
    fontSize: scale(14) 
  },
  
  // Upgrade Modal - MEJORADO
  upgradeHeader: {
    alignItems: 'center',
    marginBottom: scale(20),
  },
  upgradeDiamondIcon: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  upgradeModalTitle: { 
    fontSize: scale(26), 
    fontWeight: '700', 
    color: COLORS.textPrimary, 
    textAlign: 'center', 
  },
  upgradeModalSubtitle: { 
    fontSize: scale(14), 
    color: COLORS.textSecondary, 
    textAlign: 'center', 
    marginTop: scale(8),
  },
  planCardPremium: { 
    backgroundColor: COLORS.backgroundTertiary, 
    borderRadius: scale(20), 
    padding: scale(20), 
    marginBottom: scale(16), 
    borderWidth: 2, 
    borderColor: COLORS.green,
    position: 'relative',
  },
  planCardPro: { 
    backgroundColor: COLORS.backgroundTertiary, 
    borderRadius: scale(20), 
    padding: scale(20), 
    marginBottom: scale(16), 
    borderWidth: 2, 
    borderColor: COLORS.teal,
    position: 'relative',
  },
  planBadgePopular: {
    position: 'absolute',
    top: scale(-10),
    right: scale(16),
    backgroundColor: COLORS.green,
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(8),
  },
  planBadgeBestValue: {
    position: 'absolute',
    top: scale(-10),
    right: scale(16),
    backgroundColor: COLORS.teal,
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(8),
  },
  planBadgeText: {
    color: COLORS.background,
    fontSize: scale(10),
    fontWeight: '700',
  },
  planNamePremium: { 
    fontSize: scale(22), 
    fontWeight: '700', 
    color: COLORS.green,
    marginBottom: scale(8),
    marginTop: scale(4),
  },
  planNamePro: { 
    fontSize: scale(22), 
    fontWeight: '700', 
    color: COLORS.teal,
    marginBottom: scale(8),
    marginTop: scale(4),
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: scale(4),
  },
  planPriceCurrency: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  planPriceAmount: {
    fontSize: scale(36),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  planPricePeriod: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginLeft: scale(4),
  },
  planYearlyPrice: { 
    fontSize: scale(12), 
    color: COLORS.lime, 
    marginBottom: scale(16),
  },
  planFeaturesList: {
    marginBottom: scale(16),
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  planFeatureIconGreen: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  planFeatureIconTeal: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    backgroundColor: 'rgba(93, 222, 216, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  planFeatureText: { 
    fontSize: scale(14), 
    color: COLORS.textPrimary,
    flex: 1,
  },
  planButtonPremium: { 
    backgroundColor: COLORS.green, 
    padding: scale(16), 
    borderRadius: scale(14), 
    alignItems: 'center' 
  },
  planButtonPro: { 
    backgroundColor: COLORS.teal, 
    padding: scale(16), 
    borderRadius: scale(14), 
    alignItems: 'center' 
  },
  planButtonTextPro: { 
    color: COLORS.background, 
    fontSize: scale(16), 
    fontWeight: '700' 
  },
  planButtonText: { 
    color: COLORS.textPrimary, 
    fontSize: scale(16), 
    fontWeight: '700' 
  },
  skipButton: { 
    alignItems: 'center', 
    padding: scale(12) 
  },
  skipButtonText: { 
    color: COLORS.textMuted, 
    fontSize: scale(14) 
  },
});