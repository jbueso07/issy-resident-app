// src/components/QRShareCard.js
// ISSY Resident App - Componente de QR Compartible con Diseño Premium

import React, { forwardRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';

// Días de la semana para mostrar
const WEEKDAYS_MAP = {
  'monday': 'L',
  'tuesday': 'M',
  'wednesday': 'M',
  'thursday': 'J',
  'friday': 'V',
  'saturday': 'S',
  'sunday': 'D',
};

const QRShareCard = forwardRef(({ qr, hostName = 'Residente ISSY', communityName = 'Mi Comunidad' }, ref) => {
  
  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    });
  };

  // Formatear hora
  const formatTime = (timeString) => {
    if (!timeString) return '';
    // Si ya viene en formato HH:MM
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes}${ampm}`;
    }
    return timeString;
  };

  // Obtener texto de validez según tipo
  const getValidityText = () => {
    if (qr.qr_type === 'single') {
      return formatDate(qr.valid_from);
    } else if (qr.qr_type === 'temporary') {
      return `${formatDate(qr.valid_from)} - ${formatDate(qr.valid_until)}`;
    } else if (qr.qr_type === 'frequent') {
      // Mostrar días
      let days = [];
      if (qr.access_days) {
        try {
          const parsed = typeof qr.access_days === 'string' 
            ? JSON.parse(qr.access_days) 
            : qr.access_days;
          days = parsed.map(d => WEEKDAYS_MAP[d] || d).join('-');
        } catch {
          days = 'L-M-M-J-V-S-D';
        }
      } else {
        days = 'L-M-M-J-V-S-D';
      }
      return days;
    }
    return '';
  };

  // Obtener horario
  const getTimeText = () => {
    if (qr.is_24_7) return '24 Horas';
    if (qr.access_time_start && qr.access_time_end) {
      return `${formatTime(qr.access_time_start)} - ${formatTime(qr.access_time_end)}`;
    }
    if (qr.qr_type === 'single' && qr.valid_from) {
      const date = new Date(qr.valid_from);
      return date.toLocaleTimeString('es-HN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
    return '';
  };

  // Obtener label y color del tipo
  const getTypeInfo = () => {
    switch (qr.qr_type) {
      case 'single':
        return { label: 'USO ÚNICO', icon: '1️⃣', color: '#EF4444' };
      case 'temporary':
        return { label: 'TEMPORAL', icon: '📅', color: '#F59E0B' };
      case 'frequent':
        return { label: 'FRECUENTE', icon: '🔄', color: '#10B981' };
      default:
        return { label: 'ACCESO', icon: '🔑', color: '#6366F1' };
    }
  };

  const typeInfo = getTypeInfo();
  const qrValue = qr.qr_code || qr.id;

  return (
    <View ref={ref} style={styles.container} collapsable={false}>
      {/* Header con degradado */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#A855F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Logo y Tipo */}
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>ISSY</Text>
            <Text style={styles.logoSubtext}>Control de Acceso</Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: typeInfo.color }]}>
            <Text style={styles.typeBadgeText}>{typeInfo.label}</Text>
          </View>
        </View>

        {/* Nombre del visitante */}
        <Text style={styles.visitorName}>{qr.visitor_name}</Text>
        <Text style={styles.welcomeText}>¡Te esperamos!</Text>

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>ANFITRIÓN</Text>
            <Text style={styles.infoValue}>{hostName}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>UBICACIÓN</Text>
            <Text style={styles.infoValue}>{communityName}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>VÁLIDO</Text>
            <Text style={styles.infoValue}>{getValidityText()}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>HORARIO</Text>
            <Text style={styles.infoValue}>{getTimeText()}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* QR Code Section */}
      <View style={styles.qrSection}>
        <View style={styles.qrContainer}>
          <QRCode
            value={qrValue}
            size={180}
            color="#1F2937"
            backgroundColor="#FFFFFF"
            logo={require('../../assets/icon.png')}
            logoSize={40}
            logoBackgroundColor="#FFFFFF"
            logoMargin={4}
            logoBorderRadius={8}
          />
        </View>
        
        <Text style={styles.qrCode}>{qrValue.substring(0, 16)}</Text>
        
        <View style={styles.instructionBox}>
          <Text style={styles.instructionIcon}>📱</Text>
          <Text style={styles.instructionText}>
            Muestra este código al guardia en la entrada
          </Text>
        </View>
      </View>

      {/* Footer con degradado */}
      <LinearGradient
        colors={['#8B5CF6', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.footer}
      >
        <View style={styles.footerContent}>
          <View style={styles.rulesContainer}>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleIcon}>🚗</Text>
              <Text style={styles.ruleText}>20 km/h</Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleIcon}>🚭</Text>
              <Text style={styles.ruleText}>No fumar</Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleIcon}>🔇</Text>
              <Text style={styles.ruleText}>Silencio</Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleIcon}>🐕</Text>
              <Text style={styles.ruleText}>Mascotas</Text>
            </View>
          </View>
          
          <View style={styles.brandingContainer}>
            <Text style={styles.poweredBy}>Powered by</Text>
            <Text style={styles.brandName}>ISSY</Text>
            <Text style={styles.website}>joinissy.com</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
});

// Versión simplificada sin logo (para cuando no existe el asset)
export const QRShareCardSimple = forwardRef(({ qr, hostName = 'Residente ISSY', communityName = 'Mi Comunidad' }, ref) => {
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes}${ampm}`;
    }
    return timeString;
  };

  const getValidityText = () => {
    if (qr.qr_type === 'single') {
      return formatDate(qr.valid_from);
    } else if (qr.qr_type === 'temporary') {
      return `${formatDate(qr.valid_from)} - ${formatDate(qr.valid_until)}`;
    } else if (qr.qr_type === 'frequent') {
      let days = [];
      if (qr.access_days) {
        try {
          const parsed = typeof qr.access_days === 'string' 
            ? JSON.parse(qr.access_days) 
            : qr.access_days;
          days = parsed.map(d => WEEKDAYS_MAP[d] || d).join('-');
        } catch {
          days = 'L-M-M-J-V-S-D';
        }
      } else {
        days = 'L-M-M-J-V-S-D';
      }
      return days;
    }
    return '';
  };

  const getTimeText = () => {
    if (qr.is_24_7) return '24 Horas';
    if (qr.access_time_start && qr.access_time_end) {
      return `${formatTime(qr.access_time_start)} - ${formatTime(qr.access_time_end)}`;
    }
    if (qr.qr_type === 'single' && qr.valid_from) {
      const date = new Date(qr.valid_from);
      return date.toLocaleTimeString('es-HN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
    return '';
  };

  const getTypeInfo = () => {
    switch (qr.qr_type) {
      case 'single':
        return { label: 'USO ÚNICO', color: '#EF4444' };
      case 'temporary':
        return { label: 'TEMPORAL', color: '#F59E0B' };
      case 'frequent':
        return { label: 'FRECUENTE', color: '#10B981' };
      default:
        return { label: 'ACCESO', color: '#6366F1' };
    }
  };

  const typeInfo = getTypeInfo();
  const qrValue = qr.qr_code || qr.id;

  return (
    <View ref={ref} style={styles.container} collapsable={false}>
      {/* Header con degradado */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#A855F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>ISSY</Text>
            <Text style={styles.logoSubtext}>Control de Acceso</Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: typeInfo.color }]}>
            <Text style={styles.typeBadgeText}>{typeInfo.label}</Text>
          </View>
        </View>

        <Text style={styles.visitorName}>{qr.visitor_name}</Text>
        <Text style={styles.welcomeText}>¡Te esperamos!</Text>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>ANFITRIÓN</Text>
            <Text style={styles.infoValue}>{hostName}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>UBICACIÓN</Text>
            <Text style={styles.infoValue}>{communityName}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>VÁLIDO</Text>
            <Text style={styles.infoValue}>{getValidityText()}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>HORARIO</Text>
            <Text style={styles.infoValue}>{getTimeText()}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* QR Code Section */}
      <View style={styles.qrSection}>
        <View style={styles.qrContainer}>
          <View style={styles.qrLogoOverlay}>
            <Text style={styles.qrLogoText}>ISSY</Text>
          </View>
          <QRCode
            value={qrValue}
            size={180}
            color="#1F2937"
            backgroundColor="#FFFFFF"
          />
        </View>
        
        <Text style={styles.qrCode}>{qrValue.substring(0, 16)}</Text>
        
        <View style={styles.instructionBox}>
          <Text style={styles.instructionIcon}>📱</Text>
          <Text style={styles.instructionText}>
            Muestra este código al guardia en la entrada
          </Text>
        </View>
      </View>

      {/* Footer */}
      <LinearGradient
        colors={['#8B5CF6', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.footer}
      >
        <View style={styles.footerContent}>
          <View style={styles.rulesContainer}>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleIcon}>🚗</Text>
              <Text style={styles.ruleText}>20 km/h</Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleIcon}>🚭</Text>
              <Text style={styles.ruleText}>No fumar</Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleIcon}>🔇</Text>
              <Text style={styles.ruleText}>Silencio</Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleIcon}>🐕</Text>
              <Text style={styles.ruleText}>Mascotas</Text>
            </View>
          </View>
          
          <View style={styles.brandingContainer}>
            <Text style={styles.poweredBy}>Powered by</Text>
            <Text style={styles.brandName}>ISSY</Text>
            <Text style={styles.website}>joinissy.com</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    padding: 24,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  logoContainer: {
    flexDirection: 'column',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  logoSubtext: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  visitorName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 20,
  },
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  qrSection: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
  },
  qrLogoOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -12 }],
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qrLogoText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 1,
  },
  qrCode: {
    marginTop: 16,
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  instructionIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  instructionText: {
    fontSize: 12,
    color: '#4B5563',
    flex: 1,
  },
  footer: {
    padding: 20,
  },
  footerContent: {
    alignItems: 'center',
  },
  rulesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  ruleItem: {
    alignItems: 'center',
  },
  ruleIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  ruleText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  brandingContainer: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 12,
    width: '100%',
  },
  poweredBy: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  website: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
});

export default QRShareCard;