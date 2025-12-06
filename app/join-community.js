// app/join-community.js - Unirse a Comunidad
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { verifyInvitationCode, acceptInvitationCode } from '../src/services/api';

export default function JoinCommunityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { refreshUser } = useAuth();
  
  const [code, setCode] = useState(params.code || '');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');

  // Si viene con código en params, verificar automáticamente
  useEffect(() => {
    if (params.code) {
      handleVerify();
    }
  }, [params.code]);

  const handleVerify = async () => {
    if (!code.trim()) {
      setError('Ingresa un código de invitación');
      return;
    }

    setVerifying(true);
    setError('');
    setInvitation(null);
    
    const res = await verifyInvitationCode(code.trim().toUpperCase());
    setVerifying(false);
    
    if (res.success) {
      setInvitation(res.data);
    } else {
      setError(res.error || 'Código inválido o expirado');
    }
  };

  const handleAccept = async () => {
    setLoading(true);
    const res = await acceptInvitationCode(code.trim().toUpperCase());
    setLoading(false);
    
    if (res.success) {
      Alert.alert(
        '¡Bienvenido!',
        res.message || `Te has unido a ${invitation.location_name}`,
        [{ text: 'Continuar', onPress: () => {
          if (refreshUser) refreshUser();
          router.replace('/my-unit');
        }}]
      );
    } else {
      Alert.alert('Error', res.error);
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'residential': return 'Residencial';
      case 'commercial': return 'Comercial';
      case 'industrial': return 'Industrial';
      case 'office': return 'Oficinas';
      default: return 'Comunidad';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Unirse a Comunidad</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Illustration */}
        <View style={styles.illustration}>
          <Text style={styles.illustrationIcon}>��️</Text>
        </View>

        <Text style={styles.title}>Ingresa tu código de invitación</Text>
        <Text style={styles.subtitle}>
          Solicita un código a tu administrador o usa el enlace de invitación que te compartieron
        </Text>

        {/* Code Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={(t) => {
              setCode(t.toUpperCase());
              setError('');
              setInvitation(null);
            }}
            placeholder="Ej: ABC123"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
          />
          <TouchableOpacity
            style={[styles.verifyBtn, !code.trim() && styles.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={!code.trim() || verifying}
          >
            {verifying ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Ionicons name="search" size={20} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Invitation Preview */}
        {invitation && (
          <View style={styles.invitationCard}>
            <View style={styles.invitationHeader}>
              <Ionicons name="checkmark-circle" size={24} color="#059669" />
              <Text style={styles.invitationTitle}>Invitación Válida</Text>
            </View>

            <View style={styles.invitationBody}>
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{invitation.location_name}</Text>
                <Text style={styles.locationType}>{getTypeLabel(invitation.location_type)}</Text>
              </View>

              {invitation.address && (
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={16} color="#6B7280" />
                  <Text style={styles.infoText}>{invitation.address}</Text>
                </View>
              )}

              <View style={styles.infoRow}>
                <Ionicons name="person" size={16} color="#6B7280" />
                <Text style={styles.infoText}>Rol: {invitation.role || 'Residente'}</Text>
              </View>

              {invitation.unit_number && (
                <View style={styles.infoRow}>
                  <Ionicons name="home" size={16} color="#6B7280" />
                  <Text style={styles.infoText}>Unidad: {invitation.unit_number}</Text>
                </View>
              )}

              {invitation.expires_at && (
                <View style={styles.expiresInfo}>
                  <Ionicons name="time" size={14} color="#F59E0B" />
                  <Text style={styles.expiresText}>
                    Expira: {new Date(invitation.expires_at).toLocaleDateString('es')}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.acceptBtn, loading && styles.acceptBtnDisabled]}
              onPress={handleAccept}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#FFF" />
                  <Text style={styles.acceptBtnText}>Unirme a {invitation.location_name}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Help Text */}
        {!invitation && (
          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>¿No tienes código?</Text>
            <Text style={styles.helpText}>
              Contacta al administrador de la comunidad a la que deseas unirte. 
              Ellos pueden generar un código o enlace de invitación desde el panel de administración.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },

  content: { flex: 1, padding: 24 },

  illustration: { alignItems: 'center', marginBottom: 24 },
  illustrationIcon: { fontSize: 64 },

  title: { fontSize: 22, fontWeight: '700', color: '#1F2937', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 32, lineHeight: 22 },

  inputContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  input: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 18, fontWeight: '600', letterSpacing: 2, textAlign: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  verifyBtn: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' },
  verifyBtnDisabled: { backgroundColor: '#9CA3AF' },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', padding: 12, borderRadius: 10, marginBottom: 16 },
  errorText: { fontSize: 14, color: '#DC2626', flex: 1 },

  // Invitation Card
  invitationCard: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  invitationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D1FAE5', padding: 14 },
  invitationTitle: { fontSize: 16, fontWeight: '600', color: '#059669' },
  invitationBody: { padding: 16 },
  locationInfo: { marginBottom: 16 },
  locationName: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  locationType: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  infoText: { fontSize: 14, color: '#374151' },
  expiresInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  expiresText: { fontSize: 13, color: '#F59E0B' },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#059669', padding: 16, margin: 16, marginTop: 0, borderRadius: 12 },
  acceptBtnDisabled: { backgroundColor: '#9CA3AF' },
  acceptBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  // Help
  helpSection: { marginTop: 32, padding: 20, backgroundColor: '#FFF', borderRadius: 12 },
  helpTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  helpText: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
});
