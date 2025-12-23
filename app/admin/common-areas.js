// app/admin/common-areas.js
// ISSY Resident App - Admin: Gestión de Áreas Comunes

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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.joinissy.com';

const COLORS = {
  primary: '#14B8A6',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  navy: '#1A1A2E',
  black: '#000000',
  white: '#FFFFFF',
  background: '#F3F4F6',
  gray: '#6B7280',
  grayLight: '#E5E7EB',
  grayLighter: '#F9FAFB',
};

const AREA_TYPES = [
  { value: 'pool', label: '🏊 Piscina' },
  { value: 'gym', label: '🏋️ Gimnasio' },
  { value: 'salon', label: '🎉 Salón de eventos' },
  { value: 'bbq', label: '🍖 Área de BBQ' },
  { value: 'playground', label: '🛝 Área de juegos' },
  { value: 'sports', label: '⚽ Cancha deportiva' },
  { value: 'terrace', label: '🌇 Terraza' },
  { value: 'meeting', label: '💼 Sala de reuniones' },
  { value: 'general', label: '📍 General' },
];

export default function AdminCommonAreas() {
  const { user, profile } = useAuth();
  const router = useRouter();
  
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [blockingArea, setBlockingArea] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'general',
    capacity: '',
    hourly_rate: '0',
    rules: '',
    requires_approval: false,
    advance_booking_days: '30',
    min_duration_hours: '1',
    max_duration_hours: '4',
    available_from: '06:00',
    available_until: '22:00',
    is_24_hours: false,
    image_url: '',
  });
  
  const [blockData, setBlockData] = useState({
    block_reason: '',
    blocked_until: '',
  });

  const userRole = profile?.role || user?.role || 'user';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Acceso Denegado', 'No tienes permisos para acceder a esta sección');
      router.back();
      return;
    }
    fetchAreas();
  }, []);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchAreas = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/common-areas`, { headers });
      const data = await response.json();
      
      if (data.data) {
        setAreas(Array.isArray(data.data) ? data.data : []);
      } else if (Array.isArray(data)) {
        setAreas(data);
      } else {
        setAreas([]);
      }
    } catch (error) {
      console.error('Error fetching areas:', error);
      Alert.alert('Error', 'No se pudieron cargar las áreas comunes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAreas();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'general',
      capacity: '',
      hourly_rate: '0',
      rules: '',
      requires_approval: false,
      advance_booking_days: '30',
      min_duration_hours: '1',
      max_duration_hours: '4',
      available_from: '06:00',
      available_until: '22:00',
      is_24_hours: false,
      image_url: '',
    });
  };

  const handleCreate = () => {
    setEditingArea(null);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (area) => {
    setEditingArea(area);
    setFormData({
      name: area.name || '',
      description: area.description || '',
      type: area.type || 'general',
      capacity: area.capacity?.toString() || '',
      hourly_rate: area.hourly_rate?.toString() || '0',
      rules: area.rules || '',
      requires_approval: area.requires_approval || false,
      advance_booking_days: area.advance_booking_days?.toString() || '30',
      min_duration_hours: area.min_duration_hours?.toString() || '1',
      max_duration_hours: area.max_duration_hours?.toString() || '4',
      available_from: area.available_from?.slice(0, 5) || '06:00',
      available_until: area.available_until?.slice(0, 5) || '22:00',
      is_24_hours: area.is_24_hours || false,
      image_url: area.image_url || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const url = editingArea 
        ? `${API_URL}/api/common-areas/${editingArea.id}`
        : `${API_URL}/api/common-areas`;
      
      const bodyData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        hourly_rate: parseFloat(formData.hourly_rate) || 0,
        rules: formData.rules,
        requires_approval: formData.requires_approval,
        advance_booking_days: parseInt(formData.advance_booking_days) || 30,
        min_duration_hours: parseFloat(formData.min_duration_hours) || 1,
        max_duration_hours: parseFloat(formData.max_duration_hours) || 4,
        available_from: formData.available_from + ':00',
        available_until: formData.available_until + ':00',
        is_24_hours: formData.is_24_hours,
        image_url: formData.image_url || null,
        location_id: profile?.location_id,
      };

      const response = await fetch(url, {
        method: editingArea ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(bodyData),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Éxito', editingArea ? 'Área actualizada' : 'Área creada');
        setShowModal(false);
        fetchAreas();
      } else {
        Alert.alert('Error', data.error || 'No se pudo guardar');
      }
    } catch (error) {
      console.error('Error saving area:', error);
      Alert.alert('Error', 'No se pudo guardar el área');
    } finally {
      setSaving(false);
    }
  };

  const handleBlock = (area) => {
    setBlockingArea(area);
    setBlockData({
      block_reason: area.block_reason || '',
      blocked_until: '',
    });
    setShowBlockModal(true);
  };

  const handleBlockSubmit = async () => {
    if (!blockingArea) return;
    
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const isBlocking = !blockingArea.is_blocked;
      
      const response = await fetch(
        `${API_URL}/api/common-areas/${blockingArea.id}/block`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            is_blocked: isBlocking,
            block_reason: isBlocking ? blockData.block_reason : null,
            blocked_until: isBlocking && blockData.blocked_until ? blockData.blocked_until : null,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Éxito', isBlocking ? 'Área bloqueada' : 'Área desbloqueada');
        setShowBlockModal(false);
        fetchAreas();
      } else {
        Alert.alert('Error', data.error || 'No se pudo actualizar');
      }
    } catch (error) {
      console.error('Error blocking area:', error);
      Alert.alert('Error', 'No se pudo actualizar el área');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (area) => {
    Alert.alert(
      'Eliminar Área',
      `¿Estás seguro de eliminar "${area.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(
                `${API_URL}/api/common-areas/${area.id}`,
                { method: 'DELETE', headers }
              );

              if (response.ok) {
                Alert.alert('Éxito', 'Área eliminada');
                fetchAreas();
              } else {
                const data = await response.json();
                Alert.alert('Error', data.error || 'No se pudo eliminar');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el área');
            }
          }
        },
      ]
    );
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      // TODO: Upload image to storage and get URL
      // For now, just show a message
      Alert.alert('Próximamente', 'La subida de imágenes estará disponible pronto');
    }
  };

  const getTypeLabel = (type) => {
    const found = AREA_TYPES.find(t => t.value === type);
    return found ? found.label : '📍 General';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando áreas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.navy} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Áreas Comunes</Text>
          <Text style={styles.headerSubtitle}>{areas.length} áreas</Text>
        </View>
        <TouchableOpacity onPress={handleCreate} style={styles.addButton}>
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>Nueva</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {areas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏊</Text>
            <Text style={styles.emptyTitle}>No hay áreas comunes</Text>
            <Text style={styles.emptySubtitle}>
              Crea tu primera área común para que los residentes puedan reservar
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleCreate}>
              <Text style={styles.emptyButtonText}>Crear Área</Text>
            </TouchableOpacity>
          </View>
        ) : (
          areas.map((area) => (
            <View key={area.id} style={[
              styles.areaCard,
              !area.is_active && styles.areaCardInactive
            ]}>
              {/* Image */}
              {area.image_url && (
                <Image source={{ uri: area.image_url }} style={styles.areaImage} />
              )}
              
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.areaType}>{getTypeLabel(area.type)}</Text>
                    {!area.is_active && (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveBadgeText}>Inactiva</Text>
                      </View>
                    )}
                    {area.is_blocked && (
                      <View style={styles.blockedBadge}>
                        <Text style={styles.blockedBadgeText}>🔒 Bloqueada</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.areaName}>{area.name}</Text>
                </View>
                
                {area.is_blocked && area.block_reason && (
                  <View style={styles.blockReasonContainer}>
                    <Ionicons name="information-circle" size={16} color={COLORS.warning} />
                    <Text style={styles.blockReasonText}>{area.block_reason}</Text>
                  </View>
                )}
                
                {area.description && (
                  <Text style={styles.areaDescription} numberOfLines={2}>
                    {area.description}
                  </Text>
                )}
                
                <View style={styles.areaInfo}>
                  {area.capacity && (
                    <View style={styles.infoItem}>
                      <Ionicons name="people-outline" size={14} color={COLORS.gray} />
                      <Text style={styles.infoText}>{area.capacity} personas</Text>
                    </View>
                  )}
                  <View style={styles.infoItem}>
                    <Ionicons name="time-outline" size={14} color={COLORS.gray} />
                    <Text style={styles.infoText}>Máx. {area.max_duration_hours || 4}h</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="calendar-outline" size={14} color={COLORS.gray} />
                    <Text style={styles.infoText}>{area.advance_booking_days || 30} días</Text>
                  </View>
                  {area.hourly_rate > 0 && (
                    <View style={styles.infoItem}>
                      <Ionicons name="cash-outline" size={14} color={COLORS.gray} />
                      <Text style={styles.infoText}>L{area.hourly_rate}/h</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.areaSchedule}>
                  <Ionicons name="sunny-outline" size={14} color={COLORS.gray} />
                  <Text style={styles.scheduleText}>
                    {area.is_24_hours 
                      ? '24 horas' 
                      : `${area.available_from?.slice(0,5)} - ${area.available_until?.slice(0,5)}`
                    }
                  </Text>
                  {area.requires_approval && (
                    <View style={styles.approvalBadge}>
                      <Text style={styles.approvalText}>Requiere aprobación</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.cardActions}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => handleEdit(area)}
                  >
                    <Ionicons name="pencil" size={16} color={COLORS.primary} />
                    <Text style={styles.editBtnText}>Editar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionBtn, area.is_blocked ? styles.unblockBtn : styles.blockBtn]}
                    onPress={() => handleBlock(area)}
                  >
                    <Ionicons name={area.is_blocked ? "lock-open" : "lock-closed"} size={16} color={area.is_blocked ? COLORS.success : COLORS.warning} />
                    <Text style={[styles.blockBtnText, area.is_blocked && styles.unblockBtnText]}>
                      {area.is_blocked ? 'Desbloquear' : 'Bloquear'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(area)}
                  >
                    <Ionicons name="trash" size={16} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal Crear/Editar */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingArea ? 'Editar Área' : 'Nueva Área'}
            </Text>
            <TouchableOpacity onPress={handleSubmit} disabled={saving}>
              <Text style={[styles.modalSave, saving && { opacity: 0.5 }]}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Nombre */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nombre *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Ej: Piscina principal"
                placeholderTextColor={COLORS.gray}
              />
            </View>

            {/* Tipo */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tipo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
                {AREA_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeOption,
                      formData.type === type.value && styles.typeOptionSelected
                    ]}
                    onPress={() => setFormData({ ...formData, type: type.value })}
                  >
                    <Text style={[
                      styles.typeOptionText,
                      formData.type === type.value && styles.typeOptionTextSelected
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Descripción */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Descripción</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Descripción del área..."
                placeholderTextColor={COLORS.gray}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Capacidad y Tarifa */}
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.formLabel}>Capacidad</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.capacity}
                  onChangeText={(text) => setFormData({ ...formData, capacity: text })}
                  placeholder="Ej: 20"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.formLabel}>Tarifa/hora (L)</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.hourly_rate}
                  onChangeText={(text) => setFormData({ ...formData, hourly_rate: text })}
                  placeholder="0"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Duración min/max */}
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.formLabel}>Mín. horas</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.min_duration_hours}
                  onChangeText={(text) => setFormData({ ...formData, min_duration_hours: text })}
                  placeholder="1"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.formLabel}>Máx. horas</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.max_duration_hours}
                  onChangeText={(text) => setFormData({ ...formData, max_duration_hours: text })}
                  placeholder="4"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Días de anticipación */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Días de anticipación para reservar</Text>
              <TextInput
                style={styles.formInput}
                value={formData.advance_booking_days}
                onChangeText={(text) => setFormData({ ...formData, advance_booking_days: text })}
                placeholder="30"
                placeholderTextColor={COLORS.gray}
                keyboardType="number-pad"
              />
            </View>

            {/* Horario */}
            <View style={styles.formGroupSwitch}>
              <Text style={styles.formLabel}>Disponible 24 horas</Text>
              <Switch
                value={formData.is_24_hours}
                onValueChange={(value) => setFormData({ ...formData, is_24_hours: value })}
                trackColor={{ false: COLORS.grayLight, true: COLORS.primary + '50' }}
                thumbColor={formData.is_24_hours ? COLORS.primary : '#f4f3f4'}
              />
            </View>

            {!formData.is_24_hours && (
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.formLabel}>Hora inicio</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.available_from}
                    onChangeText={(text) => setFormData({ ...formData, available_from: text })}
                    placeholder="06:00"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.formLabel}>Hora fin</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.available_until}
                    onChangeText={(text) => setFormData({ ...formData, available_until: text })}
                    placeholder="22:00"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
              </View>
            )}

            {/* Requiere aprobación */}
            <View style={styles.formGroupSwitch}>
              <View>
                <Text style={styles.formLabel}>Requiere aprobación</Text>
                <Text style={styles.formHint}>El admin debe aprobar cada reservación</Text>
              </View>
              <Switch
                value={formData.requires_approval}
                onValueChange={(value) => setFormData({ ...formData, requires_approval: value })}
                trackColor={{ false: COLORS.grayLight, true: COLORS.primary + '50' }}
                thumbColor={formData.requires_approval ? COLORS.primary : '#f4f3f4'}
              />
            </View>

            {/* Reglas */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Reglas de uso</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                value={formData.rules}
                onChangeText={(text) => setFormData({ ...formData, rules: text })}
                placeholder="Reglas y condiciones de uso..."
                placeholderTextColor={COLORS.gray}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Imagen */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Imagen</Text>
              <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                <Ionicons name="camera" size={24} color={COLORS.gray} />
                <Text style={styles.imagePickerText}>
                  {formData.image_url ? 'Cambiar imagen' : 'Agregar imagen'}
                </Text>
              </TouchableOpacity>
              {formData.image_url && (
                <Image source={{ uri: formData.image_url }} style={styles.previewImage} />
              )}
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal Bloquear */}
      <Modal visible={showBlockModal} animationType="slide" transparent>
        <View style={styles.blockModalOverlay}>
          <View style={styles.blockModalContent}>
            <Text style={styles.blockModalTitle}>
              {blockingArea?.is_blocked ? 'Desbloquear Área' : 'Bloquear Área'}
            </Text>
            
            {!blockingArea?.is_blocked && (
              <>
                <Text style={styles.blockModalSubtitle}>
                  Los usuarios verán este mensaje y no podrán reservar
                </Text>
                
                <TextInput
                  style={styles.formInput}
                  value={blockData.block_reason}
                  onChangeText={(text) => setBlockData({ ...blockData, block_reason: text })}
                  placeholder="Razón del bloqueo (ej: Mantenimiento)"
                  placeholderTextColor={COLORS.gray}
                />
                
                <TextInput
                  style={[styles.formInput, { marginTop: 12 }]}
                  value={blockData.blocked_until}
                  onChangeText={(text) => setBlockData({ ...blockData, blocked_until: text })}
                  placeholder="Fecha fin (YYYY-MM-DD) - Opcional"
                  placeholderTextColor={COLORS.gray}
                />
              </>
            )}
            
            {blockingArea?.is_blocked && (
              <Text style={styles.blockModalSubtitle}>
                El área volverá a estar disponible para reservaciones
              </Text>
            )}
            
            <View style={styles.blockModalActions}>
              <TouchableOpacity 
                style={styles.blockModalCancel}
                onPress={() => setShowBlockModal(false)}
              >
                <Text style={styles.blockModalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.blockModalConfirm,
                  blockingArea?.is_blocked && styles.unblockModalConfirm
                ]}
                onPress={handleBlockSubmit}
                disabled={saving}
              >
                <Text style={styles.blockModalConfirmText}>
                  {saving ? 'Guardando...' : (blockingArea?.is_blocked ? 'Desbloquear' : 'Bloquear')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    marginTop: 12,
    color: COLORS.gray,
    fontSize: 14,
  },
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.navy,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  areaCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  areaCardInactive: {
    opacity: 0.6,
  },
  areaImage: {
    width: '100%',
    height: 150,
    backgroundColor: COLORS.grayLight,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  areaType: {
    fontSize: 12,
    color: COLORS.gray,
  },
  inactiveBadge: {
    backgroundColor: COLORS.gray + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 10,
    color: COLORS.gray,
    fontWeight: '500',
  },
  blockedBadge: {
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  blockedBadgeText: {
    fontSize: 10,
    color: COLORS.warning,
    fontWeight: '500',
  },
  areaName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.navy,
  },
  blockReasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '15',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    gap: 6,
  },
  blockReasonText: {
    fontSize: 12,
    color: COLORS.warning,
    flex: 1,
  },
  areaDescription: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 12,
    lineHeight: 20,
  },
  areaInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  areaSchedule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
    marginBottom: 12,
  },
  scheduleText: {
    fontSize: 12,
    color: COLORS.gray,
    flex: 1,
  },
  approvalBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  approvalText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  editBtn: {
    backgroundColor: COLORS.primary + '15',
    flex: 1,
    justifyContent: 'center',
  },
  editBtnText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  blockBtn: {
    backgroundColor: COLORS.warning + '15',
    flex: 1,
    justifyContent: 'center',
  },
  unblockBtn: {
    backgroundColor: COLORS.success + '15',
    flex: 1,
    justifyContent: 'center',
  },
  blockBtnText: {
    fontSize: 13,
    color: COLORS.warning,
    fontWeight: '500',
  },
  unblockBtnText: {
    color: COLORS.success,
  },
  deleteBtn: {
    backgroundColor: COLORS.danger + '10',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  modalCancel: {
    fontSize: 16,
    color: COLORS.gray,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.navy,
  },
  modalSave: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formGroupSwitch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 8,
  },
  formHint: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  formInput: {
    backgroundColor: COLORS.grayLighter,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.navy,
  },
  formTextarea: {
    height: 80,
    paddingTop: 12,
  },
  typeSelector: {
    flexDirection: 'row',
  },
  typeOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.grayLighter,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  typeOptionSelected: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  typeOptionText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  typeOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  imagePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.grayLighter,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 20,
    gap: 8,
  },
  imagePickerText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginTop: 12,
  },
  // Block Modal
  blockModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  blockModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  blockModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 8,
  },
  blockModalSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 20,
  },
  blockModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  blockModalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.grayLight,
    alignItems: 'center',
  },
  blockModalCancelText: {
    fontSize: 16,
    color: COLORS.gray,
    fontWeight: '500',
  },
  blockModalConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.warning,
    alignItems: 'center',
  },
  unblockModalConfirm: {
    backgroundColor: COLORS.success,
  },
  blockModalConfirmText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
  },
});