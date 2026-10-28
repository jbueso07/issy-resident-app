// app/(tabs)/support.js
// ISSY Resident App - Support/Help Screen + i18n

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from '../../src/hooks/useTranslation';
import { neu } from '../../src/theme/tokens';

export default function Support() {
  const { t } = useTranslation();
  const router = useRouter();
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  // FAQ items traducidos
  const FAQ_ITEMS = [
    {
      id: 1,
      question: t('support.faq.qrCode.question'),
      answer: t('support.faq.qrCode.answer'),
    },
    {
      id: 2,
      question: t('support.faq.joinCommunity.question'),
      answer: t('support.faq.joinCommunity.answer'),
    },
    {
      id: 3,
      question: t('support.faq.changePassword.question'),
      answer: t('support.faq.changePassword.answer'),
    },
    {
      id: 4,
      question: t('support.faq.contactAdmin.question'),
      answer: t('support.faq.contactAdmin.answer'),
    },
    {
      id: 5,
      question: t('support.faq.panicButton.question'),
      answer: t('support.faq.panicButton.answer'),
    },
  ];

  // Opciones de contacto traducidas
  const CONTACT_OPTIONS = [
    {
      id: 'email',
      icon: '✉️',
      title: t('support.contact.email'),
      subtitle: 'info@joinissy.com',
      action: () => Linking.openURL('mailto:info@joinissy.com'),
      color: neu.lilac,
    },
    {
      id: 'web',
      icon: '🌐',
      title: t('support.contact.website'),
      subtitle: 'joinissy.com',
      action: () => Linking.openURL('https://joinissy.com'),
      color: neu.teal,
    },
  ];

  const toggleFAQ = (id) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleContact = (option) => {
    option.action();
  };

  // El botón de pánico vive en el inicio (mantener presionado 2 s en "Emergencia").
  const handlePanicButtonPress = () => {
    Alert.alert(
      t('support.panicButton.title'),
      t('support.panicButton.message'),
      [
        { text: t('common.close'), style: 'cancel' },
        { text: t('support.panicButton.goHome'), onPress: () => router.push('/(tabs)/home') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('support.title')}</Text>
          <Text style={styles.subtitle}>{t('support.subtitle')}</Text>
        </View>

        {/* Contact Options */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>{t('support.contactUs')}</Text>
          <View style={styles.contactGrid}>
            {CONTACT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.contactCard}
                onPress={() => handleContact(option)}
                activeOpacity={0.7}
              >
                <View style={[styles.contactIconContainer, { backgroundColor: option.color + '20' }]}>
                  <Text style={styles.contactIcon}>{option.icon}</Text>
                </View>
                <Text style={styles.contactTitle}>{option.title}</Text>
                <Text style={styles.contactSubtitle}>{option.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>{t('support.faqTitle')}</Text>
          {FAQ_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.faqItem}
              onPress={() => toggleFAQ(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <Text style={styles.faqArrow}>
                  {expandedFAQ === item.id ? '▲' : '▼'}
                </Text>
              </View>
              {expandedFAQ === item.id && (
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Emergency Banner */}
        <TouchableOpacity 
          style={styles.emergencyBanner}
          onPress={handlePanicButtonPress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[neu.coral, neu.coral]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.emergencyGradient}
          >
            <Text style={styles.emergencyIcon}>🚨</Text>
            <View style={styles.emergencyTextContainer}>
              <Text style={styles.emergencyTitle}>{t('support.panicButton.title')}</Text>
              <Text style={styles.emergencySubtitle}>{t('support.panicButton.subtitle')}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>ISSY Resident App v1.0.0</Text>
          <Text style={styles.appCopyright}>{t('support.copyright')}</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: neu.bg,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: neu.text,
  },
  subtitle: {
    fontSize: 16,
    color: neu.textSoft,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: neu.text,
    marginBottom: 16,
  },
  // Contact Section
  contactSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  contactGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  contactCard: {
    flex: 1,
    backgroundColor: neu.raised,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  contactIcon: {
    fontSize: 24,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: neu.text,
    marginBottom: 2,
  },
  contactSubtitle: {
    fontSize: 11,
    color: neu.textSoft,
    textAlign: 'center',
  },
  // FAQ Section
  faqSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  faqItem: {
    backgroundColor: neu.raised,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: neu.text,
    flex: 1,
    paddingRight: 12,
  },
  faqArrow: {
    fontSize: 12,
    color: neu.textSoft,
  },
  faqAnswer: {
    fontSize: 14,
    color: neu.textSoft,
    marginTop: 12,
    lineHeight: 20,
  },
  // Emergency Banner
  emergencyBanner: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  emergencyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  emergencyIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  emergencyTextContainer: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: neu.text,
  },
  emergencySubtitle: {
    fontSize: 13,
    color: neu.textLabel,
    marginTop: 2,
  },
  emergencyBadge: {
    backgroundColor: neu.raised,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emergencyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: neu.text,
  },
  // App Info
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  appVersion: {
    fontSize: 13,
    color: neu.textSoft,
  },
  appCopyright: {
    fontSize: 12,
    color: neu.text,
    marginTop: 4,
  },
});