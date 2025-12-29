// app/my-subscription.js - Mi Suscripción - ProHome Dark Theme
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Modal, RefreshControl, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import {
  getMySubscriptions, getVerticalPlans, startTrial,
  subscribeToPlan, cancelSubscription, getPaymentMethods
} from '../src/services/api';

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
  red: '#EF4444',
  yellow: '#F59E0B',
};

const VERTICALS = {
  access: { name: 'Control de Acceso', icon: '🔐', color: '#7C3AED' },
  pms: { name: 'Gestor de Propiedades', icon: '🏘️', color: '#1E3A8A' },
  panic: { name: 'Botón de Pánico', icon: '🚨', color: '#DC2626' },
  finance: { name: 'Finanzas Personales', icon: '💰', color: '#059669' },
  marketplace: { name: 'Marketplace', icon: '🛒', color: '#F59E0B' },
};

export default function MySubscriptionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [allPlans, setAllPlans] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  
  // Modal states
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [selectedVertical, setSelectedVertical] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    const [subsRes, plansRes, cardsRes] = await Promise.all([
      getMySubscriptions(),
      getVerticalPlans(),
      getPaymentMethods()
    ]);
    
    if (subsRes.success) setSubscriptions(subsRes.data || []);
    if (plansRes.success) setAllPlans(plansRes.data || []);
    if (cardsRes.success) setPaymentMethods(cardsRes.data || []);
    
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getVerticalSubscription = (vertical) => {
    return subscriptions.find(s => s.plan?.vertical === vertical && ['active', 'trial'].includes(s.status));
  };

  const handleStartTrial = async (plan) => {
    setProcessing(true);
    const res = await startTrial(plan.id);
    setProcessing(false);
    
    if (res.success) {
      Alert.alert('¡Éxito!', res.message || '¡Prueba gratuita activada!');
      setShowPlansModal(false);
      loadData();
    } else {
      Alert.alert('Error', res.error || 'No se pudo activar la prueba');
    }
  };

  const handleSelectPlanForPayment = (plan) => {
    if (paymentMethods.length === 0) {
      Alert.alert(
        'Sin método de pago',
        'Necesitas agregar una tarjeta antes de suscribirte',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Agregar Tarjeta', onPress: () => router.push('/payment-methods') }
        ]
      );
      return;
    }
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handleSubscribe = async (billingPeriod = 'monthly') => {
    const defaultCard = paymentMethods.find(c => c.is_default) || paymentMethods[0];
    if (!defaultCard) {
      Alert.alert('Error', 'No hay método de pago disponible');
      return;
    }

    setProcessing(true);
    const res = await subscribeToPlan(selectedPlan.id, defaultCard.id, billingPeriod);
    setProcessing(false);

    if (res.success) {
      Alert.alert('¡Éxito!', res.message || 'Suscripción activada');
      setShowPaymentModal(false);
      setShowPlansModal(false);
      setSelectedPlan(null);
      loadData();
    } else {
      Alert.alert('Error', res.error || 'No se pudo procesar el pago');
    }
  };

  const handleCancelSubscription = (subscription) => {
    Alert.alert(
      'Cancelar Suscripción',
      '¿Estás seguro? Perderás acceso al finalizar el período actual.',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, Cancelar', style: 'destructive', onPress: async () => {
          const res = await cancelSubscription(subscription.id, 'User requested');
          if (res.success) {
            Alert.alert('Suscripción Cancelada', 'Tu acceso continuará hasta el final del período');
            loadData();
          } else {
            Alert.alert('Error', res.error);
          }
        }}
      ]
    );
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return 0;
    const days = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const openVerticalPlans = (vertical) => {
    setSelectedVertical(vertical);
    setShowPlansModal(true);
  };

  const getPlansForVertical = () => {
    if (!selectedVertical) return [];
    return allPlans.filter(p => p.vertical === selectedVertical && p.is_active);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Cargando suscripciones...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Suscripciones</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.purple} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Subscriptions */}
        {subscriptions.filter(s => ['active', 'trial'].includes(s.status)).map((sub) => {
          const vertical = VERTICALS[sub.plan?.vertical] || {};
          const daysLeft = getDaysRemaining(sub.current_period_end || sub.trial_end);
          
          return (
            <View key={sub.id} style={styles.activeCard}>
              <View style={[styles.activeHeader, { backgroundColor: vertical.color || COLORS.purple }]}>
                <Text style={styles.activeIcon}>{vertical.icon}</Text>
                <Text style={styles.activePlan}>{sub.plan?.name || 'Plan'}</Text>
                <Text style={styles.activePrice}>
                  {sub.status === 'trial' ? 'Prueba Gratuita' : `$${sub.plan?.price_monthly}/mes`}
                </Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {sub.status === 'trial' ? '🎁 TRIAL' : '✓ ACTIVO'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.activeBody}>
                {sub.status === 'trial' && (
                  <View style={styles.trialAlert}>
                    <Ionicons name="time-outline" size={18} color={COLORS.yellow} />
                    <Text style={styles.trialText}>
                      {daysLeft} días restantes de prueba
                    </Text>
                  </View>
                )}
                
                <View style={styles.activeInfo}>
                  <View>
                    <Text style={styles.infoLabel}>Próxima factura</Text>
                    <Text style={styles.infoValue}>
                      {sub.current_period_end 
                        ? new Date(sub.current_period_end).toLocaleDateString('es', { day: 'numeric', month: 'short' })
                        : 'N/A'
                      }
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.infoLabel}>Método</Text>
                    <Text style={styles.infoValue}>
                      {paymentMethods.find(c => c.is_default)?.last_four 
                        ? `•••• ${paymentMethods.find(c => c.is_default).last_four}`
                        : 'Sin tarjeta'
                      }
                    </Text>
                  </View>
                </View>
                
                <View style={styles.activeActions}>
                  <TouchableOpacity style={styles.upgradeBtn}>
                    <Text style={styles.upgradeBtnText}>Cambiar Plan</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelSubscription(sub)}>
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {/* Available Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servicios Disponibles</Text>
          <Text style={styles.sectionSubtitle}>Explora nuestros servicios premium</Text>
          
          {Object.entries(VERTICALS).map(([key, vertical]) => {
            const activeSub = getVerticalSubscription(key);
            
            return (
              <TouchableOpacity 
                key={key} 
                style={styles.serviceCard}
                onPress={() => !activeSub && openVerticalPlans(key)}
                disabled={!!activeSub}
              >
                <View style={[styles.serviceIcon, { backgroundColor: vertical.color + '20' }]}>
                  <Text style={styles.serviceIconText}>{vertical.icon}</Text>
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{vertical.name}</Text>
                  <Text style={styles.serviceStatus}>
                    {activeSub 
                      ? (activeSub.status === 'trial' ? 'En período de prueba' : 'Suscripción activa')
                      : 'Disponible'
                    }
                  </Text>
                </View>
                {activeSub ? (
                  <View style={[styles.activeBadge]}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.green} />
                  </View>
                ) : (
                  <View style={[styles.tryBadge, { backgroundColor: vertical.color }]}>
                    <Text style={styles.tryText}>Probar</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Payment Methods Link */}
        <TouchableOpacity style={styles.linkCard} onPress={() => router.push('/payment-methods')}>
          <View style={styles.linkIcon}>
            <Ionicons name="card-outline" size={22} color={COLORS.purple} />
          </View>
          <View style={styles.linkInfo}>
            <Text style={styles.linkTitle}>Métodos de Pago</Text>
            <Text style={styles.linkSubtitle}>
              {paymentMethods.length > 0 
                ? `${paymentMethods.length} tarjeta(s) guardada(s)`
                : 'Agregar método de pago'
              }
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={{ height: scale(100) }} />
      </ScrollView>

      {/* Plans Modal */}
      <Modal visible={showPlansModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {VERTICALS[selectedVertical]?.icon} {VERTICALS[selectedVertical]?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowPlansModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.plansSubtitle}>Elige el plan que mejor se adapte a ti</Text>

              {getPlansForVertical().map((plan) => (
                <View key={plan.id} style={styles.planCard}>
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    {plan.trial_days > 0 && (
                      <View style={styles.trialBadge}>
                        <Text style={styles.trialBadgeText}>{plan.trial_days} días gratis</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.planPricing}>
                    <Text style={styles.planPrice}>${plan.price_monthly}</Text>
                    <Text style={styles.planPeriod}>/mes</Text>
                  </View>
                  {plan.price_yearly && (
                    <Text style={styles.yearlyPrice}>
                      o ${plan.price_yearly}/año (ahorra 2 meses)
                    </Text>
                  )}

                  <View style={styles.featuresList}>
                    {(plan.features || []).slice(0, 4).map((feature, idx) => (
                      <View key={idx} style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.green} />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.planActions}>
                    {plan.trial_days > 0 && (
                      <TouchableOpacity
                        style={[styles.trialBtn, { backgroundColor: VERTICALS[selectedVertical]?.color || COLORS.purple }]}
                        onPress={() => handleStartTrial(plan)}
                        disabled={processing}
                      >
                        {processing ? (
                          <ActivityIndicator color={COLORS.textPrimary} size="small" />
                        ) : (
                          <Text style={styles.trialBtnText}>Probar Gratis</Text>
                        )}
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.subscribeBtn}
                      onPress={() => handleSelectPlanForPayment(plan)}
                    >
                      <Text style={styles.subscribeBtnText}>Suscribirse</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {getPlansForVertical().length === 0 && (
                <View style={styles.noPlans}>
                  <Ionicons name="cube-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.noPlansText}>No hay planes disponibles</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirmar Suscripción</Text>
              <TouchableOpacity onPress={() => { setShowPaymentModal(false); setSelectedPlan(null); }}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {selectedPlan && (
                <>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryPlan}>{selectedPlan.name}</Text>
                    <Text style={styles.summaryPrice}>${selectedPlan.price_monthly}/mes</Text>
                  </View>

                  <Text style={styles.paymentTitle}>Método de pago</Text>
                  {paymentMethods.length > 0 ? (
                    <View style={styles.selectedCard}>
                      <Text style={styles.selectedCardText}>
                        💳 •••• {paymentMethods.find(c => c.is_default)?.last_four || paymentMethods[0]?.last_four}
                      </Text>
                      <TouchableOpacity onPress={() => router.push('/payment-methods')}>
                        <Text style={styles.changeCardText}>Cambiar</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addCardBtn}
                      onPress={() => router.push('/payment-methods')}
                    >
                      <Text style={styles.addCardBtnText}>+ Agregar tarjeta</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.payBtn, processing && styles.payBtnDisabled]}
                    onPress={() => handleSubscribe('monthly')}
                    disabled={processing || paymentMethods.length === 0}
                  >
                    {processing ? (
                      <ActivityIndicator color={COLORS.background} />
                    ) : (
                      <Text style={styles.payBtnText}>Pagar ${selectedPlan.price_monthly}</Text>
                    )}
                  </TouchableOpacity>

                  <Text style={styles.secureNote}>
                    🔒 Pago seguro procesado por Clinpays
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: scale(12), color: COLORS.textSecondary, fontSize: scale(14) },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(16), paddingVertical: scale(12) },
  backBtn: { width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
  headerTitle: { fontSize: scale(18), fontWeight: '600', color: COLORS.textPrimary },

  content: { flex: 1 },
  section: { padding: scale(16) },
  sectionTitle: { fontSize: scale(18), fontWeight: '700', color: COLORS.textPrimary, marginBottom: scale(4) },
  sectionSubtitle: { fontSize: scale(14), color: COLORS.textSecondary, marginBottom: scale(16) },

  // Active subscription card
  activeCard: { borderRadius: scale(16), overflow: 'hidden', margin: scale(16), backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder },
  activeHeader: { padding: scale(20) },
  activeIcon: { fontSize: scale(32), marginBottom: scale(8) },
  activePlan: { fontSize: scale(20), fontWeight: '700', color: COLORS.textPrimary },
  activePrice: { fontSize: scale(14), color: 'rgba(255,255,255,0.9)', marginTop: scale(4) },
  statusBadge: { position: 'absolute', top: scale(16), right: scale(16), backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: scale(12), paddingVertical: scale(6), borderRadius: scale(20) },
  statusText: { fontSize: scale(12), fontWeight: '600', color: COLORS.textPrimary },
  activeBody: { padding: scale(16), backgroundColor: COLORS.backgroundSecondary },
  trialAlert: { flexDirection: 'row', alignItems: 'center', gap: scale(8), backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: scale(12), borderRadius: scale(10), marginBottom: scale(12) },
  trialText: { fontSize: scale(14), color: COLORS.yellow, fontWeight: '500' },
  activeInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: scale(16) },
  infoLabel: { fontSize: scale(14), color: COLORS.textSecondary },
  infoValue: { fontSize: scale(14), fontWeight: '600', color: COLORS.textPrimary },
  activeActions: { flexDirection: 'row', gap: scale(12) },
  upgradeBtn: { flex: 1, backgroundColor: COLORS.lime, paddingVertical: scale(12), borderRadius: scale(10), alignItems: 'center' },
  upgradeBtnText: { color: COLORS.background, fontWeight: '600' },
  cancelBtn: { paddingVertical: scale(12), paddingHorizontal: scale(20), borderRadius: scale(10), borderWidth: 1, borderColor: COLORS.cardBorder },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '500' },

  // Service cards
  serviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: scale(16), borderRadius: scale(12), marginBottom: scale(10), borderWidth: 1, borderColor: COLORS.cardBorder },
  serviceIcon: { width: scale(48), height: scale(48), borderRadius: scale(12), alignItems: 'center', justifyContent: 'center' },
  serviceIconText: { fontSize: scale(24) },
  serviceInfo: { flex: 1, marginLeft: scale(12) },
  serviceName: { fontSize: scale(16), fontWeight: '600', color: COLORS.textPrimary },
  serviceStatus: { fontSize: scale(13), color: COLORS.textSecondary, marginTop: scale(2) },
  activeBadge: { padding: scale(4) },
  tryBadge: { paddingHorizontal: scale(12), paddingVertical: scale(6), borderRadius: scale(16) },
  tryText: { fontSize: scale(12), fontWeight: '600', color: COLORS.textPrimary },

  // Link card
  linkCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, margin: scale(16), padding: scale(16), borderRadius: scale(12), borderWidth: 1, borderColor: COLORS.cardBorder },
  linkIcon: { width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: 'rgba(99, 102, 241, 0.15)', alignItems: 'center', justifyContent: 'center' },
  linkInfo: { flex: 1, marginLeft: scale(12) },
  linkTitle: { fontSize: scale(16), fontWeight: '600', color: COLORS.textPrimary },
  linkSubtitle: { fontSize: scale(13), color: COLORS.textSecondary, marginTop: scale(2) },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.backgroundSecondary, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), maxHeight: '85%' },
  paymentModalContent: { backgroundColor: COLORS.backgroundSecondary, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24) },
  modalHandle: { width: scale(40), height: scale(4), backgroundColor: COLORS.textMuted, borderRadius: scale(2), alignSelf: 'center', marginTop: scale(12) },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: scale(20), borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  modalTitle: { fontSize: scale(18), fontWeight: '700', color: COLORS.textPrimary },
  modalBody: { padding: scale(20) },

  plansSubtitle: { fontSize: scale(15), color: COLORS.textSecondary, marginBottom: scale(16) },

  // Plan card
  planCard: { backgroundColor: COLORS.backgroundTertiary, borderRadius: scale(16), padding: scale(20), marginBottom: scale(16), borderWidth: 1, borderColor: COLORS.cardBorder },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(12) },
  planName: { fontSize: scale(18), fontWeight: '700', color: COLORS.textPrimary },
  trialBadge: { backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: scale(10), paddingVertical: scale(4), borderRadius: scale(12) },
  trialBadgeText: { fontSize: scale(12), fontWeight: '600', color: COLORS.green },
  planPricing: { flexDirection: 'row', alignItems: 'baseline' },
  planPrice: { fontSize: scale(32), fontWeight: '700', color: COLORS.textPrimary },
  planPeriod: { fontSize: scale(16), color: COLORS.textSecondary, marginLeft: scale(4) },
  yearlyPrice: { fontSize: scale(13), color: COLORS.green, marginTop: scale(4) },
  featuresList: { marginTop: scale(16), gap: scale(8) },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  featureText: { fontSize: scale(14), color: COLORS.textSecondary },
  planActions: { flexDirection: 'row', gap: scale(10), marginTop: scale(16) },
  trialBtn: { flex: 1, paddingVertical: scale(14), borderRadius: scale(10), alignItems: 'center' },
  trialBtnText: { color: COLORS.textPrimary, fontWeight: '600', fontSize: scale(15) },
  subscribeBtn: { flex: 1, paddingVertical: scale(14), borderRadius: scale(10), alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder },
  subscribeBtnText: { color: COLORS.textPrimary, fontWeight: '600', fontSize: scale(15) },

  noPlans: { padding: scale(40), alignItems: 'center' },
  noPlansText: { fontSize: scale(16), color: COLORS.textSecondary, marginTop: scale(12) },

  // Payment modal
  summaryCard: { backgroundColor: COLORS.backgroundTertiary, padding: scale(16), borderRadius: scale(12), marginBottom: scale(20), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryPlan: { fontSize: scale(16), fontWeight: '600', color: COLORS.textPrimary },
  summaryPrice: { fontSize: scale(18), fontWeight: '700', color: COLORS.lime },
  paymentTitle: { fontSize: scale(14), fontWeight: '600', color: COLORS.textSecondary, marginBottom: scale(10) },
  selectedCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: scale(14), backgroundColor: COLORS.backgroundTertiary, borderRadius: scale(10), borderWidth: 1, borderColor: COLORS.cardBorder, marginBottom: scale(20) },
  selectedCardText: { fontSize: scale(15), color: COLORS.textPrimary },
  changeCardText: { fontSize: scale(14), color: COLORS.purple, fontWeight: '500' },
  addCardBtn: { padding: scale(14), borderRadius: scale(10), borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.purple, alignItems: 'center', marginBottom: scale(20) },
  addCardBtnText: { fontSize: scale(15), color: COLORS.purple, fontWeight: '500' },
  payBtn: { backgroundColor: COLORS.lime, paddingVertical: scale(16), borderRadius: scale(12), alignItems: 'center' },
  payBtnDisabled: { backgroundColor: COLORS.backgroundTertiary },
  payBtnText: { color: COLORS.background, fontSize: scale(16), fontWeight: '700' },
  secureNote: { textAlign: 'center', fontSize: scale(13), color: COLORS.textMuted, marginTop: scale(16) },
});