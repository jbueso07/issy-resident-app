import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
  Modal,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { generateResidentQRData, getSecondsUntilChange, getTimeStep } from '../utils/totp';
import { useTranslation } from '../hooks/useTranslation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const COLORS = {
  bgPrimary: '#0F1A1E',
  bgCard: '#1C2E35',
  bgCardAlt: '#243B44',
  lime: '#AAFF00',
  cyan: '#00E5FF',
  teal: '#00BFA6',
  orange: '#FF8A50',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.4)',
  border: 'rgba(255,255,255,0.1)',
};

const TIME_STEP = getTimeStep();

/** Get the current time step index (changes every TIME_STEP seconds) */
const getCurrentStep = () => Math.floor(Date.now() / 1000 / TIME_STEP);

const CompactResidentQR = ({ secret, userId, locationName, houseNumber, fullName, onError }) => {
  const { t } = useTranslation();

  // Core state
  const [qrCode, setQrCode] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(TIME_STEP);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Generation counter — forces QRCode SVG to fully re-mount on each new token
  const [generation, setGeneration] = useState(0);

  // Refs for interval-safe access (avoids stale closures)
  const secretRef = useRef(secret);
  const userIdRef = useRef(userId);
  const lastStepRef = useRef(getCurrentStep());
  const intervalRef = useRef(null);
  const isGeneratingRef = useRef(false);

  // Animations
  const progressAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Keep refs in sync with props
  useEffect(() => {
    secretRef.current = secret;
    userIdRef.current = userId;
  }, [secret, userId]);

  /**
   * Generate a new QR code from TOTP.
   * Uses refs so the interval closure always reads current values.
   */
  const generateQR = useCallback(async (isInitial = false) => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;

    try {
      const s = secretRef.current;
      const u = userIdRef.current;
      if (!s || !u) return;

      const data = await generateResidentQRData(s, u);

      // Batch state updates
      setQrCode(data.code);
      setRemainingSeconds(data.remainingSeconds);
      setLoading(false);
      setGeneration(prev => prev + 1);

      // Restart progress bar
      progressAnim.stopAnimation();
      progressAnim.setValue(data.remainingSeconds / TIME_STEP);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: data.remainingSeconds * 1000,
        useNativeDriver: false,
      }).start();

      // Green flash on every rotation (skip initial load)
      if (!isInitial) {
        flashAnim.setValue(1);
        Animated.sequence([
          Animated.timing(flashAnim, { toValue: 0.5, duration: 120, useNativeDriver: false }),
          Animated.timing(flashAnim, { toValue: 0, duration: 350, useNativeDriver: false }),
        ]).start();
      }
    } catch (error) {
      console.error('[ResidentQR] generation error:', error);
      onError?.(t('qr.errorGenerating'));
      setLoading(false);
    } finally {
      isGeneratingRef.current = false;
    }
  }, [progressAnim, flashAnim, onError, t]);

  /**
   * Main lifecycle — generate immediately, then tick every 200ms
   */
  useEffect(() => {
    if (!secret || !userId) return;

    lastStepRef.current = getCurrentStep();
    generateQR(true);

    intervalRef.current = setInterval(() => {
      setRemainingSeconds(getSecondsUntilChange());

      const step = getCurrentStep();
      if (step !== lastStepRef.current) {
        lastStepRef.current = step;
        generateQR(false);
      }
    }, 200);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [secret, userId, generateQR]);

  // ── Derived ──────────────────────────────────
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const progressColor =
    remainingSeconds <= 2 ? COLORS.orange :
    remainingSeconds <= 4 ? COLORS.cyan :
    COLORS.lime;

  const flashOpacity = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });

  // ── No access ────────────────────────────────
  if (!secret || !userId) {
    return (
      <View style={styles.noAccessContainer}>
        <Ionicons name="lock-closed-outline" size={scale(40)} color={COLORS.textMuted} />
        <Text style={styles.noAccessText}>{t('qr.joinCommunityForQR')}</Text>
      </View>
    );
  }

  // ── Shared QR renderer ───────────────────────
  const renderQR = (size) => (
    <View style={{ position: 'relative' }}>
      {/* key={generation} forces a full unmount/remount of the SVG */}
      <QRCode
        key={`qr-${generation}`}
        value={qrCode || 'LOADING'}
        size={size}
        backgroundColor="#FFFFFF"
        color="#0F1A1E"
      />
      {/* Green flash overlay */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: COLORS.lime, opacity: flashOpacity, borderRadius: 4 },
        ]}
      />
    </View>
  );

  // ── RENDER ───────────────────────────────────
  return (
    <>
      {/* ─── Compact card ─── */}
      <TouchableOpacity style={styles.compactCard} onPress={() => setShowModal(true)} activeOpacity={0.8}>
        <View style={styles.compactLeft}>
          {loading ? (
            <View style={styles.miniQrPlaceholder}>
              <ActivityIndicator size="small" color={COLORS.lime} />
            </View>
          ) : (
            <View style={styles.miniQrWrapper}>{renderQR(scale(50))}</View>
          )}
          <View style={styles.compactInfo}>
            <Text style={styles.compactTitle} maxFontSizeMultiplier={1.2}>{t('qr.myResidentQR')}</Text>
            <Text style={styles.compactSubtitle} maxFontSizeMultiplier={1.1}>
              {houseNumber ? `${t('qr.house')} ${houseNumber}` : locationName}
            </Text>
          </View>
        </View>
        <View style={styles.compactRight}>
          <View style={[styles.timerBadge, remainingSeconds <= 2 && styles.timerBadgeUrgent]}>
            <Text style={[styles.timerBadgeText, remainingSeconds <= 2 && { color: COLORS.orange }]} maxFontSizeMultiplier={1.2}>
              {remainingSeconds}s
            </Text>
          </View>
          <Ionicons name="expand-outline" size={scale(18)} color={COLORS.textSecondary} />
        </View>
      </TouchableOpacity>

      {/* ─── Full-screen modal ─── */}
      <Modal visible={showModal} animationType="fade" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle} maxFontSizeMultiplier={1.2}>{t('qr.myResidentQR')}</Text>
                <Text style={styles.modalSubtitle} maxFontSizeMultiplier={1.1}>{t('qr.personalAccess')}</Text>
              </View>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>{t('qr.live')}</Text>
              </View>
            </View>

            {/* QR */}
            <View style={styles.qrWrapper}>
              {loading ? (
                <View style={styles.qrPlaceholderLg}><ActivityIndicator size="large" color={COLORS.lime} /></View>
              ) : (
                renderQR(scale(200))
              )}
            </View>

            {/* Timer */}
            <View style={styles.timerContainer}>
              <View style={styles.progressBarBg}>
                <Animated.View style={[styles.progressBar, { width: progressWidth, backgroundColor: progressColor }]} />
              </View>
              <View style={styles.timerRow}>
                <Ionicons name="time-outline" size={scale(16)} color={COLORS.textSecondary} />
                <Text style={styles.timerText} maxFontSizeMultiplier={1.2}>
                  {t('qr.newCodeIn', { seconds: remainingSeconds })}
                </Text>
              </View>
            </View>

            {/* User info */}
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Ionicons name="home-outline" size={scale(16)} color={COLORS.teal} />
                <Text style={styles.infoText} maxFontSizeMultiplier={1.1}>
                  {houseNumber ? `${t('qr.house')} ${houseNumber}` : t('qr.notAssigned')} • {locationName}
                </Text>
              </View>
              <Text style={styles.userName} maxFontSizeMultiplier={1.2}>{fullName}</Text>
            </View>

            {/* Security */}
            <View style={styles.securityNotice}>
              <Ionicons name="shield-checkmark" size={scale(14)} color={COLORS.lime} />
              <Text style={styles.securityText} maxFontSizeMultiplier={1.1}>{t('qr.uniqueCode')}</Text>
            </View>

            {/* Close */}
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowModal(false)} activeOpacity={0.7}>
              <Text style={styles.closeButtonText} maxFontSizeMultiplier={1.2}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ── Styles ─────────────────────────────────────
