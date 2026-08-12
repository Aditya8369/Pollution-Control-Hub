import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import WindPollutionRose from './WindPollutionRose';

// jsdom has no ResizeObserver and recharts' ResponsiveContainer requires one.
// Same stub the existing chart tests use (Dashboard.test.jsx).
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

function airPayload(rows) {
  return {
    hourly: {
      time: rows.map((_, i) => `2024-03-01T${String(i).padStart(2, '0')}:00`),
      pm2_5: rows.map((r) => r[1]),
      pm10: rows.map((r) => r[1]),
      nitrogen_dioxide: rows.map((r) => r[1]),
      ozone: rows.map((r) => r[1]),
    },
  };
}

function weatherPayload(rows) {
  return {
    hourly: {
      time: rows.map((_, i) => `2024-03-01T${String(i).padStart(2, '0')}:00`),
      wind_direction_10m: rows.map((r) => r[0]),
      wind_speed_10m: rows.map(() => 12),
    },
  };
}

/** Answers the air-quality and forecast endpoints from one row set. */
function mockFetch(rows) {
  return vi.fn((url) => {
    const payload = String(url).includes('air-quality')
      ? airPayload(rows)
      : weatherPayload(rows);
    return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) });
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch([[270, 48.2], [270, 48.2], [270, 48.2]]));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('WindPollutionRose - coordinate guard (regression for #647)', () => {
  it('loads at the equator instead of spinning forever', async () => {
    // `!lat` is true for 0, so the old guard took the early return before
    // setLoading(false) was ever reached -- Nairobi, Quito and Kampala sat on the
    // spinner permanently with no error.
    render(<WindPollutionRose lat={0} lon={36.8} />);

    await waitFor(() => {
      expect(
        screen.queryByText(/Calculating wind direction/i)
      ).not.toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalled();
    expect(screen.getByTestId('wind-rose-coverage')).toBeInTheDocument();
  });

  it('loads on the prime meridian', async () => {
    render(<WindPollutionRose lat={51.5} lon={0} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('shows a message rather than an endless spinner for a missing location', async () => {
    render(<WindPollutionRose lat={undefined} lon={undefined} />);

    await waitFor(() => {
      expect(screen.getByText(/needs a valid location/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Calculating wind direction/i)).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects NaN coordinates', async () => {
    render(<WindPollutionRose lat={NaN} lon={NaN} />);

    await waitFor(() => {
      expect(screen.getByText(/needs a valid location/i)).toBeInTheDocument();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('WindPollutionRose - coverage disclosure', () => {
  it('says how many directions were actually observed', async () => {
    render(<WindPollutionRose lat={28.6} lon={77.2} />);

    await waitFor(() => {
      expect(screen.getByTestId('wind-rose-coverage')).toBeInTheDocument();
    });

    // All three hours came from the west, so 1 of 16 sectors carries data. Without
    // this line the chart looks like 15 clean directions and one dirty one.
    expect(screen.getByTestId('wind-rose-coverage')).toHaveTextContent(
      /3 hourly observations across 1 of 16 compass directions/i
    );
    expect(screen.getByTestId('wind-rose-coverage')).toHaveTextContent(/most often from W/i);
    expect(screen.getByTestId('wind-rose-coverage')).toHaveTextContent(
      /15 direction\(s\) were never observed and are left blank rather than plotted as zero/i
    );
  });

  it('omits the never-observed note when the whole compass is covered', async () => {
    const rows = Array.from({ length: 16 }, (_, i) => [i * 22.5, 20]);
    vi.stubGlobal('fetch', mockFetch(rows));

    render(<WindPollutionRose lat={28.6} lon={77.2} />);

    await waitFor(() => {
      expect(screen.getByTestId('wind-rose-coverage')).toBeInTheDocument();
    });

    expect(screen.getByTestId('wind-rose-coverage')).toHaveTextContent(
      /across 16 of 16 compass directions/i
    );
    expect(screen.getByTestId('wind-rose-coverage')).not.toHaveTextContent(
      /never observed/i
    );
  });

  it('reports no data rather than an empty chart when no bearings came back', async () => {
    vi.stubGlobal('fetch', mockFetch([[null, 10], [null, 20]]));

    render(<WindPollutionRose lat={28.6} lon={77.2} />);

    await waitFor(() => {
      expect(screen.getByTestId('wind-rose-no-data')).toBeInTheDocument();
    });
  });
});

describe('WindPollutionRose - failure handling', () => {
  it('surfaces an error when the response has no hourly block', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<WindPollutionRose lat={28.6} lon={77.2} />);

    await waitFor(() => {
      expect(screen.getByText(/Invalid response format/i)).toBeInTheDocument();
    });
  });

  it('surfaces an error when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<WindPollutionRose lat={28.6} lon={77.2} />);

    await waitFor(() => {
      expect(screen.getByText(/network down/i)).toBeInTheDocument();
    });
  });
});
