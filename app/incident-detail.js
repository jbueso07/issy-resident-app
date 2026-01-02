// app/incident-detail.js
// ISSY Resident App - Incident Detail Screen

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getIncidentById, addIncidentComment } from '../src/services/api';
import { useTranslation } from 'react-i18next';

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
  green: '#10B981',
};

const getStatusConfig = (t) => ({
  reported: { label: t('incidentDetail.status.reported'), color: COLORS.cyan, bg: '#DBEAFE', icon: 'alert-circle' },
  in_progress: { label: t('incidentDetail.status.inProgress'), color: '#F59E0B', bg: '#FEF3C7', icon: 'time' },
  resolved: { label: t('incidentDetail.status.resolved'), color: COLORS.green, bg: '#D1FAE5', icon: 'checkmark-circle' },
  closed: { label: t('incidentDetail.status.closed'), color: COLORS.gray, bg: '#F3F4F6', icon: 'lock-closed' },
});

const getSeverityConfig = (t) => ({
  low: { label: t('incidentDetail.severity.low'), color: COLORS.cyanLight },
  medium: { label: t('incidentDetail.severity.medium'), color: COLORS.cyan },
  high: { label: t('incidentDetail.severity.high'), color: '#F59E0B' },
  critical: { label: t('incidentDetail.severity.critical'), color: COLORS.red },
});

const getTypeLabels = (t) => ({
  security: t('incidentDetail.types.security'),
  theft: t('incidentDetail.types.theft'),
  vandalism: t('incidentDetail.types.vandalism'),
  noise_complaint: t('incidentDetail.types.noiseComplaint'),
  parking_violation: t('incidentDetail.types.parkingViolation'),
  maintenance: t('incidentDetail.types.maintenance'),
  cleaning: t('incidentDetail.types.cleaning'),
  lighting: t('incidentDetail.types.lighting'),
  water: t('incidentDetail.types.water'),
  elevator: t('incidentDetail.types.elevator'),
  other: t('incidentDetail.types.other'),
});

