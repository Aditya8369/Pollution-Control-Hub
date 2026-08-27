import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import PollenAllergenForecast, { getOverallIndex } from './PollenAllergenForecast';
import { getPollenSeverity } from '../services/airQualityService';
import { cacheStore } from '../utils/cacheStore';

const fetchPollenData = vi.hoisted(() => vi.fn());

vi.mock('../services/airQualityService', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchPollenData };
});

/** The shape `fetchPollenData` resolves with. */
function pollen(overrides = {}) {
  return { tree: 20, grass: 3, weed: 4, mold: null, isFallback: false, ...overrides };
}

function cardText(testId) {
  return screen.getByTestId(testId).textContent.replace(/\s+/g, ' ').trim();
}

beforeEach(async () => {
  vi.clearAllMocks();
  fetchPollenData.mockResolvedValue(pollen());
  // The panel reads through useSWR, whose cache is module-level and keyed on the
  // coordinates. Without this, the second test for a given location gets the first
  // test's payload back instead of its own.
  await cacheStore.invalidate();
});

describe('PollenAllergenForecast - coordinates (regression for #1013)', () => {
  it('loads for a location on the equator', async () => {
    // 0 is falsy; `lat && lon` treated Kampala, Quito, Libreville and Accra as
    // "no location" and left the panel on its error state forever.
    render(<PollenAllergenForecast lat={0} lon={32.5825} />);

    await waitFor(() => expect(fetchPollenData).toHaveBeenCalledWith(0, 32.5825));
    expect(await screen.findByTestId('pollen-card-tree')).toBeInTheDocument();
  });

  it('loads for a location on the prime meridian', async () => {
    render(<PollenAllergenForecast lat={51.4779} lon={0} />);

    await waitFor(() => expect(fetchPollenData).toHaveBeenCalledWith(51.4779, 0));
  });

  it('loads for a location at exactly 0, 0', async () => {
    render(<PollenAllergenForecast lat={0} lon={0} />);
    await waitFor(() => expect(fetchPollenData).toHaveBeenCalledWith(0, 0));
  });

  it('asks for a location instead of reporting a failure when there is none', () => {
    render(<PollenAllergenForecast />);

    expect(screen.getByText(/Pick a location/i)).toBeInTheDocument();
    expect(screen.queryByText(/Unable to load/i)).not.toBeInTheDocument();
    expect(fetchPollenData).not.toHaveBeenCalled();
  });

  it('does not throw on a non-numeric coordinate', () => {
    // `lat.toFixed(4)` used to throw here before anything could reject it.
    const stringCoords = /** @type {any} */ ({ lat: '28.6', lon: '77.2' });
    expect(() => render(<PollenAllergenForecast {...stringCoords} />)).not.toThrow();
    expect(fetchPollenData).not.toHaveBeenCalled();
  });

  it('rejects an out-of-range coordinate', () => {
    render(<PollenAllergenForecast lat={120} lon={77.2} />);
    expect(fetchPollenData).not.toHaveBeenCalled();
  });
});

describe('PollenAllergenForecast - missing readings', () => {
  it('says "No data" rather than rendering a bare unit', async () => {
    fetchPollenData.mockResolvedValue(pollen({ tree: null }));
    render(<PollenAllergenForecast lat={28.6} lon={77.2} />);

    const card = await screen.findByTestId('pollen-card-tree');
    expect(within(card).getByText('No data')).toBeInTheDocument();
    // The old markup left "grains/m³" standing on its own with no number.
    expect(card.textContent).not.toContain('grains/m³');
  });

  it('still shows the allergens it does have', async () => {
    fetchPollenData.mockResolvedValue(pollen({ tree: null, grass: 30 }));
    render(<PollenAllergenForecast lat={28.6} lon={77.2} />);

    expect(await screen.findByTestId('pollen-card-grass')).toHaveTextContent('30');
  });

  it('renders a genuine count of zero as a reading, not as missing', async () => {
    fetchPollenData.mockResolvedValue(pollen({ grass: 0 }));
    render(<PollenAllergenForecast lat={28.6} lon={77.2} />);

    const card = await screen.findByTestId('pollen-card-grass');
    expect(card.textContent).toContain('grains/m³');
    expect(within(card).queryByText('No data')).not.toBeInTheDocument();
  });
});

