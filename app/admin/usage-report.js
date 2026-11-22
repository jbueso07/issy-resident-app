// app/admin/usage-report.js
// ISSY - Admin: Reporte de uso del control de acceso en PDF.
// GET /admin/reports/usage?location_id={residencial elegida aquí}&from&to&names&format=html (el backend
// arma el HTML y decide el permiso); aquí se elige residencial y período, se convierte a PDF carta y se comparte.
// Solo admin o superadmin (misma regla que el panel de Administración del home).
// Residenciales para elegir (mismas fuentes que app/admin/community-map.js):
//   - superadmin: GET /locations (todas; se quitan las dadas de baja)
//   - admin: profile.user_locations (GET /auth/me, solo membresías activas) con rol admin
// La elección vive solo en esta pantalla: no cambia la residencial activa del app ni se guarda.

import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator, Platform, Modal, FlatList, TextInput, Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../src/context/AuthContext';
import { useTranslation } from '../../src/hooks/useTranslation';
import { authFetch, getUsageReportHtml } from '../../src/services/api';
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
const SEARCH_AFTER = 8;

const byName = (a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
const fold = (text) => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Membresías admin activas del perfil → [{ id, name }] sin repetidos
const adminLocationsFromProfile = (profile) => {
  const map = new Map();
  (profile?.user_locations || [])
    // /auth/me ya filtra status 'active' y no manda is_active: solo se excluye un false explícito
    .filter((ul) => ul.location_id && ul.is_active !== false && ['admin', 'superadmin'].includes(ul.role))
    .forEach((ul) => {
      if (!map.has(ul.location_id)) {
        map.set(ul.location_id, { id: ul.location_id, name: ul.name || ul.location_name || ul.location?.name || '' });
      }
    });
  return [...map.values()].sort(byName);
};

export default function UsageReportScreen() {
  const router = useRouter();
  const font = useHomeFont();
  const { t, language } = useTranslation();
  const { profile, user } = useAuth();

  // Misma regla de admin que el panel de Administración
  const userRole = profile?.role || user?.role || 'user';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);
  const isSuperAdmin = userRole === 'superadmin';
  const activeLocationId = profile?.location_id || null;

  // Residenciales que se pueden elegir aquí y la elegida (solo estado de esta pantalla)
  const [options, setOptions] = useState(isSuperAdmin ? null : () => adminLocationsFromProfile(profile));
  const [optionsError, setOptionsError] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const initialPickRef = useRef(false);

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

  // Superadmin: todas las residenciales activas (GET /locations). Admin: sus membresías admin del perfil.
  const loadSuperAdminLocations = async () => {
    setOptionsError(false);
    setOptions(null);
    try {
      const data = await authFetch('/locations', { method: 'GET' });
      const list = Array.isArray(data) ? data : data?.data || [];
      const mapped = (Array.isArray(list) ? list : [])
        .filter((l) => l?.id && l.is_active !== false)
        .map((l) => ({ id: l.id, name: l.name || '' }))
        .sort(byName);
      if (mountedRef.current) setOptions(mapped);
    } catch (err) {
      console.error('[usageReport] no se pudieron cargar las residenciales:', err?.status || err?.message);
      if (mountedRef.current) {
        setOptions([]);
        setOptionsError(true);
      }
    }
  };

  useEffect(() => {
    if (isSuperAdmin) loadSuperAdminLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isAdmin && !isSuperAdmin) setOptions(adminLocationsFromProfile(profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isSuperAdmin, profile?.user_locations]);

  // Valor inicial (una sola vez): la residencial activa del app si está en la lista; si no, ninguna
  useEffect(() => {
    if (initialPickRef.current || !options) return;
    initialPickRef.current = true;
    if (activeLocationId && options.some((o) => o.id === activeLocationId)) setSelectedId(activeLocationId);
  }, [options, activeLocationId]);

  // Si la elegida deja de estar en la lista (p. ej. el perfil se recargó), se quita
  useEffect(() => {
    if (selectedId && options && !options.some((o) => o.id === selectedId)) setSelectedId(null);
  }, [options, selectedId]);

  const selected = (options || []).find((o) => o.id === selectedId) || null;
  const locationId = selected?.id || null;
  const locationName = selected?.name || '';

  const filtered = (() => {
    const list = options || [];
    const q = fold(query.trim());
    return q ? list.filter((o) => fold(o.name).includes(q)) : list;
  })();

  const chooseLocation = (id) => {
    setSelectedId(id);
    setError(null);
    setPickerOpen(false);
    setQuery('');
  };

  const openPicker = () => {
    if (busy || !options || options.length < 2) return;
    setQuery('');
    setPickerOpen(true);
  };

  const today = hondurasToday();
  const check = validateRange(from, to);
  const canGenerate = check.ok && !!locationId;
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

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {header}
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={scale(48)} color={neu.textSoft} />
          <Text style={[styles.centerText, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {t('usageReport.noAccess')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Fila de la residencial: nombre fijo con una sola opción; con varias, se toca y abre la lista
  let locationRow;
  if (!options) {
    locationRow = (
      <View style={styles.location}>
        <ActivityIndicator color={neu.teal} />
        <Text style={[styles.locationHint, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{t('usageReport.loadingLocations')}</Text>
      </View>
    );
  } else if (optionsError) {
    locationRow = (
      <View style={styles.location}>
        <Ionicons name="cloud-offline-outline" size={scale(20)} color={neu.coral} />
        <Text style={[styles.locationHint, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{t('usageReport.locationsError')}</Text>
        <PressableScale variant="neu" neuSmall style={styles.retry} onPress={loadSuperAdminLocations}>
          <Text style={[styles.retryText, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{t('usageReport.retry')}</Text>
        </PressableScale>
      </View>
    );
  } else if (options.length === 0) {
    locationRow = (
      <View style={styles.location}>
        <Ionicons name="business-outline" size={scale(20)} color={neu.textSoft} />
        <Text style={[styles.locationHint, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{t('usageReport.noAdminLocations')}</Text>
      </View>
    );
  } else if (options.length === 1 && selected) {
    locationRow = (
      <View style={styles.location}>
        <Ionicons name="business-outline" size={scale(20)} color={neu.teal} />
        <Text style={[styles.locationName, font(600)]} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {locationName || t('home.myCommunity', 'Mi comunidad')}
        </Text>
      </View>
    );
  } else {
    const single = options.length === 1;
    locationRow = (
      <PressableScale
        variant="neu"
        neuSmall
        style={styles.locationPicker}
        onPress={single ? () => chooseLocation(options[0].id) : openPicker}
        disabled={busy}
        accessibilityLabel={`${t('usageReport.location')}: ${selected ? locationName : t('usageReport.chooseLocation')}`}
        accessibilityHint={single ? undefined : t('usageReport.changeLocation')}
      >
        <Ionicons name="business-outline" size={scale(20)} color={selected ? neu.teal : neu.amber} />
        <Text
          style={[styles.locationName, !selected && styles.locationPlaceholder, font(600)]}
          numberOfLines={2}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
        >
          {selected ? (locationName || t('home.myCommunity', 'Mi comunidad')) : t('usageReport.chooseLocation')}
        </Text>
        {!single && <Ionicons name="chevron-down" size={scale(20)} color={busy ? neu.textSoft : neu.text} />}
      </PressableScale>
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
        {locationRow}
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
          neuFill={busy || !canGenerate ? neu.sunken : neu.teal}
          style={styles.generate}
          onPress={generate}
          disabled={busy || !canGenerate}
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
              <Ionicons name="document-text-outline" size={scale(20)} color={canGenerate ? neu.onAccent : neu.textSoft} />
              <Text
                style={[styles.generateText, !canGenerate && styles.generateTextBusy, font(600)]}
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

      <Modal
        visible={pickerOpen && !busy}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <KeyboardAvoidingView style={styles.sheetOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setPickerOpen(false)} accessibilityLabel={t('common.close', 'Cerrar')} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">
                {t('usageReport.location')}
              </Text>
              <PressableScale
                variant="neu"
                neuSmall
                style={styles.sheetClose}
                onPress={() => setPickerOpen(false)}
                hitSlop={8}
                accessibilityLabel={t('common.close', 'Cerrar')}
              >
                <Ionicons name="close" size={scale(22)} color={neu.text} />
              </PressableScale>
            </View>
            {(options || []).length > SEARCH_AFTER && (
              <View style={[styles.search, neuSurface.sunkenSm]}>
                <Ionicons name="search" size={scale(18)} color={neu.textSoft} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t('usageReport.searchLocation')}
                  placeholderTextColor={neu.textSoft}
                  style={[styles.searchInput, font(400)]}
                  autoCorrect={false}
                  autoCapitalize="none"
                  clearButtonMode="while-editing"
                  returnKeyType="search"
                  maxFontSizeMultiplier={MAX_FONT_SCALE}
                />
              </View>
            )}
            <FlatList
              data={filtered}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sheetList}
              renderItem={({ item }) => {
                const active = item.id === selectedId;
                return (
                  <Pressable
                    style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && styles.optionPressed]}
                    onPress={() => chooseLocation(item.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[styles.optionText, active && styles.optionTextActive, font(active ? 600 : 500)]}
                      numberOfLines={2}
                      maxFontSizeMultiplier={MAX_FONT_SCALE}
                    >
                      {item.name || t('home.myCommunity', 'Mi comunidad')}
                    </Text>
                    {active && <Ionicons name="checkmark" size={scale(20)} color={neu.teal} />}
                  </Pressable>
                );
              }}
              ListEmptyComponent={(
                <Text style={[styles.sheetEmpty, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {t('usageReport.noLocationMatch')}
                </Text>
              )}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  locationPlaceholder: { color: neu.amber },
  locationHint: { flex: 1, fontSize: fs(15), color: neu.textLabel },
  locationPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    borderRadius: scale(16),
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    minHeight: scale(52),
  },
  retry: { borderRadius: scale(12), paddingHorizontal: scale(14), minHeight: scale(40), justifyContent: 'center' },
  retryText: { fontSize: fs(15), fontWeight: '600', color: neu.teal },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: neu.overlay },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: neu.bg,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    paddingTop: scale(16),
    paddingHorizontal: scale(16),
    maxHeight: '80%',
    gap: scale(12),
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  sheetTitle: { flex: 1, fontSize: fs(20), fontWeight: '600', color: neu.text },
  sheetClose: { width: scale(40), height: scale(40), borderRadius: scale(20), alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: scale(8), borderRadius: scale(14), paddingHorizontal: scale(12), minHeight: scale(46) },
  searchInput: { flex: 1, fontSize: fs(16), color: neu.text, paddingVertical: scale(8) },
  sheetList: { paddingBottom: scale(40) },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingHorizontal: scale(14),
    minHeight: scale(52),
    borderRadius: scale(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neu.border,
  },
  optionActive: { backgroundColor: neu.raised },
  optionPressed: { backgroundColor: neu.sunken },
  optionText: { flex: 1, fontSize: fs(16), color: neu.textLabel, paddingVertical: scale(10) },
  optionTextActive: { color: neu.text },
  sheetEmpty: { fontSize: fs(15), color: neu.textSoft, textAlign: 'center', paddingVertical: scale(24) },
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
