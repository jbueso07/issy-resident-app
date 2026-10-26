// src/components/MyAccessesTab.js
// ISSY - "Mis accesos": QR que otros residentes me enviaron dentro de la app.
// Cada tarjeta abre el pase (ReceivedQRPass). Datos derivados en src/utils/receivedQR.js.

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../context/AuthContext';
import { getReceivedQRCodes } from '../services/api';
import PressableScale from './home/PressableScale';
import ReceivedQRPass from './ReceivedQRPass';
import { colors, radius, spacing, MAX_FONT_SCALE } from '../theme/tokens';
import { getPassStatus, getScheduleParts, getDestination, TYPE_COLORS } from '../utils/receivedQR';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// Colores del estado vacío (sin cambios)
const COLORS = {
  bgCard: '#1C2E35',
  bgCardAlt: '#243B44',
  lime: '#AAFF00',
  cyan: '#00E5FF',
  teal: '#00BFA6',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  border: 'rgba(255, 255, 255, 0.1)',
};

const STATUS_STYLES = {
  active: { bg: colors.lime, text: colors.textDark },
  scheduled: { bg: colors.amber, text: colors.textDark },
  used: { bg: colors.well, text: colors.textSecondary },
  expired: { bg: colors.well, text: colors.textMuted },
};

const MyAccessesTab = ({ refreshKey }) => {
  const { t, language } = useTranslation();
  const { profile } = useAuth();
  const userLocations = profile?.user_locations || [];
  const [receivedQRs, setReceivedQRs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQR, setSelectedQR] = useState(null);

  const loadReceivedQRs = useCallback(async () => {
    try {
      const result = await getReceivedQRCodes();
      if (result.success) {
        setReceivedQRs(result.data || []);
      }
    } catch (error) {
      console.error('Error loading received QRs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Al abrir la pestaña y cada vez que la pantalla vuelve a tener el foco
  useFocusEffect(
    useCallback(() => {
      loadReceivedQRs();
    }, [loadReceivedQRs])
  );

  // Pull-to-refresh de Visitas: recargar cuando cambie refreshKey (al montar ya carga el foco)
  const refreshKeyRef = useRef(refreshKey);
  useEffect(() => {
    if (refreshKeyRef.current === refreshKey) return;
    refreshKeyRef.current = refreshKey;
    loadReceivedQRs();
  }, [refreshKey, loadReceivedQRs]);

  // Al cerrar el pase: el estado pudo cambiar (usado en la garita, vencido)
  const handleClosePass = () => {
    setSelectedQR(null);
    loadReceivedQRs();
  };

  // Activos y programados primero; usados y vencidos después
  const isPast = (qr) => ['used', 'expired'].includes(getPassStatus(qr));
  const currentQRs = receivedQRs.filter((qr) => !isPast(qr));
  const expiredQRs = receivedQRs.filter(isPast);

  const renderQRCard = (qr) => {
    const status = getPassStatus(qr);
    const statusStyle = STATUS_STYLES[status];
    const typeColor = TYPE_COLORS[qr.qr_type] || colors.cyan;
    const destination = getDestination(qr, userLocations, t);
    const schedule = getScheduleParts(qr, t, language);
    const invitedBy = qr.creator?.name
      ? t('home2.receivedQR.invitedBy', { name: qr.creator.name, defaultValue: 'invita {{name}}' })
      : '';
    const house = destination.house
      ? t('home2.receivedQR.house', { n: destination.house, defaultValue: 'Casa {{n}}' })
      : '';
    // "Casa 12 · invita Ana"; sin casa, "Invita Ana"
    const hostLine = house
      ? [house, invitedBy].filter(Boolean).join(' · ')
      : invitedBy.charAt(0).toUpperCase() + invitedBy.slice(1);

    return (
      <PressableScale
        key={qr.id}
        style={[styles.card, (status === 'expired' || status === 'used') && styles.cardExpired]}
        onPress={() => setSelectedQR(qr)}
        scaleTo={0.98}
        accessibilityLabel={`${destination.name}. ${hostLine}. ${schedule.line}`}
      >
        <View style={styles.chips}>
          <View style={[styles.chip, { backgroundColor: `${typeColor}26` }]}>
            <Text style={[styles.chipText, { color: typeColor }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {t(`home2.receivedQR.types.${qr.qr_type}`, qr.qr_type)}
            </Text>
          </View>
          <View style={[styles.chip, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.chipText, { color: statusStyle.text }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {t(`home2.receivedQR.status.${status}`)}
            </Text>
          </View>
        </View>

        <Text style={styles.residence} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={2}>
          {destination.name}
        </Text>
        {!!hostLine && (
          <Text style={styles.host} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>
            {hostLine}
          </Text>
        )}

        {!!schedule.line && (
          <View style={styles.whenRow}>
            <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
            <Text style={styles.when} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={2}>
              {schedule.line}
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.registered} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>
            {t('home2.receivedQR.registeredAs', 'Registrado como')}{' '}
            <Text style={styles.registeredName}>{qr.visitor_name}</Text>
          </Text>
          <Text style={styles.viewPass} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {t('home2.receivedQR.viewPass', 'Ver pase')} ›
          </Text>
        </View>
      </PressableScale>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.cyan} />
      </View>
    );
  }

  if (receivedQRs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="key-outline" size={scale(48)} color={COLORS.teal} />
        </View>
        <Text style={styles.emptyTitle}>{t('visits.myAccesses.title') || 'Mis Accesos'}</Text>
        <Text style={styles.emptySubtitle}>
          Aquí aparecerán los códigos QR que te envíen dentro de ISSY
        </Text>
        <View style={styles.exampleContainer}>
          <Text style={styles.exampleTitle}>¿Cómo funciona?</Text>
          <View style={styles.featureRow}>
            <Ionicons name="paper-plane-outline" size={scale(18)} color={COLORS.lime} />
            <Text style={styles.featureText}>Alguien te envía un QR desde su app</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="notifications-outline" size={scale(18)} color={COLORS.lime} />
            <Text style={styles.featureText}>Te aparece aquí automáticamente</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="qr-code-outline" size={scale(18)} color={COLORS.lime} />
            <Text style={styles.featureText}>Muestra el QR al guardia o al lector</Text>
          </View>
        </View>
      </View>
    );
  }

  // ============================================
  // LIST VIEW
  // ============================================
  return (
    <View>
      {currentQRs.length > 0 && (
        <>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {t('home2.receivedQR.currentSection', { n: currentQRs.length, defaultValue: 'Accesos activos ({{n}})' })}
          </Text>
          {currentQRs.map(renderQRCard)}
        </>
      )}

      {expiredQRs.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, styles.sectionTitleMuted]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {t('home2.receivedQR.previousSection', { n: expiredQRs.length, defaultValue: 'Anteriores ({{n}})' })}
          </Text>
          {expiredQRs.slice(0, 5).map(renderQRCard)}
        </>
      )}

      <ReceivedQRPass
        qr={selectedQR}
        visible={!!selectedQR}
        onClose={handleClosePass}
        userLocations={userLocations}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(60),
  },
  emptyContainer: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(20),
    padding: scale(24),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: 'rgba(0,191,166,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  emptyTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scale(20),
    marginBottom: scale(24),
  },
  exampleContainer: {
    width: '100%',
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: scale(12),
    padding: scale(16),
  },
  exampleTitle: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: scale(12),
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  featureText: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
    marginLeft: scale(12),
  },

  // Lista
  sectionTitle: {
    fontSize: scale(15),
    fontWeight: '700',
    color: colors.text,
    marginBottom: scale(spacing.md),
  },
  sectionTitleMuted: {
    color: colors.textMuted,
    marginTop: scale(spacing.lg),
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: scale(radius.md),
    borderWidth: 1,
    borderColor: colors.border,
    padding: scale(spacing.lg),
    marginBottom: scale(spacing.md),
    gap: scale(6),
  },
  cardExpired: {
    opacity: 0.55,
  },
  chips: {
    flexDirection: 'row',
    gap: scale(spacing.sm),
    marginBottom: scale(4),
  },
  chip: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: radius.pill,
  },
  chipText: {
    fontSize: scale(11),
    fontWeight: '700',
  },
  residence: {
    fontSize: scale(19),
    fontWeight: '700',
    color: colors.text,
  },
  host: {
    fontSize: scale(13),
    color: colors.textSecondary,
  },
  whenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: scale(4),
  },
  when: {
    flex: 1,
    fontSize: scale(13),
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: scale(spacing.sm),
    marginTop: scale(spacing.sm),
    paddingTop: scale(spacing.sm),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  registered: {
    flex: 1,
    fontSize: scale(12),
    color: colors.textMuted,
  },
  registeredName: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  viewPass: {
    fontSize: scale(13),
    fontWeight: '700',
    color: colors.cyan,
  },
});

export default MyAccessesTab;
