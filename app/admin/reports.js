// app/admin/reports.js
// ISSY Resident App - Admin: Reportes y Estadísticas (ProHome Dark Theme)

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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.joinissy.com';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

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

  const getActivityIcon = (type) => {
    switch(type) {
      case 'payment': return 'card';
      case 'reservation': return 'calendar';
      case 'access': return 'car';
      case 'user': return 'person';
      default: return 'pin';
    }
  };

  const getActivityColor = (type) => {
    switch(type) {
      case 'payment': return COLORS.success;
      case 'reservation': return COLORS.purple;
      case 'access': return COLORS.teal;
      case 'user': return COLORS.blue;
      default: return COLORS.lime;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
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
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Reportes</Text>
          <Text style={styles.headerSubtitle}>Estadísticas y métricas</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color={COLORS.textSecondary} />
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
        {/* Overview Cards */}
        <Text style={styles.sectionTitle}>Resumen General</Text>
        <View style={styles.overviewGrid}>
          <View style={[styles.overviewCard, { borderLeftColor: COLORS.blue }]}>
            <View style={[styles.overviewIconContainer, { backgroundColor: COLORS.blue + '20' }]}>
              <Ionicons name="people" size={24} color={COLORS.blue} />
            </View>
            <Text style={styles.overviewValue}>
              {globalStats?.totalUsers || globalStats?.users || 0}
            </Text>
            <Text style={styles.overviewLabel}>Usuarios</Text>
          </View>
          
          <View style={[styles.overviewCard, { borderLeftColor: COLORS.success }]}>
            <View style={[styles.overviewIconContainer, { backgroundColor: COLORS.success + '20' }]}>
              <Ionicons name="home" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.overviewValue}>
              {globalStats?.totalUnits || globalStats?.units || 0}
            </Text>
            <Text style={styles.overviewLabel}>Unidades</Text>
          </View>
          
          <View style={[styles.overviewCard, { borderLeftColor: COLORS.purple }]}>
            <View style={[styles.overviewIconContainer, { backgroundColor: COLORS.purple + '20' }]}>
              <Ionicons name="calendar" size={24} color={COLORS.purple} />
            </View>
            <Text style={styles.overviewValue}>
              {globalStats?.totalReservations || globalStats?.reservations || 0}
            </Text>
            <Text style={styles.overviewLabel}>Reservaciones</Text>
          </View>
          
          <View style={[styles.overviewCard, { borderLeftColor: COLORS.teal }]}>
            <View style={[styles.overviewIconContainer, { backgroundColor: COLORS.teal + '20' }]}>
              <Ionicons name="car" size={24} color={COLORS.teal} />
            </View>
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
              <Ionicons name="trending-up" size={20} color={COLORS.success} />
              <Text style={styles.financialLabel}>Ingresos del Mes</Text>
              <Text style={[styles.financialValue, { color: COLORS.success }]}>
                {formatCurrency(globalStats?.monthlyIncome || globalStats?.income || 0)}
              </Text>
            </View>
            <View style={styles.financialDivider} />
            <View style={styles.financialItem}>
              <Ionicons name="trending-down" size={20} color={COLORS.danger} />
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
              { color: (globalStats?.monthlyIncome || 0) - (globalStats?.monthlyExpenses || 0) >= 0 ? COLORS.lime : COLORS.danger }
            ]}>
              {formatCurrency((globalStats?.monthlyIncome || 0) - (globalStats?.monthlyExpenses || 0))}
            </Text>
          </View>
        </View>

        {/* Trends */}
        {trends && (
          <>
            <Text style={styles.sectionTitle}>Tendencias vs Mes Anterior</Text>
            <View style={styles.trendsContainer}>
              <View style={styles.trendCard}>
                <Ionicons 
                  name={(trends.usersChange || 0) >= 0 ? 'arrow-up' : 'arrow-down'} 
                  size={18} 
                  color={(trends.usersChange || 0) >= 0 ? COLORS.success : COLORS.danger} 
                />
                <Text style={styles.trendLabel}>Usuarios</Text>
                <Text style={[
                  styles.trendValue,
                  { color: (trends.usersChange || 0) >= 0 ? COLORS.success : COLORS.danger }
                ]}>
                  {formatPercent(trends.usersChange || trends.users_change)}
                </Text>
              </View>
              
              <View style={styles.trendCard}>
                <Ionicons 
                  name={(trends.incomeChange || 0) >= 0 ? 'arrow-up' : 'arrow-down'} 
                  size={18} 
                  color={(trends.incomeChange || 0) >= 0 ? COLORS.success : COLORS.danger} 
                />
                <Text style={styles.trendLabel}>Ingresos</Text>
                <Text style={[
                  styles.trendValue,
                  { color: (trends.incomeChange || 0) >= 0 ? COLORS.success : COLORS.danger }
                ]}>
                  {formatPercent(trends.incomeChange || trends.income_change)}
                </Text>
              </View>
              
              <View style={styles.trendCard}>
                <Ionicons 
                  name={(trends.reservationsChange || 0) >= 0 ? 'arrow-up' : 'arrow-down'} 
                  size={18} 
                  color={(trends.reservationsChange || 0) >= 0 ? COLORS.success : COLORS.danger} 
                />
                <Text style={styles.trendLabel}>Reservas</Text>
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
              <Text style={[styles.collectionValue, { color: COLORS.success }]}>
                {formatCurrency(globalStats?.totalPaid || 0)}
              </Text>
            </View>
            <View style={styles.collectionItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.collectionLabel}>Pendiente</Text>
              <Text style={[styles.collectionValue, { color: COLORS.warning }]}>
                {formatCurrency(globalStats?.totalPending || 0)}
              </Text>
            </View>
            <View style={styles.collectionItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.danger }]} />
              <Text style={styles.collectionLabel}>Vencido</Text>
              <Text style={[styles.collectionValue, { color: COLORS.danger }]}>
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
                <View 
                  key={index} 
                  style={[
                    styles.activityItem,
                    index === activity.slice(0, 5).length - 1 && { borderBottomWidth: 0 }
                  ]}
                >
                  <View style={[
                    styles.activityIconContainer,
                    { backgroundColor: getActivityColor(item.type) + '20' }
                  ]}>
                    <Ionicons 
                      name={getActivityIcon(item.type)} 
                      size={18} 
                      color={getActivityColor(item.type)} 
                    />
                  </View>
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
            <View style={[styles.actionIconContainer, { backgroundColor: COLORS.success + '20' }]}>
              <Ionicons name="card" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.actionLabel}>Ver Cobros</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/admin/expenses')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: COLORS.danger + '20' }]}>
              <Ionicons name="trending-down" size={24} color={COLORS.danger} />
            </View>
            <Text style={styles.actionLabel}>Ver Gastos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/admin/users')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: COLORS.blue + '20' }]}>
              <Ionicons name="people" size={24} color={COLORS.blue} />
            </View>
            <Text style={styles.actionLabel}>Ver Usuarios</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/admin/announcements')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: COLORS.purple + '20' }]}>
              <Ionicons name="megaphone" size={24} color={COLORS.purple} />
            </View>
            <Text style={styles.actionLabel}>Anuncios</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: scale(100) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: scale(12), 
    color: COLORS.textSecondary, 
    fontSize: scale(14) 
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
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitleContainer: { 
    flex: 1, 
    marginLeft: scale(12) 
  },
  headerTitle: { 
    fontSize: scale(18), 
    fontWeight: '700', 
    color: COLORS.textPrimary 
  },
  headerSubtitle: { 
    fontSize: scale(12), 
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  refreshButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  content: { 
    flex: 1 
  },
  scrollContent: { 
    padding: scale(16) 
  },
  sectionTitle: { 
    fontSize: scale(15), 
    fontWeight: '600', 
    color: COLORS.textPrimary, 
    marginBottom: scale(12), 
    marginTop: scale(8) 
  },
  
  // Overview Grid
  overviewGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: scale(10), 
    marginBottom: scale(8) 
  },
  overviewCard: { 
    width: (SCREEN_WIDTH - scale(42)) / 2, 
    padding: scale(16), 
    borderRadius: scale(12), 
    backgroundColor: COLORS.backgroundSecondary,
    borderLeftWidth: 3,
  },
  overviewIconContainer: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  overviewValue: { 
    fontSize: scale(24), 
    fontWeight: '700', 
    color: COLORS.textPrimary 
  },
  overviewLabel: { 
    fontSize: scale(12), 
    color: COLORS.textSecondary, 
    marginTop: scale(4) 
  },
  
  // Financial Card
  financialCard: { 
    backgroundColor: COLORS.backgroundSecondary, 
    borderRadius: scale(12), 
    padding: scale(16), 
    marginBottom: scale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  financialRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  financialItem: { 
    flex: 1, 
    alignItems: 'center' 
  },
  financialLabel: { 
    fontSize: scale(12), 
    color: COLORS.textSecondary, 
    marginVertical: scale(4) 
  },
  financialValue: { 
    fontSize: scale(18), 
    fontWeight: '700' 
  },
  financialDivider: { 
    width: 1, 
    height: scale(50), 
    backgroundColor: COLORS.border 
  },
  financialBalance: { 
    alignItems: 'center', 
    marginTop: scale(16), 
    paddingTop: scale(16), 
    borderTopWidth: 1, 
    borderTopColor: COLORS.border 
  },
  balanceLabel: { 
    fontSize: scale(12), 
    color: COLORS.textSecondary, 
    marginBottom: scale(4) 
  },
  balanceValue: { 
    fontSize: scale(24), 
    fontWeight: '700' 
  },
  
  // Trends
  trendsContainer: { 
    flexDirection: 'row', 
    gap: scale(10), 
    marginBottom: scale(8) 
  },
  trendCard: { 
    flex: 1, 
    backgroundColor: COLORS.backgroundSecondary, 
    padding: scale(14), 
    borderRadius: scale(10), 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  trendLabel: { 
    fontSize: scale(11), 
    color: COLORS.textSecondary, 
    marginVertical: scale(4) 
  },
  trendValue: { 
    fontSize: scale(16), 
    fontWeight: '700' 
  },
  
  // Collection
  collectionCard: { 
    backgroundColor: COLORS.backgroundSecondary, 
    borderRadius: scale(12), 
    padding: scale(16), 
    marginBottom: scale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: scale(16) 
  },
  progressBar: { 
    flex: 1, 
    height: scale(12), 
    backgroundColor: COLORS.backgroundTertiary, 
    borderRadius: scale(6), 
    marginRight: scale(12), 
    overflow: 'hidden' 
  },
  progressFill: { 
    height: '100%', 
    borderRadius: scale(6) 
  },
  progressText: { 
    fontSize: scale(16), 
    fontWeight: '600', 
    color: COLORS.textPrimary, 
    width: scale(50), 
    textAlign: 'right' 
  },
  collectionDetails: { 
    gap: scale(10) 
  },
  collectionItem: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  legendDot: { 
    width: scale(10), 
    height: scale(10), 
    borderRadius: scale(5), 
    marginRight: scale(10) 
  },
  collectionLabel: { 
    flex: 1, 
    fontSize: scale(13), 
    color: COLORS.textSecondary 
  },
  collectionValue: { 
    fontSize: scale(13), 
    fontWeight: '600' 
  },
  
  // Activity
  activityCard: { 
    backgroundColor: COLORS.backgroundSecondary, 
    borderRadius: scale(12), 
    padding: scale(12), 
    marginBottom: scale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activityItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: scale(10), 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  activityIconContainer: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  activityInfo: { 
    flex: 1 
  },
  activityText: { 
    fontSize: scale(13), 
    color: COLORS.textPrimary 
  },
  activityTime: { 
    fontSize: scale(11), 
    color: COLORS.textMuted, 
    marginTop: scale(2) 
  },
  
  // Actions
  actionsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: scale(10) 
  },
  actionCard: { 
    width: (SCREEN_WIDTH - scale(42)) / 2, 
    backgroundColor: COLORS.backgroundSecondary, 
    padding: scale(16), 
    borderRadius: scale(12), 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionIconContainer: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  actionLabel: { 
    fontSize: scale(13), 
    color: COLORS.textPrimary, 
    fontWeight: '500' 
  },
});