// app/(tabs)/payments.js
// ISSY Resident App - Community Payments Screen
// ProHome Dark Theme + i18n + Proof Upload + Card Payment

import { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  Image,
  Clipboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/context/AuthContext';
import { useTranslation } from '../../src/hooks/useTranslation';
import { 
  getPaymentMethods,
} from '../../src/services/api';
import { supabase } from '../../src/config/supabase';
import PressableScale from '../../src/components/home/PressableScale';
import { neu, neuSurface, fs } from '../../src/theme/tokens';
import { useHomeFont } from '../../src/theme/homeFont';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ProHome Dark Theme Colors
const COLORS = {
  background: neu.bg,
  backgroundSecondary: neu.raised,
  backgroundTertiary: neu.sunken,
  card: neu.raised,
  cardBorder: neu.border,
  teal: neu.teal,
  tealDark: neu.teal,
  lime: neu.teal,
  purple: neu.lilac,
  purpleLight: neu.lilac,
  textPrimary: neu.text,
  textSecondary: neu.textLabel,
  textMuted: neu.textSoft,
  green: neu.teal,
  red: neu.coral,
  yellow: neu.amber,
  blue: neu.blue,
  orange: neu.amber,
};

// API Base URL
const API_URL = 'https://api.joinissy.com/api';

export default function Payments() {
  const font = useHomeFont();
  const router = useRouter();
  const { profile, token } = useAuth();
  const { t } = useTranslation();
  
  // State
  const [charges, setCharges] = useState({ pending: [], paid: [] });
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  
  // Modal states
  const [proofModalVisible, setProofModalVisible] = useState(false);
  const [cardModalVisible, setCardModalVisible] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState(null);
  const [proofImage, setProofImage] = useState(null);
  const [proofReference, setProofReference] = useState('');
  const [proofNotes, setProofNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
const [detailModalVisible, setDetailModalVisible] = useState(false);
const [selectedPaymentDetail, setSelectedPaymentDetail] = useState(null);

  // ============================================
  // DATA LOADING
  // ============================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadCharges(),
        loadPaymentSettings(),
        loadCards()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCharges = async () => {
    try {
      const response = await fetch(`${API_URL}/community-payments/my-charges`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setCharges({
          pending: data.data.pending || [],
          paid: data.data.paid || []
        });
      }
    } catch (error) {
      console.error('Error loading charges:', error);
    }
  };

  const loadPaymentSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/community-payments/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setPaymentSettings(data.data);
      }
    } catch (error) {
      console.error('Error loading payment settings:', error);
    }
  };

  const loadCards = async () => {
    try {
      const result = await getPaymentMethods();
      if (result.success) {
        setCards(result.data || []);
        // Set default card
        const defaultCard = result.data?.find(c => c.is_default);
        if (defaultCard) setSelectedCard(defaultCard);
      }
    } catch (error) {
      console.error('Error loading cards:', error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  // ============================================
  // HELPERS
  // ============================================

  const formatCurrency = (amount, currency = 'HNL') => {
    const symbol = currency === 'USD' ? '$' : 'L';
    return `${symbol} ${parseFloat(amount || 0).toLocaleString('es-HN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    // Fix TZ: due_date es DATE-only; anclar a mediodía UTC evita mostrar
    // el día anterior en UTC-6 ('2026-08-01' → '31 jul 2026').
    const date = new Date(
      /^\d{4}-\d{2}-\d{2}$/.test(dateString) ? dateString + 'T12:00:00Z' : dateString
    );
    return date.toLocaleDateString('es-HN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getStatusColor = (status, dueDate) => {
    if (status === 'paid') return COLORS.green;
    if (status === 'proof_submitted') return COLORS.blue;
    if (status === 'rejected') return COLORS.red;
    if (isOverdue(dueDate)) return COLORS.red;
    return COLORS.yellow;
  };

  const getStatusText = (status, dueDate) => {
    if (status === 'paid') return t('communityPayments.status.paid');
    if (status === 'proof_submitted') return t('communityPayments.status.proofSubmitted');
    if (status === 'rejected') return t('communityPayments.status.rejected');
    if (isOverdue(dueDate)) return t('communityPayments.status.overdue');
    return t('communityPayments.status.pending');
  };

  const getAllowedMethodsText = (methods) => {
    if (!methods || methods.length === 0) return '';
    if (methods.includes('card') && methods.includes('proof')) {
      return t('communityPayments.paymentMethods.both');
    }
    if (methods.includes('card')) return t('communityPayments.paymentMethods.cardOnly');
    return t('communityPayments.paymentMethods.proofOnly');
  };

  const canPayWithCard = (charge) => {
    const methods = charge.allowed_payment_methods || ['card', 'proof'];
    return methods.includes('card') && paymentSettings?.card_payments_enabled;
  };

  const canPayWithProof = (charge) => {
    const methods = charge.allowed_payment_methods || ['card', 'proof'];
    return methods.includes('proof') && paymentSettings?.proof_payments_enabled;
  };

  // ============================================
  // PROOF UPLOAD
  // ============================================

  const openProofModal = (charge) => {
    setSelectedCharge(charge);
    setProofImage(null);
    setProofReference('');
    setProofNotes('');
    setProofModalVisible(true);
  };

  const pickImage = async (useCamera = false) => {
    try {
      const permissionResult = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(t('common.error'), 'Permission required');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });

      if (!result.canceled && result.assets?.[0]) {
        setProofImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const uploadProofImage = async (imageUri) => {
    try {
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `proof_${profile.id}_${Date.now()}.${fileExt}`;
      const filePath = `payments/${fileName}`;

      const response = await fetch(imageUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { data, error } = await supabase.storage
        .from('payments')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('payments')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const submitProof = async () => {
    if (!proofImage) {
      Alert.alert(t('common.error'), t('communityPayments.proofUpload.proofRequired'));
      return;
    }

    setSubmitting(true);
    try {
      // Upload image to storage
      const proofUrl = await uploadProofImage(proofImage.uri);

      // Submit proof to API
      const response = await fetch(`${API_URL}/community-payments/${selectedCharge.id}/submit-proof`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          proof_url: proofUrl,
          reference: proofReference || null,
          notes: proofNotes || null
        })
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          t('communityPayments.proofUpload.success'),
          t('communityPayments.proofUpload.successMessage')
        );
        setProofModalVisible(false);
        loadData();
      } else {
        Alert.alert(t('common.error'), data.error || t('communityPayments.errors.proofFailed'));
      }
    } catch (error) {
      console.error('Error submitting proof:', error);
      Alert.alert(t('common.error'), t('communityPayments.errors.proofFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    Clipboard.setString(text);
    Alert.alert('', t('communityPayments.proofUpload.copied'));
  };

  // ============================================
  // CARD PAYMENT
  // ============================================

  const openCardModal = (charge) => {
    if (cards.length === 0) {
      Alert.alert(
        t('communityPayments.cardPayment.noCards'),
        t('communityPayments.cardPayment.addCardFirst'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('payments.addCard'), onPress: () => router.push('/payment-methods') }
        ]
      );
      return;
    }
    setSelectedCharge(charge);
    setCardModalVisible(true);
  };

const processCardPayment = async () => {
    if (!selectedCard) {
      Alert.alert(t('common.error'), t('communityPayments.cardPayment.selectCard'));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/community-payments/${selectedCharge.id}/pay-card`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payment_method_id: selectedCard.id
        })
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          t('communityPayments.cardPayment.success'),
          t('communityPayments.cardPayment.successMessage')
        );
        setCardModalVisible(false);
        loadData();
      } else {
        Alert.alert(t('common.error'), data.error || t('communityPayments.errors.paymentFailed'));
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert(t('common.error'), t('communityPayments.errors.paymentFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // Open payment detail modal
  const openPaymentDetail = (charge) => {
    setSelectedPaymentDetail(charge);
    setDetailModalVisible(true);
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const totalPending = charges.pending.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const currentCharges = activeTab === 'pending' ? charges.pending : charges.paid;

  const handleGoToMethods = () => {
    router.push('/payment-methods');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={[styles.loadingText, font(400)]}>{t('communityPayments.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={COLORS.purple}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, font(600)]}>{t('communityPayments.title')}</Text>
            <Text style={[styles.subtitle, font(400)]}>{t('communityPayments.subtitle')}</Text>
          </View>
          <PressableScale variant="neu" style={styles.methodsBtn} onPress={handleGoToMethods}>
            <Ionicons name="card-outline" size={22} color={COLORS.textPrimary} />
          </PressableScale>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceDecoration}>
            <View style={[styles.decoCircle, styles.decoCircle1]} />
            <View style={[styles.decoCircle, styles.decoCircle2]} />
          </View>
          <View style={styles.balanceContent}>
            <View style={styles.balanceLeft}>
              <Text style={[styles.balanceLabel, font(400)]}>{t('communityPayments.pendingBalance')}</Text>
              <Text style={[styles.balanceAmount, font(600)]}>{formatCurrency(totalPending)}</Text>
              <Text style={[styles.balanceCount, font(400)]}>
                {charges.pending.length} {charges.pending.length === 1 
                  ? t('communityPayments.pendingPayment') 
                  : t('communityPayments.pendingPayments')}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <PressableScale variant="neu" 
            containerStyle={{ flex: 1 }}
            neuSurface="none"
            style={[styles.tab, activeTab === 'pending' ? styles.tabActive : styles.tabIdle]}
            onPress={() => setActiveTab('pending')}
          >
            <Ionicons 
              name="time-outline" 
              size={18} 
              color={activeTab === 'pending' ? neu.teal : neu.textLabel} 
            />
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive, font(activeTab === 'pending' ? 600 : 500)]}>
              {t('communityPayments.tabs.pending')}
            </Text>
            {charges.pending.length > 0 && (
              <View style={[styles.tabBadge, activeTab === 'pending' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'pending' && styles.tabBadgeTextActive, font(600)]}>
                  {charges.pending.length}
                </Text>
              </View>
            )}
          </PressableScale>
          
          <PressableScale variant="neu" 
            containerStyle={{ flex: 1 }}
            neuSurface="none"
            style={[styles.tab, activeTab === 'history' ? styles.tabActive : styles.tabIdle]}
            onPress={() => setActiveTab('history')}
          >
            <Ionicons 
              name="checkmark-done-outline" 
              size={18} 
              color={activeTab === 'history' ? neu.teal : neu.textLabel} 
            />
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive, font(activeTab === 'history' ? 600 : 500)]}>
              {t('communityPayments.tabs.history')}
            </Text>
          </PressableScale>
          
          <PressableScale variant="neu" 
            containerStyle={{ flex: 1 }}
            neuSurface="none"
            style={[styles.tab, activeTab === 'cards' ? styles.tabActive : styles.tabIdle]}
            onPress={() => setActiveTab('cards')}
          >
            <Ionicons 
              name="card-outline" 
              size={18} 
              color={activeTab === 'cards' ? neu.teal : neu.textLabel} 
            />
            <Text style={[styles.tabText, activeTab === 'cards' && styles.tabTextActive, font(activeTab === 'cards' ? 600 : 500)]}>
              {t('communityPayments.tabs.cards')}
            </Text>
          </PressableScale>
        </View>

        {/* Content */}
        {activeTab === 'cards' ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="card-outline" size={48} color={COLORS.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, font(600)]}>{t('communityPayments.empty.cards.title')}</Text>
            <Text style={[styles.emptyText, font(400)]}>{t('communityPayments.empty.cards.subtitle')}</Text>
            <PressableScale variant="neu" neuFill={neu.teal} style={styles.emptyButton} onPress={handleGoToMethods}>
              <Ionicons name="add" size={20} color={neu.onAccent} />
              <Text style={[styles.emptyButtonText, font(600)]}>{t('payments.addCard')}</Text>
            </PressableScale>
          </View>
        ) : currentCharges.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <Ionicons 
                name={activeTab === 'pending' ? 'checkmark-circle-outline' : 'receipt-outline'} 
                size={48} 
                color={COLORS.textMuted} 
              />
            </View>
            <Text style={[styles.emptyTitle, font(600)]}>
              {activeTab === 'pending' 
                ? t('communityPayments.empty.pending.title')
                : t('communityPayments.empty.history.title')}
            </Text>
            <Text style={[styles.emptyText, font(400)]}>
              {activeTab === 'pending' 
                ? t('communityPayments.empty.pending.subtitle')
                : t('communityPayments.empty.history.subtitle')}
            </Text>
          </View>
        ) : (
          <View style={styles.chargesList}>
            {currentCharges.map((charge) => {
              // Determine if card should be touchable
              const isTouchable = activeTab === 'history' || 
                (charge.payment_status === 'proof_submitted' && charge.proof_of_payment);
              
              const CardWrapper = isTouchable ? TouchableOpacity : View;
              const cardProps = isTouchable ? {
                activeOpacity: 0.7,
                onPress: () => openPaymentDetail(charge)
              } : {};

              return (
                <CardWrapper key={charge.id} style={styles.chargeCard} {...cardProps}>
                  {/* Status Indicator */}
                  <View style={[styles.statusBar, { 
                    backgroundColor: getStatusColor(charge.payment_status, charge.due_date)
                  }]} />
                  
                  {/* Charge Content */}
                  <View style={styles.chargeContent}>
                    <View style={styles.chargeTop}>
                      <View style={styles.chargeInfo}>
                        <View style={[styles.chargeIconBox, {
                          backgroundColor: `${getStatusColor(charge.payment_status, charge.due_date)}20`
                        }]}>
                          <Ionicons 
                            name={charge.payment_status === 'paid' ? 'checkmark-circle' : 
                                  charge.payment_status === 'proof_submitted' ? 'hourglass' :
                                  isOverdue(charge.due_date) ? 'alert-circle' : 'receipt'} 
                            size={22} 
                            color={getStatusColor(charge.payment_status, charge.due_date)}
                          />
                        </View>
                        <View style={styles.chargeDetails}>
                          <Text style={[styles.chargeTitle, font(600)]} numberOfLines={1}>
                            {charge.title}
                          </Text>
                          <Text style={[styles.chargeDueDate, font(400)]}>
                            {charge.payment_status === 'paid' 
                              ? `${t('communityPayments.detail.paidAt')}: ${formatDate(charge.paid_at)}`
                              : charge.payment_status === 'proof_submitted'
                              ? `Enviado: ${formatDate(charge.proof_submitted_at)}`
                              : `${t('communityPayments.detail.dueDate')}: ${formatDate(charge.due_date)}`}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.chargeAmountContainer}>
                        <Text style={[styles.chargeAmount, {
                          color: getStatusColor(charge.payment_status, charge.due_date)
                        }, font(600)]}>
                          {formatCurrency(charge.amount, charge.currency)}
                        </Text>
                        {isTouchable && (
                          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginTop: 4 }} />
                        )}
                      </View>
                    </View>

                    {/* Status Badge */}
                    {charge.payment_status !== 'not_started' && activeTab === 'pending' && (
                      <View style={[styles.statusBadge, {
                        backgroundColor: `${getStatusColor(charge.payment_status, charge.due_date)}20`
                      }]}>
                        <Text style={[styles.statusBadgeText, {
                          color: getStatusColor(charge.payment_status, charge.due_date)
                        }, font(600)]}>
                          {getStatusText(charge.payment_status, charge.due_date)}
                        </Text>
                      </View>
                    )}

                    {/* Rejection reason */}
                    {charge.payment_status === 'rejected' && charge.rejection_reason && (
                      <View style={styles.rejectionBox}>
                        <Ionicons name="information-circle" size={16} color={COLORS.red} />
                        <Text style={[styles.rejectionText, font(400)]}>{charge.rejection_reason}</Text>
                      </View>
                    )}
                    
                    {/* Payment Buttons - Only for pending without proof */}
                    {activeTab === 'pending' && charge.payment_status !== 'proof_submitted' && (
                      <View style={styles.paymentButtons}>
                        {canPayWithCard(charge) && (
                          <PressableScale variant="neu" 
                            neuFill={neu.teal}
                            containerStyle={{ flex: 1 }}
                            style={styles.payButtonCard}
                            onPress={() => openCardModal(charge)}
                          >
                            <Ionicons name="card" size={18} color={neu.onAccent} />
                            <Text style={[styles.payButtonCardText, font(600)]}>
                              {t('communityPayments.actions.payWithCard')}
                            </Text>
                          </PressableScale>
                        )}
                        
                        {canPayWithProof(charge) && (
                          <PressableScale variant="neu" 
                            containerStyle={{ flex: 1 }}
                            style={styles.payButtonProof}
                            onPress={() => openProofModal(charge)}
                          >
                            <Ionicons name="cloud-upload" size={18} color={COLORS.purple} />
                            <Text style={[styles.payButtonProofText, font(600)]}>
                              {t('communityPayments.actions.uploadProof')}
                            </Text>
                          </PressableScale>
                        )}
                      </View>
                    )}
                    
                    {/* Waiting verification with view proof button */}
                    {charge.payment_status === 'proof_submitted' && (
                      <View style={styles.waitingContainer}>
                        <View style={styles.waitingBox}>
                          <Ionicons name="hourglass" size={16} color={COLORS.blue} />
                          <Text style={[styles.waitingText, font(400)]}>
                            {t('communityPayments.proofUpload.verificationNote')}
                          </Text>
                        </View>
                        {charge.proof_of_payment && (
                          <PressableScale variant="neu" 
                            style={styles.viewProofButton}
                            onPress={() => openPaymentDetail(charge)}
                          >
                            <Ionicons name="eye" size={16} color={COLORS.purple} />
                            <Text style={[styles.viewProofButtonText, font(400)]}>Ver comprobante</Text>
                          </PressableScale>
                       )}
                     </View>
                   )}
                    
                    {/* Paid Badge */}
                    {activeTab === 'history' && (
                      <View style={styles.paidBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
                        <Text style={[styles.paidBadgeText, font(500)]}>
{charge.payment_method === 'card' ? 'Tarjeta' : 'Comprobante verificado'}
</Text>
</View>
)}
</View>
</CardWrapper>
);
})}
          </View>
        )}

        <View style={{ height: scale(100) }} />
      </ScrollView>

      {/* ============================================ */}
      {/* PROOF UPLOAD MODAL */}
      {/* ============================================ */}
      <Modal visible={proofModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, font(600)]}>{t('communityPayments.proofUpload.title')}</Text>
              <PressableScale variant="neu" 
                style={styles.modalCloseBtn} 
                onPress={() => setProofModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </PressableScale>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Charge Info */}
              {selectedCharge && (
                <View style={styles.chargeInfoBox}>
                  <Text style={[styles.chargeInfoTitle, font(600)]}>{selectedCharge.title}</Text>
                  <Text style={[styles.chargeInfoAmount, font(600)]}>
                    {formatCurrency(selectedCharge.amount, selectedCharge.currency)}
                  </Text>
                </View>
              )}

              {/* Bank Info */}
              {paymentSettings?.bank_name && (
                <View style={styles.bankInfoBox}>
                  <Text style={[styles.bankInfoTitle, font(600)]}>
                    {t('communityPayments.proofUpload.bankInfo')}
                  </Text>
                  
                  <View style={styles.bankInfoRow}>
                    <Text style={[styles.bankInfoLabel, font(400)]}>
                      {t('communityPayments.proofUpload.bankName')}
                    </Text>
                    <Text style={[styles.bankInfoValue, font(500)]}>{paymentSettings.bank_name}</Text>
                  </View>
                  
                  <View style={styles.bankInfoRow}>
                    <Text style={[styles.bankInfoLabel, font(400)]}>
                      {t('communityPayments.proofUpload.accountNumber')}
                    </Text>
                    <View style={styles.bankInfoCopyRow}>
                      <Text style={[styles.bankInfoValue, font(500)]}>{paymentSettings.bank_account_number}</Text>
                      <PressableScale variant="neu" 
                        onPress={() => copyToClipboard(paymentSettings.bank_account_number)}
                        style={styles.copyBtn}
                      >
                        <Ionicons name="copy-outline" size={18} color={COLORS.purple} />
                      </PressableScale>
                    </View>
                  </View>
                  
                  <View style={styles.bankInfoRow}>
                    <Text style={[styles.bankInfoLabel, font(400)]}>
                      {t('communityPayments.proofUpload.accountName')}
                    </Text>
                    <Text style={[styles.bankInfoValue, font(500)]}>{paymentSettings.bank_account_name}</Text>
                  </View>

                  {paymentSettings.bank_instructions && (
                    <View style={styles.bankInstructions}>
                      <Text style={[styles.bankInstructionsLabel, font(400)]}>
                        {t('communityPayments.proofUpload.instructions')}
                      </Text>
                      <Text style={[styles.bankInstructionsText, font(400)]}>
                        {paymentSettings.bank_instructions}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Image Picker */}
              <Text style={[styles.sectionTitle, font(600)]}>{t('communityPayments.proofUpload.subtitle')}</Text>
              
              {proofImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: proofImage.uri }} style={styles.imagePreview} />
                  <TouchableOpacity 
                    style={styles.removeImageBtn}
                    onPress={() => setProofImage(null)}
                  >
                    <Ionicons name="close-circle" size={28} color={COLORS.red} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imagePickerButtons}>
                  <PressableScale variant="neu" 
                    containerStyle={{ flex: 1 }}
                    style={styles.imagePickerBtn}
                    onPress={() => pickImage(true)}
                  >
                    <Ionicons name="camera" size={32} color={COLORS.purple} />
                    <Text style={[styles.imagePickerBtnText, font(400)]}>
                      {t('communityPayments.proofUpload.takePhoto')}
                    </Text>
                  </PressableScale>
                  
                  <PressableScale variant="neu" 
                    containerStyle={{ flex: 1 }}
                    style={styles.imagePickerBtn}
                    onPress={() => pickImage(false)}
                  >
                    <Ionicons name="images" size={32} color={COLORS.purple} />
                    <Text style={[styles.imagePickerBtnText, font(400)]}>
                      {t('communityPayments.proofUpload.selectFromGallery')}
                    </Text>
                  </PressableScale>
                </View>
              )}

              {/* Reference */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, font(500)]}>
                  {t('communityPayments.proofUpload.reference')}
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={t('communityPayments.proofUpload.referencePlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                  value={proofReference}
                  onChangeText={setProofReference}
                />
              </View>

              {/* Notes */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, font(500)]}>
                  {t('communityPayments.proofUpload.notes')}
                </Text>
                <TextInput
                  style={[styles.formInput, styles.formInputMultiline]}
                  placeholder={t('communityPayments.proofUpload.notesPlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                  value={proofNotes}
                  onChangeText={setProofNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Verification Note */}
              <View style={styles.verificationNote}>
                <Ionicons name="information-circle" size={20} color={COLORS.blue} />
                <Text style={[styles.verificationNoteText, font(400)]}>
                  {t('communityPayments.proofUpload.verificationNote')}
                </Text>
              </View>

              {/* Submit Button */}
              <PressableScale variant="neu"
                neuFill={neu.teal}
                containerStyle={(!proofImage || submitting) && styles.submitButtonDisabled}
                style={styles.submitButton}
                onPress={submitProof}
                disabled={!proofImage || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={neu.onAccent} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={20} color={neu.onAccent} />
                    <Text style={[styles.submitButtonText, font(600)]}>
                      {t('communityPayments.proofUpload.submit')}
                    </Text>
                  </>
                )}
              </PressableScale>

              <View style={{ height: scale(40) }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================ */}
      {/* CARD PAYMENT MODAL */}
      {/* ============================================ */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <View style={styles.modalHandle} />
      
      {/* Modal Header */}
      <View style={styles.modalHeader}>
        <Text style={[styles.modalTitle, font(600)]}>
          {selectedPaymentDetail?.payment_status === 'paid' 
            ? 'Detalle de Pago'
            : 'Comprobante Enviado'}
        </Text>
        <PressableScale variant="neu" 
          style={styles.modalCloseBtn} 
          onPress={() => setDetailModalVisible(false)}
        >
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </PressableScale>
      </View>

      <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
        {selectedPaymentDetail && (
          <>
            {/* Proof Image */}
            {selectedPaymentDetail.proof_of_payment && (
              <View style={styles.detailImageContainer}>
                <Image 
                  source={{ uri: selectedPaymentDetail.proof_of_payment }} 
                  style={styles.detailImage}
                  resizeMode="contain"
                />
              </View>
            )}

            {/* Payment Details */}
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, font(400)]}>Concepto</Text>
                <Text style={[styles.detailValue, font(400)]}>{selectedPaymentDetail.title}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, font(400)]}>Monto</Text>
                <Text style={[styles.detailValue, { color: COLORS.lime, fontWeight: '700' }, font(400)]}>
                  {formatCurrency(selectedPaymentDetail.amount, selectedPaymentDetail.currency)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, font(400)]}>Estado</Text>
                <View
                  style={[
                    styles.detailStatusBadge,
                    {
                      backgroundColor: `${getStatusColor(
                        selectedPaymentDetail.payment_status,
                        selectedPaymentDetail.due_date
                      )}20`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.detailStatusText,
                      {
                        color: getStatusColor(
                          selectedPaymentDetail.payment_status,
                          selectedPaymentDetail.due_date
                        ),
                      },
                    , font(400)]}
                  >
                    {getStatusText(
                      selectedPaymentDetail.payment_status,
                      selectedPaymentDetail.due_date
                    )}
                  </Text>
                </View>
              </View>

              {selectedPaymentDetail.payment_status === 'paid' &&
                selectedPaymentDetail.paid_at && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, font(400)]}>Pagado</Text>
                    <Text style={[styles.detailValue, font(400)]}>
                      {formatDate(selectedPaymentDetail.paid_at)}
                    </Text>
                  </View>
                )}

              {selectedPaymentDetail.proof_submitted_at && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, font(400)]}>Enviado</Text>
                  <Text style={[styles.detailValue, font(400)]}>
                    {formatDate(selectedPaymentDetail.proof_submitted_at)}
                  </Text>
                </View>
              )}

              {selectedPaymentDetail.payment_method && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, font(400)]}>Método</Text>
                  <Text style={[styles.detailValue, font(400)]}>
                    {selectedPaymentDetail.payment_method === 'card'
                      ? 'Tarjeta'
                      : 'Comprobante'}
                  </Text>
                </View>
              )}

              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.detailLabel, font(400)]}>Vencimiento</Text>
                <Text style={[styles.detailValue, font(400)]}>
                  {formatDate(selectedPaymentDetail.due_date)}
                </Text>
              </View>
            </View>

            {/* Status message */}
            {selectedPaymentDetail.payment_status === 'proof_submitted' && (
              <View style={styles.verificationNote}>
                <Ionicons
                  name="information-circle"
                  size={18}
                  color={COLORS.blue}
                />
                <Text style={[styles.verificationNoteText, font(400)]}>
                  {t('communityPayments.proofUpload.verificationNote')}
                </Text>
              </View>
            )}

            {selectedPaymentDetail.payment_status === 'paid' && (
              <View
                style={[
                  styles.verificationNote,
                  { backgroundColor: neu.teal + '1A' },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={COLORS.green}
                />
                <Text
                  style={[
                    styles.verificationNoteText,
                    { color: COLORS.green },
                  , font(400)]}
                >
                  Pago verificado por el administrador
                </Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: scale(40) }} />
      </ScrollView>
    </View>
  </View>
</Modal>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: scale(12),
    color: COLORS.textSecondary,
    fontSize: fs(14),
  },
// Amount container with chevron
chargeAmountContainer: {
  alignItems: 'flex-end',
},

// Waiting container with button
waitingContainer: {
  marginTop: scale(10),
},
viewProofButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: scale(8),
  paddingVertical: scale(8),
  gap: scale(6),
},
viewProofButtonText: {
  fontSize: fs(13),
  fontWeight: '500',
  color: COLORS.purple,
},

