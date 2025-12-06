// app/payment-methods.js
// ISSY Resident App - Métodos de Pago (Clinpays)

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

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state - campos que espera Clinpays
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
    // Validaciones
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
      // Formatear cardExpiry como "MM/YY"
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
        setAsDefault: cards.length === 0 // Primera tarjeta es default
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
      `¿Estás seguro que deseas eliminar la tarjeta terminada en ${card.last_four || card.lastFour}?`,
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
        <Ionicons name="card-outline" size={64} color="#D1D5DB" />
      </View>
      <Text style={styles.emptyTitle}>Sin tarjetas</Text>
      <Text style={styles.emptySubtitle}>
        Agrega un método de pago para realizar transacciones
      </Text>
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
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
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Métodos de Pago</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
          <Ionicons name="add" size={24} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* Security info */}
      <View style={styles.securityInfo}>
        <Ionicons name="shield-checkmark" size={20} color="#10B981" />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} tintColor="#6366F1" />
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
      <TouchableOpacity style={styles.fab} onPress={() => setAddModalVisible(true)}>
        <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Add Card Modal */}
      <Modal visible={addModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => { setAddModalVisible(false); resetForm(); }}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>Agregar Tarjeta</Text>
              <View style={{ width: 40 }} />
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
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.formLabel}>Nombre</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={20} color="#9CA3AF" />
                    <TextInput
                      style={styles.input}
                      placeholder="Juan"
                      placeholderTextColor="#9CA3AF"
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.formLabel}>Apellido</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Pérez"
                      placeholderTextColor="#9CA3AF"
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
                  <Ionicons name="card-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    placeholder="1234 5678 9012 3456"
                    placeholderTextColor="#9CA3AF"
                    value={cardNumber}
                    onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                    keyboardType="numeric"
                    maxLength={19}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.formLabel}>Mes</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="MM"
                      placeholderTextColor="#9CA3AF"
                      value={expMonth}
                      onChangeText={(text) => setExpMonth(text.replace(/\D/g, '').substring(0, 2))}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                </View>
                <View style={[styles.formGroup, { flex: 1, marginHorizontal: 8 }]}>
                  <Text style={styles.formLabel}>Año</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="YY"
                      placeholderTextColor="#9CA3AF"
                      value={expYear}
                      onChangeText={(text) => setExpYear(text.replace(/\D/g, '').substring(0, 2))}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.formLabel}>CVV</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="123"
                      placeholderTextColor="#9CA3AF"
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
                  <Ionicons name="id-card-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    placeholder="0801-1990-12345"
                    placeholderTextColor="#9CA3AF"
                    value={idNumber}
                    onChangeText={setIdNumber}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Teléfono (opcional)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    placeholder="+504 9999-9999"
                    placeholderTextColor="#9CA3AF"
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
                <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.saveButtonGradient}>
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.saveButtonText}>Guardar Tarjeta</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Security Note */}
              <View style={styles.securityNote}>
                <Ionicons name="lock-closed" size={16} color="#6B7280" />
                <Text style={styles.securityNoteText}>
                  Tu información está encriptada y segura. Nunca almacenamos el CVV.
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  securityInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  securityText: { flex: 1, fontSize: 13, color: '#065F46' },
  listContent: { padding: 16, paddingBottom: 100 },
  cardContainer: { marginBottom: 16, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  cardGradient: { padding: 20, minHeight: 200 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  chip: { width: 45, height: 32, backgroundColor: '#D4AF37', borderRadius: 6 },
  cardBrand: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1 },
  cardNumber: { fontSize: 22, fontWeight: '500', color: '#FFFFFF', letterSpacing: 3, marginBottom: 24 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 4, letterSpacing: 1 },
  cardValue: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', letterSpacing: 1 },
  defaultBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  defaultBadgeText: { fontSize: 11, fontWeight: '500', color: '#FFFFFF' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 40 },
  hint: { textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 8 },
  fab: { position: 'absolute', bottom: 100, right: 20, borderRadius: 28, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  fabGradient: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalCloseButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  modalHeaderTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  modalContent: { flex: 1, padding: 20 },
  cardPreviewContainer: { marginBottom: 24, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  cardPreview: { padding: 20, minHeight: 200 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 12 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#1F2937' },
  row: { flexDirection: 'row' },
  saveButton: { borderRadius: 14, overflow: 'hidden', marginTop: 8, marginBottom: 16 },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  securityNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  securityNoteText: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
});
