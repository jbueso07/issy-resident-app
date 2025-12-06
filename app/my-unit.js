// app/my-unit.js - Mi Unidad / Mis Organizaciones
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getMyOrganizations, switchOrganization } from '../src/services/api';

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
    
    setSwitching(org.location_id);
    const res = await switchOrganization(org.location_id);
    setSwitching(null);
    
    if (res.success) {
      Alert.alert('¡Listo!', `Ahora estás en ${org.location_name}`);
      if (refreshUser) refreshUser();
      loadOrganizations();
    } else {
      Alert.alert('Error', res.error);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'residential': return '🏠';
      case 'commercial': return '🏢';
      case 'industrial': return '🏭';
      case 'office': return '🏛️';
      default: return '📍';
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

  const activeOrg = organizations.find(o => o.is_active);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Unidad</Text>
        <TouchableOpacity onPress={() => router.push('/join-community')} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#6366F1" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
        ) : organizations.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏠</Text>
            <Text style={styles.emptyTitle}>Sin comunidades</Text>
            <Text style={styles.emptyText}>
              Únete a una comunidad con un código de invitación
            </Text>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => router.push('/join-community')}
            >
              <Ionicons name="add-circle" size={20} color="#FFF" />
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
                    <Text style={styles.activeIcon}>{getTypeIcon(activeOrg.location_type)}</Text>
                    <View style={styles.activeInfo}>
                      <Text style={styles.activeName}>{activeOrg.location_name}</Text>
                      <Text style={styles.activeAddress}>{activeOrg.address || 'Sin dirección'}</Text>
                    </View>
                    <View style={styles.activeBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#059669" />
                      <Text style={styles.activeBadgeText}>Activo</Text>
                    </View>
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
                      <Ionicons name="person-circle" size={20} color="#6B7280" />
                      <Text style={styles.adminText}>
                        Admin: {activeOrg.admin_name} {activeOrg.admin_phone && `• ${activeOrg.admin_phone}`}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Otras Organizaciones */}
            {organizations.filter(o => !o.is_active).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Otras Comunidades</Text>
                {organizations.filter(o => !o.is_active).map((org) => (
                  <TouchableOpacity
                    key={org.location_id}
                    style={styles.orgCard}
                    onPress={() => handleSwitch(org)}
                    disabled={switching === org.location_id}
                  >
                    <View style={styles.orgIcon}>
                      <Text style={styles.orgIconText}>{getTypeIcon(org.location_type)}</Text>
                    </View>
                    <View style={styles.orgInfo}>
                      <Text style={styles.orgName}>{org.location_name}</Text>
                      <Text style={styles.orgRole}>{getRoleLabel(org.role)}</Text>
                    </View>
                    {switching === org.location_id ? (
                      <ActivityIndicator size="small" color="#6366F1" />
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
              <Ionicons name="add-circle-outline" size={22} color="#6366F1" />
              <Text style={styles.addOrgText}>Unirme a otra comunidad</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },

  content: { flex: 1 },
  
  section: { padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Active Card
  activeCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  activeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  activeIcon: { fontSize: 36, marginRight: 12 },
  activeInfo: { flex: 1 },
  activeName: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  activeAddress: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeBadgeText: { fontSize: 12, fontWeight: '600', color: '#059669' },
  
  activeDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  detailItem: { minWidth: '30%' },
  detailLabel: { fontSize: 12, color: '#6B7280' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginTop: 2 },
  
  adminInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  adminText: { fontSize: 13, color: '#6B7280' },

  // Org Card
  orgCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 14, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  orgIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  orgIconText: { fontSize: 22 },
  orgInfo: { flex: 1, marginLeft: 12 },
  orgName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  orgRole: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  switchBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  switchBtnText: { fontSize: 13, fontWeight: '600', color: '#6366F1' },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  joinButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#6366F1', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  joinButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  // Add org button
  addOrgButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, margin: 16, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#6366F1' },
  addOrgText: { fontSize: 15, fontWeight: '500', color: '#6366F1' },
});
