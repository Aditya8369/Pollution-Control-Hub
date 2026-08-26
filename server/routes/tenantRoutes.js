const express = require('express');
const router = express.Router();
// Assuming authMiddleware verifies JWT and attaches req.user
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
 * @route PATCH /api/tenants/:id/settings
 * @desc Update tenant settings (Requires ADMIN or MANAGER role)
 * @access Private
 */
router.patch('/:id/settings', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { settings } = req.body;

        // Verify user has permission
        const membership = await prisma.tenantMember.findFirst({
            where: { tenantId: id, userId: req.user.id },
        });

        if (!membership || !['ADMIN', 'MANAGER'].includes(membership.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const updatedTenant = await prisma.tenant.update({
            where: { id },
            data: {
                settings: {
                    ...((await prisma.tenant.findUnique({ where: { id } })).settings || {}),
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

        if (!membership || membership.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only admins can invite members' });
        }

        // In a real app, find user by email or create invitation record
        const mockUserId = `user_${email.replace(/[^a-zA-Z0-9]/g, '')}`;

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
