// app/(auth)/login.js
// ISSY Resident App - Login Screen REDISEÑADO según Figma
// Versión sin dependencias de fuentes custom para evitar crash

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
import { useAuth } from '../../src/context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();
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

  const isLoading = loading || socialLoading;

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