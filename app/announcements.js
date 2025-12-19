// app/announcements.js
// ISSY Resident App - Pantalla de Anuncios (Figma Design)

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
const IMAGE_SIZE = SCREEN_WIDTH - 90; // Modal padding considered

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
            {/* Badge NUEVO/VISTO */}
            <View style={[
              styles.statusBadge,
              { backgroundColor: item.is_read ? '#009FF5' : '#FA5967' }
            ]}>
              <Text style={styles.statusBadgeText}>
                {item.is_read ? 'VISTO' : 'NUEVO'}
              </Text>
            </View>
            
            {/* Arrow icon */}
            <TouchableOpacity 
              style={styles.arrowButton}
              onPress={() => handleOpenAnnouncement(item)}
            >
              <Ionicons name="arrow-forward" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="megaphone-outline" size={64} color="#D1D5DB" />
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
                  { backgroundColor: index === currentImageIndex ? '#D4FE48' : '#FFFFFF' }
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#009FF5" />
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
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerSubtitle}>Centro de anuncios</Text>
        </View>
        <View style={{ width: 40 }} />
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
            colors={['#009FF5']}
            tintColor="#009FF5"
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
              <Ionicons name="close" size={24} color="#000" />
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
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'System',
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FAFAFA',
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
    color: '#000000',
  },
  unreadBadge: {
    backgroundColor: '#FA5967',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#000000',
    marginTop: 2,
  },
  
  // List styles
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  
  // Card styles
  announcementCard: {
    backgroundColor: '#FFFFFF',
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
    color: '#000000',
    marginBottom: 4,
  },
  announcementPreview: {
    fontSize: 14,
    color: '#707883',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 10,
    color: '#009FF5',
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
    marginBottom: 12,
  },
  statusBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  arrowButton: {
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
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
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
  modalContent: {
    padding: 24,
    paddingTop: 16,
  },
  
  // Carousel styles
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
  
  // Modal content
  modalTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#000000',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: '#707883',
    lineHeight: 18,
    marginBottom: 24,
  },
  modalDate: {
    fontSize: 10,
    color: '#707883',
    textTransform: 'capitalize',
  },
});