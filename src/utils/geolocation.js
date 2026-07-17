const GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 0
};

export function isGeolocationSupported() {
  return typeof navigator !== 'undefined' && !!navigator.geolocation;
}

export function isSecureContext() {
  return typeof window !== 'undefined' && window.isSecureContext;
}

export function requestUserLocation() {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    if (!isSecureContext()) {
      reject(new Error('Location access requires HTTPS or localhost. Open the app via http://localhost:5173'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: Number(position.coords.latitude.toFixed(4)),
          lon: Number(position.coords.longitude.toFixed(4))
        });
      },
      (error) => {
        const messages = {
          1: 'Location permission denied. Click the lock icon in your browser address bar and allow location access.',
          2: 'Location unavailable. Please check your device location settings.',
          3: 'Location request timed out. Please try again.'
        };
        reject(new Error(messages[error.code] || 'Could not detect your location.'));
      },
      GEO_OPTIONS
    );
  });
}

export async function getGeolocationPermissionState() {
  if (!navigator.permissions?.query) return 'unknown';
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state;
  } catch {
    return 'unknown';
  }
}
