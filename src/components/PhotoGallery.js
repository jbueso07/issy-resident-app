// src/components/PhotoGallery.js
// ISSY - Galeria horizontal de fotos + visor a pantalla completa.
// Sin dependencias nativas nuevas (RN core: Image + Modal + ScrollView) -> OTA-safe.
//
// Uso A (pantalla normal): <PhotoGallery photos={x.photos} />
//   -> la galeria maneja su propio visor internamente.
//
// Uso B (dentro de un <Modal>): iOS no presenta un <Modal> hermano mientras
// otro esta abierto, asi que el visor se pinta como capa (inline) DENTRO
// del mismo modal:
//   <PhotoGallery photos={x.photos} onOpen={openGallery} />
//   y como ultimo hijo del contenido del modal:
//   <PhotoViewer inline uris={galleryUris} index={galleryIndex} onClose={closeGallery} />
//   (el boton atras de Android lo maneja el onRequestClose del modal padre).
//
// Zoom: pellizco en iOS via ScrollView maximumZoomScale (RN core).
// Android no soporta zoom en ScrollView; ahi solo se desliza entre fotos.

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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// El backend devuelve URLs publicas de Supabase Storage (strings).
// Se aceptan objetos por robustez ante cambios de shape.
const toUri = (p) =>
  typeof p === 'string' ? p : (p?.url || p?.photo_url || p?.uri || null);

export const toPhotoUris = (photos) => (photos || []).map(toUri).filter(Boolean);

export function PhotoViewer({ uris = [], index, onClose, inline = false }) {
  const scrollRef = useRef(null);
  const insets = useSafeAreaInsets();
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

  const content = (
      <View style={inline ? styles.viewerInline : styles.viewerBackdrop}>
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
            <ScrollView
              key={`full-${i}`}
              style={styles.viewerPage}
              contentContainerStyle={styles.viewerPageContent}
              maximumZoomScale={3}
              minimumZoomScale={1}
              centerContent
              bouncesZoom
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Image source={{ uri }} style={styles.viewerImage} resizeMode="contain" />
            </ScrollView>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.viewerClose, { top: insets.top + 8 }]}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        >
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        {uris.length > 1 && (
          <View style={[styles.viewerCounter, { bottom: insets.bottom + 16 }]}>
            <Text style={styles.viewerCounterText}>
              {current + 1} / {uris.length}
            </Text>
          </View>
        )}
      </View>
  );

  if (inline) return content;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {content}
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
    backgroundColor: '#000000',
  },
  // Capa a pantalla completa dentro de otro Modal (sin Modal anidado)
  viewerInline: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 1000,
    elevation: 1000,
  },
  viewerPage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  viewerPageContent: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  viewerClose: {
    position: 'absolute',
    right: scale(16),
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerCounter: {
    position: 'absolute',
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
