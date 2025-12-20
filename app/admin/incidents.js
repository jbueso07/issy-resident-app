// app/admin/incidents.js
// ISSY Admin - Gestión de Incidentes

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
import { useRouter } from 'expo-router';
import { getIncidents, getIncidentById, updateIncidentStatus, addIncidentComment } from '../../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const COLORS = {
  background: '#F9FAFB',
  white: '#FFFFFF',
  black: '#111827',
  gray: '#6B7280',
  grayLight: '#F3F4F6',
  grayBorder: '#E5E7EB',
  primary: '#009FF5',
  primaryLight: '#EEF2FF',
  lime: '#D4FE48',
};

const STATUS_CONFIG = {
  reported: { label: 'Reportado', color: '#F59E0B', bg: '#FEF3C7', icon: 'alert-circle' },
  in_progress: { label: 'En Proceso', color: '#3B82F6', bg: '#DBEAFE', icon: 'time' },
  resolved: { label: 'Resuelto', color: '#10B981', bg: '#D1FAE5', icon: 'checkmark-circle' },
  closed: { label: 'Cerrado', color: '#6B7280', bg: '#F3F4F6', icon: 'lock-closed' },
};

const SEVERITY_CONFIG = {
  low: { label: 'Baja', color: '#10B981', bg: '#D1FAE5' },
  medium: { label: 'Media', color: '#F59E0B', bg: '#FEF3C7' },
  high: { label: 'Alta', color: '#EF4444', bg: '#FEE2E2' },
  critical: { label: 'Crítica', color: '#DC2626', bg: '#FEE2E2' },
};

const TYPE_LABELS = {
  security: 'Seguridad',
  theft: 'Robo',
  vandalism: 'Vandalismo',
  noise_complaint: 'Ruido',
  parking_violation: 'Estacionamiento',
  maintenance: 'Mantenimiento',
  other: 'Otro',
};

