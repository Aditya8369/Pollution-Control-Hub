const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mock auth middleware for demonstration
const authenticateToken = (req, res, next) => {
    req.user = { id: 'mock_user_123', name: 'Test User' };
    next();
};

/**
 * @route GET /api/challenges/active
 * @desc Get all active challenges and user progress
 * @access Private
 */
router.get('/active', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();

        const challenges = await prisma.challenge.findMany({
            where: {
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: now },
            },
            orderBy: { endDate: 'asc' },
        });

        const userProgress = await prisma.userChallengeProgress.findMany({
            where: { userId },
        });

        const progressMap = {};
        userProgress.forEach(p => {
            progressMap[p.challengeId] = p;
        });

        // Mock total points
        const totalPointsEarned = 1250;

        res.status(200).json({
            challenges,
            userProgress: progressMap,
            totalPointsEarned,
        });
    } catch (error) {
        console.error('Error fetching challenges:', error);
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
        const userId = req.user.id;

        const existing = await prisma.userChallengeProgress.findUnique({
            where: { userId_challengeId: { userId, challengeId: id } },
        });

        if (existing) {
            return res.status(400).json({ message: 'Already participating in this challenge.' });
        }

        const progress = await prisma.userChallengeProgress.create({
            data: {
                userId,
                challengeId: id,
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
        const userId = req.user.id;

        const progress = await prisma.userChallengeProgress.findUnique({
            where: { userId_challengeId: { userId, challengeId: id } },
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

        // Update progress to mark reward as claimed
        const updatedProgress = await prisma.userChallengeProgress.update({
            where: { userId_challengeId: { userId, challengeId: id } },
            data: { rewardClaimed: true },
        });

        // Mock updating user reputation/points
        // await prisma.user.update({ where: { id: userId }, data: { points: { increment: progress.challenge.rewardValue } } });

        res.status(200).json({
            message: 'Reward claimed successfully!',
            progress: updatedProgress,
            pointsAwarded: progress.challenge.rewardValue,
        });
    } catch (error) {
        console.error('Error claiming reward:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
