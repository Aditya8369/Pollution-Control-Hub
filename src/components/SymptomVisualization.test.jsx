import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import SymptomVisualization from './SymptomVisualization';
import { SYMPTOM_REPORTS_STORAGE_KEY } from './SymptomReportButton';
import { eventBus } from '../core/events';

vi.mock('recharts', async () => {
    const actual = await vi.importActual('recharts');
    return {
        ...actual,
        ResponsiveContainer: ({ children }) => <div data-testid="chart-container">{children}</div>,
    };
});

describe('SymptomVisualization', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('renders empty message when no symptom reports exist in localStorage', () => {
        render(<SymptomVisualization />);
        expect(screen.getByText('No recent symptom reports in this area.')).toBeInTheDocument();
    });

    it('reads stored symptom reports from localStorage and aggregates counts correctly', () => {
        const sampleReports = [
            { id: '1', symptoms: ['Headache', 'Coughing'], timestamp: '2026-08-30T10:00:00Z' },
            { id: '2', symptoms: ['Coughing', 'Sore throat'], timestamp: '2026-08-30T11:00:00Z' },
            { id: '3', symptoms: ['Coughing'], timestamp: '2026-08-30T12:00:00Z' },
        ];
        localStorage.setItem(SYMPTOM_REPORTS_STORAGE_KEY, JSON.stringify(sampleReports));

        render(<SymptomVisualization />);

        expect(screen.getByText('Local Health Impacts')).toBeInTheDocument();
        expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    it('updates dynamically when SYMPTOM_REPORT_SUBMITTED event is emitted', () => {
        render(<SymptomVisualization />);
        expect(screen.getByText('No recent symptom reports in this area.')).toBeInTheDocument();

        const newReports = [
            { id: '1', symptoms: ['Dizziness'], timestamp: '2026-08-30T10:00:00Z' },
        ];
        localStorage.setItem(SYMPTOM_REPORTS_STORAGE_KEY, JSON.stringify(newReports));

        act(() => {
            eventBus.emit('SYMPTOM_REPORT_SUBMITTED');
        });

        expect(screen.getByText('Local Health Impacts')).toBeInTheDocument();
        expect(screen.queryByText('No recent symptom reports in this area.')).not.toBeInTheDocument();
    });

    it('never makes a network fetch request to localhost backend', () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        
        const sampleReports = [
            { id: '1', symptoms: ['Fatigue'], timestamp: '2026-08-30T10:00:00Z' },
        ];
        localStorage.setItem(SYMPTOM_REPORTS_STORAGE_KEY, JSON.stringify(sampleReports));

        render(<SymptomVisualization />);

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(fetchSpy).not.toHaveBeenCalledWith(expect.stringContaining('http://localhost:3001'));
    });
});
