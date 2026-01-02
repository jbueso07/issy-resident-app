// src/i18n/i18n.js
// ISSY - react-i18next Configuration
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import fr from './locales/fr.json';

const LANGUAGE_KEY = 'user_language';

const resources = {
  en: { translation: en },
  es: { translation: es },
  pt: { translation: pt },
  fr: { translation: fr },
};

// Get device language
const getDeviceLanguage = () => {
  const locale = Localization.locale?.split('-')[0] || 'es';
  return resources[locale] ? locale : 'es';
};

// Language detector for AsyncStorage
const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      const savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLang && resources[savedLang]) {
        callback(savedLang);
        return;
      }
    } catch (error) {
      console.log('Error detecting language:', error);
    }
    callback(getDeviceLanguage());
  },
  init: () => {},
  cacheUserLanguage: async (language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
      console.log('Error caching language:', error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es',
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;