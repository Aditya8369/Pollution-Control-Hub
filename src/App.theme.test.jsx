import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const THEME_STORAGE_KEY = 'pollution-hub-theme';

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

const appliedTheme = () => document.documentElement.getAttribute('data-theme');

describe('App Theme Infrastructure & ThemeSwitcher (Issue #417)', () => {
  let App;

  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    delete document.documentElement.dataset.theme;

    vi.stubGlobal('navigator', {
      onLine: true,
      geolocation: { getCurrentPosition: vi.fn() },
    });
    window.scrollTo = vi.fn();
    ({ default: App } = await import('./App'));
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('defaults to dark theme when no preference exists', async () => {
    render(<App />);
    expect(appliedTheme()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('restores previously saved theme from localStorage on load', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'high-contrast');

    render(<App />);

    expect(appliedTheme()).toBe('high-contrast');
  });

  it('updates theme state and localStorage when ThemeSwitcher changes', async () => {
    render(<App />);

    const triggerBtns = screen.getAllByRole('button', { name: /color theme menu/i });
    fireEvent.click(triggerBtns[0]);

    const lightBtn = screen.getByRole('menuitemradio', { name: /light/i });
    fireEvent.click(lightBtn);

    expect(appliedTheme()).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    fireEvent.click(triggerBtns[0]);
    const hcBtn = screen.getByRole('menuitemradio', { name: /high contrast/i });
    fireEvent.click(hcBtn);

    expect(appliedTheme()).toBe('high-contrast');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('high-contrast');
  });
});
