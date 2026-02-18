// app/admin/patrol-reports.js
// ISSY Admin - Reportes de Rondines (Patrol Reports)

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useAdminLocation } from '../../src/context/AdminLocationContext';
import { LocationHeader, LocationPickerModal } from '../../src/components/AdminLocationPicker';
import { useTranslation } from '../../src/hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.joinissy.com';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

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

const STATUS_CONFIG = {
  completed: { label: 'Completado', color: COLORS.success, icon: 'checkmark-circle' },
  incomplete: { label: 'Incompleto', color: COLORS.warning, icon: 'alert-circle' },
  cancelled: { label: 'Cancelado', color: COLORS.danger, icon: 'close-circle' },
  in_progress: { label: 'En Progreso', color: COLORS.blue, icon: 'time' },
};

export default function PatrolReportsScreen() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { selectedLocationId, loading: locationLoading } = useAdminLocation();

  // Main states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedGuard, setSelectedGuard] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Filter options
  const [routes, setRoutes] = useState([]);
  const [guards, setGuards] = useState([]);

  // Picker states
  const [showRoutePicker, setShowRoutePicker] = useState(false);
  const [showGuardPicker, setShowGuardPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  // Detail modal
  const [selectedSession, setSelectedSession] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sessionDetail, setSessionDetail] = useState(null);

  // Photo zoom
  const [zoomPhoto, setZoomPhoto] = useState(null);
  const [showZoomModal, setShowZoomModal] = useState(false);

  const userRole = profile?.role || user?.role || 'user';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);

  const getLocale = () => {
    const locales = { es: 'es-HN', en: 'en-US', fr: 'fr-FR', pt: 'pt-BR' };
    return locales[language] || 'es-HN';
  };

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Acceso Denegado', 'No tienes permisos para acceder a esta sección');
      router.back();
      return;
    }
    fetchData();
  }, [selectedLocationId]);

  useEffect(() => {
    if (selectedLocationId) {
      fetchFilteredData();
    }
  }, [startDate, endDate, selectedRoute, selectedGuard, selectedStatus]);

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
      await Promise.all([
        fetchStats(),
        fetchSessions(),
        fetchRoutes(),
        fetchGuards(),
      ]);
    } catch (error) {
      console.error('Error fetching patrol reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredData = async () => {
    try {
      await Promise.all([
        fetchStats(),
        fetchSessions(),
      ]);
    } catch (error) {
      console.error('Error fetching filtered data:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const headers = await getAuthHeaders();
      let url = `${API_URL}/api/patrols/reports/stats?location_id=${selectedLocationId}`;
      url += `&start_date=${startDate}&end_date=${endDate}`;
      if (selectedRoute) url += `&route_id=${selectedRoute}`;
      if (selectedGuard) url += `&guard_id=${selectedGuard}`;

      const response = await fetch(url, { headers });
      const data = await response.json();

      if (data.success) {
        setStats(data.data || data);
      } else {
        // Set default stats if API fails
        setStats({
          totalPatrols: 0,
          completionRate: 0,
          averageDuration: 0,
          totalDistance: 0,
          totalCheckpointsVerified: 0,
          patrolsByDay: [],
          completionTrend: [],
          patrolsByRoute: [],
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        totalPatrols: 0,
        completionRate: 0,
        averageDuration: 0,
        totalDistance: 0,
        totalCheckpointsVerified: 0,
        patrolsByDay: [],
        completionTrend: [],
        patrolsByRoute: [],
      });
    }
  };

  const fetchSessions = async () => {
    try {
      const headers = await getAuthHeaders();
      let url = `${API_URL}/api/patrols/reports/history?location_id=${selectedLocationId}`;
      url += `&start_date=${startDate}&end_date=${endDate}`;
      if (selectedRoute) url += `&route_id=${selectedRoute}`;
      if (selectedGuard) url += `&guard_id=${selectedGuard}`;
      if (selectedStatus) url += `&status=${selectedStatus}`;

      const response = await fetch(url, { headers });
      const data = await response.json();

      if (data.success) {
        setSessions(data.data?.sessions || data.data || []);
      } else {
        setSessions([]);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setSessions([]);
    }
  };

  const fetchRoutes = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_URL}/api/patrols/routes?location_id=${selectedLocationId}`,
        { headers }
      );
      const data = await response.json();

      if (data.success) {
        setRoutes(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  const fetchGuards = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_URL}/api/users?location_id=${selectedLocationId}&role=guard`,
        { headers }
      );
      const data = await response.json();

      if (data.success || Array.isArray(data)) {
        setGuards(data.data || data || []);
      }
    } catch (error) {
      console.error('Error fetching guards:', error);
    }
  };

  const fetchSessionDetail = async (sessionId) => {
    setLoadingDetail(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_URL}/api/patrols/reports/sessions/${sessionId}`,
        { headers }
      );
      const data = await response.json();

      if (data.success) {
        setSessionDetail(data.data);
        setShowDetailModal(true);
      } else {
        // Use the session from the list as fallback
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
          setSessionDetail(session);
          setShowDetailModal(true);
        }
      }
    } catch (error) {
      console.error('Error fetching session detail:', error);
      // Fallback to session from list
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        setSessionDetail(session);
        setShowDetailModal(true);
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  }, [selectedLocationId, startDate, endDate, selectedRoute, selectedGuard, selectedStatus]);

  const handleExport = () => {
    Alert.alert(
      'Exportar Reporte',
      'Selecciona el formato de exportación',
      [
        {
          text: 'PDF',
          onPress: () => Alert.alert('Exportar', 'La funcionalidad de exportación a PDF estará disponible próximamente.')
        },
        {
          text: 'Excel',
          onPress: () => Alert.alert('Exportar', 'La funcionalidad de exportación a Excel estará disponible próximamente.')
        },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString(getLocale(), {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFullDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString(getLocale(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatDistance = (meters) => {
    if (!meters) return '-';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const getStatusInfo = (status) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.incomplete;
  };

  const clearFilters = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    setSelectedRoute('');
    setSelectedGuard('');
    setSelectedStatus('');
  };

  const openPhotoZoom = (photoUrl, title) => {
    setZoomPhoto({ url: photoUrl, title });
    setShowZoomModal(true);
  };

  // Stat Card Component
  const StatCard = ({ icon, label, value, color, subtitle }) => (
    <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  // Simple Bar Chart Component
  const SimpleBarChart = ({ data, title, color = COLORS.teal }) => {
    if (!data || data.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>{title}</Text>
          <View style={styles.emptyChart}>
            <Ionicons name="bar-chart-outline" size={32} color={COLORS.textMuted} />
            <Text style={styles.emptyChartText}>Sin datos</Text>
          </View>
        </View>
      );
    }

    const maxValue = Math.max(...data.map(d => d.value || 0), 1);

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.barChartContainer}>
          {data.slice(-7).map((item, index) => (
            <View key={index} style={styles.barWrapper}>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max((item.value / maxValue) * 100, 5)}%`,
                      backgroundColor: color,
                    }
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{item.label || '-'}</Text>
              <Text style={styles.barValue}>{item.value || 0}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Completion Rate Trend Component
  const CompletionTrend = ({ data, title }) => {
    if (!data || data.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>{title}</Text>
          <View style={styles.emptyChart}>
            <Ionicons name="trending-up-outline" size={32} color={COLORS.textMuted} />
            <Text style={styles.emptyChartText}>Sin datos</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.trendContainer}>
          {data.slice(-7).map((item, index) => {
            const rate = item.rate || item.value || 0;
            return (
              <View key={index} style={styles.trendItem}>
                <View style={styles.trendBarOuter}>
                  <View
                    style={[
                      styles.trendBarInner,
                      {
                        width: `${Math.max(rate, 2)}%`,
                        backgroundColor: rate >= 80 ? COLORS.success : rate >= 50 ? COLORS.warning : COLORS.danger,
                      }
                    ]}
                  />
                </View>
                <Text style={styles.trendLabel}>{item.label || '-'}</Text>
                <Text style={styles.trendValue}>{rate.toFixed(0)}%</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Routes Distribution Component
  const RoutesDistribution = ({ data, title }) => {
    if (!data || data.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>{title}</Text>
          <View style={styles.emptyChart}>
            <Ionicons name="pie-chart-outline" size={32} color={COLORS.textMuted} />
            <Text style={styles.emptyChartText}>Sin datos</Text>
          </View>
        </View>
      );
    }

    const total = data.reduce((sum, item) => sum + (item.count || item.value || 0), 0) || 1;
    const routeColors = [COLORS.teal, COLORS.purple, COLORS.blue, COLORS.pink, COLORS.warning];

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.routesDistribution}>
          {data.slice(0, 5).map((item, index) => {
            const percentage = ((item.count || item.value || 0) / total) * 100;
            return (
              <View key={index} style={styles.routeDistItem}>
                <View style={styles.routeDistHeader}>
                  <View style={[styles.routeDistDot, { backgroundColor: routeColors[index % routeColors.length] }]} />
                  <Text style={styles.routeDistName} numberOfLines={1}>{item.name || item.label || 'Ruta'}</Text>
                  <Text style={styles.routeDistCount}>{item.count || item.value || 0}</Text>
                </View>
                <View style={styles.routeDistBarOuter}>
                  <View
                    style={[
                      styles.routeDistBarInner,
                      {
                        width: `${Math.max(percentage, 2)}%`,
                        backgroundColor: routeColors[index % routeColors.length],
                      }
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Session Item Component
  const SessionItem = ({ session }) => {
    const statusInfo = getStatusInfo(session.status);
    const checkpointsVerified = session.checkpoints_verified || session.verified_count || 0;
    const checkpointsTotal = session.checkpoints_total || session.total_checkpoints || 0;

    return (
      <TouchableOpacity
        style={styles.sessionCard}
        onPress={() => fetchSessionDetail(session.id)}
        activeOpacity={0.7}
      >
        <View style={styles.sessionHeader}>
          <View style={[styles.sessionStatusIcon, { backgroundColor: statusInfo.color + '20' }]}>
            <Ionicons name={statusInfo.icon} size={24} color={statusInfo.color} />
          </View>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionRouteName}>{session.route_name || session.route?.name || 'Ruta'}</Text>
            <Text style={styles.sessionGuardName}>
              <Ionicons name="person-outline" size={12} color={COLORS.textSecondary} />
              {' '}{session.guard_name || session.guard?.name || 'Guardia'}
            </Text>
          </View>
          <View style={styles.sessionRight}>
            <Text style={styles.sessionDate}>{formatDate(session.started_at || session.created_at)}</Text>
            <Text style={styles.sessionTime}>{formatTime(session.started_at || session.created_at)}</Text>
          </View>
        </View>

        <View style={styles.sessionDetails}>
          <View style={styles.sessionDetailItem}>
            <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.sessionDetailText}>{formatDuration(session.duration_minutes || session.duration)}</Text>
          </View>
          <View style={styles.sessionDetailItem}>
            <Ionicons name="flag-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.sessionDetailText}>{checkpointsVerified}/{checkpointsTotal}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
            <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={styles.sessionChevron} />
      </TouchableOpacity>
    );
  };

  // Filter Picker Modal
  const FilterPicker = ({ visible, onClose, title, options = [], selectedValue, onSelect }) => (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <TouchableOpacity style={styles.pickerOverlayBg} onPress={onClose} activeOpacity={1} />
        <View style={styles.pickerContent}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            <TouchableOpacity
              style={[styles.pickerItem, !selectedValue && styles.pickerItemActive]}
              onPress={() => { onSelect(''); onClose(); }}
            >
              <Text style={[styles.pickerItemText, !selectedValue && styles.pickerItemTextActive]}>
                Todos
              </Text>
              {!selectedValue && <Ionicons name="checkmark" size={20} color={COLORS.lime} />}
            </TouchableOpacity>
            {(Array.isArray(options) ? options : []).map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.pickerItem, selectedValue === option.id && styles.pickerItemActive]}
                onPress={() => { onSelect(option.id); onClose(); }}
              >
                <Text style={[styles.pickerItemText, selectedValue === option.id && styles.pickerItemTextActive]}>
                  {option.name}
                </Text>
                {selectedValue === option.id && <Ionicons name="checkmark" size={20} color={COLORS.lime} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Detail Modal
  const DetailModal = () => {
    if (!sessionDetail) return null;

    const statusInfo = getStatusInfo(sessionDetail.status);
    const checkpoints = sessionDetail.checkpoint_logs || sessionDetail.checkpoints || [];
    const photos = sessionDetail.photos || [];
    const gpsTrack = sessionDetail.gps_track || sessionDetail.track_points || [];

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <SafeAreaView style={styles.detailContainer} edges={['top']}>
          {/* Header */}
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.detailBackButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.detailHeaderTitle}>
              <Text style={styles.detailHeaderText}>Detalle del Rondín</Text>
              <Text style={styles.detailHeaderSubtext}>
                {formatDateTime(sessionDetail.started_at || sessionDetail.created_at)}
              </Text>
            </View>
            <View style={{ width: scale(40) }} />
          </View>

          <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent}>
            {/* Session Info Card */}
            <View style={styles.sessionInfoCard}>
              <View style={[styles.sessionStatusBadgeLarge, { backgroundColor: statusInfo.color + '20' }]}>
                <Ionicons name={statusInfo.icon} size={32} color={statusInfo.color} />
              </View>
              <Text style={styles.sessionRouteNameLarge}>
                {sessionDetail.route_name || sessionDetail.route?.name || 'Ruta'}
              </Text>
              <View style={[styles.statusBadgeLarge, { backgroundColor: statusInfo.color + '20' }]}>
                <Text style={[styles.statusBadgeTextLarge, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>
              <Text style={styles.sessionFullDate}>
                {formatFullDateTime(sessionDetail.started_at || sessionDetail.created_at)}
              </Text>
            </View>

            {/* Details Grid */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailGridItem}>
                <Ionicons name="person" size={20} color={COLORS.teal} />
                <Text style={styles.detailGridLabel}>Guardia</Text>
                <Text style={styles.detailGridValue}>
                  {sessionDetail.guard_name || sessionDetail.guard?.name || '-'}
                </Text>
              </View>
              <View style={styles.detailGridItem}>
                <Ionicons name="time" size={20} color={COLORS.purple} />
                <Text style={styles.detailGridLabel}>Duración</Text>
                <Text style={styles.detailGridValue}>
                  {formatDuration(sessionDetail.duration_minutes || sessionDetail.duration)}
                </Text>
              </View>
              <View style={styles.detailGridItem}>
                <Ionicons name="flag" size={20} color={COLORS.blue} />
                <Text style={styles.detailGridLabel}>Puntos</Text>
                <Text style={styles.detailGridValue}>
                  {sessionDetail.checkpoints_verified || 0}/{sessionDetail.checkpoints_total || 0}
                </Text>
              </View>
              <View style={styles.detailGridItem}>
                <Ionicons name="navigate" size={20} color={COLORS.success} />
                <Text style={styles.detailGridLabel}>Distancia</Text>
                <Text style={styles.detailGridValue}>
                  {formatDistance(sessionDetail.distance_meters || sessionDetail.distance)}
                </Text>
              </View>
            </View>

            {/* GPS Track Map Placeholder */}
            {gpsTrack.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="map" size={20} color={COLORS.lime} />
                  <Text style={styles.sectionTitle}>Recorrido GPS</Text>
                </View>
                <View style={styles.mapPlaceholder}>
                  <Ionicons name="map-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.mapPlaceholderText}>
                    {gpsTrack.length} puntos de rastreo registrados
                  </Text>
                  <Text style={styles.mapPlaceholderSubtext}>
                    La visualización del mapa estará disponible próximamente
                  </Text>
                </View>
              </View>
            )}

            {/* Checkpoint Timeline */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Ionicons name="flag" size={20} color={COLORS.teal} />
                <Text style={styles.sectionTitle}>Puntos de Control</Text>
                <View style={styles.checkpointCountBadge}>
                  <Text style={styles.checkpointCountText}>{checkpoints.length}</Text>
                </View>
              </View>

              {checkpoints.length > 0 ? (
                <View style={styles.timelineContainer}>
                  {checkpoints.map((checkpoint, index) => {
                    const isVerified = checkpoint.verified || checkpoint.status === 'verified';
                    const isSkipped = checkpoint.skipped || checkpoint.status === 'skipped';

                    return (
                      <View key={index} style={styles.timelineItem}>
                        <View style={styles.timelineLine}>
                          {index !== checkpoints.length - 1 && <View style={styles.timelineConnector} />}
                          <View style={[
                            styles.timelineDot,
                            {
                              backgroundColor: isVerified
                                ? COLORS.success
                                : isSkipped
                                  ? COLORS.warning
                                  : COLORS.textMuted
                            }
                          ]}>
                            <Ionicons
                              name={isVerified ? 'checkmark' : isSkipped ? 'close' : 'ellipse'}
                              size={12}
                              color={COLORS.background}
                            />
                          </View>
                        </View>
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineName}>
                            {checkpoint.checkpoint_name || checkpoint.name || `Punto ${index + 1}`}
                          </Text>
                          {checkpoint.verified_at && (
                            <Text style={styles.timelineTime}>
                              {formatTime(checkpoint.verified_at)}
                            </Text>
                          )}
                          {checkpoint.notes && (
                            <Text style={styles.timelineNotes}>{checkpoint.notes}</Text>
                          )}
                          {checkpoint.photo_url && (
                            <TouchableOpacity
                              style={styles.timelinePhotoBtn}
                              onPress={() => openPhotoZoom(checkpoint.photo_url, checkpoint.checkpoint_name || 'Punto de Control')}
                            >
                              <Ionicons name="camera" size={14} color={COLORS.teal} />
                              <Text style={styles.timelinePhotoBtnText}>Ver foto</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyCheckpoints}>
                  <Ionicons name="flag-outline" size={32} color={COLORS.textMuted} />
                  <Text style={styles.emptyCheckpointsText}>Sin puntos registrados</Text>
                </View>
              )}
            </View>

            {/* Photos */}
            {photos.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="camera" size={20} color={COLORS.purple} />
                  <Text style={styles.sectionTitle}>Fotos del Rondín</Text>
                  <View style={styles.photoCountBadge}>
                    <Text style={styles.photoCountText}>{photos.length}</Text>
                  </View>
                </View>
                <View style={styles.photosGrid}>
                  {photos.map((photo, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.photoThumbnail}
                      onPress={() => openPhotoZoom(photo.url || photo, photo.label || `Foto ${index + 1}`)}
                    >
                      <Image
                        source={{ uri: photo.url || photo }}
                        style={styles.photoImage}
                        resizeMode="cover"
                      />
                      <View style={styles.photoOverlay}>
                        <Ionicons name="expand" size={16} color={COLORS.textPrimary} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Notes */}
            {sessionDetail.notes && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="document-text" size={20} color={COLORS.warning} />
                  <Text style={styles.sectionTitle}>Notas</Text>
                </View>
                <View style={styles.notesContainer}>
                  <Text style={styles.notesText}>{sessionDetail.notes}</Text>
                </View>
              </View>
            )}

            <View style={{ height: scale(50) }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // Photo Zoom Modal
  const PhotoZoomModal = () => (
    <Modal visible={showZoomModal} animationType="fade" transparent onRequestClose={() => setShowZoomModal(false)}>
      <View style={styles.zoomContainer}>
        <TouchableOpacity style={styles.zoomCloseButton} onPress={() => setShowZoomModal(false)}>
          <Ionicons name="close" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        {zoomPhoto?.title && (
          <View style={styles.zoomTitleContainer}>
            <Text style={styles.zoomTitle}>{zoomPhoto.title}</Text>
          </View>
        )}
        {zoomPhoto?.url && (
          <Image source={{ uri: zoomPhoto.url }} style={styles.zoomImage} resizeMode="contain" />
        )}
        <View style={styles.zoomHintContainer}>
          <Text style={styles.zoomHint}>Pellizca para hacer zoom</Text>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
          <Text style={styles.loadingText}>Cargando reportes de rondines...</Text>
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
          <Text style={styles.headerTitle}>Reportes de Rondines</Text>
          <Text style={styles.headerSubtitle}>Historial y estadísticas</Text>
        </View>
        <TouchableOpacity onPress={handleExport} style={styles.exportButton}>
          <Ionicons name="download-outline" size={22} color={COLORS.lime} />
        </TouchableOpacity>
      </View>

      {/* Location Selector */}
      <LocationHeader />

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
        {/* Filter Section */}
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Filtros</Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Limpiar</Text>
            </TouchableOpacity>
          </View>

          {/* Date Range */}
          <View style={styles.dateRangeContainer}>
            <View style={styles.dateInputWrapper}>
              <Text style={styles.dateLabel}>Desde</Text>
              <View style={styles.dateInput}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.teal} />
                <TextInput
                  style={styles.dateInputText}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>
            <Ionicons name="arrow-forward" size={16} color={COLORS.textMuted} />
            <View style={styles.dateInputWrapper}>
              <Text style={styles.dateLabel}>Hasta</Text>
              <View style={styles.dateInput}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.teal} />
                <TextInput
                  style={styles.dateInputText}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>
          </View>

          {/* Filter Buttons */}
          <View style={styles.filterButtonsRow}>
            <TouchableOpacity
              style={[styles.filterButton, selectedRoute && styles.filterButtonActive]}
              onPress={() => setShowRoutePicker(true)}
            >
              <Ionicons name="map-outline" size={16} color={selectedRoute ? COLORS.background : COLORS.textSecondary} />
              <Text style={[styles.filterButtonText, selectedRoute && styles.filterButtonTextActive]}>
                {selectedRoute ? routes.find(r => r.id === selectedRoute)?.name || 'Ruta' : 'Ruta'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={selectedRoute ? COLORS.background : COLORS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, selectedGuard && styles.filterButtonActive]}
              onPress={() => setShowGuardPicker(true)}
            >
              <Ionicons name="person-outline" size={16} color={selectedGuard ? COLORS.background : COLORS.textSecondary} />
              <Text style={[styles.filterButtonText, selectedGuard && styles.filterButtonTextActive]}>
                {selectedGuard ? guards.find(g => g.id === selectedGuard)?.name || 'Guardia' : 'Guardia'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={selectedGuard ? COLORS.background : COLORS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, selectedStatus && styles.filterButtonActive]}
              onPress={() => setShowStatusPicker(true)}
            >
              <Ionicons name="filter-outline" size={16} color={selectedStatus ? COLORS.background : COLORS.textSecondary} />
              <Text style={[styles.filterButtonText, selectedStatus && styles.filterButtonTextActive]}>
                {selectedStatus ? STATUS_CONFIG[selectedStatus]?.label || 'Estado' : 'Estado'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={selectedStatus ? COLORS.background : COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Stats */}
        <Text style={styles.sectionTitleMain}>Resumen del Período</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="walk"
            label="Total Rondines"
            value={stats?.totalPatrols || stats?.total_patrols || 0}
            color={COLORS.teal}
          />
          <StatCard
            icon="checkmark-done"
            label="Tasa de Cumplimiento"
            value={`${(stats?.completionRate || stats?.completion_rate || 0).toFixed(1)}%`}
            color={COLORS.success}
          />
          <StatCard
            icon="time"
            label="Duración Promedio"
            value={formatDuration(stats?.averageDuration || stats?.average_duration || 0)}
            color={COLORS.purple}
          />
          <StatCard
            icon="navigate"
            label="Distancia Total"
            value={formatDistance(stats?.totalDistance || stats?.total_distance || 0)}
            color={COLORS.blue}
          />
          <StatCard
            icon="flag"
            label="Puntos Verificados"
            value={stats?.totalCheckpointsVerified || stats?.total_checkpoints_verified || 0}
            color={COLORS.warning}
            subtitle="puntos de control"
          />
        </View>

        {/* Charts Section */}
        <Text style={styles.sectionTitleMain}>Estadísticas</Text>

        <SimpleBarChart
          data={stats?.patrolsByDay || stats?.patrols_by_day || []}
          title="Rondines por Día"
          color={COLORS.teal}
        />

        <CompletionTrend
          data={stats?.completionTrend || stats?.completion_trend || []}
          title="Tendencia de Cumplimiento"
        />

        <RoutesDistribution
          data={stats?.patrolsByRoute || stats?.patrols_by_route || []}
          title="Rondines por Ruta"
        />

        {/* Sessions History */}
        <View style={styles.sessionsSection}>
          <View style={styles.sessionsSectionHeader}>
            <Text style={styles.sectionTitleMain}>Historial de Rondines</Text>
            <Text style={styles.sessionsCount}>{sessions.length} sesiones</Text>
          </View>

          {sessions.length > 0 ? (
            sessions.map((session) => (
              <SessionItem key={session.id} session={session} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="walk-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Sin rondines registrados</Text>
              <Text style={styles.emptySubtext}>No hay rondines en el período seleccionado</Text>
            </View>
          )}
        </View>

        <View style={{ height: scale(100) }} />
      </ScrollView>

      {/* Loading Overlay */}
      {loadingDetail && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.lime} />
          <Text style={styles.loadingOverlayText}>Cargando detalle...</Text>
        </View>
      )}

      {/* Modals */}
      <DetailModal />
      <PhotoZoomModal />
      <LocationPickerModal />

      {/* Filter Pickers */}
      <FilterPicker
        visible={showRoutePicker}
        onClose={() => setShowRoutePicker(false)}
        title="Seleccionar Ruta"
        options={routes}
        selectedValue={selectedRoute}
        onSelect={setSelectedRoute}
      />

      <FilterPicker
        visible={showGuardPicker}
        onClose={() => setShowGuardPicker(false)}
        title="Seleccionar Guardia"
        options={guards}
        selectedValue={selectedGuard}
        onSelect={setSelectedGuard}
      />

      <FilterPicker
        visible={showStatusPicker}
        onClose={() => setShowStatusPicker(false)}
        title="Seleccionar Estado"
        options={Object.entries(STATUS_CONFIG).map(([id, config]) => ({ id, name: config.label }))}
        selectedValue={selectedStatus}
        onSelect={setSelectedStatus}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  exportButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.lime + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(16),
  },

  // Filters
  filterSection: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  filterTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  clearFiltersText: {
    fontSize: scale(13),
    color: COLORS.teal,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: scale(12),
  },
  dateInputWrapper: {
    flex: 1,
  },
  dateLabel: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    marginBottom: scale(4),
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: scale(10),
    gap: scale(6),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateInputText: {
    flex: 1,
    fontSize: scale(13),
    color: COLORS.textPrimary,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    gap: scale(8),
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(8),
    paddingVertical: scale(10),
    paddingHorizontal: scale(8),
    gap: scale(4),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  filterButtonText: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
    maxWidth: scale(60),
  },
  filterButtonTextActive: {
    color: COLORS.background,
    fontWeight: '600',
  },

  // Stats Grid
  sectionTitleMain: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(12),
    marginTop: scale(8),
  },
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
    padding: scale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  statValue: {
    fontSize: scale(22),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(4),
  },
  statSubtitle: {
    fontSize: scale(10),
    color: COLORS.textMuted,
    marginTop: scale(2),
  },

  // Charts
  chartContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(16),
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: scale(24),
  },
  emptyChartText: {
    fontSize: scale(13),
    color: COLORS.textMuted,
    marginTop: scale(8),
  },

  // Bar Chart
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: scale(120),
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    maxWidth: scale(40),
  },
  barContainer: {
    width: scale(24),
    height: scale(80),
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(4),
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: scale(4),
    minHeight: scale(4),
  },
  barLabel: {
    fontSize: scale(10),
    color: COLORS.textMuted,
    marginTop: scale(4),
  },
  barValue: {
    fontSize: scale(10),
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  // Trend Chart
  trendContainer: {
    gap: scale(10),
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  trendBarOuter: {
    flex: 1,
    height: scale(8),
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(4),
    overflow: 'hidden',
  },
  trendBarInner: {
    height: '100%',
    borderRadius: scale(4),
    minWidth: scale(4),
  },
  trendLabel: {
    width: scale(40),
    fontSize: scale(11),
    color: COLORS.textMuted,
  },
  trendValue: {
    width: scale(36),
    fontSize: scale(11),
    color: COLORS.textSecondary,
    textAlign: 'right',
    fontWeight: '600',
  },

  // Routes Distribution
  routesDistribution: {
    gap: scale(12),
  },
  routeDistItem: {
    gap: scale(6),
  },
  routeDistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeDistDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    marginRight: scale(8),
  },
  routeDistName: {
    flex: 1,
    fontSize: scale(13),
    color: COLORS.textPrimary,
  },
  routeDistCount: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  routeDistBarOuter: {
    height: scale(6),
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(3),
    overflow: 'hidden',
  },
  routeDistBarInner: {
    height: '100%',
    borderRadius: scale(3),
    minWidth: scale(4),
  },

  // Sessions Section
  sessionsSection: {
    marginTop: scale(8),
  },
  sessionsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  sessionsCount: {
    fontSize: scale(13),
    color: COLORS.textMuted,
  },

  // Session Card
  sessionCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  sessionStatusIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionInfo: {
    flex: 1,
    marginLeft: scale(12),
  },
  sessionRouteName: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sessionGuardName: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  sessionRight: {
    alignItems: 'flex-end',
  },
  sessionDate: {
    fontSize: scale(12),
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  sessionTime: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    marginTop: scale(2),
  },
  sessionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(16),
    paddingTop: scale(10),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sessionDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  sessionDetailText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(6),
    marginLeft: 'auto',
  },
  statusBadgeText: {
    fontSize: scale(11),
    fontWeight: '600',
  },
  sessionChevron: {
    position: 'absolute',
    right: scale(14),
    top: '50%',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: scale(40),
  },
  emptyText: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
    marginTop: scale(12),
  },
  emptySubtext: {
    fontSize: scale(13),
    color: COLORS.textMuted,
    marginTop: scale(4),
  },

  // Picker Modal
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerOverlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  pickerContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    padding: scale(20),
    maxHeight: '60%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  pickerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(14),
    borderRadius: scale(10),
    marginBottom: scale(8),
    backgroundColor: COLORS.backgroundSecondary,
  },
  pickerItemActive: {
    backgroundColor: COLORS.lime + '15',
    borderWidth: 1,
    borderColor: COLORS.lime,
  },
  pickerItemText: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
  },
  pickerItemTextActive: {
    color: COLORS.lime,
    fontWeight: '600',
  },

  // Detail Modal
  detailContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailBackButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailHeaderTitle: {
    flex: 1,
    marginLeft: scale(12),
  },
  detailHeaderText: {
    fontSize: scale(17),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  detailHeaderSubtext: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  detailScroll: {
    flex: 1,
  },
  detailScrollContent: {
    padding: scale(16),
  },

  // Session Info Card
  sessionInfoCard: {
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(16),
    padding: scale(24),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sessionStatusBadgeLarge: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  sessionRouteNameLarge: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
    textAlign: 'center',
  },
  statusBadgeLarge: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(6),
    borderRadius: scale(20),
    marginBottom: scale(8),
  },
  statusBadgeTextLarge: {
    fontSize: scale(13),
    fontWeight: '600',
  },
  sessionFullDate: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Details Grid
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
    marginBottom: scale(16),
  },
  detailGridItem: {
    width: (SCREEN_WIDTH - scale(42)) / 2,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(14),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailGridLabel: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    marginTop: scale(6),
  },
  detailGridValue: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: scale(2),
  },

  // Section Container
  sectionContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(14),
  },
  sectionTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  checkpointCountBadge: {
    backgroundColor: COLORS.teal,
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkpointCountText: {
    fontSize: scale(11),
    fontWeight: '700',
    color: COLORS.background,
  },

  // Map Placeholder
  mapPlaceholder: {
    alignItems: 'center',
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(10),
    padding: scale(24),
  },
  mapPlaceholderText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(10),
  },
  mapPlaceholderSubtext: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginTop: scale(4),
    textAlign: 'center',
  },

  // Timeline
  timelineContainer: {
    paddingLeft: scale(8),
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: scale(60),
  },
  timelineLine: {
    width: scale(24),
    alignItems: 'center',
    position: 'relative',
  },
  timelineConnector: {
    position: 'absolute',
    top: scale(24),
    bottom: 0,
    width: 2,
    backgroundColor: COLORS.border,
  },
  timelineDot: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineContent: {
    flex: 1,
    marginLeft: scale(12),
    paddingBottom: scale(16),
  },
  timelineName: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  timelineTime: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  timelineNotes: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginTop: scale(4),
    fontStyle: 'italic',
  },
  timelinePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: scale(6),
  },
  timelinePhotoBtnText: {
    fontSize: scale(12),
    color: COLORS.teal,
  },
  emptyCheckpoints: {
    alignItems: 'center',
    paddingVertical: scale(20),
  },
  emptyCheckpointsText: {
    fontSize: scale(13),
    color: COLORS.textMuted,
    marginTop: scale(8),
  },

  // Photos Grid
  photoCountBadge: {
    backgroundColor: COLORS.purple,
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCountText: {
    fontSize: scale(11),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  photoThumbnail: {
    width: (SCREEN_WIDTH - scale(66)) / 3,
    aspectRatio: 1,
    borderRadius: scale(8),
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },

  // Notes
  notesContainer: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(8),
    padding: scale(12),
  },
  notesText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    lineHeight: scale(20),
  },

  // Zoom Modal
  zoomContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomCloseButton: {
    position: 'absolute',
    top: scale(50),
    right: scale(20),
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  zoomTitleContainer: {
    position: 'absolute',
    top: scale(50),
    left: scale(20),
    right: scale(80),
    zIndex: 10,
  },
  zoomTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  zoomImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  zoomHintContainer: {
    position: 'absolute',
    bottom: scale(50),
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  zoomHint: {
    fontSize: scale(13),
    color: COLORS.textMuted,
  },

  // Loading Overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 26, 26, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingOverlayText: {
    marginTop: scale(12),
    color: COLORS.textSecondary,
    fontSize: scale(14),
  },
});
