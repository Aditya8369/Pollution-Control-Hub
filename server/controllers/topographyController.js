const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @controller TopographyController
 * @description Backend logic for aggregating spatial data, interpolating grid points, and serving optimized 3D payloads.
 */

/**
 * GET /api/topography/3d-grid
 * Serves gridded 3D spatial pollution data with caching for high-frequency requests.
 */
const get3DGrid = async (req, res) => {
    try {
        const { north, south, east, west } = req.query;

        // Generate cache key based on rounded bounds
        const cacheKey = `topo3d_${Math.round(north)}_${Math.round(south)}_${Math.round(east)}_${Math.round(west)}`;

        // Check cache (valid for 15 minutes)
        const cached = await prisma.spatialGrid3D.findFirst({
            where: {
                cacheKey,
                createdAt: { gte: new Date(Date.now() - 1000 * 60 * 15) },
            },
        });

        if (cached) {
            return res.status(200).json(cached.data);
        }

        // Mock 3D grid generation (In production, integrate with elevation API and spatial DB)
        const gridData = [];
        const gridSize = 10; // 10x10 grid
        const latStep = (north - south) / gridSize;
        const lngStep = (east - west) / gridSize;

        for (let i = 0; i <= gridSize; i++) {
            for (let j = 0; j <= gridSize; j++) {
                const lat = parseFloat(south) + (i * latStep);
                const lng = parseFloat(west) + (j * lngStep);

                // Simulate elevation (higher in center, lower at edges)
                const distFromCenter = Math.sqrt(Math.pow(i - gridSize / 2, 2) + Math.pow(j - gridSize / 2, 2));
                const elevation = 100 + (50 - distFromCenter * 5) + (Math.random() * 10);

                // Simulate AQI (higher in "valleys" / lower elevation)
                const baseAqi = 50 + (50 - elevation / 2) + (Math.random() * 30);
                const aqiValue = Math.max(0, Math.min(300, baseAqi));

                gridData.push({
                    lat: parseFloat(lat.toFixed(4)),
                    lng: parseFloat(lng.toFixed(4)),
                    elevation: parseFloat(elevation.toFixed(1)),
                    aqiValue: Math.round(aqiValue),
                    dominantPollutant: Math.random() > 0.5 ? 'PM2.5' : 'NO2',
                });
            }
        }

        const responseData = {
            gridData,
            metadata: {
                resolution: 500,
                bounds: { north: parseFloat(north), south: parseFloat(south), east: parseFloat(east), west: parseFloat(west) },
                lastUpdated: new Date().toISOString(),
            },
        };

        // Cache result
        await prisma.spatialGrid3D.create({
            data: {
                cacheKey,
                data: responseData,
            },
        });

        res.status(200).json(responseData);
    } catch (error) {
        console.error('Error fetching 3D grid:', error);
        res.status(500).json({ message: 'Internal server error while fetching 3D grid.' });
    }
};

module.exports = { get3DGrid };
