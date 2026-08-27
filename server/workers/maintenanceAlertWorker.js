const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @module maintenanceAlertWorker
 * @description Background worker that periodically analyzes telemetry for degradation patterns.
 */

const FLATLINE_THRESHOLD = 5; // Consecutive identical readings
const DROPOUT_HOURS = 2; // No data for X hours

const analyzeSensorHealth = async () => {
    console.log('🔍 Running predictive maintenance analysis...');
    try {
        const sensors = await prisma.ioTSensor.findMany({
            where: { status: 'ACTIVE' }
        });

        for (const sensor of sensors) {
            // 1. Check for Dropout
            const lastSeen = new Date(sensor.lastSeen);
            const hoursSinceLastSeen = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60);

            if (hoursSinceLastSeen > DROPOUT_HOURS) {
                await createAlert(sensor.id, 'DROPOUT', 'HIGH', `No data received for ${hoursSinceLastSeen.toFixed(1)} hours.`);
                continue;
            }

            // 2. Check for Flatline or High Variance (Mocked logic for structure)
            const recentTelemetry = await prisma.ioTTelemetry.findMany({
                where: { sensorId: sensor.id },
                orderBy: { timestamp: 'desc' },
                take: 10
            });

            if (recentTelemetry.length >= FLATLINE_THRESHOLD) {
                const pm25Values = recentTelemetry.map(t => t.pm25).filter(v => v !== null);
                const allSame = pm25Values.every(val => val === pm25Values[0]);

                if (allSame && pm25Values.length > 0) {
                    await createAlert(sensor.id, 'FLATLINE', 'MODERATE', 'Sensor reporting identical PM2.5 values consecutively.');
                }
            }

            // Update health score (simplified)
            await prisma.sensorHealthScore.upsert({
                where: { sensorId: sensor.id },
                update: { healthScore: 85, lastEvaluated: new Date() },
                create: { sensorId: sensor.id, healthScore: 90, lastEvaluated: new Date() }
            });
        }
        console.log('✅ Maintenance analysis completed.');
    } catch (error) {
        console.error('❌ Error in maintenance analysis worker:', error);
    }
};

const createAlert = async (sensorId, type, severity, description) => {
    // Prevent duplicate unacknowledged alerts of the same type
    const existing = await prisma.sensorMaintenanceLog.findFirst({
        where: { sensorId, alertType: type, acknowledged: false }
    });

    if (!existing) {
        await prisma.sensorMaintenanceLog.create({
            data: { sensorId, alertType: type, severity, description }
        });
        console.log(`🚨 Alert created: ${type} for sensor ${sensorId}`);
    }
};

// Run every 15 minutes
setInterval(analyzeSensorHealth, 15 * 60 * 1000);

module.exports = { analyzeSensorHealth };
