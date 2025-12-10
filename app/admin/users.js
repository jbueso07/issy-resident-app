// app/admin/users.js
// ISSY Resident App - Admin: Gestión de Usuarios

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.joinissy.com';

const COLORS = {
  primary: '#6366F1',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  navy: '#1A1A2E',
  white: '#FFFFFF',
  background: '#F3F4F6',
  gray: '#6B7280',
  grayLight: '#E5E7EB',
  grayLighter: '#F9FAFB',
};

const ROLES = {
  user: { label: '🏠 Residente', color: COLORS.success },
  guard: { label: '🔐 Guardia', color: '#3B82F6' },
  admin: { label: '🛡️ Admin', color: '#8B5CF6' },
  superadmin: { label: '👑 Super Admin', color: '#DC2626' },
};

export default function AdminUsers() {
  const { user, profile } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const userRole = profile?.role || user?.role || 'user';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);
  const isSuperAdmin = userRole === 'superadmin';

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Acceso Denegado', 'No tienes permisos');
      router.back();
      return;
    }
    fetchData();
  }, []);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchData = async () => {
    try {
      const headers = await getAuthHeaders();
      
      // Fetch users
      const usersRes = await fetch(`${API_URL}/api/users`, { headers });
      const usersData = await usersRes.json();
      if (usersData.success || Array.isArray(usersData)) {
        const list = usersData.data || usersData.users || usersData;
        setUsers(Array.isArray(list) ? list : []);
      }
      
      // Fetch stats
      const statsRes = await fetch(`${API_URL}/api/users/stats`, { headers });
      const statsData = await statsRes.json();
      if (statsData.success || statsData.data) {
        setStats(statsData.data || statsData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleUserPress = (usr) => {
    setSelectedUser(usr);
    setShowModal(true);
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;
    
    const action = selectedUser.is_active ? 'desactivar' : 'activar';
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Usuario`,
      `¿${action} a ${selectedUser.name || selectedUser.full_name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(
                `${API_URL}/api/users/${selectedUser.id}/toggle`,
                { method: 'PUT', headers }
              );
              if (response.ok) {
                Alert.alert('Éxito', `Usuario ${action}do`);
                setShowModal(false);
                fetchData();
              } else {
                Alert.alert('Error', `No se pudo ${action}`);
              }
            } catch (error) {
              Alert.alert('Error', `No se pudo ${action}`);
            }
          }
        }
      ]
    );
  };

  const handleChangeRole = async (newRole) => {
    if (!selectedUser || !isSuperAdmin) return;
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_URL}/api/users/${selectedUser.id}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({ role: newRole }),
        }
      );
      if (response.ok) {
        Alert.alert('Éxito', 'Rol actualizado');
        setShowModal(false);
        fetchData();
      } else {
        Alert.alert('Error', 'No se pudo cambiar el rol');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cambiar el rol');
    }
  };

  const filteredUsers = users.filter(u => {
    const name = (u.name || u.full_name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  const getRoleInfo = (role) => ROLES[role] || ROLES.user;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando usuarios...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>👥 Usuarios</Text>
          <Text style={styles.headerSubtitle}>{users.length} usuarios</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="🔍 Buscar por nombre o email..."
          placeholderTextColor={COLORS.gray}
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total || stats.totalUsers || users.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.success }]}>
                {stats.active || stats.activeUsers || 0}
              </Text>
              <Text style={styles.statLabel}>Activos</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.warning }]}>
                {stats.guards || 0}
              </Text>
              <Text style={styles.statLabel}>Guardias</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.primary }]}>
                {stats.admins || 0}
              </Text>
              <Text style={styles.statLabel}>Admins</Text>
            </View>
          </View>
        )}

        {/* Users List */}
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No hay usuarios</Text>
          </View>
        ) : (
          filteredUsers.map((usr) => {
            const roleInfo = getRoleInfo(usr.role);
            return (
              <TouchableOpacity
                key={usr.id}
                style={styles.userCard}
                onPress={() => handleUserPress(usr)}
              >
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {(usr.name || usr.full_name || 'U')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{usr.name || usr.full_name}</Text>
                  <Text style={styles.userEmail}>{usr.email}</Text>
                  <View style={styles.userMeta}>
                    <View style={[styles.roleBadge, { backgroundColor: roleInfo.color + '20' }]}>
                      <Text style={[styles.roleBadgeText, { color: roleInfo.color }]}>
                        {roleInfo.label}
                      </Text>
                    </View>
                    {usr.unit_number && (
                      <Text style={styles.unitText}>🏠 {usr.unit_number}</Text>
                    )}
                  </View>
                </View>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: usr.is_active !== false ? COLORS.success : COLORS.gray }
                ]} />
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* User Detail Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalCancel}>Cerrar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Detalle de Usuario</Text>
            <View style={{ width: 50 }} />
          </View>

          {selectedUser && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.userDetailHeader}>
                <View style={styles.userDetailAvatar}>
                  <Text style={styles.userDetailAvatarText}>
                    {(selectedUser.name || selectedUser.full_name || 'U')[0].toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.userDetailName}>
                  {selectedUser.name || selectedUser.full_name}
                </Text>
                <Text style={styles.userDetailEmail}>{selectedUser.email}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Teléfono</Text>
                <Text style={styles.detailValue}>{selectedUser.phone || 'No registrado'}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Unidad</Text>
                <Text style={styles.detailValue}>{selectedUser.unit_number || 'No asignada'}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Rol Actual</Text>
                <Text style={styles.detailValue}>{getRoleInfo(selectedUser.role).label}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Estado</Text>
                <Text style={[
                  styles.detailValue,
                  { color: selectedUser.is_active !== false ? COLORS.success : COLORS.danger }
                ]}>
                  {selectedUser.is_active !== false ? '✅ Activo' : '❌ Inactivo'}
                </Text>
              </View>

              {/* Cambiar Rol (solo superadmin) */}
              {isSuperAdmin && selectedUser.id !== user?.id && (
                <View style={styles.roleSection}>
                  <Text style={styles.roleSectionTitle}>Cambiar Rol</Text>
                  <View style={styles.roleButtons}>
                    {Object.entries(ROLES).map(([key, info]) => (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.roleButton,
                          selectedUser.role === key && { 
                            backgroundColor: info.color + '20',
                            borderColor: info.color 
                          }
                        ]}
                        onPress={() => handleChangeRole(key)}
                      >
                        <Text style={[
                          styles.roleButtonText,
                          selectedUser.role === key && { color: info.color }
                        ]}>
                          {info.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Activar/Desactivar */}
              {selectedUser.id !== user?.id && (
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    { backgroundColor: selectedUser.is_active !== false ? COLORS.danger + '15' : COLORS.success + '15' }
                  ]}
                  onPress={handleToggleStatus}
                >
                  <Text style={[
                    styles.toggleButtonText,
                    { color: selectedUser.is_active !== false ? COLORS.danger : COLORS.success }
                  ]}>
                    {selectedUser.is_active !== false ? '❌ Desactivar Usuario' : '✅ Activar Usuario'}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={{ height: 100 }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.gray, fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: 24, color: COLORS.navy },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.navy },
  headerSubtitle: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  searchContainer: { padding: 16, paddingBottom: 8, backgroundColor: COLORS.white },
  searchInput: { backgroundColor: COLORS.grayLighter, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: COLORS.navy },
  content: { flex: 1 },
  scrollContent: { padding: 16 },
  statsContainer: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: COLORS.white, padding: 12, borderRadius: 10, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.navy },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.navy },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 10 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  userAvatarText: { fontSize: 18, fontWeight: '600', color: COLORS.primary },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600', color: COLORS.navy },
  userEmail: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  roleBadgeText: { fontSize: 11, fontWeight: '500' },
  unitText: { fontSize: 12, color: COLORS.gray },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  modalContainer: { flex: 1, backgroundColor: COLORS.white },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  modalCancel: { fontSize: 16, color: COLORS.primary },
  modalTitle: { fontSize: 17, fontWeight: '600', color: COLORS.navy },
  modalContent: { flex: 1, padding: 16 },
  userDetailHeader: { alignItems: 'center', marginBottom: 24 },
  userDetailAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  userDetailAvatarText: { fontSize: 32, fontWeight: '600', color: COLORS.primary },
  userDetailName: { fontSize: 20, fontWeight: '700', color: COLORS.navy },
  userDetailEmail: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  detailSection: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  detailLabel: { fontSize: 14, color: COLORS.gray },
  detailValue: { fontSize: 14, fontWeight: '500', color: COLORS.navy },
  roleSection: { marginTop: 24 },
  roleSectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.navy, marginBottom: 12 },
  roleButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.grayLight, backgroundColor: COLORS.white },
  roleButtonText: { fontSize: 13, color: COLORS.gray },
  toggleButton: { marginTop: 24, padding: 16, borderRadius: 12, alignItems: 'center' },
  toggleButtonText: { fontSize: 15, fontWeight: '600' },
});