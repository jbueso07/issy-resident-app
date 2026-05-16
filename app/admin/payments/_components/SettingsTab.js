// app/admin/payments/_components/SettingsTab.js
// ISSY Admin - Settings Tab (Sprint 3 D12 refactor)
//
// Refactor visual del tab de configuración del módulo de pagos al theme
// MD3 + lucide (consistente con ChargesTab post-D10 y ProofsTab post-D11).
//
// Contenido:
//   - 2 toggles: card_payments_enabled, proof_payments_enabled (vienen de
//     useSettings).
//   - Lista de cuentas bancarias (multi-account, viene de useBankAccounts)
//     condicionada a proof_payments_enabled=true.
//   - Botón "Guardar configuración" (solo persiste los 2 toggles — las
//     cuentas bancarias persisten en su propio CRUD).
//
// NO toca la lógica/handlers, solo el shell visual. Los 6 fixes de
// referencias rotas en index.js se aplican en T2 del mismo PR.
//
// Tech debt para D13:
//   - useSettings.bank_name / bank_account_* (legacy single-account, ya no
//     se usa porque las cuentas viven en useBankAccounts).

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  FileText,
  Building2,
  Plus,
  Star,
  Pencil,
  Trash2,
  Save,
} from 'lucide-react-native';
import { colors, spacing, typography, radii } from '../_styles/theme';

