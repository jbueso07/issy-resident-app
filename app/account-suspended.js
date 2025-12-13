// app/account-suspended.js
// ISSY Resident App - Pantalla de Cuenta Suspendida

import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

const COLORS = {
  primary: '#6366F1',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  navy: '#1A1A2E',
  white: '#FFFFFF',
  background: '#F3F4F6',
  gray: '#6B7280',
  grayLight: '#E5E7EB',
};

const SUSPENSION_INFO = {
  unpaid: {
    icon: '💰',
    title: 'Cuenta Suspendida por Falta de Pago',
    description: 'Tu cuenta ha sido suspendida debido a pagos pendientes. Para reactivar tu cuenta, por favor realiza el pago de los montos adeudados.',
    action: 'Ver Pagos Pendientes',
    actionRoute: '/payments',
  },
  moved_out: {
    icon: '🏠',
    title: 'Cuenta Desactivada',
    description: 'Tu cuenta ha sido desactivada porque ya no resides en esta ubicación. Si esto es un error, contacta a administración.',
    action: null,
  },
  rule_violation: {
    icon: '⚠️',
    title: 'Cuenta Suspendida',
    description: 'Tu cuenta ha sido suspendida por violación del reglamento. Contacta a administración para más información.',
    action: null,
  },
  admin_suspended: {
    icon: '🛡️',
    title: 'Cuenta Suspendida',
    description: 'Tu cuenta ha sido suspendida por el administrador. Contacta a administración para más información.',
    action: null,
  },
  default: {
    icon: '🚫',
    title: 'Cuenta Suspendida',
    description: 'Tu cuenta ha sido suspendida. Contacta a administración para más información.',
    action: null,
  },
};

export default function AccountSuspended() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { logout } = useAuth();

  const reason = params.reason || 'default';
  const message = params.message;
  const info = SUSPENSION_INFO[reason] || SUSPENSION_INFO.default;

  const handleAction = () => {
    if (info.actionRoute) {
      router.push(info.actionRoute);
    }
  };

  const handleContact = () => {
    // Puedes cambiar este número por el de soporte
    Linking.openURL('tel:+50412345678');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{info.icon}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{info.title}</Text>

        {/* Message */}
        <Text style={styles.description}>
          {message || info.description}
        </Text>

        {/* Reason Badge */}
        {reason !== 'default' && (
          <View style={styles.reasonBadge}>
            <Text style={styles.reasonBadgeText}>
              {reason === 'unpaid' && '💰 Falta de Pago'}
              {reason === 'moved_out' && '🏠 Ya no reside'}
              {reason === 'rule_violation' && '⚠️ Violación de Reglas'}
              {reason === 'admin_suspended' && '🛡️ Suspensión Administrativa'}
            </Text>
          </View>
        )}

        {/* Action Button (if applicable) */}
        {info.action && (
          <TouchableOpacity style={styles.actionButton} onPress={handleAction}>
            <Text style={styles.actionButtonText}>{info.action}</Text>
          </TouchableOpacity>
        )}

        {/* Contact Button */}
        <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
          <Text style={styles.contactButtonText}>📞 Contactar Administración</Text>
        </TouchableOpacity>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>¿Qué significa esto?</Text>
          <Text style={styles.infoText}>
            Mientras tu cuenta esté suspendida:
          </Text>
          <Text style={styles.infoItem}>• No podrás generar códigos QR para visitantes</Text>
          <Text style={styles.infoItem}>• Tus códigos QR existentes están bloqueados</Text>
          <Text style={styles.infoItem}>• No podrás acceder a ciertas funciones</Text>
          <Text style={[styles.infoText, { marginTop: 12 }]}>
            Para reactivar tu cuenta, contacta a la administración de tu comunidad.
          </Text>
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.danger + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  reasonBadge: {
    backgroundColor: COLORS.danger + '15',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  reasonBadgeText: {
    fontSize: 14,
    color: COLORS.danger,
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  contactButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  contactButtonText: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
  },
  infoItem: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
    marginLeft: 8,
  },
  footer: {
    padding: 24,
    paddingTop: 0,
  },
  logoutButton: {
    backgroundColor: COLORS.danger + '15',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '600',
  },
});