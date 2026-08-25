// File Location: server/api-server.js
//
// Minimal backend for Pollution Control Hub. It currently exists to
// demonstrate the read-only API key system (issue #752) — /api/reports is a
// stand-in mutating resource showing the enforcement end-to-end. This is not
// wired into the Vite frontend; run it separately with `npm run api-server`.
// See docs/API_GUIDE.md for usage.

import express from "express";
import helmet from "helmet";
import { requireApiKey, enforceReadOnly } from "./authMiddleware.js";
import { SEED_READ_ONLY_KEY, SEED_READ_WRITE_KEY } from "./apiKeys.js";

const app = express();

// Configure Content Security Policy (CSP) via Helmet
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
            fontSrc: ["'self'", "fonts.gstatic.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
        },
    })
);

app.use(express.json());

// Unauthenticated liveness check.
app.get("/", (req, res) => {
    res.send("Pollution Control Hub API running securely.");
});

// Everything under /api requires a valid key from here on.
app.use("/api", requireApiKey);

// Lets a caller check their own key's role before attempting a write.
app.get("/api/keys/me", (req, res) => {
    res.json({ role: req.apiKey.role, label: req.apiKey.label });
});

// In-memory demo "community reports" resource, standing in for a real
// mutating resource so read-only enforcement has something concrete to guard.
const reports = [];

app.get("/api/reports", (req, res) => {
    res.json({ reports });
});

// Mutating route — protected by enforceReadOnly. A read-only key gets 403.
app.post("/api/reports", enforceReadOnly, (req, res) => {
    const { message, latitude, longitude } = req.body || {};
    if (!message) {
        return res.status(400).json({ error: "message is required." });
    }
    const report = {
        id: reports.length + 1,
        message,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        createdAt: new Date().toISOString(),
    };
    reports.push(report);
    res.status(201).json(report);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
    console.log(`Demo read-only key:  ${SEED_READ_ONLY_KEY.key}`);
    console.log(`Demo read-write key: ${SEED_READ_WRITE_KEY.key}`);
});

export default app;