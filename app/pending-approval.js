import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';

const COLORS = {
  background: '#0a0a0a',
  card: '#1a1a1a',
  lime: '#c6f135',
  textLight: '#ffffff',
  textMuted: '#888888',
};

export default function PendingApprovalScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="time-outline" size={80} color={COLORS.lime} />
        </View>
        <Text style={styles.title}>Solicitud Enviada</Text>
        <Text style={styles.subtitle}>
          Tu solicitud para unirte a la comunidad está pendiente de aprobación por parte del administrador.
        </Text>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.lime} />
          <Text style={styles.infoText}>
            Recibirás una notificación cuando tu acceso sea aprobado. Este proceso puede tomar algunas horas.
          </Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleSignOut}>
          <Text style={styles.buttonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconContainer: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.textLight, marginBottom: 16, textAlign: 'center' },
  subtitle: { fontSize: 16, color: COLORS.textMuted, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  infoCard: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 12, padding: 16, gap: 12, marginBottom: 40 },
  infoText: { flex: 1, fontSize: 14, color: COLORS.textMuted, lineHeight: 20 },
  button: { backgroundColor: COLORS.card, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32, borderWidth: 1, borderColor: '#333' },
  buttonText: { color: COLORS.textLight, fontSize: 16, fontWeight: '600' },
});
