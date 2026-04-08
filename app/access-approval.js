// app/access-approval.js
// ISSY - Access Request Approval Screen (Resident)
// Shows visitor info + swipe-to-approve/reject

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Animated,
  PanResponder,
  Alert,
  Vibration,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const API_URL = 'https://api.joinissy.com/api';

const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  lime: '#AAFF00',
  cyan: '#00E5FF',
  teal: '#00BFA6',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  purple: '#A78BFA',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  border: 'rgba(255,255,255,0.1)',
};

const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;

export default function AccessApprovalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const [requestData, setRequestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [responded, setResponded] = useState(false);
  const [responseAction, setResponseAction] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Swipe animation
  const pan = useRef(new Animated.ValueXY()).current;
  const swipeDirection = useRef(null);

  // Timer
  const timerRef = useRef(null);

  // Fetch request data
  useEffect(() => {
    fetchRequestData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const fetchRequestData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'No estás autenticado');
        router.back();
        return;
      }

      const requestId = params.id;
      if (!requestId) {
        Alert.alert('Error', 'ID de solicitud no válido');
        router.back();
        return;
      }

      const response = await fetch(`${API_URL}/access-requests/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (!result.success || !result.data) {
        Alert.alert('Error', result.message || 'Solicitud no encontrada');
        router.back();
        return;
      }

      setRequestData(result.data);

      // Check if already responded
      if (result.data.status !== 'pending') {
        setResponded(true);
        setResponseAction(result.data.status);
      }

      // Start countdown timer
      if (result.data.expires_at && result.data.status === 'pending') {
        const updateTimer = () => {
          const now = Date.now();
          const expires = new Date(result.data.expires_at).getTime();
          const remaining = Math.max(0, Math.ceil((expires - now) / 1000));
          setRemainingSeconds(remaining);
          if (remaining <= 0) {
            clearInterval(timerRef.current);
            setResponded(true);
            setResponseAction('expired');
          }
        };
        updateTimer();
        timerRef.current = setInterval(updateTimer, 1000);
      }
    } catch (err) {
      console.error('Error fetching access request:', err);
      Alert.alert('Error', 'No se pudo cargar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  // Pan responder for swipe-to-approve
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 10 && !responded && !responding,
      onPanResponderMove: (_, gesture) => {
        pan.setValue({ x: gesture.dx, y: 0 });
        swipeDirection.current = gesture.dx > 0 ? 'right' : 'left';
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          // Swiped right → Approve
          Animated.spring(pan, {
            toValue: { x: SCREEN_WIDTH, y: 0 },
            useNativeDriver: true,
          }).start(() => handleRespond('approved'));
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          // Swiped left → Show rejection form
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
          setRejected(true);
        } else {
          // Snap back
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleRespond = async (action) => {
    if (responding || responded) return;
    setResponding(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const body = { action };
      if (action === 'rejected' && rejectionReason.trim()) {
        body.rejection_reason = rejectionReason.trim();
      }

      const response = await fetch(`${API_URL}/access-requests/${params.id}/respond`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        setResponded(true);
        setResponseAction(action);
        Vibration.vibrate(action === 'approved' ? [0, 150, 50, 150] : 300);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        Alert.alert('Error', result.message || 'No se pudo procesar la respuesta');
        // Reset swipe
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
      }
    } catch (err) {
      console.error('Error responding to request:', err);
      Alert.alert('Error', 'Error de conexión');
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
      }).start();
    } finally {
      setResponding(false);
    }
  };

  // Derive swipe background color
  const swipeBgColor = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH * 0.5, 0, SCREEN_WIDTH * 0.5],
    outputRange: ['rgba(239, 68, 68, 0.15)', 'transparent', 'rgba(16, 185, 129, 0.15)'],
    extrapolate: 'clamp',
  });

  const swipeOpacity = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH * 0.3, 0, SCREEN_WIDTH * 0.3],
    outputRange: [0.8, 0, 0.8],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={COLORS.purple} size="large" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const visitorName = requestData?.visitor_name || params.visitor_name || 'Visitante';
  const guardName = requestData?.guard?.name || params.guard_name || 'Guardia';
  const visitorPhotos = requestData?.visitor_photos || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitud de Ingreso</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Timer */}
      {!responded && remainingSeconds > 0 && (
        <View style={styles.timerBar}>
          <Ionicons name="time-outline" size={16} color={remainingSeconds < 60 ? COLORS.danger : COLORS.purple} />
          <Text style={[styles.timerText, remainingSeconds < 60 && { color: COLORS.danger }]}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </Text>
          <View style={styles.timerProgress}>
            <View
              style={[
                styles.timerProgressFill,
                { width: `${(remainingSeconds / 300) * 100}%` },
                remainingSeconds < 60 && { backgroundColor: COLORS.danger },
              ]}
            />
          </View>
        </View>
      )}

      {/* Visitor info card */}
      <View style={styles.visitorCard}>
        {/* Visitor photos */}
        {visitorPhotos.length > 0 && (
          <View style={styles.photoContainer}>
            <Image source={{ uri: visitorPhotos[0] }} style={styles.visitorPhoto} />
          </View>
        )}

        <View style={styles.visitorIcon}>
          <Ionicons name="person" size={40} color={COLORS.purple} />
        </View>

        <Text style={styles.visitorName}>{visitorName}</Text>
        <Text style={styles.visitorMeta}>Solicita acceso a la comunidad</Text>

        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>Reportado por: {guardName}</Text>
        </View>
      </View>

      {/* Response area */}
      {!responded && !rejected && (
        <View style={styles.swipeContainer}>
          <Animated.View style={[styles.swipeBg, { backgroundColor: swipeBgColor }]}>
            <Animated.View style={[styles.swipeHint, { left: 20, opacity: swipeOpacity }]}>
              <Ionicons name="close-circle" size={32} color={COLORS.danger} />
              <Text style={[styles.swipeHintText, { color: COLORS.danger }]}>Rechazar</Text>
            </Animated.View>
            <Animated.View style={[styles.swipeHint, { right: 20, opacity: swipeOpacity }]}>
              <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
              <Text style={[styles.swipeHintText, { color: COLORS.success }]}>Aprobar</Text>
            </Animated.View>
          </Animated.View>

          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.swipeButton,
              { transform: [{ translateX: pan.x }] },
            ]}
          >
            <Ionicons name="swap-horizontal" size={28} color={COLORS.textPrimary} />
            <Text style={styles.swipeButtonText}>Desliza para responder</Text>
          </Animated.View>
        </View>
      )}

      {/* Rejection form */}
      {!responded && rejected && (
        <View style={styles.rejectionForm}>
          <Text style={styles.rejectionTitle}>Rechazar acceso</Text>
          <TextInput
            style={styles.rejectionInput}
            placeholder="Motivo del rechazo (opcional)"
            placeholderTextColor={COLORS.textMuted}
            value={rejectionReason}
            onChangeText={setRejectionReason}
            multiline
            numberOfLines={3}
          />
          <View style={styles.rejectionActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setRejected(false); setRejectionReason(''); }}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectBtn, responding && { opacity: 0.5 }]}
              disabled={responding}
              onPress={() => handleRespond('rejected')}
            >
              {responding ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.rejectBtnText}>Confirmar Rechazo</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Quick action buttons (fallback for accessibility) */}
      {!responded && !rejected && (
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickReject, responding && { opacity: 0.5 }]}
            disabled={responding}
            onPress={() => setRejected(true)}
          >
            <Ionicons name="close" size={22} color={COLORS.danger} />
            <Text style={[styles.quickActionText, { color: COLORS.danger }]}>Rechazar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickApprove, responding && { opacity: 0.5 }]}
            disabled={responding}
            onPress={() => handleRespond('approved')}
          >
            {responding ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={22} color="#fff" />
                <Text style={styles.quickApproveText}>Aprobar Ingreso</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Result */}
      {responded && (
        <View style={styles.resultContainer}>
          {responseAction === 'approved' && (
            <>
              <Ionicons name="checkmark-circle" size={72} color={COLORS.success} />
              <Text style={[styles.resultTitle, { color: COLORS.success }]}>Acceso Aprobado</Text>
              <Text style={styles.resultSubtitle}>
                El guardia ha sido notificado para permitir el ingreso
              </Text>
            </>
          )}
          {responseAction === 'rejected' && (
            <>
              <Ionicons name="close-circle" size={72} color={COLORS.danger} />
              <Text style={[styles.resultTitle, { color: COLORS.danger }]}>Acceso Rechazado</Text>
              <Text style={styles.resultSubtitle}>
                El guardia ha sido notificado del rechazo
              </Text>
            </>
          )}
          {responseAction === 'expired' && (
            <>
              <Ionicons name="time" size={72} color={COLORS.warning} />
              <Text style={[styles.resultTitle, { color: COLORS.warning }]}>Solicitud Expirada</Text>
              <Text style={styles.resultSubtitle}>
                No se respondió dentro del tiempo límite
              </Text>
            </>
          )}
          <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
            <Text style={styles.doneButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: scale(17),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Timer
  timerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  timerText: {
    fontSize: scale(15),
    fontWeight: '700',
    color: COLORS.purple,
    fontVariant: ['tabular-nums'],
    minWidth: 40,
  },
  timerProgress: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.bgCard,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerProgressFill: {
    height: '100%',
    backgroundColor: COLORS.purple,
    borderRadius: 2,
  },

  // Visitor Card
  visitorCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: COLORS.purple,
  },
  visitorPhoto: {
    width: '100%',
    height: '100%',
  },
  visitorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  visitorName: {
    fontSize: scale(24),
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  visitorMeta: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },

  // Swipe
  swipeContainer: {
    marginHorizontal: 20,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.bgCard,
    overflow: 'hidden',
    justifyContent: 'center',
    marginBottom: 16,
  },
  swipeBg: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  swipeHint: {
    position: 'absolute',
    alignItems: 'center',
  },
  swipeHintText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  swipeButton: {
    width: SCREEN_WIDTH - 80,
    height: 56,
    marginHorizontal: 20,
    borderRadius: 28,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  swipeButtonText: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 8,
  },
  quickReject: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    gap: 6,
  },
  quickActionText: {
    fontSize: scale(15),
    fontWeight: '700',
  },
  quickApprove: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: COLORS.success,
    gap: 6,
  },
  quickApproveText: {
    fontSize: scale(15),
    fontWeight: '700',
    color: '#fff',
  },

  // Rejection
  rejectionForm: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  rejectionTitle: {
    fontSize: scale(17),
    fontWeight: '700',
    color: COLORS.danger,
    marginBottom: 12,
  },
  rejectionInput: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    fontSize: scale(15),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  rejectionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  rejectBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
  },
  rejectBtnText: {
    fontSize: scale(14),
    color: '#fff',
    fontWeight: '700',
  },

  // Result
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  resultTitle: {
    fontSize: scale(24),
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  resultSubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  doneButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  doneButtonText: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
