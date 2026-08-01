import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const THEME_STORAGE_KEY = 'pollution-hub-theme';
const THEME_SOURCE_KEY = 'pollution-hub-theme-source';

// The theme logic is the unit under test; the data-heavy panels are not.
vi.mock('./services/airQualityService', () => ({
  fetchAirQualityByCoords: vi.fn(async () => null),
  fetchCityComparisons: vi.fn(async () => []),
  fetchWindData: vi.fn(async () => null),
  estimateWeeklyMonthlyAverages: () => ({ weekly: 0, monthly: 0, prediction: 0 }),
  estimateExposureTime: () => null,
}));

const stubPanel = (label) => ({ default: () => <div>{label}</div> });

vi.mock('./components/AlertsPanel', () => stubPanel('alerts'));
vi.mock('./components/AnalyticsInsights', () => stubPanel('analytics'));
vi.mock('./components/CommunityHub', () => stubPanel('community'));
vi.mock('./components/Dashboard', () => stubPanel('dashboard'));
vi.mock('./components/Footer', () => stubPanel('footer'));
vi.mock('./components/HealthAdvisory', () => stubPanel('health'));
vi.mock('./components/LocationMap', () => stubPanel('map'));
vi.mock('./components/QuizSection', () => stubPanel('quiz'));
vi.mock('./components/SolutionsAwareness', () => stubPanel('solutions'));
vi.mock('./components/ScenarioSimulator', () => stubPanel('scenario'));
vi.mock('./components/AqiMissionGame', () => stubPanel('mission'));
vi.mock('./components/HistoricalAnalysis', () => stubPanel('history'));
vi.mock('./components/LocationSearch', () => stubPanel('search'));
vi.mock('./components/SkeletonDashboard', () => stubPanel('skeleton'));
vi.mock('./components/HotspotScoutGame', () => stubPanel('hotspot'));
vi.mock('./components/Commute', () => stubPanel('commute'));
vi.mock('./components/GettingStarted', () => stubPanel('getting-started'));
vi.mock('./components/CityCompare', () => stubPanel('compare'));
vi.mock('./components/SunSafetyDashboard', () => stubPanel('sun'));
vi.mock('./components/RiverOriginGame', () => stubPanel('river'));

/** Listeners registered against the (prefers-color-scheme: dark) query. */
let darkListeners = [];
let systemPrefersDark = false;

/**
 * Installs a matchMedia stub whose dark-scheme query can be driven from a test.
 * @param {boolean} prefersDark
 */
function installMatchMedia(prefersDark) {
  systemPrefersDark = prefersDark;
  darkListeners = [];

  vi.stubGlobal(
    'matchMedia',
    vi.fn((query) => {
      const isDarkQuery = query.includes('prefers-color-scheme: dark');
      return {
        get matches() {
          return isDarkQuery ? systemPrefersDark : false;
        },
        media: query,
        addEventListener: (event, handler) => {
          if (isDarkQuery && event === 'change') darkListeners.push(handler);
        },
        removeEventListener: (event, handler) => {
          if (isDarkQuery && event === 'change') {
            darkListeners = darkListeners.filter((h) => h !== handler);
          }
        },
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      };
    })
  );
  window.matchMedia = globalThis.matchMedia;
}

/** Simulates the OS switching colour scheme. */
async function switchSystemTheme(prefersDark) {
  systemPrefersDark = prefersDark;
  await act(async () => {
    darkListeners.forEach((handler) => handler({ matches: prefersDark }));
  });
}

/** @returns {string|null} The theme currently applied to <html>. */
const appliedTheme = () => document.documentElement.getAttribute('data-theme');

describe('App theme preference (regression for #498)', () => {
  /** @type {any} */
  let App;

  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    // Never invokes either callback: geolocation resolving mid-test would queue a state
    // update outside act() and only add noise to a theme-focused suite.
    vi.stubGlobal('navigator', {
      onLine: true,
      geolocation: { getCurrentPosition: vi.fn() },
    });
    window.scrollTo = vi.fn(); // jsdom does not implement it
    installMatchMedia(false);
    ({ default: App } = await import('./App'));
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('follows the OS silently when the user has never picked a theme', async () => {
    render(<App />);
    expect(appliedTheme()).toBe('light');

    await switchSystemTheme(true);

    expect(appliedTheme()).toBe('dark');
    expect(screen.queryByText(/System theme changed/i)).not.toBeInTheDocument();
  });

  it('keeps following the OS across repeated changes', async () => {
    render(<App />);

    await switchSystemTheme(true);
    expect(appliedTheme()).toBe('dark');

    await switchSystemTheme(false);
    expect(appliedTheme()).toBe('light');

    expect(screen.queryByText(/System theme changed/i)).not.toBeInTheDocument();
  });

  it('does not treat the theme written on mount as a manual choice', async () => {
    render(<App />);

    // The theme value is persisted for a flash-free next paint...
    await waitFor(() => expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light'));
    // ...but intent is not implied by its presence.
    expect(localStorage.getItem(THEME_SOURCE_KEY)).toBeNull();
  });

  it('records a manual choice when the in-app toggle is used', async () => {
    render(<App />);

    fireEvent.click(screen.getByLabelText(/Toggle Theme/i));

    await waitFor(() => expect(appliedTheme()).toBe('dark'));
    expect(localStorage.getItem(THEME_SOURCE_KEY)).toBe('manual');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('asks before overriding a manual choice', async () => {
    render(<App />);

    fireEvent.click(screen.getByLabelText(/Toggle Theme/i));
    await waitFor(() => expect(appliedTheme()).toBe('dark'));

    // OS goes light while the user has deliberately chosen dark.
    await switchSystemTheme(false);

    expect(appliedTheme()).toBe('dark');
    expect(screen.getByText(/System theme changed/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Yes$/ }));
    await waitFor(() => expect(appliedTheme()).toBe('light'));
  });

  it('does not prompt when the OS moves to the theme already in use', async () => {
    render(<App />);

    // User manually selects dark; the OS then also switches to dark.
    fireEvent.click(screen.getByLabelText(/Toggle Theme/i));
    await waitFor(() => expect(appliedTheme()).toBe('dark'));

    await switchSystemTheme(true);

    // Pre-fix this compared against the first render's theme and prompted anyway.
    expect(screen.queryByText(/System theme changed/i)).not.toBeInTheDocument();
    expect(appliedTheme()).toBe('dark');
  });

  it('restores a manually chosen theme on the next load, ignoring the OS', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    localStorage.setItem(THEME_SOURCE_KEY, 'manual');
    installMatchMedia(false); // OS says light

    render(<App />);

    expect(appliedTheme()).toBe('dark');
  });

  it('prefers the OS over a stale theme that was never chosen', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light'); // left over from a past session
    installMatchMedia(true); // OS now says dark

    render(<App />);

    expect(appliedTheme()).toBe('dark');
  });

  it('lets the user dismiss the suggestion and keep their theme', async () => {
    render(<App />);

    fireEvent.click(screen.getByLabelText(/Toggle Theme/i));
    await waitFor(() => expect(appliedTheme()).toBe('dark'));

    await switchSystemTheme(false);
    fireEvent.click(screen.getByRole('button', { name: /^No$/ }));

    await waitFor(() =>
      expect(screen.queryByText(/System theme changed/i)).not.toBeInTheDocument()
    );
    expect(appliedTheme()).toBe('dark');
  });
});
