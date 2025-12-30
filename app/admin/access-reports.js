// app/admin/access-reports.js
// ISSY - Control de Acceso y Auditoría para Admins (ProHome Dark Theme)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/context/AuthContext';

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

export default function AccessReportsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  
  // State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  
  // History data
  const [accessLogs, setAccessLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  
  // Visitors inside
  const [visitorsInside, setVisitorsInside] = useState([]);
  
  // Incidents
  const [incidents, setIncidents] = useState([]);
  
  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [movementFilter, setMovementFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Detail modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Check admin role
  const userRole = profile?.role || user?.role || 'user';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Acceso Denegado', 'Solo administradores pueden acceder a esta sección');
      router.back();
      return;
    }
    fetchData();
  }, [activeTab, selectedDate, movementFilter]);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'dashboard':
          await fetchDashboard();
          break;
        case 'history':
          await fetchHistory();
          break;
        case 'inside':
          await fetchVisitorsInside();
          break;
        case 'incidents':
          await fetchIncidents();
          break;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/guard/access/dashboard`, { headers });
      const data = await response.json();
      setDashboardData(data.data || data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const headers = await getAuthHeaders();
      let url = `${API_URL}/api/guard/access/history?date=${selectedDate}&page=${pagination.page}&limit=${pagination.limit}`;
      if (movementFilter) url += `&movement_type=${movementFilter}`;
      
      const response = await fetch(url, { headers });
      const data = await response.json();
      const result = data.data || data;
      
      setAccessLogs(result.logs || []);
      setPagination(prev => ({
        ...prev,
        total: result.pagination?.total || 0
      }));
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const fetchVisitorsInside = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/guard/access/inside`, { headers });
      const data = await response.json();
      const result = data.data || data;
      setVisitorsInside(result.visitors || []);
    } catch (error) {
      console.error('Error fetching visitors inside:', error);
    }
  };

  const fetchIncidents = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/guard/incidents`, { headers });
      const data = await response.json();
      const result = data.data || data;
      setIncidents(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('es-HN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-HN', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-HN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter logs by search
  const filteredLogs = accessLogs.filter(log => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      log.visitor_name?.toLowerCase().includes(search) ||
      log.vehicle_plate?.toLowerCase().includes(search)
    );
  });

  const tabs = [
    { id: 'dashboard', icon: 'stats-chart', title: 'Dashboard' },
    { id: 'history', icon: 'list', title: 'Historial' },
    { id: 'inside', icon: 'people', title: 'Adentro' },
    { id: 'incidents', icon: 'alert-circle', title: 'Incidentes' },
  ];

  // Stat Card Component
  const StatCard = ({ icon, label, value, color, highlight }) => (
    <View style={[
      styles.statCard,
      highlight && { borderWidth: 2, borderColor: color }
    ]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  // Get QR type info
  const getQRTypeInfo = (qrType) => {
    switch(qrType) {
      case 'single': return { icon: 'ticket', label: 'Único', color: COLORS.purple };
      case 'temporary': return { icon: 'calendar', label: 'Temporal', color: COLORS.warning };
      case 'permanent': return { icon: 'infinite', label: 'Permanente', color: COLORS.success };
      default: return { icon: 'qr-code', label: 'QR', color: COLORS.textSecondary };
    }
  };

  // Get severity info
  const getSeverityInfo = (severity) => {
    switch(severity) {
      case 'high': return { label: 'Alta', color: COLORS.danger };
      case 'medium': return { label: 'Media', color: COLORS.warning };
      case 'low': return { label: 'Baja', color: COLORS.success };
      default: return { label: severity, color: COLORS.textSecondary };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Control de Acceso</Text>
          <Text style={styles.headerSubtitle}>Auditoría y reportes</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons 
              name={tab.icon} 
              size={20} 
              color={activeTab === tab.id ? COLORS.lime : COLORS.textMuted} 
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
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
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.lime} />
            <Text style={styles.loadingText}>Cargando...</Text>
          </View>
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <View>
                {/* Stats Cards */}
                <View style={styles.statsGrid}>
                  <StatCard
                    icon="enter"
                    label="Entradas Hoy"
                    value={dashboardData?.stats?.today?.entries || 0}
                    color={COLORS.success}
                  />
                  <StatCard
                    icon="exit"
                    label="Salidas Hoy"
                    value={dashboardData?.stats?.today?.exits || 0}
                    color={COLORS.warning}
                  />
                  <StatCard
                    icon="people"
                    label="Adentro"
                    value={dashboardData?.stats?.today?.currently_inside || 0}
                    color={COLORS.blue}
                    highlight
                  />
                  <StatCard
                    icon="alert-circle"
                    label="Incidentes"
                    value={dashboardData?.stats?.today?.incidents || 0}
                    color={COLORS.danger}
                  />
                </View>

                {/* Recent Access */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="time" size={20} color={COLORS.lime} />
                    <Text style={styles.sectionTitle}>Accesos Recientes</Text>
                  </View>
                  
                  {dashboardData?.recent_access?.length > 0 ? (
                    dashboardData.recent_access.map((access, idx) => (
                      <View key={idx} style={styles.recentAccessItem}>
                        <View style={[
                          styles.accessIcon,
                          { backgroundColor: access.movement_type === 'entry' ? COLORS.success + '20' : COLORS.warning + '20' }
                        ]}>
                          <Ionicons 
                            name={access.movement_type === 'entry' ? 'enter' : 'exit'} 
                            size={20} 
                            color={access.movement_type === 'entry' ? COLORS.success : COLORS.warning} 
                          />
                        </View>
                        <View style={styles.accessInfo}>
                          <Text style={styles.accessName}>{access.visitor_name}</Text>
                          <View style={styles.accessTypeContainer}>
                            <Ionicons 
                              name={getQRTypeInfo(access.qr_type).icon} 
                              size={12} 
                              color={getQRTypeInfo(access.qr_type).color} 
                            />
                            <Text style={[styles.accessType, { color: getQRTypeInfo(access.qr_type).color }]}>
                              {getQRTypeInfo(access.qr_type).label}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.accessTime}>{formatTime(access.timestamp)}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Ionicons name="mail-open-outline" size={48} color={COLORS.textMuted} />
                      <Text style={styles.emptyText}>No hay accesos recientes</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <View>
                {/* Filters */}
                <View style={styles.filtersContainer}>
                  <TouchableOpacity style={styles.dateFilter}>
                    <Ionicons name="calendar" size={18} color={COLORS.teal} />
                    <Text style={styles.dateFilterText}>{selectedDate}</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.filterButtons}>
                    <TouchableOpacity 
                      style={[styles.filterBtn, !movementFilter && styles.filterBtnActive]}
                      onPress={() => setMovementFilter('')}
                    >
                      <Text style={[styles.filterBtnText, !movementFilter && styles.filterBtnTextActive]}>
                        Todos
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.filterBtn, movementFilter === 'entry' && styles.filterBtnActive]}
                      onPress={() => setMovementFilter('entry')}
                    >
                      <Ionicons 
                        name="enter" 
                        size={14} 
                        color={movementFilter === 'entry' ? COLORS.background : COLORS.textSecondary} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.filterBtn, movementFilter === 'exit' && styles.filterBtnActive]}
                      onPress={() => setMovementFilter('exit')}
                    >
                      <Ionicons 
                        name="exit" 
                        size={14} 
                        color={movementFilter === 'exit' ? COLORS.background : COLORS.textSecondary} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={18} color={COLORS.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar visitante o placa..."
                    placeholderTextColor={COLORS.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* History List */}
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={styles.historyItem}
                      onPress={() => {
                        setSelectedLog(log);
                        setShowDetailModal(true);
                      }}
                    >
                      <View style={[
                        styles.historyIcon,
                        { backgroundColor: log.movement_type === 'entry' ? COLORS.success + '20' : COLORS.warning + '20' }
                      ]}>
                        <Ionicons 
                          name={log.movement_type === 'entry' ? 'enter' : 'exit'} 
                          size={18} 
                          color={log.movement_type === 'entry' ? COLORS.success : COLORS.warning} 
                        />
                      </View>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyName}>{log.visitor_name}</Text>
                        <View style={styles.historyMeta}>
                          {log.vehicle_plate && (
                            <View style={styles.historyMetaItem}>
                              <Ionicons name="car" size={12} color={COLORS.textMuted} />
                              <Text style={styles.historyMetaText}>{log.vehicle_plate}</Text>
                            </View>
                          )}
                          <View style={styles.historyMetaItem}>
                            <Ionicons name={getQRTypeInfo(log.qr_type).icon} size={12} color={COLORS.textMuted} />
                            <Text style={styles.historyMetaText}>{getQRTypeInfo(log.qr_type).label}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.historyRight}>
                        <Text style={styles.historyTime}>{formatTime(log.timestamp)}</Text>
                        {log.guard_name && (
                          <Text style={styles.historyGuard}>{log.guard_name}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyText}>No hay registros para esta fecha</Text>
                  </View>
                )}
              </View>
            )}

            {/* Inside Tab */}
            {activeTab === 'inside' && (
              <View>
                {/* Counter */}
                <View style={styles.insideCounter}>
                  <Ionicons name="people" size={32} color={COLORS.textPrimary} />
                  <Text style={styles.insideCounterLabel}>Visitantes Adentro</Text>
                  <Text style={styles.insideCounterValue}>{visitorsInside.length}</Text>
                </View>

                {/* Visitors List */}
                {visitorsInside.length > 0 ? (
                  visitorsInside.map((visitor, idx) => {
                    const entryTime = new Date(visitor.entry_time);
                    const now = new Date();
                    const hoursInside = Math.floor((now - entryTime) / (1000 * 60 * 60));
                    const isLongStay = hoursInside >= 4;

                    return (
                      <View 
                        key={idx} 
                        style={[styles.visitorCard, isLongStay && styles.visitorCardAlert]}
                      >
                        <View style={styles.visitorHeader}>
                          <View>
                            <Text style={styles.visitorName}>{visitor.visitor_name}</Text>
                            <View style={styles.visitorTypeRow}>
                              <Ionicons 
                                name={getQRTypeInfo(visitor.qr_type).icon} 
                                size={14} 
                                color={getQRTypeInfo(visitor.qr_type).color} 
                              />
                              <Text style={styles.visitorType}>{getQRTypeInfo(visitor.qr_type).label}</Text>
                            </View>
                          </View>
                          {isLongStay && (
                            <View style={styles.alertBadge}>
                              <Ionicons name="time" size={12} color={COLORS.danger} />
                              <Text style={styles.alertBadgeText}>+{hoursInside}h</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.visitorDetails}>
                          <View style={styles.visitorDetailItem}>
                            <Ionicons name="enter" size={14} color={COLORS.textMuted} />
                            <Text style={styles.visitorDetail}>Entrada: {formatTime(visitor.entry_time)}</Text>
                          </View>
                          <View style={styles.visitorDetailItem}>
                            <Ionicons name="home" size={14} color={COLORS.textMuted} />
                            <Text style={styles.visitorDetail}>Unidad: {visitor.unit_number || '-'}</Text>
                          </View>
                        </View>
                        {visitor.vehicle_plate && (
                          <View style={styles.visitorVehicle}>
                            <Ionicons name="car" size={14} color={COLORS.textMuted} />
                            <Text style={styles.visitorDetail}>{visitor.vehicle_plate}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyText}>No hay visitantes adentro</Text>
                  </View>
                )}
              </View>
            )}

            {/* Incidents Tab */}
            {activeTab === 'incidents' && (
              <View>
                {incidents.length > 0 ? (
                  incidents.map((incident, idx) => {
                    const severityInfo = getSeverityInfo(incident.severity);
                    
                    return (
                      <View 
                        key={idx} 
                        style={[styles.incidentCard, { borderLeftColor: severityInfo.color }]}
                      >
                        <View style={styles.incidentHeader}>
                          <View style={[styles.severityBadge, { backgroundColor: severityInfo.color + '20' }]}>
                            <Ionicons name="alert-circle" size={12} color={severityInfo.color} />
                            <Text style={[styles.severityText, { color: severityInfo.color }]}>
                              {severityInfo.label}
                            </Text>
                          </View>
                          <Text style={styles.incidentDate}>{formatDateTime(incident.created_at)}</Text>
                        </View>
                        <Text style={styles.incidentDescription}>{incident.description}</Text>
                        
                        {incident.photos?.length > 0 && (
                          <View style={styles.incidentPhotos}>
                            {incident.photos.slice(0, 3).map((photo, pIdx) => (
                              <Image 
                                key={pIdx} 
                                source={{ uri: photo }} 
                                style={styles.incidentPhoto} 
                              />
                            ))}
                            {incident.photos.length > 3 && (
                              <View style={styles.incidentPhotoMore}>
                                <Text style={styles.incidentPhotoMoreText}>
                                  +{incident.photos.length - 3}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyText}>No hay incidentes reportados</Text>
                    <Text style={styles.emptySubtext}>Todo en orden</Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}

        <View style={{ height: scale(100) }} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <Text style={styles.modalClose}>Cerrar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Detalle de Acceso</Text>
            <View style={{ width: 50 }} />
          </View>
          
          {selectedLog && (
            <ScrollView style={styles.modalContent}>
              {/* Header */}
              <View style={styles.detailHeader}>
                <View style={[
                  styles.detailIcon,
                  { backgroundColor: selectedLog.movement_type === 'entry' ? COLORS.success + '20' : COLORS.warning + '20' }
                ]}>
                  <Ionicons 
                    name={selectedLog.movement_type === 'entry' ? 'enter' : 'exit'} 
                    size={32} 
                    color={selectedLog.movement_type === 'entry' ? COLORS.success : COLORS.warning} 
                  />
                </View>
                <Text style={styles.detailName}>{selectedLog.visitor_name}</Text>
                <Text style={styles.detailMovement}>
                  {selectedLog.movement_type === 'entry' ? 'Entrada' : 'Salida'}
                </Text>
              </View>

              {/* Details */}
              <View style={styles.detailSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Fecha y Hora</Text>
                  <Text style={styles.detailRowValue}>{formatDateTime(selectedLog.timestamp)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Tipo de QR</Text>
                  <Text style={styles.detailRowValue}>{getQRTypeInfo(selectedLog.qr_type).label}</Text>
                </View>
                {selectedLog.vehicle_plate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Placa</Text>
                    <Text style={styles.detailRowValue}>{selectedLog.vehicle_plate}</Text>
                  </View>
                )}
                {selectedLog.unit_number && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Unidad</Text>
                    <Text style={styles.detailRowValue}>{selectedLog.unit_number}</Text>
                  </View>
                )}
                {selectedLog.guard_name && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Guardia</Text>
                    <Text style={styles.detailRowValue}>{selectedLog.guard_name}</Text>
                  </View>
                )}
                {selectedLog.id_number && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>ID</Text>
                    <Text style={styles.detailRowValue}>{selectedLog.id_number}</Text>
                  </View>
                )}
              </View>

              {/* Photos */}
              {selectedLog.photos?.length > 0 && (
                <View style={styles.photosSection}>
                  <Text style={styles.photosSectionTitle}>Evidencia Fotográfica</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.photosGrid}>
                      {selectedLog.photos.map((photo, idx) => (
                        <Image 
                          key={idx} 
                          source={{ uri: photo }} 
                          style={styles.evidencePhoto} 
                        />
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: scale(12),
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
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

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    paddingBottom: scale(12),
    gap: scale(6),
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    paddingHorizontal: scale(8),
    borderRadius: scale(10),
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: scale(4),
  },
  tabActive: {
    backgroundColor: COLORS.backgroundSecondary,
    borderColor: COLORS.lime,
  },
  tabText: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.lime,
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: scale(16),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scale(60),
  },
  loadingText: {
    marginTop: scale(12),
    color: COLORS.textSecondary,
    fontSize: scale(14),
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
    marginBottom: scale(16),
  },
  statCard: {
    width: (SCREEN_WIDTH - scale(42)) / 2,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIconContainer: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  statValue: {
    fontSize: scale(28),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(4),
  },

  // Section
  section: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(16),
    gap: scale(8),
  },
  sectionTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // Recent Access
  recentAccessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  accessIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  accessInfo: {
    flex: 1,
    marginLeft: scale(12),
  },
  accessName: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  accessTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(4),
    gap: scale(4),
  },
  accessType: {
    fontSize: scale(12),
  },
  accessTime: {
    fontSize: scale(13),
    fontWeight: '500',
    color: COLORS.textSecondary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: scale(40),
  },
  emptyText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(12),
  },
  emptySubtext: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginTop: scale(4),
  },

  // Filters
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  dateFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    borderRadius: scale(10),
    gap: scale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateFilterText: {
    fontSize: scale(13),
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: scale(8),
  },
  filterBtn: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterBtnActive: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  filterBtnText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterBtnTextActive: {
    color: COLORS.background,
    fontWeight: '600',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: scale(12),
    paddingHorizontal: scale(10),
    fontSize: scale(14),
    color: COLORS.textPrimary,
  },

  // History Item
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(12),
    marginBottom: scale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
    marginLeft: scale(12),
  },
  historyName: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  historyMeta: {
    flexDirection: 'row',
    marginTop: scale(4),
    gap: scale(12),
  },
  historyMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  historyMetaText: {
    fontSize: scale(12),
    color: COLORS.textMuted,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyTime: {
    fontSize: scale(13),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  historyGuard: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    marginTop: scale(2),
  },

  // Inside Counter
  insideCounter: {
    backgroundColor: COLORS.blue,
    borderRadius: scale(16),
    padding: scale(24),
    alignItems: 'center',
    marginBottom: scale(16),
  },
  insideCounterLabel: {
    fontSize: scale(14),
    color: 'rgba(255,255,255,0.9)',
    marginTop: scale(8),
  },
  insideCounterValue: {
    fontSize: scale(48),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Visitor Card
  visitorCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  visitorCardAlert: {
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  visitorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(12),
  },
  visitorName: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  visitorTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(4),
    gap: scale(6),
  },
  visitorType: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger + '20',
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
    gap: scale(4),
  },
  alertBadgeText: {
    fontSize: scale(11),
    fontWeight: '600',
    color: COLORS.danger,
  },
  visitorDetails: {
    flexDirection: 'row',
    gap: scale(16),
  },
  visitorDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  visitorDetail: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  visitorVehicle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(8),
    gap: scale(6),
  },

  // Incident Card
  incidentCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
    gap: scale(4),
  },
  severityText: {
    fontSize: scale(12),
    fontWeight: '600',
  },
  incidentDate: {
    fontSize: scale(12),
    color: COLORS.textMuted,
  },
  incidentDescription: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
    lineHeight: scale(20),
  },
  incidentPhotos: {
    flexDirection: 'row',
    marginTop: scale(12),
    gap: scale(8),
  },
  incidentPhoto: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(8),
  },
  incidentPhotoMore: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(8),
    backgroundColor: COLORS.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incidentPhotoMoreText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalClose: {
    fontSize: scale(16),
    color: COLORS.lime,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: scale(17),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: scale(16),
  },
  detailHeader: {
    alignItems: 'center',
    paddingVertical: scale(24),
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailIcon: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  detailName: {
    fontSize: scale(20),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  detailMovement: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(4),
  },
  detailSection: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailRowLabel: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  detailRowValue: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  photosSection: {
    marginTop: scale(16),
  },
  photosSectionTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(12),
  },
  photosGrid: {
    flexDirection: 'row',
    gap: scale(8),
  },
  evidencePhoto: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(8),
  },
});