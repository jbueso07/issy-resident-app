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
import { LinearGradient } from 'expo-linear-gradient';
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
  markInvoicePaid
} from '../src/services/api';

const { width } = Dimensions.get('window');

export default function FinancesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, invoices
  
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tips, setTips] = useState([]);
  const [upcomingInvoices, setUpcomingInvoices] = useState([]);
  
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showInvoiceDetailModal, setShowInvoiceDetailModal] = useState(false);
  
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedTip, setSelectedTip] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  const [transactionType, setTransactionType] = useState('expense');
  const [transactionForm, setTransactionForm] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [goalForm, setGoalForm] = useState({
    name: '',
    target_amount: '',
    icon: '🎯',
    deadline: ''
  });
  const [contributionAmount, setContributionAmount] = useState('');
  const [invoiceForm, setInvoiceForm] = useState({
    vendor_name: '',
    amount: '',
    category: '',
    due_date: '',
    description: ''
  });

  const loadData = useCallback(async () => {
    try {
      const [dashRes, transRes, goalsRes, catRes, tipsRes, invoicesRes] = await Promise.all([
        getFinanceDashboard().catch(() => ({ success: false })),
        getTransactions({ limit: 10 }).catch(() => ({ success: false })),
        getFinanceGoals().catch(() => ({ success: false })),
        getCategories().catch(() => ({ success: false })),
        getPersonalizedTips().catch(() => ({ success: false })),
        getUpcomingInvoices(14).catch(() => ({ success: false }))
      ]);
      
      if (dashRes.success) setDashboard(dashRes.data);
      if (transRes.success) setTransactions(transRes.data || []);
      if (goalsRes.success) setGoals(goalsRes.data || []);
      if (catRes.success) setCategories(catRes.data || []);
      if (tipsRes.success) setTips(tipsRes.data || []);
      if (invoicesRes.success) setUpcomingInvoices(invoicesRes.data || []);
    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleTipPress = async (tip) => {
    setSelectedTip(tip);
    setShowTipModal(true);
    if (tip.id && !tip.id.startsWith('dynamic_')) {
      await markTipAsRead(tip.id);
    }
  };

  const handleTipFeedback = async (helpful) => {
    if (selectedTip?.id && !selectedTip.id.startsWith('dynamic_')) {
      await sendTipFeedback(selectedTip.id, helpful);
    }
    setShowTipModal(false);
    setSelectedTip(null);
    const tipsRes = await getPersonalizedTips();
    if (tipsRes.success) setTips(tipsRes.data || []);
  };

  const dismissTip = async () => {
    if (selectedTip?.id && !selectedTip.id.startsWith('dynamic_')) {
      await sendTipFeedback(selectedTip.id, null, true);
    }
    setShowTipModal(false);
    setSelectedTip(null);
    setTips(tips.filter(t => t.id !== selectedTip?.id));
  };

  const handleCreateTransaction = async () => {
    if (!transactionForm.amount || !transactionForm.category) {
      Alert.alert('Error', 'Monto y categoría son requeridos');
      return;
    }
    try {
      const res = await createTransaction({
        type: transactionType,
        amount: parseFloat(transactionForm.amount),
        category: transactionForm.category,
        description: transactionForm.description,
        date: transactionForm.date
      });
      if (res.success) {
        Alert.alert('✅ Éxito', 'Transacción registrada');
        setShowTransactionModal(false);
        setTransactionForm({ amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0] });
        loadData();
      } else {
        Alert.alert('Error', res.error || 'No se pudo registrar');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al registrar transacción');
    }
  };

  const handleCreateGoal = async () => {
    if (!goalForm.name || !goalForm.target_amount) {
      Alert.alert('Error', 'Nombre y monto objetivo son requeridos');
      return;
    }
    try {
      const res = await createFinanceGoal({
        name: goalForm.name,
        target_amount: parseFloat(goalForm.target_amount),
        icon: goalForm.icon,
        deadline: goalForm.deadline || null
      });
      if (res.success) {
        Alert.alert('🎯 Éxito', 'Meta creada');
        setShowGoalModal(false);
        setGoalForm({ name: '', target_amount: '', icon: '🎯', deadline: '' });
        loadData();
      } else {
        Alert.alert('Error', res.error || 'No se pudo crear la meta');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al crear meta');
    }
  };

  const handleAddContribution = async () => {
    if (!contributionAmount || parseFloat(contributionAmount) <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }
    try {
      const res = await addGoalContribution(selectedGoal.id, { amount: parseFloat(contributionAmount) });
      if (res.success) {
        Alert.alert('💰 Éxito', res.message || 'Aporte agregado');
        setShowContributionModal(false);
        setContributionAmount('');
        setSelectedGoal(null);
        loadData();
      } else {
        Alert.alert('Error', res.error || 'No se pudo agregar el aporte');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al agregar aporte');
    }
  };

  const handleCreateInvoice = async () => {
    if (!invoiceForm.vendor_name || !invoiceForm.amount) {
      Alert.alert('Error', 'Proveedor y monto son requeridos');
      return;
    }
    try {
      const res = await createInvoice({
        vendor_name: invoiceForm.vendor_name,
        amount: parseFloat(invoiceForm.amount),
        category: invoiceForm.category || 'Servicios',
        due_date: invoiceForm.due_date || null,
        description: invoiceForm.description
      });
      if (res.success) {
        Alert.alert('🧾 Éxito', res.message || 'Factura registrada');
        setShowInvoiceModal(false);
        setInvoiceForm({ vendor_name: '', amount: '', category: '', due_date: '', description: '' });
        loadData();
      } else {
        Alert.alert('Error', res.error || 'No se pudo registrar');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al registrar factura');
    }
  };

  const handlePayInvoice = async () => {
    if (!selectedInvoice) return;
    try {
      const res = await markInvoicePaid(selectedInvoice.id);
      if (res.success) {
        Alert.alert('✅ Pagada', res.message || 'Factura marcada como pagada');
        setShowInvoiceDetailModal(false);
        setSelectedInvoice(null);
        loadData();
      } else {
        Alert.alert('Error', res.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Error al marcar como pagada');
    }
  };

  const formatCurrency = (amount) => `L ${parseFloat(amount || 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;
  const getProgressPercentage = (current, target) => Math.min((parseFloat(current) / parseFloat(target)) * 100, 100);
  const getLevelInfo = (level) => {
    const levels = { 1: { name: 'Principiante', color: '#9CA3AF' }, 2: { name: 'Aprendiz', color: '#10B981' }, 3: { name: 'Intermedio', color: '#3B82F6' }, 4: { name: 'Avanzado', color: '#8B5CF6' }, 5: { name: 'Experto', color: '#F59E0B' } };
    return levels[Math.min(level, 5)] || levels[1];
  };
  const getUrgencyColor = (urgency) => {
    const colors = { overdue: '#EF4444', urgent: '#F59E0B', soon: '#3B82F6', ok: '#10B981' };
    return colors[urgency] || '#6B7280';
  };
  const getUrgencyText = (urgency, days) => {
    if (urgency === 'overdue') return `Vencida hace ${Math.abs(days)} días`;
    if (urgency === 'urgent') return `Vence en ${days} días`;
    if (urgency === 'soon') return `Vence en ${days} días`;
    return `${days} días restantes`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Cargando finanzas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = dashboard?.stats || { level: 1, xp: 0, current_streak: 0 };
  const levelInfo = getLevelInfo(stats.level);
  const xpProgress = (stats.xp % 100);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#8B5CF6', '#6366F1']} style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>← Volver</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mis Finanzas</Text>
            <View style={{ width: 60 }} />
          </View>
          
          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>🔥 {stats.current_streak}</Text>
              <Text style={styles.statLabel}>Racha</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>⭐ Nv.{stats.level}</Text>
              <Text style={styles.statLabel}>{levelInfo.name}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>✨ {stats.xp}</Text>
              <Text style={styles.statLabel}>XP</Text>
            </View>
          </View>

          {/* XP Progress */}
          <View style={styles.xpContainer}>
            <View style={styles.xpBarBg}>
              <View style={[styles.xpBarFill, { width: `${xpProgress}%` }]} />
            </View>
            <Text style={styles.xpText}>{stats.xp % 100}/100 XP para Nv.{stats.level + 1}</Text>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabSwitcher}>
            <TouchableOpacity style={[styles.tab, activeTab === 'dashboard' && styles.tabActive]} onPress={() => setActiveTab('dashboard')}>
              <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>💰 Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === 'invoices' && styles.tabActive]} onPress={() => setActiveTab('invoices')}>
              <Text style={[styles.tabText, activeTab === 'invoices' && styles.tabTextActive]}>🧾 Facturas</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {activeTab === 'dashboard' ? (
            <>
              {/* Tips Section */}
              {tips.length > 0 && (
                <View style={styles.tipsSection}>
                  <Text style={styles.tipsSectionTitle}>💡 Consejos para ti</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tipsScroll}>
                    {tips.map((tip, index) => (
                      <TouchableOpacity key={tip.id || index} style={[styles.tipCard, tip.is_premium && styles.tipCardPremium]} onPress={() => handleTipPress(tip)}>
                        {tip.is_premium && <View style={styles.premiumBadge}><Text style={styles.premiumBadgeText}>PRO</Text></View>}
                        <Text style={styles.tipIcon}>{tip.icon || '💡'}</Text>
                        <Text style={styles.tipTitle} numberOfLines={2}>{tip.title}</Text>
                        <Text style={styles.tipReason} numberOfLines={1}>{tip.reason || tip.category}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Upcoming Invoices Alert */}
              {upcomingInvoices.length > 0 && (
                <TouchableOpacity style={styles.invoiceAlert} onPress={() => setActiveTab('invoices')}>
                  <View style={styles.invoiceAlertIcon}>
                    <Text style={{ fontSize: 24 }}>⚠️</Text>
                  </View>
                  <View style={styles.invoiceAlertContent}>
                    <Text style={styles.invoiceAlertTitle}>{upcomingInvoices.length} factura{upcomingInvoices.length > 1 ? 's' : ''} por vencer</Text>
                    <Text style={styles.invoiceAlertSubtitle}>Toca para ver detalles</Text>
                  </View>
                  <Text style={styles.invoiceAlertArrow}>→</Text>
                </TouchableOpacity>
              )}

              {/* Balance Card */}
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Balance del mes</Text>
                <Text style={[styles.balanceAmount, { color: (dashboard?.month?.balance || 0) >= 0 ? '#10B981' : '#EF4444' }]}>
                  {formatCurrency(dashboard?.month?.balance || 0)}
                </Text>
                <View style={styles.balanceRow}>
                  <View style={styles.balanceItem}>
                    <Text style={styles.balanceItemIcon}>📈</Text>
                    <Text style={styles.balanceItemLabel}>Ingresos</Text>
                    <Text style={[styles.balanceItemValue, { color: '#10B981' }]}>{formatCurrency(dashboard?.month?.income || 0)}</Text>
                  </View>
                  <View style={styles.balanceDivider} />
                  <View style={styles.balanceItem}>
                    <Text style={styles.balanceItemIcon}>📉</Text>
                    <Text style={styles.balanceItemLabel}>Gastos</Text>
                    <Text style={[styles.balanceItemValue, { color: '#EF4444' }]}>{formatCurrency(dashboard?.month?.expenses || 0)}</Text>
                  </View>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.quickActions}>
                <TouchableOpacity style={[styles.quickAction, { backgroundColor: '#DCFCE7' }]} onPress={() => { setTransactionType('income'); setShowTransactionModal(true); }}>
                  <Text style={styles.quickActionIcon}>💵</Text>
                  <Text style={[styles.quickActionText, { color: '#166534' }]}>Ingreso</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.quickAction, { backgroundColor: '#FEE2E2' }]} onPress={() => { setTransactionType('expense'); setShowTransactionModal(true); }}>
                  <Text style={styles.quickActionIcon}>💸</Text>
                  <Text style={[styles.quickActionText, { color: '#991B1B' }]}>Gasto</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.quickAction, { backgroundColor: '#FEF3C7' }]} onPress={() => setShowInvoiceModal(true)}>
                  <Text style={styles.quickActionIcon}>🧾</Text>
                  <Text style={[styles.quickActionText, { color: '#92400E' }]}>Factura</Text>
                </TouchableOpacity>
              </View>

              {/* Goals Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>🎯 Mis Metas</Text>
                  <TouchableOpacity onPress={() => setShowGoalModal(true)}><Text style={styles.sectionAction}>+ Nueva</Text></TouchableOpacity>
                </View>
                {goals.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🎯</Text>
                    <Text style={styles.emptyText}>No tienes metas aún</Text>
                    <TouchableOpacity style={styles.emptyButton} onPress={() => setShowGoalModal(true)}>
                      <Text style={styles.emptyButtonText}>Crear mi primera meta</Text>
                    </TouchableOpacity>
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
                      <View style={[styles.progressBarFill, { width: `${getProgressPercentage(goal.current_amount, goal.target_amount)}%`, backgroundColor: goal.color || '#8B5CF6' }]} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Transactions Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📋 Últimas Transacciones</Text>
                {transactions.length === 0 ? (
                  <View style={styles.emptyState}><Text style={styles.emptyIcon}>📝</Text><Text style={styles.emptyText}>No hay transacciones</Text></View>
                ) : transactions.slice(0, 5).map(trans => (
                  <View key={trans.id} style={styles.transactionItem}>
                    <View style={[styles.transactionIcon, { backgroundColor: trans.type === 'income' ? '#DCFCE7' : '#FEE2E2' }]}>
                      <Text>{trans.type === 'income' ? '📈' : '📉'}</Text>
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionCategory}>{trans.category}</Text>
                      <Text style={styles.transactionDate}>{new Date(trans.date).toLocaleDateString('es-HN', { day: '2-digit', month: 'short' })}</Text>
                    </View>
                    <Text style={[styles.transactionAmount, { color: trans.type === 'income' ? '#10B981' : '#EF4444' }]}>
                      {trans.type === 'income' ? '+' : '-'}{formatCurrency(trans.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            /* Invoices Tab */
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🧾 Facturas Pendientes</Text>
                <TouchableOpacity onPress={() => setShowInvoiceModal(true)}><Text style={styles.sectionAction}>+ Nueva</Text></TouchableOpacity>
              </View>

              {upcomingInvoices.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🧾</Text>
                  <Text style={styles.emptyText}>No tienes facturas pendientes</Text>
                  <TouchableOpacity style={styles.emptyButton} onPress={() => setShowInvoiceModal(true)}>
                    <Text style={styles.emptyButtonText}>Registrar factura</Text>
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
                    <View style={styles.invoiceFooter}>
                      <Text style={styles.invoiceCategory}>{invoice.category || 'Sin categoría'}</Text>
                      <Text style={[styles.invoiceDue, { color: getUrgencyColor(invoice.urgency) }]}>
                        {getUrgencyText(invoice.urgency, invoice.days_until_due)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* Transaction Modal */}
      <AppModal visible={showTransactionModal} onClose={() => setShowTransactionModal(false)}>
        <Text style={styles.modalTitle}>{transactionType === 'income' ? '💵 Nuevo Ingreso' : '💸 Nuevo Gasto'}</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity style={[styles.typeButton, transactionType === 'income' && styles.typeButtonActive]} onPress={() => setTransactionType('income')}>
            <Text style={[styles.typeButtonText, transactionType === 'income' && styles.typeButtonTextActive]}>Ingreso</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.typeButton, transactionType === 'expense' && styles.typeButtonActiveExpense]} onPress={() => setTransactionType('expense')}>
            <Text style={[styles.typeButtonText, transactionType === 'expense' && styles.typeButtonTextActive]}>Gasto</Text>
          </TouchableOpacity>
        </View>
        <TextInput style={styles.input} placeholder="Monto" keyboardType="numeric" value={transactionForm.amount} onChangeText={(v) => setTransactionForm({ ...transactionForm, amount: v })} />
        <View style={styles.categoryGrid}>
          {categories.filter(c => c.type === transactionType || c.type === 'both').map(cat => (
            <TouchableOpacity key={cat.id} style={[styles.categoryChip, transactionForm.category === cat.name && { backgroundColor: cat.color, borderColor: cat.color }]} onPress={() => setTransactionForm({ ...transactionForm, category: cat.name })}>
              <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
              <Text style={[styles.categoryChipText, transactionForm.category === cat.name && { color: '#FFF' }]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={styles.input} placeholder="Descripción (opcional)" value={transactionForm.description} onChangeText={(v) => setTransactionForm({ ...transactionForm, description: v })} />
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowTransactionModal(false)}><Text style={styles.cancelButtonText}>Cancelar</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: transactionType === 'income' ? '#10B981' : '#EF4444' }]} onPress={handleCreateTransaction}><Text style={styles.saveButtonText}>Guardar</Text></TouchableOpacity>
        </View>
      </AppModal>

      {/* Goal Modal */}
      <AppModal visible={showGoalModal} onClose={() => setShowGoalModal(false)}>
        <Text style={styles.modalTitle}>🎯 Nueva Meta de Ahorro</Text>
        <TextInput style={styles.input} placeholder="Nombre de la meta" value={goalForm.name} onChangeText={(v) => setGoalForm({ ...goalForm, name: v })} />
        <TextInput style={styles.input} placeholder="Monto objetivo" keyboardType="numeric" value={goalForm.target_amount} onChangeText={(v) => setGoalForm({ ...goalForm, target_amount: v })} />
        <View style={styles.iconSelector}>
          {['🎯', '🏠', '🚗', '✈️', '💻', '📱', '🎓', '💍', '🏖️', '💰'].map(icon => (
            <TouchableOpacity key={icon} style={[styles.iconOption, goalForm.icon === icon && styles.iconOptionActive]} onPress={() => setGoalForm({ ...goalForm, icon })}>
              <Text style={styles.iconOptionText}>{icon}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowGoalModal(false)}><Text style={styles.cancelButtonText}>Cancelar</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#8B5CF6' }]} onPress={handleCreateGoal}><Text style={styles.saveButtonText}>Crear Meta</Text></TouchableOpacity>
        </View>
      </AppModal>

      {/* Contribution Modal */}
      <AppModal visible={showContributionModal} onClose={() => { setShowContributionModal(false); setSelectedGoal(null); }}>
        <Text style={styles.modalTitle}>💰 Agregar a {selectedGoal?.name}</Text>
        {selectedGoal && (
          <View style={styles.goalPreview}>
            <Text style={styles.goalPreviewText}>Progreso: {formatCurrency(selectedGoal.current_amount)} / {formatCurrency(selectedGoal.target_amount)}</Text>
            <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${getProgressPercentage(selectedGoal.current_amount, selectedGoal.target_amount)}%`, backgroundColor: '#8B5CF6' }]} /></View>
          </View>
        )}
        <TextInput style={styles.input} placeholder="Monto a aportar" keyboardType="numeric" value={contributionAmount} onChangeText={setContributionAmount} />
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowContributionModal(false); setSelectedGoal(null); }}><Text style={styles.cancelButtonText}>Cancelar</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#10B981' }]} onPress={handleAddContribution}><Text style={styles.saveButtonText}>Aportar</Text></TouchableOpacity>
        </View>
      </AppModal>

      {/* Invoice Modal */}
      <AppModal visible={showInvoiceModal} onClose={() => setShowInvoiceModal(false)}>
        <Text style={styles.modalTitle}>🧾 Nueva Factura</Text>
        <TextInput style={styles.input} placeholder="Proveedor / Empresa" value={invoiceForm.vendor_name} onChangeText={(v) => setInvoiceForm({ ...invoiceForm, vendor_name: v })} />
        <TextInput style={styles.input} placeholder="Monto" keyboardType="numeric" value={invoiceForm.amount} onChangeText={(v) => setInvoiceForm({ ...invoiceForm, amount: v })} />
        <TextInput style={styles.input} placeholder="Categoría (ej: Servicios, Agua, Luz)" value={invoiceForm.category} onChangeText={(v) => setInvoiceForm({ ...invoiceForm, category: v })} />
        <TextInput style={styles.input} placeholder="Fecha de vencimiento (YYYY-MM-DD)" value={invoiceForm.due_date} onChangeText={(v) => setInvoiceForm({ ...invoiceForm, due_date: v })} />
        <TextInput style={styles.input} placeholder="Descripción (opcional)" value={invoiceForm.description} onChangeText={(v) => setInvoiceForm({ ...invoiceForm, description: v })} />
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowInvoiceModal(false)}><Text style={styles.cancelButtonText}>Cancelar</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#F59E0B' }]} onPress={handleCreateInvoice}><Text style={styles.saveButtonText}>Registrar</Text></TouchableOpacity>
        </View>
      </AppModal>

      {/* Invoice Detail Modal */}
      <AppModal visible={showInvoiceDetailModal} onClose={() => { setShowInvoiceDetailModal(false); setSelectedInvoice(null); }}>
        {selectedInvoice && (
          <View>
            <Text style={styles.modalTitle}>🧾 {selectedInvoice.vendor_name}</Text>
            <View style={[styles.invoiceDetailStatus, { backgroundColor: getUrgencyColor(selectedInvoice.urgency) + '20' }]}>
              <Text style={[styles.invoiceDetailStatusText, { color: getUrgencyColor(selectedInvoice.urgency) }]}>
                {getUrgencyText(selectedInvoice.urgency, selectedInvoice.days_until_due)}
              </Text>
            </View>
            <View style={styles.invoiceDetailRow}>
              <Text style={styles.invoiceDetailLabel}>Monto:</Text>
              <Text style={styles.invoiceDetailValue}>{formatCurrency(selectedInvoice.amount)}</Text>
            </View>
            <View style={styles.invoiceDetailRow}>
              <Text style={styles.invoiceDetailLabel}>Categoría:</Text>
              <Text style={styles.invoiceDetailValue}>{selectedInvoice.category || 'Sin categoría'}</Text>
            </View>
            <View style={styles.invoiceDetailRow}>
              <Text style={styles.invoiceDetailLabel}>Vencimiento:</Text>
              <Text style={styles.invoiceDetailValue}>{new Date(selectedInvoice.due_date).toLocaleDateString('es-HN')}</Text>
            </View>
            {selectedInvoice.description && (
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailLabel}>Descripción:</Text>
                <Text style={styles.invoiceDetailValue}>{selectedInvoice.description}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.payButton} onPress={handlePayInvoice}>
              <Text style={styles.payButtonText}>✅ Marcar como Pagada</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeDetailButton} onPress={() => { setShowInvoiceDetailModal(false); setSelectedInvoice(null); }}>
              <Text style={styles.closeDetailButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        )}
      </AppModal>

      {/* Tip Modal */}
      <AppModal visible={showTipModal} onClose={() => { setShowTipModal(false); setSelectedTip(null); }}>
        {selectedTip && (
          <View>
            <View style={styles.tipModalHeader}>
              <Text style={styles.tipModalIcon}>{selectedTip.icon || '💡'}</Text>
              {selectedTip.is_premium && <View style={styles.tipModalPremiumBadge}><Text style={styles.tipModalPremiumText}>PRO</Text></View>}
            </View>
            <Text style={styles.tipModalTitle}>{selectedTip.title}</Text>
            <Text style={styles.tipModalContent}>{selectedTip.content}</Text>
            {selectedTip.reason && <View style={styles.tipModalReason}><Text style={styles.tipModalReasonText}>📍 {selectedTip.reason}</Text></View>}
            <Text style={styles.tipModalQuestion}>¿Te fue útil este consejo?</Text>
            <View style={styles.tipModalFeedback}>
              <TouchableOpacity style={[styles.feedbackButton, styles.feedbackButtonYes]} onPress={() => handleTipFeedback(true)}><Text style={styles.feedbackButtonText}>👍 Sí</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.feedbackButton, styles.feedbackButtonNo]} onPress={() => handleTipFeedback(false)}><Text style={styles.feedbackButtonText}>👎 No</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.dismissButton} onPress={dismissTip}><Text style={styles.dismissButtonText}>No mostrar más</Text></TouchableOpacity>
          </View>
        )}
      </AppModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 16 },
  header: { paddingTop: 10, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backButton: { padding: 8 },
  backText: { color: '#FFF', fontSize: 16 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  statsBar: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 12, marginBottom: 12 },
  statItem: { alignItems: 'center' },
  statValue: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  xpContainer: { alignItems: 'center', marginBottom: 12 },
  xpBarBg: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: '#FCD34D', borderRadius: 3 },
  xpText: { color: 'rgba(255,255,255,0.9)', fontSize: 11, marginTop: 4 },
  tabSwitcher: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#FFF' },
  tabText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#8B5CF6' },
  content: { padding: 20 },
  
  // Invoice Alert
  invoiceAlert: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F59E0B' },
  invoiceAlertIcon: { marginRight: 12 },
  invoiceAlertContent: { flex: 1 },
  invoiceAlertTitle: { fontSize: 15, fontWeight: '600', color: '#92400E' },
  invoiceAlertSubtitle: { fontSize: 12, color: '#B45309' },
  invoiceAlertArrow: { fontSize: 20, color: '#92400E' },
  
  // Invoice Card
  invoiceCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  invoiceUrgencyBar: { width: 4 },
  invoiceContent: { flex: 1, padding: 16 },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  invoiceVendor: { fontSize: 16, fontWeight: '600', color: '#111827' },
  invoiceAmount: { fontSize: 18, fontWeight: '700' },
  invoiceFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceCategory: { fontSize: 13, color: '#6B7280' },
  invoiceDue: { fontSize: 13, fontWeight: '500' },
  
  // Invoice Detail
  invoiceDetailStatus: { padding: 12, borderRadius: 12, marginBottom: 16, alignItems: 'center' },
  invoiceDetailStatusText: { fontSize: 14, fontWeight: '600' },
  invoiceDetailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  invoiceDetailLabel: { fontSize: 14, color: '#6B7280' },
  invoiceDetailValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  payButton: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  payButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  closeDetailButton: { padding: 16, alignItems: 'center', marginTop: 8 },
  closeDetailButtonText: { color: '#6B7280', fontSize: 14 },
  
  // Tips Section
  tipsSection: { marginBottom: 16 },
  tipsSectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  tipsScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  tipCard: { width: 150, backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginRight: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tipCardPremium: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B' },
  premiumBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  premiumBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  tipIcon: { fontSize: 28, marginBottom: 6 },
  tipTitle: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 4 },
  tipReason: { fontSize: 10, color: '#6B7280' },
  
  // Balance Card
  balanceCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  balanceLabel: { color: '#6B7280', fontSize: 14, marginBottom: 8 },
  balanceAmount: { fontSize: 36, fontWeight: '700', marginBottom: 20 },
  balanceRow: { flexDirection: 'row', width: '100%' },
  balanceItem: { flex: 1, alignItems: 'center' },
  balanceDivider: { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 16 },
  balanceItemIcon: { fontSize: 24, marginBottom: 4 },
  balanceItemLabel: { color: '#6B7280', fontSize: 12, marginBottom: 4 },
  balanceItemValue: { fontSize: 16, fontWeight: '600' },
  
  // Quick Actions
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  quickAction: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 16, marginHorizontal: 4 },
  quickActionIcon: { fontSize: 26, marginBottom: 6 },
  quickActionText: { fontSize: 13, fontWeight: '600' },
  
  // Section
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sectionAction: { color: '#8B5CF6', fontSize: 14, fontWeight: '600' },
  
  // Empty State
  emptyState: { backgroundColor: '#FFF', borderRadius: 16, padding: 32, alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#6B7280', fontSize: 16, marginBottom: 16 },
  emptyButton: { backgroundColor: '#8B5CF6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyButtonText: { color: '#FFF', fontWeight: '600' },
  
  // Goal Card
  goalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  goalIcon: { fontSize: 32, marginRight: 12 },
  goalInfo: { flex: 1 },
  goalName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  goalProgress: { fontSize: 13, color: '#6B7280' },
  goalPercentage: { fontSize: 18, fontWeight: '700', color: '#8B5CF6' },
  progressBarBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  
  // Transaction Item
  transactionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 8 },
  transactionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  transactionInfo: { flex: 1 },
  transactionCategory: { fontSize: 15, fontWeight: '500', color: '#111827' },
  transactionDate: { fontSize: 12, color: '#9CA3AF' },
  transactionAmount: { fontSize: 16, fontWeight: '600' },
  
  // Modal Styles
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 20, textAlign: 'center' },
  typeSelector: { flexDirection: 'row', marginBottom: 16 },
  typeButton: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#F3F4F6', marginHorizontal: 4, alignItems: 'center' },
  typeButtonActive: { backgroundColor: '#DCFCE7' },
  typeButtonActiveExpense: { backgroundColor: '#FEE2E2' },
  typeButtonText: { fontWeight: '600', color: '#6B7280' },
  typeButtonTextActive: { color: '#111827' },
  input: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 12 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  categoryChipIcon: { marginRight: 6 },
  categoryChipText: { fontSize: 13, color: '#374151' },
  iconSelector: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 },
  iconOption: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', margin: 4 },
  iconOptionActive: { backgroundColor: '#EDE9FE', borderWidth: 2, borderColor: '#8B5CF6' },
  iconOptionText: { fontSize: 22 },
  goalPreview: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 16 },
  goalPreviewText: { textAlign: 'center', color: '#374151', marginBottom: 12 },
  modalButtons: { flexDirection: 'row', marginTop: 8 },
  cancelButton: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#F3F4F6', marginRight: 8, alignItems: 'center' },
  cancelButtonText: { color: '#6B7280', fontWeight: '600' },
  saveButton: { flex: 1, padding: 16, borderRadius: 12, marginLeft: 8, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontWeight: '600' },
  
  // Tip Modal Styles
  tipModalHeader: { alignItems: 'center', marginBottom: 12 },
  tipModalIcon: { fontSize: 56 },
  tipModalPremiumBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  tipModalPremiumText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  tipModalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 12 },
  tipModalContent: { fontSize: 15, color: '#374151', lineHeight: 22, textAlign: 'center', marginBottom: 16 },
  tipModalReason: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12, marginBottom: 16 },
  tipModalReasonText: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  tipModalQuestion: { fontSize: 14, fontWeight: '600', color: '#6B7280', textAlign: 'center', marginBottom: 12 },
  tipModalFeedback: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 12 },
  feedbackButton: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  feedbackButtonYes: { backgroundColor: '#DCFCE7' },
  feedbackButtonNo: { backgroundColor: '#FEE2E2' },
  feedbackButtonText: { fontSize: 15, fontWeight: '600' },
  dismissButton: { alignItems: 'center', padding: 12 },
  dismissButtonText: { color: '#9CA3AF', fontSize: 14 },
});
