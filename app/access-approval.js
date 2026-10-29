// app/access-approval.js
// ISSY - Solicitud de ingreso (Requerir ingreso v2): el residente ve las fotos y aprueba o rechaza.
// Llega por: tap en el push (app abierta, en segundo plano o cerrada), botones Aprobar/Rechazar de la
// notificación (action preseleccionada: igual hay que confirmar aquí), o la tarjeta del home.
// Cualquier miembro activo de la casa puede responder; el primero gana (409 para los demás).

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  Vibration,
  Platform,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../src/hooks/useTranslation';
import PressableScale from '../src/components/home/PressableScale';
import { neu, neuSurface, fs, scale, MAX_FONT_SCALE } from '../src/theme/tokens';
import { useHomeFont } from '../src/theme/homeFont';
import { getAccessRequest, respondAccessRequest } from '../src/services/api';
import { subscribeAccessRequestEvents } from '../src/hooks/useNotifications';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_WINDOW_SECONDS = 300;

const pad = (n) => String(n).padStart(2, '0');
const formatCountdown = (seconds) => `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
const topInset = (insets) => Math.max(insets.top, Platform.OS === 'ios' ? 44 : 24);

// Visor a pantalla completa de las fotos (X siempre visible, debajo de la barra de estado)
function PhotoViewer({ photos, startIndex, onClose, closeLabel }) {
  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaProvider>
        <PhotoViewerContent photos={photos} startIndex={startIndex} onClose={onClose} closeLabel={closeLabel} />
      </SafeAreaProvider>
    </Modal>
  );
}

function PhotoViewerContent({ photos, startIndex, onClose, closeLabel }) {
  const insets = useSafeAreaInsets();
  const font = useHomeFont();
  const [index, setIndex] = useState(startIndex);
  const [size, setSize] = useState({ width: SCREEN_WIDTH, height: Dimensions.get('window').height });

  return (
    <View style={styles.viewerRoot} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: startIndex * size.width, y: 0 }}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / size.width))}
      >
        {photos.map((p) => (
          <View key={p.key} style={{ width: size.width, height: size.height, justifyContent: 'center' }}>
            <Image source={{ uri: p.uri }} style={styles.viewerImage} resizeMode="contain" />
          </View>
        ))}
      </ScrollView>

      <View style={[styles.viewerCaption, { bottom: Math.max(insets.bottom, 16) + 8 }]} pointerEvents="none">
        <Text style={[styles.viewerCaptionText, font(600)]} allowFontScaling={false}>
          {photos[index]?.label}
          {photos.length > 1 ? `  ·  ${index + 1}/${photos.length}` : ''}
        </Text>
      </View>

      {/* Posición en containerStyle (capa exterior); se dibuja al final para quedar por encima */}
      <PressableScale
        variant="neu"
        neuSurface="none"
        containerStyle={[styles.viewerCloseWrap, { top: topInset(insets) + 8 }]}
        style={styles.viewerClose}
        onPress={onClose}
        accessibilityLabel={closeLabel}
      >
        <Ionicons name="close" size={24} color="#FFFFFF" />
      </PressableScale>
    </View>
  );
}

export default function AccessApprovalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const font = useHomeFont();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const requestId = Array.isArray(params.id) ? params.id[0] : params.id;
  const preselected = params.action === 'approved' || params.action === 'rejected' ? params.action : null;

  const [phase, setPhase] = useState('loading'); // loading | ready | error
  const [errorKind, setErrorKind] = useState('generic'); // offline | forbidden | notFound | generic
  const [request, setRequest] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [responding, setResponding] = useState(false);
  const [outcome, setOutcome] = useState(null); // approved | rejected (respuesta propia)
  const [rejecting, setRejecting] = useState(preselected === 'rejected');
  const [reason, setReason] = useState('');
  const [conflictMessage, setConflictMessage] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(null);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  }, [router]);

  const load = useCallback(
    async (silent = false) => {
      if (!requestId) {
        setErrorKind('notFound');
        setPhase('error');
        return;
      }
      if (!silent) setPhase('loading');
      const res = await getAccessRequest(requestId);
      if (res.success) {
        setRequest(res.data);
        setPhase('ready');
        return;
      }
      if (silent) return; // una recarga silenciosa que falla no tira la pantalla ya cargada
      setErrorKind(res.offline ? 'offline' : res.status === 403 ? 'forbidden' : res.status === 404 ? 'notFound' : 'generic');
      setPhase('error');
    },
    [requestId]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Si otro miembro de la casa responde mientras esto está abierto
  useEffect(
    () =>
      subscribeAccessRequestEvents((data) => {
        const id = data?.request_id || data?.access_request_id;
        if (data?.type === 'access_request_resolved' && id === requestId) load(true);
      }),
    [requestId, load]
  );

  // Reloj del contador
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const expiresAtMs = request?.expires_at ? new Date(request.expires_at).getTime() : 0;
  const createdAtMs = request?.created_at ? new Date(request.created_at).getTime() : 0;
  const totalSeconds = expiresAtMs && createdAtMs ? Math.max(60, Math.round((expiresAtMs - createdAtMs) / 1000)) : DEFAULT_WINDOW_SECONDS;
  const remaining = expiresAtMs ? Math.max(0, Math.ceil((expiresAtMs - now) / 1000)) : 0;
  const status = request ? (request.status === 'pending' && remaining <= 0 ? 'expired' : request.status) : null;

  const photos = useMemo(() => {
    if (!request) return [];
    const list = [];
    (request.visitor_photos || []).forEach((uri, i) =>
      list.push({ key: `v${i}`, uri, label: t('accessRequest.photoVisitor', 'Visitante') })
    );
    (request.id_photo_urls || []).forEach((uri, i) =>
      list.push({ key: `i${i}`, uri, label: t('accessRequest.photoId', 'Cédula') })
    );
    if (request.plate_photo_url) {
      list.push({ key: 'p0', uri: request.plate_photo_url, label: t('accessRequest.photoPlate', 'Placa') });
    }
    return list;
  }, [request, t]);

  const submit = async (action) => {
    if (responding) return;
    setResponding(true);
    const res = await respondAccessRequest(requestId, action, reason);
    setResponding(false);

    if (res.success) {
      Vibration.vibrate(action === 'approved' ? [0, 150, 50, 150] : 300);
      setOutcome(action);
      return;
    }
    if (res.status === 409) {
      // Otro miembro respondió primero, o venció
      setConflictMessage(res.error || null);
      setRejecting(false);
      load(true);
      return;
    }
    if (res.status === 403) {
      setErrorKind('forbidden');
      setPhase('error');
      return;
    }
    Alert.alert(
      t('common.error'),
      res.offline ? t('accessRequest.offline', 'Sin conexión. Revisa tu internet e intenta de nuevo.') : res.error || t('accessRequest.respondError', 'No se pudo enviar tu respuesta.')
    );
  };

  // ---------- Vistas de estado ----------
  const renderCentered = (iconName, iconColor, title, message, extra) => (
    <View style={styles.centered}>
      <View style={[styles.stateIcon, neuSurface.sunken]}>
        <Ionicons name={iconName} size={scale(44)} color={iconColor} />
      </View>
      <Text style={[styles.stateTitle, font(700)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{title}</Text>
      {!!message && (
        <Text style={[styles.stateMessage, font(400)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{message}</Text>
      )}
      {extra}
      <PressableScale variant="neu" style={styles.doneButton} onPress={goBack}>
        <Text style={[styles.doneButtonText, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {t('accessRequest.done', 'Listo')}
        </Text>
      </PressableScale>
    </View>
  );

  const respondedByName = request?.responded_by?.name;
  const respondedVerb =
    status === 'approved' ? t('accessRequest.verbApproved', 'aprobó') : t('accessRequest.verbRejected', 'rechazó');

  let body;
  if (phase === 'loading') {
    body = (
      <View style={styles.centered}>
        <ActivityIndicator color={neu.teal} size="large" />
      </View>
    );
  } else if (phase === 'error') {
    const map = {
      forbidden: ['lock-closed-outline', t('accessRequest.notYoursTitle', 'Esta solicitud no es de tu casa'), t('accessRequest.notYoursMessage', 'Solo los miembros de la casa pueden verla y responderla.')],
      notFound: ['help-circle-outline', t('accessRequest.notFoundTitle', 'Solicitud no encontrada'), t('accessRequest.notFoundMessage', 'Puede que ya no exista.')],
      offline: ['cloud-offline-outline', t('accessRequest.offlineTitle', 'Sin conexión'), t('accessRequest.offline', 'Sin conexión. Revisa tu internet e intenta de nuevo.')],
      generic: ['alert-circle-outline', t('accessRequest.loadErrorTitle', 'No se pudo cargar'), t('accessRequest.loadError', 'Intenta de nuevo en un momento.')],
    };
    const [icon, title, message] = map[errorKind] || map.generic;
    body = renderCentered(
      icon,
      errorKind === 'forbidden' ? neu.coral : neu.amber,
      title,
      message,
      errorKind === 'offline' || errorKind === 'generic' ? (
        <PressableScale variant="neu" neuFill={neu.teal} style={styles.retryButton} onPress={() => load()}>
          <Text style={[styles.retryText, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {t('accessRequest.retry', 'Reintentar')}
          </Text>
        </PressableScale>
      ) : null
    );
  } else if (outcome) {
    body =
      outcome === 'approved'
        ? renderCentered('checkmark-circle', neu.teal, t('accessRequest.approvedTitle', 'Acceso aprobado'), t('accessRequest.approvedMessage', 'El guardia fue notificado para permitir el ingreso.'))
        : renderCentered('close-circle', neu.coral, t('accessRequest.rejectedTitle', 'Acceso rechazado'), t('accessRequest.rejectedMessage', 'El guardia fue notificado.'));
  } else if (status === 'approved' || status === 'rejected') {
    body = renderCentered(
      status === 'approved' ? 'checkmark-circle-outline' : 'close-circle-outline',
      status === 'approved' ? neu.teal : neu.coral,
      respondedByName
        ? t('accessRequest.answeredBy', { name: respondedByName, action: respondedVerb, defaultValue: 'Ya respondió {{name}}: {{action}}' })
        : t('accessRequest.answeredGeneric', 'Esta solicitud ya fue respondida'),
      conflictMessage && !respondedByName ? conflictMessage : null
    );
  } else if (status === 'expired') {
    body = renderCentered('time-outline', neu.amber, t('accessRequest.expiredTitle', 'Solicitud vencida'), t('accessRequest.expiredMessage', 'Ya pasó el tiempo para responder.'));
  } else if (request) {
    const urgent = remaining < 60;
    const progress = Math.max(0, Math.min(1, remaining / totalSeconds));
    const time = request.created_at
      ? new Date(request.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    const gate = request.gate_name || request.gate?.name;

    body = (
      <>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.metaLine, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {[gate, time].filter(Boolean).join(' · ')}
          </Text>

          {/* Contador */}
          <View style={[styles.countdownCard, neuSurface.sunken]}>
            <Text style={[styles.countdownLabel, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {t('accessRequest.timeLeft', 'Tiempo restante')}
            </Text>
            <Text
              style={[styles.countdownValue, font(700), { color: urgent ? neu.coral : neu.teal }]}
              maxFontSizeMultiplier={1.2}
              accessibilityLabel={formatCountdown(remaining)}
            >
              {formatCountdown(remaining)}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: urgent ? neu.coral : neu.teal }]} />
            </View>
          </View>

          {preselected && !rejecting && (
            <View style={styles.hintBox}>
              <Ionicons name="information-circle-outline" size={18} color={neu.teal} />
              <Text style={[styles.hintText, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {t('accessRequest.hintApprove', 'Revisa las fotos y confirma con un toque.')}
              </Text>
            </View>
          )}
          {!!conflictMessage && (
            <Text style={[styles.conflictText, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{conflictMessage}</Text>
          )}

          {/* Visitante */}
          <View style={[styles.visitorCard, neuSurface.raised]}>
            <Text style={[styles.sectionLabel, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {t('accessRequest.visitor', 'Visitante')}
            </Text>
            <Text style={[styles.visitorName, font(700)]} maxFontSizeMultiplier={1.3}>{request.visitor_name}</Text>
            {!!request.house && (
              <View style={styles.infoRow}>
                <Ionicons name="home-outline" size={16} color={neu.textLabel} />
                <Text style={[styles.infoText, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {t('accessRequest.house', { house: request.house, defaultValue: 'Casa {{house}}' })}
                </Text>
              </View>
            )}
            {!!request.guard_name && (
              <View style={styles.infoRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color={neu.textLabel} />
                <Text style={[styles.infoText, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {t('accessRequest.registeredBy', { name: request.guard_name, defaultValue: 'Registrado por {{name}}' })}
                </Text>
              </View>
            )}
          </View>

          {/* Placa en texto */}
          {!!request.vehicle_plate && (
            <View style={[styles.plateCard, neuSurface.sunken]}>
              <Ionicons name="car-outline" size={20} color={neu.textLabel} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionLabel, font(500)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {t('accessRequest.photoPlate', 'Placa')}
                </Text>
                <Text style={[styles.plateText, font(700)]} maxFontSizeMultiplier={1.3}>{request.vehicle_plate}</Text>
              </View>
            </View>
          )}

          {/* Fotos */}
          <Text style={[styles.sectionTitle, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {t('accessRequest.photos', 'Fotos')}
          </Text>
          {photos.length === 0 ? (
            <Text style={[styles.noPhotos, font(400)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {t('accessRequest.noPhotos', 'El guardia no adjuntó fotos.')}
            </Text>
          ) : (
            <View style={styles.photoGrid}>
              {photos.map((p, i) => (
                <PressableScale
                  key={p.key}
                  variant="neu"
                  containerStyle={styles.photoSlot}
                  style={styles.photoCard}
                  onPress={() => setViewerIndex(i)}
                  accessibilityLabel={`${p.label}. ${t('accessRequest.viewFull', 'Ver completa')}`}
                >
                  <Image source={{ uri: p.uri }} style={styles.photoImage} resizeMode="cover" />
                  <View style={styles.photoLabelRow}>
                    <Text style={[styles.photoLabel, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{p.label}</Text>
                    <Ionicons name="expand-outline" size={14} color={neu.textLabel} />
                  </View>
                </PressableScale>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Acciones */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
            {rejecting ? (
              <>
                <TextInput
                  style={[styles.reasonInput, font(400)]}
                  placeholder={t('accessRequest.reasonPlaceholder', 'Motivo (opcional)')}
                  placeholderTextColor={neu.textSoft}
                  value={reason}
                  onChangeText={setReason}
                  maxLength={200}
                  multiline
                  maxFontSizeMultiplier={MAX_FONT_SCALE}
                />
                <View style={styles.actionRow}>
                  <PressableScale variant="neu" neuSmall containerStyle={styles.actionBack} style={styles.actionButton} onPress={() => setRejecting(false)} disabled={responding}>
                    <Text style={[styles.actionBackText, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{t('accessRequest.back', 'Volver')}</Text>
                  </PressableScale>
                  <PressableScale variant="neu" neuFill={neu.coral} containerStyle={styles.actionMain} style={styles.actionButton} onPress={() => submit('rejected')} disabled={responding}>
                    {responding ? <ActivityIndicator color={neu.onAccent} /> : (
                      <Text style={[styles.actionMainText, font(700)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{t('accessRequest.confirmReject', 'Confirmar rechazo')}</Text>
                    )}
                  </PressableScale>
                </View>
              </>
            ) : (
              <View style={styles.actionRow}>
                <PressableScale variant="neu" neuFill={neu.coral} containerStyle={styles.actionSide} style={styles.actionButton} onPress={() => setRejecting(true)} disabled={responding}>
                  <Ionicons name="close" size={20} color={neu.onAccent} />
                  <Text style={[styles.actionMainText, font(700)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{t('accessRequest.reject', 'Rechazar')}</Text>
                </PressableScale>
                <PressableScale variant="neu" neuFill={neu.teal} containerStyle={styles.actionMain} style={styles.actionButton} onPress={() => submit('approved')} disabled={responding}>
                  {responding ? <ActivityIndicator color={neu.onAccent} /> : (
                    <>
                      <Ionicons name="checkmark" size={22} color={neu.onAccent} />
                      <Text style={[styles.actionMainText, font(700)]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{t('accessRequest.approve', 'Aprobar')}</Text>
                    </>
                  )}
                </PressableScale>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <PressableScale variant="neu" neuSmall style={styles.backButton} onPress={goBack} accessibilityLabel={t('common.back')}>
          <Ionicons name="arrow-back" size={22} color={neu.text} />
        </PressableScale>
        <Text style={[styles.headerTitle, font(600)]} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>
          {t('accessRequest.title', 'Solicitud de ingreso')}
        </Text>
      </View>

      {body}

      {viewerIndex !== null && (
        <PhotoViewer
          photos={photos}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          closeLabel={t('common.close')}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: neu.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: neu.raised },
  headerTitle: { flex: 1, fontSize: fs(20), fontWeight: '600', color: neu.text },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 14 },
  metaLine: { fontSize: fs(14), color: neu.textLabel },

  countdownCard: { borderRadius: 24, paddingVertical: 18, paddingHorizontal: 20, alignItems: 'center', gap: 6 },
  countdownLabel: { fontSize: fs(13), color: neu.textSoft },
  countdownValue: { fontSize: fs(52), fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: 1 },
  progressTrack: { alignSelf: 'stretch', height: 6, borderRadius: 3, backgroundColor: neu.bgDeep, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%', borderRadius: 3 },

  hintBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: neu.sunken },
  hintText: { flex: 1, fontSize: fs(13), color: neu.textLabel },
  conflictText: { fontSize: fs(13), color: neu.amber },

  visitorCard: { borderRadius: 24, padding: 20, gap: 8 },
  sectionLabel: { fontSize: fs(12), color: neu.textSoft },
  visitorName: { fontSize: fs(28), fontWeight: '700', color: neu.text },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { flex: 1, fontSize: fs(14), color: neu.textLabel },

  plateCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16 },
  plateText: { fontSize: fs(24), fontWeight: '700', color: neu.text, letterSpacing: 3 },

  sectionTitle: { fontSize: fs(16), fontWeight: '600', color: neu.text, marginTop: 4 },
  noPhotos: { fontSize: fs(14), color: neu.textSoft },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  photoSlot: { width: (SCREEN_WIDTH - 40 - 12) / 2 },
  photoCard: { borderRadius: 18, padding: 8, backgroundColor: neu.raised, gap: 8 },
  photoImage: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: neu.bgDeep },
  photoLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 2 },
  photoLabel: { fontSize: fs(13), fontWeight: '600', color: neu.textLabel },

  actionBar: { paddingHorizontal: 20, paddingTop: 12, gap: 10, backgroundColor: neu.bg, borderTopWidth: 1, borderTopColor: neu.border },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionSide: { flex: 1 },
  actionMain: { flex: 2 },
  actionBack: { flex: 1 },
  actionButton: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
  actionMainText: { fontSize: fs(16), fontWeight: '700', color: neu.onAccent },
  actionBackText: { fontSize: fs(15), fontWeight: '600', color: neu.textLabel },
  reasonInput: { minHeight: 56, maxHeight: 110, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, fontSize: fs(15), color: neu.text, backgroundColor: neu.sunken },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  stateIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  stateTitle: { fontSize: fs(22), fontWeight: '700', color: neu.text, textAlign: 'center' },
  stateMessage: { fontSize: fs(14), color: neu.textLabel, textAlign: 'center', lineHeight: fs(14) * 1.5 },
  doneButton: { marginTop: 16, minWidth: 160, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 18, alignItems: 'center', backgroundColor: neu.raised },
  doneButtonText: { fontSize: fs(15), fontWeight: '600', color: neu.text },
  retryButton: { marginTop: 8, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 16, alignItems: 'center' },
  retryText: { fontSize: fs(15), fontWeight: '600', color: neu.onAccent },

  viewerRoot: { flex: 1, backgroundColor: '#000000' },
  viewerImage: { width: '100%', height: '100%' },
  viewerCloseWrap: { position: 'absolute', right: 16, zIndex: 10, elevation: 10 },
  viewerClose: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  viewerCaption: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  viewerCaptionText: { color: '#FFFFFF', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, overflow: 'hidden' },
});
