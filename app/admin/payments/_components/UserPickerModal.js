// app/admin/payments/components/UserPickerModal.js
// ISSY Admin - User Picker Modal Component

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, scale } from '../_constants';
import { filterUsers, getUserInitial, getUserDisplayName } from '../_helpers';

export function UserPickerModal({
  visible,
  onClose,
  users,
  loadingUsers,
  selectedUserId,
  selectedUsers,
  target,
  onSelectUser,
  onDone,
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filteredUsers = useMemo(() => {
    return filterUsers(users, search);
  }, [users, search]);

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  const handleDone = () => {
    setSearch('');
    onDone();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent={false}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.modalCancel}>{t('common.cancel', 'Cancelar')}</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {target === 'single' 
              ? t('admin.payments.selectResident', 'Seleccionar Residente')
              : t('admin.payments.selectResidents', 'Seleccionar Residentes')
            }
          </Text>
          {target === 'multiple' ? (
            <TouchableOpacity onPress={handleDone}>
              <Text style={styles.modalSave}>
                {t('common.done', 'Listo')} {selectedUsers.length > 0 && `(${selectedUsers.length})`}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t('admin.payments.searchPlaceholder', 'Buscar por nombre, email o unidad...')}
            placeholderTextColor={COLORS.textMuted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {loadingUsers ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.lime} />
            <Text style={styles.loadingText}>{t('admin.payments.loadingResidents', 'Cargando residentes...')}</Text>
          </View>
        ) : (
          <ScrollView style={styles.userList}>
            {filteredUsers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>
                  {search 
                    ? t('admin.payments.noResultsFound', 'No se encontraron resultados')
                    : t('admin.payments.noResidentsFound', 'No se encontraron residentes')
                  }
                </Text>
                {search && (
                  <TouchableOpacity style={styles.clearSearchButton} onPress={() => setSearch('')}>
                    <Text style={styles.clearSearchButtonText}>{t('common.clearSearch', 'Limpiar búsqueda')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                {/* Results count */}
                <Text style={styles.resultsCount}>
                  {t('admin.payments.resultsCount', { count: filteredUsers.length }, `${filteredUsers.length} residente(s)`)}
                </Text>
                
                {filteredUsers.map((user) => {
                  const isSelected = target === 'single'
                    ? selectedUserId === user.id
                    : selectedUsers.some(u => u.id === user.id);
                    
                  return (
                    <TouchableOpacity
                      key={user.id}
                      style={[styles.userItem, isSelected && styles.userItemSelected]}
                      onPress={() => onSelectUser(user)}
                    >
                      <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>
                          {getUserInitial(user)}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{getUserDisplayName(user)}</Text>
                        <Text style={styles.userUnit}>
                          {user.unit_number || user.unit || user.email}
                        </Text>
                      </View>
                      {target === 'multiple' && (
                        <Ionicons 
                          name={isSelected ? 'checkbox' : 'square-outline'} 
                          size={24} 
                          color={isSelected ? COLORS.lime : COLORS.textMuted} 
                        />
                      )}
                      {target === 'single' && isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.lime} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        {/* Selection Summary for Multiple */}
        {target === 'multiple' && selectedUsers.length > 0 && (
          <View style={styles.selectionSummary}>
            <Text style={styles.selectionSummaryText}>
              {t('admin.payments.selectedCount', { count: selectedUsers.length }, `${selectedUsers.length} seleccionado(s)`)}
            </Text>
            <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
              <Text style={styles.doneButtonText}>{t('common.done', 'Listo')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    paddingTop: scale(50),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCancel: {
    fontSize: scale(16),
    color: COLORS.textSecondary,
  },
  modalTitle: {
    fontSize: scale(17),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalSave: {
    fontSize: scale(16),
    color: COLORS.lime,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    margin: scale(16),
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
  },
  searchIcon: {
    marginRight: scale(8),
  },
  searchInput: {
    flex: 1,
    paddingVertical: scale(14),
    fontSize: scale(16),
    color: COLORS.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: scale(12),
    color: COLORS.textSecondary,
    fontSize: scale(14),
  },
  userList: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: scale(60),
  },
  emptyTitle: {
    fontSize: scale(16),
    color: COLORS.textSecondary,
    marginTop: scale(12),
    textAlign: 'center',
  },
  clearSearchButton: {
    marginTop: scale(16),
    paddingVertical: scale(10),
    paddingHorizontal: scale(20),
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(8),
  },
  clearSearchButtonText: {
    color: COLORS.teal,
    fontWeight: '500',
  },
  resultsCount: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    fontSize: scale(13),
    color: COLORS.textMuted,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  userItemSelected: {
    backgroundColor: COLORS.lime + '10',
  },
  userAvatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.teal + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  userAvatarText: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.teal,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: scale(16),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  userUnit: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(16),
    backgroundColor: COLORS.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  selectionSummaryText: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  doneButton: {
    backgroundColor: COLORS.lime,
    paddingVertical: scale(10),
    paddingHorizontal: scale(24),
    borderRadius: scale(8),
  },
  doneButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.background,
  },
});

export default UserPickerModal;
