// app/(auth)/login.js
// ISSY Resident App - Login Screen con Biometría (Face ID / Huella)
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
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../src/context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [biometricLoading, setBiometricLoading] = useState(false);
  
  const { 
    signIn, 
    signInWithGoogle, 
    signInWithApple,
    biometricEnabled,
    biometricAvailable,
    getBiometricLabel,
    authenticateWithBiometric,
  } = useAuth();
  
  const router = useRouter();

  // Auto-prompt biometric on mount if enabled
  useEffect(() => {
    if (biometricEnabled) {
      handleBiometricLogin();
    }
  }, [biometricEnabled]);

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
      // Only show alert for real errors, not cancellations
      Alert.alert('Error', result.error);
    }
  };

  const isLoading = loading || socialLoading !== null || biometricLoading;

  // Get biometric icon based on type
  const BiometricIcon = () => {
    const label = getBiometricLabel ? getBiometricLabel() : 'Biometría';
    const isFaceId = label.includes('Face');
    
    return (
      <View style={{ width: 24, height: 24, marginRight: 10 }}>
        {isFaceId ? (
          // Face ID icon
          <Svg viewBox="0 0 24 24" width={24} height={24} fill="#000">
            <Path d="M9 10.5C9 9.67 8.33 9 7.5 9S6 9.67 6 10.5 6.67 12 7.5 12 9 11.33 9 10.5zm7.5-1.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm-5.5 6c-1.61 0-3.09.59-4.23 1.57l1.41 1.41C9.07 17.35 10.02 17 11 17s1.93.35 2.82.98l1.41-1.41C14.09 15.59 12.61 15 11 15zm1-13C6.48 2 3 5.48 3 10v4c0 4.42 3.48 8 8 8s8-3.58 8-8v-4c0-4.52-3.48-8-8-8zm6 12c0 3.31-2.69 6-6 6s-6-2.69-6-6v-4c0-3.31 2.69-6 6-6s6 2.69 6 6v4z"/>
          </Svg>
        ) : (
          // Fingerprint icon
          <Svg viewBox="0 0 24 24" width={24} height={24} fill="#000">
            <Path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.7-2.5 1.7-3.4 2.96-.08.14-.23.21-.39.21zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39s5.66 2.42 5.66 5.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.42-2.09-4.39-4.66-4.39-2.57 0-4.66 1.97-4.66 4.39 0 1.44.32 2.77.93 3.85.64 1.15 1.08 1.64 1.85 2.42.19.2.19.51 0 .71-.11.1-.24.15-.37.15zm7.17-1.85c-1.19 0-2.24-.3-3.1-.89-1.49-1.01-2.38-2.65-2.38-4.39 0-.28.22-.5.5-.5s.5.22.5.5c0 1.41.72 2.74 1.94 3.56.71.48 1.54.71 2.54.71.24 0 .64-.03 1.04-.1.27-.05.53.13.58.41.05.27-.13.53-.41.58-.57.11-1.07.12-1.21.12zM14.91 22c-.04 0-.09-.01-.13-.02-1.59-.44-2.63-1.03-3.72-2.1-1.4-1.39-2.17-3.24-2.17-5.22 0-1.62 1.38-2.94 3.08-2.94 1.7 0 3.08 1.32 3.08 2.94 0 1.07.93 1.94 2.08 1.94s2.08-.87 2.08-1.94c0-3.77-3.25-6.83-7.25-6.83-2.84 0-5.44 1.58-6.61 4.03-.39.81-.59 1.76-.59 2.8 0 .78.07 2.01.67 3.61.1.26-.03.55-.29.64-.26.1-.55-.04-.64-.29-.49-1.31-.73-2.61-.73-3.96 0-1.2.23-2.29.68-3.24 1.33-2.79 4.28-4.6 7.51-4.6 4.55 0 8.25 3.51 8.25 7.83 0 1.62-1.38 2.94-3.08 2.94s-3.08-1.32-3.08-2.94c0-1.07-.93-1.94-2.08-1.94s-2.08.87-2.08 1.94c0 1.71.66 3.31 1.87 4.51.95.94 1.86 1.46 3.27 1.85.27.07.42.35.35.61-.05.23-.26.38-.47.38z"/>
          </Svg>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Background Blurred Circles */}
      <View style={styles.circleYellow} />
      <View style={styles.circleRed} />
      <View style={styles.circlePurple} />
      <View style={styles.circleBlue} />

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
            <View style={styles.logoCircle}>
              <Image
                source={require('../../assets/logos/issy-white.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Biometric Button - Show first if enabled */}
          {biometricEnabled && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {biometricLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <BiometricIcon />
                  <Text style={styles.biometricButtonText}>
                    Continuar con {getBiometricLabel ? getBiometricLabel() : 'Biometría'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Divider after biometric */}
          {biometricEnabled && (
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o usa otra opción</Text>
              <View style={styles.dividerLine} />
            </View>
          )}

          {/* Social Login Buttons */}
          <View style={styles.socialButtons}>
            {/* Google Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {socialLoading === 'google' ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <GoogleIcon />
                  <Text style={styles.googleButtonText}>Continuar con Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Apple Button - Solo iOS */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.appleButton}
                onPress={handleAppleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {socialLoading === 'apple' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <AppleIcon />
                    <Text style={styles.appleButtonText}>Continuar con Apple</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email/Password Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor="rgba(0, 0, 0, 0.25)"
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
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="rgba(0, 0, 0, 0.25)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                editable={!isLoading}
              />
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#F2F2F2" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
                  <View style={styles.arrowContainer}>
                    <ArrowIcon />
                  </View>
                </>
              )}
            </TouchableOpacity>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>¿No tienes cuenta? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity disabled={isLoading}>
                <Text style={styles.registerLink}>Regístrate</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Join with Code */}
          <Link href="/(auth)/join-code" asChild>
            <TouchableOpacity style={styles.joinCodeButton} disabled={isLoading}>
              <Text style={styles.joinCodeText}>✨ Tengo un código de invitación</Text>
            </TouchableOpacity>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Google Icon Component
const GoogleIcon = () => (
  <View style={{ width: 20, height: 20, marginRight: 10 }}>
    <Svg viewBox="0 0 24 24" width={20} height={20}>
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </Svg>
  </View>
);

// Apple Icon Component  
const AppleIcon = () => (
  <View style={{ width: 16, height: 16, marginRight: 10 }}>
    <Svg viewBox="0 0 24 24" width={16} height={16} fill="#fff">
      <Path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </Svg>
  </View>
);

// Arrow Icon Component
const ArrowIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M5 12H19M19 12L12 5M19 12L12 19" 
      stroke="#D4FE48" 
      strokeWidth={2.5} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </Svg>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Background circles
  circleYellow: {
    position: 'absolute',
    width: 167,
    height: 167,
    left: -43,
    top: 95,
    backgroundColor: '#D4FE48',
    borderRadius: 100,
    opacity: 0.6,
  },
  circleRed: {
    position: 'absolute',
    width: 87,
    height: 87,
    right: -20,
    top: 218,
    backgroundColor: '#FA5967',
    borderRadius: 50,
    opacity: 0.5,
  },
  circlePurple: {
    position: 'absolute',
    width: 87,
    height: 87,
    right: 80,
    top: 316,
    backgroundColor: '#7B8CEF',
    borderRadius: 50,
    opacity: 0.5,
  },
  circleBlue: {
    position: 'absolute',
    width: 167,
    height: 167,
    right: -40,
    top: 276,
    backgroundColor: '#009FF5',
    borderRadius: 100,
    opacity: 0.5,
  },

  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 39,
    paddingTop: 50,
    paddingBottom: 40,
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 89,
    height: 90,
    backgroundColor: '#000000',
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 70,
    height: 50,
  },

  // Biometric Button
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4FE48',
    borderRadius: 13,
    height: 50,
    marginBottom: 16,
    shadowColor: '#D4FE48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  biometricButtonText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },

  // Social Buttons
  socialButtons: {
    width: '100%',
    marginBottom: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 13,
    height: 45,
    marginBottom: 12,
  },
  googleButtonText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '400',
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 13,
    height: 45,
  },
  appleButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '400',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  dividerText: {
    marginHorizontal: 16,
    color: 'rgba(0, 0, 0, 0.4)',
    fontSize: 12,
  },

  // Form
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 8,
    fontWeight: '400',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 13,
    height: 45,
    paddingHorizontal: 16,
    fontSize: 13,
    color: '#000000',
  },

  // Login Button
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#130F26',
    borderRadius: 30,
    height: 43,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 14,
    color: '#F2F2F2',
    marginRight: 8,
    fontWeight: '400',
  },
  arrowContainer: {
    position: 'absolute',
    right: 16,
  },

  // Forgot Password
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 11,
    color: '#000000',
  },

  // Register
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    fontSize: 11,
    color: '#000000',
  },
  registerLink: {
    fontSize: 11,
    color: '#009FF5',
  },

  // Join Code Button
  joinCodeButton: {
    marginTop: 20,
    backgroundColor: '#D4FE48',
    borderRadius: 13,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinCodeText: {
    fontSize: 11,
    color: '#000000',
  },
});