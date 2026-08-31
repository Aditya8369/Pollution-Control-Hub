const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAuthenticatedUser = (req) => {
    const user = req.user || req.session?.user || {};
    return {
        id: user.id || 'mock_user_123',
        name: user.name || 'Test User',
        tenantId: user.tenantId || req.query?.tenant_id || req.body?.tenant_id || null,
        teamId: user.teamId || req.query?.team_id || req.body?.team_id || null,
    };
};

const authenticateToken = (req, res, next) => {
    req.user = getAuthenticatedUser(req);
    next();
};

const normalizeScope = (req) => {
    const scope = String(req.query?.scope || req.body?.scope || 'global').toLowerCase();
    const tenantId = req.query?.tenant_id || req.body?.tenant_id || req.user?.tenantId || null;
    const teamId = req.query?.team_id || req.body?.team_id || req.user?.teamId || null;
    return { scope, tenantId, teamId };
};

const getMockLeaderboard = ({ scope, tenantId, teamId }) => {
    const rows = [
        { userId: 'u-101', name: 'Ava', tenantId: 'tenant-alpha', teamId: 'team-operations', score: 1280 },
        { userId: 'u-102', name: 'Leo', tenantId: 'tenant-alpha', teamId: 'team-operations', score: 1100 },
        { userId: 'u-103', name: 'Mila', tenantId: 'tenant-alpha', teamId: 'team-water', score: 980 },
        { userId: 'u-104', name: 'Noah', tenantId: 'tenant-beta', teamId: 'team-transport', score: 1420 },
        { userId: 'u-105', name: 'Iris', tenantId: 'tenant-beta', teamId: 'team-transport', score: 1190 },
        { userId: 'u-106', name: 'Zoe', tenantId: null, teamId: null, score: 960 },
    ];

    return rows.filter((row) => {
        if (scope === 'tenant') return row.tenantId === tenantId;
        if (scope === 'team') return row.tenantId === tenantId && row.teamId === teamId;
        return row.tenantId === null || row.tenantId !== tenantId;
    }).sort((a, b) => b.score - a.score);
};

/**
 * @route GET /api/challenges/active
 * @desc Get all active challenges and user progress for the current scope.
 * @access Private
 */
