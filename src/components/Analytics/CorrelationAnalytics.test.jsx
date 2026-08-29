import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CorrelationAnalytics } from './CorrelationAnalytics';
import { calculatePearsonCorrelation, getCorrelationStrengthKey } from '../../utils/analytics';

// Mock Recharts ResponsiveContainer to render children reliably in JSDOM
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div style={{ width: '500px', height: '300px' }}>{children}</div>
    ),
  };
});

describe('Pearson Correlation Math Engine', () => {
  it('correctly calculates positive correlation', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    const r = calculatePearsonCorrelation(x, y);
    expect(r).toBe(1);
  });

  it('correctly calculates negative correlation', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [10, 8, 6, 4, 2];
    const r = calculatePearsonCorrelation(x, y);
    expect(r).toBe(-1);
  });

  it('returns 0 for empty or unequal arrays', () => {
    expect(calculatePearsonCorrelation([], [])).toBe(0);
    expect(calculatePearsonCorrelation([1, 2], [1])).toBe(0);
  });

  it('classifies correlation strength keys accurately', () => {
    expect(getCorrelationStrengthKey(0.85)).toBe('strong_positive');
    expect(getCorrelationStrengthKey(-0.75)).toBe('strong_negative');
    expect(getCorrelationStrengthKey(0.5)).toBe('moderate_positive');
    expect(getCorrelationStrengthKey(-0.45)).toBe('moderate_negative');
    expect(getCorrelationStrengthKey(0.2)).toBe('weak_positive');
    expect(getCorrelationStrengthKey(0.05)).toBe('insignificant');
  });
});

describe('CorrelationAnalytics Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title, heatmap matrix, controls, and insights', () => {
    render(<CorrelationAnalytics />);

    expect(screen.getByTestId('correlation-analytics')).toBeInTheDocument();
    expect(screen.getByText(/Weather & Air Quality Correlation Analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/Correlation Matrix Heatmap/i)).toBeInTheDocument();
    expect(screen.getByText(/Automated Correlation Insights/i)).toBeInTheDocument();
    expect(screen.getByText(/AQI Band Breakdown/i)).toBeInTheDocument();
  });

  it('toggles chart visualization between Scatter Plot and Dual-Axis Trend', () => {
    render(<CorrelationAnalytics />);

    const scatterBtn = screen.getByRole('button', { name: /Scatter Plot View/i });
    const dualAxisBtn = screen.getByRole('button', { name: /Dual-Axis Trend View/i });

    expect(scatterBtn).toBeInTheDocument();
    expect(dualAxisBtn).toBeInTheDocument();

    fireEvent.click(dualAxisBtn);
    expect(dualAxisBtn.className).toContain('activeToggleBtn');

    fireEvent.click(scatterBtn);
    expect(scatterBtn.className).toContain('activeToggleBtn');
  });

  it('allows metric selection dropdown changes', () => {
    render(<CorrelationAnalytics />);

    const weatherSelect = screen.getByLabelText(/Select Weather Metric/i);
    const aqiSelect = screen.getByLabelText(/Select AQI Metric/i);

    fireEvent.change(weatherSelect, { target: { value: 'humidity' } });
    expect(weatherSelect.value).toBe('humidity');

    fireEvent.change(aqiSelect, { target: { value: 'no2' } });
    expect(aqiSelect.value).toBe('no2');
  });
});
