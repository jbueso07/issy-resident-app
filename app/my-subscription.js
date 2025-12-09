// app/my-subscription.js - Mi Suscripción y Planes
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Modal, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import {
  getMySubscriptions, getVerticalPlans, startTrial,
  subscribeToPlan, cancelSubscription, getPaymentMethods
} from '../src/services/api';

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
      Alert.alert('Error', res.error);
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
      Alert.alert('Error', res.error);
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
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#6366F1" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Suscripciones</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Active Subscriptions */}
        {subscriptions.filter(s => ['active', 'trial'].includes(s.status)).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suscripciones Activas</Text>
            {subscriptions.filter(s => ['active', 'trial'].includes(s.status)).map(sub => {
              const vertical = VERTICALS[sub.plan?.vertical] || {};
              const daysLeft = getDaysRemaining(sub.status === 'trial' ? sub.trial_ends_at : sub.current_period_end);
              
              return (
                <View key={sub.id} style={styles.activeCard}>
                  <View style={[styles.activeHeader, { backgroundColor: vertical.color }]}>
                    <View>
                      <Text style={styles.activeIcon}>{vertical.icon}</Text>
                      <Text style={styles.activePlan}>{sub.plan?.name}</Text>
                      <Text style={styles.activePrice}>${sub.plan?.price_monthly}/mes</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>
                        {sub.status === 'trial' ? '🎁 Trial' : '✓ Activo'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.activeBody}>
                    {sub.status === 'trial' && (
                      <View style={styles.trialAlert}>
                        <Ionicons name="time-outline" size={18} color="#D97706" />
                        <Text style={styles.trialText}>
                          {daysLeft} días restantes de prueba
                        </Text>
                      </View>
                    )}
                    <View style={styles.activeInfo}>
                      <Text style={styles.infoLabel}>Próximo cobro:</Text>
                      <Text style={styles.infoValue}>
                        {new Date(sub.current_period_end).toLocaleDateString('es')}
                      </Text>
                    </View>
                    <View style={styles.activeActions}>
                      {sub.status === 'trial' && (
                        <TouchableOpacity
                          style={styles.upgradeBtn}
                          onPress={() => handleSelectPlanForPayment(sub.plan)}
                        >
                          <Text style={styles.upgradeBtnText}>Activar Plan</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => handleCancelSubscription(sub)}
                      >
                        <Text style={styles.cancelBtnText}>Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Available Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servicios Disponibles</Text>
          <Text style={styles.sectionSubtitle}>Prueba gratis por 14 días cualquier servicio</Text>
          
          {Object.entries(VERTICALS).map(([key, vertical]) => {
            const currentSub = getVerticalSubscription(key);
            const hasAccess = !!currentSub;
            
            return (
              <TouchableOpacity
                key={key}
                style={styles.serviceCard}
                onPress={() => !hasAccess && openVerticalPlans(key)}
                disabled={hasAccess}
              >
                <View style={[styles.serviceIcon, { backgroundColor: vertical.color + '15' }]}>
                  <Text style={styles.serviceIconText}>{vertical.icon}</Text>
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{vertical.name}</Text>
                  <Text style={styles.serviceStatus}>
                    {hasAccess 
                      ? (currentSub.status === 'trial' ? '🎁 En prueba' : '✓ Activo')
                      : 'Disponible'
                    }
                  </Text>
                </View>
                {!hasAccess && (
                  <View style={[styles.tryBadge, { backgroundColor: vertical.color }]}>
                    <Text style={styles.tryText}>Probar</Text>
                  </View>
                )}
                {hasAccess && (
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Payment Methods Link */}
        <TouchableOpacity style={styles.linkCard} onPress={() => router.push('/payment-methods')}>
          <View style={styles.linkIcon}>
            <Ionicons name="card" size={22} color="#6366F1" />
          </View>
          <View style={styles.linkInfo}>
            <Text style={styles.linkTitle}>Métodos de Pago</Text>
            <Text style={styles.linkSubtitle}>
              {paymentMethods.length} tarjeta{paymentMethods.length !== 1 ? 's' : ''} guardada{paymentMethods.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </ScrollView>

      {/* Plans Modal */}
      <Modal visible={showPlansModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {VERTICALS[selectedVertical]?.icon} {VERTICALS[selectedVertical]?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowPlansModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.plansSubtitle}>Elige tu plan</Text>
              
              {getPlansForVertical().map(plan => (
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
                  
                  {plan.price_yearly > 0 && (
                    <Text style={styles.yearlyPrice}>
                      ${plan.price_yearly}/año (ahorra {Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}%)
                    </Text>
                  )}

                  {plan.features && plan.features.length > 0 && (
                    <View style={styles.featuresList}>
                      {plan.features.slice(0, 4).map((feature, i) => (
                        <View key={i} style={styles.featureItem}>
                          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                          <Text style={styles.featureText}>{feature}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.planActions}>
                    {plan.trial_days > 0 && (
                      <TouchableOpacity
                        style={[styles.trialBtn, { backgroundColor: VERTICALS[selectedVertical]?.color }]}
                        onPress={() => handleStartTrial(plan)}
                        disabled={processing}
                      >
                        {processing ? (
                          <ActivityIndicator color="#FFF" size="small" />
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirmar Suscripción</Text>
              <TouchableOpacity onPress={() => { setShowPaymentModal(false); setSelectedPlan(null); }}>
                <Ionicons name="close" size={24} color="#6B7280" />
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
                      <ActivityIndicator color="#FFF" />
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },

  content: { flex: 1 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16 },

  // Active subscription card
  activeCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 16, backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  activeHeader: { padding: 20 },
  activeIcon: { fontSize: 32, marginBottom: 8 },
  activePlan: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  activePrice: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  statusBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  activeBody: { padding: 16 },
  trialAlert: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', padding: 12, borderRadius: 10, marginBottom: 12 },
  trialText: { fontSize: 14, color: '#92400E', fontWeight: '500' },
  activeInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  activeActions: { flexDirection: 'row', gap: 12 },
  upgradeBtn: { flex: 1, backgroundColor: '#6366F1', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  upgradeBtnText: { color: '#FFF', fontWeight: '600' },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  cancelBtnText: { color: '#6B7280', fontWeight: '500' },

  // Service cards
  serviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  serviceIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  serviceIconText: { fontSize: 24 },
  serviceInfo: { flex: 1, marginLeft: 12 },
  serviceName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  serviceStatus: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  tryBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  tryText: { fontSize: 12, fontWeight: '600', color: '#FFF' },

  // Link card
  linkCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', margin: 16, padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  linkIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  linkInfo: { flex: 1, marginLeft: 12 },
  linkTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  linkSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  paymentModalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  modalBody: { padding: 20 },

  plansSubtitle: { fontSize: 15, color: '#6B7280', marginBottom: 16 },

  // Plan card
  planCard: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  planName: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  trialBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  trialBadgeText: { fontSize: 12, fontWeight: '600', color: '#059669' },
  planPricing: { flexDirection: 'row', alignItems: 'baseline' },
  planPrice: { fontSize: 32, fontWeight: '700', color: '#1F2937' },
  planPeriod: { fontSize: 16, color: '#6B7280', marginLeft: 4 },
  yearlyPrice: { fontSize: 13, color: '#10B981', marginTop: 4 },
  featuresList: { marginTop: 16, gap: 8 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 14, color: '#374151' },
  planActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  trialBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  trialBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  subscribeBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB' },
  subscribeBtnText: { color: '#374151', fontWeight: '600', fontSize: 15 },

  noPlans: { padding: 40, alignItems: 'center' },
  noPlansText: { fontSize: 16, color: '#6B7280' },

  // Payment modal
  summaryCard: { backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryPlan: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  summaryPrice: { fontSize: 18, fontWeight: '700', color: '#6366F1' },
  paymentTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  selectedCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  selectedCardText: { fontSize: 15, color: '#1F2937' },
  changeCardText: { fontSize: 14, color: '#6366F1', fontWeight: '500' },
  addCardBtn: { padding: 14, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#6366F1', alignItems: 'center', marginBottom: 20 },
  addCardBtnText: { fontSize: 15, color: '#6366F1', fontWeight: '500' },
  payBtn: { backgroundColor: '#6366F1', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  payBtnDisabled: { backgroundColor: '#9CA3AF' },
  payBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secureNote: { textAlign: 'center', fontSize: 13, color: '#9CA3AF', marginTop: 16 },
});