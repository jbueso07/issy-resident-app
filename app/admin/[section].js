// app/admin/[section].js
// ISSY Resident App - Admin: Pantalla Placeholder para secciones en desarrollo

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

const COLORS = {
  navy: '#1A1A2E',
  white: '#FFFFFF',
  background: '#F3F4F6',
  gray: '#6B7280',
  grayLight: '#E5E7EB',
  primary: '#009FF5',
};

const SECTIONS = {
  'payments': {
    icon: '💰',
    title: 'Gestor de Cobros',
    description: 'Administra las cuotas y pagos de tu comunidad',
  },
  'expenses': {
    icon: '📊',
    title: 'Gastos',
    description: 'Control de egresos y gastos de la comunidad',
  },
  'users': {
    icon: '👥',
    title: 'Usuarios',
    description: 'Gestiona residentes, guardias y roles',
  },
  'guard-config': {
    icon: '🔐',
    title: 'App Guardias',
    description: 'Configuración del control de acceso',
  },
  'location-settings': {
    icon: '⚙️',
    title: 'Configuración',
    description: 'Ajustes generales de tu ubicación',
  },
  'reports': {
    icon: '📈',
    title: 'Reportes',
    description: 'Estadísticas y métricas de tu comunidad',
  },
};

export default function AdminSection() {
  const router = useRouter();
  const { section } = useLocalSearchParams();
  
  const sectionInfo = SECTIONS[section] || {
    icon: '🔧',
    title: 'Sección',
    description: 'Esta sección está en desarrollo',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{sectionInfo.icon} {sectionInfo.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.comingSoonIcon}>{sectionInfo.icon}</Text>
        <Text style={styles.comingSoonTitle}>{sectionInfo.title}</Text>
        <Text style={styles.comingSoonDescription}>{sectionInfo.description}</Text>
        
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonBadgeText}>🚧 Próximamente</Text>
        </View>
        
        <Text style={styles.comingSoonNote}>
          Esta funcionalidad estará disponible pronto en la app móvil.
          {'\n\n'}
          Mientras tanto, puedes usar la versión web en:
        </Text>
        
        <View style={styles.webLink}>
          <Text style={styles.webLinkText}>app.joinissy.com</Text>
        </View>

        <TouchableOpacity 
          style={styles.backToHomeButton}
          onPress={() => router.push('/(tabs)/home')}
        >
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.navy,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.navy,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  comingSoonIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 8,
    textAlign: 'center',
  },
  comingSoonDescription: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  comingSoonBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  comingSoonBadgeText: {
    color: '#D97706',
    fontSize: 14,
    fontWeight: '600',
  },
  comingSoonNote: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  webLink: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 32,
  },
  webLinkText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  backToHomeButton: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  backToHomeText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});