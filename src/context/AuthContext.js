// src/context/AuthContext.js
// ISSY Resident App - Auth Context con Apple Sign In NATIVO
// Usa expo-apple-authentication para iOS

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

// Import Apple Authentication only on iOS and wrap in try-catch
let AppleAuthentication = null;
if (Platform.OS === 'ios') {
  try {
    AppleAuthentication = require('expo-apple-authentication');
  } catch (e) {
    console.log('expo-apple-authentication not available');
  }
}

const API_URL = 'https://api.joinissy.com/api';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

WebBrowser.maybeCompleteAuthSession();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [supabaseSession, setSupabaseSession] = useState(null);
  
  const hasBeenAuthenticated = useRef(false);

  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
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

  // Sync Google users with backend
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
      const savedToken = await AsyncStorage.getItem('token');
      
      if (savedToken) {
        setToken(savedToken);
        const result = await loadProfile(savedToken);
        if (result.success) {
          hasBeenAuthenticated.current = true;
          setLoading(false);
          return;
        }
      }

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
  // APPLE SIGN IN - NATIVO con expo-apple-authentication
  // ==========================================
  const signInWithApple = async () => {
    try {
      // Check if Apple Sign In is available (iOS only)
      if (Platform.OS !== 'ios') {
        return { success: false, error: 'Apple Sign In solo está disponible en iOS' };
      }

      // Check if module is available
      if (!AppleAuthentication) {
        console.log('Apple Authentication module not loaded, using fallback');
        return { success: false, error: 'Apple Sign In no está configurado en este build' };
      }

      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        return { success: false, error: 'Apple Sign In no está disponible en este dispositivo' };
      }

      console.log('🍎 Starting native Apple Sign In...');

      // Request Apple authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('🍎 Apple credential received:', {
        user: credential.user,
        email: credential.email,
        fullName: credential.fullName,
        hasIdentityToken: !!credential.identityToken
      });

      if (!credential.identityToken) {
        throw new Error('No se recibió el token de identidad de Apple');
      }

      // Build full name from Apple response
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

      // Sync with our backend
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
          user: credential.user // Apple's unique user ID
        }),
      });

      const data = await response.json();

      console.log('🍎 Backend response:', data.success ? 'success' : 'failed');

      const tokenValue = data.data?.token || data.token;
      const userValue = data.data?.user || data.user;
      const refreshTokenValue = data.data?.refreshToken || data.refreshToken;

      if ((data.success || response.ok) && tokenValue) {
        // Save tokens
        await AsyncStorage.setItem('token', tokenValue);
        if (refreshTokenValue) {
          await AsyncStorage.setItem('refreshToken', refreshTokenValue);
        }

        // Update state
        setToken(tokenValue);
        setUser(userValue);
        setProfile(userValue);
        hasBeenAuthenticated.current = true;

        console.log('✅ Apple Sign In successful:', userValue?.email);
        return { success: true, data: { token: tokenValue, user: userValue } };
      } else {
        console.error('❌ Backend sync failed:', data.message || data.error);
        return { success: false, error: data.message || data.error || 'Error al sincronizar con el servidor' };
      }

    } catch (error) {
      console.error('❌ Apple Sign In error:', error);

      // Handle specific Apple auth errors
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
      
      console.log('Login response:', JSON.stringify(data, null, 2));

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
  const signOut = async () => {
    try {
      hasBeenAuthenticated.current = false;
      
      await AsyncStorage.multiRemove(['token', 'refreshToken']);
      
      setToken(null);
      setUser(null);
      setProfile(null);
      setSupabaseSession(null);
      
      supabase.auth.signOut().catch(() => {});
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
      user,
      profile,
      token,
      loading,
      supabaseSession,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithApple,
      signOut,
      verifyInvitation,
      acceptInvitation,
      refreshProfile,
      hasLocation,
      getUserRole,
      isSuperAdmin,
      isAuthenticated: !!token && !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};