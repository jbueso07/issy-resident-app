// app/admin/access-reports.js
// ISSY - Control de Acceso y Auditoría para Admins (Mobile)

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
  SafeAreaView,
  Image,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.joinissy.com';

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
    { id: 'dashboard', label: '📊', title: 'Dashboard' },
    { id: 'history', label: '📋', title: 'Historial' },
    { id: 'inside', label: '👥', title: 'Adentro' },
    { id: 'incidents', label: '🚨', title: 'Incidentes' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>📊 Control de Acceso</Text>
          <Text style={styles.headerSubtitle}>Auditoría y reportes</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={styles.tabEmoji}>{tab.label}</Text>
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
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
                    icon="🚪"
                    label="Entradas Hoy"
                    value={dashboardData?.stats?.today?.entries || 0}
                    color="#10B981"
                  />
                  <StatCard
                    icon="🚶"
                    label="Salidas Hoy"
                    value={dashboardData?.stats?.today?.exits || 0}
                    color="#F59E0B"
                  />
                  <StatCard
                    icon="👥"
                    label="Adentro"
                    value={dashboardData?.stats?.today?.currently_inside || 0}
                    color="#3B82F6"
                    highlight
                  />
                  <StatCard
                    icon="🚨"
                    label="Incidentes"
                    value={dashboardData?.stats?.today?.incidents || 0}
                    color="#EF4444"
                  />
                </View>

                {/* Recent Access */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Accesos Recientes</Text>
                  
                  {dashboardData?.recent_access?.length > 0 ? (
                    dashboardData.recent_access.map((access, idx) => (
                      <View key={idx} style={styles.recentAccessItem}>
                        <View style={[
                          styles.accessIcon,
                          { backgroundColor: access.movement_type === 'entry' ? '#D1FAE5' : '#FEF3C7' }
                        ]}>
                          <Text>{access.movement_type === 'entry' ? '🚪' : '🚶'}</Text>
                        </View>
                        <View style={styles.accessInfo}>
                          <Text style={styles.accessName}>{access.visitor_name}</Text>
                          <Text style={styles.accessType}>
                            {access.qr_type === 'single' ? '🎫 Único' : 
                             access.qr_type === 'temporary' ? '📅 Temporal' : '♾️ Permanente'}
                          </Text>
                        </View>
                        <Text style={styles.accessTime}>{formatTime(access.timestamp)}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyIcon}>📭</Text>
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
                  <TouchableOpacity 
                    style={styles.dateFilter}
                    onPress={() => {
                      // TODO: Implementar date picker
                      Alert.alert('Fecha', `Fecha seleccionada: ${selectedDate}`);
                    }}
                  >
                    <Text style={styles.dateFilterIcon}>📅</Text>
                    <Text style={styles.dateFilterText}>{selectedDate}</Text>
                  </TouchableOpacity>

                  <View style={styles.filterButtons}>
                    <TouchableOpacity
                      style={[styles.filterBtn, movementFilter === '' && styles.filterBtnActive]}
                      onPress={() => setMovementFilter('')}
                    >
                      <Text style={[styles.filterBtnText, movementFilter === '' && styles.filterBtnTextActive]}>
                        Todos
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterBtn, movementFilter === 'entry' && styles.filterBtnActive]}
                      onPress={() => setMovementFilter('entry')}
                    >
                      <Text style={[styles.filterBtnText, movementFilter === 'entry' && styles.filterBtnTextActive]}>
                        Entradas
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterBtn, movementFilter === 'exit' && styles.filterBtnActive]}
                      onPress={() => setMovementFilter('exit')}
                    >
                      <Text style={[styles.filterBtnText, movementFilter === 'exit' && styles.filterBtnTextActive]}>
                        Salidas
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nombre, placa..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                {/* List */}
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log, idx) => (
                    <TouchableOpacity
                      key={log.id || idx}
                      style={styles.historyItem}
                      onPress={() => {
                        setSelectedLog(log);
                        setShowDetailModal(true);
                      }}
                    >
                      <View style={[
                        styles.historyIcon,
                        { backgroundColor: log.movement_type === 'entry' ? '#D1FAE5' : '#FEF3C7' }
                      ]}>
                        <Text>{log.movement_type === 'entry' ? '🚪' : '🚶'}</Text>
                      </View>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyName}>{log.visitor_name}</Text>
                        <View style={styles.historyMeta}>
                          <Text style={styles.historyMetaText}>
                            {log.qr_type === 'single' ? '🎫' : log.qr_type === 'temporary' ? '📅' : '♾️'}
                          </Text>
                          {log.vehicle_plate && (
                            <Text style={styles.historyMetaText}>🚗 {log.vehicle_plate}</Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.historyRight}>
                        <Text style={styles.historyTime}>{formatTime(log.timestamp)}</Text>
                        <Text style={styles.historyGuard}>{log.guard_name || 'Sistema'}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📋</Text>
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
                  <Text style={styles.insideCounterLabel}>Visitantes Dentro Ahora</Text>
                  <Text style={styles.insideCounterValue}>{visitorsInside.length}</Text>
                </View>

                {/* List */}
                {visitorsInside.length > 0 ? (
                  visitorsInside.map((visitor, idx) => (
                    <View 
                      key={visitor.id || idx} 
                      style={[
                        styles.visitorCard,
                        visitor.has_alert && styles.visitorCardAlert
                      ]}
                    >
                      <View style={styles.visitorHeader}>
                        <View>
                          <Text style={styles.visitorName}>{visitor.visitor_name}</Text>
                          <Text style={styles.visitorType}>
                            {visitor.qr_type === 'single' ? '🎫 Único' : 
                             visitor.qr_type === 'temporary' ? '📅 Temporal' : '♾️ Permanente'}
                          </Text>
                        </View>
                        {visitor.has_alert && (
                          <View style={styles.alertBadge}>
                            <Text style={styles.alertBadgeText}>⚠️ +3h</Text>
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.visitorDetails}>
                        <Text style={styles.visitorDetail}>
                          🕐 Entrada: {formatTime(visitor.entry_time)}
                        </Text>
                        <Text style={styles.visitorDetail}>
                          ⏱️ {visitor.duration_formatted}
                        </Text>
                      </View>
                      
                      {visitor.vehicle_plate && (
                        <Text style={styles.visitorVehicle}>
                          🚗 {visitor.vehicle_plate}
                          {visitor.companions_count > 0 && ` • ${visitor.companions_count} acompañantes`}
                        </Text>
                      )}
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>👥</Text>
                    <Text style={styles.emptyText}>No hay visitantes dentro</Text>
                  </View>
                )}
              </View>
            )}

            {/* Incidents Tab */}
            {activeTab === 'incidents' && (
              <View>
                {incidents.length > 0 ? (
                  incidents.map((incident, idx) => (
                    <View 
                      key={incident.id || idx}
                      style={[
                        styles.incidentCard,
                        { borderLeftColor: incident.severity === 'high' ? '#EF4444' : 
                                          incident.severity === 'medium' ? '#F59E0B' : '#10B981' }
                      ]}
                    >
                      <View style={styles.incidentHeader}>
                        <View style={[
                          styles.severityBadge,
                          { backgroundColor: incident.severity === 'high' ? '#FEE2E2' : 
                                            incident.severity === 'medium' ? '#FEF3C7' : '#D1FAE5' }
                        ]}>
                          <Text style={[
                            styles.severityText,
                            { color: incident.severity === 'high' ? '#DC2626' : 
                                     incident.severity === 'medium' ? '#D97706' : '#059669' }
                          ]}>
                            {incident.incident_type || 'Incidente'}
                          </Text>
                        </View>
                        <Text style={styles.incidentDate}>
                          {formatDate(incident.reported_at)} {formatTime(incident.reported_at)}
                        </Text>
                      </View>
                      
                      <Text style={styles.incidentDescription}>
                        {incident.description?.substring(0, 150)}
                        {incident.description?.length > 150 ? '...' : ''}
                      </Text>
                      
                      {incident.photo_urls?.length > 0 && (
                        <View style={styles.incidentPhotos}>
                          {incident.photo_urls.slice(0, 3).map((url, i) => (
                            <Image
                              key={i}
                              source={{ uri: url }}
                              style={styles.incidentPhoto}
                            />
                          ))}
                          {incident.photo_urls.length > 3 && (
                            <View style={styles.incidentPhotoMore}>
                              <Text style={styles.incidentPhotoMoreText}>
                                +{incident.photo_urls.length - 3}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🚨</Text>
                    <Text style={styles.emptyText}>No hay incidentes reportados</Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <Text style={styles.modalClose}>Cerrar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Detalle de Acceso</Text>
            <View style={{ width: 50 }} />
          </View>

          {selectedLog && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailHeader}>
                <View style={[
                  styles.detailIcon,
                  { backgroundColor: selectedLog.movement_type === 'entry' ? '#D1FAE5' : '#FEF3C7' }
                ]}>
                  <Text style={styles.detailIconText}>
                    {selectedLog.movement_type === 'entry' ? '🚪' : '🚶'}
                  </Text>
                </View>
                <Text style={styles.detailName}>{selectedLog.visitor_name}</Text>
                <Text style={styles.detailMovement}>
                  {selectedLog.movement_type === 'entry' ? 'Entrada' : 'Salida'} • {formatTime(selectedLog.timestamp)}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <DetailRow label="Fecha" value={formatDate(selectedLog.timestamp)} />
                <DetailRow 
                  label="Tipo de QR" 
                  value={selectedLog.qr_type === 'single' ? 'Único' : 
                         selectedLog.qr_type === 'temporary' ? 'Temporal' : 'Permanente'} 
                />
                <DetailRow label="Vehículo" value={selectedLog.vehicle_plate || 'No registrado'} />
                <DetailRow label="Acompañantes" value={String(selectedLog.companions_count || 0)} />
                <DetailRow label="Guardia" value={selectedLog.guard_name || 'Sistema'} />
                {selectedLog.observations && (
                  <DetailRow label="Observaciones" value={selectedLog.observations} />
                )}
              </View>

              {/* Photos section */}
              {(selectedLog.photo_url || selectedLog.vehicle_photo_url || selectedLog.id_document_url) && (
                <View style={styles.photosSection}>
                  <Text style={styles.photosSectionTitle}>📸 Evidencia Capturada</Text>
                  <View style={styles.photosGrid}>
                    {selectedLog.photo_url && (
                      <Image source={{ uri: selectedLog.photo_url }} style={styles.evidencePhoto} />
                    )}
                    {selectedLog.id_document_url && (
                      <Image source={{ uri: selectedLog.id_document_url }} style={styles.evidencePhoto} />
                    )}
                    {selectedLog.vehicle_photo_url && (
                      <Image source={{ uri: selectedLog.vehicle_photo_url }} style={styles.evidencePhoto} />
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// Stat Card Component
const StatCard = ({ icon, label, value, color, highlight }) => (
  <View style={[
    styles.statCard,
    highlight && { borderColor: color, borderWidth: 2 }
  ]}>
    <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
      <Text style={styles.statIconText}>{icon}</Text>
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// Detail Row Component
const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailRowLabel}>{label}</Text>
    <Text style={styles.detailRowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#374151',
  },
  headerTitleContainer: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#3B82F6',
  },
  tabEmoji: {
    fontSize: 20,
  },
  tabText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  tabTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: '1%',
    marginBottom: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIconText: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  recentAccessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  accessIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accessInfo: {
    flex: 1,
    marginLeft: 12,
  },
  accessName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  accessType: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  accessTime: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  filtersContainer: {
    marginBottom: 12,
  },
  dateFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  dateFilterIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  dateFilterText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterBtnActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterBtnText: {
    fontSize: 13,
    color: '#6B7280',
  },
  filterBtnTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  historyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  historyMeta: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 8,
  },
  historyMetaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyTime: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  historyGuard: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  insideCounter: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  insideCounterLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  insideCounterValue: {
    fontSize: 48,
    fontWeight: '700',
    color: 'white',
  },
  visitorCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  visitorCardAlert: {
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  visitorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  visitorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  visitorType: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  alertBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  alertBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  visitorDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  visitorDetail: {
    fontSize: 13,
    color: '#6B7280',
  },
  visitorVehicle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
  incidentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  incidentDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  incidentDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  incidentPhotos: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  incidentPhoto: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  incidentPhotoMore: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  incidentPhotoMoreText: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalClose: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
  },
  detailIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIconText: {
    fontSize: 32,
  },
  detailName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  detailMovement: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  detailSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailRowLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailRowValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  photosSection: {
    marginTop: 16,
  },
  photosSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  photosGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  evidencePhoto: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
});