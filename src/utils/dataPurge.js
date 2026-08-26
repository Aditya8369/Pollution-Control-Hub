import { logger } from './logger';

/**
 * Client-side scheduled data purge (#753).
 *
 * There is no server/DB/cron in this app — all "rows" the issue refers to live in
 * localStorage. This is the browser equivalent: a pure date-boundary check (unit
 * testable without touching localStorage or timers), a per-store purge built on it,
 * and a runner that sweeps every known store and logs the outcome.
 */

export const PURGE_MAX_AGE_DAYS = 90;

const log = logger.child({ module: 'dataPurge' });

/**
 * Whether a record's timestamp falls outside the retention window.
 *
 * @param {string|undefined|null} timestamp - ISO 8601 string, or any Date-parseable value.
 * @param {number} [now] - Epoch ms treated as "now".
 * @param {number} [maxAgeDays] - Retention window in days.
 * @returns {boolean} True when the record should be purged.
 */
export function isStale(timestamp, now = Date.now(), maxAgeDays = PURGE_MAX_AGE_DAYS) {
    const at = Date.parse(timestamp);
    if (Number.isNaN(at)) return false; // Unparseable/missing timestamp — never purge blind.
    const ageMs = now - at;
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    return ageMs > maxAgeMs;
}

/**
 * Filters stale records out of a list.
 *
 * @param {any[]} records
 * @param {(record: any) => string} getTimestamp - Reads a record's timestamp field.
 * @param {number} [now]
 * @param {number} [maxAgeDays]
 * @returns {{kept: any[], removedCount: number}}
 */
export function purgeStaleRecords(records, getTimestamp, now = Date.now(), maxAgeDays = PURGE_MAX_AGE_DAYS) {
    if (!Array.isArray(records)) return { kept: [], removedCount: 0 };

    const kept = records.filter((record) => !isStale(getTimestamp(record), now, maxAgeDays));
    return { kept, removedCount: records.length - kept.length };
}

/**
 * A localStorage store this purge sweeps, and how to read its timestamp.
 * @typedef {{key: string, getTimestamp: (record: any) => string}} PurgeTarget
 */

/** @type {PurgeTarget[]} */
export const PURGE_TARGETS = [
    { key: 'pollution-community-reports', getTimestamp: (r) => r?.createdAt },
    { key: 'pollution-symptom-reports', getTimestamp: (r) => r?.timestamp },
    { key: 'aqi-alert-history', getTimestamp: (r) => r?.at },
];

/**
 * Sweeps every known store, removing records older than the retention window,
 * and logs the outcome.
 *
 * @param {number} [now]
 * @param {number} [maxAgeDays]
 * @returns {{key: string, removedCount: number}[]} Per-store results.
 */
export function runScheduledPurge(now = Date.now(), maxAgeDays = PURGE_MAX_AGE_DAYS) {
    const results = [];

    for (const target of PURGE_TARGETS) {
        let removedCount = 0;
        try {
            const raw = localStorage.getItem(target.key);
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) {
                const { kept, removedCount: removed } = purgeStaleRecords(
                    parsed,
                    target.getTimestamp,
                    now,
                    maxAgeDays
                );
                removedCount = removed;
                if (removed > 0) {
                    localStorage.setItem(target.key, JSON.stringify(kept));
                }
            }
        } catch (error) {
            log.warn('Purge failed for store', { key: target.key, error });
        }
        results.push({ key: target.key, removedCount });
    }

    const totalRemoved = results.reduce((sum, r) => sum + r.removedCount, 0);
    log.info('Scheduled data purge complete', { maxAgeDays, totalRemoved, results });

    return results;
}

/**
 * Runs the purge once immediately, then on a recurring 24h interval — the
 * client-side stand-in for a cron job in a codebase with no backend.
 *
 * @returns {() => void} Call to stop the recurring purge.
 */
export function scheduleDataPurge() {
    runScheduledPurge();
    const intervalId = setInterval(() => runScheduledPurge(), 24 * 60 * 60 * 1000);
    return () => clearInterval(intervalId);
}