// app/pms.js - Gestor de Propiedades (PMS)
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, Alert, Modal, TextInput, ActivityIndicator,
  Dimensions, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  getPMSDashboard, getPMSProperties, createPMSProperty, deletePMSProperty,
  getPMSTenants, getPMSPayments, recordPMSPayment, getPMSMaintenance
} from '../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = [
  { id: 'dashboard', label: 'Inicio', icon: '📊' },
  { id: 'properties', label: 'Propiedades', icon: '🏠' },
  { id: 'tenants', label: 'Inquilinos', icon: '👥' },
  { id: 'payments', label: 'Pagos', icon: '💰' },
  { id: 'maintenance', label: 'Mant.', icon: '🔧' },
];

export default function PMSScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Data states
  const [dashboard, setDashboard] = useState(null);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  
  // Form state
  const [newProperty, setNewProperty] = useState({ name: '', address: '', type: 'apartment' });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const res = await getPMSDashboard();
        console.log('Dashboard response:', JSON.stringify(res, null, 2));
        if (res.success) setDashboard(res.data);
      } else if (activeTab === 'properties') {
        const res = await getPMSProperties();
        if (res.success) setProperties(res.data || []);
      } else if (activeTab === 'tenants') {
        const res = await getPMSTenants();
        if (res.success) setTenants(res.data || []);
      } else if (activeTab === 'payments') {
        const res = await getPMSPayments();
        if (res.success) setPayments(res.data || []);
      } else if (activeTab === 'maintenance') {
        const res = await getPMSMaintenance();
        if (res.success) setMaintenance(res.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddProperty = async () => {
    if (!newProperty.name || !newProperty.address) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }
    const res = await createPMSProperty(newProperty);
    if (res.success) {
      Alert.alert('Éxito', 'Propiedad creada');
      setShowAddModal(false);
      setNewProperty({ name: '', address: '', type: 'apartment' });
      loadData();
    } else {
      Alert.alert('Error', res.error);
    }
  };

  const handleDeleteProperty = (id) => {
    Alert.alert('Eliminar', '¿Eliminar esta propiedad?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        const res = await deletePMSProperty(id);
        if (res.success) loadData();
      }}
    ]);
  };

  const handleRecordPayment = async (paymentId) => {
    const res = await recordPMSPayment(paymentId);
    if (res.success) {
      Alert.alert('Éxito', 'Pago registrado');
      loadData();
    } else {
      Alert.alert('Error', res.error);
    }
  };

  // Helper to get dashboard values with fallbacks
  const getDashboardValue = (field) => {
    if (!dashboard) return 0;
    // Try different possible field names
    const mappings = {
      properties: ['properties', 'total_properties', 'totalProperties'],
      tenants: ['tenants', 'activeTenants', 'total_tenants', 'totalTenants', 'active_tenants'],
      income: ['monthlyIncome', 'monthly_income', 'totalPaid', 'total_paid', 'income'],
      pending: ['pendingPayments', 'pending_payments', 'pendingCount', 'pending'],
    };
    
    const possibleKeys = mappings[field] || [field];
    for (const key of possibleKeys) {
      if (dashboard[key] !== undefined) {
        return dashboard[key];
      }
    }
    return 0;
  };

  // ==================== RENDER TABS ====================
  const renderTabs = () => (
    <View style={styles.tabsWrapper}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // ==================== DASHBOARD ====================
  const renderDashboard = () => {
    const propertiesCount = getDashboardValue('properties');
    const tenantsCount = getDashboardValue('tenants');
    const monthlyIncome = getDashboardValue('income');
    const pendingCount = getDashboardValue('pending');

    return (
      <View style={styles.content}>
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: '#EBF5FF' }]}>
            <Text style={styles.kpiIcon}>🏠</Text>
            <Text style={styles.kpiValue}>{propertiesCount}</Text>
            <Text style={styles.kpiLabel}>Propiedades</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: '#F0FDF4' }]}>
            <Text style={styles.kpiIcon}>👥</Text>
            <Text style={styles.kpiValue}>{tenantsCount}</Text>
            <Text style={styles.kpiLabel}>Inquilinos</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: '#FEF9C3' }]}>
            <Text style={styles.kpiIcon}>💰</Text>
            <Text style={styles.kpiValue}>${(monthlyIncome / 1000).toFixed(1)}k</Text>
            <Text style={styles.kpiLabel}>Ingresos/Mes</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: '#FEE2E2' }]}>
            <Text style={styles.kpiIcon}>⏰</Text>
            <Text style={styles.kpiValue}>{pendingCount}</Text>
            <Text style={styles.kpiLabel}>Pendientes</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#6366F1' }]} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.actionText}>Propiedad</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10B981' }]} onPress={() => setActiveTab('payments')}>
            <Ionicons name="cash" size={20} color="#FFF" />
            <Text style={styles.actionText}>Cobrar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]} onPress={() => setActiveTab('maintenance')}>
            <Ionicons name="construct" size={20} color="#FFF" />
            <Text style={styles.actionText}>Tickets</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ==================== PROPERTIES ====================
  const renderProperties = () => (
    <View style={styles.content}>
      <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add-circle" size={20} color="#FFF" />
        <Text style={styles.addButtonText}>Nueva Propiedad</Text>
      </TouchableOpacity>
      
      {properties.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏠</Text>
          <Text style={styles.emptyText}>Sin propiedades</Text>
          <Text style={styles.emptySubtext}>Agrega tu primera propiedad</Text>
        </View>
      ) : (
        properties.map(prop => (
          <View key={prop.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{prop.name}</Text>
              <TouchableOpacity onPress={() => handleDeleteProperty(prop.id)}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
            <Text style={styles.cardSubtitle}>{prop.address}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardBadge}>{prop.type || 'Apartamento'}</Text>
              <Text style={styles.cardMeta}>{prop.units_count || 0} unidades</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  // ==================== TENANTS ====================
  const renderTenants = () => (
    <View style={styles.content}>
      {tenants.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyText}>Sin inquilinos</Text>
        </View>
      ) : (
        tenants.map(tenant => (
          <View key={tenant.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>{tenant.name || tenant.email}</Text>
              <View style={[styles.statusBadge, { backgroundColor: tenant.status === 'active' ? '#D1FAE5' : '#FEE2E2' }]}>
                <Text style={[styles.statusText, { color: tenant.status === 'active' ? '#059669' : '#DC2626' }]}>
                  {tenant.status === 'active' ? 'Activo' : 'Pendiente'}
                </Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>{tenant.email}</Text>
            <Text style={styles.cardMeta}>{tenant.property_name || tenant.unit_name || 'Sin asignar'}</Text>
          </View>
        ))
      )}
    </View>
  );

  // ==================== PAYMENTS ====================
  const renderPayments = () => {
    const totalPending = payments.filter(p => p.status === 'pending').reduce((acc, p) => acc + (p.amount || p.amount_due || 0), 0);
    const totalPaid = payments.filter(p => p.status === 'paid').reduce((acc, p) => acc + (p.amount || p.amount_paid || 0), 0);
    
    return (
      <View style={styles.content}>
        <View style={styles.paymentSummary}>
          <View style={[styles.summaryCard, { backgroundColor: '#D1FAE5' }]}>
            <Text style={styles.summaryLabel}>Cobrado</Text>
            <Text style={[styles.summaryValue, { color: '#059669' }]}>${totalPaid.toLocaleString()}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#FEE2E2' }]}>
            <Text style={styles.summaryLabel}>Pendiente</Text>
            <Text style={[styles.summaryValue, { color: '#DC2626' }]}>${totalPending.toLocaleString()}</Text>
          </View>
        </View>

        {payments.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={styles.emptyText}>Sin pagos registrados</Text>
          </View>
        ) : (
          payments.map(payment => (
            <View key={payment.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{payment.tenant_name || 'Inquilino'}</Text>
                <Text style={styles.cardAmount}>${(payment.amount || payment.amount_due)?.toLocaleString()}</Text>
              </View>
              <Text style={styles.cardSubtitle}>{payment.description || 'Renta mensual'}</Text>
              {payment.status === 'pending' && (
                <TouchableOpacity 
                  style={styles.payButton}
                  onPress={() => handleRecordPayment(payment.id)}
                >
                  <Text style={styles.payButtonText}>Registrar Pago</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>
    );
  };

  // ==================== MAINTENANCE ====================
  const renderMaintenance = () => (
    <View style={styles.content}>
      {maintenance.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔧</Text>
          <Text style={styles.emptyText}>Sin tickets</Text>
        </View>
      ) : (
        maintenance.map(ticket => (
          <View key={ticket.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{ticket.title}</Text>
              <View style={[styles.priorityBadge, { 
                backgroundColor: ticket.priority === 'high' ? '#FEE2E2' : ticket.priority === 'medium' ? '#FEF3C7' : '#E0E7FF'
              }]}>
                <Text style={[styles.priorityText, {
                  color: ticket.priority === 'high' ? '#DC2626' : ticket.priority === 'medium' ? '#D97706' : '#4F46E5'
                }]}>
                  {ticket.priority === 'high' ? 'Alta' : ticket.priority === 'medium' ? 'Media' : 'Baja'}
                </Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>{ticket.description}</Text>
            <Text style={styles.cardMeta}>Estado: {ticket.status}</Text>
          </View>
        ))
      )}
    </View>
  );

  // ==================== CONTENT ROUTER ====================
  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 50 }} />;
    }
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'properties': return renderProperties();
      case 'tenants': return renderTenants();
      case 'payments': return renderPayments();
      case 'maintenance': return renderMaintenance();
      default: return renderDashboard();
    }
  };

  // ==================== MAIN RENDER ====================
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestor de Propiedades</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      {renderTabs()}

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />}
      >
        {renderContent()}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Property Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoid}
            >
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHandle} />
                  <Text style={styles.modalTitle}>Nueva Propiedad</Text>
                  
                  <Text style={styles.inputLabel}>Nombre</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Edificio Central"
                    placeholderTextColor="#9CA3AF"
                    value={newProperty.name}
                    onChangeText={(t) => setNewProperty({ ...newProperty, name: t })}
                    returnKeyType="next"
                  />
                  
                  <Text style={styles.inputLabel}>Dirección</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Av. Principal #123"
                    placeholderTextColor="#9CA3AF"
                    value={newProperty.address}
                    onChangeText={(t) => setNewProperty({ ...newProperty, address: t })}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  
                  <Text style={styles.inputLabel}>Tipo de Propiedad</Text>
                  <View style={styles.typeSelector}>
                    {['apartment', 'house', 'commercial'].map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.typeBtn, newProperty.type === type && styles.typeBtnActive]}
                        onPress={() => setNewProperty({ ...newProperty, type })}
                      >
                        <Text style={[styles.typeText, newProperty.type === type && styles.typeTextActive]}>
                          {type === 'apartment' ? '🏢 Apto' : type === 'house' ? '🏠 Casa' : '🏪 Local'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                      Keyboard.dismiss();
                      setShowAddModal(false);
                    }}>
                      <Text style={styles.cancelBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleAddProperty}>
                      <Text style={styles.saveBtnText}>Guardar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: '#FFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB' 
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#F3F4F6', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#1F2937' 
  },
  
  // Tabs
  tabsWrapper: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    height: 56,
  },
  tabsScroll: {
    flex: 1,
  },
  tabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 56,
  },
  tab: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    marginRight: 8, 
    borderRadius: 20, 
    backgroundColor: '#F3F4F6',
    height: 36,
  },
  tabActive: { 
    backgroundColor: '#6366F1' 
  },
  tabIcon: { 
    fontSize: 14, 
    marginRight: 6 
  },
  tabLabel: { 
    fontSize: 13, 
    color: '#6B7280', 
    fontWeight: '500' 
  },
  tabLabelActive: { 
    color: '#FFF' 
  },

  scrollView: { 
    flex: 1 
  },
  content: { 
    padding: 16 
  },

  // KPI Grid
  kpiGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 12, 
    marginBottom: 24 
  },
  kpiCard: { 
    width: '47%', 
    padding: 16, 
    borderRadius: 16, 
    alignItems: 'center' 
  },
  kpiIcon: { 
    fontSize: 24, 
    marginBottom: 8 
  },
  kpiValue: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#1F2937' 
  },
  kpiLabel: { 
    fontSize: 12, 
    color: '#6B7280', 
    marginTop: 4 
  },

  // Actions
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1F2937', 
    marginBottom: 12 
  },
  actionsRow: { 
    flexDirection: 'row', 
    gap: 12 
  },
  actionBtn: { 
    flex: 1, 
    padding: 14, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  actionText: { 
    color: '#FFF', 
    fontSize: 11, 
    fontWeight: '600', 
    marginTop: 4 
  },

  // Cards
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 12, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 2, 
    elevation: 1 
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  cardSubtitle: { 
    fontSize: 14, 
    color: '#6B7280', 
    marginBottom: 8 
  },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  cardBadge: { 
    backgroundColor: '#E0E7FF', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12, 
    fontSize: 12, 
    color: '#4F46E5',
    overflow: 'hidden',
  },
  cardMeta: { 
    fontSize: 12, 
    color: '#9CA3AF' 
  },
  cardAmount: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#059669' 
  },

  // Status & Priority badges
  statusBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  statusText: { 
    fontSize: 12, 
    fontWeight: '600' 
  },
  priorityBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  priorityText: { 
    fontSize: 12, 
    fontWeight: '600' 
  },

  // Empty state
  empty: { 
    alignItems: 'center', 
    paddingVertical: 60 
  },
  emptyIcon: { 
    fontSize: 48, 
    marginBottom: 12 
  },
  emptyText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#6B7280' 
  },
  emptySubtext: { 
    fontSize: 14, 
    color: '#9CA3AF', 
    marginTop: 4 
  },

  // Buttons
  addButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#6366F1', 
    paddingVertical: 12, 
    borderRadius: 12, 
    marginBottom: 16, 
    gap: 8 
  },
  addButtonText: { 
    color: '#FFF', 
    fontWeight: '600', 
    fontSize: 14 
  },
  payButton: { 
    backgroundColor: '#10B981', 
    paddingVertical: 10, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 8 
  },
  payButtonText: { 
    color: '#FFF', 
    fontWeight: '600' 
  },

  // Payment summary
  paymentSummary: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 16 
  },
  summaryCard: { 
    flex: 1, 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  summaryLabel: { 
    fontSize: 13, 
    color: '#6B7280' 
  },
  summaryValue: { 
    fontSize: 20, 
    fontWeight: '700', 
    marginTop: 4 
  },

  // Modal
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  keyboardAvoid: {
    width: '100%',
  },
  modalContent: { 
    backgroundColor: '#FFF', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 24,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#1F2937', 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: { 
    backgroundColor: '#F3F4F6', 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 16, 
    marginBottom: 16,
    color: '#1F2937',
  },
  typeSelector: { 
    flexDirection: 'row', 
    gap: 8, 
    marginBottom: 24 
  },
  typeBtn: { 
    flex: 1, 
    padding: 12, 
    borderRadius: 12, 
    backgroundColor: '#F3F4F6', 
    alignItems: 'center' 
  },
  typeBtnActive: { 
    backgroundColor: '#6366F1' 
  },
  typeText: { 
    fontSize: 14, 
    color: '#6B7280' 
  },
  typeTextActive: { 
    color: '#FFF' 
  },
  modalButtons: { 
    flexDirection: 'row', 
    gap: 12 
  },
  cancelBtn: { 
    flex: 1, 
    padding: 16, 
    borderRadius: 12, 
    backgroundColor: '#F3F4F6', 
    alignItems: 'center' 
  },
  cancelBtnText: { 
    color: '#6B7280', 
    fontWeight: '600' 
  },
  saveBtn: { 
    flex: 1, 
    padding: 16, 
    borderRadius: 12, 
    backgroundColor: '#6366F1', 
    alignItems: 'center' 
  },
  saveBtnText: { 
    color: '#FFF', 
    fontWeight: '600' 
  },
});