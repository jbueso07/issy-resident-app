// app/receipt-detail.js
// ISSY - Un recibo del residente. Arriba un resumen nativo (GET /accounting/my-receipts/:id);
// el recibo completo es el HTML del backend (un solo diseño), convertido a PDF tamaño carta.
// iPhone: un botón "Ver y compartir PDF" (hoja de compartir con vista previa del documento).
// Android: "Ver recibo" (vista previa de impresión del sistema, con "Guardar como PDF") y "Compartir PDF".
// Se llega desde Mis recibos, desde Pagos → Historial y desde el push de pago con receipt_id.

import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { getMyReceipt, getMyReceiptHtml } from '../src/services/api';
import ReceiptsHeader from '../src/components/receipts/ReceiptsHeader';
import PressableScale from '../src/components/home/PressableScale';
import { neu, neuSurface, scale, fs, MAX_FONT_SCALE } from '../src/theme/tokens';
import { useHomeFont } from '../src/theme/homeFont';
import {
  isInvoice,
  isVoided,
  receiptKindWord,
  receiptStatusLabel,
  formatMoney,
  formatReceiptDate,
  receiptErrorMessage,
  previewReceiptHtml,
  shareReceiptPdf,
} from '../src/utils/receipts';

const IS_IOS = Platform.OS === 'ios';

// Cerrar la vista previa sin imprimir puede rechazar la promesa ("did not complete" / cancel): no es un error
const isPrintDismissed = (error) => /did not complete|cancel/i.test(String(error?.message || ''));

