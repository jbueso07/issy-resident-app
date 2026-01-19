// src/context/UserLocationContext.js
// Contexto para manejar ubicaciones del usuario (múltiples comunidades)
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const API_URL = 'https://api.joinissy.com/api';
const STORAGE_KEY = 'user_selected_location_id';

const UserLocationContext = createContext({});

export const useUserLocation = () => useContext(UserLocationContext);

export const UserLocationProvider = ({ children }) => {
  const { profile, token } = useAuth();
  const [userLocations, setUserLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  // Fetch user's locations from user_locations table
  const fetchUserLocations = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users/my-locations`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        setUserLocations(data.data);
        
        // Try to restore saved location
        const savedId = await AsyncStorage.getItem(STORAGE_KEY);
        const validSavedLocation = data.data.find(l => l.location_id === savedId || l.id === savedId);
        
        if (validSavedLocation) {
          const locId = validSavedLocation.location_id || validSavedLocation.id;
          setSelectedLocationId(locId);
          setSelectedLocation(validSavedLocation);
        } else if (data.data.length > 0) {
          // Default to primary location or first one
          const primaryLoc = data.data.find(l => l.is_primary) || data.data[0];
          const locId = primaryLoc.location_id || primaryLoc.id;
          setSelectedLocationId(locId);
          setSelectedLocation(primaryLoc);
        }
      } else {
        // Fallback to profile's location_id
        if (profile?.location_id) {
          setSelectedLocationId(profile.location_id);
          setUserLocations([{ 
            location_id: profile.location_id, 
            location: { id: profile.location_id, name: profile.location_name || 'Mi Comunidad' }
          }]);
        }
      }
    } catch (error) {
      console.error('Error fetching user locations:', error);
      // Fallback to profile's location_id
      if (profile?.location_id) {
        setSelectedLocationId(profile.location_id);
      }
    } finally {
      setLoading(false);
    }
  }, [token, profile]);

  // Initialize
  useEffect(() => {
    fetchUserLocations();
  }, [fetchUserLocations]);

  // Update selected location object when ID changes
  useEffect(() => {
    if (selectedLocationId && userLocations.length > 0) {
      const location = userLocations.find(l => 
        l.location_id === selectedLocationId || l.id === selectedLocationId
      );
      setSelectedLocation(location || null);
    }
  }, [selectedLocationId, userLocations]);

  // Select a location
  const selectLocation = useCallback(async (locationId) => {
    setSelectedLocationId(locationId);
    const location = userLocations.find(l => 
      l.location_id === locationId || l.id === locationId
    );
    setSelectedLocation(location || null);
    setShowPicker(false);
    
    // Save to storage
    if (locationId) {
      await AsyncStorage.setItem(STORAGE_KEY, locationId);
    }
  }, [userLocations]);

  // Open picker
  const openPicker = useCallback(() => {
    if (userLocations.length > 1) {
      setShowPicker(true);
    }
  }, [userLocations.length]);

  // Close picker
  const closePicker = useCallback(() => {
    setShowPicker(false);
  }, []);

  // Refresh locations
  const refreshLocations = useCallback(async () => {
    setLoading(true);
    await fetchUserLocations();
  }, [fetchUserLocations]);

  // Get location name helper
  const getLocationName = useCallback(() => {
    if (selectedLocation?.location?.name) return selectedLocation.location.name;
    if (selectedLocation?.name) return selectedLocation.name;
    return 'Mi Comunidad';
  }, [selectedLocation]);

  return (
    <UserLocationContext.Provider value={{
      // State
      userLocations,
      selectedLocationId,
      selectedLocation,
      loading,
      showPicker,
      
      // Computed
      hasMultipleLocations: userLocations.length > 1,
      locationName: getLocationName(),
      
      // Actions
      selectLocation,
      openPicker,
      closePicker,
      refreshLocations,
    }}>
      {children}
    </UserLocationContext.Provider>
  );
};
