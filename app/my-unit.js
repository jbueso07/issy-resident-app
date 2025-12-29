// app/my-unit.js - Mi Unidad / Mis Organizaciones - ProHome Dark Theme
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, RefreshControl, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getMyOrganizations, switchOrganization } from '../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ProHome Dark Theme Colors
const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  card: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  teal: '#5DDED8',
  lime: '#D4FE48',
  purple: '#6366F1',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  green: '#10B981',
  red: '#EF4444',
};

export default function MyUnitScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [switching, setSwitching] = useState(null);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setLoading(true);
    const res = await getMyOrganizations();
    if (res.success) {
      setOrganizations(res.data || []);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrganizations();
    setRefreshing(false);
  };

  const handleSwitch = async (org) => {
    if (org.is_active) return;
    
    setSwitching(org.location?.id);
    const res = await switchOrganization(org.location?.id);
    setSwitching(null);
    
    if (res.success) {
      Alert.alert('¡Listo!', `Ahora estás en ${org.location?.name}`);
      if (refreshUser) refreshUser();
      loadOrganizations();
    } else {
      Alert.alert('Error', res.error);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'residential': return 'home';
      case 'commercial': return 'business';
      case 'industrial': return 'construct';
      case 'office': return 'briefcase';
      default: return 'location';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'guard': return 'Guardia';
      case 'resident': return 'Residente';
      case 'employee': return 'Empleado';
      default: return role;
    }
  };

  const activeOrg = organizations.find(o => o.is_active) || organizations.find(o => o.deactivation_reason) || organizations[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Unidad</Text>
        <TouchableOpacity onPress={() => router.push('/join-community')} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={COLORS.lime} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.purple} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.purple} />
            <Text style={styles.loadingText}>Cargando comunidades...</Text>
          </View>
        ) : organizations.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="home" size={scale(48)} color={COLORS.teal} />
            </View>
            <Text style={styles.emptyTitle}>Sin comunidades</Text>
            <Text style={styles.emptyText}>
              Únete a una comunidad con un código de invitación
            </Text>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => router.push('/join-community')}
            >
              <Ionicons name="add-circle" size={20} color={COLORS.background} />
              <Text style={styles.joinButtonText}>Unirme a Comunidad</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Organización Activa */}
            {activeOrg && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ubicación Activa</Text>
                <View style={styles.activeCard}>
                  <View style={styles.activeHeader}>
                    <View style={styles.activeIconContainer}>
                      <Ionicons name={getTypeIcon(activeOrg.location?.type)} size={scale(28)} color={COLORS.teal} />
                    </View>
                    <View style={styles.activeInfo}>
                      <Text style={styles.activeName}>{activeOrg.location?.name}</Text>
                      <Text style={styles.activeAddress}>{activeOrg.location?.address || 'Sin dirección'}</Text>
                    </View>
                    {activeOrg.deactivation_reason ? (
                      <View style={[styles.activeBadge, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                        <Ionicons name="alert-circle" size={16} color={COLORS.red} />
                        <Text style={[styles.activeBadgeText, { color: COLORS.red }]}>Suspendido</Text>
                      </View>
                    ) : (
                      <View style={styles.activeBadge}>
                        {activeOrg.deactivation_reason && (
                    <View style={{ backgroundColor: 'rgba(239,68,68,0.1)', padding: scale(12), borderRadius: scale(8), marginTop: scale(12) }}>
                      <Text style={{ color: COLORS.red, fontSize: scale(13), textAlign: 'center' }}>
                        ⚠️ {activeOrg.deactivation_reason}
                      </Text>
                      <Text style={{ color: COLORS.textSecondary, fontSize: scale(11), textAlign: 'center', marginTop: scale(4) }}>
                        Contacta a administración para más información
                      </Text>
                    </View>
                  )}
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
                        <Text style={styles.activeBadgeText}>Activo</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.activeDetails}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Mi Rol</Text>
                      <Text style={styles.detailValue}>{getRoleLabel(activeOrg.role)}</Text>
                    </View>
                    {activeOrg.unit_number && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Unidad</Text>
                        <Text style={styles.detailValue}>{activeOrg.unit_number}</Text>
                      </View>
                    )}
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Miembro desde</Text>
                      <Text style={styles.detailValue}>
                        {new Date(activeOrg.joined_at || activeOrg.created_at).toLocaleDateString('es', { month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>

                  {activeOrg.admin_name && (
                    <View style={styles.adminInfo}>
                      <Ionicons name="person-circle" size={20} color={COLORS.textSecondary} />
                      <Text style={styles.adminText}>
                        Admin: {activeOrg.admin_name} {activeOrg.admin_phone && `• ${activeOrg.admin_phone}`}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Otras Organizaciones */}
            {organizations.filter(o => !o.is_active && o !== activeOrg).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Otras Comunidades</Text>
                {organizations.filter(o => !o.is_active && o !== activeOrg).map((org) => (
                  <TouchableOpacity
                    key={org.location?.id}
                    style={styles.orgCard}
                    onPress={() => handleSwitch(org)}
                    disabled={switching === org.location?.id}
                  >
                    <View style={styles.orgIcon}>
                      <Ionicons name={getTypeIcon(org.location?.type)} size={scale(22)} color={COLORS.teal} />
                    </View>
                    <View style={styles.orgInfo}>
                      <Text style={styles.orgName}>{org.location?.name}</Text>
                      <Text style={styles.orgRole}>{getRoleLabel(org.role)}</Text>
                    </View>
                    {switching === org.location?.id ? (
                      <ActivityIndicator size="small" color={COLORS.purple} />
                    ) : (
                      <View style={styles.switchBtn}>
                        <Text style={styles.switchBtnText}>Cambiar</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Botón Unirse */}
            <TouchableOpacity
              style={styles.addOrgButton}
              onPress={() => router.push('/join-community')}
            >
              <Ionicons name="add-circle-outline" size={22} color={COLORS.lime} />
              <Text style={styles.addOrgText}>Unirme a otra comunidad</Text>
            </TouchableOpacity>
          </>
        )}
        
        <View style={{ height: scale(100) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(16), paddingVertical: scale(12) },
  backBtn: { width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
  headerTitle: { fontSize: scale(18), fontWeight: '600', color: COLORS.textPrimary },
  addBtn: { width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },

  content: { flex: 1 },
  
  // Loading
  loadingContainer: { alignItems: 'center', paddingVertical: scale(60) },
  loadingText: { marginTop: scale(12), color: COLORS.textSecondary, fontSize: scale(14) },
  
  section: { padding: scale(16) },
  sectionTitle: { fontSize: scale(14), fontWeight: '600', color: COLORS.textSecondary, marginBottom: scale(12), textTransform: 'uppercase', letterSpacing: 0.5 },

  // Active Card
  activeCard: { backgroundColor: COLORS.card, borderRadius: scale(16), padding: scale(16), borderWidth: 1, borderColor: COLORS.cardBorder },
  activeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(16) },
  activeIconContainer: { width: scale(56), height: scale(56), borderRadius: scale(16), backgroundColor: 'rgba(93, 222, 216, 0.15)', alignItems: 'center', justifyContent: 'center', marginRight: scale(12) },
  activeInfo: { flex: 1 },
  activeName: { fontSize: scale(18), fontWeight: '700', color: COLORS.textPrimary },
  activeAddress: { fontSize: scale(14), color: COLORS.textSecondary, marginTop: scale(2) },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: scale(4), backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(12) },
  activeBadgeText: { fontSize: scale(12), fontWeight: '600', color: COLORS.green },
  
  activeDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(12), paddingTop: scale(16), borderTopWidth: 1, borderTopColor: COLORS.cardBorder },
  detailItem: { minWidth: '30%' },
  detailLabel: { fontSize: scale(12), color: COLORS.textSecondary },
  detailValue: { fontSize: scale(14), fontWeight: '600', color: COLORS.textPrimary, marginTop: scale(2) },
  
  adminInfo: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginTop: scale(16), paddingTop: scale(12), borderTopWidth: 1, borderTopColor: COLORS.cardBorder },
  adminText: { fontSize: scale(13), color: COLORS.textSecondary },

  // Org Card
  orgCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: scale(14), borderRadius: scale(12), marginBottom: scale(10), borderWidth: 1, borderColor: COLORS.cardBorder },
  orgIcon: { width: scale(44), height: scale(44), borderRadius: scale(12), backgroundColor: 'rgba(93, 222, 216, 0.15)', alignItems: 'center', justifyContent: 'center' },
  orgInfo: { flex: 1, marginLeft: scale(12) },
  orgName: { fontSize: scale(15), fontWeight: '600', color: COLORS.textPrimary },
  orgRole: { fontSize: scale(13), color: COLORS.textSecondary, marginTop: scale(2) },
  switchBtn: { backgroundColor: 'rgba(99, 102, 241, 0.15)', paddingHorizontal: scale(14), paddingVertical: scale(8), borderRadius: scale(8) },
  switchBtnText: { fontSize: scale(13), fontWeight: '600', color: COLORS.purple },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: scale(80), paddingHorizontal: scale(32) },
  emptyIconContainer: { width: scale(100), height: scale(100), borderRadius: scale(50), backgroundColor: COLORS.backgroundTertiary, alignItems: 'center', justifyContent: 'center', marginBottom: scale(24), borderWidth: 1, borderColor: COLORS.cardBorder },
  emptyTitle: { fontSize: scale(20), fontWeight: '700', color: COLORS.textPrimary, marginBottom: scale(8) },
  emptyText: { fontSize: scale(15), color: COLORS.textSecondary, textAlign: 'center', marginBottom: scale(24) },
  joinButton: { flexDirection: 'row', alignItems: 'center', gap: scale(8), backgroundColor: COLORS.lime, paddingHorizontal: scale(24), paddingVertical: scale(14), borderRadius: scale(12) },
  joinButtonText: { color: COLORS.background, fontSize: scale(16), fontWeight: '600' },

  // Add org button
  addOrgButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8), padding: scale(16), margin: scale(16), borderRadius: scale(12), borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.lime },
  addOrgText: { fontSize: scale(15), fontWeight: '500', color: COLORS.lime },
});