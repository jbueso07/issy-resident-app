// app/incidents.js
// ISSY Resident App - Incidents Screen (ProHome Dark Theme)

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { getIncidents } from '../src/services/api';
import IncidentFormModal from '../src/components/IncidentFormModal';
import { useTranslation } from '../src/hooks/useTranslation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ProHome Dark Theme Colors
const COLORS = {
  // Backgrounds
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  
  // Cards
  card: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  cardHover: 'rgba(255, 255, 255, 0.08)',
  
  // Accent colors
  teal: '#5DDED8',
  tealDark: '#4BCDC7',
  lime: '#D4FE48',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  
  // Status colors
  cyan: '#009FF5',
  red: '#FA5967',
  yellow: '#F59E0B',
  green: '#10B981',
  gray: '#6B7280',
};

// Status and severity configs defined dynamically in component

export default function IncidentsScreen() {
  const router = useRouter();
  const { profile, token } = useAuth();
  const { t, language } = useTranslation();

  // Dynamic status config with translations
  const STATUS_CONFIG = {
    reported: { label: t('incidents.status.reported'), bg: COLORS.cyan, color: '#FFFFFF' },
    in_progress: { label: t('incidents.status.inProgress'), bg: COLORS.yellow, color: '#000000' },
    resolved: { label: t('incidents.status.resolved'), bg: COLORS.green, color: '#FFFFFF' },
    closed: { label: t('incidents.status.closed'), bg: COLORS.gray, color: '#FFFFFF' },
  };

  // Dynamic severity config with translations
  const SEVERITY_CONFIG = {
    low: { label: t('incidents.severity.low'), color: COLORS.teal },
    medium: { label: t('incidents.severity.medium'), color: COLORS.cyan },
    high: { label: t('incidents.severity.high'), color: COLORS.yellow },
    critical: { label: t('incidents.severity.critical'), color: COLORS.red },
  };

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadIncidents = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      const params = filter === 'my_incidents' ? { my_incidents: 'true' } : {};
      const result = await getIncidents(params);
      
      if (result.success) {
        setIncidents(result.data.incidents || []);
      }
    } catch (error) {
      console.error('Error loading incidents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadIncidents();
    }, [filter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadIncidents(false);
  };

  const handleIncidentCreated = () => {
    setShowForm(false);
    loadIncidents(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const renderIncidentCard = (incident) => {
    const status = STATUS_CONFIG[incident.status] || STATUS_CONFIG.reported;
    const severity = SEVERITY_CONFIG[incident.severity];
    
    return (
      <TouchableOpacity
        key={incident.id}
        style={styles.incidentCard}
        onPress={() => router.push(`/incident-detail?id=${incident.id}`)}
        activeOpacity={0.7}
      >
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: severity?.color || COLORS.teal }]} />
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.incidentTitle} numberOfLines={1}>
              {incident.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
          </View>
          
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.teal} />
            <Text style={styles.incidentDate}>{formatDate(incident.created_at)}</Text>
            {severity && (
              <>
                <View style={styles.metaDot} />
                <Text style={[styles.severityText, { color: severity.color }]}>
                  {severity.label}
                </Text>
              </>
            )}
          </View>
          
          {incident.description && (
            <Text style={styles.incidentDescription} numberOfLines={2}>
              {incident.description}
            </Text>
          )}
        </View>
        
        <View style={styles.cardArrow}>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.teal} />
      </View>
      <Text style={styles.emptyTitle}>{t('incidents.empty.title')}</Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'my_incidents' 
          ? t('incidents.empty.myReports')
          : t('incidents.empty.community')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('incidents.title')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={COLORS.teal}
            colors={[COLORS.teal]} 
          />
        }
      >
        {/* Subtitle */}
        <Text style={styles.subtitle}>{t('incidents.subtitle')}</Text>

        {/* Create Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowForm(true)}
          activeOpacity={0.8}
        >
          <View style={styles.createButtonIcon}>
            <Ionicons name="add" size={22} color={COLORS.background} />
          </View>
          <View style={styles.createButtonContent}>
            <Text style={styles.createButtonText}>{t('incidents.createButton')}</Text>
            <Text style={styles.createButtonSubtext}>{t('incidents.createButtonSubtext')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.background} />
        </TouchableOpacity>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              {t('incidents.filters.all')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'my_incidents' && styles.filterTabActive]}
            onPress={() => setFilter('my_incidents')}
          >
            <Text style={[styles.filterText, filter === 'my_incidents' && styles.filterTextActive]}>
              {t('incidents.filters.myReports')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {filter === 'my_incidents' ? t('incidents.myIncidents') : t('incidents.recentIncidents')}
          </Text>
          <Text style={styles.sectionCount}>{incidents.length}</Text>
        </View>

        {/* Incidents List */}
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={COLORS.teal} />
            <Text style={styles.loaderText}>{t('incidents.loading')}</Text>
          </View>
        ) : incidents.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.incidentsList}>
            {incidents.map(renderIncidentCard)}
          </View>
        )}

        <View style={{ height: scale(100) }} />
      </ScrollView>

      {/* Incident Form Modal */}
      <IncidentFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={handleIncidentCreated}
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerRight: {
    width: scale(40),
  },
  
  // Content
  scrollContent: {
    paddingHorizontal: scale(20),
  },
  subtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginBottom: scale(20),
  },
  
  // Create Button
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lime,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(24),
  },
  createButtonIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  createButtonContent: {
    flex: 1,
  },
  createButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.background,
  },
  createButtonSubtext: {
    fontSize: scale(12),
    color: 'rgba(0,0,0,0.6)',
    marginTop: scale(2),
  },

  // Filter Tabs
  filterRow: {
    flexDirection: 'row',
    marginBottom: scale(20),
    gap: scale(10),
  },
  filterTab: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
    borderRadius: scale(25),
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  filterTabActive: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  filterText: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.background,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionCount: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.teal,
    backgroundColor: COLORS.card,
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(10),
  },

  // Incidents List
  incidentsList: {
    gap: scale(12),
  },
  incidentCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
    minHeight: scale(100),
  },
  accentBar: {
    width: scale(4),
  },
  cardContent: {
    flex: 1,
    padding: scale(16),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(8),
  },
  incidentTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: scale(10),
  },
  statusBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
  },
  statusText: {
    fontSize: scale(9),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  incidentDate: {
    fontSize: scale(12),
    color: COLORS.teal,
    marginLeft: scale(4),
  },
  metaDot: {
    width: scale(3),
    height: scale(3),
    borderRadius: scale(1.5),
    backgroundColor: COLORS.textMuted,
    marginHorizontal: scale(8),
  },
  severityText: {
    fontSize: scale(12),
    fontWeight: '500',
  },
  incidentDescription: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    lineHeight: scale(18),
  },
  cardArrow: {
    justifyContent: 'center',
    paddingRight: scale(12),
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(60),
  },
  emptyIconContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  emptyTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scale(20),
    paddingHorizontal: scale(20),
  },

  // Loader
  loader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(60),
  },
  loaderText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(12),
  },
});