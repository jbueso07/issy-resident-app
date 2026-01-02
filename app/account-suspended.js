// app/account-suspended.js
// ISSY Resident App - Pantalla de Cuenta Suspendida

import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useTranslation } from 'react-i18next';

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

const getSuspensionInfo = (t) => ({
  unpaid: {
    icon: '💰',
    title: t('accountSuspended.reasons.unpaid.title'),
    description: t('accountSuspended.reasons.unpaid.description'),
    action: t('accountSuspended.reasons.unpaid.action'),
    actionRoute: '/payments',
  },
  moved_out: {
    icon: '🏠',
    title: t('accountSuspended.reasons.movedOut.title'),
    description: t('accountSuspended.reasons.movedOut.description'),
    action: null,
  },
  rule_violation: {
    icon: '⚠️',
    title: t('accountSuspended.reasons.ruleViolation.title'),
    description: t('accountSuspended.reasons.ruleViolation.description'),
    action: null,
  },
  admin_suspended: {
    icon: '🛡️',
    title: t('accountSuspended.reasons.adminSuspended.title'),
    description: t('accountSuspended.reasons.adminSuspended.description'),
    action: null,
  },
  default: {
    icon: '🚫',
    title: t('accountSuspended.reasons.default.title'),
    description: t('accountSuspended.reasons.default.description'),
    action: null,
  },
});

export default function AccountSuspended() {
  const { t } = useTranslation();
  const SUSPENSION_INFO = getSuspensionInfo(t);
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
              {reason === 'unpaid' && `💰 ${t('accountSuspended.badges.unpaid')}`}
              {reason === 'moved_out' && `🏠 ${t('accountSuspended.badges.movedOut')}`}
              {reason === 'rule_violation' && `⚠️ ${t('accountSuspended.badges.ruleViolation')}`}
              {reason === 'admin_suspended' && `🛡️ ${t('accountSuspended.badges.adminSuspended')}`}
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
          <Text style={styles.contactButtonText}>📞 {t('accountSuspended.contactAdmin')}</Text>
        </TouchableOpacity>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>{t('accountSuspended.infoBox.title')}</Text>
          <Text style={styles.infoText}>
            {t('accountSuspended.infoBox.subtitle')}
          </Text>
          <Text style={styles.infoItem}>• {t('accountSuspended.infoBox.item1')}</Text>
          <Text style={styles.infoItem}>• {t('accountSuspended.infoBox.item2')}</Text>
          <Text style={styles.infoItem}>• {t('accountSuspended.infoBox.item3')}</Text>
          <Text style={[styles.infoText, { marginTop: 12 }]}>
            {t('accountSuspended.infoBox.reactivate')}
          </Text>
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>{t('accountSuspended.logout')}</Text>
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