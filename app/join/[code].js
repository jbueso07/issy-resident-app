// app/join/[code].js
// ISSY Resident App - Join Community via Deep Link - ProHome Dark Theme + i18n

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useTranslation } from '../../src/hooks/useTranslation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const API_URL = 'https://api.joinissy.com/api';

// ProHome Dark Theme Colors
const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  card: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  teal: '#5DDED8',
  lime: '#D4FE48',
  purple: '#6366F1',
  purpleLight: 'rgba(99, 102, 241, 0.15)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  green: '#10B981',
  greenLight: 'rgba(16, 185, 129, 0.15)',
  red: '#EF4444',
  redLight: 'rgba(239, 68, 68, 0.15)',
  yellow: '#F59E0B',
  yellowLight: 'rgba(245, 158, 11, 0.15)',
  blue: '#3B82F6',
  blueLight: 'rgba(59, 130, 246, 0.15)',
};

export default function JoinScreen() {
  const { code } = useLocalSearchParams();
  const router = useRouter();
  const { user, profile, token, refreshProfile } = useAuth();
  const { t, language } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Locale dinámico para fechas
  const getLocale = () => {
    const locales = { es: 'es-HN', en: 'en-US', fr: 'fr-FR', pt: 'pt-BR' };
    return locales[language] || 'es-HN';
  };

  useEffect(() => {
    if (code) {
      verifyInvitation();
    }
  }, [code]);

  const verifyInvitation = async () => {
    try {
      setLoading(true);
      setError('');

      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/invitations/verify/${code}`, {
        headers,
      });
      const data = await response.json();

      if (data.success) {
        setInvitation(data.data);
      } else {
        setError(data.error || t('auth.join.invalidOrExpired'));
      }
    } catch (err) {
      console.error('Error verifying invitation:', err);
      setError(t('auth.join.verifyError'));
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!user || !token) {
      Alert.alert(
        t('auth.login'),
        t('auth.join.needLoginToAccept'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('auth.login'),
            onPress: () => {
              router.push('/login');
            },
          },
        ]
      );
      return;
    }

    try {
      setAccepting(true);
      setError('');

      const response = await fetch(`${API_URL}/invitations/accept/${code}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        
        await refreshProfile();
        
        setTimeout(() => {
          router.replace('/(tabs)/home');
        }, 2000);
      } else {
        setError(data.error || t('auth.join.acceptError'));
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError(t('auth.join.processError'));
    } finally {
      setAccepting(false);
    }
  };

  const formatCurrency = (amount, currency = 'HNL') => {
    const symbol = currency === 'HNL' ? 'L' : '$';
    return `${symbol} ${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'admin': return t('auth.joinCode.roles.admin');
      case 'guard': return t('auth.joinCode.roles.guard');
      case 'superadmin': return t('auth.joinCode.roles.superadmin');
      default: return t('auth.joinCode.roles.resident');
    }
  };

  // =====================================================
  // RENDER: Loading
  // =====================================================
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>{t('auth.join.verifying')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // RENDER: Success
  // =====================================================
  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={80} color={COLORS.green} />
          </View>
          <Text style={styles.successTitle}>{t('auth.join.joinedSuccessfully')}</Text>
          <Text style={styles.successSubtitle}>
            {t('auth.join.nowPartOf', { name: invitation?.location?.name || t('auth.join.theCommunity') })}
          </Text>
          <ActivityIndicator size="small" color={COLORS.purple} style={{ marginTop: scale(20) }} />
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // RENDER: Error (no invitation)
  // =====================================================
  if (error && !invitation) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="close-circle" size={80} color={COLORS.red} />
          </View>
          <Text style={styles.errorTitle}>{t('auth.join.invalidInvitation')}</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace('/(tabs)/home')}
          >
            <Text style={styles.secondaryButtonText}>{t('auth.join.goToHome')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // RENDER: Invitation Details
  // =====================================================
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('auth.join.invitation')}</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Icon */}
        <View style={styles.mainIconContainer}>
          <View style={styles.mainIcon}>
            <Text style={{ fontSize: scale(48) }}>
              {invitation?.type === 'rental' ? '🏠' : '🏘️'}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{t('auth.join.youAreInvited')}</Text>
        <Text style={styles.subtitle}>{t('auth.join.reviewDetails')}</Text>

        {/* Type Badge */}
        <View style={[
          styles.typeBadge,
          { backgroundColor: invitation?.type === 'rental' ? COLORS.blueLight : COLORS.purpleLight }
        ]}>
          <Text style={[
            styles.typeBadgeText,
            { color: invitation?.type === 'rental' ? COLORS.blue : COLORS.purple }
          ]}>
            {invitation?.type === 'rental'
              ? `🏠 ${t('auth.join.tenantInvitation')}`
              : `🏘️ ${t('auth.join.communityInvitation')}`}
          </Text>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          {/* Organization invitation */}
          {invitation?.type === 'organization' && (
            <>
              <DetailRow label={t('auth.join.community')} value={invitation.location_name || invitation.location?.name || 'N/A'} t={t} />
              <DetailRow label={t('auth.join.address')} value={invitation.address || invitation.location?.address || 'N/A'} t={t} />
              <DetailRow label={t('auth.join.city')} value={invitation.country || invitation.location?.city || 'N/A'} t={t} />
              <DetailRow label={t('auth.join.assignedRole')} value={invitation.role_label || getRoleName(invitation.role)} t={t} />
            </>
          )}

          {/* Public code invitation */}
          {invitation?.type === 'public_code' && (
            <>
              <DetailRow label={t('auth.join.community')} value={invitation.location_name || 'N/A'} t={t} />
              <DetailRow label={t('auth.join.address')} value={invitation.address || 'N/A'} t={t} />
              <DetailRow label="Tipo" value={invitation.location_type_label || 'N/A'} t={t} />
            </>
          )}

          {/* Rental invitation */}
          {invitation?.type === 'rental' && (
            <>
              <DetailRow label={t('auth.join.property')} value={invitation.property || invitation.property?.name || 'N/A'} t={t} />
              <DetailRow label={t('auth.join.unit')} value={invitation.unit || invitation.unit?.unit_number || 'N/A'} t={t} />
              {(invitation.rent_amount || invitation.lease) && (
                <>
                  <DetailRow
                    label={t('auth.join.monthlyRent')}
                    value={formatCurrency(invitation.rent_amount || invitation.lease?.rent_amount, invitation.currency || invitation.lease?.currency)}
                    t={t}
                  />
                  <DetailRow
                    label={t('auth.join.startDate')}
                    value={invitation.lease_period || (invitation.lease?.start_date ? new Date(invitation.lease.start_date).toLocaleDateString(getLocale()) : 'N/A')}
                    t={t}
                  />
                </>
              )}
            </>
          )}

          {/* Invited by */}
          {invitation?.invited_by && (
            <DetailRow
              label={t('auth.join.invitedBy')}
              value={invitation.invited_by.name || invitation.invited_by}
              isLast
              t={t}
            />
          )}

          {/* Requires approval notice */}
          {invitation?.requires_approval && (
            <View style={styles.approvalNotice}>
              <Ionicons name="time" size={16} color={COLORS.yellow} />
              <Text style={styles.approvalNoticeText}>
                Tu solicitud será revisada por un administrador
              </Text>
            </View>
          )}
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="warning" size={18} color={COLORS.red} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* User status */}
        {!user && (
          <View style={styles.warningBox}>
            <Ionicons name="information-circle" size={18} color={COLORS.yellow} />
            <Text style={styles.warningText}>{t('auth.join.needLoginToAccept')}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, accepting && styles.buttonDisabled]}
            onPress={acceptInvitation}
            disabled={accepting}
          >
            {accepting ? (
              <ActivityIndicator size="small" color={COLORS.background} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.background} />
                <Text style={styles.primaryButtonText}>
                  {user ? t('auth.join.acceptInvitation') : t('auth.join.loginAndAccept')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace('/(tabs)/home')}
          >
            <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: scale(40) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Detail Row Component
const DetailRow = ({ label, value, isLast, t }) => (
  <View style={[styles.detailRow, isLast && styles.detailRowLast]}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

// =====================================================
// STYLES
// =====================================================
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
  },
  backButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerTitle: {
    fontSize: scale(17),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
    padding: scale(24),
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(24),
  },
  loadingText: {
    marginTop: scale(16),
    fontSize: scale(15),
    color: COLORS.textSecondary,
  },
  mainIconContainer: {
    alignItems: 'center',
    marginBottom: scale(24),
  },
  mainIcon: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(24),
    backgroundColor: COLORS.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  subtitle: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: scale(24),
  },
  typeBadge: {
    alignSelf: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    marginBottom: scale(20),
  },
  typeBadgeText: {
    fontSize: scale(14),
    fontWeight: '500',
  },
  detailsCard: {
    backgroundColor: COLORS.card,
    borderRadius: scale(16),
    padding: scale(20),
    marginBottom: scale(20),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'right',
    marginLeft: scale(16),
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: COLORS.redLight,
    padding: scale(12),
    borderRadius: scale(10),
    marginBottom: scale(16),
  },
  errorText: {
    flex: 1,
    fontSize: scale(14),
    color: COLORS.red,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: COLORS.yellowLight,
    padding: scale(12),
    borderRadius: scale(10),
    marginBottom: scale(16),
  },
  warningText: {
    flex: 1,
    fontSize: scale(14),
    color: COLORS.yellow,
  },
  actions: {
    gap: scale(12),
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: COLORS.lime,
    paddingVertical: scale(16),
    borderRadius: scale(12),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.background,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
  },
  secondaryButtonText: {
    fontSize: scale(15),
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  successIconContainer: {
    marginBottom: scale(24),
  },
  successTitle: {
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  successSubtitle: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorIconContainer: {
    marginBottom: scale(24),
  },
  errorTitle: {
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  errorSubtitle: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: scale(24),
  },
  approvalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: COLORS.yellowLight,
    padding: scale(12),
    borderRadius: scale(10),
    marginTop: scale(12),
  },
  approvalNoticeText: {
    flex: 1,
    fontSize: scale(13),
    color: COLORS.yellow,
  },
});