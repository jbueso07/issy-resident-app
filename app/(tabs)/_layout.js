// app/(tabs)/_layout.js
// ISSY Resident App - Tab Bar Figma Design
// Diseño exacto según especificaciones Figma

import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet, Image, Platform, Dimensions } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Colors from Figma
const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  lime: '#D4FE48',
  navy: '#1A1A2E',
  background: '#FAFAFA',
};

// Custom SVG Icons
const HomeIcon = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9.02 2.84L3.63 7.04C2.73 7.74 2 9.23 2 10.36V17.77C2 20.09 3.89 21.99 6.21 21.99H17.79C20.11 21.99 22 20.09 22 17.78V10.5C22 9.29 21.19 7.74 20.2 7.05L14.02 2.72C12.62 1.74 10.37 1.79 9.02 2.84Z"
      fill={color}
    />
  </Svg>
);

// Simple Dollar Sign Icon (no circle, just the $ symbol)
const DollarIcon = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11.5 3V4.5C8.5 4.9 6.5 6.8 6.5 9.5C6.5 12.5 8.8 13.8 11.5 14.5V19.5C9.5 19.2 8 18 7.5 16.5H5C5.5 19.5 8 21.5 11.5 21.9V23.5H13V21.9C16 21.5 18 19.5 18 16.5C18 13.5 15.7 12.2 13 11.5V6.5C14.8 6.8 16 7.8 16.5 9.5H19C18.5 6.5 16 4.9 13 4.5V3H11.5ZM11.5 6.5V11.2C9.5 10.6 8.5 9.8 8.5 8.5C8.5 7.2 9.7 6.7 11.5 6.5ZM13 14.8V19.5C15 19.2 16 18.2 16 16.5C16 14.8 14.8 14.2 13 14.8Z"
      fill={color}
    />
  </Svg>
);

const HeadsetIcon = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 1C7.03 1 3 5.03 3 10V17C3 18.66 4.34 20 6 20H9V12H5V10C5 6.13 8.13 3 12 3C15.87 3 19 6.13 19 10V12H15V20H18C19.66 20 21 18.66 21 17V10C21 5.03 16.97 1 12 1Z"
      fill={color}
    />
  </Svg>
);

const UserIcon = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
      fill={color}
    />
  </Svg>
);

// Tab Icon Component with active indicator
const TabIcon = ({ IconComponent, focused, size = 22 }) => (
  <View style={styles.tabIconWrapper}>
    <View style={[
      styles.tabIconContainer,
      focused && styles.tabIconContainerActive
    ]}>
      <IconComponent 
        size={size} 
        color={focused ? COLORS.black : COLORS.white} 
      />
    </View>
    {focused && <View style={styles.activeIndicator} />}
  </View>
);

// Center Logo Button - Floating ISSY logo
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

export default function TabsLayout() {
  const router = useRouter();

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
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => (
            <TabIcon IconComponent={HomeIcon} focused={focused} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="visits"
        options={{
          title: 'Finanzas',
          tabBarIcon: ({ focused }) => (
            <TabIcon IconComponent={DollarIcon} focused={focused} size={26} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/finances');
          },
        }}
      />
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
      <Tabs.Screen
        name="support"
        options={{
          title: 'Soporte',
          tabBarIcon: ({ focused }) => (
            <TabIcon IconComponent={HeadsetIcon} focused={focused} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => (
            <TabIcon IconComponent={UserIcon} focused={focused} size={20} />
          ),
        }}
      />
      {/* Hidden tabs */}
      <Tabs.Screen
        name="payments"
        options={{
          href: null,
          title: 'Pagos',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // Main Tab Bar - Floating pill shape
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 20,
    left: 14,
    right: 14,
    height: 60,
    backgroundColor: COLORS.black,
    borderRadius: 40,
    borderTopWidth: 0,
    paddingHorizontal: 4,
    paddingBottom: 0,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
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
  
  // Tab Icon Wrapper
  tabIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    position: 'relative',
  },
  
  // Icon container
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 38,
    borderRadius: 15,
  },
  tabIconContainerActive: {
    backgroundColor: COLORS.white,
  },
  
  // Lime indicator
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 37,
    height: 3,
    backgroundColor: COLORS.lime,
    borderRadius: 10,
  },
  
  // Center floating button container
  centerButtonContainer: {
    position: 'absolute',
    top: -32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Transparent gap ring
  centerButtonGap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Black circle with logo
  centerButtonCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Logo image
  centerLogo: {
    width: 65,
    height: 36,
  },
});