// app/admin/devices.js
// ISSY SuperApp - Admin: Gestión de Dispositivos de Acceso (Hardware)
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
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';

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

const DEVICE_TYPES = [
  { id: 'gate', name: 'Portón', icon: 'car-outline' },
  { id: 'door', name: 'Puerta', icon: 'door-outline' },
  { id: 'parking', name: 'Parqueo', icon: 'car-sport-outline' },
  { id: 'turnstile', name: 'Torniquete', icon: 'enter-outline' },
];

export default function AdminDevices() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const router = useRouter();
  
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [newDeviceCredentials, setNewDeviceCredentials] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    device_code: '',
    device_name: '',
    device_type: 'gate',
    is_entry: true,
    is_exit: false,
    relay_number: '1',
    pulse_duration_ms: '200',
    notes: '',
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
      fetchDevices();
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

  const fetchDevices = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${API_URL}/hardware/devices?location_id=${selectedLocationId}`,
        { headers }
      );
      const data = await res.json();
      
      if (data.success) {
        setDevices(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDevices();
  }, [selectedLocationId]);

  const generateDeviceCode = () => {
    const prefix = formData.device_type.toUpperCase().substring(0, 4);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${random}`;
  };

  const handleOpenCreateModal = () => {
    setEditingDevice(null);
    const newCode = generateDeviceCode();
    setFormData({
      device_code: newCode,
      device_name: '',
      device_type: 'gate',
      is_entry: true,
      is_exit: false,
      relay_number: '1',
      pulse_duration_ms: '200',
      notes: '',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (device) => {
    setEditingDevice(device);
    setFormData({
      device_code: device.device_code,
      device_name: device.device_name,
      device_type: device.device_type || 'gate',
      is_entry: device.is_entry,
      is_exit: device.is_exit,
      relay_number: String(device.relay_number || 1),
      pulse_duration_ms: String(device.pulse_duration_ms || 200),
      notes: device.notes || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDevice(null);
  };

  const handleSubmit = async () => {
    if (!formData.device_name.trim()) {
      Alert.alert('Error', 'El nombre del dispositivo es requerido');
      return;
    }
    if (!formData.device_code.trim()) {
      Alert.alert('Error', 'El código del dispositivo es requerido');
      return;
    }

    setFormLoading(true);
    try {
      const headers = await getAuthHeaders();
      const payload = {
        device_code: formData.device_code.trim(),
        device_name: formData.device_name.trim(),
        device_type: formData.device_type,
        is_entry: formData.is_entry,
        is_exit: formData.is_exit,
        relay_number: parseInt(formData.relay_number) || 1,
        pulse_duration_ms: parseInt(formData.pulse_duration_ms) || 200,
        notes: formData.notes.trim() || null,
        location_id: selectedLocationId,
      };
      
      if (editingDevice) {
        const response = await fetch(`${API_URL}/hardware/devices/${editingDevice.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
        
        if (response.ok) {
          Alert.alert('Éxito', 'Dispositivo actualizado correctamente');
          handleCloseModal();
          fetchDevices();
        } else {
          const data = await response.json();
          Alert.alert('Error', data.error || 'Error al actualizar dispositivo');
        }
      } else {
        const response = await fetch(`${API_URL}/hardware/devices`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          handleCloseModal();
          // Mostrar credenciales del nuevo dispositivo
          setNewDeviceCredentials({
            device_code: data.data.device_code,
            device_secret: data.data.device_secret,
            device_name: data.data.device_name,
          });
          setShowCredentialsModal(true);
          fetchDevices();
        } else {
          Alert.alert('Error', data.error || 'Error al crear dispositivo');
        }
      }
    } catch (error) {
      console.error('Error saving device:', error);
      Alert.alert('Error', 'Error al guardar dispositivo');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (device) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/hardware/devices/${device.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_active: !device.is_active }),
      });
      
      if (response.ok) {
        fetchDevices();
      }
    } catch (error) {
      console.error('Error toggling device:', error);
    }
  };

  const handleDelete = async (device) => {
    Alert.alert(
      'Eliminar Dispositivo',
      `¿Estás seguro de eliminar "${device.device_name}"? Esta acción no se puede deshacer.`,
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
              
              if (response.ok) {
                Alert.alert('Éxito', 'Dispositivo eliminado');
                fetchDevices();
              }
            } catch (error) {
              console.error('Error deleting device:', error);
              Alert.alert('Error', 'Error al eliminar dispositivo');
            }
          },
        },
      ]
    );
  };

  const handleRegenerateSecret = async (device) => {
    Alert.alert(
      'Regenerar Secret',
      'El dispositivo dejará de funcionar hasta que actualices las credenciales en la Raspberry Pi. ¿Continuar?',
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
                setNewDeviceCredentials({
                  device_code: device.device_code,
                  device_secret: data.data.device_secret,
                  device_name: device.device_name,
                });
                setShowCredentialsModal(true);
              } else {
                Alert.alert('Error', data.error || 'Error al regenerar secret');
              }
            } catch (error) {
              console.error('Error regenerating secret:', error);
              Alert.alert('Error', 'Error al regenerar secret');
            }
          },
        },
      ]
    );
  };

  const copyToClipboard = async (text, label) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copiado', `${label} copiado al portapapeles`);
  };

  const shareCredentials = async () => {
    if (!newDeviceCredentials) return;
    
    const message = `ISSY Gate Controller - Credenciales\n\nDispositivo: ${newDeviceCredentials.device_name}\nCódigo: ${newDeviceCredentials.device_code}\nSecret: ${newDeviceCredentials.device_secret}\n\nConfigura estos valores en issy_config.json`;
    
    try {
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getDeviceStatus = (device) => {
    if (!device.is_active) {
      return { status: 'inactive', color: COLORS.textMuted, text: 'Inactivo' };
    }
    
    if (!device.last_seen_at) {
      return { status: 'never', color: COLORS.warning, text: 'Sin conexión' };
    }
    
    const lastSeen = new Date(device.last_seen_at);
    const now = new Date();
    const diffMinutes = (now - lastSeen) / 1000 / 60;
    
    if (diffMinutes < 10) {
      return { status: 'online', color: COLORS.success, text: 'En línea' };
    } else if (diffMinutes < 60) {
      return { status: 'recent', color: COLORS.warning, text: `Hace ${Math.round(diffMinutes)} min` };
    } else {
      return { status: 'offline', color: COLORS.danger, text: 'Desconectado' };
    }
  };

  const getDeviceTypeInfo = (type) => {
    return DEVICE_TYPES.find(t => t.id === type) || DEVICE_TYPES[0];
  };

  const renderDevice = (device) => {
    const status = getDeviceStatus(device);
    const typeInfo = getDeviceTypeInfo(device.device_type);
    
    return (
      <View key={device.id} style={styles.deviceCard}>
        <View style={styles.deviceHeader}>
          <View style={styles.deviceIcon}>
            <Ionicons name={typeInfo.icon} size={scale(24)} color={COLORS.lime} />
          </View>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>{device.device_name}</Text>
            <Text style={styles.deviceCode}>{device.device_code}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
          </View>
        </View>
        
        <View style={styles.deviceDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="git-branch-outline" size={scale(14)} color={COLORS.textMuted} />
            <Text style={styles.detailText}>Relay {device.relay_number}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons 
              name={device.is_entry ? 'enter-outline' : 'exit-outline'} 
              size={scale(14)} 
              color={COLORS.textMuted} 
            />
            <Text style={styles.detailText}>
              {device.is_entry && device.is_exit ? 'Entrada/Salida' : device.is_entry ? 'Entrada' : 'Salida'}
            </Text>
          </View>
          {device.last_ip && (
            <View style={styles.detailItem}>
              <Ionicons name="wifi-outline" size={scale(14)} color={COLORS.textMuted} />
              <Text style={styles.detailText}>{device.last_ip}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.deviceActions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => handleOpenEditModal(device)}
          >
            <Ionicons name="pencil-outline" size={scale(18)} color={COLORS.teal} />
            <Text style={[styles.actionButtonText, { color: COLORS.teal }]}>Editar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => handleRegenerateSecret(device)}
          >
            <Ionicons name="key-outline" size={scale(18)} color={COLORS.warning} />
            <Text style={[styles.actionButtonText, { color: COLORS.warning }]}>Secret</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => handleToggleActive(device)}
          >
            <Ionicons 
              name={device.is_active ? 'pause-circle-outline' : 'play-circle-outline'} 
              size={scale(18)} 
              color={device.is_active ? COLORS.warning : COLORS.success} 
            />
            <Text style={[styles.actionButtonText, { color: device.is_active ? COLORS.warning : COLORS.success }]}>
              {device.is_active ? 'Pausar' : 'Activar'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => handleDelete(device)}
          >
            <Ionicons name="trash-outline" size={scale(18)} color={COLORS.danger} />
            <Text style={[styles.actionButtonText, { color: COLORS.danger }]}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderLocationPicker = () => (
    <Modal visible={showLocationPicker} transparent animationType="slide">
      <TouchableWithoutFeedback onPress={() => setShowLocationPicker(false)}>
        <View style={styles.pickerOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.pickerContent}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Seleccionar Ubicación</Text>
                <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                  <Ionicons name="close" size={scale(24)} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {locations.map((loc) => (
                  <TouchableOpacity
                    key={loc.id}
                    style={[
                      styles.locationItem,
                      selectedLocationId === loc.id && styles.locationItemActive,
                    ]}
                    onPress={() => {
                      setSelectedLocationId(loc.id);
                      setShowLocationPicker(false);
                    }}
                  >
                    <Ionicons
                      name="location"
                      size={scale(20)}
                      color={selectedLocationId === loc.id ? COLORS.lime : COLORS.textMuted}
                    />
                    <Text
                      style={[
                        styles.locationItemText,
                        selectedLocationId === loc.id && styles.locationItemTextActive,
                      ]}
                    >
                      {loc.name}
                    </Text>
                    {selectedLocationId === loc.id && (
                      <Ionicons name="checkmark" size={scale(20)} color={COLORS.lime} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const renderCredentialsModal = () => (
    <Modal visible={showCredentialsModal} transparent animationType="fade">
      <View style={styles.credentialsOverlay}>
        <View style={styles.credentialsContent}>
          <View style={styles.credentialsIcon}>
            <Ionicons name="key" size={scale(40)} color={COLORS.lime} />
          </View>
          
          <Text style={styles.credentialsTitle}>Credenciales del Dispositivo</Text>
          <Text style={styles.credentialsSubtitle}>
            Guarda estas credenciales. El secret solo se muestra una vez.
          </Text>
          
          {newDeviceCredentials && (
            <View style={styles.credentialsBox}>
              <View style={styles.credentialItem}>
                <Text style={styles.credentialLabel}>Dispositivo</Text>
                <Text style={styles.credentialValue}>{newDeviceCredentials.device_name}</Text>
              </View>
              
              <View style={styles.credentialItem}>
                <Text style={styles.credentialLabel}>Código</Text>
                <View style={styles.credentialRow}>
                  <Text style={styles.credentialValueMono}>{newDeviceCredentials.device_code}</Text>
                  <TouchableOpacity onPress={() => copyToClipboard(newDeviceCredentials.device_code, 'Código')}>
                    <Ionicons name="copy-outline" size={scale(20)} color={COLORS.teal} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.credentialItem}>
                <Text style={styles.credentialLabel}>Secret</Text>
                <View style={styles.credentialRow}>
                  <Text style={styles.credentialValueMono}>{newDeviceCredentials.device_secret}</Text>
                  <TouchableOpacity onPress={() => copyToClipboard(newDeviceCredentials.device_secret, 'Secret')}>
                    <Ionicons name="copy-outline" size={scale(20)} color={COLORS.teal} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          
          <View style={styles.credentialsActions}>
            <TouchableOpacity style={styles.shareButton} onPress={shareCredentials}>
              <Ionicons name="share-outline" size={scale(20)} color={COLORS.background} />
              <Text style={styles.shareButtonText}>Compartir</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.closeCredentialsButton} 
              onPress={() => {
                setShowCredentialsModal(false);
                setNewDeviceCredentials(null);
              }}
            >
              <Text style={styles.closeCredentialsText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderFormModal = () => (
    <Modal visible={showModal} animationType="slide">
      <SafeAreaView style={styles.modalContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleCloseModal} disabled={formLoading}>
                  <Text style={styles.modalCancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {editingDevice ? 'Editar Dispositivo' : 'Nuevo Dispositivo'}
                </Text>
                <TouchableOpacity onPress={handleSubmit} disabled={formLoading}>
                  {formLoading ? (
                    <ActivityIndicator color={COLORS.lime} />
                  ) : (
                    <Text style={styles.modalSave}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent}>
                <Text style={styles.inputLabel}>Nombre del Dispositivo *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.device_name}
                  onChangeText={(text) => setFormData({ ...formData, device_name: text })}
                  placeholder="Ej: Entrada Principal"
                  placeholderTextColor={COLORS.textMuted}
                />
                
                <Text style={styles.inputLabel}>Código del Dispositivo *</Text>
                <View style={styles.codeInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={formData.device_code}
                    onChangeText={(text) => setFormData({ ...formData, device_code: text.toUpperCase() })}
                    placeholder="GATE-XXXX"
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="characters"
                    editable={!editingDevice}
                  />
                  {!editingDevice && (
                    <TouchableOpacity 
                      style={styles.generateButton}
                      onPress={() => setFormData({ ...formData, device_code: generateDeviceCode() })}
                    >
                      <Ionicons name="refresh" size={scale(20)} color={COLORS.background} />
                    </TouchableOpacity>
                  )}
                </View>
                
                <Text style={styles.inputLabel}>Tipo de Dispositivo</Text>
                <View style={styles.typeSelector}>
                  {DEVICE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeOption,
                        formData.device_type === type.id && styles.typeOptionActive,
                      ]}
                      onPress={() => setFormData({ ...formData, device_type: type.id })}
                    >
                      <Ionicons 
                        name={type.icon} 
                        size={scale(20)} 
                        color={formData.device_type === type.id ? COLORS.background : COLORS.textSecondary} 
                      />
                      <Text style={[
                        styles.typeOptionText,
                        formData.device_type === type.id && styles.typeOptionTextActive,
                      ]}>
                        {type.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.inputLabel}>Función</Text>
                <View style={styles.checkboxRow}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setFormData({ ...formData, is_entry: !formData.is_entry })}
                  >
                    <Ionicons 
                      name={formData.is_entry ? 'checkbox' : 'square-outline'} 
                      size={scale(24)} 
                      color={formData.is_entry ? COLORS.lime : COLORS.textMuted} 
                    />
                    <Text style={styles.checkboxLabel}>Entrada</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setFormData({ ...formData, is_exit: !formData.is_exit })}
                  >
                    <Ionicons 
                      name={formData.is_exit ? 'checkbox' : 'square-outline'} 
                      size={scale(24)} 
                      color={formData.is_exit ? COLORS.lime : COLORS.textMuted} 
                    />
                    <Text style={styles.checkboxLabel}>Salida</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Número de Relay</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.relay_number}
                      onChangeText={(text) => setFormData({ ...formData, relay_number: text })}
                      keyboardType="number-pad"
                      placeholder="1-4"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                  <View style={{ width: scale(16) }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Duración Pulso (ms)</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.pulse_duration_ms}
                      onChangeText={(text) => setFormData({ ...formData, pulse_duration_ms: text })}
                      keyboardType="number-pad"
                      placeholder="200"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                </View>
                
                <Text style={styles.inputLabel}>Notas</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  placeholder="Notas adicionales..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                />
                
                <View style={styles.infoNote}>
                  <Ionicons name="information-circle" size={scale(20)} color={COLORS.teal} />
                  <Text style={styles.infoNoteText}>
                    Al crear el dispositivo recibirás un código secreto (secret) que deberás configurar en la Raspberry Pi.
                  </Text>
                </View>
                
                <View style={{ height: scale(40) }} />
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
        </View>
      </SafeAreaView>
    );
  }

  const currentLocation = locations.find(l => l.id === selectedLocationId);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={scale(24)} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispositivos de Acceso</Text>
        <TouchableOpacity onPress={handleOpenCreateModal} style={styles.addButton}>
          <Ionicons name="add" size={scale(24)} color={COLORS.background} />
        </TouchableOpacity>
      </View>
      
      {/* Location Selector (SuperAdmin) */}
      {isSuperAdminUser && locations.length > 0 && (
        <TouchableOpacity
          style={styles.locationSelector}
          onPress={() => setShowLocationPicker(true)}
        >
          <Ionicons name="location" size={scale(18)} color={COLORS.lime} />
          <Text style={styles.locationSelectorText}>
            {currentLocation?.name || 'Seleccionar ubicación'}
          </Text>
          <Ionicons name="chevron-down" size={scale(18)} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}
      
      {/* Devices List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.lime}
          />
        }
      >
        {devices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="hardware-chip-outline" size={scale(60)} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Sin dispositivos</Text>
            <Text style={styles.emptySubtitle}>
              Agrega una Raspberry Pi o lector ZKTeco para control de acceso
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleOpenCreateModal}>
              <Ionicons name="add" size={scale(20)} color={COLORS.background} />
              <Text style={styles.emptyButtonText}>Agregar Dispositivo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {devices.map(renderDevice)}
            <View style={{ height: scale(20) }} />
          </>
        )}
      </ScrollView>
      
      {renderFormModal()}
      {renderLocationPicker()}
      {renderCredentialsModal()}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: scale(4),
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  addButton: {
    backgroundColor: COLORS.lime,
    borderRadius: scale(8),
    padding: scale(6),
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(12),
    gap: scale(8),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  locationSelectorText: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: scale(16),
  },
  deviceCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  deviceIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(10),
    backgroundColor: COLORS.lime + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  deviceCode: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginTop: scale(2),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(20),
    gap: scale(6),
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
  deviceDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
    paddingVertical: scale(12),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  detailText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  deviceActions: {
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
    paddingHorizontal: scale(20),
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
    height: scale(80),
    textAlignVertical: 'top',
  },
  codeInputRow: {
    flexDirection: 'row',
    gap: scale(8),
  },
  generateButton: {
    backgroundColor: COLORS.lime,
    borderRadius: scale(10),
    padding: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    borderRadius: scale(8),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeOptionActive: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  typeOptionText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  typeOptionTextActive: {
    color: COLORS.background,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: scale(24),
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  checkboxLabel: {
    fontSize: scale(15),
    color: COLORS.textPrimary,
  },
  row: {
    flexDirection: 'row',
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
  credentialsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(20),
  },
  credentialsContent: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(16),
    padding: scale(24),
    width: '100%',
    maxWidth: scale(340),
  },
  credentialsIcon: {
    alignSelf: 'center',
    width: scale(70),
    height: scale(70),
    borderRadius: scale(35),
    backgroundColor: COLORS.lime + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  credentialsTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  credentialsSubtitle: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: scale(8),
    marginBottom: scale(20),
  },
  credentialsBox: {
    backgroundColor: COLORS.background,
    borderRadius: scale(10),
    padding: scale(16),
  },
  credentialItem: {
    marginBottom: scale(16),
  },
  credentialLabel: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginBottom: scale(4),
  },
  credentialValue: {
    fontSize: scale(15),
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  credentialValueMono: {
    fontSize: scale(14),
    color: COLORS.lime,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  credentialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  credentialsActions: {
    marginTop: scale(20),
    gap: scale(12),
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    paddingVertical: scale(14),
    borderRadius: scale(10),
    gap: scale(8),
  },
  shareButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.background,
  },
  closeCredentialsButton: {
    alignItems: 'center',
    paddingVertical: scale(12),
  },
  closeCredentialsText: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
  },
});