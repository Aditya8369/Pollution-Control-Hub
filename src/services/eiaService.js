/**
 * @fileoverview Frontend service for triggering report generation, tracking progress, and downloading the compiled document.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Triggers the generation of a new EIA baseline report.
 * @param {import('../types/eia').EiaProjectRequest} request - The project parameters.
 * @returns {Promise<import('../types/eia').EiaReportRecord>}
 */
export const generateEiaReport = async (request) => {
    const response = await fetch(`${API_BASE}/eia/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to trigger EIA report generation.');
    }

    return response.json();
};

/**
 * Fetches the status and details of a specific EIA report.
 * @param {string} reportId - The ID of the report.
 * @returns {Promise<import('../types/eia').EiaReportRecord>}
 */
export const fetchEiaReportStatus = async (reportId) => {
    const response = await fetch(`${API_BASE}/eia/reports/${reportId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch EIA report status.');
    }

    return response.json();
};

/**
 * Downloads the generated EIA report in the specified format.
 * @param {string} reportId - The ID of the report.
 * @param {string} format - 'json' or 'csv'.
 */
export const downloadEiaReport = async (reportId, format) => {
    const response = await fetch(`${API_BASE}/eia/reports/${reportId}/download?format=${format}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to download EIA report.');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EIA_Baseline_Report_${reportId}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};
