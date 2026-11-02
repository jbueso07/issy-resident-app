// src/context/NotificationCountContext.js
// ISSY - Contador de notificaciones no leídas compartido (campana del home y quien lo necesite).
// - Un solo origen: la campana ya no pide nada por su cuenta.
// - Se actualiza con eventos: volver al frente, push con la app abierta, marcar leída (applyRead / applyAllRead).
// - Respaldo largo (5 min) solo con la app al frente; en segundo plano no hay temporizador.
// - Sin sesión: contador en 0, sin temporizador y sin llamadas.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { authFetch } from '../services/api';
import { subscribeNotificationReceived } from '../hooks/useNotifications';

// Respaldo por si un evento no llegó (push no entregado, leída desde otro teléfono)
const BACKUP_POLL_MS = 300000;
// Una respuesta más nueva que esto se reutiliza (salvo force)
const FRESH_MS = 60000;
// El hook de push está montado dos veces (AuthContext y _layout): el debounce evita la llamada doble
const PUSH_DEBOUNCE_MS = 1000;

const NotificationCountContext = createContext({
  unreadCount: 0,
  refresh: async () => {},
  applyRead: () => {},
  applyAllRead: () => {},
  reset: () => {},
});

export const useNotificationCount = () => useContext(NotificationCountContext);

export function NotificationCountProvider({ children }) {
  const { token, user } = useAuth();
  const hasSession = !!token;
  const userId = user?.id || null;

  const [unreadCount, setUnreadCount] = useState(0);

  const sessionRef = useRef(false);
  const inFlightRef = useRef(null);
  const lastFetchRef = useRef(0);
  const intervalRef = useRef(null);
  const debounceRef = useRef(null);
  // Sube con cada reset: una respuesta que llega después de cerrar sesión se descarta
  const generationRef = useRef(0);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const refresh = useCallback(({ force } = {}) => {
    if (!sessionRef.current) return Promise.resolve();
    if (inFlightRef.current) return inFlightRef.current;
    if (!force && Date.now() - lastFetchRef.current < FRESH_MS) return Promise.resolve();

    const generation = generationRef.current;
    const load = async () => {
      try {
        // authFetch: token vigente de AsyncStorage y renovación en 401
        const result = await authFetch('/notifications/unread-count');
        if (generation !== generationRef.current) return;
        if (result?.success) {
          setUnreadCount(result.data?.unread_count || 0);
          lastFetchRef.current = Date.now();
        }
      } catch (error) {
        // Se queda el valor anterior; el siguiente evento o el respaldo lo reintenta
        console.log('No se pudo actualizar el contador de notificaciones:', error?.message);
      }
    };
    const request = load().finally(() => {
      if (inFlightRef.current === request) inFlightRef.current = null;
    });
    inFlightRef.current = request;
    return request;
  }, []);

  const applyRead = useCallback((n = 1) => {
    setUnreadCount((count) => Math.max(0, count - n));
  }, []);

  const applyAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const reset = useCallback(() => {
    generationRef.current += 1;
    stopTimer();
    clearTimeout(debounceRef.current);
    debounceRef.current = null;
    inFlightRef.current = null;
    lastFetchRef.current = 0;
    setUnreadCount(0);
  }, [stopTimer]);

  // Sesión + AppState: el temporizador solo existe con sesión y con la app al frente.
  // Al cerrar sesión (token null, venga de signOut, clearLocalSession o un 401) todo vuelve a 0.
  useEffect(() => {
    sessionRef.current = hasSession;
    if (!hasSession) {
      reset();
      return undefined;
    }

    const handleAppState = (state) => {
      if (state === 'active') {
        refresh();
        if (!intervalRef.current) {
          intervalRef.current = setInterval(() => refresh(), BACKUP_POLL_MS);
        }
      } else {
        stopTimer();
      }
    };

    handleAppState(AppState.currentState);
    const subscription = AppState.addEventListener('change', handleAppState);
    return () => {
      subscription.remove();
      stopTimer();
    };
  }, [hasSession, refresh, reset, stopTimer]);

  // Cambio de cuenta sin pasar por "sin sesión": se empieza de cero
  const lastUserIdRef = useRef(userId);
  useEffect(() => {
    const previous = lastUserIdRef.current;
    lastUserIdRef.current = userId;
    if (previous && userId && previous !== userId) {
      reset();
      refresh({ force: true });
    }
  }, [userId, refresh, reset]);

  // Push con la app abierta: refresco forzado, con debounce de 1 s
  useEffect(() => {
    const unsubscribe = subscribeNotificationReceived(() => {
      if (!sessionRef.current) return;
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        refresh({ force: true });
      }, PUSH_DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ unreadCount, refresh, applyRead, applyAllRead, reset }),
    [unreadCount, refresh, applyRead, applyAllRead, reset]
  );

  return <NotificationCountContext.Provider value={value}>{children}</NotificationCountContext.Provider>;
}

export default NotificationCountContext;
