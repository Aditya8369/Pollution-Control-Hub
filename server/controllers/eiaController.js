const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @controller EiaController
 * @description Backend logic for aggregating historical baseline data and formatting it into a structured, regulation-ready report payload.
 */

const REGULATORY_LIMITS = {
    PM25: { limit: 40, unit: 'µg/m³' },
    PM10: { limit: 60, unit: 'µg/m³' },
    NO2: { limit: 80, unit: 'µg/m³' },
    SO2: { limit: 80, unit: 'µg/m³' },
    CO: { limit: 4.0, unit: 'mg/m³' },
    O3: { limit: 100, unit: 'µg/m³' },
};

/**
 * POST /api/eia/generate
 * Initiates the EIA baseline report generation process.
 */
const generateReport = async (req, res) => {
    try {
        // In a real app, verify user has organizational permissions
        const { projectName, centerLat, centerLng, radiusMeters, durationMonths, targetPollutants } = req.body;

        // Create initial report record
        const report = await prisma.eiaReport.create({
            data: {
                projectName,
                status: 'GENERATING',
                summary: {
                    location: { lat: centerLat, lng: centerLng, radiusMeters },
                    assessmentPeriod: {
                        startDate: new Date(Date.now() - durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString(),
                        endDate: new Date().toISOString(),
                    },
                    statistics: [],
                    overallComplianceStatus: 'COMPLIANT',
                },
            },
        });

        // Simulate async processing (In production, use a job queue like BullMQ)
        setTimeout(async () => {
            try {
                const statistics = await computeBaselineStatistics(centerLat, centerLng, radiusMeters, durationMonths, targetPollutants);
                const overallStatus = statistics.some(s => !s.isCompliant) ? 'NON_COMPLIANT' : 'COMPLIANT';

                await prisma.eiaReport.update({
                    where: { id: report.id },
                    data: {
                        status: 'COMPLETED',
                        summary: {
                            projectName,
                            location: { lat: centerLat, lng: centerLng, radiusMeters },
                            assessmentPeriod: {
                                startDate: new Date(Date.now() - durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString(),
                                endDate: new Date().toISOString(),
                            },
                            statistics,
                            overallComplianceStatus: overallStatus,
                        },
                    },
                });
            } catch (error) {
                console.error('EIA Generation Error:', error);
                await prisma.eiaReport.update({
                    where: { id: report.id },
                    data: { status: 'FAILED' },
                });
            }
        }, 2000); // 2 second mock delay

        res.status(202).json({
            id: report.id,
            projectName,
            status: 'GENERATING',
            message: 'Report generation initiated. Poll for status.',
        });
    } catch (error) {
        console.error('Error initiating EIA report:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

/**
 * GET /api/eia/reports/:id
 * Fetches the status and details of a specific report.
 */
const getReportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const report = await prisma.eiaReport.findUnique({
            where: { id },
        });

        if (!report) {
            return res.status(404).json({ message: 'Report not found.' });
        }

        res.status(200).json(report);
    } catch (error) {
        console.error('Error fetching EIA report:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

/**
 * Helper function to compute statistical summaries (mocked for demonstration).
 */
const computeBaselineStatistics = async (lat, lng, radius, months, pollutants) => {
    // In production, query the time-series database for the specified bounding box and duration
    return pollutants.map(pollutant => {
        const limit = REGULATORY_LIMITS[pollutant].limit;
        const mean = parseFloat((limit * 0.6 + Math.random() * (limit * 0.5)).toFixed(2));
        const max = parseFloat((mean * 1.5 + Math.random() * 10).toFixed(2));
        const percentile98 = parseFloat((mean * 1.2).toFixed(2));
        const exceedanceDays = max > limit ? Math.floor(Math.random() * 15) + 1 : 0;

        return {
            pollutant,
            unit: REGULATORY_LIMITS[pollutant].unit,
            mean,
            max,
            percentile98,
            regulatoryLimit: limit,
            isCompliant: max <= limit,
            exceedanceDays,
        };
    });
};

module.exports = { generateReport, getReportStatus };
