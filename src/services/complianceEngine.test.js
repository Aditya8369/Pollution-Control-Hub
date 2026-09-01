import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
    downloadComplianceReport,
    generateComplianceReport,
    normaliseReport,
} from './complianceEngine';

vi.mock('../utils/downloadFile', () => ({
    downloadFile: vi.fn(() => true),
    safeFilenamePart: (part, fallback = 'report') => String(part ?? fallback),
}));

import { downloadFile } from '../utils/downloadFile';

/** A minimal `Response` stand-in — jsdom's fetch is replaced wholesale below. */
function jsonResponse(body, { ok = true, status = 200 } = {}) {
    return {
        ok,
        status,
        json: async () => body,
        blob: async () => new Blob([JSON.stringify(body)], { type: 'application/json' }),
    };
}

/** A failed response whose body is not JSON — a proxy error page, say. */
function htmlResponse(status = 502) {
    return {
        ok: false,
        status,
        json: async () => { throw new SyntaxError('Unexpected token \'<\', "<html>"... is not valid JSON'); },
        blob: async () => new Blob(['<html></html>'], { type: 'text/html' }),
    };
}

let fetchMock;

beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('normaliseReport', () => {
    it('gives a report with no exceedances key an empty list (#1138)', () => {
        // The shape a server reasonably returns for a compliant period.
        const result = normaliseReport({ id: 'RPT-1', standard: 'CPCB', totalExceedances: 0 });

        expect(result.exceedances).toEqual([]);
        expect(() => result.exceedances.length).not.toThrow();
    });

    it('replaces a non-array exceedances value rather than trusting it', () => {
        expect(normaliseReport({ exceedances: null }).exceedances).toEqual([]);
        expect(normaliseReport({ exceedances: 'none' }).exceedances).toEqual([]);
        expect(normaliseReport({ exceedances: { count: 0 } }).exceedances).toEqual([]);
    });

    it('leaves a real list of exceedances alone', () => {
        const exceedances = [{ pollutant: 'PM2.5', recordedValue: 91 }];
        expect(normaliseReport({ exceedances }).exceedances).toEqual(exceedances);
    });

    it('keeps the server total when it sent one', () => {
        // The list can be a truncated page of a larger total; the server's count wins.
        const result = normaliseReport({ totalExceedances: 240, exceedances: [{}, {}] });
        expect(result.totalExceedances).toBe(240);
    });

    it('derives the total from the list when the server sent none', () => {
        expect(normaliseReport({ exceedances: [{}, {}, {}] }).totalExceedances).toBe(3);
        expect(normaliseReport({}).totalExceedances).toBe(0);
    });

    it('passes the rest of the report through untouched', () => {
        const result = normaliseReport({ id: 'RPT-9', standard: 'WHO', startDate: '2026-01-01' });
        expect(result.id).toBe('RPT-9');
        expect(result.standard).toBe('WHO');
        expect(result.startDate).toBe('2026-01-01');
    });

    it('returns null for something that is not a report', () => {
        expect(normaliseReport(null)).toBeNull();
        expect(normaliseReport(undefined)).toBeNull();
        expect(normaliseReport('RPT-1')).toBeNull();
    });
});

describe('generateComplianceReport', () => {
    it('posts the range and standard', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ id: 'RPT-1', exceedances: [] }));

        await generateComplianceReport('2026-01-01', '2026-01-31', 'CPCB');

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toContain('/compliance/generate');
        expect(init.method).toBe('POST');
        expect(JSON.parse(init.body)).toEqual({
            startDate: '2026-01-01',
            endDate: '2026-01-31',
            standard: 'CPCB',
        });
    });

    it('normalises what it returns, so callers never meet a missing exceedances list', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ id: 'RPT-1', totalExceedances: 0 }));

        const report = await generateComplianceReport('2026-01-01', '2026-01-31', 'CPCB');
        expect(report.exceedances).toEqual([]);
    });

    it('sends the auth token when there is one', async () => {
        localStorage.setItem('token', 'tok-123');
        fetchMock.mockResolvedValue(jsonResponse({ id: 'RPT-1' }));

        await generateComplianceReport('2026-01-01', '2026-01-31', 'CPCB');
        expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok-123');
    });

    it('omits the auth header rather than sending "Bearer null"', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ id: 'RPT-1' }));

        await generateComplianceReport('2026-01-01', '2026-01-31', 'CPCB');
        expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    });

    it('does not throw a SecurityError when storage is blocked', async () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new DOMException('The operation is insecure.', 'SecurityError');
        });
        fetchMock.mockResolvedValue(jsonResponse({ id: 'RPT-1' }));

        await expect(generateComplianceReport('2026-01-01', '2026-01-31', 'CPCB')).resolves.toBeTruthy();
    });

    it("surfaces the server's message on a JSON error body", async () => {
        fetchMock.mockResolvedValue(jsonResponse({ message: 'No data for that period.' }, { ok: false, status: 422 }));

        await expect(generateComplianceReport('2026-01-01', '2026-01-31', 'CPCB'))
            .rejects.toThrow('No data for that period.');
    });

    it('falls back to a readable message on a non-JSON error body (#1138)', async () => {
        fetchMock.mockResolvedValue(htmlResponse(502));

        // The old code called response.json() unguarded, so the user was shown
        // `SyntaxError: Unexpected token '<'` instead of the fallback on the next line.
        await expect(generateComplianceReport('2026-01-01', '2026-01-31', 'CPCB'))
            .rejects.toThrow('Failed to generate report (HTTP 502)');
    });

    it('falls back when the JSON error body has no message', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ code: 'E_NO_DATA' }, { ok: false, status: 500 }));

        await expect(generateComplianceReport('2026-01-01', '2026-01-31', 'CPCB'))
            .rejects.toThrow('Failed to generate report (HTTP 500)');
    });

    it('passes an abort signal through to fetch', async () => {
        const controller = new AbortController();
        fetchMock.mockResolvedValue(jsonResponse({ id: 'RPT-1' }));

        await generateComplianceReport('2026-01-01', '2026-01-31', 'CPCB', controller.signal);
        expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
    });
});

describe('downloadComplianceReport', () => {
    it('hands the blob to the shared download helper', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ id: 'RPT-1' }));

        await downloadComplianceReport('RPT-1', 'json');

        expect(downloadFile).toHaveBeenCalledTimes(1);
        const [, , filename] = downloadFile.mock.calls[0];
        expect(filename).toBe('compliance_report_RPT-1.json');
    });

    it('encodes the report id and format into the URL', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ id: 'a/b' }));

        await downloadComplianceReport('a/b', 'csv');
        expect(fetchMock.mock.calls[0][0]).toContain('/compliance/a%2Fb/download?format=csv');
    });

    it('reports a failed download with a readable message', async () => {
        fetchMock.mockResolvedValue(htmlResponse(404));

        await expect(downloadComplianceReport('RPT-1', 'csv'))
            .rejects.toThrow('Failed to download report (HTTP 404)');
        expect(downloadFile).not.toHaveBeenCalled();
    });
});
