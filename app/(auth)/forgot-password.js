// app/(auth)/forgot-password.js
// ISSY Resident App - Recuperar Contraseña - ProHome Dark Theme + i18n

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../src/hooks/useTranslation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const API_URL = 'https://api.joinissy.com/api';

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
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  green: '#10B981',
};

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert(t('common.error'), t('auth.errors.emailRequired'));
      return;
    }

    if (!email.includes('@')) {
      Alert.alert(t('common.error'), t('auth.errors.invalidEmail'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (data.success) {
        setSent(true);
      } else {
        // Mostrar éxito aunque el email no exista (seguridad)
        setSent(true);
      }
    } catch (error) {
      // Mostrar éxito de todas formas por seguridad
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <View style={styles.successIcon}>
            <Ionicons name="mail" size={scale(48)} color={COLORS.teal} />
          </View>
          
          <Text style={styles.successTitle}>{t('auth.forgotPassword.checkEmail')}</Text>
          <Text style={styles.successText}>
            {t('auth.forgotPassword.emailSentMessage', { email })}
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>{t('auth.forgotPassword.backToLogin')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setSent(false);
              setEmail('');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>{t('auth.forgotPassword.tryAnotherEmail')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="lock-open-outline" size={scale(48)} color={COLORS.lime} />
          </View>

          <Text style={styles.title}>{t('auth.forgotPassword.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.forgotPassword.subtitle')}</Text>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('auth.email')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.primaryButtonText}>{t('auth.forgotPassword.sendLink')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Back to login */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.forgotPassword.rememberPassword')} </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>{t('auth.login')}</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(32),
  },
  header: {
    paddingVertical: scale(16),
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
  iconContainer: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: 'rgba(212, 254, 72, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: scale(20),
    marginBottom: scale(32),
  },
  title: {
    fontSize: scale(26),
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: scale(12),
  },
  subtitle: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scale(22),
    marginBottom: scale(40),
    paddingHorizontal: scale(10),
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: scale(24),
  },
  inputLabel: {
    fontSize: scale(15),
    color: COLORS.textPrimary,
    marginBottom: scale(10),
    fontWeight: '500',
  },
  input: {
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: scale(14),
    height: scale(54),
    paddingHorizontal: scale(18),
    fontSize: scale(16),
    color: COLORS.textPrimary,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    borderRadius: scale(14),
    height: scale(54),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: scale(16),
    color: COLORS.background,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderRadius: scale(14),
    height: scale(54),
    marginTop: scale(12),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  secondaryButtonText: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(40),
  },
  footerText: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
  },
  footerLink: {
    fontSize: scale(15),
    color: COLORS.teal,
    fontWeight: '600',
  },
  successIcon: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: 'rgba(93, 222, 216, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: scale(80),
    marginBottom: scale(32),
  },
  successTitle: {
    fontSize: scale(26),
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: scale(16),
  },
  successText: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scale(22),
    marginBottom: scale(40),
    paddingHorizontal: scale(10),
  },
});