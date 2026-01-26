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
  return new Date(dateString).toLocaleDateString('es-HN', {
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
 * Group charges by month/year
 * @param {Array} charges - Array of charge objects
 * @returns {Object} Charges grouped by period
 */
export const groupChargesByPeriod = (charges) => {
  const groups = {};
  
  charges.forEach(charge => {
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
    groups[key].total += parseFloat(charge.amount || 0);
    
    if (charge.display_status === 'paid' || charge.payment_status === 'paid') {
      groups[key].collected += parseFloat(charge.amount || 0);
    } else {
      groups[key].pending += parseFloat(charge.amount || 0);
    }
  });
  
  // Sort by key descending (most recent first)
  return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
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
