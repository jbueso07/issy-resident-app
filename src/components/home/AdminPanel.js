// src/components/home/AdminPanel.js
// ISSY - Administración en el Home v2: las 18 herramientas de ADMIN_SERVICES (home.js), agrupadas.
// Mismas rutas y misma regla superAdminOnly que el carrusel actual.

import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from '../../hooks/useTranslation';
import FunctionGrid from './FunctionGrid';
import { colors, radius, spacing, scale, MAX_FONT_SCALE } from '../../theme/tokens';

export default function AdminPanel({ isSuperAdmin = false, locationName, size = 1 }) {
  const { t } = useTranslation();

  const groups = useMemo(() => {
    const list = [
      {
        key: 'security',
        title: t('home2.adminGroups.security', 'Seguridad'),
        color: colors.teal,
        items: [
          { key: 'gates', label: t('adminMenu.gates'), icon: 'business-outline', color: colors.teal, route: '/admin/gates' },
          { key: 'access-reports', label: t('adminMenu.accessReports'), icon: 'shield-checkmark-outline', color: colors.blue, route: '/admin/access-reports' },
          { key: 'patrols', label: t('adminMenu.patrols', 'Rondines'), icon: 'footsteps-outline', color: colors.orange, route: '/admin/patrols' },
          { key: 'patrol-reports', label: t('adminMenu.patrolReports', 'Reportes de Rondines'), icon: 'stats-chart-outline', color: colors.cyan, route: '/admin/patrol-reports' },
          { key: 'guard-shifts', label: t('adminMenu.guardShifts'), icon: 'time-outline', color: colors.blue, route: '/admin/guard-shifts' },
          { key: 'community-map', label: t('adminMenu.communityMap', 'Mapa de la Comunidad'), icon: 'map-outline', color: colors.danger, route: '/admin/community-map' },
        ],
      },
      {
        key: 'community',
        title: t('home2.adminGroups.community', 'Comunidad'),
        color: colors.cyan,
        items: [
          { key: 'incidents', label: t('adminMenu.incidents'), icon: 'warning-outline', color: colors.coral, route: '/admin/incidents' },
          { key: 'create-announcement', label: t('adminMenu.announcements'), icon: 'megaphone-outline', color: colors.cyan, route: '/admin/announcements' },
          { key: 'community-management', label: t('adminMenu.community'), icon: 'people-outline', color: colors.teal, route: '/admin/community-management' },
          { key: 'users', label: t('adminMenu.users'), icon: 'person-outline', color: colors.indigo, route: '/admin/users' },
          { key: 'common-areas', label: t('adminMenu.commonAreas'), icon: 'fitness-outline', color: colors.teal, route: '/admin/common-areas' },
          { key: 'reservations-admin', label: t('adminMenu.reservationsAdmin'), icon: 'calendar-outline', color: colors.orange, route: '/admin/reservations' },
        ],
      },
      {
        key: 'finance',
        title: t('home2.adminGroups.finance', 'Finanzas'),
        color: colors.purple,
        items: [
          { key: 'payment-manager', label: t('adminMenu.paymentManager'), icon: 'card-outline', color: colors.purple, route: '/admin/payments' },
          { key: 'expenses', label: t('adminMenu.expenses'), icon: 'trending-down-outline', color: colors.coral, route: '/admin/expenses' },
          { key: 'reports', label: t('adminMenu.reports'), icon: 'analytics-outline', color: colors.lime, route: '/admin/reports' },
        ],
      },
      {
        key: 'settings',
        title: t('home2.adminGroups.settings', 'Configuración'),
        color: colors.textSecondary,
        items: [
          { key: 'admin-settings', label: t('adminMenu.settings'), icon: 'settings-outline', color: colors.indigo, route: '/admin/settings' },
        ],
      },
    ];

    // Misma regla que hoy: superAdminOnly solo para role === 'superadmin'
    if (isSuperAdmin) {
      list.push({
        key: 'superadmin',
        title: t('home2.adminGroups.superadmin', 'Superadministrador'),
        color: colors.lime,
        items: [
          { key: 'locations', label: t('adminMenu.locations', 'Ubicaciones'), icon: 'location-outline', color: colors.lime, route: '/admin/locations' },
          { key: 'marketplace-admin', label: 'Marketplace', icon: 'storefront-outline', color: colors.teal, route: '/admin/marketplace' },
        ],
      });
    }
    return list;
  }, [t, isSuperAdmin]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.managing} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={2}>
          {t('home2.adminManaging', { name: locationName || t('home.myCommunity'), defaultValue: 'Administrando {{name}}' })}
        </Text>
        <View style={[styles.roleTag, isSuperAdmin && styles.roleTagSuper]}>
          <Text style={[styles.roleText, isSuperAdmin && styles.roleTextSuper]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {isSuperAdmin ? t('home2.roleSuperAdmin', 'Super Admin') : t('home2.roleAdmin', 'Administrador')}
          </Text>
        </View>
      </View>

      <FunctionGrid groups={groups} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: scale(spacing.lg),
    gap: scale(spacing.md),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(spacing.sm),
  },
  managing: {
    flex: 1,
    fontSize: scale(15),
    fontWeight: '600',
    color: colors.text,
  },
  roleTag: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: radius.pill,
    backgroundColor: colors.well,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleTagSuper: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  roleText: {
    fontSize: scale(12),
    fontWeight: '700',
    color: colors.textSecondary,
  },
  roleTextSuper: {
    color: colors.textDark,
  },
});
