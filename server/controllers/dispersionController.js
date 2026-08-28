const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @controller DispersionController
 * @description Backend logic for aggregating wind data and computing basic Gaussian plume dispersion coordinates.
 */

/**
 * Computes a simplified Gaussian plume dispersion model.
 * @param {Object} source - Point source data.
 * @param {Object} wind - Wind metrics.
 * @returns {Array} Array of plume coordinates.
 */
const computeGaussianPlume = (source, wind) => {
    const plumeCoordinates = [];
    const maxDistance = 5000; // 5 km downwind
    const steps = 20;
    const stepSize = maxDistance / steps;

    // Simplified dispersion coefficients (sigma_y, sigma_z) based on stability class
    const stabilityFactors = {
        'A': { sy: 0.22, sz: 0.20 },
        'B': { sy: 0.16, sz: 0.12 },
        'C': { sy: 0.11, sz: 0.08 },
        'D': { sy: 0.08, sz: 0.06 },
        'E': { sy: 0.06, sz: 0.03 },
        'F': { sy: 0.04, sz: 0.02 },
    };

    const factors = stabilityFactors[wind.atmosphericStability] || stabilityFactors['D'];
    const windRad = (wind.direction * Math.PI) / 180;

    let maxConcentration = 0;
    let distanceToMax = 0;

    for (let i = 1; i <= steps; i++) {
        const distance = i * stepSize;

        // Simplified Gaussian equation for centerline concentration
        const sigmaY = factors.sy * distance;
        const sigmaZ = factors.sz * distance;
        const effectiveHeight = source.stackHeight;

        const concentration = (source.emissionRate / (Math.PI * wind.speed * sigmaY * sigmaZ)) *
            Math.exp(-(effectiveHeight ** 2) / (2 * sigmaZ ** 2));

        // Calculate lat/lng offset based on wind direction
        const latOffset = (distance * Math.cos(windRad)) / 111000; // approx meters to degrees
        const lngOffset = (distance * Math.sin(windRad)) / (111000 * Math.cos(source.location.lat * Math.PI / 180));

        if (concentration > maxConcentration) {
            maxConcentration = concentration;
            distanceToMax = distance;
        }

        plumeCoordinates.push({
            lat: source.location.lat + latOffset,
            lng: source.location.lng + lngOffset,
            concentration: parseFloat(concentration.toFixed(4)),
            distanceFromSource: distance,
        });
    }

    return { plumeCoordinates, maxConcentration, distanceToMax };
};

/**
 * GET /api/dispersion
 * Retrieves point sources and the latest dispersion run.
 */
const getDispersionData = async (req, res) => {
    try {
        const { pointSourceId } = req.query;

        const pointSources = await prisma.pointSource.findMany({
            orderBy: { name: 'asc' },
        });

        let activeRun = null;
        if (pointSourceId) {
            activeRun = await prisma.dispersionRun.findFirst({
                where: { pointSourceId },
                orderBy: { timestamp: 'desc' },
            });
        } else if (pointSources.length > 0) {
            activeRun = await prisma.dispersionRun.findFirst({
                orderBy: { timestamp: 'desc' },
            });
        }

        res.status(200).json({
            pointSources,
            activeRun,
            metadata: {
                modelVersion: 'gaussian-plume-v1.0',
                computedAt: activeRun ? activeRun.timestamp : new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Error fetching dispersion data:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

/**
 * POST /api/dispersion/compute
 * Triggers a new dispersion model computation.
 */
const computeDispersion = async (req, res) => {
    try {
        const { pointSourceId } = req.body;

        const source = await prisma.pointSource.findUnique({
            where: { id: pointSourceId },
        });

        if (!source) {
            return res.status(404).json({ message: 'Point source not found.' });
        }

        // Mock live wind data (In production, fetch from meteorological API)
        const mockWind = {
            speed: 4.5,
            direction: 225, // SW
            directionCardinal: 'SW',
            atmosphericStability: 'D',
        };

        const { plumeCoordinates, maxConcentration, distanceToMax } = computeGaussianPlume(source, mockWind);

        const newRun = await prisma.dispersionRun.create({
            data: {
                pointSourceId,
                windMetrics: mockWind,
                plumeCoordinates,
                maxDownwindConcentration: maxConcentration,
                distanceToMaxConcentration: distanceToMax,
            },
        });

        res.status(201).json(newRun);
    } catch (error) {
        console.error('Error computing dispersion:', error);
        res.status(500).json({ message: 'Internal server error during computation.' });
    }
};

module.exports = { getDispersionData, computeDispersion };
