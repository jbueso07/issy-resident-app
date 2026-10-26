// src/utils/receivedQR.js
// ISSY - Datos derivados de un QR recibido dentro de la app (lista "Mis accesos" y pase).
// GET /qr/received devuelve qr_codes.* + creator(id, name, phone, profile_photo_url).
// Residencial, coordenadas y casa todavía no vienen del backend: se leen si llegan
// (location, creator_house_number) y si no, se usan respaldos.

import { colors } from '../theme/tokens';

// Color de cada tipo de QR (chips del pase recibido, Mis accesos y la lista de Visitantes)
export const TYPE_COLORS = { single: colors.coral, frequent: colors.lime, temporary: colors.purple, event: colors.amber };

const LOCALES = { es: 'es-HN', en: 'en-US', fr: 'fr-FR', pt: 'pt-BR' };
export const localeFor = (language) => LOCALES[language] || LOCALES.es;

// Lunes primero, como en la app de visitas
export const WEEK_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LETTERS = {
  es: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  fr: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  pt: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'],
};
export const dayLetters = (language) => DAY_LETTERS[language] || DAY_LETTERS.es;

// 2026-10-19 fue lunes: sirve para pedirle a Intl el nombre corto de cada día
const shortDayName = (index, locale) => {
  const name = new Date(2026, 9, 19 + index).toLocaleDateString(locale, { weekday: 'short' });
  const clean = name.replace('.', '');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

// access_days llega como arreglo o como texto JSON: ['monday', 'friday', ...]
export const parseAccessDays = (value) => {
  let days = value;
  if (typeof days === 'string') {
    try {
      days = JSON.parse(days);
    } catch {
      days = [];
    }
  }
  if (!Array.isArray(days)) return [];
  const set = new Set(days.map((d) => String(d).toLowerCase()));
  return WEEK_ORDER.filter((d) => set.has(d));
};

// "Lun a vie", "Todos los días" o "Lun, Mié, Vie"
export const formatDaysSummary = (days, t, language) => {
  if (days.length === 0) return '';
  const locale = localeFor(language);
  if (days.length === 7) return t('home2.receivedQR.everyDay', 'Todos los días');
  const indexes = days.map((d) => WEEK_ORDER.indexOf(d));
  const consecutive = indexes.every((idx, i) => i === 0 || idx === indexes[i - 1] + 1);
  if (consecutive && indexes.length >= 3) {
    return t('home2.receivedQR.dayRange', {
      from: shortDayName(indexes[0], locale),
      to: shortDayName(indexes[indexes.length - 1], locale).toLowerCase(),
      defaultValue: '{{from}} a {{to}}',
    });
  }
  return indexes.map((idx) => shortDayName(idx, locale)).join(', ');
};

// access_time_start / access_time_end: 'HH:MM' o 'HH:MM:SS'
const formatClock = (value, locale) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ''));
  if (!match) return '';
  const date = new Date(2026, 0, 1, Number(match[1]), Number(match[2]));
  return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
};

const formatTime = (iso, locale) =>
  new Date(iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });

// capitalize = false para usar la fecha dentro de una frase ("Se activa el sáb, 24 oct")
export const formatDate = (iso, language, withWeekday = true, capitalize = true) => {
  if (!iso) return '';
  const text = new Date(iso).toLocaleDateString(localeFor(language), {
    ...(withWeekday ? { weekday: 'short' } : {}),
    day: 'numeric',
    month: 'short',
  });
  return capitalize ? text.charAt(0).toUpperCase() + text.slice(1) : text;
};

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const isPermanent = (iso) => !iso || new Date(iso).getFullYear() >= 2099;

// active | scheduled | used | expired
export const getPassStatus = (qr, now = new Date()) => {
  // QR de una vez que ya se usó en la garita
  if (qr.status === 'used') return 'used';
  if (qr.status && qr.status !== 'active') return 'expired';
  if (qr.valid_until && new Date(qr.valid_until) < now) return 'expired';
  if (qr.valid_from && new Date(qr.valid_from) > now) return 'scheduled';
  return 'active';
};

