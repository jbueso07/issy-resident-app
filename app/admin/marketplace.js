// app/admin/marketplace.js
// ISSY Marketplace - SuperAdmin Management Panel
// Línea gráfica ProHome

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
  RefreshControl, ActivityIndicator, Alert, Switch, TextInput, Modal,
  FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const API_URL = 'https://api.joinissy.com/api';

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
  pink: '#EC4899',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textDark: '#0F1A1E',
  border: 'rgba(255, 255, 255, 0.1)',
  gradientStart: '#00BFA6',
  gradientEnd: '#AAFF00',
};

// ============ API HELPER ============
const authFetch = async (endpoint, options = {}, authToken = null) => {
  const token = authToken || await AsyncStorage.getItem('token');
  if (!token) {
    console.warn('⚠️ authFetch: No token available for', endpoint);
  }
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };
  const response = await fetch(`${API_URL}${endpoint}`, config);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message || 'Error');
  return data;
};

// ============ TABS ============
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'analytics' },
  { id: 'providers', label: 'Proveedores', icon: 'people' },
  { id: 'services', label: 'Servicios', icon: 'briefcase' },
  { id: 'categories', label: 'Categorías', icon: 'grid' },
  { id: 'bookings', label: 'Reservas', icon: 'calendar' },
  { id: 'config', label: 'Config', icon: 'settings' },
];

