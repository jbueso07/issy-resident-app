// app/admin/payments/index.js
// ISSY Admin - Gestor de Cobros Comunitarios (ProHome Dark Theme)
// Refactored: Modular components architecture

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { useAdminLocation } from '../../../src/context/AdminLocationContext';
import { LocationPickerModal } from '../../../src/components/AdminLocationPicker';

// Constants & Helpers
import { 
  COLORS, 
  scale, 
  getPaymentStatus, 
  getPaymentTypes,
  getDefaultFormData,
  getDefaultBankAccountForm,
} from './_constants';

// Hooks
import { useCharges } from './_hooks/useCharges';
import { useProofs } from './_hooks/useProofs';
import { useSettings } from './_hooks/useSettings';
import { useBankAccounts } from './_hooks/useBankAccounts';

// Components
import { ChargesTab } from './_components/ChargesTab';
import { ProofsTab } from './_components/ProofsTab';
import { SettingsTab } from './_components/SettingsTab';
import { CreateChargeModal } from './_components/CreateChargeModal';
import { BankAccountModal } from './_components/BankAccountModal';
import { UserPickerModal } from './_components/UserPickerModal';
import { ProofReviewModal } from './_components/ProofReviewModal';
import { ChargeDetailModal } from './_components/ChargeDetailModal';

