// app/admin/payments/components/CreateChargeModal.js
// ISSY Admin - Create Charge Modal Component
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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, scale, getPaymentTypes, getTargetOptions, getPaymentMethodOptions, getRecurringPeriodOptions } from '../_constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function CreateChargeModal({
  visible,
  onClose,
  formData,
  onFormChange,
  selectedUsers,
  onSelectUser,
  onUserPickerOpen,
  onSubmit,
  saving,
}) {
  const { t } = useTranslation();
  const PAYMENT_TYPES = getPaymentTypes(t);
  const TARGET_OPTIONS = getTargetOptions(t);
  const PAYMENT_METHOD_OPTIONS = getPaymentMethodOptions(t);
  const RECURRING_PERIOD_OPTIONS = getRecurringPeriodOptions(t);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancel}>{t('common.cancel', 'Cancelar')}</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{t('admin.payments.newCharge', 'Nuevo Cobro')}</Text>
          <TouchableOpacity onPress={onSubmit} disabled={saving}>
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
                    onPress={() => onFormChange({ target: option.value, user_id: '', user_name: '' })}
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
                <TouchableOpacity style={styles.selectorButton} onPress={onUserPickerOpen}>
                  <Text style={formData.user_name ? styles.selectorText : styles.selectorPlaceholder}>
                    {formData.user_name || t('admin.payments.form.selectResident', 'Seleccionar residente...')}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={styles.selectorButton} onPress={onUserPickerOpen}>
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
                          <TouchableOpacity onPress={() => onSelectUser(user)}>
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
                const typeColor = type.color || COLORS.teal;
                return (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.typeButton, isSelected && { borderColor: typeColor, backgroundColor: typeColor + '15' }]}
                    onPress={() => onFormChange({ payment_type: type.value })}
                  >
                    <Ionicons 
                      name={type.icon} 
                      size={24} 
                      color={isSelected ? typeColor : COLORS.textSecondary} 
                    />
                    <Text style={[styles.typeLabel, isSelected && { color: typeColor, fontWeight: '600' }]}>
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
              onChangeText={(text) => onFormChange({ title: text })}
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
              onChangeText={(text) => onFormChange({ description: text })}
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
              onChangeText={(text) => onFormChange({ amount: text.replace(/[^0-9.]/g, '') })}
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
              onChangeText={(text) => onFormChange({ due_date: text })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={styles.formHint}>{t('admin.payments.form.dateFormat', 'Formato: 2026-01-31')}</Text>
          </View>

          {/* Recurring Charge */}
          <View style={styles.formGroup}>
            <View style={styles.recurringHeader}>
              <View style={styles.recurringHeaderText}>
                <Text style={styles.formLabel}>{t('admin.payments.form.recurring', 'Cobro Recurrente')}</Text>
                <Text style={styles.recurringHint}>{t('admin.payments.form.recurringHint', 'Se creará automáticamente cada período')}</Text>
              </View>
              <TouchableOpacity
                style={[styles.toggleButton, formData.is_recurring && styles.toggleButtonActive]}
                onPress={() => onFormChange({ is_recurring: !formData.is_recurring })}
              >
                <View style={[styles.toggleKnob, formData.is_recurring && styles.toggleKnobActive]} />
              </TouchableOpacity>
            </View>
            
            {formData.is_recurring && (
              <View style={styles.recurringOptions}>
                <Text style={styles.recurringLabel}>{t('admin.payments.form.recurringPeriod', 'Frecuencia')}</Text>
                <View style={styles.periodGrid}>
                  {RECURRING_PERIOD_OPTIONS.map((option) => {
                    const isSelected = formData.recurring_period === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.periodButton, isSelected && styles.periodButtonActive]}
                        onPress={() => onFormChange({ recurring_period: option.value })}
                      >
                        <Text style={[styles.periodLabel, isSelected && styles.periodLabelActive]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Payment Methods */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.payments.form.allowedMethods', 'Métodos de Pago Permitidos')}</Text>
            <View style={styles.methodsGrid}>
              {PAYMENT_METHOD_OPTIONS.map((option) => {
                let isSelected = false;
                if (option.value === 'both') {
                  isSelected = formData.allowed_payment_methods?.includes('card') && 
                               formData.allowed_payment_methods?.includes('proof');
                } else if (option.value === 'card') {
                  isSelected = formData.allowed_payment_methods?.includes('card') && 
                               !formData.allowed_payment_methods?.includes('proof');
                } else if (option.value === 'proof') {
                  isSelected = !formData.allowed_payment_methods?.includes('card') && 
                               formData.allowed_payment_methods?.includes('proof');
                }
                
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.methodButton, isSelected && styles.methodButtonActive]}
                    onPress={() => {
                      let methods = [];
                      if (option.value === 'both') methods = ['card', 'proof'];
                      else if (option.value === 'card') methods = ['card'];
                      else if (option.value === 'proof') methods = ['proof'];
                      onFormChange({ allowed_payment_methods: methods });
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
}

const styles = StyleSheet.create({
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
  typeLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(8),
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
  // Recurring styles
  recurringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recurringHeaderText: {
    flex: 1,
  },
  recurringHint: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginTop: scale(2),
  },
  toggleButton: {
    width: scale(50),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: COLORS.backgroundTertiary,
    padding: scale(2),
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.lime,
  },
  toggleKnob: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: COLORS.textSecondary,
  },
  toggleKnobActive: {
    backgroundColor: COLORS.background,
    alignSelf: 'flex-end',
  },
  recurringOptions: {
    marginTop: scale(16),
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(12),
  },
  recurringLabel: {
    fontSize: scale(13),
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: scale(10),
  },
  periodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  periodButton: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(8),
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodButtonActive: {
    borderColor: COLORS.lime,
    backgroundColor: COLORS.lime + '15',
  },
  periodLabel: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  periodLabelActive: {
    color: COLORS.lime,
    fontWeight: '600',
  },
});

export default CreateChargeModal;
