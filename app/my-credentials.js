// app/my-credentials.js
// ISSY Resident App - My Credentials Screen (Tags, Cards, Access Control)

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useTranslation } from '../src/hooks/useTranslation';
import credentialsService from '../src/services/credentialsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ============ COLORES PROHOME ============
const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  bgCardAlt: '#243B44',

  lime: '#AAFF00',
  cyan: '#00E5FF',
  teal: '#00BFA6',
  orange: '#FF8A50',
  purple: '#A78BFA',
  coral: '#FF6B6B',
  indigo: '#818CF8',
  blue: '#60A5FA',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textDark: '#0F1A1E',

  border: 'rgba(255, 255, 255, 0.1)',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
};

// Mapeo de tipos de credencial a iconos y colores
const CREDENTIAL_CONFIG = {
  rfid_card: { icon: 'card-outline', color: COLORS.cyan, label: 'Tarjeta RFID' },
  nfc_tag: { icon: 'radio-outline', color: COLORS.lime, label: 'Tag NFC' },
  pin: { icon: 'keypad-outline', color: COLORS.purple, label: 'PIN' },
  fingerprint: { icon: 'finger-print-outline', color: COLORS.teal, label: 'Huella' },
  face: { icon: 'scan-outline', color: COLORS.indigo, label: 'Facial' },
};

// Mapeo de estados
const STATUS_CONFIG = {
  active: { color: COLORS.success, label: 'Activa', icon: 'checkmark-circle' },
  suspended: { color: COLORS.warning, label: 'Suspendida', icon: 'pause-circle' },
  lost: { color: COLORS.error, label: 'Perdida', icon: 'alert-circle' },
  expired: { color: COLORS.textMuted, label: 'Expirada', icon: 'time' },
  revoked: { color: COLORS.coral, label: 'Revocada', icon: 'close-circle' },
};

