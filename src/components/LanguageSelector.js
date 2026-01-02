// src/components/LanguageSelector.js
// ISSY - Language Selector Component
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  bgCardAlt: '#243B44',
  lime: '#AAFF00',
  cyan: '#00E5FF',
  teal: '#00BFA6',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  border: 'rgba(255, 255, 255, 0.1)',
};

const LanguageSelector = ({ style }) => {
  const { t, language, setLanguage, languages, getCurrentLanguage } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  
  const currentLang = getCurrentLanguage();

  const handleSelectLanguage = async (langCode) => {
    await setLanguage(langCode);
    setModalVisible(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <TouchableOpacity
        style={[styles.selector, style]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.selectorLeft}>
          <Ionicons name="language-outline" size={22} color={COLORS.cyan} />
          <View style={styles.selectorText}>
            <Text style={styles.selectorLabel}>{t('profile.language')}</Text>
            <Text style={styles.selectorValue}>
              {currentLang.flag} {currentLang.name}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
      </TouchableOpacity>

      {/* Language Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.selectLanguage')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Language List */}
            <View style={styles.languageList}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageItem,
                    language === lang.code && styles.languageItemActive,
                  ]}
                  onPress={() => handleSelectLanguage(lang.code)}
                >
                  <View style={styles.languageLeft}>
                    <Text style={styles.languageFlag}>{lang.flag}</Text>
                    <Text style={styles.languageName}>{lang.name}</Text>
                  </View>
                  {language === lang.code && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.lime} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(12),
    padding: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  selectorText: {
    gap: scale(2),
  },
  selectorLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  selectorValue: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.bgSecondary,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    paddingBottom: Platform.OS === 'ios' ? scale(34) : scale(20),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  languageList: {
    paddingHorizontal: scale(20),
    paddingTop: scale(12),
    gap: scale(8),
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: scale(12),
    padding: scale(16),
  },
  languageItemActive: {
    backgroundColor: 'rgba(170, 255, 0, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.lime,
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  languageFlag: {
    fontSize: scale(24),
  },
  languageName: {
    fontSize: scale(16),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
});

export default LanguageSelector;