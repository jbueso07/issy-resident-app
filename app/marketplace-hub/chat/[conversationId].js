// app/marketplace-hub/chat/[conversationId].js
// ISSY Marketplace - Chat Screen
// Línea gráfica ProHome

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, Stack } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  bgCardAlt: '#243B44',
  teal: '#00BFA6',
  lime: '#AAFF00',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textDark: '#0F1A1E',
  border: 'rgba(255, 255, 255, 0.1)',
};

const MOCK_MESSAGES = [
  {
    id: '1',
    content: 'Hola, estoy interesado en el servicio de limpieza para el próximo sábado.',
    sender: 'user',
    timestamp: '2024-02-10T14:30:00Z',
  },
  {
    id: '2',
    content: '¡Hola! Claro, con gusto. ¿Qué tipo de limpieza necesitas y cuál es el tamaño del espacio?',
    sender: 'provider',
    timestamp: '2024-02-10T14:32:00Z',
  },
  {
    id: '3',
    content: 'Es un apartamento de 3 habitaciones, necesito limpieza profunda.',
    sender: 'user',
    timestamp: '2024-02-10T14:35:00Z',
  },
  {
    id: '4',
    content: 'Perfecto. Para una limpieza profunda de 3 habitaciones, el servicio tomaría aproximadamente 4 horas. El costo sería L. 600. ¿Te parece bien?',
    sender: 'provider',
    timestamp: '2024-02-10T14:40:00Z',
  },
];

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams();
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const flatListRef = useRef(null);

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now().toString(),
      content: newMessage.trim(),
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';

    return (
      <View style={[styles.messageContainer, isUser && styles.messageContainerUser]}>
        <View style={[styles.messageBubble, isUser ? styles.messageBubbleUser : styles.messageBubbleProvider]}>
          <Text style={[styles.messageText, isUser && styles.messageTextUser]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isUser && styles.messageTimeUser]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'CleanPro Services',
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="ellipsis-vertical" size={20} color={COLORS.teal} />
            </TouchableOpacity>
          ),
        }}
      />

      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={90}
        >
          {/* Messages List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TouchableOpacity style={styles.attachButton}>
              <Ionicons name="add-circle" size={28} color={COLORS.teal} />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={COLORS.textMuted}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, newMessage.trim() && styles.sendButtonActive]}
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            >
              <Ionicons
                name="send"
                size={20}
                color={newMessage.trim() ? COLORS.textDark : COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  keyboardView: {
    flex: 1,
  },
  headerButton: {
    padding: scale(8),
  },
  messagesList: {
    padding: scale(16),
    paddingBottom: scale(8),
  },
  messageContainer: {
    marginBottom: scale(12),
    alignItems: 'flex-start',
  },
  messageContainerUser: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: scale(12),
    borderRadius: scale(16),
  },
  messageBubbleProvider: {
    backgroundColor: COLORS.bgCard,
    borderBottomLeftRadius: scale(4),
  },
  messageBubbleUser: {
    backgroundColor: COLORS.teal,
    borderBottomRightRadius: scale(4),
  },
  messageText: {
    fontSize: scale(15),
    color: COLORS.textPrimary,
    lineHeight: scale(22),
  },
  messageTextUser: {
    color: COLORS.textDark,
  },
  messageTime: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    marginTop: scale(6),
    alignSelf: 'flex-end',
  },
  messageTimeUser: {
    color: `${COLORS.textDark}80`,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.bgSecondary,
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: scale(10),
  },
  attachButton: {
    padding: scale(4),
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    fontSize: scale(15),
    color: COLORS.textPrimary,
    maxHeight: scale(100),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: COLORS.teal,
  },
});
