const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @controller CarbonOffsetController
 * @description Handles validation and secure recording of carbon offset purchases.
 */

const getProjects = async (req, res) => {
    try {
        // In a real scenario, fetch from DB. Mocked for structure.
        const projects = [
            {
                id: 'proj_1',
                name: 'Amazon Reforestation Initiative',
                description: 'Planting native trees in degraded areas of the Amazon basin.',
                location: 'Brazil',
                type: 'REFORESTATION',
                pricePerTon: 15.50,
                availableTons: 5000,
                certification: 'GOLD_STANDARD',
                impactMetrics: { treesPlanted: 15000, co2Reduced: 5000, communityBenefit: 'Local employment' }
            },
            {
                id: 'proj_2',
                name: 'Solar Grid Expansion',
                description: 'Expanding solar micro-grids in rural communities.',
                location: 'India',
                type: 'RENEWABLE_ENERGY',
                pricePerTon: 12.00,
                availableTons: 10000,
                certification: 'VERIFIED_CARBON_STANDARD',
                impactMetrics: { co2Reduced: 10000, communityBenefit: 'Clean energy access' }
            }
        ];
        res.status(200).json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const purchaseOffset = async (req, res) => {
    try {
        const { projectId, tons } = req.body;
        const userId = req.user?.id || 'mock_user_123'; // Replace with actual auth middleware user

        if (!projectId || !tons || tons <= 0) {
            return res.status(400).json({ message: 'Invalid purchase parameters' });
        }

        // Mock project lookup
        const projectPricePerTon = 15.50;
        const totalCost = tons * projectPricePerTon;

        // Record transaction
        const transaction = await prisma.carbonTransaction.create({
            data: {
                userId,
                projectId,
                tonsPurchased: tons,
                totalCost,
                currency: 'USD',
                status: 'COMPLETED',
            }
        });

        // Update user portfolio total (mocked logic)
        await prisma.user.update({
            where: { id: userId },
            data: {
                totalOffsetTons: { increment: tons }
            }
        });

        res.status(201).json({
            message: 'Offset purchased successfully',
            transaction
        });
    } catch (error) {
        console.error('Error processing offset purchase:', error);
        res.status(500).json({ message: 'Transaction failed' });
    }
};

const getPortfolio = async (req, res) => {
    try {
        const userId = req.user?.id || 'mock_user_123';
        const transactions = await prisma.carbonTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { totalOffsetTons: true }
        });

        res.status(200).json({
            totalOffsetTons: user?.totalOffsetTons || 0,
            activeProjects: ['Amazon Reforestation Initiative'],
            recentTransactions: transactions
        });
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { getProjects, purchaseOffset, getPortfolio };
