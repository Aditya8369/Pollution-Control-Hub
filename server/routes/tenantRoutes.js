const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken, requireTenantAdmin } = require('../authMiddleware');

const tenantCustomChallenges = globalThis.__tenantCustomChallenges || (globalThis.__tenantCustomChallenges = {});

const ensureTenantChallengeStore = (tenantId) => {
    if (!tenantCustomChallenges[tenantId]) {
        tenantCustomChallenges[tenantId] = [];
    }
    return tenantCustomChallenges[tenantId];
};

/**
 * @route GET /api/tenants
 * @desc Get all tenants for the authenticated user
 * @access Private
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const memberships = await prisma.tenantMember.findMany({
            where: { userId: req.user.id },
            include: {
                tenant: true,
            },
        });

        const tenants = memberships.map(m => ({
            ...m.tenant,
            userRole: m.role,
        }));

        res.status(200).json(tenants);
    } catch (error) {
        console.error('Error fetching tenants:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @route GET /api/tenants/:id/challenges
 * @desc Get custom tenant-owned challenges.
 * @access Private
 */
router.get('/:id/challenges', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const challenges = ensureTenantChallengeStore(id);
        res.status(200).json(challenges);
    } catch (error) {
        console.error('Error fetching tenant challenges:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @route POST /api/tenants/:tenantId/challenges
 * @desc Create a new tenant-owned custom challenge.
 * @access Private / Tenant Admin
 */
router.post('/:tenantId/challenges', authenticateToken, requireTenantAdmin, async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { title, description, category, targetValue, unit, rewardValue, badgeName, verificationType, startDate, endDate, isGlobal } = req.body;

        if (!title || !description || !category || !targetValue) {
            return res.status(400).json({ message: 'title, description, category, and targetValue are required.' });
        }

        const challenge = {
            id: `tenant_challenge_${Date.now()}`,
            tenant_id: tenantId,
            created_by: req.user.id,
            title,
            description,
            category,
            targetValue,
            unit: unit || 'actions',
            rewardValue: rewardValue || 0,
            badgeName: badgeName || null,
            verification_type: verificationType || 'manual',
            start_date: startDate || new Date().toISOString(),
            end_date: endDate || new Date(Date.now() + 86400000).toISOString(),
            is_global: Boolean(isGlobal !== undefined ? isGlobal : false),
            isActive: true,
            isOrganizationExclusive: true,
            createdAt: new Date().toISOString(),
        };

        ensureTenantChallengeStore(tenantId).push(challenge);
        res.status(201).json(challenge);
    } catch (error) {
        console.error('Error creating tenant challenge:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @route PUT /api/tenants/:tenantId/challenges/:challengeId
 * @desc Update a tenant-owned custom challenge.
 * @access Private / Tenant Admin
 */
router.put('/:tenantId/challenges/:challengeId', authenticateToken, requireTenantAdmin, async (req, res) => {
    try {
        const { tenantId, challengeId } = req.params;
        const challenges = ensureTenantChallengeStore(tenantId);
        const index = challenges.findIndex((challenge) => challenge.id === challengeId);

        if (index === -1) {
            return res.status(404).json({ message: 'Custom challenge not found.' });
        }

        const updated = {
            ...challenges[index],
            ...req.body,
            tenant_id: tenantId,
            created_by: challenges[index].created_by || req.user.id,
            verification_type: req.body.verificationType || req.body.verification_type || challenges[index].verification_type || 'manual',
            is_global: req.body.isGlobal !== undefined ? Boolean(req.body.isGlobal) : Boolean(challenges[index].is_global),
        };

        challenges[index] = updated;
        res.status(200).json(updated);
    } catch (error) {
        console.error('Error updating tenant challenge:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @route DELETE /api/tenants/:tenantId/challenges/:challengeId
 * @desc Delete or archive a tenant-owned custom challenge.
 * @access Private / Tenant Admin
 */
router.delete('/:tenantId/challenges/:challengeId', authenticateToken, requireTenantAdmin, async (req, res) => {
    try {
        const { tenantId, challengeId } = req.params;
        const challenges = ensureTenantChallengeStore(tenantId);
        const index = challenges.findIndex((challenge) => challenge.id === challengeId);

        if (index === -1) {
            return res.status(404).json({ message: 'Custom challenge not found.' });
        }

        challenges.splice(index, 1);
        res.status(200).json({ message: 'Custom challenge deleted successfully.' });
    } catch (error) {
        console.error('Error deleting tenant challenge:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @route PATCH /api/tenants/:id/settings
 * @desc Update tenant settings (Requires ADMIN or MANAGER role)
 * @access Private
 */
router.patch('/:id/settings', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { settings } = req.body;

        const membership = await prisma.tenantMember.findFirst({
            where: { tenantId: id, userId: req.user.id },
        });

        if (!membership || !['ADMIN', 'MANAGER', 'TENANT_ADMIN'].includes(membership.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const currentTenant = await prisma.tenant.findUnique({ where: { id } });
        const updatedTenant = await prisma.tenant.update({
            where: { id },
            data: {
                settings: {
                    ...(currentTenant?.settings || {}),
                    ...settings
                }
            },
        });

        res.status(200).json(updatedTenant);
    } catch (error) {
        console.error('Error updating tenant settings:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @route POST /api/tenants/:id/members
 * @desc Invite a new member to the tenant
 * @access Private (ADMIN only)
 */
router.post('/:id/members', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { email, role } = req.body;

        const membership = await prisma.tenantMember.findFirst({
            where: { tenantId: id, userId: req.user.id },
        });

        if (!membership || !['ADMIN', 'TENANT_ADMIN'].includes(membership.role)) {
            return res.status(403).json({ message: 'Only admins can invite members' });
        }

        const mockUserId = `user_${String(email || 'member').replace(/[^a-zA-Z0-9]/g, '')}`;

        const newMember = await prisma.tenantMember.create({
            data: {
                tenantId: id,
                userId: mockUserId,
                userEmail: email,
                role: role || 'MEMBER',
            },
            include: {
                tenant: { select: { name: true } }
            }
        });

        res.status(201).json(newMember);
    } catch (error) {
        console.error('Error inviting member:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
