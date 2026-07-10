// app/emergency-contacts.js
// ISSY Resident App - Contactos de Emergencia (Fase 3.1 del Botón de Emergencia)
// El residente configura hasta 5 contactos personales que reciben notificación
// cuando activa el botón de emergencia.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  getMyEmergencyContacts,
  addEmergencyContact,
  removeEmergencyContact,
  searchUsersForEmergencyContact,
} from '../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  card: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  panic: '#E24B4A',
  panicMuted: 'rgba(226, 75, 74, 0.15)',
  teal: '#5DDED8',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
};

const RELATIONSHIP_OPTIONS = [
  { key: 'esposo', label: 'Esposo/a' },
  { key: 'padre', label: 'Padre/Madre' },
  { key: 'hijo', label: 'Hijo/a' },
  { key: 'hermano', label: 'Hermano/a' },
  { key: 'amigo', label: 'Amigo/a' },
  { key: 'otro', label: 'Otro' },
];

export default function EmergencyContactsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [contacts, setContacts] = useState([]);
  const [maxContacts, setMaxContacts] = useState(5);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRelationship, setSelectedRelationship] = useState('amigo');
  const [addingContact, setAddingContact] = useState(false);

  const fetchContacts = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const result = await getMyEmergencyContacts();
      if (result.success && result.data) {
        setContacts(result.data.contacts || []);
        if (result.data.max) setMaxContacts(result.data.max);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts(true);
  }, [fetchContacts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchContacts(false);
  };

  const handleSearch = useCallback(async (query) => {
    setSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const result = await searchUsersForEmergencyContact(query.trim());
      if (result.success && result.data) {
        setSearchResults(result.data.users || []);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleOpenAddModal = () => {
    if (contacts.length >= maxContacts) {
      Alert.alert(
        'Límite alcanzado',
        `Solo podés tener hasta ${maxContacts} contactos de emergencia. Quitá alguno primero.`
      );
      return;
    }
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUser(null);
    setSelectedRelationship('amigo');
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    if (addingContact) return;
    setShowAddModal(false);
  };

  const handleSelectUser = (user) => {
    if (user.is_already_contact) return;
    setSelectedUser(user);
  };

  const handleConfirmAdd = async () => {
    if (!selectedUser || addingContact) return;
    setAddingContact(true);
    try {
      const result = await addEmergencyContact({
        contactUserId: selectedUser.id,
        relationship: selectedRelationship,
      });
      if (result.success) {
        setShowAddModal(false);
        Alert.alert('Contacto agregado', `${selectedUser.name} recibirá aviso si activás el botón de emergencia.`);
        fetchContacts(false);
      } else {
        Alert.alert('Error', result.error || 'No se pudo agregar el contacto');
      }
    } catch (error) {
      Alert.alert('Error', 'Error inesperado');
    } finally {
      setAddingContact(false);
    }
  };

  const handleRemoveContact = (contact) => {
    Alert.alert(
      'Quitar contacto',
      `¿Seguro que querés quitar a ${contact.name} de tus contactos de emergencia?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await removeEmergencyContact(contact.contact_user_id);
              if (result.success) {
                fetchContacts(false);
              } else {
                Alert.alert('Error', result.error || 'No se pudo quitar');
              }
            } catch (error) {
              Alert.alert('Error', 'Error inesperado');
            }
          },
        },
      ]
    );
  };

  const renderContact = (contact) => {
    const relationshipLabel = RELATIONSHIP_OPTIONS.find((r) => r.key === contact.relationship)?.label || contact.relationship || '';
    return (
      <View key={contact.id} style={styles.contactCard}>
        {contact.profile_photo_url ? (
          <Image source={{ uri: contact.profile_photo_url }} style={styles.contactAvatar} />
        ) : (
          <View style={[styles.contactAvatar, styles.contactAvatarPlaceholder]}>
            <Ionicons name="person" size={22} color={COLORS.textMuted} />
          </View>
        )}
        <View style={styles.contactBody}>
          <Text style={styles.contactName} numberOfLines={1}>
            {contact.name}
          </Text>
          {relationshipLabel ? (
            <Text style={styles.contactRelationship} numberOfLines={1}>
              {relationshipLabel}
            </Text>
          ) : null}
          <Text style={styles.contactEmail} numberOfLines={1}>
            {contact.email}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleRemoveContact(contact)} style={styles.removeBtn}>
          <Ionicons name="close-circle" size={26} color={COLORS.panic} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSearchResult = (user) => (
    <TouchableOpacity
      key={user.id}
      style={[
        styles.searchResultRow,
        selectedUser?.id === user.id && styles.searchResultRowActive,
        user.is_already_contact && styles.searchResultRowDisabled,
      ]}
      onPress={() => handleSelectUser(user)}
      disabled={user.is_already_contact}
    >
      {user.profile_photo_url ? (
        <Image source={{ uri: user.profile_photo_url }} style={styles.searchAvatar} />
      ) : (
        <View style={[styles.searchAvatar, styles.contactAvatarPlaceholder]}>
          <Ionicons name="person" size={18} color={COLORS.textMuted} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.searchName} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={styles.searchEmail} numberOfLines={1}>
          {user.email}
        </Text>
      </View>
      {user.is_already_contact ? (
        <Text style={styles.alreadyContactBadge}>Ya agregado</Text>
      ) : selectedUser?.id === user.id ? (
        <Ionicons name="checkmark-circle" size={22} color={COLORS.teal} />
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Contactos de Emergencia</Text>
          <Text style={styles.headerSubtitle}>
            {contacts.length} de {maxContacts}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.panic} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.panic} />}
        >
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.teal} />
            <Text style={styles.infoText}>
              Estas personas van a recibir aviso si activás el botón de emergencia. Solo usuarios ISSY.
            </Text>
          </View>

          {contacts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={56} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Sin contactos agregados</Text>
              <Text style={styles.emptyText}>
                Agregá hasta {maxContacts} personas de confianza que sean usuarias de ISSY.
              </Text>
            </View>
          ) : (
            <View style={styles.contactsList}>{contacts.map(renderContact)}</View>
          )}

          {contacts.length < maxContacts && (
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddModal}>
              <Ionicons name="add-circle" size={22} color={COLORS.panic} />
              <Text style={styles.addBtnText}>Agregar contacto</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Modal buscador */}
      <Modal visible={showAddModal} animationType="slide" transparent={false} onRequestClose={handleCloseAddModal}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.header}>
              <TouchableOpacity onPress={handleCloseAddModal} style={styles.backBtn}>
                <Ionicons name="close" size={26} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Agregar contacto</Text>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
              {/* Search input */}
              <View style={styles.searchBox}>
                <Ionicons name="search" size={20} color={COLORS.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar por nombre o email"
                  placeholderTextColor={COLORS.textMuted}
                  value={searchQuery}
                  onChangeText={handleSearch}
                  autoFocus
                  autoCapitalize="none"
                />
              </View>

              {searching && (
                <View style={{ paddingVertical: scale(20) }}>
                  <ActivityIndicator size="small" color={COLORS.teal} />
                </View>
              )}

              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={40} color={COLORS.textMuted} />
                  <Text style={styles.emptyText}>Sin resultados para "{searchQuery}"</Text>
                </View>
              )}

              {searchResults.length > 0 && (
                <View style={styles.searchResultsList}>
                  {searchResults.map(renderSearchResult)}
                </View>
              )}

              {/* Selector de relación (solo si hay usuario seleccionado) */}
              {selectedUser && (
                <View style={styles.relationshipSection}>
                  <Text style={styles.relationshipTitle}>Relación con {selectedUser.name.split(' ')[0]}</Text>
                  <View style={styles.relationshipGrid}>
                    {RELATIONSHIP_OPTIONS.map((r) => (
                      <TouchableOpacity
                        key={r.key}
                        style={[
                          styles.relationshipChip,
                          selectedRelationship === r.key && styles.relationshipChipActive,
                        ]}
                        onPress={() => setSelectedRelationship(r.key)}
                      >
                        <Text
                          style={[
                            styles.relationshipChipText,
                            selectedRelationship === r.key && styles.relationshipChipTextActive,
                          ]}
                        >
                          {r.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Botón confirmar (fijo abajo) */}
            {selectedUser && (
              <View style={styles.confirmBar}>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleConfirmAdd}
                  disabled={addingContact}
                >
                  {addingContact ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Agregar a {selectedUser.name.split(' ')[0]}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    gap: scale(8),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  backBtn: { padding: scale(4) },
  headerTitle: { color: COLORS.textPrimary, fontSize: scale(17), fontWeight: '600' },
  headerSubtitle: { color: COLORS.textSecondary, fontSize: scale(12), marginTop: 2 },
  scroll: { padding: scale(16), paddingBottom: scale(80) },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(8),
    backgroundColor: 'rgba(93, 222, 216, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(93, 222, 216, 0.2)',
    borderRadius: scale(12),
    padding: scale(12),
    marginBottom: scale(16),
  },
  infoText: { flex: 1, color: COLORS.textSecondary, fontSize: scale(12), lineHeight: scale(17) },

  emptyState: {
    alignItems: 'center',
    paddingVertical: scale(40),
    gap: scale(8),
  },
  emptyTitle: { color: COLORS.textPrimary, fontSize: scale(16), fontWeight: '600', marginTop: scale(12) },
  emptyText: { color: COLORS.textSecondary, fontSize: scale(13), textAlign: 'center', paddingHorizontal: scale(20) },

  contactsList: { gap: scale(10), marginBottom: scale(16) },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: scale(14),
    padding: scale(12),
    gap: scale(12),
  },
  contactAvatar: { width: scale(44), height: scale(44), borderRadius: scale(22) },
  contactAvatarPlaceholder: {
    backgroundColor: COLORS.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBody: { flex: 1, minWidth: 0 },
  contactName: { color: COLORS.textPrimary, fontSize: scale(15), fontWeight: '600' },
  contactRelationship: { color: COLORS.teal, fontSize: scale(12), marginTop: 2 },
  contactEmail: { color: COLORS.textMuted, fontSize: scale(11), marginTop: 2 },
  removeBtn: { padding: scale(4) },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: 'rgba(226, 75, 74, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(226, 75, 74, 0.3)',
    borderStyle: 'dashed',
    borderRadius: scale(14),
    padding: scale(14),
  },
  addBtnText: { color: COLORS.panic, fontSize: scale(14), fontWeight: '600' },

  // Modal buscador
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    marginBottom: scale(16),
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: scale(15),
    paddingVertical: scale(12),
  },
  searchResultsList: { gap: scale(6) },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    padding: scale(10),
    borderRadius: scale(10),
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchResultRowActive: {
    borderColor: COLORS.teal,
    backgroundColor: 'rgba(93, 222, 216, 0.08)',
  },
  searchResultRowDisabled: {
    opacity: 0.5,
  },
  searchAvatar: { width: scale(36), height: scale(36), borderRadius: scale(18) },
  searchName: { color: COLORS.textPrimary, fontSize: scale(14), fontWeight: '500' },
  searchEmail: { color: COLORS.textMuted, fontSize: scale(11), marginTop: 2 },
  alreadyContactBadge: {
    color: COLORS.textMuted,
    fontSize: scale(10),
    fontStyle: 'italic',
  },

  relationshipSection: { marginTop: scale(20) },
  relationshipTitle: { color: COLORS.textPrimary, fontSize: scale(14), fontWeight: '600', marginBottom: scale(10) },
  relationshipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
  relationshipChip: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  relationshipChipActive: {
    backgroundColor: 'rgba(226, 75, 74, 0.15)',
    borderColor: COLORS.panic,
  },
  relationshipChipText: { color: COLORS.textSecondary, fontSize: scale(12) },
  relationshipChipTextActive: { color: COLORS.panic, fontWeight: '600' },

  confirmBar: {
    padding: scale(16),
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
  },
  confirmBtn: {
    backgroundColor: COLORS.panic,
    padding: scale(14),
    borderRadius: scale(12),
    alignItems: 'center',
  },
  confirmBtnText: { color: '#FFFFFF', fontSize: scale(15), fontWeight: '600' },
});
