// app/(auth)/join-code.js
// ISSY Resident App - Join with Invitation Code + i18n

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useTranslation } from '../../src/hooks/useTranslation';

export default function JoinCode() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitationData, setInvitationData] = useState(null);
  const [step, setStep] = useState('input'); // 'input' | 'preview' | 'login'
  const { verifyInvitation, acceptInvitation, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      Alert.alert(t('common.error'), t('auth.joinCode.enterCode'));
      return;
    }

    setLoading(true);
    const result = await verifyInvitation(code.trim().toUpperCase());
    setLoading(false);

    if (result.success) {
      setInvitationData(result.data);
      setStep('preview');
    } else {
      Alert.alert(t('auth.joinCode.invalidCode'), result.error || t('auth.joinCode.codeNotExist'));
    }
  };

  const handleAcceptInvitation = async () => {
    if (!isAuthenticated) {
      // Guardar código y redirigir a login/registro
      setStep('login');
      return;
    }

    setLoading(true);
    const result = await acceptInvitation(code.trim().toUpperCase());
    setLoading(false);

    if (result.success) {
      Alert.alert(t('auth.joinCode.success'), t('auth.joinCode.joinedSuccessfully'), [
        { text: 'OK', onPress: () => router.replace('/(tabs)/home') }
      ]);
    } else {
      Alert.alert(t('common.error'), result.error || t('auth.joinCode.acceptFailed'));
    }
  };

  const getInvitationTypeLabel = (type) => {
    switch (type) {
      case 'organization': return t('auth.joinCode.types.community');
      case 'rental': return t('auth.joinCode.types.tenant');
      default: return t('auth.joinCode.types.invitation');
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return t('auth.joinCode.roles.admin');
      case 'guard': return t('auth.joinCode.roles.guard');
      case 'resident': return t('auth.joinCode.roles.resident');
      case 'owner': return t('auth.joinCode.roles.owner');
      case 'employee': return t('auth.joinCode.roles.employee');
      default: return t('auth.joinCode.roles.resident');
    }
  };

  // Step: Input code
  if (step === 'input') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.backButton}>
              <Text style={styles.backButtonText}>← {t('common.back')}</Text>
            </TouchableOpacity>
          </Link>

          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔑</Text>
          </View>

          <Text style={styles.title}>{t('auth.joinCode.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.joinCode.subtitle')}</Text>

          <View style={styles.codeInputContainer}>
            <TextInput
              style={styles.codeInput}
              placeholder={t('auth.joinCode.placeholder')}
              placeholderTextColor="#9CA3AF"
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={20}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerifyCode}
            disabled={loading || !code.trim()}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.joinCode.verifyCode')}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>{t('auth.joinCode.codeHint')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Step: Preview invitation
  if (step === 'preview') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              setStep('input');
              setInvitationData(null);
            }}
          >
            <Text style={styles.backButtonText}>← {t('auth.joinCode.changeCode')}</Text>
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Text style={styles.icon}>✅</Text>
          </View>

          <Text style={styles.title}>{t('auth.joinCode.validCode')}</Text>

          {/* Invitation Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('auth.joinCode.type')}:</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {getInvitationTypeLabel(invitationData?.invitation_type || invitationData?.type)}
                </Text>
              </View>
            </View>

            {invitationData?.organization?.name && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('auth.joinCode.community')}:</Text>
                <Text style={styles.detailValue}>{invitationData.organization.name}</Text>
              </View>
            )}

            {invitationData?.location?.name && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('auth.joinCode.location')}:</Text>
                <Text style={styles.detailValue}>{invitationData.location.name}</Text>
              </View>
            )}

            {invitationData?.role && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('auth.joinCode.role')}:</Text>
                <Text style={styles.detailValue}>{getRoleLabel(invitationData.role)}</Text>
              </View>
            )}

            {invitationData?.property?.name && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('auth.joinCode.property')}:</Text>
                <Text style={styles.detailValue}>{invitationData.property.name}</Text>
              </View>
            )}

            {invitationData?.unit?.unit_number && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('auth.joinCode.unit')}:</Text>
                <Text style={styles.detailValue}>{invitationData.unit.unit_number}</Text>
              </View>
            )}

            {invitationData?.invited_by?.name && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('auth.joinCode.invitedBy')}:</Text>
                <Text style={styles.detailValue}>{invitationData.invited_by.name}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAcceptInvitation}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isAuthenticated ? t('auth.joinCode.acceptInvitation') : t('common.next')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Step: Need login/register
  if (step === 'login') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>👤</Text>
          </View>

          <Text style={styles.title}>{t('auth.login')}</Text>
          <Text style={styles.subtitle}>{t('auth.joinCode.needAccount')}</Text>

          <View style={styles.authOptions}>
            <Link href={`/(auth)/login?code=${code}`} asChild>
              <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>{t('auth.login')}</Text>
              </TouchableOpacity>
            </Link>

            <Link href={`/(auth)/register?code=${code}`} asChild>
              <TouchableOpacity style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>{t('auth.joinCode.createNewAccount')}</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setStep('input')}
          >
            <Text style={styles.backButtonText}>← {t('auth.joinCode.useAnotherCode')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  backButtonText: {
    color: '#6366F1',
    fontSize: 16,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  codeInputContainer: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 24,
  },
  codeInput: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 20,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1F2937',
    letterSpacing: 4,
  },
  button: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    marginBottom: 24,
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
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  badge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#6366F1',
    fontSize: 13,
    fontWeight: '600',
  },
  authOptions: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 24,
  },
});