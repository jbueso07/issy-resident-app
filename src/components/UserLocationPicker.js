// src/components/UserLocationPicker.js
// Componente para que usuarios seleccionen entre sus comunidades
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserLocation } from '../context/UserLocationContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  lime: '#D4FE48',
  teal: '#5DDED8',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  border: 'rgba(255,255,255,0.1)',
};

// Header subtitle component that shows current location
export const UserLocationSelector = ({ style }) => {
  const { 
    locationName, 
    hasMultipleLocations, 
    openPicker 
  } = useUserLocation();

  if (!hasMultipleLocations) {
    return (
      <Text style={[styles.subtitle, style]}>
        {locationName}
      </Text>
    );
  }

  return (
    <TouchableOpacity onPress={openPicker}>
      <Text style={[styles.subtitle, styles.subtitleClickable, style]}>
        {locationName} ▾
      </Text>
    </TouchableOpacity>
  );
};

// Modal picker component
export const UserLocationPickerModal = () => {
  const {
    userLocations,
    selectedLocationId,
    showPicker,
    selectLocation,
    closePicker,
  } = useUserLocation();

  const getLocationId = (loc) => loc.location_id || loc.id;
  const getLocationName = (loc) => loc.location?.name || loc.name || 'Comunidad';
  const getLocationAddress = (loc) => {
    const location = loc.location || loc;
    return location.address ? `${location.address}${location.city ? `, ${location.city}` : ''}` : '';
  };

  return (
    <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={closePicker}>
            <Text style={styles.modalCancel}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Mis Comunidades</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {userLocations.map(loc => {
            const locId = getLocationId(loc);
            const isSelected = selectedLocationId === locId;
            
            return (
              <TouchableOpacity
                key={locId}
                style={[
                  styles.locationOption,
                  isSelected && styles.locationOptionSelected
                ]}
                onPress={() => selectLocation(locId)}
              >
                <View style={styles.locationIconContainer}>
                  <Ionicons name="business" size={22} color={COLORS.teal} />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>{getLocationName(loc)}</Text>
                  {getLocationAddress(loc) ? (
                    <Text style={styles.locationAddress}>{getLocationAddress(loc)}</Text>
                  ) : null}
                  {loc.is_primary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Principal</Text>
                    </View>
                  )}
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.lime} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  subtitle: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  subtitleClickable: {
    color: COLORS.lime,
  },
  
  // Modal styles
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
    fontSize: scale(15),
    color: COLORS.textSecondary,
  },
  modalTitle: {
    fontSize: scale(17),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: scale(16),
  },
  
  // Location option styles
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
  primaryBadge: {
    backgroundColor: COLORS.teal + '20',
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(4),
    marginTop: scale(4),
    alignSelf: 'flex-start',
  },
  primaryBadgeText: {
    fontSize: scale(10),
    color: COLORS.teal,
    fontWeight: '600',
  },
});

export default UserLocationPickerModal;
