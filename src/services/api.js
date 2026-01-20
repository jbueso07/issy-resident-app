// src/services/api.js
// ISSY Resident App - API Service con Auto-Refresh de Token

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.joinissy.com/api';

// Flag para evitar múltiples refreshes simultáneos
let isRefreshing = false;
let refreshPromise = null;

// ==========================================
// TOKEN REFRESH
// ==========================================

const refreshToken = async () => {
  // Si ya está refrescando, esperar ese proceso
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  
  refreshPromise = (async () => {
    try {
      const currentRefreshToken = await AsyncStorage.getItem('refreshToken');
      
      if (!currentRefreshToken) {
        throw new Error('No refresh token available');
      }

    const response = await fetch(`${API_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });

      const data = await response.json();

      if (response.ok && (data.success || data.token || data.data?.token)) {
        const newToken = data.data?.token || data.token;
        const newRefreshToken = data.data?.refreshToken || data.refreshToken;

        await AsyncStorage.setItem('token', newToken);
        if (newRefreshToken) {
          await AsyncStorage.setItem('refreshToken', newRefreshToken);
        }

        console.log('🔄 Token refreshed successfully');
        return { success: true, token: newToken };
      } else {
        throw new Error('Refresh failed');
      }
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      // Clear tokens on refresh failure
      await AsyncStorage.multiRemove(['token', 'refreshToken']);
      return { success: false, error: error.message };
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// ==========================================
// AUTH FETCH CON AUTO-REFRESH
// ==========================================

const authFetch = async (endpoint, options = {}, isRetry = false) => {
  const token = await AsyncStorage.getItem('token');
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  // Si recibimos 401 y no es un retry, intentar refresh
  if (response.status === 401 && !isRetry) {
    console.log('🔐 Token expired, attempting refresh...');
    
    const refreshResult = await refreshToken();
    
    if (refreshResult.success) {
      // Reintentar la petición original con el nuevo token
      console.log('🔄 Retrying request with new token...');
      return authFetch(endpoint, options, true);
    } else {
      // Refresh falló - el usuario necesita volver a iniciar sesión
      const error = new Error('SESSION_EXPIRED');
      error.sessionExpired = true;
      throw error;
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Error en la solicitud');
  }

  return data;
};

// ==========================================
// AUTH
// ==========================================

export const loginUser = async (email, password) => {
  try {
    const data = await authFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (data.token) {
      await AsyncStorage.setItem('token', data.token);
    }
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const logoutUser = async () => {
  await AsyncStorage.removeItem('token');
};

export const updateUserProfile = async (profileData) => {
  try {
    const data = await authFetch('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// QR CODES
// ==========================================

export const getMyQRCodes = async (locationId) => {
  try {
    const url = locationId ? `/qr?location_id=${locationId}` : '/qr';
    const data = await authFetch(url);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching QR codes:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const generateQRCode = async (qrData) => {
  try {
    const data = await authFetch('/qr/generate', {
      method: 'POST',
      body: JSON.stringify(qrData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error generating QR:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const generateVisitorQR = async (visitorData) => {
  try {
    const data = await authFetch('/qr/generate', {
      method: 'POST',
      body: JSON.stringify({
        visitor_name: visitorData.name,
        visitor_phone: visitorData.phone || null,
        qr_type: 'single',
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error generating QR:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const deleteQRCode = async (id) => {
  try {
    await authFetch(`/qr/${id}`, { method: 'DELETE' });
    return { success: true };
  } catch (error) {
    console.error('Error deleting QR:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getQRCodeDetail = async (id) => {
  try {
    const data = await authFetch(`/qr/${id}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching QR detail:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// PAGOS DE COMUNIDAD
// ==========================================

export const getMyPayments = async () => {
  try {
    const data = await authFetch('/rental/my-payments');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching payments:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const payPayment = async (paymentId, paymentMethodId) => {
  try {
    const data = await authFetch(`/rental/payments/${paymentId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ payment_method_id: paymentMethodId }),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error paying:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// CONTRATOS/LEASES
// ==========================================

export const getMyLeases = async () => {
  try {
    const data = await authFetch('/rental/my-leases');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching leases:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// TICKETS DE MANTENIMIENTO
// ==========================================

export const getMyTickets = async () => {
  try {
    const data = await authFetch('/rental/my-tickets');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const createTicket = async (ticketData) => {
  try {
    const data = await authFetch('/rental/my-tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error creating ticket:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getTicketDetail = async (id) => {
  try {
    const data = await authFetch(`/rental/my-tickets/${id}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// ANUNCIOS
// ==========================================

export const getAnnouncements = async (locationId) => {
  try {
    const url = locationId ? `/announcements?location_id=${locationId}` : '/announcements';
    const data = await authFetch(url);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const markAnnouncementRead = async (id) => {
  try {
    await authFetch(`/announcements/${id}/read`, { method: 'POST' });
    return { success: true };
  } catch (error) {
    console.error('Error marking announcement read:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// COMMON AREAS & RESERVATIONS
// ==========================================

export const getCommonAreas = async () => {
  try {
    const data = await authFetch('/common-areas');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching common areas:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getCommonAreaById = async (id) => {
  try {
    const data = await authFetch(`/common-areas/${id}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching common area:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getMyReservations = async () => {
  try {
    const data = await authFetch('/reservations/my');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const createReservation = async (reservationData) => {
  try {
    const data = await authFetch('/reservations', {
      method: 'POST',
      body: JSON.stringify(reservationData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error creating reservation:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const cancelReservation = async (id) => {
  try {
    const data = await authFetch(`/reservations/${id}/cancel`, {
      method: 'PUT',
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error canceling reservation:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getAreaAvailability = async (areaId, date) => {
  try {
    const data = await authFetch(`/reservations/availability/${areaId}?date=${date}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching availability:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// FINANCE - Transacciones
// ==========================================

export const getTransactions = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.type) queryParams.append('type', params.type);
    if (params.category_id) queryParams.append('category_id', params.category_id);
    if (params.account_id) queryParams.append('account_id', params.account_id);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);
    
    const query = queryParams.toString();
    const endpoint = query ? `/finance/transactions?${query}` : '/finance/transactions';
    
    const data = await authFetch(endpoint);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const createTransaction = async (transactionData) => {
  try {
    const data = await authFetch('/finance/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error creating transaction:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const updateTransaction = async (transactionId, transactionData) => {
  try {
    const data = await authFetch(`/finance/transactions/${transactionId}`, {
      method: 'PUT',
      body: JSON.stringify(transactionData),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error updating transaction:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const deleteTransaction = async (transactionId) => {
  try {
    const data = await authFetch(`/finance/transactions/${transactionId}`, {
      method: 'DELETE',
    });
    return { success: true, message: data.message };
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// FINANCE - Categorías
// ==========================================

export const getCategories = async () => {
  try {
    const data = await authFetch('/finance/categories');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const createCategory = async (categoryData) => {
  try {
    const data = await authFetch('/finance/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error creating category:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const deleteCategory = async (categoryId) => {
  try {
    const data = await authFetch(`/finance/categories/${categoryId}`, {
      method: 'DELETE',
    });
    return { success: true, message: data.message };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// FINANCE - Cuentas
// ==========================================

export const getAccounts = async () => {
  try {
    const data = await authFetch('/finance/accounts');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const createAccount = async (accountData) => {
  try {
    const data = await authFetch('/finance/accounts', {
      method: 'POST',
      body: JSON.stringify(accountData),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error creating account:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const updateAccount = async (accountId, accountData) => {
  try {
    const data = await authFetch(`/finance/accounts/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify(accountData),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error updating account:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const deleteAccount = async (accountId) => {
  try {
    const data = await authFetch(`/finance/accounts/${accountId}`, {
      method: 'DELETE',
    });
    return { success: true, message: data.message };
  } catch (error) {
    console.error('Error deleting account:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// FINANCE - Dashboard/Summary
// ==========================================

export const getFinanceSummary = async (period = 'month') => {
  try {
    const data = await authFetch(`/finance/summary?period=${period}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching summary:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getFinanceStats = async () => {
  try {
    const data = await authFetch('/finance/stats');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// Dashboard combinado para finances.js
export const getFinanceDashboard = async () => {
  try {
    const data = await authFetch('/finance/dashboard');
    return { 
      success: true, 
      data: data.data || data
    };
  } catch (error) {
    console.error('Error fetching finance dashboard:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// FINANCE - Metas de Ahorro
// ==========================================

export const getSavingsGoals = async () => {
  try {
    const data = await authFetch('/finance/goals');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching savings goals:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// Alias para finances.js
export const getFinanceGoals = async () => {
  try {
    const data = await authFetch('/finance/goals');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching finance goals:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const createSavingsGoal = async (goalData) => {
  try {
    const data = await authFetch('/finance/goals', {
      method: 'POST',
      body: JSON.stringify(goalData),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error creating savings goal:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const updateSavingsGoal = async (goalId, goalData) => {
  try {
    const data = await authFetch(`/finance/goals/${goalId}`, {
      method: 'PUT',
      body: JSON.stringify(goalData),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error updating savings goal:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const deleteSavingsGoal = async (goalId) => {
  try {
    const data = await authFetch(`/finance/goals/${goalId}`, {
      method: 'DELETE',
    });
    return { success: true, message: data.message };
  } catch (error) {
    console.error('Error deleting savings goal:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const addSavingsContribution = async (goalId, amount) => {
  try {
    const data = await authFetch(`/finance/goals/${goalId}/contributions`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error adding contribution:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// FINANCE - Tips
// ==========================================

export const getTips = async () => {
  try {
    const data = await authFetch('/finance/tips');
    return { success: true, data: data.data || data };
  } catch (error) {
    // Tips es opcional, retornar array vacío si no existe
    console.log('Tips endpoint not available:', error.message);
    return { success: true, data: [] };
  }
};

// ==========================================
// FINANCE - Invoices
// ==========================================

export const getInvoices = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.limit) queryParams.append('limit', params.limit);
    
    const query = queryParams.toString();
    const endpoint = query ? `/finance/invoices?${query}` : '/finance/invoices';
    
    const data = await authFetch(endpoint);
    return { success: true, data: data.data || data };
  } catch (error) {
    // Invoices puede no existir aún
    console.log('Invoices endpoint not available:', error.message);
    return { success: true, data: [] };
  }
};

// ==========================================
// FINANCE - Gamificación
// ==========================================

export const getGamificationStats = async () => {
  try {
    const data = await authFetch('/finance/gamification/stats');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching gamification stats:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getAchievements = async () => {
  try {
    const data = await authFetch('/finance/gamification/achievements');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getStreakInfo = async () => {
  try {
    const data = await authFetch('/finance/gamification/streak');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching streak info:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getDailyChallenges = async () => {
  try {
    const data = await authFetch('/finance/gamification/challenges');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching daily challenges:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// FINANCE - Recordatorios
// ==========================================

export const getReminders = async () => {
  try {
    const data = await authFetch('/finance/reminders');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const createReminder = async (reminderData) => {
  try {
    const data = await authFetch('/finance/reminders', {
      method: 'POST',
      body: JSON.stringify(reminderData),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error creating reminder:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const deleteReminder = async (reminderId) => {
  try {
    const data = await authFetch(`/finance/reminders/${reminderId}`, {
      method: 'DELETE',
    });
    return { success: true, message: data.message };
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// FINANCE - Presupuestos
// ==========================================

export const getBudgets = async () => {
  try {
    const data = await authFetch('/finance/budgets');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getBudgetsStatus = async () => {
  try {
    const data = await authFetch('/finance/budgets/status');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching budgets status:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const createBudget = async (budgetData) => {
  try {
    const data = await authFetch('/finance/budgets', {
      method: 'POST',
      body: JSON.stringify(budgetData),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error creating budget:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const deleteBudget = async (budgetId) => {
  try {
    const data = await authFetch(`/finance/budgets/${budgetId}`, {
      method: 'DELETE',
    });
    return { success: true, message: data.message };
  } catch (error) {
    console.error('Error deleting budget:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// FINANCE - Suscripciones y Planes
// ==========================================

export const getFinancePlans = async () => {
  try {
    const data = await authFetch('/finance/plans');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching finance plans:', error);
    return { success: true, data: [] };
  }
};

// Alias para finances.js
export const getPlans = async () => {
  try {
    const data = await authFetch('/finance/plans');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.log('Plans endpoint not available:', error.message);
    return { success: true, data: [] };
  }
};

export const getFinanceSubscription = async () => {
  try {
    const data = await authFetch('/finance/subscription');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getFinanceUsageLimits = async () => {
  try {
    const data = await authFetch('/finance/subscription/limits');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching usage limits:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// Alias para finances.js
export const getLimits = async () => {
  try {
    const data = await authFetch('/finance/subscription/limits');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.log('Limits endpoint not available:', error.message);
    return { success: true, data: { transactions: { used: 0, limit: 100 } } };
  }
};

export const upgradeFinancePlan = async (planName, paymentMethod) => {
  try {
    const data = await authFetch('/finance/subscription/upgrade', {
      method: 'POST',
      body: JSON.stringify({ plan_name: planName, payment_method: paymentMethod }),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error upgrading plan:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// INCIDENTS
// ==========================================

export const createIncident = async (incidentData) => {
  try {
    const data = await authFetch('/incidents', {
      method: 'POST',
      body: JSON.stringify(incidentData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error creating incident:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getIncidents = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.severity) queryParams.append('severity', params.severity);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);
    if (params.my_incidents) queryParams.append('my_incidents', params.my_incidents);
    
    const query = queryParams.toString();
    const endpoint = query ? `/incidents?${query}` : '/incidents';
    
    const data = await authFetch(endpoint);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching incidents:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getIncidentById = async (id) => {
  try {
    const data = await authFetch(`/incidents/${id}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching incident:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const addIncidentComment = async (incidentId, comment) => {
  try {
    const data = await authFetch(`/incidents/${incidentId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error adding comment:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const updateIncidentStatus = async (incidentId, status, resolutionNotes = null) => {
  try {
    const data = await authFetch(`/incidents/${incidentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, resolution_notes: resolutionNotes }),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error updating incident status:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const deleteIncident = async (incidentId) => {
  try {
    const data = await authFetch(`/incidents/${incidentId}`, {
      method: 'DELETE',
    });
    return { success: true, message: data.message };
  } catch (error) {
    console.error('Error deleting incident:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// ACCOUNT MANAGEMENT
// ==========================================

export const deleteUserAccount = async (password) => {
  try {
    const data = await authFetch('/auth/delete-account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};

// ==========================================
// COMMUNITY/ORGANIZATION MANAGEMENT
// ==========================================

export const getOrganizationStats = async (locationId) => {
  try {
    const data = await authFetch(`/invitations/organization/${locationId}/stats`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching organization stats:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getOrganizationMembers = async (locationId, status = 'all') => {
  try {
    const endpoint = status === 'all' 
      ? `/invitations/organization/${locationId}/members`
      : `/invitations/organization/${locationId}/members?status=${status}`;
    const data = await authFetch(endpoint);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching organization members:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getPendingMembers = async (locationId) => {
  try {
    const data = await authFetch(`/invitations/organization/${locationId}/pending`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching pending members:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const approveMember = async (membershipId) => {
  try {
    const data = await authFetch(`/invitations/organization/members/${membershipId}/approve`, {
      method: 'POST',
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error approving member:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const rejectMember = async (membershipId) => {
  try {
    const data = await authFetch(`/invitations/organization/members/${membershipId}/reject`, {
      method: 'POST',
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error rejecting member:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const approveAllMembers = async (locationId) => {
  try {
    const data = await authFetch(`/invitations/organization/${locationId}/approve-all`, {
      method: 'POST',
    });
    return { success: true, data: data.data || data, count: data.count };
  } catch (error) {
    console.error('Error approving all members:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const updateMemberStatus = async (membershipId, isActive, deactivationReason = null) => {
  try {
    const data = await authFetch(`/invitations/organization/members/${membershipId}`, {
      method: 'PUT',
      body: JSON.stringify({ 
        is_active: isActive,
        deactivation_reason: deactivationReason 
      }),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error updating member status:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const updateMemberInfo = async (membershipId, updates) => {
  try {
    const data = await authFetch(`/invitations/organization/members/${membershipId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error updating member info:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getOrganizationSettings = async (locationId) => {
  try {
    const data = await authFetch(`/invitations/organization/${locationId}/settings`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching organization settings:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const updateOrganizationSettings = async (locationId, settings) => {
  try {
    const data = await authFetch(`/invitations/organization/${locationId}/settings`, {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error updating organization settings:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getLocations = async () => {
  try {
    const data = await authFetch('/locations');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching locations:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// SUBSCRIPTIONS & PAYMENT METHODS
// ==========================================

export const getMySubscriptions = async () => {
  try {
    const data = await authFetch('/subscriptions/my');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.log('Subscriptions not available:', error.message);
    return { success: true, data: [] };
  }
};

export const getVerticalPlans = async () => {
  try {
    const data = await authFetch('/subscriptions/plans');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.log('Plans not available:', error.message);
    return { success: true, data: [] };
  }
};

export const startTrial = async (planId) => {
  try {
    const data = await authFetch("/subscriptions/trial", {
      method: "POST",
      body: JSON.stringify({ planId: planId })
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error("Error starting trial:", error);
    return { success: false, error: error.message };
  }
};

export const getPaymentMethods = async () => {
  try {
    const data = await authFetch('/payment-methods');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.log('Payment methods not available:', error.message);
    // Fail gracefully - return empty array
    return { success: true, data: [] };
  }
};

export const addPaymentMethod = async (paymentMethodData) => {
  try {
    const data = await authFetch('/payment-methods', {
      method: 'POST',
      body: JSON.stringify(paymentMethodData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error adding payment method:', error);
    return { success: false, error: 'Funcionalidad próximamente disponible' };
  }
};

export const deletePaymentMethod = async (paymentMethodId) => {
  try {
    const data = await authFetch(`/payment-methods/${paymentMethodId}`, {
      method: 'DELETE',
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return { success: false, error: 'Funcionalidad próximamente disponible' };
  }
};

export const setDefaultPaymentMethod = async (paymentMethodId) => {
  try {
    const data = await authFetch(`/payment-methods/${paymentMethodId}/default`, {
      method: 'PUT',
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error setting default payment method:', error);
    return { success: false, error: 'Funcionalidad próximamente disponible' };
  }
};

export const subscribeToPlan = async (planId, paymentMethodId) => {
  try {
    const data = await authFetch('/subscriptions/subscribe', {
      method: 'POST',
      body: JSON.stringify({ 
        planId: planId, 
        payment_method_id: paymentMethodId 
      }),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error subscribing to plan:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const cancelSubscription = async (subscriptionId) => {
  try {
    const data = await authFetch(`/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// FINANCE - Funciones adicionales para finances.js
// ==========================================

// Alias: getPersonalizedTips -> getTips
export const getPersonalizedTips = async (language = 'es') => {
  try {
    const data = await authFetch(`/finance/tips/personalized?lang=${language}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    // Fallback to regular tips
    try {
      const fallbackData = await authFetch(`/finance/tips?lang=${language}`);
      return { success: true, data: fallbackData.data || fallbackData || [] };
    } catch (e) {
      console.log('Tips endpoint not available:', error.message);
      return { success: true, data: [] };
    }
  }
};

// Alias: createFinanceGoal -> createSavingsGoal
export const createFinanceGoal = async (goalData) => {
  try {
    const data = await authFetch('/finance/goals', {
      method: 'POST',
      body: JSON.stringify(goalData),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error creating finance goal:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// Alias: addGoalContribution -> addSavingsContribution
export const addGoalContribution = async (goalId, contributionData) => {
  try {
    // contributionData puede ser un objeto {amount: X} o solo el amount
    const body = typeof contributionData === 'object' ? contributionData : { amount: contributionData };
    const data = await authFetch(`/finance/goals/${goalId}/contributions`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error adding goal contribution:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// Mark tip as read
export const markTipAsRead = async (tipId) => {
  try {
    const data = await authFetch(`/finance/tips/${tipId}/read`, {
      method: 'POST',
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.log('Mark tip as read not available:', error.message);
    return { success: true };
  }
};

// Send tip feedback
export const sendTipFeedback = async (tipId, feedback) => {
  try {
    const data = await authFetch(`/finance/tips/${tipId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.log('Tip feedback not available:', error.message);
    return { success: true };
  }
};

// Get upcoming invoices with days parameter
export const getUpcomingInvoices = async (days = 30) => {
  try {
    const data = await authFetch(`/finance/invoices/upcoming?days=${days}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    // Try regular invoices endpoint as fallback
    try {
      const fallbackData = await authFetch('/finance/invoices?status=pending');
      return { success: true, data: fallbackData.data || fallbackData || [] };
    } catch (fallbackError) {
      console.log('Upcoming invoices not available:', error.message);
      return { success: true, data: [] };
    }
  }
};

// Create invoice
export const createInvoice = async (invoiceData) => {
  try {
    const data = await authFetch('/finance/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error creating invoice:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// Mark invoice as paid
export const markInvoicePaid = async (invoiceId, paymentData = {}) => {
  try {
    const data = await authFetch(`/finance/invoices/${invoiceId}/pay`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// PMS - Property Management System (Rental)
// ==========================================

// Dashboard KPIs
export const getPMSDashboard = async () => {
  try {
    const data = await authFetch('/rental/dashboard');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching PMS dashboard:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// Properties
export const getPMSProperties = async () => {
  try {
    const data = await authFetch('/rental/properties');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching PMS properties:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const createPMSProperty = async (propertyData) => {
  try {
    const data = await authFetch('/rental/properties', {
      method: 'POST',
      body: JSON.stringify({
        name: propertyData.name,
        address: propertyData.address,
        property_type: propertyData.type || 'apartment',
        city: propertyData.city,
        country: propertyData.country || 'Honduras',
      }),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error creating PMS property:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const updatePMSProperty = async (propertyId, propertyData) => {
  try {
    const data = await authFetch(`/rental/properties/${propertyId}`, {
      method: 'PUT',
      body: JSON.stringify(propertyData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error updating PMS property:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const deletePMSProperty = async (propertyId) => {
  try {
    const data = await authFetch(`/rental/properties/${propertyId}`, {
      method: 'DELETE',
    });
    return { success: true, message: data.message };
  } catch (error) {
    console.error('Error deleting PMS property:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// Units
export const getPMSUnits = async (propertyId = null) => {
  try {
    const endpoint = propertyId ? `/rental/units?property_id=${propertyId}` : '/rental/units';
    const data = await authFetch(endpoint);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching PMS units:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const createPMSUnit = async (unitData) => {
  try {
    const data = await authFetch('/rental/units', {
      method: 'POST',
      body: JSON.stringify(unitData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error creating PMS unit:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// Tenants
export const getPMSTenants = async () => {
  try {
    const data = await authFetch('/rental/tenants');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching PMS tenants:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const createPMSTenant = async (tenantData) => {
  try {
    const data = await authFetch('/rental/tenants', {
      method: 'POST',
      body: JSON.stringify(tenantData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error creating PMS tenant:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// Leases
export const getPMSLeases = async () => {
  try {
    const data = await authFetch('/rental/leases');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching PMS leases:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const createPMSLease = async (leaseData) => {
  try {
    const data = await authFetch('/rental/leases', {
      method: 'POST',
      body: JSON.stringify(leaseData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error creating PMS lease:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// Payments
export const getPMSPayments = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.property_id) queryParams.append('property_id', params.property_id);
    
    const query = queryParams.toString();
    const endpoint = query ? `/rental/payments?${query}` : '/rental/payments';
    
    const data = await authFetch(endpoint);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching PMS payments:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const recordPMSPayment = async (paymentId, paymentData = {}) => {
  try {
    const data = await authFetch(`/rental/payments/${paymentId}/record`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error recording PMS payment:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const generatePMSMonthlyPayments = async () => {
  try {
    const data = await authFetch('/rental/payments/generate', {
      method: 'POST',
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error generating monthly payments:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// Maintenance
export const getPMSMaintenance = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.property_id) queryParams.append('property_id', params.property_id);
    
    const query = queryParams.toString();
    const endpoint = query ? `/rental/maintenance?${query}` : '/rental/maintenance';
    
    const data = await authFetch(endpoint);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching PMS maintenance:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const createPMSMaintenanceTicket = async (ticketData) => {
  try {
    const data = await authFetch('/rental/maintenance', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error creating PMS maintenance ticket:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const updatePMSMaintenanceTicket = async (ticketId, ticketData) => {
  try {
    const data = await authFetch(`/rental/maintenance/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify(ticketData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error updating PMS maintenance ticket:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// Expenses
export const getPMSExpenses = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.property_id) queryParams.append('property_id', params.property_id);
    
    const query = queryParams.toString();
    const endpoint = query ? `/rental/expenses?${query}` : '/rental/expenses';
    
    const data = await authFetch(endpoint);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching PMS expenses:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const createPMSExpense = async (expenseData) => {
  try {
    const data = await authFetch('/rental/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error creating PMS expense:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// Invitations (Tenant Portal)
export const getPMSInvitations = async () => {
  try {
    const data = await authFetch('/rental/invitations');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching PMS invitations:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const createPMSInvitation = async (invitationData) => {
  try {
    const data = await authFetch('/rental/invitations', {
      method: 'POST',
      body: JSON.stringify(invitationData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error creating PMS invitation:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ============================================
// ORGANIZATIONS / MY UNIT
// ============================================

export const getMyOrganizations = async () => {
  try {
    const data = await authFetch('/invitations/my-organizations');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.log('Organizations not available:', error.message);
    return { success: true, data: [] };
  }
};

export const switchOrganization = async (locationId) => {
  try {
    const data = await authFetch(`/invitations/switch-organization/${locationId}`, {
      method: 'POST',
      body: JSON.stringify({ location_id: locationId }),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error switching organization:', error);
    return { success: false, error: error.message || 'No se pudo cambiar de comunidad' };
  }
};
// ==========================================
// RESIDENT QR (TOTP)
// ==========================================

export const getResidentQRSecret = async (locationId) => {
  try {
    const url = locationId ? `/resident-qr/secret?location_id=${locationId}` : '/resident-qr/secret';
    const data = await authFetch(url);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching resident QR secret:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getResidentQRLogs = async (limit = 20) => {
  try {
    const data = await authFetch(`/resident-qr/logs?limit=${limit}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching resident QR logs:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const regenerateResidentQRSecret = async () => {
  try {
    const data = await authFetch('/resident-qr/regenerate', {
      method: 'POST',
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error regenerating resident QR secret:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};
// ==========================================
// AGREGAR ESTO AL FINAL DE src/services/api.js
// ==========================================

import { supabase } from '../config/supabase';

/**
 * Sube una imagen de avatar a Supabase Storage
 * @param {string} uri - URI local de la imagen
 * @param {string} userId - ID del usuario
 */
export const uploadAvatar = async (uri, userId) => {
  try {
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Convertir URI a blob
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt}`,
        upsert: true,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return { success: false, error: error.message };
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return { success: true, url: urlData.publicUrl };
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return { success: false, error: error.message };
  }
};
// ==========================================
// INVITATIONS - Join Community
// ==========================================

/**
 * Verificar código de invitación personal
 */
export const verifyInvitationCode = async (code) => {
  try {
    const response = await fetch(`${API_URL}/invitations/verify/${code}`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error verifying invitation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Aceptar código de invitación personal
 */
export const acceptInvitationCode = async (code) => {
  try {
    const response = await fetch(`${API_URL}/invitations/accept/${code}`, {
      method: 'POST',
      headers: await getAuthHeaders(),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verificar código público de comunidad
 */
export const verifyPublicCode = async (code) => {
  try {
    const response = await fetch(`${API_URL}/invitations/public/${code}`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error verifying public code:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Unirse a comunidad con código público
 */
export const joinWithPublicCode = async (code, unitDetails) => {
  try {
    const response = await fetch(`${API_URL}/invitations/join-public/${code}`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ unit_details: unitDetails }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error joining with public code:', error);
    return { success: false, error: error.message };
  }
};
// ==========================================
// COMMUNITY PAYMENTS
// Add these functions to src/services/api.js
// ==========================================

/**
 * Get my pending charges and payment history
 */
export const getMyCommunityCharges = async () => {
  try {
    const data = await authFetch('/community-payments/my-charges');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching community charges:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

/**
 * Get payment settings for location (bank info, allowed methods)
 */
export const getCommunityPaymentSettings = async () => {
  try {
    const data = await authFetch('/community-payments/settings');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching payment settings:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

/**
 * Submit proof of payment
 */
export const submitPaymentProof = async (chargeId, proofData) => {
  try {
    const data = await authFetch(`/community-payments/${chargeId}/submit-proof`, {
      method: 'POST',
      body: JSON.stringify(proofData),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error submitting proof:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

/**
 * Pay with card
 */
export const payCommunityChargeWithCard = async (chargeId, paymentMethodId) => {
  try {
    const data = await authFetch(`/community-payments/${chargeId}/pay-card`, {
      method: 'POST',
      body: JSON.stringify({ payment_method_id: paymentMethodId }),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error paying with card:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// ADMIN - COMMUNITY PAYMENTS
// ==========================================

/**
 * Get all charges for location (Admin)
 */
export const getAdminCommunityCharges = async (status = 'active') => {
  try {
    const data = await authFetch(`/community-payments/admin/charges?status=${status}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching admin charges:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

/**
 * Create new charge (Admin)
 */
export const createCommunityCharge = async (chargeData) => {
  try {
    const data = await authFetch('/community-payments/admin/charges', {
      method: 'POST',
      body: JSON.stringify(chargeData),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error creating charge:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

/**
 * Cancel/delete charge (Admin)
 */
export const cancelCommunityCharge = async (chargeId) => {
  try {
    const data = await authFetch(`/community-payments/admin/charges/${chargeId}`, {
      method: 'DELETE',
    });
    return { success: true, message: data.message };
  } catch (error) {
    console.error('Error canceling charge:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

/**
 * Get all payments (Admin)
 */
export const getAdminCommunityPayments = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.charge_id) queryParams.append('charge_id', params.charge_id);
    
    const query = queryParams.toString();
    const endpoint = query ? `/community-payments/admin/payments?${query}` : '/community-payments/admin/payments';
    
    const data = await authFetch(endpoint);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching admin payments:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

/**
 * Get pending proof verifications (Admin)
 */
export const getPendingPaymentProofs = async () => {
  try {
    const data = await authFetch('/community-payments/admin/pending-proofs');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching pending proofs:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

/**
 * Verify/approve proof of payment (Admin)
 */
export const verifyPaymentProof = async (paymentId, verifyData = {}) => {
  try {
    const data = await authFetch(`/community-payments/admin/payments/${paymentId}/verify`, {
      method: 'POST',
      body: JSON.stringify(verifyData),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error verifying proof:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

/**
 * Reject proof of payment (Admin)
 */
export const rejectPaymentProof = async (paymentId, reason) => {
  try {
    const data = await authFetch(`/community-payments/admin/payments/${paymentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error rejecting proof:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

/**
 * Get residents for charge creation (Admin)
 */
export const getResidentsForCharge = async (search = '') => {
  try {
    const endpoint = search 
      ? `/community-payments/admin/residents?search=${encodeURIComponent(search)}`
      : '/community-payments/admin/residents';
    const data = await authFetch(endpoint);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching residents:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

/**
 * Get payment statistics (Admin)
 */
export const getCommunityPaymentStats = async () => {
  try {
    const data = await authFetch('/community-payments/admin/stats');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};
// ==========================================
// DEMO REQUESTS
// ==========================================
export const createDemoRequest = async (data) => {
  try {
    const response = await fetch(`${API_URL}/demo-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    const result = await response.json();
   console.log('Response status:', response.status, 'Result:', JSON.stringify(result));
    if (!response.ok) {
      throw new Error(result.error || 'Error al enviar solicitud');
    }
    return { success: true, data: result.data, message: result.message };
  } catch (error) {
    console.error('Error creating demo request:', error);
    return { success: false, error: error.message };
  }
};
// ==========================================
// FINANCE - BUDGET ASSISTANT
// ==========================================
export const getBudgetAssistant = async (monthlyIncome = null) => {
  try {
    const endpoint = monthlyIncome 
      ? `/finance/budget-assistant?monthly_income=${monthlyIncome}`
      : '/finance/budget-assistant';
    const data = await authFetch(endpoint);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching budget assistant:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const applyBudgetSuggestion = async (rule, monthlyIncome) => {
  try {
    const data = await authFetch('/finance/budget-assistant/apply', {
      method: 'POST',
      body: JSON.stringify({ rule, monthly_income: monthlyIncome })
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error applying budget suggestion:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// FINANCE - REPORTS & CHARTS
// ==========================================
export const getReportSummary = async (months = 6) => {
  try {
    const data = await authFetch(`/finance/reports/summary?months=${months}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching report summary:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getReportByCategory = async (type = 'expense', startDate = null, endDate = null) => {
  try {
    let endpoint = `/finance/reports/by-category?type=${type}`;
    if (startDate) endpoint += `&start_date=${startDate}`;
    if (endDate) endpoint += `&end_date=${endDate}`;
    const data = await authFetch(endpoint);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching report by category:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getReportTrends = async (category = null, months = 6) => {
  try {
    let endpoint = `/finance/reports/trends?months=${months}`;
    if (category) endpoint += `&category=${category}`;
    const data = await authFetch(endpoint);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching report trends:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getMonthComparison = async () => {
  try {
    const data = await authFetch('/finance/reports/comparison');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching month comparison:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// FINANCE - GOAL PROJECTIONS
// ==========================================
export const getGoalProjection = async (goalId) => {
  try {
    const data = await authFetch(`/finance/goals/${goalId}/projection`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching goal projection:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const calculateGoalPlan = async (targetAmount, currentAmount = 0, deadline = null, monthlyCapacity = null) => {
  try {
    const data = await authFetch('/finance/goals/calculate', {
      method: 'POST',
      body: JSON.stringify({ 
        target_amount: targetAmount, 
        current_amount: currentAmount,
        deadline,
        monthly_capacity: monthlyCapacity
      })
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error calculating goal plan:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// FINANCE - SUBSCRIPTIONS (RECURRING PAYMENTS)
// ==========================================
export const getSubscriptions = async (activeOnly = false) => {
  try {
    const endpoint = activeOnly ? '/finance/subscriptions?active_only=true' : '/finance/subscriptions';
    const data = await authFetch(endpoint);
    return { success: true, data: data.data || data, summary: data.summary };
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const createSubscription = async (subscriptionData) => {
  try {
    const data = await authFetch('/finance/subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscriptionData)
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error creating subscription:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const updateSubscription = async (id, updates) => {
  try {
    const data = await authFetch(`/finance/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error updating subscription:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const deleteSubscription = async (id) => {
  try {
    const data = await authFetch(`/finance/subscriptions/${id}`, {
      method: 'DELETE'
    });
    return { success: true, message: data.message };
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const markSubscriptionPaid = async (id, registerTransaction = true) => {
  try {
    const data = await authFetch(`/finance/subscriptions/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify({ register_transaction: registerTransaction })
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error marking subscription paid:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

// ==========================================
// FINANCE - RECEIVABLES (ACCOUNTS RECEIVABLE)
// ==========================================
export const getReceivables = async (status = null) => {
  try {
    const endpoint = status ? `/finance/receivables?status=${status}` : '/finance/receivables';
    const data = await authFetch(endpoint);
    return { success: true, data: data.data || data, summary: data.summary };
  } catch (error) {
    console.error('Error fetching receivables:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const createReceivable = async (receivableData) => {
  try {
    const data = await authFetch('/finance/receivables', {
      method: 'POST',
      body: JSON.stringify(receivableData)
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error creating receivable:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const updateReceivable = async (id, updates) => {
  try {
    const data = await authFetch(`/finance/receivables/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error updating receivable:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const deleteReceivable = async (id) => {
  try {
    const data = await authFetch(`/finance/receivables/${id}`, {
      method: 'DELETE'
    });
    return { success: true, message: data.message };
  } catch (error) {
    console.error('Error deleting receivable:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const markReceivableCollected = async (id, registerIncome = true, paymentMethod = null) => {
  try {
    const data = await authFetch(`/finance/receivables/${id}/collect`, {
      method: 'POST',
      body: JSON.stringify({ register_income: registerIncome, payment_method: paymentMethod })
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error marking receivable collected:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const addReceivablePayment = async (id, amount, paymentMethod = null, notes = null, registerIncome = true) => {
  try {
    const data = await authFetch(`/finance/receivables/${id}/payment`, {
      method: 'POST',
      body: JSON.stringify({ amount, payment_method: paymentMethod, notes, register_income: registerIncome })
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error adding receivable payment:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const getReceivablePayments = async (id) => {
  try {
    const data = await authFetch(`/finance/receivables/${id}/payments`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching receivable payments:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};
// ============================================
// Configuración del Usuario - Finanzas
// ============================================
export const getFinanceSettings = async () => {
  try {
    const response = await api.get('/finance/settings');
    return response.data;
  } catch (error) {
    console.error('Error getting finance settings:', error);
    return { success: false, error: error.message };
  }
};

export const updateFinanceSettings = async (settings) => {
  try {
    const response = await api.put('/finance/settings', settings);
    return response.data;
  } catch (error) {
    console.error('Error updating finance settings:', error);
    return { success: false, error: error.message };
  }
};
