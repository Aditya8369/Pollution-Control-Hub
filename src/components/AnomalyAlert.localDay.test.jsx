import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AnomalyAlert from './AnomalyAlert';

const ANOMALY_HISTORY_KEY = 'anomaly-history';
const ORIGINAL_TZ = process.env.TZ;

const ANOMALY = {
  field: 'pm2_5',
  label: 'PM2.5',
  current: 120,
  baselineMean: 40,
  percentAbove: 200,
};

vi.mock('../services/historicalDataService', () => ({
  fetchHistoricalData: vi.fn(async () => ({ hourly: { time: [], pm2_5: [] } })),
}));
vi.mock('../services/weatherService', () => ({
  fetchHourlyWeather: vi.fn(async () => []),
}));
vi.mock('../hooks/useCommunityReports', () => ({
  useCommunityReports: () => [],
}));
vi.mock('../utils/anomalyDetection', () => ({
  buildHourlyBaseline: vi.fn(() => ({ pm2_5: { mean: 40, stdDev: 5 } })),
  detectAnomalies: vi.fn(() => [ANOMALY]),
}));

function useTimezone(tz, instant) {
  beforeEach(() => {
    process.env.TZ = tz;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(instant);
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.TZ = ORIGINAL_TZ;
    localStorage.clear();
  });
}

function storedHistory() {
  const raw = localStorage.getItem(ANOMALY_HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

describe('AnomalyAlert - de-duplication key (regression for #1015)', () => {
  // 20:30 local on 1 March in New York; the UTC clock already says 2 March.
  useTimezone('America/New_York', new Date('2026-03-02T01:30:00Z'));

  it('files a logged anomaly under the local date', async () => {
    render(<AnomalyAlert lat={40.7128} lon={-74.006} current={{ pm2_5: 120 }} cityName="New York" />);

    await screen.findByTestId('anomaly-alert');
    await waitFor(() => expect(storedHistory()).toHaveLength(1));

    expect(storedHistory()[0].date).toBe('2026-03-01');
  });

  it('builds a key whose date and hour come from the same clock', async () => {
    render(<AnomalyAlert lat={40.7128} lon={-74.006} current={{ pm2_5: 120 }} cityName="New York" />);

    await screen.findByTestId('anomaly-alert');
    await waitFor(() => expect(storedHistory()).toHaveLength(1));

    // The key was `${utcDate}-${localHour}-${field}`. Local hour 20 with UTC date
    // 2026-03-02 named an hour that does not exist on that date in this timezone,
    // so the same ongoing spike re-notified and re-logged across the UTC rollover.
    const entry = storedHistory()[0];
    expect(entry.hour).toBe(20);
    expect(entry.id).toBe('2026-03-01-20-pm2_5');
  });

  it('does not log the same spike twice', async () => {
    const { rerender } = render(
      <AnomalyAlert lat={40.7128} lon={-74.006} current={{ pm2_5: 120 }} cityName="New York" />
    );

    await screen.findByTestId('anomaly-alert');
    await waitFor(() => expect(storedHistory()).toHaveLength(1));

    rerender(<AnomalyAlert lat={40.7128} lon={-74.006} current={{ pm2_5: 125 }} cityName="New York" />);

    await waitFor(() => expect(storedHistory()).toHaveLength(1));
  });
});

describe('AnomalyAlert - early morning in India', () => {
  // 03:30 local on 2 March in Kolkata; the UTC clock still says 1 March.
  useTimezone('Asia/Kolkata', new Date('2026-03-01T22:00:00Z'));

  it('files the anomaly under the day the user is actually in', async () => {
    render(<AnomalyAlert lat={28.6139} lon={77.209} current={{ pm2_5: 120 }} cityName="Delhi" />);

    await screen.findByTestId('anomaly-alert');
    await waitFor(() => expect(storedHistory()).toHaveLength(1));

    expect(storedHistory()[0].date).toBe('2026-03-02');
    expect(storedHistory()[0].id).toBe('2026-03-02-3-pm2_5');
  });
});
