import { useEffect, useMemo, useRef, useState } from 'react';
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
  estimateWeeklyMonthlyAverages,
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
    <header className="hero flex *:flex-col items-center justify-center text-center">
      <div className="hero-overlay" />
      <div className="hero-content ">
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
    { id: 'quiz', label: 'Quiz' },
    { id: 'community', label: 'Community' }
  ];
  const isDark = theme === 'dark';

  return (
    <nav 
      className="section-nav" 
      aria-label="Main sections"
    >
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

        <div className="nav-divider"></div>

        <button
          type="button"
          className={`theme-toggle-inline ${theme === "dark" ? "dark" : ""}`}
          onClick={onToggleTheme}
          aria-label="Toggle Theme"
        >
          <span className="toggle-thumb">
            {theme === "dark" ? (
              <svg
                viewBox="0 0 24 24"
                className="moon-icon"
              >
                <path
                  d="M20 15.5A8.5 8.5 0 1 1 12.5 4a7 7 0 0 0 7.5 11.5z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="sun-icon"
              >
                <circle cx="12" cy="12" r="5" fill="currentColor" />
                <g stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="4" />
                  <line x1="12" y1="20" x2="12" y2="23" />
                  <line x1="1" y1="12" x2="4" y2="12" />
                  <line x1="20" y1="12" x2="23" y2="12" />
                  <line x1="4" y1="4" x2="6" y2="6" />
                  <line x1="18" y1="18" x2="20" y2="20" />
                  <line x1="18" y1="6" x2="20" y2="4" />
                  <line x1="4" y1="20" x2="6" y2="18" />
                </g>
              </svg>
            )}
          </span>
        </button>
      </div>
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
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [refreshCountdown, setRefreshCountdown] = useState(AUTO_REFRESH_SECONDS);
  const [error, setError] = useState('');
  const [locationNotice, setLocationNotice] = useState('');
  const [theme, setTheme] = useState('light');
  const [timeRange, setTimeRange] = useState(24);
  const refreshControllerRef = useRef(null);

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
    const controller = new AbortController();
    const { signal } = controller;

    const load = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        if (silent) setIsRefreshing(true);

        const [aqi, cities] = await Promise.all([
          fetchAirQualityByCoords(position.lat, position.lon, signal),
          fetchCityComparisons(signal)
        ]);

        setCurrent(aqi.current);
        setTrend(aqi.trend);
        setNearbyPoints(aqi.nearbyPoints);
        setConfidenceScore(aqi.confidenceScore);
        setDataCompleteness(aqi.dataCompleteness);
        setCityComparisons(cities);
        setLastUpdated(new Date().toISOString());
        setRefreshCountdown(AUTO_REFRESH_SECONDS);
        setError('');
      } catch (loadError) {
        if (loadError.name === 'AbortError') return;
        setError(loadError.message || 'Unable to load live AQI data.');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
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
      controller.abort();
      if (refreshControllerRef.current) refreshControllerRef.current.abort();
      clearInterval(refreshTimer);
      clearInterval(countdownTimer);
    };
  }, [position.lat, position.lon]);

  const analytics = useMemo(() => estimateWeeklyMonthlyAverages(trend), [trend]);
  const exposureEstimate = useMemo(
    () => estimateExposureTime(trend, current?.us_aqi), 
    [trend, current]
  );


  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const refreshNow = async () => {
    if (isRefreshing) return;

    if (refreshControllerRef.current) refreshControllerRef.current.abort();
    const controller = new AbortController();
    refreshControllerRef.current = controller;
    const { signal } = controller;

    try {
      setIsRefreshing(true);
      const [aqi, cities] = await Promise.all([
        fetchAirQualityByCoords(position.lat, position.lon, signal),
        fetchCityComparisons(signal)
      ]);
      setCurrent(aqi.current);
      setTrend(aqi.trend);
      setNearbyPoints(aqi.nearbyPoints);
      setConfidenceScore(aqi.confidenceScore);
      setDataCompleteness(aqi.dataCompleteness);
      setCityComparisons(cities);
      setLastUpdated(new Date().toISOString());
      setRefreshCountdown(AUTO_REFRESH_SECONDS);
    } catch (loadError) {
      if (loadError.name === 'AbortError') return;
      setError(loadError.message || 'Unable to refresh live AQI data.');
    } finally {
      if (refreshControllerRef.current === controller) {
        setIsRefreshing(false);
      }
    }
  };

  if (loading || !current) {
    return (
      <main className="app-shell loading-state">
        <SectionNav activeSection={activeSection} onSectionChange={setActiveSection} theme={theme} onToggleTheme={toggleTheme} />
        <h1 className="loading-title text-3xl">Preparing live pollution intelligence...</h1>
      </main>
    );
  }

  return (
    <main className="app-shell">
      {/* 1. Structural fix: Renders the navigation element at the very top */}
      <SectionNav activeSection={activeSection} onSectionChange={setActiveSection} theme={theme} onToggleTheme={toggleTheme} />
      
      <Hero cityName={position.cityName} />

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
        </div>
      ) : activeSection === 'community' ? (
        <div className="content-grid community-layout">
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