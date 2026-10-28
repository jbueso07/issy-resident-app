// src/utils/saveImageToGallery.js
// ISSY - Guarda en Fotos/Galería la imagen capturada con captureRef.
// Solo permiso de ESCRITURA (iOS: add-only; Android: sin lectura de la galería). Nunca se lee la galería.
// Si se niega el permiso o falla, se ofrece compartir la imagen como antes.

import { Alert } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

/** @returns {Promise<{status: 'saved'|'denied'|'error', error?: Error}>} */
export async function saveImageToGallery(uri) {
  try {
    const permission = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
    if (!permission.granted) return { status: 'denied' };
    await MediaLibrary.saveToLibraryAsync(uri);
    return { status: 'saved' };
  } catch (error) {
    return { status: 'error', error };
  }
}

const shareImage = async (uri, dialogTitle) => {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle });
    }
  } catch (error) {
    console.error('Error sharing image after save fallback:', error);
  }
};

/**
 * Guarda en la galería y avisa. Si no se pudo (permiso negado o error) ofrece compartir.
 * @param {string} uri archivo PNG capturado
 * @param {Function} t traducción
 * @param {{ dialogTitle?: string }} [options]
 * @returns {Promise<boolean>} true si quedó guardada
 */
export async function saveImageWithFallback(uri, t, { dialogTitle } = {}) {
  const result = await saveImageToGallery(uri);
  if (result.status === 'saved') {
    Alert.alert(t('deviceTools.gallery.saved'));
    return true;
  }
  if (result.error) console.error('Error saving image to gallery:', result.error);
  Alert.alert(
    t('deviceTools.gallery.deniedTitle'),
    result.status === 'denied' ? t('deviceTools.gallery.deniedMessage') : t('deviceTools.gallery.errorMessage'),
    [
      { text: t('deviceTools.gallery.notNow'), style: 'cancel' },
      { text: t('deviceTools.gallery.share'), onPress: () => shareImage(uri, dialogTitle) },
    ]
  );
  return false;
}
