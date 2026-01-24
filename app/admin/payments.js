// app/admin/payments.js
// ISSY Admin - Gestor de Cobros Comunitarios (ProHome Dark Theme)
// Tabs: Cobros | Comprobantes | Configuración

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Image,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useAdminLocation } from '../../src/context/AdminLocationContext';
import { LocationHeader, LocationPickerModal } from '../../src/components/AdminLocationPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getBankAccounts, 
  createBankAccount, 
  updateBankAccount, 
  deleteBankAccount,
  setDefaultBankAccount 
} from '../../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.joinissy.com';

// ProHome Dark Theme Colors
const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  lime: '#D4FE48',
  teal: '#5DDED8',
  purple: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  blue: '#3B82F6',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  border: 'rgba(255,255,255,0.1)',
};

// Payment Status Config
const getPaymentStatus = (t) => ({
  pending: { label: t('admin.payments.status.pending', 'Pendiente'), color: COLORS.warning, icon: 'time' },
  proof_submitted: { label: t('admin.payments.status.proofSubmitted', 'Comprobante enviado'), color: COLORS.blue, icon: 'document-text' },
  paid: { label: t('admin.payments.status.paid', 'Pagado'), color: COLORS.success, icon: 'checkmark-circle' },
  overdue: { label: t('admin.payments.status.overdue', 'Vencido'), color: COLORS.danger, icon: 'alert-circle' },
  rejected: { label: t('admin.payments.status.rejected', 'Rechazado'), color: COLORS.danger, icon: 'close-circle' },
  cancelled: { label: t('admin.payments.status.cancelled', 'Cancelado'), color: COLORS.textMuted, icon: 'close-circle' },
});

// Payment Types Config
const getPaymentTypes = (t) => [
  { value: 'maintenance', label: t('admin.payments.types.maintenance', 'Mantenimiento'), icon: 'home' },
  { value: 'extraordinary', label: t('admin.payments.types.extraordinary', 'Extraordinario'), icon: 'flash' },
  { value: 'fine', label: t('admin.payments.types.fine', 'Multa'), icon: 'warning' },
  { value: 'service', label: t('admin.payments.types.service', 'Servicio'), icon: 'construct' },
  { value: 'other', label: t('admin.payments.types.other', 'Otro'), icon: 'document-text' },
];

// Target Options for charge creation
const getTargetOptions = (t) => [
  { value: 'single', label: t('admin.payments.target.single', 'Un residente'), icon: 'person' },
  { value: 'multiple', label: t('admin.payments.target.multiple', 'Varios residentes'), icon: 'people' },
  { value: 'all', label: t('admin.payments.target.all', 'Todos los residentes'), icon: 'globe' },
];

// Payment Methods Options
const getPaymentMethodOptions = (t) => [
  { value: 'both', label: t('admin.payments.methods.both', 'Tarjeta y Comprobante'), icon: 'card' },
  { value: 'card', label: t('admin.payments.methods.cardOnly', 'Solo Tarjeta'), icon: 'card-outline' },
  { value: 'proof', label: t('admin.payments.methods.proofOnly', 'Solo Comprobante'), icon: 'document-attach' },
];

