// app/admin/access-control-config.js
// ISSY - Admin: Configuración de Control de Acceso ZKTeco
// Allows admins to register devices, configure integration, view sync status

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

const DEVICE_MODELS = [
  { key: 'TF1700', label: 'TF1700', desc: 'Lector de tarjetas RFID' },
  { key: 'inBio160', label: 'inBio 160', desc: 'Panel de control 1 puerta' },
  { key: 'inBio260', label: 'inBio 260', desc: 'Panel de control 2 puertas' },
  { key: 'C3-200', label: 'C3-200', desc: 'Panel de control 2 puertas' },
  { key: 'SpeedFace', label: 'SpeedFace', desc: 'Terminal facial + tarjeta' },
  { key: 'other', label: 'Otro', desc: 'Modelo personalizado' },
];

export default function AccessControlConfig() {
  const { user, profile, isSuperAdmin } = useAuth();
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('devices');

  // Location
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // ZK Devices
  const [devices, setDevices] = useState([]);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [deviceForm, setDeviceForm] = useState({
    device_name: '',
    device_model: 'TF1700',
    ip_address: '',
    port: '4370',
    serial_number: '',
    zone_id: null,
  });
  const [savingDevice, setSavingDevice] = useState(false);

  // Access Zones
  const [zones, setZones] = useState([]);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [zoneForm, setZoneForm] = useState({ zone_name: '', zone_type: 'gate', description: '' });
  const [savingZone, setSavingZone] = useState(false);

  // Sync Commands
  const [syncCommands, setSyncCommands] = useState([]);
  const [loadingSync, setLoadingSync] = useState(false);

  // Dashboard
  const [dashboard, setDashboard] = useState(null);

  // Integration Config
  const [integrationConfig, setIntegrationConfig] = useState(null);

  const userRole = profile?.role || user?.role || 'user';
  const userLocationId = profile?.location_id || user?.location_id;
  const isAdmin = ['admin', 'superadmin'].includes(userRole);
  const isSuperAdminUser = userRole === 'superadmin' || isSuperAdmin?.();

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Acceso Denegado', 'No tenés permisos para esta sección');
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
      loadAllData();
    }
  }, [selectedLocationId]);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
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
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchDevices(),
      fetchZones(),
      fetchDashboard(),
      fetchSyncCommands(),
      fetchIntegration(),
    ]);
    setLoading(false);
  };

  const fetchDevices = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/access-control/zk-devices?location_id=${selectedLocationId}`, { headers });
      const data = await res.json();
      setDevices(data.success ? (data.data || []) : []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      setDevices([]);
    }
  };

  const fetchZones = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/access-control/zones?location_id=${selectedLocationId}`, { headers });
      const data = await res.json();
      setZones(data.success ? (data.data || []) : []);
    } catch (error) {
      console.error('Error fetching zones:', error);
      setZones([]);
    }
  };

  const fetchDashboard = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/access-control/dashboard?location_id=${selectedLocationId}`, { headers });
      const data = await res.json();
      setDashboard(data.success ? data.data : null);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  const fetchSyncCommands = async () => {
    setLoadingSync(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/access-control/sync/commands?location_id=${selectedLocationId}&limit=30`, { headers });
      const data = await res.json();
      setSyncCommands(data.success ? (data.data || []) : []);
    } catch (error) {
      console.error('Error fetching sync:', error);
      setSyncCommands([]);
    } finally {
      setLoadingSync(false);
    }
  };

  const fetchIntegration = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/access-control/integration?location_id=${selectedLocationId}`, { headers });
      const data = await res.json();
      setIntegrationConfig(data.success ? data.data : null);
    } catch (error) {
      console.error('Error fetching integration:', error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllData().finally(() => setRefreshing(false));
  }, [selectedLocationId]);

  // ========== DEVICE CRUD ==========
  const openAddDevice = () => {
    setEditingDevice(null);
    setDeviceForm({ device_name: '', device_model: 'TF1700', ip_address: '', port: '4370', serial_number: '', zone_id: null });
    setShowDeviceModal(true);
  };

  const openEditDevice = (device) => {
    setEditingDevice(device);
    setDeviceForm({
      device_name: device.device_name || '',
      device_model: device.device_model || 'TF1700',
      ip_address: device.ip_address || '',
      port: String(device.port || '4370'),
      serial_number: device.serial_number || '',
      zone_id: device.zone_id || null,
    });
    setShowDeviceModal(true);
  };

  const saveDevice = async () => {
    if (!deviceForm.device_name.trim()) return Alert.alert('Error', 'Nombre es requerido');
    if (!deviceForm.ip_address.trim()) return Alert.alert('Error', 'IP es requerida');

    setSavingDevice(true);
    try {
      const headers = await getAuthHeaders();
      const body = {
        ...deviceForm,
        location_id: selectedLocationId,
        port: parseInt(deviceForm.port) || 4370,
      };
      const url = editingDevice
        ? `${API_URL}/access-control/zk-devices/${editingDevice.id}`
        : `${API_URL}/access-control/zk-devices`;
      const method = editingDevice ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        Alert.alert('✅', editingDevice ? 'Dispositivo actualizado' : 'Dispositivo registrado');
        setShowDeviceModal(false);
        fetchDevices();
        fetchDashboard();
      } else {
        Alert.alert('Error', data.error || 'No se pudo guardar');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el dispositivo');
    } finally {
      setSavingDevice(false);
    }
  };

  const deleteDevice = (device) => {
    Alert.alert('Eliminar Dispositivo', `¿Eliminar "${device.device_name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_URL}/access-control/zk-devices/${device.id}`, { method: 'DELETE', headers });
            const data = await res.json();
            if (data.success) {
              Alert.alert('✅', 'Dispositivo eliminado');
              fetchDevices();
              fetchDashboard();
            } else {
              Alert.alert('Error', data.error || 'No se pudo eliminar');
            }
          } catch (error) {
            Alert.alert('Error', 'No se pudo eliminar');
          }
        },
      },
    ]);
  };

  const forceSyncDevice = async (device) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/access-control/zk-devices/${device.id}/sync`, {
        method: 'POST', headers,
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('✅', `Sincronización forzada: ${data.data?.commands_created || 0} comandos creados`);
        fetchSyncCommands();
      } else {
        Alert.alert('Error', data.error || 'No se pudo forzar sync');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo forzar sync');
    }
  };

  // ========== ZONE CRUD ==========
  const saveZone = async () => {
    if (!zoneForm.zone_name.trim()) return Alert.alert('Error', 'Nombre es requerido');
    setSavingZone(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/access-control/zones`, {
        method: 'POST', headers,
        body: JSON.stringify({ ...zoneForm, location_id: selectedLocationId }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('✅', 'Zona creada');
        setShowZoneModal(false);
        setZoneForm({ zone_name: '', zone_type: 'gate', description: '' });
        fetchZones();
      } else {
        Alert.alert('Error', data.error || 'No se pudo crear');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la zona');
    } finally {
      setSavingZone(false);
    }
  };

  const deleteZone = (zone) => {
    Alert.alert('Eliminar Zona', `¿Eliminar "${zone.zone_name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            const headers = await getAuthHeaders();
            await fetch(`${API_URL}/access-control/zones/${zone.id}`, { method: 'DELETE', headers });
            fetchZones();
          } catch (error) {
            Alert.alert('Error', 'No se pudo eliminar');
          }
        },
      },
    ]);
  };

  // ========== RETRY FAILED ==========
  const retryFailed = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/access-control/sync/retry`, {
        method: 'POST', headers,
        body: JSON.stringify({ location_id: selectedLocationId }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('✅', `${data.data?.requeued || 0} comandos reintentados`);
        fetchSyncCommands();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo reintentar');
    }
  };

  // ========== HELPERS ==========
  const getSelectedLocation = () => locations.find(l => l.id === selectedLocationId);

  const getSyncIcon = (status) => {
    const map = {
      pending: { icon: 'time', color: COLORS.warning },
      processing: { icon: 'sync', color: COLORS.cyan },
      completed: { icon: 'checkmark-circle', color: COLORS.success },
      failed: { icon: 'close-circle', color: COLORS.danger },
    };
    return map[status] || { icon: 'help-circle', color: COLORS.textMuted };
  };

  const getZoneIcon = (type) => {
    const map = { gate: 'business', door: 'log-in', parking: 'car', elevator: 'arrow-up', pool: 'water', gym: 'fitness' };
    return map[type] || 'location';
  };

  // ========== RENDER ==========
  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
          <Text style={s.loadingText}>Cargando configuración...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Control de Acceso</Text>
          {isSuperAdminUser && getSelectedLocation() && (
            <TouchableOpacity onPress={() => setShowLocationPicker(true)}>
              <Text style={s.headerSub}>{getSelectedLocation()?.name} ▾</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={onRefresh} style={s.backBtn}>
          <Ionicons name="refresh" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Dashboard Stats */}
      {dashboard && (
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={[s.statVal, { color: COLORS.success }]}>{dashboard.credentials?.active || 0}</Text>
            <Text style={s.statLbl}>Tarjetas</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statVal, { color: COLORS.cyan }]}>{dashboard.devices?.total || 0}</Text>
            <Text style={s.statLbl}>Dispositivos</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statVal, { color: COLORS.warning }]}>{dashboard.sync?.pending || 0}</Text>
            <Text style={s.statLbl}>Pendientes</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statVal, { color: COLORS.purple }]}>{dashboard.access_today || 0}</Text>
            <Text style={s.statLbl}>Hoy</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={s.tabsRow}>
        {[
          { key: 'devices', label: 'Dispositivos', icon: 'hardware-chip' },
          { key: 'zones', label: 'Zonas', icon: 'map' },
          { key: 'sync', label: 'Sync', icon: 'cloud-upload' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? COLORS.lime : COLORS.textSecondary} />
            <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={s.content}
        contentContainerStyle={{ paddingBottom: scale(40) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.lime} />}
      >
        {/* ===== DEVICES TAB ===== */}
        {activeTab === 'devices' && (
          <>
            <TouchableOpacity style={s.addButton} onPress={openAddDevice}>
              <Ionicons name="add-circle" size={22} color={COLORS.background} />
              <Text style={s.addButtonText}>Registrar Dispositivo ZKTeco</Text>
            </TouchableOpacity>

            {devices.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="hardware-chip-outline" size={60} color={COLORS.textMuted} />
                <Text style={s.emptyTitle}>Sin dispositivos</Text>
                <Text style={s.emptySub}>Registrá tu primer dispositivo ZKTeco para comenzar</Text>
              </View>
            ) : (
              devices.map(device => (
                <View key={device.id} style={s.deviceCard}>
                  <View style={s.deviceTop}>
                    <View style={[s.deviceIcon, { backgroundColor: device.is_active ? COLORS.success + '20' : COLORS.danger + '20' }]}>
                      <Ionicons name="hardware-chip" size={22} color={device.is_active ? COLORS.success : COLORS.danger} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.deviceName}>{device.device_name}</Text>
                      <Text style={s.deviceModel}>{device.device_model} • {device.ip_address}:{device.port}</Text>
                      {device.serial_number ? <Text style={s.deviceSerial}>S/N: {device.serial_number}</Text> : null}
                    </View>
                    <View style={[s.statusDot, { backgroundColor: device.is_active ? COLORS.success : COLORS.danger }]} />
                  </View>

                  <View style={s.deviceActions}>
                    <TouchableOpacity style={[s.devBtn, { borderColor: COLORS.teal }]} onPress={() => openEditDevice(device)}>
                      <Ionicons name="pencil" size={14} color={COLORS.teal} />
                      <Text style={[s.devBtnText, { color: COLORS.teal }]}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.devBtn, { borderColor: COLORS.cyan }]} onPress={() => forceSyncDevice(device)}>
                      <Ionicons name="sync" size={14} color={COLORS.cyan} />
                      <Text style={[s.devBtnText, { color: COLORS.cyan }]}>Sync</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.devBtn, { borderColor: COLORS.danger }]} onPress={() => deleteDevice(device)}>
                      <Ionicons name="trash" size={14} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {/* Integration info box */}
            <View style={{ marginTop: scale(20), padding: scale(14), borderRadius: scale(12), backgroundColor: COLORS.backgroundSecondary, borderWidth: 1, borderColor: COLORS.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: scale(8) }}>
                <Ionicons name="server" size={18} color={COLORS.teal} />
                <Text style={{ fontSize: scale(14), fontWeight: '600', color: COLORS.textPrimary }}>¿Cómo funciona?</Text>
              </View>
              <Text style={{ fontSize: scale(12), color: COLORS.textSecondary, lineHeight: scale(18) }}>
                1. Registrá tus dispositivos ZKTeco (TF1700, inBio, etc.){'\n'}
                2. Creá zonas de acceso (portón, puerta, parking){'\n'}
                3. Asigná tarjetas a residentes desde Gestión de Miembros{'\n'}
                4. El Raspberry Pi sincroniza automáticamente las tarjetas con los dispositivos{'\n'}
                5. Los eventos de acceso se registran en tiempo real
              </Text>
            </View>
          </>
        )}

        {/* ===== ZONES TAB ===== */}
        {activeTab === 'zones' && (
          <>
            <TouchableOpacity style={s.addButton} onPress={() => {
              setZoneForm({ zone_name: '', zone_type: 'gate', description: '' });
              setShowZoneModal(true);
            }}>
              <Ionicons name="add-circle" size={22} color={COLORS.background} />
              <Text style={s.addButtonText}>Crear Zona de Acceso</Text>
            </TouchableOpacity>

            {zones.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="map-outline" size={60} color={COLORS.textMuted} />
                <Text style={s.emptyTitle}>Sin zonas</Text>
                <Text style={s.emptySub}>Creá zonas como "Portón Principal", "Parking", etc.</Text>
              </View>
            ) : (
              zones.map(zone => (
                <View key={zone.id} style={s.zoneCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: scale(12) }}>
                    <View style={{ width: scale(40), height: scale(40), borderRadius: scale(10), backgroundColor: COLORS.teal + '20', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={getZoneIcon(zone.zone_type)} size={20} color={COLORS.teal} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: scale(15), fontWeight: '600', color: COLORS.textPrimary }}>{zone.zone_name}</Text>
                      <Text style={{ fontSize: scale(12), color: COLORS.textSecondary }}>{zone.zone_type}{zone.description ? ` • ${zone.description}` : ''}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => deleteZone(zone)} style={{ padding: scale(8) }}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}

        {/* ===== SYNC TAB ===== */}
        {activeTab === 'sync' && (
          <>
            {syncCommands.some(c => c.status === 'failed') && (
              <TouchableOpacity style={[s.addButton, { backgroundColor: COLORS.warning }]} onPress={retryFailed}>
                <Ionicons name="refresh" size={22} color={COLORS.background} />
                <Text style={s.addButtonText}>Reintentar Fallidos</Text>
              </TouchableOpacity>
            )}

            {loadingSync ? (
              <View style={{ paddingVertical: scale(40), alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.teal} />
              </View>
            ) : syncCommands.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="cloud-done-outline" size={60} color={COLORS.textMuted} />
                <Text style={s.emptyTitle}>Sin comandos</Text>
                <Text style={s.emptySub}>Los comandos de sincronización aparecerán aquí cuando asignés tarjetas</Text>
              </View>
            ) : (
              syncCommands.map(cmd => {
                const si = getSyncIcon(cmd.status);
                return (
                  <View key={cmd.id} style={s.syncCard}>
                    <Ionicons name={si.icon} size={20} color={si.color} />
                    <View style={{ flex: 1, marginLeft: scale(10) }}>
                      <Text style={{ fontSize: scale(13), fontWeight: '600', color: COLORS.textPrimary }}>
                        {cmd.command_type?.replace(/_/g, ' ').toUpperCase()}
                      </Text>
                      <Text style={{ fontSize: scale(11), color: COLORS.textSecondary }}>
                        Tarjeta: {cmd.command_data?.credential_number || 'N/A'} • {cmd.status}
                      </Text>
                      {cmd.error_message ? (
                        <Text style={{ fontSize: scale(10), color: COLORS.danger, marginTop: scale(2) }}>{cmd.error_message}</Text>
                      ) : null}
                    </View>
                    <Text style={{ fontSize: scale(10), color: COLORS.textMuted }}>
                      {cmd.created_at ? new Date(cmd.created_at).toLocaleString('es') : ''}
                    </Text>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* ===== ADD/EDIT DEVICE MODAL ===== */}
      <Modal visible={showDeviceModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalContainer}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowDeviceModal(false)}>
              <Text style={s.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>{editingDevice ? 'Editar Dispositivo' : 'Nuevo Dispositivo'}</Text>
            <TouchableOpacity onPress={saveDevice} disabled={savingDevice}>
              {savingDevice ? <ActivityIndicator size="small" color={COLORS.lime} /> : (
                <Text style={s.modalSave}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={s.inputLabel}>Nombre del Dispositivo *</Text>
            <TextInput
              style={s.input}
              value={deviceForm.device_name}
              onChangeText={(t) => setDeviceForm(p => ({ ...p, device_name: t }))}
              placeholder="Ej: Lector Portón Principal"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={s.inputLabel}>Modelo</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) }}>
              {DEVICE_MODELS.map(model => (
                <TouchableOpacity
                  key={model.key}
                  style={[s.modelChip, deviceForm.device_model === model.key && s.modelChipActive]}
                  onPress={() => setDeviceForm(p => ({ ...p, device_model: model.key }))}
                >
                  <Text style={[s.modelChipText, deviceForm.device_model === model.key && s.modelChipTextActive]}>
                    {model.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.inputLabel}>Dirección IP *</Text>
            <TextInput
              style={s.input}
              value={deviceForm.ip_address}
              onChangeText={(t) => setDeviceForm(p => ({ ...p, ip_address: t }))}
              placeholder="Ej: 192.168.1.201"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />

            <Text style={s.inputLabel}>Puerto</Text>
            <TextInput
              style={s.input}
              value={deviceForm.port}
              onChangeText={(t) => setDeviceForm(p => ({ ...p, port: t }))}
              placeholder="4370"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />

            <Text style={s.inputLabel}>Número de Serie (opcional)</Text>
            <TextInput
              style={s.input}
              value={deviceForm.serial_number}
              onChangeText={(t) => setDeviceForm(p => ({ ...p, serial_number: t }))}
              placeholder="S/N del dispositivo"
              placeholderTextColor={COLORS.textMuted}
            />

            {zones.length > 0 && (
              <>
                <Text style={s.inputLabel}>Zona (opcional)</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) }}>
                  <TouchableOpacity
                    style={[s.modelChip, !deviceForm.zone_id && s.modelChipActive]}
                    onPress={() => setDeviceForm(p => ({ ...p, zone_id: null }))}
                  >
                    <Text style={[s.modelChipText, !deviceForm.zone_id && s.modelChipTextActive]}>Ninguna</Text>
                  </TouchableOpacity>
                  {zones.map(z => (
                    <TouchableOpacity
                      key={z.id}
                      style={[s.modelChip, deviceForm.zone_id === z.id && s.modelChipActive]}
                      onPress={() => setDeviceForm(p => ({ ...p, zone_id: z.id }))}
                    >
                      <Text style={[s.modelChipText, deviceForm.zone_id === z.id && s.modelChipTextActive]}>{z.zone_name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: scale(8), marginTop: scale(24), padding: scale(12), borderRadius: scale(10), backgroundColor: COLORS.teal + '10', borderWidth: 1, borderColor: COLORS.teal + '30' }}>
              <Ionicons name="information-circle" size={18} color={COLORS.teal} />
              <Text style={{ flex: 1, fontSize: scale(12), color: COLORS.textSecondary, lineHeight: scale(18) }}>
                Asegurate que el dispositivo esté conectado a la misma red que el Raspberry Pi. El puerto por defecto de ZKTeco es 4370.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ===== ADD ZONE MODAL ===== */}
      <Modal visible={showZoneModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalContainer}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowZoneModal(false)}>
              <Text style={s.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>Nueva Zona</Text>
            <TouchableOpacity onPress={saveZone} disabled={savingZone}>
              {savingZone ? <ActivityIndicator size="small" color={COLORS.lime} /> : (
                <Text style={s.modalSave}>Crear</Text>
              )}
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={s.inputLabel}>Nombre de Zona *</Text>
            <TextInput
              style={s.input}
              value={zoneForm.zone_name}
              onChangeText={(t) => setZoneForm(p => ({ ...p, zone_name: t }))}
              placeholder="Ej: Portón Principal"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
            />

            <Text style={s.inputLabel}>Tipo</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) }}>
              {[
                { key: 'gate', label: 'Portón', icon: 'business' },
                { key: 'door', label: 'Puerta', icon: 'log-in' },
                { key: 'parking', label: 'Parking', icon: 'car' },
                { key: 'elevator', label: 'Elevador', icon: 'arrow-up' },
                { key: 'pool', label: 'Piscina', icon: 'water' },
                { key: 'gym', label: 'Gimnasio', icon: 'fitness' },
              ].map(zt => (
                <TouchableOpacity
                  key={zt.key}
                  style={[s.modelChip, { flexDirection: 'row', gap: scale(4) }, zoneForm.zone_type === zt.key && s.modelChipActive]}
                  onPress={() => setZoneForm(p => ({ ...p, zone_type: zt.key }))}
                >
                  <Ionicons name={zt.icon} size={14} color={zoneForm.zone_type === zt.key ? COLORS.lime : COLORS.textSecondary} />
                  <Text style={[s.modelChipText, zoneForm.zone_type === zt.key && s.modelChipTextActive]}>{zt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.inputLabel}>Descripción (opcional)</Text>
            <TextInput
              style={[s.input, { minHeight: scale(80), textAlignVertical: 'top' }]}
              value={zoneForm.description}
              onChangeText={(t) => setZoneForm(p => ({ ...p, description: t }))}
              placeholder="Descripción de la zona"
              placeholderTextColor={COLORS.textMuted}
              multiline
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Location Picker (superadmin) */}
      {isSuperAdminUser && (
        <Modal visible={showLocationPicker} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={s.modalContainer}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                <Text style={s.modalCancel}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={s.modalTitle}>Seleccionar Comunidad</Text>
              <View style={{ width: 60 }} />
            </View>
            <ScrollView style={s.modalContent}>
              {locations.map(loc => (
                <TouchableOpacity
                  key={loc.id}
                  style={[s.locOption, selectedLocationId === loc.id && s.locOptionActive]}
                  onPress={() => { setSelectedLocationId(loc.id); setShowLocationPicker(false); }}
                >
                  <View style={s.locIcon}><Ionicons name="business" size={22} color={COLORS.teal} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: scale(15), fontWeight: '600', color: COLORS.textPrimary }}>{loc.name}</Text>
                    <Text style={{ fontSize: scale(12), color: COLORS.textSecondary }}>{loc.address}, {loc.city}</Text>
                  </View>
                  {selectedLocationId === loc.id && <Ionicons name="checkmark-circle" size={22} color={COLORS.lime} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: scale(12), color: COLORS.textSecondary, fontSize: scale(14) },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(16), paddingVertical: scale(12) },
  backBtn: { padding: scale(8) },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: scale(18), fontWeight: '700', color: COLORS.textPrimary },
  headerSub: { fontSize: scale(13), color: COLORS.lime, marginTop: scale(2) },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: scale(12), gap: scale(8), marginBottom: scale(12) },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: scale(12), borderRadius: scale(10), backgroundColor: COLORS.backgroundSecondary, borderWidth: 1, borderColor: COLORS.border },
  statVal: { fontSize: scale(20), fontWeight: '700' },
  statLbl: { fontSize: scale(10), color: COLORS.textSecondary, marginTop: scale(2) },

  // Tabs
  tabsRow: { flexDirection: 'row', marginHorizontal: scale(16), marginBottom: scale(12), borderRadius: scale(10), backgroundColor: COLORS.backgroundSecondary, padding: scale(3) },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(4), paddingVertical: scale(10), borderRadius: scale(8) },
  tabActive: { backgroundColor: COLORS.backgroundTertiary },
  tabText: { fontSize: scale(12), color: COLORS.textSecondary, fontWeight: '500' },
  tabTextActive: { color: COLORS.lime, fontWeight: '600' },

  content: { flex: 1, paddingHorizontal: scale(16) },

  // Add button
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8), paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: COLORS.lime, marginBottom: scale(16) },
  addButtonText: { fontSize: scale(15), fontWeight: '700', color: COLORS.background },

  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: scale(40), gap: scale(8) },
  emptyTitle: { fontSize: scale(16), color: COLORS.textSecondary, fontWeight: '600' },
  emptySub: { fontSize: scale(13), color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: scale(20) },

  // Device card
  deviceCard: { backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(12), padding: scale(14), marginBottom: scale(10), borderWidth: 1, borderColor: COLORS.border },
  deviceTop: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  deviceIcon: { width: scale(44), height: scale(44), borderRadius: scale(12), alignItems: 'center', justifyContent: 'center' },
  deviceName: { fontSize: scale(15), fontWeight: '700', color: COLORS.textPrimary },
  deviceModel: { fontSize: scale(12), color: COLORS.textSecondary, marginTop: scale(2) },
  deviceSerial: { fontSize: scale(11), color: COLORS.textMuted, marginTop: scale(1) },
  statusDot: { width: scale(10), height: scale(10), borderRadius: scale(5) },
  deviceActions: { flexDirection: 'row', gap: scale(8), marginTop: scale(12), paddingTop: scale(12), borderTopWidth: 1, borderTopColor: COLORS.border },
  devBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(4), paddingVertical: scale(6), paddingHorizontal: scale(10), borderRadius: scale(6), borderWidth: 1 },
  devBtnText: { fontSize: scale(11), fontWeight: '600' },

  // Zone card
  zoneCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(12), padding: scale(14), marginBottom: scale(10), borderWidth: 1, borderColor: COLORS.border },

  // Sync card
  syncCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(10), padding: scale(12), marginBottom: scale(8), borderWidth: 1, borderColor: COLORS.border },

  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(16), paddingVertical: scale(12), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalCancel: { fontSize: scale(15), color: COLORS.textSecondary },
  modalTitle: { fontSize: scale(17), fontWeight: '600', color: COLORS.textPrimary },
  modalSave: { fontSize: scale(15), color: COLORS.lime, fontWeight: '600' },
  modalContent: { flex: 1, padding: scale(16) },
  inputLabel: { fontSize: scale(14), fontWeight: '600', color: COLORS.textPrimary, marginBottom: scale(8), marginTop: scale(16) },
  input: { backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(10), paddingHorizontal: scale(16), paddingVertical: scale(14), fontSize: scale(15), color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },

  // Model chips
  modelChip: { paddingVertical: scale(10), paddingHorizontal: scale(14), borderRadius: scale(8), borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.backgroundSecondary },
  modelChipActive: { backgroundColor: COLORS.lime + '15', borderColor: COLORS.lime },
  modelChipText: { fontSize: scale(12), color: COLORS.textSecondary },
  modelChipTextActive: { color: COLORS.lime, fontWeight: '600' },

  // Location picker
  locOption: { flexDirection: 'row', alignItems: 'center', padding: scale(14), borderRadius: scale(12), borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.backgroundSecondary, marginBottom: scale(10) },
  locOptionActive: { backgroundColor: COLORS.lime + '15', borderColor: COLORS.lime },
  locIcon: { width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: COLORS.teal + '20', alignItems: 'center', justifyContent: 'center', marginRight: scale(12) },
});
