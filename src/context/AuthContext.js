// src/context/AuthContext.js
// ISSY Resident App - Auth Context con Apple Sign In NATIVO + Biometría
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import { supabase } from '../config/supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import useNotifications from '../hooks/useNotifications';

// Import Apple Authentication only on iOS
let AppleAuthentication = null;
if (Platform.OS === 'ios') {
  try {
    AppleAuthentication = require('expo-apple-authentication');
  } catch (e) {
    console.log('expo-apple-authentication not available');
  }
}

const API_URL = 'https://api.joinissy.com/api';

// Secure Store Keys
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const SECURE_TOKEN_KEY = 'secure_token';
const SECURE_REFRESH_TOKEN_KEY = 'secure_refresh_token';
const SECURE_USER_EMAIL_KEY = 'secure_user_email';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

WebBrowser.maybeCompleteAuthSession();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [supabaseSession, setSupabaseSession] = useState(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState(null); // 'face' | 'fingerprint' | 'iris'
  const hasBeenAuthenticated = useRef(false);
  // Push notifications
const { expoPushToken } = useNotifications();

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      await checkBiometricAvailability();
      await checkSession();
      if (mounted) {
        setupSupabaseListener();
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  // ==========================================
  // BIOMETRIC FUNCTIONS
  // ==========================================

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();

      setBiometricAvailable(compatible && enrolled);

      if (compatible && enrolled) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('face');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('fingerprint');
        } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setBiometricType('iris');
        }
      }

      // Check if user has enabled biometric
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      setBiometricEnabled(enabled === 'true');

    } catch (error) {
      console.log('Biometric check error:', error);
      setBiometricAvailable(false);
    }
  };

  const getBiometricLabel = () => {
    switch (biometricType) {
      case 'face':
        return Platform.OS === 'ios' ? 'Face ID' : 'Reconocimiento facial';
      case 'fingerprint':
        return Platform.OS === 'ios' ? 'Touch ID' : 'Huella digital';
      case 'iris':
        return 'Reconocimiento de iris';
      default:
        return 'Biometría';
    }
  };

  const authenticateWithBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Iniciar sesión con ${getBiometricLabel()}`,
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
        fallbackLabel: 'Usar contraseña',
      });

      if (result.success) {
        // Get stored credentials
        const storedToken = await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
        const storedRefreshToken = await SecureStore.getItemAsync(SECURE_REFRESH_TOKEN_KEY);

        if (storedToken) {
          // Verify token is still valid
          const profileResult = await loadProfile(storedToken);

          if (profileResult.success) {
            setToken(storedToken);
            await AsyncStorage.setItem('token', storedToken);
            if (storedRefreshToken) {
              await AsyncStorage.setItem('refreshToken', storedRefreshToken);
            }
            hasBeenAuthenticated.current = true;
            return { success: true };
          } else {
            // Token expired, clear biometric data
            await disableBiometric();
            return { success: false, error: 'Sesión expirada. Por favor inicia sesión nuevamente.' };
          }
        }
        return { success: false, error: 'No hay credenciales guardadas' };
      } else {
        if (result.error === 'user_cancel') {
          return { success: false, error: 'Autenticación cancelada', cancelled: true };
        }
        return { success: false, error: 'Autenticación fallida' };
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
      return { success: false, error: error.message };
    }
  };

  const enableBiometric = async () => {
    try {
      if (!biometricAvailable) {
        return { success: false, error: 'Biometría no disponible en este dispositivo' };
      }

      if (!token) {
        return { success: false, error: 'Debes iniciar sesión primero' };
      }

      // Authenticate first to confirm it's the user
      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: `Confirmar ${getBiometricLabel()} para inicio rápido`,
        cancelLabel: 'Cancelar',
      });

      if (!authResult.success) {
        return { success: false, error: 'Autenticación cancelada' };
      }

      // Store credentials securely
      await SecureStore.setItemAsync(SECURE_TOKEN_KEY, token);

      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        await SecureStore.setItemAsync(SECURE_REFRESH_TOKEN_KEY, refreshToken);
      }

      if (user?.email) {
        await SecureStore.setItemAsync(SECURE_USER_EMAIL_KEY, user.email);
      }

      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      setBiometricEnabled(true);

      return { success: true };
    } catch (error) {
      console.error('Enable biometric error:', error);
      return { success: false, error: error.message };
    }
  };

  const disableBiometric = async () => {
    try {
      await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
      await SecureStore.deleteItemAsync(SECURE_REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(SECURE_USER_EMAIL_KEY);
      await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      setBiometricEnabled(false);
      return { success: true };
    } catch (error) {
      console.error('Disable biometric error:', error);
      return { success: false, error: error.message };
    }
  };

  const promptEnableBiometric = () => {
    if (!biometricAvailable || biometricEnabled) return;

    Alert.alert(
      `¿Activar ${getBiometricLabel()}?`,
      `Inicia sesión más rápido usando ${getBiometricLabel()} la próxima vez.`,
      [
        { text: 'Ahora no', style: 'cancel' },
        {
          text: 'Activar',
          onPress: async () => {
            const result = await enableBiometric();
            if (result.success) {
              Alert.alert('¡Listo!', `${getBiometricLabel()} activado correctamente.`);
            }
          }
        },
      ]
    );
  };

  // ==========================================
  // SESSION MANAGEMENT
  // ==========================================

  const setupSupabaseListener = () => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Supabase auth event:', event);
        setSupabaseSession(session);

        if (event === 'SIGNED_IN' && session?.user) {
          hasBeenAuthenticated.current = true;
          console.log('OAuth successful, syncing with backend...');
          await syncGoogleWithBackend(session.user);
        }

        if (event === 'SIGNED_OUT' && hasBeenAuthenticated.current) {
          console.log('User signed out from Supabase');
          hasBeenAuthenticated.current = false;
          await clearLocalSession();
        }
      }
    );

    return () => subscription.unsubscribe();
  };

  const clearLocalSession = async () => {
    try {
      await AsyncStorage.multiRemove(['token', 'refreshToken']);
      setToken(null);
      setUser(null);
      setProfile(null);
      setSupabaseSession(null);
    } catch (error) {
      console.error('Error clearing local session:', error);
    }
  };

  const syncGoogleWithBackend = async (supabaseUser) => {
    try {
      console.log('Syncing Google user with backend:', supabaseUser.email);

      const response = await fetch(`${API_URL}/auth/google-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.full_name ||
            supabaseUser.user_metadata?.name ||
            supabaseUser.email?.split('@')[0],
          supabase_id: supabaseUser.id,
          avatar_url: supabaseUser.user_metadata?.avatar_url || null,
          provider: 'google'
        }),
      });

      const data = await response.json();

      const tokenValue = data.data?.token || data.token;
      const userValue = data.data?.user || data.user;
      const refreshTokenValue = data.data?.refreshToken || data.refreshToken;

      if ((data.success || response.ok) && tokenValue) {
        await AsyncStorage.setItem('token', tokenValue);
        if (refreshTokenValue) {
          await AsyncStorage.setItem('refreshToken', refreshTokenValue);
        }

        setToken(tokenValue);
        setUser(userValue);
        setProfile(userValue);
        hasBeenAuthenticated.current = true;

        console.log('Backend sync successful:', userValue?.email);

        // Prompt to enable biometric after successful login
        setTimeout(() => promptEnableBiometric(), 1000);

        return { success: true, data: userValue };
      } else {
        console.error('Backend sync failed:', data.message || data.error);
        return { success: false, error: data.message || data.error };
      }
    } catch (error) {
      console.error('Error syncing with backend:', error);
      return { success: false, error: error.message };
    }
  };

  const checkSession = async () => {
    try {
      // First check if biometric is enabled and try that
      const biometricEnabledCheck = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);

      if (biometricEnabledCheck === 'true' && biometricAvailable) {
        const storedToken = await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
        if (storedToken) {
          // We have biometric credentials, but don't auto-authenticate
          // User will need to trigger biometric auth from login screen
          console.log('Biometric credentials available');
        }
      }

      // Check for regular session
      const savedToken = await AsyncStorage.getItem('token');

      if (savedToken) {
        setToken(savedToken);
        const result = await loadProfile(savedToken);
        if (result.success) {
          hasBeenAuthenticated.current = true;

          // Update secure store with current token if biometric enabled
          if (biometricEnabled) {
            await SecureStore.setItemAsync(SECURE_TOKEN_KEY, savedToken);
          }

          setLoading(false);
          return;
        }
      }

      // Check Supabase session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setSupabaseSession(session);
        hasBeenAuthenticated.current = true;
        await syncGoogleWithBackend(session.user);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async (authToken) => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const userData = data.data?.user || data.user || data.data || data;
        setUser(userData);
        setProfile(userData);
        return { success: true, data: userData };
      } else {
        await clearLocalSession();
        return { success: false, error: 'Sesión expirada' };
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      return { success: false, error: error.message };
    }
  };

  // ==========================================
  // GOOGLE SIGN IN (via Supabase)
  // ==========================================
  const signInWithGoogle = async () => {
    try {
      const redirectUrl = makeRedirectUri({
        scheme: 'com.issy.resident',
        path: 'auth/callback'
      });

      console.log('Starting Google Sign In...');
      console.log('Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        console.log('Browser result:', result.type);

        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token
            });

            if (sessionError) throw sessionError;
            return { success: true };
          }
        }

        if (result.type === 'cancel') {
          return { success: false, error: 'Inicio de sesión cancelado' };
        }
      }

      return { success: false, error: 'No se pudo iniciar sesión' };
    } catch (error) {
      console.error('Google Sign In error:', error);
      return { success: false, error: error.message };
    }
  };

  // ==========================================
  // APPLE SIGN IN - NATIVO
  // ==========================================
  const signInWithApple = async () => {
    try {
      if (Platform.OS !== 'ios') {
        return { success: false, error: 'Apple Sign In solo está disponible en iOS' };
      }

      if (!AppleAuthentication) {
        console.log('Apple Authentication module not loaded');
        return { success: false, error: 'Apple Sign In no está configurado en este build' };
      }

      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        return { success: false, error: 'Apple Sign In no está disponible en este dispositivo' };
      }

      console.log('🍎 Starting native Apple Sign In...');

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('🍎 Apple credential received');

      if (!credential.identityToken) {
        throw new Error('No se recibió el token de identidad de Apple');
      }

      let fullName = null;
      if (credential.fullName) {
        const nameParts = [
          credential.fullName.givenName,
          credential.fullName.familyName
        ].filter(Boolean);
        if (nameParts.length > 0) {
          fullName = nameParts.join(' ');
        }
      }

      console.log('🔄 Syncing Apple user with backend...');

      const response = await fetch(`${API_URL}/auth/apple-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identityToken: credential.identityToken,
          email: credential.email,
          fullName: credential.fullName ? {
            givenName: credential.fullName.givenName,
            familyName: credential.fullName.familyName
          } : null,
          user: credential.user
        }),
      });

      const data = await response.json();

      const tokenValue = data.data?.token || data.token;
      const userValue = data.data?.user || data.user;
      const refreshTokenValue = data.data?.refreshToken || data.refreshToken;

      if ((data.success || response.ok) && tokenValue) {
        await AsyncStorage.setItem('token', tokenValue);
        if (refreshTokenValue) {
          await AsyncStorage.setItem('refreshToken', refreshTokenValue);
        }

        setToken(tokenValue);
        setUser(userValue);
        setProfile(userValue);
        hasBeenAuthenticated.current = true;

        console.log('✅ Apple Sign In successful:', userValue?.email);

        // Prompt to enable biometric
        setTimeout(() => promptEnableBiometric(), 1000);

        return { success: true, data: { token: tokenValue, user: userValue } };
      } else {
        console.error('❌ Backend sync failed:', data.message || data.error);
        return { success: false, error: data.message || data.error || 'Error al sincronizar con el servidor' };
      }
    } catch (error) {
      console.error('❌ Apple Sign In error:', error);

      if (error.code === 'ERR_REQUEST_CANCELED' || error.code === 'ERR_CANCELED') {
        return { success: false, error: 'Inicio de sesión cancelado' };
      }

      return { success: false, error: error.message || 'Error al iniciar sesión con Apple' };
    }
  };

  // ==========================================
  // EMAIL/PASSWORD SIGN IN
  // ==========================================
  const signIn = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      const tokenValue = data.data?.token || data.token;
      const userValue = data.data?.user || data.user;
      const refreshTokenValue = data.data?.refreshToken || data.refreshToken;

      if ((data.success || response.ok) && tokenValue) {
        await AsyncStorage.setItem('token', tokenValue);
        if (refreshTokenValue) {
          await AsyncStorage.setItem('refreshToken', refreshTokenValue);
        }

        setToken(tokenValue);
        setUser(userValue);
        setProfile(userValue);
        hasBeenAuthenticated.current = true;

        // Prompt to enable biometric after successful login
        setTimeout(() => promptEnableBiometric(), 1000);

        return { success: true, data: { token: tokenValue, user: userValue } };
      } else {
        return {
          success: false,
          error: data.error || data.message || 'Credenciales inválidas'
        };
      }
    } catch (error) {
      console.error('Error signing in:', error);
      return { success: false, error: 'Error de conexión. Verifica tu internet.' };
    }
  };

  // ==========================================
  // REGISTRO
  // ==========================================
  const signUp = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      const tokenValue = data.data?.token || data.token;
      const userValue = data.data?.user || data.user;

      if ((data.success || response.ok) && tokenValue) {
        await AsyncStorage.setItem('token', tokenValue);
        setToken(tokenValue);
        setUser(userValue);
        setProfile(userValue);
        hasBeenAuthenticated.current = true;

        return { success: true, data: { token: tokenValue, user: userValue } };
      } else {
        return { success: false, error: data.error || data.message || 'Error al registrar' };
      }
    } catch (error) {
      console.error('Error signing up:', error);
      return { success: false, error: 'Error de conexión. Verifica tu internet.' };
    }
  };

  // ==========================================
  // INVITACIONES
  // ==========================================
  const verifyInvitation = async (code) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/invitations/verify/${code}`, {
        headers,
      });

      const data = await response.json();

      if (response.ok && (data.success !== false)) {
        return { success: true, data: data.data || data };
      } else {
        return { success: false, error: data.error || data.message || 'Código inválido' };
      }
    } catch (error) {
      console.error('Error verifying invitation:', error);
      return { success: false, error: 'Error de conexión' };
    }
  };

  const acceptInvitation = async (code) => {
    try {
      const response = await fetch(`${API_URL}/invitations/accept/${code}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && (data.success !== false)) {
        await loadProfile(token);
        return { success: true, data: data.data || data };
      } else {
        return { success: false, error: data.error || data.message || 'Error al aceptar' };
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return { success: false, error: 'Error de conexión' };
    }
  };

  // ==========================================
  // CERRAR SESIÓN
  // ==========================================
  const signOut = async (clearBiometric = false) => {
    try {
      hasBeenAuthenticated.current = false;

      await AsyncStorage.multiRemove(['token', 'refreshToken']);

      // Optionally clear biometric data
      if (clearBiometric) {
        await disableBiometric();
      }

      setToken(null);
      setUser(null);
      setProfile(null);
      setSupabaseSession(null);

      supabase.auth.signOut().catch(() => { });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // ==========================================
  // HELPERS
  // ==========================================
  const refreshProfile = async () => {
    if (token) {
      return await loadProfile(token);
    }
    return { success: false, error: 'No hay sesión activa' };
  };
  // Get valid token - refresh if expired
  const getValidToken = async () => {
    try {
      let currentToken = await AsyncStorage.getItem('token');

      if (!currentToken) {
        return { success: false, error: 'No hay token' };
      }

      // Try to validate current token
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return { success: true, token: currentToken };
      }

      // Token expired, try to refresh
      const refreshToken = await AsyncStorage.getItem('refreshToken');

      if (!refreshToken) {
        return { success: false, error: 'No hay refresh token' };
      }

      const refreshResponse = await fetch(`${API_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
      });

      const refreshData = await refreshResponse.json();

      if (refreshResponse.ok && (refreshData.success || refreshData.token)) {
        const newToken = refreshData.data?.token || refreshData.token;
        const newRefreshToken = refreshData.data?.refreshToken || refreshData.refreshToken;

        await AsyncStorage.setItem('token', newToken);
        if (newRefreshToken) {
          await AsyncStorage.setItem('refreshToken', newRefreshToken);
        }

        setToken(newToken);

        // Update secure store if biometric enabled
        if (biometricEnabled) {
          await SecureStore.setItemAsync(SECURE_TOKEN_KEY, newToken);
          if (newRefreshToken) {
            await SecureStore.setItemAsync(SECURE_REFRESH_TOKEN_KEY, newRefreshToken);
          }
        }

        return { success: true, token: newToken };
      }

      return { success: false, error: 'No se pudo refrescar el token' };
    } catch (error) {
      console.error('Error getting valid token:', error);
      return { success: false, error: error.message };
    }
  };

  const hasLocation = () => {
    return !!(profile?.location_id || profile?.location);
  };

  const getUserRole = () => {
    return profile?.role || profile?.user_type || 'user';
  };

  const isSuperAdmin = () => {
    return profile?.role === 'superadmin' || profile?.is_super_admin === true;
  };

  return (
    <AuthContext.Provider value={{
      // State
      user,
      profile,
      token,
      loading,
      supabaseSession,
      isAuthenticated: !!token && !!user,

      // Biometric
      biometricEnabled,
      biometricAvailable,
      biometricType,
      getBiometricLabel,
      authenticateWithBiometric,
      enableBiometric,
      disableBiometric,

      // Auth methods
      signIn,
      signUp,
      signInWithGoogle,
      signInWithApple,
      signOut,

      // Invitations
      verifyInvitation,
      acceptInvitation,

      // Helpers
      refreshProfile,
      hasLocation,
      getUserRole,
      isSuperAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};