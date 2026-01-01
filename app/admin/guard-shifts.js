// app/(tabs)/more.tsx
// ISSY Sentry - Pantalla Más (ProHome Dark Theme)

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

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

/**
 * @typedef {Object} Guard
 * @property {string} id
 * @property {string} name
 */

export default function MoreScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  
  // Shift registration state
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [guardsOnDuty, setGuardsOnDuty] = useState<Guard[]>([]);
  const [newGuardName, setNewGuardName] = useState('');
  const [shiftStartTime, setShiftStartTime] = useState('');
  const [shiftEndTime, setShiftEndTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Support modal
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Get default shift times based on current hour
  const getDefaultShiftTimes = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) {
      return { start: '06:00', end: '14:00' };
    } else if (hour >= 14 && hour < 22) {
      return { start: '14:00', end: '22:00' };
    } else {
      return { start: '22:00', end: '06:00' };
    }
  };

  const handleOpenShiftModal = () => {
    const defaults = getDefaultShiftTimes();
    setShiftStartTime(defaults.start);
    setShiftEndTime(defaults.end);
    setGuardsOnDuty([]);
    setNewGuardName('');
    setShowShiftModal(true);
  };

  const handleAddGuard = () => {
    if (!newGuardName.trim()) return;
    
    const newGuard: Guard = {
      id: Date.now().toString(),
      name: newGuardName.trim(),
    };
    
    setGuardsOnDuty([...guardsOnDuty, newGuard]);
    setNewGuardName('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRemoveGuard = (guardId: string) => {
    setGuardsOnDuty(guardsOnDuty.filter(g => g.id !== guardId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getToken = async () => {
    try {
      return await AsyncStorage.getItem('token');
    } catch {
      return null;
    }
  };

  const handleSubmitShift = async () => {
    if (guardsOnDuty.length === 0) {
      Alert.alert('Error', 'Agrega al menos un guardia en turno');
      return;
    }
    if (!shiftStartTime || !shiftEndTime) {
      Alert.alert('Error', 'Ingresa el horario del turno');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken();
      const response = await fetch('https://api.joinissy.com/api/guard-shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          guards: guardsOnDuty.map(g => ({ name: g.name })),
          start_time: shiftStartTime,
          end_time: shiftEndTime,
          location_id: user?.location_id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          '✅ Turno Registrado',
          `${guardsOnDuty.length} guardia(s) en turno de ${shiftStartTime} a ${shiftEndTime}`,
          [{ text: 'OK', onPress: () => {
            setShowShiftModal(false);
            setGuardsOnDuty([]);
          }}]
        );
      } else {
        Alert.alert('Error', data.error || 'No se pudo registrar el turno');
      }
    } catch (error) {
      console.error('Error registering shift:', error);
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      id: 'notifications',
      title: 'Notificaciones',
      icon: 'notifications-outline',
      color: COLORS.teal,
      onPress: () => Alert.alert('Próximamente', 'Notificaciones estará disponible pronto'),
    },
    {
      id: 'shift',
      title: 'Registro de Turno',
      icon: 'time-outline',
      color: COLORS.lime,
      onPress: handleOpenShiftModal,
    },
    {
      id: 'history',
      title: 'Historial',
      icon: 'document-text-outline',
      color: COLORS.purple,
      onPress: () => router.push('/activity'),
    },
    {
      id: 'support',
      title: 'Soporte ISSY',
      icon: 'help-circle-outline',
      color: COLORS.blue,
      onPress: () => setShowSupportModal(true),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Más</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Ionicons name="shield-checkmark" size={32} color={COLORS.lime} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'Guardia'}</Text>
            <Text style={styles.userRole}>Guardia de Seguridad</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>ISSY Sentry v1.0.0</Text>
      </ScrollView>

      {/* Shift Registration Modal */}
      <Modal
        visible={showShiftModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowShiftModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <SafeAreaView style={styles.modalContainer}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowShiftModal(false)}>
                  <Text style={styles.modalCancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Registro de Turno</Text>
                <TouchableOpacity 
                  onPress={handleSubmitShift}
                  disabled={isSubmitting || guardsOnDuty.length === 0}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={COLORS.lime} />
                  ) : (
                    <Text style={[
                      styles.modalSave,
                      guardsOnDuty.length === 0 && styles.modalSaveDisabled
                    ]}>
                      Guardar
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Shift Time */}
                <Text style={styles.inputLabel}>Horario del Turno</Text>
                <View style={styles.timeRow}>
                  <View style={styles.timeInput}>
                    <Text style={styles.timeLabel}>Inicio</Text>
                    <TextInput
                      style={styles.input}
                      value={shiftStartTime}
                      onChangeText={setShiftStartTime}
                      placeholder="06:00"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numbers-and-punctuation"
                      returnKeyType="done"
                    />
                  </View>
                  <View style={styles.timeSeparator}>
                    <Ionicons name="arrow-forward" size={20} color={COLORS.textMuted} />
                  </View>
                  <View style={styles.timeInput}>
                    <Text style={styles.timeLabel}>Fin</Text>
                    <TextInput
                      style={styles.input}
                      value={shiftEndTime}
                      onChangeText={setShiftEndTime}
                      placeholder="14:00"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numbers-and-punctuation"
                      returnKeyType="done"
                    />
                  </View>
                </View>

                {/* Guards List */}
                <Text style={styles.inputLabel}>Guardias en Turno</Text>
                
                {guardsOnDuty.length === 0 ? (
                  <View style={styles.emptyGuards}>
                    <Ionicons name="people-outline" size={32} color={COLORS.textMuted} />
                    <Text style={styles.emptyGuardsText}>
                      Agrega los guardias que están en este turno
                    </Text>
                  </View>
                ) : (
                  <View style={styles.guardsList}>
                    {guardsOnDuty.map((guard) => (
                      <View key={guard.id} style={styles.guardItem}>
                        <View style={styles.guardAvatar}>
                          <Ionicons name="person" size={16} color={COLORS.lime} />
                        </View>
                        <Text style={styles.guardName}>{guard.name}</Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveGuard(guard.id)}
                          style={styles.removeGuardButton}
                        >
                          <Ionicons name="close-circle" size={22} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Add Guard Input */}
                <View style={styles.addGuardContainer}>
                  <TextInput
                    style={[styles.input, styles.addGuardInput]}
                    value={newGuardName}
                    onChangeText={setNewGuardName}
                    placeholder="Nombre del guardia"
                    placeholderTextColor={COLORS.textMuted}
                    onSubmitEditing={handleAddGuard}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={[
                      styles.addGuardButton,
                      !newGuardName.trim() && styles.addGuardButtonDisabled
                    ]}
                    onPress={handleAddGuard}
                    disabled={!newGuardName.trim()}
                  >
                    <Ionicons name="add" size={24} color={COLORS.background} />
                  </TouchableOpacity>
                </View>

                <View style={{ height: 100 }} />
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Support Modal */}
      <Modal
        visible={showSupportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSupportModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSupportModal(false)}>
              <Text style={styles.modalCancel}>Cerrar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Soporte ISSY</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.supportContent}>
            <View style={styles.supportIcon}>
              <Ionicons name="headset" size={48} color={COLORS.teal} />
            </View>
            <Text style={styles.supportTitle}>¿Necesitas ayuda?</Text>
            <Text style={styles.supportText}>
              Contáctanos para resolver cualquier duda o problema
            </Text>

            <View style={styles.supportInfo}>
              <View style={styles.supportItem}>
                <Ionicons name="globe-outline" size={20} color={COLORS.teal} />
                <Text style={styles.supportItemText}>www.joinissy.com</Text>
              </View>
              <View style={styles.supportItem}>
                <Ionicons name="mail-outline" size={20} color={COLORS.teal} />
                <Text style={styles.supportItemText}>info@joinissy.com</Text>
              </View>
            </View>
          </View>
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
  header: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
  },
  headerTitle: {
    fontSize: scale(28),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingBottom: scale(40),
  },

  // User Card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(24),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userAvatar: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: COLORS.lime + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(14),
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userRole: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },

  // Menu
  menuContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(16),
    overflow: 'hidden',
    marginBottom: scale(24),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  menuTitle: {
    flex: 1,
    fontSize: scale(15),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger + '15',
    borderRadius: scale(12),
    paddingVertical: scale(14),
    gap: scale(8),
  },
  logoutText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.danger,
  },

  // Version
  version: {
    textAlign: 'center',
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginTop: scale(24),
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
    paddingVertical: scale(14),
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
    fontWeight: '600',
    color: COLORS.lime,
  },
  modalSaveDisabled: {
    color: COLORS.textMuted,
  },
  modalContent: {
    flex: 1,
    padding: scale(20),
  },

  // Form
  inputLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(10),
    marginTop: scale(16),
  },
  input: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    fontSize: scale(15),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    flex: 1,
  },
  timeLabel: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginBottom: scale(6),
  },
  timeSeparator: {
    paddingHorizontal: scale(12),
    paddingTop: scale(20),
  },

  // Guards
  emptyGuards: {
    alignItems: 'center',
    paddingVertical: scale(24),
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  emptyGuardsText: {
    fontSize: scale(13),
    color: COLORS.textMuted,
    marginTop: scale(8),
    textAlign: 'center',
  },
  guardsList: {
    gap: scale(8),
  },
  guardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  guardAvatar: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: COLORS.lime + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(10),
  },
  guardName: {
    flex: 1,
    fontSize: scale(15),
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  removeGuardButton: {
    padding: scale(4),
  },
  addGuardContainer: {
    flexDirection: 'row',
    marginTop: scale(12),
    gap: scale(10),
  },
  addGuardInput: {
    flex: 1,
  },
  addGuardButton: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(10),
    backgroundColor: COLORS.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGuardButtonDisabled: {
    backgroundColor: COLORS.backgroundTertiary,
  },

  // Support
  supportContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(20),
  },
  supportIcon: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: COLORS.teal + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(20),
  },
  supportTitle: {
    fontSize: scale(22),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  supportText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: scale(30),
  },
  supportInfo: {
    gap: scale(16),
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  supportItemText: {
    fontSize: scale(16),
    color: COLORS.teal,
    fontWeight: '500',
  },
});