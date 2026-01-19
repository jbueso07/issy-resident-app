// app/admin/community-management.js
// ISSY Resident App - Admin: Gestión de Miembros de Comunidad (ProHome Dark Theme)
// UPDATED: Added public code and unit nomenclature management

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
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';

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

const getRolesConfig = (t) => ({
  resident: { label: t('admin.communityManagement.roles.resident'), color: COLORS.success, bg: COLORS.success + '20' },
  host: { label: t('admin.communityManagement.roles.host'), color: COLORS.teal, bg: COLORS.teal + '20' },
  tenant: { label: t('admin.communityManagement.roles.tenant'), color: COLORS.pink, bg: COLORS.pink + '20' },
  admin: { label: t('admin.communityManagement.roles.admin'), color: COLORS.purple, bg: COLORS.purple + '20' },
  owner: { label: t('admin.communityManagement.roles.owner'), color: COLORS.lime, bg: COLORS.lime + '20' },
  guard: { label: t('admin.communityManagement.roles.guard'), color: COLORS.warning, bg: COLORS.warning + '20' },
});

const getDeactivationReasons = (t) => [
  { id: 'moved', label: t('admin.communityManagement.deactivationReasons.moved'), icon: '🏠' },
  { id: 'payment', label: t('admin.communityManagement.deactivationReasons.payment'), icon: '💳' },
  { id: 'violation', label: t('admin.communityManagement.deactivationReasons.violation'), icon: '⚠️' },
  { id: 'temporary', label: t('admin.communityManagement.deactivationReasons.temporary'), icon: '✈️' },
  { id: 'request', label: t('admin.communityManagement.deactivationReasons.request'), icon: '📝' },
  { id: 'duplicate', label: t('admin.communityManagement.deactivationReasons.duplicate'), icon: '👥' },
  { id: 'other', label: t('admin.communityManagement.deactivationReasons.other'), icon: '📋' },
];

// Nomenclature field definitions
const NOMENCLATURE_FIELDS = [
  { key: 'casa', label: 'Casa #', icon: 'home', forType: 'house' },
  { key: 'bloque', label: 'Bloque #', icon: 'grid', forType: 'house' },
  { key: 'avenida', label: 'Avenida #', icon: 'map', forType: 'house' },
  { key: 'etapa', label: 'Etapa #', icon: 'layers', forType: 'house' },
  { key: 'torre', label: 'Torre #', icon: 'business', forType: 'apartment' },
  { key: 'nivel', label: 'Nivel / Piso #', icon: 'layers', forType: 'apartment' },
  { key: 'apartamento', label: 'Apartamento #', icon: 'home', forType: 'apartment' },
];

