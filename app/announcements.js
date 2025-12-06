// app/announcements.js
// ISSY Resident App - Pantalla de Anuncios

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getAnnouncements, markAnnouncementRead } from '../src/services/api';

export default function AnnouncementsScreen() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

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
    setModalVisible(true);
    
    // Marcar como leído si no lo está
    if (!announcement.is_read) {
      await markAnnouncementRead(announcement.id);
      // Actualizar estado local
      setAnnouncements(prev => 
        prev.map(a => a.id === announcement.id ? { ...a, is_read: true } : a)
      );
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'normal': return '#3B82F6';
      case 'low': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      case 'normal': return 'Normal';
      case 'low': return 'Baja';
      default: return 'Normal';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'general': return 'megaphone-outline';
      case 'maintenance': return 'construct-outline';
      case 'security': return 'shield-checkmark-outline';
      case 'event': return 'calendar-outline';
      case 'payment': return 'card-outline';
      default: return 'information-circle-outline';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Hoy';
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días`;
    } else {
      return date.toLocaleDateString('es-HN', { 
        day: 'numeric', 
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const renderAnnouncement = ({ item }) => (
    <TouchableOpacity
      style={[styles.announcementCard, !item.is_read && styles.unreadCard]}
      onPress={() => handleOpenAnnouncement(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
          <Ionicons 
            name={getCategoryIcon(item.category)} 
            size={24} 
            color={getPriorityColor(item.priority)} 
          />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.announcementTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
              <Text style={styles.priorityText}>{getPriorityLabel(item.priority)}</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </View>
      
      <Text style={styles.announcementPreview} numberOfLines={2}>
        {item.content}
      </Text>
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FC6447" />
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
        <Text style={styles.headerTitle}>Anuncios</Text>
        <View style={styles.headerRight}>
          {announcements.filter(a => !a.is_read).length > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {announcements.filter(a => !a.is_read).length}
              </Text>
            </View>
          )}
        </View>
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
            colors={['#FC6447']}
            tintColor="#FC6447"
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal de detalle */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Detalle</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedAnnouncement && (
            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Icono y prioridad */}
              <View style={styles.modalIconRow}>
                <View style={[
                  styles.modalCategoryIcon, 
                  { backgroundColor: getPriorityColor(selectedAnnouncement.priority) + '20' }
                ]}>
                  <Ionicons 
                    name={getCategoryIcon(selectedAnnouncement.category)} 
                    size={32} 
                    color={getPriorityColor(selectedAnnouncement.priority)} 
                  />
                </View>
                <View style={[
                  styles.modalPriorityBadge, 
                  { backgroundColor: getPriorityColor(selectedAnnouncement.priority) }
                ]}>
                  <Text style={styles.modalPriorityText}>
                    {getPriorityLabel(selectedAnnouncement.priority)}
                  </Text>
                </View>
              </View>

              {/* Título */}
              <Text style={styles.modalTitle}>{selectedAnnouncement.title}</Text>
              
              {/* Fecha */}
              <Text style={styles.modalDate}>
                {new Date(selectedAnnouncement.created_at).toLocaleDateString('es-HN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>

              {/* Contenido */}
              <View style={styles.modalContentBox}>
                <Text style={styles.modalContentText}>
                  {selectedAnnouncement.content}
                </Text>
              </View>

              {/* Autor si existe */}
              {selectedAnnouncement.author_name && (
                <View style={styles.authorSection}>
                  <Text style={styles.authorLabel}>Publicado por</Text>
                  <Text style={styles.authorName}>{selectedAnnouncement.author_name}</Text>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  unreadBadge: {
    backgroundColor: '#FC6447',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  announcementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FC6447',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FC6447',
    marginLeft: 8,
  },
  announcementPreview: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalCategoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPriorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalPriorityText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textTransform: 'capitalize',
  },
  modalContentBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  modalContentText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  authorSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  authorLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
});