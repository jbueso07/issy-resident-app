// src/components/IncidentChat.js
// Conversación de un incidente tipo chat (residente ↔ administración/guardia).
// Usado en app/incident-detail.js (residente) y app/admin/incidents.js (admin).
//
// Campos que devuelve el backend (GET /api/incidents/:id):
//   incident.description, incident.created_at, incident.reported_by,
//   incident.reporter { id, name }, incident.status
//   incident.comments[] { id, comment, created_at, user { id, name, role } }

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// Lima de las pantallas de incidentes (app/incidents.js, app/admin/incidents.js,
// app/incident-detail.js). La app no tiene un tema compartido en uso:
// src/components/ui/index.js exporta COLORS.lime = '#AAFF00', pero ninguna
// pantalla lo importa.
const LIME = '#D4FE48';

// Paleta oscura de la app (app.json → userInterfaceStyle: "dark")
export const CHAT_COLORS = {
  background: '#0F1A1A',
  bubbleOther: '#1A2C2C',
  bubbleMine: LIME,
  textOnOther: '#FFFFFF',
  textOnMine: '#0F1A1A',
  metaOnOther: '#8E9A9A',
  metaOnMine: '#3A4A1A',
  muted: '#5A6666',
  border: 'rgba(255,255,255,0.1)',
  inputBg: '#243636',
  teal: '#5DDED8',
  lime: LIME,
};

export const INCIDENT_CLOSED_STATUSES = ['closed'];
export const MAX_COMMENT_LENGTH = 1000;

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-HN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Rol mostrado en la burbuja. El autor del incidente siempre es "Residente"
// en esta conversación (aunque su rol global sea otro).
const roleLabel = (t, msgUser, reportedBy) => {
  if (msgUser?.id && msgUser.id === reportedBy) return t('incidentDetail.chat.roles.resident');
  const role = msgUser?.role;
  if (role === 'admin' || role === 'superadmin') return t('incidentDetail.chat.roles.admin');
  if (role === 'guard') return t('incidentDetail.chat.roles.guard');
  return t('incidentDetail.chat.roles.resident');
};

export function IncidentChat({ incident, currentUserId }) {
  const { t } = useTranslation();
  if (!incident) return null;

  const reportedBy = incident.reported_by;
  const reporter = {
    id: reportedBy,
    name: incident.reporter?.name || incident.reporter_name || t('incidentDetail.user'),
  };

  // Primer mensaje: la descripción original del reportero
  const messages = [];
  if (incident.description) {
    messages.push({
      id: '__description__',
      comment: incident.description,
      created_at: incident.created_at,
      user: reporter,
      isDescription: true,
    });
  }
  (incident.comments || [])
    .filter((c) => c && typeof c === 'object')
    .forEach((c) => messages.push(c));

  const hasReplies = (incident.comments || []).length > 0;

  return (
    <View style={styles.list}>
      {messages.map((msg, index) => {
        const mine = !!currentUserId && msg.user?.id === currentUserId;
        const name = msg.user?.name || t('incidentDetail.user');
        return (
          <View
            key={msg.id || index}
            style={[styles.row, mine ? styles.rowMine : styles.rowOther]}
          >
            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={[styles.author, mine ? styles.metaMine : styles.metaOther]} numberOfLines={1}>
                {name} · {roleLabel(t, msg.user, reportedBy)}
                {msg.isDescription ? ` · ${t('incidentDetail.chat.originalReport')}` : ''}
              </Text>
              <Text style={[styles.text, mine ? styles.textMine : styles.textOther]}>
                {msg.comment || ''}
              </Text>
              <Text style={[styles.time, mine ? styles.metaMine : styles.metaOther]}>
                {formatTime(msg.created_at)}
              </Text>
            </View>
          </View>
        );
      })}
      {!hasReplies && (
        <Text style={styles.empty}>{t('incidentDetail.noComments')}</Text>
      )}
    </View>
  );
}

export function IncidentComposer({ value, onChangeText, onSend, sending, closed }) {
  const { t } = useTranslation();

  if (closed) {
    return (
      <View style={styles.closedBar}>
        <Ionicons name="lock-closed" size={16} color={CHAT_COLORS.metaOnOther} />
        <Text style={styles.closedText}>{t('incidentDetail.chat.closed')}</Text>
      </View>
    );
  }

  const canSend = !!value?.trim() && !sending;

  return (
    <View style={styles.composer}>
      <TextInput
        style={styles.input}
        placeholder={t('incidentDetail.addCommentPlaceholder')}
        placeholderTextColor={CHAT_COLORS.muted}
        value={value}
        onChangeText={onChangeText}
        multiline
        maxLength={MAX_COMMENT_LENGTH}
      />
      <TouchableOpacity
        style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
        onPress={onSend}
        disabled={!canSend}
        accessibilityLabel={t('incidentDetail.chat.send')}
      >
        {sending ? (
          <ActivityIndicator size="small" color={CHAT_COLORS.background} />
        ) : (
          <Ionicons
            name="send"
            size={20}
            color={canSend ? CHAT_COLORS.background : CHAT_COLORS.muted}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: scale(10),
  },
  row: {
    flexDirection: 'row',
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: scale(14),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
  },
  bubbleMine: {
    backgroundColor: CHAT_COLORS.bubbleMine,
    borderBottomRightRadius: scale(4),
  },
  bubbleOther: {
    backgroundColor: CHAT_COLORS.bubbleOther,
    borderWidth: 1,
    borderColor: CHAT_COLORS.border,
    borderBottomLeftRadius: scale(4),
  },
  author: {
    fontSize: scale(11),
    fontWeight: '600',
    marginBottom: scale(2),
  },
  text: {
    fontSize: scale(14),
    lineHeight: scale(20),
  },
  textMine: {
    color: CHAT_COLORS.textOnMine,
  },
  textOther: {
    color: CHAT_COLORS.textOnOther,
  },
  time: {
    fontSize: scale(10),
    marginTop: scale(4),
    textAlign: 'right',
  },
  metaMine: {
    color: CHAT_COLORS.metaOnMine,
  },
  metaOther: {
    color: CHAT_COLORS.metaOnOther,
  },
  empty: {
    textAlign: 'center',
    color: CHAT_COLORS.muted,
    fontSize: scale(13),
    paddingVertical: scale(8),
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: scale(8),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderTopWidth: 1,
    borderTopColor: CHAT_COLORS.border,
    backgroundColor: CHAT_COLORS.background,
  },
  input: {
    flex: 1,
    minHeight: scale(42),
    maxHeight: scale(120),
    backgroundColor: CHAT_COLORS.inputBg,
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    paddingTop: scale(10),
    paddingBottom: scale(10),
    color: CHAT_COLORS.textOnOther,
    fontSize: scale(14),
  },
  sendButton: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(21),
    backgroundColor: CHAT_COLORS.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: CHAT_COLORS.inputBg,
  },
  closedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingVertical: scale(14),
    borderTopWidth: 1,
    borderTopColor: CHAT_COLORS.border,
    backgroundColor: CHAT_COLORS.background,
  },
  closedText: {
    color: CHAT_COLORS.metaOnOther,
    fontSize: scale(13),
  },
});

export default IncidentChat;
