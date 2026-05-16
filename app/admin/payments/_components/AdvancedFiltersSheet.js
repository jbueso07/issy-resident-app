// app/admin/payments/_components/AdvancedFiltersSheet.js
// ISSY Admin - AdvancedFiltersSheet (Sprint 3 D9)
//
// Sheet bottom-up con 4 secciones de filtros avanzados para Lista-Cobros:
//   1) Rango de fechas con date_field selector (Creación / Pago / Verificación)
//   2) Rango de monto (min/max)
//   3) Método de pago (single-select chips, toggleable)
//   4) Casa / Unidad (TextInput)
//
// Backend cero — todos los query params ya están soportados (D1+D2+D4).
// Frontend mantiene un draft local que se descarta al cancelar y se aplica
// al usePayments via setParams cuando el admin tapea "Aplicar".
//
// Status chip y search bar viven aparte (D3/D4) — este sheet NO los toca.

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography, radii } from '../_styles/theme';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Date field whitelist (matchea con backend D2 ALLOWED_DATE_FIELDS).
const DATE_FIELD_KEYS = ['created_at', 'paid_at', 'verified_at'];

/**
 * @param {Object} props
 * @param {boolean} props.visible
 * @param {Object} props.currentParams - params actuales de usePayments
 * @param {(next: Object) => void} props.onApply
 * @param {() => void} props.onClose
 */
