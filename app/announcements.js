// app/announcements.js
// ISSY Resident App - Pantalla de Anuncios - ProHome Dark Theme + i18n

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
  Dimensions,
  Pressable,
  PanResponder,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getAnnouncements, markAnnouncementRead } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';
import { useUserLocation } from '../src/context/UserLocationContext';
import { UserLocationSelector, UserLocationPickerModal } from '../src/components/UserLocationPicker';
import PressableScale from '../src/components/home/PressableScale';
import { neu, neuSurface, fs, radius } from '../src/theme/tokens';
import { useHomeFont } from '../src/theme/homeFont';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ProHome Dark Theme Colors
const COLORS = {
  background: neu.bg,
  backgroundSecondary: neu.raised,
  backgroundTertiary: neu.sunken,
  card: neu.raised,
  cardBorder: neu.border,
  teal: neu.teal,
  lime: neu.teal,
  cyan: '#11DAE9',
  purple: neu.lilac,
  textPrimary: neu.text,
  textSecondary: neu.textLabel,
  textMuted: neu.textSoft,
  green: neu.teal,
  red: neu.coral,
  blue: neu.blue,
};

// fromTab: abierta desde la pestaña Anuncios de la barra (sin flecha atrás)
export default function AnnouncementsScreen({ fromTab = false }) {
  const font = useHomeFont();
  const router = useRouter();
  const { t, language } = useTranslation();
  const { selectedLocationId, selectedLocation, loading: locationLoading } = useUserLocation();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchAnnouncements = async () => {
    if (!selectedLocationId) return;
    try {
      const result = await getAnnouncements(selectedLocationId);
      if (result.success) {
        setAnnouncements(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedLocationId) {
      setLoading(true);
      fetchAnnouncements();
    }
  }, [selectedLocationId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnnouncements();
  }, [selectedLocationId]);

  const handleOpenAnnouncement = async (announcement) => {
    setSelectedAnnouncement(announcement);
    setModalVisible(true);
    
    // Marcar como leído si no lo está
    if (!announcement.is_read) {
      try {
        await markAnnouncementRead(announcement.id);
        // Actualizar estado local
        setAnnouncements(prev => 
          prev.map(a => a.id === announcement.id ? { ...a, is_read: true } : a)
        );
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  };

  // Get locale based on language
  const getLocale = () => {
    const locales = { es: 'es-HN', en: 'en-US', fr: 'fr-FR', pt: 'pt-BR' };
    return locales[language] || 'es-HN';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) {
      return t('announcements.timeAgo.minutes', { count: diffMinutes });
    } else if (diffHours < 24) {
      return t('announcements.timeAgo.hours', { count: diffHours });
    } else if (diffDays < 7) {
      return t('announcements.timeAgo.days', { count: diffDays });
    } else {
      return date.toLocaleDateString(getLocale(), { 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
      });
    }
  };

  const formatFullDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(getLocale(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const unreadCount = announcements.filter(a => !a.is_read).length;

  const renderAnnouncement = ({ item }) => (
    <PressableScale variant="neu"
      style={styles.announcementCard}
      onPress={() => handleOpenAnnouncement(item)}
    >
      {/* Gradient sidebar */}
      <LinearGradient
        colors={[COLORS.lime, COLORS.teal]}
        style={styles.gradientBar}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleSection}>
            <Text style={[styles.announcementTitle, font(600)]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.announcementPreview, font(400)]} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={[styles.dateText, font(400)]}>{formatDate(item.created_at)}</Text>
          </View>
          
          <View style={styles.cardRight}>
            {/* Badge NUEVO/VISTO */}
            <View style={[
              styles.statusBadge,
            ]}>
              <Text style={[
                styles.statusBadgeText,
                { color: item.is_read ? COLORS.teal : COLORS.lime }
              , font(600)]}>
                {item.is_read ? t('announcements.seen') : t('announcements.new')}
              </Text>
            </View>
            
            {/* Arrow icon */}
            <TouchableOpacity 
              style={styles.arrowButton}
              onPress={() => handleOpenAnnouncement(item)}
            >
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </PressableScale>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="megaphone-outline" size={64} color={COLORS.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, font(600)]}>{t('announcements.empty.title')}</Text>
      <Text style={[styles.emptySubtitle, font(400)]}>
        {t('announcements.empty.subtitle')}
      </Text>
    </View>
  );

  if (loading || locationLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={[styles.loadingText, font(400)]}>{t('announcements.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {!fromTab && (
          <PressableScale variant="neu" 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </PressableScale>
        )}
        <View style={[styles.headerTitleContainer, fromTab && { marginLeft: 0 }]}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, font(600)]}>{t('announcements.title')}</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={[styles.unreadBadgeText, font(600)]}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <UserLocationSelector style={styles.headerSubtitle} />
        </View>
        <View style={{ width: scale(40) }} />
      </View>

      {/* Lista de anuncios */}
      <FlatList
        data={announcements}
        renderItem={renderAnnouncement}
        keyExtractor={(item) => item.id.toString()}
        // Desde la barra: mismo espacio final que el home para que el último anuncio no quede tapado
        contentContainerStyle={[styles.listContent, fromTab && { paddingBottom: scale(120) }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.purple}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal de detalle */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        {/* Provider propio: dentro de un Modal los insets no llegan del provider de la app */}
        <SafeAreaProvider>
          {selectedAnnouncement && (
            <AnnouncementDetailSheet
              announcement={selectedAnnouncement}
              locationName={selectedLocation?.location?.name || selectedLocation?.name || ''}
              dateText={formatFullDate(selectedAnnouncement.created_at)}
              onClose={() => setModalVisible(false)}
            />
          )}
        </SafeAreaProvider>
      </Modal>

      {/* Location Picker Modal */}
      <UserLocationPickerModal />
    </SafeAreaView>
  );
}


