// src/context/AdminLocationContext.js
// Contexto para manejar la ubicación seleccionada en pantallas de admin
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const API_URL = 'https://api.joinissy.com/api';
const STORAGE_KEY = 'admin_selected_location_id';

const AdminLocationContext = createContext({});

export const useAdminLocation = () => useContext(AdminLocationContext);

export const AdminLocationProvider = ({ children }) => {
  const { profile, user, token } = useAuth();
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  const userRole = profile?.role || user?.role || 'user';
  const userLocationId = profile?.location_id || user?.location_id;
  const isSuperAdmin = userRole === 'superadmin';
  const isAdmin = ['admin', 'superadmin'].includes(userRole);

  // Fetch locations for superadmin
  const fetchLocations = useCallback(async () => {
    if (!token || !isSuperAdmin) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/locations`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        setLocations(data.data);
        
        // Try to restore saved location
        const savedId = await AsyncStorage.getItem(STORAGE_KEY);
        const validSavedLocation = data.data.find(l => l.id === savedId);
        
        if (validSavedLocation) {
          setSelectedLocationId(savedId);
          setSelectedLocation(validSavedLocation);
        } else if (data.data.length > 0) {
          // Default to first location
          setSelectedLocationId(data.data[0].id);
          setSelectedLocation(data.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  }, [token, isSuperAdmin]);

  // Initialize
  useEffect(() => {
    if (isSuperAdmin) {
      fetchLocations();
    } else if (userLocationId) {
      setSelectedLocationId(userLocationId);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin, userLocationId, fetchLocations]);

  // Update selected location object when ID changes
  useEffect(() => {
    if (selectedLocationId && locations.length > 0) {
      const location = locations.find(l => l.id === selectedLocationId);
      setSelectedLocation(location || null);
    }
  }, [selectedLocationId, locations]);

  // Select a location
  const selectLocation = useCallback(async (locationId) => {
    setSelectedLocationId(locationId);
    const location = locations.find(l => l.id === locationId);
    setSelectedLocation(location || null);
    setShowPicker(false);
    
    // Save to storage
    if (locationId) {
      await AsyncStorage.setItem(STORAGE_KEY, locationId);
    }
  }, [locations]);

  // Open picker
  const openPicker = useCallback(() => {
    if (isSuperAdmin && locations.length > 1) {
      setShowPicker(true);
    }
  }, [isSuperAdmin, locations.length]);

  // Close picker
  const closePicker = useCallback(() => {
    setShowPicker(false);
  }, []);

  // Refresh locations
  const refreshLocations = useCallback(async () => {
    setLoading(true);
    await fetchLocations();
  }, [fetchLocations]);

  return (
    <AdminLocationContext.Provider value={{
      // State
      locations,
      selectedLocationId,
      selectedLocation,
      loading,
      showPicker,
      
      // Computed
      isSuperAdmin,
      isAdmin,
      canSwitchLocation: isSuperAdmin && locations.length > 1,
      
      // Actions
      selectLocation,
      openPicker,
      closePicker,
      refreshLocations,
    }}>
      {children}
    </AdminLocationContext.Provider>
  );
};
