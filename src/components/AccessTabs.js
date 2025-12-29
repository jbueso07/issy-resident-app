import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const COLORS = { bgPrimary: '#0F1A1E', bgCard: '#1C2E35', bgCardAlt: '#243B44', lime: '#AAFF00', textPrimary: '#FFFFFF', textSecondary: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.1)' };
const TABS = [{ id: 'myqr', label: 'Mi QR', icon: 'qr-code' }, { id: 'visitors', label: 'Visitantes', icon: 'people' }, { id: 'invitations', label: 'Mis Accesos', icon: 'key' }];

const AccessTabs = ({ activeTab, onTabChange }) => (
  <View style={styles.container}>
    {TABS.map((tab) => {
      const isActive = activeTab === tab.id;
      return (
        <TouchableOpacity key={tab.id} style={[styles.tab, isActive && styles.tabActive]} onPress={() => onTabChange(tab.id)} activeOpacity={0.7}>
          <Ionicons name={isActive ? tab.icon : `${tab.icon}-outline`} size={scale(18)} color={isActive ? COLORS.bgPrimary : COLORS.textSecondary} />
          <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: { flexDirection: 'row', backgroundColor: COLORS.bgCard, borderRadius: scale(12), padding: scale(4), marginBottom: scale(16) },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(10), paddingHorizontal: scale(8), borderRadius: scale(10), gap: scale(6) },
  tabActive: { backgroundColor: COLORS.lime },
  tabText: { fontSize: scale(12), fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.bgPrimary },
});

export default AccessTabs;
