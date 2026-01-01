// app/admin/gates.js
// ISSY SuperApp - Admin: Gestión de Puertas (ProHome Dark Theme)

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const API_URL = 'https://api.joinissy.com/api';

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
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  border: 'rgba(255,255,255,0.1)',
};

export default function AdminGates() {
  const { user, profile, isSuperAdmin } = useAuth();
  const router = useRouter();
  
  const [gates, setGates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingGate, setEditingGate] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const userRole = profile?.role || user?.role || 'user';
  const userLocationId = profile?.location_id || user?.location_id;
  const isAdmin = ['admin', 'superadmin'].includes(userRole);
  const isSuperAdminUser = userRole === 'superadmin';

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
      fetchGates();
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
      if (userLocationId) {
        setSelectedLocationId(userLocationId);
      }
    }
  };

  const fetchGates = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${API_URL}/gates?location_id=${selectedLocationId}`,
        { headers }
      );
      const data = await res.json();
      
      if (data.success) {
        setGates(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching gates:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGates();
  }, [selectedLocationId]);

  const handleOpenCreateModal = () => {
    setEditingGate(null);
    setFormData({ name: '', description: '' });
    setShowModal(true);
  };

  const handleOpenEditModal = (gate) => {
    setEditingGate(gate);
    setFormData({
      name: gate.name,
      description: gate.description || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGate(null);
    setFormData({ name: '', description: '' });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    setFormLoading(true);
    try {
      const headers = await getAuthHeaders();
      
      if (editingGate) {
        const response = await fetch(`${API_URL}/gates/${editingGate.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
          }),
        });
        
        if (response.ok) {
          Alert.alert('Éxito', 'Puerta actualizada');
          handleCloseModal();
          fetchGates();
        } else {
          const data = await response.json();
          Alert.alert('Error', data.error || 'No se pudo actualizar');
        }
      } else {
        const response = await fetch(`${API_URL}/gates`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            location_id: selectedLocationId,
          }),
        });
        
        if (response.ok) {
          Alert.alert('Éxito', 'Puerta creada');
          handleCloseModal();
          fetchGates();
        } else {
          const data = await response.json();
          Alert.alert('Error', data.error || 'No se pudo crear');
        }
      }
    } catch (error) {
      console.error('Error saving gate:', error);
      Alert.alert('Error', 'No se pudo guardar');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (gate) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/gates/${gate.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_active: !gate.is_active }),
      });
      
      if (response.ok) {
        fetchGates();
      }
    } catch (error) {
      console.error('Error toggling gate:', error);
    }
  };

  const handleDelete = async (gate) => {
    Alert.alert(
      'Eliminar Puerta',
      `¿Estás seguro de eliminar "${gate.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(`${API_URL}/gates/${gate.id}`, {
                method: 'DELETE',
                headers,
              });
              
              if (response.ok) {
                fetchGates();
              } else {
                Alert.alert('Error', 'No se pudo eliminar');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          }
        }
      ]
    );
  };

  const currentLocation = locations.find(l => l.id === selectedLocationId);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
          <Text style={styles.loadingText}>Cargando puertas...</Text>
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
          <Text style={styles.headerTitle}>Puertas de Acceso</Text>
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
            <Text style={styles.headerSubtitle}>{currentLocation?.name || ''}</Text>
          )}
        </View>
        <TouchableOpacity onPress={handleOpenCreateModal} style={styles.addButton}>
          <Ionicons name="add" size={24} color={COLORS.background} />
        </TouchableOpacity>
      </View>

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
        {gates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Sin puertas registradas</Text>
            <Text style={styles.emptySubtitle}>
              Agrega puertas de acceso para tu comunidad
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleOpenCreateModal}>
              <Ionicons name="add" size={20} color={COLORS.background} />
              <Text style={styles.emptyButtonText}>Agregar Puerta</Text>
            </TouchableOpacity>
          </View>
        ) : (
          gates.map((gate) => (
            <View key={gate.id} style={styles.gateCard}>
              <View style={styles.gateHeader}>
                <View style={[
                  styles.gateIcon,
                  { backgroundColor: gate.is_active ? COLORS.success + '20' : COLORS.danger + '20' }
                ]}>
                  <Ionicons 
                    name="business" 
                    size={24} 
                    color={gate.is_active ? COLORS.success : COLORS.danger} 
                  />
                </View>
                <View style={styles.gateInfo}>
                  <Text style={styles.gateName}>{gate.name}</Text>
                  {gate.description && (
                    <Text style={styles.gateDescription}>{gate.description}</Text>
                  )}
                  <View style={styles.gateMeta}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: gate.is_active ? COLORS.success + '20' : COLORS.danger + '20' }
                    ]}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: gate.is_active ? COLORS.success : COLORS.danger }
                      ]} />
                      <Text style={[
                        styles.statusText,
                        { color: gate.is_active ? COLORS.success : COLORS.danger }
                      ]}>
                        {gate.is_active ? 'Activa' : 'Inactiva'}
                      </Text>
                    </View>
                    {gate.code && (
                      <Text style={styles.gateCode}>Código: {gate.code}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Stats */}
              <View style={styles.gateStats}>
                <View style={styles.statItem}>
                  <Ionicons name="enter" size={16} color={COLORS.success} />
                  <Text style={styles.statValue}>{gate.entry_count || 0}</Text>
                  <Text style={styles.statLabel}>Entradas</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="exit" size={16} color={COLORS.danger} />
                  <Text style={styles.statValue}>{gate.exit_count || 0}</Text>
                  <Text style={styles.statLabel}>Salidas</Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.gateActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleOpenEditModal(gate)}
                >
                  <Ionicons name="create-outline" size={18} color={COLORS.teal} />
                  <Text style={[styles.actionButtonText, { color: COLORS.teal }]}>Editar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleToggleActive(gate)}
                >
                  <Ionicons 
                    name={gate.is_active ? 'close-circle-outline' : 'checkmark-circle-outline'} 
                    size={18} 
                    color={gate.is_active ? COLORS.warning : COLORS.success} 
                  />
                  <Text style={[
                    styles.actionButtonText, 
                    { color: gate.is_active ? COLORS.warning : COLORS.success }
                  ]}>
                    {gate.is_active ? 'Desactivar' : 'Activar'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(gate)}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                  <Text style={[styles.actionButtonText, { color: COLORS.danger }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={{ flex: 1 }}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={handleCloseModal}>
                    <Text style={styles.modalCancel}>Cancelar</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>
                    {editingGate ? 'Editar Puerta' : 'Nueva Puerta'}
                  </Text>
                  <TouchableOpacity onPress={handleSubmit} disabled={formLoading}>
                    {formLoading ? (
                      <ActivityIndicator size="small" color={COLORS.lime} />
                    ) : (
                      <Text style={styles.modalSave}>Guardar</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
                  <Text style={styles.inputLabel}>Nombre *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(text) => setFormData({...formData, name: text})}
                    placeholder="Ej: Portón Principal, Caseta Norte"
                    placeholderTextColor={COLORS.textMuted}
                  />

                  <Text style={styles.inputLabel}>Descripción (opcional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.description}
                    onChangeText={(text) => setFormData({...formData, description: text})}
                    placeholder="Descripción o notas adicionales"
                    placeholderTextColor={COLORS.textMuted}
                    multiline
                    numberOfLines={3}
                  />

                  <View style={styles.infoNote}>
                    <Ionicons name="information-circle" size={20} color={COLORS.teal} />
                    <Text style={styles.infoNoteText}>
                      Las puertas permiten organizar los accesos por ubicación específica. 
                      Los guardias pueden seleccionar su puerta al registrar turnos.
                    </Text>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Location Picker */}
      {showLocationPicker && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Seleccionar Ubicación</Text>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {locations.map((loc) => (
                <TouchableOpacity
                  key={loc.id}
                  style={[
                    styles.locationItem,
                    loc.id === selectedLocationId && styles.locationItemActive
                  ]}
                  onPress={() => {
                    setSelectedLocationId(loc.id);
                    setShowLocationPicker(false);
                  }}
                >
                  <Ionicons 
                    name="business" 
                    size={20} 
                    color={loc.id === selectedLocationId ? COLORS.lime : COLORS.textSecondary} 
                  />
                  <Text style={[
                    styles.locationItemText,
                    loc.id === selectedLocationId && styles.locationItemTextActive
                  ]}>
                    {loc.name}
                  </Text>
                  {loc.id === selectedLocationId && (
                    <Ionicons name="checkmark" size={20} color={COLORS.lime} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
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
  addButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(16),
  },
  gateCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gateHeader: {
    flexDirection: 'row',
    marginBottom: scale(12),
  },
  gateIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  gateInfo: {
    flex: 1,
  },
  gateName: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  gateDescription: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  gateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(8),
    gap: scale(10),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
    gap: scale(4),
  },
  statusDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  statusText: {
    fontSize: scale(11),
    fontWeight: '600',
  },
  gateCode: {
    fontSize: scale(11),
    color: COLORS.textMuted,
  },
  gateStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: scale(12),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: {
    alignItems: 'center',
    gap: scale(4),
  },
  statValue: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: scale(11),
    color: COLORS.textMuted,
  },
  gateActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: scale(12),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    padding: scale(8),
  },
  actionButtonText: {
    fontSize: scale(12),
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(60),
  },
  emptyTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: scale(16),
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(4),
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lime,
    paddingHorizontal: scale(20),
    paddingVertical: scale(12),
    borderRadius: scale(10),
    marginTop: scale(20),
    gap: scale(8),
  },
  emptyButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.background,
  },
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
  textArea: {
    height: scale(100),
    textAlignVertical: 'top',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.teal + '15',
    padding: scale(16),
    borderRadius: scale(10),
    marginTop: scale(24),
    gap: scale(10),
  },
  infoNoteText: {
    flex: 1,
    fontSize: scale(13),
    color: COLORS.teal,
    lineHeight: scale(20),
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  pickerContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    padding: scale(20),
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  pickerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(14),
    borderRadius: scale(10),
    marginBottom: scale(8),
    backgroundColor: COLORS.backgroundSecondary,
    gap: scale(10),
  },
  locationItemActive: {
    backgroundColor: COLORS.lime + '15',
    borderWidth: 1,
    borderColor: COLORS.lime,
  },
  locationItemText: {
    flex: 1,
    fontSize: scale(15),
    color: COLORS.textSecondary,
  },
  locationItemTextActive: {
    color: COLORS.lime,
    fontWeight: '600',
  },
});