// app/marketplace-hub/provider/settings.js
// ISSY Marketplace - Provider Settings Screen
// Línea gráfica ProHome

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { getMyProviderProfile, updateProviderProfile } from '../../../src/services/marketplaceApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ============ COLORES PROHOME ============
const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  bgCardAlt: '#243B44',
  lime: '#AAFF00',
  cyan: '#00E5FF',
  teal: '#00BFA6',
  orange: '#FF8A50',
  green: '#10B981',
  blue: '#60A5FA',
  red: '#EF4444',
  yellow: '#FBBF24',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  border: 'rgba(255, 255, 255, 0.1)',
};

export default function ProviderSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState({
    is_available: true,
    accepts_instant_booking: true,
    notification_new_booking: true,
    notification_messages: true,
    notification_reminders: true,
    auto_accept_returning: false,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const result = await getMyProviderProfile();
      if (result.success) {
        setProfile(result.data);
        setSettings({
          is_available: result.data.is_available ?? true,
          accepts_instant_booking: result.data.accepts_instant_booking ?? true,
          notification_new_booking: result.data.notification_new_booking ?? true,
          notification_messages: result.data.notification_messages ?? true,
          notification_reminders: result.data.notification_reminders ?? true,
          auto_accept_returning: result.data.auto_accept_returning ?? false,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key, value) => {
    const oldSettings = { ...settings };
    setSettings(prev => ({ ...prev, [key]: value }));

    try {
      const result = await updateProviderProfile({ [key]: value });
      if (!result.success) {
        setSettings(oldSettings);
        Alert.alert('Error', 'No se pudo actualizar la configuración');
      }
    } catch (error) {
      setSettings(oldSettings);
      Alert.alert('Error', 'Ocurrió un error al guardar');
    }
  };

  const handleDeactivateAccount = () => {
    Alert.alert(
      'Desactivar Cuenta de Proveedor',
      '¿Estás seguro? Tu perfil de proveedor será desactivado y no podrás recibir nuevas reservas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await updateProviderProfile({ status: 'inactive' });
              if (result.success) {
                Alert.alert('Cuenta Desactivada', 'Tu cuenta de proveedor ha sido desactivada.');
                router.replace('/marketplace-hub');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo desactivar la cuenta');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.teal} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={scale(24)} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Availability Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Disponibilidad</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: `${COLORS.green}20` }]}>
                <Ionicons name="radio-button-on" size={scale(20)} color={COLORS.green} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Disponible para reservas</Text>
                <Text style={styles.settingDescription}>
                  Los clientes podrán ver y reservar tus servicios
                </Text>
              </View>
            </View>
            <Switch
              value={settings.is_available}
              onValueChange={(v) => handleToggle('is_available', v)}
              trackColor={{ false: COLORS.bgCardAlt, true: COLORS.teal }}
              thumbColor={settings.is_available ? COLORS.lime : COLORS.textMuted}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: `${COLORS.cyan}20` }]}>
                <Ionicons name="flash" size={scale(20)} color={COLORS.cyan} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Reserva Instantánea</Text>
                <Text style={styles.settingDescription}>
                  Permitir reservas sin confirmación previa
                </Text>
              </View>
            </View>
            <Switch
              value={settings.accepts_instant_booking}
              onValueChange={(v) => handleToggle('accepts_instant_booking', v)}
              trackColor={{ false: COLORS.bgCardAlt, true: COLORS.teal }}
              thumbColor={settings.accepts_instant_booking ? COLORS.lime : COLORS.textMuted}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: `${COLORS.purple}20` }]}>
                <Ionicons name="repeat" size={scale(20)} color={COLORS.purple} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Auto-aceptar clientes recurrentes</Text>
                <Text style={styles.settingDescription}>
                  Aceptar automáticamente a clientes anteriores
                </Text>
              </View>
            </View>
            <Switch
              value={settings.auto_accept_returning}
              onValueChange={(v) => handleToggle('auto_accept_returning', v)}
              trackColor={{ false: COLORS.bgCardAlt, true: COLORS.teal }}
              thumbColor={settings.auto_accept_returning ? COLORS.lime : COLORS.textMuted}
            />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificaciones</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: `${COLORS.lime}20` }]}>
                <Ionicons name="calendar" size={scale(20)} color={COLORS.lime} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Nuevas Reservas</Text>
                <Text style={styles.settingDescription}>
                  Recibir notificaciones de nuevas reservas
                </Text>
              </View>
            </View>
            <Switch
              value={settings.notification_new_booking}
              onValueChange={(v) => handleToggle('notification_new_booking', v)}
              trackColor={{ false: COLORS.bgCardAlt, true: COLORS.teal }}
              thumbColor={settings.notification_new_booking ? COLORS.lime : COLORS.textMuted}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: `${COLORS.blue}20` }]}>
                <Ionicons name="chatbubble" size={scale(20)} color={COLORS.blue} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Mensajes</Text>
                <Text style={styles.settingDescription}>
                  Recibir notificaciones de nuevos mensajes
                </Text>
              </View>
            </View>
            <Switch
              value={settings.notification_messages}
              onValueChange={(v) => handleToggle('notification_messages', v)}
              trackColor={{ false: COLORS.bgCardAlt, true: COLORS.teal }}
              thumbColor={settings.notification_messages ? COLORS.lime : COLORS.textMuted}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: `${COLORS.orange}20` }]}>
                <Ionicons name="alarm" size={scale(20)} color={COLORS.orange} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Recordatorios</Text>
                <Text style={styles.settingDescription}>
                  Recordatorios de citas próximas
                </Text>
              </View>
            </View>
            <Switch
              value={settings.notification_reminders}
              onValueChange={(v) => handleToggle('notification_reminders', v)}
              trackColor={{ false: COLORS.bgCardAlt, true: COLORS.teal }}
              thumbColor={settings.notification_reminders ? COLORS.lime : COLORS.textMuted}
            />
          </View>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perfil</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/marketplace-hub/provider/profile/edit')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.settingIcon, { backgroundColor: `${COLORS.teal}20` }]}>
                <Ionicons name="person" size={scale(20)} color={COLORS.teal} />
              </View>
              <Text style={styles.menuItemText}>Editar Perfil</Text>
            </View>
            <Ionicons name="chevron-forward" size={scale(20)} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push(`/marketplace-hub/provider/${profile?.id}`)}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.settingIcon, { backgroundColor: `${COLORS.cyan}20` }]}>
                <Ionicons name="eye" size={scale(20)} color={COLORS.cyan} />
              </View>
              <Text style={styles.menuItemText}>Ver Perfil Público</Text>
            </View>
            <Ionicons name="chevron-forward" size={scale(20)} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.settingIcon, { backgroundColor: `${COLORS.yellow}20` }]}>
                <Ionicons name="document-text" size={scale(20)} color={COLORS.yellow} />
              </View>
              <Text style={styles.menuItemText}>Documentos KYC</Text>
            </View>
            <Ionicons name="chevron-forward" size={scale(20)} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.settingIcon, { backgroundColor: `${COLORS.green}20` }]}>
                <Ionicons name="card" size={scale(20)} color={COLORS.green} />
              </View>
              <Text style={styles.menuItemText}>Información de Pago</Text>
            </View>
            <Ionicons name="chevron-forward" size={scale(20)} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Soporte</Text>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.settingIcon, { backgroundColor: `${COLORS.blue}20` }]}>
                <Ionicons name="help-circle" size={scale(20)} color={COLORS.blue} />
              </View>
              <Text style={styles.menuItemText}>Centro de Ayuda</Text>
            </View>
            <Ionicons name="chevron-forward" size={scale(20)} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.settingIcon, { backgroundColor: `${COLORS.purple}20` }]}>
                <Ionicons name="mail" size={scale(20)} color={COLORS.purple} />
              </View>
              <Text style={styles.menuItemText}>Contactar Soporte</Text>
            </View>
            <Ionicons name="chevron-forward" size={scale(20)} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleDeactivateAccount}
          >
            <Ionicons name="power" size={scale(20)} color={COLORS.red} />
            <Text style={styles.dangerButtonText}>Desactivar Cuenta de Proveedor</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const purple = '#A78BFA';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSpacer: {
    width: scale(40),
  },
  content: {
    flex: 1,
    padding: scale(16),
  },
  section: {
    marginBottom: scale(24),
  },
  sectionTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: scale(12),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(8),
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: scale(12),
  },
  settingIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(2),
  },
  settingDescription: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(8),
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLORS.red}15`,
    borderRadius: scale(12),
    padding: scale(16),
    gap: scale(8),
    borderWidth: 1,
    borderColor: `${COLORS.red}30`,
  },
  dangerButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.red,
  },
  bottomSpacer: {
    height: scale(100),
  },
});
