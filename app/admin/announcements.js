// app/admin/announcements.js
// ISSY Resident App - Admin: Gestión de Anuncios (ProHome Dark Theme) + i18n

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
import { useTranslation } from '../../src/hooks/useTranslation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const IMAGE_SIZE = SCREEN_WIDTH - 90;

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.joinissy.com';

// ProHome Dark Theme Colors
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
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  border: 'rgba(255,255,255,0.1)',
};

export default function AdminAnnouncements() {
  const { t, language } = useTranslation();
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const imageScrollRef = useRef(null);
  
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info',
    priority: 'normal',
    target_audience: 'all',
    is_pinned: false,
    is_active: true,
  });

  // Tipos de anuncios con traducciones
  const ANNOUNCEMENT_TYPES = [
    { value: 'info', label: `📢 ${t('admin.announcements.types.info')}`, color: COLORS.teal },
    { value: 'warning', label: `⚠️ ${t('admin.announcements.types.warning')}`, color: COLORS.warning },
    { value: 'alert', label: `🚨 ${t('admin.announcements.types.alert')}`, color: COLORS.danger },
    { value: 'maintenance', label: `🔧 ${t('admin.announcements.types.maintenance')}`, color: COLORS.purple },
    { value: 'event', label: `🎉 ${t('admin.announcements.types.event')}`, color: COLORS.success },
  ];

  // Prioridades con traducciones
  const PRIORITIES = [
    { value: 'low', label: t('admin.announcements.priorities.low'), color: COLORS.success },
    { value: 'normal', label: t('admin.announcements.priorities.normal'), color: COLORS.teal },
    { value: 'medium', label: t('admin.announcements.priorities.medium'), color: COLORS.warning },
    { value: 'high', label: t('admin.announcements.priorities.high'), color: COLORS.danger },
    { value: 'urgent', label: t('admin.announcements.priorities.urgent'), color: '#DC2626' },
  ];

  // Audiencias con traducciones
  const TARGET_AUDIENCES = [
    { value: 'all', label: `👥 ${t('admin.announcements.audiences.all')}` },
    { value: 'residents', label: `🏠 ${t('admin.announcements.audiences.residents')}` },
    { value: 'guards', label: `🛡️ ${t('admin.announcements.audiences.guards')}` },
    { value: 'admins', label: `⚙️ ${t('admin.announcements.audiences.admins')}` },
  ];

  // Locale para fechas
  const getLocale = () => {
    const locales = { es: 'es-HN', en: 'en-US', fr: 'fr-FR', pt: 'pt-BR' };
    return locales[language] || 'es-HN';
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchAnnouncements = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/announcements/admin`, { headers });
      const data = await response.json();
      if (data.success) {
        setAnnouncements(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements();
  };

  const openCreateModal = () => {
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      content: '',
      type: 'info',
      priority: 'normal',
      target_audience: 'all',
      is_pinned: false,
      is_active: true,
    });
    setSelectedImages([]);
    setExistingImages([]);
    setShowModal(true);
  };

  const openEditModal = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title || '',
      content: announcement.content || '',
      type: announcement.type || 'info',
      priority: announcement.priority || 'normal',
      target_audience: announcement.target_audience || 'all',
      is_pinned: announcement.is_pinned || false,
      is_active: announcement.is_active !== false,
    });
    setSelectedImages([]);
    setExistingImages(announcement.images || []);
    setShowDetailModal(false);
    setShowModal(true);
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setSelectedImages([...selectedImages, ...result.assets]);
    }
  };

  const removeNewImage = (index) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    if (selectedImages.length === 0) return [];
    setUploading(true);
    const uploadedUrls = [];
    try {
      for (const image of selectedImages) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', {
          uri: image.uri,
          type: 'image/jpeg',
          name: `announcement_${Date.now()}.jpg`,
        });
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formDataUpload,
        });
        const data = await response.json();
        if (data.success && data.url) {
          uploadedUrls.push(data.url);
        }
      }
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setUploading(false);
    }
    return uploadedUrls;
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      Alert.alert(t('common.error'), t('admin.announcements.errors.titleContentRequired'));
      return;
    }
    setSaving(true);
    try {
      const newImageUrls = await uploadImages();
      const allImages = [...existingImages, ...newImageUrls];
      const headers = await getAuthHeaders();
      const url = editingAnnouncement 
        ? `${API_URL}/api/announcements/${editingAnnouncement.id}`
        : `${API_URL}/api/announcements`;
      const response = await fetch(url, {
        method: editingAnnouncement ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify({ ...formData, images: allImages }),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert(
          t('common.success'), 
          editingAnnouncement ? t('admin.announcements.success.updated') : t('admin.announcements.success.created')
        );
        setShowModal(false);
        fetchAnnouncements();
      } else {
        Alert.alert(t('common.error'), data.error || t('admin.announcements.errors.saveFailed'));
      }
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert(t('common.error'), t('admin.announcements.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (announcement) => {
    Alert.alert(
      t('admin.announcements.deleteTitle'),
      t('admin.announcements.deleteMessage', { title: announcement.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(`${API_URL}/api/announcements/${announcement.id}`, {
                method: 'DELETE',
                headers,
              });
              const data = await response.json();
              if (data.success) {
                Alert.alert(t('common.success'), t('admin.announcements.success.deleted'));
                setShowDetailModal(false);
                fetchAnnouncements();
              } else {
                Alert.alert(t('common.error'), t('admin.announcements.errors.deleteFailed'));
              }
            } catch (error) {
              console.error('Error deleting:', error);
              Alert.alert(t('common.error'), t('admin.announcements.errors.deleteFailed'));
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
      return t('announcements.timeAgo.minutesAgo', { count: diffMinutes });
    } else if (diffHours < 24) {
      return t('announcements.timeAgo.hoursAgo', { count: diffHours });
    } else if (diffDays < 7) {
      return t('announcements.timeAgo.daysAgo', { count: diffDays });
    } else {
      return date.toLocaleDateString(getLocale(), { 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
      });
    }
  };

  const formatFullDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(getLocale(), {
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
    if (images.length === 0) return null;
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
            <Image key={index} source={{ uri: imageUrl }} style={styles.carouselImage} resizeMode="cover" />
          ))}
        </ScrollView>
        {images.length > 1 && (
          <View style={styles.dotsContainer}>
            {images.map((_, index) => (
              <View key={index} style={[styles.dot, { backgroundColor: index === currentImageIndex ? COLORS.lime : COLORS.textMuted }]} />
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderAnnouncement = ({ item }) => {
    const typeConfig = ANNOUNCEMENT_TYPES.find(t => t.value === item.type) || ANNOUNCEMENT_TYPES[0];
    const priorityConfig = PRIORITIES.find(p => p.value === item.priority) || PRIORITIES[1];
    return (
      <TouchableOpacity 
        style={styles.announcementCard}
        onPress={() => {
          setSelectedAnnouncement(item);
          setCurrentImageIndex(0);
          setShowDetailModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.color + '20' }]}>
            <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
          </View>
          <View style={styles.cardMeta}>
            {item.is_pinned && <Ionicons name="pin" size={14} color={COLORS.lime} />}
            {!item.is_active && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>{t('admin.announcements.inactive')}</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardContent} numberOfLines={2}>{item.content}</Text>
        {item.images?.length > 0 && (
          <View style={styles.imageIndicator}>
            <Ionicons name="images-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.imageCount}>
              {item.images.length} {item.images.length === 1 ? t('admin.announcements.image') : t('admin.announcements.images')}
            </Text>
          </View>
        )}
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
          <View style={[styles.priorityDot, { backgroundColor: priorityConfig.color }]} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderFormModal = () => (
    <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
      <SafeAreaView style={styles.formModalContainer} edges={['top']}>
        <View style={styles.formModalHeader}>
          <TouchableOpacity onPress={() => setShowModal(false)}>
            <Text style={styles.formModalCancel}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.formModalTitle}>
            {editingAnnouncement ? t('admin.announcements.editAnnouncement') : t('admin.announcements.newAnnouncement')}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={COLORS.lime} /> : <Text style={styles.formModalSave}>{t('common.save')}</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.formModalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.announcements.form.title')} *</Text>
            <TextInput
              style={styles.formInput}
              placeholder={t('admin.announcements.form.titlePlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={formData.title}
              onChangeText={(text) => setFormData({...formData, title: text})}
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.announcements.form.content')} *</Text>
            <TextInput
              style={[styles.formInput, styles.formTextarea]}
              placeholder={t('admin.announcements.form.contentPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={formData.content}
              onChangeText={(text) => setFormData({...formData, content: text})}
              multiline
              textAlignVertical="top"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.announcements.form.type')}</Text>
            <View style={styles.optionsRow}>
              {ANNOUNCEMENT_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.optionButton, formData.type === type.value && { backgroundColor: type.color + '30', borderColor: type.color }]}
                  onPress={() => setFormData({...formData, type: type.value})}
                >
                  <Text style={[styles.optionButtonText, formData.type === type.value && { color: type.color }]}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.announcements.form.priority')}</Text>
            <View style={styles.optionsRow}>
              {PRIORITIES.map(priority => (
                <TouchableOpacity
                  key={priority.value}
                  style={[styles.optionButton, formData.priority === priority.value && { backgroundColor: priority.color + '30', borderColor: priority.color }]}
                  onPress={() => setFormData({...formData, priority: priority.value})}
                >
                  <Text style={[styles.optionButtonText, formData.priority === priority.value && { color: priority.color }]}>{priority.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.announcements.form.audience')}</Text>
            <View style={styles.optionsRow}>
              {TARGET_AUDIENCES.map(audience => (
                <TouchableOpacity
                  key={audience.value}
                  style={[styles.optionButton, formData.target_audience === audience.value && styles.optionButtonSelected]}
                  onPress={() => setFormData({...formData, target_audience: audience.value})}
                >
                  <Text style={[styles.optionButtonText, formData.target_audience === audience.value && styles.optionButtonTextSelected]}>{audience.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.announcements.form.images')}</Text>
            {(existingImages.length > 0 || selectedImages.length > 0) && (
              <View style={styles.imagesContainer}>
                {existingImages.map((url, index) => (
                  <View key={`existing-${index}`} style={styles.imageWrapper}>
                    <Image source={{ uri: url }} style={styles.imagePreview} />
                    <TouchableOpacity style={styles.removeImageButton} onPress={() => removeExistingImage(index)}>
                      <Ionicons name="close-circle" size={24} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                {selectedImages.map((image, index) => (
                  <View key={`new-${index}`} style={styles.imageWrapper}>
                    <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                    <TouchableOpacity style={styles.removeImageButton} onPress={() => removeNewImage(index)}>
                      <Ionicons name="close-circle" size={24} color={COLORS.danger} />
                    </TouchableOpacity>
                    <View style={styles.newImageBadge}>
                      <Text style={styles.newImageBadgeText}>{t('admin.announcements.new')}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity style={styles.addImageButton} onPress={pickImages}>
              <Ionicons name="camera-outline" size={20} color={COLORS.lime} />
              <Text style={styles.addImageText}>{t('admin.announcements.addImages')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('admin.announcements.form.options')}</Text>
            <TouchableOpacity style={styles.toggleRow} onPress={() => setFormData({...formData, is_pinned: !formData.is_pinned})}>
              <View style={styles.toggleInfo}>
                <Ionicons name="pin" size={18} color={formData.is_pinned ? COLORS.lime : COLORS.textMuted} />
                <Text style={styles.toggleLabel}>{t('admin.announcements.pinAnnouncement')}</Text>
              </View>
              <View style={[styles.toggleSwitch, formData.is_pinned && styles.toggleSwitchActive]}>
                <View style={[styles.toggleKnob, formData.is_pinned && styles.toggleKnobActive]} />
              </View>
            </TouchableOpacity>
            <View style={{ height: 10 }} />
            <TouchableOpacity style={styles.toggleRow} onPress={() => setFormData({...formData, is_active: !formData.is_active})}>
              <View style={styles.toggleInfo}>
                <Ionicons name="eye" size={18} color={formData.is_active ? COLORS.success : COLORS.textMuted} />
                <Text style={styles.toggleLabel}>{t('admin.announcements.activeAnnouncement')}</Text>
              </View>
              <View style={[styles.toggleSwitch, formData.is_active && styles.toggleSwitchActive]}>
                <View style={[styles.toggleKnob, formData.is_active && styles.toggleKnobActive]} />
              </View>
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderDetailModal = () => {
    if (!selectedAnnouncement) return null;
    const typeConfig = ANNOUNCEMENT_TYPES.find(t => t.value === selectedAnnouncement.type) || ANNOUNCEMENT_TYPES[0];
    const priorityConfig = PRIORITIES.find(p => p.value === selectedAnnouncement.priority) || PRIORITIES[1];
    const audienceConfig = TARGET_AUDIENCES.find(a => a.value === selectedAnnouncement.target_audience) || TARGET_AUDIENCES[0];
    return (
      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowDetailModal(false)}>
        <SafeAreaView style={styles.detailModalContainer} edges={['top']}>
          <View style={styles.detailModalHeader}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.detailModalTitle}>{t('admin.announcements.detail')}</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
            {renderImageCarousel()}
            <View style={styles.detailBody}>
              <View style={styles.detailBadges}>
                <View style={[styles.typeBadge, { backgroundColor: typeConfig.color + '20' }]}>
                  <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
                </View>
                <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.color + '20' }]}>
                  <Text style={[styles.priorityBadgeText, { color: priorityConfig.color }]}>{priorityConfig.label}</Text>
                </View>
                {selectedAnnouncement.is_pinned && (
                  <View style={styles.pinnedBadge}>
                    <Ionicons name="pin" size={12} color={COLORS.lime} />
                    <Text style={styles.pinnedBadgeText}>{t('admin.announcements.pinned')}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.detailTitle}>{selectedAnnouncement.title}</Text>
              <Text style={styles.detailContentText}>{selectedAnnouncement.content}</Text>
              <View style={styles.detailMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color={COLORS.textMuted} />
                  <Text style={styles.metaText}>{formatFullDate(selectedAnnouncement.created_at)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="people-outline" size={16} color={COLORS.textMuted} />
                  <Text style={styles.metaText}>{audienceConfig.label}</Text>
                </View>
                {!selectedAnnouncement.is_active && (
                  <View style={styles.metaItem}>
                    <Ionicons name="eye-off-outline" size={16} color={COLORS.warning} />
                    <Text style={[styles.metaText, { color: COLORS.warning }]}>{t('admin.announcements.inactive')}</Text>
                  </View>
                )}
              </View>
              <View style={styles.adminActions}>
                <TouchableOpacity style={styles.editDetailButton} onPress={() => openEditModal(selectedAnnouncement)}>
                  <Ionicons name="pencil" size={18} color={COLORS.teal} />
                  <Text style={styles.editDetailButtonText}>{t('common.edit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteDetailButton} onPress={() => handleDelete(selectedAnnouncement)}>
                  <Ionicons name="trash" size={18} color={COLORS.danger} />
                  <Text style={styles.deleteDetailButtonText}>{t('common.delete')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.lime} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('admin.announcements.title')}</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{announcements.length}</Text>
          <Text style={styles.statLabel}>{t('admin.announcements.stats.total')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: COLORS.success }]}>
            {announcements.filter(a => a.is_active).length}
          </Text>
          <Text style={styles.statLabel}>{t('admin.announcements.stats.active')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: COLORS.lime }]}>
            {announcements.filter(a => a.is_pinned).length}
          </Text>
          <Text style={styles.statLabel}>{t('admin.announcements.stats.pinned')}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
        <Ionicons name="add-circle" size={20} color={COLORS.background} />
        <Text style={styles.createButtonText}>{t('admin.announcements.createAnnouncement')}</Text>
      </TouchableOpacity>
      <FlatList
        data={announcements}
        renderItem={renderAnnouncement}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.lime} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="megaphone-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>{t('admin.announcements.empty.title')}</Text>
            <Text style={styles.emptySubtext}>{t('admin.announcements.empty.subtitle')}</Text>
          </View>
        }
      />
      {renderFormModal()}
      {renderDetailModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(16), paddingVertical: scale(12) },
  backButton: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: COLORS.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: scale(18), fontWeight: '700', color: COLORS.textPrimary },
  refreshButton: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: COLORS.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
  statsContainer: { flexDirection: 'row', paddingHorizontal: scale(16), marginBottom: scale(16), gap: scale(10) },
  statCard: { flex: 1, backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(12), padding: scale(14), alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statNumber: { fontSize: scale(24), fontWeight: '700', color: COLORS.textPrimary },
  statLabel: { fontSize: scale(11), color: COLORS.textSecondary, marginTop: scale(4) },
  createButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8), backgroundColor: COLORS.lime, marginHorizontal: scale(16), paddingVertical: scale(14), borderRadius: scale(12), marginBottom: scale(16) },
  createButtonText: { fontSize: scale(15), fontWeight: '700', color: COLORS.background },
  listContent: { paddingHorizontal: scale(16), paddingBottom: scale(100) },
  emptyContainer: { alignItems: 'center', paddingVertical: scale(60) },
  emptyText: { fontSize: scale(16), fontWeight: '600', color: COLORS.textPrimary, marginTop: scale(16) },
  emptySubtext: { fontSize: scale(14), color: COLORS.textSecondary, marginTop: scale(8), textAlign: 'center' },
  announcementCard: { backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(14), padding: scale(16), marginBottom: scale(12), borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(12) },
  typeBadge: { paddingHorizontal: scale(10), paddingVertical: scale(4), borderRadius: scale(8) },
  typeBadgeText: { fontSize: scale(11), fontWeight: '600' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  inactiveBadge: { backgroundColor: COLORS.warning + '20', paddingHorizontal: scale(8), paddingVertical: scale(2), borderRadius: scale(6) },
  inactiveBadgeText: { fontSize: scale(10), color: COLORS.warning, fontWeight: '500' },
  cardTitle: { fontSize: scale(16), fontWeight: '600', color: COLORS.textPrimary, marginBottom: scale(6) },
  cardContent: { fontSize: scale(13), color: COLORS.textSecondary, lineHeight: scale(18), marginBottom: scale(10) },
  imageIndicator: { flexDirection: 'row', alignItems: 'center', gap: scale(6), marginBottom: scale(10) },
  imageCount: { fontSize: scale(12), color: COLORS.textSecondary },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: scale(12), color: COLORS.textMuted },
  priorityDot: { width: scale(8), height: scale(8), borderRadius: scale(4) },
  formModalContainer: { flex: 1, backgroundColor: COLORS.background },
  formModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: scale(14), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  formModalCancel: { fontSize: scale(15), color: COLORS.textSecondary },
  formModalTitle: { fontSize: scale(17), fontWeight: '600', color: COLORS.textPrimary },
  formModalSave: { fontSize: scale(15), color: COLORS.lime, fontWeight: '600' },
  formModalContent: { flex: 1, padding: scale(16) },
  formGroup: { marginBottom: scale(20) },
  formLabel: { fontSize: scale(14), fontWeight: '600', color: COLORS.textPrimary, marginBottom: scale(8) },
  formInput: { backgroundColor: COLORS.backgroundSecondary, borderWidth: 1, borderColor: COLORS.border, borderRadius: scale(10), paddingHorizontal: scale(14), paddingVertical: scale(12), fontSize: scale(15), color: COLORS.textPrimary },
  formTextarea: { height: scale(120), paddingTop: scale(12), textAlignVertical: 'top' },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
  optionButton: { paddingHorizontal: scale(12), paddingVertical: scale(8), borderRadius: scale(8), borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.backgroundSecondary },
  optionButtonSelected: { backgroundColor: COLORS.lime + '30', borderColor: COLORS.lime },
  optionButtonText: { fontSize: scale(13), color: COLORS.textSecondary },
  optionButtonTextSelected: { color: COLORS.lime },
  imagesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10), marginBottom: scale(12) },
  imageWrapper: { position: 'relative' },
  imagePreview: { width: scale(80), height: scale(80), borderRadius: scale(8), backgroundColor: COLORS.backgroundTertiary },
  removeImageButton: { position: 'absolute', top: -8, right: -8, backgroundColor: COLORS.background, borderRadius: 12 },
  newImageBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: COLORS.success, paddingHorizontal: scale(6), paddingVertical: scale(2), borderRadius: scale(4) },
  newImageBadgeText: { fontSize: scale(8), color: COLORS.textPrimary, fontWeight: '600' },
  addImageButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8), padding: scale(16), borderWidth: 2, borderColor: COLORS.lime, borderStyle: 'dashed', borderRadius: scale(10), backgroundColor: COLORS.lime + '10' },
  addImageText: { fontSize: scale(14), color: COLORS.lime, fontWeight: '500' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: scale(12), paddingHorizontal: scale(14), backgroundColor: COLORS.backgroundSecondary, borderRadius: scale(10), borderWidth: 1, borderColor: COLORS.border },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  toggleLabel: { fontSize: scale(14), color: COLORS.textPrimary },
  toggleSwitch: { width: scale(50), height: scale(28), borderRadius: scale(14), backgroundColor: COLORS.backgroundTertiary, padding: 2 },
  toggleSwitchActive: { backgroundColor: COLORS.lime },
  toggleKnob: { width: scale(24), height: scale(24), borderRadius: scale(12), backgroundColor: COLORS.textPrimary },
  toggleKnobActive: { transform: [{ translateX: 22 }] },
  detailModalContainer: { flex: 1, backgroundColor: COLORS.background },
  detailModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(16), paddingVertical: scale(12), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  closeButton: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: COLORS.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
  detailModalTitle: { fontSize: scale(17), fontWeight: '600', color: COLORS.textPrimary },
  detailContent: { flex: 1 },
  detailBody: { padding: scale(16) },
  detailBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), marginBottom: scale(16) },
  priorityBadge: { paddingHorizontal: scale(10), paddingVertical: scale(4), borderRadius: scale(8) },
  priorityBadgeText: { fontSize: scale(11), fontWeight: '600' },
  pinnedBadge: { flexDirection: 'row', alignItems: 'center', gap: scale(4), paddingHorizontal: scale(10), paddingVertical: scale(4), borderRadius: scale(8), backgroundColor: COLORS.lime + '20' },
  pinnedBadgeText: { fontSize: scale(11), fontWeight: '600', color: COLORS.lime },
  detailTitle: { fontSize: scale(22), fontWeight: '700', color: COLORS.textPrimary, marginBottom: scale(12) },
  detailContentText: { fontSize: scale(15), color: COLORS.textSecondary, lineHeight: scale(22), marginBottom: scale(20) },
  detailMeta: { gap: scale(10), paddingTop: scale(16), borderTopWidth: 1, borderTopColor: COLORS.border },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  metaText: { fontSize: scale(13), color: COLORS.textMuted },
  adminActions: { flexDirection: 'row', gap: scale(12), paddingTop: scale(20), marginTop: scale(20), borderTopWidth: 1, borderTopColor: COLORS.border },
  editDetailButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8), paddingVertical: scale(12), borderRadius: scale(10), backgroundColor: COLORS.teal + '20' },
  editDetailButtonText: { color: COLORS.teal, fontSize: scale(14), fontWeight: '600' },
  deleteDetailButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8), paddingVertical: scale(12), borderRadius: scale(10), backgroundColor: COLORS.danger + '20' },
  deleteDetailButtonText: { color: COLORS.danger, fontSize: scale(14), fontWeight: '600' },
  carouselContainer: { position: 'relative' },
  imageScroll: { width: SCREEN_WIDTH },
  carouselImage: { width: IMAGE_SIZE, height: IMAGE_SIZE * 0.6, marginHorizontal: 45, borderRadius: scale(12) },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: scale(6), marginTop: scale(12) },
  dot: { width: scale(8), height: scale(8), borderRadius: scale(4) },
});