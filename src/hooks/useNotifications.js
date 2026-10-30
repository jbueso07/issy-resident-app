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
import { getNotificationRoute, getNotificationLocationId, parseNotificationData } from '../utils/notificationRoute';

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

// ============================================================
// Toque en una notificación (push, botón o lista): una sola ruta de navegación
// ============================================================

// Puente con los contextos de React (lo registra NotificationInitializer en app/_layout.js):
//   getActiveLocationId(), getMembershipIds(), isAdmin(), switchTo(locationId) -> Promise<boolean>
let locationBridge = null;
export function setNotificationLocationBridge(bridge) {
  locationBridge = bridge;
}

// ¿Se puede navegar? Si la notificación es de otra residencial se cambia a ella ANTES de navegar.
// Si el usuario ya no pertenece a esa residencial: false (se va a Notificaciones sin cambiar).
async function ensureNotificationLocation(locationId) {
  if (!locationId || !locationBridge) return true;
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
  const allowed = await ensureNotificationLocation(getNotificationLocationId(notification));
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

function routeNotificationResponse(response) {
  const content = response?.notification?.request?.content;
  const data = parseNotificationData(content?.data);
  const key = `${response?.notification?.request?.identifier}:${response?.actionIdentifier}`;
  if (handledResponses.has(key)) return;
  handledResponses.add(key);

  if (data.type === 'access_request' && (data.request_id || data.access_request_id)) {
    routeAccessRequestResponse(response);
    return;
  }
  openNotificationTarget({ type: data.type, data }, { fromPush: true });
}

// Lo llama el layout cuando ya hay sesión y la navegación está lista (pasada la pantalla de inicio)
export async function setAccessRequestNavigationReady(ready) {
  notificationNavigationReady = ready;
  if (!ready) return;

  if (pendingResponse) {
    const pending = pendingResponse;
    pendingResponse = null;
    routeNotificationResponse(pending);
  }

  // App abierta desde cerrada por el tap en una notificación (o en uno de sus botones), de cualquier tipo
  try {
    const last = await Notifications.getLastNotificationResponseAsync();
    if (last) {
      routeNotificationResponse(last);
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
      console.log('📬 Notification received:', notification);
      setNotification(notification);
      const receivedData = notification?.request?.content?.data;
      if (ACCESS_REQUEST_EVENT_TYPES.includes(receivedData?.type)) {
        emitAccessRequestEvent(receivedData);
      }
    });

    // Listener para cuando el usuario toca una notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
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
  routeNotificationResponse(response);
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

// Función para obtener el conteo de notificaciones no leídas
export async function getUnreadCount() {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) return 0;

    const response = await fetch(`${API_URL}/notifications/unread-count`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return data.data?.unread_count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
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