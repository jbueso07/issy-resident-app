// src/hooks/useNotifications.js
// ISSY Resident App - Push Notifications Hook

import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import i18n from '../i18n/i18n';
import { getNotificationRoute, getNotificationLocationId, parseNotificationData, isRouteAllowedWhenUnpaid } from '../utils/notificationRoute';

const API_URL = 'https://api.joinissy.com/api';

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ============================================================
// Solicitudes de ingreso (Requerir ingreso v2)
// ============================================================
const ACCESS_REQUEST_CHANNEL_ID = 'access_request';
const ACCESS_REQUEST_CATEGORY_ID = 'access_request';
const ACCESS_REQUEST_EVENT_TYPES = ['access_request', 'access_request_resolved'];

const tr = (key, fallback) => {
  try {
    const v = i18n.t(key);
    return v && v !== key ? v : fallback;
  } catch {
    return fallback;
  }
};

// Canal (Android) + categoría con botones Aprobar/Rechazar. Una sola vez por arranque.
// Ojo Android: el sonido de un canal queda fijo al crearlo; 'solicitud.wav' solo existe en builds
// que lo empaquetan (plugin expo-notifications → sounds en app.json).
let accessRequestSetupPromise = null;
export function setupAccessRequestNotifications() {
  if (!accessRequestSetupPromise) {
    accessRequestSetupPromise = (async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync(ACCESS_REQUEST_CHANNEL_ID, {
            name: tr('accessRequest.channelName', 'Solicitudes de ingreso'),
            importance: Notifications.AndroidImportance.MAX,
            sound: 'solicitud.wav',
            vibrationPattern: [0, 800, 300, 800, 300, 800, 300, 800],
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            bypassDnd: false,
            enableVibrate: true,
            lightColor: '#4FD3B8',
          });
        }
        await Notifications.setNotificationCategoryAsync(ACCESS_REQUEST_CATEGORY_ID, [
          {
            identifier: 'approve',
            buttonTitle: tr('accessRequest.approve', 'Aprobar'),
            options: { opensAppToForeground: true },
          },
          {
            identifier: 'reject',
            buttonTitle: tr('accessRequest.reject', 'Rechazar'),
            options: { opensAppToForeground: true, isDestructive: true },
          },
        ]);
      } catch (error) {
        console.log('⚠️ Error configurando canal/categoría de solicitudes:', error);
        accessRequestSetupPromise = null;
      }
    })();
  }
  return accessRequestSetupPromise;
}

// Eventos en vivo para pantallas abiertas (home, /access-approval)
const accessRequestListeners = new Set();
export function subscribeAccessRequestEvents(callback) {
  accessRequestListeners.add(callback);
  return () => accessRequestListeners.delete(callback);
}
function emitAccessRequestEvent(data) {
  accessRequestListeners.forEach((cb) => {
    try {
      cb(data);
    } catch (e) {
      console.log('accessRequest listener error:', e);
    }
  });
}

// Aviso de que llegó un push con la app abierta (cualquier tipo): lo usa el contador de no leídas
// (NotificationCountContext). Mismo patrón que los eventos de solicitudes de ingreso.
const notificationReceivedListeners = new Set();
export function subscribeNotificationReceived(callback) {
  notificationReceivedListeners.add(callback);
  return () => notificationReceivedListeners.delete(callback);
}
function emitNotificationReceived(data) {
  notificationReceivedListeners.forEach((cb) => {
    try {
      cb(data);
    } catch (e) {
      console.log('notificationReceived listener error:', e);
    }
  });
}

// ============================================================
// Toque en una notificación (push, botón o lista): una sola ruta de navegación
// ============================================================

// Puente con los contextos de React (lo registra NotificationInitializer en app/_layout.js):
//   getActiveLocationId(), getMembershipIds(), isAdmin(), switchTo(locationId) -> Promise<boolean>,
//   isRestricted(locationId) -> boolean (en mora), selectLocal(locationId) -> Promise<boolean> (sin backend)
let locationBridge = null;
export function setNotificationLocationBridge(bridge) {
  locationBridge = bridge;
}

// ¿Se puede navegar? Si la notificación es de otra residencial se cambia a ella ANTES de navegar.
// Si el usuario ya no pertenece a esa residencial: false (se va a Notificaciones sin cambiar).
async function ensureNotificationLocation(locationId, route) {
  if (!locationId || !locationBridge) return true;
  // Aviso de mora: Mi QR recibe la residencial y la elige ella (sin switch-location). SOLO esa ruta;
  // cualquier otra notificación de otra residencial sigue cambiando de residencial como antes.
  if (route?.pathname === '/(tabs)/visits' && route?.params?.tab === 'myqr' && route?.params?.location_id) return true;
  // Residencial en mora (Falta de pago): solo QR de residente, Pagos y Recibos, y se elige SOLO en
  // el app (el backend rechaza /auth/switch-location hacia ella). Lo demás va a Notificaciones.
  if (locationBridge.isRestricted?.(locationId)) {
    if (!isRouteAllowedWhenUnpaid(route)) return false;
    if (String(locationBridge.getActiveLocationId?.() || '') === String(locationId)) return true;
    try {
      return (await locationBridge.selectLocal?.(locationId)) === true;
    } catch (error) {
      console.log('⚠️ No se pudo elegir la residencial desde la notificación:', error);
      return false;
    }
  }
  if (String(locationBridge.getActiveLocationId?.() || '') === String(locationId)) return true;
  const memberships = (locationBridge.getMembershipIds?.() || []).map(String);
  if (!memberships.includes(String(locationId))) return false;
  try {
    return (await locationBridge.switchTo(locationId)) === true;
  } catch (error) {
    console.log('⚠️ No se pudo cambiar de residencial desde la notificación:', error);
    return false;
  }
}

