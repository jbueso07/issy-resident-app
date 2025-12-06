import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';

export default function Profile() {
  const { user, signOut } = useAuth();
  const router = useRouter();

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
          icon: '❓', 
          title: 'Ayuda', 
          subtitle: 'Soporte y FAQ',
          route: null
        },
        { 
          icon: '📄', 
          title: 'Términos y Privacidad', 
          subtitle: 'Políticas legales',
          route: null
        },
      ]
    }
  ];

  const handleMenuPress = (item) => {
    if (item.route) {
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
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
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
            {user?.role === 'admin' ? 'Administrador' : 'Residente'}
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
                    item.highlight && styles.menuItemHighlight
                  ]}
                  onPress={() => handleMenuPress(item)}
                  activeOpacity={0.6}
                >
                  <View style={[styles.menuIconContainer, item.highlight && styles.menuIconHighlight]}>
                    <Text style={styles.menuIcon}>{item.icon}</Text>
                  </View>
                  <View style={styles.menuInfo}>
                    <View style={styles.menuTitleRow}>
                      <Text style={[styles.menuTitle, item.highlight && styles.menuTitleHighlight]}>
                        {item.title}
                      </Text>
                      {item.badge && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{item.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={item.highlight ? '#6366F1' : '#D1D5DB'} />
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
  version: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 20,
    marginBottom: 32,
  },
});
