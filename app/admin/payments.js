// app/admin/payments.js
// ISSY Resident App - Admin: Gestor de Cobros (ProHome Dark Theme)

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
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
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
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  border: 'rgba(255,255,255,0.1)',
};

const PAYMENT_STATUS = {
  pending: { label: 'Pendiente', color: COLORS.warning, icon: 'time' },
  paid: { label: 'Pagado', color: COLORS.success, icon: 'checkmark-circle' },
  overdue: { label: 'Vencido', color: COLORS.danger, icon: 'alert-circle' },
  cancelled: { label: 'Cancelado', color: COLORS.textMuted, icon: 'close-circle' },
};

const PAYMENT_TYPES = [
  { value: 'maintenance', label: 'Mantenimiento', icon: 'home' },
  { value: 'extraordinary', label: 'Extraordinaria', icon: 'flash' },
  { value: 'fine', label: 'Multa', icon: 'warning' },
  { value: 'service', label: 'Servicio', icon: 'construct' },
  { value: 'other', label: 'Otro', icon: 'document-text' },
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
  
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  
  const [formData, setFormData] = useState({
    user_id: '',
    user_name: '',
    payment_type: 'maintenance',
    concept: '',
    amount: '',
    due_date: getDefaultDueDate(),
  });

  const userRole = profile?.role || user?.role || 'user';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);

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
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchData = async () => {
    try {
      const headers = await getAuthHeaders();
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      
      const [paymentsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/payments${statusParam}`, { headers }),
        fetch(`${API_URL}/api/admin/payments/stats`, { headers }),
      ]);

      const paymentsData = await paymentsRes.json();
      const statsData = await statsRes.json();

      if (paymentsData.success !== false) {
        setPayments(paymentsData.data || paymentsData || []);
      }
      if (statsData.success !== false) {
        setStats(statsData.data || statsData);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [filter]);

  const fetchUsers = async () => {
    if (users.length > 0) {
      setShowUserPicker(true);
      return;
    }

    setLoadingUsers(true);
    setShowUserPicker(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/admin/users`, { headers });
      const data = await response.json();

      if (data.success !== false) {
        setUsers(data.data || data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
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

  const handleCreate = () => {
    setFormData({
      user_id: '',
      user_name: '',
      payment_type: 'maintenance',
      concept: '',
      amount: '',
      due_date: getDefaultDueDate(),
    });
    setShowModal(true);
  };

  const handleMarkPaid = async (payment) => {
    Alert.alert(
      'Confirmar Pago',
      `¿Marcar como pagado?\n${payment.concept || 'Cobro'} - L ${payment.amount}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(`${API_URL}/api/admin/payments/${payment.id}/mark-paid`, {
                method: 'PUT',
                headers,
              });

              if (response.ok) {
                Alert.alert('Éxito', 'Pago registrado');
                fetchData();
              } else {
                Alert.alert('Error', 'No se pudo actualizar');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo actualizar');
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!formData.user_id) {
      Alert.alert('Error', 'Selecciona un residente');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const payload = {
        user_id: formData.user_id,
        payment_type: formData.payment_type,
        concept: formData.concept || PAYMENT_TYPES.find(t => t.value === formData.payment_type)?.label,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        status: 'pending',
      };

      const response = await fetch(`${API_URL}/api/admin/payments`, {
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

  const getPaymentTypeIcon = (type) => {
    return PAYMENT_TYPES.find(t => t.value === type)?.icon || 'document-text';
  };

  const filteredUsers = users.filter(u => {
    const searchLower = userSearch.toLowerCase();
    const name = (u.full_name || u.name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const unit = (u.unit_number || u.unit || '').toLowerCase();
    return name.includes(searchLower) || email.includes(searchLower) || unit.includes(searchLower);
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
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
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Cobros</Text>
          <Text style={styles.headerSubtitle}>Gestión de pagos</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
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
        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
              <Text style={[styles.statValue, { color: COLORS.success }]}>
                {formatCurrency(stats.total_collected || stats.totalCollected || 0)}
              </Text>
              <Text style={styles.statLabel}>Recaudado</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time" size={22} color={COLORS.warning} />
              <Text style={[styles.statValue, { color: COLORS.warning }]}>
                {formatCurrency(stats.total_pending || stats.totalPending || 0)}
              </Text>
              <Text style={styles.statLabel}>Pendiente</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="alert-circle" size={22} color={COLORS.danger} />
              <Text style={[styles.statValue, { color: COLORS.danger }]}>
                {formatCurrency(stats.total_overdue || stats.totalOverdue || 0)}
              </Text>
              <Text style={styles.statLabel}>Vencido</Text>
            </View>
          </View>
        )}

        {/* Filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filters}
        >
          {['all', 'pending', 'paid', 'overdue'].map((f) => {
            const isActive = filter === f;
            const statusInfo = PAYMENT_STATUS[f];
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterButton, isActive && styles.filterButtonActive]}
                onPress={() => setFilter(f)}
              >
                {f !== 'all' && (
                  <Ionicons 
                    name={statusInfo?.icon || 'list'} 
                    size={14} 
                    color={isActive ? COLORS.background : COLORS.textSecondary} 
                  />
                )}
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {f === 'all' ? 'Todos' : statusInfo?.label || f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Payments List */}
        {payments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cash-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No hay cobros</Text>
            <Text style={styles.emptySubtitle}>Crea tu primer cobro</Text>
          </View>
        ) : (
          payments.map((payment) => {
            const statusInfo = PAYMENT_STATUS[payment.status] || PAYMENT_STATUS.pending;
            return (
              <View key={payment.id} style={styles.paymentCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons 
                      name={getPaymentTypeIcon(payment.payment_type)} 
                      size={20} 
                      color={COLORS.teal} 
                    />
                  </View>
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
                    <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                  <View style={styles.dueDateContainer}>
                    <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.dueDate}>{formatDate(payment.due_date)}</Text>
                  </View>
                </View>

                {(payment.status === 'pending' || payment.status === 'overdue') && (
                  <TouchableOpacity
                    style={styles.markPaidButton}
                    onPress={() => handleMarkPaid(payment)}
                  >
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                    <Text style={styles.markPaidText}>Marcar como Pagado</Text>
                  </TouchableOpacity>
                )}
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
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nuevo Cobro</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.lime} />
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
                onPress={fetchUsers}
              >
                <Text style={formData.user_name ? styles.selectorText : styles.selectorPlaceholder}>
                  {formData.user_name || 'Seleccionar residente...'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Tipo de Cobro */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tipo de Cobro</Text>
              <View style={styles.typeGrid}>
                {PAYMENT_TYPES.map((type) => {
                  const isSelected = formData.payment_type === type.value;
                  return (
                    <TouchableOpacity
                      key={type.value}
                      style={[styles.typeButton, isSelected && styles.typeButtonActive]}
                      onPress={() => setFormData({ ...formData, payment_type: type.value })}
                    >
                      <Ionicons 
                        name={type.icon} 
                        size={24} 
                        color={isSelected ? COLORS.lime : COLORS.textSecondary} 
                      />
                      <Text style={[styles.typeLabel, isSelected && styles.typeLabelActive]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Concepto */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Descripción (opcional)</Text>
              <TextInput
                style={styles.formInput}
                value={formData.concept}
                onChangeText={(text) => setFormData({ ...formData, concept: text })}
                placeholder="Ej: Cuota Diciembre 2025"
                placeholderTextColor={COLORS.textMuted}
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
                placeholderTextColor={COLORS.textMuted}
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
                placeholderTextColor={COLORS.textMuted}
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
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowUserPicker(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Seleccionar Residente</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Búsqueda */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={userSearch}
              onChangeText={setUserSearch}
              placeholder="Buscar por nombre, email o unidad..."
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          {loadingUsers ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.lime} />
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
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
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
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: scale(16),
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: scale(12),
    borderRadius: scale(12),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: scale(13),
    fontWeight: '700',
    marginTop: scale(4),
  },
  statLabel: {
    fontSize: scale(10),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  
  // Filters
  filtersScroll: {
    marginBottom: scale(16),
    marginHorizontal: scale(-16),
  },
  filters: {
    flexDirection: 'row',
    gap: scale(8),
    paddingHorizontal: scale(16),
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(6),
  },
  filterButtonActive: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  filterText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.background,
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: scale(60),
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
  
  // Payment Card
  paymentCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  cardIconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    backgroundColor: COLORS.teal + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  cardHeaderLeft: {
    flex: 1,
  },
  paymentConcept: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  paymentUser: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  paymentAmount: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(8),
    gap: scale(4),
  },
  statusText: {
    fontSize: scale(12),
    fontWeight: '500',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  dueDate: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  markPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success + '15',
    padding: scale(12),
    borderRadius: scale(10),
    marginTop: scale(12),
    gap: scale(6),
  },
  markPaidText: {
    color: COLORS.success,
    fontWeight: '600',
    fontSize: scale(14),
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
  formHint: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginTop: scale(4),
  },
  
  // Selector
  selectorButton: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(10),
    paddingHorizontal: scale(14),
    paddingVertical: scale(14),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: {
    fontSize: scale(16),
    color: COLORS.textPrimary,
  },
  selectorPlaceholder: {
    fontSize: scale(16),
    color: COLORS.textMuted,
  },
  
  // Type Grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  typeButton: {
    width: '48%',
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: scale(10),
    padding: scale(12),
    alignItems: 'center',
    marginBottom: scale(4),
  },
  typeButtonActive: {
    borderColor: COLORS.lime,
    backgroundColor: COLORS.lime + '15',
  },
  typeLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: scale(4),
  },
  typeLabelActive: {
    color: COLORS.lime,
    fontWeight: '600',
  },
  
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchIcon: {
    position: 'absolute',
    left: scale(28),
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    paddingHorizontal: scale(40),
    paddingVertical: scale(12),
    fontSize: scale(16),
    color: COLORS.textPrimary,
  },
  
  // User List
  userList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  userAvatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.teal + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  userAvatarText: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.teal,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: scale(16),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  userDetail: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
});