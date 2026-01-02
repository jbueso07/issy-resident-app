// app/join-community.js - Unirse a Comunidad - ProHome Dark Theme
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { verifyInvitationCode, acceptInvitationCode } from '../src/services/api';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

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
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  green: '#10B981',
  greenLight: 'rgba(16, 185, 129, 0.15)',
  red: '#EF4444',
  redLight: 'rgba(239, 68, 68, 0.15)',
  yellow: '#F59E0B',
  yellowLight: 'rgba(245, 158, 11, 0.15)',
};

export default function JoinCommunityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { refreshUser } = useAuth();
  
  const [code, setCode] = useState(params.code || '');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');

  // Si viene con código en params, verificar automáticamente
  useEffect(() => {
    if (params.code) {
      handleVerify();
    }
  }, [params.code]);

  const handleVerify = async () => {
    if (!code.trim()) {
      setError(t('joinCommunity.errors.enterCode'));
      return;
    }

    setVerifying(true);
    setError('');
    setInvitation(null);
    
    const res = await verifyInvitationCode(code.trim().toUpperCase());
    setVerifying(false);
    
    if (res.success) {
      setInvitation(res.data);
    } else {
      setError(res.error || t('joinCommunity.errors.invalidCode'));
    }
  };

  const handleAccept = async () => {
    setLoading(true);
    const res = await acceptInvitationCode(code.trim().toUpperCase());
    setLoading(false);
    
    if (res.success) {
      Alert.alert(
        t('joinCommunity.success.title'),
        res.message || t('joinCommunity.success.joined', { name: invitation.location_name }),
        [{ text: t('joinCommunity.success.continue'), onPress: () => {
          if (refreshUser) refreshUser();
          router.replace('/my-unit');
        }}]
      );
    } else {
      Alert.alert(t('common.error'), res.error);
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'residential': return t('joinCommunity.types.residential');
      case 'commercial': return t('joinCommunity.types.commercial');
      case 'industrial': return t('joinCommunity.types.industrial');
      case 'office': return t('joinCommunity.types.office');
      default: return t('joinCommunity.types.community');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('joinCommunity.title')}</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Illustration */}
        <View style={styles.illustration}>
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="home" size={scale(32)} color={COLORS.teal} />
            </View>
            <View style={[styles.iconCircleSmall, { marginLeft: scale(-12) }]}>
              <Ionicons name="people" size={scale(20)} color={COLORS.lime} />
            </View>
          </View>
        </View>

        <Text style={styles.title}>{t('joinCommunity.enterCode')}</Text>
        <Text style={styles.subtitle}>
          {t('joinCommunity.enterCodeHint')}
        </Text>

        {/* Code Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={(t) => {
              setCode(t.toUpperCase());
              setError('');
              setInvitation(null);
            }}
            placeholder={t('joinCommunity.codePlaceholder')}
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
          />
          <TouchableOpacity
            style={[styles.verifyBtn, !code.trim() && styles.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={!code.trim() || verifying}
          >
            {verifying ? (
              <ActivityIndicator color={COLORS.background} size="small" />
            ) : (
              <Ionicons name="search" size={20} color={COLORS.background} />
            )}
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={COLORS.red} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Invitation Preview */}
        {invitation && (
          <View style={styles.invitationCard}>
            <View style={styles.invitationHeader}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.green} />
              <Text style={styles.invitationTitle}>{t('joinCommunity.validInvitation')}</Text>
            </View>

            <View style={styles.invitationBody}>
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{invitation.location_name}</Text>
                <Text style={styles.locationType}>{getTypeLabel(invitation.location_type)}</Text>
              </View>

              {invitation.address && (
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.infoText}>{invitation.address}</Text>
                </View>
              )}

              <View style={styles.infoRow}>
                <Ionicons name="person" size={16} color={COLORS.textSecondary} />
                <Text style={styles.infoText}>{t('joinCommunity.role')}: {invitation.role || t('joinCommunity.resident')}</Text>
              </View>

              {invitation.unit_number && (
                <View style={styles.infoRow}>
                  <Ionicons name="home" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.infoText}>{t('joinCommunity.unit')}: {invitation.unit_number}</Text>
                </View>
              )}

              {invitation.expires_at && (
                <View style={styles.expiresInfo}>
                  <Ionicons name="time" size={14} color={COLORS.yellow} />
                  <Text style={styles.expiresText}>
                    {t('joinCommunity.expires')}: {new Date(invitation.expires_at).toLocaleDateString('es')}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.acceptBtn, loading && styles.acceptBtnDisabled]}
              onPress={handleAccept}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={COLORS.background} />
                  <Text style={styles.acceptBtnText}>{t('joinCommunity.joinTo', { name: invitation.location_name })}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Help Text */}
        {!invitation && (
          <View style={styles.helpSection}>
            <View style={styles.helpIcon}>
              <Ionicons name="help-circle" size={24} color={COLORS.yellow} />
            </View>
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>{t('joinCommunity.help.title')}</Text>
              <Text style={styles.helpText}>
                {t('joinCommunity.help.text')}
              </Text>
            </View>
          </View>
        )}
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
  },
  backBtn: {
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
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  content: {
    flex: 1,
    padding: scale(24),
  },

  illustration: {
    alignItems: 'center',
    marginBottom: scale(24),
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(18),
    backgroundColor: 'rgba(93, 222, 216, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-10deg' }],
  },
  iconCircleSmall: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(14),
    backgroundColor: 'rgba(212, 254, 72, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '10deg' }],
  },

  title: {
    fontSize: scale(22),
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  subtitle: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: scale(32),
    lineHeight: scale(22),
  },

  inputContainer: {
    flexDirection: 'row',
    gap: scale(12),
    marginBottom: scale(16),
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(14),
    padding: scale(16),
    fontSize: scale(18),
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    color: COLORS.textPrimary,
  },
  verifyBtn: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(14),
    backgroundColor: COLORS.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnDisabled: {
    backgroundColor: COLORS.backgroundTertiary,
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
    fontSize: scale(14),
    color: COLORS.red,
    flex: 1,
  },

  // Invitation Card
  invitationCard: {
    backgroundColor: COLORS.card,
    borderRadius: scale(16),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: COLORS.greenLight,
    padding: scale(14),
  },
  invitationTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.green,
  },
  invitationBody: {
    padding: scale(16),
  },
  locationInfo: {
    marginBottom: scale(16),
  },
  locationName: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  locationType: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(10),
  },
  infoText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  expiresInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: scale(8),
    paddingTop: scale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  expiresText: {
    fontSize: scale(13),
    color: COLORS.yellow,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: COLORS.lime,
    padding: scale(16),
    margin: scale(16),
    marginTop: 0,
    borderRadius: scale(12),
  },
  acceptBtnDisabled: {
    backgroundColor: COLORS.backgroundTertiary,
  },
  acceptBtnText: {
    color: COLORS.background,
    fontSize: scale(16),
    fontWeight: '600',
  },

  // Help
  helpSection: {
    flexDirection: 'row',
    marginTop: scale(32),
    padding: scale(16),
    backgroundColor: COLORS.card,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  helpIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.yellowLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  helpText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    lineHeight: scale(20),
  },
});