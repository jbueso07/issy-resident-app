// app/admin/community-management.js
// ISSY Resident App - Admin: Gestión de Miembros de Comunidad (ProHome Dark Theme)

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
  Switch,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const API_URL = 'https://api.joinissy.com/api';

// ProHome Dark Theme Colors
const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  card: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  lime: '#D4FE48',
  teal: '#5DDED8',
  cyan: '#00E5FF',
  purple: '#6366F1',
  pink: '#EC4899',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  border: 'rgba(255,255,255,0.1)',
};

const ROLES = {
  resident: { label: 'Residente', color: COLORS.success, bg: COLORS.success + '20' },
  host: { label: 'Anfitrión principal', color: COLORS.teal, bg: COLORS.teal + '20' },
  tenant: { label: 'Inquilino', color: COLORS.pink, bg: COLORS.pink + '20' },
  admin: { label: 'Administrador', color: COLORS.purple, bg: COLORS.purple + '20' },
  owner: { label: 'Propietario', color: COLORS.lime, bg: COLORS.lime + '20' },
  guard: { label: 'Guardia', color: COLORS.warning, bg: COLORS.warning + '20' },
};

const DEACTIVATION_REASONS = [
  { id: 'moved', label: 'Se mudó / Ya no vive aquí', icon: '🏠' },
  { id: 'payment', label: 'Falta de pago', icon: '💳' },
  { id: 'violation', label: 'Violación de reglamento', icon: '⚠️' },
  { id: 'temporary', label: 'Ausencia temporal', icon: '✈️' },
  { id: 'request', label: 'Solicitud del residente', icon: '📝' },
  { id: 'duplicate', label: 'Cuenta duplicada', icon: '👥' },
  { id: 'other', label: 'Otra razón', icon: '📋' },
];

