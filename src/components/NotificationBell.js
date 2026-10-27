// src/components/NotificationBell.js
// ISSY - Campana de notificaciones con badge

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;


const COLORS = {
  bgCard: '#1C2E35',
  lime: '#AAFF00',
  coral: '#FF6B6B',
  textPrimary: '#FFFFFF',
};

// style / badgeStyle: opcionales para la piel del home (sin ellos se ve igual que siempre)
export default function NotificationBell({ size = 24, color = COLORS.textPrimary, style, badgeStyle }) {
  const router = useRouter();
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    
    try {
      // authFetch: token vigente de AsyncStorage y renovación en 401 (el de AuthContext puede estar vencido)
      const result = await authFetch('/notifications/unread-count');
      
      if (result.success) {
        setUnreadCount(result.data?.unread_count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [token]);

  // Fetch on mount
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handlePress = () => {
    router.push('/notifications');
  };

  return (
    <TouchableOpacity 
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="notifications-outline" size={size} color={color} />
      
      {unreadCount > 0 && (
        <View style={[styles.badge, badgeStyle]}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: scale(2),
    right: scale(2),
    minWidth: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    backgroundColor: COLORS.coral,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(4),
    borderWidth: 2,
    borderColor: '#0F1A1E',
  },
  badgeText: {
    fontSize: scale(10),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});