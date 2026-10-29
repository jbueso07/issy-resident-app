// src/components/VisitPassCard.js
// ISSY - Tarjeta del QR de visita ("Ver QR" en Visitas). Es la misma vista del modal y la imagen que se
// captura con captureRef para compartir/guardar, así que:
//   - QR #000000 sobre #FFFFFF, sin logo encima, sin degradados, módulos cuadrados.
//   - SIN boxShadow ni elevation: el relieve se hace con LinearGradient + bordes por lado.
//   - Tamaños fijos (sin scale/fs) y allowFontScaling={false}: se ve igual en cualquier teléfono.

import React from 'react';
import { View, Text, Image, Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useHomeFont } from '../theme/homeFont';

const LOGO = require('../../assets/isologotipo-negro.png');
// El PNG (8000x4500) trae mucho margen transparente: el dibujo ocupa solo la zona de abajo (fracciones del
// archivo). Se recorta con un contenedor de alto 34 y la imagen escalada/desplazada, sin deformarla.
const LOGO_HEIGHT = 34;
const LOGO_BOX = { x0: 2337 / 8000, x1: 5663 / 8000, y0: 979 / 4500, y1: 3521 / 4500 };
const logoSource = Image.resolveAssetSource(LOGO);
const LOGO_RATIO = logoSource?.width && logoSource?.height ? logoSource.width / logoSource.height : 8000 / 4500;
const LOGO_FULL_HEIGHT = LOGO_HEIGHT / (LOGO_BOX.y1 - LOGO_BOX.y0);
const LOGO_FULL_WIDTH = LOGO_FULL_HEIGHT * LOGO_RATIO;
const LOGO_WIDTH = (LOGO_BOX.x1 - LOGO_BOX.x0) * LOGO_FULL_WIDTH;

const C = {
  bg: '#E4EAE9',
  text: '#14211F',
  soft: '#5F6E6C',
  accent: '#0E8C74',
  separator: '#D2DAD8',
  dayOff: '#A7B2B0',
};

const CARD_WIDTH = Math.min(358, Dimensions.get('window').width - 32);
const CARD_PADDING = 16;
const WELL_PADDING = 10;
const PANEL_PADDING = 22;
const QR_SIZE = Math.min(262, CARD_WIDTH - 96);

const TYPE_ICONS = {
  single: 'flash-outline',
  temporary: 'calendar-outline',
  frequent: 'infinite-outline',
  event: 'people-outline',
};

const LOCALES = { es: 'es-HN', en: 'en-US', fr: 'fr-FR', pt: 'pt-BR' };

const Txt = (props) => <Text allowFontScaling={false} {...props} />;

