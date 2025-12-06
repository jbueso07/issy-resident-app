// app/(tabs)/support.js
// ISSY Resident App - Support/Help Screen

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

const FAQ_ITEMS = [
  {
    id: 1,
    question: '¿Cómo genero un código QR para visitantes?',
    answer: 'Ve a la pestaña "Visitas", toca "Generar Código QR", ingresa los datos del visitante y selecciona el tipo de acceso.',
  },
  {
    id: 2,
    question: '¿Cómo me uno a mi comunidad?',
    answer: 'Necesitas un código de invitación de tu administrador. Ve a "Unirme a mi comunidad" e ingresa el código.',
  },
  {
    id: 3,
    question: '¿Cómo cambio mi contraseña?',
    answer: 'Ve a Perfil > Configuración > Cambiar contraseña. Te enviaremos un correo de verificación.',
  },
  {
    id: 4,
    question: '¿Cómo contacto a mi administrador?',
    answer: 'En la sección de tu comunidad encontrarás los datos de contacto del administrador.',
  },
  {
    id: 5,
    question: '¿Cómo funciona el botón de pánico?',
    answer: 'El botón de pánico es un servicio premium que envía alertas inmediatas a seguridad y contactos de emergencia.',
  },
];

const CONTACT_OPTIONS = [
  {
    id: 'whatsapp',
    icon: '💬',
    title: 'WhatsApp',
    subtitle: 'Respuesta rápida',
    action: () => Linking.openURL('https://wa.me/50433960908'),
    color: '#25D366',
  },
  {
    id: 'email',
    icon: '✉️',
    title: 'Email',
    subtitle: 'soporte@joinissy.com',
    action: () => Linking.openURL('mailto:soporte@joinissy.com'),
    color: '#6366F1',
  },
  {
    id: 'call',
    icon: '📞',
    title: 'Llamar',
    subtitle: '+504 3396-0908',
    action: () => Linking.openURL('tel:+50433960908'),
    color: '#FC6447',
  },
];

export default function Support() {
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const toggleFAQ = (id) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleContact = (option) => {
    option.action();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Soporte</Text>
          <Text style={styles.subtitle}>¿En qué podemos ayudarte?</Text>
        </View>

        {/* Contact Options */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Contáctanos</Text>
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
          <Text style={styles.sectionTitle}>Preguntas Frecuentes</Text>
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
          onPress={() => Alert.alert(
            'Botón de Pánico',
            'El servicio de Botón de Pánico está disponible como suscripción premium. ¿Te gustaría conocer más?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Ver planes', onPress: () => {} }
            ]
          )}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.emergencyGradient}
          >
            <Text style={styles.emergencyIcon}>🚨</Text>
            <View style={styles.emergencyTextContainer}>
              <Text style={styles.emergencyTitle}>Botón de Pánico</Text>
              <Text style={styles.emergencySubtitle}>Protección personal 24/7</Text>
            </View>
            <View style={styles.emergencyBadge}>
              <Text style={styles.emergencyBadgeText}>Premium</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>ISSY Resident App v1.0.0</Text>
          <Text style={styles.appCopyright}>© 2024 ISSY. Todos los derechos reservados.</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
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
    backgroundColor: '#FFFFFF',
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
    color: '#1F2937',
    marginBottom: 2,
  },
  contactSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  // FAQ Section
  faqSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
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
    color: '#1F2937',
    flex: 1,
    paddingRight: 12,
  },
  faqArrow: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6B7280',
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
    color: '#FFFFFF',
  },
  emergencySubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  emergencyBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emergencyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // App Info
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  appVersion: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  appCopyright: {
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 4,
  },
});