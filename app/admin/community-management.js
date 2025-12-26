// app/admin/community-management.js
// ISSY Resident App - Admin: Gestión de Miembros de Comunidad
// Similar a MembersManager.jsx de la web

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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.joinissy.com/api';

const COLORS = {
  primary: '#3B82F6',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  navy: '#1A1A2E',
  white: '#FFFFFF',
  background: '#F3F4F6',
  gray: '#6B7280',
  grayLight: '#E5E7EB',
  grayLighter: '#F9FAFB',
  purple: '#8B5CF6',
  pink: '#EC4899',
};

const ROLES = {
  resident: { label: 'Residente', color: COLORS.success, bg: '#ECFDF5' },
  host: { label: 'Anfitrión principal', color: COLORS.primary, bg: '#EFF6FF' },
  tenant: { label: 'Inquilino', color: COLORS.pink, bg: '#FDF2F8' },
  admin: { label: 'Administrador', color: COLORS.purple, bg: '#F5F3FF' },
  owner: { label: 'Propietario', color: COLORS.purple, bg: '#F5F3FF' },
  guard: { label: 'Guardia', color: COLORS.warning, bg: '#FFFBEB' },
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
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'pending'
  
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
      
      // Fetch members
      const membersRes = await fetch(
        `${API_URL}/invitations/organization/${selectedLocationId}/members`,
        { headers }
      );
      const membersData = await membersRes.json();
      if (membersData.success) {
        setMembers(membersData.data || []);
      }
      
      // Fetch pending
      const pendingRes = await fetch(
        `${API_URL}/invitations/organization/${selectedLocationId}/pending`,
        { headers }
      );
      const pendingData = await pendingRes.json();
      if (pendingData.success) {
        setPendingMembers(pendingData.data || []);
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

  // ==========================================
  // FILTERS & GROUPING
  // ==========================================

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

  // ==========================================
  // MEMBER ACTIONS
  // ==========================================

  const handleToggleMember = async (member, newStatus) => {
    if (!newStatus) {
      // Deactivating - show reason modal
      setSelectedMember(member);
      setDeactivationReason('');
      setCustomReason('');
      setShowDeactivateModal(true);
    } else {
      // Activating - do it directly
      await updateMemberStatus(member.id, true);
    }
  };

  const updateMemberStatus = async (membershipId, isActive, reason = null) => {
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${API_URL}/invitations/organization/members/${membershipId}/status`,
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

  // ==========================================
  // PENDING ACTIONS
  // ==========================================

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

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const getRoleBadge = (role) => {
    return ROLES[role] || { label: role, color: COLORS.gray, bg: COLORS.grayLighter };
  };

  const getSelectedLocation = () => {
    return locations.find(l => l.id === selectedLocationId);
  };

  // ==========================================
  // RENDER
  // ==========================================

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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
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
          <Text style={styles.refreshButtonText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.members?.active || 0}</Text>
            <Text style={styles.statLabel}>Activos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.warning }]}>
              {pendingMembers.length}
            </Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.gray }]}>
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
          <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
            👥 Miembros
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            ⏳ Pendientes {pendingMembers.length > 0 && `(${pendingMembers.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter (only for members tab) */}
      {activeTab === 'members' && (
        <View style={styles.searchFilterContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, email o unidad..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor={COLORS.gray}
          />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'members' ? (
          // Members List
          Object.keys(groupedMembers).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No hay miembros</Text>
            </View>
          ) : (
            Object.entries(groupedMembers).map(([unit, unitMembers]) => (
              <View key={unit} style={styles.unitGroup}>
                <TouchableOpacity
                  style={styles.unitHeader}
                  onPress={() => toggleUnit(unit)}
                >
                  <View style={styles.unitInfo}>
                    <Text style={styles.unitIcon}>🏠</Text>
                    <Text style={styles.unitName}>{unit}</Text>
                    <Text style={styles.unitCount}>
                      {unitMembers.length} miembro{unitMembers.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Text style={styles.expandIcon}>
                    {expandedUnits[unit] ? '▲' : '▼'}
                  </Text>
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
                            <Text style={styles.memberAvatarText}>
                              {member.user?.name?.charAt(0) || '?'}
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
                            <Text style={styles.editButtonText}>✏️</Text>
                          </TouchableOpacity>
                          <Switch
                            value={member.is_active !== false}
                            onValueChange={(value) => handleToggleMember(member, value)}
                            trackColor={{ false: COLORS.grayLight, true: COLORS.success + '50' }}
                            thumbColor={member.is_active !== false ? COLORS.success : COLORS.gray}
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
          // Pending List
          <>
            {pendingMembers.length > 0 && (
              <TouchableOpacity
                style={styles.approveAllButton}
                onPress={handleApproveAll}
              >
                <Text style={styles.approveAllButtonText}>
                  ✅ Aprobar Todos ({pendingMembers.length})
                </Text>
              </TouchableOpacity>
            )}
            
            {pendingMembers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>✅</Text>
                <Text style={styles.emptyTitle}>¡Todo al día!</Text>
                <Text style={styles.emptySubtitle}>No hay solicitudes pendientes</Text>
              </View>
            ) : (
              pendingMembers.map(member => (
                <View key={member.id} style={styles.pendingCard}>
                  <View style={styles.pendingInfo}>
                    <View style={styles.pendingAvatar}>
                      <Text style={styles.pendingAvatarText}>
                        {member.user?.name?.charAt(0) || '?'}
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
                          <Text style={styles.pendingUnit}>🏠 {member.unit_number}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                  <View style={styles.pendingActions}>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => handleApproveMember(member.id)}
                    >
                      <Text style={styles.approveButtonText}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleRejectMember(member.id)}
                    >
                      <Text style={styles.rejectButtonText}>✕</Text>
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
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDeactivateModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Razón de Desactivación</Text>
            <TouchableOpacity 
              onPress={confirmDeactivation}
              disabled={actionLoading}
            >
              <Text style={[styles.modalSave, actionLoading && { opacity: 0.5 }]}>
                {actionLoading ? '...' : 'Confirmar'}
              </Text>
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
                  <Text style={styles.reasonCheck}>✓</Text>
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
                placeholderTextColor={COLORS.gray}
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
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Editar Miembro</Text>
            <TouchableOpacity 
              onPress={saveEditMember}
              disabled={actionLoading}
            >
              <Text style={[styles.modalSave, actionLoading && { opacity: 0.5 }]}>
                {actionLoading ? '...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.editMemberHeader}>
              <View style={styles.editMemberAvatar}>
                <Text style={styles.editMemberAvatarText}>
                  {selectedMember?.user?.name?.charAt(0) || '?'}
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
              {Object.entries(ROLES).map(([key, value]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.roleSelectorItem,
                    editForm.role === key && { 
                      backgroundColor: value.bg,
                      borderColor: value.color 
                    }
                  ]}
                  onPress={() => setEditForm({ ...editForm, role: key })}
                >
                  <Text style={[
                    styles.roleSelectorText,
                    editForm.role === key && { color: value.color }
                  ]}>
                    {value.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Unidad / Casa</Text>
            <TextInput
              style={styles.input}
              value={editForm.unit_number}
              onChangeText={(text) => setEditForm({ ...editForm, unit_number: text })}
              placeholder="Ej: Casa #5, Apto 301"
              placeholderTextColor={COLORS.gray}
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
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
              <Text style={styles.modalCancel}>Cerrar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Seleccionar Comunidad</Text>
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
                <Text style={styles.locationIcon}>🏢</Text>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>{location.name}</Text>
                  <Text style={styles.locationAddress}>
                    {location.address || 'Sin dirección'}
                  </Text>
                </View>
                {selectedLocationId === location.id && (
                  <Text style={styles.locationCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Loading Overlay */}
      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.white} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.gray, fontSize: 14 },
  loadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Header
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
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: 24, color: COLORS.navy },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.navy },
  headerSubtitle: { fontSize: 13, color: COLORS.primary, marginTop: 2 },
  refreshButton: { 
    width: 40, height: 40, 
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.grayLighter,
    borderRadius: 20,
  },
  refreshButtonText: { fontSize: 20, color: COLORS.navy },
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: COLORS.white,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.grayLighter,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '700', color: COLORS.success },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  
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
    borderRadius: 8,
    backgroundColor: COLORS.grayLighter,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: COLORS.primary + '15' },
  tabText: { fontSize: 13, color: COLORS.gray, fontWeight: '500' },
  tabTextActive: { color: COLORS.primary, fontWeight: '600' },
  
  // Search & Filter
  searchFilterContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInput: {
    backgroundColor: COLORS.grayLighter,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.navy,
    marginBottom: 8,
  },
  filterContainer: { flexDirection: 'row', gap: 8 },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.grayLighter,
  },
  filterButtonActive: { backgroundColor: COLORS.primary },
  filterText: { fontSize: 12, color: COLORS.gray },
  filterTextActive: { color: COLORS.white, fontWeight: '600' },
  
  // Content
  content: { flex: 1 },
  scrollContent: { padding: 16 },
  
  // Empty
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.navy },
  emptySubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  
  // Unit Group
  unitGroup: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  unitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.grayLighter,
  },
  unitInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unitIcon: { fontSize: 18 },
  unitName: { fontSize: 15, fontWeight: '600', color: COLORS.navy },
  unitCount: { fontSize: 12, color: COLORS.gray },
  expandIcon: { fontSize: 12, color: COLORS.gray },
  unitMembers: { padding: 8 },
  
  // Member Card
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  memberLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberAvatarInactive: { backgroundColor: COLORS.grayLight },
  memberAvatarText: { fontSize: 18, fontWeight: '600', color: COLORS.primary },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: COLORS.navy },
  memberNameInactive: { color: COLORS.gray },
  memberEmail: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  memberActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.grayLighter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: { fontSize: 16 },
  deactivationReason: {
    fontSize: 11,
    color: COLORS.danger,
    marginTop: 4,
  },
  
  // Role Badge
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '500' },
  
  // Pending Card
  pendingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pendingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  pendingAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pendingAvatarText: { fontSize: 18, fontWeight: '600', color: COLORS.warning },
  pendingDetails: { flex: 1 },
  pendingName: { fontSize: 15, fontWeight: '600', color: COLORS.navy },
  pendingEmail: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  pendingMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  pendingUnit: { fontSize: 12, color: COLORS.gray },
  pendingActions: { flexDirection: 'row', gap: 8 },
  approveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButtonText: { fontSize: 20, color: COLORS.white },
  rejectButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.danger + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButtonText: { fontSize: 20, color: COLORS.danger },
  approveAllButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  approveAllButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
  
  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.white },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  modalCancel: { fontSize: 16, color: COLORS.gray },
  modalTitle: { fontSize: 17, fontWeight: '600', color: COLORS.navy },
  modalSave: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  modalContent: { flex: 1, padding: 16 },
  modalSubtitle: { fontSize: 14, color: COLORS.gray, marginBottom: 16 },
  
  // Deactivation Reasons
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    marginBottom: 8,
  },
  reasonOptionSelected: {
    backgroundColor: COLORS.danger + '10',
    borderColor: COLORS.danger,
  },
  reasonIcon: { fontSize: 20, marginRight: 12 },
  reasonLabel: { flex: 1, fontSize: 15, color: COLORS.navy },
  reasonLabelSelected: { color: COLORS.danger, fontWeight: '500' },
  reasonCheck: { fontSize: 18, color: COLORS.danger },
  customReasonInput: {
    backgroundColor: COLORS.grayLighter,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: COLORS.navy,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  
  // Edit Modal
  editMemberHeader: { alignItems: 'center', marginBottom: 24 },
  editMemberAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  editMemberAvatarText: { fontSize: 28, fontWeight: '600', color: COLORS.primary },
  editMemberName: { fontSize: 18, fontWeight: '600', color: COLORS.navy },
  editMemberEmail: { fontSize: 14, color: COLORS.gray, marginTop: 2 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.navy, marginBottom: 8, marginTop: 16 },
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
  roleSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleSelectorItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    backgroundColor: COLORS.white,
  },
  roleSelectorText: { fontSize: 12, color: COLORS.gray },
  
  // Location Picker
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    marginBottom: 8,
  },
  locationOptionSelected: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary,
  },
  locationIcon: { fontSize: 24, marginRight: 12 },
  locationInfo: { flex: 1 },
  locationName: { fontSize: 15, fontWeight: '600', color: COLORS.navy },
  locationAddress: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  locationCheck: { fontSize: 18, color: COLORS.primary },
});