// Superficie con relieve sin sombras: gradiente 145° + borde de 1.5 con luz arriba/izquierda
function Surface({ kind, radius, style, children }) {
  const raised = kind === 'raised';
  const colors = raised ? ['#F2F6F5', '#E0E7E6'] : ['#D3DBDA', '#E2E8E7'];
  const light = raised ? '#FFFFFF' : '#F6F9F8';
  const dark = raised ? '#C6D0CE' : '#BCC7C5';
  // Relieve: luz arriba/izquierda y sombra abajo/derecha. Hundido: al revés.
  const topLeft = raised ? light : dark;
  const bottomRight = raised ? dark : light;
  return (
    <View
      style={[
        {
          borderRadius: radius,
          overflow: 'hidden',
          borderTopWidth: 1.5,
          borderLeftWidth: 1.5,
          borderBottomWidth: 1.5,
          borderRightWidth: 1.5,
          borderTopColor: topLeft,
          borderLeftColor: topLeft,
          borderBottomColor: bottomRight,
          borderRightColor: bottomRight,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

export default function VisitPassCard({
  qr,
  communityName,
  hostName,
  houseNumber,
  typeLabel,
  timeText,
  entryWindow,
  activeDays,
  cardRef,
  qrRefCallback,
  t,
  language,
}) {
  const font = useHomeFont();
  const locale = LOCALES[language] || 'es-HN';
  const type = qr.qr_type;

  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const parse = (v) => {
    const d = v ? new Date(v) : null;
    return d && !isNaN(d) ? d : null;
  };
  const fullDate = (v) => {
    const d = parse(v);
    return d
      ? cap(d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(',', ''))
      : '';
  };
  const dateTime = (v) => {
    const d = parse(v);
    if (!d) return '';
    const day = cap(d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(/[,.]/g, ''));
    const time = d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${day} · ${time}`;
  };

  // Filas de detalle según el tipo; sin dato → sin fila
  const rows = [];
  const addRow = (key, icon, label, value) => {
    if (value) rows.push({ key, icon, label, value });
  };
  if (type === 'single') {
    addRow('date', 'calendar-outline', t('visits.date'), fullDate(qr.valid_from));
    addRow('time', 'time-outline', t('visits.pass.arrival'), timeText);
    addRow('house', 'home-outline', t('visits.house'), houseNumber);
    addRow('valid', 'checkmark-circle-outline', t('visits.pass.validFor'), t('visits.pass.oneEntry'));
  } else if (type === 'temporary') {
    addRow('from', 'calendar-outline', t('visits.pass.from'), dateTime(qr.valid_from));
    addRow('until', 'calendar-number-outline', t('visits.pass.until'), dateTime(qr.valid_until));
    addRow('house', 'home-outline', t('visits.house'), houseNumber);
  } else if (type === 'frequent') {
    rows.push({ key: 'days', icon: 'calendar-outline', label: t('visits.accessDaysLabel'), days: true });
    addRow('time', 'time-outline', t('visits.schedule'), timeText);
    addRow('house', 'home-outline', t('visits.house'), houseNumber);
  } else {
    // Evento: ventana real de ingreso
    addRow('entry', 'time-outline', t('visits.events.entryLabel', 'Ingreso'), entryWindow);
    addRow('date', 'calendar-outline', t('visits.date'), fullDate(qr.valid_from));
    addRow('house', 'home-outline', t('visits.house'), houseNumber);
  }

  const code = (qr.qr_code || qr.id || '').toString();
  const dayLetters = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  return (
    <View ref={cardRef} collapsable={false} style={styles.card}>
      {/* 1. Logo + tipo del pase */}
      <View style={styles.topRow}>
        <View style={{ width: LOGO_WIDTH, height: LOGO_HEIGHT, overflow: 'hidden' }}>
          <Image
            source={LOGO}
            style={{
              position: 'absolute',
              width: LOGO_FULL_WIDTH,
              height: LOGO_FULL_HEIGHT,
              left: -LOGO_BOX.x0 * LOGO_FULL_WIDTH,
              top: -LOGO_BOX.y0 * LOGO_FULL_HEIGHT,
            }}
            resizeMode="stretch"
          />
        </View>
        <Surface kind="raised" radius={14} style={styles.typePill}>
          <View style={styles.typePillInner}>
            <Ionicons name={TYPE_ICONS[type] || 'qr-code-outline'} size={15} color={C.accent} />
            <Txt style={[styles.typePillText, font(600)]}>{typeLabel}</Txt>
          </View>
        </Surface>
      </View>

      {/* 2. Visitante */}
      <Txt style={[styles.visitorName, font(600)]} numberOfLines={2}>{qr.visitor_name}</Txt>

      {/* 3. Residencial · autorizado por */}
      <View style={styles.metaRow}>
        <Txt style={[styles.community, font(500)]} numberOfLines={2}>{communityName}</Txt>
        <Txt style={[styles.authorized, font(400)]} numberOfLines={2}>
          {t('visits.authorizedBy')} <Txt style={[styles.authorizedName, font(600)]}>{hostName}</Txt>
        </Txt>
      </View>

      {/* 4. Pozo hundido con el QR */}
      <Surface kind="sunken" radius={30} style={styles.well}>
        <View style={styles.qrPanel}>
          <QRCode
            value={code}
            size={QR_SIZE}
            backgroundColor="#FFFFFF"
            color="#000000"
            getRef={qrRefCallback}
          />
          <Txt
            style={[styles.manualCode, font(600)]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {/* Completo: la garita valida el código exacto, uno recortado no existe */}
            {code.toUpperCase()}
          </Txt>
          <Txt style={[styles.manualHint, font(400)]}>{t('visits.pass.manualHint')}</Txt>
        </View>
      </Surface>

      {/* 5. Detalles en lista */}
      {rows.length > 0 && (
        <Surface kind="raised" radius={24} style={styles.details}>
          {rows.map((row, index) => (
            <View key={row.key} style={[styles.detailRow, index > 0 && styles.detailSeparator]}>
              <Surface kind="sunken" radius={15} style={styles.detailIcon}>
                <View style={styles.detailIconInner}>
                  <Ionicons name={row.icon} size={15} color={C.accent} />
                </View>
              </Surface>
              <Txt style={[styles.detailLabel, font(400)]}>{row.label}</Txt>
              {row.days ? (
                <View style={styles.daysRow}>
                  {dayLetters.map((letter, i) => (
                    <Txt
                      key={i}
                      style={[
                        styles.dayLetter,
                        font(activeDays?.[i] ? 700 : 500),
                        { color: activeDays?.[i] ? C.accent : C.dayOff },
                      ]}
                    >
                      {letter}
                    </Txt>
                  ))}
                </View>
              ) : (
                <Txt style={[styles.detailValue, font(600)]} numberOfLines={2}>{row.value}</Txt>
              )}
            </View>
          ))}
        </Surface>
      )}

      {/* 6. Pie */}
      <Txt style={[styles.footer, font(400)]}>Powered by ISSY · joinissy.com</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: C.bg,
    borderRadius: 34,
    padding: CARD_PADDING,
    paddingTop: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typePill: {},
  typePillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  typePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.accent,
  },
  visitorName: {
    fontSize: 28,
    fontWeight: '600',
    color: C.text,
    marginTop: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 6,
    marginBottom: 16,
  },
  community: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '500',
    color: C.text,
  },
  authorized: {
    flexShrink: 1,
    marginLeft: 'auto',
    fontSize: 12,
    color: C.soft,
    textAlign: 'right',
  },
  authorizedName: {
    fontSize: 12,
    fontWeight: '600',
    color: C.text,
  },
  well: {
    padding: WELL_PADDING,
  },
  qrPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingTop: PANEL_PADDING,
    paddingHorizontal: PANEL_PADDING,
    paddingBottom: 14,
    alignItems: 'center',
  },
  manualCode: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 2,
    color: '#000000',
    marginTop: 14,
  },
  manualHint: {
    fontSize: 11,
    color: C.soft,
    marginTop: 4,
    textAlign: 'center',
  },
  details: {
    marginTop: 16,
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  detailSeparator: {
    borderTopWidth: 1,
    borderTopColor: C.separator,
  },
  detailIcon: {
    width: 30,
    height: 30,
  },
  detailIconInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: C.soft,
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    textAlign: 'right',
  },
  daysRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  dayLetter: {
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    fontSize: 11,
    color: C.soft,
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 2,
  },
});
