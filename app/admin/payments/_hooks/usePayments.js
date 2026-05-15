// app/admin/payments/_hooks/usePayments.js
// ISSY Admin - Payments Hook (Sprint 3 D3)
//
// Consume GET /api/community-payments/admin/payments (endpoint plano post-D2).
// Vista por pago individual (un row = un community_payment), no por cobro
// padre — para vista padre usar useCharges del Sprint 2.
//
// Cancela respuestas obsoletas via request counter (no abort signal real
// porque authFetch tiene su propio AbortController interno de timeout).

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAdminCommunityPayments } from '../../../../src/services/api';

/**
 * @typedef {Object} PaymentRow
 * @property {string} id
 * @property {string} status
 * @property {number} amount
 * @property {number|null} verified_amount
 * @property {string} currency
 * @property {string|null} payment_method
 * @property {string|null} paid_at
 * @property {string|null} verified_at
 * @property {string} created_at
 * @property {string|null} proof_url
 * @property {string|null} cancelled_at
 * @property {string} charge_id
 * @property {string} user_id
 * @property {{ id, title, charge_type, due_date, amount }|null} charge
 * @property {{ id, name, email, profile_photo_url }|null} user
 * @property {{ unit_number, role }} unit
 * @property {{ id, name }|null} verifier
 */

/**
 * @typedef {Object} Pagination
 * @property {number} total
 * @property {number|null} limit
 * @property {number} offset
 */

/**
 * Hook para listar payments con filtros + search + paginación.
 *
 * @param {Object} [initialParams] - params iniciales del endpoint (ver
 *   src/services/api.js → getAdminCommunityPayments)
 * @returns {{
 *   data: PaymentRow[],
 *   loading: boolean,
 *   error: string|null,
 *   pagination: Pagination,
 *   params: Object,
 *   setParams: (next: Object | ((prev: Object) => Object)) => void,
 *   refetch: () => Promise<void>,
 * }}
 */
export default function usePayments(initialParams = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, limit: null, offset: 0 });
  const [params, setParamsState] = useState(initialParams);

  // Request counter: nos permite descartar respuestas obsoletas sin abort real.
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // setParams acepta objeto o updater function (igual que useState)
  const setParams = useCallback((next) => {
    setParamsState((prev) => (typeof next === 'function' ? next(prev) : { ...prev, ...next }));
  }, []);

  const refetch = useCallback(async () => {
    const myRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminCommunityPayments(params);
      // Solo aplicar si esta es la request más reciente y el componente sigue montado
      if (myRequestId !== requestIdRef.current || !mountedRef.current) return;
      if (result.success) {
        setData(result.data || []);
        setPagination(result.pagination || { total: 0, limit: null, offset: 0 });
      } else {
        setError(result.error || 'Error fetching payments');
        setData([]);
        setPagination({ total: 0, limit: null, offset: 0 });
      }
    } catch (err) {
      if (myRequestId !== requestIdRef.current || !mountedRef.current) return;
      setError(err.message || 'Error fetching payments');
    } finally {
      if (myRequestId === requestIdRef.current && mountedRef.current) {
        setLoading(false);
      }
    }
  }, [params]);

  // Auto-fetch cuando cambian los params
  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, pagination, params, setParams, refetch };
}