export default function ReceiptDetailScreen() {
  const font = useHomeFont();
  const { id } = useLocalSearchParams();
  const receiptId = Array.isArray(id) ? id[0] : id;

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // { message, retry }
  const [busy, setBusy] = useState(null); // 'view' | 'share' | null
  const htmlRef = useRef(null);

  const load = useCallback(async () => {
    if (!receiptId) {
      setError({ message: 'No encontramos ese recibo.', retry: false });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await getMyReceipt(receiptId);
    if (result.success && result.data?.receipt) {
      setReceipt(result.data.receipt);
    } else {
      setError({
        message: result.success ? 'No encontramos ese recibo.' : receiptErrorMessage(result),
        retry: !result.success && result.status !== 404 && !result.sessionExpired,
      });
    }
    setLoading(false);
  }, [receiptId]);

  useEffect(() => {
    htmlRef.current = null;
    load();
  }, [load]);

  // El HTML se pide una vez y se reutiliza para ver y compartir
  const fetchHtml = async () => {
    if (htmlRef.current) return htmlRef.current;
    const result = await getMyReceiptHtml(receiptId);
    if (!result.success || !result.data) {
      const err = new Error('RECEIPT_HTML_FAILED');
      err.userMessage = receiptErrorMessage(result);
      err.retryable = !result.sessionExpired && result.status !== 404;
      throw err;
    }
    htmlRef.current = result.data;
    return result.data;
  };

  // Errores de la API traen userMessage (404, sesión, red); los de PDF/compartir, el mensaje general
  const showError = (err, retryAction) => {
    const message = err?.userMessage || 'No pudimos preparar el recibo. Inténtalo de nuevo.';
    const buttons = err?.retryable === false
      ? [{ text: 'Entendido' }]
      : [{ text: 'Cancelar', style: 'cancel' }, { text: 'Reintentar', onPress: retryAction }];
    Alert.alert(receiptKindWord(receipt), message, buttons);
  };

  const handleView = async () => {
    if (busy) return;
    setBusy('view');
    try {
      const html = await fetchHtml();
      setBusy(null);
      await previewReceiptHtml(html);
    } catch (err) {
      setBusy(null);
      if (isPrintDismissed(err)) return;
      showError(err, handleView);
    }
  };

  const handleShare = async () => {
    if (busy) return;
    setBusy('share');
    try {
      const html = await fetchHtml();
      await shareReceiptPdf(html, receipt);
    } catch (err) {
      if (err?.message === 'SHARING_UNAVAILABLE') {
        Alert.alert(receiptKindWord(receipt), 'Este teléfono no permite compartir archivos.');
      } else {
        showError(err, handleShare);
      }
    } finally {
      setBusy(null);
    }
  };

  const kind = receiptKindWord(receipt);
  const title = receipt ? kind : 'Recibo';

  let body;
  if (loading) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={neu.teal} />
      </View>
    );
  } else if (error) {
    body = (
      <View style={styles.center}>
        <Ionicons
          name={error.retry ? 'cloud-offline-outline' : 'document-outline'}
          size={scale(52)}
          color={neu.textSoft}
        />
        <Text style={[styles.errorText, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{error.message}</Text>
        {error.retry && (
          <PressableScale variant="neu" neuFill={neu.teal} style={styles.retry} onPress={load}>
            <Text style={[styles.primaryText, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>Reintentar</Text>
          </PressableScale>
        )}
      </View>
    );
  } else if (receipt) {
    const voided = isVoided(receipt);
    const rows = [
      ['Concepto', receipt.concept],
      ['Fecha', formatReceiptDate(receipt.payment_date || receipt.created_at)],
      ['A nombre de', receipt.display_name],
    ].filter(([, value]) => !!value);

    body = (
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.summary, neuSurface.raised]}>
          <View style={styles.summaryTop}>
            <View style={styles.flex}>
              <Text style={[styles.kind, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{kind}</Text>
              <Text style={[styles.number, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {receipt.receipt_number}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: `${voided ? neu.coral : neu.teal}22` }]}>
              <Text
                style={[styles.badgeText, { color: voided ? neu.coral : neu.teal }, font(600)]}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
              >
                {receiptStatusLabel(receipt)}
              </Text>
            </View>
          </View>

          <Text
            style={[styles.total, voided && styles.totalVoided, font(700)]}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
          >
            {formatMoney(receipt.total_amount, receipt.currency)}
          </Text>

          {rows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={[styles.rowLabel, font(400)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{label}</Text>
              <Text style={[styles.rowValue, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{value}</Text>
            </View>
          ))}
        </View>

        {voided && (
          <View style={styles.voidNotice}>
            <Ionicons name="alert-circle" size={scale(24)} color={neu.coral} />
            <View style={styles.flex}>
              <Text style={[styles.voidTitle, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {isInvoice(receipt) ? 'Esta factura fue anulada.' : 'Este recibo fue anulado.'}
              </Text>
              {!!receipt.void_reason && (
                <Text style={[styles.voidReason, font(400)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  Motivo: {receipt.void_reason}
                </Text>
              )}
            </View>
          </View>
        )}

        {IS_IOS ? (
          // iPhone: la vista previa de impresión (printAsync) muestra el recibo cortado; el PDF en la
          // hoja de compartir trae la vista previa del documento y desde ahí se guarda o se comparte.
          <PressableScale
            variant="neu"
            neuFill={neu.teal}
            style={styles.primary}
            containerStyle={styles.buttonContainer}
            onPress={handleShare}
            disabled={!!busy}
            accessibilityLabel="Ver y compartir PDF"
          >
            {busy === 'share' ? (
              <ActivityIndicator color={neu.onAccent} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={scale(24)} color={neu.onAccent} />
                <Text style={[styles.primaryText, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  Ver y compartir PDF
                </Text>
              </>
            )}
          </PressableScale>
        ) : (
          <>
            <PressableScale
              variant="neu"
              neuFill={neu.teal}
              style={styles.primary}
              containerStyle={styles.buttonContainer}
              onPress={handleView}
              disabled={!!busy}
              accessibilityLabel={isInvoice(receipt) ? 'Ver factura' : 'Ver recibo'}
            >
              {busy === 'view' ? (
                <ActivityIndicator color={neu.onAccent} />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={scale(24)} color={neu.onAccent} />
                  <Text style={[styles.primaryText, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    {isInvoice(receipt) ? 'Ver factura' : 'Ver recibo'}
                  </Text>
                </>
              )}
            </PressableScale>

            <PressableScale
              variant="neu"
              style={styles.secondary}
              containerStyle={styles.buttonContainer}
              onPress={handleShare}
              disabled={!!busy}
              accessibilityLabel="Compartir PDF"
            >
              {busy === 'share' ? (
                <ActivityIndicator color={neu.teal} />
              ) : (
                <>
                  <Ionicons name="share-outline" size={scale(24)} color={neu.teal} />
                  <Text style={[styles.secondaryText, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    Compartir PDF
                  </Text>
                </>
              )}
            </PressableScale>
          </>
        )}
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ReceiptsHeader title={title} />
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: neu.bg },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale(24), gap: scale(16) },
  scroll: { paddingHorizontal: scale(16), paddingBottom: scale(40), gap: scale(16) },
  summary: { borderRadius: scale(20), padding: scale(20), gap: scale(12) },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', gap: scale(12) },
  kind: { fontSize: fs(16), color: neu.textLabel },
  number: { fontSize: fs(20), fontWeight: '600', color: neu.text },
  badge: { borderRadius: scale(10), paddingHorizontal: scale(12), paddingVertical: scale(5) },
  badgeText: { fontSize: fs(15), fontWeight: '600' },
  total: { fontSize: fs(32), fontWeight: '700', color: neu.text },
  totalVoided: { textDecorationLine: 'line-through', color: neu.textSoft },
  row: { gap: scale(2) },
  rowLabel: { fontSize: fs(14), color: neu.textSoft },
  rowValue: { fontSize: fs(17), color: neu.text },
  voidNotice: {
    flexDirection: 'row',
    gap: scale(12),
    borderRadius: scale(16),
    padding: scale(16),
    backgroundColor: `${neu.coral}1F`,
    borderWidth: 1,
    borderColor: `${neu.coral}55`,
  },
  voidTitle: { fontSize: fs(17), fontWeight: '600', color: neu.coral },
  voidReason: { fontSize: fs(16), color: neu.textLabel, marginTop: scale(4) },
  buttonContainer: { width: '100%' },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
    minHeight: scale(60),
    borderRadius: scale(18),
  },
  primaryText: { fontSize: fs(18), fontWeight: '600', color: neu.onAccent },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
    minHeight: scale(60),
    borderRadius: scale(18),
  },
  secondaryText: { fontSize: fs(18), fontWeight: '600', color: neu.teal },
  errorText: { fontSize: fs(17), color: neu.textLabel, textAlign: 'center' },
  retry: { borderRadius: scale(16), paddingHorizontal: scale(28), minHeight: scale(52), justifyContent: 'center' },
});
