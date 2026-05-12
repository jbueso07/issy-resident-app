// app/admin/payments/_hooks/useChargePayments.js
// ISSY Admin - Charge Payments Hook
//
// Sprint 2 D5 (frontend): consume el endpoint nuevo del Sprint 2 D4 (backend):
//   GET /api/community-payments/admin/charges/:chargeId/payments
//
// Alimenta la vista "Detalle del Cobro" — devuelve el cobro padre + lista
// paginada de community_payments con datos por residente (nombre, email,
// phone, unit_number). Soporta infinite scroll vía loadMore.
//
// Todavía no se usa por ningún componente (Sprint D6 refactorea el modal
// ChargeDetailModal para consumirlo).

import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../_constants';
import { getAuthHeaders } from '../_helpers';

/**
 * Resumen del cobro padre que devuelve el endpoint /admin/charges/:id/payments.
 * @typedef {Object} ChargePaymentsCharge
 * @property {string} id
 * @property {string} title
 * @property {string|null} description
 * @property {number} amount
 * @property {string} currency
 * @property {string} due_date
 * @property {'active'|'cancelled'} status
 * @property {'all'|'specific'} applies_to
 * @property {string|null} charge_type
 * @property {number} total_users
 * @property {string} created_at
 */

/**
 * Pago individual de un residente, como lo devuelve el endpoint.
 * @typedef {Object} ChargePayment
 * @property {string} id
 * @property {string} user_id
 * @property {string|null} user_name
 * @property {string|null} user_email
 * @property {string|null} user_phone
 * @property {string|null} unit_number
 * @property {number} amount
 * @property {number|null} verified_amount
 * @property {'pending'|'proof_submitted'|'paid'|'rejected'|'cancelled'} status
 * @property {string|null} payment_method
 * @property {string|null} proof_of_payment
 * @property {string|null} proof_reference
 * @property {string|null} proof_submitted_at
 * @property {string|null} paid_at
 * @property {string|null} verified_at
 * @property {string|null} rejection_reason
 * @property {string|null} cancelled_at
 * @property {string|null} cancellation_reason
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} ChargePaymentsPagination
 * @property {number} total
 * @property {number} limit
 * @property {number} offset
 */

const DEFAULT_LIMIT = 100;

/**
 * Hook para listar los pagos de un cobro específico, con paginación
 * (infinite scroll) y filtro por status opcional.
 *
 * @param {string|null} chargeId - id del cobro padre. Si es null/undefined,
 *   el hook queda en estado idle (sin fetch).
 * @param {{ status?: string|null, limit?: number, autoLoad?: boolean }} [options]
 *   - status: filtro inicial por status del pago (opcional)
 *   - limit: tamaño de página (default 100)
 *   - autoLoad: si true, hace fetch al montar (default true)
 *
 * @returns {{
 *   charge: ChargePaymentsCharge|null,
 *   payments: ChargePayment[],
 *   pagination: ChargePaymentsPagination,
 *   loading: boolean,
 *   error: string|null,
 *   refresh: () => void,
 *   loadMore: () => void,
 *   setStatusFilter: (status: string|null) => void
 * }}
 */
export function useChargePayments(chargeId, options = {}) {
  const {
    status: initialStatus = null,
    limit = DEFAULT_LIMIT,
    autoLoad = true,
  } = options;

  const [charge, setCharge] = useState(null);
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, limit, offset: 0 });
  const [statusFilter, setStatusFilterState] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Internal: fetch a page.
   *   append=true  → append a la lista existente (loadMore / infinite scroll)
   *   append=false → reemplaza la lista (refresh / cambio de filtro)
   */
  const fetchPage = useCallback(
    async ({ offset, append }) => {
      if (!chargeId) return;
      setLoading(true);
      setError(null);
      try {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams();
        params.append('limit', String(limit));
        params.append('offset', String(offset));
        if (statusFilter) params.append('status', statusFilter);

        const url =
          API_URL +
          '/api/community-payments/admin/charges/' +
          chargeId +
          '/payments?' +
          params.toString();

        const response = await fetch(url, { headers });
        const json = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(
            json.error || 'Error fetching payments (' + response.status + ')'
          );
        }

        const data = json.data || {};
        setCharge(data.charge || null);
        const newPayments = data.payments || [];
        setPayments(prev => (append ? [...prev, ...newPayments] : newPayments));
        setPagination(
          data.pagination || { total: 0, limit, offset }
        );
      } catch (err) {
        console.error('Error fetching charge payments:', err);
        setError(err.message || 'Error fetching payments');
      } finally {
        setLoading(false);
      }
    },
    [chargeId, limit, statusFilter]
  );

  /**
   * Refresh desde offset=0, reemplaza el array de payments.
   */
  const refresh = useCallback(() => {
    fetchPage({ offset: 0, append: false });
  }, [fetchPage]);

  /**
   * Carga la siguiente página y la concatena al array.
   * No-op si ya tenemos todos los items (payments.length >= pagination.total)
   * o si ya hay un fetch en curso.
   */
  const loadMore = useCallback(() => {
    if (loading) return;
    const nextOffset = payments.length;
    if (pagination.total > 0 && nextOffset >= pagination.total) return;
    fetchPage({ offset: nextOffset, append: true });
  }, [fetchPage, loading, payments.length, pagination.total]);

  /**
   * Cambia el filtro de status. El re-fetch lo dispara el useEffect que
   * depende de statusFilter — no llamamos fetchPage directo acá para
   * evitar doble fetch en el mismo render.
   */
  const setStatusFilter = useCallback(newStatus => {
    setStatusFilterState(newStatus);
  }, []);

  // Auto-load inicial + re-fetch cuando cambia chargeId o statusFilter.
  // Si chargeId es null, no se carga nada (estado idle).
  useEffect(() => {
    if (!autoLoad || !chargeId) return;
    fetchPage({ offset: 0, append: false });
    // fetchPage ya está memoizado por [chargeId, limit, statusFilter];
    // listamos las deps que disparan re-fetch explícitamente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargeId, statusFilter, autoLoad]);

  return {
    charge,
    payments,
    pagination,
    loading,
    error,
    refresh,
    loadMore,
    setStatusFilter,
  };
}
