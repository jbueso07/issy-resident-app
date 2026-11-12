// src/context/UserLocationContext.js
// Contexto para manejar ubicaciones del usuario (múltiples comunidades)
import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const API_URL = 'https://api.joinissy.com/api';
const STORAGE_KEY = 'user_selected_location_id';

const UserLocationContext = createContext({});

// Residencial en mora: membresía desactivada por Falta de pago (my-locations?include_restricted=1
// la manda al final con restricted: 'unpaid'). Ahí solo sirven el QR de residente, Pagos y Recibos.
// Se elige SOLO en el app: nunca se llama /auth/switch-location hacia ella (el backend lo rechaza).
const getLocId = (l) => l?.location_id || l?.id;
export const isRestrictedRow = (l) => !!l && l.restricted === 'unpaid';

export const useUserLocation = () => useContext(UserLocationContext);

export const UserLocationProvider = ({ children }) => {
  const { profile, token } = useAuth();
  const [userLocations, setUserLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  // Ids en mora y todos los ids de la lista, también en refs para leerlos al momento
  // (toque de notificación, justo después de refreshLocations)
  const [restrictedIds, setRestrictedIds] = useState([]);
  const restrictedIdsRef = useRef([]);
  const knownIdsRef = useRef([]);

  // Fetch user's locations from user_locations table
  const fetchUserLocations = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // include_restricted=1: un backend viejo lo ignora y responde como siempre (sin filas en mora)
      const response = await fetch(`${API_URL}/users/my-locations?include_restricted=1`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        // Excluir comunidades desactivadas (locations.is_active === false).
        // Comparación explícita contra false: si el backend no incluye el campo
        // en /users/my-locations, no se filtra nada (el filtro definitivo va en backend).
        const activeLocations = data.data.filter(l => (l.location || l).is_active !== false);
        const restricted = activeLocations.filter(isRestrictedRow).map(getLocId).filter(Boolean);
        restrictedIdsRef.current = restricted;
        knownIdsRef.current = activeLocations.map(getLocId).filter(Boolean);
        setRestrictedIds((prev) => (prev.join('|') === restricted.join('|') ? prev : restricted));
        setUserLocations(activeLocations);

        // Try to restore saved location
        const savedId = await AsyncStorage.getItem(STORAGE_KEY);
        const validSavedLocation = activeLocations.find(l => l.location_id === savedId || l.id === savedId);
        // /users/my-locations solo trae membresías CON casa. Si la guardada es la residencial
        // actual del usuario (profile.location_id, recién cambiada desde el home) se respeta
        // aunque no esté en esa lista; antes se caía a la primera (la residencial anterior).
        const savedIsCurrent = !!savedId && savedId === profile?.location_id;

        if (savedIsCurrent && !validSavedLocation) {
          setSelectedLocationId(savedId);
          setSelectedLocation(null);
        } else if (validSavedLocation) {
          const locId = validSavedLocation.location_id || validSavedLocation.id;
          setSelectedLocationId(locId);
          setSelectedLocation(validSavedLocation);
        } else {
          if (savedId) {
            // ID huérfano (comunidad desactivada o membresía eliminada):
            // limpiarlo para que no quede pegado en futuros arranques.
            await AsyncStorage.removeItem(STORAGE_KEY);
          }
          if (activeLocations.length > 0) {
            // Default to primary location or first one (una en mora solo si no hay otra)
            const normal = activeLocations.filter(l => !isRestrictedRow(l));
            const primaryLoc = normal.find(l => l.is_primary) || normal[0] || activeLocations[0];
            const locId = primaryLoc.location_id || primaryLoc.id;
            setSelectedLocationId(locId);
            setSelectedLocation(primaryLoc);
          }
        }
        return activeLocations;
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
    return fetchUserLocations();
  }, [fetchUserLocations]);

  // Lectura al momento (refs): sirven justo después de await refreshLocations()
  const isRestrictedLocation = useCallback(
    (locationId) => !!locationId && restrictedIdsRef.current.includes(String(locationId)),
    []
  );
  const isKnownLocation = useCallback(
    (locationId) => !!locationId && knownIdsRef.current.includes(String(locationId)),
    []
  );
  const selectedRestricted = useMemo(
    () => !!selectedLocationId && restrictedIds.includes(selectedLocationId),
    [selectedLocationId, restrictedIds]
  );

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
      // Mora (Falta de pago): ids en mora y si la seleccionada lo está
      restrictedLocationIds: restrictedIds,
      selectedRestricted,
      isRestrictedLocation,
      isKnownLocation,
      
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
