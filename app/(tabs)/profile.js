import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Modal, TextInput, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { deleteUserAccount } from '../../src/services/api';

export default function Profile() {
  const { user, signOut, token } = useAuth();
  const router = useRouter();
  
  // Delete account states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Salir', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          }
        },
      ]
    );
  };

  const openTerms = () => {
    Linking.openURL('https://joinissy.com/terminos.html');
  };

  const openPrivacy = () => {
    Linking.openURL('https://joinissy.com/privacidad.html');
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
    setDeleteStep(1);
    setConfirmText('');
    setPassword('');
  };

  const handleConfirmDelete = async () => {
    if (deleteStep === 1) {
      setDeleteStep(2);
      return;
    }

    if (confirmText !== 'ELIMINAR') {
      Alert.alert('Error', 'Debes escribir ELIMINAR para confirmar');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Debes ingresar tu contraseña');
      return;
    }

    setDeleting(true);
    try {
      await deleteUserAccount(token, password);
      setShowDeleteModal(false);
      Alert.alert(
        'Cuenta Eliminada',
        'Tu cuenta ha sido eliminada exitosamente.',
        [{ text: 'OK', onPress: () => {
          signOut();
          router.replace('/(auth)/login');
        }}]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo eliminar la cuenta. Intenta de nuevo.');
    } finally {
      setDeleting(false);
    }
  };

  const menuSections = [
    {
      title: 'Cuenta',
      items: [
        { 
          icon: '👤', 
          title: 'Datos Personales', 
          subtitle: 'Nombre, teléfono, foto',
          route: '/edit-profile'
        },
        { 
          icon: '⭐', 
          title: 'Mi Suscripción', 
          subtitle: 'Planes y servicios activos',
          route: '/my-subscription',
          badge: 'PRO'
        },
        { 
          icon: '💳', 
          title: 'Métodos de Pago', 
          subtitle: 'Tarjetas guardadas',
          route: '/payment-methods'
        },
        { 
          icon: '🗑️', 
          title: 'Eliminar mi cuenta', 
          subtitle: 'Elimina permanentemente tu cuenta',
          action: 'delete',
          isDelete: true
        },
      ]
    },
    {
      title: 'Mi Comunidad',
      items: [
        { 
          icon: '🏠', 
          title: 'Mi Unidad', 
          subtitle: 'Información de residencia',
          route: '/my-unit'
        },
        { 
          icon: '🔗', 
          title: 'Unirse a Comunidad', 
          subtitle: 'Usar código de invitación',
          route: '/join-community',
          highlight: true
        },
      ]
    },
    {
      title: 'Configuración',
      items: [
        { 
          icon: '🔔', 
          title: 'Notificaciones', 
          subtitle: 'Configurar alertas',
          route: null
        },
        { 
          icon: '🔒', 
          title: 'Seguridad', 
          subtitle: 'Cambiar contraseña',
          route: '/edit-profile'
        },
      ]
    },
    {
      title: 'Soporte',
      items: [
        { 
          icon: '🚨', 
          title: 'Reportar Incidente', 
          subtitle: 'Reporta un problema en tu comunidad',
          route: '/incidents',
          isIncident: true
        },
        { 
          icon: '❓', 
          title: 'Ayuda', 
          subtitle: 'Soporte y FAQ',
          route: '/support'
        },
        { 
          icon: '📄', 
          title: 'Términos y Privacidad', 
          subtitle: 'Políticas legales',
          action: 'legal'
        },
      ]
    }
  ];

  const handleMenuPress = (item) => {
    if (item.action === 'delete') {
      handleDeleteAccount();
    } else if (item.action === 'legal') {
      Alert.alert(
        'Documentos Legales',
        'Selecciona el documento que deseas ver',
        [
          { text: 'Términos de Servicio', onPress: openTerms },
          { text: 'Política de Privacidad', onPress: openPrivacy },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
    } else if (item.route) {
      router.push(item.route);
    } else {
      Alert.alert('Próximamente', 'Esta función estará disponible pronto');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Perfil</Text>
        </View>

        {/* Profile Card */}
        <TouchableOpacity 
          style={styles.profileCard}
          onPress={() => router.push('/edit-profile')}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            {user?.avatar_url || user?.profile_photo_url ? (
              <Image source={{ uri: user?.avatar_url || user?.profile_photo_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={12} color="#FFF" />
            </View>
          </View>
          <Text style={styles.profileName}>{user?.name || user?.email || 'Usuario'}</Text>
          <Text style={styles.profileRole}>
            {user?.role === 'admin' || user?.role === 'superadmin' ? 'Administrador' : 'Residente'}
          </Text>
          {user?.location_name && (
            <View style={styles.locationBadge}>
              <Ionicons name="location" size={14} color="#6366F1" />
              <Text style={styles.locationText}>{user.location_name}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Menu Sections */}
        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuContainer}>
              {section.items.map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[
                    styles.menuItem,
                    index === section.items.length - 1 && styles.menuItemLast,
                    item.highlight && styles.menuItemHighlight,
                    item.isIncident && styles.menuItemIncident,
                    item.isDelete && styles.menuItemDelete
                  ]}
                  onPress={() => handleMenuPress(item)}
                  activeOpacity={0.6}
                >
                  <View style={[
                    styles.menuIconContainer, 
                    item.highlight && styles.menuIconHighlight,
                    item.isIncident && styles.menuIconIncident,
                    item.isDelete && styles.menuIconDelete
                  ]}>
                    <Text style={styles.menuIcon}>{item.icon}</Text>
                  </View>
                  <View style={styles.menuInfo}>
                    <View style={styles.menuTitleRow}>
                      <Text style={[
                        styles.menuTitle, 
                        item.highlight && styles.menuTitleHighlight,
                        item.isIncident && styles.menuTitleIncident,
                        item.isDelete && styles.menuTitleDelete
                      ]}>
                        {item.title}
                      </Text>
                      {item.badge && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{item.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[
                      styles.menuSubtitle,
                      item.isDelete && styles.menuSubtitleDelete
                    ]}>{item.subtitle}</Text>
                  </View>
                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color={item.highlight ? '#6366F1' : item.isIncident ? '#FA5967' : item.isDelete ? '#DC2626' : '#D1D5DB'} 
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <Text style={styles.version}>ISSY Resident App v1.0.0</Text>
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalWarningIcon}>
                <Ionicons name="warning" size={32} color="#DC2626" />
              </View>
              <Text style={styles.modalTitle}>
                {deleteStep === 1 ? '¿Eliminar tu cuenta?' : 'Confirmar eliminación'}
              </Text>
            </View>

            {deleteStep === 1 ? (
              <>
                <Text style={styles.modalDescription}>
                  Esta acción es <Text style={styles.boldText}>permanente e irreversible</Text>. 
                  Se eliminarán todos tus datos incluyendo:
                </Text>
                <View style={styles.deleteList}>
                  <Text style={styles.deleteListItem}>• Tu perfil y datos personales</Text>
                  <Text style={styles.deleteListItem}>• Membresías en comunidades</Text>
                  <Text style={styles.deleteListItem}>• Códigos QR generados</Text>
                  <Text style={styles.deleteListItem}>• Historial de reservaciones</Text>
                  <Text style={styles.deleteListItem}>• Datos financieros guardados</Text>
                  <Text style={styles.deleteListItem}>• Contactos de emergencia</Text>
                </View>
                <Text style={styles.modalNote}>
                  Los datos serán eliminados dentro de 30 días.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.modalDescription}>
                  Escribe <Text style={styles.boldText}>ELIMINAR</Text> para confirmar:
                </Text>
                <TextInput
                  style={styles.confirmInput}
                  value={confirmText}
                  onChangeText={setConfirmText}
                  placeholder="Escribe ELIMINAR"
                  autoCapitalize="characters"
                />
                <Text style={styles.modalDescription}>
                  Ingresa tu contraseña:
                </Text>
                <TextInput
                  style={styles.confirmInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Tu contraseña"
                  secureTextEntry
                />
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  if (deleteStep === 2) {
                    setDeleteStep(1);
                  } else {
                    setShowDeleteModal(false);
                  }
                }}
              >
                <Text style={styles.cancelButtonText}>
                  {deleteStep === 2 ? 'Volver' : 'Cancelar'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmDeleteButton, deleting && styles.buttonDisabled]}
                onPress={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.confirmDeleteText}>
                    {deleteStep === 1 ? 'Continuar' : 'Eliminar Cuenta'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 24,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 20,
    marginHorizontal: 24,
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  profileRole: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
  },
  locationText: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '500',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemHighlight: {
    backgroundColor: '#EEF2FF',
  },
  menuItemIncident: {
    backgroundColor: '#FEF2F2',
  },
  menuItemDelete: {
    backgroundColor: '#FFF',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIconHighlight: {
    backgroundColor: '#6366F1',
  },
  menuIconIncident: {
    backgroundColor: '#FA5967',
  },
  menuIconDelete: {
    backgroundColor: '#FEE2E2',
  },
  menuIcon: {
    fontSize: 20,
  },
  menuInfo: {
    flex: 1,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  menuTitleHighlight: {
    color: '#6366F1',
    fontWeight: '600',
  },
  menuTitleIncident: {
    color: '#FA5967',
    fontWeight: '600',
  },
  menuTitleDelete: {
    color: '#DC2626',
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  menuSubtitleDelete: {
    color: '#9CA3AF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginTop: 32,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalWarningIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#DC2626',
  },
  deleteList: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  deleteListItem: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  modalNote: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  confirmInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  confirmDeleteButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  confirmDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  version: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 20,
    marginBottom: 32,
  },
});