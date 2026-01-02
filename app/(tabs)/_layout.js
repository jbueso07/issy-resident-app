// app/(tabs)/_layout.js
// ISSY Resident App - Tab Bar ProHome Dark Theme + i18n
// Estructura: Home | Finanzas | ISSY | Marketplace | Perfil

import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet, Image, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from '../../src/hooks/useTranslation';

// Colors ProHome Theme
const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  white: '#FFFFFF',
  lime: '#D4FE48',
  cyan: '#00E5FF',
  border: 'rgba(255, 255, 255, 0.1)',
};

// ============ CUSTOM SVG ICONS ============

// Home Icon (filled style)
const HomeIcon = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9.02 2.84L3.63 7.04C2.73 7.74 2 9.23 2 10.36V17.77C2 20.09 3.89 21.99 6.21 21.99H17.79C20.11 21.99 22 20.09 22 17.78V10.5C22 9.29 21.19 7.74 20.2 7.05L14.02 2.72C12.62 1.74 10.37 1.79 9.02 2.84Z"
      fill={color}
    />
  </Svg>
);

// Dollar/Wallet Icon (filled style - sin círculo)
const WalletIcon = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18.04 13.55C17.62 13.96 17.38 14.55 17.44 15.18C17.53 16.26 18.52 17.05 19.6 17.05H21.5V18.24C21.5 20.31 19.81 22 17.74 22H6.26C4.19 22 2.5 20.31 2.5 18.24V11.51C2.5 9.44 4.19 7.75 6.26 7.75H17.74C19.81 7.75 21.5 9.44 21.5 11.51V12.95H19.48C18.92 12.95 18.41 13.17 18.04 13.55Z"
      fill={color}
    />
    <Path
      d="M2.5 12.41V7.84C2.5 6.65 3.23 5.59 4.34 5.17L12.28 2.17C13.52 1.71 14.85 2.62 14.85 3.95V7.75H6.26C4.19 7.75 2.5 9.44 2.5 11.51V12.41Z"
      fill={color}
    />
    <Path
      d="M22.559 13.97V16.03C22.559 16.58 22.119 17.03 21.559 17.05H19.599C18.519 17.05 17.529 16.26 17.439 15.18C17.379 14.55 17.619 13.96 18.039 13.55C18.409 13.17 18.919 12.95 19.479 12.95H21.559C22.119 12.97 22.559 13.42 22.559 13.97Z"
      fill={color}
    />
  </Svg>
);

// Marketplace/Store Icon (filled style)
const MarketplaceIcon = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3.01 11.22V15.71C3.01 20.2 4.81 22 9.3 22H14.69C19.18 22 20.98 20.2 20.98 15.71V11.22"
      fill={color}
    />
    <Path
      d="M12 12C13.83 12 15.18 10.51 15 8.68L14.34 2H9.67L9 8.68C8.82 10.51 10.17 12 12 12Z"
      fill={color}
    />
    <Path
      d="M18.31 12C20.33 12 21.81 10.36 21.61 8.35L21.33 5.6C20.97 3 19.97 2 17.35 2H14.3L15 9.01C15.17 10.66 16.66 12 18.31 12Z"
      fill={color}
    />
    <Path
      d="M5.64 12C7.29 12 8.78 10.66 8.94 9.01L9.16 6.8L9.64 2H6.59C3.97 2 2.97 3 2.61 5.6L2.34 8.35C2.14 10.36 3.62 12 5.64 12Z"
      fill={color}
    />
    <Path
      d="M12 17C10.33 17 9.5 17.83 9.5 19.5V22H14.5V19.5C14.5 17.83 13.67 17 12 17Z"
      fill={color === COLORS.bgPrimary ? COLORS.cyan : 'rgba(255,255,255,0.3)'}
    />
  </Svg>
);

// Profile/User Icon (filled style)
const ProfileIcon = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
      fill={color}
    />
  </Svg>
);

// ============ TAB ICON COMPONENT ============
const TabIcon = ({ IconComponent, focused, size = 22 }) => (
  <View style={styles.tabIconWrapper}>
    <View style={[
      styles.tabIconContainer,
      focused && styles.tabIconContainerActive
    ]}>
      <IconComponent 
        size={size} 
        color={focused ? COLORS.bgPrimary : 'rgba(255,255,255,0.5)'} 
      />
    </View>
    {focused && <View style={styles.activeIndicator} />}
  </View>
);

// ============ CENTER LOGO BUTTON ============
const CenterLogoButton = () => (
  <View style={styles.centerButtonContainer}>
    <View style={styles.centerButtonGap}>
      <View style={styles.centerButtonCircle}>
        <Image
          source={require('../../assets/Isologotipo Blanco.png')}
          style={styles.centerLogo}
          resizeMode="contain"
        />
      </View>
    </View>
  </View>
);

// ============ MAIN LAYOUT ============
export default function TabsLayout() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.white,
        tabBarInactiveTintColor: COLORS.white,
        tabBarShowLabel: false,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      {/* Tab 1: Home */}
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ focused }) => (
            <TabIcon IconComponent={HomeIcon} focused={focused} size={22} />
          ),
        }}
      />

      {/* Tab 2: Finanzas */}
      <Tabs.Screen
        name="finances"
        options={{
          title: t('tabs.finances'),
          tabBarIcon: ({ focused }) => (
            <TabIcon IconComponent={WalletIcon} focused={focused} size={22} />
          ),
        }}
      />

      {/* Tab 3: Center ISSY Logo */}
      <Tabs.Screen
        name="center"
        options={{
          title: '',
          tabBarIcon: () => <CenterLogoButton />,
          tabBarLabel: () => null,
          tabBarItemStyle: styles.centerTabItem,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
          },
        }}
      />

      {/* Tab 4: Marketplace */}
      <Tabs.Screen
        name="marketplace"
        options={{
          title: t('tabs.marketplace'),
          tabBarIcon: ({ focused }) => (
            <TabIcon IconComponent={MarketplaceIcon} focused={focused} size={22} />
          ),
        }}
      />

      {/* Tab 5: Perfil */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ focused }) => (
            <TabIcon IconComponent={ProfileIcon} focused={focused} size={22} />
          ),
        }}
      />

      {/* ============ HIDDEN TABS ============ */}
      <Tabs.Screen
        name="visits"
        options={{
          href: null,
          title: t('tabs.visits'),
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          href: null,
          title: t('tabs.support'),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          href: null,
          title: t('tabs.payments'),
        }}
      />
    </Tabs>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 20,
    left: 14,
    right: 14,
    height: 60,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 40,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 4,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  
  tabBarItem: {
    height: 60,
    paddingTop: 8,
    paddingBottom: 4,
  },
  
  centerTabItem: {
    height: 60,
  },
  
  tabIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    position: 'relative',
  },
  
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 38,
    borderRadius: 15,
  },
  
  tabIconContainerActive: {
    backgroundColor: COLORS.cyan,
  },
  
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 37,
    height: 3,
    backgroundColor: COLORS.cyan,
    borderRadius: 10,
  },
  
  centerButtonContainer: {
    position: 'absolute',
    top: -32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  centerButtonGap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  
  centerButtonCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  
  centerLogo: {
    width: 65,
    height: 36,
  },
});