/**
 * Abre la pantalla de una notificación. `notification` = { type, data, location_id? }
 * (fila de la lista o { type, data } del push). Una notificación de otra residencial cambia
 * primero a esa residencial. Sin pantalla propia: desde un push va a Notificaciones; desde la lista no hace nada.
 */
export async function openNotificationTarget(notification, { fromPush = false } = {}) {
  const route = getNotificationRoute(notification, { isAdmin: !!locationBridge?.isAdmin?.() });
  if (!route) {
    if (fromPush) router.push('/notifications');
    return false;
  }
  const allowed = await ensureNotificationLocation(getNotificationLocationId(notification), route);
  if (!allowed) {
    router.push('/notifications');
    return false;
  }
  router.push(route);
  return true;
}

// Un tap (o botón) se atiende UNA vez: el hook se monta en más de un lugar y el arranque en frío
// entrega la misma respuesta por el listener y por getLastNotificationResponseAsync.
const handledResponses = new Set();
let notificationNavigationReady = false;
let pendingResponse = null;

// Última respuesta ya abierta, guardada entre arranques. En Android el sistema puede volver a
// entregar el mismo toque al abrir el app otra vez (p. ej. desde Recientes); si coincide, se salta.
const LAST_OPENED_RESPONSE_KEY = 'notifications.lastOpenedResponse';
// AsyncStorage nunca debe frenar la navegación: si tarda más que esto, se sigue como si no hubiera nada
const STORAGE_TIMEOUT_MS = 1500;

// Identificador de la notificación + acción + fecha (no lleva contenido de la notificación)
function getResponseKey(response) {
  const notification = response?.notification;
  const id = notification?.request?.identifier || '';
  const action = response?.actionIdentifier || '';
  const date = notification?.date || '';
  return `${id}|${action}|${date}`;
}

// Sin identificador ni fecha no hay cómo reconocerla en otro arranque: no se guarda
function canRememberResponse(key) {
  const [id, , date] = key.split('|');
  return !!id || (!!date && date !== '0');
}

function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(null), STORAGE_TIMEOUT_MS)),
  ]);
}

async function wasResponseOpenedBefore(key) {
  if (!canRememberResponse(key)) return false;
  try {
    return (await withTimeout(AsyncStorage.getItem(LAST_OPENED_RESPONSE_KEY))) === key;
  } catch {
    return false;
  }
}

function rememberOpenedResponse(key) {
  if (!canRememberResponse(key)) return;
  try {
    Promise.resolve(AsyncStorage.setItem(LAST_OPENED_RESPONSE_KEY, key)).catch(() => {});
  } catch {}
}

async function routeAccessRequestResponse(response) {
  const data = response?.notification?.request?.content?.data || {};
  const requestId = data.request_id || data.access_request_id;
  if (!requestId) return;

  const params = { id: String(requestId) };
  // Botón de la notificación → acción preseleccionada (el residente confirma en la pantalla)
  if (data.type === 'access_request') {
    const actionId = response.actionIdentifier;
    if (actionId === 'approve') params.action = 'approved';
    else if (actionId === 'reject') params.action = 'rejected';
  }

  const allowed = await ensureNotificationLocation(data.location_id);
  if (!allowed) {
    router.push('/notifications');
    return;
  }
  router.push({ pathname: '/access-approval', params });
}

async function routeNotificationResponse(response) {
  const content = response?.notification?.request?.content;
  const data = parseNotificationData(content?.data);
  const key = getResponseKey(response);
  // Se marca antes de cualquier espera: la misma respuesta puede llegar dos veces casi a la vez
  if (handledResponses.has(key)) return;
  handledResponses.add(key);

  // Sin tipo no es un toque real en una notificación del app (en Android, al abrir desde cerrada,
  // la librería convierte cualquier dato del arranque en una "respuesta"): no se navega a ningún lado
  if (!data.type) {
    console.log('🔕 Respuesta de notificación sin tipo ignorada');
    return;
  }

  // Ya se abrió en un arranque anterior: no repetir
  if (await wasResponseOpenedBefore(key)) return;
  rememberOpenedResponse(key);

  if (data.type === 'access_request' && (data.request_id || data.access_request_id)) {
    await routeAccessRequestResponse(response);
    return;
  }
  await openNotificationTarget({ type: data.type, data }, { fromPush: true });
}

