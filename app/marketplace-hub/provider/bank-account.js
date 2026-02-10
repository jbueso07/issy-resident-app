// app/marketplace-hub/provider/bank-account.js
// ISSY Marketplace - Provider Bank Account Management
// Línea gráfica ProHome

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import {
  getBankAccount,
  saveBankAccount,
  deleteBankAccount,
} from '../../../src/services/marketplaceApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ============ COLORES PROHOME ============
const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  bgCardAlt: '#243B44',
  lime: '#AAFF00',
  cyan: '#00E5FF',
  teal: '#00BFA6',
  orange: '#FF8A50',
  green: '#10B981',
  blue: '#60A5FA',
  yellow: '#FBBF24',
  red: '#EF4444',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  border: 'rgba(255, 255, 255, 0.1)',
};

const BANKS = [
  { id: 'banpais', name: 'Banco del País' },
  { id: 'bac', name: 'BAC Honduras' },
  { id: 'ficohsa', name: 'Banco Ficohsa' },
  { id: 'atlantida', name: 'Banco Atlántida' },
  { id: 'occidente', name: 'Banco de Occidente' },
  { id: 'promerica', name: 'Banco Promerica' },
  { id: 'davivienda', name: 'Davivienda Honduras' },
  { id: 'lafise', name: 'Banco LAFISE' },
  { id: 'other', name: 'Otro' },
];

