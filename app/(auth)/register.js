// app/(auth)/register.js
// ISSY Resident App - Register Screen - ProHome Dark Theme + i18n

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
  ScrollView,
  Linking,
  Dimensions,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useTranslation } from '../../src/hooks/useTranslation';

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
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
};

export default function Register() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUp, verifyInvitation } = useAuth();
  const router = useRouter();

  const openTerms = () => {
    Linking.openURL('https://joinissy.com/terminos.html');
  };

  const openPrivacy = () => {
    Linking.openURL('https://joinissy.com/privacidad.html');
  };

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('auth.errors.nameRequired'));
      return false;
    }
    if (!email.trim()) {
      Alert.alert(t('common.error'), t('auth.errors.emailRequired'));
      return false;
    }
    if (!email.includes('@')) {
      Alert.alert(t('common.error'), t('auth.errors.invalidEmail'));
      return false;
    }
    if (!password) {
      Alert.alert(t('common.error'), t('auth.errors.passwordRequired'));
      return false;
    }
    if (password.length < 6) {
      Alert.alert(t('common.error'), t('auth.errors.passwordMinLength'));
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.errors.passwordsMismatch'));
      return false;
    }
    if (!acceptedTerms) {
      Alert.alert(t('common.error'), t('auth.errors.acceptTerms'));
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      let invitationData = null;
      if (invitationCode.trim()) {
        const invResult = await verifyInvitation(invitationCode.trim().toUpperCase());
        if (!invResult.success) {
          Alert.alert(t('common.error'), invResult.error || t('auth.errors.invalidInvitationCode'));
          setLoading(false);
          return;
        }
        invitationData = invResult.data;
      }

      const result = await signUp({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        password,
        invitation_code: invitationCode.trim().toUpperCase() || null,
      });

      if (result.success) {
        const user = result.data?.user;
        
        if (user?.location_id || invitationData) {
          Alert.alert(t('auth.register.welcome'), t('auth.register.accountCreated'), [
            { text: 'OK', onPress: () => router.replace('/(tabs)/home') }
          ]);
        } else {
          Alert.alert(t('auth.register.accountCreatedTitle'), t('auth.register.joinYourCommunity'), [
            { text: 'OK', onPress: () => router.replace('/join-community') }
          ]);
        }
      } else {
        Alert.alert(t('common.error'), result.error || t('auth.errors.registerFailed'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('auth.errors.genericError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.title}>{t('auth.register.createAccount')}</Text>
              <Text style={styles.subtitle}>{t('auth.register.joinIssy')}</Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('auth.register.fullName')} *</Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.register.fullNamePlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('auth.email')} *</Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('auth.register.phoneOptional')}</Text>
              <TextInput
                style={styles.input}
                placeholder="+504 9999-9999"
                placeholderTextColor={COLORS.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('auth.password')} *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t('auth.register.minChars')}
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

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('auth.register.confirmPassword')} *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t('auth.register.repeatPassword')}
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

            {/* Invitation Code */}
            <View style={styles.invitationContainer}>
              <Text style={styles.invitationLabel}>{t('auth.register.haveInvitationCode')}</Text>
              <TextInput
                style={styles.invitationInput}
                placeholder={t('auth.register.invitationCodePlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                value={invitationCode}
                onChangeText={(text) => setInvitationCode(text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={20}
                editable={!loading}
              />
              <Text style={styles.invitationHint}>
                {t('auth.register.invitationCodeHint')}
              </Text>
            </View>

            {/* Terms Checkbox */}
            <TouchableOpacity 
              style={styles.termsContainer}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                {acceptedTerms && (
                  <Ionicons name="checkmark" size={16} color={COLORS.background} />
                )}
              </View>
              <Text style={styles.termsText}>
                {t('auth.register.acceptTermsPrefix')}{' '}
                <Text style={styles.termsLink} onPress={openTerms}>
                  {t('auth.register.termsOfService')}
                </Text>
                {' '}{t('auth.register.and')}{' '}
                <Text style={styles.termsLink} onPress={openPrivacy}>
                  {t('auth.register.privacyPolicy')}
                </Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, (loading || !acceptedTerms) && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading || !acceptedTerms}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.buttonText}>{t('auth.register.createAccount')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.register.alreadyHaveAccount')} </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>{t('auth.login')}</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
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
  scrollContent: {
    paddingHorizontal: scale(32),
    paddingBottom: scale(40),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(16),
    marginBottom: scale(16),
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
  headerText: {
    marginLeft: scale(16),
  },
  title: {
    fontSize: scale(26),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  form: {
    width: '100%',
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
  input: {
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: scale(14),
    height: scale(52),
    paddingHorizontal: scale(16),
    fontSize: scale(15),
    color: COLORS.textPrimary,
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
    height: '100%',
    paddingHorizontal: scale(16),
    fontSize: scale(15),
    color: COLORS.textPrimary,
  },
  eyeButton: {
    paddingHorizontal: scale(14),
    height: '100%',
    justifyContent: 'center',
  },
  invitationContainer: {
    marginTop: scale(8),
    marginBottom: scale(20),
    padding: scale(16),
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  invitationLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.purple,
    marginBottom: scale(12),
  },
  invitationInput: {
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: scale(12),
    height: scale(48),
    paddingHorizontal: scale(16),
    fontSize: scale(15),
    color: COLORS.textPrimary,
  },
  invitationHint: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(8),
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: scale(24),
    paddingHorizontal: scale(4),
  },
  checkbox: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(6),
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    marginRight: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundTertiary,
  },
  checkboxChecked: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  termsText: {
    flex: 1,
    fontSize: scale(14),
    color: COLORS.textSecondary,
    lineHeight: scale(20),
  },
  termsLink: {
    color: COLORS.teal,
    fontWeight: '600',
  },
  button: {
    backgroundColor: COLORS.lime,
    borderRadius: scale(14),
    height: scale(54),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: COLORS.background,
    fontSize: scale(16),
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: scale(32),
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: scale(15),
  },
  footerLink: {
    color: COLORS.teal,
    fontSize: scale(15),
    fontWeight: '600',
  },
});