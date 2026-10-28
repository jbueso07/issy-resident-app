// src/components/AccessTabs.js
// ISSY - Pestañas Mi QR · Visitantes · Mis Accesos (piel i5: carril hundido, pestaña activa en relieve).

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import PressableScale from './home/PressableScale';
import { useHomeFont } from '../theme/homeFont';
import { neu, neuSurface, fs } from '../theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const AccessTabs = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();
  const font = useHomeFont();

  const TABS = [
    { id: 'myqr', label: t('visits.tabs.myQR'), icon: 'qr-code' },
    { id: 'visitors', label: t('visits.tabs.visitors'), icon: 'people' },
    { id: 'invitations', label: t('visits.tabs.myAccesses'), icon: 'key' }
  ];

  return (
    <View style={styles.container} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <PressableScale
            key={tab.id}
            variant="neu"
            neuSurface="none"
            containerStyle={styles.tabSlot}
            style={[styles.tab, isActive ? neuSurface.sunkenSm : neuSurface.raisedSm]}
            onPress={() => onTabChange(tab.id)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
          >
            <Ionicons name={isActive ? tab.icon : `${tab.icon}-outline`} size={scale(18)} color={isActive ? neu.teal : neu.textLabel} />
            <Text style={[styles.tabText, isActive && styles.tabTextActive, font(isActive ? 600 : 500)]} numberOfLines={1}>
              {tab.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  // Seleccionada = hundida + teal; las demás en relieve. Espacio alrededor para que la sombra no se recorte.
  container: { flexDirection: 'row', gap: scale(8), paddingVertical: scale(6), marginBottom: scale(10) },
  tabSlot: { flex: 1 },
  tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(10), paddingHorizontal: scale(6), borderRadius: scale(14), gap: scale(6) },
  tabText: { fontSize: fs(12), fontWeight: '500', color: neu.textLabel },
  tabTextActive: { color: neu.teal, fontWeight: '600' },
});

export default AccessTabs;
