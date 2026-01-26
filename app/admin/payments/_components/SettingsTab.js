// app/admin/payments/components/SettingsTab.js
// ISSY Admin - Settings Tab Component

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, scale } from '../_constants';

export function SettingsTab({
  settings,
  loadingSettings,
  savingSettings,
  bankAccounts,
  loadingBankAccounts,
  onSettingChange,
  onSaveSettings,
  onAddBankAccount,
  onEditBankAccount,
  onDeleteBankAccount,
  onSetDefaultBankAccount,
}) {
  const { t } = useTranslation();

  if (loadingSettings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.lime} />
        <Text style={styles.loadingText}>{t('admin.payments.loadingSettings', 'Cargando configuración...')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Payment Methods Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
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
            onValueChange={(value) => onSettingChange('card_payments_enabled', value)}
            trackColor={{ false: COLORS.border, true: COLORS.lime + '50' }}
            thumbColor={settings.card_payments_enabled ? COLORS.lime : COLORS.textMuted}
          />
        </View>
        
        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
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
            onValueChange={(value) => onSettingChange('proof_payments_enabled', value)}
            trackColor={{ false: COLORS.border, true: COLORS.lime + '50' }}
            thumbColor={settings.proof_payments_enabled ? COLORS.lime : COLORS.textMuted}
          />
        </View>
      </View>

      {/* Bank Accounts Section */}
      {settings.proof_payments_enabled && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {t('admin.payments.settings.bankAccounts', 'Cuentas Bancarias')}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {t('admin.payments.settings.bankAccountsDesc', 'Agrega las cuentas donde los residentes pueden depositar')}
              </Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={onAddBankAccount}>
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
              <TouchableOpacity style={styles.addFirstButton} onPress={onAddBankAccount}>
                <Ionicons name="add" size={20} color={COLORS.background} />
                <Text style={styles.addFirstButtonText}>
                  {t('admin.payments.addFirstBankAccount', 'Agregar cuenta')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.bankAccountsList}>
              {bankAccounts.map((account) => (
                <BankAccountCard
                  key={account.id}
                  account={account}
                  onEdit={() => onEditBankAccount(account)}
                  onDelete={() => onDeleteBankAccount(account)}
                  onSetDefault={() => onSetDefaultBankAccount(account)}
                  t={t}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Save Button */}
      <TouchableOpacity 
        style={styles.saveButton}
        onPress={onSaveSettings}
        disabled={savingSettings}
      >
        {savingSettings ? (
          <ActivityIndicator size="small" color={COLORS.background} />
        ) : (
          <>
            <Ionicons name="save" size={20} color={COLORS.background} />
            <Text style={styles.saveButtonText}>
              {t('admin.payments.settings.save', 'Guardar Configuración')}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// Bank Account Card Sub-component
function BankAccountCard({ account, onEdit, onDelete, onSetDefault, t }) {
  return (
    <View style={[styles.bankCard, account.is_default && styles.bankCardDefault]}>
      <View style={styles.bankHeader}>
        <View style={styles.bankInfo}>
          <Text style={styles.bankName}>{account.bank_name}</Text>
          {account.is_default && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>{t('common.default', 'Principal')}</Text>
            </View>
          )}
        </View>
        <View style={styles.bankActions}>
          {!account.is_default && (
            <TouchableOpacity onPress={onSetDefault} style={styles.bankAction}>
              <Ionicons name="star-outline" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onEdit} style={styles.bankAction}>
            <Ionicons name="pencil" size={18} color={COLORS.teal} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.bankAction}>
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.bankDetails}>
        <Text style={styles.accountNumber}>{account.account_number}</Text>
        <Text style={styles.accountHolder}>{account.account_name}</Text>
        {account.account_type && (
          <Text style={styles.accountType}>
            {account.account_type === 'savings' ? 'Ahorro' : 
             account.account_type === 'checking' ? 'Cheques' : 
             account.account_type}
          </Text>
        )}
      </View>
      {account.instructions && (
        <Text style={styles.bankInstructions}>{account.instructions}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: scale(20),
  },
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
  section: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(16),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  sectionSubtitle: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
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
  addButton: {
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
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lime,
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderRadius: scale(8),
    gap: scale(6),
  },
  addFirstButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.background,
  },
  bankAccountsList: {
    gap: scale(12),
  },
  bankCard: {
    backgroundColor: COLORS.surface,
    borderRadius: scale(12),
    padding: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bankCardDefault: {
    borderColor: COLORS.lime,
    borderWidth: 2,
  },
  bankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  bankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    flex: 1,
  },
  bankName: {
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
  bankActions: {
    flexDirection: 'row',
    gap: scale(8),
  },
  bankAction: {
    padding: scale(6),
  },
  bankDetails: {
    gap: scale(4),
  },
  accountNumber: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  accountHolder: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  accountType: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    textTransform: 'capitalize',
  },
  bankInstructions: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginTop: scale(8),
    fontStyle: 'italic',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    padding: scale(16),
    borderRadius: scale(12),
    gap: scale(8),
  },
  saveButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.background,
  },
});

export default SettingsTab;
