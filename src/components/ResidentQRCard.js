// src/components/ResidentQRCard.js
// ISSY - Dynamic Resident QR Code Component

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { generateResidentQRData, getSecondsUntilChange, getTimeStep } from '../utils/totp';

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
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  border: 'rgba(255, 255, 255, 0.1)',
};

const TIME_STEP = getTimeStep();

const ResidentQRCard = ({ 
  secret, 
  userId, 
  locationName, 
  houseNumber, 
  fullName,
  onError 
}) => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remainingSeconds, setRemainingSeconds] = useState(TIME_STEP);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef(null);

  const generateQR = async () => {
    try {
      const data = await generateResidentQRData(secret, userId);
      setQrData(data);
      setRemainingSeconds(data.remainingSeconds);
      setLoading(false);
      
      progressAnim.setValue(data.remainingSeconds / TIME_STEP);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: data.remainingSeconds * 1000,
        useNativeDriver: false,
      }).start();
      
    } catch (error) {
      console.error('Error generating QR:', error);
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
      
      if (seconds <= 0) {
        generateQR();
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [secret, userId]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const getProgressColor = () => {
    if (remainingSeconds <= 2) return COLORS.orange;
    if (remainingSeconds <= 4) return COLORS.cyan;
    return COLORS.lime;
  };

  if (!secret || !userId) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={scale(32)} color={COLORS.orange} />
          <Text style={styles.errorText}>
            Únete a una comunidad para obtener tu QR de residente
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="person-circle" size={scale(20)} color={COLORS.lime} />
          </View>
          <View>
            <Text style={styles.title}>Mi QR de Residente</Text>
            <Text style={styles.subtitle}>Acceso personal</Text>
          </View>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>EN VIVO</Text>
        </View>
      </View>

      <View style={styles.qrContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.lime} />
            <Text style={styles.loadingText}>Generando código...</Text>
          </View>
        ) : (
          <>
            <View style={styles.qrWrapper}>
              <QRCode
                value={qrData?.code || 'LOADING'}
                size={scale(140)}
                backgroundColor="#FFFFFF"
                color="#0F1A1E"
              />
            </View>

            <View style={styles.timerContainer}>
              <View style={styles.progressBarBg}>
                <Animated.View 
                  style={[
                    styles.progressBar, 
                    { 
                      width: progressWidth,
                      backgroundColor: getProgressColor(),
                    }
                  ]} 
                />
              </View>
              <View style={styles.timerRow}>
                <Ionicons name="time-outline" size={scale(14)} color={COLORS.textSecondary} />
                <Text style={styles.timerText}>
                  Nuevo código en {remainingSeconds}s
                </Text>
              </View>
            </View>

            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Ionicons name="home-outline" size={scale(14)} color={COLORS.teal} />
                <Text style={styles.infoText}>
                  {houseNumber ? `Casa ${houseNumber}` : 'Sin asignar'} • {locationName}
                </Text>
              </View>
              <Text style={styles.userName}>{fullName}</Text>
            </View>

            <View style={styles.securityNotice}>
              <Ionicons name="shield-checkmark" size={scale(12)} color={COLORS.textMuted} />
              <Text style={styles.securityText}>
                Código único e intransferible
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(20),
    padding: scale(16),
    marginBottom: scale(20),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    backgroundColor: 'rgba(170, 255, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(10),
  },
  title: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 138, 80, 0.15)',
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(12),
  },
  liveDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: COLORS.orange,
    marginRight: scale(6),
  },
  liveText: {
    fontSize: scale(10),
    fontWeight: '700',
    color: COLORS.orange,
    letterSpacing: 0.5,
  },
  qrContainer: {
    alignItems: 'center',
  },
  loadingContainer: {
    height: scale(200),
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: scale(12),
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  qrWrapper: {
    backgroundColor: '#FFFFFF',
    padding: scale(12),
    borderRadius: scale(16),
    marginBottom: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  timerContainer: {
    width: '100%',
    marginBottom: scale(16),
  },
  progressBarBg: {
    width: '100%',
    height: scale(4),
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: scale(2),
    overflow: 'hidden',
    marginBottom: scale(8),
  },
  progressBar: {
    height: '100%',
    borderRadius: scale(2),
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginLeft: scale(6),
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: scale(12),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  infoText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginLeft: scale(6),
  },
  userName: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCardAlt,
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(8),
  },
  securityText: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    marginLeft: scale(6),
  },
  errorContainer: {
    alignItems: 'center',
    padding: scale(20),
  },
  errorText: {
    marginTop: scale(12),
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default ResidentQRCard;