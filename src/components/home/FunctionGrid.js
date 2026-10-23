// src/components/home/FunctionGrid.js
// ISSY - Cuadrícula de funciones del Home v2 (Todas las funciones y Administración).
// groups: [{ key, title, color, items: [{ key, label, icon, color, route, params, badge }] }]
// size: 0 = 4 por fila, 1 = 3 por fila, 2 = 2 por fila

import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import { colors, radius, spacing, scale, MAX_FONT_SCALE } from '../../theme/tokens';

export const GRID_SIZES = [
  { columns: 4, box: 52, icon: 22, font: 11 },
  { columns: 3, box: 64, icon: 28, font: 13 },
  { columns: 2, box: 78, icon: 34, font: 15 },
];

// Fondo teñido del color de la función (hex #RRGGBB + alfa)
const tint = (hex, alpha = '26') => (/^#[0-9A-Fa-f]{6}$/.test(hex) ? `${hex}${alpha}` : colors.well);

export default function FunctionGrid({ groups, size = 1 }) {
  const router = useRouter();
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
        <View key={group.key} style={styles.card}>
          <View style={styles.header}>
            <View style={[styles.dot, { backgroundColor: group.color }]} />
            <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>
              {group.title}
            </Text>
            <Text style={styles.count} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {group.items.length}
            </Text>
          </View>

          <View style={styles.grid}>
            {group.items.map((item) => (
              <PressableScale
                key={item.key}
                containerStyle={{ width: itemWidth }}
                style={styles.item}
                onPress={() => openItem(item)}
                accessibilityLabel={item.badge ? `${item.label}, ${item.badge}` : item.label}
              >
                <View
                  style={[
                    styles.iconBox,
                    {
                      width: box,
                      height: box,
                      borderRadius: box * 0.3,
                      backgroundColor: tint(item.color),
                    },
                  ]}
                >
                  <Ionicons name={item.icon} size={scale(config.icon)} color={item.color} />
                  {item.badge != null && item.badge !== '' && item.badge !== 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>
                        {item.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[styles.label, { fontSize: scale(config.font) }]}
                  maxFontSizeMultiplier={MAX_FONT_SCALE}
                  numberOfLines={2}
                >
                  {item.label}
                </Text>
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
    gap: scale(spacing.md),
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: scale(radius.lg),
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
    fontSize: scale(15),
    fontWeight: '700',
    color: colors.text,
  },
  count: {
    fontSize: scale(13),
    fontWeight: '600',
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    alignItems: 'center',
    paddingHorizontal: scale(spacing.xs),
    paddingBottom: scale(spacing.md),
    gap: scale(6),
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
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: scale(10),
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
});
