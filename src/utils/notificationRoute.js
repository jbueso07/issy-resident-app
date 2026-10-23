// src/utils/notificationRoute.js
// ISSY - Grupo y destino de cada notificación según su `type` (valores reales del backend).
// Por ahora solo lo usa Actividades recientes del Home v2; app/notifications.js y
// useNotifications.js se migran a este mapa en un commit aparte.

const GROUP_TYPES = {
  visit: [
    'visitor_arrived',
    'visitor_exit',
    'visitor_entry',
    'qr_shared',
    'access_request',
    'access_request_response',
    'event_guest_checkin',
  ],
  report: ['incident', 'incident_comment', 'incident_status', 'incident_update'],
  announcement: ['announcement', 'service_announcement'],
  reservation: [
    'reservation_pending',
    'reservation_approved',
    'reservation_rejected',
    'reservation',
    'reservation_status',
  ],
  payment: [
    'payment_due',
    'payment_overdue',
    'payment_reminder',
    'payment_confirmed',
    'payment_verified',
    'payment_rejected',
    'proof_submitted',
    'new_charge',
    'community_payment_success',
    'auto_payment',
    'refund',
    'payment',
    'marketplace_sale',
    'marketplace_refund',
  ],
  emergency: [
    'panic_alert',
    'panic_ack',
    'panic_cancelled',
    'panic_attended',
    'panic_escalated',
    'panic_auto_closed',
    'emergency',
  ],
  account: [
    'welcome',
    'member_approved',
    'member_rejected',
    'registration_pending',
    'account_suspended',
    'account_reactivated',
  ],
};

const TYPE_TO_GROUP = Object.entries(GROUP_TYPES).reduce((acc, [group, types]) => {
  types.forEach((type) => {
    acc[type] = group;
  });
  return acc;
}, {});

// Pagos del marketplace: se agrupan como pago pero no abren la pantalla de cuotas
const NO_ROUTE_TYPES = ['marketplace_sale', 'marketplace_refund'];

const VISITS_ROUTE = { pathname: '/(tabs)/visits', params: { tab: 'visitors' } };
// QR que otro residente me compartió
const SHARED_QR_ROUTE = { pathname: '/(tabs)/visits', params: { tab: 'invitations' } };

// Algunos registros guardan `data` como texto JSON en vez de objeto
export const parseNotificationData = (data) => {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof data === 'object' ? data : {};
};

// visit | report | announcement | reservation | payment | emergency | account (tipos desconocidos)
export const getNotificationGroup = (type) => TYPE_TO_GROUP[type] || 'account';

export const getNotificationRoute = (notification, { isAdmin = false } = {}) => {
  if (!notification?.type) return null;
  const { type } = notification;
  const data = parseNotificationData(notification.data);

  if (NO_ROUTE_TYPES.includes(type)) return null;

  // Mismos parámetros que useNotifications.js al tocar el push
  if (type === 'access_request') {
    if (!data.access_request_id) return VISITS_ROUTE;
    return {
      pathname: '/access-approval',
      params: {
        id: data.access_request_id,
        visitor_name: data.visitor_name || '',
        guard_name: data.guard_name || '',
        expires_at: data.expires_at || '',
      },
    };
  }

  if (type === 'qr_shared') return SHARED_QR_ROUTE;

  if (type === 'registration_pending') {
    return isAdmin ? { pathname: '/admin/community-management', params: {} } : null;
  }

  switch (TYPE_TO_GROUP[type]) {
    case 'visit':
      return VISITS_ROUTE;
    case 'report': {
      const incidentId = data.incident_id;
      if (isAdmin) {
        return { pathname: '/admin/incidents', params: incidentId ? { openId: String(incidentId) } : {} };
      }
      return incidentId
        ? { pathname: '/incident-detail', params: { id: String(incidentId) } }
        : { pathname: '/incidents', params: {} };
    }
    case 'announcement':
      // No existe /announcements/[id]; el id va como parámetro para cuando la pantalla lo lea
      return {
        pathname: '/announcements',
        params: data.announcement_id ? { id: String(data.announcement_id) } : {},
      };
    case 'reservation':
      return { pathname: '/reservations', params: {} };
    case 'payment':
      return { pathname: '/(tabs)/payments', params: {} };
    default:
      // Emergencia: useNotifications.js no tiene ruta para pánico. Cuenta y desconocidos: sin destino.
      return null;
  }
};

export default getNotificationRoute;