export default function BankAccountScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bankAccount, setBankAccount] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);

  const [formData, setFormData] = useState({
    bank_name: '',
    account_type: 'checking',
    account_holder_name: '',
    account_number: '',
    routing_number: '', // CLABE en Honduras
  });

  const fetchBankAccount = useCallback(async () => {
    try {
      const result = await getBankAccount();
      if (result.success && result.data) {
        setBankAccount(result.data);
        setFormData({
          bank_name: result.data.bank_name || '',
          account_type: result.data.account_type || 'checking',
          account_holder_name: result.data.account_holder_name || '',
          account_number: '', // Don't show full account number
          routing_number: result.data.routing_number || '',
        });
      }
    } catch (error) {
      console.error('Error fetching bank account:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBankAccount();
  }, [fetchBankAccount]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBankAccount();
  };

  const handleSave = async () => {
    // Validation
    if (!formData.bank_name) {
      Alert.alert('Error', 'Selecciona un banco');
      return;
    }
    if (!formData.account_holder_name.trim()) {
      Alert.alert('Error', 'Ingresa el nombre del titular');
      return;
    }
    if (!formData.account_number.trim() || formData.account_number.length < 10) {
      Alert.alert('Error', 'Ingresa un número de cuenta válido');
      return;
    }

    setSaving(true);
    try {
      const result = await saveBankAccount({
        ...formData,
        account_holder_name: formData.account_holder_name.trim(),
        account_number: formData.account_number.replace(/\s/g, ''),
        routing_number: formData.routing_number?.replace(/\s/g, '') || null,
      });

      if (result.success) {
        Alert.alert('Éxito', 'Cuenta bancaria guardada correctamente');
        setBankAccount(result.data);
        setIsEditing(false);
        fetchBankAccount();
      } else {
        Alert.alert('Error', result.error || 'No se pudo guardar la cuenta');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la cuenta bancaria');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Cuenta',
      '¿Estás seguro de eliminar esta cuenta bancaria? No podrás recibir pagos hasta agregar una nueva.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteBankAccount();
              if (result.success) {
                setBankAccount(null);
                setFormData({
                  bank_name: '',
                  account_type: 'checking',
                  account_holder_name: '',
                  account_number: '',
                  routing_number: '',
                });
                Alert.alert('Éxito', 'Cuenta bancaria eliminada');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la cuenta');
            }
          },
        },
      ]
    );
  };

  const selectBank = (bank) => {
    setFormData(prev => ({ ...prev, bank_name: bank.name }));
    setShowBankPicker(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={COLORS.teal} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={scale(24)} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cuenta Bancaria</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.teal}
          />
        }
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={scale(24)} color={COLORS.teal} />
          <Text style={styles.infoText}>
            Tu información bancaria está protegida con encriptación de nivel bancario.
            Solo usamos esta información para depositar tus ganancias.
          </Text>
        </View>

        {/* Bank Account Display (when not editing) */}
        {bankAccount && !isEditing ? (
          <View style={styles.accountCard}>
            <View style={styles.accountHeader}>
              <View style={styles.bankIcon}>
                <Ionicons name="business" size={scale(24)} color={COLORS.lime} />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.bankName}>{bankAccount.bank_name}</Text>
                <Text style={styles.accountType}>
                  {bankAccount.account_type === 'checking' ? 'Cuenta Corriente' : 'Cuenta de Ahorro'}
                </Text>
              </View>
              {bankAccount.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={scale(16)} color={COLORS.green} />
                  <Text style={styles.verifiedText}>Verificada</Text>
                </View>
              )}
            </View>

            <View style={styles.accountDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Titular</Text>
                <Text style={styles.detailValue}>{bankAccount.account_holder_name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Número de Cuenta</Text>
                <Text style={styles.detailValue}>****{bankAccount.account_number_last4}</Text>
              </View>
              {bankAccount.routing_number && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>CLABE / Routing</Text>
                  <Text style={styles.detailValue}>{bankAccount.routing_number}</Text>
                </View>
              )}
            </View>

            <View style={styles.accountActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => setIsEditing(true)}
              >
                <Ionicons name="pencil" size={scale(18)} color={COLORS.textPrimary} />
                <Text style={styles.actionButtonText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDelete}
              >
                <Ionicons name="trash" size={scale(18)} color={COLORS.red} />
                <Text style={[styles.actionButtonText, { color: COLORS.red }]}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Form */
          <View style={styles.form}>
            <Text style={styles.formTitle}>
              {bankAccount ? 'Editar Cuenta Bancaria' : 'Agregar Cuenta Bancaria'}
            </Text>

            {/* Bank Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Banco *</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowBankPicker(!showBankPicker)}
              >
                <Text style={formData.bank_name ? styles.selectorText : styles.selectorPlaceholder}>
                  {formData.bank_name || 'Seleccionar banco'}
                </Text>
                <Ionicons
                  name={showBankPicker ? 'chevron-up' : 'chevron-down'}
                  size={scale(20)}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              {showBankPicker && (
                <View style={styles.bankList}>
                  {BANKS.map(bank => (
                    <TouchableOpacity
                      key={bank.id}
                      style={[
                        styles.bankOption,
                        formData.bank_name === bank.name && styles.bankOptionSelected,
                      ]}
                      onPress={() => selectBank(bank)}
                    >
                      <Text style={styles.bankOptionText}>{bank.name}</Text>
                      {formData.bank_name === bank.name && (
                        <Ionicons name="checkmark" size={scale(18)} color={COLORS.teal} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Account Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tipo de Cuenta *</Text>
              <View style={styles.accountTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.accountTypeButton,
                    formData.account_type === 'checking' && styles.accountTypeSelected,
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, account_type: 'checking' }))}
                >
                  <Text style={[
                    styles.accountTypeText,
                    formData.account_type === 'checking' && styles.accountTypeTextSelected,
                  ]}>
                    Corriente
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.accountTypeButton,
                    formData.account_type === 'savings' && styles.accountTypeSelected,
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, account_type: 'savings' }))}
                >
                  <Text style={[
                    styles.accountTypeText,
                    formData.account_type === 'savings' && styles.accountTypeTextSelected,
                  ]}>
                    Ahorro
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Account Holder Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre del Titular *</Text>
              <TextInput
                style={styles.input}
                placeholder="Como aparece en tu cuenta"
                placeholderTextColor={COLORS.textMuted}
                value={formData.account_holder_name}
                onChangeText={(v) => setFormData(prev => ({ ...prev, account_holder_name: v }))}
                autoCapitalize="words"
              />
            </View>

            {/* Account Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Número de Cuenta *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ingresa tu número de cuenta"
                placeholderTextColor={COLORS.textMuted}
                value={formData.account_number}
                onChangeText={(v) => setFormData(prev => ({ ...prev, account_number: v.replace(/\D/g, '') }))}
                keyboardType="number-pad"
                maxLength={20}
              />
            </View>

            {/* Routing Number (CLABE) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>CLABE Interbancaria (Opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Para transferencias entre bancos"
                placeholderTextColor={COLORS.textMuted}
                value={formData.routing_number}
                onChangeText={(v) => setFormData(prev => ({ ...prev, routing_number: v.replace(/\D/g, '') }))}
                keyboardType="number-pad"
                maxLength={18}
              />
            </View>

            {/* Actions */}
            <View style={styles.formActions}>
              {isEditing && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsEditing(false);
                    // Reset form to original values
                    if (bankAccount) {
                      setFormData({
                        bank_name: bankAccount.bank_name || '',
                        account_type: bankAccount.account_type || 'checking',
                        account_holder_name: bankAccount.account_holder_name || '',
                        account_number: '',
                        routing_number: bankAccount.routing_number || '',
                      });
                    }
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.bgPrimary} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={scale(20)} color={COLORS.bgPrimary} />
                    <Text style={styles.saveButtonText}>Guardar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Bottom Padding */}
        <View style={{ height: scale(100) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSpacer: {
    width: scale(40),
  },
  content: {
    flex: 1,
    padding: scale(16),
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.teal}15`,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(20),
    gap: scale(12),
    borderWidth: 1,
    borderColor: `${COLORS.teal}30`,
  },
  infoText: {
    flex: 1,
    fontSize: scale(13),
    color: COLORS.textSecondary,
    lineHeight: scale(18),
  },
  accountCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(20),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(20),
  },
  bankIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(12),
    backgroundColor: `${COLORS.lime}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  accountInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  accountType: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.green}15`,
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
    gap: scale(4),
  },
  verifiedText: {
    fontSize: scale(11),
    color: COLORS.green,
    fontWeight: '500',
  },
  accountDetails: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: scale(16),
    marginBottom: scale(16),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  detailLabel: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  accountActions: {
    flexDirection: 'row',
    gap: scale(12),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(12),
    borderRadius: scale(10),
    gap: scale(6),
  },
  editButton: {
    backgroundColor: COLORS.bgCardAlt,
  },
  deleteButton: {
    backgroundColor: `${COLORS.red}15`,
  },
  actionButtonText: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  form: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(20),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(20),
  },
  inputGroup: {
    marginBottom: scale(20),
  },
  label: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  input: {
    backgroundColor: COLORS.bgPrimary,
    borderRadius: scale(12),
    padding: scale(14),
    fontSize: scale(15),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgPrimary,
    borderRadius: scale(12),
    padding: scale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectorText: {
    fontSize: scale(15),
    color: COLORS.textPrimary,
  },
  selectorPlaceholder: {
    fontSize: scale(15),
    color: COLORS.textMuted,
  },
  bankList: {
    marginTop: scale(8),
    backgroundColor: COLORS.bgPrimary,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  bankOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bankOptionSelected: {
    backgroundColor: `${COLORS.teal}15`,
  },
  bankOptionText: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
  },
  accountTypeRow: {
    flexDirection: 'row',
    gap: scale(12),
  },
  accountTypeButton: {
    flex: 1,
    paddingVertical: scale(12),
    borderRadius: scale(10),
    backgroundColor: COLORS.bgPrimary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accountTypeSelected: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  accountTypeText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  accountTypeTextSelected: {
    color: COLORS.bgPrimary,
  },
  formActions: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: scale(8),
  },
  cancelButton: {
    flex: 1,
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: COLORS.bgCardAlt,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: COLORS.lime,
    gap: scale(8),
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.bgPrimary,
  },
});
