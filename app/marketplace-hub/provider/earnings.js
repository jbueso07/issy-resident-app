// app/marketplace-hub/provider/earnings.js
// ISSY Marketplace - Provider Earnings Screen
// Línea gráfica ProHome

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { getProviderEarnings, getProviderPayouts, requestPayout } from '../../../src/services/marketplaceApi';

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
  purple: '#A78BFA',
  green: '#10B981',
  blue: '#60A5FA',
  yellow: '#FBBF24',
  red: '#EF4444',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  border: 'rgba(255, 255, 255, 0.1)',
};

const PERIOD_OPTIONS = [
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Año' },
];

export default function ProviderEarningsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [earnings, setEarnings] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [requestingPayout, setRequestingPayout] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [earningsResult, payoutsResult] = await Promise.all([
        getProviderEarnings(selectedPeriod),
        getProviderPayouts(),
      ]);

      if (earningsResult.success) {
        setEarnings(earningsResult.data);
      }
      if (payoutsResult.success) {
        setPayouts(payoutsResult.data.payouts || payoutsResult.data || []);
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleRequestPayout = () => {
    if (!earnings?.available_balance || earnings.available_balance < 10) {
      Alert.alert('Error', 'El saldo mínimo para retiro es de $10');
      return;
    }

    Alert.alert(
      'Solicitar Retiro',
      `¿Deseas retirar $${earnings.available_balance.toFixed(2)} a tu cuenta bancaria?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setRequestingPayout(true);
            try {
              const result = await requestPayout(earnings.available_balance);
              if (result.success) {
                Alert.alert('Éxito', 'Solicitud de retiro enviada. El pago se procesará en 2-3 días hábiles.');
                fetchData();
              } else {
                Alert.alert('Error', result.error || 'No se pudo procesar la solicitud');
              }
            } catch (error) {
              Alert.alert('Error', 'Ocurrió un error al solicitar el retiro');
            } finally {
              setRequestingPayout(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getPayoutStatusColor = (status) => {
    switch (status) {
      case 'completed': return COLORS.green;
      case 'pending': return COLORS.yellow;
      case 'processing': return COLORS.blue;
      case 'failed': return COLORS.red;
      default: return COLORS.textMuted;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.teal} />
        </View>
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
        <Text style={styles.headerTitle}>Mis Ganancias</Text>
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
            colors={[COLORS.teal]}
          />
        }
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Saldo Disponible</Text>
            <Ionicons name="wallet" size={scale(24)} color={COLORS.lime} />
          </View>
          <Text style={styles.balanceAmount}>
            ${(earnings?.available_balance || 0).toFixed(2)}
          </Text>
          <View style={styles.balanceActions}>
            <TouchableOpacity
              style={[styles.withdrawButton, requestingPayout && styles.withdrawButtonDisabled]}
              onPress={handleRequestPayout}
              disabled={requestingPayout}
            >
              {requestingPayout ? (
                <ActivityIndicator color={COLORS.bgPrimary} />
              ) : (
                <>
                  <Ionicons name="arrow-up-circle" size={scale(20)} color={COLORS.bgPrimary} />
                  <Text style={styles.withdrawButtonText}>Retirar Fondos</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bankAccountButton}
              onPress={() => router.push('/marketplace-hub/provider/bank-account')}
            >
              <Ionicons name="business-outline" size={scale(20)} color={COLORS.textPrimary} />
              <Text style={styles.bankAccountButtonText}>Cuenta Bancaria</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodContainer}>
          {PERIOD_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.periodButton,
                selectedPeriod === option.id && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(option.id)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === option.id && styles.periodButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${COLORS.lime}20` }]}>
              <Ionicons name="cash" size={scale(24)} color={COLORS.lime} />
            </View>
            <Text style={styles.statValue}>${(earnings?.total_earned || 0).toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total Ganado</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${COLORS.teal}20` }]}>
              <Ionicons name="checkmark-done" size={scale(24)} color={COLORS.teal} />
            </View>
            <Text style={styles.statValue}>{earnings?.completed_bookings || 0}</Text>
            <Text style={styles.statLabel}>Servicios</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${COLORS.cyan}20` }]}>
              <Ionicons name="trending-up" size={scale(24)} color={COLORS.cyan} />
            </View>
            <Text style={styles.statValue}>${(earnings?.average_earning || 0).toFixed(2)}</Text>
            <Text style={styles.statLabel}>Promedio</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${COLORS.orange}20` }]}>
              <Ionicons name="time" size={scale(24)} color={COLORS.orange} />
            </View>
            <Text style={styles.statValue}>${(earnings?.pending_balance || 0).toFixed(2)}</Text>
            <Text style={styles.statLabel}>Pendiente</Text>
          </View>
        </View>

        {/* Payout History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Historial de Retiros</Text>

          {payouts.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="receipt-outline" size={scale(40)} color={COLORS.textMuted} />
              <Text style={styles.emptyHistoryText}>Sin retiros aún</Text>
            </View>
          ) : (
            payouts.map((payout, index) => (
              <View key={payout.id || index} style={styles.payoutItem}>
                <View style={styles.payoutInfo}>
                  <View style={styles.payoutIconContainer}>
                    <Ionicons
                      name={payout.status === 'completed' ? 'checkmark-circle' : 'time'}
                      size={scale(24)}
                      color={getPayoutStatusColor(payout.status)}
                    />
                  </View>
                  <View>
                    <Text style={styles.payoutAmount}>${payout.amount?.toFixed(2)}</Text>
                    <Text style={styles.payoutDate}>{formatDate(payout.created_at)}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.payoutStatusBadge,
                    { backgroundColor: `${getPayoutStatusColor(payout.status)}20` },
                  ]}
                >
                  <Text
                    style={[styles.payoutStatusText, { color: getPayoutStatusColor(payout.status) }]}
                  >
                    {payout.status === 'completed' ? 'Completado' :
                     payout.status === 'pending' ? 'Pendiente' :
                     payout.status === 'processing' ? 'Procesando' : 'Fallido'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={scale(24)} color={COLORS.cyan} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Sobre tus ganancias</Text>
            <Text style={styles.infoText}>
              Los pagos se procesan dentro de 2-3 días hábiles. ISSY retiene un 15% de comisión por cada servicio completado.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  loadingContainer: {
    flex: 1,
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
  balanceCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(20),
    padding: scale(20),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.lime,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  balanceLabel: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  balanceAmount: {
    fontSize: scale(36),
    fontWeight: '700',
    color: COLORS.lime,
    marginBottom: scale(16),
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    paddingVertical: scale(14),
    borderRadius: scale(12),
    gap: scale(8),
  },
  withdrawButtonDisabled: {
    opacity: 0.7,
  },
  withdrawButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.bgPrimary,
  },
  balanceActions: {
    gap: scale(10),
  },
  bankAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCardAlt,
    paddingVertical: scale(12),
    borderRadius: scale(12),
    gap: scale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bankAccountButtonText: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  periodContainer: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: scale(16),
  },
  periodButton: {
    flex: 1,
    paddingVertical: scale(10),
    borderRadius: scale(8),
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: COLORS.teal,
  },
  periodButtonText: {
    fontSize: scale(13),
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  periodButtonTextActive: {
    color: COLORS.bgPrimary,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
    marginBottom: scale(24),
  },
  statCard: {
    width: (SCREEN_WIDTH - scale(44)) / 2,
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(16),
    alignItems: 'center',
  },
  statIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  statValue: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  statLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  historySection: {
    marginBottom: scale(24),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(12),
  },
  emptyHistory: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(32),
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: scale(14),
    color: COLORS.textMuted,
    marginTop: scale(8),
  },
  payoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(8),
  },
  payoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  payoutIconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.bgCardAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payoutAmount: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  payoutDate: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  payoutStatusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(8),
  },
  payoutStatusText: {
    fontSize: scale(11),
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(16),
    gap: scale(12),
    marginBottom: scale(100),
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  infoText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    lineHeight: scale(18),
  },
});
