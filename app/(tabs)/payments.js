// app/(tabs)/payments.js
// ISSY Resident App - Payments Screen (Diseño Figma)

import { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { getMyPayments } from '../../src/services/api';

// Colors from Figma
const COLORS = {
  background: '#FAFAFA',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#707883',
  grayLight: '#F2F2F2',
  purple: '#7B8CEF',
  lime: '#D4FE48',
  cyan: '#11DAE9',
  navy: '#130F26',
  primary: '#009FF5',
};

export default function Payments() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // pending, history, card

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPayments();
  }, []);

  const formatCurrency = (amount) => {
    return `L.${parseFloat(amount || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric' 
    });
  };

  const handlePayAll = () => {
    Alert.alert('Pagar Todo', 'Funcionalidad de pago próximamente disponible');
  };

  const handlePaySingle = (payment) => {
    Alert.alert('Pagar', `Pagar ${formatCurrency(payment.amount || payment.rent_amount)}`);
  };

  // Filter payments by status
  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'overdue');
  const paidPayments = payments.filter(p => p.status === 'paid');
  const totalPending = pendingPayments.reduce((sum, p) => sum + parseFloat(p.amount || p.rent_amount || 0), 0);

  // Get current tab payments
  const getTabPayments = () => {
    switch (activeTab) {
      case 'pending':
        return pendingPayments;
      case 'history':
        return paidPayments;
      default:
        return [];
    }
  };

  const currentPayments = getTabPayments();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando pagos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[COLORS.primary]} 
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Mis Pagos</Text>
          <Text style={styles.subtitle}>Pagos de mi comunidad</Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceLeft}>
            <Text style={styles.balanceLabel}>Saldo Total</Text>
            <Text style={styles.balanceAmount}>{formatCurrency(totalPending)}</Text>
          </View>
          
          {totalPending > 0 && (
            <TouchableOpacity 
              style={styles.payAllButton}
              onPress={handlePayAll}
              activeOpacity={0.8}
            >
              <Text style={styles.payAllButtonText}>Pagar Todo</Text>
              <View style={styles.payAllArrow}>
                <Ionicons name="arrow-forward" size={18} color={COLORS.lime} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={styles.tab}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[
              styles.tabText, 
              activeTab === 'pending' && styles.tabTextActive
            ]}>
              Pendientes
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tab}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[
              styles.tabText, 
              activeTab === 'history' && styles.tabTextActive
            ]}>
              Historial
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tab}
            onPress={() => setActiveTab('card')}
          >
            <Text style={[
              styles.tabText, 
              activeTab === 'card' && styles.tabTextActive
            ]}>
              Tarjeta
            </Text>
          </TouchableOpacity>
        </View>

        {/* Payment Cards */}
        {activeTab === 'card' ? (
          <View style={styles.emptyCard}>
            <Ionicons name="card-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Métodos de Pago</Text>
            <Text style={styles.emptyText}>Próximamente podrás agregar tus tarjetas</Text>
          </View>
        ) : currentPayments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons 
              name={activeTab === 'pending' ? 'checkmark-circle-outline' : 'receipt-outline'} 
              size={48} 
              color="#D1D5DB" 
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'pending' ? '¡Todo al día!' : 'Sin historial'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'pending' 
                ? 'No tienes pagos pendientes' 
                : 'No hay pagos realizados'}
            </Text>
          </View>
        ) : (
          currentPayments.map((payment) => (
            <View key={payment.id} style={styles.paymentCard}>
              {/* Gradient Bar */}
              <LinearGradient
                colors={[COLORS.lime, COLORS.cyan]}
                style={styles.gradientBar}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              
              {/* Payment Content */}
              <View style={styles.paymentContent}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle}>
                    {payment.charge_type || payment.description || 'Cuota de Mantenimiento'}
                  </Text>
                  <Text style={styles.paymentAmount}>
                    {formatCurrency(payment.amount || payment.rent_amount)}
                  </Text>
                  <Text style={styles.paymentDescription} numberOfLines={2}>
                    Descripción: {payment.description || `Cuota de mes a mes mes de ${payment.period_month}/${payment.period_year}`}
                  </Text>
                  <Text style={styles.paymentDueDate}>
                    Vence: {formatDate(payment.due_date)}
                  </Text>
                </View>
                
                {/* Pay Button - Only show for pending */}
                {activeTab === 'pending' && (
                  <TouchableOpacity 
                    style={styles.payButton}
                    onPress={() => handlePaySingle(payment)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.payButtonText}>Pagar</Text>
                    <Ionicons name="arrow-forward" size={16} color={COLORS.black} />
                  </TouchableOpacity>
                )}
                
                {/* Paid Badge - Only show for history */}
                {activeTab === 'history' && (
                  <View style={styles.paidBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#059669" />
                    <Text style={styles.paidBadgeText}>Pagado</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 21,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.gray,
    fontSize: 14,
  },

  // Header
  header: {
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.black,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.black,
    marginTop: 4,
  },

  // Balance Card
  balanceCard: {
    backgroundColor: COLORS.purple,
    borderRadius: 13,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  balanceLeft: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 14,
    color: COLORS.black,
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.black,
    marginTop: 4,
  },
  payAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.navy,
    paddingVertical: 12,
    paddingLeft: 20,
    paddingRight: 8,
    borderRadius: 30,
  },
  payAllButtonText: {
    fontSize: 14,
    color: COLORS.grayLight,
    marginRight: 8,
  },
  payAllArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 13,
    marginTop: 20,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    color: COLORS.black,
  },
  tabTextActive: {
    color: COLORS.purple,
    fontWeight: '500',
  },

  // Empty State
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 13,
    padding: 40,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
    textAlign: 'center',
  },

  // Payment Card
  paymentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 13,
    marginTop: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  gradientBar: {
    width: 11,
  },
  paymentContent: {
    flex: 1,
    padding: 16,
    paddingLeft: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    flex: 1,
    marginRight: 12,
  },
  paymentTitle: {
    fontSize: 14,
    color: COLORS.black,
  },
  paymentAmount: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  paymentDescription: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 4,
    lineHeight: 14,
  },
  paymentDueDate: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 8,
  },

  // Pay Button
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lime,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 12,
    borderRadius: 30,
    gap: 8,
  },
  payButtonText: {
    fontSize: 14,
    color: COLORS.black,
  },

  // Paid Badge
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  paidBadgeText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
});