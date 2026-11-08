// app/billing-info.js
// ISSY - Datos para mis recibos (residente): GET / PUT /accounting/my-billing en la residencial activa.
// Nombre o razón social (vacío o 2–150 letras) y RTN opcional (vacío o 14 números). Mismos mensajes
// que el backend. Solo cambia los recibos que vienen; los que ya existen no cambian.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserLocation } from '../src/context/UserLocationContext';
import { getMyBilling, updateMyBilling } from '../src/services/api';
import ReceiptsHeader from '../src/components/receipts/ReceiptsHeader';
import PressableScale from '../src/components/home/PressableScale';
import { neu, neuSurface, scale, fs, MAX_FONT_SCALE } from '../src/theme/tokens';
import { useHomeFont } from '../src/theme/homeFont';
import { formatRtn, validateBilling, BILLING_NAME_MESSAGE, BILLING_TAX_ID_MESSAGE } from '../src/utils/receipts';

const SESSION_MESSAGE = 'Tu sesión terminó. Vuelve a iniciar sesión.';

export default function BillingInfoScreen() {
  const font = useHomeFont();
  const { selectedLocationId } = useUserLocation();

  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setLoadError(null);
    const result = await getMyBilling(selectedLocationId);
    if (requestId !== requestRef.current) return;
    if (result.success && result.data) {
      setBilling(result.data);
    } else {
      setLoadError(result.sessionExpired
        ? SESSION_MESSAGE
        : (result.status === 403 && result.error) || 'No pudimos cargar tus datos para recibos. Inténtalo de nuevo.');
    }
    setLoading(false);
  }, [selectedLocationId]);

  useEffect(() => {
    setEditing(false);
    setSaved(false);
    load();
  }, [load]);

  const startEditing = () => {
    setName(billing?.billing_name || '');
    setTaxId(billing?.tax_id ? formatRtn(billing.tax_id) : '');
    setErrors({});
    setSaveError(null);
    setSaved(false);
    setEditing(true);
  };

  const handleSave = async () => {
    if (saving) return;
    const check = validateBilling({ billingName: name, taxId });
    setErrors(check.errors);
    setSaveError(null);
    if (!check.ok) return;
    Keyboard.dismiss();
    setSaving(true);
    const result = await updateMyBilling({
      locationId: selectedLocationId,
      billingName: check.value.billingName,
      taxId: check.value.taxId,
    });
    setSaving(false);
    if (result.success && result.data) {
      setBilling(result.data);
      setEditing(false);
      setSaved(true);
      return;
    }
    if (result.status === 400 && result.error === BILLING_NAME_MESSAGE) {
      setErrors({ billingName: BILLING_NAME_MESSAGE });
    } else if (result.status === 400 && result.error === BILLING_TAX_ID_MESSAGE) {
      setErrors({ taxId: BILLING_TAX_ID_MESSAGE });
    } else if (result.sessionExpired) {
      setSaveError(SESSION_MESSAGE);
    } else {
      setSaveError(
        (result.status && result.status < 500 && result.error)
          || 'No pudimos guardar tus datos para recibos. Inténtalo de nuevo.',
      );
    }
  };

  const shownName = billing?.billing_name || billing?.resident_name || '—';
  const shownTax = billing?.tax_id ? formatRtn(billing.tax_id) : 'Sin RTN';

  let body;
  if (loading) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={neu.teal} />
      </View>
    );
  } else if (loadError) {
    body = (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={scale(48)} color={neu.textSoft} />
        <Text style={[styles.message, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{loadError}</Text>
        <PressableScale variant="neu" neuFill={neu.teal} style={styles.smallPrimary} onPress={load}>
          <Text style={[styles.primaryText, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>Reintentar</Text>
        </PressableScale>
      </View>
    );
  } else {
    body = (
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.intro, font(400)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          Así saldrán tus próximos recibos. Los recibos que ya tienes no cambian.
        </Text>

        {saved && (
          <View style={styles.savedNotice} accessibilityLiveRegion="polite">
            <Ionicons name="checkmark-circle" size={scale(24)} color={neu.teal} />
            <Text style={[styles.savedText, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              Listo, guardamos tus datos para recibos.
            </Text>
          </View>
        )}

        {!editing ? (
          <>
            <View style={[styles.card, neuSurface.raised]}>
              <Text style={[styles.label, font(400)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>A nombre de</Text>
              <Text style={[styles.value, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{shownName}</Text>
              <View style={styles.divider} />
              <Text style={[styles.label, font(400)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>RTN</Text>
              <Text style={[styles.value, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{shownTax}</Text>
            </View>
            <PressableScale
              variant="neu"
              neuFill={neu.teal}
              style={styles.primary}
              containerStyle={styles.full}
              onPress={startEditing}
            >
              <Ionicons name="create-outline" size={scale(22)} color={neu.onAccent} />
              <Text style={[styles.primaryText, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>Cambiar datos</Text>
            </PressableScale>
          </>
        ) : (
          <>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                Nombre o razón social
              </Text>
              <TextInput
                style={[styles.input, neuSurface.sunken, errors.billingName && styles.inputError, font(400)]}
                value={name}
                onChangeText={(v) => { setName(v); if (errors.billingName) setErrors((e) => ({ ...e, billingName: null })); }}
                placeholder={billing?.resident_name || 'Tu nombre'}
                placeholderTextColor={neu.textSoft}
                maxLength={200}
                autoCapitalize="words"
                returnKeyType="next"
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                accessibilityLabel="Nombre o razón social"
              />
              <Text style={[styles.hint, font(400)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                Si lo dejas vacío, saldrá el nombre de tu cuenta.
              </Text>
              {!!errors.billingName && (
                <Text style={[styles.error, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{errors.billingName}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                RTN (opcional)
              </Text>
              <TextInput
                style={[styles.input, neuSurface.sunken, errors.taxId && styles.inputError, font(400)]}
                value={taxId}
                onChangeText={(v) => { setTaxId(v); if (errors.taxId) setErrors((e) => ({ ...e, taxId: null })); }}
                placeholder="0801-1990-123456"
                placeholderTextColor={neu.textSoft}
                keyboardType="number-pad"
                maxLength={20}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                accessibilityLabel="RTN, opcional"
              />
              <Text style={[styles.hint, font(400)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                14 números. Puedes escribirlo con o sin guiones.
              </Text>
              {!!errors.taxId && (
                <Text style={[styles.error, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{errors.taxId}</Text>
              )}
            </View>

            {!!saveError && (
              <Text style={[styles.error, styles.saveError, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {saveError}
              </Text>
            )}

            <PressableScale
              variant="neu"
              neuFill={neu.teal}
              style={styles.primary}
              containerStyle={styles.full}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={neu.onAccent} />
              ) : (
                <Text style={[styles.primaryText, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>Guardar</Text>
              )}
            </PressableScale>
            <PressableScale
              variant="neu"
              style={styles.secondary}
              containerStyle={styles.full}
              onPress={() => { setEditing(false); setErrors({}); setSaveError(null); }}
              disabled={saving}
            >
              <Text style={[styles.secondaryText, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>Cancelar</Text>
            </PressableScale>
          </>
        )}
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ReceiptsHeader title="Datos para mis recibos" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: neu.bg },
  flex: { flex: 1 },
  full: { width: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale(24), gap: scale(16) },
  scroll: { paddingHorizontal: scale(16), paddingBottom: scale(40), gap: scale(16) },
  intro: { fontSize: fs(17), lineHeight: fs(24), color: neu.textLabel },
  message: { fontSize: fs(17), color: neu.textLabel, textAlign: 'center' },
  card: { borderRadius: scale(20), padding: scale(20), gap: scale(4) },
  label: { fontSize: fs(14), color: neu.textSoft },
  value: { fontSize: fs(19), fontWeight: '600', color: neu.text },
  divider: { height: 1, backgroundColor: neu.border, marginVertical: scale(12) },
  field: { gap: scale(6) },
  fieldLabel: { fontSize: fs(16), color: neu.text },
  input: {
    minHeight: scale(56),
    borderRadius: scale(16),
    paddingHorizontal: scale(16),
    fontSize: fs(18),
    color: neu.text,
  },
  inputError: { borderWidth: 1.5, borderColor: neu.coral },
  hint: { fontSize: fs(14), color: neu.textSoft },
  error: { fontSize: fs(15), color: neu.coral },
  saveError: { textAlign: 'center' },
  savedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    borderRadius: scale(16),
    padding: scale(14),
    backgroundColor: `${neu.teal}1F`,
  },
  savedText: { flex: 1, fontSize: fs(16), color: neu.text },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
    minHeight: scale(60),
    borderRadius: scale(18),
  },
  smallPrimary: { borderRadius: scale(16), paddingHorizontal: scale(28), minHeight: scale(52), justifyContent: 'center' },
  primaryText: { fontSize: fs(18), fontWeight: '600', color: neu.onAccent },
  secondary: { alignItems: 'center', justifyContent: 'center', minHeight: scale(56), borderRadius: scale(18) },
  secondaryText: { fontSize: fs(17), fontWeight: '600', color: neu.text },
});
