import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { getMyPayments } from '../../src/services/api';

export default function Payments() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const result = await getMyPayments();
      if (result.success) {
        setPayments(result.data || []);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPayments();
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'paid':
        return { bg: '#D1FAE5', text: '#059669', label: 'Pagado' };
      case 'pending':
        return { bg: '#FEF3C7', text: '#D97706', label: 'Pendiente' };
      case 'overdue':
        return { bg: '#FEE2E2', text: '#DC2626', label: 'Vencido' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280', label: status };
    }
  };

  const formatCurrency = (amount) => {
    return `L. ${parseFloat(amount || 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'overdue');
  const totalPending = pendingPayments.reduce((sum, p) => sum + parseFloat(p.amount || p.rent_amount || 0), 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Cargando pagos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Mis Pagos</Text>
          <Text style={styles.subtitle}>{profile?.location?.name || 'Mi Comunidad'}</Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo Pendiente</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(totalPending)}</Text>
          {totalPending > 0 && (
            <TouchableOpacity style={styles.payButton}>
              <Text style={styles.payButtonText}>Pagar Ahora</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Payment History */}
        <Text style={styles.sectionTitle}>Historial</Text>
        
        {payments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No hay pagos registrados</Text>
          </View>
        ) : (
          payments.map((payment) => {
            const status = getStatusStyle(payment.status);
            return (
              <View key={payment.id} style={styles.paymentCard}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentType}>
                    {payment.period_month ? `${payment.period_month}/${payment.period_year}` : payment.charge_type || 'Pago'}
                  </Text>
                  <Text style={styles.paymentDescription} numberOfLines={1}>
                    {payment.description || payment.unit?.name || 'Sin descripción'}
                  </Text>
                  <Text style={styles.paymentDate}>
                    Vence: {formatDate(payment.due_date)}
                  </Text>
                </View>
                <View style={styles.paymentRight}>
                  <Text style={styles.paymentAmount}>{formatCurrency(payment.amount || payment.rent_amount)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  balanceCard: {
    backgroundColor: '#6366F1',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 24,
    marginBottom: 24,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 8,
  },
  payButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  payButtonText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    flex: 1,
    marginRight: 12,
  },
  paymentType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textTransform: 'capitalize',
  },
  paymentDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  paymentDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
