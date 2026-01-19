// src/components/AdminLocationPicker.js
// Componente reutilizable para seleccionar ubicación en pantallas admin
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
import { useTranslation } from 'react-i18next';
import { useAdminLocation } from '../context/AdminLocationContext';

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

// Header component that shows current location with dropdown
export const LocationHeader = ({ title, onRefresh, onBack }) => {
  const { t } = useTranslation();
  const { 
    selectedLocation, 
    canSwitchLocation, 
    openPicker 
  } = useAdminLocation();

  return (
    <View style={styles.header}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      )}
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>{title}</Text>
        {canSwitchLocation && selectedLocation && (
          <TouchableOpacity onPress={openPicker}>
            <Text style={styles.headerSubtitle}>
              {selectedLocation.name} ▾
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {onRefresh && (
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

// Modal picker component
export const LocationPickerModal = () => {
  const { t } = useTranslation();
  const {
    locations,
    selectedLocationId,
    showPicker,
    selectLocation,
    closePicker,
  } = useAdminLocation();

  return (
    <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={closePicker}>
            <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {t('admin.communityManagement.selectCommunity', 'Seleccionar Comunidad')}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {locations.map(location => (
            <TouchableOpacity
              key={location.id}
              style={[
                styles.locationOption,
                selectedLocationId === location.id && styles.locationOptionSelected
              ]}
              onPress={() => selectLocation(location.id)}
            >
              <View style={styles.locationIconContainer}>
                <Ionicons name="business" size={22} color={COLORS.teal} />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{location.name}</Text>
                <Text style={styles.locationAddress}>
                  {location.address}{location.city ? `, ${location.city}` : ''}
                </Text>
              </View>
              {selectedLocationId === location.id && (
                <Ionicons name="checkmark-circle" size={22} color={COLORS.lime} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// Combined component for easy use
const AdminLocationPicker = () => {
  return <LocationPickerModal />;
};

const styles = StyleSheet.create({
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  backButton: {
    padding: scale(8),
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: scale(13),
    color: COLORS.lime,
    marginTop: scale(2),
  },
  refreshButton: {
    padding: scale(8),
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
});

export default AdminLocationPicker;
