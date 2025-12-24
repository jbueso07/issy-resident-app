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

      const response = await fetch(`${API_URL}/auth/refresh`, {
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

export const getMyQRCodes = async () => {
  try {
    const data = await authFetch('/qr');
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

export const getAnnouncements = async () => {
  try {
    const data = await authFetch('/announcements');
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

// ==========================================
// FINANCE - Metas de Ahorro
// ==========================================

export const getSavingsGoals = async () => {
  try {
    const data = await authFetch('/finance/savings-goals');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching savings goals:', error);
    return { success: false, error: error.message, sessionExpired: error.sessionExpired };
  }
};

export const createSavingsGoal = async (goalData) => {
  try {
    const data = await authFetch('/finance/savings-goals', {
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
    const data = await authFetch(`/finance/savings-goals/${goalId}`, {
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
    const data = await authFetch(`/finance/savings-goals/${goalId}`, {
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
    const data = await authFetch(`/finance/savings-goals/${goalId}/contribute`, {
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
// FINANCE - Suscripciones
// ==========================================

export const getFinancePlans = async () => {
  try {
    const response = await fetch(`${API_URL}/subscriptions/plans`);
    const data = await response.json();
    if (data.success) {
      const financePlans = data.data.filter(p => p.vertical === 'finance');
      return { success: true, data: financePlans };
    }
    return { success: false, error: 'Error loading plans' };
  } catch (error) {
    console.error('Error fetching plans:', error);
    return { success: false, error: error.message };
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