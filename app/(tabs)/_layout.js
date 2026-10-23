// app/(tabs)/_layout.js
// ISSY Resident App - Tab Bar ProHome Dark Theme + i18n
// Estructura: Inicio | Anuncios | + (Nuevo QR) | Mis QR | Perfil
// Barra propia (tabBar) para el indicador deslizante y el botón + que abre NewQRSheet.

import { useEffect, useRef, useState } from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, Pressable, Animated, Keyboard } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../../src/hooks/useTranslation';
import { useAuth } from '../../src/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NewQRSheet from '../../src/components/home/NewQRSheet';

// Colors ProHome Theme
const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  white: '#FFFFFF',
  lime: '#D4FE48',
  cyan: '#00E5FF',
  teal: '#00BFA6',
  border: 'rgba(255, 255, 255, 0.1)',
  inactive: 'rgba(255,255,255,0.5)',
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

// Profile/User Icon (filled style)
const ProfileIcon = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
      fill={color}
    />
  </Svg>
);

const AnnouncementsIcon = ({ color, size = 22 }) => <Ionicons name="megaphone" size={size} color={color} />;
const MyQRIcon = ({ color, size = 22 }) => <Ionicons name="qr-code" size={size} color={color} />;

// ============ BARRA ============
// Pestañas visibles. `routes`: rutas de (tabs) que encienden esa pestaña.
const BAR_ITEMS = [
  { key: 'home', route: 'home', routes: ['home'], Icon: HomeIcon },
  { key: 'announcements', route: 'announcements-tab', routes: ['announcements-tab'], Icon: AnnouncementsIcon },
  { key: 'new', isCenter: true },
  // Mis QR abre Visitas en la pestaña de mis visitantes; Visitas (ruta oculta) enciende Mis QR
  { key: 'myqr', route: 'visits', params: { tab: 'visitors' }, routes: ['visits'], Icon: MyQRIcon },
  { key: 'profile', route: 'profile', routes: ['profile'], Icon: ProfileIcon },
];

const PILL_WIDTH = 42;
const BAR_PADDING = 4;
const BAR_BORDER = 1;
// Lo que el botón + sobresale por arriba de la barra
const CENTER_OVERHANG = 20;

