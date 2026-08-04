// app/admin/payments/_hooks/usePayments.js
// ISSY Admin - Payments Hook
//
// Sprint 3 D3: creación inicial — fetch + setParams + refetch + request counter.
// Sprint 3 D10: paginación interna (loadMore / refresh / hasMore / loadingMore /
//   refreshing). Mantiene retrocompat con consumers existentes (data, loading,
//   error, pagination, params, setParams, refetch).
//
// Notas críticas:
//   - El backend (api.js → getAdminCommunityPayments) devuelve `result.data`
//     como array directo de payments (NO result.data.payments) y
//     `result.pagination = { total, limit, offset }`.
//   - Si el caller pasa `initialParams.limit` (ej. PaymentDetailModal →
//     RecentHistory con limit: 4), se respeta ese limit como page size
//     y `hasMore` queda false tras el primer fetch — preserva comportamiento
//     pre-D10 de consumers que no quieren paginación.
//   - Sin `stats` en el hook: ese campo no viene en el endpoint /admin/payments.
//     Los KPIs del header de ChargesTab los provee `useCharges` (otro hook).

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAdminCommunityPayments } from '../../../../src/services/api';

const DEFAULT_PAGE_SIZE = 20;

// Compara dos objetos de params shallow, tratando claves ausentes como
// undefined. Sirve para no recrear la referencia de `params` cuando un caller
// llama setParams con valores idénticos (ej. los 3 efectos de montaje de
// ChargesTab: location + search + status con valores no-op).
const paramsShallowEqual = (a, b) => {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    if (a?.[k] !== b?.[k]) return false;
  }
  return true;
};

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
 * Hook paginado para listar payments con filtros + search + scroll infinito.
 *
 * @param {Object} [initialParams] - params iniciales del endpoint (status,
 *   search, date_field, from_date, to_date, etc.). Si se incluye `limit`,
 *   se respeta como page size custom y `hasMore` queda false tras el primer
 *   fetch.
 *
 * @returns {{
 *   // Datos
 *   data: PaymentRow[],
 *   pagination: Pagination,
 *
 *   // Estados
 *   loading: boolean,         // primera carga (sin data aún)
 *   loadingMore: boolean,     // próximas páginas (data ya tiene items)
 *   refreshing: boolean,      // pull-to-refresh activo
 *   hasMore: boolean,
 *   error: string|null,
 *
 *   // Params
 *   params: Object,
 *   setParams: (next: Object | ((prev: Object) => Object)) => void,
 *
 *   // Acciones
 *   loadMore: () => void,
 *   refresh: () => void,
 *   refetch: () => Promise<void>,  // alias de refresh para retrocompat D3
 * }}
 */
