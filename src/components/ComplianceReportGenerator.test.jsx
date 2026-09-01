import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import ComplianceReportGenerator, {
    describeRangeProblem,
    reportFilename,
} from './ComplianceReportGenerator';

vi.mock('../services/complianceEngine', async () => {
    // normaliseReport is the real thing — the component's guarantee about `exceedances`
    // comes from it, and stubbing it would test nothing.
    const actual = await vi.importActual('../services/complianceEngine');
    return {
        normaliseReport: actual.normaliseReport,
        generateComplianceReport: vi.fn(),
        downloadComplianceReport: vi.fn(),
    };
});

vi.mock('../utils/downloadFile', () => ({
    downloadFile: vi.fn(() => true),
    safeFilenamePart: (part, fallback = 'report') => {
        const text = String(part ?? '').trim().replace(/[^A-Za-z0-9._-]+/g, '-');
        return text === '' ? fallback : text;
    },
}));

import { generateComplianceReport } from '../services/complianceEngine';
import { downloadFile } from '../utils/downloadFile';

const CLEAN_PERIOD = {
    id: 'RPT-CLEAN',
    standard: 'CPCB',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    totalExceedances: 0,
    generatedAt: '2026-02-01T09:00:00.000Z',
    // No `exceedances` key at all — the shape that used to crash the panel.
};

const BREACHED_PERIOD = {
    ...CLEAN_PERIOD,
    id: 'RPT-BREACH',
    totalExceedances: 2,
    exceedances: [
        { timestamp: '2026-01-04T06:00:00.000Z', pollutant: 'PM2.5', recordedValue: 91, threshold: 60, standard: 'CPCB', severity: 'SEVERE' },
        { timestamp: '2026-01-19T18:00:00.000Z', pollutant: 'PM10', recordedValue: 118, threshold: 100, standard: 'CPCB', severity: 'MODERATE' },
    ],
};

/** Fills the form and submits it. */
async function generate({ start = '2026-01-01', end = '2026-01-31' } = {}) {
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: start } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: end } });
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    generateComplianceReport.mockResolvedValue(BREACHED_PERIOD);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('describeRangeProblem', () => {
    it('accepts a usable range', () => {
        expect(describeRangeProblem('2026-01-01', '2026-01-31')).toBeNull();
    });

    it('accepts a single-day range', () => {
        expect(describeRangeProblem('2026-01-01', '2026-01-01')).toBeNull();
    });

    it('rejects a missing date', () => {
        expect(describeRangeProblem('', '2026-01-31')).toMatch(/both start and end dates/i);
        expect(describeRangeProblem('2026-01-01', '')).toMatch(/both start and end dates/i);
    });

    it('rejects an end date before the start date', () => {
        expect(describeRangeProblem('2026-01-31', '2026-01-01')).toMatch(/must not be before/i);
    });

    it('rejects an unparseable date', () => {
        expect(describeRangeProblem('not-a-date', '2026-01-31')).toMatch(/both start and end dates/i);
    });
});

describe('reportFilename', () => {
    it('carries both ends of the period, not just the start', () => {
        // Two reports sharing a start date used to overwrite each other on disk.
        expect(reportFilename('CPCB', '2026-01-01', '2026-01-31', 'csv'))
            .toBe('compliance_CPCB_2026-01-01_2026-01-31.csv');
        expect(reportFilename('CPCB', '2026-01-01', '2026-03-31', 'csv'))
            .toBe('compliance_CPCB_2026-01-01_2026-03-31.csv');
    });

    it('uses the requested extension', () => {
        expect(reportFilename('WHO', '2026-01-01', '2026-01-31', 'json')).toMatch(/\.json$/);
    });
});

