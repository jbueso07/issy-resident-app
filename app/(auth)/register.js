// app/(auth)/register.js
// ISSY Resident App - Register Screen

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, verifyInvitation } = useAuth();
  const router = useRouter();

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu nombre');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu email');
      return false;
    }
    if (!email.includes('@')) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return false;
    }
    if (!password) {
      Alert.alert('Error', 'Por favor ingresa una contraseña');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Si tiene código de invitación, verificarlo primero
      let invitationData = null;
      if (invitationCode.trim()) {
        const invResult = await verifyInvitation(invitationCode.trim().toUpperCase());
        if (!invResult.success) {
          Alert.alert('Error', invResult.error || 'Código de invitación inválido');
          setLoading(false);
          return;
        }
        invitationData = invResult.data;
      }

      // Registrar usuario
      const result = await signUp({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        password,
        invitation_code: invitationCode.trim().toUpperCase() || null,
      });

      if (result.success) {
        const user = result.data?.user;
        
        if (user?.location_id || invitationData) {
          // Tiene ubicación, ir al home
          Alert.alert('¡Bienvenido!', 'Tu cuenta ha sido creada exitosamente', [
            { text: 'OK', onPress: () => router.replace('/(tabs)/home') }
          ]);
        } else {
          // Sin ubicación, ir a unirse a comunidad
          Alert.alert('¡Cuenta creada!', 'Ahora únete a tu comunidad', [
            { text: 'OK', onPress: () => router.replace('/join-community') }
          ]);
        }
      } else {
        Alert.alert('Error', result.error || 'No se pudo crear la cuenta');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.backButton}>
                <Text style={styles.backButtonText}>← Volver</Text>
              </TouchableOpacity>
            </Link>
            <Text style={styles.title}>Crear Cuenta</Text>
            <Text style={styles.subtitle}>Únete a ISSY</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nombre completo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Juan Pérez"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Teléfono (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="+504 9999-9999"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Contraseña *</Text>
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirmar contraseña *</Text>
              <TextInput
                style={styles.input}
                placeholder="Repite tu contraseña"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            {/* Invitation Code */}
            <View style={styles.invitationContainer}>
              <Text style={styles.invitationLabel}>¿Tienes un código de invitación?</Text>
              <TextInput
                style={[styles.input, styles.invitationInput]}
                placeholder="Ej: ABC123"
                placeholderTextColor="#9CA3AF"
                value={invitationCode}
                onChangeText={(text) => setInvitationCode(text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={20}
              />
              <Text style={styles.invitationHint}>
                Si tu administrador te dio un código, ingrésalo aquí
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Crear Cuenta</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}> Inicia Sesión</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: '#6366F1',
    fontSize: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  invitationContainer: {
    marginTop: 8,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
  },
  invitationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
    marginBottom: 12,
  },
  invitationInput: {
    backgroundColor: '#fff',
    borderColor: '#C7D2FE',
  },
  invitationHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 14,
  },
  footerLink: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
});