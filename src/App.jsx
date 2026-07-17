import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
import LocationGate from './components/LocationGate';
import SkeletonDashboard from './components/SkeletonDashboard';
import HotspotScoutGame from './components/HotspotScoutGame';
import ErrorBoundary from './components/ErrorBoundary';
import {
  estimateWeeklyMonthlyAverages,
  fetchAirQualityByCoords,
  fetchCityComparisons,
  estimateExposureTime,
  fetchWindData
} from './services/airQualityService';
import {
  requestUserLocation,
  isGeolocationSupported,
  isSecureContext
} from './utils/geolocation';
import { reverseGeocode } from './services/geocodingService';

const LOCATION_SOURCE_KEY = 'locationSource';
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
  displayCityName,
  onCityChange,
  onUseMyLocation,
  isDetectingLocation,
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
          initialCityName={displayCityName || (selectedCity === 'auto' ? '' : selectedCity)}
          onLocationSelected={onCityChange}
        />
        <button
          type="button"
          className="btn-secondary text-sm"
          style={{ padding: '0.4rem 0.8rem', whiteSpace: 'nowrap', flexShrink: 0 }}
          onClick={onUseMyLocation}
          disabled={isDetectingLocation}
        >
          {isDetectingLocation ? 'Detecting...' : 'Use My Location'}
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

        <div className="nav-divider"></div>

        <button
          type="button"
          className={`theme-toggle-inline ${theme === 'dark' ? 'dark' : ''}`}
          onClick={onToggleTheme}
          aria-label="Toggle Theme"
        >
          <span className="toggle-thumb">
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" className="moon-icon">
                <path
                  d="M20 15.5A8.5 8.5 0 1 1 12.5 4a7 7 0 0 0 7.5 11.5z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="sun-icon">
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
  const [activeSection, setActiveSection] = useState(() => localStorage.getItem('activeSection') || 'home');

  function getCityFromHash() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const name = params.get('city');
    const lat = parseFloat(params.get('lat'));
    const lon = parseFloat(params.get('lon'));
    if (name && !isNaN(lat) && !isNaN(lon)) {
      return { name, lat, lon };
    }
    return null;
  }

  function setCityInHash(name, lat, lon) {
    const params = new URLSearchParams();
    params.set('city', name);
    params.set('lat', lat);
    params.set('lon', lon);
    window.history.pushState(null, '', '#' + params.toString());
  }

  const [selectedCity, setSelectedCity] = useState(() => {
    const fromHash = getCityFromHash();
    if (fromHash) return fromHash.name;
    const source = localStorage.getItem(LOCATION_SOURCE_KEY);
    const saved = localStorage.getItem('selectedCity');
    if (source === 'manual' && saved && saved !== 'auto') return saved;
    if (source === 'gps' && saved && saved !== 'auto') return saved;
    return 'auto';
  });

  const [position, setPosition] = useState(() => {
    const fromHash = getCityFromHash();
    if (fromHash) return { lat: fromHash.lat, lon: fromHash.lon, cityName: fromHash.name };

    const source = localStorage.getItem(LOCATION_SOURCE_KEY);
    const saved = localStorage.getItem('position');
    if (!saved || !source) return null;

    try {
      const parsed = JSON.parse(saved);
      if (source === 'gps' && parsed.lat && parsed.lon) return parsed;
      if (source === 'manual') return parsed;
    } catch {
      return null;
    }
    return null;
  });

  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const geoRequestId = useRef(0);
  const showLocationGate = !position;

  const positionRef = useRef(position);
  positionRef.current = position;

  const detectUserLocation = useCallback(async () => {
    if (!isGeolocationSupported()) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    if (!isSecureContext()) {
      setLocationError('Open the app at http://localhost:5173 (not an IP address) to use location.');
      return;
    }

    const requestId = ++geoRequestId.current;
    setIsDetectingLocation(true);
    setLocationError('');

    try {
      const coords = await requestUserLocation();
      if (requestId !== geoRequestId.current) return;

      const place = await reverseGeocode(coords.lat, coords.lon);
      if (requestId !== geoRequestId.current) return;

      const cityName = place.name;
      setPosition({ lat: coords.lat, lon: coords.lon, cityName });
      setSelectedCity(cityName);
      localStorage.setItem(LOCATION_SOURCE_KEY, 'gps');
      localStorage.setItem('selectedCity', cityName);
      window.history.pushState(null, '', window.location.pathname);
    } catch (err) {
      if (requestId !== geoRequestId.current) return;
      setLocationError(err.message);
    } finally {
      if (requestId === geoRequestId.current) {
        setIsDetectingLocation(false);
      }
    }
  }, []);

  const handleUseMyLocation = useCallback(() => {
    detectUserLocation();
  }, [detectUserLocation]);

  const focusCitySearch = useCallback(() => {
    document.querySelector('.location-search-input')?.focus();
  }, []);

  const aqiKey = position?.lat && position?.lon ? `aqi_${position.lat}_${position.lon}` : null;
  const { data: aqiData, error: aqiError, isValidating: isAqiValidating, mutate: mutateAqi } = useSWR(
    aqiKey,
    () => {
      const coords = positionRef.current;
      if (!coords?.lat || !coords?.lon) return null;
      return fetchAirQualityByCoords(coords.lat, coords.lon);
    }
  );

  const cityKey = 'city_comparisons';
  const { data: cityComparisons, error: citiesError, isValidating: isCitiesValidating, mutate: mutateCities } = useSWR(
    cityKey,
    () => fetchCityComparisons()
  );

  const windKey = position?.lat && position?.lon ? `wind_${position.lat}_${position.lon}` : null;
  const { data: windData, error: windError, isValidating: isWindValidating, mutate: mutateWind } = useSWR(
    windKey,
    () => {
      const coords = positionRef.current;
      if (!coords?.lat || !coords?.lon) return null;
      return fetchWindData(coords.lat, coords.lon);
    }
  );

  const current = aqiData?.current;
  const trend = aqiData?.trend || [];
  const nearbyPoints = aqiData?.nearbyPoints || [];
  const confidenceScore = aqiData?.confidenceScore || 'High';
  const dataCompleteness = aqiData?.dataCompleteness || 100;

  const loading =
    !showLocationGate &&
    ((position && !aqiData && isAqiValidating) || (!cityComparisons && isCitiesValidating));
  const isRefreshing = (isAqiValidating || isCitiesValidating || isWindValidating) && !!aqiData;
  const error = (aqiError || citiesError || windError)?.message || '';

  const [lastUpdated, setLastUpdated] = useState('');
  const [refreshCountdown, setRefreshCountdown] = useState(AUTO_REFRESH_SECONDS);
  const [theme, setTheme] = useState('light');
  const [timeRange, setTimeRange] = useState(() => {
    const saved = localStorage.getItem('timeRange');
    return saved ? Number(saved) : 24;
  });

  useEffect(() => {
    localStorage.setItem('activeSection', activeSection);
  }, [activeSection]);

  useEffect(() => {
    localStorage.setItem('selectedCity', selectedCity);
  }, [selectedCity]);

  useEffect(() => {
    if (position) {
      localStorage.setItem('position', JSON.stringify(position));
    }
  }, [position]);

  useEffect(() => {
    const source = localStorage.getItem(LOCATION_SOURCE_KEY);
    if (source !== 'gps' && source !== 'manual') {
      localStorage.removeItem('position');
      localStorage.setItem('selectedCity', 'auto');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('timeRange', timeRange.toString());
  }, [timeRange]);

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

  const handleLocationSelected = (location) => {
    if (location === 'auto') {
      handleUseMyLocation();
    } else {
      setSelectedCity(location.name);
      setLocationError('');
      setPosition({
        lat: location.lat,
        lon: location.lon,
        cityName: location.name
      });
      localStorage.setItem(LOCATION_SOURCE_KEY, 'manual');
      setCityInHash(location.name, location.lat, location.lon);
    }
  };

  useEffect(() => {
    function handlePopState() {
      const fromHash = getCityFromHash();
      if (fromHash) {
        setSelectedCity(fromHash.name);
        setPosition({ lat: fromHash.lat, lon: fromHash.lon, cityName: fromHash.name });
        localStorage.setItem(LOCATION_SOURCE_KEY, 'manual');
      } else {
        setSelectedCity('auto');
        localStorage.removeItem(LOCATION_SOURCE_KEY);
        setPosition(null);
      }
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

        <div className="loading-spinner" aria-hidden="true"></div>
        <h1 className="loading-title text-3xl">
          Preparing live pollution intelligence...
        </h1>

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
          displayCityName={position?.cityName}
          onCityChange={handleLocationSelected}
          onUseMyLocation={handleUseMyLocation}
          isDetectingLocation={isDetectingLocation}
          onRefresh={refreshNow}
          isRefreshing={isRefreshing}
          refreshCountdown={refreshCountdown}
          lastUpdated={lastUpdated}
        />
      )}

      {error && <p className="error-banner">{error}</p>}

      {aqiData?.isFallback && (
        <div className="warning-banner" role="status">
          <p>
            Showing cached data: we could not retrieve live air quality right now.
            Last known reading from {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'cache'}.
          </p>
        </div>
      )}

      {activeSection === 'home' && (
        <div key="dashboard-grid" className="content-grid">
          {current && position ? (
            <>
              <ErrorBoundary>
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
                  isFallback={aqiData?.isFallback}
                />
              </ErrorBoundary>

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
              <AnalyticsInsights analytics={analytics} trend={trend} timeRange={timeRange} />
              <ScenarioSimulator current={current} />
            </>
          ) : (
            <ErrorBoundary>
              <Dashboard
                cityName={position?.cityName || 'your area'}
                current={null}
                isFallback={false}
              />
            </ErrorBoundary>
          )}
        </div>
      )}

      {activeSection === 'community' && (
        <div className="content-grid community-layout">
          <CommunityHub />
        </div>
      )}

      {activeSection === 'history' && position && (
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
