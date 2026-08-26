import { useState, useCallback, useRef, useEffect } from 'react';

export function useGeolocation() {
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [address, setAddress] = useState('');

  const successTimeoutRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const reportGeoError = useCallback((message, error = null) => {
    if (!isMounted.current) return;
    if (error) {
      console.error(message, error);
    } else {
      console.error(message);
    }
    setGeoError(message);
  }, []);

  const handleGetLocation = useCallback(() => {
    return new Promise((resolve) => {
      if (!isMounted.current) {
        resolve(null);
        return;
      }
      
      setGeoError(null);
      setLocationSuccess(false);

      if (!navigator.geolocation) {
        reportGeoError("Geolocation is not supported by your browser.");
        resolve(null);
        return;
      }

      setIsLocating(true);

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (!isMounted.current) {
            resolve(null);
            return;
          }
          
          const { latitude, longitude } = position.coords;
          setCoordinates({ latitude, longitude });

          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (!isMounted.current) {
              resolve(null);
              return;
            }

            if (data && data.display_name) {
              const shortAddress = data.display_name
                .split(",")
                .slice(0, 3)
                .join(",");
              setAddress(shortAddress);
              setLocationSuccess(true);
              
              if (successTimeoutRef.current) {
                clearTimeout(successTimeoutRef.current);
              }
              successTimeoutRef.current = setTimeout(() => {
                if (isMounted.current) {
                  setLocationSuccess(false);
                }
              }, 3000);
              
              resolve({ coordinates: { latitude, longitude }, address: shortAddress });
            } else {
              setAddress("Location unavailable");
              reportGeoError("Location details unavailable for coordinates.");
              resolve({ coordinates: { latitude, longitude }, address: "Location unavailable" });
            }
          } catch (error) {
            if (isMounted.current) {
              setAddress("Location unavailable");
              reportGeoError(
                "Failed to fetch address details. Displaying placeholder.",
                error
              );
            }
            resolve({ coordinates: { latitude, longitude }, address: "Location unavailable" });
          } finally {
            if (isMounted.current) {
              setIsLocating(false);
            }
          }
        },
        (error) => {
          if (isMounted.current) {
            let errorMsg = "Unable to retrieve location. Check browser permissions.";
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMsg = "Location permission denied.";
                break;
              case error.POSITION_UNAVAILABLE:
                errorMsg = "Location information is unavailable.";
                break;
              case error.TIMEOUT:
                errorMsg = "The request to get user location timed out.";
                break;
            }
            reportGeoError(errorMsg, error);
            setIsLocating(false);
          }
          resolve(null);
        },
        options
      );
    });
  }, [reportGeoError]);

  return {
    isLocating,
    geoError,
    setGeoError,
    locationSuccess,
    coordinates,
    address,
    handleGetLocation,
  };
}