// ============ MAIN COMPONENT ============
export default function AdminMarketplace() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dashboard data
  const [stats, setStats] = useState({
    totalProviders: 0, activeProviders: 0, pendingKyc: 0,
    totalServices: 0, activeServices: 0,
    totalBookings: 0, pendingBookings: 0, completedBookings: 0,
    totalRevenue: 0, totalCommission: 0,
  });

  // Lists
  const [providers, setProviders] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [config, setConfig] = useState({});

  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);

  // Filters
  const [providerFilter, setProviderFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [bookingFilter, setBookingFilter] = useState('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'dashboard': await loadDashboard(); break;
        case 'providers': await loadProviders(); break;
        case 'services': await loadServices(); break;
        case 'categories': await loadCategories(); break;
        case 'bookings': await loadBookings(); break;
        case 'config': await loadConfig(); break;
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [activeTab]);

  // ============ DATA LOADERS ============

  const loadDashboard = async () => {
    try {
      // Load providers count
      const provRes = await authFetch('/marketplace/providers?limit=1');
      const provData = provRes.data || provRes;

      // Load pending KYC
      let pendingKyc = 0;
      try {
        const kycRes = await authFetch('/marketplace/providers/admin/kyc/pending');
        pendingKyc = (kycRes.data?.providers || kycRes.providers || []).length;
      } catch (e) {}

      // Load services
      const svcRes = await authFetch('/marketplace/services?limit=1');
      const svcData = svcRes.data || svcRes;

      setStats(prev => ({
        ...prev,
        totalProviders: provData.total || provData.providers?.length || 0,
        pendingKyc,
        totalServices: svcData.total || svcData.services?.length || 0,
      }));
    } catch (error) {
      console.error('Dashboard load error:', error);
    }
  };

  const loadProviders = async () => {
    try {
      const res = await authFetch('/marketplace/providers');
      setProviders(res.data?.providers || res.providers || []);
    } catch (error) {
      console.error('Providers load error:', error);
    }
  };

  const loadServices = async () => {
    try {
      const res = await authFetch('/marketplace/services?limit=100');
      setServices(res.data?.services || res.services || []);
    } catch (error) {
      console.error('Services load error:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await authFetch('/marketplace/config/categories');
      const cats = res.data?.config_value || res.config_value || res.data?.categories || [];
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (error) {
      console.error('Categories load error:', error);
    }
  };

  const loadBookings = async () => {
    try {
      const res = await authFetch('/marketplace/bookings');
      setBookings(res.data?.bookings || res.bookings || []);
    } catch (error) {
      console.error('Bookings load error:', error);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await authFetch('/marketplace/config');
      setConfig(res.data?.config || res.config || {});
    } catch (error) {
      console.error('Config load error:', error);
    }
  };

  // ============ ACTIONS ============

  const approveProvider = async (providerId) => {
    Alert.alert('Aprobar Proveedor', '¿Aprobar verificación KYC?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprobar', onPress: async () => {
          try {
            await authFetch(`/marketplace/providers/${providerId}/kyc/approve`, { method: 'POST' });
            Alert.alert('✅', 'Proveedor aprobado');
            loadProviders();
          } catch (e) { Alert.alert('Error', e.message); }
        }
      },
    ]);
  };

  const rejectProvider = async (providerId) => {
    Alert.alert('Rechazar Proveedor', '¿Rechazar verificación KYC?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rechazar', style: 'destructive', onPress: async () => {
          try {
            await authFetch(`/marketplace/providers/${providerId}/kyc/reject`, {
              method: 'POST',
              body: JSON.stringify({ reason: 'No cumple requisitos' }),
            });
            Alert.alert('✅', 'Proveedor rechazado');
            loadProviders();
          } catch (e) { Alert.alert('Error', e.message); }
        }
      },
    ]);
  };

  const suspendProvider = async (providerId) => {
    Alert.alert('Suspender', '¿Suspender este proveedor?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Suspender', style: 'destructive', onPress: async () => {
          try {
            await authFetch(`/marketplace/providers/${providerId}/suspend`, { method: 'POST' });
            Alert.alert('✅', 'Proveedor suspendido');
            loadProviders();
          } catch (e) { Alert.alert('Error', e.message); }
        }
      },
    ]);
  };

  const reactivateProvider = async (providerId) => {
    try {
      await authFetch(`/marketplace/providers/${providerId}/reactivate`, { method: 'POST' });
      Alert.alert('✅', 'Proveedor reactivado');
      loadProviders();
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const toggleServiceFeatured = async (serviceId, currentlyFeatured) => {
    try {
      await authFetch(`/marketplace/services/${serviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_featured: !currentlyFeatured }),
      });
      loadServices();
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const toggleServiceStatus = async (serviceId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await authFetch(`/marketplace/services/${serviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      loadServices();
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const saveConfig = async (key, value) => {
    try {
      await authFetch(`/marketplace/config/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ config_value: value }),
      });
      Alert.alert('✅', 'Configuración guardada');
      loadConfig();
    } catch (e) { Alert.alert('Error', e.message); }
  };

  // ============ RENDER HELPERS ============

  const StatCard = ({ icon, label, value, color, subtitle }) => (
    <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={styles.statCardHeader}>
        <View style={[styles.statIconBg, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const StatusBadge = ({ status, small }) => {
    const statusConfig = {
      active: { color: COLORS.green, label: 'Activo', icon: 'checkmark-circle' },
      inactive: { color: COLORS.yellow, label: 'Inactivo', icon: 'pause-circle' },
      suspended: { color: COLORS.red, label: 'Suspendido', icon: 'close-circle' },
      pending: { color: COLORS.orange, label: 'Pendiente', icon: 'time' },
      pending_kyc: { color: COLORS.orange, label: 'KYC Pendiente', icon: 'document-text' },
      verified: { color: COLORS.green, label: 'Verificado', icon: 'shield-checkmark' },
      completed: { color: COLORS.green, label: 'Completada', icon: 'checkmark-done' },
      confirmed: { color: COLORS.blue, label: 'Confirmada', icon: 'checkmark' },
      in_progress: { color: COLORS.cyan, label: 'En Progreso', icon: 'sync' },
      cancelled: { color: COLORS.red, label: 'Cancelada', icon: 'close' },
      quote_sent: { color: COLORS.purple, label: 'Cotización', icon: 'document' },
      quote_requested: { color: COLORS.orange, label: 'Cotización Pedida', icon: 'document-text' },
      deleted: { color: COLORS.red, label: 'Eliminado', icon: 'trash' },
    };
    const cfg = statusConfig[status] || { color: COLORS.textMuted, label: status, icon: 'help-circle' };
    return (
      <View style={[styles.badge, { backgroundColor: cfg.color + '20' }, small && { paddingHorizontal: 6, paddingVertical: 2 }]}>
        <Ionicons name={cfg.icon} size={small ? 10 : 12} color={cfg.color} />
        <Text style={[styles.badgeText, { color: cfg.color }, small && { fontSize: 10 }]}>{cfg.label}</Text>
      </View>
    );
  };

  // ============ TAB RENDERERS ============

  // ---- DASHBOARD ----
  const renderDashboard = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Resumen del Marketplace</Text>
      <View style={styles.statsGrid}>
        <StatCard icon="people" label="Proveedores" value={stats.totalProviders} color={COLORS.blue} />
        <StatCard icon="alert-circle" label="KYC Pendientes" value={stats.pendingKyc} color={COLORS.orange} />
        <StatCard icon="briefcase" label="Servicios" value={stats.totalServices} color={COLORS.teal} />
        <StatCard icon="calendar" label="Reservas" value={stats.totalBookings} color={COLORS.purple} />
      </View>

      {stats.pendingKyc > 0 && (
        <TouchableOpacity
          style={styles.alertBanner}
          onPress={() => setActiveTab('providers')}
        >
          <LinearGradient
            colors={[COLORS.orange + '30', COLORS.red + '20']}
            style={styles.alertGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Ionicons name="warning" size={24} color={COLORS.orange} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.alertTitle}>{stats.pendingKyc} verificaciones KYC pendientes</Text>
              <Text style={styles.alertSubtitle}>Revisa y aprueba proveedores nuevos</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.orange} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Accesos Rápidos</Text>
      <View style={styles.quickActions}>
        {[
          { icon: 'add-circle', label: 'Nueva Categoría', color: COLORS.teal, action: () => { setEditingCategory(null); setShowCategoryModal(true); } },
          { icon: 'people', label: 'Ver Proveedores', color: COLORS.blue, action: () => setActiveTab('providers') },
          { icon: 'briefcase', label: 'Ver Servicios', color: COLORS.purple, action: () => setActiveTab('services') },
          { icon: 'settings', label: 'Configuración', color: COLORS.orange, action: () => setActiveTab('config') },
        ].map((item, i) => (
          <TouchableOpacity key={i} style={styles.quickAction} onPress={item.action}>
            <View style={[styles.quickActionIcon, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon} size={24} color={item.color} />
            </View>
            <Text style={styles.quickActionLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  // ---- PROVIDERS ----
  const renderProviders = () => {
    const filters = ['all', 'active', 'pending_kyc', 'suspended'];
    const filterLabels = { all: 'Todos', active: 'Activos', pending_kyc: 'KYC Pendiente', suspended: 'Suspendidos' };
    const filtered = providers.filter(p => {
      if (providerFilter === 'all') return true;
      return p.status === providerFilter;
    });

    return (
      <View style={styles.tabContent}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
          {filters.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, providerFilter === f && styles.filterChipActive]}
              onPress={() => setProviderFilter(f)}
            >
              <Text style={[styles.filterChipText, providerFilter === f && styles.filterChipTextActive]}>
                {filterLabels[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FlatList
          data={filtered}
          keyExtractor={item => item.id?.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardAvatar}>
                  <Ionicons name="person" size={24} color={COLORS.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.business_name || 'Sin nombre'}</Text>
                  <Text style={styles.cardSubtitle}>{item.business_type || 'Proveedor'}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>

              <View style={styles.cardDetails}>
                {item.business_phone && (
                  <View style={styles.detailRow}>
                    <Ionicons name="call" size={14} color={COLORS.textMuted} />
                    <Text style={styles.detailText}>{item.business_phone}</Text>
                  </View>
                )}
                {item.rating_average > 0 && (
                  <View style={styles.detailRow}>
                    <Ionicons name="star" size={14} color={COLORS.yellow} />
                    <Text style={styles.detailText}>{item.rating_average} ({item.rating_count || 0} reseñas)</Text>
                  </View>
                )}
                {item.tier && (
                  <View style={styles.detailRow}>
                    <Ionicons name="ribbon" size={14} color={COLORS.purple} />
                    <Text style={styles.detailText}>Tier: {item.tier}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardActions}>
                {(item.status === 'pending_kyc' || item.kyc_status === 'pending') && (
                  <>
                    <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSuccess]} onPress={() => approveProvider(item.id)}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Aprobar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => rejectProvider(item.id)}>
                      <Ionicons name="close" size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Rechazar</Text>
                    </TouchableOpacity>
                  </>
                )}
                {item.status === 'active' && (
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnWarning]} onPress={() => suspendProvider(item.id)}>
                    <Ionicons name="pause" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Suspender</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'suspended' && (
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSuccess]} onPress={() => reactivateProvider(item.id)}>
                    <Ionicons name="play" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Reactivar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No hay proveedores</Text>
            </View>
          }
        />
      </View>
    );
  };

  // ---- SERVICES ----
  const renderServices = () => {
    const filters = ['all', 'active', 'inactive', 'deleted'];
    const filterLabels = { all: 'Todos', active: 'Activos', inactive: 'Inactivos', deleted: 'Eliminados' };
    const filtered = services.filter(s => {
      if (serviceFilter === 'all') return true;
      return s.status === serviceFilter;
    });

    return (
      <View style={styles.tabContent}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
          {filters.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, serviceFilter === f && styles.filterChipActive]}
              onPress={() => setServiceFilter(f)}
            >
              <Text style={[styles.filterChipText, serviceFilter === f && styles.filterChipTextActive]}>
                {filterLabels[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FlatList
          data={filtered}
          keyExtractor={item => item.id?.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardAvatar, { backgroundColor: COLORS.purple + '20' }]}>
                  <Ionicons name="briefcase" size={20} color={COLORS.purple} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.cardSubtitle}>{item.provider?.business_name || 'Proveedor'}</Text>
                </View>
                <StatusBadge status={item.status} small />
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="pricetag" size={14} color={COLORS.lime} />
                  <Text style={[styles.detailText, { color: COLORS.lime }]}>
                    {item.pricing_type === 'quote' ? 'Cotización' : `L. ${item.price || 0}`}
                    {item.pricing_type === 'hourly' ? '/hora' : item.pricing_type === 'fixed' ? '' : ''}
                  </Text>
                </View>
                {item.rating_average > 0 && (
                  <View style={styles.detailRow}>
                    <Ionicons name="star" size={14} color={COLORS.yellow} />
                    <Text style={styles.detailText}>{item.rating_average} ({item.rating_count || 0})</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Ionicons name="cart" size={14} color={COLORS.textMuted} />
                  <Text style={styles.detailText}>{item.booking_count || 0} reservas</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Destacado</Text>
                  <Switch
                    value={item.is_featured}
                    onValueChange={() => toggleServiceFeatured(item.id, item.is_featured)}
                    trackColor={{ false: COLORS.bgCardAlt, true: COLORS.lime + '60' }}
                    thumbColor={item.is_featured ? COLORS.lime : COLORS.textMuted}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.actionBtn, item.status === 'active' ? styles.actionBtnWarning : styles.actionBtnSuccess]}
                  onPress={() => toggleServiceStatus(item.id, item.status)}
                >
                  <Ionicons name={item.status === 'active' ? 'pause' : 'play'} size={14} color="#fff" />
                  <Text style={styles.actionBtnText}>{item.status === 'active' ? 'Desactivar' : 'Activar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No hay servicios</Text>
            </View>
          }
        />
      </View>
    );
  };

  // ---- CATEGORIES ----
  const renderCategories = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categorías del Marketplace</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => { setEditingCategory(null); setShowCategoryModal(true); }}
        >
          <Ionicons name="add" size={20} color={COLORS.textDark} />
          <Text style={styles.addButtonText}>Agregar</Text>
        </TouchableOpacity>
      </View>

      {categories.map((cat, index) => (
        <View key={cat.id || index} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardAvatar, { backgroundColor: (cat.color || COLORS.teal) + '20' }]}>
              <Ionicons name={cat.icon || 'apps'} size={22} color={cat.color || COLORS.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{cat.name}</Text>
              {cat.description && <Text style={styles.cardSubtitle}>{cat.description}</Text>}
            </View>
            <TouchableOpacity
              style={styles.editIconBtn}
              onPress={() => { setEditingCategory(cat); setShowCategoryModal(true); }}
            >
              <Ionicons name="create" size={18} color={COLORS.cyan} />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {categories.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="grid-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No hay categorías configuradas</Text>
          <Text style={styles.emptySubtext}>Agrega categorías para organizar los servicios</Text>
        </View>
      )}
    </ScrollView>
  );

  // ---- BOOKINGS ----
  const renderBookings = () => {
    const filters = ['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    const filterLabels = { all: 'Todas', pending: 'Pendientes', confirmed: 'Confirmadas', in_progress: 'En Progreso', completed: 'Completadas', cancelled: 'Canceladas' };
    const filtered = bookings.filter(b => {
      if (bookingFilter === 'all') return true;
      return b.status === bookingFilter;
    });

    return (
      <View style={styles.tabContent}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
          {filters.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, bookingFilter === f && styles.filterChipActive]}
              onPress={() => setBookingFilter(f)}
            >
              <Text style={[styles.filterChipText, bookingFilter === f && styles.filterChipTextActive]}>
                {filterLabels[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FlatList
          data={filtered}
          keyExtractor={item => item.id?.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.service?.title || 'Servicio'}</Text>
                  <Text style={styles.cardSubtitle}>
                    {item.booking_number || item.id?.slice(0, 8)}
                  </Text>
                </View>
                <StatusBadge status={item.status} small />
              </View>
              <View style={styles.cardDetails}>
                {item.scheduled_date && (
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar" size={14} color={COLORS.textMuted} />
                    <Text style={styles.detailText}>
                      {new Date(item.scheduled_date).toLocaleDateString('es-HN')}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Ionicons name="cash" size={14} color={COLORS.lime} />
                  <Text style={[styles.detailText, { color: COLORS.lime }]}>
                    L. {item.final_amount || item.quoted_amount || item.estimated_amount || 0}
                  </Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No hay reservas</Text>
            </View>
          }
        />
      </View>
    );
  };

  // ---- CONFIGURATION ----
  // ---- CONFIG: Visual Controls ----

  const [configDraft, setConfigDraft] = useState({});
  const [configSaving, setConfigSaving] = useState(null);

  useEffect(() => {
    if (config && Object.keys(config).length > 0) {
      const draft = {};
      Object.entries(config).forEach(([key, val]) => {
        draft[key] = val.config_value || val.value || val;
      });
      setConfigDraft(draft);
    }
  }, [config]);

  const updateConfigDraft = (configKey, path, value) => {
    setConfigDraft(prev => {
      const updated = { ...prev };
      const obj = JSON.parse(JSON.stringify(updated[configKey] || {}));
      const keys = path.split('.');
      let target = obj;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]]) target[keys[i]] = {};
        target = target[keys[i]];
      }
      target[keys[keys.length - 1]] = value;
      updated[configKey] = obj;
      return updated;
    });
  };

  const saveOneConfig = async (configKey) => {
    setConfigSaving(configKey);
    try {
      await saveConfig(configKey, configDraft[configKey]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setConfigSaving(null);
    }
  };

  const ConfigField = ({ label, sublabel, children }) => (
    <View style={styles.cfgField}>
      <View style={styles.cfgFieldLabel}>
        <Text style={styles.cfgLabelText}>{label}</Text>
        {sublabel && <Text style={styles.cfgSublabelText}>{sublabel}</Text>}
      </View>
      {children}
    </View>
  );

  const ConfigToggle = ({ configKey, path, label, sublabel }) => {
    const keys = path.split('.');
    let val = configDraft[configKey] || {};
    for (const k of keys) val = val?.[k];
    return (
      <ConfigField label={label} sublabel={sublabel}>
        <Switch
          value={!!val}
          onValueChange={(v) => updateConfigDraft(configKey, path, v)}
          trackColor={{ false: COLORS.bgCardAlt, true: COLORS.teal + '60' }}
          thumbColor={val ? COLORS.teal : COLORS.textMuted}
        />
      </ConfigField>
    );
  };

  const ConfigNumber = ({ configKey, path, label, sublabel, suffix, prefix }) => {
    const keys = path.split('.');
    let val = configDraft[configKey] || {};
    for (const k of keys) val = val?.[k];
    return (
      <ConfigField label={label} sublabel={sublabel}>
        <View style={styles.cfgNumberRow}>
          {prefix && <Text style={styles.cfgNumberPrefix}>{prefix}</Text>}
          <TextInput
            style={styles.cfgNumberInput}
            value={String(val ?? '')}
            onChangeText={(t) => updateConfigDraft(configKey, path, isNaN(Number(t)) ? t : Number(t))}
            keyboardType="numeric"
            placeholderTextColor={COLORS.textMuted}
          />
          {suffix && <Text style={styles.cfgNumberSuffix}>{suffix}</Text>}
        </View>
      </ConfigField>
    );
  };

  const ConfigText = ({ configKey, path, label, sublabel, placeholder, secure }) => {
    const keys = path.split('.');
    let val = configDraft[configKey] || {};
    for (const k of keys) val = val?.[k];
    return (
      <ConfigField label={label} sublabel={sublabel}>
        <TextInput
          style={styles.cfgTextInput}
          value={String(val ?? '')}
          onChangeText={(t) => updateConfigDraft(configKey, path, t)}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={secure}
          autoCapitalize="none"
        />
      </ConfigField>
    );
  };

  const ConfigSaveButton = ({ configKey }) => (
    <TouchableOpacity
      style={styles.cfgSaveBtn}
      onPress={() => saveOneConfig(configKey)}
      disabled={configSaving === configKey}
    >
      {configSaving === configKey ? (
        <ActivityIndicator size="small" color={COLORS.textDark} />
      ) : (
        <>
          <Ionicons name="checkmark" size={16} color={COLORS.textDark} />
          <Text style={styles.cfgSaveBtnText}>Guardar</Text>
        </>
      )}
    </TouchableOpacity>
  );

  const ConfigSection = ({ title, icon, color, configKey, children }) => (
    <View style={styles.cfgSection}>
      <View style={styles.cfgSectionHeader}>
        <View style={[styles.cfgSectionIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.cfgSectionTitle}>{title}</Text>
        <ConfigSaveButton configKey={configKey} />
      </View>
      <View style={styles.cfgSectionBody}>
        {children}
      </View>
    </View>
  );

  const renderConfig = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
      <Text style={styles.sectionTitle}>Configuración del Marketplace</Text>

      {/* BOOKING SETTINGS */}
      <ConfigSection title="Reservas" icon="calendar" color={COLORS.blue} configKey="booking_settings">
        <ConfigToggle configKey="booking_settings" path="allow_instant_booking" label="Reserva instantánea" sublabel="Clientes pueden reservar sin esperar aprobación" />
        <ConfigToggle configKey="booking_settings" path="allow_quotes" label="Permitir cotizaciones" sublabel="Proveedores pueden enviar cotizaciones personalizadas" />
        <ConfigToggle configKey="booking_settings" path="require_payment_upfront" label="Pago por adelantado" sublabel="Cobrar al confirmar la reserva" />
        <ConfigNumber configKey="booking_settings" path="cancellation_window_hours" label="Ventana de cancelación" sublabel="Horas antes del servicio para cancelar gratis" suffix="hrs" />
        <ConfigNumber configKey="booking_settings" path="max_advance_booking_days" label="Máx. días anticipación" sublabel="Cuántos días en futuro se puede reservar" suffix="días" />
        <ConfigNumber configKey="booking_settings" path="min_booking_amount" label="Monto mínimo" sublabel="Monto mínimo por reserva" prefix="L." />
      </ConfigSection>

      {/* CLINPAYS SETTINGS */}
      <ConfigSection title="Clinpays" icon="card" color={COLORS.purple} configKey="clinpays_settings">
        <ConfigToggle configKey="clinpays_settings" path="enabled" label="Pagos con tarjeta activos" sublabel="Habilitar cobros via Clinpays" />
        <ConfigToggle configKey="clinpays_settings" path="sandbox_mode" label="Modo sandbox" sublabel="Usar ambiente de pruebas" />
        <ConfigText configKey="clinpays_settings" path="api_key" label="API Key" sublabel="Llave de producción" placeholder="pk_live_..." secure />
        <ConfigText configKey="clinpays_settings" path="api_secret" label="API Secret" sublabel="Secreto de producción" placeholder="sk_live_..." secure />
        <ConfigText configKey="clinpays_settings" path="webhook_secret" label="Webhook Secret" placeholder="whsec_..." secure />
      </ConfigSection>

      {/* COMMISSION RATES */}
      <ConfigSection title="Comisiones" icon="cash" color={COLORS.green} configKey="commission_rates">
        <ConfigNumber configKey="commission_rates" path="instant_booking.default" label="Reserva instantánea" sublabel="Comisión estándar" suffix="%" />
        <ConfigNumber configKey="commission_rates" path="instant_booking.prime" label="Reserva inst. (Prime)" sublabel="Comisión para proveedores Prime" suffix="%" />
        <ConfigNumber configKey="commission_rates" path="quote.default" label="Por cotización" sublabel="Comisión en servicios cotizados" suffix="%" />
        <ConfigNumber configKey="commission_rates" path="quote.prime" label="Cotización (Prime)" sublabel="Comisión cotización Prime" suffix="%" />
        <ConfigNumber configKey="commission_rates" path="min_commission" label="Comisión mínima" sublabel="Monto mínimo de comisión por servicio" prefix="L." />
      </ConfigSection>

      {/* NOTIFICATION SETTINGS */}
      <ConfigSection title="Notificaciones" icon="notifications" color={COLORS.orange} configKey="notification_settings">
        <ConfigToggle configKey="notification_settings" path="booking_created" label="Nueva reserva" sublabel="Notificar al proveedor cuando recibe una reserva" />
        <ConfigToggle configKey="notification_settings" path="booking_confirmed" label="Reserva confirmada" sublabel="Notificar al cliente cuando se confirma" />
        <ConfigToggle configKey="notification_settings" path="booking_cancelled" label="Reserva cancelada" sublabel="Notificar a ambas partes" />
        <ConfigToggle configKey="notification_settings" path="booking_completed" label="Servicio completado" sublabel="Notificar al cliente para que califique" />
        <ConfigToggle configKey="notification_settings" path="quote_received" label="Cotización recibida" sublabel="Notificar al cliente cuando recibe cotización" />
        <ConfigToggle configKey="notification_settings" path="new_message" label="Mensaje nuevo" sublabel="Notificar cuando hay un mensaje en el chat" />
        <ConfigToggle configKey="notification_settings" path="payout_processed" label="Pago procesado" sublabel="Notificar al proveedor cuando recibe pago" />
      </ConfigSection>

      {/* PAYMENT METHODS */}
      <ConfigSection title="Métodos de Pago" icon="wallet" color={COLORS.cyan} configKey="payment_methods">
        {(Array.isArray(configDraft.payment_methods) ? configDraft.payment_methods : []).map((method, index) => (
          <ConfigField key={method.id || index} label={method.name || method.id} sublabel={method.provider ? `Proveedor: ${method.provider}` : 'Sin proveedor'}>
            <Switch
              value={method.enabled !== false}
              onValueChange={(v) => {
                const updated = [...(configDraft.payment_methods || [])];
                updated[index] = { ...updated[index], enabled: v };
                setConfigDraft(prev => ({ ...prev, payment_methods: updated }));
              }}
              trackColor={{ false: COLORS.bgCardAlt, true: COLORS.teal + '60' }}
              thumbColor={method.enabled !== false ? COLORS.teal : COLORS.textMuted}
            />
          </ConfigField>
        ))}
        {(!Array.isArray(configDraft.payment_methods) || configDraft.payment_methods.length === 0) && (
          <Text style={styles.cfgEmptyText}>No hay métodos de pago configurados</Text>
        )}
      </ConfigSection>

      {/* PRIME MEMBERSHIP */}
      <ConfigSection title="ISSY Prime" icon="diamond" color={COLORS.lime} configKey="prime_membership">
        <ConfigToggle configKey="prime_membership" path="enabled" label="Prime activo" sublabel="Habilitar membresía Prime" />
        <ConfigNumber configKey="prime_membership" path="monthly_price" label="Precio mensual" prefix="L." />
        <ConfigNumber configKey="prime_membership" path="annual_price" label="Precio anual" prefix="L." />
        <ConfigNumber configKey="prime_membership" path="discount_percentage" label="Descuento en servicios" suffix="%" />
        <ConfigToggle configKey="prime_membership" path="free_cancellation" label="Cancelación gratis" sublabel="Miembros Prime pueden cancelar sin cargo" />
        <ConfigToggle configKey="prime_membership" path="priority_support" label="Soporte prioritario" sublabel="Atención preferente para miembros" />
        <ConfigToggle configKey="prime_membership" path="featured_badge" label="Insignia destacada" sublabel="Los proveedores Prime se muestran primero" />
      </ConfigSection>

      {/* OTHER CONFIGS (fallback for unknown keys) */}
      {Object.entries(config).filter(([key]) => 
        !['booking_settings', 'clinpays_settings', 'commission_rates', 'notification_settings', 'payment_methods', 'prime_membership', 'categories'].includes(key)
      ).map(([key, val]) => (
        <TouchableOpacity
          key={key}
          style={styles.card}
          onPress={() => {
            setEditingConfig({ key, ...val });
            setShowConfigModal(true);
          }}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.cardAvatar, { backgroundColor: COLORS.orange + '20' }]}>
              <Ionicons name="code-slash" size={20} color={COLORS.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
              <Text style={styles.cardSubtitle}>Editar como JSON</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // ============ MODALS ============

  const CategoryModal = () => {
    const [name, setName] = useState(editingCategory?.name || '');
    const [icon, setIcon] = useState(editingCategory?.icon || 'apps');
    const [description, setDescription] = useState(editingCategory?.description || '');
    const [color, setColor] = useState(editingCategory?.color || COLORS.teal);

    const iconOptions = ['home', 'sparkles', 'laptop', 'fitness', 'school', 'car', 'cut', 'restaurant', 'construct', 'camera', 'brush', 'musical-notes', 'paw', 'leaf', 'flash', 'medkit'];
    const colorOptions = [COLORS.teal, COLORS.purple, COLORS.blue, COLORS.green, COLORS.orange, COLORS.pink, COLORS.cyan, COLORS.yellow, COLORS.red];

    const save = () => {
      if (!name.trim()) { Alert.alert('Error', 'El nombre es requerido'); return; }

      const newCat = {
        id: editingCategory?.id || name.toLowerCase().replace(/\s/g, '_'),
        name: name.trim(),
        icon,
        description: description.trim(),
        color,
      };

      let updated;
      if (editingCategory) {
        updated = categories.map(c => c.id === editingCategory.id ? newCat : c);
      } else {
        updated = [...categories, newCat];
      }

      saveConfig('categories', updated);
      setShowCategoryModal(false);
      setCategories(updated);
    };

    return (
      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Text style={styles.modalCancel}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editingCategory ? 'Editar' : 'Nueva'} Categoría</Text>
              <TouchableOpacity onPress={save}>
                <Text style={styles.modalSave}>Guardar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nombre</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Nombre de la categoría"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>Descripción</Text>
              <TextInput
                style={[styles.textInput, { height: 80 }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Descripción breve"
                placeholderTextColor={COLORS.textMuted}
                multiline
              />

              <Text style={styles.inputLabel}>Ícono</Text>
              <View style={styles.iconGrid}>
                {iconOptions.map(ic => (
                  <TouchableOpacity
                    key={ic}
                    style={[styles.iconOption, icon === ic && { backgroundColor: COLORS.teal + '30', borderColor: COLORS.teal }]}
                    onPress={() => setIcon(ic)}
                  >
                    <Ionicons name={ic} size={24} color={icon === ic ? COLORS.teal : COLORS.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Color</Text>
              <View style={styles.colorGrid}>
                {colorOptions.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorOption, { backgroundColor: c }, color === c && { borderWidth: 3, borderColor: '#fff' }]}
                    onPress={() => setColor(c)}
                  />
                ))}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  };

  const ConfigModal = () => {
    const [jsonText, setJsonText] = useState(
      editingConfig?.value ? JSON.stringify(editingConfig.value, null, 2) : '{}'
    );

    const save = () => {
      try {
        const parsed = JSON.parse(jsonText);
        saveConfig(editingConfig.key, parsed);
        setShowConfigModal(false);
      } catch (e) {
        Alert.alert('Error', 'JSON inválido. Verifica el formato.');
      }
    };

    return (
      <Modal visible={showConfigModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowConfigModal(false)}>
                <Text style={styles.modalCancel}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Editar Config</Text>
              <TouchableOpacity onPress={save}>
                <Text style={styles.modalSave}>Guardar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>{editingConfig?.key}</Text>
              <Text style={[styles.cardSubtitle, { marginBottom: 12 }]}>{editingConfig?.description}</Text>

              <TextInput
                style={[styles.textInput, { height: 300, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 }]}
                value={jsonText}
                onChangeText={setJsonText}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  };

  // ============ MAIN RENDER ============
  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.teal} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'providers': return renderProviders();
      case 'services': return renderServices();
      case 'categories': return renderCategories();
      case 'bookings': return renderBookings();
      case 'config': return renderConfig();
      default: return renderDashboard();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Marketplace</Text>
          <Text style={styles.headerSubtitle}>Panel de Administración</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={22} color={COLORS.teal} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons name={tab.icon} size={16} color={activeTab === tab.id ? COLORS.textDark : COLORS.textSecondary} />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {renderTabContent()}

      {/* Modals */}
      <CategoryModal />
      {showConfigModal && <ConfigModal />}
    </SafeAreaView>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.bgCard, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  refreshBtn: { padding: 8 },

  // Tab bar
  tabBar: { maxHeight: 50, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabBarContent: { paddingHorizontal: 12, alignItems: 'center', gap: 8, paddingVertical: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.bgCard,
  },
  tabActive: { backgroundColor: COLORS.lime },
  tabText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  tabTextActive: { color: COLORS.textDark, fontWeight: '600' },

  // Tab content
  tabContent: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: (SCREEN_WIDTH - 44) / 2, backgroundColor: COLORS.bgCard,
    borderRadius: 16, padding: 16,
  },
  statCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  statIconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  statLabel: { fontSize: 13, color: COLORS.textSecondary },
  statSubtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },

  // Section
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },

  // Alert banner
  alertBanner: { marginTop: 16, borderRadius: 16, overflow: 'hidden' },
  alertGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16 },
  alertTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  alertSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  // Quick actions
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickAction: { width: (SCREEN_WIDTH - 60) / 4, alignItems: 'center' },
  quickActionIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  quickActionLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },

  // Filter bar
  filterBar: { maxHeight: 44, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.bgCard, marginRight: 8,
  },
  filterChipActive: { backgroundColor: COLORS.lime },
  filterChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: COLORS.textDark, fontWeight: '600' },

  // Card
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: 16,
    padding: 16, marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardAvatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.teal + '20', justifyContent: 'center', alignItems: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  cardSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, color: COLORS.textSecondary },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, alignItems: 'center' },

  // Action buttons
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  actionBtnText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  actionBtnSuccess: { backgroundColor: COLORS.green },
  actionBtnDanger: { backgroundColor: COLORS.red },
  actionBtnWarning: { backgroundColor: COLORS.orange },

  // Switch
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  switchLabel: { fontSize: 12, color: COLORS.textSecondary },

  // Badge
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  // Add button
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.lime, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
  },
  addButtonText: { fontSize: 13, fontWeight: '600', color: COLORS.textDark },
  editIconBtn: { padding: 8 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 12 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: COLORS.bgPrimary, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '600', color: COLORS.textPrimary },
  modalCancel: { fontSize: 15, color: COLORS.textSecondary },
  modalSave: { fontSize: 15, color: COLORS.lime, fontWeight: '600' },
  modalBody: { padding: 20 },

  // Form
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8, marginTop: 16 },
  textInput: {
    backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 14,
    color: COLORS.textPrimary, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconOption: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: COLORS.bgCard, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorOption: { width: 40, height: 40, borderRadius: 20 },

  configUpdated: { fontSize: 11, color: COLORS.textMuted, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },

  // Config visual controls
  cfgSection: {
    backgroundColor: COLORS.bgCard, borderRadius: 16, marginBottom: 16, overflow: 'hidden',
  },
  cfgSectionHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  cfgSectionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cfgSectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  cfgSectionBody: { padding: 4 },
  cfgField: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border + '50',
  },
  cfgFieldLabel: { flex: 1, marginRight: 12 },
  cfgLabelText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  cfgSublabelText: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  cfgNumberRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cfgNumberInput: {
    backgroundColor: COLORS.bgCardAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    color: COLORS.textPrimary, fontSize: 15, fontWeight: '600', minWidth: 60, textAlign: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  cfgNumberPrefix: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  cfgNumberSuffix: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  cfgTextInput: {
    backgroundColor: COLORS.bgCardAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    color: COLORS.textPrimary, fontSize: 13, minWidth: 140, maxWidth: 180,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cfgSaveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.lime, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  cfgSaveBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textDark },
  cfgEmptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 16 },
});