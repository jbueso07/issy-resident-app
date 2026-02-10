// app/marketplace-hub/provider/services/index.js
// ISSY Marketplace - Provider Services Management
// Línea gráfica ProHome

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useAuth } from '../../../../src/context/AuthContext';
import { getMyServices, updateService, deleteService } from '../../../../src/services/marketplaceApi';

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
  green: '#10B981',
  red: '#EF4444',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  border: 'rgba(255, 255, 255, 0.1)',
};

export default function ProviderServicesScreen() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchServices = useCallback(async () => {
    try {
      const result = await getMyServices();
      if (result.success) {
        setServices(result.data.services || result.data || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchServices();
  };

  const handleToggleActive = async (serviceId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const result = await updateService(serviceId, { status: newStatus });
      if (result.success) {
        setServices(prev =>
          prev.map(s => s.id === serviceId ? { ...s, status: newStatus } : s)
        );
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el servicio');
    }
  };

  const handleDeleteService = (serviceId, serviceName) => {
    Alert.alert(
      'Eliminar Servicio',
      `¿Estás seguro de que quieres eliminar "${serviceName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteService(serviceId);
              if (result.success) {
                setServices(prev => prev.filter(s => s.id !== serviceId));
                Alert.alert('Éxito', 'Servicio eliminado correctamente');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el servicio');
            }
          },
        },
      ]
    );
  };

  const renderServiceCard = ({ item }) => (
    <View style={styles.serviceCard}>
      <View style={styles.serviceHeader}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.serviceCategory}>{item.category?.name || 'Sin categoría'}</Text>
        </View>
        <Switch
          value={item.status === 'active'}
          onValueChange={() => handleToggleActive(item.id, item.status)}
          trackColor={{ false: COLORS.bgCardAlt, true: COLORS.teal }}
          thumbColor={item.status === 'active' ? COLORS.lime : COLORS.textMuted}
        />
      </View>

      <View style={styles.serviceStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>${item.base_price || item.price || 0}</Text>
          <Text style={styles.statLabel}>Precio base</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.bookings_count || 0}</Text>
          <Text style={styles.statLabel}>Reservas</Text>
        </View>
        <View style={styles.statItem}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={scale(14)} color={COLORS.lime} />
            <Text style={styles.statValue}>{item.average_rating?.toFixed(1) || 'N/A'}</Text>
          </View>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      <View style={styles.serviceActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/marketplace-hub/provider/services/${item.id}`)}
        >
          <Ionicons name="create-outline" size={scale(18)} color={COLORS.teal} />
          <Text style={styles.actionText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/marketplace-hub/service/${item.id}`)}
        >
          <Ionicons name="eye-outline" size={scale(18)} color={COLORS.cyan} />
          <Text style={[styles.actionText, { color: COLORS.cyan }]}>Ver</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteService(item.id, item.name)}
        >
          <Ionicons name="trash-outline" size={scale(18)} color={COLORS.red} />
          <Text style={[styles.actionText, { color: COLORS.red }]}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="briefcase-outline" size={scale(60)} color={COLORS.textMuted} />
      <Text style={styles.emptyTitle}>Sin Servicios</Text>
      <Text style={styles.emptyText}>
        Aún no has creado ningún servicio. ¡Crea tu primer servicio para empezar a recibir reservas!
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => router.push('/marketplace-hub/provider/services/create')}
      >
        <Ionicons name="add" size={scale(20)} color={COLORS.textDark} />
        <Text style={styles.createButtonText}>Crear Servicio</Text>
      </TouchableOpacity>
    </View>
  );

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
        <Text style={styles.headerTitle}>Mis Servicios</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/marketplace-hub/provider/services/create')}
        >
          <Ionicons name="add" size={scale(24)} color={COLORS.lime} />
        </TouchableOpacity>
      </View>

      {/* Services List */}
      <FlatList
        data={services}
        renderItem={renderServiceCard}
        keyExtractor={(item) => item.id?.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.teal}
            colors={[COLORS.teal]}
          />
        }
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
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
  addButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: scale(16),
    paddingBottom: scale(100),
  },
  serviceCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(12),
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  serviceInfo: {
    flex: 1,
    marginRight: scale(12),
  },
  serviceName: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(2),
  },
  serviceCategory: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  serviceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: scale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: scale(12),
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    marginTop: scale(2),
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  serviceActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
  },
  actionText: {
    fontSize: scale(13),
    color: COLORS.teal,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(32),
    paddingTop: scale(60),
  },
  emptyTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  emptyText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scale(20),
    marginBottom: scale(24),
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lime,
    paddingVertical: scale(14),
    paddingHorizontal: scale(24),
    borderRadius: scale(12),
    gap: scale(8),
  },
  createButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.bgPrimary,
  },
  textDark: COLORS.bgPrimary,
});
