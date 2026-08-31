import { getKeyRecord } from "./apiKeys.js";

export function authenticateToken(req, res, next) {
    if (req.user) {
        return next();
    }

    req.user = {
        id: 'mock_user_123',
        name: 'Test User',
        role: 'TENANT_ADMIN',
        tenantId: req.query?.tenant_id || req.body?.tenant_id || 'tenant-1',
    };
    next();
}

export function requireTenantAdmin(req, res, next) {
    const role = String(req.user?.role || req.user?.userRole || '').toLowerCase();
    const isAdmin = role === 'tenant_admin' || role === 'admin' || role === 'administrator';

    if (!isAdmin) {
        return res.status(403).json({
            message: 'Only tenant administrators can manage custom challenges.',
        });
    }

    const tenantId = req.params?.tenantId || req.body?.tenant_id || req.user?.tenantId;
    if (tenantId && req.user?.tenantId && tenantId !== req.user.tenantId) {
        return res.status(403).json({
            message: 'Tenant mismatch: custom challenge actions are restricted to the active tenant.',
        });
    }

    next();
}

/**
 * Reads the `x-api-key` header, resolves it to a key record, and attaches
 * the record to `req.apiKey`. Rejects the request with 401 if the key is
 * missing or unrecognized. Must run before `enforceReadOnly`.
 */
export function requireApiKey(req, res, next) {
    const key = req.header("x-api-key");
    if (!key) {
        return res.status(401).json({ error: "Missing x-api-key header." });
    }

    const record = getKeyRecord(key);
    if (!record) {
        return res.status(401).json({ error: "Invalid API key." });
    }

    req.apiKey = record;
    next();
}

// Requests that only read data — a read-only key may make these.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Blocks any non-GET/HEAD/OPTIONS request when the authenticated key's role
 * is 'read-only'. Must run after `requireApiKey`, on routes that mutate data.
 */
export function enforceReadOnly(req, res, next) {
    if (SAFE_METHODS.has(req.method)) {
        return next();
    }

    if (req.apiKey?.role === "read-only") {
        return res.status(403).json({
            error: "This API key is read-only and cannot perform write operations.",
            method: req.method,
            path: req.originalUrl,
        });
    }

    next();
}