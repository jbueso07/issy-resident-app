// src/hooks/useNotifications.js
// ISSY Resident App - Push Notifications Hook

import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.joinissy.com/api';

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const useNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);
  
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
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
    const { status } = await Notifications.requestPermissionsAsync();
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

// Manejar cuando el usuario toca una notificación
function handleNotificationResponse(response) {
  const data = response.notification.request.content.data;
  
  console.log('📱 Notification data:', data);
  
  // Aquí puedes navegar a diferentes pantallas según el tipo de notificación
  // Por ejemplo:
  // if (data.type === 'announcement') {
  //   router.push('/announcements');
  // } else if (data.type === 'reservation') {
  //   router.push('/reservations');
  // }
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