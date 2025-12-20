// app/admin/announcements.js
// ISSY Resident App - Admin: Gestión de Anuncios (Diseño Figma)

import { useState, useEffect, useCallback, useRef } from 'react';
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
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH - 90;

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.joinissy.com';

// Colores
const COLORS = {
  primary: '#009FF5',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  purple: '#8B5CF6',
  navy: '#1A1A2E',
  black: '#000000',
  white: '#FFFFFF',
  background: '#FAFAFA',
  gray: '#6B7280',
  grayLight: '#E5E7EB',
  grayLighter: '#F9FAFB',
  pink: '#FA5967',
};

// Tipos de anuncios
const ANNOUNCEMENT_TYPES = [
  { value: 'info', label: '📢 Información', color: COLORS.primary },
  { value: 'warning', label: '⚠️ Advertencia', color: COLORS.warning },
  { value: 'alert', label: '🚨 Alerta', color: COLORS.danger },
  { value: 'maintenance', label: '🔧 Mantenimiento', color: COLORS.purple },
  { value: 'event', label: '🎉 Evento', color: COLORS.success },
];

// Prioridades
const PRIORITIES = [
  { value: 'low', label: 'Baja', color: COLORS.success },
  { value: 'normal', label: 'Normal', color: COLORS.primary },
  { value: 'medium', label: 'Media', color: COLORS.warning },
  { value: 'high', label: 'Alta', color: COLORS.danger },
  { value: 'urgent', label: 'Urgente', color: '#DC2626' },
];

// Audiencias
const TARGET_AUDIENCES = [
  { value: 'all', label: '👥 Todos' },
  { value: 'residents', label: '🏠 Residentes' },
  { value: 'guards', label: '🛡️ Guardias' },
  { value: 'admins', label: '⚙️ Administradores' },
];

