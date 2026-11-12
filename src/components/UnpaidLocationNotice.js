// src/components/UnpaidLocationNotice.js
// Aviso de residencial en mora (membresía desactivada por Falta de pago), SOLO para esa residencial.
// Ahí siguen el QR de residente, Pagos y Recibos; tarjeta y QR de visitas quedan pausados.
// message: 'banner' (QR de residente) | 'visitorsPaused' (pestaña Visitantes) | 'onlyEssentials' (resto)
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import PressableScale from './home/PressableScale';
import { neu, neuSurface } from '../theme/tokens';
import { useHomeFont } from '../theme/homeFont';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const DEFAULTS = {
  banner: 'Tienes pagos pendientes en {{name}}. Tu QR de residente sigue funcionando; tu tarjeta y tus QR de visitas están pausados hasta que te pongas al día.',
  visitorsPaused: 'Tus QR de visitas en {{name}} están pausados hasta que te pongas al día con tus pagos.',
  onlyEssentials: 'Mientras tengas pagos pendientes en {{name}}, aquí solo puedes usar tu QR de residente, Pagos y Recibos.',
};

export default function UnpaidLocationNotice({ name, message = 'banner', style, onChangeLocation }) {
  const router = useRouter();
  const { t } = useTranslation();
  const font = useHomeFont();

  return (
    <View style={[styles.box, neuSurface.sunkenSm, style]} accessibilityRole="alert">
      <View style={styles.row}>
        <Ionicons name="alert-circle" size={scale(22)} color={neu.amber} />
        <Text style={[styles.text, font(500)]} maxFontSizeMultiplier={1.3}>
          {t(`unpaid.${message}`, { name: name || '', defaultValue: DEFAULTS[message] })}
        </Text>
      </View>
      <View style={styles.actions}>
        <PressableScale
          variant="neu"
          neuFill={neu.teal}
          style={styles.button}
          onPress={() => router.push('/(tabs)/payments')}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, font(600)]} maxFontSizeMultiplier={1.2}>
            {t('unpaid.viewPayments', 'Ver mis pagos')}
          </Text>
        </PressableScale>
        {!!onChangeLocation && (
          <PressableScale style={styles.linkButton} onPress={onChangeLocation} accessibilityRole="button">
            <Text style={[styles.linkText, font(600)]} maxFontSizeMultiplier={1.2}>
              {t('unpaid.changeLocation', 'Cambiar de residencial')}
            </Text>
          </PressableScale>
        )}
      </View>
    </View>
  );
}

// Etiqueta corta "Pagos pendientes" para selectores y tarjetas
export function UnpaidBadge({ style }) {
  const { t } = useTranslation();
  const font = useHomeFont();
  return (
    <View style={[styles.badge, style]}>
      <Text style={[styles.badgeText, font(600)]} maxFontSizeMultiplier={1.2} numberOfLines={1}>
        {t('unpaid.badge', 'Pagos pendientes')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: scale(16),
    padding: scale(14),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: neu.amber + '55',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(10),
  },
  text: {
    flex: 1,
    fontSize: scale(14),
    lineHeight: scale(20),
    color: neu.text,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: scale(12),
    marginTop: scale(12),
  },
  button: {
    borderRadius: scale(12),
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
  },
  buttonText: {
    fontSize: scale(14),
    color: neu.onAccent,
  },
  linkButton: {
    paddingVertical: scale(10),
  },
  linkText: {
    fontSize: scale(14),
    color: neu.teal,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: neu.amber + '26',
    borderRadius: scale(8),
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
  },
  badgeText: {
    fontSize: scale(11),
    color: neu.amber,
  },
});
