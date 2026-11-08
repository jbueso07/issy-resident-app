// app/receipts.js
// ISSY - Mis recibos (residente): GET /accounting/my-receipts?location_id={residencial activa}.
// Tocar uno abre /receipt-detail. Arriba, acceso a "Datos para mis recibos".

import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUserLocation } from '../src/context/UserLocationContext';
import { getMyReceipts } from '../src/services/api';
import ReceiptsHeader from '../src/components/receipts/ReceiptsHeader';
import PressableScale from '../src/components/home/PressableScale';
import { neu, scale, fs, MAX_FONT_SCALE } from '../src/theme/tokens';
import { useHomeFont } from '../src/theme/homeFont';
import {
  receiptTitle,
  receiptStatusLabel,
  isVoided,
  formatMoney,
  formatReceiptDate,
} from '../src/utils/receipts';

export default function ReceiptsScreen() {
  const router = useRouter();
  const font = useHomeFont();
  const { selectedLocationId } = useUserLocation();

  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    const result = await getMyReceipts(selectedLocationId);
    if (requestId !== requestRef.current) return;
    if (result.success) {
      setReceipts(result.data);
      setError(null);
    } else {
      setError(result.sessionExpired
        ? 'Tu sesión terminó. Vuelve a iniciar sesión para ver tus recibos.'
        : 'No pudimos cargar tus recibos. Inténtalo de nuevo.');
    }
    setLoading(false);
    setRefreshing(false);
  }, [selectedLocationId]);

  useEffect(() => {
    setLoading(true);
    setReceipts([]);
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderItem = ({ item }) => {
    const voided = isVoided(item);
    return (
      <PressableScale
        variant="neu"
        style={styles.card}
        containerStyle={styles.cardContainer}
        onPress={() => router.push({ pathname: '/receipt-detail', params: { id: String(item.id) } })}
        accessibilityLabel={`${receiptTitle(item)}, ${formatMoney(item.total_amount, item.currency)}, ${receiptStatusLabel(item)}`}
      >
        <View style={styles.cardTop}>
          <Text style={[styles.cardTitle, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {receiptTitle(item)}
          </Text>
          <View style={[styles.badge, { backgroundColor: `${voided ? neu.coral : neu.teal}22` }]}>
            <Text
              style={[styles.badgeText, { color: voided ? neu.coral : neu.teal }, font(600)]}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
            >
              {receiptStatusLabel(item)}
            </Text>
          </View>
        </View>
        {!!item.concept && (
          <Text style={[styles.concept, font(400)]} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {item.concept}
          </Text>
        )}
        <View style={styles.cardBottom}>
          <Text style={[styles.date, font(400)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {formatReceiptDate(item.payment_date || item.created_at)}
          </Text>
          <Text
            style={[styles.total, voided && styles.totalVoided, font(600)]}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
          >
            {formatMoney(item.total_amount, item.currency)}
          </Text>
        </View>
      </PressableScale>
    );
  };

  const header = (
    <PressableScale
      variant="neu"
      style={styles.billingButton}
      containerStyle={styles.cardContainer}
      onPress={() => router.push('/billing-info')}
    >
      <Ionicons name="id-card-outline" size={scale(24)} color={neu.teal} />
      <Text style={[styles.billingText, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        Datos para mis recibos
      </Text>
      <Ionicons name="chevron-forward" size={scale(20)} color={neu.textSoft} />
    </PressableScale>
  );

  let body;
  if (loading) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={neu.teal} />
      </View>
    );
  } else if (error && receipts.length === 0) {
    body = (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={scale(48)} color={neu.textSoft} />
        <Text style={[styles.emptyText, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{error}</Text>
        <PressableScale variant="neu" neuFill={neu.teal} style={styles.retry} onPress={() => { setLoading(true); load(); }}>
          <Text style={[styles.retryText, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>Reintentar</Text>
        </PressableScale>
      </View>
    );
  } else {
    body = (
      <FlatList
        data={receipts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={neu.teal} />}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={scale(48)} color={neu.textSoft} />
            <Text style={[styles.emptyText, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              Todavía no tienes recibos
            </Text>
          </View>
        )}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ReceiptsHeader title="Mis recibos" />
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: neu.bg },
  list: { paddingHorizontal: scale(16), paddingBottom: scale(40) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale(24), gap: scale(16) },
  cardContainer: { marginBottom: scale(14) },
  card: { borderRadius: scale(18), padding: scale(16), gap: scale(8) },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: scale(8) },
  cardTitle: { flex: 1, fontSize: fs(17), fontWeight: '600', color: neu.text },
  badge: { borderRadius: scale(10), paddingHorizontal: scale(10), paddingVertical: scale(4) },
  badgeText: { fontSize: fs(14), fontWeight: '600' },
  concept: { fontSize: fs(16), color: neu.textLabel },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: scale(8) },
  date: { fontSize: fs(15), color: neu.textSoft, flexShrink: 1 },
  total: { fontSize: fs(18), fontWeight: '600', color: neu.text },
  totalVoided: { textDecorationLine: 'line-through', color: neu.textSoft },
  billingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    borderRadius: scale(18),
    paddingHorizontal: scale(16),
    minHeight: scale(60),
  },
  billingText: { flex: 1, fontSize: fs(17), color: neu.text },
  empty: { alignItems: 'center', paddingTop: scale(48), gap: scale(12) },
  emptyText: { fontSize: fs(17), color: neu.textLabel, textAlign: 'center' },
  retry: { borderRadius: scale(16), paddingHorizontal: scale(28), minHeight: scale(52), justifyContent: 'center' },
  retryText: { fontSize: fs(17), fontWeight: '600', color: neu.onAccent },
});
