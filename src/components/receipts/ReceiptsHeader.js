// src/components/receipts/ReceiptsHeader.js
// ISSY - Encabezado sencillo (atrás + título) para Mis recibos, el recibo y Datos para mis recibos.

import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import PressableScale from '../home/PressableScale';
import { neu, scale, fs, MAX_FONT_SCALE } from '../../theme/tokens';
import { useHomeFont } from '../../theme/homeFont';

export default function ReceiptsHeader({ title }) {
  const router = useRouter();
  const font = useHomeFont();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/payments');
  };

  return (
    <View style={styles.header}>
      <PressableScale
        variant="neu"
        neuSmall
        style={styles.back}
        onPress={goBack}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Regresar"
      >
        <Ionicons name="chevron-back" size={scale(24)} color={neu.text} />
      </PressableScale>
      <Text
        style={[styles.title, font(600)]}
        numberOfLines={1}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        accessibilityRole="header"
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    paddingHorizontal: scale(16),
    paddingTop: scale(8),
    paddingBottom: scale(12),
  },
  back: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: fs(22),
    fontWeight: '600',
    color: neu.text,
  },
});
