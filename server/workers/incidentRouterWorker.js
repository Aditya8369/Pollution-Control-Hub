const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @module incidentRouterWorker
 * @description Background worker that classifies incoming reports and assigns routing categories based on heuristic rules.
 */

const ROUTING_RULES = [
    {
        keywords: ['smoke', 'factory', 'chimney', 'chemical', 'fumes'],
        category: 'INDUSTRIAL_EMISSION',
        defaultSeverity: 'HIGH',
    },
    {
        keywords: ['fire', 'burning', 'garbage', 'trash', 'waste'],
        category: 'WASTE_BURNING',
        defaultSeverity: 'MODERATE',
    },
    {
        keywords: ['dust', 'construction', 'demolition', 'building'],
        category: 'CONSTRUCTION_DUST',
        defaultSeverity: 'LOW',
    },
    {
        keywords: ['traffic', 'jam', 'exhaust', 'vehicles', 'congestion'],
        category: 'VEHICULAR_CONGESTION',
        defaultSeverity: 'MODERATE',
    },
];

/**
 * Processes pending incidents and applies routing rules.
 */
const processPendingIncidents = async () => {
    console.log('🔄 Running incident routing worker...');
    try {
        const pendingIncidents = await prisma.incidentReport.findMany({
            where: {
                routedIncident: null, // Only process incidents not yet routed
            },
            take: 50, // Process in batches
        });

        for (const incident of pendingIncidents) {
            const description = incident.description.toLowerCase();

            // Find best matching category based on keyword overlap
            let bestMatch = null;
            let maxMatches = 0;

            for (const rule of ROUTING_RULES) {
                const matches = rule.keywords.filter(keyword => description.includes(keyword)).length;
                if (matches > maxMatches) {
                    maxMatches = matches;
                    bestMatch = rule;
                }
            }

            // Default to OTHER if no keywords match
            const category = bestMatch ? bestMatch.category : 'OTHER';
            const severity = bestMatch ? bestMatch.defaultSeverity : 'LOW';
            const confidence = maxMatches > 0 ? Math.min((maxMatches / 3) * 100, 95) : 30;

            // Determine assigned department based on category
            let assignedDepartment = 'General Municipal';
            if (category === 'INDUSTRIAL_EMISSION') assignedDepartment = 'Pollution Control Board';
            if (category === 'WASTE_BURNING') assignedDepartment = 'Sanitation Department';
            if (category === 'CONSTRUCTION_DUST') assignedDepartment = 'Urban Development Authority';

            // Create the routed incident record
            await prisma.routedIncident.create({
                data: {
                    incidentId: incident.id,
                    category,
                    status: 'ROUTED',
                    severity,
                    routingConfidence: confidence,
                    assignedDepartment,
                },
            });

            console.log(`✅ Routed incident ${incident.id} to ${category} (${confidence}% confidence)`);
        }

        console.log('✅ Incident routing worker completed.');
    } catch (error) {
        console.error('❌ Error in incident routing worker:', error);
    }
};

// Run every 2 minutes in production (mocked interval for demonstration)
setInterval(processPendingIncidents, 2 * 60 * 1000);

// Run once immediately on startup
processPendingIncidents();

module.exports = { processPendingIncidents };
