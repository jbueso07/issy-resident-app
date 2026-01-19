// app/admin/expenses.js
// ISSY Resident App - Admin: Control de Gastos (ProHome Dark Theme)

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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useAdminLocation } from '../../src/context/AdminLocationContext';
import { LocationHeader, LocationPickerModal } from '../../src/components/AdminLocationPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  pink: '#EC4899',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  border: 'rgba(255,255,255,0.1)',
};

const getExpenseCategories = (t) => [
  { value: 'maintenance', label: t('admin.expenses.categories.maintenance'), icon: 'construct', color: COLORS.warning },
  { value: 'utilities', label: t('admin.expenses.categories.utilities'), icon: 'bulb', color: COLORS.blue },
  { value: 'security', label: t('admin.expenses.categories.security'), icon: 'shield-checkmark', color: COLORS.purple },
  { value: 'cleaning', label: t('admin.expenses.categories.cleaning'), icon: 'sparkles', color: COLORS.success },
  { value: 'administration', label: t('admin.expenses.categories.administration'), icon: 'document-text', color: COLORS.textSecondary },
  { value: 'other', label: t('admin.expenses.categories.other'), icon: 'cube', color: COLORS.pink },
];

export default function AdminExpenses() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { selectedLocationId, loading: locationLoading } = useAdminLocation();
  const router = useRouter();
  
  // i18n config
  const EXPENSE_CATEGORIES = getExpenseCategories(t);
  
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'maintenance',
    date: '',
    notes: '',
  });

  const userRole = profile?.role || user?.role || 'user';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert(t('admin.expenses.accessDenied'), t('admin.expenses.noPermissions'));
      router.back();
      return;
    }
    fetchData();
  }, []);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchData = async () => {
    try {
      const headers = await getAuthHeaders();
      
      const expensesRes = await fetch(`${API_URL}/api/expenses`, { headers });
      const expensesData = await expensesRes.json();
      if (expensesData.success || Array.isArray(expensesData)) {
        const list = expensesData.data || expensesData.expenses || expensesData;
        setExpenses(Array.isArray(list) ? list : []);
      }
      
      const statsRes = await fetch(`${API_URL}/api/expenses/stats`, { headers });
      const statsData = await statsRes.json();
      if (statsData.success !== false) {
        setStats(statsData.data || statsData);
      }

      const balanceRes = await fetch(`${API_URL}/api/admin/payments/balance`, { headers });
      const balanceData = await balanceRes.json();
      if (balanceData.success !== false) {
        setBalance(balanceData.data || balanceData);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleCreate = () => {
    setEditingExpense(null);
    setFormData({
      description: '',
      amount: '',
      category: 'maintenance',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowModal(true);
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description || '',
      amount: expense.amount?.toString() || '',
      category: expense.category || 'maintenance',
      date: expense.date?.split('T')[0] || '',
      notes: expense.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.description.trim()) {
      Alert.alert(t('common.error'), t('admin.expenses.errors.enterDescription'));
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert(t('common.error'), t('admin.expenses.errors.enterValidAmount'));
      return;
    }

    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const payload = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: formData.date || new Date().toISOString().split('T')[0],
        notes: formData.notes,
      };

      const url = editingExpense 
        ? `${API_URL}/api/expenses/${editingExpense.id}`
        : `${API_URL}/api/expenses`;

      const response = await fetch(url, {
        method: editingExpense ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok && data.success !== false) {
        Alert.alert(t('common.success'), editingExpense ? t('admin.expenses.success.updated') : t('admin.expenses.success.registered'));
        setShowModal(false);
        fetchData();
      } else {
        Alert.alert(t('common.error'), data.error || t('admin.expenses.errors.saveFailed'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('admin.expenses.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (expense) => {
    Alert.alert(
      t('admin.expenses.deleteExpense'),
      t('admin.expenses.deleteConfirm', { description: expense.description }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              await fetch(`${API_URL}/api/expenses/${expense.id}`, {
                method: 'DELETE',
                headers,
              });
              Alert.alert(t('common.success'), t('admin.expenses.success.deleted'));
              fetchData();
            } catch (error) {
              Alert.alert(t('common.error'), t('admin.expenses.errors.deleteFailed'));
            }
          }
        }
      ]
    );
  };

  const formatCurrency = (amount) => {
    return `L ${parseFloat(amount || 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-HN', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getCategoryInfo = (category) => {
    return EXPENSE_CATEGORIES.find(c => c.value === category) || EXPENSE_CATEGORIES[5];
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
          <Text style={styles.loadingText}>{t('admin.expenses.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{t('admin.expenses.title')}</Text>
          <Text style={styles.headerSubtitle}>Control financiero</Text>
        </View>
        <TouchableOpacity onPress={handleCreate} style={styles.addButton}>
          <Ionicons name="add" size={22} color={COLORS.background} />
        </TouchableOpacity>
      </View>

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
        {/* Balance Card */}
        {balance && (
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>{t('admin.expenses.monthBalance.title')}</Text>
            <Text style={[
              styles.balanceValue,
              { color: (balance.balance || balance.net || 0) >= 0 ? COLORS.success : COLORS.danger }
            ]}>
              {formatCurrency(balance.balance || balance.net || 0)}
            </Text>
            <View style={styles.balanceDetails}>
              <View style={styles.balanceItem}>
                <View style={styles.balanceItemIcon}>
                  <Ionicons name="trending-up" size={16} color={COLORS.success} />
                </View>
                <Text style={styles.balanceItemLabel}>{t('admin.expenses.monthBalance.income')}</Text>
                <Text style={[styles.balanceItemValue, { color: COLORS.success }]}>
                  +{formatCurrency(balance.income || balance.total_income || 0)}
                </Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceItem}>
                <View style={styles.balanceItemIcon}>
                  <Ionicons name="trending-down" size={16} color={COLORS.danger} />
                </View>
                <Text style={styles.balanceItemLabel}>{t('admin.expenses.monthBalance.expenses')}</Text>
                <Text style={[styles.balanceItemValue, { color: COLORS.danger }]}>
                  -{formatCurrency(balance.expenses || balance.total_expenses || 0)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Expenses List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('admin.expenses.recentExpenses')}</Text>
          <Text style={styles.sectionCount}>{expenses.length} {t('admin.expenses.records')}</Text>
        </View>
        
        {expenses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>{t('admin.expenses.empty.noExpenses')}</Text>
            <Text style={styles.emptySubtitle}>{t('admin.expenses.empty.registerFirst')}</Text>
          </View>
        ) : (
          expenses.map((expense) => {
            const categoryInfo = getCategoryInfo(expense.category);
            return (
              <TouchableOpacity 
                key={expense.id} 
                style={styles.expenseCard}
                onPress={() => handleEdit(expense)}
                onLongPress={() => handleDelete(expense)}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryIcon, { backgroundColor: categoryInfo.color + '20' }]}>
                  <Ionicons name={categoryInfo.icon} size={20} color={categoryInfo.color} />
                </View>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseDescription}>{expense.description}</Text>
                  <View style={styles.expenseMeta}>
                    <Ionicons name={categoryInfo.icon} size={12} color={categoryInfo.color} />
                    <Text style={[styles.expenseCategory, { color: categoryInfo.color }]}>
                      {categoryInfo.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.expenseRight}>
                  <Text style={styles.expenseAmount}>-{formatCurrency(expense.amount)}</Text>
                  <Text style={styles.expenseDate}>{formatDate(expense.date || expense.created_at)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingExpense ? t('admin.expenses.editExpense') : t('admin.expenses.newExpense')}
            </Text>
            <TouchableOpacity onPress={handleSubmit} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.lime} />
              ) : (
                <Text style={styles.modalSave}>{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('admin.expenses.form.description')} *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder={t('admin.expenses.form.descriptionPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('admin.expenses.form.amount')} *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('admin.expenses.form.category')}</Text>
              <View style={styles.categoriesGrid}>
                {EXPENSE_CATEGORIES.map((cat) => {
                  const isSelected = formData.category === cat.value;
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryButton,
                        isSelected && { 
                          backgroundColor: cat.color + '20',
                          borderColor: cat.color 
                        }
                      ]}
                      onPress={() => setFormData({ ...formData, category: cat.value })}
                    >
                      <Ionicons 
                        name={cat.icon} 
                        size={18} 
                        color={isSelected ? cat.color : COLORS.textSecondary} 
                      />
                      <Text style={[
                        styles.categoryButtonText,
                        isSelected && { color: cat.color }
                      ]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('admin.expenses.form.date')}</Text>
              <TextInput
                style={styles.formInput}
                value={formData.date}
                onChangeText={(text) => setFormData({ ...formData, date: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('admin.expenses.form.notes')}</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder={t('admin.expenses.form.notesPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    <LocationPickerModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: scale(12),
    color: COLORS.textSecondary,
    fontSize: scale(14),
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: scale(12),
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: scale(12),
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
  
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: scale(16),
  },
  
  // Balance Card
  balanceCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(16),
    padding: scale(20),
    marginBottom: scale(20),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  balanceLabel: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginBottom: scale(4),
  },
  balanceValue: {
    fontSize: scale(32),
    fontWeight: '700',
  },
  balanceDetails: {
    flexDirection: 'row',
    marginTop: scale(16),
    width: '100%',
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceItemIcon: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: COLORS.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(4),
  },
  balanceItemLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  balanceItemValue: {
    fontSize: scale(16),
    fontWeight: '600',
    marginTop: scale(4),
  },
  balanceDivider: {
    width: 1,
    height: '100%',
    backgroundColor: COLORS.border,
  },
  
  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionCount: {
    fontSize: scale(12),
    color: COLORS.textMuted,
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: scale(40),
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
  },
  
  // Expense Card
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: scale(15),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  expenseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: scale(4),
  },
  expenseCategory: {
    fontSize: scale(12),
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.danger,
  },
  expenseDate: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginTop: scale(2),
  },
  
  // Modal
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
  
  // Form
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
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(10),
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    fontSize: scale(16),
    color: COLORS.textPrimary,
  },
  textArea: {
    height: scale(80),
    textAlignVertical: 'top',
  },
  
  // Categories
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundSecondary,
  },
  categoryButtonText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
});