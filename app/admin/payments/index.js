// app/admin/payments/index.js
// ISSY Admin - Gestor de Cobros Comunitarios (ProHome Dark Theme)
// Refactored: Modular components architecture

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
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
import { PaymentDetailModal } from './_components/PaymentDetailModal';
import { StatementModal } from './_components/StatementModal';
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
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showBankAccountModal, setShowBankAccountModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showChargeDetailModal, setShowChargeDetailModal] = useState(false);
  const [selectedChargeDetail, setSelectedChargeDetail] = useState(null);
  // Sprint 3 D5: modal nuevo por-residente (PaymentDetailModal).
  // El ChargeDetailModal legacy queda en el JSX por compat (cobros masivos
  // legacy) pero la Lista-Cobros del rediseño ya no lo abre.
  const [showPaymentDetailModal, setShowPaymentDetailModal] = useState(false);
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState(null);

  // Sprint 3 D11: el listado de proofs se movió a usePayments dentro de
  // ProofsTab. useProofs queda VIVO solo para mutations (verifyProof,
  // rejectProof, revertPayment) que se siguen disparando desde index.js /
  // ChargesTab. El proof seleccionado para <ProofReviewModal> ahora vive
  // en state local — antes era `proofs.selectedProof` (referencia rota
  // pre-D11: el hook nunca exportó ese getter).
  const [selectedProof, setSelectedProof] = useState(null);

  // Sprint 3 D13: state local para las 3 props que <ProofReviewModal> requiere
  // pero useProofs nunca exportó. El modal usa rejectReason como value del
  // TextInput de razón de rechazo, processingProof para deshabilitar botones
  // y mostrar spinner mientras la mutation está en flight. Antes pasábamos
  // `proofs.X` (undefined) — input uncontrolled, sin spinner, doble-tap
  // posible. Ahora controlados localmente.
  const [rejectReason, setRejectReason] = useState('');
  const [processingProof, setProcessingProof] = useState(false);

  // ============================================
  // HOOKS
  // ============================================
  const charges = useCharges(t, selectedLocationId);
  const proofs = useProofs(selectedLocationId, () => charges.refresh());
  const settings = useSettings(t);
  const bankAccounts = useBankAccounts(selectedLocationId);

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
    } else if (activeTab === 'settings') {
      settings.fetchSettings();
      bankAccounts.fetchBankAccounts();
    }
    // Sprint 3 D11: 'proofs' tab ya no necesita fetch desde index.js —
    // ProofsTab usa usePayments internamente y se auto-carga al montar.
  }, [activeTab, charges.filter, selectedLocationId]);

  // Clear users when location changes
  useEffect(() => {
    charges.clearUsers();
  }, [selectedLocationId]);

  // ============================================
  // HANDLERS
  // ============================================
  // Sprint 3 Hotfix: `onRefresh` global eliminado. El outer <ScrollView>
  // con RefreshControl ya no existe (causaba nested-virtualized-list warning).
  // Cada tab maneja su propio pull-to-refresh ahora:
  //   - ChargesTab → FlatList interno con RefreshControl (D10)
  //   - ProofsTab → FlatList interno con RefreshControl (D11)
  //   - SettingsTab → sin pull-to-refresh; auto-fetchea en tab change via
  //     el useEffect de arriba. Trade-off aceptado en hotfix.

  const handleOpenStatementModal = async () => {
    await charges.fetchUsers();
    setShowStatementModal(true);
  };  const handleOpenCreateModal = () => {
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
            setSelectedChargeDetail(null);
      setShowCreateModal(false);
    }
  };

  // Sprint 3 D5: el callback recibe un `payment` (no charge). Abre el modal
  // nuevo PaymentDetailModal. El ChargeDetailModal legacy queda inalcanzable
  // desde Lista-Cobros (se mantiene en el JSX por compat — D13 lo limpia).
  const handleOpenChargeDetail = (payment) => {
    setSelectedPaymentDetail(payment);
    setShowPaymentDetailModal(true);
  };

  const handleCancelCharge = async (reason = null) => {
    // Sprint 2 D7: el modal ahora pasa una razón opcional desde el
    // CancelConfirmationModal. El backend D1 ya la persiste en
    // community_charges.cancellation_reason.
    if (selectedChargeDetail) {
      setShowChargeDetailModal(false);
      await charges.cancelCharge(selectedChargeDetail, reason);
      setSelectedChargeDetail(null);
    }
  };

  // Sprint 3 D11: state local en vez de proofs.selectProof / proofs.clearSelectedProof
  // (que nunca existieron en useProofs — referencias rotas pre-D11).
  // Sprint 3 D13: reset de rejectReason al abrir/cerrar para que el modal
  // arranque limpio en cada review.
  const handleOpenProofReview = (proof) => {
    setSelectedProof(proof);
    setRejectReason('');
    setShowProofModal(true);
  };

  const handleCloseProofReview = () => {
    setSelectedProof(null);
    setRejectReason('');
    setShowProofModal(false);
  };

  // Sprint 3 D13: wrappers que togglean processingProof local para que el
  // modal pueda deshabilitar botones + mostrar spinner durante la mutation.
  // Pasamos rejectReason explícitamente a rejectProof (la mutation acepta
  // el reason como 2do arg desde antes — solo no se estaba conectando).
  const handleVerifyProof = async () => {
    setProcessingProof(true);
    try {
      const success = await proofs.verifyProof(selectedProof);
      if (success) {
        setSelectedChargeDetail(null);
        setShowProofModal(false);
        setSelectedProof(null);
        setRejectReason('');
      }
    } finally {
      setProcessingProof(false);
    }
  };

  const handleRejectProof = async () => {
    setProcessingProof(true);
    try {
      const success = await proofs.rejectProof(selectedProof, rejectReason);
      if (success) {
        setSelectedChargeDetail(null);
        setShowProofModal(false);
        setSelectedProof(null);
        setRejectReason('');
      }
    } finally {
      setProcessingProof(false);
    }
  };

  // Sprint 3 D12 (Fix 2): openAddBankAccount no existe en useBankAccounts.
  // Antes crasheaba al tap. El hook expone resetBankAccountForm para limpiar
  // el form antes de abrir el modal en modo "agregar".
  const handleOpenAddBankAccount = () => {
    if (typeof bankAccounts.resetBankAccountForm === 'function') {
      bankAccounts.resetBankAccountForm();
    }
    setShowBankAccountModal(true);
  };

  // Sprint 3 D12 (Fix 3): rename openEditBankAccount → editBankAccount.
  // Antes era undefined function — crash al tap "Editar".
  const handleOpenEditBankAccount = (account) => {
    bankAccounts.editBankAccount(account);
    setShowBankAccountModal(true);
  };

  // Sprint 3 D12 (Fix 4): handler nuevo con Alert.alert confirm. Antes la
  // prop apuntaba directo a bankAccounts.handleDeleteBankAccount (no existía
  // — crash al tap Eliminar). Safety net obligatoria para acción destructiva.
  const handleDeleteBankAccount = (account) => {
    Alert.alert(
      t('admin.payments.settings.deleteTitle', 'Eliminar cuenta bancaria'),
      t(
        'admin.payments.settings.deleteConfirm',
        `¿Eliminar la cuenta "${account.bank_name}"? Los residentes ya no podrán enviar comprobantes a esta cuenta.`
      ),
      [
        { text: t('common.cancel', 'Cancelar'), style: 'cancel' },
        {
          text: t('common.delete', 'Eliminar'),
          style: 'destructive',
          onPress: async () => {
            if (typeof bankAccounts.deleteBankAccount === 'function') {
              await bankAccounts.deleteBankAccount(account.id);
            }
          },
        },
      ]
    );
  };

  // Sprint 3 D12 (Fix 5): handler nuevo con confirm. Antes apuntaba a
  // bankAccounts.handleSetDefaultBankAccount (no existía — crash).
  const handleSetDefaultBankAccount = (account) => {
    if (account.is_default) return; // ya es default, no-op
    Alert.alert(
      t('admin.payments.settings.setDefaultTitle', 'Cuenta predeterminada'),
      t(
        'admin.payments.settings.setDefaultConfirm',
        `Marcar "${account.bank_name}" como cuenta predeterminada para nuevos comprobantes?`
      ),
      [
        { text: t('common.cancel', 'Cancelar'), style: 'cancel' },
        {
          text: t('admin.payments.settings.setDefault', 'Marcar'),
          onPress: async () => {
            if (typeof bankAccounts.setDefaultBankAccount === 'function') {
              await bankAccounts.setDefaultBankAccount(account.id);
            }
          },
        },
      ]
    );
  };

  const handleSaveBankAccount = async () => {
    const success = await bankAccounts.saveBankAccount();
    if (success) {
            setSelectedChargeDetail(null);
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
        {/* Sprint 3 D11: badge eliminado — el count de proofs pendientes ahora
            vive dentro de ProofsTab (usePayments) y no es accesible desde acá
            sin lifting up o un endpoint dedicado de count. Si se necesita el
            badge de vuelta, se puede agregar con un endpoint /admin/payments/
            count?status=proof_submitted en un sprint futuro. */}
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
          <TouchableOpacity style={styles.statementButton} onPress={handleOpenStatementModal}>
            <Ionicons name="document-text" size={20} color={COLORS.teal} />
          </TouchableOpacity>
        )}
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

      {/* Sprint 3 Hotfix: el outer <ScrollView> que envolvía los 3 tabs fue
          reemplazado por <View flex:1>. Razón: los FlatList internos de
          ChargesTab + ProofsTab (post-D10/D11) emitían el warning
          "VirtualizedLists should never be nested inside plain ScrollViews
          with the same orientation" — la virtualización se rompía y todas
          las cards se renderizaban a la vez. Cada tab ahora maneja su propio
          scroll + RefreshControl internamente. SettingsTab (con ScrollView
          interno propio) también gana: deja de estar doble-nested.
          Side effect aceptado: el pull-to-refresh global del SettingsTab
          desaparece — el tab ya auto-fetchea en mount via useEffect. */}
      <View style={{ flex: 1 }}>
        {activeTab === 'charges' && (
          <ChargesTab
            charges={charges.charges}
            stats={charges.stats}
            loading={charges.loading}
            filter={charges.filter}
            setFilter={charges.setFilter}
            onChargePress={handleOpenChargeDetail}
            onCreatePress={handleOpenCreateModal}
            onRevertPayment={async (payment) => {
          const success = await proofs.revertPayment(payment);
          if (success) {
            setSelectedChargeDetail(null);
            charges.fetchCharges();
            setShowChargeDetailModal(false);
          }
        }}
        PAYMENT_STATUS={PAYMENT_STATUS}
            PAYMENT_TYPES={PAYMENT_TYPES}
          />
        )}
        
        {activeTab === 'proofs' && (
          // Sprint 3 D11: ProofsTab maneja su propio fetch/loading/refresh
          // via usePayments. index.js solo wirea el callback de tap.
          <ProofsTab
            onProofPress={handleOpenProofReview}
          />
        )}
        
        {activeTab === 'settings' && (
          // Sprint 3 D12: fixes de 6 referencias rotas al hook useBankAccounts.
          //   Fix 1: loadingBankAccounts → bankAccounts.loading (rename)
          //   Fix 4: onDeleteBankAccount → handleDeleteBankAccount con confirm
          //   Fix 5: onSetDefaultBankAccount → handleSetDefaultBankAccount con confirm
          // Los fixes 2, 3, 6, 7 se aplican en otros lugares (handlers + modal).
          <SettingsTab
            settings={settings.settings}
            loadingSettings={settings.loadingSettings}
            savingSettings={settings.savingSettings}
            bankAccounts={bankAccounts.bankAccounts}
            loadingBankAccounts={bankAccounts.loading}
            onSettingChange={settings.updateSetting}
            onSaveSettings={settings.saveSettings}
            onAddBankAccount={handleOpenAddBankAccount}
            onEditBankAccount={handleOpenEditBankAccount}
            onDeleteBankAccount={handleDeleteBankAccount}
            onSetDefaultBankAccount={handleSetDefaultBankAccount}
          />
        )}
      </View>

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
        // Sprint 3 D12 (Fix 6): el modal invoca onFieldChange(key, value)
        // pero useBankAccounts.updateBankAccountForm espera un partial object.
        // Adapter inline para preservar la API del modal sin tocar el hook.
        // Antes: bankAccounts.updateBankAccountField (no existía — modal inútil).
        onFieldChange={(key, value) =>
          bankAccounts.updateBankAccountForm({ [key]: value })
        }
        onSave={handleSaveBankAccount}
        // Sprint 3 D12 (Fix 7): rename savingBankAccount → saving.
        saving={bankAccounts.saving}
      />

      {/* Sprint 3 D11: `proof` viene del state local `selectedProof` (antes
          era `proofs.selectedProof`, referencia rota).
          Sprint 3 D13: rejectReason / onRejectReasonChange / processing
          ahora vienen de state local en este componente (antes eran
          `proofs.rejectReason` / `proofs.setRejectReason` / `proofs.processingProof`
          — useProofs nunca exportó esos campos. El modal SÍ requiere las 3
          props para funcionar: TextInput controlado + botones disabled + spinner). */}
      <ProofReviewModal
        visible={showProofModal}
        onClose={handleCloseProofReview}
        proof={selectedProof}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onVerify={handleVerifyProof}
        onReject={handleRejectProof}
        processing={processingProof}
      />

      <ChargeDetailModal
        visible={showChargeDetailModal}
        onClose={() => {
          setShowChargeDetailModal(false);
          setSelectedChargeDetail(null);
        }}
        charge={selectedChargeDetail}
        onCancelCharge={handleCancelCharge}
        onPaymentChanged={() => {
          // Sprint 2 D6: tras cancelar un pago individual desde la vista
          // del modal, refrescamos la lista padre para que stats y badges
          // del cobro se actualicen.
          charges.fetchCharges();
        }}
        onVerifyProof={async (payment) => {
          console.log("Verificando payment:", payment.id);
          const success = await proofs.verifyProof(payment);
          console.log("Resultado verifyProof:", success);
          if (success) {
            setSelectedChargeDetail(null);
            charges.fetchCharges();
            setShowChargeDetailModal(false);
          }
        }}
        onRejectProof={async (payment, reason) => {
          const success = await proofs.rejectProof(payment, reason);
          if (success) {
            setSelectedChargeDetail(null);
            charges.fetchCharges();
            setShowChargeDetailModal(false);
          }
        }}
        onRevertPayment={async (payment) => {
          const success = await proofs.revertPayment(payment);
          if (success) {
            setSelectedChargeDetail(null);
            charges.fetchCharges();
            setShowChargeDetailModal(false);
          }
        }}
        PAYMENT_STATUS={PAYMENT_STATUS}
        PAYMENT_TYPES={PAYMENT_TYPES}
      />

      {/* Sprint 3 D5: nuevo modal por-residente (Detalle-Cobro mockup #3).
          Coexiste con ChargeDetailModal legacy de arriba (que ya no se abre
          desde Lista-Cobros pero queda hasta D13 polish). */}
      <PaymentDetailModal
        visible={showPaymentDetailModal}
        payment={selectedPaymentDetail}
        onClose={() => {
          setShowPaymentDetailModal(false);
          setSelectedPaymentDetail(null);
        }}
        onRegisterCashSuccess={() => {
          // Refrescar lista de cobros y stats KPIs tras cobro en efectivo
          if (charges?.fetchCharges) {
            charges.fetchCharges();
          }
        }}
      />

      <StatementModal
        visible={showStatementModal}
        onClose={() => setShowStatementModal(false)}
        locationId={selectedLocation?.id}
        locationName={selectedLocation?.name}
        users={charges.users}
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
  statementButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.teal + "20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(8),
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
  // Sprint 3 Hotfix: estilos `content` y `scrollContent` eliminados — eran
  // del outer ScrollView que se reemplazó por <View flex:1>.
});
