// app/admin/users.js
// ISSY Resident App - Admin: Gestión de Usuarios e Invitaciones (ProHome Dark Theme)
// Usando endpoints correctos de /api/invitations/organization

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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const API_URL = 'https://api.joinissy.com/api';

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
  pink: '#EC4899',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  border: 'rgba(255,255,255,0.1)',
};

const ROLES = {
  resident: { label: 'Residente', icon: 'home', color: COLORS.success },
  guard: { label: 'Guardia', icon: 'shield-checkmark', color: COLORS.blue },
  admin: { label: 'Admin', icon: 'settings', color: COLORS.purple },
  superadmin: { label: 'Super Admin', icon: 'star', color: COLORS.danger },
  host: { label: 'Anfitrión', icon: 'person', color: COLORS.teal },
  tenant: { label: 'Inquilino', icon: 'key', color: COLORS.pink },
  owner: { label: 'Propietario', icon: 'business', color: COLORS.lime },
};

const INVITE_ROLES = {
  resident: { label: 'Residente', icon: 'home', color: COLORS.success },
  guard: { label: 'Guardia', icon: 'shield-checkmark', color: COLORS.blue },
  admin: { label: 'Administrador', icon: 'settings', color: COLORS.purple },
};

export default function AdminUsers() {
  const { user, profile, isSuperAdmin } = useAuth();
  const router = useRouter();
  
  // Location state
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [switchingLocation, setSwitchingLocation] = useState(false);
  
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  const [invitations, setInvitations] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  
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
  const isSuperAdminUser = userRole === 'superadmin' || (typeof isSuperAdmin === 'function' && isSuperAdmin());

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Acceso Denegado', 'No tienes permisos');
      router.back();
      return;
    }
    
    if (isSuperAdminUser) {
      fetchLocations();
    } else {
      setSelectedLocationId(userLocationId);
    }
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      fetchData();
    }
  }, [selectedLocationId]);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchLocations = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/locations`, { headers });
      const data = await res.json();
      
      if (data.success || Array.isArray(data)) {
        const list = data.data || data;
        setLocations(list);
        if (list.length > 0 && !selectedLocationId) {
          setSelectedLocationId(list[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      // Fallback to user's location
      if (userLocationId) {
        setSelectedLocationId(userLocationId);
      }
    } finally {
      if (!selectedLocationId && !isSuperAdminUser) {
        setLoading(false);
      }
    }
  };

  const handleSwitchLocation = (location) => {
    setSelectedLocationId(location.id);
    setShowLocationPicker(false);
    // Data will be refetched by useEffect when selectedLocationId changes
  };

  const fetchData = async () => {
    if (!selectedLocationId) return;
    
    try {
      const headers = await getAuthHeaders();
      
      // Fetch members using the correct endpoint (same as community-management.js)
      const membersRes = await fetch(
        `${API_URL}/invitations/organization/${selectedLocationId}/members`,
        { headers }
      );
      const membersData = await membersRes.json();
      
      if (membersData.success) {
        // Transform member data to match expected format
        const transformedUsers = (membersData.data || []).map(member => ({
          id: member.id,
          user_id: member.user_id,
          name: member.user?.name || member.user?.full_name || 'Sin nombre',
          full_name: member.user?.full_name || member.user?.name,
          email: member.user?.email || '',
          phone: member.user?.phone || '',
          role: member.role || 'resident',
          unit_number: member.unit_number,
          is_active: member.is_active !== false,
          created_at: member.created_at,
          membership_id: member.id, // Keep reference to membership for actions
        }));
        setUsers(transformedUsers);
      } else {
        setUsers([]);
      }
      
      // Fetch stats
      const statsRes = await fetch(
        `${API_URL}/invitations/organization/${selectedLocationId}/stats`,
        { headers }
      );
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.data);
      }
      
      // Fetch pending invitations
      const invitationsRes = await fetch(
        `${API_URL}/invitations/organization/${selectedLocationId}/pending`,
        { headers }
      );
      const invitationsData = await invitationsRes.json();
      if (invitationsData.success) {
        setInvitations(invitationsData.data || []);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [selectedLocationId]);

  const handleUserPress = (usr) => {
    setSelectedUser(usr);
    setShowModal(true);
  };

  const handleChangeRole = async (newRole) => {
    if (!selectedUser || !selectedUser.membership_id) return;
    
    Alert.alert(
      'Cambiar Rol',
      `¿Cambiar rol de ${selectedUser.name || selectedUser.full_name} a ${ROLES[newRole]?.label || newRole}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(
                `${API_URL}/invitations/organization/members/${selectedUser.membership_id}`,
                {
                  method: 'PUT',
                  headers,
                  body: JSON.stringify({ role: newRole }),
                }
              );
              
              if (response.ok) {
                Alert.alert('Éxito', 'Rol actualizado');
                setSelectedUser({ ...selectedUser, role: newRole });
                fetchData();
              } else {
                Alert.alert('Error', 'No se pudo actualizar el rol');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo actualizar el rol');
            }
          }
        }
      ]
    );
  };

  const handleToggleStatus = async () => {
    if (!selectedUser || !selectedUser.membership_id) return;
    
    const newStatus = !selectedUser.is_active;
    Alert.alert(
      newStatus ? 'Activar Usuario' : 'Desactivar Usuario',
      `¿${newStatus ? 'Activar' : 'Desactivar'} a ${selectedUser.name || selectedUser.full_name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: newStatus ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(
                `${API_URL}/invitations/organization/members/${selectedUser.membership_id}`,
                {
                  method: 'PUT',
                  headers,
                  body: JSON.stringify({ is_active: newStatus }),
                }
              );
              
              if (response.ok) {
                Alert.alert('Éxito', `Usuario ${newStatus ? 'activado' : 'desactivado'}`);
                setSelectedUser({ ...selectedUser, is_active: newStatus });
                fetchData();
              } else {
                Alert.alert('Error', 'No se pudo actualizar el estado');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo actualizar el estado');
            }
          }
        }
      ]
    );
  };

  const handleCreateInvitation = async () => {
    setInviteLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/organization-invitations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          role: inviteForm.role,
          unit_number: inviteForm.unit_number || null,
          expected_name: inviteForm.expected_name || null,
          expected_email: inviteForm.expected_email || null,
          expected_phone: inviteForm.expected_phone || null,
          location_id: selectedLocationId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success !== false) {
        Alert.alert(
          'Invitación Creada',
          `Código: ${data.data?.code || data.code}\n\nComparte este código con el usuario.`,
          [
            {
              text: 'Compartir',
              onPress: () => handleShareInvitation(data.data || data),
            },
            { text: 'OK' }
          ]
        );
        setShowInviteModal(false);
        resetInviteForm();
        fetchData();
      } else {
        Alert.alert('Error', data.error || 'No se pudo crear la invitación');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la invitación');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleShareInvitation = async (invitation) => {
    try {
      await Share.share({
        message: `¡Te han invitado a ISSY!\n\nUsa este código para registrarte: ${invitation.code}\n\nO usa este link: ${invitation.invitation_link || `https://app.joinissy.com/invite/${invitation.code}`}`,
      });
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
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              await fetch(`${API_URL}/organization-invitations/${invitationId}`, {
                method: 'DELETE',
                headers,
              });
              fetchData();
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

  const filteredUsers = users.filter(usr => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const name = (usr.name || usr.full_name || '').toLowerCase();
    const email = (usr.email || '').toLowerCase();
    const unit = (usr.unit_number || '').toLowerCase();
    return name.includes(search) || email.includes(search) || unit.includes(search);
  });

  const currentLocation = locations.find(l => l.id === selectedLocationId);

  const getRoleInfo = (role) => ROLES[role] || ROLES.resident;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
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
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Usuarios</Text>
          {/* Location Selector */}
          {isSuperAdminUser && locations.length > 1 ? (
            <TouchableOpacity 
              style={styles.locationSelector}
              onPress={() => setShowLocationPicker(true)}
            >
              <Ionicons name="location" size={14} color={COLORS.teal} />
              <Text style={styles.locationText} numberOfLines={1}>
                {currentLocation?.name || 'Seleccionar'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : (
            <Text style={styles.headerSubtitle}>
              {currentLocation?.name || `${users.length} registrados`}
            </Text>
          )}
        </View>
        <TouchableOpacity 
          onPress={() => setShowInviteModal(true)} 
          style={styles.inviteButton}
        >
          <Ionicons name="person-add" size={20} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}
        >
          <Ionicons 
            name="people" 
            size={16} 
            color={activeTab === 'users' ? COLORS.background : COLORS.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
            Usuarios ({users.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'invitations' && styles.tabActive]}
          onPress={() => setActiveTab('invitations')}
        >
          <Ionicons 
            name="mail" 
            size={16} 
            color={activeTab === 'invitations' ? COLORS.background : COLORS.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'invitations' && styles.tabTextActive]}>
            Invitaciones ({invitations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search (only for users tab) */}
      {activeTab === 'users' && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Buscar por nombre, email o unidad..."
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={COLORS.lime}
          />
        }
      >
        {activeTab === 'users' ? (
          <>
            {/* Stats */}
            {stats && (
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Ionicons name="people" size={20} color={COLORS.teal} />
                  <Text style={[styles.statValue, { color: COLORS.teal }]}>
                    {stats.totalMembers || stats.total || users.length}
                  </Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={[styles.statValue, { color: COLORS.success }]}>
                    {stats.activeMembers || stats.active || 0}
                  </Text>
                  <Text style={styles.statLabel}>Activos</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="home" size={20} color={COLORS.purple} />
                  <Text style={[styles.statValue, { color: COLORS.purple }]}>
                    {stats.totalHouseholds || stats.units || 0}
                  </Text>
                  <Text style={styles.statLabel}>Unidades</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="time" size={20} color={COLORS.warning} />
                  <Text style={[styles.statValue, { color: COLORS.warning }]}>
                    {stats.pendingInvitations || invitations.length || 0}
                  </Text>
                  <Text style={styles.statLabel}>Pendientes</Text>
                </View>
              </View>
            )}

            {/* Users List */}
            {filteredUsers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No hay usuarios</Text>
                <Text style={styles.emptySubtitle}>
                  {currentLocation ? `en ${currentLocation.name}` : ''}
                </Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => setShowInviteModal(true)}
                >
                  <Ionicons name="person-add" size={18} color={COLORS.background} />
                  <Text style={styles.emptyButtonText}>Invitar Usuario</Text>
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
                    activeOpacity={0.7}
                  >
                    <View style={[styles.userAvatar, { backgroundColor: roleInfo.color + '30' }]}>
                      <Text style={[styles.userAvatarText, { color: roleInfo.color }]}>
                        {(usr.name || usr.full_name || 'U')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{usr.name || usr.full_name}</Text>
                      <Text style={styles.userEmail}>{usr.email}</Text>
                      <View style={styles.userMeta}>
                        <View style={[styles.roleBadge, { backgroundColor: roleInfo.color + '20' }]}>
                          <Ionicons name={roleInfo.icon} size={12} color={roleInfo.color} />
                          <Text style={[styles.roleBadgeText, { color: roleInfo.color }]}>
                            {roleInfo.label}
                          </Text>
                        </View>
                        {usr.unit_number && (
                          <View style={styles.unitBadge}>
                            <Ionicons name="home" size={12} color={COLORS.textSecondary} />
                            <Text style={styles.unitText}>{usr.unit_number}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: usr.is_active ? COLORS.success : COLORS.textMuted }
                    ]} />
                  </TouchableOpacity>
                );
              })
            )}
          </>
        ) : (
          <>
            {/* Invitations List */}
            {invitations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="mail-outline" size={64} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No hay invitaciones pendientes</Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => setShowInviteModal(true)}
                >
                  <Ionicons name="add" size={18} color={COLORS.background} />
                  <Text style={styles.emptyButtonText}>Crear Invitación</Text>
                </TouchableOpacity>
              </View>
            ) : (
              invitations.map((inv) => {
                const roleInfo = INVITE_ROLES[inv.role] || INVITE_ROLES.resident;
                const expiresDate = inv.expires_at ? new Date(inv.expires_at) : null;
                const isExpired = expiresDate && expiresDate < new Date();
                
                return (
                  <View key={inv.id} style={styles.invitationCard}>
                    <View style={styles.invitationHeader}>
                      <View style={[styles.roleBadge, { backgroundColor: roleInfo.color + '20' }]}>
                        <Ionicons name={roleInfo.icon} size={12} color={roleInfo.color} />
                        <Text style={[styles.roleBadgeText, { color: roleInfo.color }]}>
                          {roleInfo.label}
                        </Text>
                      </View>
                      {isExpired ? (
                        <View style={[styles.statusBadge, { backgroundColor: COLORS.danger + '20' }]}>
                          <Ionicons name="close-circle" size={12} color={COLORS.danger} />
                          <Text style={[styles.statusBadgeText, { color: COLORS.danger }]}>Expirada</Text>
                        </View>
                      ) : (
                        <View style={[styles.statusBadge, { backgroundColor: COLORS.success + '20' }]}>
                          <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                          <Text style={[styles.statusBadgeText, { color: COLORS.success }]}>Activa</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.invitationDetails}>
                      <View style={styles.codeContainer}>
                        <Ionicons name="key" size={16} color={COLORS.teal} />
                        <Text style={styles.invitationCode}>{inv.code}</Text>
                      </View>
                      {inv.expected_name && (
                        <View style={styles.invitationInfoRow}>
                          <Ionicons name="person" size={14} color={COLORS.textSecondary} />
                          <Text style={styles.invitationInfo}>{inv.expected_name}</Text>
                        </View>
                      )}
                      {inv.unit_number && (
                        <View style={styles.invitationInfoRow}>
                          <Ionicons name="home" size={14} color={COLORS.textSecondary} />
                          <Text style={styles.invitationInfo}>Unidad: {inv.unit_number}</Text>
                        </View>
                      )}
                      {expiresDate && (
                        <View style={styles.invitationInfoRow}>
                          <Ionicons name="time" size={14} color={COLORS.textMuted} />
                          <Text style={styles.invitationExpires}>
                            Expira: {expiresDate.toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.invitationActions}>
                      <TouchableOpacity 
                        style={styles.shareButton}
                        onPress={() => handleShareInvitation(inv)}
                      >
                        <Ionicons name="share-social" size={16} color={COLORS.teal} />
                        <Text style={styles.shareButtonText}>Compartir</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.copyButton}
                        onPress={() => {
                          Clipboard.setString(inv.invitation_link || inv.code);
                          Alert.alert('Copiado', 'Código copiado al portapapeles');
                        }}
                      >
                        <Ionicons name="copy" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.copyButtonText}>Copiar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.cancelButton}
                        onPress={() => handleCancelInvitation(inv.id)}
                      >
                        <Ionicons name="close" size={18} color={COLORS.danger} />
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

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
              <Text style={styles.modalCancel}>Cerrar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Seleccionar Comunidad</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {locations.map((loc) => {
              const isActive = loc.id === selectedLocationId;
              return (
                <TouchableOpacity
                  key={loc.id}
                  style={[styles.locationItem, isActive && styles.locationItemActive]}
                  onPress={() => handleSwitchLocation(loc)}
                >
                  <View style={[styles.locationIcon, isActive && styles.locationIconActive]}>
                    <Ionicons 
                      name="business" 
                      size={24} 
                      color={isActive ? COLORS.lime : COLORS.textSecondary} 
                    />
                  </View>
                  <View style={styles.locationInfo}>
                    <Text style={[styles.locationName, isActive && styles.locationNameActive]}>
                      {loc.name}
                    </Text>
                    {loc.address && (
                      <Text style={styles.locationAddress}>{loc.address}</Text>
                    )}
                  </View>
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.lime} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* User Detail Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
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
                <View style={[styles.userDetailAvatar, { backgroundColor: getRoleInfo(selectedUser.role).color + '30' }]}>
                  <Text style={[styles.userDetailAvatarText, { color: getRoleInfo(selectedUser.role).color }]}>
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
                <View style={[styles.roleBadge, { backgroundColor: getRoleInfo(selectedUser.role).color + '20' }]}>
                  <Ionicons name={getRoleInfo(selectedUser.role).icon} size={14} color={getRoleInfo(selectedUser.role).color} />
                  <Text style={[styles.roleBadgeText, { color: getRoleInfo(selectedUser.role).color }]}>
                    {getRoleInfo(selectedUser.role).label}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Estado</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: selectedUser.is_active ? COLORS.success + '20' : COLORS.danger + '20' }
                ]}>
                  <Ionicons 
                    name={selectedUser.is_active ? 'checkmark-circle' : 'close-circle'} 
                    size={14} 
                    color={selectedUser.is_active ? COLORS.success : COLORS.danger} 
                  />
                  <Text style={[
                    styles.statusBadgeText,
                    { color: selectedUser.is_active ? COLORS.success : COLORS.danger }
                  ]}>
                    {selectedUser.is_active ? 'Activo' : 'Inactivo'}
                  </Text>
                </View>
              </View>

              {/* Cambiar Rol (solo superadmin) */}
              {isSuperAdminUser && selectedUser.user_id !== user?.id && (
                <View style={styles.roleSection}>
                  <Text style={styles.roleSectionTitle}>Cambiar Rol</Text>
                  <View style={styles.roleButtons}>
                    {Object.entries(ROLES).filter(([key]) => !['superadmin'].includes(key)).map(([key, info]) => (
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
                        <Ionicons 
                          name={info.icon} 
                          size={16} 
                          color={selectedUser.role === key ? info.color : COLORS.textSecondary} 
                        />
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
              {selectedUser.user_id !== user?.id && (
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    { backgroundColor: selectedUser.is_active ? COLORS.danger + '15' : COLORS.success + '15' }
                  ]}
                  onPress={handleToggleStatus}
                >
                  <Ionicons 
                    name={selectedUser.is_active ? 'close-circle' : 'checkmark-circle'} 
                    size={20} 
                    color={selectedUser.is_active ? COLORS.danger : COLORS.success} 
                  />
                  <Text style={[
                    styles.toggleButtonText,
                    { color: selectedUser.is_active ? COLORS.danger : COLORS.success }
                  ]}>
                    {selectedUser.is_active ? 'Desactivar Usuario' : 'Activar Usuario'}
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
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
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
              {inviteLoading ? (
                <ActivityIndicator size="small" color={COLORS.lime} />
              ) : (
                <Text style={styles.modalSave}>Crear</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Location indicator */}
            {currentLocation && (
              <View style={styles.inviteLocationBanner}>
                <Ionicons name="location" size={16} color={COLORS.teal} />
                <Text style={styles.inviteLocationText}>
                  Invitando a: {currentLocation.name}
                </Text>
              </View>
            )}

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
                  <Ionicons 
                    name={info.icon} 
                    size={20} 
                    color={inviteForm.role === key ? info.color : COLORS.textSecondary} 
                  />
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
              placeholderTextColor={COLORS.textMuted}
            />

            {/* Expected Name */}
            <Text style={styles.inputLabel}>Nombre (opcional)</Text>
            <TextInput
              style={styles.input}
              value={inviteForm.expected_name}
              onChangeText={(text) => setInviteForm({...inviteForm, expected_name: text})}
              placeholder="Nombre del invitado"
              placeholderTextColor={COLORS.textMuted}
            />

            {/* Expected Email */}
            <Text style={styles.inputLabel}>Email (opcional)</Text>
            <TextInput
              style={styles.input}
              value={inviteForm.expected_email}
              onChangeText={(text) => setInviteForm({...inviteForm, expected_email: text})}
              placeholder="email@ejemplo.com"
              placeholderTextColor={COLORS.textMuted}
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
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
            />

            <View style={styles.inviteNote}>
              <Ionicons name="information-circle" size={20} color={COLORS.teal} />
              <Text style={styles.inviteNoteText}>
                Se generará un código único que podrás compartir. La invitación expira en 7 días.
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: scale(12),
    color: COLORS.textSecondary,
    fontSize: scale(14),
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: scale(12),
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(8),
    marginTop: scale(4),
    gap: scale(4),
    alignSelf: 'flex-start',
  },
  locationText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    maxWidth: scale(150),
  },
  inviteButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    gap: scale(10),
    marginBottom: scale(8),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: scale(12),
    borderRadius: scale(12),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
  },
  tabActive: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  tabText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.background,
    fontWeight: '600',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
  },
  searchIcon: {
    position: 'absolute',
    left: scale(28),
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    paddingHorizontal: scale(40),
    paddingVertical: scale(12),
    fontSize: scale(15),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  
  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: scale(16),
  },
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: scale(16),
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    padding: scale(12),
    borderRadius: scale(10),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: scale(18),
    fontWeight: '700',
    marginTop: scale(4),
  },
  statLabel: {
    fontSize: scale(10),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  
  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: scale(40),
  },
  emptyTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: scale(16),
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.textMuted,
    marginTop: scale(4),
    marginBottom: scale(16),
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lime,
    paddingHorizontal: scale(20),
    paddingVertical: scale(12),
    borderRadius: scale(10),
    gap: scale(8),
  },
  emptyButtonText: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: scale(15),
  },
  
  // User Card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userAvatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  userAvatarText: {
    fontSize: scale(18),
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginTop: scale(6),
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(6),
    gap: scale(4),
  },
  roleBadgeText: {
    fontSize: scale(11),
    fontWeight: '500',
  },
  unitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  unitText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  statusDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
  },

  // Invitation Card
  invitationCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  invitationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
    gap: scale(4),
  },
  statusBadgeText: {
    fontSize: scale(11),
    fontWeight: '600',
  },
  invitationDetails: {
    marginBottom: scale(12),
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(8),
  },
  invitationCode: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  invitationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: scale(4),
  },
  invitationInfo: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  invitationExpires: {
    fontSize: scale(12),
    color: COLORS.textMuted,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: scale(8),
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.teal + '15',
    paddingVertical: scale(10),
    borderRadius: scale(8),
    gap: scale(6),
  },
  shareButtonText: {
    color: COLORS.teal,
    fontWeight: '600',
    fontSize: scale(13),
  },
  copyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundTertiary,
    paddingVertical: scale(10),
    borderRadius: scale(8),
    gap: scale(6),
  },
  copyButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: scale(13),
  },
  cancelButton: {
    width: scale(40),
    backgroundColor: COLORS.danger + '15',
    paddingVertical: scale(10),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCancel: {
    fontSize: scale(16),
    color: COLORS.textSecondary,
  },
  modalTitle: {
    fontSize: scale(17),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalSave: {
    fontSize: scale(16),
    color: COLORS.lime,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: scale(16),
  },
  
  // Location Picker
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationItemActive: {
    borderColor: COLORS.lime,
    backgroundColor: COLORS.lime + '10',
  },
  locationIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(12),
    backgroundColor: COLORS.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  locationIconActive: {
    backgroundColor: COLORS.lime + '20',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  locationNameActive: {
    color: COLORS.lime,
  },
  locationAddress: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },

  // User Detail
  userDetailHeader: {
    alignItems: 'center',
    marginBottom: scale(24),
  },
  userDetailAvatar: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
  },
  userDetailAvatarText: {
    fontSize: scale(32),
    fontWeight: '600',
  },
  userDetailName: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userDetailEmail: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(4),
  },
  detailSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  roleSection: {
    marginTop: scale(24),
  },
  roleSectionTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(12),
  },
  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundSecondary,
    gap: scale(6),
  },
  roleButtonText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(24),
    padding: scale(16),
    borderRadius: scale(12),
    gap: scale(8),
  },
  toggleButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
  },

  // Invite Form
  inviteLocationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.teal + '15',
    padding: scale(12),
    borderRadius: scale(10),
    marginBottom: scale(16),
    gap: scale(8),
  },
  inviteLocationText: {
    fontSize: scale(14),
    color: COLORS.teal,
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
    marginTop: scale(16),
  },
  input: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    fontSize: scale(15),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: scale(8),
  },
  roleSelectorItem: {
    flex: 1,
    paddingVertical: scale(12),
    paddingHorizontal: scale(8),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    gap: scale(4),
  },
  roleSelectorText: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
  },
  inviteNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.teal + '15',
    padding: scale(16),
    borderRadius: scale(10),
    marginTop: scale(24),
    gap: scale(10),
  },
  inviteNoteText: {
    flex: 1,
    fontSize: scale(13),
    color: COLORS.teal,
    lineHeight: scale(20),
  },
});