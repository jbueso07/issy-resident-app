// app/incidents.js
// ISSY Resident App - Incidents Screen

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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/context/AuthContext';
import { getIncidents } from '../src/services/api';
import IncidentFormModal from '../src/components/IncidentFormModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const COLORS = {
  lime: '#D4FE48',
  cyan: '#009FF5',
  cyanLight: '#11D6E6',
  black: '#000000',
  white: '#FFFFFF',
  background: '#FAFAFA',
  gray: '#707883',
  grayLight: '#F2F2F2',
  red: '#FA5967',
};

const STATUS_CONFIG = {
  reported: { label: 'REPORTADO', bg: COLORS.cyan, color: COLORS.white },
  in_progress: { label: 'EN PROCESO', bg: COLORS.lime, color: COLORS.black },
  resolved: { label: 'RESUELTO', bg: COLORS.cyanLight, color: COLORS.black },
  closed: { label: 'CERRADO', bg: COLORS.gray, color: COLORS.white },
};

const SEVERITY_CONFIG = {
  low: { label: 'Baja', color: COLORS.cyanLight },
  medium: { label: 'Media', color: COLORS.cyan },
  high: { label: 'Alta', color: COLORS.lime },
  critical: { label: 'Crítica', color: COLORS.red },
};

export default function IncidentsScreen() {
  const router = useRouter();
  const { profile, token } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all'); // all, my_incidents

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
    
    return (
      <TouchableOpacity
        key={incident.id}
        style={styles.incidentCard}
        onPress={() => router.push(`/incident-detail?id=${incident.id}`)}
        activeOpacity={0.7}
      >
        {/* Left gradient bar */}
        <LinearGradient
          colors={[COLORS.lime, COLORS.cyanLight]}
          style={styles.gradientBar}
        />
        
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
          
          <Text style={styles.incidentDate}>{formatDate(incident.created_at)}</Text>
          
          {incident.description && (
            <Text style={styles.incidentDescription} numberOfLines={2}>
              {incident.description}
            </Text>
          )}
        </View>
        
        <View style={styles.cardArrow}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="alert-circle-outline" size={64} color={COLORS.gray} />
      <Text style={styles.emptyTitle}>No hay incidentes</Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'my_incidents' 
          ? 'No has reportado ningún incidente aún'
          : 'No hay incidentes reportados en tu comunidad'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incidentes</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.cyan]} />
        }
      >
        {/* Subtitle */}
        <Text style={styles.subtitle}>Reporta un incidente en tu comunidad</Text>

        {/* Create Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowForm(true)}
          activeOpacity={0.8}
        >
          <View style={styles.createButtonIcon}>
            <Ionicons name="add" size={24} color={COLORS.black} />
          </View>
          <Text style={styles.createButtonText}>Generar Incidente</Text>
        </TouchableOpacity>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              Todos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'my_incidents' && styles.filterTabActive]}
            onPress={() => setFilter('my_incidents')}
          >
            <Text style={[styles.filterText, filter === 'my_incidents' && styles.filterTextActive]}>
              Mis reportes
            </Text>
          </TouchableOpacity>
        </View>

        {/* Incidents List */}
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={COLORS.cyan} />
            <Text style={styles.loaderText}>Cargando incidentes...</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    backgroundColor: COLORS.background,
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: scale(22),
    fontWeight: '700',
    color: COLORS.black,
  },
  headerRight: {
    width: scale(40),
  },
  scrollContent: {
    paddingHorizontal: scale(21),
  },
  subtitle: {
    fontSize: scale(14),
    fontWeight: '400',
    color: COLORS.black,
    marginBottom: scale(16),
  },
  
  // Create Button
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lime,
    borderRadius: scale(13),
    paddingVertical: scale(16),
    paddingHorizontal: scale(20),
    marginBottom: scale(20),
  },
  createButtonIcon: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  createButtonText: {
    fontSize: scale(14),
    fontWeight: '400',
    color: COLORS.black,
  },

  // Filter Tabs
  filterRow: {
    flexDirection: 'row',
    marginBottom: scale(16),
    gap: scale(10),
  },
  filterTab: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: COLORS.white,
  },
  filterTabActive: {
    backgroundColor: COLORS.black,
  },
  filterText: {
    fontSize: scale(13),
    fontWeight: '500',
    color: COLORS.gray,
  },
  filterTextActive: {
    color: COLORS.white,
  },

  // Incidents List
  incidentsList: {
    gap: scale(12),
  },
  incidentCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: scale(13),
    overflow: 'hidden',
    minHeight: scale(100),
  },
  gradientBar: {
    width: scale(11),
  },
  cardContent: {
    flex: 1,
    padding: scale(14),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(4),
  },
  incidentTitle: {
    fontSize: scale(14),
    fontWeight: '400',
    color: COLORS.black,
    flex: 1,
    marginRight: scale(10),
  },
  statusBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(5),
  },
  statusText: {
    fontSize: scale(9),
    fontWeight: '600',
    textAlign: 'center',
  },
  incidentDate: {
    fontSize: scale(10),
    fontWeight: '400',
    color: COLORS.cyan,
    marginBottom: scale(6),
  },
  incidentDescription: {
    fontSize: scale(12),
    fontWeight: '400',
    color: COLORS.gray,
    lineHeight: scale(16),
  },
  cardArrow: {
    justifyContent: 'center',
    paddingRight: scale(10),
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(60),
  },
  emptyTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.black,
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: scale(20),
  },

  // Loader
  loader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(60),
  },
  loaderText: {
    fontSize: scale(14),
    color: COLORS.gray,
    marginTop: scale(12),
  },
});