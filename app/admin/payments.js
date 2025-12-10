// app/admin/payments.js
// ISSY Resident App - Admin: Gestor de Cobros

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

export default function AdminPayments() {
  const { user, profile } = useAuth();
  const router = useRouter();
  
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, paid, overdue
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    user_id: '',
    concept: '',
    amount: '',
    due_date: '',
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
      concept: '',
      amount: '',
      due_date: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.concept.trim() || !formData.amount) {
      Alert.alert('Error', 'Concepto y monto son requeridos');
      return;
    }

    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          location_id: profile?.location_id,
        }),
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Cobro creado');
        setShowModal(false);
        fetchData();
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'No se pudo crear');
      }
    } catch (error) {
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>💰 Gestor de Cobros</Text>
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
                    <Text style={styles.paymentConcept}>{payment.concept}</Text>
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

      {/* Modal Crear */}
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
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Concepto *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.concept}
                onChangeText={(text) => setFormData({ ...formData, concept: text })}
                placeholder="Ej: Cuota de mantenimiento"
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
              <Text style={styles.formLabel}>Fecha de vencimiento</Text>
              <TextInput
                style={styles.formInput}
                value={formData.due_date}
                onChangeText={(text) => setFormData({ ...formData, due_date: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.gray}
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
  modalContainer: { flex: 1, backgroundColor: COLORS.white },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  modalCancel: { fontSize: 16, color: COLORS.gray },
  modalTitle: { fontSize: 17, fontWeight: '600', color: COLORS.navy },
  modalSave: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  modalContent: { flex: 1, padding: 16 },
  formGroup: { marginBottom: 20 },
  formLabel: { fontSize: 14, fontWeight: '600', color: COLORS.navy, marginBottom: 8 },
  formInput: { backgroundColor: COLORS.grayLighter, borderWidth: 1, borderColor: COLORS.grayLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: COLORS.navy },
});