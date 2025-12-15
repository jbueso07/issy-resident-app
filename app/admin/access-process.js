// app/admin/access-process.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Clock, Check } from 'lucide-react-native';
import { api } from '../../src/services/api';

const ACCESS_PROCESSES = [
  {
    id: 'no_data',
    title: 'Sin datos adicionales',
    description: 'Solo validar QR',
    time: '2-3 segundos',
    photos: 0,
    requiresId: false,
    requiresPlate: false,
  },
  {
    id: 'photo_1',
    title: 'Capturar 1 Fotografía',
    description: 'Foto del visitante',
    time: '5-10 segundos',
    photos: 1,
    requiresId: false,
    requiresPlate: false,
  },
  {
    id: 'photo_2',
    title: 'Capturar 2 Fotografías',
    description: 'Foto frontal y lateral',
    time: '10-15 segundos',
    photos: 2,
    requiresId: false,
    requiresPlate: false,
  },
  {
    id: 'photo_3',
    title: 'Capturar 3 Fotografías',
    description: 'Múltiples ángulos',
    time: '20-25 segundos',
    photos: 3,
    requiresId: false,
    requiresPlate: false,
  },
  {
    id: 'photo_1_id',
    title: 'Capturar 1 Foto + # de Identificación',
    description: 'Foto y número de ID',
    time: '15-20 segundos',
    photos: 1,
    requiresId: true,
    requiresPlate: false,
  },
  {
    id: 'photo_1_id_plate',
    title: '1 Foto + # de Identidad + Placa (si aplica)',
    description: 'Foto, ID y placa del vehículo',
    time: '40-50 segundos',
    photos: 1,
    requiresId: true,
    requiresPlate: true,
  },
  {
    id: 'photo_2_id_plate',
    title: '2 Fotos + # de Identidad + Placa (si aplica)',
    description: 'Fotos, ID y placa del vehículo',
    time: '50-55 segundos',
    photos: 2,
    requiresId: true,
    requiresPlate: true,
  },
  {
    id: 'full',
    title: '3 Fotos + # de Identidad + Placa (si aplica)',
    description: 'Captura completa de datos',
    time: '60-70 segundos',
    photos: 3,
    requiresId: true,
    requiresPlate: true,
  },
];

const SECURITY_PREFERENCES = [
  {
    id: 'require_exit_registration',
    title: 'Debe marcar salida',
    description: 'Registrar cuando el visitante sale',
  },
  {
    id: 'require_companion',
    title: 'Ir siempre acompañado',
    description: 'Visitante debe ir con residente',
  },
  {
    id: 'use_qr_for_residents',
    title: 'Usar QR para acceso de residentes',
    description: 'Residentes usan QR para entrar',
  },
  {
    id: 'can_request_resident_approval',
    title: 'Requiere aprobación del residente',
    description: 'Visitantes necesitan autorización',
  },
];

export default function AccessProcessScreen() {
  const params = useLocalSearchParams();
  const locationId = params.locationId;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState('no_data');
  const [preferences, setPreferences] = useState({
    require_exit_registration: false,
    require_companion: false,
    use_qr_for_residents: false,
    can_request_resident_approval: true,
  });

  useEffect(() => {
    fetchSettings();
  }, [locationId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/admin/settings/guard-app/${locationId}`);
      
      if (response) {
        setSelectedProcess(response.access_process || 'no_data');
        setPreferences({
          require_exit_registration: response.require_exit_registration || false,
          require_companion: response.require_companion || false,
          use_qr_for_residents: response.use_qr_for_residents || false,
          can_request_resident_approval: response.can_request_resident_approval ?? true,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      Alert.alert('Error', 'No se pudo cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      await api.put(`/api/admin/settings/guard-app/${locationId}`, {
        access_process: selectedProcess,
        ...preferences,
      });

      Alert.alert('Éxito', 'Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (key) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Procesos de Acceso' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen 
        options={{ 
          title: 'Procesos de Acceso',
          headerStyle: { backgroundColor: '#fff' },
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Access Process Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proceso de Acceso</Text>
          <Text style={styles.sectionSubtitle}>
            Selecciona qué datos capturar al registrar visitantes
          </Text>
          
          {ACCESS_PROCESSES.map((process) => (
            <TouchableOpacity
              key={process.id}
              style={[
                styles.processOption,
                selectedProcess === process.id && styles.processOptionSelected,
              ]}
              onPress={() => setSelectedProcess(process.id)}
              activeOpacity={0.7}
            >
              <View style={styles.radioContainer}>
                <View style={[
                  styles.radio,
                  selectedProcess === process.id && styles.radioSelected,
                ]}>
                  {selectedProcess === process.id && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>
              
              <View style={styles.processContent}>
                <Text style={[
                  styles.processTitle,
                  selectedProcess === process.id && styles.processTitleSelected,
                ]}>
                  {process.title}
                </Text>
                <View style={styles.processTime}>
                  <Clock size={14} color="#6B7280" />
                  <Text style={styles.processTimeText}>
                    Tiempo de acceso: aprox. {process.time}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Security Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferencias de Seguridad</Text>
          
          {SECURITY_PREFERENCES.map((pref) => (
            <TouchableOpacity
              key={pref.id}
              style={styles.preferenceRow}
              onPress={() => togglePreference(pref.id)}
              activeOpacity={0.7}
            >
              <View style={styles.preferenceContent}>
                <Text style={styles.preferenceTitle}>{pref.title}</Text>
                <Text style={styles.preferenceDescription}>{pref.description}</Text>
              </View>
              
              <View style={[
                styles.checkbox,
                preferences[pref.id] && styles.checkboxChecked,
              ]}>
                {preferences[pref.id] && (
                  <Check size={16} color="#fff" strokeWidth={3} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Spacer for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>GUARDAR CAMBIOS</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  processOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  processOptionSelected: {
    backgroundColor: '#F0F9FF',
  },
  radioContainer: {
    marginRight: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#6366F1',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6366F1',
  },
  processContent: {
    flex: 1,
  },
  processTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  processTitleSelected: {
    color: '#6366F1',
    fontWeight: '600',
  },
  processTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  processTimeText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  preferenceContent: {
    flex: 1,
    marginRight: 12,
  },
  preferenceTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  preferenceDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    backgroundColor: '#F87171',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});