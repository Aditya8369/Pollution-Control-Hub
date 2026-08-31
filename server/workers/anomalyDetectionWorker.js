const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @module anomalyDetectionWorker
 * @description Background worker that applies statistical z-score and moving-average algorithms to detect telemetry outliers.
 */

/**
 * Calculates mean and standard deviation for an array of numbers.
 * @param {number[]} values 
 * @returns {{mean: number, stdDev: number}}
 */
const calculateStats = (values) => {
    if (values.length === 0) return { mean: 0, stdDev: 0 };
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length;
    return { mean, stdDev: Math.sqrt(variance) };
};

/**
 * Analyzes recent telemetry for a specific sensor to detect anomalies.
 * @param {string} sensorId 
 */
const analyzeSensor = async (sensorId) => {
    try {
        // Fetch last 50 readings
        const readings = await prisma.ioTTelemetry.findMany({
            where: { sensorId },
            orderBy: { timestamp: 'desc' },
            take: 50,
        });

        if (readings.length < 10) return; // Not enough data

        const pm25Values = readings.map(r => r.pm25).filter(v => v !== null);
        const { mean, stdDev } = calculateStats(pm25Values);

        const latestReading = readings[0];
        const latestValue = latestReading.pm25;

        if (latestValue === null) return;

        // Z-Score Outlier Detection (Threshold: 3 standard deviations)
        const zScore = stdDev > 0 ? Math.abs((latestValue - mean) / stdDev) : 0;

        // Flatline Detection (Last 5 readings are identical)
        const lastFive = readings.slice(0, 5).map(r => r.pm25);
        const isFlatline = lastFive.every(v => v === lastFive[0]);

        let anomalyType = null;
        let severity = 'LOW';

        if (zScore > 3) {
            anomalyType = 'Z_SCORE_OUTLIER';
            severity = zScore > 5 ? 'CRITICAL' : 'HIGH';
        } else if (isFlatline && stdDev === 0) {
            anomalyType = 'FLATLINE';
            severity = 'MEDIUM';
        }

        if (anomalyType) {
            // Check if an active, unacknowledged anomaly already exists for this sensor
            const existingAnomaly = await prisma.sensorAnomaly.findFirst({
                where: { sensorId, isAcknowledged: false },
                orderBy: { detectedAt: 'desc' },
            });

            if (!existingAnomaly) {
                await prisma.sensorAnomaly.create({
                    data: {
                        sensorId,
                        type: anomalyType,
                        severity,
                        metricValue: latestValue,
                        expectedRange: { min: mean - stdDev * 2, max: mean + stdDev * 2 },
                        isAcknowledged: false,
                    },
                });

                // Auto-isolate if critical
                if (severity === 'CRITICAL') {
                    await prisma.sensorIsolationLog.upsert({
                        where: { sensorId },
                        update: { state: 'ISOLATED', reason: `Auto-isolated due to ${anomalyType}`, isolatedAt: new Date() },
                        create: { sensorId, state: 'ISOLATED', reason: `Auto-isolated due to ${anomalyType}`, isolatedAt: new Date() },
                    });
                }
            }
        }
    } catch (error) {
        console.error(`Error analyzing sensor ${sensorId}:`, error);
    }
};

/**
 * Main worker loop
 */
const runDetectionCycle = async () => {
    console.log('🔍 Running anomaly detection cycle...');
    try {
        const activeSensors = await prisma.ioTSensor.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true },
        });

        for (const sensor of activeSensors) {
            await analyzeSensor(sensor.id);
        }
        console.log('✅ Anomaly detection cycle completed.');
    } catch (error) {
        console.error('❌ Error in anomaly detection worker:', error);
    }
};

// Run every 5 minutes
setInterval(runDetectionCycle, 5 * 60 * 1000);

module.exports = { runDetectionCycle };
