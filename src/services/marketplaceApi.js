// src/services/marketplaceApi.js
// ISSY Marketplace - API Service

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.joinissy.com/api';

// ==========================================
// AUTH FETCH CON AUTO-REFRESH
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
// SERVICES
// ==========================================

export const getServices = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();

    if (filters.category) queryParams.append('category', filters.category);
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.min_price) queryParams.append('min_price', filters.min_price);
    if (filters.max_price) queryParams.append('max_price', filters.max_price);
    if (filters.min_rating) queryParams.append('min_rating', filters.min_rating);
    if (filters.sort) queryParams.append('sort', filters.sort);
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);

    const query = queryParams.toString();
    const url = `/marketplace/services${query ? `?${query}` : ''}`;

    const data = await authFetch(url);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching services:', error);
    return { success: false, error: error.message };
  }
};

export const getServiceById = async (serviceId) => {
  try {
    const data = await authFetch(`/marketplace/services/${serviceId}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching service:', error);
    return { success: false, error: error.message };
  }
};

export const getFeaturedServices = async () => {
  try {
    const data = await authFetch('/marketplace/services/featured');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching featured services:', error);
    return { success: false, error: error.message };
  }
};

export const getCategories = async () => {
  try {
    const data = await authFetch('/marketplace/categories');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// BOOKINGS
// ==========================================

export const createBooking = async (bookingData) => {
  try {
    const data = await authFetch('/marketplace/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error creating booking:', error);
    return { success: false, error: error.message };
  }
};

export const getMyBookings = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);

    const query = queryParams.toString();
    const url = `/marketplace/bookings${query ? `?${query}` : ''}`;

    const data = await authFetch(url);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return { success: false, error: error.message };
  }
};

export const getBookingById = async (bookingId) => {
  try {
    const data = await authFetch(`/marketplace/bookings/${bookingId}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching booking:', error);
    return { success: false, error: error.message };
  }
};

export const updateBookingStatus = async (bookingId, status, reason = null) => {
  try {
    const data = await authFetch(`/marketplace/bookings/${bookingId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason }),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error updating booking status:', error);
    return { success: false, error: error.message };
  }
};

export const cancelBooking = async (bookingId, reason) => {
  try {
    const data = await authFetch(`/marketplace/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return { success: false, error: error.message };
  }
};

export const rateBooking = async (bookingId, ratingData) => {
  try {
    const data = await authFetch(`/marketplace/bookings/${bookingId}/rate`, {
      method: 'POST',
      body: JSON.stringify(ratingData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error rating booking:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// QUOTES
// ==========================================

export const requestQuote = async (quoteData) => {
  try {
    const data = await authFetch('/marketplace/quotes', {
      method: 'POST',
      body: JSON.stringify(quoteData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error requesting quote:', error);
    return { success: false, error: error.message };
  }
};

export const acceptQuote = async (bookingId) => {
  try {
    const data = await authFetch(`/marketplace/bookings/${bookingId}/accept-quote`, {
      method: 'POST',
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error accepting quote:', error);
    return { success: false, error: error.message };
  }
};

export const rejectQuote = async (bookingId, reason) => {
  try {
    const data = await authFetch(`/marketplace/bookings/${bookingId}/reject-quote`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error rejecting quote:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// PROVIDERS
// ==========================================

export const getProviderById = async (providerId) => {
  try {
    const data = await authFetch(`/marketplace/providers/${providerId}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching provider:', error);
    return { success: false, error: error.message };
  }
};

export const getProviderServices = async (providerId) => {
  try {
    const data = await authFetch(`/marketplace/providers/${providerId}/services`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching provider services:', error);
    return { success: false, error: error.message };
  }
};

export const getProviderReviews = async (providerId, page = 1) => {
  try {
    const data = await authFetch(`/marketplace/providers/${providerId}/reviews?page=${page}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching provider reviews:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// PROVIDER REGISTRATION
// ==========================================

export const registerAsProvider = async (providerData) => {
  try {
    const data = await authFetch('/marketplace/providers/register', {
      method: 'POST',
      body: JSON.stringify(providerData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error registering as provider:', error);
    return { success: false, error: error.message };
  }
};

export const submitKycDocuments = async (documents) => {
  try {
    const data = await authFetch('/marketplace/providers/kyc', {
      method: 'POST',
      body: JSON.stringify({ documents }),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error submitting KYC:', error);
    return { success: false, error: error.message };
  }
};

export const getMyProviderProfile = async () => {
  try {
    const data = await authFetch('/marketplace/providers/me');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching provider profile:', error);
    return { success: false, error: error.message };
  }
};

export const updateProviderProfile = async (profileData) => {
  try {
    const data = await authFetch('/marketplace/providers/me', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error updating provider profile:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// PROVIDER SERVICES MANAGEMENT
// ==========================================

export const getMyServices = async () => {
  try {
    const data = await authFetch('/marketplace/providers/me/services');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching my services:', error);
    return { success: false, error: error.message };
  }
};

export const createService = async (serviceData) => {
  try {
    const data = await authFetch('/marketplace/providers/me/services', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error creating service:', error);
    return { success: false, error: error.message };
  }
};

export const updateService = async (serviceId, serviceData) => {
  try {
    const data = await authFetch(`/marketplace/providers/me/services/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify(serviceData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error updating service:', error);
    return { success: false, error: error.message };
  }
};

export const deleteService = async (serviceId) => {
  try {
    const data = await authFetch(`/marketplace/providers/me/services/${serviceId}`, {
      method: 'DELETE',
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error deleting service:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// PROVIDER BOOKINGS
// ==========================================

export const getProviderBookings = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);

    const query = queryParams.toString();
    const url = `/marketplace/providers/me/bookings${query ? `?${query}` : ''}`;

    const data = await authFetch(url);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching provider bookings:', error);
    return { success: false, error: error.message };
  }
};

export const sendQuote = async (bookingId, quoteDetails) => {
  try {
    const data = await authFetch(`/marketplace/providers/me/bookings/${bookingId}/quote`, {
      method: 'POST',
      body: JSON.stringify(quoteDetails),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error sending quote:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// PROVIDER EARNINGS
// ==========================================

export const getProviderEarnings = async (period = 'month') => {
  try {
    const data = await authFetch(`/marketplace/providers/me/earnings?period=${period}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching earnings:', error);
    return { success: false, error: error.message };
  }
};

export const getProviderPayouts = async (page = 1) => {
  try {
    const data = await authFetch(`/marketplace/providers/me/payouts?page=${page}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return { success: false, error: error.message };
  }
};

export const requestPayout = async (amount) => {
  try {
    const data = await authFetch('/marketplace/providers/me/payouts/request', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error requesting payout:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// BANK ACCOUNTS
// ==========================================

export const getBankAccount = async () => {
  try {
    const data = await authFetch('/marketplace/providers/me/bank-account');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching bank account:', error);
    return { success: false, error: error.message };
  }
};

export const saveBankAccount = async (bankData) => {
  try {
    const data = await authFetch('/marketplace/providers/me/bank-account', {
      method: 'POST',
      body: JSON.stringify(bankData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error saving bank account:', error);
    return { success: false, error: error.message };
  }
};

export const deleteBankAccount = async () => {
  try {
    const data = await authFetch('/marketplace/providers/me/bank-account', {
      method: 'DELETE',
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error deleting bank account:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// TRACKING
// ==========================================

export const startTracking = async (bookingId) => {
  try {
    const data = await authFetch(`/marketplace/tracking/${bookingId}/start`, {
      method: 'POST',
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error starting tracking:', error);
    return { success: false, error: error.message };
  }
};

export const stopTracking = async (bookingId) => {
  try {
    const data = await authFetch(`/marketplace/tracking/${bookingId}/stop`, {
      method: 'POST',
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error stopping tracking:', error);
    return { success: false, error: error.message };
  }
};

export const updateProviderLocation = async (bookingId, locationData) => {
  try {
    const data = await authFetch(`/marketplace/tracking/${bookingId}/location`, {
      method: 'POST',
      body: JSON.stringify(locationData),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error updating location:', error);
    return { success: false, error: error.message };
  }
};

export const markProviderArrival = async (bookingId) => {
  try {
    const data = await authFetch(`/marketplace/tracking/${bookingId}/arrived`, {
      method: 'POST',
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error marking arrival:', error);
    return { success: false, error: error.message };
  }
};

export const getTrackingStatus = async (bookingId) => {
  try {
    const data = await authFetch(`/marketplace/tracking/${bookingId}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error getting tracking status:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// CONVERSATIONS
// ==========================================

export const getConversations = async () => {
  try {
    const data = await authFetch('/marketplace/conversations');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return { success: false, error: error.message };
  }
};

export const getConversationMessages = async (conversationId, page = 1) => {
  try {
    const data = await authFetch(`/marketplace/conversations/${conversationId}/messages?page=${page}`);
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching messages:', error);
    return { success: false, error: error.message };
  }
};

export const sendMessage = async (conversationId, content, attachments = []) => {
  try {
    const data = await authFetch(`/marketplace/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, attachments }),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: error.message };
  }
};

export const markConversationAsRead = async (conversationId) => {
  try {
    const data = await authFetch(`/marketplace/conversations/${conversationId}/read`, {
      method: 'POST',
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error marking as read:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// PRIME MEMBERSHIP
// ==========================================

export const getPrimeMembership = async () => {
  try {
    const data = await authFetch('/marketplace/prime');
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error fetching prime membership:', error);
    return { success: false, error: error.message };
  }
};

export const subscribeToPrime = async (planType) => {
  try {
    const data = await authFetch('/marketplace/prime/subscribe', {
      method: 'POST',
      body: JSON.stringify({ plan_type: planType }),
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error subscribing to prime:', error);
    return { success: false, error: error.message };
  }
};

export const cancelPrime = async () => {
  try {
    const data = await authFetch('/marketplace/prime/cancel', {
      method: 'POST',
    });
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('Error cancelling prime:', error);
    return { success: false, error: error.message };
  }
};

// Export all functions as a single object
export const marketplaceApi = {
  // Services
  getServices,
  getServiceById,
  getFeaturedServices,
  getCategories,

  // Bookings
  createBooking,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  rateBooking,

  // Quotes
  requestQuote,
  acceptQuote,
  rejectQuote,

  // Providers
  getProviderById,
  getProviderServices,
  getProviderReviews,
  registerAsProvider,
  submitKycDocuments,
  getMyProviderProfile,
  updateProviderProfile,

  // Provider Services Management
  getMyServices,
  createService,
  updateService,
  deleteService,

  // Provider Bookings
  getProviderBookings,
  sendQuote,

  // Provider Earnings
  getProviderEarnings,
  getProviderPayouts,
  requestPayout,

  // Bank Accounts
  getBankAccount,
  saveBankAccount,
  deleteBankAccount,

  // Tracking
  startTracking,
  stopTracking,
  updateProviderLocation,
  markProviderArrival,
  getTrackingStatus,

  // Conversations
  getConversations,
  getConversationMessages,
  sendMessage,
  markConversationAsRead,

  // Prime
  getPrimeMembership,
  subscribeToPrime,
  cancelPrime,
};

export default marketplaceApi;