export default function CommunityManagement() {
  const { user, profile, isSuperAdmin } = useAuth();
  const router = useRouter();
  
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('members');
  
  // Location state (for superadmin)
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  
  // Modals
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [editForm, setEditForm] = useState({ role: '', unit_number: '' });
  const [actionLoading, setActionLoading] = useState(false);
  
  // Expanded households
  const [expandedUnits, setExpandedUnits] = useState({});

  const userRole = profile?.role || user?.role || 'user';
  const userLocationId = profile?.location_id || user?.location_id;
  const isAdmin = ['admin', 'superadmin'].includes(userRole);
  const isSuperAdminUser = userRole === 'superadmin' || isSuperAdmin?.();

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Acceso Denegado', 'No tienes permisos para esta sección');
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
    } finally {
      if (!selectedLocationId && !isSuperAdminUser) {
        setLoading(false);
      }
    }
  };

  const fetchData = async () => {
    if (!selectedLocationId) return;
    
    try {
      const headers = await getAuthHeaders();
      
      const membersRes = await fetch(
        `${API_URL}/invitations/organization/${selectedLocationId}/members`,
        { headers }
      );
      const membersData = await membersRes.json();
      if (membersData.success) {
        setMembers(membersData.data || []);
      }
      
      const pendingRes = await fetch(
        `${API_URL}/invitations/organization/${selectedLocationId}/pending`,
        { headers }
      );
      const pendingData = await pendingRes.json();
      if (pendingData.success) {
        setPendingMembers(pendingData.data || []);
      }
      
      const statsRes = await fetch(
        `${API_URL}/invitations/organization/${selectedLocationId}/stats`,
        { headers }
      );
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [selectedLocationId]);

  // FILTERS & GROUPING
  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      m.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.unit_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'active' && m.is_active !== false) ||
      (filter === 'inactive' && m.is_active === false);
    
    return matchesSearch && matchesFilter;
  });

  const groupedMembers = filteredMembers.reduce((acc, member) => {
    const unit = member.unit_number || 'Sin asignar';
    if (!acc[unit]) acc[unit] = [];
    acc[unit].push(member);
    return acc;
  }, {});

  const toggleUnit = (unit) => {
    setExpandedUnits(prev => ({ ...prev, [unit]: !prev[unit] }));
  };

  // MEMBER ACTIONS
  const handleToggleMember = async (member, newStatus) => {
    if (!newStatus) {
      setSelectedMember(member);
      setDeactivationReason('');
      setCustomReason('');
      setShowDeactivateModal(true);
    } else {
      await updateMemberStatus(member.id, true);
    }
  };

  const updateMemberStatus = async (membershipId, isActive, reason = null) => {
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${API_URL}/invitations/organization/members/${membershipId}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({ 
            is_active: isActive,
            deactivation_reason: reason 
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        Alert.alert('Éxito', isActive ? 'Miembro activado' : 'Miembro desactivado');
        fetchData();
      } else {
        Alert.alert('Error', data.error || 'No se pudo actualizar');
      }
    } catch (error) {
      console.error('Error updating member:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado');
    } finally {
      setActionLoading(false);
      setShowDeactivateModal(false);
      setSelectedMember(null);
    }
  };

  const confirmDeactivation = () => {
    if (!deactivationReason) {
      Alert.alert('Error', 'Selecciona una razón');
      return;
    }
    
    const reason = deactivationReason === 'other' ? customReason : 
      DEACTIVATION_REASONS.find(r => r.id === deactivationReason)?.label;
    
    if (deactivationReason === 'other' && !customReason.trim()) {
      Alert.alert('Error', 'Escribe la razón');
      return;
    }
    
    updateMemberStatus(selectedMember.id, false, reason);
  };

  const handleEditMember = (member) => {
    setSelectedMember(member);
    setEditForm({
      role: member.role || 'resident',
      unit_number: member.unit_number || '',
    });
    setShowEditModal(true);
  };

  const saveEditMember = async () => {
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${API_URL}/invitations/organization/members/${selectedMember.id}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify(editForm),
        }
      );
      const data = await res.json();
      if (data.success) {
        Alert.alert('Éxito', 'Miembro actualizado');
        fetchData();
      } else {
        Alert.alert('Error', data.error || 'No se pudo actualizar');
      }
    } catch (error) {
      console.error('Error updating member:', error);
      Alert.alert('Error', 'No se pudo actualizar');
    } finally {
      setActionLoading(false);
      setShowEditModal(false);
      setSelectedMember(null);
    }
  };

  // PENDING ACTIONS
  const handleApproveMember = async (membershipId) => {
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${API_URL}/invitations/organization/members/${membershipId}/approve`,
        { method: 'POST', headers }
      );
      const data = await res.json();
      if (data.success) {
        Alert.alert('Éxito', 'Miembro aprobado');
        fetchData();
      } else {
        Alert.alert('Error', data.error || 'No se pudo aprobar');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo aprobar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectMember = async (membershipId) => {
    Alert.alert(
      'Rechazar Solicitud',
      '¿Estás seguro de rechazar esta solicitud?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const headers = await getAuthHeaders();
              const res = await fetch(
                `${API_URL}/invitations/organization/members/${membershipId}/reject`,
                { method: 'POST', headers }
              );
              const data = await res.json();
              if (data.success) {
                Alert.alert('Éxito', 'Solicitud rechazada');
                fetchData();
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo rechazar');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleApproveAll = async () => {
    Alert.alert(
      'Aprobar Todos',
      `¿Aprobar ${pendingMembers.length} solicitudes pendientes?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar Todos',
          onPress: async () => {
            setActionLoading(true);
            try {
              const headers = await getAuthHeaders();
              const res = await fetch(
                `${API_URL}/invitations/organization/${selectedLocationId}/approve-all`,
                { method: 'POST', headers }
              );
              const data = await res.json();
              if (data.success) {
                Alert.alert('Éxito', `${data.count} miembros aprobados`);
                fetchData();
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo aprobar');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  // RENDER HELPERS
  const getRoleBadge = (role) => {
    return ROLES[role] || { label: role, color: COLORS.textSecondary, bg: COLORS.backgroundTertiary };
  };

  const getSelectedLocation = () => {
    return locations.find(l => l.id === selectedLocationId);
  };

  // RENDER
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
          <Text style={styles.headerTitle}>Gestión de Comunidad</Text>
          {isSuperAdminUser && getSelectedLocation() && (
            <TouchableOpacity onPress={() => setShowLocationPicker(true)}>
              <Text style={styles.headerSubtitle}>
                {getSelectedLocation()?.name} ▾
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.members?.active || 0}</Text>
            <Text style={styles.statLabel}>Activos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.warning }]}>
              {pendingMembers.length}
            </Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.textMuted }]}>
              {stats.members?.inactive || 0}
            </Text>
            <Text style={styles.statLabel}>Inactivos</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.tabActive]}
          onPress={() => setActiveTab('members')}
        >
          <Ionicons 
            name="people" 
            size={16} 
            color={activeTab === 'members' ? COLORS.lime : COLORS.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
            Miembros
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Ionicons 
            name="hourglass" 
            size={16} 
            color={activeTab === 'pending' ? COLORS.lime : COLORS.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pendientes {pendingMembers.length > 0 && `(${pendingMembers.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter (only for members tab) */}
      {activeTab === 'members' && (
        <View style={styles.searchFilterContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre, email o unidad..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
          <View style={styles.filterContainer}>
            {['all', 'active', 'inactive'].map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterButton, filter === f && styles.filterButtonActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Inactivos'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Content */}
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
        {activeTab === 'members' ? (
          Object.keys(groupedMembers).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={60} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No hay miembros</Text>
              <Text style={styles.emptySubtitle}>Los miembros aparecerán aquí</Text>
            </View>
          ) : (
            Object.entries(groupedMembers).map(([unit, unitMembers]) => (
              <View key={unit} style={styles.unitGroup}>
                <TouchableOpacity
                  style={styles.unitHeader}
                  onPress={() => toggleUnit(unit)}
                >
                  <View style={styles.unitInfo}>
                    <View style={styles.unitIconContainer}>
                      <Ionicons name="home" size={18} color={COLORS.teal} />
                    </View>
                    <Text style={styles.unitName}>{unit}</Text>
                    <Text style={styles.unitCount}>
                      {unitMembers.length} miembro{unitMembers.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Ionicons 
                    name={expandedUnits[unit] ? 'chevron-up' : 'chevron-down'} 
                    size={18} 
                    color={COLORS.textSecondary} 
                  />
                </TouchableOpacity>

                {expandedUnits[unit] && (
                  <View style={styles.unitMembers}>
                    {unitMembers.map(member => (
                      <View key={member.id} style={styles.memberCard}>
                        <View style={styles.memberLeft}>
                          <View style={[
                            styles.memberAvatar,
                            member.is_active === false && styles.memberAvatarInactive
                          ]}>
                            <Text style={[
                              styles.memberAvatarText,
                              member.is_active === false && { color: COLORS.textMuted }
                            ]}>
                              {member.user?.name?.charAt(0)?.toUpperCase() || '?'}
                            </Text>
                          </View>
                          <View style={styles.memberInfo}>
                            <Text style={[
                              styles.memberName,
                              member.is_active === false && styles.memberNameInactive
                            ]}>
                              {member.user?.name || 'Sin nombre'}
                            </Text>
                            <Text style={styles.memberEmail}>
                              {member.user?.email}
                            </Text>
                            <View style={[
                              styles.roleBadge,
                              { backgroundColor: getRoleBadge(member.role).bg }
                            ]}>
                              <Text style={[
                                styles.roleBadgeText,
                                { color: getRoleBadge(member.role).color }
                              ]}>
                                {getRoleBadge(member.role).label}
                              </Text>
                            </View>
                            {member.is_active === false && member.deactivation_reason && (
                              <Text style={styles.deactivationReason}>
                                ⚠️ {member.deactivation_reason}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.memberActions}>
                          <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => handleEditMember(member)}
                          >
                            <Ionicons name="pencil" size={16} color={COLORS.teal} />
                          </TouchableOpacity>
                          <Switch
                            value={member.is_active !== false}
                            onValueChange={(val) => handleToggleMember(member, val)}
                            trackColor={{ false: COLORS.backgroundTertiary, true: COLORS.success + '50' }}
                            thumbColor={member.is_active !== false ? COLORS.success : COLORS.textMuted}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          )
        ) : (
          <>
            {pendingMembers.length > 0 && (
              <TouchableOpacity
                style={styles.approveAllButton}
                onPress={handleApproveAll}
              >
                <Ionicons name="checkmark-done" size={20} color={COLORS.background} />
                <Text style={styles.approveAllButtonText}>Aprobar Todos</Text>
              </TouchableOpacity>
            )}
            
            {pendingMembers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle-outline" size={60} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>Sin pendientes</Text>
                <Text style={styles.emptySubtitle}>No hay solicitudes pendientes</Text>
              </View>
            ) : (
              pendingMembers.map(member => (
                <View key={member.id} style={styles.pendingCard}>
                  <View style={styles.pendingInfo}>
                    <View style={styles.pendingAvatar}>
                      <Text style={styles.pendingAvatarText}>
                        {member.user?.name?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={styles.pendingDetails}>
                      <Text style={styles.pendingName}>
                        {member.user?.name || 'Sin nombre'}
                      </Text>
                      <Text style={styles.pendingEmail}>{member.user?.email}</Text>
                      <View style={styles.pendingMeta}>
                        <View style={[
                          styles.roleBadge,
                          { backgroundColor: getRoleBadge(member.role).bg }
                        ]}>
                          <Text style={[
                            styles.roleBadgeText,
                            { color: getRoleBadge(member.role).color }
                          ]}>
                            {getRoleBadge(member.role).label}
                          </Text>
                        </View>
                        {member.unit_number && (
                          <Text style={styles.pendingUnit}>
                            <Ionicons name="home-outline" size={12} color={COLORS.textSecondary} /> {member.unit_number}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                  <View style={styles.pendingActions}>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => handleApproveMember(member.id)}
                    >
                      <Ionicons name="checkmark" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleRejectMember(member.id)}
                    >
                      <Ionicons name="close" size={22} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Deactivation Modal */}
      <Modal
        visible={showDeactivateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDeactivateModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Razón de Desactivación</Text>
            <TouchableOpacity 
              onPress={confirmDeactivation}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={COLORS.danger} />
              ) : (
                <Text style={styles.modalSave}>Confirmar</Text>
              )}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalSubtitle}>
              Selecciona la razón para desactivar a {selectedMember?.user?.name}:
            </Text>
            
            {DEACTIVATION_REASONS.map(reason => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonOption,
                  deactivationReason === reason.id && styles.reasonOptionSelected
                ]}
                onPress={() => setDeactivationReason(reason.id)}
              >
                <Text style={styles.reasonIcon}>{reason.icon}</Text>
                <Text style={[
                  styles.reasonLabel,
                  deactivationReason === reason.id && styles.reasonLabelSelected
                ]}>
                  {reason.label}
                </Text>
                {deactivationReason === reason.id && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.danger} />
                )}
              </TouchableOpacity>
            ))}
            
            {deactivationReason === 'other' && (
              <TextInput
                style={styles.customReasonInput}
                placeholder="Escribe la razón..."
                value={customReason}
                onChangeText={setCustomReason}
                multiline
                placeholderTextColor={COLORS.textMuted}
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Editar Miembro</Text>
            <TouchableOpacity 
              onPress={saveEditMember}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={COLORS.lime} />
              ) : (
                <Text style={styles.modalSave}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.editMemberHeader}>
              <View style={styles.editMemberAvatar}>
                <Text style={styles.editMemberAvatarText}>
                  {selectedMember?.user?.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <Text style={styles.editMemberName}>
                {selectedMember?.user?.name}
              </Text>
              <Text style={styles.editMemberEmail}>
                {selectedMember?.user?.email}
              </Text>
            </View>
            
            <Text style={styles.inputLabel}>Rol</Text>
            <View style={styles.roleSelector}>
              {Object.entries(ROLES).map(([key, { label, color, bg }]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.roleSelectorItem,
                    editForm.role === key && { backgroundColor: bg, borderColor: color }
                  ]}
                  onPress={() => setEditForm({ ...editForm, role: key })}
                >
                  <Text style={[
                    styles.roleSelectorText,
                    editForm.role === key && { color }
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.inputLabel}>Unidad / Casa</Text>
            <TextInput
              style={styles.input}
              value={editForm.unit_number}
              onChangeText={(text) => setEditForm({ ...editForm, unit_number: text })}
              placeholder="Ej: A-101, Casa 5"
              placeholderTextColor={COLORS.textMuted}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Location Picker Modal (SuperAdmin) */}
      <Modal
        visible={showLocationPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
              <Text style={styles.modalCancel}>Cerrar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Seleccionar Ubicación</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            {locations.map(location => (
              <TouchableOpacity
                key={location.id}
                style={[
                  styles.locationOption,
                  selectedLocationId === location.id && styles.locationOptionSelected
                ]}
                onPress={() => {
                  setSelectedLocationId(location.id);
                  setShowLocationPicker(false);
                }}
              >
                <View style={styles.locationIconContainer}>
                  <Ionicons name="location" size={24} color={COLORS.teal} />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>{location.name}</Text>
                  <Text style={styles.locationAddress}>{location.address}</Text>
                </View>
                {selectedLocationId === location.id && (
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.lime} />
                )}
              </TouchableOpacity>
            ))}
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
    color: COLORS.textSecondary,
    marginTop: scale(12),
    fontSize: scale(14),
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: scale(13),
    color: COLORS.teal,
    marginTop: scale(2),
  },
  refreshButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    gap: scale(10),
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    padding: scale(12),
    borderRadius: scale(12),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: scale(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    paddingBottom: scale(12),
    gap: scale(10),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingVertical: scale(12),
    borderRadius: scale(10),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.lime + '20',
    borderColor: COLORS.lime,
  },
  tabText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.lime,
    fontWeight: '600',
  },
  
  // Search & Filter
  searchFilterContainer: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(12),
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    paddingHorizontal: scale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: scale(10),
  },
  searchInput: {
    flex: 1,
    paddingVertical: scale(12),
    paddingLeft: scale(10),
    fontSize: scale(15),
    color: COLORS.textPrimary,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: scale(8),
  },
  filterButton: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  filterText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.background,
    fontWeight: '600',
  },
  
  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: scale(16),
    paddingBottom: scale(100),
  },
  
  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: scale(60),
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
  },
  
  // Unit Group
  unitGroup: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    marginBottom: scale(12),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(14),
    backgroundColor: COLORS.backgroundTertiary,
  },
  unitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  unitIconContainer: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
    backgroundColor: COLORS.teal + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitName: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  unitCount: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  unitMembers: {
    padding: scale(8),
  },
  
  // Member Card
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(12),
    borderRadius: scale(8),
    marginBottom: scale(4),
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.teal + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  memberAvatarInactive: {
    backgroundColor: COLORS.backgroundTertiary,
  },
  memberAvatarText: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.teal,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  memberNameInactive: {
    color: COLORS.textMuted,
  },
  memberEmail: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  editButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: COLORS.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deactivationReason: {
    fontSize: scale(11),
    color: COLORS.danger,
    marginTop: scale(4),
  },
  
  // Role Badge
  roleBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(6),
    alignSelf: 'flex-start',
    marginTop: scale(4),
  },
  roleBadgeText: {
    fontSize: scale(11),
    fontWeight: '500',
  },
  
  // Pending Card
  pendingCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pendingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pendingAvatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: COLORS.warning + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  pendingAvatarText: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.warning,
  },
  pendingDetails: {
    flex: 1,
  },
  pendingName: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  pendingEmail: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  pendingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginTop: scale(6),
  },
  pendingUnit: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: scale(8),
  },
  approveButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.danger + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: COLORS.success,
    paddingVertical: scale(14),
    borderRadius: scale(12),
    marginBottom: scale(16),
  },
  approveAllButtonText: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: scale(15),
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
    fontSize: scale(15),
    color: COLORS.textSecondary,
  },
  modalTitle: {
    fontSize: scale(17),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalSave: {
    fontSize: scale(15),
    color: COLORS.lime,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: scale(16),
  },
  modalSubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginBottom: scale(16),
  },
  
  // Deactivation Reasons
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(14),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundSecondary,
    marginBottom: scale(8),
  },
  reasonOptionSelected: {
    backgroundColor: COLORS.danger + '15',
    borderColor: COLORS.danger,
  },
  reasonIcon: {
    fontSize: scale(20),
    marginRight: scale(12),
  },
  reasonLabel: {
    flex: 1,
    fontSize: scale(15),
    color: COLORS.textPrimary,
  },
  reasonLabelSelected: {
    color: COLORS.danger,
    fontWeight: '500',
  },
  customReasonInput: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    padding: scale(14),
    fontSize: scale(15),
    color: COLORS.textPrimary,
    minHeight: scale(80),
    textAlignVertical: 'top',
    marginTop: scale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  
  // Edit Modal
  editMemberHeader: {
    alignItems: 'center',
    marginBottom: scale(24),
  },
  editMemberAvatar: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(35),
    backgroundColor: COLORS.teal + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
  },
  editMemberAvatarText: {
    fontSize: scale(28),
    fontWeight: '600',
    color: COLORS.teal,
  },
  editMemberName: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  editMemberEmail: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(2),
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
    flexWrap: 'wrap',
    gap: scale(8),
  },
  roleSelectorItem: {
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundSecondary,
  },
  roleSelectorText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  
  // Location Picker
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(14),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundSecondary,
    marginBottom: scale(10),
  },
  locationOptionSelected: {
    backgroundColor: COLORS.lime + '15',
    borderColor: COLORS.lime,
  },
  locationIconContainer: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.teal + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  locationAddress: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
});