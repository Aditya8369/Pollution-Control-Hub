const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @controller ForecastController
 * @description Backend logic for processing telemetry data and generating heuristic-based source attribution.
 */

/**
 * Heuristic model to attribute pollution sources based on pollutant ratios.
 * @param {Object} pollutants - Object containing pm25, pm10, no2, o3, co values.
 * @returns {Array} Array of attribution confidences.
 */
const calculateSourceAttribution = (pollutants) => {
    const { pm25 = 0, pm10 = 0, no2 = 0, o3 = 0, co = 0 } = pollutants;
    let scores = { VEHICULAR: 0, INDUSTRIAL: 0, BIOMASS: 0, CONSTRUCTION: 0, NATURAL: 0 };

    // Heuristic rules based on environmental science
    if (no2 > 40 && co > 1.0) scores.VEHICULAR += 40;
    if (pm25 > 60 && pm10 > 100) scores.CONSTRUCTION += 30;
    if (pm25 > 50 && co > 1.5 && no2 < 30) scores.BIOMASS += 45;
    if (o3 > 80 && no2 > 50) scores.INDUSTRIAL += 35;
    if (pm10 > 80 && pm25 < 30) scores.NATURAL += 30;

    // Normalize scores to percentages
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(scores)
        .map(([source, score]) => ({
            source,
            percentage: Math.round((score / totalScore) * 100),
            indicators: getIndicatorsForSource(source, pollutants),
        }))
        .sort((a, b) => b.percentage - a.percentage)
        .filter(item => item.percentage > 5); // Only show sources with >5% confidence
};

const getIndicatorsForSource = (source, pollutants) => {
    const indicators = [];
    if (source === 'VEHICULAR' && pollutants.no2 > 40) indicators.push('High NO2 levels');
    if (source === 'BIOMASS' && pollutants.pm25 > 50) indicators.push('Elevated PM2.5 with low NO2');
    if (source === 'CONSTRUCTION' && pollutants.pm10 > 100) indicators.push('High PM10 to PM2.5 ratio');
    if (source === 'INDUSTRIAL' && pollutants.o3 > 80) indicators.push('High Ozone and NO2 correlation');
    return indicators.length > 0 ? indicators : ['General pollutant elevation'];
};

/**
 * GET /api/forecast/aqi
 * Generates or retrieves cached forecast data.
 */
const getAqiForecast = async (req, res) => {
    try {
        const { lat, lng, days } = req.query;
        const locationKey = `${lat}_${lng}`;

        // Check cache first
        const cached = await prisma.forecastCache.findFirst({
            where: {
                locationKey,
                createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 6) }, // 6 hours cache
            },
            orderBy: { createdAt: 'desc' },
        });

        if (cached) {
            return res.status(200).json(cached.data);
        }

        // Mock forecast generation (In production, this calls an ML model or external API)
        const baseAqi = Math.floor(Math.random() * 100) + 50;
        const forecasts = Array.from({ length: parseInt(days) || 3 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i);

            const pollutants = {
                pm25: baseAqi * 0.6 + (Math.random() * 20),
                pm10: baseAqi * 0.8 + (Math.random() * 30),
                no2: baseAqi * 0.4 + (Math.random() * 15),
                o3: baseAqi * 0.3 + (Math.random() * 10),
                co: baseAqi * 0.02 + (Math.random() * 0.5),
            };

            return {
                date: date.toISOString().split('T')[0],
                avgAqi: Math.round(baseAqi + (Math.random() * 20 - 10)),
                maxAqi: Math.round(baseAqi + 30),
                minAqi: Math.round(baseAqi - 20),
                hourlyBreakdown: [
                    { hour: '00:00', aqiMin: baseAqi - 10, aqiMax: baseAqi, dominantPollutant: 'PM2.5' },
                    { hour: '08:00', aqiMin: baseAqi, aqiMax: baseAqi + 20, dominantPollutant: 'NO2' },
                    { hour: '14:00', aqiMin: baseAqi + 10, aqiMax: baseAqi + 30, dominantPollutant: 'O3' },
                    { hour: '20:00', aqiMin: baseAqi, aqiMax: baseAqi + 15, dominantPollutant: 'PM10' },
                ],
                attributions: calculateSourceAttribution(pollutants),
                healthAdvisory: baseAqi > 100 ? 'Sensitive groups should reduce prolonged outdoor exertion.' : 'Air quality is acceptable for most individuals.',
                confidenceScore: Math.floor(Math.random() * 15) + 80,
            };
        });

        const responseData = {
            location: `Lat: ${lat}, Lng: ${lng}`,
            generatedAt: new Date().toISOString(),
            forecasts,
            modelVersion: 'heuristic-v1.2.0',
        };

        // Cache the result
        await prisma.forecastCache.create({
            data: {
                locationKey,
                data: responseData,
            },
        });

        res.status(200).json(responseData);
    } catch (error) {
        console.error('Error generating forecast:', error);
        res.status(500).json({ message: 'Internal server error while generating forecast.' });
    }
};

/**
 * GET /api/forecast/attribution/history
 */
const getHistoricalAttribution = async (req, res) => {
    try {
        const { locationId } = req.query;
        // Mock historical data
        res.status(200).json([
            { date: '2026-08-20', topSource: 'VEHICULAR', percentage: 45 },
            { date: '2026-08-21', topSource: 'BIOMASS', percentage: 50 },
            { date: '2026-08-22', topSource: 'VEHICULAR', percentage: 40 },
        ]);
    } catch (error) {
        console.error('Error fetching historical attribution:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

module.exports = { getAqiForecast, getHistoricalAttribution };
