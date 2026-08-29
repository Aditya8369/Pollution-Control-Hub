const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @module calibrationWorker
 * @description Background worker that computes linear regression drift corrections between reference and low-cost sensor data.
 */

/**
 * Computes simple linear regression (y = mx + c) and R-squared.
 * @param {Array} xValues - Low-cost sensor readings.
 * @param {Array} yValues - Reference sensor readings.
 * @returns {Object} slope, intercept, rSquared
 */
const computeLinearRegression = (xValues, yValues) => {
    const n = xValues.length;
    if (n < 3) return { slope: 1, intercept: 0, rSquared: 0 }; // Not enough data

    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((total, x, i) => total + x * yValues[i], 0);
    const sumXX = xValues.reduce((total, x) => total + x * x, 0);
    const sumYY = yValues.reduce((total, y) => total + y * y, 0);

    const denominator = (n * sumXX) - (sumX * sumX);
    if (denominator === 0) return { slope: 1, intercept: 0, rSquared: 0 };

    const slope = ((n * sumXY) - (sumX * sumY)) / denominator;
    const intercept = (sumY - (slope * sumX)) / n;

    const ssTot = sumYY - ((sumY * sumY) / n);
    const ssRes = sumYY - (intercept * sumY) - (slope * sumXY);
    const rSquared = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

    return { slope: parseFloat(slope.toFixed(4)), intercept: parseFloat(intercept.toFixed(4)), rSquared: parseFloat(rSquared.toFixed(4)) };
};

/**
 * Processes pending calibration events and computes new correction factors.
 */
const processCalibrationData = async () => {
    console.log('🔍 Running sensor calibration drift correction analysis...');
    try {
        // Group readings by low-cost sensor and pollutant
        const readings = await prisma.calibrationEvent.findMany({
            where: {
                processed: false,
            },
            orderBy: { timestamp: 'asc' },
        });

        const grouped = {};
        readings.forEach(r => {
            const key = `${r.lowCostSensorId}_${r.pollutant}`;
            if (!grouped[key]) grouped[key] = { lowCost: [], reference: [], sensorId: r.lowCostSensorId, pollutant: r.pollutant };
            grouped[key].lowCost.push(r.lowCostReading);
            grouped[key].reference.push(r.referenceReading);
        });

        for (const key in grouped) {
            const data = grouped[key];
            if (data.lowCost.length >= 5) { // Require at least 5 data points
                const regression = computeLinearRegression(data.lowCost, data.reference);

                if (regression.rSquared > 0.6) { // Only apply if correlation is decent
                    // Deactivate old factors
                    await prisma.correctionCoefficient.updateMany({
                        where: { lowCostSensorId: data.sensorId, pollutant: data.pollutant },
                        data: { isActive: false },
                    });

                    // Create new active factor
                    await prisma.correctionCoefficient.create({
                        data: {
                            lowCostSensorId: data.sensorId,
                            pollutant: data.pollutant,
                            slope: regression.slope,
                            intercept: regression.intercept,
                            rSquared: regression.rSquared,
                            isActive: true,
                            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                        },
                    });

                    console.log(`✅ Computed new correction factor for ${data.sensorId} (${data.pollutant}): R²=${regression.rSquared}`);
                }
            }
        }

        // Mark processed
        await prisma.calibrationEvent.updateMany({
            where: { id: { in: readings.map(r => r.id) } },
            data: { processed: true },
        });

        console.log('✅ Calibration analysis completed.');
    } catch (error) {
        console.error('❌ Error in calibration worker:', error);
    }
};

// Run every hour
setInterval(processCalibrationData, 60 * 60 * 1000);

module.exports = { processCalibrationData };
