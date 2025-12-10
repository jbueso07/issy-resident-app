// app/admin/reports.js
// ISSY Resident App - Admin: Reportes y Estadísticas

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.joinissy.com';
const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#84CC16',
  secondary: '#009FF5',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  navy: '#1A1A2E',
  white: '#FFFFFF',
  background: '#F3F4F6',
  gray: '#6B7280',
  grayLight: '#E5E7EB',
  grayLighter: '#F9FAFB',
};

export default function AdminReports() {
  const { user, profile } = useAuth();
  const router = useRouter();
  
  const [globalStats, setGlobalStats] = useState(null);
  const [trends, setTrends] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      
      // Fetch global stats
      const globalRes = await fetch(`${API_URL}/api/stats/global`, { headers });
      const globalData = await globalRes.json();
      if (globalData.success || globalData.data) {
        setGlobalStats(globalData.data || globalData);
      }
      
      // Fetch trends
      const trendsRes = await fetch(`${API_URL}/api/stats/trends`, { headers });
      const trendsData = await trendsRes.json();
      if (trendsData.success || trendsData.data) {
        setTrends(trendsData.data || trendsData);
      }

      // Fetch activity
      const activityRes = await fetch(`${API_URL}/api/stats/activity`, { headers });
      const activityData = await activityRes.json();
      if (activityData.success || activityData.data) {
        setActivity(activityData.data || activityData);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const formatCurrency = (amount) => {
    return `L ${parseFloat(amount || 0).toLocaleString('es-HN', { minimumFractionDigits: 0 })}`;
  };

  const formatPercent = (value) => {
    const num = parseFloat(value || 0);
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando reportes...</Text>
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
          <Text style={styles.headerTitle}>📈 Reportes</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Overview Cards */}
        <Text style={styles.sectionTitle}>Resumen General</Text>
        <View style={styles.overviewGrid}>
          <View style={[styles.overviewCard, { backgroundColor: COLORS.secondary + '15' }]}>
            <Text style={styles.overviewIcon}>👥</Text>
            <Text style={styles.overviewValue}>
              {globalStats?.totalUsers || globalStats?.users || 0}
            </Text>
            <Text style={styles.overviewLabel}>Usuarios</Text>
          </View>
          
          <View style={[styles.overviewCard, { backgroundColor: COLORS.success + '15' }]}>
            <Text style={styles.overviewIcon}>🏠</Text>
            <Text style={styles.overviewValue}>
              {globalStats?.totalUnits || globalStats?.units || 0}
            </Text>
            <Text style={styles.overviewLabel}>Unidades</Text>
          </View>
          
          <View style={[styles.overviewCard, { backgroundColor: COLORS.warning + '15' }]}>
            <Text style={styles.overviewIcon}>📅</Text>
            <Text style={styles.overviewValue}>
              {globalStats?.totalReservations || globalStats?.reservations || 0}
            </Text>
            <Text style={styles.overviewLabel}>Reservaciones</Text>
          </View>
          
          <View style={[styles.overviewCard, { backgroundColor: COLORS.purple + '15' }]}>
            <Text style={styles.overviewIcon}>🚗</Text>
            <Text style={styles.overviewValue}>
              {globalStats?.totalAccess || globalStats?.accessLogs || 0}
            </Text>
            <Text style={styles.overviewLabel}>Accesos</Text>
          </View>
        </View>

        {/* Financial Summary */}
        <Text style={styles.sectionTitle}>Resumen Financiero</Text>
        <View style={styles.financialCard}>
          <View style={styles.financialRow}>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Ingresos del Mes</Text>
              <Text style={[styles.financialValue, { color: COLORS.success }]}>
                {formatCurrency(globalStats?.monthlyIncome || globalStats?.income || 0)}
              </Text>
            </View>
            <View style={styles.financialDivider} />
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Gastos del Mes</Text>
              <Text style={[styles.financialValue, { color: COLORS.danger }]}>
                {formatCurrency(globalStats?.monthlyExpenses || globalStats?.expenses || 0)}
              </Text>
            </View>
          </View>
          
          <View style={styles.financialBalance}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text style={[
              styles.balanceValue,
              { color: (globalStats?.balance || 0) >= 0 ? COLORS.success : COLORS.danger }
            ]}>
              {formatCurrency(globalStats?.balance || 0)}
            </Text>
          </View>
        </View>

        {/* Trends */}
        {trends && (
          <>
            <Text style={styles.sectionTitle}>Tendencias (vs mes anterior)</Text>
            <View style={styles.trendsContainer}>
              <View style={styles.trendCard}>
                <Text style={styles.trendLabel}>Usuarios</Text>
                <Text style={[
                  styles.trendValue,
                  { color: (trends.usersChange || 0) >= 0 ? COLORS.success : COLORS.danger }
                ]}>
                  {formatPercent(trends.usersChange || trends.users_change)}
                </Text>
              </View>
              
              <View style={styles.trendCard}>
                <Text style={styles.trendLabel}>Ingresos</Text>
                <Text style={[
                  styles.trendValue,
                  { color: (trends.incomeChange || 0) >= 0 ? COLORS.success : COLORS.danger }
                ]}>
                  {formatPercent(trends.incomeChange || trends.income_change)}
                </Text>
              </View>
              
              <View style={styles.trendCard}>
                <Text style={styles.trendLabel}>Reservaciones</Text>
                <Text style={[
                  styles.trendValue,
                  { color: (trends.reservationsChange || 0) >= 0 ? COLORS.success : COLORS.danger }
                ]}>
                  {formatPercent(trends.reservationsChange || trends.reservations_change)}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Collection Rate */}
        <Text style={styles.sectionTitle}>Tasa de Cobranza</Text>
        <View style={styles.collectionCard}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${Math.min(globalStats?.collectionRate || 0, 100)}%`,
                    backgroundColor: (globalStats?.collectionRate || 0) >= 80 ? COLORS.success : COLORS.warning
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {(globalStats?.collectionRate || 0).toFixed(1)}%
            </Text>
          </View>
          <View style={styles.collectionDetails}>
            <View style={styles.collectionItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.collectionLabel}>Pagado</Text>
              <Text style={styles.collectionValue}>
                {formatCurrency(globalStats?.totalPaid || 0)}
              </Text>
            </View>
            <View style={styles.collectionItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.collectionLabel}>Pendiente</Text>
              <Text style={styles.collectionValue}>
                {formatCurrency(globalStats?.totalPending || 0)}
              </Text>
            </View>
            <View style={styles.collectionItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.danger }]} />
              <Text style={styles.collectionLabel}>Vencido</Text>
              <Text style={styles.collectionValue}>
                {formatCurrency(globalStats?.totalOverdue || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        {activity && activity.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Actividad Reciente</Text>
            <View style={styles.activityCard}>
              {activity.slice(0, 5).map((item, index) => (
                <View key={index} style={styles.activityItem}>
                  <Text style={styles.activityIcon}>
                    {item.type === 'payment' ? '💰' : 
                     item.type === 'reservation' ? '📅' :
                     item.type === 'access' ? '🚗' :
                     item.type === 'user' ? '👤' : '📌'}
                  </Text>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityText}>{item.description || item.message}</Text>
                    <Text style={styles.activityTime}>{item.time || item.created_at}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/admin/payments')}
          >
            <Text style={styles.actionIcon}>💰</Text>
            <Text style={styles.actionLabel}>Ver Cobros</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/admin/expenses')}
          >
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionLabel}>Ver Gastos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/admin/users')}
          >
            <Text style={styles.actionIcon}>👥</Text>
            <Text style={styles.actionLabel}>Ver Usuarios</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/admin/announcements')}
          >
            <Text style={styles.actionIcon}>📢</Text>
            <Text style={styles.actionLabel}>Anuncios</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
  content: { flex: 1 },
  scrollContent: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.navy, marginBottom: 12, marginTop: 8 },
  
  // Overview Grid
  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  overviewCard: { width: (width - 42) / 2, padding: 16, borderRadius: 12, alignItems: 'center' },
  overviewIcon: { fontSize: 28, marginBottom: 8 },
  overviewValue: { fontSize: 24, fontWeight: '700', color: COLORS.navy },
  overviewLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  
  // Financial Card
  financialCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 8 },
  financialRow: { flexDirection: 'row', alignItems: 'center' },
  financialItem: { flex: 1, alignItems: 'center' },
  financialLabel: { fontSize: 12, color: COLORS.gray, marginBottom: 4 },
  financialValue: { fontSize: 18, fontWeight: '700' },
  financialDivider: { width: 1, height: 40, backgroundColor: COLORS.grayLight },
  financialBalance: { alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.grayLight },
  balanceLabel: { fontSize: 12, color: COLORS.gray, marginBottom: 4 },
  balanceValue: { fontSize: 24, fontWeight: '700' },
  
  // Trends
  trendsContainer: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  trendCard: { flex: 1, backgroundColor: COLORS.white, padding: 14, borderRadius: 10, alignItems: 'center' },
  trendLabel: { fontSize: 12, color: COLORS.gray, marginBottom: 4 },
  trendValue: { fontSize: 18, fontWeight: '700' },
  
  // Collection
  collectionCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 8 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  progressBar: { flex: 1, height: 12, backgroundColor: COLORS.grayLight, borderRadius: 6, marginRight: 12, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },
  progressText: { fontSize: 16, fontWeight: '600', color: COLORS.navy, width: 50, textAlign: 'right' },
  collectionDetails: { gap: 8 },
  collectionItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  collectionLabel: { flex: 1, fontSize: 13, color: COLORS.gray },
  collectionValue: { fontSize: 13, fontWeight: '600', color: COLORS.navy },
  
  // Activity
  activityCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 12, marginBottom: 8 },
  activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.grayLighter },
  activityIcon: { fontSize: 20, marginRight: 12 },
  activityInfo: { flex: 1 },
  activityText: { fontSize: 13, color: COLORS.navy },
  activityTime: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  
  // Actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { width: (width - 42) / 2, backgroundColor: COLORS.white, padding: 16, borderRadius: 12, alignItems: 'center' },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 13, color: COLORS.navy, fontWeight: '500' },
});