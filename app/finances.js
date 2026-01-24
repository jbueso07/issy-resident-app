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
  ActivityIndicator,
  Image,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppModal } from '../src/components';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  getInvoices,
  createInvoice,
  uploadReceiptImage,
  markInvoicePaid,
  getBudgetsStatus,
  createBudget,
  deleteBudget,
  getFinancePlans,
  getFinanceUsageLimits,
  upgradeFinancePlan,
  getPaymentMethods,
  subscribeToPlan,
  // NEW - Budget Assistant
  getBudgetAssistant,
  applyBudgetSuggestion,
  // NEW - Reports
  getReportSummary,
  getReportByCategory,
  getReportTrends,
  getMonthComparison,
  // NEW - Goal Projections
  getGoalProjection,
  calculateGoalPlan,
  // NEW - Subscriptions (Recurring Payments)
  getSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  markSubscriptionPaid,
  // NEW - Receivables
  getReceivables,
  createReceivable,
  updateReceivable,
  deleteReceivable,
  markReceivableCollected,
  addReceivablePayment,
  getReceivablePayments,
  // NEW - User Settings
  getFinanceSettings,
  updateFinanceSettings
} from '../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ProHome Dark Theme Colors - PREMIUM EDITION
const COLORS = {
  // Backgrounds
  background: '#0A0F0F',
  backgroundSecondary: '#121A1A',
  backgroundTertiary: '#1A2424',
  backgroundElevated: '#1E2828',
  
  // Cards
  card: 'rgba(255, 255, 255, 0.04)',
  cardBorder: 'rgba(255, 255, 255, 0.06)',
  cardHover: 'rgba(255, 255, 255, 0.08)',
  
  // Brand Colors
  teal: '#5DDED8',
  tealDark: '#4BCDC7',
  tealGlow: 'rgba(93, 222, 216, 0.3)',
  lime: '#D4FE48',
  limeGlow: 'rgba(212, 254, 72, 0.3)',
  purple: '#8B5CF6',
  purpleLight: '#A78BFA',
  purpleGlow: 'rgba(139, 92, 246, 0.3)',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  textInverse: '#0A0F0F',
  
  // Semantic Colors
  green: '#22C55E',
  greenLight: '#4ADE80',
  greenBg: 'rgba(34, 197, 94, 0.12)',
  greenBorder: 'rgba(34, 197, 94, 0.25)',
  greenGlow: 'rgba(34, 197, 94, 0.4)',
  
  red: '#F43F5E',
  redLight: '#FB7185',
  redBg: 'rgba(244, 63, 94, 0.12)',
  redBorder: 'rgba(244, 63, 94, 0.25)',
  redGlow: 'rgba(244, 63, 94, 0.4)',
  
  yellow: '#F59E0B',
  yellowLight: '#FBBF24',
  yellowBg: 'rgba(245, 158, 11, 0.12)',
  yellowGlow: 'rgba(245, 158, 11, 0.4)',
  
  blue: '#3B82F6',
  blueLight: '#60A5FA',
  blueBg: 'rgba(59, 130, 246, 0.12)',
  blueGlow: 'rgba(59, 130, 246, 0.4)',
  
  // Gradients (para usar con LinearGradient si lo agregamos)
  gradientTeal: ['#5DDED8', '#3B82F6'],
  gradientPurple: ['#8B5CF6', '#EC4899'],
  gradientGreen: ['#22C55E', '#10B981'],
  gradientRed: ['#F43F5E', '#EF4444'],
  gradientGold: ['#F59E0B', '#EAB308'],
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
  const [paidInvoices, setPaidInvoices] = useState([]);
  const [collectedReceivables, setCollectedReceivables] = useState([]);
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
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [sharingImage, setSharingImage] = useState(false);
  
  const [transactionType, setTransactionType] = useState('expense');
  const [transactionForm, setTransactionForm] = useState({ amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0] });
  const [goalForm, setGoalForm] = useState({ name: '', target_amount: '', icon: '🎯' });
  const [contributionAmount, setContributionAmount] = useState('');
  const [invoiceForm, setInvoiceForm] = useState({ vendor_name: '', amount: '', category: '', due_date: '', description: '', image_url: null });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category: '', amount: '', icon: '💰' });
