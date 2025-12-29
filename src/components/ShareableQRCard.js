// src/components/ShareableQRCard.js
// ISSY - Tarjeta QR Compartible (Diseño Aprobado)

import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';

// Colores del diseño aprobado
const COLORS = {
  // Fondos
  bgGradientStart: '#E3F2EE',
  bgGradientMid: '#EDF5F3',
  bgGradientEnd: '#F5F9F8',
  
  // Textos
  textPrimary: '#1A3D4D',
  textSecondary: '#3D5A6C',
  textMuted: '#7A9E9E',
  textLight: '#6B8A8A',
  
  // Cards
  cardBg: 'rgba(255, 255, 255, 0.75)',
  cardBorder: 'rgba(255, 255, 255, 0.9)',
  infoBg: 'rgba(255, 255, 255, 0.7)',
  
  // Pills
  pillBg: 'rgba(255, 255, 255, 0.6)',
  pillActiveBg: '#1A3D4D',
  pillActiveEnd: '#2D5466',
  
  // Días
  dayInactive: '#E3EAEB',
  dayInactiveText: '#A0B5B5',
  
  // Otros
  white: '#FFFFFF',
  manualCodeBg: 'rgba(26, 61, 77, 0.05)',
  iconBgStart: '#E8EDEF',
  iconBgEnd: '#D8E2E5',
};

// Mapeo de días
const DAYS_ORDER = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const WEEKDAYS_MAP = {
  'monday': 0,
  'tuesday': 1,
  'wednesday': 2,
  'thursday': 3,
  'friday': 4,
  'saturday': 5,
  'sunday': 6,
};

// Helpers
const formatTimeFromString = (timeString) => {
  if (!timeString) return '';
  if (timeString.includes(':')) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }
  return timeString;
};

const formatDateShort = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = date.getDate();
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const getActiveDays = (accessDays) => {
  if (!accessDays) return [true, true, true, true, true, true, true];
  
  try {
    const parsed = typeof accessDays === 'string' ? JSON.parse(accessDays) : accessDays;
    const activeDays = [false, false, false, false, false, false, false];
    
    parsed.forEach(day => {
      const index = WEEKDAYS_MAP[day];
      if (index !== undefined) {
        activeDays[index] = true;
      }
    });
    
    return activeDays;
  } catch {
    return [true, true, true, true, true, true, true];
  }
};

const getQRTypeLabel = (type) => {
  switch (type) {
    case 'single': return 'Único';
    case 'temporary': return 'Temporal';
    case 'frequent': return 'Frecuente';
    default: return type;
  }
};

// Componente InfoCard
const InfoCard = ({ icon, label, children, style }) => (
  <View style={[styles.infoCard, style]}>
    <View style={styles.infoCardIcon}>
      <Ionicons name={icon} size={16} color={COLORS.textPrimary} />
    </View>
    <Text style={styles.infoCardLabel}>{label}</Text>
    {children}
  </View>
);

// Componente DayPill
const DayPill = ({ day, active }) => (
  <View style={[styles.dayPill, active && styles.dayPillActive]}>
    <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>{day}</Text>
  </View>
);

