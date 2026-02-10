// src/services/credentialsService.js
// ISSY SuperApp - Credentials Service for Access Control

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.joinissy.com/api';

// Helper para hacer requests autenticados
const authenticatedFetch = async (endpoint, options = {}) => {
  const token = await AsyncStorage.getItem('token');

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error en la solicitud');
  }

  return data;
};

// ==========================================
// CREDENTIALS API
// ==========================================

/**
 * Obtener mis credenciales (tags/tarjetas asignadas)
 */
export const getMyCredentials = async () => {
  return authenticatedFetch('/credentials/my-credentials');
};

/**
 * Obtener credenciales por ubicación
 */
export const getCredentialsByLocation = async (locationId) => {
  return authenticatedFetch(`/credentials/location/${locationId}`);
};

/**
 * Obtener detalle de una credencial
 */
export const getCredentialById = async (credentialId) => {
  return authenticatedFetch(`/credentials/${credentialId}`);
};

/**
 * Reportar credencial perdida
 */
export const reportLostCredential = async (credentialId) => {
  return authenticatedFetch(`/credentials/${credentialId}/report-lost`, {
    method: 'POST',
  });
};

/**
 * Obtener historial de accesos de una credencial
 */
export const getCredentialAccessLogs = async (credentialId, params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.limit) queryParams.append('limit', params.limit);

  const queryString = queryParams.toString();
  const endpoint = `/credentials/${credentialId}/logs${queryString ? `?${queryString}` : ''}`;

  return authenticatedFetch(endpoint);
};

/**
 * Obtener mis logs de acceso (todos mis tags/tarjetas)
 */
export const getMyAccessLogs = async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.locationId) queryParams.append('locationId', params.locationId);

  const queryString = queryParams.toString();
  const endpoint = `/credentials/my-access-logs${queryString ? `?${queryString}` : ''}`;

  return authenticatedFetch(endpoint);
};

/**
 * Verificar si el control de acceso está habilitado en una ubicación
 */
export const checkAccessControlEnabled = async (locationId) => {
  return authenticatedFetch(`/credentials/config/${locationId}/status`);
};

export default {
  getMyCredentials,
  getCredentialsByLocation,
  getCredentialById,
  reportLostCredential,
  getCredentialAccessLogs,
  getMyAccessLogs,
  checkAccessControlEnabled,
};
