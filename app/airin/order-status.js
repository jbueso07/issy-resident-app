// app/airin/order-status.js
// ISSY × Airin - Estado del Pedido (Polling)
// Línea gráfica ProHome

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { getOrderStatus } from '../../src/services/airinService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ============ COLORES PROHOME ============
const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  bgCardAlt: '#243B44',

  orange: '#FF6B35',
  lime: '#AAFF00',
  cyan: '#00E5FF',
  teal: '#00BFA6',
  coral: '#FF6B6B',
  green: '#10B981',
  purple: '#A78BFA',
  blue: '#60A5FA',
  yellow: '#FBBF24',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',

  border: 'rgba(255, 255, 255, 0.1)',
};

// ============ ORDER STATUSES CONFIG ============
const ORDER_STEPS = [
  {
    key: 'pending_approval',
    label: 'Pendiente',
    description: 'Tu pedido fue recibido y espera confirmación',
    icon: 'hourglass-outline',
    color: COLORS.yellow,
  },
  {
    key: 'sent',
    label: 'Enviado a cocina',
    description: 'El restaurante aceptó tu pedido',
    icon: 'checkmark-circle-outline',
    color: COLORS.blue,
  },
  {
    key: 'cooking',
    label: 'En preparación',
    description: 'Tu pedido se está preparando',
    icon: 'flame-outline',
    color: COLORS.orange,
  },
  {
    key: 'ready',
    label: 'Listo',
    description: 'Tu pedido está listo para recoger',
    icon: 'bag-check-outline',
    color: COLORS.green,
  },
  {
    key: 'billing',
    label: 'Por pagar',
    description: 'Completa el pago para finalizar',
    icon: 'card-outline',
    color: COLORS.purple,
  },
  {
    key: 'closed',
    label: 'Completado',
    description: 'Pedido finalizado. ¡Buen provecho!',
    icon: 'checkmark-done-circle-outline',
    color: COLORS.lime,
  },
];

const POLLING_INTERVAL = 5000; // 5 seconds

export default function OrderStatusScreen() {
  const { order_id } = useLocalSearchParams();
  const [currentStatus, setCurrentStatus] = useState('pending_approval');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollingRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const result = await getOrderStatus(order_id);
      if (result.success) {
        const status = result.data?.status || result.data;
        setCurrentStatus(status);
        setError(null);

        // Stop polling if closed
        if (status === 'closed' && pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [order_id]);

  useEffect(() => {
    fetchStatus();
    pollingRef.current = setInterval(fetchStatus, POLLING_INTERVAL);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchStatus]);

  const currentStepIndex = ORDER_STEPS.findIndex((s) => s.key === currentStatus);
  const currentStepConfig = ORDER_STEPS[currentStepIndex] || ORDER_STEPS[0];

  const handlePay = async () => {
    try {
      await WebBrowser.openBrowserAsync(`https://airin.pro/checkout/${order_id}`);
    } catch (err) {
      console.error('Error opening checkout:', err);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.orange} />
        <Text style={styles.loadingText}>Cargando estado...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        {/* Current status hero */}
        <View style={styles.heroSection}>
          <View style={[styles.heroIconCircle, { backgroundColor: currentStepConfig.color + '20' }]}>
            <Ionicons name={currentStepConfig.icon} size={48} color={currentStepConfig.color} />
          </View>
          <Text style={styles.heroTitle}>{currentStepConfig.label}</Text>
          <Text style={styles.heroDescription}>{currentStepConfig.description}</Text>
          <Text style={styles.orderId}>Pedido #{order_id}</Text>
        </View>

        {/* Steps timeline */}
        <View style={styles.timeline}>
          {ORDER_STEPS.map((step, index) => {
            const isPast = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isFuture = index > currentStepIndex;

            return (
              <View key={step.key} style={styles.timelineItem}>
                {/* Connector line */}
                {index > 0 && (
                  <View style={[
                    styles.timelineConnector,
                    { backgroundColor: isPast || isCurrent ? step.color : COLORS.bgCardAlt }
                  ]} />
                )}

                {/* Dot */}
                <View style={[
                  styles.timelineDot,
                  isPast && { backgroundColor: step.color },
                  isCurrent && { backgroundColor: step.color, borderWidth: 3, borderColor: step.color + '40' },
                  isFuture && { backgroundColor: COLORS.bgCardAlt },
                ]}>
                  {isPast && <Ionicons name="checkmark" size={12} color={COLORS.bgPrimary} />}
                  {isCurrent && <View style={[styles.pulseDot, { backgroundColor: COLORS.textPrimary }]} />}
                </View>

                {/* Label */}
                <Text style={[
                  styles.timelineLabel,
                  isCurrent && { color: step.color, fontWeight: '700' },
                  isFuture && { color: COLORS.textMuted },
                ]}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={COLORS.coral} />
            <Text style={styles.errorText}>Error de conexión. Reintentando...</Text>
          </View>
        )}
      </View>

      {/* Bottom actions */}
      <View style={styles.bottomActions}>
        {currentStatus === 'billing' && (
          <TouchableOpacity style={styles.payButton} onPress={handlePay}>
            <Ionicons name="card-outline" size={20} color={COLORS.textPrimary} />
            <Text style={styles.payButtonText}>Pagar ahora</Text>
          </TouchableOpacity>
        )}

        {currentStatus === 'closed' && (
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => router.replace('/airin')}
          >
            <Text style={styles.doneButtonText}>Volver a restaurantes</Text>
          </TouchableOpacity>
        )}

        {currentStatus !== 'closed' && currentStatus !== 'billing' && (
          <View style={styles.pollingIndicator}>
            <ActivityIndicator size="small" color={COLORS.orange} />
            <Text style={styles.pollingText}>Actualizando cada 5 segundos</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ============ ESTILOS ============
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: scale(12),
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(20),
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingTop: scale(24),
    paddingBottom: scale(32),
  },
  heroIconCircle: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(48),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  heroTitle: {
    fontSize: scale(22),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(6),
  },
  heroDescription: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  orderId: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  // Timeline
  timeline: {
    paddingLeft: scale(8),
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(16),
    position: 'relative',
  },
  timelineConnector: {
    position: 'absolute',
    left: scale(9),
    top: -scale(16),
    width: 2,
    height: scale(16),
  },
  timelineDot: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  pulseDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  timelineLabel: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: COLORS.coral + '15',
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    borderRadius: scale(10),
    marginTop: scale(16),
  },
  errorText: {
    fontSize: scale(12),
    color: COLORS.coral,
    fontWeight: '500',
  },

  // Bottom
  bottomActions: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(20),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  payButton: {
    backgroundColor: COLORS.purple,
    borderRadius: scale(14),
    paddingVertical: scale(15),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
  },
  payButtonText: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  doneButton: {
    backgroundColor: COLORS.teal,
    borderRadius: scale(14),
    paddingVertical: scale(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pollingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
  },
  pollingText: {
    fontSize: scale(12),
    color: COLORS.textMuted,
  },
});
