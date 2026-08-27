const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @controller MicroclimateController
 * @description Backend logic for aggregating, processing, and serving gridded microclimate datasets.
 */

/**
 * GET /api/microclimate/grid
 * Serves gridded microclimate data with caching for high-frequency spatial queries.
 */
const getMicroclimateGrid = async (req, res) => {
    try {
        const { north, south, east, west } = req.query;

        // Generate a cache key based on rounded bounds to group similar requests
        const cacheKey = `grid_${Math.round(north)}_${Math.round(south)}_${Math.round(east)}_${Math.round(west)}`;

        // Check cache (valid for 30 minutes)
        const cached = await prisma.microclimateCache.findFirst({
            where: {
                cacheKey,
                createdAt: { gte: new Date(Date.now() - 1000 * 60 * 30) },
            },
        });

        if (cached) {
            return res.status(200).json(cached.data);
        }

        // Mock grid data generation (In production, fetch from meteorological API or spatial DB)
        const gridData = [];
        const steps = 5; // 5x5 grid for demonstration
        const latStep = (north - south) / steps;
        const lngStep = (east - west) / steps;

        for (let i = 0; i <= steps; i++) {
            for (let j = 0; j <= steps; j++) {
                const lat = parseFloat(south) + (i * latStep);
                const lng = parseFloat(west) + (j * lngStep);

                // Simulate UHI effect: higher temp in "urban" centers
                const baseTemp = 25;
                const urbanMultiplier = (i === 2 && j === 2) ? 4 : 0;
                const temp = baseTemp + urbanMultiplier + (Math.random() * 2);

                let landCover = 'VEGETATION';
                let uhiSeverity = 'LOW';

                if (temp > 28) {
                    landCover = 'URBAN';
                    uhiSeverity = temp > 30 ? 'SEVERE' : 'HIGH';
                } else if (temp > 26) {
                    landCover = 'BARREN';
                    uhiSeverity = 'MODERATE';
                }

                gridData.push({
                    id: `pt_${i}_${j}`,
                    coordinate: { lat: parseFloat(lat.toFixed(4)), lng: parseFloat(lng.toFixed(4)) },
                    temperature: parseFloat(temp.toFixed(1)),
                    humidity: Math.floor(40 + Math.random() * 30),
                    landCoverType: landCover,
                    uhiSeverity: uhiSeverity,
                    timestamp: new Date().toISOString(),
                });
            }
        }

        const responseData = {
            gridData,
            savedZones: [], // Would be populated from user DB
            metadata: {
                resolution: '500m',
                dataSource: 'Mock Meteorological Service',
                lastUpdated: new Date().toISOString(),
            },
        };

        // Cache the result
        await prisma.microclimateCache.create({
            data: {
                cacheKey,
                data: responseData,
            },
        });

        res.status(200).json(responseData);
    } catch (error) {
        console.error('Error fetching microclimate grid:', error);
        res.status(500).json({ message: 'Internal server error while fetching grid data.' });
    }
};

/**
 * POST /api/microclimate/zones
 * Saves a user-defined microclimate zone.
 */
const saveMicroclimateZone = async (req, res) => {
    try {
        const userId = req.user?.id || 'mock_user';
        const { name, centerCoordinate, radiusMeters, avgTemperatureDiff, healthAdvisory } = req.body;

        const zone = await prisma.microclimateZone.create({
            data: {
                userId,
                name,
                centerLat: centerCoordinate.lat,
                centerLng: centerCoordinate.lng,
                radiusMeters,
                avgTemperatureDiff,
                healthAdvisory,
            },
        });

        res.status(201).json(zone);
    } catch (error) {
        console.error('Error saving microclimate zone:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

module.exports = { getMicroclimateGrid, saveMicroclimateZone };
