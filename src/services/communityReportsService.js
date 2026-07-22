const API_BASE = "/api/community/reports";

const LEGACY_STORAGE_KEY = "pollution-community-reports";
const MIGRATION_FLAG_KEY = "pollution-community-migration-decision";

export async function fetchReports() {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error(`Failed to fetch community reports (${res.status})`);
  return res.json();
}

export async function createReport(report) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
  if (!res.ok) throw new Error(`Failed to create community report (${res.status})`);
  return res.json();
}

export async function voteOnReport(id) {
  const res = await fetch(`${API_BASE}/${id}/vote`, { method: "PATCH" });
  if (!res.ok) throw new Error(`Failed to vote on report ${id} (${res.status})`);
  return res.json();
}

export async function updateReportStatus(id, status) {
  const res = await fetch(`${API_BASE}/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`Failed to update status for report ${id} (${res.status})`);
  return res.json();
}

/**
 * Reads any reports left over from the old localStorage-only version of this
 * feature. Returns [] if there are none, or if migration has already been
 * decided (accepted or declined) for this browser.
 */
export function readPendingLegacyReports() {
  if (localStorage.getItem(MIGRATION_FLAG_KEY)) return [];

  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * One-time, opt-in migration of legacy localStorage reports to the shared
 * backend. Must only be called after the user has explicitly consented —
 * this flips previously browser-private data to being visible to every user
 * hitting the same backend, so it is never triggered silently.
 *
 * POSTs are idempotent (server does INSERT OR IGNORE on the report id), so
 * calling this twice for the same reports is safe and won't duplicate them.
 */
export async function migrateLegacyReports(reports) {
  for (const report of reports) {
    await createReport(report);
  }
  markMigrationDecided();
}

/**
 * Records that the user has made a migration decision (accept or decline) so
 * we never show the consent prompt again in this browser, and stop treating
 * localStorage as a source of truth going forward either way.
 */
export function markMigrationDecided() {
  localStorage.setItem(MIGRATION_FLAG_KEY, new Date().toISOString());
}
