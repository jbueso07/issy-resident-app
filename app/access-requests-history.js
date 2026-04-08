// app/access-requests-history.js
// ISSY - Access Requests History Screen (Resident)
// Shows list of past access requests with status

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const API_URL = 'https://api.joinissy.com/api';

const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  lime: '#AAFF00',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  purple: '#A78BFA',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  border: 'rgba(255,255,255,0.1)',
};

const STATUS_CONFIG = {
  approved: { label: 'Aprobado', color: COLORS.success, icon: 'checkmark-circle' },
  rejected: { label: 'Rechazado', color: COLORS.danger, icon: 'close-circle' },
  pending: { label: 'Pendiente', color: COLORS.warning, icon: 'time' },
  expired: { label: 'Expirado', color: COLORS.textMuted, icon: 'time-outline' },
};

export default function AccessRequestsHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchHistory(1, true);
  }, []);

  const fetchHistory = async (pageNum = 1, reset = false) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await fetch(
        `${API_URL}/access-requests/history/me?page=${pageNum}&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const result = await response.json();

      if (result.success) {
        const newData = result.data || [];
        if (reset) {
          setRequests(newData);
        } else {
          setRequests(prev => [...prev, ...newData]);
        }
        setHasMore(result.pagination?.hasNextPage || false);
        setPage(pageNum);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory(1, true);
  }, []);

  const onEndReached = () => {
    if (hasMore && !loading) {
      fetchHistory(page + 1, false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 60) return `hace ${mins} min`;
    if (hours < 24) return `hace ${hours}h`;
    if (days < 7) return `hace ${days}d`;
    return date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
  };

  const renderItem = ({ item }) => {
    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '20' }]}>
            <Ionicons name={statusCfg.icon} size={14} color={statusCfg.color} />
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
          <Text style={styles.timeText}>{formatDate(item.created_at)}</Text>
        </View>

        <View style={styles.cardBody}>
          <Ionicons name="person-outline" size={18} color={COLORS.purple} />
          <View style={styles.cardInfo}>
            <Text style={styles.visitorName}>{item.visitor_name}</Text>
            {item.guard?.name && (
              <Text style={styles.guardName}>Reportado por: {item.guard.name}</Text>
            )}
            {item.rejection_reason && (
              <Text style={styles.rejectionReason}>Motivo: {item.rejection_reason}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Solicitudes</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && requests.length === 0 ? (
        <ActivityIndicator color={COLORS.purple} size="large" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.purple}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No hay solicitudes de ingreso</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: scale(17),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: scale(12),
    fontWeight: '700',
  },
  timeText: {
    fontSize: scale(12),
    color: COLORS.textMuted,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardInfo: {
    flex: 1,
  },
  visitorName: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  guardName: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rejectionReason: {
    fontSize: scale(12),
    color: COLORS.danger,
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: scale(15),
    color: COLORS.textMuted,
    marginTop: 12,
  },
});
