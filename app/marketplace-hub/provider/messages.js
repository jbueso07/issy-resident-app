// app/marketplace-hub/provider/messages.js
// ISSY Marketplace - Provider Messages Screen
// Línea gráfica ProHome

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { getConversations, markConversationAsRead } from '../../../src/services/marketplaceApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ============ COLORES PROHOME ============
const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  bgCardAlt: '#243B44',
  lime: '#AAFF00',
  cyan: '#00E5FF',
  teal: '#00BFA6',
  orange: '#FF8A50',
  green: '#10B981',
  blue: '#60A5FA',
  red: '#EF4444',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  border: 'rgba(255, 255, 255, 0.1)',
};

export default function ProviderMessagesScreen() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const result = await getConversations();
      if (result.success) {
        setConversations(result.data.conversations || result.data || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const handleConversationPress = async (conversation) => {
    if (conversation.unread_count > 0) {
      await markConversationAsRead(conversation.id);
      setConversations(prev =>
        prev.map(c => c.id === conversation.id ? { ...c, unread_count: 0 } : c)
      );
    }
    router.push(`/marketplace-hub/chat/${conversation.id}`);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('es-MX', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    }
  };

  const renderConversation = ({ item }) => {
    const hasUnread = item.unread_count > 0;

    return (
      <TouchableOpacity
        style={[styles.conversationCard, hasUnread && styles.conversationCardUnread]}
        onPress={() => handleConversationPress(item)}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.customer?.name?.charAt(0) || item.other_user?.name?.charAt(0) || 'C'}
            </Text>
          </View>
          {item.booking?.status === 'in_progress' && (
            <View style={styles.onlineDot} />
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.conversationName, hasUnread && styles.textBold]}>
              {item.customer?.name || item.other_user?.name || 'Cliente'}
            </Text>
            <Text style={styles.conversationTime}>{formatTime(item.last_message_at)}</Text>
          </View>

          {item.booking && (
            <Text style={styles.serviceTag}>{item.booking.service?.name || 'Servicio'}</Text>
          )}

          <View style={styles.lastMessageRow}>
            <Text
              style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
              numberOfLines={1}
            >
              {item.last_message?.is_mine && (
                <Text style={styles.youPrefix}>Tú: </Text>
              )}
              {item.last_message?.content || 'Sin mensajes'}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={scale(60)} color={COLORS.textMuted} />
      <Text style={styles.emptyTitle}>Sin Conversaciones</Text>
      <Text style={styles.emptyText}>
        Cuando tengas reservas activas, podrás comunicarte con tus clientes aquí
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.teal} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={scale(24)} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mensajes</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Conversations List */}
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id?.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.teal}
            colors={[COLORS.teal]}
          />
        }
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSpacer: {
    width: scale(40),
  },
  listContent: {
    paddingVertical: scale(8),
    paddingBottom: scale(100),
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: scale(76),
  },
  conversationCard: {
    flexDirection: 'row',
    padding: scale(16),
    backgroundColor: COLORS.bgPrimary,
  },
  conversationCardUnread: {
    backgroundColor: COLORS.bgCard,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: scale(12),
  },
  avatar: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: COLORS.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.bgPrimary,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: scale(14),
    height: scale(14),
    borderRadius: scale(7),
    backgroundColor: COLORS.green,
    borderWidth: 2,
    borderColor: COLORS.bgPrimary,
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(2),
  },
  conversationName: {
    fontSize: scale(15),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  textBold: {
    fontWeight: '700',
  },
  conversationTime: {
    fontSize: scale(12),
    color: COLORS.textMuted,
  },
  serviceTag: {
    fontSize: scale(11),
    color: COLORS.teal,
    marginBottom: scale(4),
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    flex: 1,
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginRight: scale(8),
  },
  lastMessageUnread: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  youPrefix: {
    color: COLORS.textMuted,
  },
  unreadBadge: {
    minWidth: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: COLORS.teal,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(6),
  },
  unreadCount: {
    fontSize: scale(11),
    fontWeight: '700',
    color: COLORS.bgPrimary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(32),
    paddingTop: scale(100),
  },
  emptyTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  emptyText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scale(20),
  },
});
