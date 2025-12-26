// app/join/[code].js
// ISSY Resident App - Join Community via Deep Link

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';

const API_URL = 'https://api.joinissy.com/api';

const COLORS = {
  primary: '#6366F1',
  primaryLight: '#EEF2FF',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  gray: '#6B7280',
  grayLight: '#F3F4F6',
  grayDark: '#374151',
  white: '#FFFFFF',
  black: '#111827',
  background: '#F9FAFB',
  border: '#E5E7EB',
};

export default function JoinScreen() {
  const { code } = useLocalSearchParams();
  const router = useRouter();
  const { user, profile, token, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (code) {
      verifyInvitation();
    }
  }, [code]);

  const verifyInvitation = async () => {
    try {
      setLoading(true);
      setError('');

      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/invitations/verify/${code}`, {
        headers,
      });
      const data = await response.json();

      if (data.success) {
        setInvitation(data.data);
      } else {
        setError(data.error || 'Código de invitación inválido o expirado');
      }
    } catch (err) {
      console.error('Error verifying invitation:', err);
      setError('Error al verificar la invitación');
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!user || !token) {
      // Guardar código y redirigir a login
      Alert.alert(
        'Iniciar sesión',
        'Necesitas iniciar sesión para aceptar la invitación',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Iniciar sesión',
            onPress: () => {
              // Guardar código pendiente
              router.push('/login');
            },
          },
        ]
      );
      return;
    }

    try {
      setAccepting(true);
      setError('');

      const response = await fetch(`${API_URL}/invitations/accept/${code}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        
        // Refrescar perfil para obtener la nueva ubicación
        await refreshProfile();
        
        setTimeout(() => {
          router.replace('/(tabs)/home');
        }, 2000);
      } else {
        setError(data.error || 'Error al aceptar la invitación');
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('Error al procesar la invitación');
    } finally {
      setAccepting(false);
    }
  };

  const formatCurrency = (amount, currency = 'HNL') => {
    const symbol = currency === 'HNL' ? 'L' : '$';
    return `${symbol} ${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'guard': return 'Guardia';
      case 'superadmin': return 'Super Admin';
      default: return 'Residente';
    }
  };

  // =====================================================
  // RENDER: Loading
  // =====================================================
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Verificando invitación...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // RENDER: Success
  // =====================================================
  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>¡Te has unido exitosamente!</Text>
          <Text style={styles.successSubtitle}>
            Ahora eres parte de {invitation?.location?.name || 'la comunidad'}
          </Text>
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // RENDER: Error (no invitation)
  // =====================================================
  if (error && !invitation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="close-circle" size={80} color={COLORS.danger} />
          </View>
          <Text style={styles.errorTitle}>Invitación no válida</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace('/(tabs)/home')}
          >
            <Text style={styles.secondaryButtonText}>Ir al inicio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // RENDER: Invitation Details
  // =====================================================
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invitación</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Icon */}
        <View style={styles.mainIconContainer}>
          <View style={styles.mainIcon}>
            <Text style={{ fontSize: 48 }}>
              {invitation?.type === 'rental' ? '🏠' : '🏘️'}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>Te han invitado</Text>
        <Text style={styles.subtitle}>
          Revisa los detalles antes de aceptar
        </Text>

        {/* Type Badge */}
        <View style={[
          styles.typeBadge,
          { backgroundColor: invitation?.type === 'rental' ? '#DBEAFE' : COLORS.primaryLight }
        ]}>
          <Text style={[
            styles.typeBadgeText,
            { color: invitation?.type === 'rental' ? '#1E40AF' : COLORS.primary }
          ]}>
            {invitation?.type === 'rental' ? '🏠 Invitación de Inquilino' : '🏘️ Invitación de Comunidad'}
          </Text>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          {/* Organization invitation */}
          {invitation?.type === 'organization' && (
            <>
              <DetailRow label="Comunidad" value={invitation.location?.name || 'N/A'} />
              <DetailRow label="Dirección" value={invitation.location?.address || 'N/A'} />
              <DetailRow label="Ciudad" value={invitation.location?.city || 'N/A'} />
              <DetailRow label="Rol asignado" value={getRoleName(invitation.role)} />
            </>
          )}

          {/* Rental invitation */}
          {invitation?.type === 'rental' && (
            <>
              <DetailRow label="Propiedad" value={invitation.property?.name || 'N/A'} />
              <DetailRow label="Unidad" value={invitation.unit?.unit_number || 'N/A'} />
              {invitation.lease && (
                <>
                  <DetailRow 
                    label="Renta mensual" 
                    value={formatCurrency(invitation.lease.rent_amount, invitation.lease.currency)} 
                  />
                  <DetailRow 
                    label="Fecha inicio" 
                    value={new Date(invitation.lease.start_date).toLocaleDateString('es-HN')} 
                  />
                </>
              )}
            </>
          )}

          {/* Invited by */}
          {invitation?.invited_by && (
            <DetailRow 
              label="Invitado por" 
              value={invitation.invited_by.name} 
              isLast 
            />
          )}
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="warning" size={18} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* User status */}
        {!user && (
          <View style={styles.warningBox}>
            <Ionicons name="information-circle" size={18} color={COLORS.warning} />
            <Text style={styles.warningText}>
              Necesitas iniciar sesión para aceptar esta invitación
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, accepting && styles.buttonDisabled]}
            onPress={acceptInvitation}
            disabled={accepting}
          >
            {accepting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                <Text style={styles.primaryButtonText}>
                  {user ? 'Aceptar Invitación' : 'Iniciar sesión y aceptar'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace('/(tabs)/home')}
          >
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Detail Row Component
const DetailRow = ({ label, value, isLast }) => (
  <View style={[styles.detailRow, isLast && styles.detailRowLast]}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.black,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.gray,
  },
  mainIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mainIcon: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  typeBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  typeBadgeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.dangerLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.danger,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.warningLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.grayDark,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
  },
  errorIconContainer: {
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
});