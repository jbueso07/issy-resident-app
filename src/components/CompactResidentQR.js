import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Animated, TouchableOpacity, Modal } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { generateResidentQRData, getSecondsUntilChange, getTimeStep } from '../utils/totp';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const COLORS = { bgPrimary: '#0F1A1E', bgCard: '#1C2E35', bgCardAlt: '#243B44', lime: '#AAFF00', cyan: '#00E5FF', teal: '#00BFA6', orange: '#FF8A50', textPrimary: '#FFFFFF', textSecondary: 'rgba(255,255,255,0.7)', textMuted: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)' };
const TIME_STEP = getTimeStep();

const CompactResidentQR = ({ secret, userId, locationName, houseNumber, fullName, onError }) => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remainingSeconds, setRemainingSeconds] = useState(TIME_STEP);
  const [showModal, setShowModal] = useState(false);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef(null);

  const generateQR = async () => {
    try {
      const data = await generateResidentQRData(secret, userId);
      setQrData(data);
      setRemainingSeconds(data.remainingSeconds);
      setLoading(false);
      progressAnim.setValue(data.remainingSeconds / TIME_STEP);
      Animated.timing(progressAnim, { toValue: 0, duration: data.remainingSeconds * 1000, useNativeDriver: false }).start();
    } catch (error) {
      onError?.('Error al generar QR');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!secret || !userId) return;
    generateQR();
    intervalRef.current = setInterval(() => {
      const seconds = getSecondsUntilChange();
      setRemainingSeconds(seconds);
      if (seconds <= 0) generateQR();
    }, 100);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [secret, userId]);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const getProgressColor = () => remainingSeconds <= 2 ? COLORS.orange : remainingSeconds <= 4 ? COLORS.cyan : COLORS.lime;

  if (!secret || !userId) return (
    <View style={styles.noAccessContainer}>
      <Ionicons name="lock-closed-outline" size={scale(40)} color={COLORS.textMuted} />
      <Text style={styles.noAccessText}>Únete a una comunidad para obtener tu QR</Text>
    </View>
  );

  return (
    <>
      <TouchableOpacity style={styles.compactCard} onPress={() => setShowModal(true)} activeOpacity={0.8}>
        <View style={styles.compactLeft}>
          {loading ? <View style={styles.miniQrPlaceholder}><ActivityIndicator size="small" color={COLORS.lime} /></View> : <View style={styles.miniQrWrapper}><QRCode value={qrData?.code || 'LOADING'} size={scale(50)} backgroundColor="#FFFFFF" color="#0F1A1E" /></View>}
          <View style={styles.compactInfo}><Text style={styles.compactTitle}>Mi QR de Residente</Text><Text style={styles.compactSubtitle}>{houseNumber ? `Casa ${houseNumber}` : locationName}</Text></View>
        </View>
        <View style={styles.compactRight}><View style={styles.timerBadge}><Text style={styles.timerBadgeText}>{remainingSeconds}s</Text></View><Ionicons name="expand-outline" size={scale(18)} color={COLORS.textSecondary} /></View>
      </TouchableOpacity>
      <Modal visible={showModal} animationType="fade" transparent={true} onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><View><Text style={styles.modalTitle}>Mi QR de Residente</Text><Text style={styles.modalSubtitle}>Acceso personal</Text></View><View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>EN VIVO</Text></View></View>
            <View style={styles.qrWrapper}><QRCode value={qrData?.code || 'LOADING'} size={scale(200)} backgroundColor="#FFFFFF" color="#0F1A1E" /></View>
            <View style={styles.timerContainer}><View style={styles.progressBarBg}><Animated.View style={[styles.progressBar, { width: progressWidth, backgroundColor: getProgressColor() }]} /></View><View style={styles.timerRow}><Ionicons name="time-outline" size={scale(16)} color={COLORS.textSecondary} /><Text style={styles.timerText}>Nuevo código en {remainingSeconds}s</Text></View></View>
            <View style={styles.infoContainer}><View style={styles.infoRow}><Ionicons name="home-outline" size={scale(16)} color={COLORS.teal} /><Text style={styles.infoText}>{houseNumber ? `Casa ${houseNumber}` : 'Sin asignar'} • {locationName}</Text></View><Text style={styles.userName}>{fullName}</Text></View>
            <View style={styles.securityNotice}><Ionicons name="shield-checkmark" size={scale(14)} color={COLORS.lime} /><Text style={styles.securityText}>Código único e intransferible</Text></View>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowModal(false)}><Text style={styles.closeButtonText}>Cerrar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  compactCard: { backgroundColor: COLORS.bgCard, borderRadius: scale(16), padding: scale(12), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border },
  compactLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  miniQrWrapper: { backgroundColor: '#FFFFFF', padding: scale(4), borderRadius: scale(8) },
  miniQrPlaceholder: { width: scale(58), height: scale(58), backgroundColor: COLORS.bgCardAlt, borderRadius: scale(8), alignItems: 'center', justifyContent: 'center' },
  compactInfo: { marginLeft: scale(12), flex: 1 },
  compactTitle: { fontSize: scale(14), fontWeight: '600', color: COLORS.textPrimary },
  compactSubtitle: { fontSize: scale(12), color: COLORS.textSecondary, marginTop: scale(2) },
  compactRight: { alignItems: 'center', gap: scale(6) },
  timerBadge: { backgroundColor: COLORS.bgCardAlt, paddingHorizontal: scale(8), paddingVertical: scale(4), borderRadius: scale(8) },
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
  qrWrapper: { backgroundColor: '#FFFFFF', padding: scale(16), borderRadius: scale(20), marginBottom: scale(20) },
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
