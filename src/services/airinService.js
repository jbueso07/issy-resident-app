// src/services/airinService.js
// ISSY × Airin - Restaurant Platform API Service

const AIRIN_BASE_URL = 'https://api.airin.pro/public';
const AIRIN_API_KEY = 'issy-airin-prod-2026';

// ==========================================
// BASE FETCH (sin auth ISSY, usa API key de Airin)
// ==========================================

const airinFetch = async (endpoint, options = {}) => {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(`${AIRIN_BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Error en la solicitud a Airin');
  }

  return data;
};

const airinAuthFetch = async (endpoint, options = {}) => {
  return airinFetch(endpoint, {
    ...options,
    headers: {
      'x-api-key': AIRIN_API_KEY,
      ...options.headers,
    },
  });
};

// ==========================================
// RESTAURANTS
// ==========================================

export const getRestaurants = async () => {
  try {
    const data = await airinFetch('/restaurants');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Airin - Error fetching restaurants:', error);
    return { success: false, error: error.message };
  }
};

export const getRestaurant = async (slug) => {
  try {
    const data = await airinFetch(`/restaurants/${slug}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Airin - Error fetching restaurant:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// MENU
// ==========================================

export const getMenu = async (slug) => {
  try {
    const data = await airinFetch(`/menu/${slug}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Airin - Error fetching menu:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// ORDERS (requieren API key)
// ==========================================

export const createOrder = async (orderData) => {
  try {
    const data = await airinAuthFetch('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Airin - Error creating order:', error);
    return { success: false, error: error.message };
  }
};

export const getOrderStatus = async (orderId) => {
  try {
    const data = await airinFetch(`/orders/${orderId}/status`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Airin - Error fetching order status:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// RESERVATIONS (requieren API key)
// ==========================================

export const getReservationSettings = async (slug) => {
  try {
    const data = await airinFetch(`/reservations/settings/${slug}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Airin - Error fetching reservation settings:', error);
    return { success: false, error: error.message };
  }
};

export const createReservation = async (reservationData) => {
  try {
    const data = await airinAuthFetch('/reservations', {
      method: 'POST',
      body: JSON.stringify(reservationData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Airin - Error creating reservation:', error);
    return { success: false, error: error.message };
  }
};

export const getReservationStatus = async (id) => {
  try {
    const data = await airinFetch(`/reservations/${id}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Airin - Error fetching reservation status:', error);
    return { success: false, error: error.message };
  }
};