// NEW - Budget Assistant States
  const [budgetAssistant, setBudgetAssistant] = useState(null);
  const [showAssistantModal, setShowAssistantModal] = useState(false);
  const [incomeInput, setIncomeInput] = useState('');
  
  // NEW - Reports States
  const [reportSummary, setReportSummary] = useState(null);
  const [reportByCategory, setReportByCategory] = useState(null);
  const [reportTrends, setReportTrends] = useState(null);
  const [monthComparison, setMonthComparison] = useState(null);
  const [showReportsModal, setShowReportsModal] = useState(false);
  
  // NEW - Goal Projection States
  const [goalProjection, setGoalProjection] = useState(null);
  const [showProjectionModal, setShowProjectionModal] = useState(false);
  const [goalPlanForm, setGoalPlanForm] = useState({ target_amount: '', current_amount: '', deadline: '', monthly_capacity: '' });
  
  // NEW - Subscriptions States
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionsSummary, setSubscriptionsSummary] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showSubscriptionDetailModal, setShowSubscriptionDetailModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [subscriptionForm, setSubscriptionForm] = useState({ 
    name: '', icon: '💳', amount: '', category: 'Servicios', 
    billing_day: new Date().getDate().toString(), frequency: 'monthly', reminder_days: '3', notes: '' 
  });
  
  // NEW - Receivables States
  const [receivables, setReceivables] = useState([]);
  const [receivablesSummary, setReceivablesSummary] = useState(null);
  const [showReceivableModal, setShowReceivableModal] = useState(false);
  const [showReceivableDatePicker, setShowReceivableDatePicker] = useState(false);
  const [showReceivableDetailModal, setShowReceivableDetailModal] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState(null);
  const [receivableForm, setReceivableForm] = useState({ 
    client_name: '', client_phone: '', client_email: '', 
    description: '', amount: '', category: 'Servicios', due_date: '', notes: '' 
  });
  const [paymentAmount, setPaymentAmount] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [
        dashRes, transRes, goalsRes, catRes, tipsRes, 
        invoicesRes, budgetsRes, plansRes, limitsRes,
        // NEW
        subsRes, recvRes, assistantRes, paidInvRes, collectedRecvRes
      ] = await Promise.all([
        getFinanceDashboard().catch(() => ({ success: false })),
        getTransactions({ limit: 10 }).catch(() => ({ success: false })),
        getFinanceGoals().catch(() => ({ success: false })),
        getCategories().catch(() => ({ success: false })),
        getPersonalizedTips(i18n.language).catch(() => ({ success: false })),
        getUpcomingInvoices(14).catch(() => ({ success: false })),
        getBudgetsStatus().catch(() => ({ success: false })),
        getFinancePlans().catch(() => ({ success: false })),
        getFinanceUsageLimits().catch(() => ({ success: false })),
        // NEW
        getSubscriptions(true).catch(() => ({ success: false })),
        getReceivables('pending').catch(() => ({ success: false })),
        getBudgetAssistant().catch(() => ({ success: false })),
        getInvoices({ status: 'paid', limit: 20 }).catch(() => ({ success: false })),
        getReceivables('paid').catch(() => ({ success: false }))
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
      // NEW
      if (subsRes.success) {
        setSubscriptions(subsRes.data || []);
        setSubscriptionsSummary(subsRes.summary || null);
      }
      if (recvRes.success) {
        setReceivables(recvRes.data || []);
        setReceivablesSummary(recvRes.summary || null);
      }
      if (assistantRes.success) setBudgetAssistant(assistantRes.data);
      if (paidInvRes.success) setPaidInvoices(paidInvRes.data || []);
      if (collectedRecvRes.success) setCollectedReceivables(collectedRecvRes.data || []);
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


  const pickInvoiceImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("common.error"), t("finances.errors.permissionDenied", "Permiso denegado"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      
      
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setInvoiceForm({ ...invoiceForm, image_url: base64Image });
    }
  };

  const takeInvoicePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("common.error"), t("finances.errors.cameraPermissionDenied", "Permiso de cámara denegado"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      
      
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setInvoiceForm({ ...invoiceForm, image_url: base64Image });
    }
  };
  const handleCreateInvoice = async () => {
    if (!invoiceForm.vendor_name || !invoiceForm.amount) { Alert.alert(t('common.error'), t('finances.errors.vendorAmountRequired')); return; }
    try {
      let imageUrl = null;
      
      // Si hay imagen, subirla primero a Storage
      if (invoiceForm.image_url && invoiceForm.image_url.startsWith('data:')) {
        const uploadRes = await uploadReceiptImage(invoiceForm.image_url);
        if (uploadRes.success) {
          imageUrl = uploadRes.data.url;
        } else {
          Alert.alert(t('common.error'), t('finances.errors.imageUploadFailed', 'Error al subir imagen'));
          return;
        }
      } else if (invoiceForm.image_url) {
        imageUrl = invoiceForm.image_url; // Ya es URL
      }
      
      const res = await createInvoice({ 
        vendor_name: invoiceForm.vendor_name, 
        amount: parseFloat(invoiceForm.amount), 
        category: invoiceForm.category || 'Servicios', 
        due_date: invoiceForm.due_date || null, 
        description: invoiceForm.description, 
        image_url: imageUrl 
      });
      if (res.success) { 
        Alert.alert(t('finances.success.invoiceTitle'), res.message || t('finances.success.invoiceRegistered')); 
        setShowInvoiceModal(false); 
        setInvoiceForm({ vendor_name: '', amount: '', category: '', due_date: '', description: '', image_url: null }); 
        loadData(); 
      } else Alert.alert(t('common.error'), res.error || t('finances.errors.registerFailed'));
    } catch (error) { Alert.alert(t('common.error'), t('finances.errors.invoiceError')); }
  };
  const handleShareImage = async (imageUrl) => {
    if (sharingImage) return;
    
    try {
      if (!imageUrl) {
        Alert.alert(t("common.error"), t("finances.errors.noImage", "No hay imagen disponible"));
        return;
      }
      
      setSharingImage(true);
      let fileUri;
      
      if (imageUrl.startsWith('data:')) {
        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
        const mimeMatch = imageUrl.match(/^data:image\/(\w+);/);
        const extension = mimeMatch ? mimeMatch[1].replace('jpeg', 'jpg') : 'jpg';
        const filename = `factura_${Date.now()}.${extension}`;
        fileUri = FileSystem.cacheDirectory + filename;
        await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: 'base64' });
      } else {
        // Limpiar URL de query params para el nombre
        const cleanUrl = imageUrl.split('?')[0];
        const extension = cleanUrl.match(/\.(jpg|jpeg|png|webp)$/i)?.[1] || 'jpg';
        const filename = `factura_${Date.now()}.${extension}`;
        fileUri = FileSystem.cacheDirectory + filename;
        const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
        if (downloadResult.status !== 200) {
          throw new Error('Download failed');
        }
        fileUri = downloadResult.uri;
      }
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, { mimeType: 'image/jpeg', dialogTitle: 'Compartir factura' });
      } else {
        Alert.alert(t("common.error"), t("finances.errors.sharingNotAvailable", "Compartir no está disponible"));
      }
    } catch (error) {
      console.error("Error sharing image:", error);
      Alert.alert(t("common.error"), t("finances.errors.shareError", "Error al compartir imagen"));
    } finally {
      setSharingImage(false);
    }
  };
  const handleViewImage = (imageUrl) => {
    if (imageUrl) {
      setSelectedImage(imageUrl);
      setShowImageModal(true);
    }
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
// ============================================
  // NEW - BUDGET ASSISTANT FUNCTIONS
  // ============================================
  const loadBudgetAssistant = async (income = null) => {
    try {
      const res = await getBudgetAssistant(income);
      if (res.success) setBudgetAssistant(res.data);
    } catch (error) {
      console.error('Error loading budget assistant:', error);
    }
  };

  const handleApplyBudgetRule = async (rule) => {
    const income = budgetAssistant?.income || parseFloat(incomeInput);
    if (!income || income <= 0) {
      Alert.alert(t('common.error'), t('finances.assistant.enterIncome'));
      return;
    }
    
    Alert.alert(
      t('finances.assistant.confirmTitle'),
      t('finances.assistant.confirmMessage', { rule }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.confirm'), 
          onPress: async () => {
            try {
              const res = await applyBudgetSuggestion(rule, income);
              if (res.success) {
                Alert.alert(t('common.success'), res.message || t('finances.assistant.applied'));
                setShowAssistantModal(false);
                loadData();
              } else {
                Alert.alert(t('common.error'), res.error);
              }
            } catch (error) {
              Alert.alert(t('common.error'), error.message);
            }
          }
        }
      ]
    );
  };

  // ============================================
  // NEW - REPORTS FUNCTIONS
  // ============================================
  const loadReports = async () => {
    try {
      const [summaryRes, categoryRes, trendsRes, comparisonRes] = await Promise.all([
        getReportSummary(6).catch(() => ({ success: false })),
        getReportByCategory('expense').catch(() => ({ success: false })),
        getReportTrends(null, 6).catch(() => ({ success: false })),
        getMonthComparison().catch(() => ({ success: false }))
      ]);
      
      if (summaryRes.success) setReportSummary(summaryRes.data);
      if (categoryRes.success) setReportByCategory(categoryRes.data);
      if (trendsRes.success) setReportTrends(trendsRes.data);
      if (comparisonRes.success) setMonthComparison(comparisonRes.data);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const handleOpenReports = () => {
    loadReports();
    setShowReportsModal(true);
  };

  // ============================================
  // NEW - GOAL PROJECTION FUNCTIONS
  // ============================================
  const handleOpenProjection = async (goal) => {
    setSelectedGoal(goal);
    try {
      const res = await getGoalProjection(goal.id);
      if (res.success) {
        setGoalProjection(res.data);
        setShowProjectionModal(true);
      } else {
        Alert.alert(t('common.error'), res.error);
      }
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleCalculateGoalPlan = async () => {
    const { target_amount, current_amount, deadline, monthly_capacity } = goalPlanForm;
    if (!target_amount) {
      Alert.alert(t('common.error'), t('finances.goals.enterTarget'));
      return;
    }
    
    try {
      const res = await calculateGoalPlan(
        parseFloat(target_amount),
        parseFloat(current_amount) || 0,
        deadline || null,
        monthly_capacity ? parseFloat(monthly_capacity) : null
      );
      if (res.success) {
        setGoalProjection(res.data);
      } else {
        Alert.alert(t('common.error'), res.error);
      }
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  // ============================================
  // NEW - SUBSCRIPTIONS FUNCTIONS
  // ============================================
  const loadSubscriptions = async () => {
    try {
      const res = await getSubscriptions();
      if (res.success) {
        setSubscriptions(res.data || []);
        setSubscriptionsSummary(res.summary || null);
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
  };

  const handleCreateSubscription = async () => {
    const { name, amount, category, billing_day, frequency } = subscriptionForm;
    if (!name || !amount) {
      Alert.alert(t('common.error'), t('finances.subscriptions.requiredFields'));
      return;
    }
    
    try {
      const res = await createSubscription({
        ...subscriptionForm,
        amount: parseFloat(amount),
        billing_day: parseInt(billing_day) || new Date().getDate(),
        reminder_days: parseInt(subscriptionForm.reminder_days) || 3
      });
      
      if (res.success) {
        Alert.alert(t('common.success'), res.message || t('finances.subscriptions.created'));
        setShowSubscriptionModal(false);
        setSubscriptionForm({ 
          name: '', icon: '💳', amount: '', category: 'Servicios', 
          billing_day: new Date().getDate().toString(), frequency: 'monthly', reminder_days: '3', notes: '' 
        });
        loadSubscriptions();
      } else {
        Alert.alert(t('common.error'), res.error);
      }
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleMarkSubscriptionPaid = async (subscription) => {
    Alert.alert(
      t('finances.subscriptions.markPaidTitle'),
      t('finances.subscriptions.markPaidMessage', { name: subscription.name, amount: formatCurrency(subscription.amount) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('finances.subscriptions.markPaid'),
          onPress: async () => {
            try {
              const res = await markSubscriptionPaid(subscription.id, true);
              if (res.success) {
                Alert.alert(t('common.success'), res.message || t('finances.subscriptions.paid'));
                loadSubscriptions();
                loadData();
              } else {
                Alert.alert(t('common.error'), res.error);
              }
            } catch (error) {
              Alert.alert(t('common.error'), error.message);
            }
          }
        }
      ]
    );
  };

  const handleDeleteSubscription = async (subscription) => {
    Alert.alert(
      t('finances.subscriptions.deleteTitle'),
      t('finances.subscriptions.deleteMessage', { name: subscription.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteSubscription(subscription.id);
              if (res.success) {
                Alert.alert(t('common.success'), t('finances.subscriptions.deleted'));
                setShowSubscriptionDetailModal(false);
                loadSubscriptions();
              } else {
                Alert.alert(t('common.error'), res.error);
              }
            } catch (error) {
              Alert.alert(t('common.error'), error.message);
            }
          }
        }
      ]
    );
  };

  // ============================================
  // NEW - RECEIVABLES FUNCTIONS
  // ============================================
  const loadReceivables = async () => {
    try {
      const res = await getReceivables();
      if (res.success) {
        setReceivables(res.data || []);
        setReceivablesSummary(res.summary || null);
      }
    } catch (error) {
      console.error('Error loading receivables:', error);
    }
  };

  const handleCreateReceivable = async () => {
    const { client_name, description, amount } = receivableForm;
    if (!client_name || !description || !amount) {
      Alert.alert(t('common.error'), t('finances.receivables.requiredFields'));
      return;
    }
    
    try {
      const res = await createReceivable({
        ...receivableForm,
        amount: parseFloat(amount)
      });
      
      if (res.success) {
        Alert.alert(t('common.success'), res.message || t('finances.receivables.created'));
        setShowReceivableModal(false);
        setReceivableForm({ 
          client_name: '', client_phone: '', client_email: '', 
          description: '', amount: '', category: 'Servicios', due_date: '', notes: '' 
        });
        loadReceivables();
      } else {
        Alert.alert(t('common.error'), res.error);
      }
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleCollectReceivable = async (receivable) => {
    Alert.alert(
      t('finances.receivables.collectTitle'),
      t('finances.receivables.collectMessage', { client: receivable.client_name, amount: formatCurrency(receivable.amount - (receivable.amount_paid || 0)) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('finances.receivables.collectFull'),
          onPress: async () => {
            try {
              const res = await markReceivableCollected(receivable.id, true);
              if (res.success) {
                Alert.alert(t('common.success'), res.message || t('finances.receivables.collected'));
                setShowReceivableDetailModal(false);
                loadReceivables();
                loadData();
              } else {
                Alert.alert(t('common.error'), res.error);
              }
            } catch (error) {
              Alert.alert(t('common.error'), error.message);
            }
          }
        }
      ]
    );
  };

  const handleAddPartialPayment = async (receivable) => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      Alert.alert(t('common.error'), t('finances.receivables.enterAmount'));
      return;
    }
    
    try {
      const res = await addReceivablePayment(receivable.id, parseFloat(paymentAmount), null, null, true);
      if (res.success) {
        Alert.alert(t('common.success'), res.message || t('finances.receivables.paymentAdded'));
        setPaymentAmount('');
        loadReceivables();
        loadData();
        
        if (res.is_fully_paid) {
          setShowReceivableDetailModal(false);
        }
      } else {
        Alert.alert(t('common.error'), res.error);
      }
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleDeleteReceivable = async (receivable) => {
    Alert.alert(
      t('finances.receivables.deleteTitle'),
      t('finances.receivables.deleteMessage', { client: receivable.client_name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteReceivable(receivable.id);
              if (res.success) {
                Alert.alert(t('common.success'), t('finances.receivables.deleted'));
                setShowReceivableDetailModal(false);
                loadReceivables();
              } else {
                Alert.alert(t('common.error'), res.error);
              }
            } catch (error) {
              Alert.alert(t('common.error'), error.message);
            }
          }
        }
      ]
    );
  };

  // Helper para frecuencia de suscripción
  const getFrequencyText = (freq) => {
    const frequencies = {
      weekly: t('finances.subscriptions.weekly'),
      biweekly: t('finances.subscriptions.biweekly'),
      monthly: t('finances.subscriptions.monthly'),
      yearly: t('finances.subscriptions.yearly')
    };
    return frequencies[freq] || freq;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.purple} />
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

        {/* Tab Switcher - Scrollable */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabSwitcher} contentContainerStyle={styles.tabSwitcherContent}>
          <TouchableOpacity style={[styles.tab, activeTab === 'dashboard' && styles.tabActive]} onPress={() => setActiveTab('dashboard')}>
            <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>💰 {t('finances.tabs.dashboard', 'Inicio')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'invoices' && styles.tabActive]} onPress={() => setActiveTab('invoices')}>
            <Text style={[styles.tabText, activeTab === 'invoices' && styles.tabTextActive]}>🧾 {t('finances.tabs.invoices', 'Facturas')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'budgets' && styles.tabActive]} onPress={() => setActiveTab('budgets')}>
            <Text style={[styles.tabText, activeTab === 'budgets' && styles.tabTextActive]}>📊 {t('finances.tabs.budget', 'Presupuesto')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'subscriptions' && styles.tabActive]} onPress={() => { setActiveTab('subscriptions'); loadSubscriptions(); }}>
            <Text style={[styles.tabText, activeTab === 'subscriptions' && styles.tabTextActive]}>🔄 {t('finances.tabs.subscriptions', 'Suscripciones')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'receivables' && styles.tabActive]} onPress={() => { setActiveTab('receivables'); loadReceivables(); }}>
            <Text style={[styles.tabText, activeTab === 'receivables' && styles.tabTextActive]}>💵 {t('finances.tabs.receivables', 'Por Cobrar')}</Text>
          </TouchableOpacity>
        </ScrollView>

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
            {/* ============================================ */}
            {/* QUICK ACTIONS - LARGE CARDS */}
            {/* ============================================ */}
            <View style={styles.quickActionsLarge}>
              <View style={styles.quickActionsRow}>
                {/* Ingreso */}
                <TouchableOpacity 
                  style={[styles.quickActionLarge, { backgroundColor: 'rgba(34, 197, 94, 0.08)', borderColor: COLORS.greenBorder }]}
                  onPress={() => { if (checkLimit('transaction')) { setTransactionType('income'); setShowTransactionModal(true); } }}
                >
                  <View style={[styles.quickActionLargeIcon, { backgroundColor: COLORS.greenBg }]}>
                    <Ionicons name="add-circle" size={32} color={COLORS.green} />
                  </View>
                  <Text style={styles.quickActionLargeLabel}>{t('finances.quickActions.income', 'Ingreso')}</Text>
                  <Text style={styles.quickActionLargeHint}>{t('finances.quickActions.incomeHint', 'Registrar entrada')}</Text>
                </TouchableOpacity>

                {/* Gasto */}
                <TouchableOpacity 
                  style={[styles.quickActionLarge, { backgroundColor: 'rgba(244, 63, 94, 0.08)', borderColor: COLORS.redBorder }]}
                  onPress={() => { if (checkLimit('transaction')) { setTransactionType('expense'); setShowTransactionModal(true); } }}
                >
                  <View style={[styles.quickActionLargeIcon, { backgroundColor: COLORS.redBg }]}>
                    <Ionicons name="remove-circle" size={32} color={COLORS.red} />
                  </View>
                  <Text style={styles.quickActionLargeLabel}>{t('finances.quickActions.expense', 'Gasto')}</Text>
                  <Text style={styles.quickActionLargeHint}>{t('finances.quickActions.expenseHint', 'Registrar salida')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.quickActionsRow}>
                {/* Meta */}
                <TouchableOpacity 
                  style={[styles.quickActionLarge, { backgroundColor: 'rgba(93, 222, 216, 0.08)', borderColor: 'rgba(93, 222, 216, 0.25)' }]}
                  onPress={() => { if (checkLimit('goal')) setShowGoalModal(true); }}
                >
                  <View style={[styles.quickActionLargeIcon, { backgroundColor: 'rgba(93, 222, 216, 0.15)' }]}>
                    <Ionicons name="flag" size={30} color={COLORS.teal} />
                  </View>
                  <Text style={styles.quickActionLargeLabel}>{t('finances.quickActions.goal', 'Nueva Meta')}</Text>
                  <Text style={styles.quickActionLargeHint}>{t('finances.quickActions.goalHint', 'Crear objetivo')}</Text>
                </TouchableOpacity>

                {/* Asistente */}
                <TouchableOpacity 
                  style={[styles.quickActionLarge, { backgroundColor: 'rgba(139, 92, 246, 0.08)', borderColor: 'rgba(139, 92, 246, 0.25)' }]}
                  onPress={() => setShowAssistantModal(true)}
                >
                  <View style={styles.newBadgeLarge}>
                    <Text style={styles.newBadgeLargeText}>NEW</Text>
                  </View>
                  <View style={[styles.quickActionLargeIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                    <Ionicons name="sparkles" size={30} color={COLORS.purple} />
                  </View>
                  <Text style={styles.quickActionLargeLabel}>{t('finances.quickActions.assistant', 'Asistente')}</Text>
                  <Text style={styles.quickActionLargeHint}>{t('finances.quickActions.assistantHint', 'Planifica tu dinero')}</Text>
                </TouchableOpacity>
              </View>

              {/* Reportes - Full width */}
              <TouchableOpacity 
                style={[styles.quickActionWide, { backgroundColor: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.25)' }]}
                onPress={handleOpenReports}
              >
                <View style={styles.newBadgeLarge}>
                  <Text style={styles.newBadgeLargeText}>NEW</Text>
                </View>
                <View style={[styles.quickActionLargeIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <Ionicons name="bar-chart" size={30} color={COLORS.blue} />
                </View>
                <View style={styles.quickActionWideContent}>
                  <Text style={styles.quickActionLargeLabel}>{t('finances.quickActions.reports', 'Ver Reportes')}</Text>
                  <Text style={styles.quickActionLargeHint}>{t('finances.quickActions.reportsHint', 'Analiza tus finanzas con gráficos')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.blue} />
              </TouchableOpacity>
            </View>

            {/* ============================================ */}
            {/* TIPS CAROUSEL - PREMIUM */}
            {/* ============================================ */}
            {tips.length > 0 && (
              <View style={styles.sectionPremium}>
                <View style={styles.sectionHeaderPremium}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="bulb" size={20} color={COLORS.yellow} />
                    <Text style={styles.sectionTitlePremium}>{t('finances.sections.tipsForYou', 'Tips para ti')}</Text>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tipsScrollPremium}>
                  {tips.map((tip, index) => (
                    <TouchableOpacity 
                      key={tip.id || index} 
                      style={[styles.tipCardPremium, tip.is_premium && styles.tipCardPremiumPro]} 
                      onPress={() => handleTipPress(tip)}
                    >
                      {tip.is_premium && (
                        <View style={styles.proBadge}>
                          <Ionicons name="diamond" size={10} color={COLORS.yellow} />
                          <Text style={styles.proBadgeText}>PRO</Text>
                        </View>
                      )}
                      <Text style={styles.tipIconPremium}>{tip.icon || '💡'}</Text>
                      <Text style={styles.tipTitlePremium} numberOfLines={2}>{tip.title}</Text>
                      <View style={styles.tipArrow}>
                        <Ionicons name="arrow-forward" size={14} color={COLORS.teal} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ============================================ */}
            {/* GOALS SECTION - PREMIUM */}
            {/* ============================================ */}
            <View style={styles.sectionPremium}>
              <View style={styles.sectionHeaderPremium}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="flag" size={20} color={COLORS.teal} />
                  <Text style={styles.sectionTitlePremium}>{t('finances.sections.myGoals', 'Mis Metas')}</Text>
                </View>
                <TouchableOpacity style={styles.sectionAddButton} onPress={() => { if (checkLimit('goal')) setShowGoalModal(true); }}>
                  <Ionicons name="add" size={20} color={COLORS.teal} />
                </TouchableOpacity>
              </View>
              
              {goals.length === 0 ? (
                <View style={styles.emptyStatePremium}>
                  <View style={styles.emptyIconBox}>
                    <Ionicons name="flag-outline" size={32} color={COLORS.textMuted} />
                  </View>
                  <Text style={styles.emptyTextPremium}>{t('finances.empty.noGoals', 'Sin metas aún')}</Text>
                  <Text style={styles.emptySubtextPremium}>{t('finances.empty.createGoalHint', 'Crea tu primera meta de ahorro')}</Text>
                  <TouchableOpacity style={styles.emptyButtonPremium} onPress={() => { if (checkLimit('goal')) setShowGoalModal(true); }}>
                    <Ionicons name="add" size={18} color={COLORS.background} />
                    <Text style={styles.emptyButtonTextPremium}>{t('finances.createGoal', 'Crear Meta')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goalsScrollPremium}>
                  {goals.map(goal => {
                    const progress = getProgressPercentage(goal.current_amount, goal.target_amount);
                    return (
                      <TouchableOpacity 
                        key={goal.id} 
                        style={styles.goalCardPremium}
                        onPress={() => { setSelectedGoal(goal); setShowContributionModal(true); }}
                        onLongPress={() => handleOpenProjection(goal)}
                      >
                        <View style={styles.goalCardHeader}>
                          <Text style={styles.goalIconPremium}>{goal.icon || '🎯'}</Text>
                          <View style={styles.goalProgressCircle}>
                            <Text style={styles.goalProgressText}>{Math.round(progress)}%</Text>
                          </View>
                        </View>
                        <Text style={styles.goalNamePremium} numberOfLines={1}>{goal.name}</Text>
                        <View style={styles.goalProgressBarPremium}>
                          <View style={[styles.goalProgressFillPremium, { width: `${progress}%` }]} />
                        </View>
                        <View style={styles.goalAmountRow}>
                          <Text style={styles.goalCurrentPremium}>{formatCurrency(goal.current_amount)}</Text>
                          <Text style={styles.goalTargetPremium}>/ {formatCurrency(goal.target_amount)}</Text>
                        </View>
                        <View style={styles.goalActionHint}>
                          <Ionicons name="add-circle" size={14} color={COLORS.teal} />
                          <Text style={styles.goalActionHintText}>{t('finances.goals.tapToAdd', 'Toca para abonar')}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* ============================================ */}
            {/* TRANSACTIONS SECTION - PREMIUM */}
            {/* ============================================ */}
            <View style={styles.sectionPremium}>
              <View style={styles.sectionHeaderPremium}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="swap-horizontal" size={20} color={COLORS.purple} />
                  <Text style={styles.sectionTitlePremium}>{t('finances.sections.latestTransactions', 'Últimos Movimientos')}</Text>
                </View>
                <Text style={styles.transactionCount}>{dashboard?.month?.transactionCount || 0}</Text>
              </View>
              
              {transactions.length === 0 ? (
                <View style={styles.emptyStatePremium}>
                  <View style={styles.emptyIconBox}>
                    <Ionicons name="receipt-outline" size={32} color={COLORS.textMuted} />
                  </View>
                  <Text style={styles.emptyTextPremium}>{t('finances.empty.noTransactions', 'Sin movimientos')}</Text>
                  <Text style={styles.emptySubtextPremium}>{t('finances.empty.addFirst', 'Registra tu primer ingreso o gasto')}</Text>
                </View>
              ) : (
                <View style={styles.transactionsListPremium}>
                  {transactions.slice(0, 5).map((trans, index) => (
                    <View key={trans.id} style={[styles.transactionItemPremium, index === 0 && styles.transactionItemFirst]}>
                      <View style={[
                        styles.transactionIconPremium, 
                        { backgroundColor: trans.type === 'income' ? COLORS.greenBg : COLORS.redBg }
                      ]}>
                        <Ionicons 
                          name={trans.type === 'income' ? 'arrow-up' : 'arrow-down'} 
                          size={16} 
                          color={trans.type === 'income' ? COLORS.green : COLORS.red} 
                        />
                      </View>
                      <View style={styles.transactionInfoPremium}>
                        <Text style={styles.transactionCategoryPremium}>{trans.category}</Text>
                        <Text style={styles.transactionDatePremium}>
                          {trans.description || new Date(trans.date).toLocaleDateString('es-HN', { day: '2-digit', month: 'short' })}
                        </Text>
                      </View>
                      <Text style={[
                        styles.transactionAmountPremium, 
                        { color: trans.type === 'income' ? COLORS.green : COLORS.red }
                      ]}>
                        {trans.type === 'income' ? '+' : '-'}{formatCurrency(trans.amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* ============================================ */}
            {/* GAMIFICATION SECTION */}
            {/* ============================================ */}
            {dashboard?.stats && (
              <View style={styles.sectionPremium}>
                <View style={styles.sectionHeaderPremium}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="trophy" size={20} color={COLORS.yellow} />
                    <Text style={styles.sectionTitlePremium}>{t('finances.sections.myProgress', 'Mi Progreso')}</Text>
                  </View>
                </View>
                
                <View style={styles.gamificationCard}>
                  <View style={styles.levelSection}>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelNumber}>{dashboard.stats.level || 1}</Text>
                    </View>
                    <View style={styles.levelInfo}>
                      <Text style={styles.levelTitle}>{getLevelInfo(dashboard.stats.level || 1).name}</Text>
                      <View style={styles.xpBarContainer}>
                        <View style={styles.xpBar}>
                          <View style={[styles.xpBarFill, { width: `${((dashboard.stats.xp || 0) % 100)}%` }]} />
                        </View>
                        <Text style={styles.xpText}>{dashboard.stats.xp || 0} XP</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.streakSection}>
                    <View style={styles.streakItem}>
                      <Ionicons name="flame" size={24} color={COLORS.yellow} />
                      <Text style={styles.streakValue}>{dashboard.stats.current_streak || 0}</Text>
                      <Text style={styles.streakLabel}>{t('finances.gamification.streak', 'Racha')}</Text>
                    </View>
                    <View style={styles.streakDivider} />
                    <View style={styles.streakItem}>
                      <Ionicons name="star" size={24} color={COLORS.purple} />
                      <Text style={styles.streakValue}>{dashboard.achievements?.length || 0}</Text>
                      <Text style={styles.streakLabel}>{t('finances.gamification.achievements', 'Logros')}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
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

            {/* HISTÓRICO DE FACTURAS PAGADAS */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>✅ {t("finances.sections.paidInvoices", "Facturas Pagadas")}</Text>
            </View>
            {paidInvoices.length === 0 ? (
              <View style={styles.emptyStateSmall}>
                <Text style={styles.emptyTextSmall}>{t("finances.empty.noPaidInvoices", "No hay facturas pagadas aún")}</Text>
              </View>
            ) : paidInvoices.slice(0, 5).map(invoice => (
              <TouchableOpacity key={invoice.id} style={styles.invoiceCard} onPress={() => { setSelectedInvoice(invoice); setShowInvoiceDetailModal(true); }}>
                <View style={[styles.invoiceUrgencyBar, { backgroundColor: COLORS.green }]} />
                <View style={styles.invoiceContent}>
                  <View style={styles.invoiceHeader}>
                    <Text style={styles.invoiceVendor}>{invoice.vendor_name}</Text>
                    <Text style={[styles.invoiceAmount, { color: COLORS.green }]}>{formatCurrency(invoice.amount)}</Text>
                  </View>
                  <Text style={styles.invoiceDue}>Pagado: {invoice.payment_date ? new Date(invoice.payment_date).toLocaleDateString("es-HN") : "-"}</Text>
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
  

        {/* ============================================ */}
        {/* TAB: SUBSCRIPTIONS (PAGOS RECURRENTES) */}
        {/* ============================================ */}
        {activeTab === 'subscriptions' && (
          <>
            {/* Summary Card */}
            {subscriptionsSummary && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>{t('finances.subscriptions.monthlyTotal', 'Total Mensual')}</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.red }]}>{formatCurrency(subscriptionsSummary.total_monthly)}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>{t('finances.subscriptions.active', 'Activas')}</Text>
                    <Text style={styles.summaryValue}>{subscriptionsSummary.active_count}</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔄 {t('finances.subscriptions.title', 'Mis Suscripciones')}</Text>
              <TouchableOpacity onPress={() => setShowSubscriptionModal(true)}>
                <Text style={styles.sectionAction}>+ {t('finances.new', 'Nuevo')}</Text>
              </TouchableOpacity>
            </View>

            {subscriptions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔄</Text>
                <Text style={styles.emptyText}>{t('finances.subscriptions.empty', 'No tienes suscripciones')}</Text>
                <Text style={styles.emptySubtext}>{t('finances.subscriptions.emptyHint', 'Registra tus pagos recurrentes como Netflix, Spotify, gym, etc.')}</Text>
                <TouchableOpacity style={styles.emptyButton} onPress={() => setShowSubscriptionModal(true)}>
                  <Text style={styles.emptyButtonText}>{t('finances.subscriptions.add', 'Agregar Suscripción')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              subscriptions.map(sub => (
                <TouchableOpacity 
                  key={sub.id} 
                  style={styles.subscriptionCard}
                  onPress={() => { setSelectedSubscription(sub); setShowSubscriptionDetailModal(true); }}
                >
                  <View style={styles.subscriptionHeader}>
                    <Text style={styles.subscriptionIcon}>{sub.icon || '💳'}</Text>
                    <View style={styles.subscriptionInfo}>
                      <Text style={styles.subscriptionName}>{sub.name}</Text>
                      <Text style={styles.subscriptionFrequency}>{getFrequencyText(sub.frequency)} • {sub.category}</Text>
                    </View>
                    <View style={styles.subscriptionAmountContainer}>
                      <Text style={styles.subscriptionAmount}>{formatCurrency(sub.amount)}</Text>
                      {sub.urgency && sub.urgency !== 'ok' && (
                        <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(sub.urgency) + '20' }]}>
                          <Text style={[styles.urgencyBadgeText, { color: getUrgencyColor(sub.urgency) }]}>
                            {sub.days_until_billing <= 0 ? t('finances.subscriptions.due', 'Vencido') : `${sub.days_until_billing}d`}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.subscriptionFooter}>
                    <Text style={styles.subscriptionNextDate}>
                      {t('finances.subscriptions.nextCharge', 'Próximo cobro')}: {new Date(sub.next_billing_date).toLocaleDateString()}
                    </Text>
                    {sub.urgency === 'urgent' || sub.urgency === 'overdue' ? (
                      <TouchableOpacity 
                        style={[styles.quickPayButton, { backgroundColor: getUrgencyColor(sub.urgency) }]}
                        onPress={() => handleMarkSubscriptionPaid(sub)}
                      >
                        <Text style={styles.quickPayButtonText}>{t('finances.subscriptions.pay', 'Pagar')}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {/* ============================================ */}
        {/* TAB: RECEIVABLES (CUENTAS POR COBRAR) */}
        {/* ============================================ */}
        {activeTab === 'receivables' && (
          <>
            {/* Summary Card */}
            {receivablesSummary && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>{t('finances.receivables.totalPending', 'Por Cobrar')}</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.green }]}>{formatCurrency(receivablesSummary.total_pending)}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>{t('finances.receivables.overdue', 'Vencidas')}</Text>
                    <Text style={[styles.summaryValue, { color: receivablesSummary.overdue_count > 0 ? COLORS.red : COLORS.textSecondary }]}>
                      {receivablesSummary.overdue_count}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>💵 {t('finances.receivables.title', 'Cuentas por Cobrar')}</Text>
              <TouchableOpacity onPress={() => setShowReceivableModal(true)}>
                <Text style={styles.sectionAction}>+ {t('finances.new', 'Nuevo')}</Text>
              </TouchableOpacity>
            </View>

            {receivables.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>💵</Text>
                <Text style={styles.emptyText}>{t('finances.receivables.empty', 'No tienes cuentas por cobrar')}</Text>
                <Text style={styles.emptySubtext}>{t('finances.receivables.emptyHint', 'Registra el dinero que te deben clientes o amigos')}</Text>
                <TouchableOpacity style={styles.emptyButton} onPress={() => setShowReceivableModal(true)}>
                  <Text style={styles.emptyButtonText}>{t('finances.receivables.add', 'Agregar Cuenta')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              receivables.map(recv => (
                <TouchableOpacity 
                  key={recv.id} 
                  style={styles.receivableCard}
                  onPress={() => { setSelectedReceivable(recv); setShowReceivableDetailModal(true); }}
                >
                  <View style={styles.receivableHeader}>
                    <View style={[styles.receivableAvatar, { backgroundColor: getUrgencyColor(recv.urgency) + '20' }]}>
                      <Text style={styles.receivableAvatarText}>{recv.client_name?.charAt(0)?.toUpperCase() || '?'}</Text>
                    </View>
                    <View style={styles.receivableInfo}>
                      <Text style={styles.receivableClient}>{recv.client_name}</Text>
                      <Text style={styles.receivableDescription} numberOfLines={1}>{recv.description}</Text>
                    </View>
                    <View style={styles.receivableAmountContainer}>
                      <Text style={styles.receivableAmount}>{formatCurrency(recv.remaining_amount || recv.amount)}</Text>
                      {recv.amount_paid > 0 && (
                        <Text style={styles.receivablePartial}>{t('finances.receivables.partial', 'Parcial')}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.receivableFooter}>
                    {recv.due_date && (
                      <Text style={[styles.receivableDueDate, { color: getUrgencyColor(recv.urgency) }]}>
                        {recv.urgency === 'overdue' 
                          ? t('finances.receivables.overdueDays', { days: Math.abs(recv.days_until_due) })
                          : recv.days_until_due !== null 
                            ? t('finances.receivables.dueDays', { days: recv.days_until_due })
                            : new Date(recv.due_date).toLocaleDateString()
                        }
                      </Text>
                    )}
                    <TouchableOpacity 
                      style={[styles.quickCollectButton, { backgroundColor: COLORS.green }]}
                      onPress={() => handleCollectReceivable(recv)}
                    >
                      <Text style={styles.quickCollectButtonText}>{t('finances.receivables.collect', 'Cobrar')}</Text>
                    </TouchableOpacity>
                  </View>
                  {recv.amount_paid > 0 && (
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${(recv.amount_paid / recv.amount) * 100}%`, backgroundColor: COLORS.green }]} />
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}

            {/* HISTÓRICO DE COBROS REALIZADOS */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>✅ {t("finances.sections.collectedReceivables", "Cobros Realizados")}</Text>
            </View>
            {collectedReceivables.length === 0 ? (
              <View style={styles.emptyStateSmall}>
                <Text style={styles.emptyTextSmall}>{t("finances.empty.noCollectedReceivables", "No hay cobros realizados aún")}</Text>
              </View>
            ) : collectedReceivables.slice(0, 5).map(recv => (
              <TouchableOpacity key={recv.id} style={styles.receivableCard} onPress={() => { setSelectedReceivable(recv); setShowReceivableDetailModal(true); }}>
                <View style={styles.receivableHeader}>
                  <View style={[styles.receivableAvatar, { backgroundColor: COLORS.green + "20" }]}>
                    <Text style={styles.receivableAvatarText}>{recv.client_name?.charAt(0)?.toUpperCase() || "?"}</Text>
                  </View>
                  <View style={styles.receivableInfo}>
                    <Text style={styles.receivableClient}>{recv.client_name}</Text>
                    <Text style={styles.receivableDescription} numberOfLines={1}>{recv.description}</Text>
                  </View>
                  <View style={styles.receivableAmountContainer}>
                    <Text style={[styles.receivableAmount, { color: COLORS.green }]}>{formatCurrency(recv.amount)}</Text>
                    <Text style={styles.receivablePartial}>✓ Cobrado</Text>
                  </View>
                </View>
                <Text style={styles.receivableDueDate}>Cobrado: {recv.paid_at ? new Date(recv.paid_at).toLocaleDateString("es-HN") : "-"}</Text>
              </TouchableOpacity>
            ))}
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
        <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar" size={20} color={COLORS.teal} />
          <Text style={[styles.datePickerText, !invoiceForm.due_date && { color: COLORS.textMuted }]}>
            {invoiceForm.due_date ? new Date(invoiceForm.due_date).toLocaleDateString('es-HN') : t('finances.form.dueDate', 'Fecha de vencimiento')}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={invoiceForm.due_date ? new Date(invoiceForm.due_date) : new Date()}
            mode="date"
            display="spinner"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate && event.type !== 'dismissed') {
                setInvoiceForm({ ...invoiceForm, due_date: selectedDate.toISOString().split('T')[0] });
              }
            }}
          />
        )}
        {/* Photo Section */}
        <View style={styles.photoSection}>
          <Text style={styles.photoLabel}>{t("finances.form.attachPhoto", "Adjuntar foto de factura")}</Text>
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoButton} onPress={takeInvoicePhoto}>
              <Ionicons name="camera" size={24} color={COLORS.teal} />
              <Text style={styles.photoButtonText}>{t("finances.form.takePhoto", "Cámara")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={pickInvoiceImage}>
              <Ionicons name="images" size={24} color={COLORS.purple} />
              <Text style={styles.photoButtonText}>{t("finances.form.gallery", "Galería")}</Text>
            </TouchableOpacity>
          </View>
          {invoiceForm.image_url && (
            <View style={styles.photoPreview}>
              <Image source={{ uri: invoiceForm.image_url }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removePhotoButton} onPress={() => setInvoiceForm({ ...invoiceForm, image_url: null })}>
                <Ionicons name="close-circle" size={24} color={COLORS.red} />
              </TouchableOpacity>
            </View>
          )}
        </View>
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
            <View style={[styles.invoiceDetailStatus, { backgroundColor: getUrgencyColor(selectedInvoice.urgency) + "20" }]}>
              <Text style={[styles.invoiceDetailStatusText, { color: getUrgencyColor(selectedInvoice.urgency) }]}>
                {selectedInvoice.status === "paid" ? "✅ Pagada" : getUrgencyText(selectedInvoice.urgency, selectedInvoice.days_until_due)}
              </Text>
            </View>
            <View style={styles.invoiceDetailRow}>
              <Text style={styles.invoiceDetailLabel}>{t("finances.invoiceDetail.amount")}:</Text>
              <Text style={styles.invoiceDetailValue}>{formatCurrency(selectedInvoice.amount)}</Text>
            </View>
            <View style={styles.invoiceDetailRow}>
              <Text style={styles.invoiceDetailLabel}>{t("finances.invoiceDetail.dueDate")}:</Text>
              <Text style={styles.invoiceDetailValue}>{selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString("es-HN") : "-"}</Text>
            </View>
            {selectedInvoice.category && (
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailLabel}>{t("finances.invoiceDetail.category", "Categoría")}:</Text>
                <Text style={styles.invoiceDetailValue}>{selectedInvoice.category}</Text>
              </View>
            )}
            {selectedInvoice.description && (
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailLabel}>{t("finances.invoiceDetail.description", "Descripción")}:</Text>
                <Text style={styles.invoiceDetailValue}>{selectedInvoice.description}</Text>
              </View>
            )}
            {selectedInvoice.payment_date && (
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailLabel}>{t("finances.invoiceDetail.paymentDate", "Fecha de pago")}:</Text>
                <Text style={styles.invoiceDetailValue}>{new Date(selectedInvoice.payment_date).toLocaleDateString("es-HN")}</Text>
              </View>
            )}
            {selectedInvoice.image_url && (
              <View style={styles.invoiceImageContainer}>
                <Text style={styles.invoiceImageLabel}>{t("finances.invoiceDetail.attachedImage", "Imagen adjunta")}:</Text>
                <TouchableOpacity onPress={() => handleViewImage(selectedInvoice.image_url)}>
                  <Image source={{ uri: selectedInvoice.image_url }} style={styles.invoiceImagePreview} resizeMode="cover" />
                </TouchableOpacity>
                <View style={styles.imageActionButtons}>
                  <TouchableOpacity style={styles.imageActionButton} onPress={() => handleViewImage(selectedInvoice.image_url)}>
                    <Ionicons name="expand" size={18} color={COLORS.teal} />
                    <Text style={styles.imageActionButtonText}>{t("finances.invoiceDetail.viewFull", "Ver completa")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.imageActionButton, sharingImage && { opacity: 0.5 }]} 
                    onPress={() => handleShareImage(selectedInvoice.image_url)}
                    disabled={sharingImage}
                  >
                    {sharingImage ? (
                      <ActivityIndicator size="small" color={COLORS.teal} />
                    ) : (
                      <Ionicons name="share-outline" size={18} color={COLORS.teal} />
                    )}
                    <Text style={styles.imageActionButtonText}>
                      {sharingImage ? t("common.loading", "Cargando...") : t("finances.invoiceDetail.share", "Compartir")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {selectedInvoice.status !== "paid" && (
              <TouchableOpacity style={styles.payButton} onPress={handlePayInvoice}>
                <Text style={styles.payButtonText}>✅ {t("finances.invoiceDetail.markAsPaid")}</Text>
              </TouchableOpacity>
            )}
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
      {/* ============================================ */}
      {/* MODAL: CREATE SUBSCRIPTION */}
      {/* ============================================ */}
      <AppModal visible={showSubscriptionModal} onClose={() => setShowSubscriptionModal(false)}>
        <Text style={styles.modalTitle}>🔄 {t('finances.subscriptions.new', 'Nueva Suscripción')}</Text>
        
        <TextInput 
          style={styles.input} 
          placeholder={t('finances.subscriptions.name', 'Nombre (ej: Netflix, Spotify)')} 
          placeholderTextColor={COLORS.textMuted} 
          value={subscriptionForm.name} 
          onChangeText={(v) => setSubscriptionForm({ ...subscriptionForm, name: v })} 
        />
        
        <TextInput 
          style={styles.input} 
          placeholder={t('finances.subscriptions.amount', 'Monto')} 
          placeholderTextColor={COLORS.textMuted} 
          keyboardType="numeric"
          value={subscriptionForm.amount} 
          onChangeText={(v) => setSubscriptionForm({ ...subscriptionForm, amount: v })} 
        />

        <View style={styles.rowInputs}>
          <TextInput 
            style={[styles.input, { flex: 1, marginRight: 8 }]} 
            placeholder={t('finances.subscriptions.billingDay', 'Día de cobro')} 
            placeholderTextColor={COLORS.textMuted} 
            keyboardType="numeric"
            value={subscriptionForm.billing_day} 
            onChangeText={(v) => setSubscriptionForm({ ...subscriptionForm, billing_day: v })} 
          />
          <View style={[styles.input, { flex: 1, padding: 0 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.frequencySelector}>
              {['weekly', 'biweekly', 'monthly', 'yearly'].map(freq => (
                <TouchableOpacity 
                  key={freq}
                  style={[styles.frequencyChip, subscriptionForm.frequency === freq && styles.frequencyChipActive]}
                  onPress={() => setSubscriptionForm({ ...subscriptionForm, frequency: freq })}
                >
                  <Text style={[styles.frequencyChipText, subscriptionForm.frequency === freq && styles.frequencyChipTextActive]}>
                    {freq === 'weekly' ? 'Sem' : freq === 'biweekly' ? 'Quin' : freq === 'monthly' ? 'Mes' : 'Año'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.iconSelector}>
          {['💳', '📺', '🎵', '🎮', '📱', '💪', '🏠', '🚗', '☁️', '📦'].map(icon => (
            <TouchableOpacity 
              key={icon}
              style={[styles.iconChip, subscriptionForm.icon === icon && styles.iconChipActive]}
              onPress={() => setSubscriptionForm({ ...subscriptionForm, icon })}
            >
              <Text style={styles.iconChipText}>{icon}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput 
          style={styles.input} 
          placeholder={t('finances.subscriptions.notes', 'Notas (opcional)')} 
          placeholderTextColor={COLORS.textMuted} 
          value={subscriptionForm.notes} 
          onChangeText={(v) => setSubscriptionForm({ ...subscriptionForm, notes: v })} 
        />

        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowSubscriptionModal(false)}>
            <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancelar')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: COLORS.purple }]} onPress={handleCreateSubscription}>
            <Text style={styles.saveButtonText}>{t('common.save', 'Guardar')}</Text>
          </TouchableOpacity>
        </View>
      </AppModal>

      {/* ============================================ */}
      {/* MODAL: SUBSCRIPTION DETAIL */}
      {/* ============================================ */}
      <AppModal visible={showSubscriptionDetailModal} onClose={() => { setShowSubscriptionDetailModal(false); setSelectedSubscription(null); }}>
        {selectedSubscription && (
          <>
            <View style={styles.detailHeader}>
              <Text style={styles.detailIcon}>{selectedSubscription.icon || '💳'}</Text>
              <Text style={styles.detailTitle}>{selectedSubscription.name}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('finances.subscriptions.amount', 'Monto')}</Text>
              <Text style={styles.detailValue}>{formatCurrency(selectedSubscription.amount)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('finances.subscriptions.frequency', 'Frecuencia')}</Text>
              <Text style={styles.detailValue}>{getFrequencyText(selectedSubscription.frequency)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('finances.subscriptions.nextCharge', 'Próximo cobro')}</Text>
              <Text style={[styles.detailValue, { color: getUrgencyColor(selectedSubscription.urgency) }]}>
                {new Date(selectedSubscription.next_billing_date).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('finances.subscriptions.billingDay', 'Día de cobro')}</Text>
              <Text style={styles.detailValue}>{selectedSubscription.billing_day}</Text>
            </View>

            {selectedSubscription.notes && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('finances.subscriptions.notes', 'Notas')}</Text>
                <Text style={styles.detailValue}>{selectedSubscription.notes}</Text>
              </View>
            )}

            <View style={styles.detailActions}>
              <TouchableOpacity 
                style={[styles.detailActionButton, { backgroundColor: COLORS.green }]} 
                onPress={() => { setShowSubscriptionDetailModal(false); handleMarkSubscriptionPaid(selectedSubscription); }}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.detailActionText}>{t('finances.subscriptions.markPaid', 'Marcar Pagado')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.detailActionButton, { backgroundColor: COLORS.red }]} 
                onPress={() => handleDeleteSubscription(selectedSubscription)}
              >
                <Ionicons name="trash" size={20} color="#FFF" />
                <Text style={styles.detailActionText}>{t('common.delete', 'Eliminar')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </AppModal>

      {/* ============================================ */}
      {/* MODAL: CREATE RECEIVABLE */}
      {/* ============================================ */}
      <AppModal visible={showReceivableModal} onClose={() => setShowReceivableModal(false)}>
        <Text style={styles.modalTitle}>💵 {t('finances.receivables.new', 'Nueva Cuenta por Cobrar')}</Text>
        
        <TextInput 
          style={styles.input} 
          placeholder={t('finances.receivables.clientName', 'Nombre del cliente')} 
          placeholderTextColor={COLORS.textMuted} 
          value={receivableForm.client_name} 
          onChangeText={(v) => setReceivableForm({ ...receivableForm, client_name: v })} 
        />

        <TextInput 
          style={styles.input} 
          placeholder={t('finances.receivables.description', 'Descripción del servicio/producto')} 
          placeholderTextColor={COLORS.textMuted} 
          value={receivableForm.description} 
          onChangeText={(v) => setReceivableForm({ ...receivableForm, description: v })} 
        />
        
        <TextInput 
          style={styles.input} 
          placeholder={t('finances.receivables.amount', 'Monto a cobrar')} 
          placeholderTextColor={COLORS.textMuted} 
          keyboardType="numeric"
          value={receivableForm.amount} 
          onChangeText={(v) => setReceivableForm({ ...receivableForm, amount: v })} 
        />

        <View style={styles.rowInputs}>
          <TextInput 
            style={[styles.input, { flex: 1, marginRight: 8 }]} 
            placeholder={t('finances.receivables.phone', 'Teléfono (opcional)')} 
            placeholderTextColor={COLORS.textMuted} 
            keyboardType="phone-pad"
            value={receivableForm.client_phone} 
            onChangeText={(v) => setReceivableForm({ ...receivableForm, client_phone: v })} 
          />
<TouchableOpacity style={[styles.datePickerButton, { flex: 1 }]} onPress={() => setShowReceivableDatePicker(true)}><Ionicons name="calendar" size={20} color={COLORS.teal} /><Text style={[styles.datePickerText, !receivableForm.due_date && { color: COLORS.textMuted }]}>{receivableForm.due_date ? new Date(receivableForm.due_date).toLocaleDateString("es-HN") : t("finances.receivables.dueDate", "Fecha límite")}</Text></TouchableOpacity>
        </View>
        {showReceivableDatePicker && (
          <DateTimePicker
            value={receivableForm.due_date ? new Date(receivableForm.due_date) : new Date()}
            mode="date"
            display="spinner"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowReceivableDatePicker(false);
              if (selectedDate && event.type !== "dismissed") {
                setReceivableForm({ ...receivableForm, due_date: selectedDate.toISOString().split("T")[0] });
              }
            }}
          />
        )}

        <TextInput 
          style={styles.input} 
          placeholder={t('finances.receivables.notes', 'Notas (opcional)')} 
          placeholderTextColor={COLORS.textMuted} 
          value={receivableForm.notes} 
          onChangeText={(v) => setReceivableForm({ ...receivableForm, notes: v })} 
        />

        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowReceivableModal(false)}>
            <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancelar')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: COLORS.green }]} onPress={handleCreateReceivable}>
            <Text style={styles.saveButtonText}>{t('common.save', 'Guardar')}</Text>
          </TouchableOpacity>
        </View>
      </AppModal>

      {/* ============================================ */}
      {/* MODAL: RECEIVABLE DETAIL */}
      {/* ============================================ */}
      <AppModal visible={showReceivableDetailModal} onClose={() => { setShowReceivableDetailModal(false); setSelectedReceivable(null); setPaymentAmount(''); }}>
        {selectedReceivable && (
          <>
            <View style={styles.detailHeader}>
              <View style={[styles.receivableAvatarLarge, { backgroundColor: getUrgencyColor(selectedReceivable.urgency) + '20' }]}>
                <Text style={styles.receivableAvatarTextLarge}>{selectedReceivable.client_name?.charAt(0)?.toUpperCase() || '?'}</Text>
              </View>
              <Text style={styles.detailTitle}>{selectedReceivable.client_name}</Text>
              <Text style={styles.detailSubtitle}>{selectedReceivable.description}</Text>
            </View>

            <View style={styles.receivableAmountBox}>
              <Text style={styles.receivableAmountLabel}>{t('finances.receivables.remaining', 'Por cobrar')}</Text>
              <Text style={styles.receivableAmountValue}>{formatCurrency(selectedReceivable.remaining_amount || (selectedReceivable.amount - (selectedReceivable.amount_paid || 0)))}</Text>
              {selectedReceivable.amount_paid > 0 && (
                <Text style={styles.receivableAmountPaid}>{t('finances.receivables.paid', 'Abonado')}: {formatCurrency(selectedReceivable.amount_paid)}</Text>
              )}
            </View>

            {selectedReceivable.amount_paid > 0 && (
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${(selectedReceivable.amount_paid / selectedReceivable.amount) * 100}%`, backgroundColor: COLORS.green }]} />
              </View>
            )}

            {selectedReceivable.due_date && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('finances.receivables.dueDate', 'Fecha límite')}</Text>
                <Text style={[styles.detailValue, { color: getUrgencyColor(selectedReceivable.urgency) }]}>
                  {new Date(selectedReceivable.due_date).toLocaleDateString()}
                </Text>
              </View>
            )}

            {selectedReceivable.client_phone && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('finances.receivables.phone', 'Teléfono')}</Text>
                <Text style={styles.detailValue}>{selectedReceivable.client_phone}</Text>
              </View>
            )}

            {/* Partial Payment Input */}
            <View style={styles.partialPaymentSection}>
              <Text style={styles.partialPaymentTitle}>{t('finances.receivables.addPayment', 'Registrar Abono')}</Text>
              <View style={styles.partialPaymentRow}>
                <TextInput 
                  style={[styles.input, { flex: 1, marginRight: 8, marginBottom: 0 }]} 
                  placeholder={t('finances.receivables.paymentAmount', 'Monto del abono')} 
                  placeholderTextColor={COLORS.textMuted} 
                  keyboardType="numeric"
                  value={paymentAmount} 
                  onChangeText={setPaymentAmount} 
                />
                <TouchableOpacity 
                  style={[styles.partialPaymentButton, { backgroundColor: COLORS.teal }]} 
                  onPress={() => handleAddPartialPayment(selectedReceivable)}
                >
                  <Ionicons name="add" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.detailActions}>
              <TouchableOpacity 
                style={[styles.detailActionButton, { backgroundColor: COLORS.green, flex: 1 }]} 
                onPress={() => handleCollectReceivable(selectedReceivable)}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.detailActionText}>{t('finances.receivables.collectFull', 'Cobrar Todo')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.detailActionButton, { backgroundColor: COLORS.red }]} 
                onPress={() => handleDeleteReceivable(selectedReceivable)}
              >
                <Ionicons name="trash" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </AppModal>

      {/* ============================================ */}
      {/* MODAL: BUDGET ASSISTANT */}
      {/* ============================================ */}
      <AppModal visible={showAssistantModal} onClose={() => setShowAssistantModal(false)}>
        <Text style={styles.modalTitle}>🧭 {t('finances.assistant.title', 'Asistente de Presupuesto')}</Text>
        
        {budgetAssistant ? (
          <>
            <View style={styles.assistantIncomeBox}>
              <Text style={styles.assistantLabel}>{t('finances.assistant.yourIncome', 'Tu ingreso mensual')}</Text>
              <Text style={styles.assistantIncome}>{formatCurrency(budgetAssistant.income)}</Text>
            </View>

            <View style={styles.assistantHealthBox}>
              <Text style={styles.assistantHealthLabel}>{t('finances.assistant.healthScore', 'Salud Financiera')}</Text>
              <View style={styles.assistantHealthBar}>
                <View style={[styles.assistantHealthFill, { width: `${budgetAssistant.health_score || 0}%`, backgroundColor: budgetAssistant.health_score >= 60 ? COLORS.green : budgetAssistant.health_score >= 30 ? COLORS.yellow : COLORS.red }]} />
              </View>
              <Text style={styles.assistantHealthScore}>{budgetAssistant.health_score || 0}%</Text>
            </View>

            <Text style={styles.assistantRecommendation}>{budgetAssistant.recommendation}</Text>

            <Text style={styles.assistantRulesTitle}>{t('finances.assistant.chooseRule', 'Elige una regla de presupuesto:')}</Text>
            
            {Object.entries(budgetAssistant.rules || {}).map(([key, rule]) => (
              <TouchableOpacity 
                key={key} 
                style={styles.ruleCard}
                onPress={() => handleApplyBudgetRule(key)}
              >
                <Text style={styles.ruleName}>{rule.name}</Text>
                <Text style={styles.ruleDescription}>{rule.description}</Text>
                <View style={styles.ruleDistribution}>
                  {Object.entries(rule.distribution || {}).map(([cat, data]) => (
                    <View key={cat} style={styles.ruleItem}>
                      <Text style={styles.rulePercent}>{data.percent}%</Text>
                      <Text style={styles.ruleCategory}>{cat}</Text>
                      <Text style={styles.ruleAmount}>{formatCurrency(data.amount)}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <View style={styles.assistantInputSection}>
            <Text style={styles.assistantInputLabel}>{t('finances.assistant.enterIncome', 'Ingresa tu ingreso mensual para recibir recomendaciones')}</Text>
            <TextInput 
              style={styles.input} 
              placeholder={t('finances.assistant.monthlyIncome', 'Ingreso mensual')} 
              placeholderTextColor={COLORS.textMuted} 
              keyboardType="numeric"
              value={incomeInput} 
              onChangeText={setIncomeInput} 
            />
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: COLORS.teal, marginTop: 16 }]} 
              onPress={() => loadBudgetAssistant(parseFloat(incomeInput))}
            >
              <Text style={styles.saveButtonText}>{t('finances.assistant.analyze', 'Analizar')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </AppModal>

      {/* ============================================ */}
      {/* MODAL: REPORTS */}
      {/* ============================================ */}
      <AppModal visible={showReportsModal} onClose={() => setShowReportsModal(false)}>
        <Text style={styles.modalTitle}>📊 {t('finances.reports.title', 'Reportes Financieros')}</Text>
        
        {monthComparison && (
          <View style={styles.reportSection}>
            <Text style={styles.reportSectionTitle}>{t('finances.reports.comparison', 'Comparación Mensual')}</Text>
            <View style={styles.comparisonCards}>
              <View style={styles.comparisonCard}>
                <Text style={styles.comparisonMonth}>{monthComparison.current_month?.name}</Text>
                <Text style={[styles.comparisonValue, { color: COLORS.green }]}>{formatCurrency(monthComparison.current_month?.income)}</Text>
                <Text style={[styles.comparisonValue, { color: COLORS.red }]}>{formatCurrency(monthComparison.current_month?.expenses)}</Text>
              </View>
              <View style={styles.comparisonVs}>
                <Text style={styles.comparisonVsText}>vs</Text>
              </View>
              <View style={styles.comparisonCard}>
                <Text style={styles.comparisonMonth}>{monthComparison.previous_month?.name}</Text>
                <Text style={[styles.comparisonValue, { color: COLORS.green }]}>{formatCurrency(monthComparison.previous_month?.income)}</Text>
                <Text style={[styles.comparisonValue, { color: COLORS.red }]}>{formatCurrency(monthComparison.previous_month?.expenses)}</Text>
              </View>
            </View>
            
            {monthComparison.insights?.map((insight, idx) => (
              <View key={idx} style={[styles.insightBadge, { backgroundColor: insight.type === 'success' ? COLORS.greenBg : insight.type === 'warning' ? COLORS.yellow + '20' : COLORS.redBg }]}>
                <Text style={[styles.insightText, { color: insight.type === 'success' ? COLORS.green : insight.type === 'warning' ? COLORS.yellow : COLORS.red }]}>
                  {insight.message}
                </Text>
              </View>
            ))}
          </View>
        )}

        {reportByCategory && reportByCategory.categories?.length > 0 && (
          <View style={styles.reportSection}>
            <Text style={styles.reportSectionTitle}>{t('finances.reports.byCategory', 'Gastos por Categoría')}</Text>
            {reportByCategory.categories.slice(0, 5).map((cat, idx) => (
              <View key={idx} style={styles.categoryReportRow}>
                <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                <Text style={styles.categoryReportName}>{cat.name}</Text>
                <Text style={styles.categoryReportPercent}>{cat.percent}%</Text>
                <Text style={styles.categoryReportAmount}>{formatCurrency(cat.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {reportSummary && reportSummary.months?.length > 0 && (
          <View style={styles.reportSection}>
            <Text style={styles.reportSectionTitle}>{t('finances.reports.trend', 'Tendencia (6 meses)')}</Text>
            <View style={styles.trendChart}>
              {reportSummary.months.map((month, idx) => (
                <View key={idx} style={styles.trendBar}>
                  <View style={[styles.trendBarFill, { height: `${Math.min(100, (month.expenses / (reportSummary.totals?.expenses / reportSummary.months.length || 1)) * 50)}%`, backgroundColor: COLORS.red }]} />
                  <Text style={styles.trendBarLabel}>{month.month}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.cancelButton} onPress={() => setShowReportsModal(false)}>
          <Text style={styles.cancelButtonText}>{t('common.close', 'Cerrar')}</Text>
        </TouchableOpacity>
      </AppModal>

      {/* ============================================ */}
      {/* MODAL: GOAL PROJECTION */}
      {/* ============================================ */}
      <AppModal visible={showProjectionModal} onClose={() => { setShowProjectionModal(false); setGoalProjection(null); setSelectedGoal(null); }}>
        <Text style={styles.modalTitle}>🎯 {t('finances.goals.projection', 'Proyección de Meta')}</Text>
        
        {goalProjection && selectedGoal && (
          <>
            <View style={styles.projectionHeader}>
              <Text style={styles.projectionGoalName}>{selectedGoal.name}</Text>
              <Text style={styles.projectionProgress}>{goalProjection.progress_percent}% {t('finances.goals.completed', 'completado')}</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${goalProjection.progress_percent}%`, backgroundColor: COLORS.teal }]} />
              </View>
            </View>

            <View style={styles.projectionStats}>
              <View style={styles.projectionStat}>
                <Text style={styles.projectionStatLabel}>{t('finances.goals.remaining', 'Restante')}</Text>
                <Text style={styles.projectionStatValue}>{formatCurrency(goalProjection.remaining_amount)}</Text>
              </View>
              <View style={styles.projectionStat}>
                <Text style={styles.projectionStatLabel}>{t('finances.goals.avgMonthly', 'Ahorro promedio')}</Text>
                <Text style={styles.projectionStatValue}>{formatCurrency(goalProjection.current_avg_monthly)}/mes</Text>
              </View>
            </View>

            {goalProjection.projections?.length > 0 && (
              <>
                <Text style={styles.projectionTitle}>{t('finances.goals.scenarios', 'Escenarios')}</Text>
                {goalProjection.projections.map((proj, idx) => (
                  <View key={idx} style={styles.scenarioCard}>
                    <Text style={styles.scenarioName}>{proj.scenario}</Text>
                    <Text style={styles.scenarioDetails}>
                      {formatCurrency(proj.monthly_amount)}/mes → {proj.months_needed} {t('finances.goals.months', 'meses')}
                    </Text>
                    <Text style={styles.scenarioDate}>{t('finances.goals.reachBy', 'Llegarías')}: {new Date(proj.target_date).toLocaleDateString()}</Text>
                  </View>
                ))}
              </>
            )}

            {goalProjection.suggestions?.length > 0 && (
              <View style={styles.suggestionsBox}>
                {goalProjection.suggestions.map((sug, idx) => (
                  <Text key={idx} style={styles.suggestionText}>💡 {sug}</Text>
                ))}
              </View>
            )}
          </>
        )}

        <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowProjectionModal(false); setGoalProjection(null); }}>
          <Text style={styles.cancelButtonText}>{t('common.close', 'Cerrar')}</Text>
        </TouchableOpacity>
      </AppModal>

      {/* Image Full View Modal */}
      <Modal visible={showImageModal} transparent={true} animationType="fade" onRequestClose={() => setShowImageModal(false)}>
        <View style={styles.imageModalContainer}>
          <TouchableOpacity style={styles.imageModalClose} onPress={() => setShowImageModal(false)}>
            <Ionicons name="close-circle" size={36} color={COLORS.white} />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.imageModalFull} resizeMode="contain" />
          )}
          <View style={styles.imageModalActions}>
            <TouchableOpacity 
              style={[styles.imageModalButton, sharingImage && { opacity: 0.5 }]} 
              onPress={() => { handleShareImage(selectedImage); }}
              disabled={sharingImage}
            >
              {sharingImage ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="share-outline" size={24} color={COLORS.white} />
              )}
              <Text style={styles.imageModalButtonText}>
                {sharingImage ? t("common.loading", "Cargando...") : t("finances.invoiceDetail.share", "Compartir")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  emptyStateSmall: {
    backgroundColor: COLORS.card,
    borderRadius: scale(12),
    padding: scale(16),
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: scale(12),
  },
  emptyTextSmall: {
    color: COLORS.textMuted,
    fontSize: scale(14),
    textAlign: "center",
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
  // ============================================
  // NEW STYLES - TAB SWITCHER SCROLLABLE
  // ============================================
  tabSwitcherContent: {
    paddingHorizontal: scale(4),
    gap: scale(8),
  },
// ============================================
  // HERO CARD - PREMIUM
  // ============================================
  heroCard: {
    marginBottom: scale(20),
    borderRadius: scale(24),
    overflow: 'hidden',
    position: 'relative',
  },
  heroCardInner: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(24),
    padding: scale(20),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  heroMonthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(93, 222, 216, 0.1)',
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(20),
    gap: scale(6),
  },
  heroMonthText: {
    fontSize: scale(12),
    color: COLORS.teal,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  heroSettingsButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBalanceSection: {
    alignItems: 'center',
    marginBottom: scale(24),
  },
  heroBalanceLabel: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginBottom: scale(4),
  },
  heroBalanceAmount: {
    fontSize: scale(42),
    fontWeight: '700',
    letterSpacing: -1,
  },
  healthIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(12),
    gap: scale(10),
  },
  healthBar: {
    width: scale(100),
    height: scale(4),
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(2),
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    borderRadius: scale(2),
  },
  healthLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: scale(16),
    padding: scale(16),
  },
  heroStatCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  heroStatIconWrapper: {},
  heroStatIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatInfo: {
    flex: 1,
  },
  heroStatLabel: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    marginBottom: scale(2),
  },
  heroStatValue: {
    fontSize: scale(18),
    fontWeight: '700',
  },
  heroStatDivider: {
    width: 1,
    height: scale(40),
    backgroundColor: COLORS.cardBorder,
    marginHorizontal: scale(16),
  },
  heroGlow: {
    position: 'absolute',
    top: -50,
    left: '50%',
    marginLeft: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.tealGlow,
    opacity: 0.15,
  },

  // ============================================
  // QUICK ACTIONS - PREMIUM
  // ============================================
  quickActionsContainer: {
    marginBottom: scale(20),
  },
  quickActionsScroll: {
    paddingHorizontal: scale(4),
    gap: scale(12),
  },
  quickActionPremium: {
    alignItems: 'center',
    width: scale(72),
    position: 'relative',
  },
  quickActionIconPremium: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: scale(8),
  },
  quickActionLabelPremium: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  newBadge: {
    position: 'absolute',
    top: -4,
    right: 0,
    backgroundColor: COLORS.purple,
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(6),
  },
  newBadgeText: {
    fontSize: scale(8),
    fontWeight: '700',
    color: '#FFF',
  },

  // ============================================
  // ALERTS SECTION
  // ============================================
  alertsSection: {
    marginBottom: scale(20),
    gap: scale(10),
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: scale(14),
    padding: scale(14),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  alertIconBox: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  alertSubtitle: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    marginTop: scale(2),
  },

  // ============================================
  // SECTIONS - PREMIUM
  // ============================================
  sectionPremium: {
    marginBottom: scale(24),
  },
  sectionHeaderPremium: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(14),
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  sectionTitlePremium: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionAddButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    backgroundColor: 'rgba(93, 222, 216, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionCount: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    backgroundColor: COLORS.card,
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(10),
  },

  // ============================================
  // TIPS - PREMIUM
  // ============================================
  tipsScrollPremium: {
    paddingRight: scale(16),
    gap: scale(12),
  },
  tipCardPremium: {
    width: scale(140),
    backgroundColor: COLORS.card,
    borderRadius: scale(16),
    padding: scale(14),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    position: 'relative',
  },
  tipCardPremiumPro: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  proBadge: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(6),
    gap: scale(3),
  },
  proBadgeText: {
    fontSize: scale(8),
    fontWeight: '700',
    color: COLORS.yellow,
  },
  tipIconPremium: {
    fontSize: scale(28),
    marginBottom: scale(8),
  },
  tipTitlePremium: {
    fontSize: scale(12),
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: scale(16),
    marginBottom: scale(8),
  },
  tipArrow: {
    alignSelf: 'flex-end',
  },

  // ============================================
  // GOALS - PREMIUM
  // ============================================
  goalsScrollPremium: {
    paddingRight: scale(16),
    gap: scale(12),
  },
  goalCardPremium: {
    width: scale(160),
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(18),
    padding: scale(16),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  goalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(12),
  },
  goalIconPremium: {
    fontSize: scale(32),
  },
  goalProgressCircle: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(93, 222, 216, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.teal,
  },
  goalProgressText: {
    fontSize: scale(10),
    fontWeight: '700',
    color: COLORS.teal,
  },
  goalNamePremium: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(10),
  },
  goalProgressBarPremium: {
    height: scale(6),
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(3),
    overflow: 'hidden',
    marginBottom: scale(10),
  },
  goalProgressFillPremium: {
    height: '100%',
    backgroundColor: COLORS.teal,
    borderRadius: scale(3),
  },
  goalAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: scale(8),
  },
  goalCurrentPremium: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  goalTargetPremium: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    marginLeft: scale(4),
  },
  goalActionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  goalActionHintText: {
    fontSize: scale(10),
    color: COLORS.teal,
  },

  // ============================================
  // TRANSACTIONS - PREMIUM
  // ============================================
  transactionsListPremium: {
    backgroundColor: COLORS.card,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
  },
  transactionItemPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(14),
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  transactionItemFirst: {
    borderTopWidth: 0,
  },
  transactionIconPremium: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  transactionInfoPremium: {
    flex: 1,
  },
  transactionCategoryPremium: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  transactionDatePremium: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    marginTop: scale(2),
  },
  transactionAmountPremium: {
    fontSize: scale(15),
    fontWeight: '700',
  },

  // ============================================
  // EMPTY STATES - PREMIUM
  // ============================================
  emptyStatePremium: {
    alignItems: 'center',
    paddingVertical: scale(32),
    paddingHorizontal: scale(24),
    backgroundColor: COLORS.card,
    borderRadius: scale(18),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  emptyIconBox: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(20),
    backgroundColor: COLORS.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  emptyTextPremium: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(6),
  },
  emptySubtextPremium: {
    fontSize: scale(13),
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: scale(20),
  },
  emptyButtonPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.teal,
    paddingHorizontal: scale(20),
    paddingVertical: scale(12),
    borderRadius: scale(12),
    gap: scale(6),
  },
  emptyButtonTextPremium: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.background,
  },

  // ============================================
  // GAMIFICATION - PREMIUM
  // ============================================
  gamificationCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(18),
    padding: scale(18),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  levelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(18),
    gap: scale(14),
  },
  levelBadge: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(16),
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 2,
    borderColor: COLORS.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: {
    fontSize: scale(24),
    fontWeight: '800',
    color: COLORS.yellow,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  xpBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  xpBar: {
    flex: 1,
    height: scale(6),
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(3),
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: COLORS.yellow,
    borderRadius: scale(3),
  },
  xpText: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  streakSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: scale(18),
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  streakItem: {
    alignItems: 'center',
    gap: scale(4),
  },
  streakValue: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  streakLabel: {
    fontSize: scale(11),
    color: COLORS.textMuted,
  },
  streakDivider: {
    width: 1,
    height: scale(40),
    backgroundColor: COLORS.cardBorder,
  },
  // ============================================
  // NEW STYLES - SUMMARY CARD
  // ============================================
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginBottom: scale(4),
  },
  summaryValue: {
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // ============================================
  // NEW STYLES - SUBSCRIPTIONS
  // ============================================
  subscriptionCard: {
    backgroundColor: COLORS.card,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionIcon: {
    fontSize: scale(32),
    marginRight: scale(12),
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionName: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  subscriptionFrequency: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  subscriptionAmountContainer: {
    alignItems: 'flex-end',
  },
  subscriptionAmount: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subscriptionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: scale(12),
    paddingTop: scale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  subscriptionNextDate: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  urgencyBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(8),
    marginTop: scale(4),
  },
  urgencyBadgeText: {
    fontSize: scale(10),
    fontWeight: '600',
  },
  quickPayButton: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(8),
  },
  quickPayButtonText: {
    color: '#FFF',
    fontSize: scale(12),
    fontWeight: '600',
  },

  // ============================================
  // NEW STYLES - RECEIVABLES
  // ============================================
  receivableCard: {
    backgroundColor: COLORS.card,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  receivableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receivableAvatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  receivableAvatarText: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  receivableAvatarLarge: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
  },
  receivableAvatarTextLarge: {
    fontSize: scale(28),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  receivableInfo: {
    flex: 1,
  },
  receivableClient: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  receivableDescription: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  receivableAmountContainer: {
    alignItems: 'flex-end',
  },
  receivableAmount: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.green,
  },
  receivablePartial: {
    fontSize: scale(10),
    color: COLORS.yellow,
    marginTop: scale(2),
  },
  receivableFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: scale(12),
  },
  receivableDueDate: {
    fontSize: scale(12),
  },
  quickCollectButton: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(8),
  },
  quickCollectButtonText: {
    color: '#FFF',
    fontSize: scale(12),
    fontWeight: '600',
  },
  receivableAmountBox: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    alignItems: 'center',
    marginVertical: scale(16),
  },
  receivableAmountLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  receivableAmountValue: {
    fontSize: scale(32),
    fontWeight: '700',
    color: COLORS.green,
    marginTop: scale(4),
  },
  receivableAmountPaid: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(8),
  },
  partialPaymentSection: {
    marginTop: scale(16),
    paddingTop: scale(16),
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  partialPaymentTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(12),
  },
  partialPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partialPaymentButton: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ============================================
  // NEW STYLES - FORM ELEMENTS
  // ============================================
  rowInputs: {
    flexDirection: 'row',
    marginBottom: scale(12),
  },
  frequencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    height: '100%',
  },
  frequencyChip: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(8),
    backgroundColor: COLORS.backgroundSecondary,
    marginRight: scale(6),
  },
  frequencyChipActive: {
    backgroundColor: COLORS.purple,
  },
  frequencyChipText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  frequencyChipTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  iconSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: scale(12),
    gap: scale(8),
  },
  iconChip: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipActive: {
    backgroundColor: COLORS.purple,
    borderWidth: 2,
    borderColor: COLORS.purpleLight,
  },
  iconChipText: {
    fontSize: scale(20),
  },

  // ============================================
  // NEW STYLES - DETAIL MODAL
  // ============================================
  detailHeader: {
    alignItems: 'center',
    marginBottom: scale(20),
  },
  detailIcon: {
    fontSize: scale(48),
    marginBottom: scale(8),
  },
  detailTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  detailSubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(4),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  detailLabel: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  detailActions: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: scale(20),
  },
  detailActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(14),
    borderRadius: scale(12),
    gap: scale(8),
  },
  detailActionText: {
    color: '#FFF',
    fontSize: scale(14),
    fontWeight: '600',
  },

  // ============================================
  // NEW STYLES - BUDGET ASSISTANT
  // ============================================
  assistantIncomeBox: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    alignItems: 'center',
    marginBottom: scale(16),
  },
  assistantLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  assistantIncome: {
    fontSize: scale(28),
    fontWeight: '700',
    color: COLORS.teal,
    marginTop: scale(4),
  },
  assistantHealthBox: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(16),
  },
  assistantHealthLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginBottom: scale(8),
  },
  assistantHealthBar: {
    height: scale(8),
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(4),
    overflow: 'hidden',
  },
  assistantHealthFill: {
    height: '100%',
    borderRadius: scale(4),
  },
  assistantHealthScore: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginTop: scale(8),
  },
  assistantRecommendation: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: scale(20),
    fontStyle: 'italic',
  },
  assistantRulesTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(12),
  },
  assistantInputSection: {
    alignItems: 'center',
  },
  assistantInputLabel: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: scale(16),
  },
  ruleCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  ruleName: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  ruleDescription: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(4),
    marginBottom: scale(12),
  },
  ruleDistribution: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  ruleItem: {
    alignItems: 'center',
  },
  rulePercent: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.teal,
  },
  ruleCategory: {
    fontSize: scale(10),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  ruleAmount: {
    fontSize: scale(12),
    color: COLORS.textPrimary,
    marginTop: scale(2),
  },

  // ============================================
  // NEW STYLES - REPORTS
  // ============================================
  reportSection: {
    marginBottom: scale(20),
  },
  reportSectionTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(12),
  },
  comparisonCards: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  comparisonCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(12),
    alignItems: 'center',
  },
  comparisonMonth: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginBottom: scale(8),
    textTransform: 'capitalize',
  },
  comparisonValue: {
    fontSize: scale(14),
    fontWeight: '600',
    marginTop: scale(2),
  },
  comparisonVs: {
    paddingHorizontal: scale(12),
  },
  comparisonVsText: {
    fontSize: scale(12),
    color: COLORS.textMuted,
  },
  insightBadge: {
    padding: scale(12),
    borderRadius: scale(8),
    marginTop: scale(12),
  },
  insightText: {
    fontSize: scale(12),
  },
  categoryReportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(8),
  },
  categoryDot: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    marginRight: scale(12),
  },
  categoryReportName: {
    flex: 1,
    fontSize: scale(14),
    color: COLORS.textPrimary,
  },
  categoryReportPercent: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginRight: scale(12),
    width: scale(40),
    textAlign: 'right',
  },
  categoryReportAmount: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    width: scale(80),
    textAlign: 'right',
  },
  trendChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: scale(100),
    paddingTop: scale(20),
  },
  trendBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: scale(2),
  },
  trendBarFill: {
    width: '80%',
    borderRadius: scale(4),
    minHeight: scale(4),
  },
  trendBarLabel: {
    fontSize: scale(10),
    color: COLORS.textMuted,
    marginTop: scale(4),
  },

  // ============================================
  // NEW STYLES - GOAL PROJECTION
  // ============================================
  projectionHeader: {
    alignItems: 'center',
    marginBottom: scale(20),
  },
  projectionGoalName: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  projectionProgress: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(4),
    marginBottom: scale(12),
  },
  projectionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: scale(20),
  },
  projectionStat: {
    alignItems: 'center',
  },
  projectionStatLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  projectionStatValue: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: scale(4),
  },
  projectionTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(12),
  },
  scenarioCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(12),
    marginBottom: scale(8),
  },
  scenarioName: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.teal,
  },
  scenarioDetails: {
    fontSize: scale(12),
    color: COLORS.textPrimary,
    marginTop: scale(4),
  },
  scenarioDate: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  suggestionsBox: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginTop: scale(16),
  },
  suggestionText: {
    fontSize: scale(13),
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  // ============================================
  // QUICK ACTIONS - LARGE CARDS
  // ============================================
  quickActionsLarge: {
    marginBottom: scale(24),
    gap: scale(12),
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: scale(12),
  },
  quickActionLarge: {
    flex: 1,
    borderRadius: scale(20),
    padding: scale(18),
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
    minHeight: scale(130),
    justifyContent: 'center',
  },
  quickActionLargeIcon: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
  },
  quickActionLargeLabel: {
    fontSize: scale(14),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  quickActionLargeHint: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  quickActionWide: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: scale(20),
    padding: scale(18),
    borderWidth: 1,
    position: 'relative',
  },
  quickActionWideContent: {
    flex: 1,
    marginLeft: scale(14),
  },
  newBadgeLarge: {
    position: 'absolute',
    top: scale(10),
    right: scale(10),
    backgroundColor: COLORS.purple,
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(8),
  },
  newBadgeLargeText: {
    fontSize: scale(9),
    fontWeight: '700',
    color: '#FFF',
  },
  // Photo styles
  photoSection: {
    marginTop: scale(12),
    marginBottom: scale(12),
  },
  photoLabel: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginBottom: scale(8),
  },
  photoButtons: {
    flexDirection: "row",
    gap: scale(12),
  },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.backgroundSecondary,
    padding: scale(12),
    borderRadius: scale(10),
    gap: scale(8),
  },
  photoButtonText: {
    fontSize: scale(13),
    color: COLORS.textPrimary,
  },
  photoPreview: {
    marginTop: scale(12),
    position: "relative",
    alignItems: "center",
  },
  previewImage: {
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    padding: scale(14),
    marginBottom: scale(12),
    gap: scale(10),
  },
  datePickerText: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
    flex: 1,
  },
    width: "100%",
    height: scale(200),
    borderRadius: scale(10),
  },
  removePhotoButton: {
    position: "absolute",
    top: scale(8),
    right: scale(8),
    backgroundColor: COLORS.background,
    borderRadius: scale(12),
  },
  invoiceImageContainer: {
    marginTop: scale(16),
    marginBottom: scale(16),
  },
  invoiceImageLabel: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginBottom: scale(8),
  },
  invoiceImage: {
    width: "100%",
    height: scale(250),
    borderRadius: scale(12),
  },
  invoiceImagePreview: {
    width: "100%",
    height: scale(180),
    borderRadius: scale(12),
    backgroundColor: COLORS.backgroundSecondary,
  },
  imageActionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(16),
    marginTop: scale(12),
  },
  imageActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
    borderRadius: scale(10),
    gap: scale(8),
  },
  imageActionButtonText: {
    fontSize: scale(13),
    color: COLORS.teal,
    fontWeight: '500',
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    padding: scale(14),
    marginBottom: scale(12),
    gap: scale(10),
  },
  datePickerText: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
    flex: 1,
  },
});