export default function MyCredentials() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [credentials, setCredentials] = useState([]);
  const [accessLogs, setAccessLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('credentials'); // 'credentials' | 'logs'

  const loadData = useCallback(async () => {
    try {
      const [credentialsRes, logsRes] = await Promise.all([
        credentialsService.getMyCredentials(),
        credentialsService.getMyAccessLogs({ limit: 20 }),
      ]);

      if (credentialsRes.success) {
        setCredentials(credentialsRes.data || []);
      }
      if (logsRes.success) {
        setAccessLogs(logsRes.data || []);
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleReportLost = async (credential) => {
    Alert.alert(
      t('credentials.reportLost', 'Reportar Perdida'),
      t('credentials.reportLostConfirm', '¿Estás seguro de reportar esta credencial como perdida? Se desactivará inmediatamente.'),
      [
        { text: t('common.cancel', 'Cancelar'), style: 'cancel' },
        {
          text: t('common.confirm', 'Confirmar'),
          style: 'destructive',
          onPress: async () => {
            try {
              await credentialsService.reportLostCredential(credential.id);
              Alert.alert(
                t('common.success', 'Éxito'),
                t('credentials.reportLostSuccess', 'Credencial reportada como perdida. Contacta a administración para obtener una nueva.')
              );
              loadData();
            } catch (error) {
              Alert.alert(t('common.error', 'Error'), error.message);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-HN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderCredentialCard = (credential) => {
    const config = CREDENTIAL_CONFIG[credential.credential_type] || CREDENTIAL_CONFIG.rfid_card;
    const status = STATUS_CONFIG[credential.status] || STATUS_CONFIG.active;

    return (
      <View key={credential.id} style={styles.credentialCard}>
        <View style={styles.credentialHeader}>
          <View style={[styles.credentialIconContainer, { backgroundColor: config.color + '20' }]}>
            <Ionicons name={config.icon} size={28} color={config.color} />
          </View>
          <View style={styles.credentialInfo}>
            <Text style={styles.credentialType}>{config.label}</Text>
            <Text style={styles.credentialNumber}>
              {credential.credential_number?.replace(/(.{4})/g, '$1 ').trim()}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <Ionicons name={status.icon} size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {credential.location_name && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.locationText}>{credential.location_name}</Text>
          </View>
        )}

        <View style={styles.credentialMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>{t('credentials.assignedDate', 'Asignada')}</Text>
            <Text style={styles.metaValue}>{formatDate(credential.assigned_at)}</Text>
          </View>
          {credential.expires_at && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t('credentials.expiresDate', 'Expira')}</Text>
              <Text style={styles.metaValue}>{formatDate(credential.expires_at)}</Text>
            </View>
          )}
          {credential.last_used_at && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t('credentials.lastUsed', 'Último uso')}</Text>
              <Text style={styles.metaValue}>{formatDate(credential.last_used_at)}</Text>
            </View>
          )}
        </View>

        {credential.suspended_by_system && credential.status === 'suspended' && (
          <View style={styles.suspendedWarning}>
            <Ionicons name="warning" size={16} color={COLORS.warning} />
            <Text style={styles.suspendedWarningText}>
              {t('credentials.suspendedBySystem', 'Suspendida automáticamente por pago pendiente')}
            </Text>
          </View>
        )}

        {credential.status === 'active' && (
          <TouchableOpacity
            style={styles.reportLostButton}
            onPress={() => handleReportLost(credential)}
          >
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.coral} />
            <Text style={styles.reportLostText}>
              {t('credentials.reportLost', 'Reportar Perdida')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderAccessLog = (log) => {
    const isEntry = log.access_type === 'entry';

    return (
      <View key={log.id} style={styles.logItem}>
        <View style={[
          styles.logIconContainer,
          { backgroundColor: isEntry ? COLORS.success + '20' : COLORS.coral + '20' }
        ]}>
          <Ionicons
            name={isEntry ? 'enter-outline' : 'exit-outline'}
            size={20}
            color={isEntry ? COLORS.success : COLORS.coral}
          />
        </View>
        <View style={styles.logInfo}>
          <Text style={styles.logType}>
            {isEntry ? t('credentials.entry', 'Entrada') : t('credentials.exit', 'Salida')}
          </Text>
          <Text style={styles.logLocation}>{log.device_name || log.location_name}</Text>
        </View>
        <View style={styles.logTime}>
          <Text style={styles.logDate}>{formatDate(log.access_time)}</Text>
          <Text style={styles.logHour}>{formatTime(log.access_time)}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.cyan} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('credentials.title', 'Mis Credenciales')}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'credentials' && styles.tabActive]}
            onPress={() => setActiveTab('credentials')}
          >
            <Ionicons
              name="card-outline"
              size={20}
              color={activeTab === 'credentials' ? COLORS.cyan : COLORS.textMuted}
            />
            <Text style={[
              styles.tabText,
              activeTab === 'credentials' && styles.tabTextActive
            ]}>
              {t('credentials.myCredentials', 'Credenciales')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'logs' && styles.tabActive]}
            onPress={() => setActiveTab('logs')}
          >
            <Ionicons
              name="time-outline"
              size={20}
              color={activeTab === 'logs' ? COLORS.cyan : COLORS.textMuted}
            />
            <Text style={[
              styles.tabText,
              activeTab === 'logs' && styles.tabTextActive
            ]}>
              {t('credentials.accessHistory', 'Historial')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.cyan}
            />
          }
        >
          {activeTab === 'credentials' ? (
            <>
              {credentials.length > 0 ? (
                credentials.map(renderCredentialCard)
              ) : (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="card-outline" size={48} color={COLORS.textMuted} />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {t('credentials.noCredentials', 'Sin credenciales asignadas')}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {t('credentials.noCredentialsDesc', 'Contacta a la administración para solicitar tu tarjeta o tag de acceso.')}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              {accessLogs.length > 0 ? (
                <View style={styles.logsContainer}>
                  {accessLogs.map(renderAccessLog)}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="time-outline" size={48} color={COLORS.textMuted} />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {t('credentials.noLogs', 'Sin registros de acceso')}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {t('credentials.noLogsDesc', 'Aquí aparecerán tus entradas y salidas registradas.')}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Info card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.cyan} />
            <Text style={styles.infoText}>
              {t('credentials.infoText', 'Tus credenciales de acceso están vinculadas al sistema de control de tu comunidad. Si pierdes tu tarjeta o tag, repórtalo inmediatamente.')}
            </Text>
          </View>

          {/* Espacio para tab bar */}
          <View style={{ height: scale(100) }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    marginBottom: scale(16),
    gap: scale(12),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(12),
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.cyan + '15',
    borderColor: COLORS.cyan,
  },
  tabText: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.cyan,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: scale(16),
  },

  // Credential Card
  credentialCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  credentialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  credentialIconContainer: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(14),
  },
  credentialInfo: {
    flex: 1,
  },
  credentialType: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  credentialNumber: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(20),
  },
  statusText: {
    fontSize: scale(12),
    fontWeight: '600',
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: scale(12),
    paddingTop: scale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  locationText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },

  credentialMeta: {
    flexDirection: 'row',
    marginTop: scale(12),
    gap: scale(16),
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },

  suspendedWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: COLORS.warning + '15',
    padding: scale(12),
    borderRadius: scale(10),
    marginTop: scale(12),
  },
  suspendedWarningText: {
    flex: 1,
    fontSize: scale(12),
    color: COLORS.warning,
  },

  reportLostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    marginTop: scale(12),
    paddingVertical: scale(10),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  reportLostText: {
    fontSize: scale(13),
    fontWeight: '500',
    color: COLORS.coral,
  },

  // Access Logs
  logsContainer: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logIconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  logInfo: {
    flex: 1,
  },
  logType: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  logLocation: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  logTime: {
    alignItems: 'flex-end',
  },
  logDate: {
    fontSize: scale(12),
    color: COLORS.textMuted,
  },
  logHour: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: scale(40),
  },
  emptyIcon: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  emptyTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: scale(32),
    lineHeight: scale(20),
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(12),
    backgroundColor: COLORS.cyan + '10',
    padding: scale(14),
    borderRadius: scale(12),
    marginTop: scale(16),
  },
  infoText: {
    flex: 1,
    fontSize: scale(12),
    color: COLORS.textSecondary,
    lineHeight: scale(18),
  },
});