export default function AdminIncidents() {
  const router = useRouter();
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

  const openIncidentDetail = async (incident) => {
    setLoadingDetail(true);
    setDetailModalVisible(true);
    
    try {
      const result = await getIncidentById(incident.id);
      if (result.success) {
        setSelectedIncident(result.data.incident || result.data);
      } else {
        Alert.alert('Error', 'No se pudieron cargar los detalles');
        setDetailModalVisible(false);
      }
    } catch (error) {
      console.error('Error:', error);
      setDetailModalVisible(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedIncident || submitting) return;
    
    try {
      setSubmitting(true);
      const result = await updateIncidentStatus(selectedIncident.id, newStatus);
      
      if (result.success) {
        setSelectedIncident(prev => ({ ...prev, status: newStatus }));
        setIncidents(prev =>
          prev.map(inc =>
            inc.id === selectedIncident.id ? { ...inc, status: newStatus } : inc
          )
        );
        Alert.alert('Éxito', 'Estado actualizado correctamente');
      } else {
        Alert.alert('Error', result.error || 'No se pudo actualizar');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedIncident || submitting) return;

    try {
      setSubmitting(true);
      const result = await addIncidentComment(selectedIncident.id, commentText.trim());
      
      if (result.success) {
        const newComment = result.data.comment || result.data;
        setSelectedIncident(prev => ({
          ...prev,
          comments: [...(prev.comments || []), newComment]
        }));
        setCommentText('');
      } else {
        Alert.alert('Error', 'No se pudo agregar el comentario');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar el comentario');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredIncidents = filterStatus === 'all' 
    ? incidents 
    : incidents.filter(inc => inc.status === filterStatus);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-HN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStatusFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.filterContainer}
    >
      <TouchableOpacity
        style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
        onPress={() => setFilterStatus('all')}
      >
        <Text style={[styles.filterText, filterStatus === 'all' && styles.filterTextActive]}>
          Todos ({incidents.length})
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
              color={filterStatus === key ? config.color : COLORS.gray} 
              style={{ marginRight: 4 }}
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
            <Ionicons name="person-outline" size={14} color={COLORS.gray} />
            <Text style={styles.cardMetaText}>{item.reporter_name || 'Usuario'}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Ionicons name="time-outline" size={14} color={COLORS.gray} />
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
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.black} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Detalle del Incidente</Text>
            <View style={{ width: 24 }} />
          </View>

          {loadingDetail ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
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

                <Text style={styles.sectionLabel}>Descripción</Text>
                <Text style={styles.detailDescription}>{selectedIncident.description}</Text>

                <Text style={styles.sectionLabel}>Reportado por</Text>
                <View style={styles.reporterInfo}>
                  <View style={styles.reporterAvatar}>
                    <Ionicons name="person" size={20} color={COLORS.gray} />
                  </View>
                  <View>
                    <Text style={styles.reporterName}>{selectedIncident.reporter_name || 'Usuario'}</Text>
                    <Text style={styles.reporterDate}>{formatDate(selectedIncident.created_at)}</Text>
                  </View>
                </View>

                <Text style={styles.sectionLabel}>Cambiar Estado</Text>
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
                      <Ionicons name={config.icon} size={16} color={selectedIncident.status === key ? config.color : COLORS.gray} />
                      <Text style={[
                        styles.statusButtonText,
                        selectedIncident.status === key && { color: config.color }
                      ]}>{config.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>
                  Comentarios ({selectedIncident.comments?.length || 0})
                </Text>
                
                {selectedIncident.comments && selectedIncident.comments.length > 0 ? (
                  selectedIncident.comments.map((comment, index) => (
                    <View key={comment.id || index} style={styles.commentCard}>
                      <View style={styles.commentHeader}>
                        <View style={styles.commentAvatar}>
                          <Ionicons name="person" size={14} color={COLORS.white} />
                        </View>
                        <View style={styles.commentMeta}>
                          <Text style={styles.commentAuthor}>{comment.user?.name || 'Usuario'}</Text>
                          <Text style={styles.commentDate}>{formatDate(comment.created_at)}</Text>
                        </View>
                      </View>
                      <Text style={styles.commentText}>{comment.comment}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noComments}>No hay comentarios aún</Text>
                )}

                <View style={{ height: scale(100) }} />
              </ScrollView>

              <View style={styles.addCommentContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Agregar comentario..."
                  placeholderTextColor={COLORS.gray}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!commentText.trim() || submitting) && styles.sendButtonDisabled]}
                  onPress={handleAddComment}
                  disabled={!commentText.trim() || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Ionicons name="send" size={20} color={COLORS.white} />
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          ) : null}
        </SafeAreaView>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gestión de Incidentes</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Incidentes</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {renderStatusFilter()}

      <FlatList
        data={filteredIncidents}
        renderItem={renderIncidentCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.grayBorder} />
            <Text style={styles.emptyTitle}>Sin incidentes</Text>
            <Text style={styles.emptySubtitle}>No hay incidentes para mostrar</Text>
          </View>
        }
      />

      {renderDetailModal()}
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
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayBorder,
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: scale(17),
    fontWeight: '600',
    color: COLORS.black,
  },
  refreshButton: {
    width: scale(40),
    height: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterScroll: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayBorder,
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
    backgroundColor: COLORS.grayLight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: COLORS.black,
  },
  filterText: {
    fontSize: scale(13),
    color: COLORS.gray,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: scale(16),
    paddingBottom: scale(100),
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    color: COLORS.black,
  },
  cardReference: {
    fontSize: scale(11),
    color: COLORS.gray,
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
    color: COLORS.gray,
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
    color: COLORS.gray,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: scale(60),
  },
  emptyTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.black,
    marginTop: scale(16),
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.gray,
    marginTop: scale(4),
  },
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
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayBorder,
  },
  modalTitle: {
    fontSize: scale(17),
    fontWeight: '600',
    color: COLORS.black,
  },
  detailScroll: {
    flex: 1,
  },
  detailContent: {
    padding: scale(16),
  },
  referenceNumber: {
    fontSize: scale(12),
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: scale(4),
  },
  detailTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.black,
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
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: scale(20),
    marginBottom: scale(8),
  },
  detailDescription: {
    fontSize: scale(15),
    color: COLORS.black,
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
    backgroundColor: COLORS.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  reporterName: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.black,
  },
  reporterDate: {
    fontSize: scale(13),
    color: COLORS.gray,
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
    borderColor: COLORS.grayBorder,
    backgroundColor: COLORS.white,
    gap: scale(6),
  },
  statusButtonText: {
    fontSize: scale(13),
    color: COLORS.gray,
    fontWeight: '500',
  },
  commentCard: {
    backgroundColor: COLORS.white,
    borderRadius: scale(10),
    padding: scale(12),
    marginBottom: scale(8),
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
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
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(10),
  },
  commentMeta: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.black,
  },
  commentDate: {
    fontSize: scale(11),
    color: COLORS.gray,
  },
  commentText: {
    fontSize: scale(14),
    color: COLORS.black,
    lineHeight: scale(20),
  },
  noComments: {
    textAlign: 'center',
    color: COLORS.gray,
    paddingVertical: scale(20),
    fontSize: scale(14),
  },
  addCommentContainer: {
    flexDirection: 'row',
    padding: scale(12),
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayBorder,
    gap: scale(8),
    paddingBottom: Platform.OS === 'ios' ? scale(24) : scale(12),
  },
  commentInput: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    fontSize: scale(15),
    maxHeight: scale(80),
    color: COLORS.black,
  },
  sendButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
});