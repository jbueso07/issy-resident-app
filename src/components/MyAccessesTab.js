import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const COLORS = { bgCard: '#1C2E35', bgCardAlt: '#243B44', lime: '#AAFF00', teal: '#00BFA6', textPrimary: '#FFFFFF', textSecondary: 'rgba(255,255,255,0.7)', textMuted: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)' };

const MyAccessesTab = () => (
  <View style={styles.container}>
    <View style={styles.iconContainer}><Ionicons name="key-outline" size={scale(48)} color={COLORS.teal} /></View>
    <Text style={styles.title}>Mis Accesos</Text>
    <Text style={styles.subtitle}>Aquí aparecerán los códigos QR que te han compartido para acceder a otras ubicaciones</Text>
    <View style={styles.exampleContainer}>
      <Text style={styles.exampleTitle}>Próximamente podrás:</Text>
      <View style={styles.featureRow}><Ionicons name="business-outline" size={scale(20)} color={COLORS.lime} /><Text style={styles.featureText}>Acceder a tu empresa con un toque</Text></View>
      <View style={styles.featureRow}><Ionicons name="home-outline" size={scale(20)} color={COLORS.lime} /><Text style={styles.featureText}>Entrar a casa de familiares</Text></View>
      <View style={styles.featureRow}><Ionicons name="fitness-outline" size={scale(20)} color={COLORS.lime} /><Text style={styles.featureText}>Usar tu QR del gimnasio</Text></View>
      <View style={styles.featureRow}><Ionicons name="notifications-outline" size={scale(20)} color={COLORS.lime} /><Text style={styles.featureText}>Recibir invitaciones instantáneas</Text></View>
    </View>
    <View style={styles.badge}><Text style={styles.badgeText}>PRÓXIMAMENTE</Text></View>
  </View>
);

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.bgCard, borderRadius: scale(20), padding: scale(24), alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  iconContainer: { width: scale(80), height: scale(80), borderRadius: scale(40), backgroundColor: 'rgba(0,191,166,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: scale(16) },
  title: { fontSize: scale(20), fontWeight: '700', color: COLORS.textPrimary, marginBottom: scale(8) },
  subtitle: { fontSize: scale(14), color: COLORS.textSecondary, textAlign: 'center', lineHeight: scale(20), marginBottom: scale(24) },
  exampleContainer: { width: '100%', backgroundColor: COLORS.bgCardAlt, borderRadius: scale(12), padding: scale(16), marginBottom: scale(20) },
  exampleTitle: { fontSize: scale(13), fontWeight: '600', color: COLORS.textSecondary, marginBottom: scale(12) },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(10) },
  featureText: { fontSize: scale(14), color: COLORS.textPrimary, marginLeft: scale(12) },
  badge: { backgroundColor: 'rgba(170,255,0,0.15)', paddingHorizontal: scale(16), paddingVertical: scale(8), borderRadius: scale(20) },
  badgeText: { fontSize: scale(12), fontWeight: '700', color: COLORS.lime, letterSpacing: 1 },
});

export default MyAccessesTab;
