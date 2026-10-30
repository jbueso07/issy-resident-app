// app/_layout.js
// ISSY Resident App - Root Layout with Push Notifications & i18n
import { useEffect, useRef } from 'react';
import { Stack, useSegments, useRootNavigationState } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import { AdminLocationProvider } from '../src/context/AdminLocationContext';
import { UserLocationProvider, useUserLocation } from '../src/context/UserLocationContext';
import { authFetch } from '../src/services/api';
import { StatusBar } from 'expo-status-bar';
import { useNotifications, setAccessRequestNavigationReady, setNotificationLocationBridge } from '../src/hooks/useNotifications';

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
  const { user, loading, profile, refreshProfile } = useAuth();
  const { userLocations, selectedLocationId, selectLocation } = useUserLocation();

  // Puente para que el toque de una notificación de OTRA residencial cambie a ella antes de navegar
  // (mismo mecanismo que el carrusel del home: /auth/switch-location + selectLocation + refreshProfile).
  const bridgeStateRef = useRef({});
  bridgeStateRef.current = { userLocations, selectedLocationId, selectLocation, refreshProfile, profile, user };
  useEffect(() => {
    setNotificationLocationBridge({
      getActiveLocationId: () => bridgeStateRef.current.selectedLocationId,
      getMembershipIds: () => (bridgeStateRef.current.userLocations || [])
        .map((l) => l.location_id || l.id)
        .filter(Boolean),
      isAdmin: () => {
        const { profile: p, user: u } = bridgeStateRef.current;
        return ['admin', 'superadmin'].includes(p?.role || u?.role);
      },
      switchTo: async (locationId) => {
        const result = await authFetch('/auth/switch-location', {
          method: 'POST',
          body: JSON.stringify({ location_id: locationId }),
        });
        if (result && result.success === false) return false;
        await bridgeStateRef.current.selectLocation(locationId);
        await bridgeStateRef.current.refreshProfile?.();
        return true;
      },
    });
    return () => setNotificationLocationBridge(null);
  }, []);

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
