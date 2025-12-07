// src/services/api.js
// ISSY Resident App - API Service

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.joinissy.com/api';

// ==========================================
// HELPER
// ==========================================

const authFetch = async (endpoint, options = {}) => {
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

// ==========================================
// QR CODES - TODAS LAS FUNCIONALIDADES
// ==========================================

/**
 * Obtener mis códigos QR
 */
export const getMyQRCodes = async () => {
  try {
    const data = await authFetch('/qr');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching QR codes:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generar código QR con todos los tipos soportados
 * @param {Object} qrData - Datos del QR
 * @param {string} qrData.visitor_name - Nombre del visitante (requerido)
 * @param {string} qrData.visitor_phone - Teléfono del visitante (requerido)
 * @param {string} qrData.visitor_id_number - Número de identidad (opcional)
 * @param {string} qrData.qr_type - Tipo: 'single', 'temporary', 'frequent'
 * @param {string} qrData.valid_from - Fecha/hora inicio (ISO string)
 * @param {string} qrData.valid_until - Fecha/hora fin (ISO string)
 * @param {Object} qrData.schedule - Para tipo 'frequent': { days: [0-6], start_time: 'HH:MM', end_time: 'HH:MM' }
 */
export const generateQRCode = async (qrData) => {
  try {
    const data = await authFetch('/qr/generate', {
      method: 'POST',
      body: JSON.stringify(qrData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error generating QR:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generar QR de visitante simple (retrocompatibilidad)
 */
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
    return { success: false, error: error.message };
  }
};

/**
 * Eliminar código QR
 */
export const deleteQRCode = async (id) => {
  try {
    await authFetch(`/qr/${id}`, { method: 'DELETE' });
    return { success: true };
  } catch (error) {
    console.error('Error deleting QR:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtener detalle de un QR específico
 */
export const getQRCodeDetail = async (id) => {
  try {
    const data = await authFetch(`/qr/${id}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching QR detail:', error);
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
  }
};

export const getTicketDetail = async (id) => {
  try {
    const data = await authFetch(`/rental/my-tickets/${id}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
  }
};

export const markAnnouncementRead = async (id) => {
  try {
    await authFetch(`/announcements/${id}/read`, { method: 'POST' });
    return { success: true };
  } catch (error) {
    console.error('Error marking announcement read:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// SUSCRIPCIONES
// ==========================================

export const getPlans = async (vertical = null) => {
  try {
    const url = vertical ? `/subscriptions/plans?vertical=${vertical}` : '/subscriptions/plans';
    const data = await authFetch(url);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching plans:', error);
    return { success: false, error: error.message };
  }
};

export const getMySubscriptions = async () => {
  try {
    const data = await authFetch('/subscriptions/my');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return { success: false, error: error.message };
  }
};

export const startTrial = async (planId) => {
  try {
    const data = await authFetch('/subscriptions/trial', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error starting trial:', error);
    return { success: false, error: error.message };
  }
};

export const subscribeToPlan = async (planId, paymentMethodId, billingPeriod = 'monthly') => {
  try {
    const data = await authFetch('/subscriptions/subscribe/saved-card', {
      method: 'POST',
      body: JSON.stringify({ planId, paymentMethodId, billingPeriod }),
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error subscribing:', error);
    return { success: false, error: error.message };
  }
};

export const cancelSubscription = async (subscriptionId, reason) => {
  try {
    const data = await authFetch(`/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// MÉTODOS DE PAGO (CLINPAYS)
// ==========================================

export const getPaymentMethods = async () => {
  try {
    const data = await authFetch('/clinpays/methods');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return { success: false, error: error.message };
  }
};

export const addPaymentMethod = async (cardData) => {
  try {
    const data = await authFetch('/clinpays/methods', {
      method: 'POST',
      body: JSON.stringify(cardData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error adding payment method:', error);
    return { success: false, error: error.message };
  }
};

export const deletePaymentMethod = async (cardId) => {
  try {
    await authFetch(`/clinpays/methods/${cardId}`, { method: 'DELETE' });
    return { success: true };
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return { success: false, error: error.message };
  }
};

export const setDefaultPaymentMethod = async (cardId) => {
  try {
    const data = await authFetch(`/clinpays/methods/${cardId}/default`, {
      method: 'PATCH',
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error setting default card:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// PERFIL
// ==========================================

export const getUserProfile = async () => {
  try {
    const data = await authFetch('/auth/me');
    return { success: true, data: data.user || data };
  } catch (error) {
    console.error('Error fetching profile:', error);
    return { success: false, error: error.message };
  }
};

export const updateProfile = async (profileData) => {
  try {
    const data = await authFetch('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// INVITACIONES
// ==========================================

export const verifyInvitation = async (code) => {
  try {
    const data = await authFetch(`/invitations/verify/${code}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error verifying invitation:', error);
    return { success: false, error: error.message };
  }
};

export const acceptInvitation = async (code) => {
  try {
    const data = await authFetch(`/invitations/accept/${code}`, {
      method: 'POST',
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// ÁREAS COMUNES / RESERVACIONES
// ==========================================

export const getCommonAreas = async () => {
  try {
    const data = await authFetch('/common-areas');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching common areas:', error);
    return { success: false, error: error.message };
  }
};

export const getMyReservations = async () => {
  try {
    const data = await authFetch('/reservations/my');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
  }
};

export const cancelReservation = async (id) => {
  try {
    await authFetch(`/reservations/${id}`, { method: 'DELETE' });
    return { success: true };
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    return { success: false, error: error.message };
  }
};
// ==========================================
// PMS - GESTOR DE PROPIEDADES
// ==========================================

export const getPMSDashboard = async () => {
  try {
    const data = await authFetch('/rental/dashboard');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching PMS dashboard:', error);
    return { success: false, error: error.message };
  }
};

export const getPMSProperties = async () => {
  try {
    const data = await authFetch('/rental/properties');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching properties:', error);
    return { success: false, error: error.message };
  }
};

export const createPMSProperty = async (propertyData) => {
  try {
    const data = await authFetch('/rental/properties', {
      method: 'POST',
      body: JSON.stringify(propertyData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error creating property:', error);
    return { success: false, error: error.message };
  }
};

export const deletePMSProperty = async (id) => {
  try {
    await authFetch(`/rental/properties/${id}`, { method: 'DELETE' });
    return { success: true };
  } catch (error) {
    console.error('Error deleting property:', error);
    return { success: false, error: error.message };
  }
};

export const getPMSTenants = async () => {
  try {
    const data = await authFetch('/rental/tenants');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return { success: false, error: error.message };
  }
};

export const getPMSPayments = async () => {
  try {
    const data = await authFetch('/rental/payments');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching PMS payments:', error);
    return { success: false, error: error.message };
  }
};

export const recordPMSPayment = async (paymentId) => {
  try {
    const data = await authFetch(`/rental/payments/${paymentId}/record`, {
      method: 'POST',
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error recording payment:', error);
    return { success: false, error: error.message };
  }
};

export const getPMSMaintenance = async () => {
  try {
    const data = await authFetch('/rental/maintenance');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching maintenance:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// SUSCRIPCIONES
// ==========================================

export const getVerticalPlans = async (vertical) => {
  try {
    const url = vertical ? `/subscriptions/plans?vertical=${vertical}` : '/subscriptions/plans';
    const data = await authFetch(url);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching plans:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// ORGANIZACIONES E INVITACIONES
// ==========================================

export const verifyInvitationCode = async (code) => {
  try {
    const response = await fetch(`https://api.joinissy.com/api/invitations/verify/${code}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Código inválido');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error verifying invitation:', error);
    return { success: false, error: error.message };
  }
};

export const acceptInvitationCode = async (code) => {
  try {
    const data = await authFetch(`/invitations/accept/${code}`, { method: 'POST' });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return { success: false, error: error.message };
  }
};

export const getMyOrganizations = async () => {
  try {
    const data = await authFetch('/invitations/my-organizations');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return { success: false, error: error.message };
  }
};

export const switchOrganization = async (locationId) => {
  try {
    const data = await authFetch(`/invitations/switch-organization/${locationId}`, { method: 'POST' });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error switching organization:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// FINANCE - Finanzas Personales
// ==========================================

export const getFinanceDashboard = async () => {
  try {
    const data = await authFetch('/finance/dashboard');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching finance dashboard:', error);
    return { success: false, error: error.message };
  }
};

export const getTransactions = async (params = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const data = await authFetch(`/finance/transactions${query ? `?${query}` : ''}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return { success: false, error: error.message };
  }
};

export const createTransaction = async (transactionData) => {
  try {
    const data = await authFetch('/finance/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error creating transaction:', error);
    return { success: false, error: error.message };
  }
};

export const deleteTransaction = async (id) => {
  try {
    await authFetch(`/finance/transactions/${id}`, {
      method: 'DELETE',
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return { success: false, error: error.message };
  }
};

export const getCategories = async (type) => {
  try {
    const data = await authFetch(`/finance/categories${type ? `?type=${type}` : ''}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return { success: false, error: error.message };
  }
};

export const getFinanceGoals = async (status = 'active') => {
  try {
    const data = await authFetch(`/finance/goals?status=${status}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching goals:', error);
    return { success: false, error: error.message };
  }
};

export const createFinanceGoal = async (goalData) => {
  try {
    const data = await authFetch('/finance/goals', {
      method: 'POST',
      body: JSON.stringify(goalData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error creating goal:', error);
    return { success: false, error: error.message };
  }
};

export const addGoalContribution = async (goalId, contributionData) => {
  try {
    const data = await authFetch(`/finance/goals/${goalId}/contributions`, {
      method: 'POST',
      body: JSON.stringify(contributionData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error adding contribution:', error);
    return { success: false, error: error.message };
  }
};

export const getFinanceStats = async () => {
  try {
    const data = await authFetch('/finance/stats');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { success: false, error: error.message };
  }
};

export const getAchievements = async () => {
  try {
    const data = await authFetch('/finance/achievements');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// FINANCE - Consejos Financieros (Tips)
// ==========================================

export const getFinanceTips = async (category = null, limit = 10) => {
  try {
    let url = `/finance/tips?limit=${limit}`;
    if (category) url += `&category=${category}`;
    const data = await authFetch(url);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching tips:', error);
    return { success: false, error: error.message };
  }
};

export const getPersonalizedTips = async () => {
  try {
    const data = await authFetch('/finance/tips/personalized');
    return { success: true, data: data.data || data, context: data.context };
  } catch (error) {
    console.error('Error fetching personalized tips:', error);
    return { success: false, error: error.message };
  }
};

export const markTipAsRead = async (tipId) => {
  try {
    const data = await authFetch(`/finance/tips/${tipId}/read`, {
      method: 'POST',
    });
    return { success: true, data: data.data || data, message: data.message };
  } catch (error) {
    console.error('Error marking tip as read:', error);
    return { success: false, error: error.message };
  }
};

export const sendTipFeedback = async (tipId, helpful, dismissed = false) => {
  try {
    const data = await authFetch(`/finance/tips/${tipId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ helpful, dismissed }),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error sending tip feedback:', error);
    return { success: false, error: error.message };
  }
};
