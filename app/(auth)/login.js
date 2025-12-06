// app/(auth)/login.js
// ISSY Resident App - Login Screen con Google/Apple Sign In

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
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../src/context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null); // 'google' | 'apple' | null
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
      // El AuthContext manejará la redirección después del sync
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🏠</Text>
          <Text style={styles.title}>ISSY</Text>
          <Text style={styles.subtitle}>Portal de Residentes</Text>
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
              <ActivityIndicator color="#1F2937" />
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
              placeholderTextColor="#9CA3AF"
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
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </View>

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>¿No tienes cuenta?</Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity disabled={isLoading}>
              <Text style={styles.registerLink}> Regístrate</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Join with Code */}
        <Link href="/(auth)/join-code" asChild>
          <TouchableOpacity style={styles.joinCodeButton} disabled={isLoading}>
            <Text style={styles.joinCodeText}>🔑 Tengo un código de invitación</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

// Google Icon Component
const GoogleIcon = () => (
  <View style={{ width: 20, height: 20, marginRight: 12 }}>
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
  <View style={{ width: 20, height: 20, marginRight: 12 }}>
    <Svg viewBox="0 0 24 24" width={20} height={20} fill="#fff">
      <Path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </Svg>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 56,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  socialButtons: {
    width: '100%',
    maxWidth: 340,
    marginBottom: 8,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9CA3AF',
    fontSize: 14,
  },
  form: {
    width: '100%',
    maxWidth: 340,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  loginButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: '#6366F1',
    fontSize: 14,
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  registerText: {
    color: '#6B7280',
    fontSize: 14,
  },
  registerLink: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  joinCodeButton: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  joinCodeText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '500',
  },
});