// ---------------------------------------------------------------------------
// Detalle del anuncio: hoja con encabezado FIJO (la X nunca queda bajo la imagen)
// ---------------------------------------------------------------------------
const SHEET_PADDING = scale(20);
const CONTENT_WIDTH = SCREEN_WIDTH - SHEET_PADDING * 2;
const MAX_IMAGE_HEIGHT = SCREEN_HEIGHT * 0.45;

function AnnouncementDetailSheet({ announcement, locationName, dateText, onClose }) {
  const font = useHomeFont();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [ratios, setRatios] = useState({});
  const [imageIndex, setImageIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState(null);
  const images = announcement?.images || [];

  // Proporción real de cada imagen (si no carga, 4:3 mientras tanto)
  useEffect(() => {
    let cancelled = false;
    images.forEach((uri) => {
      Image.getSize(
        uri,
        (w, h) => {
          if (!cancelled && w > 0 && h > 0) setRatios((prev) => ({ ...prev, [uri]: w / h }));
        },
        () => {}
      );
    });
    return () => {
      cancelled = true;
    };
  }, [announcement?.id]);

  const heightFor = (uri) => Math.min(CONTENT_WIDTH / (ratios[uri] || 4 / 3), MAX_IMAGE_HEIGHT);
  const carouselHeight = images.length ? heightFor(images[Math.min(imageIndex, images.length - 1)]) : 0;

  // Swipe hacia abajo desde el encabezado/asa cierra la hoja (la X sigue respondiendo a su toque)
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.8) onCloseRef.current?.();
      },
    })
  ).current;

  const kindLabel = t('announcements.kind', 'Anuncio');
  const headerLabel = locationName ? `${kindLabel} · ${locationName}` : kindLabel;
  const publisher = announcement?.users?.name;

  return (
    <View style={styles.sheetRoot}>
      {/* Tocar el fondo, fuera de la hoja, cierra */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
      />

      <View style={[styles.sheet, { maxHeight: SCREEN_HEIGHT - topInset(insets) - scale(8) }]}>
        {/* Encabezado fijo fuera del scroll */}
        <View style={styles.sheetHeader} {...panResponder.panHandlers}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeaderRow}>
            <View style={styles.sheetHeaderText}>
              <Text style={[styles.sheetKind, font(600)]} numberOfLines={1}>{headerLabel}</Text>
              <Text style={[styles.sheetDate, font(400)]} numberOfLines={2}>{dateText}</Text>
            </View>
            <PressableScale
              variant="neu"
              neuSmall
              style={styles.sheetClose}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Ionicons name="close" size={24} color={neu.text} />
            </PressableScale>
          </View>
        </View>

        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={[styles.sheetScrollContent, { paddingBottom: insets.bottom + scale(24) }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sheetTitle, font(600)]}>{announcement.title}</Text>

          {images.length > 0 && (
            <View style={styles.imageBlock}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEnabled={images.length > 1}
                onMomentumScrollEnd={(e) => setImageIndex(Math.round(e.nativeEvent.contentOffset.x / CONTENT_WIDTH))}
                style={{ width: CONTENT_WIDTH, height: carouselHeight }}
              >
                {images.map((uri, index) => (
                  <Pressable
                    key={`${uri}-${index}`}
                    onPress={() => setViewerIndex(index)}
                    accessibilityRole="imagebutton"
                    accessibilityLabel={t('announcements.viewFull', 'Ver completa')}
                  >
                    <Image
                      source={{ uri }}
                      style={[styles.sheetImage, { height: carouselHeight }]}
                      resizeMode="contain"
                    />
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.viewFullChip} pointerEvents="none">
                <Ionicons name="expand-outline" size={14} color={neu.text} />
                <Text style={[styles.viewFullText, font(600)]}>{t('announcements.viewFull', 'Ver completa')}</Text>
              </View>
              {images.length > 1 && (
                <View style={styles.dotsContainer}>
                  {images.map((_, index) => (
                    <View
                      key={index}
                      style={[styles.dot, { backgroundColor: index === imageIndex ? neu.teal : neu.textSoft }]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          <Text style={[styles.sheetMessage, font(400)]}>{announcement.message}</Text>

          {!!publisher && (
            <Text style={[styles.sheetPublisher, font(400)]}>
              {t('announcements.postedBy', 'Publicado por')} {publisher}
            </Text>
          )}
        </ScrollView>
      </View>

      <ImageViewer
        images={images}
        startIndex={viewerIndex}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}

// Visor a pantalla completa: fondo negro, contain; zoom con pellizco solo en iOS
function ImageViewer({ images, startIndex, onClose }) {
  const { t } = useTranslation();
  const pagerRef = useRef(null);
  const visible = startIndex !== null;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaProvider>
        {visible && <ViewerContent images={images} startIndex={startIndex} onClose={onClose} pagerRef={pagerRef} t={t} />}
      </SafeAreaProvider>
    </Modal>
  );
}

// Margen superior real: dentro de un Modal con statusBarTranslucent el inset puede llegar en 0
const topInset = (insets) => Math.max(insets.top, Platform.OS === 'ios' ? 44 : 24);

function ViewerContent({ images, startIndex, onClose, pagerRef, t }) {
  const insets = useSafeAreaInsets();
  const pageStyle = { width: SCREEN_WIDTH, height: SCREEN_HEIGHT };
  const translateY = useRef(new Animated.Value(0)).current;
  // Zoom actual (iOS): el swipe para cerrar solo actúa con zoom 1
  const zoomRef = useRef(1);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) =>
        zoomRef.current <= 1.01 && Math.abs(g.dy) > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderMove: (_, g) => translateY.setValue(g.dy),
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dy) > 120 || Math.abs(g.vy) > 0.8) {
          onCloseRef.current?.();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
      },
    })
  ).current;

  return (
    <View style={styles.viewerRoot}>
      <Animated.View style={{ flex: 1, transform: [{ translateY }] }} {...panResponder.panHandlers}>
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={images.length > 1}
          contentOffset={{ x: startIndex * SCREEN_WIDTH, y: 0 }}
          onLayout={() => {
            // Android no respeta contentOffset: se posiciona al medir
            if (Platform.OS === 'android' && startIndex > 0) {
              pagerRef.current?.scrollTo({ x: startIndex * SCREEN_WIDTH, y: 0, animated: false });
            }
          }}
        >
          {images.map((uri, index) =>
            Platform.OS === 'ios' ? (
              <ScrollView
                key={`${uri}-${index}`}
                style={pageStyle}
                contentContainerStyle={styles.viewerZoomContent}
                maximumZoomScale={3}
                minimumZoomScale={1}
                centerContent
                scrollEventThrottle={16}
                onScroll={(e) => {
                  zoomRef.current = e.nativeEvent.zoomScale || 1;
                }}
                onScrollEndDrag={(e) => {
                  zoomRef.current = e.nativeEvent.zoomScale || 1;
                }}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              >
                <Image source={{ uri }} style={pageStyle} resizeMode="contain" />
              </ScrollView>
            ) : (
              <View key={`${uri}-${index}`} style={pageStyle}>
                <Image source={{ uri }} style={pageStyle} resizeMode="contain" />
              </View>
            )
          )}
        </ScrollView>
      </Animated.View>

      {/* Después del contenido: siempre encima y visible */}
      <PressableScale
        variant="neu"
        neuSurface="none"
        neuSmall
        containerStyle={[styles.viewerCloseWrap, { top: topInset(insets) + 8 }]}
        style={styles.viewerClose}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
      >
        <Ionicons name="close" size={24} color="#FFFFFF" />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: scale(12),
    fontSize: fs(16),
    color: COLORS.textSecondary,
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
    backgroundColor: COLORS.background,
  },
  backButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    ...neuSurface.raisedSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: scale(12),
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fs(22),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  unreadBadge: {
    ...neuSurface.sunkenSm,
    borderRadius: scale(10),
    minWidth: scale(20),
    height: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scale(8),
    paddingHorizontal: scale(6),
  },
  unreadBadgeText: {
    color: neu.coral,
    fontSize: fs(11),
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  
  // List styles
  listContent: {
    paddingHorizontal: scale(20),
    paddingTop: scale(8),
    paddingBottom: scale(100),
  },
  
  // Card styles
  announcementCard: {
    ...neuSurface.raised,
    borderRadius: scale(16),
    marginBottom: scale(12),
    flexDirection: 'row',
    overflow: 'hidden',
  },
  gradientBar: {
    width: scale(6),
    borderTopLeftRadius: scale(16),
    borderBottomLeftRadius: scale(16),
  },
  cardContent: {
    flex: 1,
    padding: scale(16),
    paddingLeft: scale(14),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleSection: {
    flex: 1,
    marginRight: scale(12),
  },
  announcementTitle: {
    fontSize: fs(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  announcementPreview: {
    fontSize: fs(13),
    color: COLORS.textSecondary,
    marginBottom: scale(8),
    lineHeight: scale(18),
  },
  dateText: {
    fontSize: fs(12),
    color: COLORS.teal,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    ...neuSurface.sunkenSm,
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: radius.pill,
    marginBottom: scale(12),
  },
  statusBadgeText: {
    fontSize: fs(10),
    fontWeight: '600',
    textAlign: 'center',
  },
  arrowButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    ...neuSurface.raisedSm,
  },
  
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(60),
  },
  emptyIconContainer: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    ...neuSurface.sunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(24),
  },
  emptyTitle: {
    fontSize: fs(20),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  emptySubtitle: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: scale(40),
  },
  
  // Detalle del anuncio (hoja)
  sheetRoot: {
    flex: 1,
    backgroundColor: neu.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    ...neuSurface.raised,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    overflow: 'hidden',
  },
  sheetHeader: {
    paddingHorizontal: SHEET_PADDING,
    paddingTop: scale(8),
    paddingBottom: scale(8),
    zIndex: 10,
    elevation: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: scale(40),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: neu.sunken,
    marginBottom: scale(10),
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  sheetHeaderText: {
    flex: 1,
  },
  sheetKind: {
    fontSize: fs(13),
    fontWeight: '600',
    color: neu.teal,
  },
  sheetDate: {
    fontSize: fs(12),
    color: neu.textSoft,
    marginTop: scale(2),
    textTransform: 'capitalize',
  },
  sheetClose: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    flexShrink: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: SHEET_PADDING,
    paddingTop: scale(8),
  },
  sheetTitle: {
    fontSize: fs(22),
    fontWeight: '600',
    color: neu.text,
    marginBottom: scale(14),
  },
  imageBlock: {
    marginBottom: scale(16),
  },
  sheetImage: {
    width: CONTENT_WIDTH,
    borderRadius: 20,
    backgroundColor: neu.bgDeep,
  },
  viewFullChip: {
    position: 'absolute',
    right: scale(10),
    bottom: scale(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: radius.pill,
    backgroundColor: 'rgba(15, 26, 30, 0.72)',
  },
  viewFullText: {
    fontSize: fs(11),
    fontWeight: '600',
    color: neu.text,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: scale(10),
  },
  dot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginHorizontal: scale(3),
  },
  sheetMessage: {
    fontSize: fs(15),
    color: neu.textLabel,
    lineHeight: fs(15) * 1.55,
  },
  sheetPublisher: {
    fontSize: fs(12),
    color: neu.textSoft,
    marginTop: scale(20),
  },
  // Visor de imagen
  viewerRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },
  viewerZoomContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  viewerCloseWrap: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    elevation: 10,
  },
  viewerClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
});
