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
  tealDark: '#4BCDC7',
  lime: '#D4FE48',
  purple: '#6366F1',
  purpleLight: '#818CF8',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  green: '#10B981',
  red: '#EF4444',
  yellow: '#F59E0B',
  blue: '#3B82F6',
  orange: '#F97316',
};

// API Base URL
const API_URL = 'https://api.joinissy.com/api';

export default function Payments() {
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
    const date = new Date(dateString);
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
          <Text style={styles.loadingText}>{t('communityPayments.loading')}</Text>
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
            <Text style={styles.title}>{t('communityPayments.title')}</Text>
            <Text style={styles.subtitle}>{t('communityPayments.subtitle')}</Text>
          </View>
          <TouchableOpacity style={styles.methodsBtn} onPress={handleGoToMethods}>
            <Ionicons name="card-outline" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceDecoration}>
            <View style={[styles.decoCircle, styles.decoCircle1]} />
            <View style={[styles.decoCircle, styles.decoCircle2]} />
          </View>
          <View style={styles.balanceContent}>
            <View style={styles.balanceLeft}>
              <Text style={styles.balanceLabel}>{t('communityPayments.pendingBalance')}</Text>
              <Text style={styles.balanceAmount}>{formatCurrency(totalPending)}</Text>
              <Text style={styles.balanceCount}>
                {charges.pending.length} {charges.pending.length === 1 
                  ? t('communityPayments.pendingPayment') 
                  : t('communityPayments.pendingPayments')}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
            onPress={() => setActiveTab('pending')}
          >
            <Ionicons 
              name="time-outline" 
              size={18} 
              color={activeTab === 'pending' ? COLORS.background : COLORS.textSecondary} 
            />
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              {t('communityPayments.tabs.pending')}
            </Text>
            {charges.pending.length > 0 && (
              <View style={[styles.tabBadge, activeTab === 'pending' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'pending' && styles.tabBadgeTextActive]}>
                  {charges.pending.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Ionicons 
              name="checkmark-done-outline" 
              size={18} 
              color={activeTab === 'history' ? COLORS.background : COLORS.textSecondary} 
            />
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              {t('communityPayments.tabs.history')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'cards' && styles.tabActive]}
            onPress={() => setActiveTab('cards')}
          >
            <Ionicons 
              name="card-outline" 
              size={18} 
              color={activeTab === 'cards' ? COLORS.background : COLORS.textSecondary} 
            />
            <Text style={[styles.tabText, activeTab === 'cards' && styles.tabTextActive]}>
              {t('communityPayments.tabs.cards')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'cards' ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="card-outline" size={48} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>{t('communityPayments.empty.cards.title')}</Text>
            <Text style={styles.emptyText}>{t('communityPayments.empty.cards.subtitle')}</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleGoToMethods}>
              <Ionicons name="add" size={20} color={COLORS.textPrimary} />
              <Text style={styles.emptyButtonText}>{t('payments.addCard')}</Text>
            </TouchableOpacity>
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
            <Text style={styles.emptyTitle}>
              {activeTab === 'pending' 
                ? t('communityPayments.empty.pending.title')
                : t('communityPayments.empty.history.title')}
            </Text>
            <Text style={styles.emptyText}>
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
                          <Text style={styles.chargeTitle} numberOfLines={1}>
                            {charge.title}
                          </Text>
                          <Text style={styles.chargeDueDate}>
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
                        }]}>
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
                        }]}>
                          {getStatusText(charge.payment_status, charge.due_date)}
                        </Text>
                      </View>
                    )}

                    {/* Rejection reason */}
                    {charge.payment_status === 'rejected' && charge.rejection_reason && (
                      <View style={styles.rejectionBox}>
                        <Ionicons name="information-circle" size={16} color={COLORS.red} />
                        <Text style={styles.rejectionText}>{charge.rejection_reason}</Text>
                      </View>
                    )}
                    
                    {/* Payment Buttons - Only for pending without proof */}
                    {activeTab === 'pending' && charge.payment_status !== 'proof_submitted' && (
                      <View style={styles.paymentButtons}>
                        {canPayWithCard(charge) && (
                          <TouchableOpacity 
                            style={styles.payButtonCard}
                            onPress={() => openCardModal(charge)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="card" size={18} color={COLORS.background} />
                            <Text style={styles.payButtonCardText}>
                              {t('communityPayments.actions.payWithCard')}
                            </Text>
                          </TouchableOpacity>
                        )}
                        
                        {canPayWithProof(charge) && (
                          <TouchableOpacity 
                            style={styles.payButtonProof}
                            onPress={() => openProofModal(charge)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="cloud-upload" size={18} color={COLORS.purple} />
                            <Text style={styles.payButtonProofText}>
                              {t('communityPayments.actions.uploadProof')}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                    
                    {/* Waiting verification with view proof button */}
                    {charge.payment_status === 'proof_submitted' && (
                      <View style={styles.waitingContainer}>
                        <View style={styles.waitingBox}>
                          <Ionicons name="hourglass" size={16} color={COLORS.blue} />
                          <Text style={styles.waitingText}>
                            {t('communityPayments.proofUpload.verificationNote')}
                          </Text>
                        </View>
                        {charge.proof_of_payment && (
                          <TouchableOpacity 
                            style={styles.viewProofButton}
                            onPress={() => openPaymentDetail(charge)}
                          >
                            <Ionicons name="eye" size={16} color={COLORS.purple} />
                            <Text style={styles.viewProofButtonText}>Ver comprobante</Text>                         </TouchableOpacity>
                       )}
                     </View>
                   )}
                    
                    {/* Paid Badge */}
                    {activeTab === 'history' && (
                      <View style={styles.paidBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
                        <Text style={styles.paidBadgeText}>
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
              <Text style={styles.modalTitle}>{t('communityPayments.proofUpload.title')}</Text>
              <TouchableOpacity 
                style={styles.modalCloseBtn} 
                onPress={() => setProofModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Charge Info */}
              {selectedCharge && (
                <View style={styles.chargeInfoBox}>
                  <Text style={styles.chargeInfoTitle}>{selectedCharge.title}</Text>
                  <Text style={styles.chargeInfoAmount}>
                    {formatCurrency(selectedCharge.amount, selectedCharge.currency)}
                  </Text>
                </View>
              )}

              {/* Bank Info */}
              {paymentSettings?.bank_name && (
                <View style={styles.bankInfoBox}>
                  <Text style={styles.bankInfoTitle}>
                    {t('communityPayments.proofUpload.bankInfo')}
                  </Text>
                  
                  <View style={styles.bankInfoRow}>
                    <Text style={styles.bankInfoLabel}>
                      {t('communityPayments.proofUpload.bankName')}
                    </Text>
                    <Text style={styles.bankInfoValue}>{paymentSettings.bank_name}</Text>
                  </View>
                  
                  <View style={styles.bankInfoRow}>
                    <Text style={styles.bankInfoLabel}>
                      {t('communityPayments.proofUpload.accountNumber')}
                    </Text>
                    <View style={styles.bankInfoCopyRow}>
                      <Text style={styles.bankInfoValue}>{paymentSettings.bank_account_number}</Text>
                      <TouchableOpacity 
                        onPress={() => copyToClipboard(paymentSettings.bank_account_number)}
                        style={styles.copyBtn}
                      >
                        <Ionicons name="copy-outline" size={18} color={COLORS.purple} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.bankInfoRow}>
                    <Text style={styles.bankInfoLabel}>
                      {t('communityPayments.proofUpload.accountName')}
                    </Text>
                    <Text style={styles.bankInfoValue}>{paymentSettings.bank_account_name}</Text>
                  </View>

                  {paymentSettings.bank_instructions && (
                    <View style={styles.bankInstructions}>
                      <Text style={styles.bankInstructionsLabel}>
                        {t('communityPayments.proofUpload.instructions')}
                      </Text>
                      <Text style={styles.bankInstructionsText}>
                        {paymentSettings.bank_instructions}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Image Picker */}
              <Text style={styles.sectionTitle}>{t('communityPayments.proofUpload.subtitle')}</Text>
              
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
                  <TouchableOpacity 
                    style={styles.imagePickerBtn}
                    onPress={() => pickImage(true)}
                  >
                    <Ionicons name="camera" size={32} color={COLORS.purple} />
                    <Text style={styles.imagePickerBtnText}>
                      {t('communityPayments.proofUpload.takePhoto')}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.imagePickerBtn}
                    onPress={() => pickImage(false)}
                  >
                    <Ionicons name="images" size={32} color={COLORS.purple} />
                    <Text style={styles.imagePickerBtnText}>
                      {t('communityPayments.proofUpload.selectFromGallery')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Reference */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
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
                <Text style={styles.formLabel}>
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
                <Text style={styles.verificationNoteText}>
                  {t('communityPayments.proofUpload.verificationNote')}
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, !proofImage && styles.submitButtonDisabled]}
                onPress={submitProof}
                disabled={!proofImage || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.background} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={20} color={COLORS.background} />
                    <Text style={styles.submitButtonText}>
                      {t('communityPayments.proofUpload.submit')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

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
        <Text style={styles.modalTitle}>
          {selectedPaymentDetail?.payment_status === 'paid' 
            ? 'Detalle de Pago'
            : 'Comprobante Enviado'}
        </Text>
        <TouchableOpacity 
          style={styles.modalCloseBtn} 
          onPress={() => setDetailModalVisible(false)}
        >
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
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
                <Text style={styles.detailLabel}>Concepto</Text>
                <Text style={styles.detailValue}>{selectedPaymentDetail.title}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Monto</Text>
                <Text style={[styles.detailValue, { color: COLORS.lime, fontWeight: '700' }]}>
                  {formatCurrency(selectedPaymentDetail.amount, selectedPaymentDetail.currency)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Estado</Text>
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
                    ]}
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
                    <Text style={styles.detailLabel}>Pagado</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(selectedPaymentDetail.paid_at)}
                    </Text>
                  </View>
                )}

              {selectedPaymentDetail.proof_submitted_at && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Enviado</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selectedPaymentDetail.proof_submitted_at)}
                  </Text>
                </View>
              )}

              {selectedPaymentDetail.payment_method && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Método</Text>
                  <Text style={styles.detailValue}>
                    {selectedPaymentDetail.payment_method === 'card'
                      ? 'Tarjeta'
                      : 'Comprobante'}
                  </Text>
                </View>
              )}

              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailLabel}>Vencimiento</Text>
                <Text style={styles.detailValue}>
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
                <Text style={styles.verificationNoteText}>
                  {t('communityPayments.proofUpload.verificationNote')}
                </Text>
              </View>
            )}

            {selectedPaymentDetail.payment_status === 'paid' && (
              <View
                style={[
                  styles.verificationNote,
                  { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
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
                  ]}
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
    fontSize: scale(14),
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
  fontSize: scale(13),
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
  fontSize: scale(14),
  color: COLORS.textSecondary,
},
detailValue: {
  fontSize: scale(14),
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
  fontSize: scale(12),
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
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(4),
  },
  methodsBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },

  // Balance Card
  balanceCard: {
    backgroundColor: COLORS.purple,
    borderRadius: scale(20),
    padding: scale(20),
    marginTop: scale(8),
    overflow: 'hidden',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    fontSize: scale(13),
    color: 'rgba(255, 255, 255, 0.8)',
  },
  balanceAmount: {
    fontSize: scale(28),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: scale(4),
  },
  balanceCount: {
    fontSize: scale(12),
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: scale(4),
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: scale(16),
    marginTop: scale(20),
    padding: scale(4),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(12),
    borderRadius: scale(12),
    gap: scale(6),
  },
  tabActive: {
    backgroundColor: COLORS.lime,
  },
  tabText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.background,
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: COLORS.red,
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(10),
    minWidth: scale(20),
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: COLORS.background,
  },
  tabBadgeText: {
    fontSize: scale(11),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  tabBadgeTextActive: {
    color: COLORS.lime,
  },

  // Empty State
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: scale(20),
    padding: scale(40),
    alignItems: 'center',
    marginTop: scale(20),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  emptyIconBox: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: COLORS.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  emptyTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(4),
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purple,
    paddingVertical: scale(12),
    paddingHorizontal: scale(20),
    borderRadius: scale(12),
    marginTop: scale(20),
    gap: scale(8),
  },
  emptyButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // Charges List
  chargesList: {
    marginTop: scale(16),
  },

  // Charge Card
  chargeCard: {
    backgroundColor: COLORS.card,
    borderRadius: scale(16),
    marginBottom: scale(12),
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
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
  },
  chargeDetails: {
    flex: 1,
  },
  chargeTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  chargeDueDate: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(4),
  },
  chargeAmount: {
    fontSize: scale(18),
    fontWeight: '700',
  },

  // Status Badge
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: scale(4),
    paddingHorizontal: scale(10),
    borderRadius: scale(8),
    marginTop: scale(10),
  },
  statusBadgeText: {
    fontSize: scale(11),
    fontWeight: '600',
  },

  // Rejection Box
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: scale(10),
    borderRadius: scale(8),
    marginTop: scale(10),
    gap: scale(8),
  },
  rejectionText: {
    flex: 1,
    fontSize: scale(12),
    color: COLORS.red,
  },

  // Payment Buttons
  paymentButtons: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: scale(12),
  },
  payButtonCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    paddingVertical: scale(12),
    borderRadius: scale(12),
    gap: scale(6),
  },
  payButtonCardText: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.background,
  },
  payButtonProof: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: scale(12),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.purple,
    gap: scale(6),
  },
  payButtonProofText: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.purple,
  },

  // Waiting Box
  waitingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: scale(10),
    borderRadius: scale(8),
    marginTop: scale(10),
    gap: scale(8),
  },
  waitingText: {
    flex: 1,
    fontSize: scale(12),
    color: COLORS.blue,
  },

  // Paid Badge
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: scale(6),
    paddingHorizontal: scale(12),
    borderRadius: scale(20),
    marginTop: scale(12),
    gap: scale(4),
  },
  paidBadgeText: {
    fontSize: scale(12),
    color: COLORS.green,
    fontWeight: '500',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    maxHeight: '90%',
  },
  modalHandle: {
    width: scale(40),
    height: scale(4),
    backgroundColor: COLORS.textMuted,
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
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalCloseBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    paddingHorizontal: scale(20),
  },

  // Charge Info Box
  chargeInfoBox: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(20),
  },
  chargeInfoTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  chargeInfoAmount: {
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.lime,
  },

  // Bank Info Box
  bankInfoBox: {
    backgroundColor: COLORS.card,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(20),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  bankInfoTitle: {
    fontSize: scale(14),
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
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  bankInfoValue: {
    fontSize: scale(14),
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
  },
  bankInstructions: {
    marginTop: scale(12),
    paddingTop: scale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  bankInstructionsLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginBottom: scale(4),
  },
  bankInstructionsText: {
    fontSize: scale(13),
    color: COLORS.textPrimary,
    lineHeight: scale(20),
  },

  // Section Title
  sectionTitle: {
    fontSize: scale(14),
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderRadius: scale(16),
    padding: scale(20),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderStyle: 'dashed',
  },
  imagePickerBtnText: {
    fontSize: scale(12),
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
    backgroundColor: COLORS.background,
    borderRadius: scale(14),
  },

  // Form
  formGroup: {
    marginBottom: scale(16),
  },
  formLabel: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: scale(8),
  },
  formInput: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    fontSize: scale(16),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  formInputMultiline: {
    minHeight: scale(80),
    textAlignVertical: 'top',
  },

  // Verification Note
  verificationNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: scale(12),
    borderRadius: scale(12),
    marginBottom: scale(20),
    gap: scale(10),
  },
  verificationNoteText: {
    flex: 1,
    fontSize: scale(13),
    color: COLORS.blue,
    lineHeight: scale(20),
  },

  // Submit Button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    borderRadius: scale(14),
    paddingVertical: scale(16),
    gap: scale(8),
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.backgroundTertiary,
  },
  submitButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.background,
  },

  // Price Breakdown
  priceBreakdown: {
    marginTop: scale(16),
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    paddingTop: scale(12),
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
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  priceValue: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
  },
  priceLabelTotal: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  priceValueTotal: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.lime,
  },

  // Card Options
  cardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardOptionSelected: {
    borderColor: COLORS.lime,
  },
  cardOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  cardOptionInfo: {},
  cardOptionBrand: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardOptionNumber: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  defaultBadge: {
    backgroundColor: 'rgba(212, 254, 72, 0.2)',
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(8),
  },
  defaultBadgeText: {
    fontSize: scale(10),
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
  },
  addCardOptionText: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.purple,
  },
});