export default function IncidentDetailScreen() {
  const { t } = useTranslation();
  const STATUS_CONFIG = getStatusConfig(t);
  const SEVERITY_CONFIG = getSeverityConfig(t);
  const TYPE_LABELS = getTypeLabels(t);
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (id) {
      loadIncident();
    }
  }, [id]);

  const loadIncident = async () => {
    try {
      setLoading(true);
      const result = await getIncidentById(id);
      if (result.success) {
        setIncident(result.data.incident || result.data);
      } else {
        Alert.alert(t('common.error'), t('incidentDetail.errors.loadFailed'));
        router.back();
      }
    } catch (error) {
      console.error('Error loading incident:', error);
      Alert.alert(t('common.error'), t('incidentDetail.errors.loadError'));
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    try {
      setSubmittingComment(true);
      const result = await addIncidentComment(id, commentText.trim());
      
      if (result.success) {
        setCommentText('');
        // Reload incident to get updated comments
        loadIncident();
      } else {
        Alert.alert(t('common.error'), result.error || t('incidentDetail.errors.commentFailed'));
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert(t('common.error'), t('incidentDetail.errors.commentError'));
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('incidentDetail.title')}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.cyan} />
          <Text style={styles.loadingText}>{t('incidentDetail.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!incident) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('incidentDetail.title')}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.gray} />
          <Text style={styles.errorText}>{t('incidentDetail.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const status = STATUS_CONFIG[incident.status] || STATUS_CONFIG.reported;
  const severity = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.medium;
  const typeLabel = TYPE_LABELS[incident.type] || incident.type;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('incidentDetail.title')}</Text>
        <TouchableOpacity onPress={loadIncident} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color={COLORS.cyan} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Card */}
          <View style={styles.statusCard}>
            <LinearGradient
              colors={[COLORS.lime, COLORS.cyanLight]}
              style={styles.statusGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <View style={styles.statusContent}>
              <View style={styles.statusHeader}>
                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                  <Ionicons name={status.icon} size={14} color={status.color} />
                  <Text style={[styles.statusText, { color: status.color }]}>
                    {status.label}
                  </Text>
                </View>
                <View style={[styles.severityBadge, { backgroundColor: severity.color }]}>
                  <Text style={styles.severityText}>{severity.label}</Text>
                </View>
              </View>
              
              {incident.reference_number && (
                <Text style={styles.referenceNumber}>#{incident.reference_number}</Text>
              )}
              
              <Text style={styles.incidentTitle}>{incident.title}</Text>
              <Text style={styles.incidentType}>{typeLabel}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('incidentDetail.sections.description')}</Text>
            <View style={styles.sectionCard}>
              <Text style={styles.descriptionText}>
                {incident.description || t('incidentDetail.noDescription')}
              </Text>
            </View>
          </View>

          {/* Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('incidentDetail.sections.details')}</Text>
            <View style={styles.sectionCard}>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.gray} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('incidentDetail.details.reportDate')}</Text>
                  <Text style={styles.detailValue}>{formatDate(incident.created_at)}</Text>
                </View>
              </View>

              {incident.location_description && (
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={18} color={COLORS.gray} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>{t('incidentDetail.details.location')}</Text>
                    <Text style={styles.detailValue}>{incident.location_description}</Text>
                  </View>
                </View>
              )}

              {incident.resolved_at && (
                <View style={styles.detailRow}>
                  <Ionicons name="checkmark-done-outline" size={18} color={COLORS.green} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>{t('incidentDetail.details.resolved')}</Text>
                    <Text style={styles.detailValue}>{formatDate(incident.resolved_at)}</Text>
                  </View>
                </View>
              )}

              {incident.resolution_notes && (
                <View style={styles.detailRow}>
                  <Ionicons name="document-text-outline" size={18} color={COLORS.gray} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>{t('incidentDetail.details.resolutionNotes')}</Text>
                    <Text style={styles.detailValue}>{incident.resolution_notes}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Timeline / Status Progress */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('incidentDetail.sections.progress')}</Text>
            <View style={styles.sectionCard}>
              <View style={styles.timeline}>
                {['reported', 'in_progress', 'resolved', 'closed'].map((step, index) => {
                  const stepConfig = STATUS_CONFIG[step];
                  const isActive = step === incident.status;
                  const isPast = ['reported', 'in_progress', 'resolved', 'closed']
                    .indexOf(incident.status) >= index;
                  
                  return (
                    <View key={step} style={styles.timelineStep}>
                      <View style={[
                        styles.timelineDot,
                        isPast && { backgroundColor: stepConfig.color },
                        isActive && styles.timelineDotActive
                      ]}>
                        {isPast && (
                          <Ionicons name="checkmark" size={12} color={COLORS.white} />
                        )}
                      </View>
                      {index < 3 && (
                        <View style={[
                          styles.timelineLine,
                          isPast && index < ['reported', 'in_progress', 'resolved', 'closed'].indexOf(incident.status) && 
                            { backgroundColor: stepConfig.color }
                        ]} />
                      )}
                      <Text style={[
                        styles.timelineLabel,
                        isActive && { color: stepConfig.color, fontWeight: '600' }
                      ]}>
                        {stepConfig.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Comments */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('incidentDetail.sections.comments')} ({incident.comments?.length || 0})
            </Text>
            
            {incident.comments && incident.comments.length > 0 ? (
              <View style={styles.commentsContainer}>
                {incident.comments.map((comment, index) => (
                  <View key={comment.id || index} style={styles.commentCard}>
                    <View style={styles.commentHeader}>
                      <View style={styles.commentAvatar}>
                        <Ionicons name="person" size={14} color={COLORS.white} />
                      </View>
                      <View style={styles.commentMeta}>
                        <Text style={styles.commentAuthor}>
                          {comment.user?.name || t('incidentDetail.user')}
                        </Text>
                        <Text style={styles.commentDate}>
                          {formatShortDate(comment.created_at)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.commentText}>{comment.comment}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.sectionCard}>
                <Text style={styles.noCommentsText}>{t('incidentDetail.noComments')}</Text>
              </View>
            )}
          </View>

          <View style={{ height: scale(120) }} />
        </ScrollView>

        {/* Add Comment Input */}
        <View style={styles.addCommentContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder={t('incidentDetail.addCommentPlaceholder')}
            placeholderTextColor={COLORS.gray}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!commentText.trim() || submittingComment) && styles.sendButtonDisabled
            ]}
            onPress={handleAddComment}
            disabled={!commentText.trim() || submittingComment}
          >
            {submittingComment ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="send" size={20} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.black,
  },
  headerRight: {
    width: scale(40),
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
  loadingText: {
    marginTop: scale(12),
    fontSize: scale(14),
    color: COLORS.gray,
  },
  errorText: {
    marginTop: scale(16),
    fontSize: scale(16),
    color: COLORS.gray,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(21),
    paddingTop: scale(8),
  },

  // Status Card
  statusCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: scale(16),
    overflow: 'hidden',
    marginBottom: scale(16),
  },
  statusGradient: {
    width: scale(8),
  },
  statusContent: {
    flex: 1,
    padding: scale(16),
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
    gap: scale(4),
  },
  statusText: {
    fontSize: scale(12),
    fontWeight: '600',
  },
  severityBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(8),
  },
  severityText: {
    fontSize: scale(11),
    fontWeight: '600',
    color: COLORS.white,
  },
  referenceNumber: {
    fontSize: scale(12),
    color: COLORS.cyan,
    fontWeight: '600',
    marginBottom: scale(4),
  },
  incidentTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: scale(4),
  },
  incidentType: {
    fontSize: scale(13),
    color: COLORS.gray,
  },

  // Sections
  section: {
    marginBottom: scale(16),
  },
  sectionTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: scale(8),
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: scale(12),
    padding: scale(16),
  },
  descriptionText: {
    fontSize: scale(14),
    color: COLORS.black,
    lineHeight: scale(22),
  },

  // Details
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: scale(14),
  },
  detailContent: {
    flex: 1,
    marginLeft: scale(12),
  },
  detailLabel: {
    fontSize: scale(12),
    color: COLORS.gray,
    marginBottom: scale(2),
  },
  detailValue: {
    fontSize: scale(14),
    color: COLORS.black,
  },

  // Timeline
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: scale(8),
  },
  timelineStep: {
    alignItems: 'center',
    flex: 1,
  },
  timelineDot: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: COLORS.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(8),
  },
  timelineDotActive: {
    borderWidth: 2,
    borderColor: COLORS.lime,
  },
  timelineLine: {
    position: 'absolute',
    top: scale(12),
    left: '50%',
    width: '100%',
    height: 2,
    backgroundColor: COLORS.grayLight,
    zIndex: -1,
  },
  timelineLabel: {
    fontSize: scale(10),
    color: COLORS.gray,
    textAlign: 'center',
  },

  // Comments
  commentsContainer: {
    gap: scale(8),
  },
  commentCard: {
    backgroundColor: COLORS.white,
    borderRadius: scale(12),
    padding: scale(12),
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
    backgroundColor: COLORS.cyan,
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
  noCommentsText: {
    fontSize: scale(14),
    color: COLORS.gray,
    textAlign: 'center',
    paddingVertical: scale(8),
  },

  // Add Comment
  addCommentContainer: {
    flexDirection: 'row',
    padding: scale(12),
    paddingHorizontal: scale(16),
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
    gap: scale(8),
    paddingBottom: Platform.OS === 'ios' ? scale(28) : scale(12),
  },
  commentInput: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    fontSize: scale(14),
    maxHeight: scale(80),
    color: COLORS.black,
  },
  sendButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.cyan,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.grayLight,
  },
});