export default function AdminAnnouncements() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const imageScrollRef = useRef(null);
  
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Images state
  const [selectedImages, setSelectedImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    priority: 'normal',
    target_audience: 'all',
    send_push: true,
  });

  const userRole = profile?.role || user?.role || 'user';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Acceso Denegado', 'No tienes permisos para acceder a esta sección');
      router.back();
      return;
    }
    fetchAnnouncements();
  }, []);

  const getAuthHeaders = async () => {
    const authToken = await AsyncStorage.getItem('token');
    if (!authToken) {
      throw new Error('No hay sesión activa');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };
  };

  const handleSessionExpired = () => {
    Alert.alert(
      'Sesión Expirada',
      'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
      [
        {
          text: 'OK',
          onPress: () => {
            signOut();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  const fetchAnnouncements = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/announcements`, { headers });
      
      if (response.status === 401) {
        handleSessionExpired();
        return;
      }
      
      const data = await response.json();
      
      if (data.success || Array.isArray(data)) {
        const announcementsList = data.data || data.announcements || data;
        setAnnouncements(Array.isArray(announcementsList) ? announcementsList : []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      if (error.message === 'No hay sesión activa') {
        handleSessionExpired();
      } else {
        Alert.alert('Error', 'No se pudieron cargar los anuncios');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnnouncements();
  }, []);

  const handleCreate = () => {
    setEditingAnnouncement(null);
    setSelectedImages([]);
    setExistingImages([]);
    setFormData({
      title: '',
      message: '',
      type: 'info',
      priority: 'normal',
      target_audience: 'all',
      send_push: true,
    });
    setShowModal(true);
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setSelectedImages([]);
    setExistingImages(announcement.images || []);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type || 'info',
      priority: announcement.priority || 'normal',
      target_audience: announcement.target_audience || 'all',
      send_push: announcement.send_push !== false,
    });
    setShowDetailModal(false);
    setShowModal(true);
  };

  const handleOpenDetail = (announcement) => {
    setSelectedAnnouncement(announcement);
    setCurrentImageIndex(0);
    setShowDetailModal(true);
  };

  // Image picker
  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para subir imágenes');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10 - selectedImages.length - existingImages.length,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => ({
          uri: asset.uri,
          type: 'image/jpeg',
          name: asset.fileName || `image_${Date.now()}.jpg`,
        }));
        setSelectedImages([...selectedImages, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'No se pudieron seleccionar las imágenes');
    }
  };

  const removeSelectedImage = (index) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    if (selectedImages.length === 0) return [];

    setUploading(true);
    try {
      const authToken = await AsyncStorage.getItem('token');
      if (!authToken) {
        throw new Error('No hay sesión activa');
      }
      
      const uploadFormData = new FormData();

      selectedImages.forEach((image) => {
        uploadFormData.append('images', {
          uri: image.uri,
          type: image.type,
          name: image.name,
        });
      });

      const response = await fetch(`${API_URL}/api/announcements/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'multipart/form-data',
        },
        body: uploadFormData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data.data.urls || [];
      } else if (response.status === 401) {
        handleSessionExpired();
        throw new Error('Sesión expirada');
      } else {
        throw new Error(data.message || 'Error uploading images');
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return;
    }
    if (!formData.message.trim()) {
      Alert.alert('Error', 'El mensaje es requerido');
      return;
    }

    setSaving(true);
    try {
      let uploadedUrls = [];
      if (selectedImages.length > 0) {
        uploadedUrls = await uploadImages();
      }

      const allImages = [...existingImages, ...uploadedUrls];

      const headers = await getAuthHeaders();
      const url = editingAnnouncement 
        ? `${API_URL}/api/announcements/${editingAnnouncement.id}`
        : `${API_URL}/api/announcements`;
      
      const response = await fetch(url, {
        method: editingAnnouncement ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          images: allImages,
          location_id: profile?.location_id,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      if (response.ok) {
        Alert.alert(
          'Éxito', 
          editingAnnouncement ? 'Anuncio actualizado' : 'Anuncio creado'
        );
        setShowModal(false);
        fetchAnnouncements();
      } else {
        Alert.alert('Error', data.error || 'No se pudo guardar el anuncio');
      }
    } catch (error) {
      console.error('Error saving announcement:', error);
      if (error.message === 'No hay sesión activa' || error.message === 'Sesión expirada') {
        handleSessionExpired();
      } else {
        Alert.alert('Error', 'No se pudo guardar el anuncio');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (announcement) => {
    Alert.alert(
      'Eliminar Anuncio',
      `¿Estás seguro de eliminar "${announcement.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(
                `${API_URL}/api/announcements/${announcement.id}`,
                { method: 'DELETE', headers }
              );

              if (response.status === 401) {
                handleSessionExpired();
                return;
              }
              
              if (response.ok) {
                Alert.alert('Éxito', 'Anuncio eliminado');
                setShowDetailModal(false);
                fetchAnnouncements();
              } else {
                const data = await response.json();
                Alert.alert('Error', data.error || 'No se pudo eliminar');
              }
            } catch (error) {
              if (error.message === 'No hay sesión activa' || error.message === 'Sesión expirada') {
                handleSessionExpired();
              } else {
                Alert.alert('Error', 'No se pudo eliminar el anuncio');
              }
            }
          }
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) {
      return `Hace ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('es-HN', { 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
      });
    }
  };

  const formatFullDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleImageScroll = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / IMAGE_SIZE);
    setCurrentImageIndex(index);
  };

  const renderImageCarousel = () => {
    const images = selectedAnnouncement?.images || [];
    
    if (images.length === 0) {
      return null;
    }

    return (
      <View style={styles.carouselContainer}>
        <ScrollView
          ref={imageScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleImageScroll}
          scrollEventThrottle={16}
          style={styles.imageScroll}
        >
          {images.map((imageUrl, index) => (
            <Image
              key={index}
              source={{ uri: imageUrl }}
              style={styles.carouselImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
        
        {images.length > 1 && (
          <View style={styles.dotsContainer}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  { backgroundColor: index === currentImageIndex ? '#D4FE48' : '#FFFFFF' }
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderAnnouncement = ({ item }) => {
    const isNew = !item.is_read;
    
    return (
      <TouchableOpacity
        style={styles.announcementCard}
        onPress={() => handleOpenDetail(item)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#D4FE48', '#11DAE9']}
          style={styles.gradientBar}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleSection}>
              <Text style={styles.announcementTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.announcementPreview} numberOfLines={1}>
                {item.message}
              </Text>
              <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
            </View>
            
            <View style={styles.cardRight}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: isNew ? COLORS.pink : COLORS.primary }
              ]}>
                <Text style={styles.statusBadgeText}>
                  {isNew ? 'NUEVO' : 'VISTO'}
                </Text>
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => handleDelete(item)}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.gray} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => handleOpenDetail(item)}
                >
                  <Ionicons name="arrow-forward" size={18} color={COLORS.black} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="megaphone-outline" size={64} color="#D1D5DB" />
      </View>
      <Text style={styles.emptyTitle}>No hay anuncios</Text>
      <Text style={styles.emptySubtitle}>
        Crea tu primer anuncio para informar a tu comunidad
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleCreate}>
        <Text style={styles.emptyButtonText}>Crear Anuncio</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando anuncios...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Anuncios</Text>
            {announcements.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{announcements.length}</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerSubtitle}>Gestión de anuncios</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Lista de anuncios */}
      <FlatList
        data={announcements}
        renderItem={renderAnnouncement}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Botón flotante de crear */}
      <TouchableOpacity style={styles.fab} onPress={handleCreate}>
        <LinearGradient
          colors={['#D4FE48', '#11DAE9']}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={28} color={COLORS.black} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Modal de detalle */}
      <Modal
        visible={showDetailModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContainer}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowDetailModal(false)}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>

            {selectedAnnouncement && (
              <ScrollView 
                style={styles.detailModalContent}
                showsVerticalScrollIndicator={false}
              >
                {renderImageCarousel()}

                <Text style={styles.detailTitle}>{selectedAnnouncement.title}</Text>
                <Text style={styles.detailMessage}>{selectedAnnouncement.message}</Text>
                <Text style={styles.detailDate}>
                  {formatFullDate(selectedAnnouncement.created_at)}
                </Text>

                {/* Admin actions */}
                <View style={styles.adminActions}>
                  <TouchableOpacity 
                    style={styles.editDetailButton}
                    onPress={() => handleEdit(selectedAnnouncement)}
                  >
                    <Ionicons name="pencil" size={18} color={COLORS.primary} />
                    <Text style={styles.editDetailButtonText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteDetailButton}
                    onPress={() => handleDelete(selectedAnnouncement)}
                  >
                    <Ionicons name="trash" size={18} color={COLORS.danger} />
                    <Text style={styles.deleteDetailButtonText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Crear/Editar */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.formModalContainer}>
          <View style={styles.formModalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.formModalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.formModalTitle}>
              {editingAnnouncement ? 'Editar Anuncio' : 'Nuevo Anuncio'}
            </Text>
            <TouchableOpacity onPress={handleSubmit} disabled={saving || uploading}>
              {saving || uploading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.formModalSave}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formModalContent}>
            {/* Título */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Título *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Ej: Fiesta de fin de año"
                placeholderTextColor={COLORS.gray}
              />
            </View>

            {/* Mensaje */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Mensaje *</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                value={formData.message}
                onChangeText={(text) => setFormData({ ...formData, message: text })}
                placeholder="Escribe el contenido del anuncio..."
                placeholderTextColor={COLORS.gray}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Imágenes */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Imágenes (máx. 10)</Text>
              
              {existingImages.length > 0 && (
                <View style={styles.imagesContainer}>
                  {existingImages.map((uri, index) => (
                    <View key={`existing-${index}`} style={styles.imageWrapper}>
                      <Image source={{ uri }} style={styles.imagePreview} />
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => removeExistingImage(index)}
                      >
                        <Ionicons name="close-circle" size={24} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {selectedImages.length > 0 && (
                <View style={styles.imagesContainer}>
                  {selectedImages.map((image, index) => (
                    <View key={`selected-${index}`} style={styles.imageWrapper}>
                      <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => removeSelectedImage(index)}
                      >
                        <Ionicons name="close-circle" size={24} color={COLORS.danger} />
                      </TouchableOpacity>
                      <View style={styles.newImageBadge}>
                        <Text style={styles.newImageBadgeText}>Nueva</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {(existingImages.length + selectedImages.length) < 10 && (
                <TouchableOpacity style={styles.addImageButton} onPress={pickImages}>
                  <Ionicons name="camera" size={24} color={COLORS.primary} />
                  <Text style={styles.addImageText}>Agregar Imágenes</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Tipo */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tipo</Text>
              <View style={styles.optionsRow}>
                {ANNOUNCEMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.optionButton,
                      formData.type === type.value && { 
                        backgroundColor: type.color + '20',
                        borderColor: type.color,
                      }
                    ]}
                    onPress={() => setFormData({ ...formData, type: type.value })}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      formData.type === type.value && { color: type.color }
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Prioridad */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Prioridad</Text>
              <View style={styles.optionsRow}>
                {PRIORITIES.map((priority) => (
                  <TouchableOpacity
                    key={priority.value}
                    style={[
                      styles.optionButton,
                      formData.priority === priority.value && { 
                        backgroundColor: priority.color + '20',
                        borderColor: priority.color,
                      }
                    ]}
                    onPress={() => setFormData({ ...formData, priority: priority.value })}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      formData.priority === priority.value && { color: priority.color }
                    ]}>
                      {priority.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Audiencia */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Dirigido a</Text>
              <View style={styles.optionsRow}>
                {TARGET_AUDIENCES.map((audience) => (
                  <TouchableOpacity
                    key={audience.value}
                    style={[
                      styles.optionButton,
                      formData.target_audience === audience.value && { 
                        backgroundColor: COLORS.primary + '20',
                        borderColor: COLORS.primary,
                      }
                    ]}
                    onPress={() => setFormData({ ...formData, target_audience: audience.value })}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      formData.target_audience === audience.value && { color: COLORS.primary }
                    ]}>
                      {audience.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notificaciones Push */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notificaciones</Text>
              <TouchableOpacity 
                style={styles.toggleRow}
                onPress={() => setFormData({ ...formData, send_push: !formData.send_push })}
              >
                <View style={styles.toggleInfo}>
                  <Ionicons 
                    name="notifications" 
                    size={20} 
                    color={formData.send_push ? COLORS.primary : COLORS.gray} 
                  />
                  <Text style={styles.toggleLabel}>Enviar notificación push</Text>
                </View>
                <View style={[
                  styles.toggleSwitch,
                  formData.send_push && styles.toggleSwitchActive
                ]}>
                  <View style={[
                    styles.toggleKnob,
                    formData.send_push && styles.toggleKnobActive
                  ]} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.black,
  },
  countBadge: {
    backgroundColor: COLORS.pink,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  countBadgeText: {
    color: COLORS.black,
    fontSize: 11,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.black,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },

  // Card
  announcementCard: {
    backgroundColor: COLORS.white,
    borderRadius: 13,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  gradientBar: {
    width: 11,
    borderTopLeftRadius: 13,
    borderBottomLeftRadius: 13,
  },
  cardContent: {
    flex: 1,
    padding: 16,
    paddingLeft: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  announcementTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.black,
    marginBottom: 4,
  },
  announcementPreview: {
    fontSize: 14,
    color: '#707883',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 10,
    color: COLORS.primary,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
    marginBottom: 8,
  },
  statusBadgeText: {
    color: COLORS.black,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Detail Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailModalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 13,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalContent: {
    padding: 24,
    paddingTop: 16,
  },

  // Carousel
  carouselContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  imageScroll: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 13,
  },
  carouselImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 13,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -24,
    paddingBottom: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginHorizontal: 3,
  },

  // Detail content
  detailTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.black,
    marginBottom: 12,
  },
  detailMessage: {
    fontSize: 14,
    color: '#707883',
    lineHeight: 18,
    marginBottom: 24,
  },
  detailDate: {
    fontSize: 10,
    color: '#707883',
    textTransform: 'capitalize',
    marginBottom: 20,
  },

  // Admin actions in detail modal
  adminActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
  },
  editDetailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '15',
  },
  editDetailButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteDetailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.danger + '15',
  },
  deleteDetailButtonText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600',
  },

  // Form Modal
  formModalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  formModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  formModalCancel: {
    fontSize: 16,
    color: COLORS.gray,
  },
  formModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.navy,
  },
  formModalSave: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  formModalContent: {
    flex: 1,
    padding: 16,
  },

  // Form
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: COLORS.grayLighter,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.navy,
  },
  formTextarea: {
    height: 120,
    paddingTop: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    backgroundColor: COLORS.white,
  },
  optionButtonText: {
    fontSize: 13,
    color: COLORS.gray,
  },

  // Images
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  imageWrapper: {
    position: 'relative',
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.grayLight,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  newImageBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: COLORS.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newImageBadgeText: {
    fontSize: 8,
    color: COLORS.white,
    fontWeight: '600',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
    backgroundColor: COLORS.primary + '10',
  },
  addImageText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.grayLighter,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleLabel: {
    fontSize: 14,
    color: COLORS.navy,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.grayLight,
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: COLORS.primary,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  toggleKnobActive: {
    transform: [{ translateX: 22 }],
  },
});