// Componente Principal
const ShareableQRCard = forwardRef(({ 
  qr, 
  hostName = 'Residente', 
  communityName = 'Mi Comunidad',
  houseNumber = 'N/A',
}, ref) => {
  
  if (!qr) return null;
  
  const qrType = qr.qr_type || 'single';
  const isUnique = qrType === 'single';
  const activeDays = getActiveDays(qr.access_days);
  
  // Formatear horario
  const getTimeDisplay = () => {
    if (qr.is_24_7) return '24 Horas';
    if (qr.access_time_start && qr.access_time_end) {
      return `${formatTimeFromString(qr.access_time_start)}\n${formatTimeFromString(qr.access_time_end)}`;
    }
    if (isUnique && qr.valid_from) {
      const date = new Date(qr.valid_from);
      return date.toLocaleTimeString('es-HN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
    return '24 Horas';
  };
  
  // Formatear fecha
  const getDateDisplay = () => {
    if (isUnique) {
      return formatDateShort(qr.valid_from);
    }
    return formatDateShort(qr.valid_until);
  };
  
  // Código manual (primeros 8-10 caracteres)
  const manualCode = (qr.qr_code || qr.id || '').substring(0, 10).toUpperCase();
  
  return (
    <View ref={ref} style={styles.container} collapsable={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.visitorName}>{qr.visitor_name}</Text>
        <Text style={styles.communityName}>{communityName}</Text>
        <Text style={styles.authorizedBy}>
          Autoriza: <Text style={styles.authorizedByName}>{hostName}</Text>
        </Text>
      </View>
      
      {/* QR Type Pills */}
      <View style={styles.qrTypeSelector}>
        {['single', 'temporary', 'frequent'].map((type) => (
          <View 
            key={type} 
            style={[
              styles.qrTypePill, 
              qrType === type && styles.qrTypePillActive
            ]}
          >
            <Text style={[
              styles.qrTypePillText, 
              qrType === type && styles.qrTypePillTextActive
            ]}>
              {getQRTypeLabel(type)}
            </Text>
          </View>
        ))}
      </View>
      
      {/* QR Card */}
      <View style={styles.qrCard}>
        <View style={styles.qrContainer}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={qr.qr_code || qr.id || 'ISSY'}
              size={220}
              backgroundColor="white"
              color={COLORS.textPrimary}
            />
          </View>
        </View>
        
        <View style={styles.qrFooter}>
          <View style={styles.manualCodeSection}>
            <Text style={styles.manualCodeLabel}>CÓDIGO MANUAL</Text>
            <Text style={styles.manualCode}>{manualCode}</Text>
          </View>
          <Text style={styles.showGuard}>Mostrar al guardia</Text>
        </View>
      </View>
      
      {/* Info Cards */}
      {isUnique ? (
        // QR Único: 3 cards en fila
        <View style={styles.infoRow}>
          <InfoCard icon="time-outline" label="HORARIO">
            <Text style={styles.infoCardValue}>{getTimeDisplay()}</Text>
          </InfoCard>
          <InfoCard icon="home-outline" label="CASA">
            <Text style={styles.infoCardValue}>{houseNumber}</Text>
          </InfoCard>
          <InfoCard icon="calendar-outline" label="FECHA">
            <Text style={styles.infoCardValue}>{getDateDisplay()}</Text>
          </InfoCard>
        </View>
      ) : (
        // QR Temporal/Frecuente: Días arriba + 3 cards abajo
        <>
          {/* Fila de días */}
          <View style={styles.daysRow}>
            <Text style={styles.daysRowLabel}>DÍAS DE ACCESO</Text>
            <View style={styles.daysRowPills}>
              {DAYS_ORDER.map((day, index) => (
                <DayPill key={index} day={day} active={activeDays[index]} />
              ))}
            </View>
          </View>
          
          {/* 3 Info Cards */}
          <View style={styles.infoRow}>
            <InfoCard icon="time-outline" label="HORARIO">
              <Text style={styles.infoCardValue}>{getTimeDisplay()}</Text>
            </InfoCard>
            <InfoCard icon="home-outline" label="CASA">
              <Text style={styles.infoCardValue}>{houseNumber}</Text>
            </InfoCard>
            <InfoCard icon="checkmark-circle-outline" label="VÁLIDO">
              <Text style={styles.infoCardValue}>{getDateDisplay()}</Text>
            </InfoCard>
          </View>
        </>
      )}
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.poweredBy}>Powered by</Text>
        {/* Logo como texto estilizado ya que no tenemos el asset en el bundle */}
        <Text style={styles.logoText}>issy</Text>
        <Text style={styles.website}>www.joinissy.com</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 375,
    backgroundColor: COLORS.bgGradientStart,
    borderRadius: 44,
    padding: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  
  // Header
  header: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  visitorName: {
    fontSize: 34,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  communityName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  authorizedBy: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  authorizedByName: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  
  // QR Type Selector
  qrTypeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 18,
  },
  qrTypePill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.pillBg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  qrTypePillActive: {
    backgroundColor: COLORS.pillActiveBg,
    borderColor: 'rgba(26, 61, 77, 0.3)',
  },
  qrTypePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  qrTypePillTextActive: {
    color: COLORS.white,
  },
  
  // QR Card
  qrCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },
  qrWrapper: {
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  qrFooter: {
    gap: 10,
  },
  manualCodeSection: {
    backgroundColor: COLORS.manualCodeBg,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(26, 61, 77, 0.08)',
  },
  manualCodeLabel: {
    fontSize: 10,
    color: '#8AABAB',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  manualCode: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  showGuard: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  
  // Info Cards
  infoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.infoBg,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  infoCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: COLORS.iconBgStart,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  infoCardLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  infoCardValue: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
  },
  
  // Days Row (para temporal/frecuente)
  daysRow: {
    backgroundColor: COLORS.infoBg,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  daysRowLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  daysRowPills: {
    flexDirection: 'row',
    gap: 4,
  },
  
  // Days Pills
  daysContainer: {
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'center',
    marginTop: 2,
  },
  dayPill: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: COLORS.dayInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillActive: {
    backgroundColor: COLORS.pillActiveBg,
  },
  dayPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.dayInactiveText,
  },
  dayPillTextActive: {
    color: COLORS.white,
  },
  
  // Footer
  footer: {
    alignItems: 'center',
  },
  poweredBy: {
    fontSize: 10,
    color: '#9CBBBB',
    fontWeight: '500',
    marginBottom: 6,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  website: {
    fontSize: 10,
    color: '#5A7A7A',
    fontWeight: '500',
  },
});

export default ShareableQRCard;