export function AdvancedFiltersSheet({
  visible,
  currentParams = {},
  onApply,
  onClose,
}) {
  const { t } = useTranslation();

  // Draft local — copia de currentParams al abrir, descartable al cancelar.
  const [draft, setDraft] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (visible) {
      setDraft({
        date_field: currentParams.date_field || 'created_at',
        from_date: currentParams.from_date || '',
        to_date: currentParams.to_date || '',
        min_amount:
          currentParams.min_amount != null && currentParams.min_amount !== ''
            ? String(currentParams.min_amount)
            : '',
        max_amount:
          currentParams.max_amount != null && currentParams.max_amount !== ''
            ? String(currentParams.max_amount)
            : '',
        payment_method: currentParams.payment_method || '',
        unit_number: currentParams.unit_number || '',
      });
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ============ Validación ============
  const validate = () => {
    const next = {};
    if (draft.from_date && !DATE_RE.test(draft.from_date)) {
      next.from_date = t('admin.payments.filters.dateFormat', 'Formato: YYYY-MM-DD');
    }
    if (draft.to_date && !DATE_RE.test(draft.to_date)) {
      next.to_date = t('admin.payments.filters.dateFormat', 'Formato: YYYY-MM-DD');
    }
    if (
      draft.from_date &&
      draft.to_date &&
      DATE_RE.test(draft.from_date) &&
      DATE_RE.test(draft.to_date) &&
      draft.from_date > draft.to_date
    ) {
      next.to_date = t('admin.payments.filters.dateRange', 'Hasta debe ser >= Desde');
    }
    if (draft.min_amount) {
      const n = parseFloat(draft.min_amount);
      if (!Number.isFinite(n) || n < 0) {
        next.min_amount = t('admin.payments.filters.amountInvalid', 'Monto inválido');
      }
    }
    if (draft.max_amount) {
      const n = parseFloat(draft.max_amount);
      if (!Number.isFinite(n) || n < 0) {
        next.max_amount = t('admin.payments.filters.amountInvalid', 'Monto inválido');
      }
    }
    if (draft.min_amount && draft.max_amount && !next.min_amount && !next.max_amount) {
      if (parseFloat(draft.min_amount) > parseFloat(draft.max_amount)) {
        next.max_amount = t('admin.payments.filters.amountRange', 'Máx debe ser >= Mín');
      }
    }
    return next;
  };

  const handleApply = () => {
    const ve = validate();
    if (Object.keys(ve).length > 0) {
      setErrors(ve);
      return;
    }
    // Build params: strings vacías → undefined, amounts → number.
    const out = {
      date_field: draft.date_field || undefined,
      from_date: draft.from_date || undefined,
      to_date: draft.to_date || undefined,
      min_amount: draft.min_amount ? parseFloat(draft.min_amount) : undefined,
      max_amount: draft.max_amount ? parseFloat(draft.max_amount) : undefined,
      payment_method: draft.payment_method || undefined,
      unit_number:
        typeof draft.unit_number === 'string' && draft.unit_number.trim()
          ? draft.unit_number.trim()
          : undefined,
    };
    onApply(out);
    onClose();
  };

  const handleClear = () => {
    setDraft({
      date_field: 'created_at',
      from_date: '',
      to_date: '',
      min_amount: '',
      max_amount: '',
      payment_method: '',
      unit_number: '',
    });
    setErrors({});
  };

  // ============ Catálogos ============
  const DATE_FIELDS = [
    { key: 'created_at', label: t('admin.payments.filters.dateCreated', 'Creación') },
    { key: 'paid_at', label: t('admin.payments.filters.datePaid', 'Pago') },
    { key: 'verified_at', label: t('admin.payments.filters.dateVerified', 'Verificación') },
  ];

  const PAYMENT_METHODS = [
    { key: 'cash', label: t('admin.payments.filters.methodCash', 'Efectivo') },
    { key: 'card', label: t('admin.payments.filters.methodCard', 'Tarjeta') },
    { key: 'proof', label: t('admin.payments.filters.methodProof', 'Comprobante') },
    { key: 'link', label: t('admin.payments.filters.methodLink', 'Link') },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>
              {t('admin.payments.filters.title', 'Filtros Avanzados')}
            </Text>

            {/* === Fechas === */}
            <Text style={styles.sectionLabel}>
              {t('admin.payments.filters.dateSection', 'Rango de fechas')}
            </Text>

            <View style={styles.chipsRow}>
              {DATE_FIELDS.map((df) => {
                const active = draft.date_field === df.key;
                return (
                  <Pressable
                    key={df.key}
                    onPress={() => setDraft((d) => ({ ...d, date_field: df.key }))}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {df.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.inputLabel}>
                  {t('admin.payments.filters.from', 'Desde')}
                </Text>
                <TextInput
                  value={draft.from_date}
                  onChangeText={(v) => setDraft((d) => ({ ...d, from_date: v }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.onSurfaceVariant}
                  style={[styles.input, errors.from_date && styles.inputError]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.from_date ? (
                  <Text style={styles.errorText}>{errors.from_date}</Text>
                ) : null}
              </View>
              <View style={styles.col}>
                <Text style={styles.inputLabel}>
                  {t('admin.payments.filters.to', 'Hasta')}
                </Text>
                <TextInput
                  value={draft.to_date}
                  onChangeText={(v) => setDraft((d) => ({ ...d, to_date: v }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.onSurfaceVariant}
                  style={[styles.input, errors.to_date && styles.inputError]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.to_date ? (
                  <Text style={styles.errorText}>{errors.to_date}</Text>
                ) : null}
              </View>
            </View>

            {/* === Monto === */}
            <Text style={styles.sectionLabel}>
              {t('admin.payments.filters.amountSection', 'Rango de monto')}
            </Text>
            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.inputLabel}>
                  {t('admin.payments.filters.min', 'Mínimo')}
                </Text>
                <TextInput
                  value={draft.min_amount}
                  onChangeText={(v) => setDraft((d) => ({ ...d, min_amount: v }))}
                  placeholder="0.00"
                  placeholderTextColor={colors.onSurfaceVariant}
                  keyboardType="decimal-pad"
                  style={[styles.input, errors.min_amount && styles.inputError]}
                />
                {errors.min_amount ? (
                  <Text style={styles.errorText}>{errors.min_amount}</Text>
                ) : null}
              </View>
              <View style={styles.col}>
                <Text style={styles.inputLabel}>
                  {t('admin.payments.filters.max', 'Máximo')}
                </Text>
                <TextInput
                  value={draft.max_amount}
                  onChangeText={(v) => setDraft((d) => ({ ...d, max_amount: v }))}
                  placeholder="0.00"
                  placeholderTextColor={colors.onSurfaceVariant}
                  keyboardType="decimal-pad"
                  style={[styles.input, errors.max_amount && styles.inputError]}
                />
                {errors.max_amount ? (
                  <Text style={styles.errorText}>{errors.max_amount}</Text>
                ) : null}
              </View>
            </View>

            {/* === Método de pago === */}
            <Text style={styles.sectionLabel}>
              {t('admin.payments.filters.methodSection', 'Método de pago')}
            </Text>
            <View style={styles.chipsRow}>
              {PAYMENT_METHODS.map((pm) => {
                const active = draft.payment_method === pm.key;
                return (
                  <Pressable
                    key={pm.key}
                    onPress={() =>
                      setDraft((d) => ({
                        ...d,
                        payment_method: active ? '' : pm.key, // toggle
                      }))
                    }
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {pm.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* === Unit / Casa === */}
            <Text style={styles.sectionLabel}>
              {t('admin.payments.filters.unitSection', 'Casa / Unidad')}
            </Text>
            <TextInput
              value={draft.unit_number}
              onChangeText={(v) => setDraft((d) => ({ ...d, unit_number: v }))}
              placeholder={t('admin.payments.filters.unitPlaceholder', 'Ej. 12-A')}
              placeholderTextColor={colors.onSurfaceVariant}
              style={styles.input}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </ScrollView>

          {/* Botones fijos al fondo */}
          <View style={styles.btnRow}>
            <Pressable onPress={handleClear} style={styles.btnClear}>
              <Text style={styles.btnClearText}>
                {t('admin.payments.filters.clear', 'Limpiar')}
              </Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.btnCancel}>
              <Text style={styles.btnCancelText}>
                {t('common.cancel', 'Cancelar')}
              </Text>
            </Pressable>
            <Pressable onPress={handleApply} style={styles.btnApply}>
              <Text style={styles.btnApplyText}>
                {t('admin.payments.filters.apply', 'Aplicar')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Helper: cuenta filtros avanzados activos en un objeto de params.
 * Usado para mostrar el badge en el botón "tune" de ChargesTab.
 * `date_field` NO cuenta como filtro (siempre tiene default 'created_at').
 *
 * @param {Object} params
 * @returns {number}
 */
export function countAdvancedFilters(params = {}) {
  let count = 0;
  if (params.from_date) count++;
  if (params.to_date) count++;
  if (params.min_amount != null && params.min_amount !== '') count++;
  if (params.max_amount != null && params.max_amount !== '') count++;
  if (params.payment_method) count++;
  if (params.unit_number) count++;
  return count;
}

// =============== Styles ===============

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceContainer,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: '85%',
    paddingTop: spacing.unit * 3,
    paddingHorizontal: spacing.unit * 3,
    paddingBottom: spacing.unit * 2,
  },
  scrollContent: {
    paddingBottom: spacing.unit * 3,
  },
  title: {
    ...typography.headlineSm,
    color: colors.onSurface,
    marginBottom: spacing.unit * 3,
  },
  sectionLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.unit * 3,
    marginBottom: spacing.unit * 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.unit,
  },
  chip: {
    paddingHorizontal: spacing.unit * 3,
    paddingVertical: spacing.unit,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
  },
  chipActive: {
    backgroundColor: colors.primaryContainer,
  },
  chipText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  chipTextActive: {
    color: colors.onPrimaryContainer,
    fontWeight: '600',
  },
  row2: {
    flexDirection: 'row',
    gap: spacing.unit * 2,
  },
  col: {
    flex: 1,
  },
  inputLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.unit,
  },
  input: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.md,
    paddingHorizontal: spacing.unit * 2,
    paddingVertical: spacing.unit * 1.5,
    color: colors.onSurface,
    ...typography.bodyMd,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    marginTop: spacing.unit / 2,
    fontSize: 12,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.unit * 2,
    paddingTop: spacing.unit * 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outline,
    alignItems: 'center',
  },
  btnClear: {
    paddingHorizontal: spacing.unit * 3,
    paddingVertical: spacing.unit * 1.5,
    borderRadius: radii.md,
  },
  btnClearText: {
    ...typography.labelMd,
    color: colors.error,
    fontWeight: '600',
  },
  btnCancel: {
    flex: 1,
    paddingHorizontal: spacing.unit * 3,
    paddingVertical: spacing.unit * 1.5,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  btnApply: {
    flex: 2,
    paddingHorizontal: spacing.unit * 3,
    paddingVertical: spacing.unit * 1.5,
    borderRadius: radii.md,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnApplyText: {
    ...typography.labelMd,
    color: colors.onPrimaryContainer,
    fontWeight: '700',
  },
});

export default AdvancedFiltersSheet;
