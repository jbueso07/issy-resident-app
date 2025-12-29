// app/pms.js - Gestor de Propiedades (PMS) - ProHome Dark Theme
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, Alert, TextInput, ActivityIndicator,
  Dimensions, KeyboardAvoidingView, Platform, Keyboard, 
  TouchableWithoutFeedback, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  getPMSDashboard, getPMSProperties, createPMSProperty, deletePMSProperty,
  getPMSTenants, getPMSPayments, recordPMSPayment, getPMSMaintenance
} from '../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ProHome Dark Theme Colors
const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  card: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  teal: '#5DDED8',
  tealDark: '#4BCDC7',
  lime: '#D4FE48',
  purple: '#6366F1',
  purpleLight: '#818CF8',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  green: '#10B981',
  red: '#EF4444',
  yellow: '#F59E0B',
  blue: '#3B82F6',
};

const TABS = [
  { id: 'dashboard', label: 'Inicio', icon: 'grid-outline' },
  { id: 'properties', label: 'Propiedades', icon: 'home-outline' },
  { id: 'tenants', label: 'Inquilinos', icon: 'people-outline' },
  { id: 'payments', label: 'Pagos', icon: 'wallet-outline' },
  { id: 'maintenance', label: 'Mant.', icon: 'construct-outline' },
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

  // Helper to get dashboard values
  const getDashboardValue = (field) => {
    if (!dashboard) return 0;
    const mappings = {
      properties: ['properties', 'total_properties', 'totalProperties'],
      tenants: ['activeTenants', 'tenants', 'total_tenants', 'totalTenants', 'active_tenants'],
      income: ['payments.totalPaid', 'monthlyIncome', 'monthly_income', 'totalPaid', 'total_paid', 'income'],
      pending: ['payments.pending', 'pendingPayments', 'pending_payments', 'pendingCount', 'pending'],
      occupancy: ['occupancyRate', 'occupancy_rate'],
      units: ['units.total', 'totalUnits', 'total_units'],
      openTickets: ['maintenance.openTickets', 'openTickets', 'open_tickets'],
    };
    
    const possibleKeys = mappings[field] || [field];
    for (const key of possibleKeys) {
      if (key.includes('.')) {
        const parts = key.split('.');
        let value = dashboard;
        for (const part of parts) {
          value = value?.[part];
        }
        if (value !== undefined) return value;
      } else if (dashboard[key] !== undefined) {
        return dashboard[key];
      }
    }
    return 0;
  };

  // ==================== RENDER TABS ====================
  const renderTabs = () => (
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
          <Ionicons 
            name={tab.icon} 
            size={18} 
            color={activeTab === tab.id ? COLORS.background : COLORS.textSecondary} 
          />
          <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // ==================== DASHBOARD ====================
  const renderDashboard = () => {
    const propertiesCount = getDashboardValue('properties');
    const tenantsCount = getDashboardValue('tenants');
    const monthlyIncome = getDashboardValue('income');
    const pendingCount = getDashboardValue('pending');
    const occupancyRate = getDashboardValue('occupancy');
    const openTickets = getDashboardValue('openTickets');

    return (
      <View style={styles.content}>
        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderLeftColor: COLORS.blue }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons name="home" size={22} color={COLORS.blue} />
            </View>
            <Text style={styles.kpiValue}>{propertiesCount}</Text>
            <Text style={styles.kpiLabel}>Propiedades</Text>
          </View>
          
          <View style={[styles.kpiCard, { borderLeftColor: COLORS.green }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="people" size={22} color={COLORS.green} />
            </View>
            <Text style={styles.kpiValue}>{tenantsCount}</Text>
            <Text style={styles.kpiLabel}>Inquilinos</Text>
          </View>
          
          <View style={[styles.kpiCard, { borderLeftColor: COLORS.lime }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(212, 254, 72, 0.15)' }]}>
              <Ionicons name="wallet" size={22} color={COLORS.lime} />
            </View>
            <Text style={styles.kpiValue}>L{(monthlyIncome / 1000).toFixed(1)}k</Text>
            <Text style={styles.kpiLabel}>Ingresos/Mes</Text>
          </View>
          
          <View style={[styles.kpiCard, { borderLeftColor: COLORS.red }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Ionicons name="time" size={22} color={COLORS.red} />
            </View>
            <Text style={styles.kpiValue}>{pendingCount}</Text>
            <Text style={styles.kpiLabel}>Pendientes</Text>
          </View>
        </View>

        {/* Occupancy Rate */}
        {occupancyRate > 0 && (
          <View style={styles.occupancyCard}>
            <View style={styles.occupancyHeader}>
              <Text style={styles.occupancyTitle}>Tasa de Ocupación</Text>
              <Text style={[styles.occupancyValue, { color: occupancyRate >= 80 ? COLORS.green : COLORS.yellow }]}>
                {occupancyRate}%
              </Text>
            </View>
            <View style={styles.occupancyBarBg}>
              <View style={[styles.occupancyBarFill, { 
                width: `${occupancyRate}%`,
                backgroundColor: occupancyRate >= 80 ? COLORS.green : COLORS.yellow 
              }]} />
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.purple }]} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={24} color={COLORS.textPrimary} />
            <Text style={styles.actionText}>Propiedad</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.green }]} onPress={() => setActiveTab('payments')}>
            <Ionicons name="cash" size={24} color={COLORS.textPrimary} />
            <Text style={styles.actionText}>Cobrar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.yellow }]} onPress={() => setActiveTab('maintenance')}>
            <Ionicons name="construct" size={24} color={COLORS.textPrimary} />
            <Text style={styles.actionText}>Tickets ({openTickets})</Text>
          </TouchableOpacity>
        </View>

        {/* Alerts */}
        {dashboard?.alerts && (dashboard.alerts.expiringLeases > 0 || dashboard.alerts.overduePayments > 0) && (
          <View style={styles.alertsSection}>
            <Text style={styles.sectionTitle}>⚠️ Alertas</Text>
            {dashboard.alerts.expiringLeases > 0 && (
              <View style={styles.alertCard}>
                <Ionicons name="document-text" size={20} color={COLORS.yellow} />
                <Text style={styles.alertText}>{dashboard.alerts.expiringLeases} contratos por vencer</Text>
              </View>
            )}
            {dashboard.alerts.overduePayments > 0 && (
              <View style={styles.alertCard}>
                <Ionicons name="alert-circle" size={20} color={COLORS.red} />
                <Text style={styles.alertText}>{dashboard.alerts.overduePayments} pagos vencidos</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // ==================== PROPERTIES ====================
  const renderProperties = () => (
    <View style={styles.content}>
      <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add-circle" size={20} color={COLORS.textPrimary} />
        <Text style={styles.addButtonText}>Nueva Propiedad</Text>
      </TouchableOpacity>
      
      {properties.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="home-outline" size={48} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyText}>Sin propiedades</Text>
          <Text style={styles.emptySubtext}>Agrega tu primera propiedad</Text>
        </View>
      ) : (
        properties.map(prop => (
          <View key={prop.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.propertyTypeIcon, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                  <Ionicons 
                    name={prop.property_type === 'house' ? 'home' : prop.property_type === 'commercial' ? 'storefront' : 'business'} 
                    size={20} 
                    color={COLORS.purple} 
                  />
                </View>
                <View style={styles.cardTitleContent}>
                  <Text style={styles.cardTitle}>{prop.name}</Text>
                  <Text style={styles.cardSubtitle}>{prop.address}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleDeleteProperty(prop.id)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color={COLORS.red} />
              </TouchableOpacity>
            </View>
            <View style={styles.cardFooter}>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>
                  {prop.property_type === 'apartment' ? '🏢 Apartamento' : prop.property_type === 'house' ? '🏠 Casa' : '🏪 Local'}
                </Text>
              </View>
              <Text style={styles.cardMeta}>{prop.units_count || 0} unidades • {prop.occupied_count || 0} ocupadas</Text>
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
          <View style={styles.emptyIconBox}>
            <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyText}>Sin inquilinos</Text>
          <Text style={styles.emptySubtext}>Agrega inquilinos desde las propiedades</Text>
        </View>
      ) : (
        tenants.map(tenant => (
          <View key={tenant.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.avatarBox, { backgroundColor: tenant.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                  <Text style={styles.avatarText}>
                    {(tenant.first_name?.[0] || tenant.name?.[0] || tenant.email?.[0] || '?').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.cardTitleContent}>
                  <Text style={styles.cardTitle}>
                    {tenant.first_name && tenant.last_name 
                      ? `${tenant.first_name} ${tenant.last_name}`
                      : tenant.name || tenant.email}
                  </Text>
                  <Text style={styles.cardSubtitle}>{tenant.email}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: tenant.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                <Text style={[styles.statusText, { color: tenant.status === 'active' ? COLORS.green : COLORS.red }]}>
                  {tenant.status === 'active' ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
            </View>
            {(tenant.property_name || tenant.unit_name) && (
              <View style={styles.tenantLocation}>
                <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.cardMeta}>{tenant.property_name || tenant.unit_name || 'Sin asignar'}</Text>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );

  // ==================== PAYMENTS ====================
  const renderPayments = () => {
    const totalPending = payments.filter(p => p.status === 'pending' || p.status === 'partial').reduce((acc, p) => acc + (p.amount_due || p.amount || 0), 0);
    const totalPaid = payments.filter(p => p.status === 'paid').reduce((acc, p) => acc + (p.amount_paid || p.amount || 0), 0);
    
    return (
      <View style={styles.content}>
        {/* Summary Cards */}
        <View style={styles.paymentSummary}>
          <View style={[styles.summaryCard, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.green} />
            <Text style={styles.summaryLabel}>Cobrado</Text>
            <Text style={[styles.summaryValue, { color: COLORS.green }]}>L{totalPaid.toLocaleString()}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
            <Ionicons name="time" size={24} color={COLORS.red} />
            <Text style={styles.summaryLabel}>Pendiente</Text>
            <Text style={[styles.summaryValue, { color: COLORS.red }]}>L{totalPending.toLocaleString()}</Text>
          </View>
        </View>

        {payments.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="wallet-outline" size={48} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyText}>Sin pagos registrados</Text>
          </View>
        ) : (
          payments.map(payment => (
            <View key={payment.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <View style={[styles.paymentIcon, { 
                    backgroundColor: payment.status === 'paid' ? 'rgba(16, 185, 129, 0.15)' : 
                                    payment.status === 'overdue' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)' 
                  }]}>
                    <Ionicons 
                      name={payment.status === 'paid' ? 'checkmark-circle' : payment.status === 'overdue' ? 'alert-circle' : 'time'} 
                      size={20} 
                      color={payment.status === 'paid' ? COLORS.green : payment.status === 'overdue' ? COLORS.red : COLORS.yellow} 
                    />
                  </View>
                  <View style={styles.cardTitleContent}>
                    <Text style={styles.cardTitle}>{payment.tenant_name || payment.tenant?.first_name || 'Inquilino'}</Text>
                    <Text style={styles.cardSubtitle}>{payment.description || 'Renta mensual'}</Text>
                  </View>
                </View>
                <Text style={[styles.cardAmount, { 
                  color: payment.status === 'paid' ? COLORS.green : payment.status === 'overdue' ? COLORS.red : COLORS.yellow 
                }]}>
                  L{(payment.amount_due || payment.amount)?.toLocaleString()}
                </Text>
              </View>
              {payment.status !== 'paid' && (
                <TouchableOpacity 
                  style={styles.payButton}
                  onPress={() => handleRecordPayment(payment.id)}
                >
                  <Ionicons name="checkmark" size={18} color={COLORS.textPrimary} />
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
          <View style={styles.emptyIconBox}>
            <Ionicons name="construct-outline" size={48} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyText}>Sin tickets de mantenimiento</Text>
          <Text style={styles.emptySubtext}>Todo está en orden</Text>
        </View>
      ) : (
        maintenance.map(ticket => (
          <View key={ticket.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.ticketIcon, { 
                  backgroundColor: ticket.priority === 'high' ? 'rgba(239, 68, 68, 0.15)' : 
                                  ticket.priority === 'medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)' 
                }]}>
                  <Ionicons 
                    name="construct" 
                    size={20} 
                    color={ticket.priority === 'high' ? COLORS.red : ticket.priority === 'medium' ? COLORS.yellow : COLORS.blue} 
                  />
                </View>
                <View style={styles.cardTitleContent}>
                  <Text style={styles.cardTitle}>{ticket.title}</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={2}>{ticket.description}</Text>
                </View>
              </View>
              <View style={[styles.priorityBadge, { 
                backgroundColor: ticket.priority === 'high' ? 'rgba(239, 68, 68, 0.15)' : 
                                ticket.priority === 'medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)'
              }]}>
                <Text style={[styles.priorityText, {
                  color: ticket.priority === 'high' ? COLORS.red : ticket.priority === 'medium' ? COLORS.yellow : COLORS.blue
                }]}>
                  {ticket.priority === 'high' ? 'Alta' : ticket.priority === 'medium' ? 'Media' : 'Baja'}
                </Text>
              </View>
            </View>
            <View style={styles.ticketFooter}>
              <View style={[styles.statusChip, { 
                backgroundColor: ticket.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 
                                ticket.status === 'in_progress' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)'
              }]}>
                <Text style={[styles.statusChipText, {
                  color: ticket.status === 'completed' ? COLORS.green : ticket.status === 'in_progress' ? COLORS.blue : COLORS.yellow
                }]}>
                  {ticket.status === 'completed' ? '✓ Completado' : ticket.status === 'in_progress' ? '⏳ En Progreso' : '🔔 Abierto'}
                </Text>
              </View>
              {ticket.property?.name && (
                <Text style={styles.cardMeta}>{ticket.property.name}</Text>
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );

  // ==================== CONTENT ROUTER ====================
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      );
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
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestor de Propiedades</Text>
        <View style={{ width: scale(40) }} />
      </View>

      {/* Tabs */}
      {renderTabs()}

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.purple} />}
      >
        {renderContent()}
        <View style={{ height: scale(100) }} />
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
                    placeholderTextColor={COLORS.textMuted}
                    value={newProperty.name}
                    onChangeText={(t) => setNewProperty({ ...newProperty, name: t })}
                    returnKeyType="next"
                  />
                  
                  <Text style={styles.inputLabel}>Dirección</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Av. Principal #123"
                    placeholderTextColor={COLORS.textMuted}
                    value={newProperty.address}
                    onChangeText={(t) => setNewProperty({ ...newProperty, address: t })}
                    returnKeyType="done"
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
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
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
    backgroundColor: COLORS.background 
  },
  
  // Header
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: scale(16), 
    paddingVertical: scale(12),
  },
  backBtn: { 
    width: scale(40), 
    height: scale(40), 
    borderRadius: scale(20), 
    backgroundColor: COLORS.card, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerTitle: { 
    fontSize: scale(18), 
    fontWeight: '600', 
    color: COLORS.textPrimary 
  },
  
  // Tabs
  tabsScroll: {
    maxHeight: scale(56),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  tabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    gap: scale(8),
  },
  tab: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(14), 
    paddingVertical: scale(8), 
    borderRadius: scale(20), 
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: scale(6),
  },
  tabActive: { 
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },
  tabLabel: { 
    fontSize: scale(13), 
    color: COLORS.textSecondary, 
    fontWeight: '500' 
  },
  tabLabelActive: { 
    color: COLORS.background,
    fontWeight: '600',
  },

  scrollView: { 
    flex: 1 
  },
  content: { 
    padding: scale(16) 
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: scale(60),
  },
  loadingText: {
    marginTop: scale(12),
    color: COLORS.textSecondary,
    fontSize: scale(14),
  },

  // KPI Grid
  kpiGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: scale(12), 
    marginBottom: scale(20) 
  },
  kpiCard: { 
    width: '47%', 
    padding: scale(16), 
    borderRadius: scale(16), 
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderLeftWidth: 3,
  },
  kpiIconBox: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
  },
  kpiValue: { 
    fontSize: scale(24), 
    fontWeight: '700', 
    color: COLORS.textPrimary 
  },
  kpiLabel: { 
    fontSize: scale(12), 
    color: COLORS.textSecondary, 
    marginTop: scale(4) 
  },

  // Occupancy Card
  occupancyCard: {
    backgroundColor: COLORS.card,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(20),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  occupancyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  occupancyTitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  occupancyValue: {
    fontSize: scale(20),
    fontWeight: '700',
  },
  occupancyBarBg: {
    height: scale(8),
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: scale(4),
    overflow: 'hidden',
  },
  occupancyBarFill: {
    height: '100%',
    borderRadius: scale(4),
  },

  // Section Title
  sectionTitle: { 
    fontSize: scale(16), 
    fontWeight: '600', 
    color: COLORS.textPrimary, 
    marginBottom: scale(12) 
  },
  
  // Actions
  actionsRow: { 
    flexDirection: 'row', 
    gap: scale(12),
    marginBottom: scale(20),
  },
  actionBtn: { 
    flex: 1, 
    padding: scale(16), 
    borderRadius: scale(16), 
    alignItems: 'center',
    gap: scale(6),
  },
  actionText: { 
    color: COLORS.textPrimary, 
    fontSize: scale(12), 
    fontWeight: '600',
  },

  // Alerts
  alertsSection: {
    marginTop: scale(4),
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: scale(12),
    padding: scale(12),
    marginBottom: scale(8),
    gap: scale(10),
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  alertText: {
    color: COLORS.textPrimary,
    fontSize: scale(14),
  },

  // Cards
  card: { 
    backgroundColor: COLORS.card, 
    borderRadius: scale(16), 
    padding: scale(16), 
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: scale(12),
  },
  cardTitleContent: {
    flex: 1,
    marginLeft: scale(12),
  },
  cardTitle: { 
    fontSize: scale(16), 
    fontWeight: '600', 
    color: COLORS.textPrimary,
  },
  cardSubtitle: { 
    fontSize: scale(13), 
    color: COLORS.textSecondary, 
    marginTop: scale(2),
  },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginTop: scale(12),
  },
  cardBadge: { 
    backgroundColor: COLORS.backgroundTertiary, 
    paddingHorizontal: scale(10), 
    paddingVertical: scale(4), 
    borderRadius: scale(8),
  },
  cardBadgeText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  cardMeta: { 
    fontSize: scale(12), 
    color: COLORS.textMuted 
  },
  cardAmount: { 
    fontSize: scale(18), 
    fontWeight: '700',
  },

  // Property Type Icon
  propertyTypeIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Avatar
  avatarBox: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  tenantLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(12),
    gap: scale(4),
  },

  // Payment Icon
  paymentIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Ticket Icon
  ticketIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: scale(12),
  },

  // Status badges
  statusBadge: { 
    paddingHorizontal: scale(10), 
    paddingVertical: scale(4), 
    borderRadius: scale(8),
  },
  statusText: { 
    fontSize: scale(12), 
    fontWeight: '600' 
  },
  statusChip: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(8),
  },
  statusChipText: {
    fontSize: scale(12),
    fontWeight: '500',
  },
  priorityBadge: { 
    paddingHorizontal: scale(10), 
    paddingVertical: scale(4), 
    borderRadius: scale(8),
  },
  priorityText: { 
    fontSize: scale(12), 
    fontWeight: '600' 
  },

  // Empty state
  empty: { 
    alignItems: 'center', 
    paddingVertical: scale(60) 
  },
  emptyIconBox: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  emptyText: { 
    fontSize: scale(16), 
    fontWeight: '600', 
    color: COLORS.textSecondary 
  },
  emptySubtext: { 
    fontSize: scale(14), 
    color: COLORS.textMuted, 
    marginTop: scale(4) 
  },

  // Buttons
  addButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: COLORS.purple, 
    paddingVertical: scale(14), 
    borderRadius: scale(12), 
    marginBottom: scale(16), 
    gap: scale(8) 
  },
  addButtonText: { 
    color: COLORS.textPrimary, 
    fontWeight: '600', 
    fontSize: scale(14) 
  },
  payButton: { 
    flexDirection: 'row',
    backgroundColor: COLORS.green, 
    paddingVertical: scale(12), 
    borderRadius: scale(10), 
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(12),
    gap: scale(6),
  },
  payButtonText: { 
    color: COLORS.textPrimary, 
    fontWeight: '600',
    fontSize: scale(14),
  },

  // Payment summary
  paymentSummary: { 
    flexDirection: 'row', 
    gap: scale(12), 
    marginBottom: scale(16) 
  },
  summaryCard: { 
    flex: 1, 
    padding: scale(16), 
    borderRadius: scale(16), 
    alignItems: 'center',
    borderWidth: 1,
    gap: scale(4),
  },
  summaryLabel: { 
    fontSize: scale(13), 
    color: COLORS.textSecondary,
    marginTop: scale(4),
  },
  summaryValue: { 
    fontSize: scale(18), 
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: COLORS.backgroundSecondary,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    padding: scale(24),
    paddingTop: scale(12),
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderBottomWidth: 0,
  },
  modalHandle: {
    width: scale(40),
    height: scale(4),
    backgroundColor: COLORS.textMuted,
    borderRadius: scale(2),
    alignSelf: 'center',
    marginBottom: scale(16),
  },
  modalTitle: { 
    fontSize: scale(20), 
    fontWeight: '700', 
    color: COLORS.textPrimary, 
    marginBottom: scale(20), 
    textAlign: 'center' 
  },
  inputLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: scale(6),
  },
  input: { 
    backgroundColor: COLORS.backgroundTertiary, 
    borderRadius: scale(12), 
    padding: scale(16), 
    fontSize: scale(16), 
    marginBottom: scale(16),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  typeSelector: { 
    flexDirection: 'row', 
    gap: scale(8), 
    marginBottom: scale(24) 
  },
  typeBtn: { 
    flex: 1, 
    padding: scale(12), 
    borderRadius: scale(12), 
    backgroundColor: COLORS.backgroundTertiary, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  typeBtnActive: { 
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purple,
  },
  typeText: { 
    fontSize: scale(13), 
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  typeTextActive: { 
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  modalButtons: { 
    flexDirection: 'row', 
    gap: scale(12) 
  },
  cancelBtn: { 
    flex: 1, 
    padding: scale(16), 
    borderRadius: scale(12), 
    backgroundColor: COLORS.backgroundTertiary, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cancelBtnText: { 
    color: COLORS.textSecondary, 
    fontWeight: '600' 
  },
  saveBtn: { 
    flex: 1, 
    padding: scale(16), 
    borderRadius: scale(12), 
    backgroundColor: COLORS.purple, 
    alignItems: 'center' 
  },
  saveBtnText: { 
    color: COLORS.textPrimary, 
    fontWeight: '600' 
  },
});