// src/utils/myQRStatus.js
// ISSY - Estado de los QR que creé (pestaña Visitantes, diseño K1): línea de estado de cada
// tarjeta y los tres números de arriba. Todo se calcula en la app.
// last_entry_at llega solo si el backend lo soporta (GET /qr?include_usage=true); si la clave no
// viene, no se sabe si entró y se muestra solo la vigencia.

import { getPassStatus, parseAccessDays, WEEK_ORDER, localeFor } from './receivedQR';

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();
const isPermanent = (iso) => !iso || new Date(iso).getFullYear() >= 2099;

// JS: 0 = domingo; WEEK_ORDER empieza en lunes
const weekdayKey = (date) => WEEK_ORDER[(new Date(date).getDay() + 6) % 7];

export const hasUsageInfo = (qr) => Object.prototype.hasOwnProperty.call(qr, 'last_entry_at');

export const enteredToday = (qr, now = new Date()) =>
  hasUsageInfo(qr) && !!qr.last_entry_at && sameDay(qr.last_entry_at, now);

// Vigente hoy: activo, hoy dentro del rango de fechas y, si tiene días, hoy es uno de ellos
export const isValidToday = (qr, now = new Date()) => {
  if (getPassStatus(qr, now) !== 'active' && getPassStatus(qr, now) !== 'scheduled') return false;
  const today = startOfDay(now);
  const tomorrow = new Date(today.getTime() + DAY_MS);
  if (qr.valid_from && new Date(qr.valid_from) >= tomorrow) return false;
  if (qr.valid_until && new Date(qr.valid_until) < today) return false;
  const days = parseAccessDays(qr.access_days);
  if ((qr.qr_type === 'frequent' || qr.qr_type === 'temporary') && days.length > 0) {
    return days.includes(weekdayKey(now));
  }
  return true;
};

const nextAllowedDay = (qr, now = new Date()) => {
  const days = parseAccessDays(qr.access_days);
  for (let i = 1; i <= 7; i += 1) {
    const d = new Date(startOfDay(now).getTime() + i * DAY_MS);
    if (qr.valid_until && !isPermanent(qr.valid_until) && d > new Date(qr.valid_until)) return null;
    if (days.length === 0 || days.includes(weekdayKey(d))) return d;
  }
  return null;
};

const weekdayName = (date, language) =>
  new Date(date).toLocaleDateString(localeFor(language), { weekday: 'long' });

const timeLabel = (iso, language) =>
  new Date(iso).toLocaleTimeString(localeFor(language), { hour: 'numeric', minute: '2-digit' });

// Línea de estado de la tarjeta, o null para usar la vigencia de siempre
export const getMyQRStatusLine = (qr, t, language, now = new Date()) => {
  const status = getPassStatus(qr, now);
  const times = qr.times_used || 0;

  if (status === 'used' || status === 'expired') {
    if (times === 1) return t('visits.list.status.usedOnceExpired', 'Usado 1 vez · vencido');
    if (times > 1) return t('visits.list.status.usedTimesExpired', { n: times, defaultValue: 'Usado {{n}} veces · vencido' });
    return t('visits.list.status.expiredUnused', 'Vencido sin usar');
  }

  if (status === 'scheduled') {
    const start = new Date(qr.valid_from);
    // Dentro de la semana: el día; si no, la fecha corta
    const day = start - now < 7 * DAY_MS
      ? weekdayName(start, language)
      : start.toLocaleDateString(localeFor(language), { day: 'numeric', month: 'short' });
    return t('visits.list.status.nextVisit', { day, defaultValue: 'Próxima visita: {{day}}' });
  }

  if (enteredToday(qr, now)) {
    return t('visits.list.status.enteredToday', {
      time: timeLabel(qr.last_entry_at, language),
      defaultValue: 'Entró hoy a las {{time}}',
    });
  }

  if (qr.qr_type === 'temporary' && qr.valid_from && qr.valid_until) {
    const total = Math.round((startOfDay(qr.valid_until) - startOfDay(qr.valid_from)) / DAY_MS) + 1;
    const current = Math.round((startOfDay(now) - startOfDay(qr.valid_from)) / DAY_MS) + 1;
    return t('visits.list.status.dayOf', {
      i: Math.min(Math.max(current, 1), total),
      n: total,
      defaultValue: 'Día {{i}} de {{n}}',
    });
  }

  if (qr.qr_type === 'frequent' && !isValidToday(qr, now)) {
    const next = nextAllowedDay(qr, now);
    if (next) {
      return t('visits.list.status.nextVisit', { day: weekdayName(next, language), defaultValue: 'Próxima visita: {{day}}' });
    }
  }

  // Sin datos de ingreso no se puede decir "Aún no llega": se muestra la vigencia
  if (hasUsageInfo(qr) && isValidToday(qr, now)) {
    return t('visits.list.status.notArrived', 'Aún no llega');
  }
  return null;
};

// Los tres números de arriba
export const getMyQRSummary = (qrs, now = new Date()) => {
  // Mismo criterio que el filtro "Activos": vigentes y programados (no usados ni vencidos)
  const active = qrs.filter((qr) => !['used', 'expired'].includes(getPassStatus(qr, now)));
  const weekAhead = now.getTime() + 7 * DAY_MS;
  return {
    active: active.length,
    // Sin datos de ingreso, todo lo vigente hoy cuenta como esperado
    expectedToday: active.filter((qr) => isValidToday(qr, now) && !enteredToday(qr, now)).length,
    expiringThisWeek: active.filter(
      (qr) =>
        qr.valid_until &&
        !isPermanent(qr.valid_until) &&
        new Date(qr.valid_until).getTime() <= weekAhead
    ).length,
  };
};

// Filtros de la lista. Historial: usados y vencidos, los 30 más recientes.
export const MY_QR_FILTERS = ['active', 'frequent', 'temporary', 'event', 'history'];
const HISTORY_SIZE = 30;

export const filterMyQRs = (qrs, filter, now = new Date()) => {
  const isPast = (qr) => ['used', 'expired'].includes(getPassStatus(qr, now));
  if (filter === 'history') {
    return qrs
      .filter(isPast)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, HISTORY_SIZE);
  }
  const current = qrs.filter((qr) => !isPast(qr));
  if (filter === 'active') return current;
  return current.filter((qr) => qr.qr_type === filter);
};
