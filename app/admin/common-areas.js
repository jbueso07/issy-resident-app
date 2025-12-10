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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export default function AdminCommonAreas() {
  const { user, profile } = useAuth();
  const router = useRouter();
  
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capacity: '',
    requires_reservation: true,
    advance_booking_days: '7',
    max_hours_per_reservation: '2',
    rules: '',
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
      const locationId = profile?.location_id;
      const response = await fetch(
        `${API_URL}/api/common-areas`, 
        { headers }
      );
      const data = await response.json();
      
      if (data.success || Array.isArray(data)) {
        const areasList = data.data || data.areas || data;
        setAreas(Array.isArray(areasList) ? areasList : []);
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

  const handleCreate = () => {
    setEditingArea(null);
    setFormData({
      name: '',
      description: '',
      capacity: '',
      requires_reservation: true,
      advance_booking_days: '7',
      max_hours_per_reservation: '2',
      rules: '',
    });
    setShowModal(true);
  };

  const handleEdit = (area) => {
    setEditingArea(area);
    setFormData({
      name: area.name || '',
      description: area.description || '',
      capacity: area.capacity?.toString() || '',
      requires_reservation: area.requires_reservation ?? true,
      advance_booking_days: area.advance_booking_days?.toString() || '7',
      max_hours_per_reservation: area.max_hours_per_reservation?.toString() || '2',
      rules: area.rules || '',
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
        ? `${API_URL}/api/reservations/areas/${editingArea.id}`
        : `${API_URL}/api/reservations/areas`;
      
      const response = await fetch(url, {
        method: editingArea ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          capacity: parseInt(formData.capacity) || null,
          advance_booking_days: parseInt(formData.advance_booking_days) || 7,
          max_hours_per_reservation: parseInt(formData.max_hours_per_reservation) || 2,
          location_id: profile?.location_id,
        }),
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
                `${API_URL}/api/reservations/areas/${area.id}`,
                { method: 'DELETE', headers }
              );

              if (response.ok) {
                Alert.alert('Éxito', 'Área eliminada');
                fetchAreas();
              } else {
                Alert.alert('Error', 'No se pudo eliminar');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el área');
            }
          }
        },
      ]
    );
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
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>🏊 Áreas Comunes</Text>
          <Text style={styles.headerSubtitle}>{areas.length} áreas</Text>
        </View>
        <TouchableOpacity onPress={handleCreate} style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
            <View key={area.id} style={styles.areaCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.areaName}>{area.name}</Text>
                {area.capacity && (
                  <View style={styles.capacityBadge}>
                    <Text style={styles.capacityText}>👥 {area.capacity}</Text>
                  </View>
                )}
              </View>
              
              {area.description && (
                <Text style={styles.areaDescription} numberOfLines={2}>
                  {area.description}
                </Text>
              )}
              
              <View style={styles.areaInfo}>
                <Text style={styles.infoText}>
                  ⏰ Máx. {area.max_hours_per_reservation || 2}h por reserva
                </Text>
                <Text style={styles.infoText}>
                  📅 Reservar hasta {area.advance_booking_days || 7} días antes
                </Text>
              </View>
              
              <View style={styles.cardFooter}>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: area.is_active !== false ? COLORS.success + '20' : COLORS.gray + '20' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: area.is_active !== false ? COLORS.success : COLORS.gray }
                  ]}>
                    {area.is_active !== false ? '✓ Activa' : 'Inactiva'}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleEdit(area)}
                  >
                    <Text style={styles.editButtonText}>✏️ Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDelete(area)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingArea ? 'Editar Área' : 'Nueva Área'}
            </Text>
            <TouchableOpacity onPress={handleSubmit} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.modalSave}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nombre *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Ej: Piscina, Salón de eventos"
                placeholderTextColor={COLORS.gray}
              />
            </View>

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

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Capacidad</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.capacity}
                  onChangeText={(text) => setFormData({ ...formData, capacity: text })}
                  placeholder="20"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Máx. horas</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.max_hours_per_reservation}
                  onChangeText={(text) => setFormData({ ...formData, max_hours_per_reservation: text })}
                  placeholder="2"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Días de anticipación para reservar</Text>
              <TextInput
                style={styles.formInput}
                value={formData.advance_booking_days}
                onChangeText={(text) => setFormData({ ...formData, advance_booking_days: text })}
                placeholder="7"
                placeholderTextColor={COLORS.gray}
                keyboardType="number-pad"
              />
            </View>

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

            <View style={styles.formGroupSwitch}>
              <Text style={styles.formLabel}>Requiere reservación</Text>
              <Switch
                value={formData.requires_reservation}
                onValueChange={(value) => setFormData({ ...formData, requires_reservation: value })}
                trackColor={{ false: COLORS.grayLight, true: COLORS.primary + '50' }}
                thumbColor={formData.requires_reservation ? COLORS.primary : '#f4f3f4'}
              />
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
  backButtonText: {
    fontSize: 24,
    color: COLORS.navy,
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
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
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
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  areaName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.navy,
    flex: 1,
  },
  capacityBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  capacityText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
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
    marginBottom: 12,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
    paddingTop: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: COLORS.grayLighter,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 12,
    color: COLORS.navy,
  },
  deleteButton: {
    backgroundColor: COLORS.danger + '10',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 14,
  },
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
    height: 100,
    paddingTop: 12,
  },
});