// src/components/ReceivedQRPass.js
// ISSY - Pase de un QR recibido dentro de la app (diseño L1).
// Regla: el pase no escala con la letra del teléfono (allowFontScaling={false} y QR de tamaño fijo);
// si la letra crece, el QR se achica y el lector de la garita no lo lee.
// TODO build: subir brillo al abrir el pase (expo-brightness es nativo; va con la build nueva).

import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useTranslation } from '../hooks/useTranslation';
import PressableScale from './home/PressableScale';
import { openInMaps } from './IncidentLocation';
import { colors, gradients, radius, spacing, scale } from '../theme/tokens';
import {
  getPassStatus,
  getStatusText,
  getActivationText,
  getScheduleParts,
  getDestination,
  dayLetters,
  WEEK_ORDER,
} from '../utils/receivedQR';

// TODO build: guardado directo en Fotos con expo-media-library, probado en la build nueva.

const QR_SIZE = 220;
const STATUS_COLORS = { active: colors.lime, scheduled: colors.amber, used: colors.textSecondary, expired: colors.textMuted };
const TYPE_COLORS = { single: colors.coral, frequent: colors.lime, temporary: colors.purple, event: colors.amber };

function PassContent({ qr, onClose, userLocations }) {
  const { t, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const cardRef = useRef(null);
  const [now, setNow] = useState(new Date());
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  // "expira en ..." se mantiene al día mientras el pase está abierto
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const status = getPassStatus(qr, now);
  const schedule = getScheduleParts(qr, t, language);
  const destination = getDestination(qr, userLocations, t);
  const typeColor = TYPE_COLORS[qr.qr_type] || colors.cyan;
  const houseText = destination.house
    ? t('home2.receivedQR.house', { n: destination.house, defaultValue: 'Casa {{n}}' })
    : null;
  const showDays = (qr.qr_type === 'frequent' || qr.qr_type === 'temporary') && schedule.days.length > 0;
  const letters = dayLetters(language);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(qr.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying manual code:', error);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      // Menú de compartir en iOS y Android: ofrece "Guardar imagen" sin pedir permiso de Fotos
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          UTI: 'public.png',
          dialogTitle: t('home2.receivedQR.saveImage'),
        });
      }
    } catch (error) {
      console.error('Error saving pass image:', error);
      Alert.alert(t('home2.receivedQR.saveError', 'No se pudo guardar la imagen'));
    } finally {
      setSaving(false);
    }
  };

  const boxes = [
    { key: 'date', label: t('home2.receivedQR.boxDate', 'Fecha'), value: schedule.date },
    { key: 'hours', label: t('home2.receivedQR.boxHours', 'Horario'), value: schedule.hours },
    { key: 'invites', label: t('home2.receivedQR.boxInvites', 'Te invita'), value: qr.creator?.name },
    { key: 'destination', label: t('home2.receivedQR.boxDestination', 'Destino'), value: houseText || destination.name },
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <PressableScale
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={8}
          accessibilityLabel={t('common.close')}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + scale(spacing.xl) }]}>
        {/* Todo lo de esta tarjeta sale en "Guardar imagen" */}
        <View ref={cardRef} collapsable={false} style={styles.card}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
            <View style={styles.headerTop}>
              <Text allowFontScaling={false} style={styles.headerTitle}>
                {t('home2.receivedQR.title', 'Acceso de visita')}
              </Text>
              <View style={styles.headerChip}>
                <Text allowFontScaling={false} style={styles.headerChipText}>
                  {t(`home2.receivedQR.types.${qr.qr_type}`, qr.qr_type)}
                </Text>
              </View>
            </View>
            <Text allowFontScaling={false} style={styles.residence} numberOfLines={2}>
              {destination.name}
            </Text>
            {!!houseText && (
              <Text allowFontScaling={false} style={styles.house}>
                {houseText}
              </Text>
            )}
          </LinearGradient>

          <View style={styles.body}>
            <Text allowFontScaling={false} style={styles.label}>
              {t('home2.receivedQR.registeredAs', 'Registrado como')}
            </Text>
            <Text allowFontScaling={false} style={styles.visitor} numberOfLines={2}>
              {qr.visitor_name}
            </Text>

            <View style={styles.qrBox}>
              {status === 'active' ? (
                <QRCode value={qr.qr_code} size={QR_SIZE} backgroundColor="#FFFFFF" color="#000000" />
              ) : (
                // Tapado: no se dibuja el QR para que no se pueda leer antes de tiempo ni vencido
                <View style={styles.qrCovered}>
                  <Ionicons
                    name={status === 'scheduled' ? 'time-outline' : status === 'used' ? 'checkmark-done-outline' : 'close-circle-outline'}
                    size={44}
                    color={colors.textDark}
                  />
                  <Text allowFontScaling={false} style={styles.qrCoveredText}>
                    {status === 'scheduled'
                      ? getActivationText(qr, t, language)
                      : status === 'used'
                        ? t('home2.receivedQR.status.used', 'Usado')
                        : t('home2.receivedQR.expiredPass', 'Pase vencido')}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.codeRow}>
              <View style={styles.codeText}>
                <Text allowFontScaling={false} style={styles.label}>
                  {t('home2.receivedQR.manualCode', 'Código manual')}
                </Text>
                <Text allowFontScaling={false} style={styles.code} selectable>
                  {qr.qr_code}
                </Text>
              </View>
              <PressableScale style={styles.copyButton} onPress={handleCopy} accessibilityLabel={t('home2.receivedQR.copy')}>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={colors.cyan} />
                <Text allowFontScaling={false} style={styles.copyText}>
                  {copied ? t('home2.receivedQR.copied', 'Copiado') : t('home2.receivedQR.copy', 'Copiar')}
                </Text>
              </PressableScale>
            </View>

            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
              <Text allowFontScaling={false} style={styles.statusText}>
                {getStatusText(qr, t, language, now)}
              </Text>
            </View>

            <View style={styles.boxes}>
              {boxes.map((box) => (
                <View key={box.key} style={styles.box}>
                  <Text allowFontScaling={false} style={styles.boxLabel}>
                    {box.label}
                  </Text>
                  <Text allowFontScaling={false} style={styles.boxValue} numberOfLines={2}>
                    {box.value || '—'}
                  </Text>
                </View>
              ))}
            </View>

            {showDays && (
              <View style={styles.daysBlock}>
                <Text allowFontScaling={false} style={styles.label}>
                  {t('home2.receivedQR.accessDays', 'Días de acceso')}
                </Text>
                <View style={styles.days}>
                  {WEEK_ORDER.map((day, index) => {
                    const on = schedule.days.includes(day);
                    return (
                      <View key={day} style={[styles.day, on && styles.dayOn]}>
                        <Text allowFontScaling={false} style={[styles.dayText, on && styles.dayTextOn]}>
                          {letters[index]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.gateNotice}>
              <Ionicons name="shield-checkmark-outline" size={16} color={typeColor} />
              <Text allowFontScaling={false} style={styles.gateText}>
                {t('home2.receivedQR.showAtGate', 'Muéstralo en la garita.')}
              </Text>
            </View>

            <Text allowFontScaling={false} style={styles.footer}>
              powered by issy · joinissy.com
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          {status === 'active' && (
            <PressableScale containerStyle={styles.actionFlex} style={styles.actionButton} onPress={handleSave} disabled={saving}>
              <Ionicons name="download-outline" size={18} color={colors.textDark} />
              <Text allowFontScaling={false} style={styles.actionText}>
                {t('home2.receivedQR.saveImage', 'Guardar imagen')}
              </Text>
            </PressableScale>
          )}
          {/* Sin coordenadas de la residencial no hay botón */}
          {destination.coordinates && (
            <PressableScale
              containerStyle={styles.actionFlex}
              style={[styles.actionButton, styles.actionSecondary]}
              onPress={() => openInMaps(destination.coordinates, destination.name)}
            >
              <Ionicons name="navigate-outline" size={18} color={colors.cyan} />
              <Text allowFontScaling={false} style={[styles.actionText, styles.actionTextSecondary]}>
                {t('home2.receivedQR.directions', 'Cómo llegar')}
              </Text>
            </PressableScale>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export default function ReceivedQRPass({ qr, visible, onClose, userLocations }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      {/* Provider propio: dentro de un Modal los insets no llegan del provider de la app */}
      <SafeAreaProvider>
        {qr && <PassContent qr={qr} onClose={onClose} userLocations={userLocations} />}
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: scale(spacing.lg),
    paddingVertical: scale(spacing.sm),
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: scale(spacing.lg),
  },
  card: {
    borderRadius: scale(radius.xl),
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  header: {
    padding: scale(spacing.lg),
    gap: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textDarkSecondary,
  },
  headerChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.textDark,
  },
  headerChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.lime,
  },
  residence: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textDark,
  },
  house: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDarkSecondary,
  },
  body: {
    padding: scale(spacing.lg),
    gap: scale(spacing.md),
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  visitor: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: -scale(spacing.sm),
  },
  qrBox: {
    alignSelf: 'center',
    padding: 16,
    borderRadius: scale(radius.lg),
    backgroundColor: '#FFFFFF',
  },
  qrCovered: {
    width: QR_SIZE,
    height: QR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: scale(radius.md),
    backgroundColor: '#E8EEF0',
  },
  qrCoveredText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDark,
    textAlign: 'center',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(spacing.md),
    padding: scale(spacing.md),
    borderRadius: scale(radius.md),
    backgroundColor: colors.well,
  },
  codeText: {
    flex: 1,
  },
  code: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.cyan,
  },
  copyText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.cyan,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  boxes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(spacing.sm),
  },
  box: {
    width: '48%',
    flexGrow: 1,
    padding: scale(spacing.md),
    borderRadius: scale(radius.md),
    backgroundColor: colors.well,
    gap: 2,
  },
  boxLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  boxValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  daysBlock: {
    gap: scale(spacing.sm),
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.well,
  },
  dayOn: {
    backgroundColor: colors.lime,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  dayTextOn: {
    color: colors.textDark,
  },
  gateNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: scale(spacing.md),
    borderRadius: scale(radius.md),
    borderWidth: 1,
    borderColor: colors.border,
  },
  gateText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  footer: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: scale(spacing.sm),
    marginTop: scale(spacing.lg),
  },
  actionFlex: {
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: scale(radius.md),
    backgroundColor: colors.cyan,
  },
  actionSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.cyan,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDark,
  },
  actionTextSecondary: {
    color: colors.cyan,
  },
});
