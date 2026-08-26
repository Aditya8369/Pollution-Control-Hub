/**
 * @fileoverview Core logic for aggregating data and evaluating against regulatory thresholds.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Generates a compliance report for a specific date range and standard.
 * @param {string} startDate - ISO start date.
 * @param {string} endDate - ISO end date.
 * @param {string} standard - Regulatory standard (CPCB, EPA, WHO).
 * @returns {Promise<ComplianceReport>}
 */
export const generateComplianceReport = async (startDate, endDate, standard) => {
    const response = await fetch(`${API_BASE}/compliance/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ startDate, endDate, standard }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate report');
    }
    return response.json();
};

/**
 * Downloads a generated report in the specified format.
 * @param {string} reportId - The ID of the generated report.
 * @param {string} format - 'csv' or 'json'.
 */
export const downloadComplianceReport = async (reportId, format) => {
    const response = await fetch(`${API_BASE}/compliance/${reportId}/download?format=${format}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    });

    if (!response.ok) throw new Error('Failed to download report');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance_report_${reportId}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};
