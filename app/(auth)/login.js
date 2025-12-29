// app/(auth)/login.js
// ISSY Resident App - Login Screen con Biometría - ProHome Dark Theme
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
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';

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

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [biometricLoading, setBiometricLoading] = useState(false);
  
  const { 
    signIn, 
    signInWithGoogle, 
    signInWithApple,
    biometricEnabled,
    getBiometricLabel,
    authenticateWithBiometric,
  } = useAuth();
  
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu email');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Por favor ingresa tu contraseña');
      return;
    }

    setLoading(true);
    const result = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);

    if (result.success) {
      const user = result.data?.user;
      if (user?.location_id) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/join-community');
      }
    } else {
      Alert.alert('Error', result.error || 'Credenciales inválidas');
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading('google');
    const result = await signInWithGoogle();
    setSocialLoading(null);

    if (result.success) {
      setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 1000);
    } else if (result.error && result.error !== 'Inicio de sesión cancelado') {
      Alert.alert('Error', result.error);
    }
  };

  const handleAppleLogin = async () => {
    setSocialLoading('apple');
    const result = await signInWithApple();
    setSocialLoading(null);

    if (result.success) {
      setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 1000);
    } else if (result.error && result.error !== 'Inicio de sesión cancelado') {
      Alert.alert('Error', result.error);
    }
  };

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    const result = await authenticateWithBiometric();
    setBiometricLoading(false);

    if (result.success) {
      router.replace('/(tabs)/home');
    } else if (result.error && !result.cancelled) {
      Alert.alert('Error', result.error);
    }
  };

  const isLoading = loading || socialLoading !== null || biometricLoading;

  // Determinar tipo de biometría
  const getBiometricIcon = () => {
    const label = getBiometricLabel ? getBiometricLabel() : 'Biometría';
    if (label.includes('Face')) {
      return 'scan-outline'; // Face ID
    }
    return 'finger-print'; // Touch ID / Huella
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/logos/issy-white.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Social Login Buttons */}
          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {socialLoading === 'google' ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <>
                  <GoogleIcon />
                  <Text style={styles.googleButtonText}>Continuar con Google</Text>
                </>
              )}
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.appleButton}
                onPress={handleAppleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {socialLoading === 'apple' ? (
                  <ActivityIndicator color={COLORS.background} />
                ) : (
                  <>
                    <AppleIcon />
                    <Text style={styles.appleButtonText}>Continuar con Apple</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={showPassword ? 'eye-off' : 'eye'} 
                    size={22} 
                    color={COLORS.textMuted} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button con Biometría */}
            <View style={styles.loginRow}>
              <TouchableOpacity
                style={[
                  styles.loginButton, 
                  isLoading && styles.buttonDisabled,
                  biometricEnabled && styles.loginButtonWithBiometric
                ]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.background} />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
                    <View style={styles.arrowContainer}>
                      <ArrowIcon />
                    </View>
                  </>
                )}
              </TouchableOpacity>

              {/* Botón de Biometría */}
              {biometricEnabled && (
                <TouchableOpacity
                  style={[styles.biometricButton, biometricLoading && styles.buttonDisabled]}
                  onPress={handleBiometricLogin}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {biometricLoading ? (
                    <ActivityIndicator color={COLORS.background} size="small" />
                  ) : (
                    <Ionicons 
                      name={getBiometricIcon()} 
                      size={28} 
                      color={COLORS.background} 
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>

            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>¿No tienes cuenta? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity disabled={isLoading}>
                <Text style={styles.registerLink}>Regístrate</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const GoogleIcon = () => (
  <View style={{ width: scale(20), height: scale(20), marginRight: scale(10) }}>
    <Svg viewBox="0 0 24 24" width={scale(20)} height={scale(20)}>
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </Svg>
  </View>
);

const AppleIcon = () => (
  <View style={{ width: scale(18), height: scale(18), marginRight: scale(10) }}>
    <Svg viewBox="0 0 24 24" width={scale(18)} height={scale(18)} fill={COLORS.background}>
      <Path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </Svg>
  </View>
);

const ArrowIcon = () => (
  <Svg width={scale(20)} height={scale(20)} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M5 12H19M19 12L12 5M19 12L12 19" 
      stroke={COLORS.background}
      strokeWidth={2.5} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </Svg>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: scale(32),
    paddingTop: scale(80),
    paddingBottom: scale(40),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: scale(40),
  },
  logoImage: {
    width: scale(160),
    height: scale(65),
  },
  socialButtons: {
    width: '100%',
    marginBottom: scale(16),
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.textPrimary,
    borderRadius: scale(14),
    height: scale(52),
    marginBottom: scale(12),
  },
  googleButtonText: {
    fontSize: scale(15),
    color: COLORS.background,
    fontWeight: '500',
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.textPrimary,
    borderRadius: scale(14),
    height: scale(52),
  },
  appleButtonText: {
    fontSize: scale(15),
    color: COLORS.background,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: scale(24),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.cardBorder,
  },
  dividerText: {
    marginHorizontal: scale(16),
    color: COLORS.textMuted,
    fontSize: scale(14),
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: scale(20),
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: scale(14),
    height: scale(54),
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: scale(18),
    fontSize: scale(16),
    color: COLORS.textPrimary,
  },
  eyeButton: {
    paddingHorizontal: scale(16),
    height: '100%',
    justifyContent: 'center',
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(8),
    gap: scale(12),
  },
  loginButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    borderRadius: scale(14),
    height: scale(54),
  },
  loginButtonWithBiometric: {
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: scale(16),
    color: COLORS.background,
    fontWeight: '600',
  },
  arrowContainer: {
    position: 'absolute',
    right: scale(18),
  },
  biometricButton: {
    width: scale(54),
    height: scale(54),
    borderRadius: scale(14),
    backgroundColor: COLORS.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: scale(20),
  },
  forgotPasswordText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(32),
  },
  registerText: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
  },
  registerLink: {
    fontSize: scale(15),
    color: COLORS.teal,
    fontWeight: '600',
  },
});