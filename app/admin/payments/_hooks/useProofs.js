// app/admin/payments/_hooks/useProofs.js
/**
 * useProofs hook — Sprint 3 D13 cleanup.
 *
 * RESPONSABILIDAD: solo mutations de proofs (verify / reject / revert).
 * El listado de proofs vive ahora en ProofsTab.js vía usePayments (post-D11).
 *
 * Histórico:
 *   - Pre-D11: el hook fetcheaba pendingProofs desde
 *     /api/community-payments/admin/payments/pending (URL incorrecta — el
 *     endpoint real era /admin/pending-proofs). El fetch fallaba con 404
 *     silencioso desde algún refactor anterior — la tab de proofs estaba
 *     vacía en producción hasta el rediseño D11.
 *   - D11: el listado se movió a ProofsTab.js via usePayments({ status:
 *     'proof_submitted' }). Las 3 mutations quedaron acá porque las consume
 *     index.js y ChargeDetailModal (legacy).
 *   - D13: cleanup — borrado fetchPendingProofs + state asociado.
 *
 * Tech debt remanente para Sprint 4:
 *   - Endpoint backend /admin/pending-proofs eliminado en D13 también.
 *   - Las mutations podrían consolidarse en un solo hook usePaymentMutations
 *     que también incluya register-cash, send-reminder, create-link, etc.
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { getAuthHeaders } from '../_helpers';
import { API_URL } from '../_constants';

export function useProofs(locationId, onRefresh) {
  const verifyProof = useCallback(async (payment) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        API_URL + '/api/community-payments/admin/payments/' + payment.id + '/verify',
        {
          method: 'POST',
          headers,
        }
      );
      const data = await response.json();

      if (data.success) {
        Alert.alert('Éxito', 'Comprobante aprobado');
        if (onRefresh) onRefresh();
        return true;
      } else {
        Alert.alert('Error', data.error || 'Error al verificar');
        return false;
      }
    } catch (error) {
      console.error('Error verifying proof:', error);
      Alert.alert('Error', 'Error de conexión');
      return false;
    }
  }, [onRefresh]);

  const rejectProof = useCallback(async (payment, reason) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        API_URL + '/api/community-payments/admin/payments/' + payment.id + '/reject',
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: reason || '' }),
        }
      );
      const data = await response.json();

      if (data.success) {
        Alert.alert('Éxito', 'Comprobante rechazado');
        if (onRefresh) onRefresh();
        return true;
      } else {
        Alert.alert('Error', data.error || 'Error al rechazar');
        return false;
      }
    } catch (error) {
      console.error('Error rejecting proof:', error);
      Alert.alert('Error', 'Error de conexión');
      return false;
    }
  }, [onRefresh]);

  const revertPayment = useCallback(async (payment, reason) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        API_URL + '/api/community-payments/admin/payments/' + payment.id + '/revert',
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: reason || '' }),
        }
      );
      const data = await response.json();

      if (data.success) {
        Alert.alert('Éxito', 'Pago revertido a pendiente');
        if (onRefresh) onRefresh();
        return true;
      } else {
        Alert.alert('Error', data.error || 'Error al revertir');
        return false;
      }
    } catch (error) {
      console.error('Error reverting payment:', error);
      Alert.alert('Error', 'Error de conexión');
      return false;
    }
  }, [onRefresh]);

  return {
    verifyProof,
    rejectProof,
    revertPayment,
  };
}

export default useProofs;
