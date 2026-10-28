// app/privacy.js
// ISSY - Perfil → Privacidad: sugerencias de visitas anteriores en "Nuevo QR".
// Las preferencias viven en el teléfono (src/utils/visitorSuggestions.js); no borra ningún QR.

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useTranslation } from '../src/hooks/useTranslation';
import PressableScale from '../src/components/home/PressableScale';
import { colors, radius, spacing, scale, MAX_FONT_SCALE, neu, neuSurface, fs } from '../src/theme/tokens';
import { useHomeFont } from '../src/theme/homeFont';
import {
  loadSuggestionPrefs,
  setSuggestionsEnabled,
  clearAllSuggestions,
} from '../src/utils/visitorSuggestions';

export default function Privacy() {
  const font = useHomeFont();
  const router = useRouter();
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const userId = user?.id || profile?.id;

  const [prefs, setPrefs] = useState(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSuggestionPrefs(userId).then((loaded) => {
      if (!cancelled) setPrefs(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const toggleSuggestions = async (value) => {
    setPrefs((current) => (current ? { ...current, enabled: value } : current));
    setPrefs(await setSuggestionsEnabled(userId, value));
  };

  const confirmClear = () => {
    Alert.alert(
      t('profile.privacy.clearConfirmTitle', '¿Borrar sugerencias de visitas?'),
      t(
        'profile.privacy.clearConfirmMessage',
        'Dejarás de ver como sugerencia a las personas de tus QR anteriores. Las visitas que crees desde ahora sí se sugerirán.'
      ),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.privacy.clearConfirm', 'Borrar'),
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              setPrefs(await clearAllSuggestions(userId));
              Alert.alert(t('profile.privacy.cleared', 'Sugerencias borradas'));
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <PressableScale
            variant="neu"
            neuSmall
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </PressableScale>
          <Text style={[styles.headerTitle, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">
            {t('profile.privacy.title', 'Privacidad')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionTitle, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {t('profile.privacy.visitsSection', 'Visitas')}
          </Text>

          <View style={[styles.card, neuSurface.raised]}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {t('profile.privacy.suggestTitle', 'Sugerir visitas anteriores')}
                </Text>
                <Text style={[styles.rowDesc, font(400)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {t(
                    'profile.privacy.suggestDesc',
                    'Al escribir el nombre de un visitante, te mostramos a quienes ya les creaste un QR.'
                  )}
                </Text>
              </View>
              {prefs ? (
                <Switch
                  value={prefs.enabled}
                  onValueChange={toggleSuggestions}
                  trackColor={{ false: colors.well, true: colors.lime + '50' }}
                  thumbColor={prefs.enabled ? colors.lime : colors.textMuted}
                  accessibilityLabel={t('profile.privacy.suggestTitle', 'Sugerir visitas anteriores')}
                />
              ) : (
                <ActivityIndicator color={colors.textMuted} />
              )}
            </View>

            <View style={styles.divider} />

            <PressableScale
              variant="neu"
              neuSmall
              style={styles.row}
              onPress={confirmClear}
              disabled={clearing || !prefs}
              scaleTo={0.98}
              accessibilityRole="button"
            >
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, styles.danger, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {t('profile.privacy.clearTitle', 'Borrar sugerencias de visitas')}
                </Text>
                <Text style={[styles.rowDesc, font(400)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {t('profile.privacy.clearDesc', 'Empieza de cero con las sugerencias del formulario de QR.')}
                </Text>
              </View>
              {clearing ? (
                <ActivityIndicator color={colors.dangerSoft} />
              ) : (
                <Ionicons name="trash-outline" size={20} color={colors.dangerSoft} />
              )}
            </PressableScale>
          </View>

          <Text style={[styles.note, font(400)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {t('profile.privacy.qrNote', 'Los QR que creaste siguen en Mis QR → Historial. Puedes eliminarlos ahí.')}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(spacing.lg),
    paddingVertical: scale(spacing.md),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: neu.raised,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fs(18),
    fontWeight: '600',
    color: colors.text,
  },
  headerSpacer: {
    width: scale(40),
  },
  content: {
    paddingHorizontal: scale(spacing.lg),
    paddingBottom: scale(spacing.xl * 2),
  },
  sectionTitle: {
    marginTop: scale(spacing.md),
    marginBottom: scale(spacing.sm),
    fontSize: fs(13),
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: scale(radius.lg),
    overflow: 'hidden',
  },
  row: {
    backgroundColor: neu.raised,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(spacing.md),
    paddingHorizontal: scale(spacing.lg),
    paddingVertical: scale(spacing.lg),
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: fs(15),
    fontWeight: '600',
    color: colors.text,
  },
  rowDesc: {
    marginTop: scale(spacing.xs),
    fontSize: fs(13),
    lineHeight: scale(18),
    color: colors.textSecondary,
  },
  danger: {
    color: colors.dangerSoft,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: scale(spacing.lg),
  },
  note: {
    marginTop: scale(spacing.md),
    paddingHorizontal: scale(spacing.xs),
    fontSize: fs(13),
    lineHeight: scale(18),
    color: colors.textMuted,
  },
});
