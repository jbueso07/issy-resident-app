// src/components/MyAccessesTab.js
// ISSY - Real "Mis Accesos" tab showing QR codes received in-app

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useTranslation } from '../hooks/useTranslation';
import { getReceivedQRCodes } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

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
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textDark: '#0F1A1E',
  border: 'rgba(255, 255, 255, 0.1)',
  gradientStart: '#00BFA6',
  gradientEnd: '#AAFF00',
};

const IssyLogoNegro = require('../../assets/isologotipo-negro.png');

const MyAccessesTab = () => {
  const { t } = useTranslation();
  const [receivedQRs, setReceivedQRs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedQR, setSelectedQR] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    loadReceivedQRs();
  }, []);

  const loadReceivedQRs = async () => {
    try {
      const result = await getReceivedQRCodes();
      if (result.success) {
        setReceivedQRs(result.data || []);
      }
    } catch (error) {
      console.error('Error loading received QRs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReceivedQRs();
  }, []);

  const isQRActive = (qr) => {
    if (qr.status !== 'active') return false;
    if (qr.valid_until && new Date(qr.valid_until) < new Date()) return false;
    return true;
  };

  const getTypeConfig = (type) => {
    switch (type) {
      case 'single': return { label: 'Uso Único', color: COLORS.coral, bg: COLORS.coral + '20' };
      case 'temporary': return { label: 'Temporal', color: COLORS.purple, bg: COLORS.purple + '20' };
      case 'frequent': return { label: 'Permanente', color: COLORS.lime, bg: COLORS.lime + '20' };
      default: return { label: type, color: COLORS.cyan, bg: COLORS.cyan + '20' };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });
  };

  const getValidityText = (qr) => {
    if (qr.qr_type === 'frequent') return 'Acceso permanente';
    if (qr.valid_until) {
      const until = new Date(qr.valid_until);
      const now = new Date();
      if (until < now) return 'Expirado';
      const diff = until - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      if (hours > 24) return `Válido hasta ${formatDate(qr.valid_until)}`;
      if (hours > 0) return `Expira en ${hours}h ${mins}m`;
      return `Expira en ${mins} min`;
    }
    return '';
  };

  const handleShareQRImage = async () => {
    if (!cardRef.current) return;
    setSharingImage(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir código QR - ISSY', UTI: 'public.png' });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setSharingImage(false);
    }
  };

  // Active QRs first, then expired
  const activeQRs = receivedQRs.filter(isQRActive);
  const expiredQRs = receivedQRs.filter(qr => !isQRActive(qr));

  const renderQRCard = (qr) => {
    const typeConfig = getTypeConfig(qr.qr_type);
    const active = isQRActive(qr);
    const creator = qr.creator;

    return (
      <TouchableOpacity
        key={qr.id}
        style={[styles.qrCard, !active && styles.qrCardExpired]}
        onPress={() => {
          setSelectedQR(qr);
          setShowQRModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.qrCardContent}>
          {/* Header */}
          <View style={styles.qrCardTopRow}>
            <View style={[styles.typeBadge, { backgroundColor: typeConfig.bg }]}>
              <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
            </View>
            {active ? (
              <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.statusBadge}>
                <Text style={[styles.statusBadgeText, { color: COLORS.textDark }]}>ACTIVO</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: COLORS.bgCardAlt }]}>
                <Text style={styles.statusBadgeText}>EXPIRADO</Text>
              </View>
            )}
          </View>

          {/* From */}
          {creator && (
            <View style={styles.fromRow}>
              <View style={styles.fromAvatar}>
                {creator.profile_image ? (
                  <Image source={{ uri: creator.profile_image }} style={styles.fromAvatarImg} />
                ) : (
                  <Text style={styles.fromAvatarText}>{creator.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fromName}>{creator.name}</Text>
                <Text style={styles.fromUnit}>
                  {creator.house_number ? `Casa ${creator.house_number}` : 'Te envió acceso'}
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={24} color={active ? COLORS.teal : COLORS.textMuted} />
            </View>
          )}

          {/* Visitor info */}
          <Text style={styles.visitorLabel}>Registrado como:</Text>
          <Text style={styles.visitorName}>{qr.visitor_name}</Text>

          {/* Validity */}
          <Text style={styles.validityText}>{getValidityText(qr)}</Text>

          {/* Quick action */}
          {active && (
            <View style={styles.tapHint}>
              <Ionicons name="qr-code-outline" size={14} color={COLORS.cyan} />
              <Text style={styles.tapHintText}>Toca para ver tu QR</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ============================================
  // EMPTY STATE
  // ============================================
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.cyan} />
      </View>
    );
  }

  if (receivedQRs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="key-outline" size={scale(48)} color={COLORS.teal} />
        </View>
        <Text style={styles.emptyTitle}>{t('visits.myAccesses.title') || 'Mis Accesos'}</Text>
        <Text style={styles.emptySubtitle}>
          Aquí aparecerán los códigos QR que te envíen dentro de ISSY
        </Text>
        <View style={styles.exampleContainer}>
          <Text style={styles.exampleTitle}>¿Cómo funciona?</Text>
          <View style={styles.featureRow}>
            <Ionicons name="paper-plane-outline" size={scale(18)} color={COLORS.lime} />
            <Text style={styles.featureText}>Alguien te envía un QR desde su app</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="notifications-outline" size={scale(18)} color={COLORS.lime} />
            <Text style={styles.featureText}>Te aparece aquí automáticamente</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="qr-code-outline" size={scale(18)} color={COLORS.lime} />
            <Text style={styles.featureText}>Muestra el QR al guardia o al lector</Text>
          </View>
        </View>
      </View>
    );
  }

  // ============================================
  // LIST VIEW
  // ============================================
  return (
    <View>
      {activeQRs.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.teal} /> Accesos Activos ({activeQRs.length})
          </Text>
          {activeQRs.map(renderQRCard)}
        </>
      )}

      {expiredQRs.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: COLORS.textMuted, marginTop: scale(20) }]}>
            Anteriores ({expiredQRs.length})
          </Text>
          {expiredQRs.slice(0, 5).map(renderQRCard)}
        </>
      )}

      {/* QR View Modal */}
      <Modal
        visible={showQRModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalContainer}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Text style={styles.modalCancel}>Cerrar</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Tu Código QR</Text>
              <View style={{ width: scale(60) }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              {selectedQR && (
                <>
                  <View ref={cardRef} style={styles.shareableCard} collapsable={false}>
                    <LinearGradient
                      colors={['#0D2B2F', '#1A3A3E', '#0D2B2F']}
                      style={styles.shareableGradient}
                    >
                      {/* Header */}
                      <Text style={styles.shareableTitle}>Código de Acceso</Text>
                      {selectedQR.creator && (
                        <Text style={styles.shareableFrom}>
                          Enviado por {selectedQR.creator.name}
                          {selectedQR.creator.house_number ? ` • Casa ${selectedQR.creator.house_number}` : ''}
                        </Text>
                      )}

                      {/* QR Code */}
                      <View style={styles.shareableQRBox}>
                        <QRCode
                          value={selectedQR.qr_code}
                          size={scale(200)}
                          backgroundColor="#FFFFFF"
                          color="#000000"
                        />
                      </View>

                      {/* Info */}
                      <Text style={styles.shareableVisitor}>{selectedQR.visitor_name}</Text>
                      <Text style={styles.shareableValidity}>{getValidityText(selectedQR)}</Text>

                      {/* Footer */}
                      <View style={styles.shareableFooter}>
                        <Text style={styles.poweredByText}>powered by</Text>
                        <Image source={IssyLogoNegro} style={styles.issyLogoImage} resizeMode="contain" />
                      </View>
                    </LinearGradient>
                  </View>

                  {/* Share Button */}
                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={handleShareQRImage}
                    disabled={sharingImage}
                  >
                    {sharingImage ? (
                      <ActivityIndicator color={COLORS.textDark} size="small" />
                    ) : (
                      <>
                        <Ionicons name="share-outline" size={22} color={COLORS.textDark} style={{ marginRight: scale(8) }} />
                        <Text style={styles.shareButtonText}>Compartir QR</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(60),
  },
  emptyContainer: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(20),
    padding: scale(24),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: 'rgba(0,191,166,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  emptyTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scale(20),
    marginBottom: scale(24),
  },
  exampleContainer: {
    width: '100%',
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: scale(12),
    padding: scale(16),
  },
  exampleTitle: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: scale(12),
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  featureText: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
    marginLeft: scale(12),
  },

  // Section
  sectionTitle: {
    fontSize: scale(15),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(12),
  },

  // QR Card
  qrCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  qrCardExpired: {
    opacity: 0.6,
  },
  qrCardContent: {
    padding: scale(16),
  },
  qrCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  typeBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(8),
  },
  typeBadgeText: {
    fontSize: scale(11),
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(8),
  },
  statusBadgeText: {
    fontSize: scale(11),
    fontWeight: '700',
    color: COLORS.textMuted,
  },

  // From row
  fromRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: scale(12),
    paddingBottom: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  fromAvatar: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: COLORS.teal + '30',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fromAvatarImg: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
  },
  fromAvatarText: {
    fontSize: scale(14),
    fontWeight: '700',
    color: COLORS.teal,
  },
  fromName: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  fromUnit: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },

  visitorLabel: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    marginBottom: scale(2),
  },
  visitorName: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(6),
  },
  validityText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginBottom: scale(8),
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: scale(4),
  },
  tapHintText: {
    fontSize: scale(12),
    color: COLORS.cyan,
    fontWeight: '500',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCancel: {
    fontSize: scale(16),
    color: COLORS.cyan,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalScrollContent: {
    alignItems: 'center',
    padding: scale(20),
  },

  // Shareable card
  shareableCard: {
    width: scale(320),
    borderRadius: scale(20),
    overflow: 'hidden',
  },
  shareableGradient: {
    padding: scale(24),
    alignItems: 'center',
  },
  shareableTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  shareableFrom: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginBottom: scale(20),
  },
  shareableQRBox: {
    backgroundColor: '#FFFFFF',
    padding: scale(16),
    borderRadius: scale(16),
    marginBottom: scale(16),
  },
  shareableVisitor: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  shareableValidity: {
    fontSize: scale(13),
    color: COLORS.teal,
    marginBottom: scale(16),
  },
  shareableFooter: {
    alignItems: 'center',
  },
  poweredByText: {
    fontSize: scale(10),
    color: '#9CBBBB',
    fontWeight: '500',
    marginBottom: scale(4),
  },
  issyLogoImage: {
    width: scale(80),
    height: scale(30),
  },

  // Share button
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    paddingVertical: scale(16),
    paddingHorizontal: scale(32),
    borderRadius: scale(14),
    marginTop: scale(20),
    width: scale(300),
  },
  shareButtonText: {
    color: COLORS.textDark,
    fontSize: scale(16),
    fontWeight: '600',
  },
});

export default MyAccessesTab;