function IssyTabBar({ state, navigation, bottom, onOpenNewQR }) {
  const { t } = useTranslation();
  const [barWidth, setBarWidth] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorOpacity = useRef(new Animated.Value(0)).current;
  const placedRef = useRef(false);

  const activeName = state.routes[state.index]?.name;
  const activeIndex = BAR_ITEMS.findIndex((item) => item.routes?.includes(activeName));
  const slotWidth = barWidth > 0 ? (barWidth - (BAR_PADDING + BAR_BORDER) * 2) / BAR_ITEMS.length : 0;

  const labels = {
    home: t('tabs.home'),
    announcements: t('home2.tabs.announcements', 'Anuncios'),
    new: t('home2.newQR.title', 'Nuevo QR'),
    myqr: t('home2.tabs.myQR', 'Mis QR'),
    profile: t('tabs.profile'),
  };

  // Indicador: se desliza con resorte; en rutas ocultas sin pestaña propia (pagos, finanzas…) se esconde
  useEffect(() => {
    if (!slotWidth) return;
    const visible = activeIndex >= 0;
    Animated.timing(indicatorOpacity, { toValue: visible ? 1 : 0, duration: 150, useNativeDriver: true }).start();
    if (!visible) return;
    const x = activeIndex * slotWidth + (slotWidth - PILL_WIDTH) / 2;
    if (!placedRef.current) {
      placedRef.current = true;
      indicatorX.setValue(x);
      return;
    }
    Animated.spring(indicatorX, { toValue: x, friction: 8, tension: 90, useNativeDriver: true }).start();
  }, [activeIndex, slotWidth, indicatorX, indicatorOpacity]);

  // La barra flota sobre todo: en Android subiría encima del teclado y taparía lo que se escribe
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handlePress = (item) => {
    const target = state.routes.find((r) => r.name === item.route);
    const isFocused = activeName === item.route;
    const event = target
      ? navigation.emit({ type: 'tabPress', target: target.key, canPreventDefault: true })
      : { defaultPrevented: false };
    if (event.defaultPrevented) return;
    // Mis QR siempre manda la pestaña de visitantes, aunque Visitas ya esté abierta
    if (!isFocused || item.params) navigation.navigate(item.route, item.params);
  };

  if (keyboardOpen) return null;

  return (
    // Contenedor con espacio arriba para el +: así todo el círculo queda dentro de un padre y
    // Android registra el toque completo. box-none: el espacio vacío no bloquea el contenido.
    <View style={[styles.wrapper, { bottom }]} pointerEvents="box-none">
      <View
        style={styles.tabBar}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        accessibilityRole="tablist"
      >
        {slotWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              { left: BAR_PADDING, opacity: indicatorOpacity, transform: [{ translateX: indicatorX }] },
            ]}
          >
            <View style={styles.indicatorPill} />
            <View style={styles.indicatorLine} />
          </Animated.View>
        )}

        {BAR_ITEMS.map((item, index) => {
          // El + se dibuja fuera de la barra (abajo); aquí solo se reserva su lugar
          if (item.isCenter) return <View key={item.key} style={styles.slot} />;
          const isActive = index === activeIndex;
          const { Icon } = item;
          return (
            <Pressable
              key={item.key}
              style={styles.slot}
              onPress={() => handlePress(item)}
              accessibilityRole="tab"
              accessibilityLabel={labels[item.key]}
              accessibilityState={{ selected: isActive }}
            >
              <View style={styles.tabIconContainer}>
                <Icon size={22} color={isActive ? COLORS.bgPrimary : COLORS.inactive} />
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.centerOverlay} pointerEvents="box-none">
        <Pressable
          onPress={onOpenNewQR}
          style={({ pressed }) => pressed && styles.centerPressed}
          accessibilityRole="button"
          accessibilityLabel={labels.new}
        >
          <View style={styles.centerButtonGap}>
            <LinearGradient
              colors={[COLORS.teal, COLORS.lime]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.centerButtonCircle}
            >
              <Ionicons name="add" size={30} color={COLORS.bgPrimary} />
            </LinearGradient>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

// ============ MAIN LAYOUT ============
export default function TabsLayout() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [showNewQR, setShowNewQR] = useState(false);

  const bottom = Platform.OS === 'android' ? Math.max(28, insets.bottom + 12) : 28;
  const locationName = profile?.current_location?.name || profile?.location?.name || '';

  return (
    <>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <IssyTabBar {...props} bottom={bottom} onOpenNewQR={() => setShowNewQR(true)} />}
      >
        {/* Visibles (la barra propia decide cuáles se muestran) */}
        <Tabs.Screen name="home" options={{ title: t('tabs.home') }} />
        <Tabs.Screen name="announcements-tab" options={{ title: t('home2.tabs.announcements', 'Anuncios') }} />
        <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />

        {/* ============ HIDDEN TABS ============ */}
        {/* Siguen existiendo para las rutas viejas y las notificaciones */}
        <Tabs.Screen name="visits" options={{ href: null, title: t('tabs.visits') }} />
        <Tabs.Screen name="finances" options={{ href: null, title: t('tabs.finances') }} />
        <Tabs.Screen name="marketplace" options={{ href: null, title: t('tabs.marketplace') }} />
        <Tabs.Screen name="payments" options={{ href: null, title: t('tabs.payments') }} />
        <Tabs.Screen name="support" options={{ href: null, title: t('tabs.support') }} />
        <Tabs.Screen name="center" options={{ href: null }} />
      </Tabs>

      <NewQRSheet visible={showNewQR} onClose={() => setShowNewQR(false)} locationName={locationName} />
    </>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    paddingTop: CENTER_OVERHANG,
  },

  tabBar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 40,
    borderWidth: BAR_BORDER,
    borderColor: COLORS.border,
    paddingHorizontal: BAR_PADDING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },

  slot: {
    flex: 1,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: PILL_WIDTH,
    height: 38,
  },

  // Píldora cian + línea inferior, se deslizan juntas detrás del icono activo
  indicator: {
    position: 'absolute',
    top: 11,
    width: PILL_WIDTH,
    alignItems: 'center',
  },
  indicatorPill: {
    width: PILL_WIDTH,
    height: 38,
    borderRadius: 15,
    backgroundColor: COLORS.cyan,
  },
  indicatorLine: {
    marginTop: 3,
    width: 37,
    height: 3,
    borderRadius: 10,
    backgroundColor: COLORS.cyan,
  },

  // Encima de la barra: en Android el orden lo decide la elevación (la barra tiene 15)
  centerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
    elevation: 16,
  },
  centerPressed: {
    transform: [{ scale: 0.94 }],
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});
