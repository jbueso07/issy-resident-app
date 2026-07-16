// app/admin/payments/helpers.js
// ISSY Admin - Payment Module Helper Functions

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPaymentTypes } from './_constants';

/**
 * Get auth headers for API requests
 */
export const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (HNL or USD)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'HNL') => {
  const symbol = currency === 'USD' ? '$' : 'L';
  return `${symbol} ${parseFloat(amount || 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;
};

/**
 * Format date to short format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  // Fix TZ: DATE-only ('YYYY-MM-DD') se ancla a mediodía UTC para que el
  // render en hora local (UTC-6) no retroceda un día ('2026-08-01' → 31 jul).
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ? dateString + 'T12:00:00Z'
    : dateString;
  return new Date(safe).toLocaleDateString('es-HN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format date with time
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted datetime string
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('es-HN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get payment type label from value
 * @param {string} type - Payment type value
 * @param {function} t - Translation function
 * @returns {string} Payment type label
 */
export const getPaymentTypeLabel = (type, t) => {
  const PAYMENT_TYPES = getPaymentTypes(t);
  return PAYMENT_TYPES.find(pt => pt.value === type)?.label || type;
};

/**
 * Get payment type icon from value
 * @param {string} type - Payment type value
 * @param {function} t - Translation function
 * @returns {string} Icon name
 */
export const getPaymentTypeIcon = (type, t) => {
  const PAYMENT_TYPES = getPaymentTypes(t);
  return PAYMENT_TYPES.find(pt => pt.value === type)?.icon || 'document-text';
};

/**
 * Check if a date is overdue
 * @param {string} dueDate - ISO date string
 * @returns {boolean} True if overdue
 */
export const isOverdue = (dueDate) => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
};

/**
 * Group charges by month/year of their due_date, with totals summed from
 * server-side aggregated stats (Sprint 2 D4 shape).
 *
 * Filter behavior:
 *   - filter === 'cancelled': include ONLY cancelled charges
 *   - filter !== 'cancelled' (incluye 'all'): exclude cancelled charges
 *
 * @param {Array} charges - Array of charge objects (con `stats` agregadas)
 * @param {string} [filter='all'] - status filter from the tab UI
 * @returns {Array} Periods sorted desc by key, con totals listos para mostrar.
 */
export const groupChargesByPeriod = (charges, filter = 'all') => {
  const visibleCharges = (charges || []).filter(c =>
    filter === 'cancelled' ? c.status === 'cancelled' : c.status !== 'cancelled'
  );

  const groups = {};
  visibleCharges.forEach(charge => {
    const date = new Date(charge.due_date || charge.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('es-HN', { month: 'long', year: 'numeric' });

    if (!groups[key]) {
      groups[key] = {
        key,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        charges: [],
        total: 0,
        collected: 0,
        pending: 0,
      };
    }

    groups[key].charges.push(charge);
    const expected = parseFloat(charge.stats?.total_amount_expected || 0);
    const collected = parseFloat(charge.stats?.total_amount_collected || 0);
    groups[key].total += expected;
    groups[key].collected += collected;
  });

  // Calcular pending después de acumular (estable contra NaN)
  Object.values(groups).forEach(g => { g.pending = g.total - g.collected; });

  return Object.values(groups)
    .filter(g => g.charges.length > 0)
    .sort((a, b) => b.key.localeCompare(a.key));
};

/**
 * Format due_date as relative human-readable label:
 *   - "Vence hoy"           (diffDays === 0)
 *   - "Vence en N días"     (diffDays > 0)
 *   - "Vencido hace N días" (diffDays < 0)
 *
 * @param {string} dueDate - ISO date string
 * @param {function} [t] - i18n translation function (optional)
 * @returns {{ label: string, severity: 'today'|'future'|'overdue'|'neutral', diffDays: number|null }}
 */
export const formatRelativeDueDate = (dueDate, t) => {
  if (!dueDate) return { label: '', severity: 'neutral', diffDays: null };
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) {
    return { label: '', severity: 'neutral', diffDays: null };
  }
  const now = new Date();
  due.setUTCHours(0, 0, 0, 0);
  now.setUTCHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - now.getTime()) / 86400000);
  const tr = (key, fallback, vars) => (t ? t(key, fallback, vars) : fallback);

  if (diffDays === 0) {
    return { label: tr('admin.payments.due.today', 'Vence hoy'), severity: 'today', diffDays };
  }
  if (diffDays > 0) {
    const noun = diffDays === 1 ? 'día' : 'días';
    return {
      label: tr('admin.payments.due.future', `Vence en ${diffDays} ${noun}`, { n: diffDays }),
      severity: 'future',
      diffDays,
    };
  }
  const overdue = Math.abs(diffDays);
  const noun = overdue === 1 ? 'día' : 'días';
  return {
    label: tr('admin.payments.due.overdue', `Vencido hace ${overdue} ${noun}`, { n: overdue }),
    severity: 'overdue',
    diffDays,
  };
};

/**
 * Map a recurring_period value to a Spanish label.
 * Returns null if no period provided.
 *
 * @param {string|null} period
 * @param {function} [t]
 * @returns {string|null}
 */
const RECURRING_LABELS = {
  monthly: 'Mensual',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
};
export const formatRecurringPeriodLabel = (period, t) => {
  if (!period) return null;
  const fallback = RECURRING_LABELS[period] || 'Recurrente';
  return t ? t(`admin.payments.recurring.${period}`, fallback) : fallback;
};

/**
 * Format the applies_to / specific_users target as a human-readable label.
 *   - "Todos los residentes" (applies_to === 'all')
 *   - "N residentes" / "1 residente" (applies_to === 'specific')
 *
 * @param {Object} charge
 * @param {function} [t]
 * @returns {string}
 */
export const formatAppliesToLabel = (charge, t) => {
  if (charge?.applies_to === 'all') {
    return t ? t('admin.payments.appliesTo.all', 'Todos los residentes') : 'Todos los residentes';
  }
  const n = charge?.specific_users?.length ?? charge?.total_users ?? 0;
  const noun = n === 1 ? 'residente' : 'residentes';
  return t
    ? t('admin.payments.appliesTo.specific', `${n} ${noun}`, { n })
    : `${n} ${noun}`;
};

/**
 * Format cancelled_at as relative human-readable label:
 *   - "Cancelado hoy"
 *   - "Cancelado hace N días"
 *
 * @param {string|null} cancelledAt - ISO timestamp
 * @param {function} [t]
 * @returns {string}
 */
export const formatRelativeCancelledAt = (cancelledAt, t) => {
  if (!cancelledAt) return t ? t('admin.payments.cancelled.noDate', 'Cancelado') : 'Cancelado';
  const c = new Date(cancelledAt);
  if (Number.isNaN(c.getTime())) {
    return t ? t('admin.payments.cancelled.noDate', 'Cancelado') : 'Cancelado';
  }
  const now = new Date();
  c.setUTCHours(0, 0, 0, 0);
  now.setUTCHours(0, 0, 0, 0);
  const diffDays = Math.round((now.getTime() - c.getTime()) / 86400000);
  if (diffDays <= 0) {
    return t ? t('admin.payments.cancelled.today', 'Cancelado hoy') : 'Cancelado hoy';
  }
  const noun = diffDays === 1 ? 'día' : 'días';
  return t
    ? t('admin.payments.cancelled.past', `Cancelado hace ${diffDays} ${noun}`, { n: diffDays })
    : `Cancelado hace ${diffDays} ${noun}`;
};

/**
 * Calculate collection percentage
 * @param {number} collected - Collected amount
 * @param {number} total - Total amount
 * @returns {number} Percentage (0-100)
 */
export const calculateCollectionPercentage = (collected, total) => {
  if (!total || total === 0) return 0;
  return Math.round((collected / total) * 100);
};

/**
 * Filter users by search query
 * @param {Array} users - Array of user objects
 * @param {string} search - Search query
 * @returns {Array} Filtered users
 */
export const filterUsers = (users, search) => {
  if (!search) return users;
  
  const searchLower = search.toLowerCase();
  return users.filter(u => {
    const name = (u.full_name || u.name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const unit = (u.unit_number || u.unit || '').toLowerCase();
    return name.includes(searchLower) || email.includes(searchLower) || unit.includes(searchLower);
  });
};

/**
 * Get user display name
 * @param {Object} user - User object
 * @returns {string} Display name
 */
export const getUserDisplayName = (user) => {
  if (!user) return '';
  return user.full_name || user.name || user.email || '';
};

/**
 * Get user initials for avatar
 * @param {Object} user - User object
 * @returns {string} Single character initial
 */
export const getUserInitial = (user) => {
  const name = getUserDisplayName(user);
  return (name || '?')[0].toUpperCase();
};

/**
 * Validate charge form data
 * @param {Object} formData - Form data object
 * @param {Array} selectedUsers - Selected users for multiple target
 * @param {function} t - Translation function
 * @returns {Object} { valid: boolean, error: string }
 */
export const validateChargeForm = (formData, selectedUsers, t) => {
  if (formData.target === 'single' && !formData.user_id) {
    return { 
      valid: false, 
      error: t('admin.payments.errors.selectResident', 'Selecciona un residente') 
    };
  }
  
  if (formData.target === 'multiple' && selectedUsers.length === 0) {
    return { 
      valid: false, 
      error: t('admin.payments.errors.selectResidents', 'Selecciona al menos un residente') 
    };
  }
  
  if (!formData.amount || parseFloat(formData.amount) <= 0) {
    return { 
      valid: false, 
      error: t('admin.payments.errors.enterValidAmount', 'Ingresa un monto válido') 
    };
  }
  
  if (!formData.title) {
    return { 
      valid: false, 
      error: t('admin.payments.errors.enterTitle', 'Ingresa un título para el cobro') 
    };
  }
  
  return { valid: true, error: null };
};

/**
 * Validate bank account form data
 * @param {Object} formData - Bank account form data
 * @param {function} t - Translation function
 * @returns {Object} { valid: boolean, error: string }
 */
export const validateBankAccountForm = (formData, t) => {
  if (!formData.bank_name || !formData.account_number || !formData.account_name) {
    return {
      valid: false,
      error: t('admin.payments.errors.fillRequiredFields', 'Completa los campos requeridos')
    };
  }
  return { valid: true, error: null };
};
