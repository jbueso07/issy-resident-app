// src/utils/visitorSuggestions.js
// ISSY - Sugerencias de visitas anteriores en el formulario "Nuevo QR".
// Preferencias por usuario en AsyncStorage (visitor_suggestions_<userId>):
// { enabled, hidden: { [nombreNormalizado]: fechaISO }, cutoff: fechaISO | null }
// - hidden: quitadas una por una; vuelven solo si después se crea otro QR para esa persona.
// - cutoff: "Borrar sugerencias de visitas"; solo cuentan los QR creados después.

import AsyncStorage from '@react-native-async-storage/async-storage';

const DIACRITICS = /[̀-ͯ]/g;
const DEFAULT_PREFS = { enabled: true, hidden: {}, cutoff: null };
export const MAX_SUGGESTIONS = 6;
export const MIN_QUERY_LENGTH = 2;

const storageKey = (userId) => `visitor_suggestions_${userId}`;

const foldChar = (char) => char.normalize('NFD').replace(DIACRITICS, '').toLowerCase();

// Sin acentos, sin mayúsculas, sin espacios dobles (igual que el backend)
export const normalizeVisitorName = (value) =>
  foldChar(String(value || '')).replace(/\s+/g, ' ').trim();

const cleanName = (value) => String(value || '').replace(/\s+/g, ' ').trim();

export const loadSuggestionPrefs = async (userId) => {
  if (!userId) return { ...DEFAULT_PREFS };
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    const saved = raw ? JSON.parse(raw) : {};
    return {
      enabled: saved.enabled !== false,
      hidden: saved.hidden && typeof saved.hidden === 'object' && !Array.isArray(saved.hidden) ? saved.hidden : {},
      cutoff: typeof saved.cutoff === 'string' ? saved.cutoff : null,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
};

const savePrefs = async (userId, prefs) => {
  if (!userId) return prefs;
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(prefs));
  } catch (error) {
    console.error('Error saving visitor suggestions prefs:', error);
  }
  return prefs;
};

export const setSuggestionsEnabled = async (userId, enabled) => {
  const prefs = await loadSuggestionPrefs(userId);
  return savePrefs(userId, { ...prefs, enabled: !!enabled });
};

export const hideSuggestion = async (userId, name) => {
  const prefs = await loadSuggestionPrefs(userId);
  const key = normalizeVisitorName(name);
  if (!key) return prefs;
  return savePrefs(userId, { ...prefs, hidden: { ...prefs.hidden, [key]: new Date().toISOString() } });
};

// Borra todas: fecha de corte = ahora (las quitadas una por una ya quedan cubiertas)
export const clearAllSuggestions = async (userId) => {
  const prefs = await loadSuggestionPrefs(userId);
  return savePrefs(userId, { ...prefs, hidden: {}, cutoff: new Date().toISOString() });
};

// Respaldo mientras el backend no tenga GET /qr/recent-visitors: los QR que la pantalla ya cargó
export const buildSuggestionsFromQRs = (qrCodes = []) => {
  const sorted = [...qrCodes]
    .filter((qr) => qr && qr.qr_type !== 'event' && !qr.is_delivery)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const seen = new Set();
  const list = [];
  sorted.forEach((qr) => {
    const key = normalizeVisitorName(qr.visitor_name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    const phone = String(qr.visitor_phone || '').trim();
    list.push({
      name: cleanName(qr.visitor_name),
      phone: phone && phone.toUpperCase() !== 'N/A' ? phone : null,
      visitor_id: qr.visitor_id ? String(qr.visitor_id).trim() || null : null,
      last_used_at: qr.created_at || null,
    });
  });
  return list;
};

// Quita las ocultas (salvo QR más nuevo que la fecha en que se quitaron) y las anteriores al corte
export const applySuggestionPrefs = (list = [], prefs = DEFAULT_PREFS) => {
  if (!prefs.enabled) return [];
  const cutoff = prefs.cutoff ? new Date(prefs.cutoff).getTime() : null;
  return list.filter((item) => {
    const key = normalizeVisitorName(item.name);
    if (!key) return false;
    const used = item.last_used_at ? new Date(item.last_used_at).getTime() : 0;
    if (cutoff && used <= cutoff) return false;
    const hiddenAt = prefs.hidden?.[key];
    if (hiddenAt && used <= new Date(hiddenAt).getTime()) return false;
    return true;
  });
};

// Nombre doblado letra por letra, con el índice original de cada letra (para marcar en negrita)
const foldWithMap = (text) => {
  let folded = '';
  const map = [];
  let offset = 0;
  Array.from(text).forEach((char) => {
    const piece = foldChar(char);
    for (let i = 0; i < piece.length; i += 1) map.push({ start: offset, end: offset + char.length });
    folded += piece;
    offset += char.length;
  });
  return { folded, map };
};

// Partes del nombre: [{ text, bold }]
const splitByMatch = (name, map, from, length) => {
  const start = map[from].start;
  const end = map[from + length - 1].end;
  return [
    { text: name.slice(0, start), bold: false },
    { text: name.slice(start, end), bold: true },
    { text: name.slice(end), bold: false },
  ].filter((part) => part.text);
};

// Hasta 6 coincidencias: primero las que empiezan igual, luego inicio de palabra, luego cualquier parte
export const matchSuggestions = (list = [], query = '', max = MAX_SUGGESTIONS) => {
  const needle = normalizeVisitorName(query);
  if (needle.length < MIN_QUERY_LENGTH) return [];
  const matches = [];
  list.forEach((item, order) => {
    const { folded, map } = foldWithMap(item.name);
    const index = folded.indexOf(needle);
    if (index < 0) return;
    let rank = 2;
    if (index === 0) rank = 0;
    else if (folded[index - 1] === ' ') rank = 1;
    matches.push({ ...item, rank, order, parts: splitByMatch(item.name, map, index, needle.length) });
  });
  return matches
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .slice(0, max);
};
