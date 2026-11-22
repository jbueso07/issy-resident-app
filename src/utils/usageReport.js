// src/utils/usageReport.js
// ISSY - Reporte de uso (admin): períodos, validación y nombre del PDF.
// Mismas reglas que el backend (usageReportService.validateRange): fechas YYYY-MM-DD en hora de
// Honduras (UTC-6, sin horario de verano), desde ≤ hasta, hasta ≤ hoy, máximo 92 días contando ambos.

export const MAX_RANGE_DAYS = 92;
const DAY_MS = 86400000;
const HN_OFFSET_MS = 6 * 3600000;

const pad = (n) => String(n).padStart(2, '0');

// Hoy en Honduras → '2026-11-22'
export const hondurasToday = (now = new Date()) => new Date(now.getTime() - HN_OFFSET_MS).toISOString().slice(0, 10);

export const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

// Días contando ambos extremos
export const rangeDays = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;

// Atajos: 'last7' (hoy y los 6 días anteriores), 'thisMonth' (del 1 a hoy), 'lastMonth' (mes completo)
export const presetRange = (key, now = new Date()) => {
  const today = hondurasToday(now);
  const monthStart = `${today.slice(0, 8)}01`;
  if (key === 'last7') return { from: addDays(today, -6), to: today };
  if (key === 'thisMonth') return { from: monthStart, to: today };
  if (key === 'lastMonth') {
    const lastDay = addDays(monthStart, -1);
    return { from: `${lastDay.slice(0, 8)}01`, to: lastDay };
  }
  return null;
};

// El selector de fecha trabaja con Date locales: el día que el usuario ve es el que vale
export const dayToDate = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
export const dateToDay = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// → { ok: true, days } | { ok: false, key, days? } (key = texto en i18n: usageReport.errors.<key>)
export const validateRange = (from, to, now = new Date()) => {
  if (!from || !to) return { ok: false, key: 'missing' };
  if (from > to) return { ok: false, key: 'order' };
  if (to > hondurasToday(now)) return { ok: false, key: 'future' };
  const days = rangeDays(from, to);
  if (days > MAX_RANGE_DAYS) return { ok: false, key: 'tooLong', days };
  return { ok: true, days };
};

// 'Altos de Valencia' → 'Altos-de-Valencia' (sin tildes ni caracteres raros)
export const slug = (text) => String(text || '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Za-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60);

// Nombre del PDF: el del backend (X-Report-Filename) si viene; si no, el mismo formato armado aquí
export const usageReportFileName = ({ header, locationName, from, to }) => {
  const fromHeader = String(header || '').replace(/\.pdf$/i, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  if (fromHeader) return `${fromHeader.slice(0, 120)}.pdf`;
  const name = slug(locationName) || 'residencial';
  return `ISSY-Reporte-de-uso-${name}-${from}_${to}.pdf`;
};

// Error de getUsageReportHtml → { key } (texto en i18n) o { message } (el del servidor, tal cual)
export const usageReportError = (result) => {
  if (result?.sessionExpired) return { key: 'session' };
  if (result?.status === 429) return { key: 'tooMany' };
  if ((result?.status === 400 || result?.status === 403) && result.error) return { message: result.error };
  return { key: 'generic' };
};
