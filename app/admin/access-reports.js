// app/admin/access-reports.js
// ISSY - Control de Acceso y Auditoría para Admins (ProHome Dark Theme) + i18n

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl,
  ActivityIndicator, Alert, Modal, Image, TextInput, Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/context/AuthContext';
import { useAdminLocation } from '../../src/context/AdminLocationContext';
import { LocationHeader, LocationPickerModal } from '../../src/components/AdminLocationPicker';
import { useTranslation } from '../../src/hooks/useTranslation';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

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

export default function AccessReportsScreen() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { selectedLocationId, loading: locationLoading } = useAdminLocation();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [accessLogs, setAccessLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [visitorsInside, setVisitorsInside] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [movementFilter, setMovementFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailScreen, setShowDetailScreen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [zoomPhoto, setZoomPhoto] = useState(null);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportFilters, setExportFilters] = useState({ includeEntries: true, includeExits: true, onlyWithPhotos: false });
  const [exportSummary, setExportSummary] = useState(null);
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const userRole = profile?.role || user?.role || 'user';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);

  const getLocale = () => {
    const locales = { es: 'es-HN', en: 'en-US', fr: 'fr-FR', pt: 'pt-BR' };
    return locales[language] || 'es-HN';
  };

  const tabs = [
    { id: 'dashboard', icon: 'stats-chart', title: t('admin.accessReports.tabs.dashboard') },
    { id: 'history', icon: 'list', title: t('admin.accessReports.tabs.history') },
    { id: 'inside', icon: 'people', title: t('admin.accessReports.tabs.inside') },
    { id: 'incidents', icon: 'alert-circle', title: t('admin.accessReports.tabs.incidents') },
  ];

  const getQRTypeInfo = (qrType) => {
    switch(qrType) {
      case 'single': return { icon: 'ticket', label: t('admin.accessReports.qrTypes.single'), color: COLORS.purple };
      case 'temporary': return { icon: 'calendar', label: t('admin.accessReports.qrTypes.temporary'), color: COLORS.warning };
      case 'permanent': return { icon: 'infinite', label: t('admin.accessReports.qrTypes.permanent'), color: COLORS.success };
      default: return { icon: 'qr-code', label: 'QR', color: COLORS.textSecondary };
    }
  };

  const getSeverityInfo = (severity) => {
    switch(severity) {
      case 'high': return { label: t('admin.accessReports.severity.high'), color: COLORS.danger };
      case 'medium': return { label: t('admin.accessReports.severity.medium'), color: COLORS.warning };
      case 'low': return { label: t('admin.accessReports.severity.low'), color: COLORS.success };
      default: return { label: severity, color: COLORS.textSecondary };
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert(t('admin.accessReports.accessDenied'), t('admin.accessReports.adminOnly'));
      router.back();
      return;
    }
    fetchData();
  }, [activeTab, selectedDate, movementFilter, selectedLocationId]);

  useEffect(() => {
    if (showExportModal && !exportStartDate) {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setExportStartDate(firstDayOfMonth.toISOString().split('T')[0]);
      setExportEndDate(today.toISOString().split('T')[0]);
    }
  }, [showExportModal]);

  useEffect(() => {
    if (showExportModal && exportStartDate && exportEndDate) {
      fetchExportSummary();
    }
  }, [exportStartDate, exportEndDate, showExportModal]);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'dashboard': await fetchDashboard(); break;
        case 'history': await fetchHistory(); break;
        case 'inside': await fetchVisitorsInside(); break;
        case 'incidents': await fetchIncidents(); break;
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
      const response = await fetch(`${API_URL}/api/guard/access/dashboard?location_id=${selectedLocationId}`, { headers });
      const data = await response.json();
      setDashboardData(data.data || data);
    } catch (error) { console.error('Error fetching dashboard:', error); }
  };

  const fetchHistory = async () => {
    try {
      const headers = await getAuthHeaders();
      let url = `${API_URL}/api/guard/access/history?location_id=${selectedLocationId}&date=${selectedDate}&page=${pagination.page}&limit=${pagination.limit}`;
      if (movementFilter) url += `&movement_type=${movementFilter}`;
      const response = await fetch(url, { headers });
      const data = await response.json();
      const result = data.data || data;
      setAccessLogs(result.logs || []);
      setPagination(prev => ({ ...prev, total: result.pagination?.total || 0 }));
    } catch (error) { console.error('Error fetching history:', error); }
  };

  const fetchVisitorsInside = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/guard/access/inside?location_id=${selectedLocationId}`, { headers });
      const data = await response.json();
      setVisitorsInside((data.data || data).visitors || []);
    } catch (error) { console.error('Error fetching visitors inside:', error); }
  };

  const fetchIncidents = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/guard/incidents?location_id=${selectedLocationId}`, { headers });
      const data = await response.json();
      setIncidents(Array.isArray(data.data || data) ? (data.data || data) : []);
    } catch (error) { console.error('Error fetching incidents:', error); }
  };

  const fetchAccessDetail = async (logId) => {
    console.log('=== fetchAccessDetail called with logId:', logId); // DEBUG
    
    if (!logId) {
      console.log('No logId provided!');
      return;
    }
    
    setLoadingDetail(true);
    try {
      const headers = await getAuthHeaders();
      const url = `${API_URL}/api/admin/access-logs/${logId}`;
      console.log('Fetching URL:', url); // DEBUG
      
      const response = await fetch(url, { headers });
      const data = await response.json();
      console.log('=== ACCESS LOG DATA ===', JSON.stringify(data, null, 2));
      console.log('Response:', data); // DEBUG
      
      if (data.success && data.data) {
        setSelectedLog(data.data);
        setShowDetailScreen(true);
      } else {
        // Fallback: usar el log existente
        console.log('Using fallback from existing logs'); // DEBUG
        const existingLog = accessLogs.find(l => l.id === logId);
        if (existingLog) { 
          setSelectedLog(existingLog); 
          setShowDetailScreen(true); 
        }
      }
    } catch (error) {
      console.error('Error fetching access detail:', error);
      // Fallback en caso de error
      const existingLog = accessLogs.find(l => l.id === logId);
      if (existingLog) { 
        setSelectedLog(existingLog); 
        setShowDetailScreen(true); 
      }
    } finally { 
      setLoadingDetail(false); 
    }
  };

  const fetchExportSummary = async () => {
    if (!exportStartDate || !exportEndDate) return;
    setLoadingSummary(true);
    try {
      const headers = await getAuthHeaders();
      const url = `${API_URL}/api/admin/access-logs/export/summary?start_date=${exportStartDate}&end_date=${exportEndDate}`;
      const response = await fetch(url, { headers });
      const data = await response.json();
      if (data.success) setExportSummary(data.data);
    } catch (error) { console.error('Error fetching export summary:', error); }
    finally { setLoadingSummary(false); }
  };

  const handleExport = async () => {
    if (!exportStartDate || !exportEndDate) {
      Alert.alert(t('common.error'), t('admin.accessReports.export.selectDateRange'));
      return;
    }
    setLoadingExport(true);
    try {
      const headers = await getAuthHeaders();
      let url = `${API_URL}/api/admin/access-logs/export?format=${exportFormat}&start_date=${exportStartDate}&end_date=${exportEndDate}`;
      if (exportFilters.includeEntries && !exportFilters.includeExits) url += '&movement_type=entry';
      else if (!exportFilters.includeEntries && exportFilters.includeExits) url += '&movement_type=exit';
      if (exportFilters.onlyWithPhotos) url += '&has_photo=true';

      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(t('admin.accessReports.export.exportError'));

      if (exportFormat === 'csv') {
        const csvText = await response.text();
        const filename = `accesos_${exportStartDate}_${exportEndDate}.csv`;
        const fileUri = FileSystem.documentDirectory + filename;
        await FileSystem.writeAsStringAsync(fileUri, csvText, { encoding: FileSystem.EncodingType.UTF8 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: t('admin.accessReports.export.title'), UTI: 'public.comma-separated-values-text' });
        } else {
          Alert.alert(t('common.success'), `${t('admin.accessReports.export.fileSaved')}: ${fileUri}`);
        }
      } else {
        Alert.alert('PDF', t('admin.accessReports.export.pdfNotAvailable'), [
          { text: t('admin.accessReports.export.exportCsv'), onPress: () => setExportFormat('csv') },
          { text: t('common.close') }
        ]);
      }
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting:', error);
      Alert.alert(t('common.error'), error.message || t('admin.accessReports.export.exportFailed'));
    } finally { setLoadingExport(false); }
  };

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString(getLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const formatFullDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString(getLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const filteredLogs = accessLogs.filter(log => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (log.visitor_name?.toLowerCase().includes(search) || log.vehicle_plate?.toLowerCase().includes(search) || log.unit_number?.toLowerCase().includes(search) || log.resident_name?.toLowerCase().includes(search) || log.guard_name?.toLowerCase().includes(search));
  });

  const hasPhotos = (log) => log.photo_url || log.vehicle_photo_url || (log.photos && log.photos.length > 0);
  const openPhotoZoom = (photoUrl, title) => { console.log("[PhotoZoom] URL:", photoUrl); setZoomPhoto({ url: photoUrl, title }); setShowZoomModal(true); };

  // Stat Card Component
  const StatCard = ({ icon, label, value, color, highlight }) => (
    <View style={[styles.statCard, highlight && { borderWidth: 2, borderColor: color }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  // Detail Row Component
  const DetailRow = ({ icon, label, value, valueColor }) => (
    <View style={styles.detailRow}>
      <View style={styles.detailRowLeft}>
        <Ionicons name={icon} size={16} color={COLORS.textMuted} />
        <Text style={styles.detailRowLabel}>{label}</Text>
      </View>
      <Text style={[styles.detailRowValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );

  // Export Modal
  const ExportModal = () => (
    <Modal visible={showExportModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowExportModal(false)}>
      <SafeAreaView style={styles.exportModalContainer} edges={['top']}>
        <View style={styles.exportModalHeader}>
          <TouchableOpacity onPress={() => setShowExportModal(false)}>
            <Text style={styles.exportModalCancel}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.exportModalTitle}>{t('admin.accessReports.export.title')}</Text>
          <View style={{ width: scale(60) }} />
        </View>
        <ScrollView style={styles.exportModalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.exportSection}>
            <View style={styles.exportSectionHeader}>
              <Ionicons name="calendar" size={20} color={COLORS.lime} />
              <Text style={styles.exportSectionTitle}>{t('admin.accessReports.export.dateRange')}</Text>
            </View>
            <View style={styles.dateRangeContainer}>
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateInputLabel}>{t('admin.accessReports.export.from')}</Text>
                <View style={styles.dateInput}>
                  <Ionicons name="calendar-outline" size={18} color={COLORS.teal} />
                  <TextInput style={styles.dateInputText} value={exportStartDate} onChangeText={setExportStartDate} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} />
                </View>
              </View>
              <Ionicons name="arrow-forward" size={20} color={COLORS.textMuted} />
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateInputLabel}>{t('admin.accessReports.export.to')}</Text>
                <View style={styles.dateInput}>
                  <Ionicons name="calendar-outline" size={18} color={COLORS.teal} />
                  <TextInput style={styles.dateInputText} value={exportEndDate} onChangeText={setExportEndDate} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} />
                </View>
              </View>
            </View>
            <View style={styles.quickDateOptions}>
              <TouchableOpacity style={styles.quickDateBtn} onPress={() => { const today = new Date(); const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); setExportStartDate(lastWeek.toISOString().split('T')[0]); setExportEndDate(today.toISOString().split('T')[0]); }}>
                <Text style={styles.quickDateBtnText}>{t('admin.accessReports.export.lastWeek')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickDateBtn} onPress={() => { const today = new Date(); const firstDay = new Date(today.getFullYear(), today.getMonth(), 1); setExportStartDate(firstDay.toISOString().split('T')[0]); setExportEndDate(today.toISOString().split('T')[0]); }}>
                <Text style={styles.quickDateBtnText}>{t('admin.accessReports.export.thisMonth')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickDateBtn} onPress={() => { const today = new Date(); const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1); const lastDay = new Date(today.getFullYear(), today.getMonth(), 0); setExportStartDate(firstDay.toISOString().split('T')[0]); setExportEndDate(lastDay.toISOString().split('T')[0]); }}>
                <Text style={styles.quickDateBtnText}>{t('admin.accessReports.export.lastMonth')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {exportSummary && (
            <View style={styles.exportSummaryCard}>
              {loadingSummary ? <ActivityIndicator size="small" color={COLORS.lime} /> : (
                <>
                  <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{t('admin.accessReports.export.totalRecords')}</Text><Text style={styles.summaryValue}>{exportSummary.total}</Text></View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryStats}>
                    <View style={styles.summaryStatItem}><Ionicons name="enter" size={16} color={COLORS.success} /><Text style={styles.summaryStatValue}>{exportSummary.entries}</Text><Text style={styles.summaryStatLabel}>{t('admin.accessReports.entries')}</Text></View>
                    <View style={styles.summaryStatItem}><Ionicons name="exit" size={16} color={COLORS.warning} /><Text style={styles.summaryStatValue}>{exportSummary.exits}</Text><Text style={styles.summaryStatLabel}>{t('admin.accessReports.exits')}</Text></View>
                    <View style={styles.summaryStatItem}><Ionicons name="camera" size={16} color={COLORS.teal} /><Text style={styles.summaryStatValue}>{exportSummary.with_photos}</Text><Text style={styles.summaryStatLabel}>{t('admin.accessReports.withPhoto')}</Text></View>
                  </View>
                </>
              )}
            </View>
          )}
          <View style={styles.exportSection}>
            <View style={styles.exportSectionHeader}><Ionicons name="document" size={20} color={COLORS.teal} /><Text style={styles.exportSectionTitle}>{t('admin.accessReports.export.format')}</Text></View>
            <View style={styles.formatOptions}>
              <TouchableOpacity style={[styles.formatOption, exportFormat === 'csv' && styles.formatOptionActive]} onPress={() => setExportFormat('csv')}>
                <View style={[styles.formatRadio, exportFormat === 'csv' && styles.formatRadioActive]}>{exportFormat === 'csv' && <View style={styles.formatRadioInner} />}</View>
                <View style={styles.formatInfo}><Text style={[styles.formatTitle, exportFormat === 'csv' && styles.formatTitleActive]}>Excel/CSV</Text><Text style={styles.formatDescription}>{t('admin.accessReports.export.csvDesc')}</Text></View>
                <View style={[styles.formatBadge, { backgroundColor: COLORS.success + '20' }]}><Text style={[styles.formatBadgeText, { color: COLORS.success }]}>{t('admin.accessReports.export.recommended')}</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formatOption, exportFormat === 'pdf' && styles.formatOptionActive]} onPress={() => setExportFormat('pdf')}>
                <View style={[styles.formatRadio, exportFormat === 'pdf' && styles.formatRadioActive]}>{exportFormat === 'pdf' && <View style={styles.formatRadioInner} />}</View>
                <View style={styles.formatInfo}><Text style={[styles.formatTitle, exportFormat === 'pdf' && styles.formatTitleActive]}>PDF</Text><Text style={styles.formatDescription}>{t('admin.accessReports.export.pdfDesc')}</Text></View>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.exportSection}>
            <View style={styles.exportSectionHeader}><Ionicons name="filter" size={20} color={COLORS.purple} /><Text style={styles.exportSectionTitle}>{t('admin.accessReports.export.filters')}</Text></View>
            <View style={styles.filterOptions}>
              <TouchableOpacity style={styles.filterOption} onPress={() => setExportFilters(prev => ({ ...prev, includeEntries: !prev.includeEntries }))}>
                <View style={[styles.checkbox, exportFilters.includeEntries && styles.checkboxChecked]}>{exportFilters.includeEntries && <Ionicons name="checkmark" size={14} color={COLORS.background} />}</View>
                <Text style={styles.filterOptionText}>{t('admin.accessReports.export.includeEntries')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterOption} onPress={() => setExportFilters(prev => ({ ...prev, includeExits: !prev.includeExits }))}>
                <View style={[styles.checkbox, exportFilters.includeExits && styles.checkboxChecked]}>{exportFilters.includeExits && <Ionicons name="checkmark" size={14} color={COLORS.background} />}</View>
                <Text style={styles.filterOptionText}>{t('admin.accessReports.export.includeExits')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterOption} onPress={() => setExportFilters(prev => ({ ...prev, onlyWithPhotos: !prev.onlyWithPhotos }))}>
                <View style={[styles.checkbox, exportFilters.onlyWithPhotos && styles.checkboxChecked]}>{exportFilters.onlyWithPhotos && <Ionicons name="checkmark" size={14} color={COLORS.background} />}</View>
                <Text style={styles.filterOptionText}>{t('admin.accessReports.export.onlyWithPhotos')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.exportInfoBox}><Ionicons name="information-circle" size={20} color={COLORS.teal} /><Text style={styles.exportInfoText}>{t('admin.accessReports.export.fileInfo')}</Text></View>
          <View style={{ height: scale(100) }} />
        </ScrollView>
        <View style={styles.exportModalFooter}>
          <TouchableOpacity style={[styles.exportButton, loadingExport && styles.exportButtonDisabled]} onPress={handleExport} disabled={loadingExport}>
            {loadingExport ? <ActivityIndicator color={COLORS.background} /> : (<><Ionicons name="download" size={20} color={COLORS.background} /><Text style={styles.exportButtonText}>{t('admin.accessReports.export.download')}</Text></>)}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  // Detail Screen
  const DetailScreen = () => {
    if (!selectedLog) return null;
    const log = selectedLog; console.log("LOG DATA:", JSON.stringify(log, null, 2));
    const qrInfo = getQRTypeInfo(log.qr_type || log.qr_code?.qr_type);
    const photos = [];
    if (log.photo_url) photos.push({ url: log.photo_url, type: 'visitor', label: t('admin.accessReports.detail.visitorPhoto') });
    if (log.vehicle_photo_url) photos.push({ url: log.vehicle_photo_url, type: 'vehicle', label: t('admin.accessReports.detail.vehiclePhoto') });
    if (log.id_photo_url) photos.push({ url: log.id_photo_url, type: 'id', label: t('admin.accessReports.detail.idPhoto') });

    return (
      <Modal visible={showDetailScreen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowDetailScreen(false)}>
        <SafeAreaView style={styles.detailContainer} edges={['top']}>
          <StatusBar barStyle="light-content" />
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setShowDetailScreen(false)} style={styles.detailBackButton}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
            <View style={styles.detailHeaderTitle}>
              <Text style={styles.detailHeaderText}>{t('admin.accessReports.detail.title')}</Text>
              <Text style={styles.detailHeaderSubtext}>{log.movement_type === 'entry' ? t('admin.accessReports.entry') : t('admin.accessReports.exit')} • {formatTime(log.timestamp || log.created_at)}</Text>
            </View>
            <View style={{ width: scale(40) }} />
          </View>
          <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.visitorHeaderCard}>
              <View style={[styles.movementBadge, { backgroundColor: log.movement_type === 'entry' ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                <Ionicons name={log.movement_type === 'entry' ? 'enter' : 'exit'} size={28} color={log.movement_type === 'entry' ? COLORS.success : COLORS.warning} />
              </View>
              <Text style={styles.visitorHeaderName}>{log.visitor_name}</Text>
              <View style={styles.qrTypeBadge}><Ionicons name={qrInfo.icon} size={14} color={qrInfo.color} /><Text style={[styles.qrTypeText, { color: qrInfo.color }]}>{qrInfo.label}</Text></View>
              <Text style={styles.visitorHeaderDate}>{formatFullDateTime(log.timestamp || log.created_at)}</Text>
              {(log.qr_code?.resident?.name || log.qr_code?.resident?.unit_number) && (
                <View style={styles.infoRow}><Ionicons name="person" size={14} color={COLORS.teal} /><Text style={styles.infoRowText}>Autorizado por: {log.qr_code?.resident?.name || log.resident_name}{(log.qr_code?.resident?.unit_number || log.unit_number) ? ` - ${log.qr_code?.resident?.unit_number || log.unit_number}` : ''}</Text></View>
              )}
              {(log.guard?.name || log.guard_name) && (
                <View style={styles.infoRow}><Ionicons name="shield" size={14} color={COLORS.lime} /><Text style={styles.infoRowText}>Escaneado por: {log.guard?.name || log.guard_name}</Text></View>
              )}
              <View style={[styles.statusBadge, { backgroundColor: log.movement_type === 'entry' ? COLORS.success + '30' : COLORS.textMuted + '30' }]}>
                <Text style={[styles.statusText, { color: log.movement_type === 'entry' ? COLORS.success : COLORS.textMuted }]}>{log.movement_type === 'entry' ? '✓ Dentro' : 'Salió'}</Text>
              </View>
            </View>
            {photos.length > 0 && (
              <View style={styles.photosSection}>
                <View style={styles.sectionHeader}><Ionicons name="camera" size={20} color={COLORS.lime} /><Text style={styles.sectionTitle}>{t('admin.accessReports.detail.photoEvidence')}</Text><View style={styles.photoCountBadge}><Text style={styles.photoCountText}>{photos.length}</Text></View></View>
                <View style={styles.photosGrid}>
                  {photos.map((photo, idx) => (
                    <TouchableOpacity key={idx} style={styles.photoCard} onPress={() => openPhotoZoom(photo.url, photo.label)} activeOpacity={0.8}>
                      <Image source={{ uri: photo.url }} style={styles.photoImage} resizeMode="cover" />
                      <View style={styles.photoOverlay}><Ionicons name="expand" size={20} color={COLORS.textPrimary} /></View>
                      <View style={styles.photoLabelContainer}><Text style={styles.photoLabel}>{photo.label}</Text></View>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.photoHint}><Ionicons name="information-circle" size={14} color={COLORS.textMuted} /> {t('admin.accessReports.detail.tapToZoom')}</Text>
              </View>
            )}
            {photos.length === 0 && (
              <View style={styles.noPhotosSection}><Ionicons name="camera-outline" size={48} color={COLORS.textMuted} /><Text style={styles.noPhotosText}>{t('admin.accessReports.detail.noPhotos')}</Text><Text style={styles.noPhotosSubtext}>{t('admin.accessReports.detail.noPhotosCaptured')}</Text></View>
            )}
            <View style={styles.detailsSection}>
              <View style={styles.sectionHeader}><Ionicons name="information-circle" size={20} color={COLORS.teal} /><Text style={styles.sectionTitle}>{t('admin.accessReports.detail.accessInfo')}</Text></View>
              <View style={styles.detailsCard}>
                <DetailRow icon="time" label={t('admin.accessReports.detail.dateTime')} value={formatFullDateTime(log.timestamp || log.created_at)} />
                <DetailRow icon="qr-code" label={t('admin.accessReports.detail.qrType')} value={qrInfo.label} valueColor={qrInfo.color} />
                {log.vehicle_plate && <DetailRow icon="car" label={t('admin.accessReports.detail.vehiclePlate')} value={log.vehicle_plate} />}
                {log.id_number && <DetailRow icon="id-card" label={t('admin.accessReports.detail.idNumber')} value={log.id_number} />}
                {log.companions_count > 0 && <DetailRow icon="people" label={t('admin.accessReports.detail.companions')} value={`${log.companions_count} ${t('admin.accessReports.detail.persons')}`} />}
                {log.notes && <DetailRow icon="document-text" label={t('admin.accessReports.detail.notes')} value={log.notes} />}
              </View>
            </View>
            {(log.unit_number || log.resident_name) && (
              <View style={styles.detailsSection}>
                <View style={styles.sectionHeader}><Ionicons name="home" size={20} color={COLORS.purple} /><Text style={styles.sectionTitle}>{t('admin.accessReports.detail.visitedResident')}</Text></View>
                <View style={styles.detailsCard}>
                  <DetailRow icon="person" label={t('admin.accessReports.detail.name')} value={log.resident_name || '-'} />
                  <DetailRow icon="business" label={t('admin.accessReports.detail.unit')} value={log.unit_number || '-'} />
                  {log.block && <DetailRow icon="grid" label={t('admin.accessReports.detail.block')} value={log.block} />}
                </View>
              </View>
            )}
            {log.guard_name && (
              <View style={styles.detailsSection}>
                <View style={styles.sectionHeader}><Ionicons name="shield" size={20} color={COLORS.blue} /><Text style={styles.sectionTitle}>{t('admin.accessReports.detail.registeredBy')}</Text></View>
                <View style={styles.detailsCard}><DetailRow icon="person" label={t('admin.accessReports.detail.guard')} value={log.guard_name} /></View>
              </View>
            )}
            <View style={{ height: scale(50) }} />
          </ScrollView>
        <PhotoZoomModal />
        </SafeAreaView>
      </Modal>
    );
  };

  // Photo Zoom Modal
  const PhotoZoomModal = () => (
    <Modal visible={showZoomModal} animationType="fade" transparent onRequestClose={() => setShowZoomModal(false)}>
      <View style={styles.zoomContainer}>
        <TouchableOpacity style={styles.zoomCloseButton} onPress={() => setShowZoomModal(false)}><Ionicons name="close" size={28} color={COLORS.textPrimary} /></TouchableOpacity>
        {zoomPhoto?.title && <View style={styles.zoomTitleContainer}><Text style={styles.zoomTitle}>{zoomPhoto.title}</Text></View>}
        {zoomPhoto?.url && <Image source={{ uri: zoomPhoto.url }} style={styles.zoomImage} resizeMode="contain" />}
        <View style={styles.zoomHintContainer}><Text style={styles.zoomHint}>{t('admin.accessReports.detail.pinchToZoom')}</Text></View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{t('admin.accessReports.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('admin.accessReports.subtitle')}</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}><Ionicons name="refresh" size={22} color={COLORS.textSecondary} /></TouchableOpacity>
      </View>

      {/* Location Selector */}
      <LocationHeader />
      <View style={styles.tabsContainer}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab.id} style={[styles.tab, activeTab === tab.id && styles.tabActive]} onPress={() => setActiveTab(tab.id)}>
            <Ionicons name={tab.icon} size={20} color={activeTab === tab.id ? COLORS.lime : COLORS.textMuted} />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.lime} />}>
        {loading ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.lime} /><Text style={styles.loadingText}>{t('common.loading')}</Text></View>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <View>
                <View style={styles.statsGrid}>
                  <StatCard icon="enter" label={t('admin.accessReports.stats.entriesToday')} value={dashboardData?.stats?.today?.entries || 0} color={COLORS.success} />
                  <StatCard icon="exit" label={t('admin.accessReports.stats.exitsToday')} value={dashboardData?.stats?.today?.exits || 0} color={COLORS.warning} />
                  <StatCard icon="people" label={t('admin.accessReports.stats.inside')} value={dashboardData?.stats?.today?.currently_inside || 0} color={COLORS.blue} highlight />
                  <StatCard icon="alert-circle" label={t('admin.accessReports.stats.incidents')} value={dashboardData?.stats?.today?.incidents || 0} color={COLORS.danger} />
                </View>
                <View style={styles.section}>
                  <View style={styles.sectionHeader}><Ionicons name="time" size={20} color={COLORS.lime} /><Text style={styles.sectionTitle}>{t('admin.accessReports.recentAccess')}</Text></View>
                  {dashboardData?.recent_access?.length > 0 ? (
                    dashboardData.recent_access.map((access, idx) => (
                      <TouchableOpacity key={idx} style={styles.recentAccessItem} onPress={() => fetchAccessDetail(access.id)} activeOpacity={0.7}>
                        <View style={[styles.accessIcon, { backgroundColor: access.movement_type === 'entry' ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                          <Ionicons name={access.movement_type === 'entry' ? 'enter' : 'exit'} size={20} color={access.movement_type === 'entry' ? COLORS.success : COLORS.warning} />
                        </View>
                        <View style={styles.accessInfo}>
                          <View style={styles.accessNameRow}><Text style={styles.accessName}>{access.visitor_name}</Text>{hasPhotos(access) && <View style={styles.hasPhotoIndicator}><Ionicons name="camera" size={12} color={COLORS.teal} /></View>}</View>
                          <View style={styles.accessTypeContainer}><Ionicons name={getQRTypeInfo(access.qr_type).icon} size={12} color={getQRTypeInfo(access.qr_type).color} /><Text style={[styles.accessType, { color: getQRTypeInfo(access.qr_type).color }]}>{getQRTypeInfo(access.qr_type).label}</Text></View>
                        </View>
                        <View style={styles.accessRight}><Text style={styles.accessTime}>{formatTime(access.timestamp)}</Text>{access.guard_name && <Text style={styles.accessGuard}>{access.guard_name}</Text>}</View>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyState}><Ionicons name="mail-open-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>{t('admin.accessReports.empty.noRecentAccess')}</Text></View>
                  )}
                </View>
              </View>
            )}

            {activeTab === 'history' && (
              <View>
                <TouchableOpacity style={styles.exportHeaderButton} onPress={() => setShowExportModal(true)}><Ionicons name="download-outline" size={18} color={COLORS.lime} /><Text style={styles.exportHeaderButtonText}>{t('admin.accessReports.export.export')}</Text></TouchableOpacity>
                <View style={styles.filtersContainer}>
                  <TouchableOpacity style={styles.dateFilter}><Ionicons name="calendar" size={18} color={COLORS.teal} /><Text style={styles.dateFilterText}>{selectedDate}</Text></TouchableOpacity>
                  <View style={styles.filterButtons}>
                    <TouchableOpacity style={[styles.filterBtn, !movementFilter && styles.filterBtnActive]} onPress={() => setMovementFilter('')}><Text style={[styles.filterBtnText, !movementFilter && styles.filterBtnTextActive]}>{t('common.all')}</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.filterBtn, movementFilter === 'entry' && styles.filterBtnActive]} onPress={() => setMovementFilter('entry')}><Ionicons name="enter" size={14} color={movementFilter === 'entry' ? COLORS.background : COLORS.textSecondary} /></TouchableOpacity>
                    <TouchableOpacity style={[styles.filterBtn, movementFilter === 'exit' && styles.filterBtnActive]} onPress={() => setMovementFilter('exit')}><Ionicons name="exit" size={14} color={movementFilter === 'exit' ? COLORS.background : COLORS.textSecondary} /></TouchableOpacity>
                  </View>
                </View>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={18} color={COLORS.textMuted} />
                  <TextInput style={styles.searchInput} placeholder={t('admin.accessReports.searchPlaceholder')} placeholderTextColor={COLORS.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
                  {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={COLORS.textMuted} /></TouchableOpacity> : null}
                </View>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log, idx) => (
                    <TouchableOpacity key={idx} style={styles.historyItem} onPress={() => fetchAccessDetail(log.id)} activeOpacity={0.7}>
                      <View style={[styles.historyIcon, { backgroundColor: log.movement_type === 'entry' ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                        <Ionicons name={log.movement_type === 'entry' ? 'enter' : 'exit'} size={18} color={log.movement_type === 'entry' ? COLORS.success : COLORS.warning} />
                      </View>
                      <View style={styles.historyInfo}>
                        <View style={styles.historyNameRow}><Text style={styles.historyName}>{log.visitor_name}</Text>{hasPhotos(log) && <View style={styles.hasPhotoIndicator}><Ionicons name="camera" size={12} color={COLORS.teal} /></View>}</View>
                        <View style={styles.historyMeta}>
                          {log.vehicle_plate && <View style={styles.historyMetaItem}><Ionicons name="car" size={12} color={COLORS.textMuted} /><Text style={styles.historyMetaText}>{log.vehicle_plate}</Text></View>}
                          {log.unit_number && <View style={styles.historyMetaItem}><Ionicons name="home" size={12} color={COLORS.textMuted} /><Text style={styles.historyMetaText}>{log.unit_number}</Text></View>}
                        </View>
                      </View>
                      <View style={styles.historyRight}><Text style={styles.historyTime}>{formatTime(log.timestamp)}</Text>{log.guard_name && <Text style={styles.historyGuard}>{log.guard_name}</Text>}</View>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}><Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>{t('admin.accessReports.empty.noRecords')}</Text></View>
                )}
              </View>
            )}

            {activeTab === 'inside' && (
              <View>
                <View style={styles.insideCounter}><Ionicons name="people" size={32} color={COLORS.textPrimary} /><Text style={styles.insideCounterLabel}>{t('admin.accessReports.visitorsInside')}</Text><Text style={styles.insideCounterValue}>{visitorsInside.length}</Text></View>
                {visitorsInside.length > 0 ? (
                  visitorsInside.map((visitor, idx) => {
                    const entryTime = new Date(visitor.entry_time);
                    const hoursInside = Math.floor((new Date() - entryTime) / (1000 * 60 * 60));
                    const isLongStay = hoursInside >= 4;
                    return (
                      <TouchableOpacity key={idx} style={[styles.visitorCard, isLongStay && styles.visitorCardAlert]} onPress={() => fetchAccessDetail(visitor.access_log_id || visitor.id)} activeOpacity={0.7}>
                        <View style={styles.visitorHeader}>
                          <View><View style={styles.visitorNameRow}><Text style={styles.visitorName}>{visitor.visitor_name}</Text>{hasPhotos(visitor) && <View style={styles.hasPhotoIndicator}><Ionicons name="camera" size={12} color={COLORS.teal} /></View>}</View><View style={styles.visitorTypeRow}><Ionicons name={getQRTypeInfo(visitor.qr_type).icon} size={14} color={getQRTypeInfo(visitor.qr_type).color} /><Text style={styles.visitorType}>{getQRTypeInfo(visitor.qr_type).label}</Text></View></View>
                          {isLongStay && <View style={styles.alertBadge}><Ionicons name="time" size={12} color={COLORS.danger} /><Text style={styles.alertBadgeText}>+{hoursInside}h</Text></View>}
                        </View>
                        <View style={styles.visitorDetails}>
                          <View style={styles.visitorDetailItem}><Ionicons name="enter" size={14} color={COLORS.textMuted} /><Text style={styles.visitorDetail}>{t('admin.accessReports.entryTime')}: {formatTime(visitor.entry_time)}</Text></View>
                          <View style={styles.visitorDetailItem}><Ionicons name="home" size={14} color={COLORS.textMuted} /><Text style={styles.visitorDetail}>{t('admin.accessReports.detail.unit')}: {visitor.unit_number || '-'}</Text></View>
                        </View>
                        {visitor.vehicle_plate && <View style={styles.visitorVehicle}><Ionicons name="car" size={14} color={COLORS.textMuted} /><Text style={styles.visitorDetail}>{visitor.vehicle_plate}</Text></View>}
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyState}><Ionicons name="people-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>{t('admin.accessReports.empty.noVisitorsInside')}</Text></View>
                )}
              </View>
            )}

            {activeTab === 'incidents' && (
              <View>
                {incidents.length > 0 ? (
                  incidents.map((incident, idx) => {
                    const severityInfo = getSeverityInfo(incident.severity);
                    return (
                      <View key={idx} style={[styles.incidentCard, { borderLeftColor: severityInfo.color }]}>
                        <View style={styles.incidentHeader}>
                          <View style={[styles.severityBadge, { backgroundColor: severityInfo.color + '20' }]}><Ionicons name="alert-circle" size={12} color={severityInfo.color} /><Text style={[styles.severityText, { color: severityInfo.color }]}>{severityInfo.label}</Text></View>
                          <Text style={styles.incidentDate}>{formatDateTime(incident.created_at)}</Text>
                        </View>
                        <Text style={styles.incidentDescription}>{incident.description}</Text>
                        {incident.photos?.length > 0 && (
                          <View style={styles.incidentPhotos}>
                            {incident.photos.slice(0, 3).map((photo, pIdx) => (
                              <TouchableOpacity key={pIdx} onPress={() => openPhotoZoom(photo, `${t('admin.accessReports.incidentPhoto')} ${pIdx + 1}`)}><Image source={{ uri: photo }} style={styles.incidentPhoto} /></TouchableOpacity>
                            ))}
                            {incident.photos.length > 3 && <View style={styles.incidentPhotoMore}><Text style={styles.incidentPhotoMoreText}>+{incident.photos.length - 3}</Text></View>}
                          </View>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyState}><Ionicons name="shield-checkmark-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>{t('admin.accessReports.empty.noIncidents')}</Text><Text style={styles.emptySubtext}>{t('admin.accessReports.empty.allClear')}</Text></View>
                )}
              </View>
            )}
          </>
        )}
        <View style={{ height: scale(100) }} />
      </ScrollView>

      {loadingDetail && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color={COLORS.lime} /><Text style={styles.loadingOverlayText}>{t('admin.accessReports.loadingDetail')}</Text></View>}
      <DetailScreen />
      <ExportModal />
    <LocationPickerModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: scale(12) },
  backButton: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: COLORS.backgroundSecondary, justifyContent: 'center', alignItems: 'center' },
  headerTitleContainer: { flex: 1, marginLeft: scale(12) },
  headerTitle: { fontSize: scale(18), fontWeight: '700', color: COLORS.textPrimary },
  headerSubtitle: { fontSize: scale(12), color: COLORS.textSecondary, marginTop: scale(2) },
  refreshButton: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: COLORS.backgroundSecondary, justifyContent: 'center', alignItems: 'center' },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: scale(16), paddingBottom: scale(12), gap: scale(8) },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6), paddingVertical: scale(10), backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(10) },
  tabActive: { backgroundColor: COLORS.lime + '20' },
  tabText: { fontSize: scale(11), color: COLORS.textMuted, fontWeight: '500' },
  tabTextActive: { color: COLORS.lime },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: scale(16) },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: scale(60) },
  loadingText: { marginTop: scale(12), color: COLORS.textSecondary, fontSize: scale(14) },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10), marginBottom: scale(16) },
  statCard: { width: (SCREEN_WIDTH - scale(42)) / 2, backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(12), padding: scale(14), borderWidth: 1, borderColor: COLORS.border },
  statIconContainer: { width: scale(40), height: scale(40), borderRadius: scale(10), justifyContent: 'center', alignItems: 'center', marginBottom: scale(10) },
  statValue: { fontSize: scale(24), fontWeight: '700', color: COLORS.textPrimary },
  statLabel: { fontSize: scale(12), color: COLORS.textSecondary, marginTop: scale(4) },
  section: { backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(12), padding: scale(14), marginBottom: scale(16), borderWidth: 1, borderColor: COLORS.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: scale(12) },
  sectionTitle: { fontSize: scale(15), fontWeight: '600', color: COLORS.textPrimary },
  recentAccessItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: scale(12), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  accessIcon: { width: scale(36), height: scale(36), borderRadius: scale(10), justifyContent: 'center', alignItems: 'center' },
  accessInfo: { flex: 1, marginLeft: scale(10) },
  accessNameRow: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  accessName: { fontSize: scale(14), fontWeight: '500', color: COLORS.textPrimary },
  hasPhotoIndicator: { width: scale(18), height: scale(18), borderRadius: scale(9), backgroundColor: COLORS.teal + '20', justifyContent: 'center', alignItems: 'center' },
  accessTypeContainer: { flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: scale(2) },
  accessType: { fontSize: scale(11) },
  accessRight: { alignItems: 'flex-end', marginRight: scale(8) },
  accessTime: { fontSize: scale(13), fontWeight: '600', color: COLORS.textPrimary },
  accessGuard: { fontSize: scale(11), color: COLORS.textMuted, marginTop: scale(2) },
  emptyState: { alignItems: 'center', paddingVertical: scale(40) },
  emptyText: { fontSize: scale(15), color: COLORS.textSecondary, marginTop: scale(12) },
  emptySubtext: { fontSize: scale(13), color: COLORS.textMuted, marginTop: scale(4) },
  exportHeaderButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6), backgroundColor: COLORS.lime + '15', paddingVertical: scale(10), borderRadius: scale(10), marginBottom: scale(12), borderWidth: 1, borderColor: COLORS.lime + '30' },
  exportHeaderButtonText: { fontSize: scale(14), color: COLORS.lime, fontWeight: '600' },
  filtersContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: scale(12) },
  dateFilter: { flexDirection: 'row', alignItems: 'center', gap: scale(8), backgroundColor: COLORS.backgroundSecondary, paddingHorizontal: scale(12), paddingVertical: scale(10), borderRadius: scale(10), borderWidth: 1, borderColor: COLORS.border },
  dateFilterText: { fontSize: scale(14), color: COLORS.textPrimary },
  filterButtons: { flexDirection: 'row', gap: scale(6) },
  filterBtn: { paddingHorizontal: scale(12), paddingVertical: scale(8), backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(8), borderWidth: 1, borderColor: COLORS.border },
  filterBtnActive: { backgroundColor: COLORS.lime, borderColor: COLORS.lime },
  filterBtnText: { fontSize: scale(12), color: COLORS.textSecondary },
  filterBtnTextActive: { color: COLORS.background },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(10), paddingHorizontal: scale(12), paddingVertical: scale(10), marginBottom: scale(16), gap: scale(8), borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontSize: scale(14), color: COLORS.textPrimary },
  historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(10), padding: scale(12), marginBottom: scale(8), borderWidth: 1, borderColor: COLORS.border },
  historyIcon: { width: scale(32), height: scale(32), borderRadius: scale(8), justifyContent: 'center', alignItems: 'center' },
  historyInfo: { flex: 1, marginLeft: scale(10) },
  historyNameRow: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  historyName: { fontSize: scale(14), fontWeight: '500', color: COLORS.textPrimary },
  historyMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10), marginTop: scale(4) },
  historyMetaItem: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  historyMetaText: { fontSize: scale(11), color: COLORS.textMuted },
  historyRight: { alignItems: 'flex-end', marginRight: scale(8) },
  historyTime: { fontSize: scale(12), fontWeight: '600', color: COLORS.textPrimary },
  historyGuard: { fontSize: scale(10), color: COLORS.textMuted, marginTop: scale(2) },
  insideCounter: { alignItems: 'center', backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(16), padding: scale(24), marginBottom: scale(16), borderWidth: 1, borderColor: COLORS.border },
  insideCounterLabel: { fontSize: scale(14), color: COLORS.textSecondary, marginTop: scale(8) },
  insideCounterValue: { fontSize: scale(48), fontWeight: '700', color: COLORS.textPrimary },
  visitorCard: { backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(12), padding: scale(14), marginBottom: scale(10), borderWidth: 1, borderColor: COLORS.border },
  visitorCardAlert: { borderColor: COLORS.danger + '50' },
  visitorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: scale(10) },
  visitorNameRow: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  visitorName: { fontSize: scale(15), fontWeight: '600', color: COLORS.textPrimary },
  visitorTypeRow: { flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: scale(4) },
  visitorType: { fontSize: scale(12), color: COLORS.textSecondary },
  alertBadge: { flexDirection: 'row', alignItems: 'center', gap: scale(4), backgroundColor: COLORS.danger + '20', paddingHorizontal: scale(8), paddingVertical: scale(4), borderRadius: scale(8) },
  alertBadgeText: { fontSize: scale(11), fontWeight: '600', color: COLORS.danger },
  visitorDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(16) },
  visitorDetailItem: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  visitorDetail: { fontSize: scale(13), color: COLORS.textSecondary },
  visitorVehicle: { flexDirection: 'row', alignItems: 'center', gap: scale(6), marginTop: scale(10), paddingTop: scale(10), borderTopWidth: 1, borderTopColor: COLORS.border },
  incidentCard: { backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(12), padding: scale(14), marginBottom: scale(10), borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 4 },
  incidentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(10) },
  severityBadge: { flexDirection: 'row', alignItems: 'center', gap: scale(4), paddingHorizontal: scale(8), paddingVertical: scale(4), borderRadius: scale(8) },
  severityText: { fontSize: scale(11), fontWeight: '600' },
  incidentDate: { fontSize: scale(12), color: COLORS.textMuted },
  incidentDescription: { fontSize: scale(14), color: COLORS.textPrimary, lineHeight: scale(20) },
  incidentPhotos: { flexDirection: 'row', gap: scale(8), marginTop: scale(12) },
  incidentPhoto: { width: scale(60), height: scale(60), borderRadius: scale(8) },
  incidentPhotoMore: { width: scale(60), height: scale(60), borderRadius: scale(8), backgroundColor: COLORS.backgroundTertiary, justifyContent: 'center', alignItems: 'center' },
  incidentPhotoMoreText: { fontSize: scale(14), fontWeight: '600', color: COLORS.textSecondary },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 26, 26, 0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  loadingOverlayText: { marginTop: scale(12), color: COLORS.textSecondary, fontSize: scale(14) },
  detailContainer: { flex: 1, backgroundColor: COLORS.background },
  detailHeader: { paddingTop: scale(10), flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: scale(12), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailBackButton: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: COLORS.backgroundSecondary, justifyContent: 'center', alignItems: 'center' },
  detailHeaderTitle: { flex: 1, marginLeft: scale(12) },
  detailHeaderText: { fontSize: scale(17), fontWeight: '600', color: COLORS.textPrimary },
  detailHeaderSubtext: { fontSize: scale(12), color: COLORS.textSecondary, marginTop: scale(2) },
  detailScroll: { flex: 1 },
  detailScrollContent: { padding: scale(16) },
  visitorHeaderCard: { alignItems: 'center', backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(16), padding: scale(24), marginBottom: scale(16), borderWidth: 1, borderColor: COLORS.border },
  movementBadge: { width: scale(60), height: scale(60), borderRadius: scale(30), justifyContent: 'center', alignItems: 'center', marginBottom: scale(12) },
  visitorHeaderName: { fontSize: scale(22), fontWeight: '700', color: COLORS.textPrimary, marginBottom: scale(8) },
  qrTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: scale(6), backgroundColor: COLORS.backgroundTertiary, paddingHorizontal: scale(12), paddingVertical: scale(6), borderRadius: scale(20), marginBottom: scale(8) },
  qrTypeText: { fontSize: scale(12), fontWeight: '500' },
  visitorHeaderDate: { fontSize: scale(13), color: COLORS.textSecondary },
  photosSection: { backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(14), padding: scale(16), marginBottom: scale(16), borderWidth: 1, borderColor: COLORS.border },
  photoCountBadge: { backgroundColor: COLORS.lime, width: scale(22), height: scale(22), borderRadius: scale(11), justifyContent: 'center', alignItems: 'center', marginLeft: 'auto' },
  photoCountText: { fontSize: scale(11), fontWeight: '700', color: COLORS.background },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10), marginBottom: scale(12) },
  photoCard: { width: (SCREEN_WIDTH - scale(74)) / 2, aspectRatio: 1, borderRadius: scale(12), overflow: 'hidden', position: 'relative' },
  photoImage: { width: '100%', height: '100%' },
  photoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', opacity: 0 },
  photoLabelContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: scale(6), paddingHorizontal: scale(8) },
  photoLabel: { fontSize: scale(11), color: COLORS.textPrimary, fontWeight: '500' },
  photoHint: { fontSize: scale(12), color: COLORS.textMuted, textAlign: 'center' },
  noPhotosSection: { alignItems: 'center', backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(14), padding: scale(32), marginBottom: scale(16), borderWidth: 1, borderColor: COLORS.border },
  noPhotosText: { fontSize: scale(15), fontWeight: '600', color: COLORS.textSecondary, marginTop: scale(12) },
  noPhotosSubtext: { fontSize: scale(13), color: COLORS.textMuted, marginTop: scale(4) },
  detailsSection: { marginBottom: scale(16) },
  detailsCard: { backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(12), padding: scale(4), borderWidth: 1, borderColor: COLORS.border },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: scale(12), paddingHorizontal: scale(12), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailRowLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  detailRowLabel: { fontSize: scale(13), color: COLORS.textMuted },
  detailRowValue: { fontSize: scale(13), color: COLORS.textPrimary, fontWeight: '500', maxWidth: '50%', textAlign: 'right' },
  zoomContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  zoomCloseButton: { position: 'absolute', top: scale(50), right: scale(20), width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  zoomTitleContainer: { position: 'absolute', top: scale(50), left: scale(20), right: scale(80), zIndex: 10 },
  zoomTitle: { fontSize: scale(16), fontWeight: '600', color: COLORS.textPrimary },
  zoomImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7 },
  zoomHintContainer: { position: 'absolute', bottom: scale(50), left: 0, right: 0, alignItems: 'center' },
  zoomHint: { fontSize: scale(13), color: COLORS.textMuted },
  exportModalContainer: { flex: 1, backgroundColor: COLORS.background },
  exportModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: scale(14), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  exportModalCancel: { fontSize: scale(16), color: COLORS.textSecondary },
  exportModalTitle: { fontSize: scale(17), fontWeight: '600', color: COLORS.textPrimary },
  exportModalContent: { flex: 1, padding: scale(16) },
  exportSection: { marginBottom: scale(20) },
  exportSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: scale(12) },
  exportSectionTitle: { fontSize: scale(15), fontWeight: '600', color: COLORS.textPrimary },
  dateRangeContainer: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  dateInputContainer: { flex: 1 },
  dateInputLabel: { fontSize: scale(12), color: COLORS.textSecondary, marginBottom: scale(6) },
  dateInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(10), paddingHorizontal: scale(12), paddingVertical: scale(12), borderWidth: 1, borderColor: COLORS.border, gap: scale(8) },
  dateInputText: { flex: 1, fontSize: scale(14), color: COLORS.textPrimary },
  quickDateOptions: { flexDirection: 'row', gap: scale(8), marginTop: scale(12) },
  quickDateBtn: { paddingHorizontal: scale(12), paddingVertical: scale(8), backgroundColor: COLORS.backgroundTertiary, borderRadius: scale(8) },
  quickDateBtnText: { fontSize: scale(12), color: COLORS.textSecondary },
  exportSummaryCard: { backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(12), padding: scale(16), marginBottom: scale(20), borderWidth: 1, borderColor: COLORS.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: scale(14), color: COLORS.textSecondary },
  summaryValue: { fontSize: scale(24), fontWeight: '700', color: COLORS.textPrimary },
  summaryDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: scale(12) },
  summaryStats: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryStatItem: { alignItems: 'center', gap: scale(4) },
  summaryStatValue: { fontSize: scale(18), fontWeight: '600', color: COLORS.textPrimary },
  summaryStatLabel: { fontSize: scale(11), color: COLORS.textMuted },
  formatOptions: { gap: scale(10) },
  formatOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(12), padding: scale(14), borderWidth: 1, borderColor: COLORS.border, gap: scale(12) },
  formatOptionActive: { borderColor: COLORS.lime },
  formatRadio: { width: scale(22), height: scale(22), borderRadius: scale(11), borderWidth: 2, borderColor: COLORS.textMuted, justifyContent: 'center', alignItems: 'center' },
  formatRadioActive: { borderColor: COLORS.lime },
  formatRadioInner: { width: scale(12), height: scale(12), borderRadius: scale(6), backgroundColor: COLORS.lime },
  formatInfo: { flex: 1 },
  formatTitle: { fontSize: scale(14), fontWeight: '600', color: COLORS.textPrimary },
  formatTitleActive: { color: COLORS.lime },
  formatDescription: { fontSize: scale(12), color: COLORS.textMuted, marginTop: scale(2) },
  formatBadge: { paddingHorizontal: scale(8), paddingVertical: scale(4), borderRadius: scale(6) },
  formatBadgeText: { fontSize: scale(10), fontWeight: '600' },
  filterOptions: { gap: scale(12) },
  filterOption: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  checkbox: { width: scale(24), height: scale(24), borderRadius: scale(6), borderWidth: 2, borderColor: COLORS.textMuted, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: COLORS.lime, borderColor: COLORS.lime },
  filterOptionText: { fontSize: scale(14), color: COLORS.textPrimary },
  exportInfoBox: { flexDirection: 'row', backgroundColor: COLORS.teal + '10', borderRadius: scale(10), padding: scale(14), gap: scale(10) },
  exportInfoText: { flex: 1, fontSize: scale(13), color: COLORS.teal, lineHeight: scale(18) },
  exportModalFooter: { padding: scale(16), paddingBottom: scale(32), borderTopWidth: 1, borderTopColor: COLORS.border },
  exportButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.lime, paddingVertical: scale(16), borderRadius: scale(12), gap: scale(8) },
  exportButtonDisabled: { opacity: 0.6 },
  exportButtonText: { fontSize: scale(16), fontWeight: '700', color: COLORS.background },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: scale(8), gap: scale(6) },
  infoRowText: { fontSize: scale(13), color: COLORS.textSecondary },
  statusBadge: { marginTop: scale(12), paddingHorizontal: scale(16), paddingVertical: scale(6), borderRadius: scale(20) },
  statusText: { fontSize: scale(14), fontWeight: '600' },
});