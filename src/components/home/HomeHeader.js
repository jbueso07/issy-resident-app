// src/components/home/HomeHeader.js
// ISSY - Encabezado del Home v2: logo, "Vive tranquilo / joinissy.com", Recomendar y campana.

import { View, Text, Image, StyleSheet, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import NotificationBell from '../NotificationBell';
import PressableScale from './PressableScale';
import { useHomeFont } from '../../theme/homeFont';
import { radius, scale, MAX_FONT_SCALE, neu, neuSurface } from '../../theme/tokens';

const ISSY_URL = 'https://joinissy.com';
const LOGO = require('../../../assets/logos/issy-header.png');

export default function HomeHeader() {
  const { t } = useTranslation();
  const font = useHomeFont();

  const handleShare = async () => {
    try {
      await Share.share({
        message: t('home2.referral.shareMessage', {
          url: ISSY_URL,
          defaultValue: 'Te recomiendo ISSY para tu residencial: {{url}}',
        }),
      });
    } catch (error) {
      console.error('Error sharing ISSY:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Image
          source={LOGO}
          style={styles.logo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessibilityLabel="ISSY"
        />
        <View style={styles.brandText}>
          <Text style={[styles.tagline, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {t('home2.brandTagline', 'Vive tranquilo')}
          </Text>
          <Text style={[styles.domain, font(400)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            joinissy.com
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <PressableScale
          variant="neu"
          style={styles.iconButton}
          onPress={handleShare}
          hitSlop={6}
          accessibilityLabel={t('home2.referral.cta', 'Recomendar ISSY')}
        >
          <Ionicons name="gift-outline" size={scale(22)} color={neu.teal} />
        </PressableScale>
        <NotificationBell
          size={scale(22)}
          color={neu.text}
          style={[styles.iconButton, neuSurface.raised]}
          badgeStyle={styles.bellBadge}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    marginBottom: scale(16),
  },
  brand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  logo: {
    width: (scale(34) * 600) / 459,
    height: scale(34),
  },
  brandText: {
    flexShrink: 1,
  },
  tagline: {
    fontSize: scale(15),
    fontWeight: '600',
    color: neu.text,
  },
  domain: {
    fontSize: scale(12),
    color: neu.textSoft,
    marginTop: scale(2),
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  iconButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: radius.pill,
    backgroundColor: neu.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    backgroundColor: neu.coral,
    borderColor: neu.bg,
  },
});
