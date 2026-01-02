// src/i18n/index.js
// ISSY - Internationalization Configuration
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import fr from './locales/fr.json';

const LANGUAGE_KEY = 'user_language';

export const translations = {
  en,
  es,
  pt,
  fr,
};

export const languages = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
];

// Get device language or default
export const getDeviceLanguage = () => {
  const locale = Localization.locale?.split('-')[0] || 'es';
  return translations[locale] ? locale : 'es';
};

// Get saved language from storage
export const getSavedLanguage = async () => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (saved && translations[saved]) {
      return saved;
    }
    return getDeviceLanguage();
  } catch {
    return getDeviceLanguage();
  }
};

// Save language to storage
export const saveLanguage = async (languageCode) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, languageCode);
    return true;
  } catch {
    return false;
  }
};

// Get nested translation value
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

// Translate function with interpolation
export const translate = (key, language = 'es', params = {}) => {
  const translation = getNestedValue(translations[language], key);
  
  if (!translation) {
    // Fallback to Spanish, then English
    const fallback = getNestedValue(translations['es'], key) || 
                     getNestedValue(translations['en'], key) || 
                     key;
    return interpolate(fallback, params);
  }
  
  return interpolate(translation, params);
};

// Interpolate variables in translation string
const interpolate = (str, params) => {
  if (typeof str !== 'string') return str;
  
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match;
  });
};

export default {
  translations,
  languages,
  getDeviceLanguage,
  getSavedLanguage,
  saveLanguage,
  translate,
};