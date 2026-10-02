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
import PhotoGallery from '../src/components/PhotoGallery';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../src/context/AuthContext';
import {
  IncidentChat,
  IncidentComposer,
  INCIDENT_CLOSED_STATUSES,
} from '../src/components/IncidentChat';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// Tema oscuro de la app (app.json → userInterfaceStyle: "dark"),
// misma paleta que app/incidents.js y app/admin/incidents.js.
const COLORS = {
  lime: '#D4FE48',
  cyan: '#009FF5',
  cyanLight: '#11D6E6',
  white: '#FFFFFF',
  background: '#0F1A1A',
  card: '#1A2C2C',
  cardAlt: '#243636',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  red: '#FA5967',
  green: '#10B981',
  yellow: '#F59E0B',
};

const getStatusConfig = (t) => ({
  reported: { label: t('incidentDetail.status.reported'), color: COLORS.cyan, bg: COLORS.cyan + '26', icon: 'alert-circle' },
  in_progress: { label: t('incidentDetail.status.inProgress'), color: COLORS.yellow, bg: COLORS.yellow + '26', icon: 'time' },
  resolved: { label: t('incidentDetail.status.resolved'), color: COLORS.green, bg: COLORS.green + '26', icon: 'checkmark-circle' },
  closed: { label: t('incidentDetail.status.closed'), color: COLORS.textSecondary, bg: COLORS.cardAlt, icon: 'lock-closed' },
});

const getSeverityConfig = (t) => ({
  low: { label: t('incidentDetail.severity.low'), color: COLORS.cyanLight },
  medium: { label: t('incidentDetail.severity.medium'), color: COLORS.cyan },
  high: { label: t('incidentDetail.severity.high'), color: COLORS.yellow },
  critical: { label: t('incidentDetail.severity.critical'), color: COLORS.red },
});

const UNIFIED_TYPES = {
  security:            { label: 'Seguridad',            emoji: '🔒' },
  theft:               { label: 'Robo / Hurto',         emoji: '🚨' },
  vandalism:           { label: 'Vandalismo',           emoji: '🔨' },
  suspicious_activity: { label: 'Actividad sospechosa', emoji: '👁️' },
  noise_complaint:     { label: 'Ruido',                emoji: '🔊' },
  parking_violation:   { label: 'Estacionamiento',      emoji: '🚗' },
  fire:                { label: 'Incendio',             emoji: '🔥' },
  medical:             { label: 'Médico',               emoji: '🏥' },
  accident:            { label: 'Accidente',            emoji: '⚠️' },
  maintenance:         { label: 'Mantenimiento',        emoji: '🔧' },
  other:               { label: 'Otro',                 emoji: '📋' },
};

export default function IncidentDetailScreen() {
  const { t } = useTranslation();
  const STATUS_CONFIG = getStatusConfig(t);
  const SEVERITY_CONFIG = getSeverityConfig(t);
  const router = useRouter();
  const { id } = useLocalSearchParams();
  // profile = usuario de ISSY (public.users) devuelto por el backend
  // (/auth/login, /auth/me, google-sync, apple-sync, register): su id es
  // el mismo que comment.user.id. Nunca es el id de Supabase Auth.
  const { profile } = useAuth();
  const currentUserId = profile?.id;
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

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

  const handleSendComment = async () => {
    const text = commentText.trim();
    if (!text || sending || !incident) return;
    setSending(true);
    try {
      const result = await addIncidentComment(id, text);
      if (result.success) {
        // POST /incidents/:id/comments responde { comment: {...} }
        const newComment = result.data?.comment ?? result.data;
        setIncident((prev) => ({
          ...prev,
          comments: [...(prev?.comments || []), newComment],
        }));
        setCommentText('');
      } else {
        Alert.alert(t('common.error'), result.error || t('incidentDetail.errors.commentFailed'));
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert(t('common.error'), t('incidentDetail.errors.commentError'));
    } finally {
      setSending(false);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
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
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('incidentDetail.title')}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.errorText}>{t('incidentDetail.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const status = STATUS_CONFIG[incident.status] || STATUS_CONFIG.reported;
  const severity = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.medium;
  const typeInfo = UNIFIED_TYPES[incident.type] || { label: incident.type, emoji: '📋' };
  const typeLabel = `${typeInfo.emoji} ${typeInfo.label}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
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

          {/* Photos */}
          {incident.photos?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('incidentDetail.sections.photos', { count: incident.photos.length })}
              </Text>
              <PhotoGallery
                photos={incident.photos}
                placeholderColor={COLORS.cardAlt}
              />
            </View>
          )}

          {/* Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('incidentDetail.sections.details')}</Text>
            <View style={styles.sectionCard}>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('incidentDetail.details.reportDate')}</Text>
                  <Text style={styles.detailValue}>{formatDate(incident.created_at)}</Text>
                </View>
              </View>

              {incident.location_description && (
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={18} color={COLORS.textSecondary} />
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
                  <Ionicons name="document-text-outline" size={18} color={COLORS.textSecondary} />
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

          {/* Conversation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('incidentDetail.sections.comments')} ({incident.comments?.length || 0})
            </Text>
            <IncidentChat incident={incident} currentUserId={currentUserId} />
          </View>

          <View style={{ height: scale(24) }} />
        </ScrollView>

        <IncidentComposer
          value={commentText}
          onChangeText={setCommentText}
          onSend={handleSendComment}
          sending={sending}
          closed={INCIDENT_CLOSED_STATUSES.includes(incident.status)}
        />
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerRight: {
    width: 44,
  },
  refreshButton: {
    width: 44,
    height: 44,
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
    color: COLORS.textSecondary,
  },
  errorText: {
    marginTop: scale(16),
    fontSize: scale(16),
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.card,
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
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  incidentType: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },

  // Sections
  section: {
    marginBottom: scale(16),
  },
  sectionTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: scale(12),
    padding: scale(16),
  },
  descriptionText: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
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
    color: COLORS.textSecondary,
    marginBottom: scale(2),
  },
  detailValue: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
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
    backgroundColor: COLORS.cardAlt,
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
    backgroundColor: COLORS.cardAlt,
    zIndex: -1,
  },
  timelineLabel: {
    fontSize: scale(10),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

});