// app/admin/expenses.js
// ISSY Resident App - Admin: Control de Gastos

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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.joinissy.com';

const COLORS = {
  primary: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  navy: '#1A1A2E',
  white: '#FFFFFF',
  background: '#F3F4F6',
  gray: '#6B7280',
  grayLight: '#E5E7EB',
  grayLighter: '#F9FAFB',
};

const EXPENSE_CATEGORIES = [
  { value: 'maintenance', label: '🔧 Mantenimiento', color: '#F59E0B' },
  { value: 'utilities', label: '💡 Servicios', color: '#3B82F6' },
  { value: 'security', label: '🔐 Seguridad', color: '#8B5CF6' },
  { value: 'cleaning', label: '🧹 Limpieza', color: '#10B981' },
  { value: 'administration', label: '📋 Administración', color: '#6B7280' },
  { value: 'other', label: '📦 Otros', color: '#EC4899' },
];

export default function AdminExpenses() {
  const { user, profile } = useAuth();
  const router = useRouter();
  
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
      Alert.alert('Acceso Denegado', 'No tienes permisos');
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
      
      // Fetch expenses
      const expensesRes = await fetch(`${API_URL}/api/expenses`, { headers });
      const expensesData = await expensesRes.json();
      if (expensesData.success || Array.isArray(expensesData)) {
        const list = expensesData.data || expensesData.expenses || expensesData;
        setExpenses(Array.isArray(list) ? list : []);
      }
      
      // Fetch stats
      const statsRes = await fetch(`${API_URL}/api/expenses/stats`, { headers });
      const statsData = await statsRes.json();
      if (statsData.success || statsData.data) {
        setStats(statsData.data || statsData);
      }

      // Fetch balance
      const balanceRes = await fetch(`${API_URL}/api/expenses/balance`, { headers });
      const balanceData = await balanceRes.json();
      if (balanceData.success || balanceData.data) {
        setBalance(balanceData.data || balanceData);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      Alert.alert('Error', 'No se pudieron cargar los gastos');
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
    if (!formData.description.trim() || !formData.amount) {
      Alert.alert('Error', 'Descripción y monto son requeridos');
      return;
    }

    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const url = editingExpense 
        ? `${API_URL}/api/expenses/${editingExpense.id}`
        : `${API_URL}/api/expenses`;
      
      const response = await fetch(url, {
        method: editingExpense ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          location_id: profile?.location_id,
        }),
      });

      if (response.ok) {
        Alert.alert('Éxito', editingExpense ? 'Gasto actualizado' : 'Gasto registrado');
        setShowModal(false);
        fetchData();
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'No se pudo guardar');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el gasto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (expense) => {
    Alert.alert(
      'Eliminar Gasto',
      `¿Eliminar "${expense.description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              await fetch(`${API_URL}/api/expenses/${expense.id}`, {
                method: 'DELETE',
                headers,
              });
              Alert.alert('Éxito', 'Gasto eliminado');
              fetchData();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar');
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando gastos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>📊 Gastos</Text>
        </View>
        <TouchableOpacity onPress={handleCreate} style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Balance Card */}
        {balance && (
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Balance del Mes</Text>
            <Text style={[
              styles.balanceValue,
              { color: (balance.balance || balance.net || 0) >= 0 ? COLORS.success : COLORS.primary }
            ]}>
              {formatCurrency(balance.balance || balance.net || 0)}
            </Text>
            <View style={styles.balanceDetails}>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceItemLabel}>Ingresos</Text>
                <Text style={[styles.balanceItemValue, { color: COLORS.success }]}>
                  +{formatCurrency(balance.income || balance.total_income || 0)}
                </Text>
              </View>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceItemLabel}>Gastos</Text>
                <Text style={[styles.balanceItemValue, { color: COLORS.primary }]}>
                  -{formatCurrency(balance.expenses || balance.total_expenses || 0)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Expenses List */}
        <Text style={styles.sectionTitle}>Gastos Recientes</Text>
        
        {expenses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No hay gastos</Text>
            <Text style={styles.emptySubtitle}>Registra tu primer gasto</Text>
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
              >
                <View style={[styles.categoryDot, { backgroundColor: categoryInfo.color }]} />
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseDescription}>{expense.description}</Text>
                  <Text style={styles.expenseCategory}>{categoryInfo.label}</Text>
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
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
            </Text>
            <TouchableOpacity onPress={handleSubmit} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.modalSave}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Descripción *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Ej: Reparación de bomba"
                placeholderTextColor={COLORS.gray}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Monto (L) *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
                placeholder="0.00"
                placeholderTextColor={COLORS.gray}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Categoría</Text>
              <View style={styles.categoriesGrid}>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryButton,
                      formData.category === cat.value && { 
                        backgroundColor: cat.color + '20',
                        borderColor: cat.color 
                      }
                    ]}
                    onPress={() => setFormData({ ...formData, category: cat.value })}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      formData.category === cat.value && { color: cat.color }
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Fecha</Text>
              <TextInput
                style={styles.formInput}
                value={formData.date}
                onChangeText={(text) => setFormData({ ...formData, date: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.gray}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notas</Text>
              <TextInput
                style={[styles.formInput, { height: 80 }]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Notas adicionales..."
                placeholderTextColor={COLORS.gray}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.gray, fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: 24, color: COLORS.navy },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.navy },
  addButton: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  content: { flex: 1 },
  scrollContent: { padding: 16 },
  balanceCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 20, alignItems: 'center' },
  balanceLabel: { fontSize: 14, color: COLORS.gray, marginBottom: 4 },
  balanceValue: { fontSize: 32, fontWeight: '700' },
  balanceDetails: { flexDirection: 'row', marginTop: 16, width: '100%' },
  balanceItem: { flex: 1, alignItems: 'center' },
  balanceItemLabel: { fontSize: 12, color: COLORS.gray },
  balanceItemValue: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.navy, marginBottom: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.navy, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.gray },
  expenseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 10 },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  expenseInfo: { flex: 1 },
  expenseDescription: { fontSize: 15, fontWeight: '500', color: COLORS.navy },
  expenseCategory: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  expenseRight: { alignItems: 'flex-end' },
  expenseAmount: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  expenseDate: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  modalContainer: { flex: 1, backgroundColor: COLORS.white },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  modalCancel: { fontSize: 16, color: COLORS.gray },
  modalTitle: { fontSize: 17, fontWeight: '600', color: COLORS.navy },
  modalSave: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  modalContent: { flex: 1, padding: 16 },
  formGroup: { marginBottom: 20 },
  formLabel: { fontSize: 14, fontWeight: '600', color: COLORS.navy, marginBottom: 8 },
  formInput: { backgroundColor: COLORS.grayLighter, borderWidth: 1, borderColor: COLORS.grayLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: COLORS.navy },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.grayLight, backgroundColor: COLORS.white },
  categoryButtonText: { fontSize: 13, color: COLORS.gray },
});