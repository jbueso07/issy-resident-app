// app/admin/guard-shifts.js
// ISSY SuperApp - Admin: Turnos de Guardias (ProHome Dark Theme)

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useAdminLocation } from '../../src/context/AdminLocationContext';
import { LocationHeader, LocationPickerModal } from '../../src/components/AdminLocationPicker';
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

export default function AdminGuardShifts() {
  const { t } = useTranslation();
  const { user, profile, isSuperAdmin } = useAuth();
  const router = useRouter();
  
  const [shifts, setShifts] = useState([]);
  const [todayShifts, setTodayShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Using AdminLocationContext instead of local state
  const { selectedLocationId, locations, selectedLocation } = useAdminLocation();
  console.log("guard-shifts selectedLocationId:", selectedLocationId);
  // LocationPickerModal handled by AdminLocationContext

  const userRole = profile?.role || user?.role || 'user';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);

  useEffect(() => {
    if (selectedLocationId) {
      fetchShifts();
    }
  }, [selectedLocationId]);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };


  const fetchShifts = async () => {
    try {
      const headers = await getAuthHeaders();
      
      // Turnos de hoy
      const todayRes = await fetch(
        `${API_URL}/guard-shifts/today?location_id=${selectedLocationId}`,
        { headers }
      );
      const todayData = await todayRes.json();
      if (todayData.success) {
        setTodayShifts(todayData.data || []);
      }

      // Historial
      const shiftsRes = await fetch(
        `${API_URL}/guard-shifts?location_id=${selectedLocationId}&limit=50`,
        { headers }
      );
      const shiftsData = await shiftsRes.json();
      
      if (shiftsData.success) {
        setShifts(shiftsData.data?.shifts || shiftsData.data || []);
      }
    } catch (error) {
      console.error('Error fetching shifts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchShifts();
  }, [selectedLocationId]);

  const handleDeleteShift = async (shiftId) => {
    Alert.alert(
      t('admin.guardShifts.deleteShift'),
      t('admin.guardShifts.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(`${API_URL}/guard-shifts/${shiftId}`, {
                method: 'DELETE',
                headers,
              });
              
              if (response.ok) {
                fetchShifts();
              } else {
                Alert.alert(t('common.error'), t('admin.guardShifts.errors.deleteFailed'));
              }
            } catch (error) {
              Alert.alert(t('common.error'), t('admin.guardShifts.errors.deleteFailed'));
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return t('common.today');
    if (date.toDateString() === yesterday.toDateString()) return t('common.yesterday');
    
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const currentLocation = selectedLocation;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
          <Text style={styles.loadingText}>{t('admin.guardShifts.loading')}</Text>
        </View>
      <LocationPickerModal />
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
          <Text style={styles.headerTitle}>{t('admin.guardShifts.title')}</Text>
        </View>
      </View>

      {/* Location Selector */}
      <LocationHeader />

      {/* Turnos de Hoy */}
      {todayShifts.length > 0 && (
        <View style={styles.todaySummary}>
          <View style={styles.todayHeader}>
            <Ionicons name="today" size={20} color={COLORS.lime} />
            <Text style={styles.todayTitle}>{t('admin.guardShifts.onDutyToday')}</Text>
          </View>
          <View style={styles.todayGuards}>
            {todayShifts.flatMap(shift => shift.guards || []).map((guard, index) => (
              <View key={index} style={styles.todayGuardChip}>
                <Ionicons name="shield" size={12} color={COLORS.blue} />
                <Text style={styles.todayGuardText}>{guard.name}</Text>
              </View>
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
        {shifts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>{t('admin.guardShifts.empty.noShifts')}</Text>
            <Text style={styles.emptySubtitle}>
              Los guardias pueden registrar turnos desde ISSY Sentry
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>{t('admin.guardShifts.shiftHistory')}</Text>
            {shifts.map((shift) => {
              const guards = shift.guards || [];
              return (
                <View key={shift.id} style={styles.shiftCard}>
                  <View style={styles.shiftHeader}>
                    <View style={styles.shiftDateBadge}>
                      <Ionicons name="calendar" size={14} color={COLORS.lime} />
                      <Text style={styles.shiftDateText}>{formatDate(shift.shift_date)}</Text>
                    </View>
                    <View style={styles.shiftTimeBadge}>
                      <Ionicons name="time" size={14} color={COLORS.teal} />
                      <Text style={styles.shiftTimeText}>
                        {shift.start_time} - {shift.end_time}
                      </Text>
                    </View>
                  </View>

                  {shift.gates?.name && (
                    <View style={styles.gateInfo}>
                      <Ionicons name="business" size={14} color={COLORS.purple} />
                      <Text style={styles.gateText}>{shift.gates.name}</Text>
                    </View>
                  )}

                  <View style={styles.guardsContainer}>
                    <Text style={styles.guardsLabel}>{t('admin.guardShifts.guardsOnDuty')}:</Text>
                    {guards.map((guard, index) => (
                      <View key={index} style={styles.guardItem}>
                        <View style={styles.guardAvatar}>
                          <Ionicons name="shield-checkmark" size={14} color={COLORS.blue} />
                        </View>
                        <Text style={styles.guardName}>{guard.name}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.shiftFooter}>
                    <Text style={styles.shiftCreatedAt}>
                      Registrado: {new Date(shift.created_at).toLocaleString('es-ES')}
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteShift(shift.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Location Picker */}
    <LocationPickerModal />
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
  todaySummary: {
    backgroundColor: COLORS.lime + '15',
    marginHorizontal: scale(16),
    marginBottom: scale(16),
    borderRadius: scale(12),
    padding: scale(14),
    borderWidth: 1,
    borderColor: COLORS.lime + '30',
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(10),
  },
  todayTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.lime,
  },
  todayGuards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  todayGuardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(8),
    gap: scale(6),
  },
  todayGuardText: {
    fontSize: scale(13),
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(16),
  },
  sectionTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: scale(12),
  },
  shiftCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scale(12),
  },
  shiftDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lime + '20',
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(8),
    gap: scale(6),
  },
  shiftDateText: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.lime,
  },
  shiftTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.teal + '20',
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(8),
    gap: scale(6),
  },
  shiftTimeText: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.teal,
  },
  gateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: scale(12),
  },
  gateText: {
    fontSize: scale(13),
    color: COLORS.purple,
    fontWeight: '500',
  },
  guardsContainer: {
    marginBottom: scale(10),
  },
  guardsLabel: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginBottom: scale(8),
  },
  guardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(6),
  },
  guardAvatar: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: COLORS.blue + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardName: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  shiftFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: scale(10),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  shiftCreatedAt: {
    fontSize: scale(11),
    color: COLORS.textMuted,
  },
  deleteButton: {
    padding: scale(8),
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    padding: scale(20),
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  modalTitle: {
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