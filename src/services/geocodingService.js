const GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

export async function reverseGeocode(lat, lon) {
  const url = `${NOMINATIM_REVERSE_URL}?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Reverse geocoding failed');

    const data = await response.json();
    const address = data.address || {};

    const name =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      address.state ||
      data.name ||
      'Your Current Location';

    const region = address.state || address.country;
    const displayName = region && region !== name ? `${name}, ${region}` : name;

    return { name, displayName };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return { name: 'Your Current Location', displayName: 'Your Current Location' };
  }
}

export async function searchLocations(query, count = 5) {
  if (!query || query.trim() === '') return [];

  const url = `${GEOCODING_BASE_URL}?name=${encodeURIComponent(query)}&count=${count}&language=en&format=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Geocoding search failed');
    }

    const data = await response.json();
    if (!data.results) return [];

    return data.results.map((result) => ({
      id: result.id,
      name: result.name,
      admin1: result.admin1, // State/Province
      country: result.country,
      lat: result.latitude,
      lon: result.longitude,
      // Create a formatted display string e.g., "Paris, Île-de-France, France"
      displayName: [result.name, result.admin1, result.country]
        .filter(Boolean)
        .join(', ')
    }));
  } catch (error) {
    console.error('Error fetching location data:', error);
    return [];
  }
}
