// app/admin/payments/_hooks/useProofs.js
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { getAuthHeaders } from '../_helpers';
import { API_URL } from '../_constants';

export function useProofs(locationId, onRefresh) {
  const [pendingProofs, setPendingProofs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPendingProofs = useCallback(async () => {
    if (!locationId) return;
    
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_URL}/api/community-payments/admin/payments/pending?location_id=${locationId}`,
        { headers }
      );
      const data = await response.json();
      
      if (data.success) {
        setPendingProofs(data.proofs || []);
      }
    } catch (error) {
      console.error('Error fetching proofs:', error);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  const verifyProof = useCallback(async (payment) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_URL}/api/community-payments/admin/payments/${payment.id}/verify`,
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
        `${API_URL}/api/community-payments/admin/payments/${payment.id}/reject`,
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

  return {
    pendingProofs,
    loading,
    fetchPendingProofs,
    verifyProof,
    rejectProof,
  };
}

export default useProofs;
