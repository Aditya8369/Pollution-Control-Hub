import { useEffect, useMemo, useState } from 'react';
import AlertsPanel from './components/AlertsPanel';
import AnalyticsInsights from './components/AnalyticsInsights';
import CommunityHub from './components/CommunityHub';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';
import HealthAdvisory from './components/HealthAdvisory';
import LocationMap from './components/LocationMap';
import QuizSection from './components/QuizSection';
import SolutionsAwareness from './components/SolutionsAwareness';
import ScenarioSimulator from './components/ScenarioSimulator';
import { CITY_COORDINATES } from './constants/cities';
import {
  fetchAirQualityByCoords,
  fetchCityComparisons,
  estimateExposureTime
} from './services/airQualityService';

const DEFAULT_POSITION = {
  lat: 28.6139,
  lon: 77.209,
  cityName: 'Delhi'
};

const THEME_STORAGE_KEY = 'pollution-hub-theme';
const AUTO_REFRESH_SECONDS = 180;

function Hero({ cityName }) {
  return (
    <header className="hero">
      <div className="hero-overlay" />
      <div className="hero-content">
        <p className="eyebrow">Pollution Control Hub</p>
        <h1>Monitor. Understand. Act.</h1>
        <p>
          A single digital platform to track air quality in {cityName}, protect health, and mobilize
          community-driven climate action.
        </p>
      </div>
    </header>
  );
}

function AppControls({
  selectedCity,
  onCityChange,
  onRefresh,
  isRefreshing,
  refreshCountdown,
  lastUpdated
}) {
  return (
    <section className="app-controls" aria-label="Live controls">
      <div className="control-group">
        <label htmlFor="city-selector">Track city:</label>
        <select
          id="city-selector"
          value={selectedCity}
          onChange={(event) => onCityChange(event.target.value)}
        >
          <option value="auto">Auto detect location</option>
          {CITY_COORDINATES.map((city) => (
            <option key={city.name} value={city.name}>{city.name}</option>
          ))}
        </select>
      </div>

      <div className="control-group status">
        <span className={`live-dot ${isRefreshing ? 'active' : ''}`} />
        <p>
          {isRefreshing ? 'Refreshing live feed...' : `Auto refresh in ${refreshCountdown}s`}
        </p>
      </div>

      <div className="control-group actions">
        <button type="button" onClick={onRefresh} disabled={isRefreshing}>Refresh Now</button>
        <small>
          Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Waiting...'}
        </small>
      </div>
    </section>
  );
}

