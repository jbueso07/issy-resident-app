// app/marketplace-hub/_layout.js
// ISSY Marketplace - Stack Layout
// Línea gráfica ProHome

import { Stack } from 'expo-router';

// Colores ProHome
const COLORS = {
  bgPrimary: '#0F1A1E',
  textPrimary: '#FFFFFF',
  teal: '#00BFA6',
};

export default function MarketplaceLayout() {
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
      {/* Main Marketplace */}
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />

      {/* Service Detail */}
      <Stack.Screen
        name="service/[id]"
        options={{
          title: 'Detalle del Servicio',
        }}
      />

      {/* Category List */}
      <Stack.Screen
        name="category/[id]"
        options={{
          title: 'Categoría',
        }}
      />

      {/* Search */}
      <Stack.Screen
        name="search"
        options={{
          title: 'Buscar Servicios',
        }}
      />

      {/* Bookings */}
      <Stack.Screen
        name="bookings"
        options={{
          title: 'Mis Reservas',
        }}
      />

      {/* Booking Detail */}
      <Stack.Screen
        name="booking/[id]"
        options={{
          title: 'Detalle de Reserva',
        }}
      />

      {/* Create Booking */}
      <Stack.Screen
        name="booking/create"
        options={{
          title: 'Nueva Reserva',
        }}
      />

      {/* Rate Service */}
      <Stack.Screen
        name="booking/rate"
        options={{
          title: 'Calificar Servicio',
          presentation: 'modal',
        }}
      />

      {/* Chat */}
      <Stack.Screen
        name="chat/[conversationId]"
        options={{
          title: 'Chat',
        }}
      />

      {/* Provider Routes */}
      <Stack.Screen
        name="provider"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
