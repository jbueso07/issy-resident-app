// src/hooks/useQrBrightness.js
// ISSY - Sube el brillo de la APP al máximo mientras un QR está en pantalla para que lo escaneen,
// y lo restaura al cerrarlo, al salir de la pantalla o al mandar la app a segundo plano.
// Solo brillo de la app (sin permisos): iOS ajusta UIScreen.brightness y se restaura al valor anterior;
// Android ajusta el brillo de la ventana y se restaura con restoreSystemBrightnessAsync.
// Todo va en try/catch: si algo falla, el QR se muestra igual.

import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Brightness from 'expo-brightness';

// Estado compartido: varios QR pueden estar activos a la vez (p. ej. Mi QR y su modal ampliado).
// Solo el primero guarda el brillo previo y solo el último lo restaura.
let holders = 0;
let previousBrightness = null;
let queue = Promise.resolve();

const enqueue = (task) => {
  queue = queue.then(task).catch(() => {});
  return queue;
};

const acquire = () =>
  enqueue(async () => {
    holders += 1;
    if (holders !== 1) return;
    try {
      previousBrightness = Platform.OS === 'ios' ? await Brightness.getBrightnessAsync() : null;
    } catch {
      previousBrightness = null;
    }
    await Brightness.setBrightnessAsync(1);
  });

const release = () =>
  enqueue(async () => {
    if (holders === 0) return;
    holders -= 1;
    if (holders !== 0) return;
    if (Platform.OS === 'android') {
      await Brightness.restoreSystemBrightnessAsync();
    } else if (previousBrightness !== null) {
      await Brightness.setBrightnessAsync(previousBrightness);
    }
    previousBrightness = null;
  });

/**
 * @param {boolean} enabled true mientras el QR esté a la vista
 */
export default function useQrBrightness(enabled = true) {
  const [focused, setFocused] = useState(true);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  // Saliendo de la pantalla (otra pestaña o ruta) el brillo se restaura
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  // App en segundo plano: restaurar; al volver se vuelve a subir si el QR sigue a la vista
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => sub.remove();
  }, []);

  const shouldBoost = !!enabled && focused && appActive;

  useEffect(() => {
    if (!shouldBoost) return undefined;
    acquire();
    return () => {
      release();
    };
  }, [shouldBoost]);
}