/**
 * @param {Object} props
 * @param {Object} props.settings - { card_payments_enabled, proof_payments_enabled, ... }
 * @param {boolean} props.loadingSettings
 * @param {boolean} props.savingSettings
 * @param {Array} props.bankAccounts
 * @param {boolean} props.loadingBankAccounts
 * @param {(key: string, value: any) => void} props.onSettingChange
 * @param {() => void} props.onSaveSettings
 * @param {() => void} props.onAddBankAccount
 * @param {(account: Object) => void} props.onEditBankAccount
 * @param {(account: Object) => void} props.onDeleteBankAccount
 * @param {(account: Object) => void} props.onSetDefaultBankAccount
 */
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
      <View style={styles.fullSpinner}>
        <ActivityIndicator size="large" color={colors.primaryContainer} />
        <Text style={styles.loadingText}>
          {t('admin.payments.settings.loading', 'Cargando configuración...')}
        </Text>
      </View>
    );
  }

  const cardEnabled = !!settings?.card_payments_enabled;
  const proofEnabled = !!settings?.proof_payments_enabled;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Sección 1: Métodos de Pago */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>
          {t('admin.payments.settings.methodsTitle', 'Métodos de pago')}
        </Text>

        {/* Toggle 1: card payments */}
        <View style={styles.settingRow}>
          <View style={styles.settingLabelGroup}>
            <CreditCard size={20} color={colors.onSurfaceVariant} strokeWidth={2} />
            <View style={styles.settingTexts}>
              <Text style={styles.settingTitle}>
                {t('admin.payments.settings.cardTitle', 'Pagos con tarjeta')}
              </Text>
              <Text style={styles.settingSubtitle}>
                {t(
                  'admin.payments.settings.cardSubtitle',
                  'Permite cobrar con tarjeta vía Clinpays.'
                )}
              </Text>
            </View>
          </View>
          <Switch
            value={cardEnabled}
            onValueChange={(v) => onSettingChange?.('card_payments_enabled', v)}
            trackColor={{ false: colors.outline, true: colors.primaryContainer }}
            thumbColor={cardEnabled ? colors.onPrimaryContainer : '#fff'}
          />
        </View>

        {/* Toggle 2: proof payments */}
        <View style={[styles.settingRow, styles.settingRowLast]}>
          <View style={styles.settingLabelGroup}>
            <FileText size={20} color={colors.onSurfaceVariant} strokeWidth={2} />
            <View style={styles.settingTexts}>
              <Text style={styles.settingTitle}>
                {t('admin.payments.settings.proofTitle', 'Comprobantes de pago')}
              </Text>
              <Text style={styles.settingSubtitle}>
                {t(
                  'admin.payments.settings.proofSubtitle',
                  'Permite que los residentes envíen comprobante de transferencia.'
                )}
              </Text>
            </View>
          </View>
          <Switch
            value={proofEnabled}
            onValueChange={(v) => onSettingChange?.('proof_payments_enabled', v)}
            trackColor={{ false: colors.outline, true: colors.primaryContainer }}
            thumbColor={proofEnabled ? colors.onPrimaryContainer : '#fff'}
          />
        </View>
      </View>

      {/* Sección 2: Bank Accounts — solo si proof_payments_enabled */}
      {proofEnabled && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>
              {t('admin.payments.settings.bankAccountsTitle', 'Cuentas bancarias')}
            </Text>
            <Pressable
              onPress={onAddBankAccount}
              style={({ pressed }) => [styles.addBtn, pressed && styles.btnPressed]}
              accessibilityLabel={t('admin.payments.settings.addAccount', 'Agregar cuenta')}
            >
              <Plus size={18} color={colors.onPrimaryContainer} strokeWidth={2} />
              <Text style={styles.addBtnText}>
                {t('admin.payments.settings.addAccount', 'Agregar')}
              </Text>
            </Pressable>
          </View>

          {loadingBankAccounts ? (
            <ActivityIndicator
              size="small"
              color={colors.primaryContainer}
              style={styles.bankSpinner}
            />
          ) : !bankAccounts || bankAccounts.length === 0 ? (
            <View style={styles.emptyAccountsWrap}>
              <Building2 size={40} color={colors.onSurfaceVariant} strokeWidth={1.5} />
              <Text style={styles.emptyAccountsText}>
                {t(
                  'admin.payments.settings.noBankAccounts',
                  'No hay cuentas bancarias configuradas. Agregá al menos una para recibir comprobantes.'
                )}
              </Text>
            </View>
          ) : (
            bankAccounts.map((account) => (
              <BankAccountCard
                key={account.id}
                account={account}
                onEdit={() => onEditBankAccount?.(account)}
                onDelete={() => onDeleteBankAccount?.(account)}
                onSetDefault={() => onSetDefaultBankAccount?.(account)}
                t={t}
              />
            ))
          )}
        </View>
      )}

      {/* Botón Guardar Configuración (solo persiste los 2 toggles) */}
      <Pressable
        onPress={onSaveSettings}
        style={({ pressed }) => [
          styles.saveBtn,
          pressed && styles.btnPressed,
          savingSettings && styles.saveBtnDisabled,
        ]}
        disabled={savingSettings}
      >
        {savingSettings ? (
          <ActivityIndicator size="small" color={colors.onPrimaryContainer} />
        ) : (
          <>
            <Save size={18} color={colors.onPrimaryContainer} strokeWidth={2} />
            <Text style={styles.saveBtnText}>
              {t('admin.payments.settings.save', 'Guardar configuración')}
            </Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

/**
 * Sub-componente BankAccountCard — usado solo dentro de SettingsTab.
 * Campos del shape: bank_name, account_number, account_name, account_type,
 * instructions, is_default. (Confirmado contra useBankAccounts + endpoint
 * /admin/bank-accounts.)
 */
function BankAccountCard({ account, onEdit, onDelete, onSetDefault, t }) {
  const accountTypeLabel =
    account.account_type === 'savings'
      ? t('admin.payments.settings.accountTypeSavings', 'Ahorro')
      : account.account_type === 'checking'
      ? t('admin.payments.settings.accountTypeChecking', 'Cheques')
      : account.account_type;

  return (
    <View
      style={[
        styles.accountCard,
        account.is_default && styles.accountCardDefault,
      ]}
    >
      <View style={styles.accountHeader}>
        <View style={styles.accountTitleRow}>
          {account.is_default ? (
            <Star
              size={14}
              color={colors.primaryContainer}
              strokeWidth={2}
              fill={colors.primaryContainer}
            />
          ) : null}
          <Text style={styles.accountName} numberOfLines={1}>
            {account.bank_name}
          </Text>
        </View>
        <View style={styles.accountActions}>
          {!account.is_default && (
            <Pressable
              onPress={onSetDefault}
              style={styles.iconBtn}
              hitSlop={6}
              accessibilityLabel={t('admin.payments.settings.setDefault', 'Marcar como predeterminada')}
            >
              <Star size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
            </Pressable>
          )}
          <Pressable
            onPress={onEdit}
            style={styles.iconBtn}
            hitSlop={6}
            accessibilityLabel={t('common.edit', 'Editar')}
          >
            <Pencil size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={onDelete}
            style={styles.iconBtn}
            hitSlop={6}
            accessibilityLabel={t('common.delete', 'Eliminar')}
          >
            <Trash2 size={18} color={colors.error} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.accountFieldMono}>{account.account_number}</Text>
      <Text style={styles.accountField}>{account.account_name}</Text>
      {accountTypeLabel ? (
        <Text style={styles.accountType}>{accountTypeLabel}</Text>
      ) : null}
      {account.instructions ? (
        <Text style={styles.accountInstructions} numberOfLines={3}>
          {account.instructions}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.unit * 3,
    paddingBottom: spacing.unit * 12,
  },

  fullSpinner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  loadingText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },

  section: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.unit * 3,
    paddingVertical: spacing.unit * 2,
    marginBottom: spacing.unit * 3,
  },
  sectionHeader: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.unit * 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.unit * 2,
  },

  // Setting row (toggle)
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.unit * 2,
    gap: spacing.unit * 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingLabelGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.unit * 2,
    flex: 1,
  },
  settingTexts: {
    flex: 1,
    gap: spacing.unit / 2,
  },
  settingTitle: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
  },
  // Theme no expone bodySm — uso bodyMd con fontSize override
  settingSubtitle: {
    ...typography.bodyMd,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },

  // Add button (header de bank accounts)
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.unit,
    paddingHorizontal: spacing.unit * 2,
    paddingVertical: spacing.unit,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryContainer,
  },
  addBtnText: {
    ...typography.labelMd,
    color: colors.onPrimaryContainer,
    fontWeight: '700',
  },
  btnPressed: {
    opacity: 0.85,
  },

  // Bank account: empty state
  bankSpinner: {
    marginVertical: spacing.unit * 4,
  },
  emptyAccountsWrap: {
    alignItems: 'center',
    paddingVertical: spacing.unit * 5,
    gap: spacing.unit * 2,
  },
  emptyAccountsText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: spacing.unit * 3,
  },

  // Bank account card
  accountCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.md,
    padding: spacing.unit * 2.5,
    marginBottom: spacing.unit * 2,
    gap: spacing.unit / 2,
  },
  accountCardDefault: {
    borderWidth: 1,
    borderColor: colors.primaryContainer,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.unit,
    gap: spacing.unit * 2,
  },
  accountTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.unit,
    flex: 1,
  },
  accountName: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
    flex: 1,
  },
  accountActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.unit / 2,
  },
  iconBtn: {
    padding: spacing.unit,
  },
  accountFieldMono: {
    ...typography.monoData,
    color: colors.onSurface,
    letterSpacing: 1,
  },
  accountField: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  accountType: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textTransform: 'capitalize',
  },
  accountInstructions: {
    ...typography.bodyMd,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginTop: spacing.unit,
  },

  // Save button (primary CTA)
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.unit,
    paddingVertical: spacing.unit * 2.5,
    paddingHorizontal: spacing.unit * 4,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryContainer,
    marginTop: spacing.unit * 2,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    ...typography.bodyLg,
    color: colors.onPrimaryContainer,
    fontWeight: '700',
  },
});

export default SettingsTab;
