// src/components/PhotoGallery.js
// ISSY - Galeria horizontal de fotos + visor a pantalla completa.
// Sin dependencias nativas nuevas (RN core: Image + Modal + ScrollView) -> OTA-safe.
//
// Uso A (pantalla normal): <PhotoGallery photos={x.photos} />
//   -> la galeria maneja su propio visor internamente.
//
// Uso B (dentro de un <Modal>, evita modal anidado en iOS):
//   <PhotoGallery photos={x.photos} onOpen={openGallery} />
//   y en el nivel raiz de la pantalla:
//   <PhotoViewer uris={galleryUris} index={galleryIndex} onClose={closeGallery} />

import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// El backend devuelve URLs publicas de Supabase Storage (strings).
// Se aceptan objetos por robustez ante cambios de shape.
const toUri = (p) =>
  typeof p === 'string' ? p : (p?.url || p?.photo_url || p?.uri || null);

export const toPhotoUris = (photos) => (photos || []).map(toUri).filter(Boolean);

export function PhotoViewer({ uris = [], index, onClose }) {
  const scrollRef = useRef(null);
  const isOpen = index !== null && index !== undefined && uris.length > 0;
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (isOpen) setCurrent(index);
  }, [index, isOpen]);

  if (!isOpen) return null;

  // Android ignora contentOffset inicial en ScrollView paginado:
  // posicionamos explicitamente en onLayout.
  const handleLayout = () => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, y: 0, animated: false });
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.viewerBackdrop}>
        <StatusBar barStyle="light-content" />

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onLayout={handleLayout}
          onMomentumScrollEnd={(e) =>
            setCurrent(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
          }
        >
          {uris.map((uri, i) => (
            <View key={`full-${i}`} style={styles.viewerPage}>
              <Image source={{ uri }} style={styles.viewerImage} resizeMode="contain" />
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.viewerClose}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        {uris.length > 1 && (
          <View style={styles.viewerCounter}>
            <Text style={styles.viewerCounterText}>
              {current + 1} / {uris.length}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

export default function PhotoGallery({
  photos,
  thumbSize = 88,
  borderColor = 'rgba(0,0,0,0.10)',
  placeholderColor = 'rgba(127,127,127,0.15)',
  onOpen,
}) {
  const [internalIndex, setInternalIndex] = useState(null);
  const uris = toPhotoUris(photos);

  if (uris.length === 0) return null;

  const handlePress = (i) => {
    if (onOpen) onOpen(uris, i);
    else setInternalIndex(i);
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {uris.map((uri, i) => (
          <TouchableOpacity
            key={`${uri}-${i}`}
            activeOpacity={0.8}
            onPress={() => handlePress(i)}
          >
            <Image
              source={{ uri }}
              style={[
                styles.thumb,
                {
                  width: scale(thumbSize),
                  height: scale(thumbSize),
                  borderColor,
                  backgroundColor: placeholderColor,
                },
              ]}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!onOpen && (
        <PhotoViewer
          uris={uris}
          index={internalIndex}
          onClose={() => setInternalIndex(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  strip: {
    gap: scale(10),
    paddingVertical: scale(4),
    paddingRight: scale(16),
  },
  thumb: {
    borderRadius: scale(10),
    borderWidth: 1,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  viewerPage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  viewerClose: {
    position: 'absolute',
    top: scale(48),
    right: scale(20),
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerCounter: {
    position: 'absolute',
    bottom: scale(48),
    alignSelf: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
    borderRadius: scale(14),
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  viewerCounterText: {
    color: '#FFFFFF',
    fontSize: scale(12),
    fontWeight: '600',
  },
});
