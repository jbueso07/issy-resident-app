// app/admin/payments/constants.js
// ISSY Admin - Payment Module Constants

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const scale = (size) => (SCREEN_WIDTH / 375) * size;

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.joinissy.com';

// ProHome Dark Theme Colors
export const COLORS = {
  background: '#0F1A1A',
  backgroundSecondary: '#1A2C2C',
  backgroundTertiary: '#243636',
  surface: '#1A2C2C',
  lime: '#D4FE48',
  teal: '#5DCED8',
  purple: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  error: '#EF4444',
  blue: '#3B82F6',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9A9A',
  textMuted: '#5A6666',
  border: 'rgba(255,255,255,0.1)',
};

// Payment Status Config
export const getPaymentStatus = (t) => ({
  pending: { 
    label: t('admin.payments.status.pending', 'Pendiente'), 
    color: COLORS.warning, 
    icon: 'time' 
  },
  proof_submitted: { 
    label: t('admin.payments.status.proofSubmitted', 'Comprobante enviado'), 
    color: COLORS.blue, 
    icon: 'document-text' 
  },
  paid: { 
    label: t('admin.payments.status.paid', 'Pagado'), 
    color: COLORS.success, 
    icon: 'checkmark-circle' 
  },
  overdue: { 
    label: t('admin.payments.status.overdue', 'Vencido'), 
    color: COLORS.danger, 
    icon: 'alert-circle' 
  },
  rejected: { 
    label: t('admin.payments.status.rejected', 'Rechazado'), 
    color: COLORS.danger, 
    icon: 'close-circle' 
  },
  cancelled: { 
    label: t('admin.payments.status.cancelled', 'Cancelado'), 
    color: COLORS.textMuted, 
    icon: 'close-circle' 
  },
});

// Payment Types Config - Expanded with colors
export const getPaymentTypes = (t) => [
  { 
    value: 'maintenance', 
    label: t('admin.payments.types.maintenance', 'Mantenimiento'), 
    icon: 'home', 
    color: '#5DCED8',
    description: t('admin.payments.types.maintenanceDesc', 'Cuota mensual de mantenimiento')
  },
  { 
    value: 'water', 
    label: t('admin.payments.types.water', 'Agua'), 
    icon: 'water', 
    color: '#3B82F6',
    description: t('admin.payments.types.waterDesc', 'Servicio de agua potable')
  },
  { 
    value: 'gas', 
    label: t('admin.payments.types.gas', 'Gas'), 
    icon: 'flame', 
    color: '#F97316',
    description: t('admin.payments.types.gasDesc', 'Servicio de gas')
  },
  { 
    value: 'electricity', 
    label: t('admin.payments.types.electricity', 'Energía'), 
    icon: 'flash', 
    color: '#EAB308',
    description: t('admin.payments.types.electricityDesc', 'Servicio de electricidad')
  },
  { 
    value: 'extraordinary', 
    label: t('admin.payments.types.extraordinary', 'Extraordinario'), 
    icon: 'star', 
    color: '#8B5CF6',
    description: t('admin.payments.types.extraordinaryDesc', 'Cobros especiales o únicos')
  },
  { 
    value: 'fine', 
    label: t('admin.payments.types.fine', 'Multa'), 
    icon: 'warning', 
    color: '#EF4444',
    description: t('admin.payments.types.fineDesc', 'Multas y moras')
  },
  { 
    value: 'parking', 
    label: t('admin.payments.types.parking', 'Estacionamiento'), 
    icon: 'car', 
    color: '#6366F1',
    description: t('admin.payments.types.parkingDesc', 'Cuota de estacionamiento')
  },
  { 
    value: 'security', 
    label: t('admin.payments.types.security', 'Seguridad'), 
    icon: 'shield-checkmark', 
    color: '#10B981',
    description: t('admin.payments.types.securityDesc', 'Servicio de vigilancia')
  },
  { 
    value: 'cleaning', 
    label: t('admin.payments.types.cleaning', 'Limpieza'), 
    icon: 'sparkles', 
    color: '#EC4899',
    description: t('admin.payments.types.cleaningDesc', 'Servicio de limpieza')
  },
  { 
    value: 'reserve_fund', 
    label: t('admin.payments.types.reserveFund', 'Fondo de Reserva'), 
    icon: 'wallet', 
    color: '#14B8A6',
    description: t('admin.payments.types.reserveFundDesc', 'Aportación al fondo de reserva')
  },
  { 
    value: 'service', 
    label: t('admin.payments.types.service', 'Servicio'), 
    icon: 'construct', 
    color: '#64748B',
    description: t('admin.payments.types.serviceDesc', 'Servicios varios')
  },
  { 
    value: 'other', 
    label: t('admin.payments.types.other', 'Otro'), 
    icon: 'document-text', 
    color: '#94A3B8',
    description: t('admin.payments.types.otherDesc', 'Otros conceptos')
  },
];

