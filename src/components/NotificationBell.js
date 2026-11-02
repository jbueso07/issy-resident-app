// src/components/NotificationBell.js
// ISSY - Campana de notificaciones con badge

import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationCount } from '../context/NotificationCountContext';
import { neu } from '../theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;


const COLORS = {
  bgCard: neu.raised,
  lime: neu.teal,
  coral: neu.coral,
  textPrimary: neu.text,
};

// style / badgeStyle: opcionales para la piel del home (sin ellos se ve igual que siempre)
export default function NotificationBell({ size = 24, color = COLORS.textPrimary, style, badgeStyle }) {
  const router = useRouter();
  // Contador compartido (NotificationCountContext): la campana solo lo muestra
  const { unreadCount } = useNotificationCount();

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
    borderColor: neu.bg,
  },
  badgeText: {
    fontSize: scale(10),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});