export default function AdminPayments() {
  const { t } = useTranslation();
  const { user, profile, isSuperAdmin } = useAuth();
  const { selectedLocationId, loading: locationLoading } = useAdminLocation();
  const router = useRouter();
  
  // i18n configs
  const PAYMENT_STATUS = getPaymentStatus(t);
  const PAYMENT_TYPES = getPaymentTypes(t);
  const TARGET_OPTIONS = getTargetOptions(t);
  const PAYMENT_METHOD_OPTIONS = getPaymentMethodOptions(t);
  
  // ============================================
  // STATE
  // ============================================
  
  // Main tab state
  const [activeTab, setActiveTab] = useState('charges');
  
  // Charges tab state
  const [charges, setCharges] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Proofs tab state
  const [pendingProofs, setPendingProofs] = useState([]);
  const [loadingProofs, setLoadingProofs] = useState(false);
  const [selectedProof, setSelectedProof] = useState(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processingProof, setProcessingProof] = useState(false);
  
  // Charge detail modal state
  const [showChargeDetailModal, setShowChargeDetailModal] = useState(false);
  const [selectedChargeDetail, setSelectedChargeDetail] = useState(null);

  // Settings tab state
  const [settings, setSettings] = useState({
    card_payments_enabled: true,
    proof_payments_enabled: true,
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
    bank_instructions: '',
  });
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Bank accounts state
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loadingBankAccounts, setLoadingBankAccounts] = useState(false);
  const [showBankAccountModal, setShowBankAccountModal] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState(null);
  const [bankAccountForm, setBankAccountForm] = useState({
    bank_name: "",
    account_number: "",
    account_name: "",
    account_type: "savings",
    instructions: "",
    is_default: false,
  });
  const [savingBankAccount, setSavingBankAccount] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Users state (for charge creation)
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [createStep, setCreateStep] = useState('form');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    target: 'single',
    user_id: '',
    user_name: '',
    payment_type: 'maintenance',
    title: '',
    description: '',
    amount: '',
    due_date: getDefaultDueDate(),
    allowed_payment_methods: ['card', 'proof'],
  });

  const userRole = profile?.role || user?.role || 'user';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);

  // ============================================
  // HELPERS
  // ============================================

  function getDefaultDueDate() {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  }

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const formatCurrency = (amount, currency = 'HNL') => {
    const symbol = currency === 'USD' ? '$' : 'L';
    return `${symbol} ${parseFloat(amount || 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-HN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-HN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentTypeLabel = (type) => {
    return PAYMENT_TYPES.find(pt => pt.value === type)?.label || type;
  };

  const getPaymentTypeIcon = (type) => {
    return PAYMENT_TYPES.find(pt => pt.value === type)?.icon || 'document-text';
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert(
        t('admin.payments.accessDenied', 'Acceso Denegado'),
        t('admin.payments.noPermissions', 'No tienes permisos para acceder a esta sección')
      );
      router.back();
      return;
    }
    loadTabData();
  }, [activeTab, filter]);

  const loadTabData = async () => {
    if (activeTab === 'charges') {
      await fetchCharges();
    } else if (activeTab === 'proofs') {
      await fetchPendingProofs();
    } else if (activeTab === 'settings') {
      await fetchSettings();
      await fetchBankAccounts();
    }
  };

  // ============================================
  // CHARGES TAB - API CALLS
  // ============================================

  const fetchCharges = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      
      const [chargesRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/community-payments/admin/charges${statusParam}`, { headers }),
        fetch(`${API_URL}/api/community-payments/admin/stats`, { headers }),
      ]);

      const chargesData = await chargesRes.json();
      const statsData = await statsRes.json();

      if (chargesData.success) {
        setCharges(chargesData.data || []);
      }
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('Error fetching charges:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUsers = async () => {
    setShowCreateModal(false);
    
    if (users.length > 0) {
      setShowUserPicker(true);
      return;
    }

    setLoadingUsers(true);
    setShowUserPicker(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/community-payments/admin/residents`, { headers });
      const data = await response.json();

      if (data.success) {
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateCharge = async () => {
    if (formData.target === 'single' && !formData.user_id) {
      Alert.alert(t('common.error', 'Error'), t('admin.payments.errors.selectResident', 'Selecciona un residente'));
      return;
    }
    if (formData.target === 'multiple' && selectedUsers.length === 0) {
      Alert.alert(t('common.error', 'Error'), t('admin.payments.errors.selectResidents', 'Selecciona al menos un residente'));
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert(t('common.error', 'Error'), t('admin.payments.errors.enterValidAmount', 'Ingresa un monto válido'));
      return;
    }
    if (!formData.title) {
      Alert.alert(t('common.error', 'Error'), t('admin.payments.errors.enterTitle', 'Ingresa un título para el cobro'));
      return;
    }

    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      
      let userIds = [];
      if (formData.target === 'single') {
        userIds = [formData.user_id];
      } else if (formData.target === 'multiple') {
        userIds = selectedUsers.map(u => u.id);
      }

      const payload = {
        target: formData.target,
        user_ids: userIds,
        charge_type: formData.payment_type,
        title: formData.title || getPaymentTypeLabel(formData.payment_type),
        description: formData.description,
        amount: parseFloat(formData.amount),
        currency: 'HNL',
        due_date: formData.due_date,
        allowed_payment_methods: formData.allowed_payment_methods,
      };

      const response = await fetch(`${API_URL}/api/community-payments/admin/charges`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const count = data.data?.charges_created || 1;
        Alert.alert(
          t('common.success', 'Éxito'),
          t('admin.payments.success.chargesCreated', { count }, `Se crearon ${count} cobro(s) exitosamente`)
        );
        setShowCreateModal(false);
        resetForm();
        fetchCharges();
      } else {
        Alert.alert(t('common.error', 'Error'), data.error || t('admin.payments.errors.createFailed', 'Error al crear cobro'));
      }
    } catch (error) {
      console.error('Error creating charge:', error);
      Alert.alert(t('common.error', 'Error'), t('admin.payments.errors.createFailed', 'Error al crear cobro'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelCharge = async (charge) => {
    Alert.alert(
      t('admin.payments.cancelCharge', 'Cancelar Cobro'),
      t('admin.payments.cancelChargeConfirm', '¿Estás seguro de cancelar este cobro?'),
      [
        { text: t('common.no', 'No'), style: 'cancel' },
        {
          text: t('common.yes', 'Sí'),
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(`${API_URL}/api/community-payments/admin/charges/${charge.id}`, {
                method: 'DELETE',
                headers,
              });

              if (response.ok) {
                Alert.alert(t('common.success', 'Éxito'), t('admin.payments.success.chargeCancelled', 'Cobro cancelado'));
                fetchCharges();
              }
            } catch (error) {
              Alert.alert(t('common.error', 'Error'), t('admin.payments.errors.cancelFailed', 'Error al cancelar'));
            }
          },
        },
      ]
    );
  };

  const openChargeDetail = (charge) => {
    setSelectedChargeDetail(charge);
    setShowChargeDetailModal(true);
  };

  const resetForm = () => {
    setFormData({
      target: 'single',
      user_id: '',
      user_name: '',
      payment_type: 'maintenance',
      title: '',
      description: '',
      amount: '',
      due_date: getDefaultDueDate(),
      allowed_payment_methods: ['card', 'proof'],
    });
    setSelectedUsers([]);
  };

  // ============================================
  // PROOFS TAB - API CALLS
  // ============================================

  const fetchPendingProofs = async () => {
    try {
      setLoadingProofs(true);
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_URL}/api/community-payments/admin/pending-proofs`, { headers });
      const data = await response.json();

      if (data.success) {
        setPendingProofs(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching proofs:', error);
    } finally {
      setLoadingProofs(false);
      setRefreshing(false);
    }
  };

  const handleVerifyProof = async (proof) => {
    setProcessingProof(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/community-payments/admin/payments/${proof.id}/verify`, {
        method: 'POST',
        headers,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(
          t('common.success', 'Éxito'),
          t('admin.payments.success.proofVerified', 'Comprobante verificado exitosamente')
        );
        setShowProofModal(false);
        setSelectedProof(null);
        fetchPendingProofs();
      } else {
        Alert.alert(t('common.error', 'Error'), data.error || t('admin.payments.errors.verifyFailed', 'Error al verificar'));
      }
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), t('admin.payments.errors.verifyFailed', 'Error al verificar'));
    } finally {
      setProcessingProof(false);
    }
  };

  const handleRejectProof = async (proof) => {
    if (!rejectReason.trim()) {
      Alert.alert(t('common.error', 'Error'), t('admin.payments.errors.enterRejectReason', 'Ingresa una razón de rechazo'));
      return;
    }

    setProcessingProof(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/community-payments/admin/payments/${proof.id}/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: rejectReason }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(
          t('common.success', 'Éxito'),
          t('admin.payments.success.proofRejected', 'Comprobante rechazado')
        );
        setShowProofModal(false);
        setSelectedProof(null);
        setRejectReason('');
        fetchPendingProofs();
      } else {
        Alert.alert(t('common.error', 'Error'), data.error || t('admin.payments.errors.rejectFailed', 'Error al rechazar'));
      }
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), t('admin.payments.errors.rejectFailed', 'Error al rechazar'));
    } finally {
      setProcessingProof(false);
    }
  };

  // ============================================
  // SETTINGS TAB - API CALLS
  // ============================================

  const fetchSettings = async () => {
    try {
      setLoadingSettings(true);
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_URL}/api/community-payments/settings`, { headers });
      const data = await response.json();

      if (data.success && data.data) {
        setSettings({
          card_payments_enabled: data.data.card_payments_enabled ?? true,
          proof_payments_enabled: data.data.proof_payments_enabled ?? true,
          bank_name: data.data.bank_name || '',
          bank_account_number: data.data.bank_account_number || '',
          bank_account_name: data.data.bank_account_name || '',
          bank_instructions: data.data.bank_instructions || '',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/community-payments/admin/settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(
          t('common.success', 'Éxito'),
          t('admin.payments.success.settingsSaved', 'Configuración guardada')
        );
      } else {
        Alert.alert(t('common.error', 'Error'), data.error || t('admin.payments.errors.saveFailed', 'Error al guardar'));
      }
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), t('admin.payments.errors.saveFailed', 'Error al guardar'));
    } finally {
      setSavingSettings(false);
    }
  };

  // ============================================

  // ============================================
  // BANK ACCOUNTS FUNCTIONS
  // ============================================

  const fetchBankAccounts = async () => {
    try {
      setLoadingBankAccounts(true);
      const result = await getBankAccounts(selectedLocationId);
      if (result.success) {
        setBankAccounts(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    } finally {
      setLoadingBankAccounts(false);
    }
  };

  const resetBankAccountForm = () => {
    setBankAccountForm({
      bank_name: "",
      account_number: "",
      account_name: "",
      account_type: "savings",
      instructions: "",
      is_default: false,
    });
    setEditingBankAccount(null);
  };

  const openAddBankAccount = () => {
    resetBankAccountForm();
    setShowBankAccountModal(true);
  };

  const openEditBankAccount = (account) => {
    setEditingBankAccount(account);
    setBankAccountForm({
      bank_name: account.bank_name || "",
      account_number: account.account_number_full || account.account_number || "",
      account_name: account.account_name || "",
      account_type: account.account_type || "savings",
      instructions: account.instructions || "",
      is_default: account.is_default || false,
    });
    setShowBankAccountModal(true);
  };

  const handleSaveBankAccount = async () => {
    if (!bankAccountForm.bank_name || !bankAccountForm.account_number || !bankAccountForm.account_name) {
      Alert.alert(t("common.error", "Error"), t("admin.payments.errors.fillRequiredFields", "Completa los campos requeridos"));
      return;
    }
    setSavingBankAccount(true);
    try {
      const accountData = { ...bankAccountForm, location_id: selectedLocationId };
      let result;
      if (editingBankAccount) {
        result = await updateBankAccount(editingBankAccount.id, accountData);
      } else {
        result = await createBankAccount(accountData);
      }
      if (result.success) {
        Alert.alert(t("common.success", "Éxito"), editingBankAccount ? t("admin.payments.success.bankAccountUpdated", "Cuenta actualizada") : t("admin.payments.success.bankAccountCreated", "Cuenta creada"));
        setShowBankAccountModal(false);
        resetBankAccountForm();
        fetchBankAccounts();
      } else {
        Alert.alert(t("common.error", "Error"), result.error || "Error al guardar");
      }
    } catch (error) {
      Alert.alert(t("common.error", "Error"), "Error al guardar cuenta");
    } finally {
      setSavingBankAccount(false);
    }
  };

  const handleDeleteBankAccount = (account) => {
    Alert.alert(t("admin.payments.deleteBankAccount", "Eliminar Cuenta"), t("admin.payments.deleteBankAccountConfirm", "¿Eliminar esta cuenta bancaria?"), [
      { text: t("common.cancel", "Cancelar"), style: "cancel" },
      { text: t("common.delete", "Eliminar"), style: "destructive", onPress: async () => {
        const result = await deleteBankAccount(account.id);
        if (result.success) {
          Alert.alert(t("common.success", "Éxito"), t("admin.payments.success.bankAccountDeleted", "Cuenta eliminada"));
          fetchBankAccounts();
        } else {
          Alert.alert(t("common.error", "Error"), result.error || "Error al eliminar");
        }
      }},
    ]);
  };

  const handleSetDefaultBankAccount = async (account) => {
    if (account.is_default) return;
    const result = await setDefaultBankAccount(account.id);
    if (result.success) {
      fetchBankAccounts();
    } else {
      Alert.alert(t("common.error", "Error"), result.error || "Error al establecer como principal");
    }
  };

  // USER SELECTION HELPERS
  // ============================================

  const handleSelectUser = (selectedUser) => {
    if (formData.target === 'single') {
      setFormData({
        ...formData,
        user_id: selectedUser.id,
        user_name: selectedUser.name || selectedUser.email,
      });
      setShowUserPicker(false);
      setShowCreateModal(true);
    } else if (formData.target === 'multiple') {
      const alreadySelected = selectedUsers.find(u => u.id === selectedUser.id);
      if (alreadySelected) {
        setSelectedUsers(selectedUsers.filter(u => u.id !== selectedUser.id));
      } else {
        setSelectedUsers([...selectedUsers, selectedUser]);
      }
    }
    setUserSearch('');
  };

  const filteredUsers = users.filter(u => {
    const searchLower = userSearch.toLowerCase();
    const name = (u.full_name || u.name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const unit = (u.unit_number || u.unit || '').toLowerCase();
    return name.includes(searchLower) || email.includes(searchLower) || unit.includes(searchLower);
  });

  // ============================================
  // REFRESH HANDLER
  // ============================================

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTabData();
  }, [activeTab, filter]);

  // ============================================
  // RENDER: MAIN TABS
  // ============================================

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.mainTab, activeTab === 'charges' && styles.mainTabActive]}
        onPress={() => setActiveTab('charges')}
      >
        <Ionicons 
          name="receipt-outline" 
          size={18} 
          color={activeTab === 'charges' ? COLORS.background : COLORS.textSecondary} 
        />
        <Text style={[styles.mainTabText, activeTab === 'charges' && styles.mainTabTextActive]}>
          {t('admin.payments.tabs.charges', 'Cobros')}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.mainTab, activeTab === 'proofs' && styles.mainTabActive]}
        onPress={() => setActiveTab('proofs')}
      >
        <Ionicons 
          name="document-text-outline" 
          size={18} 
          color={activeTab === 'proofs' ? COLORS.background : COLORS.textSecondary} 
        />
        <Text style={[styles.mainTabText, activeTab === 'proofs' && styles.mainTabTextActive]}>
          {t('admin.payments.tabs.proofs', 'Comprobantes')}
        </Text>
        {pendingProofs.length > 0 && (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{pendingProofs.length}</Text>
          </View>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.mainTab, activeTab === 'settings' && styles.mainTabActive]}
        onPress={() => setActiveTab('settings')}
      >
        <Ionicons 
          name="settings-outline" 
          size={18} 
          color={activeTab === 'settings' ? COLORS.background : COLORS.textSecondary} 
        />
        <Text style={[styles.mainTabText, activeTab === 'settings' && styles.mainTabTextActive]}>
          {t('admin.payments.tabs.settings', 'Config')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ============================================
  // RENDER: CHARGES TAB
  // ============================================

  const renderChargesTab = () => (
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
          {[
            { key: 'all', label: t('admin.payments.filters.all', 'Todos'), icon: 'list' },
            { key: 'pending', label: t('admin.payments.filters.pending', 'Pendientes'), icon: 'time' },
            { key: 'paid', label: t('admin.payments.filters.paid', 'Pagados'), icon: 'checkmark-circle' },
            { key: 'overdue', label: t('admin.payments.filters.overdue', 'Vencidos'), icon: 'alert-circle' },
          ].map((f) => (
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

      {/* Charges List */}
      {charges.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cash-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>{t('admin.payments.empty.noCharges', 'No hay cobros')}</Text>
          <Text style={styles.emptySubtitle}>{t('admin.payments.empty.createFirst', 'Crea tu primer cobro')}</Text>
        </View>
      ) : (
        charges.map((charge) => {
          const status = charge.display_status || charge.payment_status || charge.status || 'pending';
          const statusInfo = PAYMENT_STATUS[status] || PAYMENT_STATUS.pending;
          const chargeIsOverdue = status === 'pending' && isOverdue(charge.due_date);
          const displayStatus = chargeIsOverdue ? PAYMENT_STATUS.overdue : statusInfo;
          
          const payment = charge.payment || charge.payments?.[0];
          const userName = payment?.user?.name || payment?.user?.full_name || charge.user?.name || charge.user_name || t('common.user', 'Usuario');
          const userUnit = payment?.user?.unit_number || charge.user?.unit_number || '';
          
          return (
            <TouchableOpacity
              key={charge.id}
              style={styles.chargeCard}
              onPress={() => openChargeDetail(charge)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardIconContainer}>
                  <Ionicons 
                    name={getPaymentTypeIcon(charge.charge_type || charge.payment_type)} 
                    size={20} 
                    color={COLORS.teal} 
                  />
                </View>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.chargeConcept}>
                    {charge.title || charge.concept || getPaymentTypeLabel(charge.charge_type || charge.payment_type)}
                  </Text>
                  <Text style={styles.chargeUser}>
                    {userUnit ? `${userUnit} - ${userName}` : userName}
                  </Text>
                </View>
                <View style={styles.cardHeaderRight}>
                  <Text style={styles.chargeAmount}>{formatCurrency(charge.amount, charge.currency)}</Text>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </View>
              </View>
              
              <View style={styles.cardFooter}>
                <View style={[styles.statusBadge, { backgroundColor: displayStatus.color + '20' }]}>
                  <Ionicons name={displayStatus.icon} size={14} color={displayStatus.color} />
                  <Text style={[styles.statusText, { color: displayStatus.color }]}>
                    {displayStatus.label}
                  </Text>
                </View>
                <View style={styles.dueDateContainer}>
                  <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.dueDate}>{formatDate(charge.due_date)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </>
  );

  // ============================================
  // RENDER: PROOFS TAB
  // ============================================

  const renderProofsTab = () => {
    if (loadingProofs) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
          <Text style={styles.loadingText}>{t('admin.payments.loadingProofs', 'Cargando comprobantes...')}</Text>
        </View>
      );
    }

    return (
      <>
        {pendingProofs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color={COLORS.success} />
            <Text style={styles.emptyTitle}>{t('admin.payments.empty.noProofs', '¡Todo al día!')}</Text>
            <Text style={styles.emptySubtitle}>{t('admin.payments.empty.noProofsSubtitle', 'No hay comprobantes pendientes de verificar')}</Text>
          </View>
        ) : (
          pendingProofs.map((proof) => (
            <TouchableOpacity 
              key={proof.id} 
              style={styles.proofCard}
              onPress={() => {
                setSelectedProof(proof);
                setShowProofModal(true);
                setRejectReason('');
              }}
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
          ))
        )}
      </>
    );
  };

  // ============================================
  // RENDER: SETTINGS TAB
  // ============================================

  const renderSettingsTab = () => {
    if (loadingSettings) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
          <Text style={styles.loadingText}>{t('admin.payments.loadingSettings', 'Cargando configuración...')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.settingsContainer}>
        {/* Payment Methods */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>
            {t('admin.payments.settings.paymentMethods', 'Métodos de Pago')}
          </Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="card" size={24} color={COLORS.teal} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>
                  {t('admin.payments.settings.cardPayments', 'Pagos con Tarjeta')}
                </Text>
                <Text style={styles.settingDescription}>
                  {t('admin.payments.settings.cardPaymentsDesc', 'Permitir pagos con tarjeta de crédito/débito')}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.card_payments_enabled}
              onValueChange={(value) => setSettings({ ...settings, card_payments_enabled: value })}
              trackColor={{ false: COLORS.border, true: COLORS.lime + '50' }}
              thumbColor={settings.card_payments_enabled ? COLORS.lime : COLORS.textMuted}
            />
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="document-attach" size={24} color={COLORS.purple} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>
                  {t('admin.payments.settings.proofPayments', 'Comprobantes de Pago')}
                </Text>
                <Text style={styles.settingDescription}>
                  {t('admin.payments.settings.proofPaymentsDesc', 'Permitir subir comprobantes de transferencia')}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.proof_payments_enabled}
              onValueChange={(value) => setSettings({ ...settings, proof_payments_enabled: value })}
              trackColor={{ false: COLORS.border, true: COLORS.lime + '50' }}
              thumbColor={settings.proof_payments_enabled ? COLORS.lime : COLORS.textMuted}
            />
          </View>
        </View>

        {/* Bank Accounts - Multiple */}
        {settings.proof_payments_enabled && (
          <View style={styles.settingsSection}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.settingsSectionTitle}>
                  {t('admin.payments.settings.bankAccounts', 'Cuentas Bancarias')}
                </Text>
                <Text style={styles.settingsSectionSubtitle}>
                  {t('admin.payments.settings.bankAccountsDesc', 'Agrega las cuentas donde los residentes pueden depositar')}
                </Text>
              </View>
              <TouchableOpacity style={styles.addBankButton} onPress={openAddBankAccount}>
                <Ionicons name="add-circle" size={24} color={COLORS.lime} />
              </TouchableOpacity>
            </View>

            {loadingBankAccounts ? (
              <ActivityIndicator size="small" color={COLORS.lime} style={{ marginVertical: 20 }} />
            ) : bankAccounts.length === 0 ? (
              <View style={styles.emptyBankAccounts}>
                <Ionicons name="wallet-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyBankAccountsText}>
                  {t('admin.payments.noBankAccounts', 'No hay cuentas bancarias')}
                </Text>
                <TouchableOpacity style={styles.addFirstBankButton} onPress={openAddBankAccount}>
                  <Ionicons name="add" size={20} color={COLORS.background} />
                  <Text style={styles.addFirstBankButtonText}>
                    {t('admin.payments.addFirstBankAccount', 'Agregar cuenta')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.bankAccountsList}>
                {bankAccounts.map((account, index) => (
                  <View key={account.id} style={[styles.bankAccountCard, account.is_default && styles.bankAccountCardDefault]}>
                    <View style={styles.bankAccountHeader}>
                      <View style={styles.bankAccountInfo}>
                        <Text style={styles.bankAccountName}>{account.bank_name}</Text>
                        {account.is_default && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>{t('common.default', 'Principal')}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.bankAccountActions}>
                        {!account.is_default && (
                          <TouchableOpacity onPress={() => handleSetDefaultBankAccount(account)} style={styles.bankAccountAction}>
                            <Ionicons name="star-outline" size={18} color={COLORS.textMuted} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => openEditBankAccount(account)} style={styles.bankAccountAction}>
                          <Ionicons name="pencil" size={18} color={COLORS.teal} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteBankAccount(account)} style={styles.bankAccountAction}>
                          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.bankAccountDetails}>
                      <Text style={styles.bankAccountNumber}>{account.account_number}</Text>
                      <Text style={styles.bankAccountHolder}>{account.account_name}</Text>
                      {account.account_type && (
                        <Text style={styles.bankAccountType}>
                          {account.account_type === 'savings' ? 'Ahorro' : account.account_type === 'checking' ? 'Corriente' : account.account_type}
                        </Text>
                      )}
                    </View>
                    {account.instructions && (
                      <Text style={styles.bankAccountInstructions}>{account.instructions}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity 
          style={styles.saveSettingsButton}
          onPress={handleSaveSettings}
          disabled={savingSettings}
        >
          {savingSettings ? (
            <ActivityIndicator size="small" color={COLORS.background} />
          ) : (
            <>
              <Ionicons name="save" size={20} color={COLORS.background} />
              <Text style={styles.saveSettingsButtonText}>
                {t('admin.payments.settings.save', 'Guardar Configuración')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // ============================================
  // RENDER: MODALS
  // ============================================


  // ============================================
  // RENDER: BANK ACCOUNT MODAL
  // ============================================
  const renderBankAccountModal = () => (
    <Modal
      visible={showBankAccountModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowBankAccountModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingBankAccount 
                ? t('admin.payments.editBankAccount', 'Editar Cuenta') 
                : t('admin.payments.addBankAccount', 'Nueva Cuenta Bancaria')}
            </Text>
            <TouchableOpacity onPress={() => setShowBankAccountModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('admin.payments.settings.bankName', 'Nombre del Banco')} *</Text>
              <TextInput
                style={styles.formInput}
                value={bankAccountForm.bank_name}
                onChangeText={(text) => setBankAccountForm({ ...bankAccountForm, bank_name: text })}
                placeholder="Ej: Banco Atlántida"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('admin.payments.settings.accountNumber', 'Número de Cuenta')} *</Text>
              <TextInput
                style={styles.formInput}
                value={bankAccountForm.account_number}
                onChangeText={(text) => setBankAccountForm({ ...bankAccountForm, account_number: text })}
                placeholder="Ej: 1234567890"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('admin.payments.settings.accountName', 'Nombre del Titular')} *</Text>
              <TextInput
                style={styles.formInput}
                value={bankAccountForm.account_name}
                onChangeText={(text) => setBankAccountForm({ ...bankAccountForm, account_name: text })}
                placeholder="Ej: Residencial Los Pinos"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('admin.payments.accountType', 'Tipo de Cuenta')}</Text>
              <View style={styles.accountTypeRow}>
                <TouchableOpacity
                  style={[styles.accountTypeButton, bankAccountForm.account_type === 'savings' && styles.accountTypeButtonActive]}
                  onPress={() => setBankAccountForm({ ...bankAccountForm, account_type: 'savings' })}
                >
                  <Text style={[styles.accountTypeText, bankAccountForm.account_type === 'savings' && styles.accountTypeTextActive]}>
                    {t('admin.payments.savings', 'Ahorro')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.accountTypeButton, bankAccountForm.account_type === 'checking' && styles.accountTypeButtonActive]}
                  onPress={() => setBankAccountForm({ ...bankAccountForm, account_type: 'checking' })}
                >
                  <Text style={[styles.accountTypeText, bankAccountForm.account_type === 'checking' && styles.accountTypeTextActive]}>
                    {t('admin.payments.checking', 'Corriente')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('admin.payments.settings.instructions', 'Instrucciones (opcional)')}</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMultiline]}
                value={bankAccountForm.instructions}
                onChangeText={(text) => setBankAccountForm({ ...bankAccountForm, instructions: text })}
                placeholder="Instrucciones adicionales para el pago..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <TouchableOpacity
                style={styles.defaultCheckbox}
                onPress={() => setBankAccountForm({ ...bankAccountForm, is_default: !bankAccountForm.is_default })}
              >
                <Ionicons 
                  name={bankAccountForm.is_default ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={bankAccountForm.is_default ? COLORS.lime : COLORS.textMuted} 
                />
                <Text style={styles.defaultCheckboxText}>
                  {t('admin.payments.setAsDefault', 'Establecer como cuenta principal')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowBankAccountModal(false)}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancelar')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, savingBankAccount && styles.submitButtonDisabled]}
              onPress={handleSaveBankAccount}
              disabled={savingBankAccount}
            >
              {savingBankAccount ? (
                <ActivityIndicator size="small" color={COLORS.background} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {editingBankAccount ? t('common.save', 'Guardar') : t('common.add', 'Agregar')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowCreateModal(false)}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowCreateModal(false)}>
            <Text style={styles.modalCancel}>{t('common.cancel', 'Cancelar')}</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{t('admin.payments.newCharge', 'Nuevo Cobro')}</Text>
          <TouchableOpacity onPress={handleCreateCharge} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.lime} />
            ) : (
              <Text style={styles.modalSave}>{t('common.create', 'Crear')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Target Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.payments.form.target', 'Cobrar a')}</Text>
            <View style={styles.targetGrid}>
              {TARGET_OPTIONS.map((option) => {
                const isSelected = formData.target === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.targetButton, isSelected && styles.targetButtonActive]}
                    onPress={() => {
                      setFormData({ ...formData, target: option.value, user_id: '', user_name: '' });
                      setSelectedUsers([]);
                    }}
                  >
                    <Ionicons 
                      name={option.icon} 
                      size={24} 
                      color={isSelected ? COLORS.lime : COLORS.textSecondary} 
                    />
                    <Text style={[styles.targetLabel, isSelected && styles.targetLabelActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* User Selector */}
          {formData.target !== 'all' && (
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                {formData.target === 'single' 
                  ? t('admin.payments.form.resident', 'Residente') + ' *'
                  : t('admin.payments.form.residents', 'Residentes') + ' *'
                }
              </Text>
              
              {formData.target === 'single' ? (
                <TouchableOpacity style={styles.selectorButton} onPress={fetchUsers}>
                  <Text style={formData.user_name ? styles.selectorText : styles.selectorPlaceholder}>
                    {formData.user_name || t('admin.payments.form.selectResident', 'Seleccionar residente...')}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={styles.selectorButton} onPress={fetchUsers}>
                    <Text style={selectedUsers.length > 0 ? styles.selectorText : styles.selectorPlaceholder}>
                      {selectedUsers.length > 0 
                        ? `${selectedUsers.length} seleccionados`
                        : t('admin.payments.form.selectResidents', 'Seleccionar residentes...')
                      }
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  
                  {selectedUsers.length > 0 && (
                    <View style={styles.selectedUsersList}>
                      {selectedUsers.map((user) => (
                        <View key={user.id} style={styles.selectedUserChip}>
                          <Text style={styles.selectedUserChipText}>
                            {user.full_name || user.name || user.email}
                          </Text>
                          <TouchableOpacity onPress={() => handleSelectUser(user)}>
                            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Charge Type */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.payments.form.chargeType', 'Tipo de Cobro')}</Text>
            <View style={styles.typeGrid}>
              {PAYMENT_TYPES.map((type) => {
                const isSelected = formData.payment_type === type.value;
                return (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.typeButton, isSelected && styles.typeButtonActive]}
                    onPress={() => setFormData({ ...formData, payment_type: type.value })}
                  >
                    <Ionicons 
                      name={type.icon} 
                      size={24} 
                      color={isSelected ? COLORS.lime : COLORS.textSecondary} 
                    />
                    <Text style={[styles.typeLabel, isSelected && styles.typeLabelActive]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.payments.form.title', 'Título')} *</Text>
            <TextInput
              style={styles.formInput}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder={t('admin.payments.form.titlePlaceholder', 'Ej: Cuota Enero 2026')}
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.payments.form.description', 'Descripción (opcional)')}</Text>
            <TextInput
              style={[styles.formInput, styles.formInputMultiline]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder={t('admin.payments.form.descriptionPlaceholder', 'Descripción adicional...')}
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Amount */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.payments.form.amount', 'Monto (L)')} *</Text>
            <TextInput
              style={styles.formInput}
              value={formData.amount}
              onChangeText={(text) => setFormData({ ...formData, amount: text.replace(/[^0-9.]/g, '') })}
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Due Date */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.payments.form.dueDate', 'Fecha de Vencimiento')} *</Text>
            <TextInput
              style={styles.formInput}
              value={formData.due_date}
              onChangeText={(text) => setFormData({ ...formData, due_date: text })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={styles.formHint}>{t('admin.payments.form.dateFormat', 'Formato: 2026-01-31')}</Text>
          </View>

          {/* Payment Methods */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.payments.form.allowedMethods', 'Métodos de Pago Permitidos')}</Text>
            <View style={styles.methodsGrid}>
              {PAYMENT_METHOD_OPTIONS.map((option) => {
                let isSelected = false;
                if (option.value === 'both') {
                  isSelected = formData.allowed_payment_methods.includes('card') && formData.allowed_payment_methods.includes('proof');
                } else if (option.value === 'card') {
                  isSelected = formData.allowed_payment_methods.includes('card') && !formData.allowed_payment_methods.includes('proof');
                } else if (option.value === 'proof') {
                  isSelected = !formData.allowed_payment_methods.includes('card') && formData.allowed_payment_methods.includes('proof');
                }
                
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.methodButton, isSelected && styles.methodButtonActive]}
                    onPress={() => {
                      if (option.value === 'both') {
                        setFormData({ ...formData, allowed_payment_methods: ['card', 'proof'] });
                      } else if (option.value === 'card') {
                        setFormData({ ...formData, allowed_payment_methods: ['card'] });
                      } else {
                        setFormData({ ...formData, allowed_payment_methods: ['proof'] });
                      }
                    }}
                  >
                    <Ionicons 
                      name={option.icon} 
                      size={20} 
                      color={isSelected ? COLORS.lime : COLORS.textSecondary} 
                    />
                    <Text style={[styles.methodLabel, isSelected && styles.methodLabelActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderUserPickerModal = () => (
    <Modal
      visible={showUserPicker}
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent={false}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={[styles.modalHeader, { paddingTop: scale(50) }]}>
          <TouchableOpacity onPress={() => {
            setShowUserPicker(false);
            setShowCreateModal(true);
          }}>
            <Text style={styles.modalCancel}>{t('common.cancel', 'Cancelar')}</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {formData.target === 'single' 
              ? t('admin.payments.selectResident', 'Seleccionar Residente')
              : t('admin.payments.selectResidents', 'Seleccionar Residentes')
            }
          </Text>
          {formData.target === 'multiple' && (
            <TouchableOpacity onPress={() => {
              setShowUserPicker(false);
              setShowCreateModal(true);
            }}>
              <Text style={styles.modalSave}>{t('common.done', 'Listo')}</Text>
            </TouchableOpacity>
          )}
          {formData.target === 'single' && <View style={{ width: 60 }} />}
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={userSearch}
            onChangeText={setUserSearch}
            placeholder={t('admin.payments.searchPlaceholder', 'Buscar por nombre, email o unidad...')}
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        {loadingUsers ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.lime} />
            <Text style={styles.loadingText}>{t('admin.payments.loadingResidents', 'Cargando residentes...')}</Text>
          </View>
        ) : (
          <ScrollView style={styles.userList}>
            {filteredUsers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>{t('admin.payments.noResidentsFound', 'No se encontraron residentes')}</Text>
              </View>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = formData.target === 'single'
                  ? formData.user_id === user.id
                  : selectedUsers.some(u => u.id === user.id);
                  
                return (
                  <TouchableOpacity
                    key={user.id}
                    style={[styles.userItem, isSelected && styles.userItemSelected]}
                    onPress={() => handleSelectUser(user)}
                  >
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {(user.full_name || user.name || user.email || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.full_name || user.name || user.email}</Text>
                      <Text style={styles.userUnit}>
                        {user.unit_number || user.unit || user.email}
                      </Text>
                    </View>
                    {formData.target === 'multiple' && (
                      <Ionicons 
                        name={isSelected ? 'checkbox' : 'square-outline'} 
                        size={24} 
                        color={isSelected ? COLORS.lime : COLORS.textMuted} 
                      />
                    )}
                    {formData.target === 'single' && isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.lime} />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  const renderProofModal = () => (
    <Modal
      visible={showProofModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        setShowProofModal(false);
        setSelectedProof(null);
        setRejectReason('');
      }}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => {
            setShowProofModal(false);
            setSelectedProof(null);
            setRejectReason('');
          }}>
            <Text style={styles.modalCancel}>{t('common.close', 'Cerrar')}</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{t('admin.payments.reviewProof', 'Revisar Comprobante')}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {selectedProof && (
            <>
              {/* Proof Image */}
              {selectedProof.proof_url && (
                <View style={styles.proofImageContainer}>
                  <Image 
                    source={{ uri: selectedProof.proof_url }} 
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
                    {selectedProof.user?.full_name || selectedProof.user?.name || '-'}
                  </Text>
                </View>
                <View style={styles.proofDetailRow}>
                  <Text style={styles.proofDetailLabel}>{t('admin.payments.proof.concept', 'Concepto')}:</Text>
                  <Text style={styles.proofDetailValue}>
                    {selectedProof.charge?.title || selectedProof.concept || '-'}
                  </Text>
                </View>
                <View style={styles.proofDetailRow}>
                  <Text style={styles.proofDetailLabel}>{t('admin.payments.proof.amount', 'Monto')}:</Text>
                  <Text style={[styles.proofDetailValue, { color: COLORS.lime, fontWeight: '700' }]}>
                    {formatCurrency(selectedProof.amount, selectedProof.currency)}
                  </Text>
                </View>
                <View style={styles.proofDetailRow}>
                  <Text style={styles.proofDetailLabel}>{t('admin.payments.proof.reference', 'Referencia')}:</Text>
                  <Text style={styles.proofDetailValue}>
                    {selectedProof.reference || '-'}
                  </Text>
                </View>
                <View style={styles.proofDetailRow}>
                  <Text style={styles.proofDetailLabel}>{t('admin.payments.proof.notes', 'Notas')}:</Text>
                  <Text style={styles.proofDetailValue}>
                    {selectedProof.notes || '-'}
                  </Text>
                </View>
                <View style={styles.proofDetailRow}>
                  <Text style={styles.proofDetailLabel}>{t('admin.payments.proof.submittedAt', 'Fecha envío')}:</Text>
                  <Text style={styles.proofDetailValue}>
                    {formatDateTime(selectedProof.created_at)}
                  </Text>
                </View>
              </View>

              {/* Reject Reason Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('admin.payments.proof.rejectReason', 'Razón de rechazo (si aplica)')}</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputMultiline]}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder={t('admin.payments.proof.rejectReasonPlaceholder', 'Ej: Imagen borrosa, monto incorrecto...')}
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.proofActionButtons}>
                <TouchableOpacity
                  style={[styles.proofActionButton, styles.rejectButton]}
                  onPress={() => handleRejectProof(selectedProof)}
                  disabled={processingProof}
                >
                  {processingProof ? (
                    <ActivityIndicator size="small" color={COLORS.textPrimary} />
                  ) : (
                    <>
                      <Ionicons name="close-circle" size={22} color={COLORS.textPrimary} />
                      <Text style={styles.proofActionButtonText}>{t('admin.payments.proof.reject', 'Rechazar')}</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.proofActionButton, styles.approveButton]}
                  onPress={() => handleVerifyProof(selectedProof)}
                  disabled={processingProof}
                >
                  {processingProof ? (
                    <ActivityIndicator size="small" color={COLORS.background} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={22} color={COLORS.background} />
                      <Text style={[styles.proofActionButtonText, { color: COLORS.background }]}>
                        {t('admin.payments.proof.approve', 'Aprobar')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderChargeDetailModal = () => (
    <Modal
      visible={showChargeDetailModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        setShowChargeDetailModal(false);
        setSelectedChargeDetail(null);
      }}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => {
            setShowChargeDetailModal(false);
            setSelectedChargeDetail(null);
          }}>
            <Text style={styles.modalCancel}>{t('common.close', 'Cerrar')}</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{t('admin.payments.chargeDetail', 'Detalle del Cobro')}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {selectedChargeDetail && (
            <>
              {/* Status Banner */}
              {(() => {
                const status = selectedChargeDetail.display_status || selectedChargeDetail.status || 'pending';
                const statusInfo = PAYMENT_STATUS[status] || PAYMENT_STATUS.pending;
                return (
                  <View style={[styles.detailStatusBanner, { backgroundColor: statusInfo.color + '20' }]}>
                    <Ionicons name={statusInfo.icon} size={24} color={statusInfo.color} />
                    <Text style={[styles.detailStatusText, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                );
              })()}

              {/* Charge Info */}
              <View style={styles.proofDetails}>
                <View style={styles.proofDetailRow}>
                  <Text style={styles.proofDetailLabel}>{t('admin.payments.detail.concept', 'Concepto')}:</Text>
                  <Text style={styles.proofDetailValue}>{selectedChargeDetail.title || '-'}</Text>
                </View>
                
                <View style={styles.proofDetailRow}>
                  <Text style={styles.proofDetailLabel}>{t('admin.payments.detail.amount', 'Monto')}:</Text>
                  <Text style={[styles.proofDetailValue, { color: COLORS.lime, fontWeight: '700' }]}>
                    {formatCurrency(selectedChargeDetail.amount, selectedChargeDetail.currency)}
                  </Text>
                </View>

                <View style={styles.proofDetailRow}>
                  <Text style={styles.proofDetailLabel}>{t('admin.payments.detail.dueDate', 'Vencimiento')}:</Text>
                  <Text style={styles.proofDetailValue}>{formatDate(selectedChargeDetail.due_date)}</Text>
                </View>

                <View style={styles.proofDetailRow}>
                  <Text style={styles.proofDetailLabel}>{t('admin.payments.detail.type', 'Tipo')}:</Text>
                  <Text style={styles.proofDetailValue}>{getPaymentTypeLabel(selectedChargeDetail.charge_type)}</Text>
                </View>

                {selectedChargeDetail.description && (
                  <View style={[styles.proofDetailRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                    <Text style={styles.proofDetailLabel}>{t('admin.payments.detail.description', 'Descripción')}:</Text>
                    <Text style={[styles.proofDetailValue, { marginTop: 4, maxWidth: '100%', textAlign: 'left' }]}>
                      {selectedChargeDetail.description}
                    </Text>
                  </View>
                )}
              </View>

              {/* Payment Info */}
              {(selectedChargeDetail.payment || selectedChargeDetail.payments?.length > 0) && (
                <>
                  <Text style={styles.detailSectionTitle}>{t('admin.payments.detail.paymentInfo', 'Información del Pago')}</Text>
                  
                  {(selectedChargeDetail.payments || [selectedChargeDetail.payment]).filter(Boolean).map((payment, idx) => (
                    <View key={payment.id || idx} style={styles.proofDetails}>
                      <View style={styles.proofDetailRow}>
                        <Text style={styles.proofDetailLabel}>{t('admin.payments.detail.resident', 'Residente')}:</Text>
                        <Text style={styles.proofDetailValue}>
                          {payment.user?.unit_number ? `${payment.user.unit_number} - ` : ''}
                          {payment.user?.name || payment.user?.full_name || '-'}
                        </Text>
                      </View>

                      <View style={styles.proofDetailRow}>
                        <Text style={styles.proofDetailLabel}>{t('admin.payments.detail.method', 'Método')}:</Text>
                        <Text style={styles.proofDetailValue}>
                          {payment.payment_method === 'card' ? 'Tarjeta' : 
                           payment.payment_method === 'proof' ? 'Comprobante' : 
                           payment.payment_method || '-'}
                        </Text>
                      </View>

                      {payment.paid_at && (
                        <View style={styles.proofDetailRow}>
                          <Text style={styles.proofDetailLabel}>{t('admin.payments.detail.paidAt', 'Pagado')}:</Text>
                          <Text style={styles.proofDetailValue}>{formatDateTime(payment.paid_at)}</Text>
                        </View>
                      )}

                      {payment.proof_submitted_at && (
                        <View style={styles.proofDetailRow}>
                          <Text style={styles.proofDetailLabel}>{t('admin.payments.detail.submittedAt', 'Enviado')}:</Text>
                          <Text style={styles.proofDetailValue}>{formatDateTime(payment.proof_submitted_at)}</Text>
                        </View>
                      )}

                      {payment.proof_reference && (
                        <View style={styles.proofDetailRow}>
                          <Text style={styles.proofDetailLabel}>{t('admin.payments.detail.reference', 'Referencia')}:</Text>
                          <Text style={styles.proofDetailValue}>{payment.proof_reference}</Text>
                        </View>
                      )}

                      {/* Proof Image */}
                      {(payment.proof_of_payment || payment.proof_url) && (
                        <View style={styles.proofImageContainer}>
                          <Text style={[styles.proofDetailLabel, { marginBottom: 8 }]}>
                            {t('admin.payments.detail.proof', 'Comprobante')}:
                          </Text>
                          <Image 
                            source={{ uri: payment.proof_of_payment || payment.proof_url }} 
                            style={styles.proofImage}
                            resizeMode="contain"
                          />
                        </View>
                      )}
                    </View>
                  ))}
                </>
              )}

              {/* Cancel Button */}
              {(selectedChargeDetail.display_status === 'pending' || selectedChargeDetail.status === 'active') && 
               !selectedChargeDetail.payment?.paid_at && (
                <TouchableOpacity
                  style={[styles.cancelButton, { marginTop: 16, justifyContent: 'center' }]}
                  onPress={() => {
                    setShowChargeDetailModal(false);
                    handleCancelCharge(selectedChargeDetail);
                  }}
                >
                  <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
                  <Text style={styles.cancelButtonText}>{t('admin.payments.cancelCharge', 'Cancelar Cobro')}</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  if (loading && activeTab === 'charges') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
          <Text style={styles.loadingText}>{t('admin.payments.loading', 'Cargando...')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{t('admin.payments.title', 'Cobros')}</Text>
          <Text style={styles.headerSubtitle}>{t('admin.payments.subtitle', 'Gestión de pagos')}</Text>
        </View>
        {activeTab === 'charges' && (
          <TouchableOpacity style={styles.addButton} onPress={() => {
            resetForm();
            setShowCreateModal(true);
          }}>
            <Ionicons name="add" size={22} color={COLORS.background} />
          </TouchableOpacity>
        )}
        {activeTab === 'settings' && isSuperAdmin() ? (
          <TouchableOpacity style={styles.configPaymentButton} onPress={() => router.push('/admin/payment-config')}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.purple} />
          </TouchableOpacity>
        ) : activeTab !== 'charges' ? <View style={{ width: 44 }} /> : null}
      </View>

      {/* Main Tabs */}
      {renderTabs()}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={COLORS.lime}
          />
        }
      >
        {activeTab === 'charges' && renderChargesTab()}
        {activeTab === 'proofs' && renderProofsTab()}
        {activeTab === 'settings' && renderSettingsTab()}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modals */}
      {renderCreateModal()}
      {renderBankAccountModal()}
      {renderUserPickerModal()}
      {renderProofModal()}
      {renderChargeDetailModal()}
    <LocationPickerModal />
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: scale(12),
    color: COLORS.textSecondary,
    fontSize: scale(14),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: scale(8),
  },
  headerTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  addButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  configPaymentButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.purple + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: scale(16),
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(4),
    marginBottom: scale(16),
  },
  mainTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    borderRadius: scale(10),
    gap: scale(6),
  },
  mainTabActive: {
    backgroundColor: COLORS.lime,
  },
  mainTabText: {
    fontSize: scale(13),
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  mainTabTextActive: {
    color: COLORS.background,
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: COLORS.danger,
    borderRadius: scale(10),
    minWidth: scale(20),
    height: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(6),
  },
  tabBadgeText: {
    color: COLORS.textPrimary,
    fontSize: scale(11),
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(16),
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
  chargeCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  cardIconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    backgroundColor: COLORS.teal + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
  },
  chargeConcept: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  chargeUser: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  chargeAmount: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(8),
    gap: scale(4),
  },
  statusText: {
    fontSize: scale(12),
    fontWeight: '500',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  dueDate: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger + '15',
    padding: scale(12),
    borderRadius: scale(10),
    marginTop: scale(12),
    gap: scale(6),
  },
  cancelButtonText: {
    color: COLORS.danger,
    fontWeight: '600',
    fontSize: scale(14),
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
  settingsContainer: {
    paddingBottom: scale(20),
  },
  settingsSection: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingsSectionTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  settingsSectionSubtitle: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginBottom: scale(16),
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: scale(12),
  },
  settingTextContainer: {
    marginLeft: scale(12),
    flex: 1,
  },
  settingLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  settingDescription: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  saveSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    padding: scale(16),
    borderRadius: scale(12),
    gap: scale(8),
  },
  saveSettingsButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.background,
  },
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
  modalSave: {
    fontSize: scale(16),
    color: COLORS.lime,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: scale(16),
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
  formHint: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginTop: scale(4),
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectorText: {
    fontSize: scale(16),
    color: COLORS.textPrimary,
  },
  selectorPlaceholder: {
    fontSize: scale(16),
    color: COLORS.textMuted,
  },
  targetGrid: {
    flexDirection: 'row',
    gap: scale(10),
  },
  targetButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(16),
    borderRadius: scale(12),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  targetButtonActive: {
    borderColor: COLORS.lime,
    backgroundColor: COLORS.lime + '15',
  },
  targetLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(8),
    textAlign: 'center',
  },
  targetLabelActive: {
    color: COLORS.lime,
    fontWeight: '600',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
  },
  typeButton: {
    width: (SCREEN_WIDTH - scale(52)) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(16),
    borderRadius: scale(12),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeButtonActive: {
    borderColor: COLORS.lime,
    backgroundColor: COLORS.lime + '15',
  },
  typeLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(8),
  },
  typeLabelActive: {
    color: COLORS.lime,
    fontWeight: '600',
  },
  methodsGrid: {
    flexDirection: 'row',
    gap: scale(10),
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(12),
    borderRadius: scale(10),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(6),
  },
  methodButtonActive: {
    borderColor: COLORS.lime,
    backgroundColor: COLORS.lime + '15',
  },
  methodLabel: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
  },
  methodLabelActive: {
    color: COLORS.lime,
    fontWeight: '600',
  },
  selectedUsersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginTop: scale(12),
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundTertiary,
    paddingVertical: scale(6),
    paddingLeft: scale(12),
    paddingRight: scale(8),
    borderRadius: scale(20),
    gap: scale(6),
  },
  selectedUserChipText: {
    fontSize: scale(13),
    color: COLORS.textPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    margin: scale(16),
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
  },
  searchIcon: {
    marginRight: scale(8),
  },
  searchInput: {
    flex: 1,
    paddingVertical: scale(14),
    fontSize: scale(16),
    color: COLORS.textPrimary,
  },
  userList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  userItemSelected: {
    backgroundColor: COLORS.lime + '10',
  },
  userAvatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.teal + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  userAvatarText: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.teal,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: scale(16),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  userUnit: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
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
  proofActionButtons: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: scale(8),
  },
  proofActionButton: {
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
  proofActionButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  detailStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(16),
    borderRadius: scale(12),
    marginBottom: scale(16),
    gap: scale(8),
  },
  detailStatusText: {
    fontSize: scale(16),
    fontWeight: '600',
  },
  detailSectionTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: scale(8),
    marginBottom: scale(12),
  },
  // Bank Accounts Styles
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(16),
  },
  addBankButton: {
    padding: scale(4),
  },
  emptyBankAccounts: {
    alignItems: 'center',
    padding: scale(32),
    backgroundColor: COLORS.surface,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  emptyBankAccountsText: {
    fontSize: scale(14),
    color: COLORS.textMuted,
    marginTop: scale(12),
    marginBottom: scale(16),
  },
  addFirstBankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lime,
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderRadius: scale(8),
    gap: scale(6),
  },
  addFirstBankButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.background,
  },
  bankAccountsList: {
    gap: scale(12),
  },
  bankAccountCard: {
    backgroundColor: COLORS.surface,
    borderRadius: scale(12),
    padding: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bankAccountCardDefault: {
    borderColor: COLORS.lime,
    borderWidth: 2,
  },
  bankAccountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  bankAccountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    flex: 1,
  },
  bankAccountName: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  defaultBadge: {
    backgroundColor: COLORS.lime + '20',
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(4),
  },
  defaultBadgeText: {
    fontSize: scale(10),
    fontWeight: '600',
    color: COLORS.lime,
    textTransform: 'uppercase',
  },
  bankAccountActions: {
    flexDirection: 'row',
    gap: scale(8),
  },
  bankAccountAction: {
    padding: scale(6),
  },
  bankAccountDetails: {
    gap: scale(4),
  },
  bankAccountNumber: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  bankAccountHolder: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  bankAccountType: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    textTransform: 'capitalize',
  },
  bankAccountInstructions: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginTop: scale(8),
    fontStyle: 'italic',
  },
  accountTypeRow: {
    flexDirection: 'row',
    gap: scale(12),
  },
  accountTypeButton: {
    flex: 1,
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  accountTypeButtonActive: {
    borderColor: COLORS.lime,
    backgroundColor: COLORS.lime + '15',
  },
  accountTypeText: {
    fontSize: scale(14),
    color: COLORS.textMuted,
  },
  accountTypeTextActive: {
    color: COLORS.lime,
    fontWeight: '600',
  },
  defaultCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingVertical: scale(8),
  },
  defaultCheckboxText: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
  },
});