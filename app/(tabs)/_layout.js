// app/(tabs)/_layout.js
// ISSY Resident App - Tab Bar con iconos SVG
// Basado en el original, solo actualizando estilos visuales

import { Tabs } from 'expo-router';
import { View, StyleSheet, Image, Platform, Dimensions } from 'react-native';
import { HomeIcon, ChatIcon, HeadsetIcon, UserIcon } from '../../src/components/Icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  navy: '#1A1A2E',
};

// Tab Icon con fondo cuando está activo
const TabIcon = ({ IconComponent, focused, size = 22 }) => (
  <View style={[
    styles.tabIconContainer,
    focused && styles.tabIconContainerActive
  ]}>
    <IconComponent 
      size={size} 
      color={focused ? COLORS.black : COLORS.white} 
    />
  </View>
);

// Logo ISSY flotante en el centro
const CenterLogoButton = () => (
  <View style={styles.centerButtonContainer}>
    <View style={styles.centerButtonOuter}>
      <View style={styles.centerButton}>
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
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.white,
        tabBarInactiveTintColor: COLORS.white,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => (
            <TabIcon IconComponent={HomeIcon} focused={focused} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="visits"
        options={{
          title: 'Visitas',
          tabBarIcon: ({ focused }) => (
            <TabIcon IconComponent={ChatIcon} focused={focused} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="center"
        options={{
          title: '',
          tabBarIcon: () => <CenterLogoButton />,
          tabBarLabel: () => null,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('home');
          },
        })}
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
            <TabIcon IconComponent={UserIcon} focused={focused} size={22} />
          ),
        }}
      />
      {/* Hidden tabs - accessible but not shown in tab bar */}
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
  tabBar: {
    position: 'absolute',
    backgroundColor: COLORS.black,
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? scale(88) : scale(70),
    paddingBottom: Platform.OS === 'ios' ? scale(28) : scale(10),
    paddingTop: scale(12),
    paddingHorizontal: scale(10),
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: scale(44),
    height: scale(38),
    borderRadius: scale(12),
  },
  tabIconContainerActive: {
    backgroundColor: COLORS.white,
  },
  
  centerButtonContainer: {
    position: 'absolute',
    top: scale(-28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButtonOuter: {
    width: scale(68),
    height: scale(68),
    borderRadius: scale(34),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(4),
  },
  centerButton: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLogo: {
    width: scale(45),
    height: scale(30),
  },
});