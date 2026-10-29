// app/my-unit.js - Mi Unidad / Mis Organizaciones - ProHome Dark Theme
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, RefreshControl, Dimensions, Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useUserLocation } from '../src/context/UserLocationContext';
import * as Clipboard from 'expo-clipboard';
import { getMyOrganizations, switchOrganization, getMyHouseCode } from '../src/services/api';
import { useTranslation } from 'react-i18next';
import { neu } from '../src/theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ProHome Dark Theme Colors
const COLORS = {
  background: neu.bg,
  backgroundSecondary: neu.raised,
  backgroundTertiary: neu.sunken,
  card: neu.raised,
  cardBorder: neu.border,
  teal: neu.teal,
  lime: neu.teal,
  purple: neu.lilac,
  textPrimary: neu.text,
  textSecondary: neu.textLabel,
  textMuted: neu.textSoft,
  green: neu.teal,
  red: neu.coral,
};

export default function MyUnitScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const { selectedLocationId, selectLocation } = useUserLocation();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [switching, setSwitching] = useState(null);
  const [houseCode, setHouseCode] = useState(null); // { code, location_name } solo si la residencial usa códigos
  const [codeCopied, setCodeCopied] = useState(false);

  // Recarga al abrir y al cambiar de residencial (desde el carrusel del home o desde aquí)
  useEffect(() => {
    loadOrganizations();
  }, [selectedLocationId]);

  // Código de la casa: se recarga al cambiar de residencial; sin código no se muestra la tarjeta
  const houseCodeRequestRef = useRef(0);
  useEffect(() => {
    const requestId = ++houseCodeRequestRef.current;
    setHouseCode(null);
    (async () => {
      const res = await getMyHouseCode({ locationId: selectedLocationId });
      if (requestId !== houseCodeRequestRef.current) return;
      setHouseCode(res.success && res.data?.code ? res.data : null);
    })();
  }, [selectedLocationId]);

  const copyHouseCode = async () => {
    if (!houseCode?.code) return;
    try {
      await Clipboard.setStringAsync(houseCode.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (e) {
      // sin portapapeles no pasa nada: el código sigue a la vista
    }
  };

  const shareHouseCode = async () => {
    if (!houseCode?.code) return;
    try {
      await Share.share({
        message: t('myUnit.houseCodeShareMessage', {
          location: houseCode.location_name || '',
          code: houseCode.code,
        }),
      });
    } catch (e) {
      // el usuario cerró la hoja de compartir
    }
  };

  // Solo cuenta la respuesta más reciente (al cambiar rápido de residencial)
  const loadRequestIdRef = useRef(0);
  const loadOrganizations = async () => {
    const requestId = ++loadRequestIdRef.current;
    setLoading(true);
    const res = await getMyOrganizations();
    if (requestId !== loadRequestIdRef.current) return;
    if (res.success) {
      setOrganizations(res.data || []);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrganizations();
    setRefreshing(false);
  };

  const handleSwitch = async (org) => {
    if (org.is_active) return;
    
    setSwitching(org.location?.id);
    const res = await switchOrganization(org.location?.id);
    setSwitching(null);
    
    if (res.success) {
      Alert.alert(t('myUnit.switchSuccess.title'), t('myUnit.switchSuccess.message', { name: org.location?.name }));
      // Igual que el carrusel del home: sincronizar la residencial activa de la app y el perfil
      // (refreshUser no existe en AuthContext, era un no-op). selectLocation dispara la recarga.
      await selectLocation(org.location?.id);
      refreshProfile?.();
      loadOrganizations();
    } else {
      Alert.alert(t('common.error'), res.error);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'residential': return 'home';
      case 'commercial': return 'business';
      case 'industrial': return 'construct';
      case 'office': return 'briefcase';
      default: return 'location';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return t('myUnit.roles.admin');
      case 'guard': return t('myUnit.roles.guard');
      case 'resident': return t('myUnit.roles.resident');
      case 'employee': return t('myUnit.roles.employee');
      default: return role;
    }
  };

  // La residencial activa de la app (la del carrusel) manda; sin coincidencia, se usa la regla de antes
  const activeOrg =
    organizations.find(o => selectedLocationId && o.location?.id === selectedLocationId) ||
    organizations.find(o => o.is_active) ||
    organizations.find(o => o.deactivation_reason) ||
    organizations[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('myUnit.title')}</Text>
        <TouchableOpacity onPress={() => router.push('/join-community')} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={COLORS.lime} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.purple} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.purple} />
            <Text style={styles.loadingText}>{t('myUnit.loading')}</Text>
          </View>
        ) : organizations.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="home" size={scale(48)} color={COLORS.teal} />
            </View>
            <Text style={styles.emptyTitle}>{t('myUnit.empty.title')}</Text>
            <Text style={styles.emptyText}>
              {t('myUnit.empty.text')}
            </Text>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => router.push('/join-community')}
            >
              <Ionicons name="add-circle" size={20} color={COLORS.background} />
              <Text style={styles.joinButtonText}>{t('myUnit.empty.joinButton')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Organización Activa */}
            {activeOrg && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('myUnit.activeLocation')}</Text>
                <View style={styles.activeCard}>
                  <View style={styles.activeHeader}>
                    <View style={styles.activeIconContainer}>
                      <Ionicons name={getTypeIcon(activeOrg.location?.type)} size={scale(28)} color={COLORS.teal} />
                    </View>
                    <View style={styles.activeInfo}>
                      <Text style={styles.activeName}>{activeOrg.location?.name}</Text>
                      <Text style={styles.activeAddress}>{activeOrg.location?.address || t('myUnit.noAddress')}</Text>
                    </View>
                    {activeOrg.deactivation_reason ? (
                      <View style={[styles.activeBadge, { backgroundColor: neu.coral + '26' }]}>
                        <Ionicons name="alert-circle" size={16} color={COLORS.red} />
                        <Text style={[styles.activeBadgeText, { color: COLORS.red }]}>{t('myUnit.suspended')}</Text>
                      </View>
                    ) : (
                      <View style={styles.activeBadge}>
                        {activeOrg.deactivation_reason && (
                    <View style={{ backgroundColor: neu.coral + '1A', padding: scale(12), borderRadius: scale(8), marginTop: scale(12) }}>
                      <Text style={{ color: COLORS.red, fontSize: scale(13), textAlign: 'center' }}>
                        ⚠️ {activeOrg.deactivation_reason}
                      </Text>
                      <Text style={{ color: COLORS.textSecondary, fontSize: scale(11), textAlign: 'center', marginTop: scale(4) }}>
                        {t('myUnit.contactAdmin')}
                      </Text>
                    </View>
                  )}
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
                        <Text style={styles.activeBadgeText}>{t('myUnit.activeBadge')}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.activeDetails}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>{t('myUnit.details.myRole')}</Text>
                      <Text style={styles.detailValue}>{getRoleLabel(activeOrg.role)}</Text>
                    </View>
                    {activeOrg.unit_number && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>{t('myUnit.details.unit')}</Text>
                        <Text style={styles.detailValue}>{activeOrg.unit_number}</Text>
                      </View>
                    )}
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>{t('myUnit.details.memberSince')}</Text>
                      <Text style={styles.detailValue}>
                        {new Date(activeOrg.joined_at || activeOrg.created_at).toLocaleDateString('es', { month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>

                  {activeOrg.admin_name && (
                    <View style={styles.adminInfo}>
                      <Ionicons name="person-circle" size={20} color={COLORS.textSecondary} />
                      <Text style={styles.adminText}>
                        Admin: {activeOrg.admin_name} {activeOrg.admin_phone && `• ${activeOrg.admin_phone}`}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Código de la casa para visitas (solo si la residencial usa códigos) */}
            {!!houseCode?.code && (
              <View style={styles.section}>
                <View style={styles.codeCard}>
                  <Text style={styles.codeCardTitle}>{t('myUnit.houseCodeTitle')}</Text>
                  <Text style={styles.codeCardValue} accessibilityLabel={houseCode.code.split('').join(' ')}>{houseCode.code}</Text>
                  <Text style={styles.codeCardHelp}>{t('myUnit.houseCodeHelp')}</Text>
                  <View style={styles.codeCardActions}>
                    <TouchableOpacity style={styles.codeCardBtn} onPress={copyHouseCode}>
                      <Ionicons name={codeCopied ? 'checkmark' : 'copy-outline'} size={scale(18)} color={COLORS.teal} />
                      <Text style={styles.codeCardBtnText}>{codeCopied ? t('myUnit.houseCodeCopied') : t('myUnit.houseCodeCopy')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.codeCardBtn, styles.codeCardBtnPrimary]} onPress={shareHouseCode}>
                      <Ionicons name="share-outline" size={scale(18)} color={COLORS.background} />
                      <Text style={[styles.codeCardBtnText, { color: COLORS.background }]}>{t('myUnit.houseCodeShare')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Otras Organizaciones */}
            {organizations.filter(o => !o.is_active && o !== activeOrg).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('myUnit.otherCommunities')}</Text>
                {organizations.filter(o => !o.is_active && o !== activeOrg).map((org) => (
                  <TouchableOpacity
                    key={org.location?.id}
                    style={styles.orgCard}
                    onPress={() => handleSwitch(org)}
                    disabled={switching === org.location?.id}
                  >
                    <View style={styles.orgIcon}>
                      <Ionicons name={getTypeIcon(org.location?.type)} size={scale(22)} color={COLORS.teal} />
                    </View>
                    <View style={styles.orgInfo}>
                      <Text style={styles.orgName}>{org.location?.name}</Text>
                      <Text style={styles.orgRole}>{getRoleLabel(org.role)}</Text>
                    </View>
                    {switching === org.location?.id ? (
                      <ActivityIndicator size="small" color={COLORS.purple} />
                    ) : (
                      <View style={styles.switchBtn}>
                        <Text style={styles.switchBtnText}>{t('myUnit.switch')}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Botón Unirse */}
            <TouchableOpacity
              style={styles.addOrgButton}
              onPress={() => router.push('/join-community')}
            >
              <Ionicons name="add-circle-outline" size={22} color={COLORS.lime} />
              <Text style={styles.addOrgText}>{t('myUnit.joinAnother')}</Text>
            </TouchableOpacity>
          </>
        )}
        
        <View style={{ height: scale(100) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(16), paddingVertical: scale(12) },
  backBtn: { width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
  headerTitle: { fontSize: scale(18), fontWeight: '600', color: COLORS.textPrimary },
  addBtn: { width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },

  content: { flex: 1 },
  
  // Loading
  loadingContainer: { alignItems: 'center', paddingVertical: scale(60) },
  loadingText: { marginTop: scale(12), color: COLORS.textSecondary, fontSize: scale(14) },
  
  section: { padding: scale(16) },
  sectionTitle: { fontSize: scale(14), fontWeight: '600', color: COLORS.textSecondary, marginBottom: scale(12), textTransform: 'uppercase', letterSpacing: 0.5 },

  // Código de casa
  codeCard: { backgroundColor: COLORS.card, borderRadius: scale(16), padding: scale(16), borderWidth: 1, borderColor: COLORS.cardBorder, alignItems: 'center' },
  codeCardTitle: { fontSize: scale(14), fontWeight: '600', color: COLORS.textSecondary },
  codeCardValue: { fontSize: scale(44), fontWeight: '800', letterSpacing: 8, color: COLORS.teal, marginVertical: scale(10) },
  codeCardHelp: { fontSize: scale(12), color: COLORS.textMuted, textAlign: 'center' },
  codeCardActions: { flexDirection: 'row', gap: scale(10), marginTop: scale(14) },
  codeCardBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(6), paddingHorizontal: scale(14), paddingVertical: scale(10), borderRadius: scale(12), backgroundColor: COLORS.backgroundTertiary },
  codeCardBtnPrimary: { backgroundColor: COLORS.teal },
  codeCardBtnText: { fontSize: scale(13), fontWeight: '600', color: COLORS.teal },

  // Active Card
  activeCard: { backgroundColor: COLORS.card, borderRadius: scale(16), padding: scale(16), borderWidth: 1, borderColor: COLORS.cardBorder },
  activeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(16) },
  activeIconContainer: { width: scale(56), height: scale(56), borderRadius: scale(16), backgroundColor: neu.teal + '26', alignItems: 'center', justifyContent: 'center', marginRight: scale(12) },
  activeInfo: { flex: 1 },
  activeName: { fontSize: scale(18), fontWeight: '700', color: COLORS.textPrimary },
  activeAddress: { fontSize: scale(14), color: COLORS.textSecondary, marginTop: scale(2) },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: scale(4), backgroundColor: neu.teal + '26', paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(12) },
  activeBadgeText: { fontSize: scale(12), fontWeight: '600', color: COLORS.green },
  
  activeDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(12), paddingTop: scale(16), borderTopWidth: 1, borderTopColor: COLORS.cardBorder },
  detailItem: { minWidth: '30%' },
  detailLabel: { fontSize: scale(12), color: COLORS.textSecondary },
  detailValue: { fontSize: scale(14), fontWeight: '600', color: COLORS.textPrimary, marginTop: scale(2) },
  
  adminInfo: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginTop: scale(16), paddingTop: scale(12), borderTopWidth: 1, borderTopColor: COLORS.cardBorder },
  adminText: { fontSize: scale(13), color: COLORS.textSecondary },

  // Org Card
  orgCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: scale(14), borderRadius: scale(12), marginBottom: scale(10), borderWidth: 1, borderColor: COLORS.cardBorder },
  orgIcon: { width: scale(44), height: scale(44), borderRadius: scale(12), backgroundColor: neu.teal + '26', alignItems: 'center', justifyContent: 'center' },
  orgInfo: { flex: 1, marginLeft: scale(12) },
  orgName: { fontSize: scale(15), fontWeight: '600', color: COLORS.textPrimary },
  orgRole: { fontSize: scale(13), color: COLORS.textSecondary, marginTop: scale(2) },
  switchBtn: { backgroundColor: neu.lilac + '26', paddingHorizontal: scale(14), paddingVertical: scale(8), borderRadius: scale(8) },
  switchBtnText: { fontSize: scale(13), fontWeight: '600', color: COLORS.purple },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: scale(80), paddingHorizontal: scale(32) },
  emptyIconContainer: { width: scale(100), height: scale(100), borderRadius: scale(50), backgroundColor: COLORS.backgroundTertiary, alignItems: 'center', justifyContent: 'center', marginBottom: scale(24), borderWidth: 1, borderColor: COLORS.cardBorder },
  emptyTitle: { fontSize: scale(20), fontWeight: '700', color: COLORS.textPrimary, marginBottom: scale(8) },
  emptyText: { fontSize: scale(15), color: COLORS.textSecondary, textAlign: 'center', marginBottom: scale(24) },
  joinButton: { flexDirection: 'row', alignItems: 'center', gap: scale(8), backgroundColor: COLORS.lime, paddingHorizontal: scale(24), paddingVertical: scale(14), borderRadius: scale(12) },
  joinButtonText: { color: COLORS.background, fontSize: scale(16), fontWeight: '600' },

  // Add org button
  addOrgButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8), padding: scale(16), margin: scale(16), borderRadius: scale(12), borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.lime },
  addOrgText: { fontSize: scale(15), fontWeight: '500', color: COLORS.lime },
});