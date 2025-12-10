// app/admin/announcements.js
// ISSY Resident App - Admin: Gestión de Anuncios

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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.joinissy.com';

// Colores
const COLORS = {
  primary: '#009FF5',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  purple: '#8B5CF6',
  navy: '#1A1A2E',
  black: '#000000',
  white: '#FFFFFF',
  background: '#F3F4F6',
  gray: '#6B7280',
  grayLight: '#E5E7EB',
  grayLighter: '#F9FAFB',
};

// Tipos de anuncios
const ANNOUNCEMENT_TYPES = [
  { value: 'info', label: '📢 Información', color: COLORS.primary },
  { value: 'warning', label: '⚠️ Advertencia', color: COLORS.warning },
  { value: 'alert', label: '🚨 Alerta', color: COLORS.danger },
  { value: 'maintenance', label: '🔧 Mantenimiento', color: COLORS.purple },
  { value: 'event', label: '🎉 Evento', color: COLORS.success },
];

// Prioridades
const PRIORITIES = [
  { value: 'low', label: 'Baja', color: COLORS.success },
  { value: 'normal', label: 'Normal', color: COLORS.primary },
  { value: 'medium', label: 'Media', color: COLORS.warning },
  { value: 'high', label: 'Alta', color: COLORS.danger },
  { value: 'urgent', label: 'Urgente', color: '#DC2626' },
];

// Audiencias
const TARGET_AUDIENCES = [
  { value: 'all', label: '👥 Todos' },
  { value: 'residents', label: '🏠 Residentes' },
  { value: 'guards', label: '🛡️ Guardias' },
  { value: 'staff', label: '👔 Personal' },
  { value: 'admins', label: '⚙️ Administradores' },
];

