// app/(tabs)/payments.js
// ISSY Resident App - Payments Screen - ProHome Dark Theme

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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { getMyPayments } from '../../src/services/api';
import { useTranslation } from '../../src/hooks/useTranslation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ProHome Dark Theme Colors
const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  card: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  teal: '#5DDED8',
  tealDark: '#4BCDC7',
  lime: '#D4FE48',
  purple: '#6366F1',
  purpleLight: '#818CF8',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  green: '#10B981',
  red: '#EF4444',
  yellow: '#F59E0B',
  blue: '#3B82F6',
};

export default function Payments() {
  const router = useRouter();
  const { profile } = useAuth();
  const { t, language } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

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
    return `L ${parseFloat(amount || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric' 
    });
  };

  const handlePayAll = () => {
    Alert.alert(t('payments.payAll'), t('payments.comingSoon'));
  };

  const handlePaySingle = (payment) => {
    Alert.alert(t('payments.pay'), `${t('payments.pay')} ${formatCurrency(payment.amount || payment.rent_amount)}`);
  };

  const handleGoToMethods = () => {
    router.push('/payment-methods');
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>{t('payments.loading')}</Text>
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
            tintColor={COLORS.purple}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('payments.title')}</Text>
            <Text style={styles.subtitle}>{t('payments.subtitle')}</Text>
          </View>
          <TouchableOpacity style={styles.methodsBtn} onPress={handleGoToMethods}>
            <Ionicons name="card-outline" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceDecoration}>
            <View style={[styles.decoCircle, styles.decoCircle1]} />
            <View style={[styles.decoCircle, styles.decoCircle2]} />
          </View>
          <View style={styles.balanceContent}>
            <View style={styles.balanceLeft}>
              <Text style={styles.balanceLabel}>{t('payments.pendingBalance')}</Text>
              <Text style={styles.balanceAmount}>{formatCurrency(totalPending)}</Text>
              <Text style={styles.balanceCount}>
                {pendingPayments.length} {pendingPayments.length === 1 ? t('payments.pendingPayment') : t('payments.pendingPayments')}
              </Text>
            </View>
            
            {totalPending > 0 && (
              <TouchableOpacity 
                style={styles.payAllButton}
                onPress={handlePayAll}
                activeOpacity={0.8}
              >
                <Text style={styles.payAllButtonText}>{t('payments.pay')}</Text>
                <View style={styles.payAllArrow}>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.background} />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
            onPress={() => setActiveTab('pending')}
          >
            <Ionicons 
              name="time-outline" 
              size={18} 
              color={activeTab === 'pending' ? COLORS.background : COLORS.textSecondary} 
            />
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              {t('payments.tabs.pending')}
            </Text>
            {pendingPayments.length > 0 && (
              <View style={[styles.tabBadge, activeTab === 'pending' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'pending' && styles.tabBadgeTextActive]}>
                  {pendingPayments.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Ionicons 
              name="checkmark-done-outline" 
              size={18} 
              color={activeTab === 'history' ? COLORS.background : COLORS.textSecondary} 
            />
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              {t('payments.tabs.history')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'card' && styles.tabActive]}
            onPress={() => setActiveTab('card')}
          >
            <Ionicons 
              name="card-outline" 
              size={18} 
              color={activeTab === 'card' ? COLORS.background : COLORS.textSecondary} 
            />
            <Text style={[styles.tabText, activeTab === 'card' && styles.tabTextActive]}>
              {t('payments.tabs.cards')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'card' ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="card-outline" size={48} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>{t('payments.paymentMethods')}</Text>
            <Text style={styles.emptyText}>{t('payments.addCardsText')}</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleGoToMethods}>
              <Ionicons name="add" size={20} color={COLORS.textPrimary} />
              <Text style={styles.emptyButtonText}>{t('payments.addCard')}</Text>
            </TouchableOpacity>
          </View>
        ) : currentPayments.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <Ionicons 
                name={activeTab === 'pending' ? 'checkmark-circle-outline' : 'receipt-outline'} 
                size={48} 
                color={COLORS.textMuted} 
              />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'pending' ? t('payments.empty.upToDate') : t('payments.empty.noHistory')}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'pending' 
                ? t('payments.empty.noPending')
                : t('payments.empty.noPayments')}
            </Text>
          </View>
        ) : (
          <View style={styles.paymentsList}>
            {currentPayments.map((payment) => (
              <View key={payment.id} style={styles.paymentCard}>
                {/* Status Indicator */}
                <View style={[styles.statusBar, { 
                  backgroundColor: payment.status === 'paid' ? COLORS.green : 
                                  payment.status === 'overdue' ? COLORS.red : COLORS.yellow 
                }]} />
                
                {/* Payment Content */}
                <View style={styles.paymentContent}>
                  <View style={styles.paymentTop}>
                    <View style={styles.paymentInfo}>
                      <View style={[styles.paymentIconBox, {
                        backgroundColor: payment.status === 'paid' ? 'rgba(16, 185, 129, 0.15)' :
                                        payment.status === 'overdue' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'
                      }]}>
                        <Ionicons 
                          name={payment.status === 'paid' ? 'checkmark-circle' : 
                                payment.status === 'overdue' ? 'alert-circle' : 'time'} 
                          size={22} 
                          color={payment.status === 'paid' ? COLORS.green : 
                                payment.status === 'overdue' ? COLORS.red : COLORS.yellow}
                        />
                      </View>
                      <View style={styles.paymentDetails}>
                        <Text style={styles.paymentTitle}>
                          {payment.charge_type || payment.description || 'Cuota de Mantenimiento'}
                        </Text>
                        <Text style={styles.paymentDueDate}>
                          {payment.status === 'paid' ? 'Pagado: ' : 'Vence: '}{formatDate(payment.due_date || payment.payment_date)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.paymentAmount, {
                      color: payment.status === 'paid' ? COLORS.green : 
                            payment.status === 'overdue' ? COLORS.red : COLORS.textPrimary
                    }]}>
                      {formatCurrency(payment.amount || payment.rent_amount)}
                    </Text>
                  </View>
                  
                  {/* Pay Button - Only show for pending */}
                  {activeTab === 'pending' && (
                    <TouchableOpacity 
                      style={styles.payButton}
                      onPress={() => handlePaySingle(payment)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.payButtonText}>Pagar Ahora</Text>
                      <Ionicons name="arrow-forward" size={16} color={COLORS.background} />
                    </TouchableOpacity>
                  )}
                  
                  {/* Paid Badge - Only show for history */}
                  {activeTab === 'history' && (
                    <View style={styles.paidBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
                      <Text style={styles.paidBadgeText}>Pagado</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: scale(100) }} />
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
    paddingHorizontal: scale(20),
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: scale(16),
    paddingBottom: scale(12),
  },
  title: {
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(4),
  },
  methodsBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },

  // Balance Card
  balanceCard: {
    backgroundColor: COLORS.purple,
    borderRadius: scale(20),
    padding: scale(20),
    marginTop: scale(8),
    overflow: 'hidden',
  },
  balanceDecoration: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  decoCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decoCircle1: {
    width: scale(150),
    height: scale(150),
    top: scale(-50),
    right: scale(-30),
  },
  decoCircle2: {
    width: scale(100),
    height: scale(100),
    bottom: scale(-40),
    left: scale(-20),
  },
  balanceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  balanceLeft: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: scale(13),
    color: 'rgba(255, 255, 255, 0.8)',
  },
  balanceAmount: {
    fontSize: scale(28),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: scale(4),
  },
  balanceCount: {
    fontSize: scale(12),
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: scale(4),
  },
  payAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lime,
    paddingVertical: scale(12),
    paddingLeft: scale(20),
    paddingRight: scale(6),
    borderRadius: scale(30),
    gap: scale(8),
  },
  payAllButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.background,
  },
  payAllArrow: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: scale(16),
    marginTop: scale(20),
    padding: scale(4),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(12),
    borderRadius: scale(12),
    gap: scale(6),
  },
  tabActive: {
    backgroundColor: COLORS.lime,
  },
  tabText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.background,
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: COLORS.red,
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(10),
    minWidth: scale(20),
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: COLORS.background,
  },
  tabBadgeText: {
    fontSize: scale(11),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  tabBadgeTextActive: {
    color: COLORS.lime,
  },

  // Empty State
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: scale(20),
    padding: scale(40),
    alignItems: 'center',
    marginTop: scale(20),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  emptyIconBox: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: COLORS.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  emptyTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(4),
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purple,
    paddingVertical: scale(12),
    paddingHorizontal: scale(20),
    borderRadius: scale(12),
    marginTop: scale(20),
    gap: scale(8),
  },
  emptyButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // Payments List
  paymentsList: {
    marginTop: scale(16),
  },

  // Payment Card
  paymentCard: {
    backgroundColor: COLORS.card,
    borderRadius: scale(16),
    marginBottom: scale(12),
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statusBar: {
    width: scale(4),
  },
  paymentContent: {
    flex: 1,
    padding: scale(16),
  },
  paymentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: scale(12),
  },
  paymentIconBox: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  paymentDetails: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  paymentDueDate: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(4),
  },
  paymentAmount: {
    fontSize: scale(18),
    fontWeight: '700',
  },

  // Pay Button
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    paddingVertical: scale(12),
    borderRadius: scale(12),
    marginTop: scale(12),
    gap: scale(8),
  },
  payButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.background,
  },

  // Paid Badge
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: scale(6),
    paddingHorizontal: scale(12),
    borderRadius: scale(20),
    marginTop: scale(12),
    gap: scale(4),
  },
  paidBadgeText: {
    fontSize: scale(12),
    color: COLORS.green,
    fontWeight: '500',
  },
});