// src/components/home/LocationCarousel.js
// ISSY - Tarjeta de residencial deslizable del Home v2 (una por residencial activa).
// El cambio de residencial lo hace el padre (onSwitchLocation = handleSwitchLocation de home.js);
// aquí solo se decide cuándo llamarlo: al terminar el deslizamiento, nunca en cada movimiento.
//
// Campos usados de profile.user_locations (GET /auth/me, que ya filtra status = 'active'):
// location_id, name, role, house_number. No trae status ni unit_number.

import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, FlatList, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import PressableScale from './PressableScale';
import { colors, gradients, radius, spacing, scale, MAX_FONT_SCALE } from '../../theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GUTTER = scale(spacing.lg);
const GAP = scale(spacing.md);
const CARD_WIDTH = SCREEN_WIDTH - GUTTER * 2;
const INTERVAL = CARD_WIDTH + GAP;

// Con más residenciales que esto, los puntos se ocultan y queda solo el chip "X de Y"
const MAX_DOTS = 7;
// Toques que llegan justo después de deslizar no abren la lista
const PRESS_AFTER_SCROLL_MS = 300;

// Etiquetas de user_locations.role; host o cualquier otro valor se omite
const ROLE_LABELS = {
  resident: ['home2.roles.resident', 'Residente'],
  owner: ['home2.roles.owner', 'Propietario'],
  tenant: ['home2.roles.tenant', 'Inquilino'],
  admin: ['home2.roles.admin', 'Administrador'],
  guard: ['home2.roles.guard', 'Guardia'],
};

export const getRoleLabel = (role, t) => {
  const entry = ROLE_LABELS[role];
  return entry ? t(entry[0], entry[1]) : null;
};

// Sin casa "con certeza": solo cuando /auth/me ya manda unit_number y ni ese ni house_number tienen valor
export const hasKnownNoHome = (loc) =>
  !!loc && 'unit_number' in loc && !loc.house_number && !loc.unit_number;

const getInitials = (user) => {
  const source = (user?.name || user?.email?.split('@')[0] || '').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
};