export default function usePayments(initialParams = {}) {
  // Si el caller pasa `limit` explícito (ej. RecentHistory con limit:4),
  // lo usamos como page size y dejamos hasMore=false tras el primer fetch.
  const callerSpecifiedLimit = initialParams.limit != null;
  const pageSize = callerSpecifiedLimit ? initialParams.limit : DEFAULT_PAGE_SIZE;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, limit: null, offset: 0 });
  const [params, setParamsState] = useState(initialParams);

  // Request counter — descarta respuestas obsoletas sin abort signal real.
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  // Offset acumulado en ref para evitar stale closures en callbacks.
  const offsetRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // setParams acepta objeto-merge o updater function (igual que useState).
  // Cuando cambia, el useEffect de abajo dispara fetch inicial automáticamente.
  const setParams = useCallback((next) => {
    setParamsState((prev) => {
      const merged = typeof next === 'function' ? next(prev) : { ...prev, ...next };
      // Si el merge no cambió ningún valor, devolver la MISMA referencia para
      // que el useEffect [params] de abajo NO re-dispare un fetch redundante.
      return paramsShallowEqual(prev, merged) ? prev : merged;
    });
  }, []);

  /**
   * Fetch interno. Recibe el offset explícito para evitar stale closures.
   *
   * @param {number} targetOffset
   * @param {'initial' | 'more' | 'refresh'} mode
   */
  const fetchPage = useCallback(async (targetOffset, mode) => {
    const myRequestId = ++requestIdRef.current;

    if (mode === 'initial') setLoading(true);
    else if (mode === 'more') setLoadingMore(true);
    else if (mode === 'refresh') setRefreshing(true);

    if (mode === 'initial' || mode === 'refresh') setError(null);

    try {
      // Si el caller pasó limit explícito, lo respetamos. Sino, usamos page size.
      const fetchParams = {
        ...params,
        limit: pageSize,
        offset: targetOffset,
      };
      const result = await getAdminCommunityPayments(fetchParams);

      // Descartar si esta no es la request más reciente o el componente se desmontó.
      if (myRequestId !== requestIdRef.current || !mountedRef.current) return;

      if (!result.success) {
        setError(result.error || 'Error fetching payments');
        if (mode === 'initial' || mode === 'refresh') {
          setData([]);
          setPagination({ total: 0, limit: null, offset: 0 });
        }
        setHasMore(false);
        return;
      }

      const newPayments = Array.isArray(result.data) ? result.data : [];
      const newPagination = result.pagination || { total: 0, limit: pageSize, offset: targetOffset };

      // Append vs replace según modo
      let nextData;
      if (mode === 'more') {
        // Append a lo existente
        // Función actualizadora para evitar stale closure de `data`.
        nextData = null; // se calcula dentro del setter
        setData((prev) => {
          // Sprint 3 hotfix: dedup por ID. Re-fetches en cascada (cambio
          // de location_id + search + status simultáneos) hacían que los
          // mismos payments se appendearan 2+ veces, causando
          // "Encountered two children with the same key" en FlatList.
          // Filtramos los nuevos contra los IDs ya presentes en `prev`.
          // NOTE: offsetRef.current usa newPayments.length (no
          // uniqueNew.length) porque representa la posición server-side
          // — si todos eran dups, igual ya pasamos por esa página y el
          // próximo fetch debe arrancar después.
          const seenIds = new Set(prev.map((p) => p.id));
          const uniqueNew = newPayments.filter((p) => !seenIds.has(p.id));
          const merged = [...prev, ...uniqueNew];
          offsetRef.current = targetOffset + newPayments.length;
          return merged;
        });
      } else {
        // initial o refresh: reemplazar
        nextData = newPayments;
        setData(newPayments);
        offsetRef.current = newPayments.length;
      }

      setPagination(newPagination);

      // Detección de hasMore:
      //   - Caller pasó limit explícito → no paginar (un solo fetch)
      //   - Vinieron menos items que pageSize → última página
      //   - total conocido y ya tenemos todo → no hay más
      let nextHasMore;
      if (callerSpecifiedLimit) {
        nextHasMore = false;
      } else if (newPayments.length < pageSize) {
        nextHasMore = false;
      } else if (
        newPagination &&
        typeof newPagination.total === 'number' &&
        newPagination.total > 0
      ) {
        const accumulated =
          mode === 'more'
            ? targetOffset + newPayments.length
            : newPayments.length;
        nextHasMore = accumulated < newPagination.total;
      } else {
        // Sin total confiable, asumimos que hay más si llenamos la página.
        nextHasMore = newPayments.length === pageSize;
      }
      setHasMore(nextHasMore);

      setError(null);
    } catch (err) {
      if (myRequestId !== requestIdRef.current || !mountedRef.current) return;
      setError(err.message || 'Error fetching payments');
      setHasMore(false);
    } finally {
      if (myRequestId === requestIdRef.current && mountedRef.current) {
        if (mode === 'initial') setLoading(false);
        else if (mode === 'more') setLoadingMore(false);
        else if (mode === 'refresh') setRefreshing(false);
      }
    }
  }, [params, pageSize, callerSpecifiedLimit]);

  // Initial load + auto-reload cuando cambian params.
  // Resetea offset/data porque los filtros nuevos invalidan la lista.
  useEffect(() => {
    offsetRef.current = 0;
    setData([]);
    setHasMore(true);
    fetchPage(0, 'initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  /**
   * Dispara el fetch de la siguiente página. No-op si:
   *   - ya hay un loadMore/refresh en curso
   *   - hasMore es false
   *   - aún no terminó la carga inicial
   */
  const loadMore = useCallback(() => {
    if (loading || loadingMore || refreshing || !hasMore) return;
    fetchPage(offsetRef.current, 'more');
  }, [loading, loadingMore, refreshing, hasMore, fetchPage]);

  /**
   * Pull-to-refresh: resetea offset=0, vuelve a pedir desde 0.
   * NO toca `params` — mantiene los filtros aplicados.
   */
  const refresh = useCallback(() => {
    if (refreshing) return;
    offsetRef.current = 0;
    fetchPage(0, 'refresh');
  }, [refreshing, fetchPage]);

  // Alias para retrocompat con consumers D3 que usaban `refetch()`.
  const refetch = refresh;

  return {
    data,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    error,
    pagination,
    params,
    setParams,
    loadMore,
    refresh,
    refetch,
  };
}
