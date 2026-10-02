// src/components/IncidentLocation.js
// Ubicación de un incidente (GPS opcional + referencia escrita opcional).
// Usado en app/admin/incidents.js (modal de detalle) y app/incident-detail.js.
// Sin dependencias nuevas: abre la app de mapas con Linking (RN core) → OTA.
//
// coordinates puede llegar como objeto { latitude, longitude } o, en
// incidentes viejos, como string JSON (antes se guardaba con JSON.stringify).

import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const COLORS = {
  card: '#1A2C2C',
  border: 'rgba(255,255,255,0.1)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  teal: '#5DDED8',
  lime: '#D4FE48',
  amber: '#F59E0B',
};

const toNumber = (v) => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v);
  return NaN;
};

// Objeto o string JSON → { latitude, longitude } válido o null
export const parseCoordinates = (value) => {
  let obj = value;
  for (let i = 0; i < 2 && typeof obj === 'string'; i += 1) {
    try {
      obj = JSON.parse(obj);
    } catch (e) {
      return null;
    }
  }
  if (!obj || typeof obj !== 'object') return null;
  const latitude = toNumber(obj.latitude ?? obj.lat);
  const longitude = toNumber(obj.longitude ?? obj.lng ?? obj.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
};

const openInMaps = async ({ latitude, longitude }, label) => {
  const lat = latitude;
  const lng = longitude;
  const q = encodeURIComponent(label);
  const nativeUrl =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?ll=${lat},${lng}&q=${q}`
      : `geo:${lat},${lng}?q=${lat},${lng}(${q})`;
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  try {
    if (await Linking.canOpenURL(nativeUrl)) {
      await Linking.openURL(nativeUrl);
      return;
    }
  } catch (e) {
    // sigue al respaldo web
  }
  try {
    await Linking.openURL(webUrl);
  } catch (e) {
    console.error('[IncidentLocation] no se pudo abrir mapas:', e);
  }
};

export default function IncidentLocation({ coordinates, description }) {
  const { t } = useTranslation();
  const coords = parseCoordinates(coordinates);
  const reference = typeof description === 'string' ? description.trim() : '';

  // Faltan ambos: aviso visible (no error)
  if (!coords && !reference) {
    return (
      <View style={[styles.card, styles.notice]}>
        <Ionicons name="information-circle-outline" size={18} color={COLORS.amber} />
        <Text style={styles.noticeText}>{t('incidentDetail.location.missing')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {!!reference && (
        <View style={styles.row}>
          <Ionicons name="location" size={18} color={COLORS.teal} />
          <Text style={styles.reference}>{reference}</Text>
        </View>
      )}

      {coords ? (
        <TouchableOpacity
          style={[styles.mapButton, !!reference && { marginTop: scale(10) }]}
          onPress={() => openInMaps(coords, t('incidentDetail.location.mapLabel'))}
          accessibilityRole="button"
          accessibilityLabel={t('incidentDetail.location.viewInMaps')}
        >
          <Ionicons name="map-outline" size={18} color={COLORS.lime} />
          <Text style={styles.mapButtonText}>{t('incidentDetail.location.viewInMaps')}</Text>
          <Text style={styles.coordsText}>
            {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.noGps}>{t('incidentDetail.location.noGps')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: scale(14),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(8),
  },
  reference: {
    flex: 1,
    fontSize: scale(14),
    lineHeight: scale(20),
    color: COLORS.textPrimary,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: COLORS.lime + '66',
    minHeight: 44,
  },
  mapButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.lime,
  },
  coordsText: {
    flex: 1,
    textAlign: 'right',
    fontSize: scale(11),
    color: COLORS.textSecondary,
  },
  noGps: {
    marginTop: scale(8),
    fontSize: scale(12),
    color: COLORS.textMuted,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    borderColor: COLORS.amber + '66',
    backgroundColor: COLORS.amber + '14',
  },
  noticeText: {
    flex: 1,
    fontSize: scale(13),
    color: COLORS.amber,
  },
});
