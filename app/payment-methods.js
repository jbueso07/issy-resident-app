// app/payment-methods.js
// ISSY Resident App - Métodos de Pago (Clinpays) - ProHome Dark Theme

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/context/AuthContext';
import { 
  getPaymentMethods, 
  addPaymentMethod, 
  deletePaymentMethod,
  setDefaultPaymentMethod 
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
  purpleLight: '#818CF8',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  green: '#10B981',
  red: '#EF4444',
  yellow: '#F59E0B',
};

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  const fetchCards = async () => {
    try {
      const result = await getPaymentMethods();
      if (result.success) {
        setCards(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCards();
  }, []);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setCardNumber('');
    setExpMonth('');
    setExpYear('');
    setCvv('');
    setIdNumber('');
    setMobileNumber('');
  };

  const formatCardNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted.substring(0, 19);
  };

  const getCardBrand = (number) => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.startsWith('4')) return 'visa';
    if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'discover';
    return 'generic';
  };

  const getCardColor = (brand) => {
    switch (brand) {
      case 'visa': return ['#1A1F71', '#2B308C'];
      case 'mastercard': return ['#EB001B', '#F79E1B'];
      case 'amex': return ['#006FCF', '#0080FF'];
      default: return ['#374151', '#6B7280'];
    }
  };

  const handleAddCard = async () => {
    const cleanNumber = cardNumber.replace(/\D/g, '');
    
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Ingresa nombre y apellido');
      return;
    }
    if (cleanNumber.length < 15) {
      Alert.alert('Error', 'Número de tarjeta inválido');
      return;
    }
    if (!expMonth || !expYear || parseInt(expMonth) > 12 || parseInt(expMonth) < 1) {
      Alert.alert('Error', 'Fecha de expiración inválida');
      return;
    }
    if (cvv.length < 3) {
      Alert.alert('Error', 'CVV inválido');
      return;
    }
    if (!idNumber.trim()) {
      Alert.alert('Error', 'Ingresa tu número de identidad');
      return;
    }

    setSubmitting(true);
    try {
      const cardExpiry = `${expMonth.padStart(2, '0')}/${expYear.length === 4 ? expYear.slice(-2) : expYear}`;
      
      const result = await addPaymentMethod({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: user?.email || '',
        mobileNumber: mobileNumber.trim() || user?.phone || '',
        idNumber: idNumber.trim(),
        cardNumber: cleanNumber,
        cardExpiry: cardExpiry,
        cardCvv: cvv,
        setAsDefault: cards.length === 0
      });

      if (result.success) {
        Alert.alert('¡Éxito!', 'Tarjeta agregada correctamente');
        setAddModalVisible(false);
        resetForm();
        fetchCards();
      } else {
        Alert.alert('Error', result.error || 'No se pudo agregar la tarjeta');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al agregar la tarjeta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCard = (card) => {
    Alert.alert(
      'Eliminar Tarjeta',
      `¿Eliminar tarjeta terminada en ${card.last_four || card.lastFour}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            const result = await deletePaymentMethod(card.id);
            if (result.success) {
              Alert.alert('Eliminada', 'La tarjeta ha sido eliminada');
              fetchCards();
            } else {
              Alert.alert('Error', result.error || 'No se pudo eliminar');
            }
          }
        },
      ]
    );
  };

  const handleSetDefault = async (card) => {
    if (card.is_default) return;
    
    const result = await setDefaultPaymentMethod(card.id);
    if (result.success) {
      fetchCards();
    } else {
      Alert.alert('Error', result.error || 'No se pudo establecer como predeterminada');
    }
  };

  const renderCard = ({ item }) => {
    const brand = item.brand?.toLowerCase() || 'generic';
    const colors = getCardColor(brand);
    const lastFour = item.last_four || item.lastFour || '****';
    const holderName = item.card_holder || item.cardHolder || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'TITULAR';

    return (
      <TouchableOpacity
        style={styles.cardContainer}
        onPress={() => handleSetDefault(item)}
        onLongPress={() => handleDeleteCard(item)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardTop}>
            <View style={styles.chip} />
            <Text style={styles.cardBrand}>{brand.toUpperCase()}</Text>
          </View>

          <Text style={styles.cardNumber}>•••• •••• •••• {lastFour}</Text>

          <View style={styles.cardBottom}>
            <View>
              <Text style={styles.cardLabel}>TITULAR</Text>
              <Text style={styles.cardValue}>{holderName.toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.cardLabel}>VENCE</Text>
              <Text style={styles.cardValue}>
                {item.exp_month || item.expiryMonth || '00'}/{String(item.exp_year || item.expiryYear || '00').slice(-2)}
              </Text>
            </View>
          </View>

          {item.is_default && (
            <View style={styles.defaultBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
              <Text style={styles.defaultBadgeText}>Predeterminada</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="card-outline" size={64} color={COLORS.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>Sin tarjetas</Text>
      <Text style={styles.emptySubtitle}>
        Agrega un método de pago para realizar transacciones
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={() => setAddModalVisible(true)}>
        <Ionicons name="add" size={20} color={COLORS.textPrimary} />
        <Text style={styles.emptyButtonText}>Agregar Tarjeta</Text>
      </TouchableOpacity>
    </View>
  );

  const cardBrand = getCardBrand(cardNumber);
  const previewColors = getCardColor(cardBrand);
  const displayName = `${firstName} ${lastName}`.trim() || 'NOMBRE APELLIDO';
  const displayExpiry = expMonth && expYear 
    ? `${expMonth.padStart(2, '0')}/${expYear.length === 4 ? expYear.slice(-2) : expYear}` 
    : 'MM/YY';

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Cargando tarjetas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Métodos de Pago</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
          <Ionicons name="add" size={24} color={COLORS.lime} />
        </TouchableOpacity>
      </View>

      {/* Security info */}
      <View style={styles.securityInfo}>
        <Ionicons name="shield-checkmark" size={20} color={COLORS.green} />
        <Text style={styles.securityText}>
          Tus tarjetas están protegidas con encriptación de grado bancario
        </Text>
      </View>

      {/* Cards list */}
      <FlatList
        data={cards}
        renderItem={renderCard}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.purple} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          cards.length > 0 ? (
            <Text style={styles.hint}>Mantén presionada una tarjeta para eliminarla</Text>
          ) : null
        }
      />

      {/* FAB */}
      {cards.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => setAddModalVisible(true)}>
          <View style={styles.fabInner}>
            <Ionicons name="add" size={28} color={COLORS.background} />
          </View>
        </TouchableOpacity>
      )}

      {/* Add Card Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.keyboardAvoid}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHandle} />
              
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>Agregar Tarjeta</Text>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => { setAddModalVisible(false); resetForm(); }}>
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {/* Card Preview */}
                <View style={styles.cardPreviewContainer}>
                  <LinearGradient colors={previewColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardPreview}>
                    <View style={styles.cardTop}>
                      <View style={styles.chip} />
                      <Text style={styles.cardBrand}>{cardBrand.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.cardNumber}>{cardNumber || '•••• •••• •••• ••••'}</Text>
                    <View style={styles.cardBottom}>
                      <View>
                        <Text style={styles.cardLabel}>TITULAR</Text>
                        <Text style={styles.cardValue}>{displayName.toUpperCase()}</Text>
                      </View>
                      <View>
                        <Text style={styles.cardLabel}>VENCE</Text>
                        <Text style={styles.cardValue}>{displayExpiry}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </View>

                {/* Form */}
                <View style={styles.row}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: scale(6) }]}>
                    <Text style={styles.formLabel}>Nombre</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="Juan"
                        placeholderTextColor={COLORS.textMuted}
                        value={firstName}
                        onChangeText={setFirstName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: scale(6) }]}>
                    <Text style={styles.formLabel}>Apellido</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="Pérez"
                        placeholderTextColor={COLORS.textMuted}
                        value={lastName}
                        onChangeText={setLastName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Número de Tarjeta</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="card-outline" size={20} color={COLORS.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="1234 5678 9012 3456"
                      placeholderTextColor={COLORS.textMuted}
                      value={cardNumber}
                      onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                      keyboardType="numeric"
                      maxLength={19}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: scale(6) }]}>
                    <Text style={styles.formLabel}>Mes</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="MM"
                        placeholderTextColor={COLORS.textMuted}
                        value={expMonth}
                        onChangeText={(text) => setExpMonth(text.replace(/\D/g, '').substring(0, 2))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginHorizontal: scale(6) }]}>
                    <Text style={styles.formLabel}>Año</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="YY"
                        placeholderTextColor={COLORS.textMuted}
                        value={expYear}
                        onChangeText={(text) => setExpYear(text.replace(/\D/g, '').substring(0, 2))}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: scale(6) }]}>
                    <Text style={styles.formLabel}>CVV</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="123"
                        placeholderTextColor={COLORS.textMuted}
                        value={cvv}
                        onChangeText={(text) => setCvv(text.replace(/\D/g, '').substring(0, 4))}
                        keyboardType="numeric"
                        maxLength={4}
                        secureTextEntry
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Número de Identidad</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="id-card-outline" size={20} color={COLORS.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="0801-1990-12345"
                      placeholderTextColor={COLORS.textMuted}
                      value={idNumber}
                      onChangeText={setIdNumber}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Teléfono (opcional)</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="call-outline" size={20} color={COLORS.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="+504 9999-9999"
                      placeholderTextColor={COLORS.textMuted}
                      value={mobileNumber}
                      onChangeText={setMobileNumber}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
                  onPress={handleAddCard}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={COLORS.background} />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.background} />
                      <Text style={styles.saveButtonText}>Guardar Tarjeta</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Security Note */}
                <View style={styles.securityNote}>
                  <Ionicons name="lock-closed" size={16} color={COLORS.textMuted} />
                  <Text style={styles.securityNoteText}>
                    Tu información está encriptada y segura. Nunca almacenamos el CVV.
                  </Text>
                </View>

                <View style={{ height: scale(40) }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: scale(12), 
    fontSize: scale(16), 
    color: COLORS.textSecondary 
  },
  
  // Header
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: scale(16), 
    paddingVertical: scale(12),
  },
  backButton: { 
    width: scale(44), 
    height: scale(44), 
    borderRadius: scale(22), 
    backgroundColor: COLORS.card, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerTitle: { 
    fontSize: scale(18), 
    fontWeight: '600', 
    color: COLORS.textPrimary 
  },
  addButton: { 
    width: scale(44), 
    height: scale(44), 
    borderRadius: scale(22), 
    backgroundColor: COLORS.card, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  
  // Security Info
  securityInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(16, 185, 129, 0.1)', 
    marginHorizontal: scale(16),
    paddingHorizontal: scale(16), 
    paddingVertical: scale(12), 
    borderRadius: scale(12),
    gap: scale(10),
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  securityText: { 
    flex: 1, 
    fontSize: scale(13), 
    color: COLORS.green 
  },
  
  // List
  listContent: { 
    padding: scale(16), 
    paddingBottom: scale(100) 
  },
  
  // Card
  cardContainer: { 
    marginBottom: scale(16), 
    borderRadius: scale(16), 
    overflow: 'hidden', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 12, 
    elevation: 8 
  },
  cardGradient: { 
    padding: scale(20), 
    minHeight: scale(200) 
  },
  cardTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: scale(24) 
  },
  chip: { 
    width: scale(45), 
    height: scale(32), 
    backgroundColor: '#D4AF37', 
    borderRadius: scale(6) 
  },
  cardBrand: { 
    fontSize: scale(18), 
    fontWeight: '700', 
    color: '#FFFFFF', 
    letterSpacing: 1 
  },
  cardNumber: { 
    fontSize: scale(22), 
    fontWeight: '500', 
    color: '#FFFFFF', 
    letterSpacing: 3, 
    marginBottom: scale(24) 
  },
  cardBottom: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  cardLabel: { 
    fontSize: scale(10), 
    color: 'rgba(255,255,255,0.7)', 
    marginBottom: scale(4), 
    letterSpacing: 1 
  },
  cardValue: { 
    fontSize: scale(14), 
    fontWeight: '600', 
    color: '#FFFFFF', 
    letterSpacing: 1 
  },
  defaultBadge: { 
    position: 'absolute', 
    top: scale(12), 
    right: scale(12), 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    paddingHorizontal: scale(8), 
    paddingVertical: scale(4), 
    borderRadius: scale(12), 
    gap: scale(4) 
  },
  defaultBadgeText: { 
    fontSize: scale(11), 
    fontWeight: '500', 
    color: '#FFFFFF' 
  },
  
  // Empty State
  emptyState: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: scale(60) 
  },
  emptyIconContainer: { 
    width: scale(100), 
    height: scale(100), 
    borderRadius: scale(50), 
    backgroundColor: COLORS.card, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: scale(24),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  emptyTitle: { 
    fontSize: scale(20), 
    fontWeight: '600', 
    color: COLORS.textPrimary, 
    marginBottom: scale(8) 
  },
  emptySubtitle: { 
    fontSize: scale(14), 
    color: COLORS.textSecondary, 
    textAlign: 'center', 
    paddingHorizontal: scale(40) 
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purple,
    paddingVertical: scale(14),
    paddingHorizontal: scale(24),
    borderRadius: scale(12),
    marginTop: scale(24),
    gap: scale(8),
  },
  emptyButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  hint: { 
    textAlign: 'center', 
    fontSize: scale(12), 
    color: COLORS.textMuted, 
    marginTop: scale(8) 
  },
  
  // FAB
  fab: { 
    position: 'absolute', 
    bottom: scale(100), 
    right: scale(20), 
    shadowColor: COLORS.lime, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 8 
  },
  fabInner: { 
    width: scale(56), 
    height: scale(56), 
    borderRadius: scale(28), 
    backgroundColor: COLORS.lime,
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
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
  modalCloseButton: { 
    width: scale(40), 
    height: scale(40), 
    borderRadius: scale(20), 
    backgroundColor: COLORS.backgroundTertiary, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  modalHeaderTitle: { 
    fontSize: scale(18), 
    fontWeight: '600', 
    color: COLORS.textPrimary 
  },
  modalContent: { 
    paddingHorizontal: scale(20),
  },
  
  // Card Preview
  cardPreviewContainer: { 
    marginBottom: scale(24), 
    borderRadius: scale(16), 
    overflow: 'hidden', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 12, 
    elevation: 8 
  },
  cardPreview: { 
    padding: scale(20), 
    minHeight: scale(180) 
  },
  
  // Form
  formGroup: { 
    marginBottom: scale(16) 
  },
  formLabel: { 
    fontSize: scale(14), 
    fontWeight: '500', 
    color: COLORS.textSecondary, 
    marginBottom: scale(8) 
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.backgroundTertiary, 
    borderRadius: scale(12), 
    paddingHorizontal: scale(16), 
    borderWidth: 1, 
    borderColor: COLORS.cardBorder, 
    gap: scale(12) 
  },
  input: { 
    flex: 1, 
    paddingVertical: scale(14), 
    fontSize: scale(16), 
    color: COLORS.textPrimary 
  },
  row: { 
    flexDirection: 'row' 
  },
  
  // Save Button
  saveButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    borderRadius: scale(14), 
    paddingVertical: scale(16),
    marginTop: scale(8), 
    marginBottom: scale(16),
    gap: scale(8),
  },
  saveButtonDisabled: { 
    opacity: 0.7 
  },
  saveButtonText: { 
    color: COLORS.background, 
    fontSize: scale(16), 
    fontWeight: '600' 
  },
  
  // Security Note
  securityNote: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: scale(8), 
    paddingVertical: scale(16) 
  },
  securityNoteText: { 
    fontSize: scale(12), 
    color: COLORS.textMuted, 
    textAlign: 'center' 
  },
});