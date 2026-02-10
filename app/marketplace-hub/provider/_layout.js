// app/marketplace-hub/provider/_layout.js
// ISSY Marketplace - Provider Stack Layout
// Línea gráfica ProHome

import { Stack } from 'expo-router';

// Colores ProHome
const COLORS = {
  bgPrimary: '#0F1A1E',
  textPrimary: '#FFFFFF',
  teal: '#00BFA6',
};

export default function ProviderLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.bgPrimary },
        headerTintColor: COLORS.teal,
        headerTitleStyle: {
          color: COLORS.textPrimary,
          fontWeight: '600',
          fontSize: 17,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: COLORS.bgPrimary },
        headerBackTitle: 'Atrás',
      }}
    >
      {/* Onboarding */}
      <Stack.Screen
        name="register"
        options={{
          title: 'Registrarse como Proveedor',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="kyc"
        options={{
          title: 'Verificación KYC',
        }}
      />

      {/* Dashboard */}
      <Stack.Screen
        name="dashboard"
        options={{
          title: 'Mi Negocio',
          headerShown: false,
        }}
      />

      {/* Services */}
      <Stack.Screen
        name="services/index"
        options={{
          title: 'Mis Servicios',
        }}
      />
      <Stack.Screen
        name="services/create"
        options={{
          title: 'Nuevo Servicio',
        }}
      />
      <Stack.Screen
        name="services/[id]"
        options={{
          title: 'Detalle del Servicio',
        }}
      />

      {/* Operations */}
      <Stack.Screen
        name="bookings"
        options={{
          title: 'Mis Reservas',
        }}
      />
      <Stack.Screen
        name="earnings"
        options={{
          title: 'Ganancias',
        }}
      />
      <Stack.Screen
        name="messages"
        options={{
          title: 'Mensajes',
        }}
      />

      {/* Settings */}
      <Stack.Screen
        name="settings"
        options={{
          title: 'Configuración',
        }}
      />
      <Stack.Screen
        name="profile/edit"
        options={{
          title: 'Editar Perfil',
        }}
      />

      {/* Public Profile */}
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Perfil de Proveedor',
        }}
      />
    </Stack>
  );
}
