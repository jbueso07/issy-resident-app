// app/admin/gates.js
// ISSY SuperApp - Admin: Gestión de Puertas con Configuración Completa

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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

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

const GATE_TYPES = [
  { id: 'vehicle_entrance', label: 'Entrada Vehicular', icon: 'car' },
  { id: 'pedestrian_entrance', label: 'Entrada Peatonal', icon: 'walk' },
  { id: 'checkpoint', label: 'Punto de Control', icon: 'shield-checkmark' },
  { id: 'exit_only', label: 'Solo Salida', icon: 'exit' },
  { id: 'access_point', label: 'Punto de Acceso', icon: 'business' },
];

const DEFAULT_FORM_DATA = {
  name: '',
  description: '',
  gate_type: 'access_point',
  is_checkpoint: false,
  require_entry_photo: false,
  require_exit_photo: false,
  require_vehicle_photo: false,
  require_id_scan: false,
  require_companion_count: false,
  auto_approve_preregistered: true,
  checkpoint_requires_photo: false,
  notify_resident_on_entry: true,
};

export default function AdminGates() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const router = useRouter();
  
  const [gates, setGates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingGate, setEditingGate] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'config'
  
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showCreateDeviceModal, setShowCreateDeviceModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [deviceCredentials, setDeviceCredentials] = useState(null);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [creatingDevice, setCreatingDevice] = useState(false);

  const userRole = profile?.role || user?.role || 'user';
  const userLocationId = profile?.location_id || user?.location_id;
  const isAdmin = ['admin', 'superadmin'].includes(userRole);
  const isSuperAdminUser = userRole === 'superadmin';

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Acceso Denegado', 'No tienes permisos para acceder a esta sección');
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
    setFormData(DEFAULT_FORM_DATA);
    setActiveTab('basic');
    setShowModal(true);
  };

  const handleOpenEditModal = (gate) => {
    setEditingGate({
      ...gate,
      access_devices: gate.access_devices || []
    });
    setFormData({
      name: gate.name || '',
      description: gate.description || '',
      gate_type: gate.gate_type || 'access_point',
      is_checkpoint: gate.is_checkpoint || false,
      require_entry_photo: gate.require_entry_photo || false,
      require_exit_photo: gate.require_exit_photo || false,
      require_vehicle_photo: gate.require_vehicle_photo || false,
      require_id_scan: gate.require_id_scan || false,
      require_companion_count: gate.require_companion_count || false,
      auto_approve_preregistered: gate.auto_approve_preregistered !== false,
      checkpoint_requires_photo: gate.checkpoint_requires_photo || false,
      notify_resident_on_entry: gate.notify_resident_on_entry !== false,
    });
    setActiveTab('basic');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGate(null);
    setFormData(DEFAULT_FORM_DATA);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'El nombre de la puerta es requerido');
      return;
    }

    setFormLoading(true);
    try {
      const headers = await getAuthHeaders();
      const payload = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      };
      
      if (editingGate) {
        const response = await fetch(`${API_URL}/gates/${editingGate.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
        
        if (response.ok) {
          Alert.alert('Éxito', 'Puerta actualizada correctamente');
          handleCloseModal();
          fetchGates();
        } else {
          const data = await response.json();
          Alert.alert('Error', data.error || 'No se pudo actualizar la puerta');
        }
      } else {
        payload.location_id = selectedLocationId;
        const response = await fetch(`${API_URL}/gates`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        
        if (response.ok) {
          Alert.alert('Éxito', 'Puerta creada correctamente');
          handleCloseModal();
          fetchGates();
        } else {
          const data = await response.json();
          Alert.alert('Error', data.error || 'No se pudo crear la puerta');
        }
      }
    } catch (error) {
      console.error('Error saving gate:', error);
      Alert.alert('Error', 'Error al guardar la puerta');
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
                const data = await response.json();
                Alert.alert('Error', data.error || 'No se pudo eliminar la puerta');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la puerta');
            }
          }
        }
      ]
    );
  };

  const handleCreateDevice = async () => {
    if (!newDeviceName.trim()) {
      Alert.alert('Error', 'El nombre del dispositivo es requerido');
      return;
    }

    setCreatingDevice(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/hardware/devices`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          device_name: newDeviceName.trim(),
          location_id: selectedLocationId,
          gate_id: editingGate.id,
          device_type: 'raspberry_pi',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store credentials to show
        setDeviceCredentials({
          device_code: data.data.device_code,
          device_secret: data.data.device_secret,
          device_name: newDeviceName.trim(),
          api_url: API_URL.replace('/api', ''),
        });
        
        // Close create modal, open credentials modal
        setShowCreateDeviceModal(false);
        setNewDeviceName('');
        setShowCredentialsModal(true);
        
        // Refresh gates to show new device
        fetchGates();
        
        // Update editingGate with new device
        if (editingGate) {
          const updatedDevices = [...(editingGate.access_devices || []), {
            id: data.data.id,
            device_name: newDeviceName.trim(),
            device_code: data.data.device_code,
            is_active: true,
          }];
          setEditingGate({...editingGate, access_devices: updatedDevices});
        }
      } else {
        Alert.alert('Error', data.error || 'No se pudo crear el dispositivo');
      }
    } catch (error) {
      console.error('Error creating device:', error);
      Alert.alert('Error', 'Error al crear el dispositivo');
    } finally {
      setCreatingDevice(false);
    }
  };

  const handleDeleteDevice = async (device) => {
    Alert.alert(
      'Eliminar Dispositivo',
      `¿Estás seguro de eliminar "${device.device_name}"?\n\nEl agente en el cliente dejará de funcionar.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(`${API_URL}/hardware/devices/${device.id}`, {
                method: 'DELETE',
                headers,
              });
              const data = await response.json();
              if (response.ok && data.success) {
                Alert.alert('Eliminado', 'Dispositivo eliminado correctamente');
                if (editingGate) {
                  const updated = (editingGate.access_devices || []).filter(d => d.id !== device.id);
                  setEditingGate({ ...editingGate, access_devices: updated });
                }
                fetchGates();
              } else {
                Alert.alert('Error', data.error || 'No se pudo eliminar');
              }
            } catch (error) {
              Alert.alert('Error', 'Error al eliminar dispositivo');
            }
          },
        },
      ]
    );
  };

  const handleRegenerateSecret = async (device) => {
    Alert.alert(
      'Regenerar Credenciales',
      `¿Regenerar el secret de "${device.device_name}"?\n\nEl agente actual dejará de autenticarse hasta que actualices el config.json con el nuevo secret.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Regenerar',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(`${API_URL}/hardware/devices/${device.id}/regenerate-secret`, {
                method: 'POST',
                headers,
              });
              const data = await response.json();
              if (response.ok && data.success) {
                setDeviceCredentials({
                  device_code: device.device_code,
                  device_secret: data.data.device_secret,
                  device_name: device.device_name,
                  api_url: API_URL.replace('/api', ''),
                });
                setShowCredentialsModal(true);
              } else {
                Alert.alert('Error', data.error || 'No se pudo regenerar');
              }
            } catch (error) {
              Alert.alert('Error', 'Error al regenerar credenciales');
            }
          },
        },
      ]
    );
  };

  const copyToClipboard = async (text, label) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copiado', `${label} copiado al portapapeles`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo copiar');
    }
  };

  const generateFullConfigJson = () => {
    if (!deviceCredentials) return '';
    const gateName = editingGate?.name || deviceCredentials.device_name || 'Sin nombre';
    const agentId = gateName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    return JSON.stringify({
      agent: {
        id: `agent-${agentId}`,
        name: `ISSY Agent - ${gateName}`,
        version: '2.1.0',
      },
      locationId: selectedLocationId || '',
      auth: {
        token: '',
        deviceCode: deviceCredentials.device_code,
        deviceSecret: deviceCredentials.device_secret,
      },
      api: {
        baseUrl: 'https://api.joinissy.com/api',
        pollInterval: 5000,
        heartbeatInterval: 60000,
        timeout: 10000,
      },
      devices: [
        {
          id: 'zkteco-entrada',
          name: 'LECTOR ENTRADA - Configurar IP',
          ip: '192.168.1.201',
          port: 4370,
          timeout: 10000,
          inactivityTimeout: 4000,
        },
        {
          id: 'zkteco-salida',
          name: 'LECTOR SALIDA - Configurar IP',
          ip: '192.168.1.200',
          port: 4370,
          timeout: 10000,
          inactivityTimeout: 4000,
        },
      ],
      qrReader: {
        enabled: false,
        device: 'auto',
        relay: {
          enabled: false,
          gpioPin: 17,
          pulseDurationMs: 3000,
        },
      },
      logging: {
        level: 'info',
        file: 'logs/agent.log',
      },
    }, null, 2);
  };

  const handleDownloadConfig = async () => {
    if (!deviceCredentials) return;

    const configContent = generateFullConfigJson();

    try {
      const fileName = `config-${deviceCredentials.device_code}.json`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, configContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Guardar config.json del agente ISSY',
          UTI: 'public.json',
        });
      } else {
        await Clipboard.setStringAsync(configContent);
        Alert.alert('Config copiado', 'El archivo config.json fue copiado al portapapeles. Pégalo en un archivo en la PC/Pi del cliente.');
      }
    } catch (error) {
      console.error('Error generating config:', error);
      // Fallback: copy to clipboard
      try {
        await Clipboard.setStringAsync(configContent);
        Alert.alert('Config copiado', 'No se pudo compartir el archivo, pero fue copiado al portapapeles.');
      } catch (e) {
        Alert.alert('Error', 'No se pudo generar el archivo de configuración');
      }
    }
  };

  const getGateTypeInfo = (typeId) => {
    return GATE_TYPES.find(t => t.id === typeId) || GATE_TYPES[4];
  };

  const currentLocation = locations.find(l => l.id === selectedLocationId);

  const renderConfigToggle = (label, value, key, description = null) => (
    <View style={styles.configItem}>
      <View style={styles.configTextContainer}>
        <Text style={styles.configLabel}>{label}</Text>
        {description && <Text style={styles.configDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={(newValue) => setFormData({...formData, [key]: newValue})}
        trackColor={{ false: COLORS.backgroundTertiary, true: COLORS.teal + '60' }}
        thumbColor={value ? COLORS.teal : COLORS.textMuted}
      />
    </View>
  );

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
            <Text style={styles.emptyTitle}>Sin Puertas</Text>
            <Text style={styles.emptySubtitle}>
              Agrega puertas de acceso para tu comunidad
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleOpenCreateModal}>
              <Ionicons name="add" size={20} color={COLORS.background} />
              <Text style={styles.emptyButtonText}>Agregar Puerta</Text>
            </TouchableOpacity>
          </View>
        ) : (
          gates.map((gate) => {
            const typeInfo = getGateTypeInfo(gate.gate_type);
            return (
              <View key={gate.id} style={styles.gateCard}>
                <View style={styles.gateHeader}>
                  <View style={[
                    styles.gateIcon,
                    { backgroundColor: gate.is_active ? COLORS.teal + '20' : COLORS.danger + '20' }
                  ]}>
                    <Ionicons 
                      name={typeInfo.icon} 
                      size={24} 
                      color={gate.is_active ? COLORS.teal : COLORS.danger} 
                    />
                  </View>
                  <View style={styles.gateInfo}>
                    <Text style={styles.gateName}>{gate.name}</Text>
                    <Text style={styles.gateType}>{typeInfo.label}</Text>
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
                      {gate.is_checkpoint && (
                        <View style={[styles.statusBadge, { backgroundColor: COLORS.purple + '20' }]}>
                          <Ionicons name="shield-checkmark" size={12} color={COLORS.purple} />
                          <Text style={[styles.statusText, { color: COLORS.purple }]}>Checkpoint</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Config Summary */}
                <View style={styles.configSummary}>
                  {gate.require_entry_photo && (
                    <View style={styles.configBadge}>
                      <Ionicons name="camera" size={12} color={COLORS.textSecondary} />
                      <Text style={styles.configBadgeText}>Foto entrada</Text>
                    </View>
                  )}
                  {gate.require_vehicle_photo && (
                    <View style={styles.configBadge}>
                      <Ionicons name="car" size={12} color={COLORS.textSecondary} />
                      <Text style={styles.configBadgeText}>Foto vehículo</Text>
                    </View>
                  )}
                  {gate.require_id_scan && (
                    <View style={styles.configBadge}>
                      <Ionicons name="card" size={12} color={COLORS.textSecondary} />
                      <Text style={styles.configBadgeText}>ID requerido</Text>
                    </View>
                  )}
                  {gate.auto_approve_preregistered && (
                    <View style={styles.configBadge}>
                      <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                      <Text style={[styles.configBadgeText, { color: COLORS.success }]}>Auto-aprobar</Text>
                    </View>
                  )}
                </View>

                {/* Stats */}
                <View style={styles.gateStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="enter" size={16} color={COLORS.success} />
                    <Text style={styles.statValue}>{gate.entry_count || 0}</Text>
                    <Text style={styles.statLabel}>Entradas</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="exit" size={16} color={COLORS.warning} />
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
                    <Ionicons name="settings-outline" size={18} color={COLORS.teal} />
                    <Text style={[styles.actionButtonText, { color: COLORS.teal }]}>Configurar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleToggleActive(gate)}
                  >
                    <Ionicons 
                      name={gate.is_active ? 'pause-circle-outline' : 'play-circle-outline'} 
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
            );
          })
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

              {/* Tabs */}
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'basic' && styles.tabActive]}
                  onPress={() => setActiveTab('basic')}
                >
                  <Text style={[styles.tabText, activeTab === 'basic' && styles.tabTextActive]}>
                    Información
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'config' && styles.tabActive]}
                  onPress={() => setActiveTab('config')}
                >
                  <Text style={[styles.tabText, activeTab === 'config' && styles.tabTextActive]}>
                    Configuración
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'hardware' && styles.tabActive]}
                  onPress={() => setActiveTab('hardware')}
                >
                  <Text style={[styles.tabText, activeTab === 'hardware' && styles.tabTextActive]}>
                    Hardware
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalContent} 
                keyboardShouldPersistTaps="always"
                onScrollBeginDrag={Keyboard.dismiss}
              >
                {activeTab === 'basic' ? (
                  <>
                    <Text style={styles.inputLabel}>Nombre *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.name}
                      onChangeText={(text) => setFormData({...formData, name: text})}
                      placeholder="Ej: Portón Principal"
                      placeholderTextColor={COLORS.textMuted}
                    />

                    <Text style={styles.inputLabel}>Descripción</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={formData.description}
                      onChangeText={(text) => setFormData({...formData, description: text})}
                      placeholder="Ej: Entrada vehicular principal"
                      placeholderTextColor={COLORS.textMuted}
                      multiline
                      numberOfLines={3}
                    />

                    <Text style={styles.inputLabel}>Tipo de Puerta</Text>
                    <TouchableOpacity 
                      style={styles.pickerButton}
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowTypePicker(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.pickerButtonContent}>
                        <Ionicons 
                          name={getGateTypeInfo(formData.gate_type).icon} 
                          size={20} 
                          color={COLORS.teal} 
                        />
                        <Text style={styles.pickerButtonText}>
                          {getGateTypeInfo(formData.gate_type).label}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    {renderConfigToggle(
                      'Es Punto de Control',
                      formData.is_checkpoint,
                      'is_checkpoint',
                      'Los puntos de control no abren puertas, solo registran paso'
                    )}

                    <View style={styles.infoNote}>
                      <Ionicons name="information-circle" size={20} color={COLORS.teal} />
                      <Text style={styles.infoNoteText}>
                        Los guardias usarán esta puerta para registrar accesos. Configura los requisitos en la pestaña "Configuración".
                      </Text>
                    </View>
                  </>
                ) : activeTab === 'config' ? (
                  <>
                    <Text style={styles.sectionTitle}>📸 Captura de Fotos</Text>
                    {renderConfigToggle(
                      'Foto al Entrar',
                      formData.require_entry_photo,
                      'require_entry_photo',
                      'Requiere tomar foto del visitante al entrar'
                    )}
                    {renderConfigToggle(
                      'Foto al Salir',
                      formData.require_exit_photo,
                      'require_exit_photo',
                      'Requiere tomar foto al registrar salida'
                    )}
                    {renderConfigToggle(
                      'Foto del Vehículo',
                      formData.require_vehicle_photo,
                      'require_vehicle_photo',
                      'Requiere foto del vehículo (placa)'
                    )}
                    {formData.is_checkpoint && renderConfigToggle(
                      'Foto en Checkpoint',
                      formData.checkpoint_requires_photo,
                      'checkpoint_requires_photo',
                      'Requiere foto al pasar por el punto de control'
                    )}

                    <Text style={[styles.sectionTitle, { marginTop: scale(24) }]}>📋 Requisitos</Text>
                    {renderConfigToggle(
                      'Escanear Identificación',
                      formData.require_id_scan,
                      'require_id_scan',
                      'Requiere escanear documento de identidad'
                    )}
                    {renderConfigToggle(
                      'Registrar Acompañantes',
                      formData.require_companion_count,
                      'require_companion_count',
                      'Requiere indicar número de acompañantes'
                    )}

                    <Text style={[styles.sectionTitle, { marginTop: scale(24) }]}>⚙️ Automatización</Text>
                    {renderConfigToggle(
                      'Auto-aprobar Pre-registrados',
                      formData.auto_approve_preregistered,
                      'auto_approve_preregistered',
                      'Visitantes con QR válido se aprueban automáticamente'
                    )}
                    {renderConfigToggle(
                      'Notificar al Residente',
                      formData.notify_resident_on_entry,
                      'notify_resident_on_entry',
                      'Enviar notificación al residente cuando entra su visita'
                    )}

                    <View style={styles.infoNote}>
                      <Ionicons name="information-circle" size={20} color={COLORS.teal} />
                      <Text style={styles.infoNoteText}>
                        Estas configuraciones aplican cuando el guardia usa la app para escanear QR manualmente.
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.hardwareSection}>
                      <Ionicons name="hardware-chip" size={48} color={COLORS.purple} />
                      <Text style={styles.hardwareTitle}>Hardware de Acceso</Text>
                      <Text style={styles.hardwareDescription}>
                        Vincula dispositivos PC o Raspberry Pi + ZKTeco para control de acceso automático.
                      </Text>
                    </View>

                    {editingGate ? (
                      <>
                        {/* Create Device Button */}
                        <TouchableOpacity 
                          style={styles.createDeviceButton}
                          onPress={() => setShowCreateDeviceModal(true)}
                        >
                          <Ionicons name="add-circle" size={20} color={COLORS.background} />
                          <Text style={styles.createDeviceButtonText}>Crear Dispositivo</Text>
                        </TouchableOpacity>

                        {editingGate.access_devices && editingGate.access_devices.length > 0 ? (
                          <>
                            <Text style={[styles.sectionTitle, { marginTop: scale(20) }]}>Dispositivos Vinculados</Text>
                            {editingGate.access_devices.map((device) => (
                              <View key={device.id} style={styles.deviceCard}>
                                <View style={styles.deviceInfo}>
                                  <Ionicons name="hardware-chip" size={24} color={device.is_active ? COLORS.success : COLORS.danger} />
                                  <View style={{ flex: 1, marginLeft: scale(12) }}>
                                    <Text style={styles.deviceName}>{device.device_name}</Text>
                                    <Text style={styles.deviceCode}>Código: {device.device_code}</Text>
                                    {device.last_seen_at && (
                                      <Text style={styles.deviceLastSeen}>
                                        Última conexión: {new Date(device.last_seen_at).toLocaleString()}
                                      </Text>
                                    )}
                                    <Text style={[styles.deviceStatus, { color: device.is_active ? COLORS.success : COLORS.danger }]}>
                                      {device.is_active ? '● En línea' : '○ Desconectado'}
                                    </Text>
                                  </View>
                                </View>
                                <View style={styles.deviceActions}>
                                  <TouchableOpacity
                                    style={styles.deviceActionButton}
                                    onPress={() => handleRegenerateSecret(device)}
                                  >
                                    <Ionicons name="refresh" size={16} color={COLORS.warning} />
                                    <Text style={[styles.deviceActionText, { color: COLORS.warning }]}>Regenerar</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={styles.deviceActionButton}
                                    onPress={() => handleDeleteDevice(device)}
                                  >
                                    <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                                    <Text style={[styles.deviceActionText, { color: COLORS.danger }]}>Eliminar</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ))}
                          </>
                        ) : (
                          <View style={styles.noDevicesContainer}>
                            <Ionicons name="cube-outline" size={40} color={COLORS.textMuted} />
                            <Text style={styles.noDevicesText}>No hay dispositivos vinculados</Text>
                            <Text style={styles.noDevicesSubtext}>
                              Crea un dispositivo para obtener las credenciales de configuración
                            </Text>
                          </View>
                        )}

                        <View style={[styles.infoNote, { backgroundColor: COLORS.purple + '15', marginTop: scale(20) }]}>
                          <Ionicons name="information-circle" size={20} color={COLORS.purple} />
                          <Text style={[styles.infoNoteText, { color: COLORS.purple }]}>
                            El hardware valida QR automáticamente. Si el QR es válido, siempre abre la puerta.
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.noDevicesContainer}>
                        <Ionicons name="save-outline" size={40} color={COLORS.textMuted} />
                        <Text style={styles.noDevicesText}>Guarda la puerta primero</Text>
                        <Text style={styles.noDevicesSubtext}>
                          Después podrás vincular dispositivos de hardware
                        </Text>
                      </View>
                    )}
                  </>
                )}
                
                <View style={{ height: 50 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>

          {/* Type Picker Inside Modal */}
          {showTypePicker && (
            <View style={styles.pickerOverlayModal}>
              <TouchableOpacity 
                style={styles.pickerOverlayBg} 
                onPress={() => setShowTypePicker(false)} 
                activeOpacity={1}
              />
              <View style={styles.pickerContent}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Tipo de Puerta</Text>
                  <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView>
                  {GATE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeItem,
                        type.id === formData.gate_type && styles.typeItemActive
                      ]}
                      onPress={() => {
                        setFormData({...formData, gate_type: type.id});
                        setShowTypePicker(false);
                      }}
                    >
                      <Ionicons 
                        name={type.icon} 
                        size={24} 
                        color={type.id === formData.gate_type ? COLORS.lime : COLORS.textSecondary} 
                      />
                      <Text style={[
                        styles.typeItemText,
                        type.id === formData.gate_type && styles.typeItemTextActive
                      ]}>
                        {type.label}
                      </Text>
                      {type.id === formData.gate_type && (
                        <Ionicons name="checkmark" size={20} color={COLORS.lime} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

          {/* Create Device Overlay Inside Modal */}
          {showCreateDeviceModal && (
            <View style={[styles.pickerOverlayModal, { justifyContent: 'center', paddingHorizontal: scale(20), paddingBottom: scale(120) }]}>
              <TouchableOpacity 
                style={styles.pickerOverlayBg} 
                onPress={() => {
                  setShowCreateDeviceModal(false);
                  setNewDeviceName('');
                }}
                activeOpacity={1}
              />
              <View style={styles.dialogContainer}>
                <View style={styles.dialogHeader}>
                  <Ionicons name="hardware-chip" size={32} color={COLORS.purple} />
                  <Text style={styles.dialogTitle}>Nuevo Dispositivo</Text>
                </View>
                
                <Text style={styles.dialogLabel}>Nombre del dispositivo</Text>
                <TextInput
                  style={styles.dialogInput}
                  value={newDeviceName}
                  onChangeText={setNewDeviceName}
                  placeholder="Ej: Raspberry Pi - Portón"
                  placeholderTextColor={COLORS.textMuted}
                  autoFocus
                />

                <View style={[styles.infoNote, { marginTop: scale(16) }]}>
                  <Ionicons name="warning" size={18} color={COLORS.warning} />
                  <Text style={[styles.infoNoteText, { color: COLORS.warning, fontSize: scale(12) }]}>
                    Las credenciales solo se mostrarán UNA VEZ. Guárdalas de forma segura.
                  </Text>
                </View>

                <View style={styles.dialogActions}>
                  <TouchableOpacity 
                    style={styles.dialogCancelButton}
                    onPress={() => {
                      setShowCreateDeviceModal(false);
                      setNewDeviceName('');
                    }}
                  >
                    <Text style={styles.dialogCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.dialogConfirmButton, creatingDevice && { opacity: 0.6 }]}
                    onPress={handleCreateDevice}
                    disabled={creatingDevice}
                  >
                    {creatingDevice ? (
                      <ActivityIndicator size="small" color={COLORS.background} />
                    ) : (
                      <Text style={styles.dialogConfirmText}>Crear</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Credentials Overlay Inside Modal - UPDATED with Download Config */}
          {showCredentialsModal && (
            <View style={styles.pickerOverlayModal}>
              <View style={[styles.dialogContainer, { maxHeight: '90%', width: '95%' }]}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.dialogHeader}>
                    <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
                    <Text style={styles.dialogTitle}>¡Dispositivo Creado!</Text>
                  </View>

                  <View style={[styles.infoNote, { backgroundColor: COLORS.danger + '15', marginBottom: scale(20) }]}>
                    <Ionicons name="alert-circle" size={20} color={COLORS.danger} />
                    <Text style={[styles.infoNoteText, { color: COLORS.danger }]}>
                      ⚠️ GUARDA ESTAS CREDENCIALES AHORA. No podrás verlas de nuevo.
                    </Text>
                  </View>

                  <Text style={styles.credentialLabel}>Device Code</Text>
                  <TouchableOpacity 
                    style={styles.credentialBox}
                    onPress={() => copyToClipboard(deviceCredentials?.device_code, 'Device Code')}
                  >
                    <Text style={styles.credentialValue}>{deviceCredentials?.device_code}</Text>
                    <Ionicons name="copy-outline" size={20} color={COLORS.teal} />
                  </TouchableOpacity>

                  <Text style={styles.credentialLabel}>Device Secret</Text>
                  <TouchableOpacity 
                    style={styles.credentialBox}
                    onPress={() => copyToClipboard(deviceCredentials?.device_secret, 'Device Secret')}
                  >
                    <Text style={[styles.credentialValue, { fontSize: scale(11) }]} numberOfLines={1}>
                      {deviceCredentials?.device_secret}
                    </Text>
                    <Ionicons name="copy-outline" size={20} color={COLORS.teal} />
                  </TouchableOpacity>

                  {/* Download Config Button */}
                  <TouchableOpacity
                    style={styles.downloadConfigButton}
                    onPress={handleDownloadConfig}
                  >
                    <Ionicons name="download-outline" size={22} color="#fff" />
                    <Text style={styles.downloadConfigButtonText}>Descargar config.json</Text>
                  </TouchableOpacity>

                  {/* Copy Config */}
                  <TouchableOpacity 
                    style={styles.copyAllButton}
                    onPress={() => copyToClipboard(generateFullConfigJson(), 'Config JSON completo')}
                  >
                    <Ionicons name="clipboard" size={18} color={COLORS.background} />
                    <Text style={styles.copyAllButtonText}>Copiar config.json</Text>
                  </TouchableOpacity>

                  {/* Tech Instructions */}
                  <View style={styles.techInstructionsContainer}>
                    <Text style={styles.techInstructionsTitle}>
                      📋 PASOS PARA EL TÉCNICO
                    </Text>
                    <Text style={styles.techInstructionsText}>
                      1. Enviar config.json a la PC o Raspberry Pi{'\n'}
                      2. Editar las IPs de los dispositivos ZKTeco{'\n'}
                      3. Windows → Ejecutar install-issy-agent.ps1{'\n'}
                         Raspberry Pi → sudo ./install-issy-agent.sh{'\n'}
                      4. Verificar conexión: node test-connection.js{'\n'}
                      5. Confirmar estado: pm2 logs issy-agent
                    </Text>
                  </View>

                  {/* Close Button */}
                  <TouchableOpacity 
                    style={[styles.dialogConfirmButton, { marginTop: scale(20), width: '100%' }]}
                    onPress={() => {
                      setShowCredentialsModal(false);
                      setDeviceCredentials(null);
                    }}
                  >
                    <Text style={styles.dialogConfirmText}>Entendido, ya guardé las credenciales</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Location Picker */}
      {showLocationPicker && (
        <View style={styles.pickerOverlay}>
          <TouchableOpacity 
            style={styles.pickerOverlayBg} 
            onPress={() => setShowLocationPicker(false)} 
          />
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
                    styles.typeItem,
                    loc.id === selectedLocationId && styles.typeItemActive
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
                    styles.typeItemText,
                    loc.id === selectedLocationId && styles.typeItemTextActive
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
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gateHeader: {
    flexDirection: 'row',
    marginBottom: scale(12),
  },
  gateIcon: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(14),
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
  gateType: {
    fontSize: scale(12),
    color: COLORS.teal,
    marginTop: scale(2),
  },
  gateDescription: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(4),
  },
  gateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(8),
    gap: scale(8),
    flexWrap: 'wrap',
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
  configSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
    marginBottom: scale(12),
  },
  configBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundTertiary,
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
    gap: scale(4),
  },
  configBadgeText: {
    fontSize: scale(10),
    color: COLORS.textSecondary,
  },
  gateStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: scale(12),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    marginBottom: scale(12),
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
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: scale(14),
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.lime,
  },
  tabText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  tabTextActive: {
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
  pickerButton: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  pickerButtonText: {
    fontSize: scale(15),
    color: COLORS.textPrimary,
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(12),
  },
  configItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    padding: scale(14),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  configTextContainer: {
    flex: 1,
    marginRight: scale(12),
  },
  configLabel: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  configDescription: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginTop: scale(4),
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
    justifyContent: 'flex-end',
  },
  pickerOverlayBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  pickerContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    padding: scale(20),
    maxHeight: '60%',
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
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(14),
    borderRadius: scale(10),
    marginBottom: scale(8),
    backgroundColor: COLORS.backgroundSecondary,
    gap: scale(12),
  },
  typeItemActive: {
    backgroundColor: COLORS.lime + '15',
    borderWidth: 1,
    borderColor: COLORS.lime,
  },
  typeItemText: {
    flex: 1,
    fontSize: scale(15),
    color: COLORS.textSecondary,
  },
  typeItemTextActive: {
    color: COLORS.lime,
    fontWeight: '600',
  },
  pickerOverlayModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  hardwareSection: {
    alignItems: 'center',
    paddingVertical: scale(30),
  },
  hardwareTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: scale(12),
  },
  hardwareDescription: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: scale(8),
    paddingHorizontal: scale(20),
  },
  deviceCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceName: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  deviceCode: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginTop: scale(2),
  },
  deviceStatus: {
    fontSize: scale(12),
    marginTop: scale(4),
  },
  noDevicesContainer: {
    alignItems: 'center',
    paddingVertical: scale(40),
  },
  noDevicesText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: scale(12),
  },
  noDevicesSubtext: {
    fontSize: scale(13),
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: scale(8),
    paddingHorizontal: scale(20),
  },
  createDeviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purple,
    paddingVertical: scale(14),
    borderRadius: scale(12),
    gap: scale(8),
  },
  createDeviceButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.background,
  },
  deviceLastSeen: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    marginTop: scale(2),
  },
  deviceActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: scale(12),
    paddingTop: scale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: scale(16),
  },
  deviceActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingVertical: scale(6),
    paddingHorizontal: scale(10),
  },
  deviceActionText: {
    fontSize: scale(13),
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  dialogContainer: {
    backgroundColor: COLORS.background,
    borderRadius: scale(16),
    padding: scale(24),
    width: '100%',
    maxWidth: scale(400),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dialogHeader: {
    alignItems: 'center',
    marginBottom: scale(20),
  },
  dialogTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: scale(12),
  },
  dialogLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: scale(8),
  },
  dialogInput: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    fontSize: scale(15),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dialogActions: {
    flexDirection: 'row',
    marginTop: scale(24),
    gap: scale(12),
  },
  dialogCancelButton: {
    flex: 1,
    paddingVertical: scale(14),
    borderRadius: scale(10),
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
  },
  dialogCancelText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dialogConfirmButton: {
    flex: 1,
    paddingVertical: scale(14),
    borderRadius: scale(10),
    backgroundColor: COLORS.lime,
    alignItems: 'center',
  },
  dialogConfirmText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.background,
  },
  credentialLabel: {
    fontSize: scale(12),
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: scale(6),
    marginTop: scale(12),
  },
  credentialBox: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    padding: scale(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  credentialValue: {
    flex: 1,
    fontSize: scale(14),
    color: COLORS.textPrimary,
    fontWeight: '500',
    marginRight: scale(10),
  },
  downloadConfigButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.teal,
    paddingVertical: scale(14),
    borderRadius: scale(12),
    marginTop: scale(20),
    gap: scale(8),
  },
  downloadConfigButtonText: {
    fontSize: scale(16),
    fontWeight: '700',
    color: '#fff',
  },
  copyAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purple,
    paddingVertical: scale(12),
    borderRadius: scale(10),
    marginTop: scale(10),
    gap: scale(8),
  },
  copyAllButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: '#fff',
  },
  techInstructionsContainer: {
    marginTop: scale(20),
    padding: scale(16),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  techInstructionsTitle: {
    color: COLORS.textSecondary,
    fontSize: scale(13),
    fontWeight: '700',
    marginBottom: scale(8),
  },
  techInstructionsText: {
    color: COLORS.textMuted,
    fontSize: scale(12),
    lineHeight: scale(20),
  },
});