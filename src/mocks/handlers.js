import { http, HttpResponse } from 'msw';

export const handlers = [
  // Nominatim geocoding
  http.get('https://nominatim.openstreetmap.org/search', ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';

    if (q.includes('Start') || q.includes('Start')) {
      return HttpResponse.json([
        { lon: '77.2090', lat: '28.6139', display_name: 'Start Location' }
      ]);
    }
    return HttpResponse.json([
      { lon: '77.2190', lat: '28.6239', display_name: 'Dest Location' }
    ]);
  }),

  // OSRM routing
  http.get('https://router.project-osrm.org/route/v1/:profile/:coords', () => {
    return HttpResponse.json({
      code: 'Ok',
      routes: [
        {
          distance: 5000,
          duration: 600,
          geometry: {
            coordinates: [
              [77.2090, 28.6139],
              [77.2115, 28.6164],
              [77.2140, 28.6189],
              [77.2165, 28.6214],
              [77.2190, 28.6239],
            ],
          },
        },
      ],
    });
  }),

  // Open-Meteo Air Quality
  http.get('https://air-quality-api.open-meteo.com/v1/air-quality', () => {
    return HttpResponse.json({
      current: { pm2_5: 20.0, pm10: 45.0, us_aqi: 68 },
    });
  }),

  // Open-Meteo Geocoding search
  http.get('https://geocoding-api.open-meteo.com/v1/search', ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get('name') || '';
    return HttpResponse.json({
      results: [
        {
          id: 12345,
          name: name || 'Mocked Place',
          latitude: 28.6139,
          longitude: 77.2090,
          admin1: 'Delhi',
          country: 'India'
        }
      ]
    });
  }),
];
