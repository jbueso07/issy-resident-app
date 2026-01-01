// app/admin/access-reports.js
// ISSY - Control de Acceso y Auditoría para Admins (ProHome Dark Theme)
// ACTUALIZADO: Pantalla de detalle con fotos, zoom fullscreen, búsqueda avanzada, EXPORTACIÓN

import React, { useState, useEffect, useCallback } from 'react';
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
  Pressable,
  StatusBar,
  Platform,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/context/AuthContext';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.joinissy.com';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
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
  
  // Detail screen state
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailScreen, setShowDetailScreen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Photo zoom modal
  const [zoomPhoto, setZoomPhoto] = useState(null);
  const [showZoomModal, setShowZoomModal] = useState(false);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportFilters, setExportFilters] = useState({
    includeEntries: true,
    includeExits: true,
    onlyWithPhotos: false,
  });
  const [exportSummary, setExportSummary] = useState(null);
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

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

  // Set default export dates when modal opens
  useEffect(() => {
    if (showExportModal && !exportStartDate) {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setExportStartDate(firstDayOfMonth.toISOString().split('T')[0]);
      setExportEndDate(today.toISOString().split('T')[0]);
    }
  }, [showExportModal]);

  // Fetch summary when dates change
  useEffect(() => {
    if (showExportModal && exportStartDate && exportEndDate) {
      fetchExportSummary();
    }
  }, [exportStartDate, exportEndDate, showExportModal]);

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

  // Fetch access log detail with photos
  const fetchAccessDetail = async (logId) => {
    setLoadingDetail(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/admin/access-logs/${logId}`, { headers });
      const data = await response.json();
      
      if (data.success && data.data) {
        setSelectedLog(data.data);
        setShowDetailScreen(true);
      } else {
        const existingLog = accessLogs.find(l => l.id === logId);
        if (existingLog) {
          setSelectedLog(existingLog);
          setShowDetailScreen(true);
        }
      }
    } catch (error) {
      console.error('Error fetching access detail:', error);
      const existingLog = accessLogs.find(l => l.id === logId);
      if (existingLog) {
        setSelectedLog(existingLog);
        setShowDetailScreen(true);
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  // Fetch export summary
  const fetchExportSummary = async () => {
    if (!exportStartDate || !exportEndDate) return;
    
    setLoadingSummary(true);
    try {
      const headers = await getAuthHeaders();
      const url = `${API_URL}/api/admin/access-logs/export/summary?start_date=${exportStartDate}&end_date=${exportEndDate}`;
      const response = await fetch(url, { headers });
      const data = await response.json();
      
      if (data.success) {
        setExportSummary(data.data);
      }
    } catch (error) {
      console.error('Error fetching export summary:', error);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    if (!exportStartDate || !exportEndDate) {
      Alert.alert('Error', 'Selecciona un rango de fechas');
      return;
    }

    setLoadingExport(true);
    try {
      const headers = await getAuthHeaders();
      
      // Build query params
      let url = `${API_URL}/api/admin/access-logs/export?format=${exportFormat}&start_date=${exportStartDate}&end_date=${exportEndDate}`;
      
      // Add movement type filter
      if (exportFilters.includeEntries && !exportFilters.includeExits) {
        url += '&movement_type=entry';
      } else if (!exportFilters.includeEntries && exportFilters.includeExits) {
        url += '&movement_type=exit';
      }
      
      if (exportFilters.onlyWithPhotos) {
        url += '&has_photo=true';
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al exportar');
      }

      if (exportFormat === 'csv') {
        // Download CSV
        const csvText = await response.text();
        const filename = `accesos_${exportStartDate}_${exportEndDate}.csv`;
        
        // Save to file system
        const fileUri = FileSystem.documentDirectory + filename;
        await FileSystem.writeAsStringAsync(fileUri, csvText, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        // Share the file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Exportar Historial de Accesos',
            UTI: 'public.comma-separated-values-text',
          });
        } else {
          Alert.alert('Éxito', `Archivo guardado en: ${fileUri}`);
        }
      } else {
        // PDF - For now, generate on device or show message
        Alert.alert(
          'PDF', 
          'La exportación a PDF está disponible desde el panel web.\n\nEl archivo CSV incluye todos los datos necesarios y puede abrirse en Excel.',
          [{ text: 'Exportar CSV', onPress: () => setExportFormat('csv') }, { text: 'Cerrar' }]
        );
      }

      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting:', error);
      Alert.alert('Error', error.message || 'No se pudo exportar el archivo');
    } finally {
      setLoadingExport(false);
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

  const formatFullDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-HN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-HN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Filter logs by search
  const filteredLogs = accessLogs.filter(log => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      log.visitor_name?.toLowerCase().includes(search) ||
      log.vehicle_plate?.toLowerCase().includes(search) ||
      log.unit_number?.toLowerCase().includes(search) ||
      log.resident_name?.toLowerCase().includes(search) ||
      log.block?.toLowerCase().includes(search) ||
      log.guard_name?.toLowerCase().includes(search) ||
      log.id_number?.toLowerCase().includes(search)
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

  // Check if log has photos
  const hasPhotos = (log) => {
    return log.photo_url || log.vehicle_photo_url || (log.photos && log.photos.length > 0);
  };

  // Open photo in zoom modal
  const openPhotoZoom = (photoUrl, title) => {
    setZoomPhoto({ url: photoUrl, title });
    setShowZoomModal(true);
  };

  // ============================================
  // EXPORT MODAL COMPONENT
  // ============================================
  const ExportModal = () => (
    <Modal
      visible={showExportModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowExportModal(false)}
    >
      <SafeAreaView style={styles.exportModalContainer} edges={['top']}>
        <View style={styles.exportModalHeader}>
          <TouchableOpacity onPress={() => setShowExportModal(false)}>
            <Text style={styles.exportModalCancel}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.exportModalTitle}>Exportar Historial</Text>
          <View style={{ width: scale(60) }} />
        </View>

        <ScrollView style={styles.exportModalContent} showsVerticalScrollIndicator={false}>
          {/* Date Range */}
          <View style={styles.exportSection}>
            <View style={styles.exportSectionHeader}>
              <Ionicons name="calendar" size={20} color={COLORS.lime} />
              <Text style={styles.exportSectionTitle}>Rango de Fechas</Text>
            </View>
            
            <View style={styles.dateRangeContainer}>
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateInputLabel}>Desde</Text>
                <TouchableOpacity style={styles.dateInput}>
                  <Ionicons name="calendar-outline" size={18} color={COLORS.teal} />
                  <TextInput
                    style={styles.dateInputText}
                    value={exportStartDate}
                    onChangeText={setExportStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
              
              <Ionicons name="arrow-forward" size={20} color={COLORS.textMuted} />
              
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateInputLabel}>Hasta</Text>
                <TouchableOpacity style={styles.dateInput}>
                  <Ionicons name="calendar-outline" size={18} color={COLORS.teal} />
                  <TextInput
                    style={styles.dateInputText}
                    value={exportEndDate}
                    onChangeText={setExportEndDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick date options */}
            <View style={styles.quickDateOptions}>
              <TouchableOpacity 
                style={styles.quickDateBtn}
                onPress={() => {
                  const today = new Date();
                  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                  setExportStartDate(lastWeek.toISOString().split('T')[0]);
                  setExportEndDate(today.toISOString().split('T')[0]);
                }}
              >
                <Text style={styles.quickDateBtnText}>Última semana</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickDateBtn}
                onPress={() => {
                  const today = new Date();
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                  setExportStartDate(firstDay.toISOString().split('T')[0]);
                  setExportEndDate(today.toISOString().split('T')[0]);
                }}
              >
                <Text style={styles.quickDateBtnText}>Este mes</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickDateBtn}
                onPress={() => {
                  const today = new Date();
                  const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                  const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                  setExportStartDate(firstDay.toISOString().split('T')[0]);
                  setExportEndDate(lastDay.toISOString().split('T')[0]);
                }}
              >
                <Text style={styles.quickDateBtnText}>Mes anterior</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Summary */}
          {exportSummary && (
            <View style={styles.exportSummaryCard}>
              {loadingSummary ? (
                <ActivityIndicator size="small" color={COLORS.lime} />
              ) : (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total de registros</Text>
                    <Text style={styles.summaryValue}>{exportSummary.total}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryStats}>
                    <View style={styles.summaryStatItem}>
                      <Ionicons name="enter" size={16} color={COLORS.success} />
                      <Text style={styles.summaryStatValue}>{exportSummary.entries}</Text>
                      <Text style={styles.summaryStatLabel}>Entradas</Text>
                    </View>
                    <View style={styles.summaryStatItem}>
                      <Ionicons name="exit" size={16} color={COLORS.warning} />
                      <Text style={styles.summaryStatValue}>{exportSummary.exits}</Text>
                      <Text style={styles.summaryStatLabel}>Salidas</Text>
                    </View>
                    <View style={styles.summaryStatItem}>
                      <Ionicons name="camera" size={16} color={COLORS.teal} />
                      <Text style={styles.summaryStatValue}>{exportSummary.with_photos}</Text>
                      <Text style={styles.summaryStatLabel}>Con foto</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Format Selection */}
          <View style={styles.exportSection}>
            <View style={styles.exportSectionHeader}>
              <Ionicons name="document" size={20} color={COLORS.teal} />
              <Text style={styles.exportSectionTitle}>Formato</Text>
            </View>
            
            <View style={styles.formatOptions}>
              <TouchableOpacity 
                style={[styles.formatOption, exportFormat === 'csv' && styles.formatOptionActive]}
                onPress={() => setExportFormat('csv')}
              >
                <View style={[styles.formatRadio, exportFormat === 'csv' && styles.formatRadioActive]}>
                  {exportFormat === 'csv' && <View style={styles.formatRadioInner} />}
                </View>
                <View style={styles.formatInfo}>
                  <Text style={[styles.formatTitle, exportFormat === 'csv' && styles.formatTitleActive]}>
                    Excel/CSV
                  </Text>
                  <Text style={styles.formatDescription}>Recomendado para análisis</Text>
                </View>
                <View style={[styles.formatBadge, { backgroundColor: COLORS.success + '20' }]}>
                  <Text style={[styles.formatBadgeText, { color: COLORS.success }]}>Recomendado</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.formatOption, exportFormat === 'pdf' && styles.formatOptionActive]}
                onPress={() => setExportFormat('pdf')}
              >
                <View style={[styles.formatRadio, exportFormat === 'pdf' && styles.formatRadioActive]}>
                  {exportFormat === 'pdf' && <View style={styles.formatRadioInner} />}
                </View>
                <View style={styles.formatInfo}>
                  <Text style={[styles.formatTitle, exportFormat === 'pdf' && styles.formatTitleActive]}>
                    PDF
                  </Text>
                  <Text style={styles.formatDescription}>Con fotos miniatura</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Filters */}
          <View style={styles.exportSection}>
            <View style={styles.exportSectionHeader}>
              <Ionicons name="filter" size={20} color={COLORS.purple} />
              <Text style={styles.exportSectionTitle}>Filtros (Opcional)</Text>
            </View>
            
            <View style={styles.filterOptions}>
              <TouchableOpacity 
                style={styles.filterOption}
                onPress={() => setExportFilters(prev => ({ ...prev, includeEntries: !prev.includeEntries }))}
              >
                <View style={[styles.checkbox, exportFilters.includeEntries && styles.checkboxChecked]}>
                  {exportFilters.includeEntries && <Ionicons name="checkmark" size={14} color={COLORS.background} />}
                </View>
                <Text style={styles.filterOptionText}>Incluir entradas</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.filterOption}
                onPress={() => setExportFilters(prev => ({ ...prev, includeExits: !prev.includeExits }))}
              >
                <View style={[styles.checkbox, exportFilters.includeExits && styles.checkboxChecked]}>
                  {exportFilters.includeExits && <Ionicons name="checkmark" size={14} color={COLORS.background} />}
                </View>
                <Text style={styles.filterOptionText}>Incluir salidas</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.filterOption}
                onPress={() => setExportFilters(prev => ({ ...prev, onlyWithPhotos: !prev.onlyWithPhotos }))}
              >
                <View style={[styles.checkbox, exportFilters.onlyWithPhotos && styles.checkboxChecked]}>
                  {exportFilters.onlyWithPhotos && <Ionicons name="checkmark" size={14} color={COLORS.background} />}
                </View>
                <Text style={styles.filterOptionText}>Solo registros con foto</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Info */}
          <View style={styles.exportInfoBox}>
            <Ionicons name="information-circle" size={20} color={COLORS.teal} />
            <Text style={styles.exportInfoText}>
              El archivo incluirá: fecha, hora, visitante, placa, tipo QR, unidad, residente, guardia, y URLs de fotos.
            </Text>
          </View>

          <View style={{ height: scale(100) }} />
        </ScrollView>

        {/* Export Button */}
        <View style={styles.exportModalFooter}>
          <TouchableOpacity 
            style={[styles.exportButton, loadingExport && styles.exportButtonDisabled]}
            onPress={handleExport}
            disabled={loadingExport}
          >
            {loadingExport ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <>
                <Ionicons name="download" size={20} color={COLORS.background} />
                <Text style={styles.exportButtonText}>Descargar Reporte</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  // ============================================
  // DETAIL SCREEN COMPONENT
  // ============================================
  const DetailScreen = () => {
    if (!selectedLog) return null;

    const log = selectedLog;
    const qrInfo = getQRTypeInfo(log.qr_type || log.qr_code?.qr_type);
    
    // Collect all photos
    const photos = [];
    if (log.photo_url) {
      photos.push({ url: log.photo_url, type: 'visitor', label: 'Foto del Visitante' });
    }
    if (log.vehicle_photo_url) {
      photos.push({ url: log.vehicle_photo_url, type: 'vehicle', label: 'Foto del Vehículo' });
    }
    if (log.id_photo_url) {
      photos.push({ url: log.id_photo_url, type: 'id', label: 'Foto de Identificación' });
    }
    if (log.additional_photos && log.additional_photos.length > 0) {
      log.additional_photos.forEach((photo, idx) => {
        photos.push({ url: photo.url || photo, type: 'additional', label: `Foto Adicional ${idx + 1}` });
      });
    }

    return (
      <Modal
        visible={showDetailScreen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowDetailScreen(false)}
      >
        <SafeAreaView style={styles.detailContainer} edges={['top']}>
          <StatusBar barStyle="light-content" />
          
          {/* Header */}
          <View style={styles.detailHeader}>
            <TouchableOpacity 
              onPress={() => setShowDetailScreen(false)}
              style={styles.detailBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.detailHeaderTitle}>
              <Text style={styles.detailHeaderText}>Detalle de Acceso</Text>
              <Text style={styles.detailHeaderSubtext}>
                {log.movement_type === 'entry' ? 'Entrada' : 'Salida'} • {formatTime(log.timestamp || log.created_at)}
              </Text>
            </View>
            <View style={{ width: scale(40) }} />
          </View>

          <ScrollView 
            style={styles.detailScroll}
            contentContainerStyle={styles.detailScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Visitor Header Card */}
            <View style={styles.visitorHeaderCard}>
              <View style={[
                styles.movementBadge,
                { backgroundColor: log.movement_type === 'entry' ? COLORS.success + '20' : COLORS.warning + '20' }
              ]}>
                <Ionicons 
                  name={log.movement_type === 'entry' ? 'enter' : 'exit'} 
                  size={28} 
                  color={log.movement_type === 'entry' ? COLORS.success : COLORS.warning} 
                />
              </View>
              <Text style={styles.visitorHeaderName}>{log.visitor_name}</Text>
              <View style={styles.qrTypeBadge}>
                <Ionicons name={qrInfo.icon} size={14} color={qrInfo.color} />
                <Text style={[styles.qrTypeText, { color: qrInfo.color }]}>{qrInfo.label}</Text>
              </View>
              <Text style={styles.visitorHeaderDate}>
                {formatFullDateTime(log.timestamp || log.created_at)}
              </Text>
            </View>

            {/* Photos Section */}
            {photos.length > 0 && (
              <View style={styles.photosSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="camera" size={20} color={COLORS.lime} />
                  <Text style={styles.sectionTitle}>Evidencia Fotográfica</Text>
                  <View style={styles.photoCountBadge}>
                    <Text style={styles.photoCountText}>{photos.length}</Text>
                  </View>
                </View>
                
                <View style={styles.photosGrid}>
                  {photos.map((photo, idx) => (
                    <TouchableOpacity 
                      key={idx}
                      style={styles.photoCard}
                      onPress={() => openPhotoZoom(photo.url, photo.label)}
                      activeOpacity={0.8}
                    >
                      <Image 
                        source={{ uri: photo.url }} 
                        style={styles.photoImage}
                        resizeMode="cover"
                      />
                      <View style={styles.photoOverlay}>
                        <Ionicons name="expand" size={20} color={COLORS.textPrimary} />
                      </View>
                      <View style={styles.photoLabelContainer}>
                        <Text style={styles.photoLabel}>{photo.label}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.photoHint}>
                  <Ionicons name="information-circle" size={14} color={COLORS.textMuted} /> Toca una foto para ver en pantalla completa
                </Text>
              </View>
            )}

            {/* No Photos Message */}
            {photos.length === 0 && (
              <View style={styles.noPhotosSection}>
                <Ionicons name="camera-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.noPhotosText}>Sin evidencia fotográfica</Text>
                <Text style={styles.noPhotosSubtext}>
                  No se capturaron fotos en este acceso
                </Text>
              </View>
            )}

            {/* Access Details */}
            <View style={styles.detailsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle" size={20} color={COLORS.teal} />
                <Text style={styles.sectionTitle}>Información del Acceso</Text>
              </View>
              
              <View style={styles.detailsCard}>
                <DetailRow 
                  icon="time" 
                  label="Fecha y Hora" 
                  value={formatFullDateTime(log.timestamp || log.created_at)} 
                />
                <DetailRow 
                  icon="qr-code" 
                  label="Tipo de QR" 
                  value={qrInfo.label}
                  valueColor={qrInfo.color}
                />
                {log.vehicle_plate && (
                  <DetailRow icon="car" label="Placa del Vehículo" value={log.vehicle_plate} />
                )}
                {log.id_number && (
                  <DetailRow icon="id-card" label="Número de Identificación" value={log.id_number} />
                )}
                {log.companions_count > 0 && (
                  <DetailRow icon="people" label="Acompañantes" value={`${log.companions_count} persona(s)`} />
                )}
                {log.notes && (
                  <DetailRow icon="document-text" label="Notas" value={log.notes} />
                )}
              </View>
            </View>

            {/* Resident Info */}
            {(log.unit_number || log.resident_name || log.qr_code?.resident) && (
              <View style={styles.detailsSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="home" size={20} color={COLORS.purple} />
                  <Text style={styles.sectionTitle}>Residente Visitado</Text>
                </View>
                
                <View style={styles.detailsCard}>
                  <DetailRow 
                    icon="person" 
                    label="Nombre" 
                    value={log.resident_name || log.qr_code?.resident?.name || '-'} 
                  />
                  <DetailRow 
                    icon="business" 
                    label="Unidad" 
                    value={log.unit_number || log.qr_code?.resident?.unit_number || '-'} 
                  />
                  {(log.block || log.qr_code?.resident?.block) && (
                    <DetailRow 
                      icon="grid" 
                      label="Bloque" 
                      value={log.block || log.qr_code?.resident?.block} 
                    />
                  )}
                  {log.qr_code?.resident?.phone && (
                    <DetailRow 
                      icon="call" 
                      label="Teléfono" 
                      value={log.qr_code.resident.phone} 
                    />
                  )}
                </View>
              </View>
            )}

            {/* Guard Info */}
            {(log.guard_name || log.guard) && (
              <View style={styles.detailsSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="shield-checkmark" size={20} color={COLORS.blue} />
                  <Text style={styles.sectionTitle}>Registrado por</Text>
                </View>
                
                <View style={styles.detailsCard}>
                  <DetailRow 
                    icon="person" 
                    label="Guardia" 
                    value={log.guard_name || log.guard?.name || '-'} 
                  />
                  {log.guard?.email && (
                    <DetailRow icon="mail" label="Email" value={log.guard.email} />
                  )}
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionsSection}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="flag" size={20} color={COLORS.danger} />
                <Text style={styles.actionButtonText}>Reportar Incidente</Text>
              </TouchableOpacity>
              
              {photos.length > 0 && (
                <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]}>
                  <Ionicons name="download" size={20} color={COLORS.teal} />
                  <Text style={[styles.actionButtonText, { color: COLORS.teal }]}>Descargar Fotos</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ height: scale(40) }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // Detail Row Component
  const DetailRow = ({ icon, label, value, valueColor }) => (
    <View style={styles.detailRow}>
      <View style={styles.detailRowLeft}>
        <Ionicons name={icon} size={18} color={COLORS.textMuted} />
        <Text style={styles.detailRowLabel}>{label}</Text>
      </View>
      <Text style={[styles.detailRowValue, valueColor && { color: valueColor }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );

  // ============================================
  // PHOTO ZOOM MODAL
  // ============================================
  const PhotoZoomModal = () => (
    <Modal
      visible={showZoomModal}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={() => setShowZoomModal(false)}
    >
      <View style={styles.zoomContainer}>
        <StatusBar barStyle="light-content" />
        
        <TouchableOpacity 
          style={styles.zoomCloseButton}
          onPress={() => setShowZoomModal(false)}
        >
          <Ionicons name="close" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        
        {zoomPhoto?.title && (
          <View style={styles.zoomTitleContainer}>
            <Text style={styles.zoomTitle}>{zoomPhoto.title}</Text>
          </View>
        )}
        
        {zoomPhoto?.url && (
          <Image 
            source={{ uri: zoomPhoto.url }}
            style={styles.zoomImage}
            resizeMode="contain"
          />
        )}
        
        <View style={styles.zoomHintContainer}>
          <Text style={styles.zoomHint}>Pellizca para hacer zoom</Text>
        </View>
      </View>
    </Modal>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
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

                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="time" size={20} color={COLORS.lime} />
                    <Text style={styles.sectionTitle}>Accesos Recientes</Text>
                  </View>
                  
                  {dashboardData?.recent_access?.length > 0 ? (
                    dashboardData.recent_access.map((access, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        style={styles.recentAccessItem}
                        onPress={() => fetchAccessDetail(access.id)}
                        activeOpacity={0.7}
                      >
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
                          <View style={styles.accessNameRow}>
                            <Text style={styles.accessName}>{access.visitor_name}</Text>
                            {hasPhotos(access) && (
                              <View style={styles.hasPhotoIndicator}>
                                <Ionicons name="camera" size={12} color={COLORS.teal} />
                              </View>
                            )}
                          </View>
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
                        <View style={styles.accessRight}>
                          <Text style={styles.accessTime}>{formatTime(access.timestamp)}</Text>
                          {access.guard_name && (
                            <Text style={styles.accessGuard}>{access.guard_name}</Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                      </TouchableOpacity>
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
                {/* Export Button */}
                <TouchableOpacity 
                  style={styles.exportHeaderButton}
                  onPress={() => setShowExportModal(true)}
                >
                  <Ionicons name="download-outline" size={18} color={COLORS.lime} />
                  <Text style={styles.exportHeaderButtonText}>Exportar</Text>
                </TouchableOpacity>

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
                    placeholder="Buscar visitante, placa, casa, bloque..."
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
                      onPress={() => fetchAccessDetail(log.id)}
                      activeOpacity={0.7}
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
                        <View style={styles.historyNameRow}>
                          <Text style={styles.historyName}>{log.visitor_name}</Text>
                          {hasPhotos(log) && (
                            <View style={styles.hasPhotoIndicator}>
                              <Ionicons name="camera" size={12} color={COLORS.teal} />
                            </View>
                          )}
                        </View>
                        <View style={styles.historyMeta}>
                          {log.vehicle_plate && (
                            <View style={styles.historyMetaItem}>
                              <Ionicons name="car" size={12} color={COLORS.textMuted} />
                              <Text style={styles.historyMetaText}>{log.vehicle_plate}</Text>
                            </View>
                          )}
                          {log.unit_number && (
                            <View style={styles.historyMetaItem}>
                              <Ionicons name="home" size={12} color={COLORS.textMuted} />
                              <Text style={styles.historyMetaText}>{log.unit_number}</Text>
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
                      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
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
                <View style={styles.insideCounter}>
                  <Ionicons name="people" size={32} color={COLORS.textPrimary} />
                  <Text style={styles.insideCounterLabel}>Visitantes Adentro</Text>
                  <Text style={styles.insideCounterValue}>{visitorsInside.length}</Text>
                </View>

                {visitorsInside.length > 0 ? (
                  visitorsInside.map((visitor, idx) => {
                    const entryTime = new Date(visitor.entry_time);
                    const now = new Date();
                    const hoursInside = Math.floor((now - entryTime) / (1000 * 60 * 60));
                    const isLongStay = hoursInside >= 4;

                    return (
                      <TouchableOpacity 
                        key={idx} 
                        style={[styles.visitorCard, isLongStay && styles.visitorCardAlert]}
                        onPress={() => fetchAccessDetail(visitor.access_log_id || visitor.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.visitorHeader}>
                          <View>
                            <View style={styles.visitorNameRow}>
                              <Text style={styles.visitorName}>{visitor.visitor_name}</Text>
                              {hasPhotos(visitor) && (
                                <View style={styles.hasPhotoIndicator}>
                                  <Ionicons name="camera" size={12} color={COLORS.teal} />
                                </View>
                              )}
                            </View>
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
                      </TouchableOpacity>
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
                              <TouchableOpacity
                                key={pIdx}
                                onPress={() => openPhotoZoom(photo, `Foto de Incidente ${pIdx + 1}`)}
                              >
                                <Image 
                                  source={{ uri: photo }} 
                                  style={styles.incidentPhoto} 
                                />
                              </TouchableOpacity>
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

      {/* Loading Detail Overlay */}
      {loadingDetail && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.lime} />
          <Text style={styles.loadingOverlayText}>Cargando detalle...</Text>
        </View>
      )}

      {/* Detail Screen */}
      <DetailScreen />

      {/* Photo Zoom Modal */}
      <PhotoZoomModal />

      {/* Export Modal */}
      <ExportModal />
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

  // Export Header Button
  exportHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: COLORS.lime + '15',
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(8),
    marginBottom: scale(12),
    gap: scale(6),
  },
  exportHeaderButtonText: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.lime,
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
    flex: 1,
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // Recent Access Item
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
  accessNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
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
  accessRight: {
    alignItems: 'flex-end',
    marginRight: scale(8),
  },
  accessTime: {
    fontSize: scale(13),
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  accessGuard: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    marginTop: scale(2),
  },

  // Has Photo Indicator
  hasPhotoIndicator: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: COLORS.teal + '20',
    justifyContent: 'center',
    alignItems: 'center',
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
  historyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  historyName: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  historyMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    marginRight: scale(8),
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
  visitorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
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

  // ============================================
  // DETAIL SCREEN STYLES
  // ============================================
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
    fontSize: scale(18),
    fontWeight: '700',
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

  // Visitor Header Card
  visitorHeaderCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(16),
    padding: scale(24),
    alignItems: 'center',
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  movementBadge: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  visitorHeaderName: {
    fontSize: scale(22),
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  qrTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(8),
    gap: scale(6),
  },
  qrTypeText: {
    fontSize: scale(14),
    fontWeight: '500',
  },
  visitorHeaderDate: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(8),
    textAlign: 'center',
  },

  // Photos Section
  photosSection: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photoCountBadge: {
    backgroundColor: COLORS.lime,
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(10),
  },
  photoCountText: {
    fontSize: scale(12),
    fontWeight: '700',
    color: COLORS.background,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
  },
  photoCard: {
    width: (SCREEN_WIDTH - scale(58)) / 2,
    height: scale(140),
    borderRadius: scale(12),
    overflow: 'hidden',
    backgroundColor: COLORS.backgroundTertiary,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoLabelContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: scale(8),
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  photoLabel: {
    fontSize: scale(11),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  photoHint: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginTop: scale(12),
    textAlign: 'center',
  },

  // No Photos Section
  noPhotosSection: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(32),
    marginBottom: scale(16),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noPhotosText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: scale(12),
  },
  noPhotosSubtext: {
    fontSize: scale(13),
    color: COLORS.textMuted,
    marginTop: scale(4),
    textAlign: 'center',
  },

  // Details Section
  detailsSection: {
    marginBottom: scale(16),
  },
  detailsCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    flex: 1,
  },
  detailRowLabel: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  detailRowValue: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: scale(12),
  },

  // Actions Section
  actionsSection: {
    gap: scale(10),
    marginTop: scale(8),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger + '15',
    padding: scale(14),
    borderRadius: scale(12),
    gap: scale(8),
  },
  actionButtonSecondary: {
    backgroundColor: COLORS.teal + '15',
  },
  actionButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.danger,
  },

  // ============================================
  // ZOOM MODAL STYLES
  // ============================================
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

  // ============================================
  // EXPORT MODAL STYLES
  // ============================================
  exportModalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  exportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  exportModalCancel: {
    fontSize: scale(16),
    color: COLORS.textSecondary,
  },
  exportModalTitle: {
    fontSize: scale(17),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  exportModalContent: {
    flex: 1,
    padding: scale(16),
  },
  exportSection: {
    marginBottom: scale(20),
  },
  exportSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(12),
  },
  exportSectionTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  dateInputContainer: {
    flex: 1,
  },
  dateInputLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginBottom: scale(6),
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(8),
  },
  dateInputText: {
    flex: 1,
    fontSize: scale(14),
    color: COLORS.textPrimary,
  },
  quickDateOptions: {
    flexDirection: 'row',
    gap: scale(8),
    marginTop: scale(12),
  },
  quickDateBtn: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(8),
  },
  quickDateBtnText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  exportSummaryCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(20),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: scale(12),
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStatItem: {
    alignItems: 'center',
    gap: scale(4),
  },
  summaryStatValue: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  summaryStatLabel: {
    fontSize: scale(11),
    color: COLORS.textMuted,
  },
  formatOptions: {
    gap: scale(10),
  },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(12),
  },
  formatOptionActive: {
    borderColor: COLORS.lime,
  },
  formatRadio: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatRadioActive: {
    borderColor: COLORS.lime,
  },
  formatRadioInner: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: COLORS.lime,
  },
  formatInfo: {
    flex: 1,
  },
  formatTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  formatTitleActive: {
    color: COLORS.lime,
  },
  formatDescription: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginTop: scale(2),
  },
  formatBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
  },
  formatBadgeText: {
    fontSize: scale(10),
    fontWeight: '600',
  },
  filterOptions: {
    gap: scale(12),
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  checkbox: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(6),
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  filterOptionText: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
  },
  exportInfoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.teal + '10',
    borderRadius: scale(10),
    padding: scale(14),
    gap: scale(10),
  },
  exportInfoText: {
    flex: 1,
    fontSize: scale(13),
    color: COLORS.teal,
    lineHeight: scale(18),
  },
  exportModalFooter: {
    padding: scale(16),
    paddingBottom: scale(32),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    paddingVertical: scale(16),
    borderRadius: scale(12),
    gap: scale(8),
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.background,
  },
});