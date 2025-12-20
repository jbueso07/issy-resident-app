// src/components/IncidentFormModal.js
// ISSY Resident App - Incident Form Modal

import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { createIncident } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const COLORS = {
  lime: '#D4FE48',
  cyan: '#009FF5',
  cyanLight: '#11D6E6',
  black: '#000000',
  white: '#FFFFFF',
  background: '#FAFAFA',
  gray: '#707883',
  grayLight: '#F2F2F2',
  red: '#FA5967',
  inputBorder: '#707883',
  photoBg: '#EFF6FF',
};

const INCIDENT_TYPES = [
  { id: 'security', label: 'Seguridad' },
  { id: 'theft', label: 'Robo' },
  { id: 'vandalism', label: 'Vandalismo' },
  { id: 'noise_complaint', label: 'Ruido' },
  { id: 'parking_violation', label: 'Estacionamiento' },
  { id: 'other', label: 'Otro' },
];

const SEVERITY_LEVELS = [
  { id: 'low', label: 'Baja', color: COLORS.cyanLight },
  { id: 'medium', label: 'Medio', color: COLORS.cyan },
  { id: 'high', label: 'Alta', color: COLORS.lime },
  { id: 'critical', label: 'Crítica', color: COLORS.red },
];

const SLIDER_WIDTH = SCREEN_WIDTH - scale(36);
const SLIDER_BUTTON_SIZE = scale(34);
const SLIDER_TRAVEL = SLIDER_WIDTH - SLIDER_BUTTON_SIZE - scale(12);