export default function CommunityManagement() {
  const { t } = useTranslation();
  const { user, profile, isSuperAdmin } = useAuth();
  const router = useRouter();
  
  // i18n configs
  const ROLES = getRolesConfig(t);
  const DEACTIVATION_REASONS = getDeactivationReasons(t);
  
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
  
  // Public Code & Nomenclature state
  const [publicCodeData, setPublicCodeData] = useState(null);
  const [nomenclature, setNomenclature] = useState({});
  const [nomenclatureType, setNomenclatureType] = useState('apartment'); // 'apartment' or 'house'
  const [showNomenclatureModal, setShowNomenclatureModal] = useState(false);
  const [savingNomenclature, setSavingNomenclature] = useState(false);
  
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
  console.log('🔍 DEBUG community-management:', { profileRole: profile?.role, userRole: user?.role, computedRole: userRole, isSuperAdminFn: isSuperAdmin?.() });
  const userLocationId = profile?.location_id || user?.location_id;
  const isAdmin = ['admin', 'superadmin'].includes(userRole);
  const isSuperAdminUser = userRole === 'superadmin' || isSuperAdmin?.();

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert(t('admin.communityManagement.accessDenied'), t('admin.communityManagement.noPermissions'));
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
      fetchPublicCode();
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
    console.log('🌍 fetchLocations called');
    console.log('📍 Token:', await AsyncStorage.getItem('token') ? 'EXISTS' : 'MISSING');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/locations`, { headers });
      const data = await res.json();
      console.log('📍 Locations response - count:', data.data?.length || 0, 'items');
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

  const fetchPublicCode = async () => {
    if (!selectedLocationId) return;
    
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${API_URL}/invitations/organization/${selectedLocationId}/public-code`,
        { headers }
      );
      const data = await res.json();
      console.log('📍 Locations response - count:', data.data?.length || 0, 'items');
      if (data.success) {
        setPublicCodeData(data.data);
        setNomenclature(data.data.unit_nomenclature || {});
        // Determine type based on existing nomenclature
        if (data.data.unit_nomenclature?.type) {
          setNomenclatureType(data.data.unit_nomenclature.type);
        }
      }
    } catch (error) {
      console.error('Error fetching public code:', error);
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
      Alert.alert(t('common.error'), t('admin.communityManagement.errors.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
    fetchPublicCode();
  }, [selectedLocationId]);

  // PUBLIC CODE ACTIONS
  const copyPublicCode = async () => {
    if (publicCodeData?.public_code) {
      await Clipboard.setStringAsync(publicCodeData.public_code);
      Alert.alert('✅ Código copiado', `El código ${publicCodeData.public_code} ha sido copiado al portapapeles.`);
    }
  };

  const sharePublicCode = async () => {
    if (!publicCodeData) return;
    
    try {
      await Share.share({
        message: `¡Únete a nuestra comunidad ${publicCodeData.location_name} en ISSY!\n\nCódigo: ${publicCodeData.public_code}\n\nO usa este enlace: ${publicCodeData.join_link}`,
        title: 'Invitación a la comunidad',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // NOMENCLATURE ACTIONS
  const toggleNomenclatureField = (key) => {
    setNomenclature(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: !prev[key]?.enabled,
        required: prev[key]?.enabled ? false : prev[key]?.required || false,
      }
    }));
  };

  const toggleNomenclatureRequired = (key) => {
    if (!nomenclature[key]?.enabled) return;
    setNomenclature(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        required: !prev[key]?.required,
      }
    }));
  };

  const saveNomenclature = async () => {
    setSavingNomenclature(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${API_URL}/invitations/organization/${selectedLocationId}/nomenclature`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({ 
            unit_nomenclature: {
              ...nomenclature,
              type: nomenclatureType
            }
          }),
        }
      );
      const data = await res.json();
      console.log('📍 Locations response - count:', data.data?.length || 0, 'items');
      if (data.success) {
        Alert.alert('✅ Guardado', 'La nomenclatura ha sido actualizada.');
        setShowNomenclatureModal(false);
        fetchPublicCode();
      } else {
        Alert.alert(t('common.error'), data.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving nomenclature:', error);
      Alert.alert(t('common.error'), 'Error al guardar la nomenclatura');
    } finally {
      setSavingNomenclature(false);
    }
  };

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
    const unit = member.unit_number || t('admin.communityManagement.unassigned');
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
      console.log('📍 Locations response - count:', data.data?.length || 0, 'items');
      if (data.success) {
        Alert.alert(t('common.success'), isActive ? t('admin.communityManagement.success.activated') : t('admin.communityManagement.success.deactivated'));
        fetchData();
      } else {
        Alert.alert(t('common.error'), data.error || t('admin.communityManagement.errors.updateFailed'));
      }
    } catch (error) {
      console.error('Error updating member:', error);
      Alert.alert(t('common.error'), t('admin.communityManagement.errors.updateFailed'));
    } finally {
      setActionLoading(false);
      setShowDeactivateModal(false);
      setSelectedMember(null);
    }
  };

  const confirmDeactivation = () => {
    if (!deactivationReason) {
      Alert.alert(t('common.error'), t('admin.communityManagement.errors.selectReason'));
      return;
    }
    
    const reason = deactivationReason === 'other' ? customReason : 
      DEACTIVATION_REASONS.find(r => r.id === deactivationReason)?.label;
    
    if (deactivationReason === 'other' && !customReason.trim()) {
      Alert.alert(t('common.error'), t('admin.communityManagement.errors.writeReason'));
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
      console.log('📍 Locations response - count:', data.data?.length || 0, 'items');
      if (data.success) {
        Alert.alert(t('common.success'), t('admin.communityManagement.success.updated'));
        fetchData();
      } else {
        Alert.alert(t('common.error'), data.error || t('admin.communityManagement.errors.updateFailed'));
      }
    } catch (error) {
      console.error('Error updating member:', error);
      Alert.alert(t('common.error'), t('admin.communityManagement.errors.updateFailed'));
    } finally {
      setActionLoading(false);
      setShowEditModal(false);
      setSelectedMember(null);
    }
  };
// DELETE MEMBER FROM LOCATION
  const handleDeleteMember = async () => {
    if (!selectedMember) return;
    
    Alert.alert(
      'Eliminar Usuario',
      `¿Estás seguro de eliminar a ${selectedMember.user?.name || 'este usuario'} de la comunidad? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const headers = await getAuthHeaders();
              const res = await fetch(
                `${API_URL}/invitations/organization/members/${selectedMember.id}`,
                { method: 'DELETE', headers }
              );
              const data = await res.json();
              if (data.success) {
                Alert.alert('Éxito', data.message || 'Usuario eliminado de la comunidad');
                fetchData();
              } else {
                Alert.alert('Error', data.error || 'No se pudo eliminar el usuario');
              }
            } catch (error) {
              console.error('Error deleting member:', error);
              Alert.alert('Error', 'No se pudo eliminar el usuario');
            } finally {
              setActionLoading(false);
              setShowEditModal(false);
              setSelectedMember(null);
            }
          }
        }
      ]
    );
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
      console.log('📍 Locations response - count:', data.data?.length || 0, 'items');
      if (data.success) {
        Alert.alert(t('common.success'), t('admin.communityManagement.success.approved'));
        fetchData();
      } else {
        Alert.alert(t('common.error'), data.error || t('admin.communityManagement.errors.approveFailed'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('admin.communityManagement.errors.approveFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectMember = async (membershipId) => {
    Alert.alert(
      t('admin.communityManagement.rejectRequest'),
      t('admin.communityManagement.rejectConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.communityManagement.reject'),
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
      console.log('📍 Locations response - count:', data.data?.length || 0, 'items');
              if (data.success) {
                Alert.alert(t('common.success'), t('admin.communityManagement.success.rejected'));
                fetchData();
              }
            } catch (error) {
              Alert.alert(t('common.error'), t('admin.communityManagement.errors.rejectFailed'));
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
      t('admin.communityManagement.approveAll'),
      t('admin.communityManagement.approveAllConfirm', { count: pendingMembers.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.communityManagement.approveAll'),
          onPress: async () => {
            setActionLoading(true);
            try {
              const headers = await getAuthHeaders();
              const res = await fetch(
                `${API_URL}/invitations/organization/${selectedLocationId}/approve-all`,
                { method: 'POST', headers }
              );
              const data = await res.json();
      console.log('📍 Locations response - count:', data.data?.length || 0, 'items');
              if (data.success) {
                Alert.alert(t('common.success'), t('admin.communityManagement.success.approvedCount', { count: data.count }));
                fetchData();
              }
            } catch (error) {
              Alert.alert(t('common.error'), t('admin.communityManagement.errors.approveFailed'));
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

  // Get enabled nomenclature fields for display
  const getEnabledFields = () => {
    return NOMENCLATURE_FIELDS.filter(f => nomenclature[f.key]?.enabled);
  };

  // RENDER: INVITE TAB CONTENT
  const renderInviteTab = () => (
    <View style={styles.inviteContainer}>
      {/* Public Code Card */}
      <View style={styles.publicCodeCard}>
        <View style={styles.publicCodeHeader}>
          <Ionicons name="qr-code" size={24} color={COLORS.lime} />
          <Text style={styles.publicCodeTitle}>Código de Comunidad</Text>
        </View>
        
        <Text style={styles.publicCodeDescription}>
          Comparte este código con los residentes para que se unan a la comunidad.
        </Text>
        
        <View style={styles.codeDisplayContainer}>
          <Text style={styles.codeDisplay}>
            {publicCodeData?.public_code || '------'}
          </Text>
        </View>
        
        <View style={styles.codeActions}>
          <TouchableOpacity style={styles.codeActionButton} onPress={copyPublicCode}>
            <Ionicons name="copy-outline" size={20} color={COLORS.lime} />
            <Text style={styles.codeActionText}>Copiar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.codeActionButton} onPress={sharePublicCode}>
            <Ionicons name="share-outline" size={20} color={COLORS.teal} />
            <Text style={[styles.codeActionText, { color: COLORS.teal }]}>Compartir</Text>
          </TouchableOpacity>
        </View>
        
        {publicCodeData?.join_link && (
          <View style={styles.linkContainer}>
            <Text style={styles.linkLabel}>Enlace de invitación:</Text>
            <Text style={styles.linkText} numberOfLines={1}>
              {publicCodeData.join_link}
            </Text>
          </View>
        )}
      </View>

      {/* Nomenclature Card */}
      <View style={styles.nomenclatureCard}>
        <View style={styles.nomenclatureHeader}>
          <View style={styles.nomenclatureHeaderLeft}>
            <Ionicons name="list" size={24} color={COLORS.teal} />
            <Text style={styles.nomenclatureTitle}>Nomenclatura de Unidades</Text>
          </View>
          <TouchableOpacity 
            style={styles.editNomenclatureButton}
            onPress={() => setShowNomenclatureModal(true)}
          >
            <Ionicons name="pencil" size={16} color={COLORS.lime} />
            <Text style={styles.editNomenclatureText}>Editar</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.nomenclatureDescription}>
          Define qué campos deben completar los residentes al unirse (torre, apartamento, casa, etc.)
        </Text>
        
        {/* Current Config Summary */}
        <View style={styles.nomenclatureSummary}>
          <Text style={styles.summaryLabel}>Tipo de propiedad:</Text>
          <View style={styles.typeIndicator}>
            <Ionicons 
              name={nomenclatureType === 'apartment' ? 'business' : 'home'} 
              size={16} 
              color={COLORS.teal} 
            />
            <Text style={styles.typeText}>
              {nomenclatureType === 'apartment' ? 'Apartamentos' : 'Casas'}
            </Text>
          </View>
        </View>
        
        {getEnabledFields().length > 0 ? (
          <View style={styles.enabledFieldsList}>
            <Text style={styles.enabledFieldsLabel}>Campos habilitados:</Text>
            {getEnabledFields().map(field => (
              <View key={field.key} style={styles.enabledFieldItem}>
                <Ionicons name={field.icon} size={14} color={COLORS.textSecondary} />
                <Text style={styles.enabledFieldText}>{field.label}</Text>
                {nomenclature[field.key]?.required && (
                  <Text style={styles.requiredBadge}>Requerido</Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noFieldsText}>
            No hay campos configurados. Toca "Editar" para configurar.
          </Text>
        )}
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color={COLORS.teal} />
        <Text style={styles.infoText}>
          Todos los nuevos miembros requieren aprobación de un administrador antes de acceder a la comunidad.
        </Text>
      </View>
    </View>
  );

  // RENDER
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
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
          <Text style={styles.headerTitle}>{t('admin.communityManagement.title')}</Text>
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
            <Text style={styles.statLabel}>{t('admin.communityManagement.stats.active')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.warning }]}>
              {pendingMembers.length}
            </Text>
            <Text style={styles.statLabel}>{t('admin.communityManagement.stats.pending')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.textMuted }]}>
              {stats.members?.inactive || 0}
            </Text>
            <Text style={styles.statLabel}>{t('admin.communityManagement.stats.inactive')}</Text>
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
            {t('admin.communityManagement.tabs.members')}
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
            {t('admin.communityManagement.tabs.pending')} {pendingMembers.length > 0 && `(${pendingMembers.length})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invite' && styles.tabActive]}
          onPress={() => setActiveTab('invite')}
        >
          <Ionicons 
            name="link" 
            size={16} 
            color={activeTab === 'invite' ? COLORS.lime : COLORS.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'invite' && styles.tabTextActive]}>
            Invitar
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
              placeholder={t('admin.communityManagement.searchPlaceholder')}
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
                  {f === 'all' ? t('admin.communityManagement.filters.all') : f === 'active' ? t('admin.communityManagement.filters.active') : t('admin.communityManagement.filters.inactive')}
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
              <Text style={styles.emptyTitle}>{t('admin.communityManagement.empty.noMembers')}</Text>
              <Text style={styles.emptySubtitle}>{t('admin.communityManagement.empty.membersWillAppear')}</Text>
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
                      {unitMembers.length} {unitMembers.length !== 1 ? t('admin.communityManagement.members') : t('admin.communityManagement.member')}
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
                              {member.user?.name || t('admin.communityManagement.noName')}
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
        ) : activeTab === 'pending' ? (
          <>
            {pendingMembers.length > 0 && (
              <TouchableOpacity
                style={styles.approveAllButton}
                onPress={handleApproveAll}
              >
                <Ionicons name="checkmark-done" size={20} color={COLORS.background} />
                <Text style={styles.approveAllButtonText}>{t('admin.communityManagement.approveAll')}</Text>
              </TouchableOpacity>
            )}
            
            {pendingMembers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle-outline" size={60} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>{t('admin.communityManagement.empty.noPending')}</Text>
                <Text style={styles.emptySubtitle}>{t('admin.communityManagement.empty.noPendingRequests')}</Text>
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
                        {member.user?.name || t('admin.communityManagement.noName')}
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
                      disabled={actionLoading}
                    >
                      <Ionicons name="checkmark" size={22} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleRejectMember(member.id)}
                      disabled={actionLoading}
                    >
                      <Ionicons name="close" size={22} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          renderInviteTab()
        )}
      </ScrollView>

      {/* Deactivation Modal */}
      <Modal visible={showDeactivateModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDeactivateModal(false)}>
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('admin.communityManagement.deactivateMember')}</Text>
            <TouchableOpacity onPress={confirmDeactivation} disabled={actionLoading}>
              {actionLoading ? (
                <ActivityIndicator size="small" color={COLORS.danger} />
              ) : (
                <Text style={[styles.modalSave, { color: COLORS.danger }]}>{t('admin.communityManagement.deactivate')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalSubtitle}>
              {t('admin.communityManagement.selectDeactivationReason', { name: selectedMember?.user?.name })}
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
                placeholder={t('admin.communityManagement.writeCustomReason')}
                value={customReason}
                onChangeText={setCustomReason}
                placeholderTextColor={COLORS.textMuted}
                multiline
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Member Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('admin.communityManagement.editMember')}</Text>
            <TouchableOpacity onPress={saveEditMember} disabled={actionLoading}>
              {actionLoading ? (
                <ActivityIndicator size="small" color={COLORS.lime} />
              ) : (
                <Text style={styles.modalSave}>{t('common.save')}</Text>
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
              <Text style={styles.editMemberName}>{selectedMember?.user?.name}</Text>
              <Text style={styles.editMemberEmail}>{selectedMember?.user?.email}</Text>
            </View>

            <Text style={styles.inputLabel}>{t('admin.communityManagement.unitNumber')}</Text>
            <TextInput
              style={styles.input}
              value={editForm.unit_number}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, unit_number: text }))}
              placeholder={t('admin.communityManagement.enterUnit')}
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.inputLabel}>{t('admin.communityManagement.role')}</Text>
            <View style={styles.roleSelector}>
              {Object.entries(ROLES).map(([key, config]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.roleSelectorItem,
                    editForm.role === key && { backgroundColor: config.bg, borderColor: config.color }
                  ]}
                  onPress={() => setEditForm(prev => ({ ...prev, role: key }))}
                >
                  <Text style={[
                    styles.roleSelectorText,
                    editForm.role === key && { color: config.color, fontWeight: '600' }
                  ]}>
                    {config.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Delete Button */}
            <TouchableOpacity
              style={{
                marginTop: 32,
                marginBottom: 20,
                padding: 16,
                borderRadius: 12,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 1,
                borderColor: '#EF4444',
                alignItems: 'center',
              }}
              onPress={handleDeleteMember}
              disabled={actionLoading}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 16 }}>
                  Eliminar de la comunidad
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      {/* Nomenclature Modal */}
      <Modal visible={showNomenclatureModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNomenclatureModal(false)}>
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Configurar Nomenclatura</Text>
            <TouchableOpacity onPress={saveNomenclature} disabled={savingNomenclature}>
              {savingNomenclature ? (
                <ActivityIndicator size="small" color={COLORS.lime} />
              ) : (
                <Text style={styles.modalSave}>{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.nomenclatureModalDescription}>
              Selecciona los campos que los residentes deberán completar al unirse a la comunidad.
            </Text>

            {/* Property Type Selector */}
            <Text style={styles.inputLabel}>Tipo de Propiedad</Text>
            <View style={styles.propertyTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.propertyTypeOption,
                  nomenclatureType === 'apartment' && styles.propertyTypeOptionActive
                ]}
                onPress={() => setNomenclatureType('apartment')}
              >
                <Ionicons 
                  name="business" 
                  size={24} 
                  color={nomenclatureType === 'apartment' ? COLORS.lime : COLORS.textSecondary} 
                />
                <Text style={[
                  styles.propertyTypeText,
                  nomenclatureType === 'apartment' && styles.propertyTypeTextActive
                ]}>
                  Apartamentos
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.propertyTypeOption,
                  nomenclatureType === 'house' && styles.propertyTypeOptionActive
                ]}
                onPress={() => setNomenclatureType('house')}
              >
                <Ionicons 
                  name="home" 
                  size={24} 
                  color={nomenclatureType === 'house' ? COLORS.lime : COLORS.textSecondary} 
                />
                <Text style={[
                  styles.propertyTypeText,
                  nomenclatureType === 'house' && styles.propertyTypeTextActive
                ]}>
                  Casas
                </Text>
              </TouchableOpacity>
            </View>

            {/* Fields */}
            <Text style={[styles.inputLabel, { marginTop: scale(20) }]}>
              Campos para {nomenclatureType === 'apartment' ? 'Apartamentos' : 'Casas'}
            </Text>
            
            {NOMENCLATURE_FIELDS
              .filter(f => f.forType === nomenclatureType || f.forType === 'both')
              .map(field => (
                <View key={field.key} style={styles.nomenclatureFieldRow}>
                  <View style={styles.nomenclatureFieldLeft}>
                    <Ionicons name={field.icon} size={20} color={COLORS.textSecondary} />
                    <Text style={styles.nomenclatureFieldLabel}>{field.label}</Text>
                  </View>
                  <View style={styles.nomenclatureFieldRight}>
                    <TouchableOpacity
                      style={[
                        styles.fieldToggle,
                        nomenclature[field.key]?.required && styles.fieldToggleActive
                      ]}
                      onPress={() => toggleNomenclatureRequired(field.key)}
                      disabled={!nomenclature[field.key]?.enabled}
                    >
                      <Text style={[
                        styles.fieldToggleText,
                        nomenclature[field.key]?.required && styles.fieldToggleTextActive
                      ]}>
                        Req
                      </Text>
                    </TouchableOpacity>
                    <Switch
                      value={nomenclature[field.key]?.enabled || false}
                      onValueChange={() => toggleNomenclatureField(field.key)}
                      trackColor={{ false: COLORS.backgroundTertiary, true: COLORS.lime + '50' }}
                      thumbColor={nomenclature[field.key]?.enabled ? COLORS.lime : COLORS.textMuted}
                    />
                  </View>
                </View>
              ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Location Picker Modal (for superadmin) */}
      {isSuperAdminUser && (
        <Modal visible={showLocationPicker} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t('admin.communityManagement.selectCommunity')}</Text>
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
                    <Ionicons name="business" size={22} color={COLORS.teal} />
                  </View>
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationName}>{location.name}</Text>
                    <Text style={styles.locationAddress}>{location.address}, {location.city}</Text>
                  </View>
                  {selectedLocationId === location.id && (
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.lime} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  backButton: {
    padding: scale(8),
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
    color: COLORS.lime,
    marginTop: scale(2),
  },
  refreshButton: {
    padding: scale(8),
  },
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    marginBottom: scale(16),
    gap: scale(10),
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(14),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: scale(24),
    fontWeight: '700',
  },
  statLabel: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
    marginTop: scale(4),
  },
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    marginBottom: scale(12),
    gap: scale(8),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingVertical: scale(10),
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
    marginBottom: scale(12),
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: scale(12),
    paddingLeft: scale(8),
    fontSize: scale(15),
    color: COLORS.textPrimary,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: scale(8),
  },
  filterButton: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(14),
    borderRadius: scale(8),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.teal + '20',
    borderColor: COLORS.teal,
  },
  filterText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.teal,
    fontWeight: '600',
  },
  
  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(30),
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(60),
  },
  emptyTitle: {
    fontSize: scale(17),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: scale(16),
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(8),
    textAlign: 'center',
  },
  
  // Unit Groups
  unitGroup: {
    marginBottom: scale(12),
  },
  unitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundSecondary,
    padding: scale(14),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  unitIconContainer: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
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
    marginTop: scale(8),
    paddingLeft: scale(12),
  },
  
  // Member Card
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundTertiary,
    padding: scale(12),
    borderRadius: scale(10),
    marginBottom: scale(6),
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(21),
    backgroundColor: COLORS.teal + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  memberAvatarInactive: {
    backgroundColor: COLORS.textMuted + '30',
  },
  memberAvatarText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.teal,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  memberNameInactive: {
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  memberEmail: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  deactivationReason: {
    fontSize: scale(11),
    color: COLORS.warning,
    marginTop: scale(4),
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  editButton: {
    padding: scale(8),
  },
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
  
  // Invite Tab
  inviteContainer: {
    paddingTop: scale(4),
  },
  publicCodeCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(16),
    padding: scale(20),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.lime + '30',
  },
  publicCodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: scale(12),
  },
  publicCodeTitle: {
    fontSize: scale(17),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  publicCodeDescription: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginBottom: scale(20),
    lineHeight: scale(20),
  },
  codeDisplayContainer: {
    backgroundColor: COLORS.background,
    borderRadius: scale(12),
    padding: scale(20),
    alignItems: 'center',
    marginBottom: scale(16),
    borderWidth: 2,
    borderColor: COLORS.lime,
    borderStyle: 'dashed',
  },
  codeDisplay: {
    fontSize: scale(32),
    fontWeight: '800',
    color: COLORS.lime,
    letterSpacing: scale(6),
  },
  codeActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(20),
    marginBottom: scale(16),
  },
  codeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
    borderRadius: scale(10),
    backgroundColor: COLORS.backgroundTertiary,
  },
  codeActionText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.lime,
  },
  linkContainer: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(10),
    padding: scale(12),
  },
  linkLabel: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
    marginBottom: scale(4),
  },
  linkText: {
    fontSize: scale(13),
    color: COLORS.teal,
  },
  
  nomenclatureCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(16),
    padding: scale(20),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.teal + '30',
  },
  nomenclatureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(12),
  },
  nomenclatureHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  nomenclatureTitle: {
    fontSize: scale(17),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  editNomenclatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingVertical: scale(6),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
    backgroundColor: COLORS.lime + '20',
  },
  editNomenclatureText: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.lime,
  },
  nomenclatureDescription: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginBottom: scale(16),
    lineHeight: scale(20),
  },
  nomenclatureSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: scale(12),
  },
  summaryLabel: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: COLORS.teal + '20',
    paddingVertical: scale(4),
    paddingHorizontal: scale(10),
    borderRadius: scale(6),
  },
  typeText: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.teal,
  },
  enabledFieldsList: {
    marginTop: scale(8),
  },
  enabledFieldsLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginBottom: scale(8),
  },
  enabledFieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingVertical: scale(6),
  },
  enabledFieldText: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
    flex: 1,
  },
  requiredBadge: {
    fontSize: scale(10),
    color: COLORS.warning,
    fontWeight: '600',
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(4),
  },
  noFieldsText: {
    fontSize: scale(13),
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(10),
    backgroundColor: COLORS.teal + '15',
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(16),
  },
  infoText: {
    flex: 1,
    fontSize: scale(13),
    color: COLORS.textSecondary,
    lineHeight: scale(18),
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
  
  // Nomenclature Modal
  nomenclatureModalDescription: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginBottom: scale(20),
    lineHeight: scale(20),
  },
  propertyTypeSelector: {
    flexDirection: 'row',
    gap: scale(12),
    marginBottom: scale(20),
  },
  propertyTypeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(20),
    borderRadius: scale(12),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(8),
  },
  propertyTypeOptionActive: {
    backgroundColor: COLORS.lime + '15',
    borderColor: COLORS.lime,
  },
  propertyTypeText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  propertyTypeTextActive: {
    color: COLORS.lime,
    fontWeight: '600',
  },
  nomenclatureFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  nomenclatureFieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  nomenclatureFieldLabel: {
    fontSize: scale(15),
    color: COLORS.textPrimary,
  },
  nomenclatureFieldRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  fieldToggle: {
    paddingVertical: scale(4),
    paddingHorizontal: scale(10),
    borderRadius: scale(6),
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fieldToggleActive: {
    backgroundColor: COLORS.warning + '20',
    borderColor: COLORS.warning,
  },
  fieldToggleText: {
    fontSize: scale(11),
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  fieldToggleTextActive: {
    color: COLORS.warning,
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