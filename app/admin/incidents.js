// app/admin/incidents.js
// ISSY Admin - Gestión de Incidentes (ProHome Dark Theme)

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { getIncidents, getIncidentById, updateIncidentStatus, addIncidentComment } from '../../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ProHome Dark Theme Colors
const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  lime: '#D4FE48',
  teal: '#5DDED8',
  purple: '#6366F1',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  blue: '#3B82F6',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  border: 'rgba(255,255,255,0.1)',
};

const getStatusConfig = (t) => ({
  reported: { label: t('admin.incidents.statuses.reported'), color: COLORS.warning, bg: COLORS.warning + '20', icon: 'alert-circle' },
  in_progress: { label: t('admin.incidents.statuses.inProgress'), color: COLORS.blue, bg: COLORS.blue + '20', icon: 'time' },
  resolved: { label: t('admin.incidents.statuses.resolved'), color: COLORS.success, bg: COLORS.success + '20', icon: 'checkmark-circle' },
  closed: { label: t('admin.incidents.statuses.closed'), color: COLORS.textMuted, bg: COLORS.backgroundTertiary, icon: 'lock-closed' },
});

const getSeverityConfig = (t) => ({
  low: { label: t('admin.incidents.severity.low'), color: COLORS.success, bg: COLORS.success + '20' },
  medium: { label: t('admin.incidents.severity.medium'), color: COLORS.warning, bg: COLORS.warning + '20' },
  high: { label: t('admin.incidents.severity.high'), color: COLORS.danger, bg: COLORS.danger + '20' },
  critical: { label: t('admin.incidents.severity.critical'), color: '#DC2626', bg: '#DC262620' },
});

const getTypeLabels = (t) => ({
  security: t('admin.incidents.types.security'),
  theft: t('admin.incidents.types.theft'),
  vandalism: t('admin.incidents.types.vandalism'),
  noise_complaint: t('admin.incidents.types.noiseComplaint'),
  parking_violation: t('admin.incidents.types.parkingViolation'),
  maintenance: t('admin.incidents.types.maintenance'),
  other: t('admin.incidents.types.other'),
});