describe('ComplianceReportGenerator', () => {
    it('renders the form with no report', () => {
        render(<ComplianceReportGenerator />);

        expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
        expect(screen.getByLabelText('End Date')).toBeInTheDocument();
        expect(screen.getByLabelText('Regulatory Standard')).toBeInTheDocument();
        expect(screen.queryByText('Report Generated')).not.toBeInTheDocument();
    });

    it('renders a report whose period had no exceedances (#1138)', async () => {
        generateComplianceReport.mockResolvedValue(CLEAN_PERIOD);
        render(<ComplianceReportGenerator />);

        // Before the fix this threw:
        // TypeError: Cannot read properties of undefined (reading 'length')
        await generate();

        expect(await screen.findByText('Report Generated')).toBeInTheDocument();
        expect(screen.getByText('No exceedances found in this period. Good job!')).toBeInTheDocument();
        expect(screen.getByText('ID: RPT-CLEAN')).toBeInTheDocument();
    });

    it('exports a report with no exceedances without throwing', async () => {
        generateComplianceReport.mockResolvedValue(CLEAN_PERIOD);
        render(<ComplianceReportGenerator />);
        await generate();

        // exportToCSV does `report.exceedances.map(...)`, so this is the same crash on
        // the export path rather than the render path.
        expect(() => {
            fireEvent.click(screen.getByRole('button', { name: /download csv/i }));
        }).not.toThrow();

        expect(downloadFile).toHaveBeenCalledTimes(1);
    });

    it('lists the exceedances a breached period reports', async () => {
        render(<ComplianceReportGenerator />);
        await generate();

        const table = await screen.findByRole('table');
        expect(within(table).getByText('PM2.5')).toBeInTheDocument();
        expect(within(table).getByText('PM10')).toBeInTheDocument();
        expect(within(table).getByText('SEVERE')).toBeInTheDocument();
    });

    it('shows the period and generation time, not an empty half-grid', async () => {
        render(<ComplianceReportGenerator />);
        await generate();

        await screen.findByText('Report Generated');
        expect(screen.getByText('Period')).toBeInTheDocument();
        expect(screen.getByText('2026-01-01 to 2026-01-31')).toBeInTheDocument();
        expect(screen.getByText('Generated')).toBeInTheDocument();
    });

    it('refuses an end date before the start date, and does not call the API', async () => {
        render(<ComplianceReportGenerator />);
        await generate({ start: '2026-01-31', end: '2026-01-01' });

        expect(screen.getByRole('alert')).toHaveTextContent('The end date must not be before the start date.');
        expect(generateComplianceReport).not.toHaveBeenCalled();
    });

    it('asks for both dates before submitting', async () => {
        render(<ComplianceReportGenerator />);
        fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-01-01' } });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
        });

        expect(screen.getByRole('alert')).toHaveTextContent('Please select both start and end dates.');
        expect(generateComplianceReport).not.toHaveBeenCalled();
    });

    it("announces the server's error message", async () => {
        generateComplianceReport.mockRejectedValue(new Error('No data for that period.'));
        render(<ComplianceReportGenerator />);
        await generate();

        expect(await screen.findByRole('alert')).toHaveTextContent('No data for that period.');
    });

    it('downloads CSV with both dates in the filename', async () => {
        render(<ComplianceReportGenerator />);
        await generate({ start: '2026-01-01', end: '2026-03-31' });
        await screen.findByText('Report Generated');

        fireEvent.click(screen.getByRole('button', { name: /download csv/i }));

        const [content, mimeType, filename] = downloadFile.mock.calls[0];
        expect(filename).toBe('compliance_CPCB_2026-01-01_2026-03-31.csv');
        expect(mimeType).toMatch(/^text\/csv/);
        expect(content).toContain('PM2.5');
    });

    it('downloads JSON through the same helper', async () => {
        render(<ComplianceReportGenerator />);
        await generate();
        await screen.findByText('Report Generated');

        fireEvent.click(screen.getByRole('button', { name: /download json/i }));

        const [content, mimeType, filename] = downloadFile.mock.calls[0];
        expect(filename).toMatch(/\.json$/);
        expect(mimeType).toMatch(/^application\/json/);
        expect(JSON.parse(content).id).toBe('RPT-BREACH');
    });

    it('aborts an in-flight request when the panel unmounts', async () => {
        let capturedSignal;
        generateComplianceReport.mockImplementation((s, e, std, signal) => {
            capturedSignal = signal;
            return new Promise(() => { }); // never settles
        });

        const { unmount } = render(<ComplianceReportGenerator />);
        await generate();

        expect(capturedSignal.aborted).toBe(false);
        unmount();
        expect(capturedSignal.aborted).toBe(true);
    });
});
