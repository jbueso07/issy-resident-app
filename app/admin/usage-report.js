// app/admin/usage-report.js
// ISSY - Admin: Reporte de uso del control de acceso en PDF.
// GET /admin/reports/usage?location_id={residencial activa}&from&to&names&format=html (el backend arma
// el HTML y decide el permiso); aquí solo se elige el período, se convierte a PDF carta y se comparte.
// Solo admin de la residencial activa o superadmin (misma regla que el panel de Administración del home).

import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../src/context/AuthContext';
import { useTranslation } from '../../src/hooks/useTranslation';
import { getUsageReportHtml } from '../../src/services/api';
import { shareHtmlAsPdf } from '../../src/utils/pdfShare';
import {
  MAX_RANGE_DAYS,
  hondurasToday,
  presetRange,
  validateRange,
  dayToDate,
  dateToDay,
  usageReportFileName,
  usageReportError,
} from '../../src/utils/usageReport';
import PressableScale from '../../src/components/home/PressableScale';
import { neu, neuSurface, scale, fs, MAX_FONT_SCALE } from '../../src/theme/tokens';
import { useHomeFont } from '../../src/theme/homeFont';

const PRESETS = ['last7', 'thisMonth', 'lastMonth'];

export default function UsageReportScreen() {
  const router = useRouter();
  const font = useHomeFont();
  const { t, language } = useTranslation();
  const { profile, user } = useAuth();

  // Residencial activa del app (la del home) y la misma regla de admin que el panel de Administración
  const locationId = profile?.location_id || null;
  const currentLocation = profile?.current_location || profile?.location || null;
  const locationName = currentLocation?.name || '';
  const userRole = profile?.role || user?.role || 'user';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);

  const initial = presetRange('thisMonth');
  const [preset, setPreset] = useState('thisMonth');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [names, setNames] = useState(false);
  const [androidPicker, setAndroidPicker] = useState(null); // 'from' | 'to' | null
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Si cambia la residencial activa, el error anterior ya no aplica
  useEffect(() => { setError(null); }, [locationId]);

  const today = hondurasToday();
  const check = validateRange(from, to);
  const rangeMessage = check.ok ? null : t(`usageReport.errors.${check.key}`, { days: check.days, max: MAX_RANGE_DAYS });

  const locale = language === 'en' ? 'en-US' : language === 'fr' ? 'fr-FR' : language === 'pt' ? 'pt-BR' : 'es-HN';
  const formatDay = (day) => new Date(`${day}T12:00:00Z`).toLocaleDateString(locale, {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  };

  const choosePreset = (key) => {
    if (busy) return;
    const range = presetRange(key);
    setPreset(key);
    setFrom(range.from);
    setTo(range.to);
    setError(null);
  };

  const setDay = (which, day) => {
    setPreset(null);
    setError(null);
    if (which === 'from') setFrom(day);
    else setTo(day);
  };

  const onPickerChange = (which) => (event, date) => {
    if (Platform.OS === 'android') setAndroidPicker(null);
    if (event?.type === 'dismissed' || !date) return;
    setDay(which, dateToDay(date));
  };

  const generate = async () => {
    if (busyRef.current) return;
    const range = validateRange(from, to);
    if (!range.ok || !locationId) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await getUsageReportHtml({ locationId, from, to, names });
      if (!result.success || !result.data) {
        console.error('[usageReport] no se pudo generar, status:', result.status || 'sin respuesta');
        const e = result.success ? { key: 'generic' } : usageReportError(result);
        if (mountedRef.current) setError(e.message || t(`usageReport.errors.${e.key}`));
        return;
      }
      const fileName = usageReportFileName({ header: result.fileName, locationName, from, to });
      console.log('[usageReport] PDF', { from, to, names, kb: Math.round(result.data.length / 1024) });
      await shareHtmlAsPdf(result.data, { fileName, dialogTitle: t('usageReport.share') });
    } catch (err) {
      console.error('[usageReport] error al crear o compartir el PDF:', err?.message);
      if (mountedRef.current) {
        setError(t(err?.message === 'SHARING_UNAVAILABLE' ? 'usageReport.errors.sharing' : 'usageReport.errors.generic'));
      }
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  };

  const header = (
    <View style={styles.header}>
      <PressableScale
        variant="neu"
        neuSmall
        style={styles.back}
        onPress={goBack}
        hitSlop={8}
        accessibilityLabel={t('common.back', 'Regresar')}
      >
        <Ionicons name="chevron-back" size={scale(24)} color={neu.text} />
      </PressableScale>
      <Text style={[styles.title, font(600)]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">
        {t('usageReport.title')}
      </Text>
    </View>
  );

  if (!isAdmin || !locationId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {header}
        <View style={styles.center}>
          <Ionicons name={isAdmin ? 'business-outline' : 'lock-closed-outline'} size={scale(48)} color={neu.textSoft} />
          <Text style={[styles.centerText, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {t(isAdmin ? 'usageReport.noLocation' : 'usageReport.noAccess')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const dateField = (which, value) => {
    const label = t(which === 'from' ? 'usageReport.from' : 'usageReport.to');
    return (
      <View style={styles.dateRow}>
        <Text style={[styles.dateLabel, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{label}</Text>
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={dayToDate(value)}
            mode="date"
            display="compact"
            maximumDate={dayToDate(today)}
            onChange={onPickerChange(which)}
            themeVariant="dark"
            accentColor={neu.teal}
            locale={locale}
            disabled={busy}
            accessibilityLabel={label}
          />
        ) : (
          <PressableScale
            variant="neu"
            neuSmall
            style={styles.dateButton}
            onPress={() => !busy && setAndroidPicker(which)}
            disabled={busy}
            accessibilityLabel={`${label}: ${formatDay(value)}`}
          >
            <Ionicons name="calendar-outline" size={scale(18)} color={neu.teal} />
            <Text style={[styles.dateValue, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{formatDay(value)}</Text>
          </PressableScale>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.location}>
          <Ionicons name="business-outline" size={scale(20)} color={neu.teal} />
          <Text style={[styles.locationName, font(600)]} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {locationName || t('home.myCommunity', 'Mi comunidad')}
          </Text>
        </View>
        <Text style={[styles.intro, font(400)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {t('usageReport.intro')}
        </Text>

        <View style={[styles.card, neuSurface.raised]}>
          <Text style={[styles.cardTitle, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{t('usageReport.period')}</Text>
          <View style={styles.presets}>
            {PRESETS.map((key) => {
              const active = preset === key;
              return (
                <PressableScale
                  key={key}
                  variant="neu"
                  neuSmall
                  neuFill={active ? neu.teal : undefined}
                  containerStyle={styles.presetContainer}
                  style={styles.preset}
                  onPress={() => choosePreset(key)}
                  disabled={busy}
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[styles.presetText, active && styles.presetTextActive, font(active ? 600 : 500)]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    maxFontSizeMultiplier={1.3}
                  >
                    {t(`usageReport.presets.${key}`)}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          {dateField('from', from)}
          {dateField('to', to)}

          {rangeMessage ? (
            <View style={styles.inlineError}>
              <Ionicons name="alert-circle-outline" size={scale(18)} color={neu.coral} />
              <Text style={[styles.inlineErrorText, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{rangeMessage}</Text>
            </View>
          ) : (
            <Text style={[styles.summary, font(400)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {`${formatDay(from)} – ${formatDay(to)} · ${t(check.days === 1 ? 'usageReport.daysOne' : 'usageReport.daysOther', { count: check.days })}`}
            </Text>
          )}
        </View>

        <View style={[styles.card, neuSurface.raised]}>
          <View style={styles.switchRow}>
            <Text style={[styles.cardTitle, styles.switchLabel, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {t('usageReport.names')}
            </Text>
            <Switch
              value={names}
              onValueChange={(v) => { setNames(v); setError(null); }}
              disabled={busy}
              trackColor={{ false: neu.sunken, true: `${neu.teal}4C` }}
              thumbColor={names ? neu.teal : neu.textSoft}
              ios_backgroundColor={neu.sunken}
              accessibilityLabel={t('usageReport.names')}
            />
          </View>
          <Text style={[styles.help, font(400)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{t('usageReport.namesHelp')}</Text>
        </View>

        {!!error && (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle-outline" size={scale(20)} color={neu.coral} />
            <Text style={[styles.errorText, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{error}</Text>
          </View>
        )}

        <PressableScale
          variant="neu"
          neuFill={busy || !check.ok ? neu.sunken : neu.teal}
          style={styles.generate}
          onPress={generate}
          disabled={busy || !check.ok}
          accessibilityLabel={busy ? t('usageReport.generating') : t('usageReport.generate')}
          accessibilityState={{ busy }}
        >
          {busy ? (
            <>
              <ActivityIndicator color={neu.teal} />
              <Text style={[styles.generateText, styles.generateTextBusy, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {t('usageReport.generating')}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="document-text-outline" size={scale(20)} color={check.ok ? neu.onAccent : neu.textSoft} />
              <Text
                style={[styles.generateText, !check.ok && styles.generateTextBusy, font(600)]}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
              >
                {t('usageReport.generate')}
              </Text>
            </>
          )}
        </PressableScale>
        <Text style={[styles.note, font(400)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {t(busy ? 'usageReport.generatingHint' : 'usageReport.note')}
        </Text>
      </ScrollView>

      {Platform.OS === 'android' && androidPicker && (
        <DateTimePicker
          value={dayToDate(androidPicker === 'from' ? from : to)}
          mode="date"
          maximumDate={dayToDate(today)}
          onChange={onPickerChange(androidPicker)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: neu.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    paddingHorizontal: scale(16),
    paddingTop: scale(8),
    paddingBottom: scale(12),
  },
  back: { width: scale(44), height: scale(44), borderRadius: scale(22), alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: fs(22), fontWeight: '600', color: neu.text },
  content: { paddingHorizontal: scale(16), paddingBottom: scale(48), gap: scale(16) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale(32), gap: scale(16) },
  centerText: { fontSize: fs(17), color: neu.textLabel, textAlign: 'center' },
  location: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  locationName: { flex: 1, fontSize: fs(18), fontWeight: '600', color: neu.text },
  intro: { fontSize: fs(15), color: neu.textLabel, lineHeight: fs(21), marginTop: -scale(8) },
  card: { borderRadius: scale(18), padding: scale(16), gap: scale(14) },
  cardTitle: { fontSize: fs(17), fontWeight: '600', color: neu.text },
  presets: { flexDirection: 'row', gap: scale(8) },
  presetContainer: { flex: 1 },
  preset: {
    borderRadius: scale(14),
    minHeight: scale(44),
    paddingHorizontal: scale(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: { fontSize: fs(14), color: neu.textLabel, textAlign: 'center' },
  presetTextActive: { color: neu.onAccent },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: scale(12), minHeight: scale(44) },
  dateLabel: { fontSize: fs(16), color: neu.textLabel },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    minHeight: scale(44),
  },
  dateValue: { fontSize: fs(16), color: neu.text },
  summary: { fontSize: fs(14), color: neu.textSoft },
  inlineError: { flexDirection: 'row', alignItems: 'flex-start', gap: scale(8) },
  inlineErrorText: { flex: 1, fontSize: fs(14), color: neu.coral, lineHeight: fs(20) },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  switchLabel: { flex: 1 },
  help: { fontSize: fs(14), color: neu.textSoft, lineHeight: fs(20), marginTop: -scale(4) },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(10),
    borderRadius: scale(14),
    padding: scale(14),
    backgroundColor: `${neu.coral}1F`,
  },
  errorText: { flex: 1, fontSize: fs(15), color: neu.text, lineHeight: fs(21) },
  generate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
    borderRadius: scale(16),
    minHeight: scale(56),
    paddingHorizontal: scale(20),
  },
  generateText: { fontSize: fs(17), fontWeight: '600', color: neu.onAccent },
  generateTextBusy: { color: neu.textLabel },
  note: { fontSize: fs(13), color: neu.textSoft, textAlign: 'center', lineHeight: fs(19), marginTop: -scale(4) },
});