export default function AdminIncidents() {
  const { t } = useTranslation();
  const router = useRouter();
  
  // i18n configs
  const STATUS_CONFIG = getStatusConfig(t);
  const SEVERITY_CONFIG = getSeverityConfig(t);
  const TYPE_LABELS = getTypeLabels(t);
  
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchIncidents = useCallback(async () => {
    try {
      const result = await getIncidents();
      if (result.success) {
        setIncidents(result.data.incidents || result.data || []);
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchIncidents();
  };

  const filteredIncidents = filterStatus === 'all'
    ? incidents
    : incidents.filter(i => i.status === filterStatus);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-HN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const openIncidentDetail = async (incident) => {
    setDetailModalVisible(true);
    setLoadingDetail(true);
    try {
      const result = await getIncidentById(incident.id);
      if (result.success) {
        setSelectedIncident(result.data);
      } else {
        setSelectedIncident(incident);
      }
    } catch (error) {
      setSelectedIncident(incident);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedIncident || submitting) return;
    
    setSubmitting(true);
    try {
      const result = await updateIncidentStatus(selectedIncident.id, newStatus);
      if (result.success) {
        setSelectedIncident({ ...selectedIncident, status: newStatus });
        fetchIncidents();
        Alert.alert(t('common.success'), t('admin.incidents.success.statusUpdated'));
      } else {
        Alert.alert(t('common.error'), result.error || t('admin.incidents.errors.updateFailed'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('admin.incidents.errors.updateStatusFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedIncident || submitting) return;

    setSubmitting(true);
    try {
      const result = await addIncidentComment(selectedIncident.id, commentText.trim());
      if (result.success) {
        const newComment = result.data;
        setSelectedIncident({
          ...selectedIncident,
          comments: [...(selectedIncident.comments || []), newComment]
        });
        setCommentText('');
      } else {
        Alert.alert(t('common.error'), t('admin.incidents.errors.commentFailed'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('admin.incidents.errors.commentFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
          <Text style={styles.loadingText}>{t('admin.incidents.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderFilters = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.filterContainer}
    >
      <TouchableOpacity
        style={[
          styles.filterChip,
          filterStatus === 'all' && styles.filterChipActive
        ]}
        onPress={() => setFilterStatus('all')}
      >
        <Ionicons 
          name="list" 
          size={14} 
          color={filterStatus === 'all' ? COLORS.background : COLORS.textSecondary} 
        />
        <Text style={[
          styles.filterText,
          filterStatus === 'all' && styles.filterTextActive
        ]}>
          {t('common.all')} ({incidents.length})
        </Text>
      </TouchableOpacity>
      {Object.entries(STATUS_CONFIG).map(([key, config]) => {
        const count = incidents.filter(i => i.status === key).length;
        return (
          <TouchableOpacity
            key={key}
            style={[
              styles.filterChip,
              filterStatus === key && { backgroundColor: config.bg, borderColor: config.color }
            ]}
            onPress={() => setFilterStatus(key)}
          >
            <Ionicons 
              name={config.icon} 
              size={14} 
              color={filterStatus === key ? config.color : COLORS.textSecondary} 
            />
            <Text style={[
              styles.filterText,
              filterStatus === key && { color: config.color }
            ]}>
              {config.label} ({count})
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderIncidentCard = ({ item }) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.reported;
    const severity = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.medium;
    const typeLabel = TYPE_LABELS[item.type] || item.type;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openIncidentDetail(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.typeIconBox, { backgroundColor: severity.bg }]}>
              <Ionicons name="warning" size={18} color={severity.color} />
            </View>
            <View style={styles.cardTitleContent}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.cardReference}>
                {item.reference_number ? `#${item.reference_number}` : typeLabel}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.cardMeta}>
            <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.cardMetaText}>{item.reporter_name || 'Usuario'}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.cardMetaText}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={[styles.severityBadge, { backgroundColor: severity.bg }]}>
            <Text style={[styles.severityText, { color: severity.color }]}>{severity.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedIncident && !loadingDetail) return null;

    const status = selectedIncident ? (STATUS_CONFIG[selectedIncident.status] || STATUS_CONFIG.reported) : null;
    const severity = selectedIncident ? (SEVERITY_CONFIG[selectedIncident.severity] || SEVERITY_CONFIG.medium) : null;

    return (
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setDetailModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Detalle del Incidente</Text>
            <View style={{ width: scale(40) }} />
          </View>

          {loadingDetail ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.lime} />
            </View>
          ) : selectedIncident ? (
            <KeyboardAvoidingView 
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent}>
                {selectedIncident.reference_number && (
                  <Text style={styles.referenceNumber}>#{selectedIncident.reference_number}</Text>
                )}
                <Text style={styles.detailTitle}>{selectedIncident.title}</Text>

                <View style={styles.badgeRow}>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: status.bg }]}>
                    <Ionicons name={status.icon} size={16} color={status.color} />
                    <Text style={[styles.statusTextLarge, { color: status.color }]}>{status.label}</Text>
                  </View>
                  <View style={[styles.severityBadgeLarge, { backgroundColor: severity.bg }]}>
                    <Text style={[styles.severityTextLarge, { color: severity.color }]}>{severity.label}</Text>
                  </View>
                </View>

                <Text style={styles.sectionLabel}>{t('admin.incidents.description')}</Text>
                <Text style={styles.detailDescription}>{selectedIncident.description}</Text>

                <Text style={styles.sectionLabel}>{t('admin.incidents.reportedBy')}</Text>
                <View style={styles.reporterInfo}>
                  <View style={styles.reporterAvatar}>
                    <Ionicons name="person" size={20} color={COLORS.textSecondary} />
                  </View>
                  <View>
                    <Text style={styles.reporterName}>{selectedIncident.reporter_name || 'Usuario'}</Text>
                    <Text style={styles.reporterDate}>{formatDate(selectedIncident.created_at)}</Text>
                  </View>
                </View>

                <Text style={styles.sectionLabel}>{t('admin.incidents.changeStatus')}</Text>
                <View style={styles.statusButtons}>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.statusButton,
                        selectedIncident.status === key && { backgroundColor: config.bg, borderColor: config.color }
                      ]}
                      onPress={() => handleStatusChange(key)}
                      disabled={submitting || selectedIncident.status === key}
                    >
                      <Ionicons name={config.icon} size={16} color={selectedIncident.status === key ? config.color : COLORS.textSecondary} />
                      <Text style={[
                        styles.statusButtonText,
                        selectedIncident.status === key && { color: config.color }
                      ]}>
                        {config.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>{t('admin.incidents.comments')} ({selectedIncident.comments?.length || 0})</Text>
                {selectedIncident.comments?.length > 0 ? (
                  selectedIncident.comments.map((comment, index) => (
                    <View key={comment.id || index} style={styles.commentCard}>
                      <View style={styles.commentHeader}>
                        <View style={styles.commentAvatar}>
                          <Text style={styles.commentAvatarText}>
                            {(comment.user_name || 'A').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.commentMeta}>
                          <Text style={styles.commentAuthor}>{comment.user_name || 'Admin'}</Text>
                          <Text style={styles.commentDate}>{formatDate(comment.created_at)}</Text>
                        </View>
                      </View>
                      <Text style={styles.commentText}>{comment.content || comment.text}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noComments}>{t('admin.incidents.noComments')}</Text>
                )}
                
                <View style={{ height: scale(100) }} />
              </ScrollView>

              {/* Comment Input */}
              <View style={styles.addCommentContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder={t('admin.incidents.addCommentPlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
                  onPress={handleAddComment}
                  disabled={!commentText.trim() || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={COLORS.textPrimary} />
                  ) : (
                    <Ionicons name="send" size={20} color={COLORS.background} />
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          ) : null}
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{t('admin.incidents.title')}</Text>
          <Text style={styles.headerSubtitle}>{incidents.length} reportes</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="alert-circle" size={22} color={COLORS.warning} />
          <Text style={[styles.statNumber, { color: COLORS.warning }]}>
            {incidents.filter(i => i.status === 'reported').length}
          </Text>
          <Text style={styles.statLabel}>Reportados</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="time" size={22} color={COLORS.blue} />
          <Text style={[styles.statNumber, { color: COLORS.blue }]}>
            {incidents.filter(i => i.status === 'in_progress').length}
          </Text>
          <Text style={styles.statLabel}>En Proceso</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
          <Text style={[styles.statNumber, { color: COLORS.success }]}>
            {incidents.filter(i => i.status === 'resolved').length}
          </Text>
          <Text style={styles.statLabel}>Resueltos</Text>
        </View>
      </View>

      {/* Filters */}
      {renderFilters()}

      {/* Incidents List */}
      <FlatList
        data={filteredIncidents}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={renderIncidentCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.lime}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>{t('admin.incidents.empty.noIncidents')}</Text>
            <Text style={styles.emptySubtitle}>No hay incidentes {filterStatus !== 'all' ? 'con este estado' : ''}</Text>
          </View>
        )}
      />

      {/* Detail Modal */}
      {renderDetailModal()}
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
    fontSize: scale(14),
    color: COLORS.textSecondary,
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
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    gap: scale(10),
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: scale(12),
    borderRadius: scale(12),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    fontSize: scale(20),
    fontWeight: '700',
    marginTop: scale(4),
  },
  statLabel: {
    fontSize: scale(10),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },

  // Filters
  filterScroll: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    gap: scale(8),
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(6),
  },
  filterChipActive: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  filterText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.background,
  },

  // List
  listContent: {
    padding: scale(16),
    paddingBottom: scale(100),
  },
  card: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(10),
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: scale(12),
  },
  typeIconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(10),
  },
  cardTitleContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardReference: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  statusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  statusText: {
    fontSize: scale(11),
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginBottom: scale(12),
    lineHeight: scale(20),
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  cardMetaText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  severityBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(4),
    marginLeft: 'auto',
  },
  severityText: {
    fontSize: scale(10),
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: scale(60),
  },
  emptyTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: scale(16),
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.textMuted,
    marginTop: scale(4),
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    width: scale(40),
    height: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: scale(17),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  detailScroll: {
    flex: 1,
  },
  detailContent: {
    padding: scale(16),
  },
  referenceNumber: {
    fontSize: scale(12),
    color: COLORS.teal,
    fontWeight: '600',
    marginBottom: scale(4),
  },
  detailTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(12),
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: scale(20),
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(16),
    gap: scale(4),
  },
  statusTextLarge: {
    fontSize: scale(13),
    fontWeight: '600',
  },
  severityBadgeLarge: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(16),
  },
  severityTextLarge: {
    fontSize: scale(13),
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: scale(12),
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: scale(20),
    marginBottom: scale(8),
  },
  detailDescription: {
    fontSize: scale(15),
    color: COLORS.textPrimary,
    lineHeight: scale(22),
  },
  reporterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reporterAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  reporterName: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  reporterDate: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundSecondary,
    gap: scale(6),
  },
  statusButtonText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  commentCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    padding: scale(12),
    marginBottom: scale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  commentAvatar: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: COLORS.teal + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(10),
  },
  commentAvatarText: {
    fontSize: scale(12),
    fontWeight: '600',
    color: COLORS.teal,
  },
  commentMeta: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  commentDate: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
  },
  commentText: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
    lineHeight: scale(20),
  },
  noComments: {
    textAlign: 'center',
    color: COLORS.textMuted,
    paddingVertical: scale(20),
    fontSize: scale(14),
  },
  addCommentContainer: {
    flexDirection: 'row',
    padding: scale(12),
    backgroundColor: COLORS.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: scale(8),
    paddingBottom: Platform.OS === 'ios' ? scale(34) : scale(12),
  },
  commentInput: {
    flex: 1,
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    fontSize: scale(15),
    maxHeight: scale(80),
    color: COLORS.textPrimary,
  },
  sendButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.lime,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.backgroundTertiary,
  },
});