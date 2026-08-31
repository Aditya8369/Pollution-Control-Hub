import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import App from './App';
import * as airQualityService from './services/airQualityService';

const SAVED_LOCATIONS_KEY = 'pollution-hub-saved-locations';

const stub = vi.hoisted(() => (label) => ({ default: () => <div>{label}</div> }));

vi.mock('./services/airQualityService', async () => {
  const actual = await vi.importActual('./services/airQualityService');
  return {
    ...actual,
    fetchAirQualityByCoords: vi.fn(),
    fetchCityComparisons: vi.fn(async () => []),
    fetchWindData: vi.fn(async () => null),
    getPrecomputedAverages: vi.fn(async () => null),
  };
});

vi.mock('./components/AIPollutionCopilot', () => stub('copilot'));
vi.mock('./components/AnomalyAlert', () => stub('anomaly'));
vi.mock('./components/CityCompare', () => stub('compare'));
vi.mock('./components/CommunityHub', () => stub('community'));
vi.mock('./components/Commute', () => stub('commute'));
vi.mock('./components/ConnectivityStatus', () => stub('connectivity'));
vi.mock('./components/Dashboard', () => stub('dashboard'));
vi.mock('./components/EmergencyMode', () => stub('emergency'));
vi.mock('./components/ErrorBoundary', () => ({ default: ({ children }) => children }));
vi.mock('./components/ExposureCalculator', () => stub('exposure-calc'));
vi.mock('./components/ExposureTracker', () => stub('exposure-tracker'));
vi.mock('./components/Factoid', () => stub('factoid'));
vi.mock('./components/Footer', () => stub('footer'));
vi.mock('./components/GettingStarted', () => stub('getting-started'));
vi.mock('./components/HeatmapTimeline', () => stub('heatmap'));
vi.mock('./components/HistoricalAnalysis', () => stub('history'));
vi.mock('./components/HistoricalData', () => stub('historical-data'));
vi.mock('./components/IndoorTracker', () => stub('indoor'));
vi.mock('./components/LocationSearch', () => stub('search'));
vi.mock('./components/QuizSection', () => stub('quiz'));
vi.mock('./components/ScrollToTopButton', () => stub('scroll'));
vi.mock('./components/SkeletonDashboard', () => stub('skeleton'));
vi.mock('./components/CarbonFootprintCalculator', () => stub('carbon'));
vi.mock('./components/LanguageSwitcher', () => stub('lang-switcher'));
vi.mock('./components/ThemeSwitcher', () => stub('theme-switcher'));
vi.mock('./components/Achievements', () => stub('achievements'));
vi.mock('./components/BadgeNotification', () => stub('badge'));
vi.mock('./components/CityPollutionLeaderboard', () => stub('city-leaderboard'));
vi.mock('./components/EcoImpactDashboard', () => stub('eco-impact'));
vi.mock('./components/EmbeddableWidgetGenerator', () => stub('widget'));
vi.mock('./components/Glossary', () => stub('glossary'));
vi.mock('./components/Leaderboard', () => stub('leaderboard'));
vi.mock('./components/SmartAlertsDashboard', () => stub('smart-alerts'));
vi.mock('./components/NoisePollutionTracker', () => stub('noise'));
vi.mock('./components/OceanAcidificationMonitor', () => stub('ocean'));
vi.mock('./components/HealthImpactDashboard', () => stub('health-impact'));
vi.mock('./components/HealthAdvisory', () => stub('health'));
vi.mock('./components/AlertsPanel', () => stub('alerts'));
vi.mock('./components/AnalyticsInsights', () => stub('analytics'));
vi.mock('./components/LocationMap', () => stub('map'));
vi.mock('./components/SolutionsAwareness', () => stub('solutions'));
vi.mock('./components/ScenarioSimulator', () => stub('scenario'));
vi.mock('./components/AqiMissionGame', () => stub('mission'));
vi.mock('./components/HotspotScoutGame', () => stub('hotspot'));
vi.mock('./components/SunSafetyDashboard', () => stub('sun'));
vi.mock('./components/RiverOriginGame', () => stub('river'));

describe('Saved Locations AQI Chips (Issue #1153)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    global.navigator.geolocation = { getCurrentPosition: vi.fn() };
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders saved location chips with AQI badges when AQI data resolves', async () => {
    const saved = [
      { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
      { name: 'Paris', lat: 48.8566, lon: 2.3522 },
    ];
    localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(saved));

    vi.mocked(airQualityService.fetchAirQualityByCoords).mockImplementation(async (lat) => {
      if (lat === 35.6762) {
        return { current: { us_aqi: 42 } };
      }
      if (lat === 48.8566) {
        return { current: { us_aqi: 120 } };
      }
      return { current: { us_aqi: 50 } };
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Tokyo/i)).toBeInTheDocument();
      expect(screen.getByText(/Paris/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
    });
  });

  it('handles failed AQI requests gracefully without breaking chip controls', async () => {
    const saved = [{ name: 'London', lat: 51.5074, lon: -0.1278 }];
    localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(saved));

    vi.mocked(airQualityService.fetchAirQualityByCoords).mockRejectedValue(
      new Error('API error')
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/London/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    const removeBtn = screen.getByRole('button', { name: /remove London from saved locations/i });
    expect(removeBtn).toBeInTheDocument();
    fireEvent.click(removeBtn);

    expect(screen.queryByText(/London/i)).not.toBeInTheDocument();
  });
});
