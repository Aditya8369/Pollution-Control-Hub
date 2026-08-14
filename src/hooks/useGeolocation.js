import { useState } from 'react';

export function useGeolocation(setOrigin) {
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [locationSuccess, setLocationSuccess] = useState(false);

  const handleGetLocation = () => {
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
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
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          );
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();

          if (data && data.display_name) {
            const shortAddress = data.display_name
              .split(",")
              .slice(0, 3)
              .join(",");
            setOrigin(shortAddress);
            setLocationSuccess(true);
            setTimeout(() => setLocationSuccess(false), 3000);
          } else {
            setOrigin("Location unavailable");
            setGeoError("Location details unavailable for coordinates.");
          }
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
          setOrigin("Location unavailable");
          setGeoError("Failed to fetch address details. Displaying placeholder.");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        setGeoError("Unable to retrieve location. Check browser permissions.");
        setIsLocating(false);
      },
      options,
    );
  };

  return {
    isLocating,
    geoError,
    setGeoError,
    locationSuccess,
    handleGetLocation,
  };
}