export default function AdminAnnouncements() {
  const { user, profile } = useAuth();
  const router = useRouter();
  
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    priority: 'normal',
    target_audience: 'all',
  });

  const userRole = profile?.role || user?.role || 'user';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Acceso Denegado', 'No tienes permisos para acceder a esta sección');
      router.back();
      return;
    }
    fetchAnnouncements();
  }, []);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchAnnouncements = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/announcements`, { headers });
      const data = await response.json();
      
      if (data.success || Array.isArray(data)) {
        const announcementsList = data.data || data.announcements || data;
        setAnnouncements(Array.isArray(announcementsList) ? announcementsList : []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      Alert.alert('Error', 'No se pudieron cargar los anuncios');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnnouncements();
  }, []);

  const handleCreate = () => {
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      message: '',
      type: 'info',
      priority: 'normal',
      target_audience: 'all',
    });
    setShowModal(true);
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type || 'info',
      priority: announcement.priority || 'normal',
      target_audience: announcement.target_audience || 'all',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return;
    }
    if (!formData.message.trim()) {
      Alert.alert('Error', 'El mensaje es requerido');
      return;
    }

    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const url = editingAnnouncement 
        ? `${API_URL}/api/announcements/${editingAnnouncement.id}`
        : `${API_URL}/api/announcements`;
      
      const response = await fetch(url, {
        method: editingAnnouncement ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          location_id: profile?.location_id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Éxito', 
          editingAnnouncement ? 'Anuncio actualizado' : 'Anuncio creado'
        );
        setShowModal(false);
        fetchAnnouncements();
      } else {
        Alert.alert('Error', data.error || 'No se pudo guardar el anuncio');
      }
    } catch (error) {
      console.error('Error saving announcement:', error);
      Alert.alert('Error', 'No se pudo guardar el anuncio');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (announcement) => {
    Alert.alert(
      'Eliminar Anuncio',
      `¿Estás seguro de eliminar "${announcement.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(
                `${API_URL}/api/announcements/${announcement.id}`,
                { method: 'DELETE', headers }
              );

              if (response.ok) {
                Alert.alert('Éxito', 'Anuncio eliminado');
                fetchAnnouncements();
              } else {
                const data = await response.json();
                Alert.alert('Error', data.error || 'No se pudo eliminar');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el anuncio');
            }
          }
        },
      ]
    );
  };

  const getTypeInfo = (type) => {
    return ANNOUNCEMENT_TYPES.find(t => t.value === type) || ANNOUNCEMENT_TYPES[0];
  };

  const getPriorityInfo = (priority) => {
    return PRIORITIES.find(p => p.value === priority) || PRIORITIES[1];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando anuncios...</Text>
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
          <Text style={styles.headerTitle}>📢 Anuncios</Text>
          <Text style={styles.headerSubtitle}>{announcements.length} anuncios</Text>
        </View>
        <TouchableOpacity onPress={handleCreate} style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Anuncios */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {announcements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📢</Text>
            <Text style={styles.emptyTitle}>No hay anuncios</Text>
            <Text style={styles.emptySubtitle}>
              Crea tu primer anuncio para informar a tu comunidad
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleCreate}>
              <Text style={styles.emptyButtonText}>Crear Anuncio</Text>
            </TouchableOpacity>
          </View>
        ) : (
          announcements.map((announcement) => {
            const typeInfo = getTypeInfo(announcement.type);
            const priorityInfo = getPriorityInfo(announcement.priority);
            
            return (
              <View key={announcement.id} style={styles.announcementCard}>
                <View style={styles.cardHeader}>
                  <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + '20' }]}>
                    <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>
                      {typeInfo.label}
                    </Text>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: priorityInfo.color + '20' }]}>
                    <Text style={[styles.priorityBadgeText, { color: priorityInfo.color }]}>
                      {priorityInfo.label}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.cardTitle}>{announcement.title}</Text>
                <Text style={styles.cardMessage} numberOfLines={3}>
                  {announcement.message}
                </Text>
                
                <View style={styles.cardFooter}>
                  <Text style={styles.cardDate}>{formatDate(announcement.created_at)}</Text>
                  <View style={styles.cardActions}>
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => handleEdit(announcement)}
                    >
                      <Text style={styles.editButtonText}>✏️ Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDelete(announcement)}
                    >
                      <Text style={styles.deleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal de Crear/Editar */}
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
              {editingAnnouncement ? 'Editar Anuncio' : 'Nuevo Anuncio'}
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
            {/* Título */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Título *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Ej: Mantenimiento de piscina"
                placeholderTextColor={COLORS.gray}
              />
            </View>

            {/* Mensaje */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Mensaje *</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                value={formData.message}
                onChangeText={(text) => setFormData({ ...formData, message: text })}
                placeholder="Escribe el contenido del anuncio..."
                placeholderTextColor={COLORS.gray}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Tipo */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tipo</Text>
              <View style={styles.optionsRow}>
                {ANNOUNCEMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.optionButton,
                      formData.type === type.value && { 
                        backgroundColor: type.color + '20',
                        borderColor: type.color,
                      }
                    ]}
                    onPress={() => setFormData({ ...formData, type: type.value })}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      formData.type === type.value && { color: type.color }
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Prioridad */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Prioridad</Text>
              <View style={styles.optionsRow}>
                {PRIORITIES.map((priority) => (
                  <TouchableOpacity
                    key={priority.value}
                    style={[
                      styles.optionButton,
                      formData.priority === priority.value && { 
                        backgroundColor: priority.color + '20',
                        borderColor: priority.color,
                      }
                    ]}
                    onPress={() => setFormData({ ...formData, priority: priority.value })}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      formData.priority === priority.value && { color: priority.color }
                    ]}>
                      {priority.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Audiencia */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Dirigido a</Text>
              <View style={styles.optionsRow}>
                {TARGET_AUDIENCES.map((audience) => (
                  <TouchableOpacity
                    key={audience.value}
                    style={[
                      styles.optionButton,
                      formData.target_audience === audience.value && { 
                        backgroundColor: COLORS.primary + '20',
                        borderColor: COLORS.primary,
                      }
                    ]}
                    onPress={() => setFormData({ ...formData, target_audience: audience.value })}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      formData.target_audience === audience.value && { color: COLORS.primary }
                    ]}>
                      {audience.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // Empty State
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

  // Announcement Card
  announcementCard: {
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
    gap: 8,
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 8,
  },
  cardMessage: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
    paddingTop: 12,
  },
  cardDate: {
    fontSize: 12,
    color: COLORS.gray,
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

  // Modal
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

  // Form
  formGroup: {
    marginBottom: 20,
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
    height: 120,
    paddingTop: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    backgroundColor: COLORS.white,
  },
  optionButtonText: {
    fontSize: 13,
    color: COLORS.gray,
  },
});