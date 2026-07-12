const GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

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
