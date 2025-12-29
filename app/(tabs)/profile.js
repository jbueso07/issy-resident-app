// app/(tabs)/profile.js
// ISSY Resident App - Profile Screen ProHome Style (Vertical Layout)

import { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity, 
  Alert, 
  Image, 
  Modal, 
  TextInput, 
  ActivityIndicator, 
  Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { deleteUserAccount } from '../../src/services/api';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ============ COLORES PROHOME ============
const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  bgCardAlt: '#243B44',
  
  lime: '#AAFF00',
  cyan: '#00E5FF',
  teal: '#00BFA6',
  orange: '#FF8A50',
  purple: '#A78BFA',
  coral: '#FF6B6B',
  indigo: '#818CF8',
  blue: '#60A5FA',
  
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textDark: '#0F1A1E',
  
  border: 'rgba(255, 255, 255, 0.1)',
  gradientStart: '#00BFA6',
  gradientEnd: '#AAFF00',
};

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

  const openTerms = () => Linking.openURL('https://joinissy.com/terminos.html');
  const openPrivacy = () => Linking.openURL('https://joinissy.com/privacidad.html');

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

  // Menu sections con colores ProHome
  const menuSections = [
    {
      title: 'Cuenta',
      items: [
        { 
          icon: 'person-outline', 
          title: 'Datos Personales', 
          subtitle: 'Nombre, teléfono, foto',
          route: '/edit-profile',
          color: COLORS.teal,
        },
        { 
          icon: 'star-outline', 
          title: 'Mi Suscripción', 
          subtitle: 'Planes y servicios activos',
          route: '/my-subscription',
          badge: 'PRO',
          color: COLORS.purple,
        },
        { 
          icon: 'card-outline', 
          title: 'Métodos de Pago', 
          subtitle: 'Tarjetas guardadas',
          route: '/payment-methods',
          color: COLORS.cyan,
        },
      ]
    },
    {
      title: 'Mi Comunidad',
      items: [
        { 
          icon: 'home-outline', 
          title: 'Mi Unidad', 
          subtitle: 'Información de residencia',
          route: '/my-unit',
          color: COLORS.teal,
        },
        { 
          icon: 'link-outline', 
          title: 'Unirse a Comunidad', 
          subtitle: 'Usar código de invitación',
          route: '/join-community',
          color: COLORS.lime,
          highlight: true,
        },
      ]
    },
    {
      title: 'Configuración',
      items: [
        { 
          icon: 'notifications-outline', 
          title: 'Notificaciones', 
          subtitle: 'Configurar alertas',
          route: null,
          color: COLORS.orange,
        },
        { 
          icon: 'lock-closed-outline', 
          title: 'Seguridad', 
          subtitle: 'Cambiar contraseña',
          route: '/edit-profile',
          color: COLORS.indigo,
        },
      ]
    },
    {
      title: 'Soporte',
      items: [
        { 
          icon: 'warning-outline', 
          title: 'Reportar Incidente', 
          subtitle: 'Reporta un problema en tu comunidad',
          route: '/incidents',
          color: COLORS.coral,
        },
        { 
          icon: 'help-circle-outline', 
          title: 'Ayuda', 
          subtitle: 'Soporte y FAQ',
          route: '/support',
          color: COLORS.cyan,
        },
        { 
          icon: 'document-text-outline', 
          title: 'Términos y Privacidad', 
          subtitle: 'Políticas legales',
          action: 'legal',
          color: COLORS.indigo,
        },
      ]
    },
    {
      title: 'Zona de Peligro',
      items: [
        { 
          icon: 'trash-outline', 
          title: 'Eliminar mi cuenta', 
          subtitle: 'Elimina permanentemente tu cuenta',
          action: 'delete',
          color: COLORS.coral,
          isDelete: true,
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

  const getUserInitials = () => {
    return user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U';
  };

  const getUserRole = () => {
    return user?.role === 'admin' || user?.role === 'superadmin' ? 'Administrador' : 'Residente';
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle} maxFontSizeMultiplier={1.2}>Perfil</Text>
          </View>

          {/* Profile Card con Gradiente */}
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => router.push('/edit-profile')}
          >
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileCard}
            >
              <View style={styles.profileContent}>
                <View style={styles.avatarContainer}>
                  {user?.avatar_url || user?.profile_photo_url ? (
                    <Image 
                      source={{ uri: user?.avatar_url || user?.profile_photo_url }} 
                      style={styles.avatar} 
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>{getUserInitials()}</Text>
                    </View>
                  )}
                  <View style={styles.editBadge}>
                    <Ionicons name="pencil" size={12} color={COLORS.textDark} />
                  </View>
                </View>
                
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName} maxFontSizeMultiplier={1.2} numberOfLines={1}>
                    {user?.name || user?.email || 'Usuario'}
                  </Text>
                  <Text style={styles.profileRole} maxFontSizeMultiplier={1.1}>
                    {getUserRole()}
                  </Text>
                  {user?.location_name && (
                    <View style={styles.locationBadge}>
                      <Ionicons name="location" size={12} color={COLORS.textPrimary} />
                      <Text style={styles.locationText} maxFontSizeMultiplier={1.1} numberOfLines={1}>
                        {user.location_name}
                      </Text>
                    </View>
                  )}
                </View>

                <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.6)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Menu Sections */}
          {menuSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.1}>
                {section.title}
              </Text>
              <View style={styles.menuContainer}>
                {section.items.map((item, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[
                      styles.menuItem,
                      index === section.items.length - 1 && styles.menuItemLast,
                    ]}
                    onPress={() => handleMenuPress(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuIconContainer, { backgroundColor: item.color + '20' }]}>
                      <Ionicons name={item.icon} size={22} color={item.color} />
                    </View>
                    <View style={styles.menuInfo}>
                      <View style={styles.menuTitleRow}>
                        <Text style={[
                          styles.menuTitle,
                          item.isDelete && styles.menuTitleDelete
                        ]} maxFontSizeMultiplier={1.2}>
                          {item.title}
                        </Text>
                        {item.badge && (
                          <View style={[styles.badge, { backgroundColor: item.color }]}>
                            <Text style={styles.badgeText} maxFontSizeMultiplier={1}>{item.badge}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[
                        styles.menuSubtitle,
                        item.isDelete && styles.menuSubtitleDelete
                      ]} maxFontSizeMultiplier={1.1}>{item.subtitle}</Text>
                    </View>
                    <Ionicons 
                      name="chevron-forward" 
                      size={20} 
                      color={item.isDelete ? COLORS.coral : COLORS.textMuted} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.coral} />
            <Text style={styles.logoutText} maxFontSizeMultiplier={1.2}>Cerrar Sesión</Text>
          </TouchableOpacity>

          <Text style={styles.version} maxFontSizeMultiplier={1}>ISSY Resident App v1.0.0</Text>

          {/* Espacio para tab bar */}
          <View style={{ height: scale(100) }} />
        </ScrollView>
      </SafeAreaView>

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
                <Ionicons name="warning" size={32} color={COLORS.coral} />
              </View>
              <Text style={styles.modalTitle} maxFontSizeMultiplier={1.2}>
                {deleteStep === 1 ? '¿Eliminar tu cuenta?' : 'Confirmar eliminación'}
              </Text>
            </View>

            {deleteStep === 1 ? (
              <>
                <Text style={styles.modalDescription} maxFontSizeMultiplier={1.2}>
                  Esta acción es <Text style={styles.boldText}>permanente e irreversible</Text>. 
                  Se eliminarán todos tus datos:
                </Text>
                <View style={styles.deleteList}>
                  <Text style={styles.deleteListItem}>• Tu perfil y datos personales</Text>
                  <Text style={styles.deleteListItem}>• Historial de visitas y códigos QR</Text>
                  <Text style={styles.deleteListItem}>• Reservaciones y pagos</Text>
                  <Text style={styles.deleteListItem}>• Membresías en comunidades</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalDescription} maxFontSizeMultiplier={1.2}>
                  Escribe <Text style={styles.boldText}>ELIMINAR</Text> para confirmar
                </Text>
                <TextInput
                  style={styles.confirmInput}
                  placeholder="ELIMINAR"
                  placeholderTextColor={COLORS.textMuted}
                  value={confirmText}
                  onChangeText={setConfirmText}
                  autoCapitalize="characters"
                />
                <Text style={styles.modalDescription} maxFontSizeMultiplier={1.2}>
                  Ingresa tu contraseña
                </Text>
                <TextInput
                  style={styles.confirmInput}
                  placeholder="Contraseña"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelButtonText} maxFontSizeMultiplier={1.2}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmDeleteButton, deleting && styles.buttonDisabled]}
                onPress={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color={COLORS.textPrimary} size="small" />
                ) : (
                  <Text style={styles.confirmDeleteText} maxFontSizeMultiplier={1.2}>
                    {deleteStep === 1 ? 'Continuar' : 'Eliminar'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  scrollContent: {
    paddingBottom: scale(20),
  },

  // Header
  header: {
    paddingHorizontal: scale(20),
    paddingTop: scale(10),
    paddingBottom: scale(16),
  },
  headerTitle: {
    fontSize: scale(28),
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },

  // Profile Card
  profileCard: {
    marginHorizontal: scale(16),
    borderRadius: scale(20),
    padding: scale(20),
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: scale(14),
  },
  avatar: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarPlaceholder: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    fontSize: scale(24),
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: COLORS.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.gradientStart,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  profileRole: {
    fontSize: scale(13),
    color: 'rgba(255,255,255,0.8)',
    marginTop: scale(2),
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: scale(6),
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: scale(10),
    alignSelf: 'flex-start',
  },
  locationText: {
    fontSize: scale(11),
    color: COLORS.textPrimary,
    fontWeight: '500',
  },

  // Sections
  section: {
    marginTop: scale(24),
    paddingHorizontal: scale(16),
  },
  sectionTitle: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: scale(10),
    marginLeft: scale(4),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuContainer: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(16),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconContainer: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  menuInfo: {
    flex: 1,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  menuTitle: {
    fontSize: scale(15),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  menuTitleDelete: {
    color: COLORS.coral,
  },
  badge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(8),
  },
  badgeText: {
    fontSize: scale(10),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  menuSubtitle: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  menuSubtitleDelete: {
    color: COLORS.textMuted,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(14),
    padding: scale(16),
    marginHorizontal: scale(16),
    marginTop: scale(32),
    borderWidth: 1,
    borderColor: COLORS.coral + '40',
  },
  logoutText: {
    color: COLORS.coral,
    fontSize: scale(15),
    fontWeight: '600',
  },

  version: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: scale(12),
    marginTop: scale(20),
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.bgSecondary,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    padding: scale(24),
    paddingBottom: scale(40),
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: scale(20),
  },
  modalWarningIcon: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: COLORS.coral + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  modalTitle: {
    fontSize: scale(20),
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: scale(15),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: scale(16),
    lineHeight: scale(22),
  },
  boldText: {
    fontWeight: 'bold',
    color: COLORS.coral,
  },
  deleteList: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(16),
  },
  deleteListItem: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginBottom: scale(8),
  },
  confirmInput: {
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(12),
    padding: scale(16),
    fontSize: scale(16),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.textPrimary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: scale(12),
  },
  cancelButton: {
    flex: 1,
    padding: scale(16),
    borderRadius: scale(12),
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confirmDeleteButton: {
    flex: 1,
    padding: scale(16),
    borderRadius: scale(12),
    backgroundColor: COLORS.coral,
    alignItems: 'center',
  },
  confirmDeleteText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});