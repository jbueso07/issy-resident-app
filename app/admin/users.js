// app/admin/users.js
// ISSY Resident App - Admin: Gestión de Usuarios e Invitaciones

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
  Share,
  Clipboard,
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
  resident: { label: '🏠 Residente', color: COLORS.success },
  guard: { label: '🔐 Guardia', color: '#3B82F6' },
  admin: { label: '🛡️ Admin', color: '#8B5CF6' },
  superadmin: { label: '👑 Super Admin', color: '#DC2626' },
};

const INVITE_ROLES = {
  resident: { label: '🏠 Residente', color: COLORS.success },
  guard: { label: '🔐 Guardia', color: '#3B82F6' },
  admin: { label: '🛡️ Administrador', color: '#8B5CF6' },
};

export default function AdminUsers() {
  const { user, profile } = useAuth();
  const router = useRouter();
  
  // Users state
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Invitations state
  const [invitations, setInvitations] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showInvitationsModal, setShowInvitationsModal] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'invitations'
  
  // New invitation form
  const [inviteForm, setInviteForm] = useState({
    role: 'resident',
    unit_number: '',
    expected_name: '',
    expected_email: '',
    expected_phone: '',
  });

  const userRole = profile?.role || user?.role || 'user';
  const userLocationId = profile?.location_id || user?.location_id;
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

      // Fetch invitations
      await fetchInvitations(headers);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchInvitations = async (headers) => {
    try {
      if (!headers) {
        headers = await getAuthHeaders();
      }
      const invRes = await fetch(
        `${API_URL}/api/invitations/organization?location_id=${userLocationId}`, 
        { headers }
      );
      const invData = await invRes.json();
      if (invData.success && invData.data) {
        setInvitations(invData.data);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
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

  // ==========================================
  // INVITATION FUNCTIONS
  // ==========================================

  const handleCreateInvitation = async () => {
    if (!userLocationId) {
      Alert.alert('Error', 'No se encontró la ubicación');
      return;
    }

    setInviteLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/invitations/organization`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          location_id: userLocationId,
          role: inviteForm.role,
          unit_number: inviteForm.unit_number || null,
          expected_name: inviteForm.expected_name || null,
          expected_email: inviteForm.expected_email || null,
          expected_phone: inviteForm.expected_phone || null,
          max_uses: 1,
          expires_days: 7,
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        setShowInviteModal(false);
        resetInviteForm();
        
        // Show share options
        Alert.alert(
          '✅ Invitación Creada',
          `Código: ${data.data.code}\n\n¿Qué deseas hacer?`,
          [
            { text: 'Cerrar', style: 'cancel', onPress: () => fetchInvitations() },
            { 
              text: 'Copiar Link', 
              onPress: () => {
                Clipboard.setString(data.data.invitation_link);
                Alert.alert('✅ Copiado', 'Link copiado al portapapeles');
                fetchInvitations();
              }
            },
            { 
              text: 'Compartir', 
              onPress: () => handleShareInvitation(data.data) 
            },
          ]
        );
      } else {
        Alert.alert('Error', data.error || 'No se pudo crear la invitación');
      }
    } catch (error) {
      console.error('Error creating invitation:', error);
      Alert.alert('Error', 'No se pudo crear la invitación');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleShareInvitation = async (invitation) => {
    try {
      const roleLabel = INVITE_ROLES[invitation.role]?.label || invitation.role;
      const message = `🏠 ISSY - Invitación a ${invitation.location_name || 'la comunidad'}\n\n` +
        `Has sido invitado como ${roleLabel}.\n\n` +
        `📱 Descarga la app ISSY y usa este link para unirte:\n${invitation.invitation_link}\n\n` +
        `Código: ${invitation.code}`;
      
      await Share.share({
        message,
        title: 'Invitación ISSY',
      });
      fetchInvitations();
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    Alert.alert(
      'Cancelar Invitación',
      '¿Estás seguro de cancelar esta invitación?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(
                `${API_URL}/api/invitations/organization/${invitationId}`,
                { method: 'DELETE', headers }
              );
              if (response.ok) {
                Alert.alert('✅ Invitación cancelada');
                fetchInvitations();
              } else {
                Alert.alert('Error', 'No se pudo cancelar');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo cancelar');
            }
          }
        }
      ]
    );
  };

  const resetInviteForm = () => {
    setInviteForm({
      role: 'resident',
      unit_number: '',
      expected_name: '',
      expected_email: '',
      expected_phone: '',
    });
  };

  const filteredUsers = users.filter(u => {
    const name = (u.name || u.full_name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

  const getRoleInfo = (role) => ROLES[role] || ROLES.resident;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando...</Text>
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
        <TouchableOpacity 
          onPress={() => setShowInviteModal(true)} 
          style={styles.inviteButton}
        >
          <Text style={styles.inviteButtonText}>➕</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
            👥 Usuarios ({users.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'invitations' && styles.tabActive]}
          onPress={() => setActiveTab('invitations')}
        >
          <Text style={[styles.tabText, activeTab === 'invitations' && styles.tabTextActive]}>
            ✉️ Invitaciones ({pendingInvitations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search (only for users tab) */}
      {activeTab === 'users' && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="🔍 Buscar por nombre o email..."
            placeholderTextColor={COLORS.gray}
          />
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'users' ? (
          <>
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
                    {stats.byRole?.guard || 0}
                  </Text>
                  <Text style={styles.statLabel}>Guardias</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: COLORS.primary }]}>
                    {stats.byRole?.admin || 0}
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
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => setShowInviteModal(true)}
                >
                  <Text style={styles.emptyButtonText}>➕ Invitar Usuario</Text>
                </TouchableOpacity>
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
          </>
        ) : (
          <>
            {/* Invitations List */}
            {pendingInvitations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>✉️</Text>
                <Text style={styles.emptyTitle}>No hay invitaciones pendientes</Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => setShowInviteModal(true)}
                >
                  <Text style={styles.emptyButtonText}>➕ Crear Invitación</Text>
                </TouchableOpacity>
              </View>
            ) : (
              pendingInvitations.map((inv) => {
                const roleInfo = INVITE_ROLES[inv.role] || INVITE_ROLES.resident;
                const expiresDate = new Date(inv.expires_at);
                const isExpired = expiresDate < new Date();
                
                return (
                  <View key={inv.id} style={styles.invitationCard}>
                    <View style={styles.invitationHeader}>
                      <View style={[styles.roleBadge, { backgroundColor: roleInfo.color + '20' }]}>
                        <Text style={[styles.roleBadgeText, { color: roleInfo.color }]}>
                          {roleInfo.label}
                        </Text>
                      </View>
                      {isExpired ? (
                        <View style={[styles.statusBadge, { backgroundColor: COLORS.danger + '20' }]}>
                          <Text style={[styles.statusBadgeText, { color: COLORS.danger }]}>Expirada</Text>
                        </View>
                      ) : (
                        <View style={[styles.statusBadge, { backgroundColor: COLORS.success + '20' }]}>
                          <Text style={[styles.statusBadgeText, { color: COLORS.success }]}>Activa</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.invitationDetails}>
                      <Text style={styles.invitationCode}>📋 {inv.code}</Text>
                      {inv.expected_name && (
                        <Text style={styles.invitationInfo}>👤 {inv.expected_name}</Text>
                      )}
                      {inv.unit_number && (
                        <Text style={styles.invitationInfo}>🏠 Unidad: {inv.unit_number}</Text>
                      )}
                      <Text style={styles.invitationExpires}>
                        ⏰ Expira: {expiresDate.toLocaleDateString()}
                      </Text>
                    </View>

                    <View style={styles.invitationActions}>
                      <TouchableOpacity 
                        style={styles.shareButton}
                        onPress={() => handleShareInvitation(inv)}
                      >
                        <Text style={styles.shareButtonText}>📤 Compartir</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.copyButton}
                        onPress={() => {
                          Clipboard.setString(inv.invitation_link);
                          Alert.alert('✅ Copiado', 'Link copiado al portapapeles');
                        }}
                      >
                        <Text style={styles.copyButtonText}>📋 Copiar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.cancelButton}
                        onPress={() => handleCancelInvitation(inv.id)}
                      >
                        <Text style={styles.cancelButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </>
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

      {/* Create Invitation Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowInviteModal(false);
              resetInviteForm();
            }}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Invitar Usuario</Text>
            <TouchableOpacity 
              onPress={handleCreateInvitation}
              disabled={inviteLoading}
            >
              <Text style={[styles.modalSave, inviteLoading && { opacity: 0.5 }]}>
                {inviteLoading ? '...' : 'Crear'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Role Selection */}
            <Text style={styles.inputLabel}>Rol *</Text>
            <View style={styles.roleSelector}>
              {Object.entries(INVITE_ROLES).map(([key, info]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.roleSelectorItem,
                    inviteForm.role === key && { 
                      backgroundColor: info.color + '20',
                      borderColor: info.color 
                    }
                  ]}
                  onPress={() => setInviteForm({...inviteForm, role: key})}
                >
                  <Text style={[
                    styles.roleSelectorText,
                    inviteForm.role === key && { color: info.color, fontWeight: '600' }
                  ]}>
                    {info.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Unit Number */}
            <Text style={styles.inputLabel}>Número de Unidad (opcional)</Text>
            <TextInput
              style={styles.input}
              value={inviteForm.unit_number}
              onChangeText={(text) => setInviteForm({...inviteForm, unit_number: text})}
              placeholder="Ej: A-101, Casa 5"
              placeholderTextColor={COLORS.gray}
            />

            {/* Expected Name */}
            <Text style={styles.inputLabel}>Nombre (opcional)</Text>
            <TextInput
              style={styles.input}
              value={inviteForm.expected_name}
              onChangeText={(text) => setInviteForm({...inviteForm, expected_name: text})}
              placeholder="Nombre del invitado"
              placeholderTextColor={COLORS.gray}
            />

            {/* Expected Email */}
            <Text style={styles.inputLabel}>Email (opcional)</Text>
            <TextInput
              style={styles.input}
              value={inviteForm.expected_email}
              onChangeText={(text) => setInviteForm({...inviteForm, expected_email: text})}
              placeholder="email@ejemplo.com"
              placeholderTextColor={COLORS.gray}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Expected Phone */}
            <Text style={styles.inputLabel}>Teléfono (opcional)</Text>
            <TextInput
              style={styles.input}
              value={inviteForm.expected_phone}
              onChangeText={(text) => setInviteForm({...inviteForm, expected_phone: text})}
              placeholder="+504 9999-9999"
              placeholderTextColor={COLORS.gray}
              keyboardType="phone-pad"
            />

            <View style={styles.inviteNote}>
              <Text style={styles.inviteNoteText}>
                📝 Se generará un código único que podrás compartir. La invitación expira en 7 días.
              </Text>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.gray, fontSize: 14 },
  
  // Header
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: COLORS.white, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.grayLight 
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: 24, color: COLORS.navy },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.navy },
  headerSubtitle: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  inviteButton: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: 20,
  },
  inviteButtonText: { fontSize: 20 },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.grayLighter,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.primary + '15',
  },
  tabText: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Search
  searchContainer: { padding: 16, paddingTop: 8, paddingBottom: 8, backgroundColor: COLORS.white },
  searchInput: { backgroundColor: COLORS.grayLighter, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: COLORS.navy },
  
  // Content
  content: { flex: 1 },
  scrollContent: { padding: 16 },
  
  // Stats
  statsContainer: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: COLORS.white, padding: 12, borderRadius: 10, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.navy },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  
  // Empty
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.navy, marginBottom: 16 },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 15,
  },
  
  // User Card
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

  // Invitation Card
  invitationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  invitationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  invitationDetails: {
    marginBottom: 12,
  },
  invitationCode: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 6,
  },
  invitationInfo: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 4,
  },
  invitationExpires: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  shareButton: {
    flex: 1,
    backgroundColor: COLORS.primary + '15',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  copyButton: {
    flex: 1,
    backgroundColor: COLORS.grayLighter,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  copyButtonText: {
    color: COLORS.gray,
    fontWeight: '600',
    fontSize: 13,
  },
  cancelButton: {
    width: 40,
    backgroundColor: COLORS.danger + '15',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: COLORS.danger,
    fontWeight: '700',
    fontSize: 16,
  },
  
  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.white },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  modalCancel: { fontSize: 16, color: COLORS.gray },
  modalTitle: { fontSize: 17, fontWeight: '600', color: COLORS.navy },
  modalSave: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  modalContent: { flex: 1, padding: 16 },
  
  // User Detail
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

  // Invite Form
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.grayLighter,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  roleSelectorItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  roleSelectorText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  inviteNote: {
    backgroundColor: COLORS.primary + '10',
    padding: 16,
    borderRadius: 10,
    marginTop: 24,
  },
  inviteNoteText: {
    fontSize: 13,
    color: COLORS.primary,
    lineHeight: 20,
  },
});