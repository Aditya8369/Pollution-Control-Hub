const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

/**
 * @controller RoutingController
 * @description Backend logic for fetching map segments and calculating cumulative AQI exposure scores for each route.
 */

/**
 * Generates a unique hash for a route request to enable caching.
 */
const generateRouteHash = (req) => {
    const str = `${req.startLat},${req.startLng},${req.endLat},${req.endLng},${req.mode}`;
    return crypto.createHash('md5').update(str).digest('hex');
};

/**
 * POST /api/routing/alternatives
 * Calculates and returns route alternatives with AQI exposure scores.
 */
const getRouteAlternatives = async (req, res) => {
    try {
        const { startLat, startLng, endLat, endLng, mode } = req.body;
        const routeHash = generateRouteHash(req.body);

        // Check cache first (valid for 15 minutes)
        const cached = await prisma.routeExposureCache.findFirst({
            where: {
                routeHash,
                createdAt: { gte: new Date(Date.now() - 1000 * 60 * 15) },
            },
        });

        if (cached) {
            return res.status(200).json(cached.data);
        }

        // Mock route generation (In production, integrate with OSRM or Mapbox Directions API)
        const baseDistance = 5000; // 5km
        const alternatives = [
            {
                id: 'route_1',
                name: 'Cleanest Air Route',
                totalDistanceMeters: baseDistance + 800,
                estimatedDurationMinutes: mode === 'PEDESTRIAN' ? 75 : 25,
                totalAqiExposureScore: 4500, // Lower is better
                averageAqi: 45,
                segments: generateMockSegments(baseDistance + 800, 45),
                polyline: generateMockPolyline(startLat, startLng, endLat, endLng, 10),
            },
            {
                id: 'route_2',
                name: 'Shortest Distance',
                totalDistanceMeters: baseDistance,
                estimatedDurationMinutes: mode === 'PEDESTRIAN' ? 65 : 20,
                totalAqiExposureScore: 7800,
                averageAqi: 78,
                segments: generateMockSegments(baseDistance, 78),
                polyline: generateMockPolyline(startLat, startLng, endLat, endLng, 5),
            }
        ];

        const responseData = {
            alternatives,
            metadata: {
                computedAt: new Date().toISOString(),
                dataSource: 'Mock Routing & AQI Grid Service',
            },
        };

        // Cache the result
        await prisma.routeExposureCache.create({
            data: {
                routeHash,
                startLat,
                startLng,
                endLat,
                endLng,
                mode,
                data: responseData,
            },
        });

        res.status(200).json(responseData);
    } catch (error) {
        console.error('Error calculating routes:', error);
        res.status(500).json({ message: 'Internal server error during route calculation.' });
    }
};

/**
 * GET /api/routing/cache/:hash
 * Retrieves a cached route if it exists.
 */
const getCachedRoute = async (req, res) => {
    try {
        const { hash } = req.params;
        const cached = await prisma.routeExposureCache.findUnique({
            where: { routeHash: hash },
        });

        if (!cached) {
            return res.status(404).json({ message: 'Route cache not found.' });
        }

        res.status(200).json(cached.data);
    } catch (error) {
        console.error('Error fetching cached route:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

// Helper functions for mock data generation
const generateMockSegments = (totalDistance, avgAqi) => {
    const segments = [];
    const step = 500;
    for (let d = 0; d < totalDistance; d += step) {
        segments.push({
            lat: 0, lng: 0, // Mocked
            distanceMeters: step,
            aqiValue: Math.floor(avgAqi + (Math.random() * 20 - 10)),
            dominantPollutant: Math.random() > 0.5 ? 'PM2.5' : 'NO2',
        });
    }
    return segments;
};

const generateMockPolyline = (startLat, startLng, endLat, endLng, points) => {
    const polyline = [[startLat, startLng]];
    for (let i = 1; i < points; i++) {
        const ratio = i / points;
        polyline.push([
            startLat + (endLat - startLat) * ratio + (Math.random() * 0.01 - 0.005),
            startLng + (endLng - startLng) * ratio + (Math.random() * 0.01 - 0.005),
        ]);
    }
    polyline.push([endLat, endLng]);
    return polyline;
};

module.exports = { getRouteAlternatives, getCachedRoute };
