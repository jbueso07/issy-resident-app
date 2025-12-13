// app/admin/payments.js
// ISSY Resident App - Admin: Gestor de Cobros
// v2 - Con selector de usuario y payment_type

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
  primary: '#8B5CF6',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  navy: '#1A1A2E',
  white: '#FFFFFF',
  background: '#F3F4F6',
  gray: '#6B7280',
  grayLight: '#E5E7EB',
  grayLighter: '#F9FAFB',
};

const PAYMENT_STATUS = {
  pending: { label: 'Pendiente', color: COLORS.warning, icon: '⏳' },
  paid: { label: 'Pagado', color: COLORS.success, icon: '✅' },
  overdue: { label: 'Vencido', color: COLORS.danger, icon: '🚨' },
  cancelled: { label: 'Cancelado', color: COLORS.gray, icon: '❌' },
};

const PAYMENT_TYPES = [
  { value: 'maintenance', label: 'Cuota de Mantenimiento', icon: '🏠' },
  { value: 'extraordinary', label: 'Cuota Extraordinaria', icon: '⚡' },
  { value: 'fine', label: 'Multa', icon: '⚠️' },
  { value: 'service', label: 'Servicio', icon: '🔧' },
  { value: 'other', label: 'Otro', icon: '📝' },
];

export default function AdminPayments() {
  const { user, profile } = useAuth();
  const router = useRouter();
  
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Lista de usuarios para selector
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  
  const [formData, setFormData] = useState({
    user_id: '',
    user_name: '', // Para mostrar en UI
    payment_type: 'maintenance',
    concept: '',
    amount: '',
    due_date: getDefaultDueDate(),
  });

  const userRole = profile?.role || user?.role || 'user';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);

  // Fecha de vencimiento por defecto (fin de mes)
  function getDefaultDueDate() {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  }

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Acceso Denegado', 'No tienes permisos');
      router.back();
      return;
    }
    fetchData();
  }, [filter]);

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
      
      // Fetch payments
      const filterParam = filter !== 'all' ? `?status=${filter}` : '';
      const paymentsRes = await fetch(`${API_URL}/api/payments${filterParam}`, { headers });
      const paymentsData = await paymentsRes.json();
      
      if (paymentsData.success || Array.isArray(paymentsData)) {
        const list = paymentsData.data || paymentsData.payments || paymentsData;
        setPayments(Array.isArray(list) ? list : []);
      }
      
      // Fetch stats
      const statsRes = await fetch(`${API_URL}/api/payments/stats`, { headers });
      const statsData = await statsRes.json();
      if (statsData.success || statsData.data) {
        setStats(statsData.data || statsData);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      Alert.alert('Error', 'No se pudieron cargar los cobros');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUsers = async () => {
    if (users.length > 0) return; // Ya cargados
    
    setLoadingUsers(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/users?limit=500`, { headers });
      const data = await response.json();
      
      if (data.success || Array.isArray(data)) {
        const userList = data.data || data.users || data;
        setUsers(Array.isArray(userList) ? userList : []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [filter]);

  const handleMarkPaid = async (payment) => {
    Alert.alert(
      'Marcar como Pagado',
      `¿Confirmar pago de ${formatCurrency(payment.amount)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(
                `${API_URL}/api/payments/${payment.id}/mark-paid`,
                { method: 'POST', headers }
              );
              if (response.ok) {
                Alert.alert('Éxito', 'Pago registrado');
                fetchData();
              } else {
                Alert.alert('Error', 'No se pudo registrar el pago');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo registrar el pago');
            }
          }
        }
      ]
    );
  };

  const handleCreate = () => {
    setFormData({
      user_id: '',
      user_name: '',
      payment_type: 'maintenance',
      concept: '',
      amount: '',
      due_date: getDefaultDueDate(),
    });
    fetchUsers();
    setShowModal(true);
  };

  const handleSelectUser = (selectedUser) => {
    setFormData({
      ...formData,
      user_id: selectedUser.id,
      user_name: selectedUser.full_name || selectedUser.name || selectedUser.email,
    });
    setShowUserPicker(false);
    setUserSearch('');
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!formData.user_id) {
      Alert.alert('Error', 'Selecciona un residente');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }
    if (!formData.due_date) {
      Alert.alert('Error', 'Selecciona una fecha de vencimiento');
      return;
    }

    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      
      // Construir concepto si está vacío
      const paymentTypeLabel = PAYMENT_TYPES.find(t => t.value === formData.payment_type)?.label || formData.payment_type;
      const concept = formData.concept.trim() || paymentTypeLabel;
      
      const payload = {
        user_id: formData.user_id,
        amount: parseFloat(formData.amount),
        payment_type: formData.payment_type,
        concept: concept,
        due_date: formData.due_date,
        location_id: profile?.location_id,
      };

      console.log('Creating payment:', payload);

      const response = await fetch(`${API_URL}/api/payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && (data.success !== false)) {
        Alert.alert('Éxito', 'Cobro creado exitosamente');
        setShowModal(false);
        fetchData();
      } else {
        Alert.alert('Error', data.error || data.message || 'No se pudo crear el cobro');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      Alert.alert('Error', 'No se pudo crear el cobro');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return `L ${parseFloat(amount || 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-HN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getPaymentTypeLabel = (type) => {
    return PAYMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  // Filtrar usuarios por búsqueda
  const filteredUsers = users.filter(u => {
    const searchLower = userSearch.toLowerCase();
    const name = (u.full_name || u.name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const unit = (u.unit_number || u.unit || '').toLowerCase();
    return name.includes(searchLower) || email.includes(searchLower) || unit.includes(searchLower);
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando cobros...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>💰 Cobros</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
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
        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: COLORS.success + '15' }]}>
              <Text style={styles.statValue}>{formatCurrency(stats.total_collected || stats.totalCollected || 0)}</Text>
              <Text style={styles.statLabel}>Recaudado</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: COLORS.warning + '15' }]}>
              <Text style={styles.statValue}>{formatCurrency(stats.total_pending || stats.totalPending || 0)}</Text>
              <Text style={styles.statLabel}>Pendiente</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: COLORS.danger + '15' }]}>
              <Text style={styles.statValue}>{formatCurrency(stats.total_overdue || stats.totalOverdue || 0)}</Text>
              <Text style={styles.statLabel}>Vencido</Text>
            </View>
          </View>
        )}

        {/* Filters */}
        <View style={styles.filters}>
          {['all', 'pending', 'paid', 'overdue'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, filter === f && styles.filterButtonActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'Todos' : PAYMENT_STATUS[f]?.label || f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payments List */}
        {payments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={styles.emptyTitle}>No hay cobros</Text>
            <Text style={styles.emptySubtitle}>Crea tu primer cobro</Text>
          </View>
        ) : (
          payments.map((payment) => {
            const statusInfo = PAYMENT_STATUS[payment.status] || PAYMENT_STATUS.pending;
            return (
              <View key={payment.id} style={styles.paymentCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.paymentConcept}>
                      {payment.concept || getPaymentTypeLabel(payment.payment_type)}
                    </Text>
                    <Text style={styles.paymentUser}>
                      {payment.user?.name || payment.user?.full_name || payment.user_name || 'Usuario'}
                    </Text>
                  </View>
                  <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                </View>
                
                <View style={styles.cardFooter}>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>
                      {statusInfo.icon} {statusInfo.label}
                    </Text>
                  </View>
                  <Text style={styles.dueDate}>Vence: {formatDate(payment.due_date)}</Text>
                </View>

                {payment.status === 'pending' || payment.status === 'overdue' ? (
                  <TouchableOpacity
                    style={styles.markPaidButton}
                    onPress={() => handleMarkPaid(payment)}
                  >
                    <Text style={styles.markPaidText}>✅ Marcar como Pagado</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal Crear Cobro */}
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
            <Text style={styles.modalTitle}>Nuevo Cobro</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.modalSave}>Crear</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Selector de Usuario */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Residente *</Text>
              <TouchableOpacity
                style={styles.selectorButton}
                onPress={() => setShowUserPicker(true)}
              >
                <Text style={formData.user_name ? styles.selectorText : styles.selectorPlaceholder}>
                  {formData.user_name || 'Seleccionar residente...'}
                </Text>
                <Text style={styles.selectorArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Tipo de Cobro */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tipo de Cobro</Text>
              <View style={styles.typeGrid}>
                {PAYMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeButton,
                      formData.payment_type === type.value && styles.typeButtonActive
                    ]}
                    onPress={() => setFormData({ ...formData, payment_type: type.value })}
                  >
                    <Text style={styles.typeIcon}>{type.icon}</Text>
                    <Text style={[
                      styles.typeLabel,
                      formData.payment_type === type.value && styles.typeLabelActive
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Concepto (opcional) */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Descripción (opcional)</Text>
              <TextInput
                style={styles.formInput}
                value={formData.concept}
                onChangeText={(text) => setFormData({ ...formData, concept: text })}
                placeholder="Ej: Cuota Diciembre 2025"
                placeholderTextColor={COLORS.gray}
              />
            </View>

            {/* Monto */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Monto (L) *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text.replace(/[^0-9.]/g, '') })}
                placeholder="0.00"
                placeholderTextColor={COLORS.gray}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Fecha de Vencimiento */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Fecha de Vencimiento *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.due_date}
                onChangeText={(text) => setFormData({ ...formData, due_date: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.gray}
              />
              <Text style={styles.formHint}>Formato: 2025-12-31</Text>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal Selector de Usuario */}
      <Modal
        visible={showUserPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUserPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowUserPicker(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Seleccionar Residente</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Búsqueda */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={userSearch}
              onChangeText={setUserSearch}
              placeholder="Buscar por nombre, email o unidad..."
              placeholderTextColor={COLORS.gray}
            />
          </View>

          {loadingUsers ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Cargando residentes...</Text>
            </View>
          ) : (
            <ScrollView style={styles.userList}>
              {filteredUsers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No se encontraron residentes</Text>
                </View>
              ) : (
                filteredUsers.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.userItem}
                    onPress={() => handleSelectUser(u)}
                  >
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {(u.full_name || u.name || u.email || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {u.full_name || u.name || 'Sin nombre'}
                      </Text>
                      <Text style={styles.userDetail}>
                        {u.unit_number || u.unit ? `Unidad ${u.unit_number || u.unit}` : u.email}
                      </Text>
                    </View>
                    <Text style={styles.userSelectIcon}>→</Text>
                  </TouchableOpacity>
                ))
              )}
              <View style={{ height: 100 }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.gray, fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: 24, color: COLORS.navy },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.navy },
  addButton: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  content: { flex: 1 },
  scrollContent: { padding: 16 },
  statsContainer: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  statValue: { fontSize: 14, fontWeight: '700', color: COLORS.navy },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.grayLight },
  filterButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, color: COLORS.gray },
  filterTextActive: { color: COLORS.white },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.navy, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.gray },
  paymentCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardHeaderLeft: { flex: 1 },
  paymentConcept: { fontSize: 16, fontWeight: '600', color: COLORS.navy },
  paymentUser: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  paymentAmount: { fontSize: 18, fontWeight: '700', color: COLORS.navy },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '500' },
  dueDate: { fontSize: 12, color: COLORS.gray },
  markPaidButton: { backgroundColor: COLORS.success + '15', padding: 12, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  markPaidText: { color: COLORS.success, fontWeight: '600' },
  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.white },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  modalCancel: { fontSize: 16, color: COLORS.gray },
  modalTitle: { fontSize: 17, fontWeight: '600', color: COLORS.navy },
  modalSave: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  modalContent: { flex: 1, padding: 16 },
  // Form
  formGroup: { marginBottom: 20 },
  formLabel: { fontSize: 14, fontWeight: '600', color: COLORS.navy, marginBottom: 8 },
  formInput: { backgroundColor: COLORS.grayLighter, borderWidth: 1, borderColor: COLORS.grayLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: COLORS.navy },
  formHint: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  // Selector
  selectorButton: { backgroundColor: COLORS.grayLighter, borderWidth: 1, borderColor: COLORS.grayLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectorText: { fontSize: 16, color: COLORS.navy },
  selectorPlaceholder: { fontSize: 16, color: COLORS.gray },
  selectorArrow: { fontSize: 12, color: COLORS.gray },
  // Type Grid
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeButton: { 
    width: '48%',
    backgroundColor: COLORS.grayLighter, 
    borderWidth: 2, 
    borderColor: COLORS.grayLight, 
    borderRadius: 10, 
    padding: 12, 
    alignItems: 'center',
    marginBottom: 4,
  },
  typeButtonActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  typeIcon: { fontSize: 24, marginBottom: 4 },
  typeLabel: { fontSize: 12, color: COLORS.gray, textAlign: 'center' },
  typeLabelActive: { color: COLORS.primary, fontWeight: '600' },
  // Search
  searchContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  searchInput: { backgroundColor: COLORS.grayLighter, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: COLORS.navy },
  // User List
  userList: { flex: 1 },
  userItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  userAvatarText: { fontSize: 18, fontWeight: '600', color: COLORS.primary },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '500', color: COLORS.navy },
  userDetail: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  userSelectIcon: { fontSize: 18, color: COLORS.gray },
});