// "5 h 41 min" / "12 min"
export const formatRemaining = (untilIso, t, now = new Date()) => {
  const minutes = Math.max(0, Math.floor((new Date(untilIso) - now) / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0
    ? t('home2.receivedQR.hoursMinutes', { h, m, defaultValue: '{{h}} h {{m}} min' })
    : t('home2.receivedQR.minutes', { m, defaultValue: '{{m}} min' });
};

// "Se activa el sáb 26, 4:00 p. m."
export const getActivationText = (qr, t, language) =>
  t('home2.receivedQR.activatesOn', {
    date: `${formatDate(qr.valid_from, language, true, false)}, ${formatTime(qr.valid_from, localeFor(language))}`,
    defaultValue: 'Se activa el {{date}}',
  });

// Texto del estado: "Activo · expira en 5 h 41 min", "Programado · Se activa el sáb 26, 4:00 p. m."
export const getStatusText = (qr, t, language, now = new Date()) => {
  const status = getPassStatus(qr, now);
  const label = t(`home2.receivedQR.status.${status}`);
  if (status === 'scheduled') return `${label} · ${getActivationText(qr, t, language)}`;
  if (status !== 'active' || isPermanent(qr.valid_until)) return label;
  const hoursLeft = (new Date(qr.valid_until) - now) / 3600000;
  if (hoursLeft < 24) {
    return `${label} · ${t('home2.receivedQR.expiresIn', {
      time: formatRemaining(qr.valid_until, t, now),
      defaultValue: 'expira en {{time}}',
    })}`;
  }
  return `${label} · ${t('home2.receivedQR.validUntil', {
    date: formatDate(qr.valid_until, language, true, false),
    defaultValue: 'vence el {{date}}',
  })}`;
};

// Cuadros del pase y línea "cuándo puede entrar" de la lista
export const getScheduleParts = (qr, t, language) => {
  const locale = localeFor(language);
  const days = parseAccessDays(qr.access_days);
  const daysText = formatDaysSummary(days, t, language);
  const recurringHours = qr.is_24_7
    ? t('home2.receivedQR.allDay', 'Todo el día')
    : [formatClock(qr.access_time_start, locale), formatClock(qr.access_time_end, locale)]
        .filter(Boolean)
        .join(' – ');

  if (qr.qr_type === 'frequent') {
    return {
      date: isPermanent(qr.valid_until)
        ? t('home2.receivedQR.permanent', 'Permanente')
        : t('home2.receivedQR.until', {
            date: formatDate(qr.valid_until, language, false),
            defaultValue: 'Hasta {{date}}',
          }),
      hours: recurringHours,
      line: [daysText, recurringHours].filter(Boolean).join(' · '),
      days,
    };
  }

  if (qr.qr_type === 'temporary') {
    const range = `${formatDate(qr.valid_from, language, false)} – ${formatDate(qr.valid_until, language, false)}`;
    return {
      date: range,
      hours: recurringHours,
      line: [range, daysText, recurringHours].filter(Boolean).join(' · '),
      days,
    };
  }

  // Una vez y evento: una ventana con fecha y hora
  if (!qr.valid_from) return { date: '', hours: '', line: '', days: [] };
  const from = formatTime(qr.valid_from, locale);
  const until = qr.valid_until ? formatTime(qr.valid_until, locale) : '';
  const crossesDay = qr.valid_until && !sameDay(qr.valid_from, qr.valid_until);
  const hours = crossesDay
    ? `${from} – ${formatDate(qr.valid_until, language)}, ${until}`
    : [from, until].filter(Boolean).join(' – ');
  const date = formatDate(qr.valid_from, language);
  return { date, hours, line: `${date} · ${hours}`, days: [] };
};

// Residencial y casa: del backend si llegan (qr.location, qr.creator_house_number); si no,
// de las residenciales del propio usuario. profile.user_locations (GET /auth/me) es plano:
// { location_id, name, address, city, country, role, is_primary, house_number }.
export const getDestination = (qr, userLocations = [], t) => {
  const own = userLocations.find((l) => l.location_id === qr.location_id);
  const name = qr.location?.name || own?.name || t('home2.receivedQR.residenceFallback', 'Residencial');
  const house = qr.house_number || qr.creator_house_number || qr.creator?.house_number || null;
  const lat = Number(qr.location?.latitude);
  const lng = Number(qr.location?.longitude);
  const coordinates = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
    ? { latitude: lat, longitude: lng }
    : null;
  return { name, house, coordinates };
};
