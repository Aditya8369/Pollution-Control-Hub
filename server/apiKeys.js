// In-memory API key store.
//
// There is no database in this project's backend yet, so keys live in
// memory and reset on server restart. Two demo keys are seeded below so the
// read-only enforcement below is testable immediately, without needing a
// key-issuing endpoint first. Swap `keys` for a real persistence layer when
// one exists — the shape (id, key, role, createdAt) is designed to map
// directly onto a database row.

import crypto from "node:crypto";

/** @typedef {'read-only' | 'read-write'} ApiKeyRole */

/**
 * @typedef {Object} ApiKeyRecord
 * @property {string} id
 * @property {string} key
 * @property {ApiKeyRole} role
 * @property {string} label - Human-readable name for who/what the key is for.
 * @property {string} createdAt - ISO timestamp.
 */

/** @type {Map<string, ApiKeyRecord>} */
const keys = new Map();

function generateKey() {
    return `pch_${crypto.randomBytes(24).toString("hex")}`;
}

/**
 * Creates a new API key record with the given role.
 *
 * @param {ApiKeyRole} role
 * @param {string} [label]
 * @returns {ApiKeyRecord}
 */
export function createApiKey(role, label = "unnamed") {
    if (role !== "read-only" && role !== "read-write") {
        throw new Error(`Invalid API key role: ${role}`);
    }
    const record = {
        id: crypto.randomUUID(),
        key: generateKey(),
        role,
        label,
        createdAt: new Date().toISOString(),
    };
    keys.set(record.key, record);
    return record;
}

/**
 * Looks up an API key record by its raw key string.
 *
 * @param {string} key
 * @returns {ApiKeyRecord | undefined}
 */
export function getKeyRecord(key) {
    return keys.get(key);
}

// Demo seed keys — for local testing and for the examples in
// docs/API_GUIDE.md. Replace with a real issuance flow before any real
// external service depends on this.
export const SEED_READ_ONLY_KEY = createApiKey("read-only", "demo-read-only");
export const SEED_READ_WRITE_KEY = createApiKey("read-write", "demo-read-write");