// Get payment type by value
export const getPaymentTypeByValue = (value, t) => {
  const types = getPaymentTypes(t);
  return types.find(type => type.value === value) || types[types.length - 1];
};

// Target Options for charge creation
export const getTargetOptions = (t) => [
  { value: 'single', label: t('admin.payments.target.single', 'Un residente'), icon: 'person' },
  { value: 'multiple', label: t('admin.payments.target.multiple', 'Varios residentes'), icon: 'people' },
  { value: 'all', label: t('admin.payments.target.all', 'Todos los residentes'), icon: 'globe' },
];

// Payment Methods Options
export const getPaymentMethodOptions = (t) => [
  { value: 'both', label: t('admin.payments.methods.both', 'Tarjeta y Comprobante'), icon: 'card' },
  { value: 'card', label: t('admin.payments.methods.cardOnly', 'Solo Tarjeta'), icon: 'card-outline' },
  { value: 'proof', label: t('admin.payments.methods.proofOnly', 'Solo Comprobante'), icon: 'document-attach' },
];

// Filter options for charges list
export const getFilterOptions = (t) => [
  { key: 'all', label: t('admin.payments.filters.all', 'Todos'), icon: 'list' },
  { key: 'pending', label: t('admin.payments.filters.pending', 'Pendientes'), icon: 'time' },
  { key: 'paid', label: t('admin.payments.filters.paid', 'Pagados'), icon: 'checkmark-circle' },
  { key: 'overdue', label: t('admin.payments.filters.overdue', 'Vencidos'), icon: 'alert-circle' },
];

// Default form data for creating charges
export const getDefaultFormData = () => ({
  target: 'single',
  user_id: '',
  user_name: '',
  payment_type: 'maintenance',
  title: '',
  description: '',
  amount: '',
  due_date: getDefaultDueDate(),
  allowed_payment_methods: ['card', 'proof'],
  is_recurring: false,
  recurring_period: 'monthly',
});

// Default bank account form
export const getDefaultBankAccountForm = () => ({
  bank_name: '',
  account_number: '',
  account_name: '',
  account_type: 'savings',
  instructions: '',
  is_default: false,
});

// Helper to get default due date (last day of current month)
export function getDefaultDueDate() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.toISOString().split('T')[0];
}

// Recurring Period Options
export const getRecurringPeriodOptions = (t) => [
  { value: 'monthly', label: t('admin.payments.recurring.monthly', 'Mensual'), days: 30 },
  { value: 'bimonthly', label: t('admin.payments.recurring.bimonthly', 'Bimestral'), days: 60 },
  { value: 'quarterly', label: t('admin.payments.recurring.quarterly', 'Trimestral'), days: 90 },
  { value: 'semiannual', label: t('admin.payments.recurring.semiannual', 'Semestral'), days: 180 },
  { value: 'annual', label: t('admin.payments.recurring.annual', 'Anual'), days: 365 },
];
