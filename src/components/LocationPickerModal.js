// src/components/LocationPickerModal.js
// ISSY - Reusable Location Picker Modal for Admin Screens
// Allows superadmins to switch between different communities/locations

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const API_URL = 'https://api.joinissy.com/api';

// ProHome Dark Theme Colors
const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  lime: '#D4FE48',
  teal: '#5DDED8',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  border: 'rgba(255,255,255,0.1)',
};

export default function LocationPickerModal({
  visible,
  onClose,
  onSelectLocation,
  selectedLocationId,
  locations: externalLocations = null, // Optional: pass locations from parent
}) {
  const { t } = useTranslation();
  const [locations, setLocations] = useState(externalLocations || []);
  const [loading, setLoading] = useState(!externalLocations);

  useEffect(() => {
    if (visible && !externalLocations) {
      fetchLocations();
    }
  }, [visible, externalLocations]);

  useEffect(() => {
    if (externalLocations) {
      setLocations(externalLocations);
      setLoading(false);
    }
  }, [externalLocations]);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/locations`, { headers });
      const data = await res.json();
      if (data.success || Array.isArray(data)) {
        const list = data.data || data;
        setLocations(list);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (location) => {
    onSelectLocation(location.id, location);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={styles.modalCancel}>{t('common.cancel', 'Cancelar')}</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {t('admin.communityManagement.selectCommunity', 'Seleccionar Comunidad')}
          </Text>
          <View style={styles.headerButton} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.lime} />
            <Text style={styles.loadingText}>
              {t('common.loading', 'Cargando...')}
            </Text>
          </View>
        ) : locations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              {t('admin.communityManagement.noLocations', 'No hay comunidades disponibles')}
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {locations.map((location) => (
              <TouchableOpacity
                key={location.id}
                style={[
                  styles.locationOption,
                  selectedLocationId === location.id && styles.locationOptionSelected,
                ]}
                onPress={() => handleSelect(location)}
                activeOpacity={0.7}
              >
                <View style={styles.locationIconContainer}>
                  <Ionicons name="business" size={22} color={COLORS.teal} />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>{location.name}</Text>
                  {(location.address || location.city) && (
                    <Text style={styles.locationAddress}>
                      {[location.address, location.city].filter(Boolean).join(', ')}
                    </Text>
                  )}
                  {location.members_count !== undefined && (
                    <Text style={styles.locationMeta}>
                      {location.members_count} {t('admin.communityManagement.members', 'miembros')}
                    </Text>
                  )}
                </View>
                {selectedLocationId === location.id && (
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.lime} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// Hook para usar el LocationPicker fácilmente en cualquier pantalla admin
export function useLocationPicker(userLocationId, isSuperAdmin) {
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState(userLocationId);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    if (!isSuperAdmin && userLocationId) {
      setSelectedLocationId(userLocationId);
    }
  }, [userLocationId, isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchLocations();
    }
  }, [isSuperAdmin]);

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
          setSelectedLocation(list[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const openPicker = () => setShowLocationPicker(true);
  const closePicker = () => setShowLocationPicker(false);

  const handleSelectLocation = (locationId, location) => {
    setSelectedLocationId(locationId);
    setSelectedLocation(location);
  };

  const LocationPickerButton = ({ style }) => {
    if (!isSuperAdmin) return null;
    
    const currentLocation = locations.find((l) => l.id === selectedLocationId);
    
    return (
      <TouchableOpacity style={[styles.pickerButton, style]} onPress={openPicker}>
        <Ionicons name="business" size={16} color={COLORS.lime} />
        <Text style={styles.pickerButtonText} numberOfLines={1}>
          {currentLocation?.name || 'Seleccionar comunidad'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
      </TouchableOpacity>
    );
  };

  const LocationPickerModalComponent = () => (
    <LocationPickerModal
      visible={showLocationPicker}
      onClose={closePicker}
      onSelectLocation={handleSelectLocation}
      selectedLocationId={selectedLocationId}
      locations={locations}
    />
  );

  return {
    selectedLocationId,
    selectedLocation,
    locations,
    showLocationPicker,
    openPicker,
    closePicker,
    handleSelectLocation,
    LocationPickerButton,
    LocationPickerModal: LocationPickerModalComponent,
  };
}

const styles = StyleSheet.create({
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
  headerButton: {
    width: scale(70),
  },
  modalCancel: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
  },
  modalTitle: {
    fontSize: scale(17),
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    flex: 1,
  },
  modalContent: {
    flex: 1,
    padding: scale(16),
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  emptyText: {
    marginTop: scale(12),
    color: COLORS.textMuted,
    fontSize: scale(14),
    textAlign: 'center',
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(14),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundSecondary,
    marginBottom: scale(10),
  },
  locationOptionSelected: {
    backgroundColor: COLORS.lime + '15',
    borderColor: COLORS.lime,
  },
  locationIconContainer: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.teal + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  locationAddress: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  locationMeta: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    marginTop: scale(4),
  },
  // Picker Button styles (for use in headers)
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scale(6),
    maxWidth: scale(200),
  },
  pickerButtonText: {
    fontSize: scale(13),
    color: COLORS.lime,
    fontWeight: '500',
    flex: 1,
  },
});