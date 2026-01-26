// app/admin/payments/components/BankAccountModal.js
// ISSY Admin - Bank Account Modal Component

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, scale } from '../_constants';

export function BankAccountModal({
  visible,
  onClose,
  editingBankAccount,
  bankAccountForm,
  onFieldChange,
  onSave,
  saving,
}) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingBankAccount 
                ? t('admin.payments.editBankAccount', 'Editar Cuenta') 
                : t('admin.payments.addBankAccount', 'Nueva Cuenta Bancaria')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                {t('admin.payments.settings.bankName', 'Nombre del Banco')} *
              </Text>
              <TextInput
                style={styles.formInput}
                value={bankAccountForm.bank_name}
                onChangeText={(text) => onFieldChange('bank_name', text)}
                placeholder="Ej: Banco Atlántida"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                {t('admin.payments.settings.accountNumber', 'Número de Cuenta')} *
              </Text>
              <TextInput
                style={styles.formInput}
                value={bankAccountForm.account_number}
                onChangeText={(text) => onFieldChange('account_number', text)}
                placeholder="Ej: 1234567890"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                {t('admin.payments.settings.accountName', 'Nombre del Titular')} *
              </Text>
              <TextInput
                style={styles.formInput}
                value={bankAccountForm.account_name}
                onChangeText={(text) => onFieldChange('account_name', text)}
                placeholder="Ej: Residencial Los Pinos"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                {t('admin.payments.accountType', 'Tipo de Cuenta')}
              </Text>
              <View style={styles.accountTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.accountTypeButton, 
                    bankAccountForm.account_type === 'savings' && styles.accountTypeButtonActive
                  ]}
                  onPress={() => onFieldChange('account_type', 'savings')}
                >
                  <Text style={[
                    styles.accountTypeText, 
                    bankAccountForm.account_type === 'savings' && styles.accountTypeTextActive
                  ]}>
                    {t('admin.payments.savings', 'Ahorro')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.accountTypeButton, 
                    bankAccountForm.account_type === 'checking' && styles.accountTypeButtonActive
                  ]}
                  onPress={() => onFieldChange('account_type', 'checking')}
                >
                  <Text style={[
                    styles.accountTypeText, 
                    bankAccountForm.account_type === 'checking' && styles.accountTypeTextActive
                  ]}>
                    {t('admin.payments.checking', 'Cheques')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                {t('admin.payments.settings.instructions', 'Instrucciones (opcional)')}
              </Text>
              <TextInput
                style={[styles.formInput, styles.formInputMultiline]}
                value={bankAccountForm.instructions}
                onChangeText={(text) => onFieldChange('instructions', text)}
                placeholder="Instrucciones adicionales para el pago..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <TouchableOpacity
                style={styles.defaultCheckbox}
                onPress={() => onFieldChange('is_default', !bankAccountForm.is_default)}
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
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancelar')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, saving && styles.submitButtonDisabled]}
              onPress={onSave}
              disabled={saving}
            >
              {saving ? (
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
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.backgroundSecondary,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: scale(17),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalBody: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(16),
    maxHeight: scale(400),
  },
  modalFooter: {
    flexDirection: 'row',
    padding: scale(16),
    gap: scale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
    backgroundColor: COLORS.background,
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
  accountTypeRow: {
    flexDirection: 'row',
    gap: scale(12),
  },
  accountTypeButton: {
    flex: 1,
    paddingVertical: scale(12),
    borderRadius: scale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accountTypeButtonActive: {
    backgroundColor: COLORS.lime + '20',
    borderColor: COLORS.lime,
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
  },
  defaultCheckboxText: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: scale(16),
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: COLORS.lime,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: scale(16),
    color: COLORS.background,
    fontWeight: '600',
  },
});

export default BankAccountModal;
