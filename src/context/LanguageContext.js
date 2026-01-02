// src/context/LanguageContext.js
// ISSY - Language Context with react-i18next
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import '../i18n/i18n'; // Initialize i18n

const LANGUAGE_KEY = 'user_language';

export const languages = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
];

const LanguageContext = createContext({});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);

  // Load saved language on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (savedLang && ['es', 'en', 'fr', 'pt'].includes(savedLang)) {
          await i18n.changeLanguage(savedLang);
        }
      } catch (error) {
        console.log('Error loading language:', error);
      } finally {
        setLoading(false);
      }
    };
    loadLanguage();
  }, []);

  // Change language and persist
  const setLanguage = useCallback(async (langCode) => {
    if (['es', 'en', 'fr', 'pt'].includes(langCode)) {
      await i18n.changeLanguage(langCode);
      await AsyncStorage.setItem(LANGUAGE_KEY, langCode);
      return true;
    }
    return false;
  }, [i18n]);

  // Get current language code
  const language = i18n.language || 'es';

  // Get current language info
  const getCurrentLanguage = useCallback(() => {
    return languages.find(l => l.code === language) || languages[0];
  }, [language]);

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      t,
      loading,
      languages,
      getCurrentLanguage,
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;