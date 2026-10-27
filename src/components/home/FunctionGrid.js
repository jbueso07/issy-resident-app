// src/components/home/FunctionGrid.js
// ISSY - Cuadrícula de funciones del Home v2 (Todas las funciones y Administración).
// groups: [{ key, title, color, items: [{ key, label, icon, color, route, params, badge }] }]
// size: 0 = 4 por fila, 1 = 3 por fila, 2 = 2 por fila
// Piel i5: grupos e íconos en relieve; los colores de cada función pasan a su equivalente neu.

import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PressableScale, { getNeuSurface } from './PressableScale';
import { useHomeFont } from '../../theme/homeFont';
import { radius, spacing, scale, fs, MAX_FONT_SCALE, neu, neuSurface, toNeuAccent } from '../../theme/tokens';

export const GRID_SIZES = [
  { columns: 4, box: 52, icon: 22, font: 11 },
  { columns: 3, box: 64, icon: 28, font: 13 },
  { columns: 2, box: 78, icon: 34, font: 15 },
];

export default function FunctionGrid({ groups, size = 1 }) {
  const router = useRouter();
  const font = useHomeFont();
  const config = GRID_SIZES[size] || GRID_SIZES[1];
  const itemWidth = `${100 / config.columns}%`;
  const box = scale(config.box);

  const openItem = (item) => {
    if (!item.route) return;
    router.push(item.params ? { pathname: item.route, params: item.params } : item.route);
  };

  return (
    <View style={styles.container}>
      {groups.map((group) => (
        <View key={group.key} style={[styles.card, neuSurface.raised]}>
          <View style={styles.header}>
            <View style={[styles.dot, { backgroundColor: toNeuAccent(group.color) }]} />
            <Text style={[styles.title, font(700)]} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>
              {group.title}
            </Text>
            <Text style={[styles.count, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {group.items.length}
            </Text>
          </View>

          <View style={styles.grid}>
            {group.items.map((item) => (
              <PressableScale
                key={item.key}
                variant="neu"
                neuSurface="none"
                containerStyle={{ width: itemWidth }}
                style={styles.item}
                onPress={() => openItem(item)}
                accessibilityLabel={item.badge ? `${item.label}, ${item.badge}` : item.label}
              >
                {({ pressed }) => (
                  <>
                    <View
                      style={[
                        styles.iconBox,
                        getNeuSurface(pressed),
                        { width: box, height: box, borderRadius: box * 0.3 },
                      ]}
                    >
                      <Ionicons name={item.icon} size={scale(config.icon)} color={toNeuAccent(item.color)} />
                      {item.badge != null && item.badge !== '' && item.badge !== 0 && (
                        <View style={styles.badge}>
                          <Text style={[styles.badgeText, font(700)]} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>
                            {item.badge}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[styles.label, { fontSize: fs(config.font) }, font(500)]}
                      maxFontSizeMultiplier={MAX_FONT_SCALE}
                      numberOfLines={2}
                    >
                      {item.label}
                    </Text>
                  </>
                )}
              </PressableScale>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: scale(spacing.lg),
  },
  card: {
    borderRadius: scale(radius.xl),
    paddingTop: scale(spacing.lg),
    paddingBottom: scale(spacing.sm),
    paddingHorizontal: scale(spacing.sm),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(spacing.sm),
    paddingHorizontal: scale(spacing.sm),
    marginBottom: scale(spacing.md),
  },
  dot: {
    width: scale(8),
    height: scale(8),
    borderRadius: radius.pill,
  },
  title: {
    flex: 1,
    fontSize: fs(15),
    fontWeight: '700',
    color: neu.text,
  },
  count: {
    fontSize: fs(13),
    fontWeight: '600',
    color: neu.textSoft,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    alignItems: 'center',
    paddingHorizontal: scale(spacing.xs),
    paddingTop: scale(spacing.xs),
    paddingBottom: scale(spacing.md),
    gap: scale(spacing.sm),
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -scale(4),
    right: -scale(4),
    minWidth: scale(18),
    height: scale(18),
    paddingHorizontal: scale(4),
    borderRadius: radius.pill,
    backgroundColor: neu.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: fs(10),
    fontWeight: '700',
    color: neu.raised,
  },
  label: {
    fontWeight: '500',
    color: neu.text,
    textAlign: 'center',
  },
});
