// app/notifications.js
// ISSY - Centro de Notificaciones - ProHome Dark Theme + i18n

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const API_URL = 'https://api.joinissy.com/api';

// ProHome Dark Theme Colors
const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  bgCardAlt: '#243B44',
  
  lime: '#AAFF00',
  cyan: '#00E5FF',
  teal: '#00BFA6',
  orange: '#FF8A50',
  purple: '#A78BFA',
  coral: '#FF6B6B',
  blue: '#60A5FA',
  
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  
  border: 'rgba(255, 255, 255, 0.1)',
  unreadBg: 'rgba(170, 255, 0, 0.08)',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Mapeo de tipos a iconos y colores (labels traducidos)
  const getNotificationConfig = (type) => {
    const configs = {
      visitor_arrived: { icon: 'car-outline', color: COLORS.teal, label: t('notifications.types.visitor') },
      visitor_entry: { icon: 'enter-outline', color: COLORS.teal, label: t('notifications.types.entry') },
      visitor_exit: { icon: 'exit-outline', color: COLORS.orange, label: t('notifications.types.exit') },
      announcement: { icon: 'megaphone-outline', color: COLORS.cyan, label: t('notifications.types.announcement') },
      reservation: { icon: 'calendar-outline', color: COLORS.purple, label: t('notifications.types.reservation') },
      reservation_status: { icon: 'calendar-outline', color: COLORS.purple, label: t('notifications.types.reservation') },
      incident: { icon: 'warning-outline', color: COLORS.coral, label: t('notifications.types.incident') },
      incident_update: { icon: 'warning-outline', color: COLORS.coral, label: t('notifications.types.incident') },
      payment_due: { icon: 'wallet-outline', color: COLORS.orange, label: t('notifications.types.payment') },
      payment: { icon: 'wallet-outline', color: COLORS.lime, label: t('notifications.types.payment') },
      member_pending: { icon: 'person-add-outline', color: COLORS.blue, label: t('notifications.types.member') },
      member_approved: { icon: 'checkmark-circle-outline', color: COLORS.lime, label: t('notifications.types.approved') },
      admin: { icon: 'shield-outline', color: COLORS.purple, label: t('notifications.types.admin') },
      general: { icon: 'notifications-outline', color: COLORS.textSecondary, label: t('notifications.types.general') },
    };
    return configs[type] || configs.general;
  };

  // Locale dinámico para fechas
  const getLocale = () => {
    const locales = { es: 'es-HN', en: 'en-US', fr: 'fr-FR', pt: 'pt-BR' };
    return locales[language] || 'es-HN';
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('notifications.time.now');
    if (diffMins < 60) return t('notifications.time.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('notifications.time.hoursAgo', { count: diffHours });
    if (diffDays === 1) return t('notifications.time.yesterday');
    if (diffDays < 7) return t('notifications.time.daysAgo', { count: diffDays });
    
    return date.toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' });
  };

  const fetchNotifications = async (pageNum = 1, append = false) => {
    try {
      const response = await fetch(
        `${API_URL}/notifications?page=${pageNum}&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        const newData = result.data || [];
        
        if (append) {
          setNotifications(prev => [...prev, ...newData]);
        } else {
          setNotifications(newData);
        }
        
        setHasMore(newData.length === 20);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications(1, false);
  }, []);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      fetchNotifications(page + 1, true);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationPress = (notification) => {
    // Marcar como leída
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navegar según el tipo
    const { type, data } = notification;
    
    switch (type) {
      case 'visitor_arrived':
      case 'visitor_entry':
      case 'visitor_exit':
        router.push('/(tabs)/visits');
        break;
      case 'announcement':
        if (data?.announcement_id) {
          router.push(`/announcements/${data.announcement_id}`);
        } else {
          router.push('/announcements');
        }
        break;
      case 'reservation':
      case 'reservation_status':
        router.push('/reservations');
        break;
      case 'incident':
      case 'incident_update':
        router.push('/admin/incidents');
        break;
      case 'payment_due':
      case 'payment':
        router.push('/(tabs)/payments');
        break;
      case 'member_pending':
        router.push('/admin/community-management');
        break;
      default:
        // No navegar, solo marcar como leída
        break;
    }
  };

  const renderNotification = ({ item }) => {
    const config = getNotificationConfig(item.type);
    const isUnread = !item.read;

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          isUnread && styles.notificationUnread,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}>
          <Ionicons name={config.icon} size={24} color={config.color} />
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.notificationTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          
          <View style={styles.footerRow}>
            <View style={[styles.typeBadge, { backgroundColor: `${config.color}20` }]}>
              <Text style={[styles.typeText, { color: config.color }]}>
                {config.label}
              </Text>
            </View>
            <Text style={styles.timeText}>
              {formatTimeAgo(item.created_at)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBox}>
        <Ionicons name="notifications-off-outline" size={48} color={COLORS.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>{t('notifications.empty.title')}</Text>
      <Text style={styles.emptySubtitle}>{t('notifications.empty.subtitle')}</Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.lime} />
      </View>
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

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
        
        <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
        
        {unreadCount > 0 ? (
          <TouchableOpacity 
            style={styles.markAllButton}
            onPress={markAllAsRead}
          >
            <Ionicons name="checkmark-done-outline" size={22} color={COLORS.lime} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerPlaceholder} />
        )}
      </View>

      {/* Unread count banner */}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Ionicons name="mail-unread-outline" size={18} color={COLORS.lime} />
          <Text style={styles.unreadBannerText}>
            {unreadCount === 1 
              ? t('notifications.unreadSingle') 
              : t('notifications.unreadMultiple', { count: unreadCount })}
          </Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.lime} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.lime}
              colors={[COLORS.lime]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  markAllButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPlaceholder: {
    width: scale(40),
  },

  // Unread banner
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    backgroundColor: 'rgba(170, 255, 0, 0.1)',
    gap: scale(8),
  },
  unreadBannerText: {
    fontSize: scale(13),
    color: COLORS.lime,
    fontWeight: '500',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List
  listContent: {
    padding: scale(16),
    paddingBottom: scale(100),
  },
  listContentEmpty: {
    flex: 1,
  },

  // Notification Card
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    padding: scale(14),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notificationUnread: {
    backgroundColor: COLORS.unreadBg,
    borderColor: 'rgba(170, 255, 0, 0.2)',
  },
  
  iconContainer: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  
  contentContainer: {
    flex: 1,
  },
  
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  notificationTitle: {
    flex: 1,
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  unreadDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: COLORS.lime,
    marginLeft: scale(8),
  },
  
  notificationMessage: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    lineHeight: scale(18),
    marginBottom: scale(8),
  },
  
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(6),
  },
  typeText: {
    fontSize: scale(11),
    fontWeight: '600',
  },
  timeText: {
    fontSize: scale(12),
    color: COLORS.textMuted,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(40),
  },
  emptyIconBox: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(20),
  },
  emptyTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scale(20),
  },

  // Footer loader
  footerLoader: {
    paddingVertical: scale(20),
    alignItems: 'center',
  },
});