function SectionNav({ activeSection, onSectionChange, theme, onToggleTheme }) {
  const sections = [
    { id: 'home', label: 'Home' },
    { id: 'quiz', label: 'Quiz' }
  ];
  const isDark = theme === 'dark';

  return (
    <nav className="section-nav" aria-label="Main sections">
      <div className="nav-sections">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={activeSection === section.id ? 'active' : ''}
            onClick={() => onSectionChange(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>
      <button type="button" className="theme-toggle-inline" onClick={onToggleTheme} aria-label="Toggle dark and light theme">
        {isDark ? 'Light' : 'Dark'}
      </button>
    </nav>
  );
}

export default function App() {
  const [activeSection, setActiveSection] = useState('home');
  const [selectedCity, setSelectedCity] = useState('auto');
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [current, setCurrent] = useState(null);
  const [trend, setTrend] = useState([]);
  const [nearbyPoints, setNearbyPoints] = useState([]);
  const [cityComparisons, setCityComparisons] = useState([]);
  const [confidenceScore, setConfidenceScore] = useState('High');
  const [dataCompleteness, setDataCompleteness] = useState(100);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [refreshCountdown, setRefreshCountdown] = useState(AUTO_REFRESH_SECONDS);
  const [error, setError] = useState('');
  const [locationNotice, setLocationNotice] = useState('');
  const [theme, setTheme] = useState('light');
  const [timeRange, setTimeRange] = useState(24);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const initialTheme =
      savedTheme ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light');

    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (selectedCity !== 'auto') {
      setLocationNotice('');
      const city = CITY_COORDINATES.find((item) => item.name === selectedCity);
      if (city) {
        setPosition({
          lat: city.lat,
          lon: city.lon,
          cityName: city.name
        });
      }
      return;
    }

    if (!navigator.geolocation) {
      setLocationNotice(
        "Your browser can't detect location, so we're showing Delhi. Pick a city from the dropdown if that's not right."
      );
      setPosition(DEFAULT_POSITION);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (coords) => {
        setLocationNotice('');
        setPosition({
          lat: Number(coords.coords.latitude.toFixed(4)),
          lon: Number(coords.coords.longitude.toFixed(4)),
          cityName: 'Your Current Location'
        });
      },
      () => {
        setLocationNotice(
          "Couldn't detect your location — showing Delhi for now. Pick a city manually from the dropdown if you need different data."
        );
        setPosition(DEFAULT_POSITION);
      },
      { timeout: 8000 }
    );
  }, [selectedCity]);

  useEffect(() => {
    let ignore = false;

    const load = async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        if (silent) {
          setIsRefreshing(true);
        }
        const [aqi, cities] = await Promise.all([
          fetchAirQualityByCoords(position.lat, position.lon),
          fetchCityComparisons()
        ]);

        if (ignore) return;
        setCurrent(aqi.current);
        setTrend(aqi.trend);
        setNearbyPoints(aqi.nearbyPoints);
        setConfidenceScore(aqi.confidenceScore);
        setDataCompleteness(aqi.dataCompleteness);
        setAnalytics(aqi.analytics);
        setCityComparisons(cities);
        setLastUpdated(new Date().toISOString());
        setRefreshCountdown(AUTO_REFRESH_SECONDS);
        setError('');
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message || 'Unable to load live AQI data.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    load();

    const refreshTimer = setInterval(() => {
      load(true);
    }, AUTO_REFRESH_SECONDS * 1000);

    const countdownTimer = setInterval(() => {
      setRefreshCountdown((prev) => (prev <= 1 ? AUTO_REFRESH_SECONDS : prev - 1));
    }, 1000);

    return () => {
      ignore = true;
      clearInterval(refreshTimer);
      clearInterval(countdownTimer);
    };
  }, [position.lat, position.lon]);

  // Analytics is now fetched from the backend
  const exposureEstimate = useMemo(
    () => estimateExposureTime(trend, current?.us_aqi), 
    [trend, current]
  );

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const refreshNow = async () => {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);
      const [aqi, cities] = await Promise.all([
        fetchAirQualityByCoords(position.lat, position.lon),
        fetchCityComparisons()
      ]);
      setCurrent(aqi.current);
      setTrend(aqi.trend);
      setNearbyPoints(aqi.nearbyPoints);
      setConfidenceScore(aqi.confidenceScore);
      setDataCompleteness(aqi.dataCompleteness);
      setAnalytics(aqi.analytics);
      setCityComparisons(cities);
      setLastUpdated(new Date().toISOString());
      setRefreshCountdown(AUTO_REFRESH_SECONDS);
    } catch (loadError) {
      setError(loadError.message || 'Unable to refresh live AQI data.');
    } finally {
      setIsRefreshing(false);
    }
  };

if (loading || !current || !analytics) {
  return (
    <main className="app-shell loading-state">
      <SectionNav
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className="loading-container">
        <div className="loading-spinner"></div>

        <h1>Preparing Live Pollution Intelligence...</h1>

        <p>
          Fetching the latest air quality data and analytics...
        </p>
      </div>
    </main>
  );
}
  return (
    <main className="app-shell">
      <Hero cityName={position.cityName} />
      <SectionNav activeSection={activeSection} onSectionChange={setActiveSection} theme={theme} onToggleTheme={toggleTheme} />

      {activeSection === 'home' && (
        <AppControls
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
          onRefresh={refreshNow}
          isRefreshing={isRefreshing}
          refreshCountdown={refreshCountdown}
          lastUpdated={lastUpdated}
        />
      )}

      {locationNotice && selectedCity === 'auto' && (
        <div className="location-notice" role="status">
          <p>{locationNotice}</p>
          <button type="button" onClick={() => setLocationNotice('')}>
            Dismiss
          </button>
        </div>
      )}

      {error && <p className="error-banner">{error}</p>}

      {activeSection === 'home' ? (
        <div className="content-grid">
          <Dashboard
            cityName={position.cityName}
            current={current}
            trend={trend}
            cityComparisons={cityComparisons}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            lastUpdated={lastUpdated}
            isRefreshing={isRefreshing}
            confidenceScore={confidenceScore}
            dataCompleteness={dataCompleteness}
          />
          <LocationMap center={position} nearbyPoints={nearbyPoints} confidenceScore={confidenceScore} />
          <AlertsPanel cityName={position.cityName} current={current} confidenceScore={confidenceScore} dataCompleteness={dataCompleteness} exposureEstimate={exposureEstimate} />
          <HealthAdvisory />
          <SolutionsAwareness />
          <AnalyticsInsights analytics={analytics} trend={trend} timeRange={timeRange} />
          <ScenarioSimulator current={current} />
          <CommunityHub />
        </div>
      ) : (
        <div className="content-grid quiz-layout">
          <QuizSection />
        </div>
      )}

      <Footer />
    </main>
  );
}