export default function IncidentFormModal({ visible, onClose, onSuccess }) {
  const [type, setType] = useState('security');
  const [severity, setSeverity] = useState('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Refs para valores actuales (fix para PanResponder closure)
  const titleRef = useRef('');
  const descriptionRef = useRef('');

  // Slider animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [sliderComplete, setSliderComplete] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newValue = Math.max(0, Math.min(gestureState.dx, SLIDER_TRAVEL));
        slideAnim.setValue(newValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx >= SLIDER_TRAVEL * 0.8) {
          Animated.spring(slideAnim, {
            toValue: SLIDER_TRAVEL,
            useNativeDriver: false,
          }).start(() => {
            setSliderComplete(true);
            handleSubmit();
          });
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const resetForm = () => {
    setType('security');
    setSeverity('medium');
    setTitle('');
    setDescription('');
    setLocation(null);
    setPhotos([]);
    setSliderComplete(false);
    slideAnim.setValue(0);
    titleRef.current = '';
    descriptionRef.current = '';
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleGetLocation = async () => {
    try {
      setGettingLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Requerido', 'Necesitamos acceso a tu ubicación.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      Alert.alert('Ubicación Obtenida', 'Tu ubicación ha sido registrada.');
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'No se pudo obtener la ubicación.');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleAddPhoto = async () => {
    if (photos.length >= 5) {
      Alert.alert('Límite', 'Máximo 5 fotos por incidente.');
      return;
    }

    Alert.alert(
      'Agregar Foto',
      '¿Cómo deseas agregar la foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Galería', onPress: pickFromGallery },
        { text: 'Cámara', onPress: takePhoto },
      ]
    );
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Requerido', 'Necesitamos acceso a la cámara.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Camera error:', error);
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Requerido', 'Necesitamos acceso a tus fotos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Gallery error:', error);
    }
  };

  const removePhoto = (index) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  const handleSubmit = async () => {
    const currentTitle = titleRef.current;
    const currentDescription = descriptionRef.current;

    if (!currentTitle.trim()) {
      Alert.alert('Error', 'Por favor ingresa un título');
      resetSlider();
      return;
    }

    if (!currentDescription.trim()) {
      Alert.alert('Error', 'Por favor describe el incidente');
      resetSlider();
      return;
    }

    try {
      setLoading(true);

      const result = await createIncident({
        type,
        severity,
        title: currentTitle.trim(),
        description: currentDescription.trim(),
        coordinates: location,
        photos: photos.length > 0 ? photos : undefined,
      });

      if (result.success) {
        Alert.alert(
          'Incidente Reportado',
          `Referencia: ${result.data.incident.reference_number}\n\nTu reporte ha sido enviado exitosamente.`,
          [{ text: 'OK' }]
        );
        handleClose();
        onSuccess();
      } else {
        Alert.alert('Error', result.error || 'No se pudo crear el incidente');
        resetSlider();
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Ocurrió un error al enviar el reporte');
      resetSlider();
    } finally {
      setLoading(false);
    }
  };

  const resetSlider = () => {
    setSliderComplete(false);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: false,
    }).start();
  };

  const handleTitleChange = (text) => {
    setTitle(text);
    titleRef.current = text;
  };

  const handleDescriptionChange = (text) => {
    setDescription(text);
    descriptionRef.current = text;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Incidentes</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.subtitle}>Creando reporte de incidente</Text>

          {/* Incident Type */}
          <Text style={styles.label}>Tipo de Incidente*</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {INCIDENT_TYPES.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.typeChip,
                  type === item.id && styles.typeChipSelected,
                ]}
                onPress={() => setType(item.id)}
              >
                <Text style={[
                  styles.typeChipText,
                  type === item.id && styles.typeChipTextSelected,
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Severity */}
          <Text style={styles.label}>Severidad*</Text>
          <View style={styles.severityRow}>
            {SEVERITY_LEVELS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.severityChip,
                  { backgroundColor: severity === item.id ? item.color : COLORS.white },
                ]}
                onPress={() => setSeverity(item.id)}
              >
                <Text style={styles.severityChipText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Title */}
          <Text style={styles.label}>Título</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Ruido excesivo en área comun"
            placeholderTextColor={COLORS.gray}
            value={title}
            onChangeText={handleTitleChange}
            maxLength={100}
          />

          {/* Description */}
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe los detalles del incidente"
            placeholderTextColor={COLORS.gray}
            value={description}
            onChangeText={handleDescriptionChange}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />

          {/* Location */}
          <Text style={styles.label}>Ubicación (Opcional)</Text>
          <TouchableOpacity 
            style={styles.locationButton} 
            onPress={handleGetLocation}
            disabled={gettingLocation}
          >
            {gettingLocation ? (
              <ActivityIndicator size="small" color={COLORS.cyan} />
            ) : (
              <View style={styles.locationIcon}>
                <Ionicons 
                  name="location" 
                  size={14} 
                  color={location ? COLORS.lime : COLORS.black} 
                />
              </View>
            )}
            <Text style={[styles.locationText, location && styles.locationTextActive]}>
              {location 
                ? 'Ubicación registrada' 
                : 'Obtener mi ubicación actual'}
            </Text>
          </TouchableOpacity>

          {/* Photos */}
          <Text style={styles.label}>Fotos (opcional)</Text>
          
          {photos.length > 0 && (
            <View style={styles.photosRow}>
              {photos.map((uri, index) => (
                <View key={index} style={styles.photoWrapper}>
                  <Image source={{ uri }} style={styles.photoPreview} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <Ionicons name="close" size={12} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity 
            style={styles.addPhotoButton} 
            onPress={handleAddPhoto}
            disabled={photos.length >= 5}
          >
            <Ionicons 
              name="camera" 
              size={25} 
              color={photos.length >= 5 ? COLORS.gray : COLORS.cyan} 
            />
            <Text style={[
              styles.addPhotoText,
              photos.length >= 5 && styles.addPhotoTextDisabled
            ]}>
              Agregar Foto ({photos.length}/5)
            </Text>
          </TouchableOpacity>

          <View style={{ height: scale(100) }} />
        </ScrollView>

        {/* Slide to Submit Button */}
        <View style={styles.sliderContainer}>
          <View style={styles.sliderTrack}>
            <Animated.View
              style={[
                styles.sliderButton,
                { transform: [{ translateX: slideAnim }] },
              ]}
              {...panResponder.panHandlers}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.black} />
              ) : (
                <Ionicons name="arrow-forward" size={20} color={COLORS.black} />
              )}
            </Animated.View>
            <Text style={styles.sliderText}>
              {loading ? 'Enviando...' : 'Desliza para crear incidente'}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingTop: Platform.OS === 'ios' ? scale(60) : scale(20),
    paddingBottom: scale(12),
    backgroundColor: COLORS.background,
  },
  closeButton: {
    width: scale(40),
    height: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: scale(22),
    fontWeight: '700',
    color: COLORS.black,
  },
  headerRight: {
    width: scale(40),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(21),
    paddingBottom: scale(120),
  },
  subtitle: {
    fontSize: scale(14),
    fontWeight: '400',
    color: COLORS.black,
    marginBottom: scale(20),
  },
  label: {
    fontSize: scale(14),
    fontWeight: '400',
    color: COLORS.black,
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  chipsRow: {
    flexDirection: 'row',
    gap: scale(8),
    paddingRight: scale(20),
  },
  typeChip: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(13),
    backgroundColor: COLORS.white,
  },
  typeChipSelected: {
    backgroundColor: COLORS.black,
    borderWidth: 2,
    borderColor: COLORS.lime,
  },
  typeChipText: {
    fontSize: scale(14),
    fontWeight: '400',
    color: COLORS.black,
    textAlign: 'center',
  },
  typeChipTextSelected: {
    color: COLORS.white,
  },
  severityRow: {
    flexDirection: 'row',
    gap: scale(8),
  },
  severityChip: {
    flex: 1,
    paddingVertical: scale(8),
    borderRadius: scale(13),
    alignItems: 'center',
  },
  severityChipText: {
    fontSize: scale(14),
    fontWeight: '400',
    color: COLORS.black,
    textAlign: 'center',
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: scale(13),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    fontSize: scale(14),
    color: COLORS.black,
  },
  textArea: {
    height: scale(96),
    textAlignVertical: 'top',
    paddingTop: scale(14),
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: scale(13),
    paddingHorizontal: scale(12),
    paddingVertical: scale(14),
  },
  locationIcon: {
    marginRight: scale(10),
  },
  locationText: {
    fontSize: scale(14),
    color: COLORS.gray,
  },
  locationTextActive: {
    color: COLORS.black,
    fontWeight: '500',
  },
  photosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
    marginBottom: scale(12),
  },
  photoWrapper: {
    position: 'relative',
  },
  photoPreview: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(8),
    backgroundColor: COLORS.grayLight,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -scale(6),
    right: -scale(6),
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.photoBg,
    borderWidth: 1,
    borderColor: COLORS.cyan,
    borderStyle: 'dashed',
    borderRadius: scale(13),
    paddingVertical: scale(24),
    gap: scale(10),
  },
  addPhotoText: {
    fontSize: scale(14),
    fontWeight: '400',
    color: COLORS.cyan,
    textAlign: 'center',
  },
  addPhotoTextDisabled: {
    color: COLORS.gray,
  },
  sliderContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? scale(40) : scale(20),
    left: scale(18),
    right: scale(18),
  },
  sliderTrack: {
    height: scale(56),
    backgroundColor: COLORS.black,
    borderRadius: scale(30),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(6),
  },
  sliderButton: {
    width: SLIDER_BUTTON_SIZE,
    height: SLIDER_BUTTON_SIZE,
    borderRadius: SLIDER_BUTTON_SIZE / 2,
    backgroundColor: COLORS.lime,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  sliderText: {
    flex: 1,
    fontSize: scale(14),
    fontWeight: '400',
    color: COLORS.lime,
    textAlign: 'center',
    marginLeft: -SLIDER_BUTTON_SIZE,
  },
});