// src/hooks/useTranslation.js
// ISSY - Translation hook
import { useLanguage } from '../context/LanguageContext';

/**
 * Hook for using translations in components
 * @returns {Object} { t, language, setLanguage, languages, getCurrentLanguage }
 * 
 * Usage:
 * const { t, language, setLanguage, languages } = useTranslation();
 * 
 * // Simple translation
 * <Text>{t('home.greeting', { name: 'John' })}</Text>
 * 
 * // Change language
 * setLanguage('en');
 * 
 * // Get all available languages
 * languages.map(lang => <Text key={lang.code}>{lang.flag} {lang.name}</Text>)
 */
export const useTranslation = () => {
  const context = useLanguage();
  
  if (!context) {
    console.warn('useTranslation must be used within a LanguageProvider');
    return {
      t: (key) => key,
      language: 'es',
      setLanguage: () => {},
      languages: [],
      getCurrentLanguage: () => ({ code: 'es', name: 'Español', flag: '🇪🇸' }),
    };
  }
  
  return context;
};

export default useTranslation;