// app/admin/[section].js
// ISSY Resident App - Admin: Pantalla Placeholder para secciones en desarrollo (ProHome Dark Theme)

import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ProHome Dark Theme Colors
const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  lime: '#D4FE48',
  teal: '#5DDED8',
  purple: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  blue: '#3B82F6',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  border: 'rgba(255,255,255,0.1)',
};

const SECTIONS = {
  'payments': {
    icon: 'card',
    title: 'Gestor de Cobros',
    description: 'Administra las cuotas y pagos de tu comunidad',
    color: COLORS.success,
  },
  'expenses': {
    icon: 'trending-down',
    title: 'Gastos',
    description: 'Control de egresos y gastos de la comunidad',
    color: COLORS.danger,
  },
  'users': {
    icon: 'people',
    title: 'Usuarios',
    description: 'Gestiona residentes, guardias y roles',
    color: COLORS.blue,
  },
  'guard-config': {
    icon: 'shield-checkmark',
    title: 'App Guardias',
    description: 'Configuración del control de acceso',
    color: COLORS.purple,
  },
  'location-settings': {
    icon: 'settings',
    title: 'Configuración',
    description: 'Ajustes generales de tu ubicación',
    color: COLORS.teal,
  },
  'reports': {
    icon: 'stats-chart',
    title: 'Reportes',
    description: 'Estadísticas y métricas de tu comunidad',
    color: COLORS.lime,
  },
};

export default function AdminSection() {
  const router = useRouter();
  const { section } = useLocalSearchParams();
  
  const sectionInfo = SECTIONS[section] || {
    icon: 'construct',
    title: 'Sección',
    description: 'Esta sección está en desarrollo',
    color: COLORS.lime,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{sectionInfo.title}</Text>
        </View>
        <View style={{ width: scale(40) }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: sectionInfo.color + '20' }]}>
          <Ionicons name={sectionInfo.icon} size={64} color={sectionInfo.color} />
        </View>
        
        <Text style={styles.comingSoonTitle}>{sectionInfo.title}</Text>
        <Text style={styles.comingSoonDescription}>{sectionInfo.description}</Text>
        
        <View style={styles.comingSoonBadge}>
          <Ionicons name="construct" size={16} color={COLORS.warning} />
          <Text style={styles.comingSoonBadgeText}>Próximamente</Text>
        </View>
        
        <Text style={styles.comingSoonNote}>
          Esta funcionalidad estará disponible pronto en la app móvil.
          {'\n\n'}
          Mientras tanto, puedes usar la versión web en:
        </Text>
        
        <View style={styles.webLink}>
          <Ionicons name="globe" size={18} color={COLORS.teal} />
          <Text style={styles.webLinkText}>app.joinissy.com</Text>
        </View>

        <TouchableOpacity 
          style={styles.backToHomeButton}
          onPress={() => router.push('/(tabs)/home')}
        >
          <Ionicons name="home" size={20} color={COLORS.background} />
          <Text style={styles.backToHomeText}>Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: scale(12),
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  
  // Content
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(40),
  },
  iconContainer: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(30),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(24),
  },
  comingSoonTitle: {
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
    textAlign: 'center',
  },
  comingSoonDescription: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: scale(24),
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    marginBottom: scale(24),
    gap: scale(8),
  },
  comingSoonBadgeText: {
    color: COLORS.warning,
    fontSize: scale(14),
    fontWeight: '600',
  },
  comingSoonNote: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scale(22),
    marginBottom: scale(16),
  },
  webLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.teal + '15',
    paddingHorizontal: scale(20),
    paddingVertical: scale(12),
    borderRadius: scale(12),
    marginBottom: scale(32),
    gap: scale(8),
  },
  webLinkText: {
    color: COLORS.teal,
    fontSize: scale(16),
    fontWeight: '600',
  },
  backToHomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lime,
    paddingHorizontal: scale(32),
    paddingVertical: scale(14),
    borderRadius: scale(12),
    gap: scale(8),
  },
  backToHomeText: {
    color: COLORS.background,
    fontSize: scale(16),
    fontWeight: '600',
  },
});