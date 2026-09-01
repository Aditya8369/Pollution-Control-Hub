/**
 * @fileoverview Core logic for aggregating data and evaluating against regulatory thresholds.
 */

import { downloadFile } from '../utils/downloadFile';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * The token the compliance endpoints authenticate with.
 *
 * Blocked site data makes the `localStorage` property access itself throw, and an
 * unauthenticated request that comes back 401 is a far better failure than a
 * `SecurityError` thrown out of a service call.
 *
 * @returns {string|null}
 */
function readToken() {
    try {
        return localStorage.getItem('token');
    } catch {
        return null;
    }
}

/** @returns {Record<string, string>} */
function authHeaders() {
    const token = readToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * The message to show for a failed response.
 *
 * `await response.json()` throws on a body that is not JSON, and a proxy's 502, a 413, an
 * HTML error page and an empty 500 body are all not JSON. The old code called it
 * unguarded, so the `|| 'Failed to generate report'` fallback on the very next line could
 * never run — the line before it was what threw, and the user was shown
 * `SyntaxError: Unexpected token '<', "<html>"...` instead.
 *
 * @param {Response} response
 * @param {string} fallback
 * @returns {Promise<string>}
 */
async function describeFailure(response, fallback) {
    try {
        const body = await response.json();
        if (body && typeof body.message === 'string' && body.message.trim() !== '') {
            return body.message;
        }
    } catch {
        // Not JSON, or an empty body. The status line is all there is to go on.
    }

    return response.status ? `${fallback} (HTTP ${response.status})` : fallback;
}

/**
 * The report shape the UI can rely on.
 *
 * `exceedances` is optional over the wire — a compliant period is reasonably reported as
 * `{ totalExceedances: 0 }` with no list at all — and both the table and the CSV exporter
 * read it unguarded. That made "nothing breached", the outcome the feature exists to
 * report, the one that crashed the panel with
 * `TypeError: Cannot read properties of undefined (reading 'length')`.
 *
 * @param {any} report
 * @returns {any} The same report with `exceedances` guaranteed to be an array.
 */
export function normaliseReport(report) {
    if (!report || typeof report !== 'object') return null;

    const exceedances = Array.isArray(report.exceedances) ? report.exceedances : [];
    return {
        ...report,
        exceedances,
        // Trust the server's count when it sent one; otherwise the list is the count.
        totalExceedances:
            typeof report.totalExceedances === 'number' ? report.totalExceedances : exceedances.length,
    };
}

/**
 * Generates a compliance report for a specific date range and standard.
 * @param {string} startDate - ISO start date.
 * @param {string} endDate - ISO end date.
 * @param {string} standard - Regulatory standard (CPCB, EPA, WHO).
 * @param {AbortSignal} [signal]
 * @returns {Promise<ComplianceReport>}
 */
export const generateComplianceReport = async (startDate, endDate, standard, signal) => {
    const response = await fetch(`${API_BASE}/compliance/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: JSON.stringify({ startDate, endDate, standard }),
        signal,
    });

    if (!response.ok) {
        throw new Error(await describeFailure(response, 'Failed to generate report'));
    }

    return normaliseReport(await response.json());
};

/**
 * Downloads a generated report in the specified format.
 * @param {string} reportId - The ID of the generated report.
 * @param {string} format - 'csv' or 'json'.
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>}
 */
export const downloadComplianceReport = async (reportId, format, signal) => {
    const response = await fetch(
        `${API_BASE}/compliance/${encodeURIComponent(reportId)}/download?format=${encodeURIComponent(format)}`,
        {
            method: 'GET',
            headers: authHeaders(),
            signal,
        }
    );

    if (!response.ok) {
        throw new Error(await describeFailure(response, 'Failed to download report'));
    }

    const blob = await response.blob();
    downloadFile(blob, blob.type, `compliance_report_${reportId}.${format}`);
};