router.get('/active', authenticateToken, async (req, res) => {
    try {
        const user = getAuthenticatedUser(req);
        const { scope, tenantId, teamId } = normalizeScope(req);
        const now = new Date();

        const where = {
            isActive: true,
            startDate: { lte: now },
            endDate: { gte: now },
            ...(scope === 'tenant' && tenantId ? { tenantId } : {}),
            ...(scope === 'team' && tenantId && teamId ? { tenantId, teamId } : {}),
        };

        const challenges = await prisma.challenge.findMany({
            where,
            orderBy: { endDate: 'asc' },
        });

        const userProgress = await prisma.userChallengeProgress.findMany({
            where: { userId: user.id, ...(tenantId ? { tenantId } : {}), ...(teamId ? { teamId } : {}) },
        });

        const progressMap = {};
        userProgress.forEach((p) => {
            progressMap[p.challengeId] = p;
        });

        const teamLeaderboard = getMockLeaderboard({ scope: scope === 'team' ? 'team' : 'tenant', tenantId, teamId });
        const totalPointsEarned = teamLeaderboard.reduce((sum, user) => sum + user.score, 0) / Math.max(teamLeaderboard.length, 1);

        res.status(200).json({
            scope,
            tenantId,
            teamId,
            challenges,
            userProgress: progressMap,
            totalPointsEarned: Math.round(totalPointsEarned),
            leaderboard: getMockLeaderboard({ scope, tenantId, teamId }),
            teamSummary: scope === 'team' ? { teamId, tenantId, totalImpact: totalPointsEarned, members: teamLeaderboard.length } : null,
        });
    } catch (error) {
        console.error('Error fetching challenges:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @route GET /api/challenges/leaderboard
 * @desc Fetch challenge leaderboard with global, tenant, or team filtering.
 * @access Private
 */
router.get('/leaderboard', authenticateToken, async (req, res) => {
    try {
        const { scope, tenantId, teamId } = normalizeScope(req);

        if (scope === 'tenant' && !tenantId) {
            return res.status(400).json({ message: 'tenant_id is required when scope=tenant.' });
        }

        if (scope === 'team' && (!tenantId || !teamId)) {
            return res.status(400).json({ message: 'tenant_id and team_id are required when scope=team.' });
        }

        const leaderboard = getMockLeaderboard({ scope, tenantId, teamId });
        res.status(200).json({
            scope,
            tenantId,
            teamId,
            leaderboard,
        });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @route POST /api/challenges/teams
 * @desc Create or join a team within the authenticated tenant.
 * @access Private
 */
router.post('/teams', authenticateToken, async (req, res) => {
    try {
        const user = getAuthenticatedUser(req);
        const tenantId = req.body?.tenant_id || req.body?.tenantId || user.tenantId || null;
        const teamName = req.body?.name || req.body?.teamName || 'Eco Team';

        if (!tenantId) {
            return res.status(400).json({ message: 'tenant_id is required to create or join a team.' });
        }

        const team = {
            id: req.body?.team_id || req.body?.teamId || `team_${Date.now()}`,
            name: teamName,
            tenantId,
            members: [user.id],
        };

        res.status(201).json(team);
    } catch (error) {
        console.error('Error creating team:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @route GET /api/challenges/leaderboard/team
 * @desc Aggregate impact by team within an organization.
 * @access Private
 */
router.get('/leaderboard/team', authenticateToken, async (req, res) => {
    try {
        const { tenantId, teamId } = normalizeScope(req);

        if (!tenantId) {
            return res.status(400).json({ message: 'tenant_id is required.' });
        }

        const leaderboard = getMockLeaderboard({ scope: 'tenant', tenantId, teamId });
        const teamSummary = leaderboard.reduce((acc, row) => {
            const key = row.teamId || 'individual';
            acc[key] = (acc[key] || 0) + row.score;
            return acc;
        }, {});

        const rows = Object.entries(teamSummary)
            .map(([teamSlug, score]) => ({ teamId: teamSlug, tenantId, score }))
            .sort((a, b) => b.score - a.score);

        res.status(200).json({
            tenantId,
            teamId,
            leaderboard: rows,
            totalTeams: rows.length,
        });
    } catch (error) {
        console.error('Error fetching team leaderboard:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @route POST /api/challenges/:id/join
 * @desc Join a specific challenge
 * @access Private
 */
router.post('/:id/join', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const user = getAuthenticatedUser(req);
        const tenantId = req.body?.tenant_id || req.body?.tenantId || user.tenantId || null;
        const teamId = req.body?.team_id || req.body?.teamId || user.teamId || null;

        const existing = await prisma.userChallengeProgress.findUnique({
            where: { userId_challengeId: { userId: user.id, challengeId: id } },
        });

        if (existing) {
            return res.status(400).json({ message: 'Already participating in this challenge.' });
        }

        const progress = await prisma.userChallengeProgress.create({
            data: {
                userId: user.id,
                challengeId: id,
                tenantId,
                teamId,
                progress: 0,
                isCompleted: false,
                rewardClaimed: false,
            },
        });

        res.status(201).json(progress);
    } catch (error) {
        console.error('Error joining challenge:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @route POST /api/challenges/:id/claim
 * @desc Claim reward for a completed challenge
 * @access Private
 */
router.post('/:id/claim', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const user = getAuthenticatedUser(req);

        const progress = await prisma.userChallengeProgress.findUnique({
            where: { userId_challengeId: { userId: user.id, challengeId: id } },
            include: { challenge: true },
        });

        if (!progress) {
            return res.status(404).json({ message: 'Challenge participation not found.' });
        }

        if (!progress.isCompleted) {
            return res.status(400).json({ message: 'Challenge not yet completed.' });
        }

        if (progress.rewardClaimed) {
            return res.status(400).json({ message: 'Reward already claimed.' });
        }

        const updatedProgress = await prisma.userChallengeProgress.update({
            where: { userId_challengeId: { userId: user.id, challengeId: id } },
            data: { rewardClaimed: true },
        });

        res.status(200).json({
            message: 'Reward claimed successfully!',
            progress: updatedProgress,
            pointsAwarded: progress.challenge?.rewardValue ?? 0,
        });
    } catch (error) {
        console.error('Error claiming reward:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
