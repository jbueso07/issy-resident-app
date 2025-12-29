// src/components/ui/index.js
// ISSY Resident App - Componentes UI Reutilizables
// Design System ProHome Style

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ============ COLORES PROHOME ============
export const COLORS = {
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
  indigo: '#818CF8',
  blue: '#60A5FA',
  
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textDark: '#0F1A1E',
  
  border: 'rgba(255, 255, 255, 0.1)',
  gradientStart: '#00BFA6',
  gradientEnd: '#AAFF00',
};

// ============ SECTION HEADER ============
// Título de sección con contador opcional y link "Ver todos"
export const SectionHeader = ({ 
  title, 
  count, 
  showSeeAll = false, 
  onSeeAllPress,
  style,
}) => (
  <View style={[styles.sectionHeader, style]}>
    <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>
      {title}
      {count !== undefined && (
        <Text style={styles.sectionCount}> ({count})</Text>
      )}
    </Text>
    {showSeeAll && (
      <TouchableOpacity onPress={onSeeAllPress}>
        <Text style={styles.sectionLink} maxFontSizeMultiplier={1.2}>Ver todos</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ============ HORIZONTAL MENU ============
// Contenedor de scroll horizontal para cards
export const HorizontalMenu = ({ 
  children, 
  style,
  contentContainerStyle,
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={[styles.horizontalScroll, contentContainerStyle]}
    style={style}
  >
    {children}
  </ScrollView>
);

// ============ MENU CARD ============
// Card pequeña para menús horizontales (color fijo, sin toggle)
export const MenuCard = ({ 
  title, 
  subtitle, 
  icon, 
  iconType = 'ionicon', // 'ionicon' | 'emoji' | 'custom'
  color = COLORS.teal,
  onPress,
  disabled = false,
  badge,
  size = 'medium', // 'small' | 'medium' | 'large'
  style,
}) => {
  const cardStyles = {
    small: styles.menuCardSmall,
    medium: styles.menuCardMedium,
    large: styles.menuCardLarge,
  };

  const iconSizes = {
    small: 20,
    medium: 24,
    large: 28,
  };

  const renderIcon = () => {
    if (iconType === 'emoji') {
      return <Text style={styles.menuCardEmoji}>{icon}</Text>;
    }
    if (iconType === 'custom') {
      return icon;
    }
    return (
      <Ionicons 
        name={icon} 
        size={iconSizes[size]} 
        color={color} 
      />
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.menuCard,
        cardStyles[size],
        { backgroundColor: color },
        disabled && styles.menuCardDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {badge && (
        <View style={[styles.menuCardBadge, { backgroundColor: COLORS.coral }]}>
          <Text style={styles.menuCardBadgeText} maxFontSizeMultiplier={1}>
            {badge}
          </Text>
        </View>
      )}
      
      <View style={styles.menuCardIconBox}>
        {renderIcon()}
      </View>
      
      <Text 
        style={[
          styles.menuCardTitle,
          size === 'small' && styles.menuCardTitleSmall,
        ]} 
        maxFontSizeMultiplier={1.2} 
        numberOfLines={2}
      >
        {title}
      </Text>
      
      {subtitle && (
        <Text 
          style={[
            styles.menuCardSubtitle,
            size === 'small' && styles.menuCardSubtitleSmall,
          ]} 
          maxFontSizeMultiplier={1.1} 
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );
};

// ============ MENU CARD OUTLINE ============
// Card con borde (estilo inactivo/secundario)
export const MenuCardOutline = ({ 
  title, 
  subtitle, 
  icon, 
  iconType = 'ionicon',
  color = COLORS.cyan,
  onPress,
  disabled = false,
  size = 'medium',
  style,
}) => {
  const cardStyles = {
    small: styles.menuCardSmall,
    medium: styles.menuCardMedium,
    large: styles.menuCardLarge,
  };

  const iconSizes = {
    small: 20,
    medium: 24,
    large: 28,
  };

  const renderIcon = () => {
    if (iconType === 'emoji') {
      return <Text style={styles.menuCardEmoji}>{icon}</Text>;
    }
    if (iconType === 'custom') {
      return icon;
    }
    return (
      <Ionicons 
        name={icon} 
        size={iconSizes[size]} 
        color={color} 
      />
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.menuCard,
        styles.menuCardOutline,
        cardStyles[size],
        disabled && styles.menuCardDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={[styles.menuCardIconBoxOutline, { backgroundColor: color + '20' }]}>
        {renderIcon()}
      </View>
      
      <Text 
        style={[
          styles.menuCardTitleOutline,
          size === 'small' && styles.menuCardTitleSmall,
        ]} 
        maxFontSizeMultiplier={1.2} 
        numberOfLines={2}
      >
        {title}
      </Text>
      
      {subtitle && (
        <Text 
          style={[
            styles.menuCardSubtitleOutline,
            size === 'small' && styles.menuCardSubtitleSmall,
          ]} 
          maxFontSizeMultiplier={1.1} 
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );
};

// ============ GRADIENT CARD ============
// Card con gradiente (para destacar)
export const GradientCard = ({ 
  title, 
  subtitle, 
  icon,
  iconType = 'ionicon',
  onPress,
  colors = [COLORS.gradientStart, COLORS.gradientEnd],
  style,
}) => (
  <TouchableOpacity
    style={[styles.gradientCardContainer, style]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientCard}
    >
      <View style={styles.gradientCardContent}>
        <View style={{ flex: 1 }}>
          <Text style={styles.gradientCardTitle} maxFontSizeMultiplier={1.2} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.gradientCardSubtitle} maxFontSizeMultiplier={1.1}>
              {subtitle}
            </Text>
          )}
        </View>
        {icon && (
          <View style={styles.gradientCardIconBox}>
            {iconType === 'ionicon' ? (
              <Ionicons name={icon} size={24} color={COLORS.coral} />
            ) : (
              icon
            )}
          </View>
        )}
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

// ============ LIST ITEM ============
// Item de lista horizontal compacto
export const ListItem = ({ 
  title, 
  subtitle,
  icon, 
  iconType = 'ionicon',
  color = COLORS.cyan,
  onPress,
  showArrow = true,
  rightElement,
  style,
}) => (
  <TouchableOpacity
    style={[styles.listItem, style]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.listItemIconBox, { backgroundColor: color + '20' }]}>
      {iconType === 'ionicon' ? (
        <Ionicons name={icon} size={22} color={color} />
      ) : iconType === 'emoji' ? (
        <Text style={{ fontSize: scale(18) }}>{icon}</Text>
      ) : (
        icon
      )}
    </View>
    
    <View style={styles.listItemContent}>
      <Text style={styles.listItemTitle} maxFontSizeMultiplier={1.2} numberOfLines={1}>
        {title}
      </Text>
      {subtitle && (
        <Text style={styles.listItemSubtitle} maxFontSizeMultiplier={1.1} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </View>
    
    {rightElement || (showArrow && (
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
    ))}
  </TouchableOpacity>
);

// ============ SCREEN CONTAINER ============
// Contenedor base para pantallas con fondo correcto
export const ScreenContainer = ({ children, style }) => (
  <View style={[styles.screenContainer, style]}>
    {children}
  </View>
);

// ============ CONTENT SCROLL ============
// ScrollView con padding para tab bar
export const ContentScroll = ({ 
  children, 
  style,
  contentContainerStyle,
  refreshControl,
  ...props
}) => (
  <ScrollView
    showsVerticalScrollIndicator={false}
    contentContainerStyle={[styles.contentScroll, contentContainerStyle]}
    style={style}
    refreshControl={refreshControl}
    {...props}
  >
    {children}
    {/* Espacio para tab bar */}
    <View style={{ height: scale(100) }} />
  </ScrollView>
);

// ============ DIVIDER ============
export const Divider = ({ style }) => (
  <View style={[styles.divider, style]} />
);

// ============ STYLES ============
const styles = StyleSheet.create({
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    marginBottom: scale(12),
  },
  sectionTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionCount: {
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  sectionLink: {
    fontSize: scale(14),
    color: COLORS.cyan,
    fontWeight: '500',
  },

  // Horizontal Scroll
  horizontalScroll: {
    paddingLeft: scale(16),
    paddingRight: scale(8),
    paddingBottom: scale(4),
  },

  // Menu Card
  menuCard: {
    borderRadius: scale(16),
    padding: scale(14),
    marginRight: scale(12),
  },
  menuCardSmall: {
    width: scale(100),
    minHeight: scale(100),
  },
  menuCardMedium: {
    width: scale(140),
    minHeight: scale(130),
  },
  menuCardLarge: {
    width: scale(160),
    minHeight: scale(150),
  },
  menuCardDisabled: {
    opacity: 0.5,
  },
  menuCardOutline: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuCardIconBox: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(10),
  },
  menuCardIconBoxOutline: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(10),
  },
  menuCardEmoji: {
    fontSize: scale(24),
  },
  menuCardTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(2),
  },
  menuCardTitleSmall: {
    fontSize: scale(12),
  },
  menuCardTitleOutline: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(2),
  },
  menuCardSubtitle: {
    fontSize: scale(11),
    color: 'rgba(255, 255, 255, 0.8)',
  },
  menuCardSubtitleSmall: {
    fontSize: scale(10),
  },
  menuCardSubtitleOutline: {
    fontSize: scale(11),
    color: COLORS.textMuted,
  },
  menuCardBadge: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(8),
  },
  menuCardBadgeText: {
    fontSize: scale(9),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Gradient Card
  gradientCardContainer: {
    marginHorizontal: scale(16),
    borderRadius: scale(20),
    overflow: 'hidden',
  },
  gradientCard: {
    padding: scale(20),
    borderRadius: scale(20),
  },
  gradientCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradientCardTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  gradientCardSubtitle: {
    fontSize: scale(13),
    color: 'rgba(255, 255, 255, 0.8)',
  },
  gradientCardIconBox: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List Item
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(14),
    padding: scale(14),
    marginHorizontal: scale(16),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listItemIconBox: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  listItemSubtitle: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },

  // Screen Container
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },

  // Content Scroll
  contentScroll: {
    paddingTop: scale(10),
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: scale(16),
    marginVertical: scale(16),
  },
});

export default {
  COLORS,
  SectionHeader,
  HorizontalMenu,
  MenuCard,
  MenuCardOutline,
  GradientCard,
  ListItem,
  ScreenContainer,
  ContentScroll,
  Divider,
};