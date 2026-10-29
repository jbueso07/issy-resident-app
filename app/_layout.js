// app/_layout.js
// ISSY Resident App - Root Layout with Push Notifications & i18n
import { useEffect } from 'react';
import { Stack, useSegments, useRootNavigationState } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import { AdminLocationProvider } from '../src/context/AdminLocationContext';
import { UserLocationProvider } from '../src/context/UserLocationContext';
import { StatusBar } from 'expo-status-bar';
import { useNotifications, setAccessRequestNavigationReady } from '../src/hooks/useNotifications';

// Componente interno que usa el hook de notificaciones
function NotificationInitializer() {
  const { expoPushToken, notification, error } = useNotifications();
  
  useEffect(() => {
    if (expoPushToken) {
      console.log('📱 Push notifications initialized:', expoPushToken);
    }
    if (error) {
      console.log('⚠️ Push notification error:', error);
    }
  }, [expoPushToken, error]);
  
  // Tap en una solicitud de ingreso con la app cerrada: se atiende cuando ya hay sesión y la app
  // pasó de la pantalla de inicio a las pestañas (si no, el replace del splash taparía la pantalla).
  const { user, loading } = useAuth();
  const navigationState = useRootNavigationState();
  const segments = useSegments();
  const inMainApp = segments[0] === '(tabs)' || segments[0] === 'admin';
  const ready = !loading && !!user && !!navigationState?.key && inMainApp;

  useEffect(() => {
    if (!ready) {
      setAccessRequestNavigationReady(false);
      return undefined;
    }
    const timer = setTimeout(() => setAccessRequestNavigationReady(true), 300);
    return () => clearTimeout(timer);
  }, [ready]);

  useEffect(() => {
    if (notification) {
      console.log('📬 New notification received:', notification.request.content);
    }
  }, [notification]);
  
  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AdminLocationProvider>
          <UserLocationProvider>
            <StatusBar style="light" />
            <NotificationInitializer />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="admin" />
              <Stack.Screen name="join/[code]" />
              <Stack.Screen name="marketplace-hub" />
            </Stack>
          </UserLocationProvider>
        </AdminLocationProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