describe('PollenAllergenForecast - the mold card', () => {
  it('does not print a hard-coded N/A', async () => {
    render(<PollenAllergenForecast lat={28.6} lon={77.2} />);

    const card = await screen.findByTestId('pollen-card-mold');
    expect(card.textContent).not.toContain('N/A');
    expect(within(card).getByText('No data')).toBeInTheDocument();
  });

  it('shows the count once mold data exists', async () => {
    fetchPollenData.mockResolvedValue(pollen({ mold: 42 }));
    render(<PollenAllergenForecast lat={28.6} lon={77.2} />);

    await waitFor(() => expect(cardText('pollen-card-mold')).toContain('42'));
  });

  it('does not badge an unknown allergen type as Low', async () => {
    fetchPollenData.mockResolvedValue(pollen({ mold: 900 }));
    render(<PollenAllergenForecast lat={28.6} lon={77.2} />);

    // 900 spores with a green "Low" badge was what the old fallback produced.
    await waitFor(() => expect(cardText('pollen-card-mold')).not.toContain('Low'));
  });
});

describe('getOverallIndex', () => {
  const high = { label: 'High' };
  const moderate = { label: 'Moderate' };
  const low = { label: 'Low' };
  const unavailable = { label: 'Unavailable' };

  it('reports the worst measured allergen', () => {
    expect(getOverallIndex([low, moderate, high], [1, 2, 3]).label).toBe('High');
    expect(getOverallIndex([low, moderate, low], [1, 2, 3]).label).toBe('Moderate');
    expect(getOverallIndex([low, low, low], [1, 2, 3]).label).toBe('Low');
  });

  it('ignores allergens with no reading behind them', () => {
    // A "Low" that comes from an absent reading is not evidence of anything.
    expect(getOverallIndex([unavailable, high, low], [null, 60, 1]).label).toBe('High');
  });

  it('returns null when nothing was measured', () => {
    expect(getOverallIndex([unavailable, unavailable, unavailable], [null, null, null])).toBeNull();
  });

  it('omits the overall card when there are no readings at all', async () => {
    fetchPollenData.mockResolvedValue(pollen({ tree: null, grass: null, weed: null }));
    render(<PollenAllergenForecast lat={28.6} lon={77.2} />);

    await screen.findByTestId('pollen-card-tree');
    expect(screen.queryByTestId('pollen-card-overall')).not.toBeInTheDocument();
  });
});

describe('getPollenSeverity - unknown types', () => {
  it('bands the types it knows', () => {
    expect(getPollenSeverity('tree', 10).label).toBe('Low');
    expect(getPollenSeverity('tree', 50).label).toBe('Moderate');
    expect(getPollenSeverity('tree', 200).label).toBe('High');
    expect(getPollenSeverity('grass', 25).label).toBe('High');
    expect(getPollenSeverity('weed', 5).label).toBe('Low');
  });

  it('reports an unknown type as unknown, not as low', () => {
    expect(getPollenSeverity('mold', 900).label).toBe('Unknown');
    expect(getPollenSeverity('tre', 900).label).toBe('Unknown');
  });

  it('reports an absent value as unavailable for any type', () => {
    expect(getPollenSeverity('tree', null).label).toBe('Unavailable');
    expect(getPollenSeverity('mold', undefined).label).toBe('Unavailable');
  });
});

describe('PollenAllergenForecast - fallback disclosure', () => {
  it('marks a regional estimate as an estimate', async () => {
    fetchPollenData.mockResolvedValue(pollen({ isFallback: true }));
    render(<PollenAllergenForecast lat={28.6} lon={77.2} />);

    expect(await screen.findByText('Regional Estimate')).toBeInTheDocument();
    expect(screen.getByText(/currently simulated/i)).toBeInTheDocument();
  });

  it('does not mark live data as an estimate', async () => {
    render(<PollenAllergenForecast lat={28.6} lon={77.2} />);

    await screen.findByTestId('pollen-card-tree');
    expect(screen.queryByText('Regional Estimate')).not.toBeInTheDocument();
  });

  it('reports a failure when the service returns nothing', async () => {
    fetchPollenData.mockResolvedValue(null);
    render(<PollenAllergenForecast lat={28.6} lon={77.2} />);

    expect(await screen.findByText(/Unable to load/i)).toBeInTheDocument();
  });
});
