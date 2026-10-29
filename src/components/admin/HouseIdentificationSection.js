// src/components/admin/HouseIdentificationSection.js
// ISSY - Ajustes → Residencial → Control de acceso: cómo identifica el guardia a la casa
// (número de casa / código numérico / nombre) y los códigos de casa. Todo se guarda al instante.

import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, TextInput, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { neu } from '../../theme/tokens';
import {
  getHouseIdentification,
  setHouseIdentification,
  getHouseCodes,
  setHouseCode,
  regenerateHouseCode,
  regenerateAllHouseCodes,
} from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const COLLAPSED_COUNT = 8;
const MODES = ['unit', 'code', 'name'];

export default function HouseIdentificationSection({ locationId }) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null); // { mode, showName, codeLength, suggestedLength }
  const [saving, setSaving] = useState(false);
  const [confirmedMode, setConfirmedMode] = useState(null); // modo confirmado por el SERVIDOR (no el optimista)
  const [codes, setCodes] = useState(null); // { houses, codeLength, suggestedLength }
  const [codesError, setCodesError] = useState(false);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [busyKey, setBusyKey] = useState(null);

  const applySettings = (data) => {
    setConfirmedMode(data.mode || 'unit');
    setSettings({
      mode: data.mode || 'unit',
      showName: data.show_resident_name === true,
      codeLength: data.code_length || null,
      suggestedLength: data.suggested_length || null,
    });
  };

  const showError = (res) =>
    Alert.alert(t('common.error'), res?.error || t('admin.settings.errors.saveFailed'));

  const loadSettings = useCallback(async () => {
    if (!locationId) return;
    const res = await getHouseIdentification(locationId);
    if (res.success) applySettings(res.data);
    else setSettings(null);
  }, [locationId]);

  const loadCodes = useCallback(async () => {
    if (!locationId) return;
    setLoadingCodes(true);
    setCodesError(false);
    const res = await getHouseCodes(locationId);
    setLoadingCodes(false);
    if (res.success) {
      setCodes({
        houses: res.data.houses || [],
        codeLength: res.data.code_length || null,
        suggestedLength: res.data.suggested_length || null,
      });
    } else {
      setCodes(null);
      setCodesError(true);
    }
  }, [locationId]);

  useEffect(() => {
    setSettings(null);
    setConfirmedMode(null);
    setCodes(null);
    setCodesError(false);
    setEditingKey(null);
    loadSettings();
  }, [loadSettings]);

  // Los códigos se piden solo cuando el servidor confirma modo 'code': así nunca corren a la vez el PUT del modo y este GET
  useEffect(() => {
    if (confirmedMode === 'code') loadCodes();
    else {
      setCodes(null);
      setCodesError(false);
    }
  }, [confirmedMode, loadCodes]);

  // Guardar al instante; si falla vuelve al valor anterior
  const save = async (changes, optimistic) => {
    if (saving || !settings) return;
    const previous = settings;
    setSettings({ ...settings, ...optimistic });
    setSaving(true);
    const res = await setHouseIdentification(locationId, changes);
    setSaving(false);
    if (res.success) applySettings(res.data);
    else {
      setSettings(previous);
      showError(res);
    }
  };

  const handleModeChange = (next) => {
    if (next === settings.mode) return;
    save({ mode: next }, { mode: next });
  };

  const handleShowNameChange = (value) => save({ show_resident_name: value }, { showName: value });

  const startEdit = (house) => {
    setEditingKey(house.house_key);
    setEditValue(house.code || '');
  };

  const saveEdit = async (house) => {
    const length = codes?.codeLength;
    const value = editValue.trim();
    if (!/^[1-9]\d*$/.test(value) || (length && value.length !== length)) {
      Alert.alert(t('common.error'), t('admin.settings.location.houseCodeInvalidLength', { length: length || 4 }));
      return;
    }
    setBusyKey(house.house_key);
    const res = await setHouseCode(locationId, house.house_key, value);
    setBusyKey(null);
    if (res.success) {
      setCodes((prev) => ({ ...prev, houses: prev.houses.map((h) => (h.house_key === house.house_key ? { ...h, code: res.data.code } : h)) }));
      setEditingKey(null);
    } else {
      showError(res); // 400/409: mensaje del backend
    }
  };

  const confirmRegenerate = (house) => {
    Alert.alert(
      t('admin.settings.location.houseCodeRegenerateTitle'),
      t('admin.settings.location.houseCodeRegenerateMessage', { unit: house.unit }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.settings.location.houseCodeRegenerate'),
          style: 'destructive',
          onPress: async () => {
            setBusyKey(house.house_key);
            const res = await regenerateHouseCode(locationId, house.house_key);
            setBusyKey(null);
            if (res.success) {
              setCodes((prev) => ({ ...prev, houses: prev.houses.map((h) => (h.house_key === house.house_key ? { ...h, code: res.data.code } : h)) }));
            } else {
              showError(res);
            }
          },
        },
      ]
    );
  };

  const confirmRegenerateAll = () => {
    const length = codes?.suggestedLength;
    if (!length) return;
    Alert.alert(
      t('admin.settings.location.houseCodesRegenerateAllTitle'),
      t('admin.settings.location.houseCodesRegenerateAllMessage', { length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.settings.location.houseCodesRegenerateAll', { length }),
          style: 'destructive',
          onPress: async () => {
            setLoadingCodes(true);
            const res = await regenerateAllHouseCodes(locationId, length);
            if (!res.success) {
              setLoadingCodes(false);
              showError(res);
              return;
            }
            await loadSettings();
            await loadCodes();
          },
        },
      ]
    );
  };

  if (!settings) return null;

  const modeText = {
    unit: [t('admin.settings.location.houseModeUnit'), t('admin.settings.location.houseModeUnitDesc')],
    code: [t('admin.settings.location.houseModeCode'), t('admin.settings.location.houseModeCodeDesc')],
    name: [t('admin.settings.location.houseModeName'), t('admin.settings.location.houseModeNameDesc')],
  };
  const houses = codes?.houses || [];
  const visible = showAll ? houses : houses.slice(0, COLLAPSED_COUNT);

  return (
    <View>
      <View style={styles.block}>
        <Text style={styles.title}>{t('admin.settings.location.houseIdTitle')}</Text>
        {MODES.map((m) => {
          const selected = settings.mode === m;
          return (
            <TouchableOpacity
              key={m}
              style={[styles.radioRow, selected && styles.radioRowSelected]}
              onPress={() => handleModeChange(m)}
              disabled={saving}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={scale(22)} color={selected ? neu.teal : neu.textSoft} />
              <View style={styles.radioText}>
                <Text style={styles.radioLabel}>{modeText[m][0]}</Text>
                <Text style={styles.radioDesc}>{modeText[m][1]}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {settings.mode !== 'name' && (
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.radioLabel}>{t('admin.settings.location.houseShowName')}</Text>
            <Text style={styles.radioDesc}>{t('admin.settings.location.houseShowNameDesc')}</Text>
          </View>
          <Switch
            value={settings.showName}
            onValueChange={handleShowNameChange}
            disabled={saving}
            trackColor={{ false: neu.sunken, true: neu.teal + '50' }}
            thumbColor={settings.showName ? neu.teal : neu.textSoft}
            ios_backgroundColor={neu.sunken}
          />
        </View>
      )}

      {settings.mode === 'code' && (
        <View style={styles.block}>
          <Text style={styles.title}>{t('admin.settings.location.houseCodesTitle')}</Text>
          {!!codes?.codeLength && (
            <Text style={styles.radioDesc}>{t('admin.settings.location.houseCodesDesc', { length: codes.codeLength })}</Text>
          )}

          {!!codes?.suggestedLength && (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{t('admin.settings.location.houseCodesSuggested', { length: codes.suggestedLength })}</Text>
              <TouchableOpacity style={styles.noticeButton} onPress={confirmRegenerateAll}>
                <Text style={styles.noticeButtonText}>{t('admin.settings.location.houseCodesRegenerateAll', { length: codes.suggestedLength })}</Text>
              </TouchableOpacity>
            </View>
          )}

          {codesError ? (
            <View style={styles.errorBox}>
              <Text style={styles.noticeText}>{t('admin.settings.location.houseCodesLoadError')}</Text>
              <TouchableOpacity style={styles.noticeButton} onPress={loadCodes}>
                <Text style={styles.noticeButtonText}>{t('admin.settings.location.houseCodesRetry')}</Text>
              </TouchableOpacity>
            </View>
          ) : !codes ? (
            <ActivityIndicator color={neu.teal} style={{ marginVertical: scale(16) }} />
          ) : houses.length === 0 ? (
            <Text style={[styles.radioDesc, { marginTop: scale(8) }]}>{t('admin.settings.location.houseCodesEmpty')}</Text>
          ) : (
            <View style={{ marginTop: scale(8) }}>
              {visible.map((house) => {
                const editing = editingKey === house.house_key;
                const busy = busyKey === house.house_key;
                return (
                  <View key={house.house_key} style={styles.codeRow}>
                    <Text style={styles.codeUnit} numberOfLines={1}>{house.unit}</Text>
                    {editing ? (
                      <View style={styles.editWrap}>
                        <TextInput
                          style={styles.codeInput}
                          value={editValue}
                          onChangeText={(v) => setEditValue(v.replace(/\D/g, ''))}
                          keyboardType="number-pad"
                          maxLength={codes?.codeLength || 6}
                          autoFocus
                        />
                        <TouchableOpacity onPress={() => saveEdit(house)} disabled={busy} style={styles.iconBtn}>
                          {busy ? <ActivityIndicator size="small" color={neu.teal} /> : <Ionicons name="checkmark" size={scale(20)} color={neu.teal} />}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditingKey(null)} style={styles.iconBtn}>
                          <Ionicons name="close" size={scale(20)} color={neu.textLabel} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity style={styles.codeValueWrap} onPress={() => startEdit(house)} accessibilityRole="button">
                          <Text style={styles.codeValue}>{house.code || '—'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => confirmRegenerate(house)} disabled={busy} style={styles.iconBtn} accessibilityLabel={t('admin.settings.location.houseCodeRegenerate')}>
                          {busy ? <ActivityIndicator size="small" color={neu.teal} /> : <Ionicons name="refresh" size={scale(18)} color={neu.textLabel} />}
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                );
              })}
              {houses.length > COLLAPSED_COUNT && (
                <TouchableOpacity onPress={() => setShowAll((v) => !v)} style={styles.seeAll}>
                  <Text style={styles.seeAllText}>
                    {showAll ? t('admin.settings.location.houseCodesSeeLess') : t('admin.settings.location.houseCodesSeeAll', { count: houses.length })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { padding: scale(14), borderBottomWidth: 1, borderBottomColor: neu.border },
  title: { fontSize: scale(14), fontWeight: '600', color: neu.text, marginBottom: scale(8) },
  radioRow: { flexDirection: 'row', alignItems: 'flex-start', gap: scale(10), padding: scale(10), borderRadius: scale(10), marginBottom: scale(6), backgroundColor: neu.sunken },
  radioRowSelected: { borderWidth: 1, borderColor: neu.teal + '80' },
  radioText: { flex: 1 },
  radioLabel: { fontSize: scale(14), fontWeight: '500', color: neu.text },
  radioDesc: { fontSize: scale(12), color: neu.textLabel, marginTop: scale(2) },
  switchRow: { flexDirection: 'row', alignItems: 'center', padding: scale(14), borderBottomWidth: 1, borderBottomColor: neu.border },
  switchText: { flex: 1, marginRight: scale(12) },
  errorBox: { marginTop: scale(10), padding: scale(12), borderRadius: scale(10), backgroundColor: neu.coral + '1A' },
  notice: { marginTop: scale(10), padding: scale(12), borderRadius: scale(10), backgroundColor: neu.amber + '1A' },
  noticeText: { fontSize: scale(12), color: neu.text },
  noticeButton: { alignSelf: 'flex-start', marginTop: scale(8), paddingHorizontal: scale(12), paddingVertical: scale(8), borderRadius: scale(8), backgroundColor: neu.amber + '33' },
  noticeButtonText: { fontSize: scale(12), fontWeight: '600', color: neu.amber },
  codeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: scale(8), borderBottomWidth: 1, borderBottomColor: neu.border },
  codeUnit: { flex: 1, fontSize: scale(14), color: neu.text },
  codeValueWrap: { paddingHorizontal: scale(12), paddingVertical: scale(6), borderRadius: scale(8), backgroundColor: neu.sunken },
  codeValue: { fontSize: scale(15), fontWeight: '700', letterSpacing: 2, color: neu.teal },
  editWrap: { flexDirection: 'row', alignItems: 'center' },
  codeInput: { minWidth: scale(90), paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(8), backgroundColor: neu.sunken, color: neu.text, fontSize: scale(15), fontWeight: '700', letterSpacing: 2, textAlign: 'center' },
  iconBtn: { padding: scale(8), marginLeft: scale(2) },
  seeAll: { alignItems: 'center', paddingVertical: scale(12) },
  seeAllText: { fontSize: scale(13), fontWeight: '600', color: neu.teal },
});
