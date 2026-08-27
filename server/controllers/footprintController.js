const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @controller FootprintController
 * @description Backend logic for calculating footprint metrics based on logged activities and generating tailored reduction steps.
 */

const EMISSION_FACTORS = {
    COMMUTE: { car_petrol: 0.21, car_electric: 0.05, public_transit: 0.04, bike_walk: 0 },
    ENERGY: { electricity_grid: 0.5, renewable: 0.01, natural_gas: 0.2 },
    DIET: { meat_heavy: 7.0, balanced: 3.0, vegetarian: 1.5, vegan: 1.0 }, // kg per day approx
    SHOPPING: { clothing: 10, electronics: 50, general: 5 }, // kg per item approx
    TRAVEL: { domestic_flight: 0.25, international_flight: 0.15, train: 0.04 } // kg per km approx
};

/**
 * POST /api/footprint/activities
 * Logs a new activity and calculates emissions.
 */
const logActivity = async (req, res) => {
    try {
        const userId = req.user?.id || 'mock_user_123';
        const { category, subcategory, quantity, date } = req.body;

        const factor = EMISSION_FACTORS[category]?.[subcategory];
        if (factor === undefined) {
            return res.status(400).json({ message: 'Invalid activity category or subcategory.' });
        }

        const estimatedEmissions = parseFloat((quantity * factor).toFixed(2));

        const activity = await prisma.activityLog.create({
            data: {
                userId,
                category,
                subcategory,
                quantity,
                date: new Date(date),
                estimatedEmissions,
            },
        });

        // Trigger reduction plan generation/update
        await generateReductionPlan(userId);

        res.status(201).json(activity);
    } catch (error) {
        console.error('Error logging activity:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

/**
 * GET /api/footprint/summary
 * Retrieves the user's footprint summary and active reduction steps.
 */
const getFootprintSummary = async (req, res) => {
    try {
        const userId = req.user?.id || 'mock_user_123';

        const activities = await prisma.activityLog.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
        });

        const totalEmissions = activities.reduce((sum, act) => sum + act.estimatedEmissions, 0);

        // Mock monthly breakdown
        const monthlyBreakdown = [
            { month: 'Jan', emissions: 120 },
            { month: 'Feb', emissions: 115 },
            { month: 'Mar', emissions: totalEmissions },
        ];

        // Mock category breakdown
        const categoryBreakdown = [
            { category: 'COMMUTE', emissions: totalEmissions * 0.4, percentage: 40 },
            { category: 'ENERGY', emissions: totalEmissions * 0.3, percentage: 30 },
            { category: 'DIET', emissions: totalEmissions * 0.2, percentage: 20 },
            { category: 'OTHER', emissions: totalEmissions * 0.1, percentage: 10 },
        ];

        const steps = await prisma.reductionStep.findMany({
            where: { userId },
            orderBy: { potentialSavingsKg: 'desc' },
        });

        const projectedAnnualSavings = steps
            .filter(s => s.isCompleted)
            .reduce((sum, step) => sum + step.potentialSavingsKg, 0) * 12;

        res.status(200).json({
            totalEmissions: parseFloat(totalEmissions.toFixed(2)),
            monthlyBreakdown,
            categoryBreakdown,
            activeReductionSteps: steps,
            projectedAnnualSavings: parseFloat(projectedAnnualSavings.toFixed(2)),
        });
    } catch (error) {
        console.error('Error fetching footprint summary:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

/**
 * PATCH /api/footprint/steps/:id
 * Updates the completion status of a reduction step.
 */
const updateReductionStep = async (req, res) => {
    try {
        const { id } = req.params;
        const { isCompleted } = req.body;
        const userId = req.user?.id || 'mock_user_123';

        const step = await prisma.reductionStep.update({
            where: { id, userId },
            data: { isCompleted },
        });

        res.status(200).json(step);
    } catch (error) {
        console.error('Error updating reduction step:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

/**
 * Helper function to generate personalized reduction steps based on user's highest emission categories.
 */
const generateReductionPlan = async (userId) => {
    // Simplified logic: always ensure a baseline set of steps exists
    const existingSteps = await prisma.reductionStep.count({ where: { userId } });

    if (existingSteps === 0) {
        await prisma.reductionStep.createMany({
            data: [
                { userId, title: 'Switch to Public Transit', description: 'Replace 2 car commutes per week with bus/train.', category: 'COMMUTE', potentialSavingsKg: 50, difficulty: 'MODERATE', isCompleted: false },
                { userId, title: 'Meatless Mondays', description: 'Adopt a vegetarian diet one day per week.', category: 'DIET', potentialSavingsKg: 30, difficulty: 'EASY', isCompleted: false },
                { userId, title: 'LED Bulb Upgrade', description: 'Replace 5 incandescent bulbs with LED equivalents.', category: 'ENERGY', potentialSavingsKg: 20, difficulty: 'EASY', isCompleted: false },
            ],
        });
    }
};

module.exports = { logActivity, getFootprintSummary, updateReductionStep };