// Detail Modal
detailImageContainer: {
  backgroundColor: COLORS.backgroundTertiary,
  borderRadius: scale(16),
  overflow: 'hidden',
  marginBottom: scale(16),
},
detailImage: {
  width: '100%',
  height: scale(300),
},
detailCard: {
  backgroundColor: COLORS.backgroundTertiary,
  borderRadius: scale(16),
  padding: scale(16),
  marginBottom: scale(16),
},
detailRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: scale(12),
  borderBottomWidth: 1,
  borderBottomColor: COLORS.cardBorder,
},
detailLabel: {
  fontSize: fs(14),
  color: COLORS.textSecondary,
},
detailValue: {
  fontSize: fs(14),
  fontWeight: '500',
  color: COLORS.textPrimary,
  maxWidth: '60%',
  textAlign: 'right',
},
detailStatusBadge: {
  paddingVertical: scale(4),
  paddingHorizontal: scale(10),
  borderRadius: scale(8),
},
detailStatusText: {
  fontSize: fs(12),
  fontWeight: '600',
},

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: scale(16),
    paddingBottom: scale(12),
  },
  title: {
    fontSize: fs(24),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
    marginTop: scale(4),
  },
  methodsBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
    ...neuSurface.raisedSm,
  },

  // Balance Card
  balanceCard: {
    borderRadius: scale(20),
    padding: scale(20),
    marginTop: scale(8),
    overflow: 'hidden',
    ...neuSurface.raised,
  },
  balanceDecoration: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  decoCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: neu.sunken,
    opacity: 0.5,
  },
  decoCircle1: {
    width: scale(150),
    height: scale(150),
    top: scale(-50),
    right: scale(-30),
  },
  decoCircle2: {
    width: scale(100),
    height: scale(100),
    bottom: scale(-40),
    left: scale(-20),
  },
  balanceContent: {
    zIndex: 1,
  },
  balanceLeft: {},
  balanceLabel: {
    fontSize: fs(13),
    color: neu.textLabel,
  },
  balanceAmount: {
    fontSize: fs(28),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: scale(4),
  },
  balanceCount: {
    fontSize: fs(12),
    color: neu.textLabel,
    marginTop: scale(4),
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    gap: scale(8),
    marginTop: scale(14),
    paddingVertical: scale(6),
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(12),
    borderRadius: scale(14),
    gap: scale(6),
  },
  tabIdle: {
    ...neuSurface.raisedSm,
  },
  tabActive: {
    ...neuSurface.sunkenSm,
  },
  tabText: {
    fontSize: fs(13),
    color: neu.textLabel,
    fontWeight: '500',
  },
  tabTextActive: {
    color: neu.teal,
    fontWeight: '600',
  },
  tabBadge: {
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(10),
    minWidth: scale(20),
    alignItems: 'center',
    ...neuSurface.sunkenSm,
  },
  tabBadgeActive: {

  },
  tabBadgeText: {
    fontSize: fs(11),
    fontWeight: '600',
    color: neu.coral,
  },
  tabBadgeTextActive: {

  },

  // Empty State
  emptyCard: {
    borderRadius: scale(20),
    padding: scale(40),
    alignItems: 'center',
    marginTop: scale(20),
    ...neuSurface.raised,
  },
  emptyIconBox: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
    ...neuSurface.sunken,
  },
  emptyTitle: {
    fontSize: fs(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
    marginTop: scale(4),
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(12),
    paddingHorizontal: scale(20),
    borderRadius: scale(12),
    marginTop: scale(20),
    gap: scale(8),
    ...neuSurface.raisedSm,
    backgroundColor: neu.teal,
  },
  emptyButtonText: {
    fontSize: fs(14),
    fontWeight: '600',
    color: neu.onAccent,
  },

  // Charges List
  chargesList: {
    marginTop: scale(16),
  },

  // Charge Card
  chargeCard: {
    borderRadius: scale(16),
    marginBottom: scale(12),
    flexDirection: 'row',
    overflow: 'hidden',
    ...neuSurface.raised,
  },
  statusBar: {
    width: scale(4),
  },
  chargeContent: {
    flex: 1,
    padding: scale(16),
  },
  chargeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chargeInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: scale(12),
  },
  chargeIconBox: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
    ...neuSurface.sunkenSm,
  },
  chargeDetails: {
    flex: 1,
  },
  chargeTitle: {
    fontSize: fs(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  chargeDueDate: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
    marginTop: scale(4),
  },
  chargeAmount: {
    fontSize: fs(18),
    fontWeight: '600',
  },

  // Status Badge
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: scale(4),
    paddingHorizontal: scale(10),
    borderRadius: scale(8),
    marginTop: scale(10),
    ...neuSurface.sunkenSm,
  },
  statusBadgeText: {
    fontSize: fs(11),
    fontWeight: '600',
  },

  // Rejection Box
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: scale(10),
    borderRadius: scale(8),
    marginTop: scale(10),
    gap: scale(8),
    ...neuSurface.sunken,
  },
  rejectionText: {
    flex: 1,
    fontSize: fs(12),
    color: COLORS.red,
  },

  // Payment Buttons
  paymentButtons: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: scale(12),
  },
  payButtonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(12),
    borderRadius: scale(12),
    gap: scale(6),
    ...neuSurface.raised,
    backgroundColor: neu.teal,
  },
  payButtonCardText: {
    fontSize: fs(13),
    fontWeight: '600',
    color: neu.onAccent,
  },
  payButtonProof: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(12),
    borderRadius: scale(12),
    gap: scale(6),
    ...neuSurface.raisedSm,
  },
  payButtonProofText: {
    fontSize: fs(13),
    fontWeight: '600',
    color: COLORS.purple,
  },

  // Waiting Box
  waitingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(10),
    borderRadius: scale(8),
    marginTop: scale(10),
    gap: scale(8),
    ...neuSurface.sunken,
  },
  waitingText: {
    flex: 1,
    fontSize: fs(12),
    color: COLORS.blue,
  },

  // Paid Badge
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: scale(6),
    paddingHorizontal: scale(12),
    borderRadius: scale(20),
    marginTop: scale(12),
    gap: scale(4),
    ...neuSurface.sunkenSm,
  },
  paidBadgeText: {
    fontSize: fs(12),
    color: COLORS.green,
    fontWeight: '500',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: neu.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    maxHeight: '90%',
    ...neuSurface.raised,
  },
  modalHandle: {
    width: scale(40),
    height: scale(4),
    backgroundColor: neu.sunken,
    borderRadius: scale(2),
    alignSelf: 'center',
    marginTop: scale(12),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
  },
  modalTitle: {
    fontSize: fs(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalCloseBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
    ...neuSurface.raisedSm,
  },
  modalContent: {
    paddingHorizontal: scale(20),
  },

  // Charge Info Box
  chargeInfoBox: {
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(20),
    ...neuSurface.sunken,
  },
  chargeInfoTitle: {
    fontSize: fs(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  chargeInfoAmount: {
    fontSize: fs(24),
    fontWeight: '600',
    color: COLORS.lime,
  },

  // Bank Info Box
  bankInfoBox: {
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(20),
    ...neuSurface.sunken,
  },
  bankInfoTitle: {
    fontSize: fs(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(12),
  },
  bankInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(8),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  bankInfoLabel: {
    fontSize: fs(13),
    color: COLORS.textSecondary,
  },
  bankInfoValue: {
    fontSize: fs(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  bankInfoCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  copyBtn: {
    padding: scale(4),
    ...neuSurface.raisedSm,
    borderRadius: 999,
    padding: scale(8),
  },
  bankInstructions: {
    marginTop: scale(12),
    paddingTop: scale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  bankInstructionsLabel: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
    marginBottom: scale(4),
  },
  bankInstructionsText: {
    fontSize: fs(13),
    color: COLORS.textPrimary,
    lineHeight: scale(20),
  },

  // Section Title
  sectionTitle: {
    fontSize: fs(14),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: scale(12),
  },

  // Image Picker
  imagePickerButtons: {
    flexDirection: 'row',
    gap: scale(12),
    marginBottom: scale(20),
  },
  imagePickerBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(16),
    padding: scale(20),
    borderStyle: 'dashed',
    ...neuSurface.raisedSm,
  },
  imagePickerBtnText: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
    marginTop: scale(8),
    textAlign: 'center',
  },
  imagePreviewContainer: {
    marginBottom: scale(20),
    borderRadius: scale(16),
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: scale(200),
    borderRadius: scale(16),
  },
  removeImageBtn: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    borderRadius: scale(14),
    ...neuSurface.raisedSm,
  },

  // Form
  formGroup: {
    marginBottom: scale(16),
  },
  formLabel: {
    fontSize: fs(14),
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: scale(8),
  },
  formInput: {
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    fontSize: fs(16),
    color: COLORS.textPrimary,
    ...neuSurface.sunken,
  },
  formInputMultiline: {
    minHeight: scale(80),
    textAlignVertical: 'top',
  },

  // Verification Note
  verificationNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: neu.blue + '1A',
    padding: scale(12),
    borderRadius: scale(12),
    marginBottom: scale(20),
    gap: scale(10),
  },
  verificationNoteText: {
    flex: 1,
    fontSize: fs(13),
    color: COLORS.blue,
    lineHeight: scale(20),
  },

  // Submit Button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(14),
    paddingVertical: scale(16),
    gap: scale(8),
    ...neuSurface.raised,
    backgroundColor: neu.teal,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonText: {
    fontSize: fs(16),
    fontWeight: '600',
    color: neu.onAccent,
  },

  // Price Breakdown
  priceBreakdown: {
    marginTop: scale(16),
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    paddingTop: scale(12),
    ...neuSurface.sunken,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: scale(6),
  },
  priceRowTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    marginTop: scale(8),
    paddingTop: scale(12),
  },
  priceLabel: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
  },
  priceValue: {
    fontSize: fs(14),
    color: COLORS.textPrimary,
  },
  priceLabelTotal: {
    fontSize: fs(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  priceValueTotal: {
    fontSize: fs(18),
    fontWeight: '600',
    color: COLORS.lime,
  },

  // Card Options
  cardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(10),
    borderWidth: 1,
    ...neuSurface.raisedSm,
    borderColor: neu.raised,
  },
  cardOptionSelected: {
    ...neuSurface.sunkenSm,
  },
  cardOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  cardOptionInfo: {},
  cardOptionBrand: {
    fontSize: fs(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardOptionNumber: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  defaultBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(8),
    ...neuSurface.sunkenSm,
  },
  defaultBadgeText: {
    fontSize: fs(10),
    fontWeight: '600',
    color: COLORS.lime,
  },
  addCardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(16),
    gap: scale(8),
    marginBottom: scale(20),
    ...neuSurface.raisedSm,
    borderRadius: scale(12),
  },
  addCardOptionText: {
    fontSize: fs(14),
    fontWeight: '500',
    color: COLORS.purple,
  },
});
