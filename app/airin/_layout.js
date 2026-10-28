// app/airin/_layout.js
// ISSY × Airin - Stack Layout
// Línea gráfica ProHome

import { Stack } from 'expo-router';
import { neu } from '../../src/theme/tokens';

const COLORS = {
  bgPrimary: neu.bg,
  textPrimary: neu.text,
  orange: neu.amber,
};

export default function AirinLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.bgPrimary },
        headerTintColor: COLORS.orange,
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
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="[slug]"
        options={{ title: 'Restaurante' }}
      />
      <Stack.Screen
        name="order-status"
        options={{ title: 'Estado del Pedido' }}
      />
      <Stack.Screen
        name="reservation"
        options={{ title: 'Reservar Mesa', presentation: 'modal' }}
      />
    </Stack>
  );
}