export default function AdminPayments() {
  const { t } = useTranslation();
  const { user, profile, isSuperAdmin } = useAuth();
  const { 
    selectedLocationId, 
    selectedLocation, 
    canSwitchLocation, 
    openPicker 
  } = useAdminLocation();
  const router = useRouter();
  
  // i18n configs
  const PAYMENT_STATUS = getPaymentStatus(t);
  const PAYMENT_TYPES = getPaymentTypes(t);
  
  // ============================================
  // STATE
  // ============================================
  const [activeTab, setActiveTab] = useState('charges');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showBankAccountModal, setShowBankAccountModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showChargeDetailModal, setShowChargeDetailModal] = useState(false);
  const [selectedChargeDetail, setSelectedChargeDetail] = useState(null);

  // ============================================
  // HOOKS
  // ============================================
  const charges = useCharges(t, selectedLocationId);
  const proofs = useProofs(t);
  const settings = useSettings(t);
  const bankAccounts = useBankAccounts(t, selectedLocationId);

  // ============================================
  // AUTH CHECK
  // ============================================
  const userRole = profile?.role || user?.role || 'user';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert(
        t('admin.payments.accessDenied', 'Acceso Denegado'),
        t('admin.payments.noPermissions', 'No tienes permisos para acceder a esta sección')
      );
      router.back();
    }
  }, [isAdmin]);

  // ============================================
  // LOAD DATA ON TAB CHANGE
  // ============================================
  useEffect(() => {
    if (activeTab === 'charges') {
      charges.fetchCharges();
    } else if (activeTab === 'proofs') {
      proofs.fetchPendingProofs();
    } else if (activeTab === 'settings') {
      settings.fetchSettings();
      bankAccounts.fetchBankAccounts();
    }
  }, [activeTab, charges.filter, selectedLocationId]);

  // Clear users when location changes
  useEffect(() => {
    charges.clearUsers();
  }, [selectedLocationId]);

  // ============================================
  // HANDLERS
  // ============================================
  const onRefresh = useCallback(() => {
    if (activeTab === 'charges') {
      charges.refresh();
    } else if (activeTab === 'proofs') {
      proofs.refresh();
    } else if (activeTab === 'settings') {
      settings.fetchSettings();
      bankAccounts.fetchBankAccounts();
    }
  }, [activeTab]);

  const handleOpenCreateModal = () => {
    charges.resetForm();
    setShowCreateModal(true);
  };

  const handleOpenUserPicker = async () => {
    setShowCreateModal(false);
    await charges.fetchUsers();
    setShowUserPicker(true);
  };

  const handleSelectUser = (user) => {
    const result = charges.handleSelectUser(user);
    if (result === 'close') {
      setShowUserPicker(false);
      setShowCreateModal(true);
    }
  };

  const handleCloseUserPicker = () => {
    setShowUserPicker(false);
    setShowCreateModal(true);
  };

  const handleCreateCharge = async () => {
    const success = await charges.createCharge();
    if (success) {
      setShowCreateModal(false);
    }
  };

  const handleOpenChargeDetail = (charge) => {
    setSelectedChargeDetail(charge);
    setShowChargeDetailModal(true);
  };

  const handleCancelCharge = async () => {
    if (selectedChargeDetail) {
      setShowChargeDetailModal(false);
      await charges.cancelCharge(selectedChargeDetail);
      setSelectedChargeDetail(null);
    }
  };

  const handleOpenProofReview = (proof) => {
    proofs.selectProof(proof);
    setShowProofModal(true);
  };

  const handleCloseProofReview = () => {
    proofs.clearSelectedProof();
    setShowProofModal(false);
  };

  const handleVerifyProof = async () => {
    const success = await proofs.verifyProof(proofs.selectedProof);
    if (success) {
      setShowProofModal(false);
    }
  };

  const handleRejectProof = async () => {
    const success = await proofs.rejectProof(proofs.selectedProof);
    if (success) {
      setShowProofModal(false);
    }
  };

  const handleOpenAddBankAccount = () => {
    bankAccounts.openAddBankAccount();
    setShowBankAccountModal(true);
  };

  const handleOpenEditBankAccount = (account) => {
    bankAccounts.openEditBankAccount(account);
    setShowBankAccountModal(true);
  };

  const handleSaveBankAccount = async () => {
    const success = await bankAccounts.saveBankAccount();
    if (success) {
      setShowBankAccountModal(false);
    }
  };

  const handleCloseBankAccountModal = () => {
    bankAccounts.resetBankAccountForm();
    setShowBankAccountModal(false);
  };

  // ============================================
  // RENDER: TABS
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
        {proofs.pendingProofs.length > 0 && (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{proofs.pendingProofs.length}</Text>
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
  // MAIN RENDER
  // ============================================
  if (charges.loading && activeTab === 'charges') {
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
          {canSwitchLocation && selectedLocation ? (
            <TouchableOpacity onPress={openPicker} style={styles.locationSelector}>
              <Ionicons name="location" size={14} color={COLORS.teal} />
              <Text style={styles.headerSubtitleLocation}>{selectedLocation.name}</Text>
              <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : (
            <Text style={styles.headerSubtitle}>{t('admin.payments.subtitle', 'Gestión de pagos')}</Text>
          )}
        </View>
        {activeTab === 'charges' && (
          <TouchableOpacity style={styles.addButton} onPress={handleOpenCreateModal}>
            <Ionicons name="add" size={22} color={COLORS.background} />
          </TouchableOpacity>
        )}
        {activeTab === 'settings' && isSuperAdmin && isSuperAdmin() ? (
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
            refreshing={charges.refreshing || proofs.refreshing} 
            onRefresh={onRefresh} 
            tintColor={COLORS.lime}
          />
        }
      >
        {activeTab === 'charges' && (
          <ChargesTab
            charges={charges.charges}
            stats={charges.stats}
            loading={charges.loading}
            filter={charges.filter}
            setFilter={charges.setFilter}
            onChargePress={handleOpenChargeDetail}
            onCreatePress={handleOpenCreateModal}
            PAYMENT_STATUS={PAYMENT_STATUS}
            PAYMENT_TYPES={PAYMENT_TYPES}
          />
        )}
        
        {activeTab === 'proofs' && (
          <ProofsTab
            pendingProofs={proofs.pendingProofs}
            loadingProofs={proofs.loadingProofs}
            onProofPress={handleOpenProofReview}
          />
        )}
        
        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings.settings}
            loadingSettings={settings.loadingSettings}
            savingSettings={settings.savingSettings}
            bankAccounts={bankAccounts.bankAccounts}
            loadingBankAccounts={bankAccounts.loadingBankAccounts}
            onSettingChange={settings.updateSetting}
            onSaveSettings={settings.saveSettings}
            onAddBankAccount={handleOpenAddBankAccount}
            onEditBankAccount={handleOpenEditBankAccount}
            onDeleteBankAccount={bankAccounts.handleDeleteBankAccount}
            onSetDefaultBankAccount={bankAccounts.handleSetDefaultBankAccount}
          />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modals */}
      <CreateChargeModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        formData={charges.formData}
        onFormChange={charges.updateFormData}
        selectedUsers={charges.selectedUsers}
        onSelectUser={handleSelectUser}
        onUserPickerOpen={handleOpenUserPicker}
        onSubmit={handleCreateCharge}
        saving={charges.saving}
      />

      <UserPickerModal
        visible={showUserPicker}
        onClose={handleCloseUserPicker}
        users={charges.users}
        loadingUsers={charges.loadingUsers}
        selectedUserId={charges.formData.user_id}
        selectedUsers={charges.selectedUsers}
        target={charges.formData.target}
        onSelectUser={handleSelectUser}
        onDone={handleCloseUserPicker}
      />

      <BankAccountModal
        visible={showBankAccountModal}
        onClose={handleCloseBankAccountModal}
        editingBankAccount={bankAccounts.editingBankAccount}
        bankAccountForm={bankAccounts.bankAccountForm}
        onFieldChange={bankAccounts.updateBankAccountField}
        onSave={handleSaveBankAccount}
        saving={bankAccounts.savingBankAccount}
      />

      <ProofReviewModal
        visible={showProofModal}
        onClose={handleCloseProofReview}
        proof={proofs.selectedProof}
        rejectReason={proofs.rejectReason}
        onRejectReasonChange={proofs.setRejectReason}
        onVerify={handleVerifyProof}
        onReject={handleRejectProof}
        processing={proofs.processingProof}
      />

      <ChargeDetailModal
        visible={showChargeDetailModal}
        onClose={() => {
          setShowChargeDetailModal(false);
          setSelectedChargeDetail(null);
        }}
        charge={selectedChargeDetail}
        onCancelCharge={handleCancelCharge}
        onVerifyProof={async (payment) => {
          const success = await proofs.verifyProof(payment);
          if (success) {
            charges.fetchCharges();
            setShowChargeDetailModal(false);
          }
        }}
        onRejectProof={async (payment) => {
          const success = await proofs.rejectProof(payment);
          if (success) {
            charges.fetchCharges();
            setShowChargeDetailModal(false);
          }
        }}
        PAYMENT_STATUS={PAYMENT_STATUS}
        PAYMENT_TYPES={PAYMENT_TYPES}
      />

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
  locationSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    marginTop: scale(4),
  },
  headerSubtitleLocation: {
    fontSize: scale(14),
    color: COLORS.teal,
    fontWeight: "500",
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
});
