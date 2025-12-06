// app/(tabs)/_layout.js
// ISSY Resident App - Premium Tab Bar with ISSY Logo Center
// Colores de marca: #FC6447 (coral), #FF5A5F (rojo), #343434 (gris)

import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Tab Bar Icon Component
const TabIcon = ({ icon, color, focused }) => (
  <View style={styles.tabIconContainer}>
    <Text style={[styles.tabIcon, { opacity: focused ? 1 : 0.6 }]}>{icon}</Text>
  </View>
);

// Center Logo Button Component
const CenterLogoButton = ({ focused }) => (
  <View style={styles.centerButtonContainer}>
    <LinearGradient
      colors={['#FF5A5F', '#FC6447']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.centerButton}
    >
      <Image
        source={require('../../assets/Isologotipo Blanco.png')}
        style={styles.centerLogo}
        resizeMode="contain"
      />
    </LinearGradient>
  </View>
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#FC6447',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon="🏠" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="visits"
        options={{
          title: 'Visitas',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon="🎫" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="center"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => <CenterLogoButton focused={focused} />,
          tabBarLabel: () => null,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Prevent default navigation, just show the logo
            // Or you can navigate to a specific screen here
            e.preventDefault();
            // Optional: navigate to home or another action
            navigation.navigate('home');
          },
        })}
      />
      <Tabs.Screen
        name="support"
        options={{
          title: 'Soporte',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon="💬" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon="👤" color={color} focused={focused} />
          ),
        }}
      />
      {/* Hidden tabs - accessible but not shown in tab bar */}
      <Tabs.Screen
        name="payments"
        options={{
          href: null, // Hide from tab bar
          title: 'Pagos',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 10,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  tabBarItem: {
    paddingTop: 5,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 24,
  },
  centerButtonContainer: {
    position: 'absolute',
    top: -28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FC6447',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  centerLogo: {
    width: 40,
    height: 40,
    tintColor: '#FFFFFF',
  },
});