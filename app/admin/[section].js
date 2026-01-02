// app/admin/[section].js
// ISSY Resident App - Admin: Pantalla Placeholder para secciones en desarrollo (ProHome Dark Theme) + i18n

import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../src/hooks/useTranslation';

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

export default function AdminSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const { section } = useLocalSearchParams();
  
  const SECTIONS = {
    'payments': {
      icon: 'card',
      title: t('admin.sections.payments.title'),
      description: t('admin.sections.payments.description'),
      color: COLORS.success,
    },
    'expenses': {
      icon: 'trending-down',
      title: t('admin.sections.expenses.title'),
      description: t('admin.sections.expenses.description'),
      color: COLORS.danger,
    },
    'users': {
      icon: 'people',
      title: t('admin.sections.users.title'),
      description: t('admin.sections.users.description'),
      color: COLORS.blue,
    },
    'guard-config': {
      icon: 'shield-checkmark',
      title: t('admin.sections.guardConfig.title'),
      description: t('admin.sections.guardConfig.description'),
      color: COLORS.purple,
    },
    'location-settings': {
      icon: 'settings',
      title: t('admin.sections.locationSettings.title'),
      description: t('admin.sections.locationSettings.description'),
      color: COLORS.teal,
    },
    'reports': {
      icon: 'stats-chart',
      title: t('admin.sections.reports.title'),
      description: t('admin.sections.reports.description'),
      color: COLORS.lime,
    },
  };
  
  const sectionInfo = SECTIONS[section] || {
    icon: 'construct',
    title: t('admin.sections.default.title'),
    description: t('admin.sections.default.description'),
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
          <Text style={styles.comingSoonBadgeText}>{t('admin.sections.comingSoon')}</Text>
        </View>
        
        <Text style={styles.comingSoonNote}>
          {t('admin.sections.comingSoonNote')}
          {'\n\n'}
          {t('admin.sections.useWebVersion')}
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
          <Text style={styles.backToHomeText}>{t('admin.sections.backToHome')}</Text>
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