export default function LocationCarousel({
  locations,
  currentLocationId,
  user,
  onSwitchLocation,
  switching,
  onOpenLocationList,
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const listRef = useRef(null);

  const cards = useMemo(() => (locations || []).filter((loc) => loc?.location_id), [locations]);
  const total = cards.length;
  const hasMany = total > 1;
  const currentIndex = Math.max(0, cards.findIndex((loc) => loc.location_id === currentLocationId));

  const [visibleIndex, setVisibleIndex] = useState(currentIndex);
  const visibleIndexRef = useRef(currentIndex);

  const setVisible = (index) => {
    visibleIndexRef.current = index;
    setVisibleIndex(index);
  };

  const scrollToCard = (index, animated = true) => {
    if (!listRef.current || index < 0 || index >= total) return;
    listRef.current.scrollToIndex({ index, animated });
    setVisible(index);
  };

  const requestSwitch = (index) => {
    const location = cards[index];
    if (!location || switching || index === currentIndex) return;
    onSwitchLocation?.(location);
  };

  // La tarjeta visible siempre es la residencial real: si el cambio falla o
  // currentLocationId cambia desde fuera (modal), regresar a su tarjeta.
  useEffect(() => {
    if (switching) return;
    if (visibleIndexRef.current !== currentIndex) scrollToCard(currentIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [switching, currentIndex, total]);

  // Deslizar no debe abrir la lista: se ignoran toques durante y justo después de un arrastre
  const draggingRef = useRef(false);
  const lastScrollAtRef = useRef(0);
  const markScroll = (dragging) => {
    draggingRef.current = dragging;
    lastScrollAtRef.current = Date.now();
  };

  const handleCardPress = () => {
    if (switching || draggingRef.current) return;
    if (Date.now() - lastScrollAtRef.current < PRESS_AFTER_SCROLL_MS) return;
    onOpenLocationList?.();
  };

  const handleMomentumScrollEnd = (e) => {
    markScroll(false);
    const raw = Math.round(e.nativeEvent.contentOffset.x / INTERVAL);
    const index = Math.min(Math.max(raw, 0), total - 1);
    setVisible(index);
    requestSwitch(index);
  };

  const handleDotPress = (index) => {
    if (switching || index === visibleIndexRef.current) return;
    scrollToCard(index);
    requestSwitch(index);
  };

  const photoUri = user?.avatar_url || user?.profile_photo_url;
  const userName = user?.name || user?.email?.split('@')[0] || t('profile.user');

  const renderCard = ({ item, index }) => {
    const roleLabel = getRoleLabel(item.role, t);
    const isVisible = index === visibleIndex;

    return (
      // Toda la tarjeta abre la lista; los botones de adentro (QR, cámara, chip) conservan su acción.
      // accessible={false}: si no, el lector de pantalla esconde esos botones; el chip hace lo mismo.
      <PressableScale
        containerStyle={index < total - 1 && styles.cardGap}
        onPress={handleCardPress}
        disabled={!hasMany || switching}
        scaleTo={0.98}
        accessible={false}
      >
      <LinearGradient
        colors={gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.topRow}>
          <View style={styles.photoWrap}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <>
                <View style={[styles.photo, styles.initialsBox]}>
                  <Text style={styles.initials} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    {getInitials(user)}
                  </Text>
                </View>
                <PressableScale
                  style={styles.cameraButton}
                  onPress={() => router.push('/edit-profile')}
                  hitSlop={8}
                  accessibilityLabel={t('profile.editProfile')}
                >
                  <Ionicons name="camera" size={scale(14)} color={colors.text} />
                </PressableScale>
              </>
            )}
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={2}>
              {userName}
            </Text>
            {roleLabel && (
              <Text style={styles.role} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {roleLabel}
              </Text>
            )}
          </View>

          {hasMany && (
            <PressableScale
              style={styles.chip}
              onPress={onOpenLocationList}
              disabled={switching}
              hitSlop={6}
              accessibilityLabel={t('home.changeLocation')}
            >
              <Text style={styles.chipText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {t('home2.ofN', { i: index + 1, n: total, defaultValue: '{{i}} de {{n}}' })}
              </Text>
              <Ionicons name="chevron-down" size={scale(12)} color={colors.textDark} />
            </PressableScale>
          )}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.locationInfo}>
            <Text style={styles.eyebrow} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {t('home2.myResidence', 'Mi residencial')}
            </Text>
            <Text style={styles.locationName} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={2}>
              {item.name || t('home.myCommunity')}
            </Text>
            {!!item.house_number && (
              <Text style={styles.house} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {t('myUnit.details.unit')} {item.house_number}
              </Text>
            )}
          </View>

          {/* Sin casa en esta residencial no hay QR de residente */}
          {!hasKnownNoHome(item) && (
            <PressableScale
              style={styles.qrButton}
              onPress={() => router.push({ pathname: '/(tabs)/visits', params: { tab: 'myqr' } })}
              accessibilityLabel={t('visits.tabs.myQR')}
            >
              <Ionicons name="qr-code-outline" size={scale(24)} color={colors.lime} />
            </PressableScale>
          )}
        </View>

        {switching && isVisible && (
          <View
            style={styles.switchingBadge}
            accessible
            accessibilityLabel={t('home.switchingLocation')}
            accessibilityLiveRegion="polite"
          >
            <ActivityIndicator size="small" color={colors.textDark} />
          </View>
        )}
      </LinearGradient>
      </PressableScale>
    );
  };

  if (total === 0) return null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={cards}
        keyExtractor={(item) => String(item.location_id)}
        renderItem={renderCard}
        extraData={`${visibleIndex}|${switching}|${photoUri}|${userName}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={hasMany && !switching}
        snapToInterval={INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={styles.listContent}
        getItemLayout={(_, index) => ({ length: INTERVAL, offset: INTERVAL * index, index })}
        initialScrollIndex={currentIndex}
        onScrollBeginDrag={() => markScroll(true)}
        onScrollEndDrag={() => markScroll(false)}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollToIndexFailed={({ index }) =>
          listRef.current?.scrollToOffset({ offset: INTERVAL * index, animated: false })
        }
      />

      {hasMany && total <= MAX_DOTS && (
        <View style={styles.dots}>
          {cards.map((loc, index) => (
            <PressableScale
              key={String(loc.location_id)}
              style={styles.dotHitArea}
              onPress={() => handleDotPress(index)}
              disabled={switching}
              accessibilityLabel={loc.name}
              accessibilityState={{ selected: index === visibleIndex }}
            >
              <View style={[styles.dot, index === visibleIndex && styles.dotActive]} />
            </PressableScale>
          ))}
        </View>
      )}
    </View>
  );
}

const PHOTO_WIDTH = scale(62);
const PHOTO_HEIGHT = scale(72);

const styles = StyleSheet.create({
  container: {
    marginBottom: scale(20),
  },
  listContent: {
    paddingHorizontal: GUTTER,
  },
  card: {
    width: CARD_WIDTH,
    minHeight: scale(176),
    justifyContent: 'space-between',
    borderRadius: scale(radius.xl),
    padding: scale(spacing.lg),
    gap: scale(spacing.lg),
  },
  cardGap: {
    marginRight: GAP,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(spacing.md),
  },
  photoWrap: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
  },
  photo: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    borderRadius: scale(19),
  },
  initialsBox: {
    backgroundColor: colors.darkOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: scale(22),
    fontWeight: '700',
    color: colors.textDark,
  },
  cameraButton: {
    position: 'absolute',
    right: -scale(6),
    bottom: -scale(6),
    width: scale(26),
    height: scale(26),
    borderRadius: radius.pill,
    backgroundColor: colors.textDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    paddingTop: scale(spacing.xs),
  },
  userName: {
    fontSize: scale(17),
    fontWeight: '700',
    color: colors.textDark,
  },
  role: {
    fontSize: scale(13),
    fontWeight: '500',
    color: colors.textDarkSecondary,
    marginTop: scale(2),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(2),
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: radius.pill,
    backgroundColor: colors.darkOverlay,
  },
  chipText: {
    fontSize: scale(12),
    fontWeight: '600',
    color: colors.textDark,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: scale(spacing.md),
  },
  locationInfo: {
    flex: 1,
  },
  eyebrow: {
    fontSize: scale(12),
    fontWeight: '500',
    color: colors.textDarkSecondary,
  },
  locationName: {
    fontSize: scale(20),
    fontWeight: '700',
    color: colors.textDark,
    marginTop: scale(2),
  },
  house: {
    fontSize: scale(13),
    color: colors.textDarkSecondary,
    marginTop: scale(2),
  },
  qrButton: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(radius.md),
    backgroundColor: colors.textDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchingBadge: {
    position: 'absolute',
    top: scale(spacing.sm),
    alignSelf: 'center',
    paddingHorizontal: scale(spacing.md),
    paddingVertical: scale(spacing.xs),
    borderRadius: radius.pill,
    backgroundColor: colors.darkOverlay,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: scale(spacing.sm),
  },
  // Área táctil de 24×24 alrededor del punto visible
  dotHitArea: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: scale(6),
    height: scale(6),
    borderRadius: radius.pill,
    backgroundColor: colors.textMuted,
  },
  dotActive: {
    width: scale(18),
    backgroundColor: colors.cyan,
  },
});
