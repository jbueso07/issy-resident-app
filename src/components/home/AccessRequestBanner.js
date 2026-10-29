// src/components/home/AccessRequestBanner.js
// ISSY - Aviso en el home: solicitudes de ingreso pendientes de MI casa (Requerir ingreso v2).
// Consulta al enfocar el home y cada 30 s mientras está a la vista; también al llegar el push con la app abierta.
// Tocar la tarjeta abre /access-approval.

import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import PressableScale from './PressableScale';
import { neu, neuSurface, fs, scale, MAX_FONT_SCALE } from '../../theme/tokens';
import { useHomeFont } from '../../theme/homeFont';
import { getMyPendingAccessRequests } from '../../services/api';
import { subscribeAccessRequestEvents } from '../../hooks/useNotifications';

const POLL_MS = 30000;

const pad = (n) => String(n).padStart(2, '0');
const formatCountdown = (seconds) => `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;

export default function AccessRequestBanner({ locationId }) {
  const router = useRouter();
  const font = useHomeFont();
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [now, setNow] = useState(Date.now());
  const focusedRef = useRef(false);

  const fetchPending = useCallback(async () => {
    const res = await getMyPendingAccessRequests({ locationId });
    // Un fallo transitorio no borra el aviso que ya se está mostrando
    if (res.success) setRequests(res.data);
  }, [locationId]);

  // Al enfocar el home y cada 30 s mientras está a la vista
  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      fetchPending();
      const poll = setInterval(fetchPending, POLL_MS);
      return () => {
        focusedRef.current = false;
        clearInterval(poll);
      };
    }, [fetchPending])
  );

  // Push con la app abierta: sin esperar al siguiente ciclo
  useEffect(
    () =>
      subscribeAccessRequestEvents(() => {
        if (focusedRef.current) fetchPending();
      }),
    [fetchPending]
  );

  const hasRequests = requests.length > 0;
  useEffect(() => {
    if (!hasRequests) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [hasRequests]);

  const live = requests
    .map((r) => ({ ...r, remaining: Math.max(0, Math.ceil((new Date(r.expires_at).getTime() - now) / 1000)) }))
    .filter((r) => r.remaining > 0);
  if (live.length === 0) return null;

  const first = live[0];
  const gate = first.gate_name || first.gate?.name || t('accessRequest.theGate', 'la garita');
  const urgent = first.remaining < 60;

  return (
    <View style={styles.wrap}>
      <PressableScale
        variant="neu"
        style={[styles.card, { borderColor: urgent ? neu.coral : neu.teal }]}
        onPress={() => router.push({ pathname: '/access-approval', params: { id: first.id } })}
        accessibilityLabel={t('accessRequest.homeCardA11y', {
          visitor: first.visitor_name,
          gate,
          defaultValue: '{{visitor}} está en {{gate}}. Toca para responder',
        })}
      >
        <View style={[styles.iconWrap, neuSurface.sunkenSm]}>
          <Ionicons name="enter-outline" size={scale(22)} color={urgent ? neu.coral : neu.teal} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={2}>
            {t('accessRequest.homeCardTitle', { visitor: first.visitor_name, gate, defaultValue: '{{visitor}} está en {{gate}}' })}
          </Text>
          <Text style={[styles.subtitle, font(400)]} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>
            {live.length > 1
              ? t('accessRequest.homeCardMore', { others: live.length - 1, defaultValue: 'Toca para responder · +{{others}} más' })
              : t('accessRequest.homeCardCta', 'Toca para responder')}
          </Text>
        </View>
        <Text style={[styles.timer, font(700), { color: urgent ? neu.coral : neu.teal }]} maxFontSizeMultiplier={1.2}>
          {formatCountdown(first.remaining)}
        </Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: scale(20), marginBottom: scale(14) },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    padding: scale(14),
    borderRadius: scale(20),
    backgroundColor: neu.raised,
    borderWidth: 1.5,
  },
  iconWrap: { width: scale(44), height: scale(44), borderRadius: scale(14), alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  title: { fontSize: fs(15), fontWeight: '600', color: neu.text },
  subtitle: { fontSize: fs(12), color: neu.textLabel, marginTop: 2 },
  timer: { fontSize: fs(20), fontWeight: '700', fontVariant: ['tabular-nums'] },
});