const styles = StyleSheet.create({
  compactCard: { backgroundColor: COLORS.bgCard, borderRadius: scale(16), padding: scale(12), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border },
  compactLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  miniQrWrapper: { backgroundColor: '#FFFFFF', padding: scale(4), borderRadius: scale(8), overflow: 'hidden' },
  miniQrPlaceholder: { width: scale(58), height: scale(58), backgroundColor: COLORS.bgCardAlt, borderRadius: scale(8), alignItems: 'center', justifyContent: 'center' },
  compactInfo: { marginLeft: scale(12), flex: 1 },
  compactTitle: { fontSize: scale(14), fontWeight: '600', color: COLORS.textPrimary },
  compactSubtitle: { fontSize: scale(12), color: COLORS.textSecondary, marginTop: scale(2) },
  compactRight: { alignItems: 'center', gap: scale(6) },
  timerBadge: { backgroundColor: COLORS.bgCardAlt, paddingHorizontal: scale(8), paddingVertical: scale(4), borderRadius: scale(8) },
  timerBadgeUrgent: { backgroundColor: COLORS.orange + '20' },
  timerBadgeText: { fontSize: scale(12), fontWeight: '700', color: COLORS.lime },

  noAccessContainer: { backgroundColor: COLORS.bgCard, borderRadius: scale(16), padding: scale(24), alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  noAccessText: { marginTop: scale(12), fontSize: scale(14), color: COLORS.textSecondary, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: scale(20) },
  modalContent: { backgroundColor: COLORS.bgCard, borderRadius: scale(24), padding: scale(24), width: '100%', maxWidth: scale(340), alignItems: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: scale(20) },
  modalTitle: { fontSize: scale(18), fontWeight: '700', color: COLORS.textPrimary },
  modalSubtitle: { fontSize: scale(13), color: COLORS.textSecondary, marginTop: scale(2) },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,138,80,0.15)', paddingHorizontal: scale(10), paddingVertical: scale(5), borderRadius: scale(12) },
  liveDot: { width: scale(6), height: scale(6), borderRadius: scale(3), backgroundColor: COLORS.orange, marginRight: scale(6) },
  liveText: { fontSize: scale(10), fontWeight: '700', color: COLORS.orange, letterSpacing: 0.5 },

  qrWrapper: { backgroundColor: '#FFFFFF', padding: scale(16), borderRadius: scale(20), marginBottom: scale(20), overflow: 'hidden' },
  qrPlaceholderLg: { width: scale(200), height: scale(200), alignItems: 'center', justifyContent: 'center' },

  timerContainer: { width: '100%', marginBottom: scale(20) },
  progressBarBg: { width: '100%', height: scale(6), backgroundColor: COLORS.bgCardAlt, borderRadius: scale(3), overflow: 'hidden', marginBottom: scale(10) },
  progressBar: { height: '100%', borderRadius: scale(3) },
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  timerText: { fontSize: scale(14), color: COLORS.textSecondary, marginLeft: scale(8) },

  infoContainer: { alignItems: 'center', marginBottom: scale(16) },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(6) },
  infoText: { fontSize: scale(14), color: COLORS.textSecondary, marginLeft: scale(8) },
  userName: { fontSize: scale(20), fontWeight: '700', color: COLORS.textPrimary },

  securityNotice: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(170,255,0,0.1)', paddingHorizontal: scale(16), paddingVertical: scale(10), borderRadius: scale(10), marginBottom: scale(20) },
  securityText: { fontSize: scale(13), color: COLORS.lime, marginLeft: scale(8), fontWeight: '500' },

  closeButton: { backgroundColor: COLORS.bgCardAlt, paddingVertical: scale(14), paddingHorizontal: scale(40), borderRadius: scale(12) },
  closeButtonText: { fontSize: scale(16), fontWeight: '600', color: COLORS.textPrimary },
});

export default CompactResidentQR;