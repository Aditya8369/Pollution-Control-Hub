import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Cover for #1074 — the half of it about a promise with no rejection handler.
 */

const fetchMicroclimateTelemetry = vi.fn();

vi.mock('../services/microclimateTelemetryService', () => ({
  fetchMicroclimateTelemetry: (...args) => fetchMicroclimateTelemetry(...args),
}));

const MicroclimateDashboard = (await import('./MicroclimateDashboard')).default;

/** @param {Partial<any>} [overrides] */
function telemetry(overrides = {}) {
  return {
    zone: 'Metropolitan Core',
    timestamp: '2026-08-27T12:00:00.000Z',
    metrics: {
      avgSurfaceTempCelsius: 41.8,
      baselineRuralTempCelsius: 34.2,
      urbanHeatIslandDelta: 7.6,
      averageAlbedoIndex: 0.18,
      greenCanopyCoveragePercent: 12.4,
    },
    sensorNodes: [
      { id: 'NODE-UHI-101', location: 'Commercial District', tempC: 43.5, albedo: 0.15, status: 'Active' },
    ],
    mitigationRecommendations: [
      { intervention: 'Cool-Roof Retrofit', targetAreaSqM: 450000, projectedTempDropC: -2.1, feasibility: 'High' },
    ],
    ...overrides,
  };
}

/** Unhandled rejections seen while a test runs. */
let unhandled = [];

/** @param {any} reason */
function recordUnhandled(reason) {
  unhandled.push(reason);
}

beforeEach(() => {
  fetchMicroclimateTelemetry.mockReset();
  unhandled = [];
  process.on('unhandledRejection', recordUnhandled);
});

afterEach(() => {
  process.off('unhandledRejection', recordUnhandled);
});

describe('MicroclimateDashboard — a failed telemetry fetch (#1074)', () => {
  it('shows an error instead of spinning forever', async () => {
    fetchMicroclimateTelemetry.mockRejectedValue(new Error('Telemetry gateway is unreachable.'));

    render(<MicroclimateDashboard />);

    // `setLoading(false)` lived only in the fulfilment handler, so this stayed
    // on "Loading Urban Microclimate & Heat Island Engine..." indefinitely.
    expect(await screen.findByRole('alert')).toHaveTextContent('Telemetry gateway is unreachable.');
    expect(screen.queryByText(/loading urban microclimate/i)).not.toBeInTheDocument();
  });

  it('does not leave the rejection unhandled', async () => {
    fetchMicroclimateTelemetry.mockRejectedValue(new Error('Telemetry gateway is unreachable.'));

    render(<MicroclimateDashboard />);
    await screen.findByRole('alert');
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

    expect(unhandled).toHaveLength(0);
  });

  it('offers a retry that recovers', async () => {
    fetchMicroclimateTelemetry
      .mockRejectedValueOnce(new Error('Telemetry gateway is unreachable.'))
      .mockResolvedValueOnce(telemetry());

    render(<MicroclimateDashboard />);
    await screen.findByRole('alert');

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('41.8°C')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('does not set state after unmount', async () => {
    let settle;
    fetchMicroclimateTelemetry.mockReturnValue(new Promise((resolve) => { settle = resolve; }));

    const { unmount } = render(<MicroclimateDashboard />);
    unmount();

    await act(async () => {
      settle(telemetry());
      await Promise.resolve();
    });

    expect(screen.queryByText('41.8°C')).not.toBeInTheDocument();
  });
});

describe('MicroclimateDashboard — a partial payload (#1074)', () => {
  it('renders a dash rather than throwing when metrics are missing', async () => {
    // `telemetry.metrics.avgSurfaceTempCelsius` threw here.
    fetchMicroclimateTelemetry.mockResolvedValue({ zone: 'Metropolitan Core' });

    render(<MicroclimateDashboard />);

    expect(await screen.findByText(/urban microclimate/i)).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('says so when no sensor nodes are reporting', async () => {
    fetchMicroclimateTelemetry.mockResolvedValue(telemetry({ sensorNodes: undefined }));

    render(<MicroclimateDashboard />);
    fireEvent.click(await screen.findByRole('button', { name: /sensor network/i }));

    expect(screen.getByText(/no sensor nodes are reporting/i)).toBeInTheDocument();
  });

  it('says so when nothing has been modelled', async () => {
    fetchMicroclimateTelemetry.mockResolvedValue(telemetry({ mitigationRecommendations: [] }));

    render(<MicroclimateDashboard />);
    fireEvent.click(await screen.findByRole('button', { name: /mitigation models/i }));

    expect(screen.getByText(/no interventions have been modelled/i)).toBeInTheDocument();
  });

  it('does not call toLocaleString on a missing target area', async () => {
    fetchMicroclimateTelemetry.mockResolvedValue(telemetry({
      mitigationRecommendations: [{ intervention: 'Cool-Roof Retrofit', feasibility: 'High' }],
    }));

    render(<MicroclimateDashboard />);
    fireEvent.click(await screen.findByRole('button', { name: /mitigation models/i }));

    expect(screen.getByText(/target area: — m²/i)).toBeInTheDocument();
  });
});

describe('MicroclimateDashboard — the UHI delta sign (#1074)', () => {
  it('shows a positive delta with a plus', async () => {
    fetchMicroclimateTelemetry.mockResolvedValue(telemetry());

    render(<MicroclimateDashboard />);

    expect(await screen.findByText('+7.6°C')).toBeInTheDocument();
  });

  it('does not render a cooler zone as "+-0.4°C"', async () => {
    // The `+` was written into the JSX, so a negative delta got both signs.
    fetchMicroclimateTelemetry.mockResolvedValue(telemetry({
      metrics: { ...telemetry().metrics, urbanHeatIslandDelta: -0.4 },
    }));

    render(<MicroclimateDashboard />);

    expect(await screen.findByText('-0.4°C')).toBeInTheDocument();
    expect(screen.queryByText('+-0.4°C')).not.toBeInTheDocument();
  });
});

describe('MicroclimateDashboard — the tab strip (#1074)', () => {
  it('marks the active view as pressed', async () => {
    fetchMicroclimateTelemetry.mockResolvedValue(telemetry());

    render(<MicroclimateDashboard />);

    expect(await screen.findByRole('button', { name: /uhi overview/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /sensor network/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not style an offline node as if it were active', async () => {
    fetchMicroclimateTelemetry.mockResolvedValue(telemetry({
      sensorNodes: [
        { id: 'NODE-UHI-101', location: 'Commercial District', tempC: 43.5, albedo: 0.15, status: 'Active' },
        { id: 'NODE-UHI-102', location: 'Industrial Corridor', tempC: 45.1, albedo: 0.12, status: 'Offline' },
      ],
    }));

    render(<MicroclimateDashboard />);
    fireEvent.click(await screen.findByRole('button', { name: /sensor network/i }));

    expect(screen.getByText('Offline').className).not.toBe(screen.getByText('Active').className);
    expect(screen.getByText('Offline').className).not.toContain('emerald');
  });
});
