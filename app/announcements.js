// app/announcements.js
// ISSY Resident App - Pantalla de Anuncios - ProHome Dark Theme

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getAnnouncements, markAnnouncementRead } from '../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const IMAGE_SIZE = SCREEN_WIDTH - scale(80);

// ProHome Dark Theme Colors
const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  card: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  teal: '#5DDED8',
  lime: '#D4FE48',
  cyan: '#11DAE9',
  purple: '#6366F1',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  green: '#10B981',
  red: '#EF4444',
  blue: '#3B82F6',
};

export default function AnnouncementsScreen() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageScrollRef = useRef(null);

  const fetchAnnouncements = async () => {
    try {
      const result = await getAnnouncements();
      if (result.success) {
        setAnnouncements(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnnouncements();
  }, []);

  const handleOpenAnnouncement = async (announcement) => {
    setSelectedAnnouncement(announcement);
    setCurrentImageIndex(0);
    setModalVisible(true);
    
    // Marcar como leído si no lo está
    if (!announcement.is_read) {
      try {
        await markAnnouncementRead(announcement.id);
        // Actualizar estado local
        setAnnouncements(prev => 
          prev.map(a => a.id === announcement.id ? { ...a, is_read: true } : a)
        );
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  };

  const formatDate = (dateString) => {
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

  const unreadCount = announcements.filter(a => !a.is_read).length;

  const renderAnnouncement = ({ item }) => (
    <TouchableOpacity
      style={styles.announcementCard}
      onPress={() => handleOpenAnnouncement(item)}
      activeOpacity={0.7}
    >
      {/* Gradient sidebar */}
      <LinearGradient
        colors={[COLORS.lime, COLORS.teal]}
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
            <Text style={styles.announcementPreview} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
          
          <View style={styles.cardRight}>
            {/* Badge NUEVO/VISTO */}
            <View style={[
              styles.statusBadge,
              { backgroundColor: item.is_read ? 'rgba(93, 222, 216, 0.15)' : 'rgba(212, 254, 72, 0.15)' }
            ]}>
              <Text style={[
                styles.statusBadgeText,
                { color: item.is_read ? COLORS.teal : COLORS.lime }
              ]}>
                {item.is_read ? 'VISTO' : 'NUEVO'}
              </Text>
            </View>
            
            {/* Arrow icon */}
            <TouchableOpacity 
              style={styles.arrowButton}
              onPress={() => handleOpenAnnouncement(item)}
            >
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="megaphone-outline" size={64} color={COLORS.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>No hay anuncios</Text>
      <Text style={styles.emptySubtitle}>
        Los anuncios de tu comunidad aparecerán aquí
      </Text>
    </View>
  );

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
        
        {/* Dots indicator */}
        {images.length > 1 && (
          <View style={styles.dotsContainer}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  { backgroundColor: index === currentImageIndex ? COLORS.lime : COLORS.textMuted }
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.purple} />
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
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Anuncios</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerSubtitle}>Centro de anuncios</Text>
        </View>
        <View style={{ width: scale(40) }} />
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
            tintColor={COLORS.purple}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal de detalle */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Close button */}
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>

            {selectedAnnouncement && (
              <ScrollView 
                style={styles.modalContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Image Carousel */}
                {renderImageCarousel()}

                {/* Title */}
                <Text style={styles.modalTitle}>{selectedAnnouncement.title}</Text>

                {/* Message */}
                <Text style={styles.modalMessage}>
                  {selectedAnnouncement.message}
                </Text>

                {/* Date */}
                <Text style={styles.modalDate}>
                  {formatFullDate(selectedAnnouncement.created_at)}
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
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
    marginTop: scale(12),
    fontSize: scale(16),
    color: COLORS.textSecondary,
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
    backgroundColor: COLORS.background,
  },
  backButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: scale(12),
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scale(22),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  unreadBadge: {
    backgroundColor: COLORS.red,
    borderRadius: scale(10),
    minWidth: scale(20),
    height: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scale(8),
    paddingHorizontal: scale(6),
  },
  unreadBadgeText: {
    color: COLORS.textPrimary,
    fontSize: scale(11),
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  
  // List styles
  listContent: {
    paddingHorizontal: scale(20),
    paddingTop: scale(8),
    paddingBottom: scale(100),
  },
  
  // Card styles
  announcementCard: {
    backgroundColor: COLORS.card,
    borderRadius: scale(16),
    marginBottom: scale(12),
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  gradientBar: {
    width: scale(6),
    borderTopLeftRadius: scale(16),
    borderBottomLeftRadius: scale(16),
  },
  cardContent: {
    flex: 1,
    padding: scale(16),
    paddingLeft: scale(14),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleSection: {
    flex: 1,
    marginRight: scale(12),
  },
  announcementTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  announcementPreview: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginBottom: scale(8),
    lineHeight: scale(18),
  },
  dateText: {
    fontSize: scale(12),
    color: COLORS.teal,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(8),
    marginBottom: scale(12),
  },
  statusBadgeText: {
    fontSize: scale(10),
    fontWeight: '700',
    textAlign: 'center',
  },
  arrowButton: {
    padding: scale(4),
  },
  
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(60),
  },
  emptyIconContainer: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(24),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  emptyTitle: {
    fontSize: scale(20),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: scale(40),
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  modalContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(20),
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalCloseButton: {
    position: 'absolute',
    top: scale(12),
    right: scale(12),
    zIndex: 10,
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: COLORS.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: scale(24),
    paddingTop: scale(16),
  },
  
  // Carousel styles
  carouselContainer: {
    marginBottom: scale(20),
    alignItems: 'center',
  },
  imageScroll: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: scale(16),
  },
  carouselImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: scale(16),
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: scale(-20),
    paddingBottom: scale(8),
  },
  dot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginHorizontal: scale(3),
  },
  
  // Modal content
  modalTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(12),
  },
  modalMessage: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
    lineHeight: scale(22),
    marginBottom: scale(24),
  },
  modalDate: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    textTransform: 'capitalize',
  },
});