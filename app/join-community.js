// app/join-community.js - Unirse a Comunidad - ProHome Dark Theme
// UPDATED: Support for public community codes with unit nomenclature

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  Dimensions, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { 
  verifyInvitationCode, 
  acceptInvitationCode,
  verifyPublicCode,
  joinWithPublicCode 
} from '../src/services/api';
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

// Nomenclature field labels
const FIELD_LABELS = {
  torre: 'Torre',
  nivel: 'Nivel / Piso',
  apartamento: 'Apartamento',
  casa: 'Casa',
  bloque: 'Bloque',
  avenida: 'Avenida',
  etapa: 'Etapa',
};

const FIELD_ICONS = {
  torre: 'business',
  nivel: 'layers',
  apartamento: 'home',
  casa: 'home',
  bloque: 'grid',
  avenida: 'map',
  etapa: 'layers',
};

export default function JoinCommunityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { refreshProfile } = useAuth();
  
  const [code, setCode] = useState(params.code || '');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');
  
  // Unit details for public code
  const [unitDetails, setUnitDetails] = useState({});
  // General unit number fallback (when no nomenclature configured)
  const [generalUnitNumber, setGeneralUnitNumber] = useState('');

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
    setUnitDetails({});
    setGeneralUnitNumber('');
    
    const upperCode = code.trim().toUpperCase();
    
    // First try personal invitation
    let res = await verifyInvitationCode(upperCode);
    
    // If not found, try public code
    if (!res.success) {
      res = await verifyPublicCode(upperCode);
    }
    
    setVerifying(false);
    
    if (res.success) {
      setInvitation(res.data);
    } else {
      setError(res.error || t('joinCommunity.errors.invalidCode'));
    }
  };

  const handleAccept = async () => {
    const upperCode = code.trim().toUpperCase();
    
    // If it's a public code, validate required fields
    if (invitation?.type === 'public_code') {
      const nomenclature = invitation.unit_nomenclature || {};
      const missingFields = [];
      
      Object.entries(nomenclature).forEach(([key, config]) => {
        if (typeof config === 'object' && config.enabled && config.required) {
          if (!unitDetails[key]?.trim()) {
            missingFields.push(FIELD_LABELS[key] || key);
          }
        }
      });
      
      if (missingFields.length > 0) {
        Alert.alert(
          'Campos requeridos',
          `Por favor completa: ${missingFields.join(', ')}`
        );
        return;
      }
    }
    
    setLoading(true);

    let res;
    if (invitation?.type === 'public_code') {
      // If nomenclature fields exist, send unitDetails; otherwise send general unit number
      const hasNomenclature = getEnabledFields().length > 0;
      const detailsToSend = hasNomenclature ? unitDetails : {};
      const unitNumberToSend = !hasNomenclature ? generalUnitNumber.trim() : null;
      res = await joinWithPublicCode(upperCode, detailsToSend, unitNumberToSend);
    } else {
      res = await acceptInvitationCode(upperCode);
    }
    
    setLoading(false);
    
    if (res.success) {
      const locationName = invitation.location_name || 'la comunidad';
      Alert.alert(
        '¡Solicitud enviada!',
        res.message || `Tu solicitud para unirte a ${locationName} ha sido enviada. Un administrador la revisará pronto.`,
        [{
          text: 'Continuar',
          onPress: () => {
            if (refreshProfile) refreshProfile();
            router.replace('/(tabs)/home');
          }
        }]
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

  // Get enabled fields from nomenclature
  const getEnabledFields = () => {
    if (!invitation?.unit_nomenclature) return [];
    
    return Object.entries(invitation.unit_nomenclature)
      .filter(([key, config]) => typeof config === 'object' && config.enabled)
      .map(([key, config]) => ({
        key,
        label: FIELD_LABELS[key] || key,
        icon: FIELD_ICONS[key] || 'document',
        required: config.required || false,
      }));
  };

  const updateUnitDetail = (key, value) => {
    setUnitDetails(prev => ({ ...prev, [key]: value }));
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
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
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
                <Text style={styles.invitationTitle}>
                  {invitation.type === 'public_code' ? 'Comunidad encontrada' : t('joinCommunity.validInvitation')}
                </Text>
              </View>

              <View style={styles.invitationBody}>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>{invitation.location_name}</Text>
                  <Text style={styles.locationType}>
                    {invitation.location_type_label || getTypeLabel(invitation.location_type)}
                  </Text>
                </View>

                {invitation.address && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.infoText}>{invitation.address}</Text>
                  </View>
                )}

                {/* For personal invitations - show role and unit */}
                {invitation.type !== 'public_code' && (
                  <>
                    <View style={styles.infoRow}>
                      <Ionicons name="person" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.infoText}>
                        {t('joinCommunity.role')}: {invitation.role_label || invitation.role || t('joinCommunity.resident')}
                      </Text>
                    </View>

                    {invitation.unit_number && (
                      <View style={styles.infoRow}>
                        <Ionicons name="home" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.infoText}>{t('joinCommunity.unit')}: {invitation.unit_number}</Text>
                      </View>
                    )}
                  </>
                )}

                {/* For public codes - show unit selection form */}
                {invitation.type === 'public_code' && getEnabledFields().length > 0 && (
                  <View style={styles.unitFormContainer}>
                    <Text style={styles.unitFormTitle}>
                      <Ionicons name="home" size={16} color={COLORS.teal} /> Ingresa tu unidad
                    </Text>
                    <Text style={styles.unitFormSubtitle}>
                      Completa los datos de tu vivienda
                    </Text>

                    {getEnabledFields().map(field => (
                      <View key={field.key} style={styles.unitFieldContainer}>
                        <View style={styles.unitFieldLabel}>
                          <Ionicons name={field.icon} size={16} color={COLORS.textSecondary} />
                          <Text style={styles.unitFieldLabelText}>
                            {field.label}
                            {field.required && <Text style={styles.requiredStar}> *</Text>}
                          </Text>
                        </View>
                        <TextInput
                          style={styles.unitFieldInput}
                          value={unitDetails[field.key] || ''}
                          onChangeText={(value) => updateUnitDetail(field.key, value)}
                          placeholder={`Ingresa ${field.label.toLowerCase()}`}
                          placeholderTextColor={COLORS.textMuted}
                          keyboardType={field.key === 'nivel' || field.key === 'apartamento' ? 'number-pad' : 'default'}
                        />
                      </View>
                    ))}
                  </View>
                )}

                {/* Fallback: Generic unit number field when no nomenclature configured */}
                {invitation.type === 'public_code' && getEnabledFields().length === 0 && (
                  <View style={styles.unitFormContainer}>
                    <Text style={styles.unitFormTitle}>
                      <Ionicons name="home" size={16} color={COLORS.teal} /> Tu unidad
                    </Text>
                    <Text style={styles.unitFormSubtitle}>
                      Ingresa tu número de casa, apartamento o unidad
                    </Text>
                    <TextInput
                      style={styles.unitFieldInput}
                      value={generalUnitNumber}
                      onChangeText={setGeneralUnitNumber}
                      placeholder="Ej: Casa 5, Apto 12-B, Bloque A"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                )}

                {/* Approval notice */}
                {invitation.requires_approval && (
                  <View style={styles.approvalNotice}>
                    <Ionicons name="time" size={16} color={COLORS.yellow} />
                    <Text style={styles.approvalNoticeText}>
                      Tu solicitud será revisada por un administrador
                    </Text>
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
                    <Text style={styles.acceptBtnText}>
                      {invitation.type === 'public_code' 
                        ? 'Enviar solicitud' 
                        : t('joinCommunity.joinTo', { name: invitation.location_name })}
                    </Text>
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
        </ScrollView>
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
  },
  scrollContent: {
    padding: scale(24),
    paddingBottom: scale(40),
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
  
  // Unit Form for public codes
  unitFormContainer: {
    marginTop: scale(16),
    paddingTop: scale(16),
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  unitFormTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  unitFormSubtitle: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginBottom: scale(16),
  },
  unitFieldContainer: {
    marginBottom: scale(14),
  },
  unitFieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: scale(6),
  },
  unitFieldLabelText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  requiredStar: {
    color: COLORS.red,
  },
  unitFieldInput: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(10),
    padding: scale(14),
    fontSize: scale(15),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  
  // Approval notice
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
    fontSize: scale(13),
    color: COLORS.yellow,
    flex: 1,
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