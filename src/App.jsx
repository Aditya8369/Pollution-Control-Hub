import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSWR } from './hooks/useSWR';
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
import AqiMissionGame from './components/AqiMissionGame';
import HistoricalAnalysis from './components/HistoricalAnalysis';
import LocationSearch from './components/LocationSearch';
import SkeletonDashboard from './components/SkeletonDashboard';
import { CITY_COORDINATES } from './constants/cities';
import HotspotScoutGame from "./components/HotspotScoutGame";
import {
  estimateWeeklyMonthlyAverages,
  fetchAirQualityByCoords,
  fetchCityComparisons,
  estimateExposureTime,
  fetchWindData
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
      <div className="control-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap' }}>
        <label htmlFor="city-selector">Track city:</label>
        <LocationSearch 
          initialCityName={selectedCity === 'auto' ? 'auto' : selectedCity} 
          onLocationSelected={onCityChange} 
        />
        <button 
          type="button" 
          className="btn-secondary text-sm" 
          style={{ padding: '0.4rem 0.8rem', whiteSpace: 'nowrap', flexShrink: 0 }}
          onClick={() => onCityChange('auto')}
        >
          Auto Detect
        </button>
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
    { id: 'game', label: 'Game' },
    { id: 'community', label: 'Community' },
    { id: 'history', label: 'History' }
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
  const aqiKey = position.lat && position.lon ? `aqi_${position.lat}_${position.lon}` : null;
  const { data: aqiData, error: aqiError, isValidating: isAqiValidating, mutate: mutateAqi } = useSWR(
    aqiKey, 
    () => fetchAirQualityByCoords(position.lat, position.lon)
  );

  const cityKey = 'city_comparisons';
  const { data: cityComparisons, error: citiesError, isValidating: isCitiesValidating, mutate: mutateCities } = useSWR(
    cityKey,
    () => fetchCityComparisons()
  );

  const windKey = position.lat && position.lon ? `wind_${position.lat}_${position.lon}` : null;
  const { data: windData, error: windError, isValidating: isWindValidating, mutate: mutateWind } = useSWR(
    windKey,
    () => fetchWindData(position.lat, position.lon)
  );

  const current = aqiData?.current;
  const trend = aqiData?.trend || [];
  const nearbyPoints = aqiData?.nearbyPoints || [];
  const confidenceScore = aqiData?.confidenceScore || 'High';
  const dataCompleteness = aqiData?.dataCompleteness || 100;

  const loading = (!aqiData && isAqiValidating) || (!cityComparisons && isCitiesValidating);
  const isRefreshing = (isAqiValidating || isCitiesValidating || isWindValidating) && !!aqiData;
  const error = (aqiError || citiesError || windError)?.message || '';

  const [lastUpdated, setLastUpdated] = useState('');
  const [refreshCountdown, setRefreshCountdown] = useState(AUTO_REFRESH_SECONDS);
  const [locationNotice, setLocationNotice] = useState('');
  const [theme, setTheme] = useState('light');
  const [timeRange, setTimeRange] = useState(24);

  // Update lastUpdated when data changes
  useEffect(() => {
    if (aqiData) setLastUpdated(new Date().toISOString());
  }, [aqiData]);

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
    if (selectedCity === 'auto') {
      if (!navigator.geolocation) {
        setLocationNotice(
          "Your browser can't detect location, so we're showing Delhi."
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
            "Couldn't detect your location — showing Delhi for now."
          );
          setPosition(DEFAULT_POSITION);
        },
        { timeout: 8000 }
      );
    }
  }, [selectedCity]);

  const handleLocationSelected = (location) => {
    if (location === 'auto') {
      setSelectedCity('auto');
    } else {
      setSelectedCity(location.name);
      setPosition({
        lat: location.lat,
        lon: location.lon,
        cityName: location.name
      });
      setLocationNotice('');
    }
  };

  useEffect(() => {
    const refreshTimer = setInterval(() => {
      if (navigator.onLine) {
        mutateAqi();
        mutateCities();
        mutateWind();
        setRefreshCountdown(AUTO_REFRESH_SECONDS);
      }
    }, AUTO_REFRESH_SECONDS * 1000);

    const countdownTimer = setInterval(() => {
      setRefreshCountdown((prev) => (prev <= 1 ? AUTO_REFRESH_SECONDS : prev - 1));
    }, 1000);

    return () => {
      clearInterval(refreshTimer);
      clearInterval(countdownTimer);
    };
  }, [mutateAqi, mutateCities, mutateWind]);

  const analytics = useMemo(() => estimateWeeklyMonthlyAverages(trend), [trend]);
  const exposureEstimate = useMemo(
    () => estimateExposureTime(trend, current?.us_aqi), 
    [trend, current]
  );


  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const refreshNow = useCallback(async () => {
    if (isRefreshing) return;
    mutateAqi();
    mutateCities();
    mutateWind();
    setRefreshCountdown(AUTO_REFRESH_SECONDS);
  }, [isRefreshing, mutateAqi, mutateCities, mutateWind]);

  useEffect(() => {
  const handleOnline = () => refreshNow();

  window.addEventListener("online", handleOnline);

  return () => {
    window.removeEventListener("online", handleOnline);
  };
}, []);

  if (loading && !error) {
    return (
      <main className="app-shell">
        <SectionNav activeSection={activeSection} onSectionChange={setActiveSection} theme={theme} onToggleTheme={toggleTheme} />
        <Hero cityName={position.cityName} />
        {activeSection === 'home' && (
          <div className="content-grid" style={{ marginTop: 'var(--sp-4)' }}>
            <SkeletonDashboard />
          </div>
        )}
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
          onCityChange={handleLocationSelected}
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

      {activeSection === 'home' && current && (
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

          <LocationMap
            center={position}
            nearbyPoints={nearbyPoints}
            confidenceScore={confidenceScore}
            windData={windData}
          />

          <AlertsPanel
            cityName={position.cityName}
            current={current}
            confidenceScore={confidenceScore}
            dataCompleteness={dataCompleteness}
            exposureEstimate={exposureEstimate}
          />

          <HealthAdvisory />

          <SolutionsAwareness />

          <AnalyticsInsights
            analytics={analytics}
            trend={trend}
            timeRange={timeRange}
          />

          <ScenarioSimulator current={current} />
        </div>
      )}

      {activeSection === 'community' && (
        <div className="content-grid community-layout">
          <CommunityHub />
        </div>
      )}

      {activeSection === 'history' && (
        <div className="content-grid history-layout">
          <HistoricalAnalysis position={position} />
        </div>
      )}

      {activeSection === 'quiz' && (
        <div className="content-grid quiz-layout">
          <QuizSection />
        </div>
      )}

      {activeSection === 'game' && (
  <div className="content-grid game-layout">
    <AqiMissionGame current={current} />
    <HotspotScoutGame nearbyPoints={nearbyPoints} />
  </div>
)}

      <Footer />
    </main>
  );
}