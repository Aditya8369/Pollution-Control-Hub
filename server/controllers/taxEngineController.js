const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @controller TaxEngineController
 * @description Backend logic for applying simulation rules against historical emission datasets to calculate projected tax revenues and emission reductions.
 */

/**
 * GET /api/tax-engine/rules
 * Retrieves active tax and incentive rules.
 */
const getRules = async (req, res) => {
    try {
        const taxRules = await prisma.taxRule.findMany({ where: { isActive: true } });
        const incentiveRules = await prisma.incentiveRule.findMany({ where: { isActive: true } });

        res.status(200).json({ taxRules, incentiveRules });
    } catch (error) {
        console.error('Error fetching rules:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * POST /api/tax-engine/simulate
 * Calculates projected financial and environmental outcomes.
 */
const simulateImpact = async (req, res) => {
    try {
        const { taxRules, incentiveRules, baselineEmissions, projectedReductionPercentage } = req.body;

        if (!baselineEmissions || projectedReductionPercentage < 0 || projectedReductionPercentage > 100) {
            return res.status(400).json({ message: 'Invalid simulation parameters.' });
        }

        // 1. Calculate Emission Reduction
        const reductionTons = baselineEmissions * (projectedReductionPercentage / 100);
        const netEmissions = baselineEmissions - reductionTons;

        // 2. Calculate Tax Revenue (applied to remaining emissions above threshold)
        let totalTaxRevenue = 0;
        for (const rule of taxRules) {
            // Simplified logic: assume all net emissions are subject to the primary tax rule
            if (netEmissions > rule.thresholdTons) {
                const taxableEmissions = netEmissions - rule.thresholdTons;
                totalTaxRevenue += taxableEmissions * rule.ratePerTon;
            }
        }

        // 3. Calculate Incentives Distributed (based on reduction achieved)
        let totalIncentivesDistributed = 0;
        for (const rule of incentiveRules) {
            // Simplified logic: base incentive is $10 per ton reduced, multiplied by rule multiplier
            let incentive = reductionTons * 10 * rule.multiplier;
            if (incentive > rule.maxCap) {
                incentive = rule.maxCap;
            }
            totalIncentivesDistributed += incentive;
        }

        // 4. Calculate Financial Impact on Industries (Tax Paid - Incentives Received)
        const financialImpactOnIndustries = totalTaxRevenue - totalIncentivesDistributed;

        // 5. Environmental Benefit Score (0-100 based on reduction percentage)
        const environmentalBenefitScore = Math.min(100, projectedReductionPercentage * 1.2);

        const result = {
            totalTaxRevenue: parseFloat(totalTaxRevenue.toFixed(2)),
            netEmissionsAfterReduction: parseFloat(netEmissions.toFixed(2)),
            totalIncentivesDistributed: parseFloat(totalIncentivesDistributed.toFixed(2)),
            financialImpactOnIndustries: parseFloat(financialImpactOnIndustries.toFixed(2)),
            environmentalBenefitScore: parseFloat(environmentalBenefitScore.toFixed(1)),
        };

        // Save simulation run for historical tracking
        await prisma.simulationRun.create({
            data: {
                parameters: { baselineEmissions, projectedReductionPercentage, taxRules, incentiveRules },
                result,
            },
        });

        res.status(200).json(result);
    } catch (error) {
        console.error('Error running simulation:', error);
        res.status(500).json({ message: 'Simulation calculation failed.' });
    }
};

module.exports = { getRules, simulateImpact };