// Nunca deja escapar un error: la navegación del resto del app sigue normal
function routeNotificationResponseSafely(response) {
  routeNotificationResponse(response).catch((error) => {
    console.log('⚠️ No se pudo abrir la notificación:', error?.message || 'error');
  });
}

// Lo llama el layout cuando ya hay sesión y la navegación está lista (pasada la pantalla de inicio)
export async function setAccessRequestNavigationReady(ready) {
  notificationNavigationReady = ready;
  if (!ready) return;

  if (pendingResponse) {
    const pending = pendingResponse;
    pendingResponse = null;
    routeNotificationResponseSafely(pending);
  }

  // App abierta desde cerrada por el tap en una notificación (o en uno de sus botones), de cualquier tipo
  try {
    const last = await Notifications.getLastNotificationResponseAsync();
    if (last) {
      routeNotificationResponseSafely(last);
      try {
        await Notifications.clearLastNotificationResponseAsync();
      } catch {}
    }
  } catch (error) {
    console.log('⚠️ getLastNotificationResponseAsync falló:', error);
  }
}

export const useNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);
  
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Canal y botones de "Solicitud de ingreso"
    setupAccessRequestNotifications();

    // Registrar para push notifications
    registerForPushNotificationsAsync()
      .then(token => {
        if (token) {
          setExpoPushToken(token);
          // No enviar aquí si no hay auth — el envío principal ocurre en AuthContext post-login
          AsyncStorage.getItem('token').then(authToken => {
            if (authToken) {
              sendTokenToBackend(token, authToken);
            }
          });
        }
      })
      .catch(err => {
        console.error('Error registering for push notifications:', err);
        setError(err.message);
      });

    // Listener para notificaciones recibidas mientras la app está abierta
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      const receivedData = notification?.request?.content?.data;
      // Solo el tipo, nunca el contenido (lleva nombres de visitas, residentes, montos…)
      console.log('📬 Notificación recibida:', receivedData?.type || 'sin tipo');
      if (ACCESS_REQUEST_EVENT_TYPES.includes(receivedData?.type)) {
        emitAccessRequestEvent(receivedData);
      }
      emitNotificationReceived(receivedData);
    });

    // Listener para cuando el usuario toca una notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notificación tocada:', parseNotificationData(response?.notification?.request?.content?.data).type || 'sin tipo');
      handleNotificationResponse(response);
    });

    return () => {
      // API actualizada: usar .remove() directamente en la suscripción
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return {
    expoPushToken,
    notification,
    error,
  };
};

// Único lugar que pide el permiso de notificaciones (arranque y botón "Activar" del home)
export async function requestNotificationPermission() {
  return Notifications.requestPermissionsAsync();
}

// Registrar dispositivo para push notifications
async function registerForPushNotificationsAsync() {
  let token;

  // Verificar que es un dispositivo físico
  if (!Device.isDevice) {
    console.log('⚠️ Push notifications require a physical device');
    return null;
  }

  // Verificar permisos existentes
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Si no hay permisos, solicitarlos
  if (existingStatus !== 'granted') {
    const { status } = await requestNotificationPermission();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('⚠️ Push notification permissions not granted');
    return null;
  }

  // Obtener el token de Expo
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    if (!projectId) {
      console.error('❌ No project ID found in app config');
      return null;
    }

    token = (await Notifications.getExpoPushTokenAsync({
      projectId,
    })).data;
    
    console.log('✅ Expo Push Token:', token);
  } catch (error) {
    console.error('❌ Error getting push token:', error);
    return null;
  }

  // Configuración específica de Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
    });
  }

  return token;
}

// Enviar token al backend
// authToken opcional: si se pasa, lo usa directamente (post-login)
// Si no se pasa, lo busca en AsyncStorage (fallback)
export async function sendTokenToBackend(pushToken, authToken = null) {
  try {
    if (!pushToken) {
      console.log('⚠️ No push token provided, skipping registration');
      return;
    }
    const token = authToken || await AsyncStorage.getItem('token');
    
    if (!token) {
      console.log('⚠️ No auth token, skipping push token registration');
      return;
    }

    const response = await fetch(`${API_URL}/notifications/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        push_token: pushToken,
        device_type: Platform.OS,
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Push token registered with backend');
      await AsyncStorage.setItem('pushToken', pushToken);
    } else {
      console.error('❌ Failed to register push token:', data.error);
    }
  } catch (error) {
    console.error('❌ Error sending push token to backend:', error);
  }
}

// Manejar cuando el usuario toca una notificación (cualquier tipo)
function handleNotificationResponse(response) {
  // Sin navegación lista (arranque en frío, splash, sin sesión): se atiende cuando el layout avise
  if (!notificationNavigationReady) {
    pendingResponse = response;
    return;
  }
  routeNotificationResponseSafely(response);
}

// Función helper para enviar notificación local (útil para testing)
export async function sendLocalNotification(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Inmediato
  });
}

// Función para marcar todas como leídas
export async function markAllAsRead() {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) return false;

    const response = await fetch(`${API_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error marking all as read:', error);
    return false;
  }
}

export default useNotifications;