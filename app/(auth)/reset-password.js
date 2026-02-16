// app/(auth)/reset-password.js
// ISSY Resident App - Reset Password Screen - ProHome Dark Theme + i18n

import { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../src/hooks/useTranslation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const API_URL = 'https://api.joinissy.com/api';

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
  red: '#EF4444',
};

export default function ResetPassword() {
  const { t } = useTranslation();
  const router = useRouter();
  const { token } = useLocalSearchParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError(t('auth.resetPassword.invalidLink', { defaultValue: 'Enlace de recuperación inválido. Solicita uno nuevo.' }));
    }
  }, [token]);

  const handleResetPassword = async () => {
    if (!password) {
      Alert.alert(t('common.error'), t('auth.errors.passwordRequired', { defaultValue: 'Contraseña requerida' }));
      return;
    }
    if (password.length < 8) {
      Alert.alert(t('common.error'), t('auth.errors.passwordMinLength', { defaultValue: 'La contraseña debe tener al menos 8 caracteres' }));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.errors.passwordsMismatch', { defaultValue: 'Las contraseñas no coinciden' }));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (data.success || response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || data.message || t('auth.resetPassword.error', { defaultValue: 'Error al restablecer contraseña. Solicita un nuevo enlace.' }));
      }
    } catch (err) {
      setError(t('auth.errors.genericError', { defaultValue: 'Error de conexión. Verifica tu internet.' }));
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={scale(64)} color={COLORS.green} />
          </View>

          <Text style={styles.title}>
            {t('auth.resetPassword.successTitle', { defaultValue: 'Contraseña actualizada' })}
          </Text>
          <Text style={styles.subtitle}>
            {t('auth.resetPassword.successMessage', { defaultValue: 'Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.' })}
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {t('auth.resetPassword.goToLogin', { defaultValue: 'Ir a Iniciar Sesión' })}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Error state (no token)
  if (error && !token) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={scale(64)} color={COLORS.red} />
          </View>

          <Text style={styles.title}>
            {t('auth.resetPassword.invalidTitle', { defaultValue: 'Enlace inválido' })}
          </Text>
          <Text style={styles.subtitle}>{error}</Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(auth)/forgot-password')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {t('auth.resetPassword.requestNew', { defaultValue: 'Solicitar nuevo enlace' })}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Form state
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
            <Ionicons name="key-outline" size={scale(48)} color={COLORS.lime} />
          </View>

          <Text style={styles.title}>
            {t('auth.resetPassword.title', { defaultValue: 'Nueva contraseña' })}
          </Text>
          <Text style={styles.subtitle}>
            {t('auth.resetPassword.subtitle', { defaultValue: 'Ingresa tu nueva contraseña.' })}
          </Text>

          {/* Error banner */}
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning" size={16} color={COLORS.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {t('auth.resetPassword.newPassword', { defaultValue: 'Nueva contraseña' })} *
            </Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t('auth.register.minChars', { defaultValue: 'Mínimo 8 caracteres' })}
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {t('auth.register.confirmPassword', { defaultValue: 'Confirmar contraseña' })} *
            </Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t('auth.register.repeatPassword', { defaultValue: 'Repetir contraseña' })}
                placeholderTextColor={COLORS.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {t('auth.resetPassword.submit', { defaultValue: 'Restablecer contraseña' })}
              </Text>
            )}
          </TouchableOpacity>
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
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    top: scale(16),
    left: 0,
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
    alignItems: 'center',
    marginBottom: scale(20),
  },
  title: {
    fontSize: scale(26),
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  subtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scale(20),
    marginBottom: scale(32),
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: scale(10),
    padding: scale(12),
    marginBottom: scale(20),
  },
  errorText: {
    color: COLORS.red,
    fontSize: scale(13),
    marginLeft: scale(8),
    flex: 1,
  },
  inputContainer: {
    marginBottom: scale(18),
  },
  inputLabel: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: scale(14),
    height: scale(52),
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: scale(16),
    fontSize: scale(15),
    color: COLORS.textPrimary,
  },
  eyeButton: {
    paddingHorizontal: scale(14),
  },
  primaryButton: {
    backgroundColor: COLORS.lime,
    borderRadius: scale(14),
    height: scale(52),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(12),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.background,
  },
});
