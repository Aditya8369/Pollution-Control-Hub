import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSWR } from "./hooks/useSWR";
import AlertsPanel from "./components/AlertsPanel";
import AnalyticsInsights from "./components/AnalyticsInsights";
import CommunityHub from "./components/CommunityHub";
import Dashboard from "./components/Dashboard";
import Footer from "./components/Footer";
import HealthAdvisory from "./components/HealthAdvisory";
import LocationMap from "./components/LocationMap";
import QuizSection from "./components/QuizSection";
import SolutionsAwareness from "./components/SolutionsAwareness";
import ScenarioSimulator from "./components/ScenarioSimulator";
import AqiMissionGame from "./components/AqiMissionGame";
import HistoricalAnalysis from "./components/HistoricalAnalysis";
import LocationSearch from "./components/LocationSearch";
import SkeletonDashboard from "./components/SkeletonDashboard";
import { CITY_COORDINATES } from "./constants/cities";
import HotspotScoutGame from "./components/HotspotScoutGame";
import ErrorBoundary from "./components/ErrorBoundary";
import Commute from "./components/Commute";
import {
  estimateWeeklyMonthlyAverages,
  fetchAirQualityByCoords,
  fetchCityComparisons,
  estimateExposureTime,
  fetchWindData,
} from "./services/airQualityService";
import { eventBus } from "./core/events";

const DEFAULT_POSITION = {
  lat: 28.6139,
  lon: 77.209,
  cityName: "Delhi",
};

const THEME_STORAGE_KEY = "pollution-hub-theme";
const AUTO_REFRESH_SECONDS = 180;

function Hero({ cityName }) {
  return (
    <header className="hero flex *:flex-col items-center justify-center text-center">
      <div className="hero-overlay" />
      <div className="hero-content ">
        <p className="eyebrow">Pollution Control Hub</p>
        <h1>Monitor. Understand. Act.</h1>
        <p>
          A single digital platform to track air quality in {cityName}, protect
          health, and mobilize community-driven climate action.
        </p>
      </div>
    </header>
  );
}

function AppControls({
  selectedCity,
  onCityChange,
  isRefreshing,
  refreshCountdown,
  lastUpdated,
  detecting,
}) {
  return (
    <section className="app-controls" aria-label="Live controls">
      <div
        className="control-group"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <label htmlFor="city-selector">Track city:</label>
        <LocationSearch
          initialCityName={selectedCity === "auto" ? "auto" : selectedCity}
          onLocationSelected={onCityChange}
        />
        <button
          type="button"
          className="btn-secondary text-sm"
          style={{
            padding: "0.4rem 0.8rem",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
          onClick={() => onCityChange("auto")}
          disabled={detecting}
        >
          {detecting ? "Detecting..." : "Auto Detect"}
        </button>
      </div>

      <div className="control-group status">
        <span className={`live-dot ${isRefreshing ? "active" : ""}`} />
        <p>
          {isRefreshing
            ? "Refreshing live feed..."
            : `Auto refresh in ${refreshCountdown}s`}
        </p>
      </div>

      <div className="control-group actions">
        <button
          type="button"
          onClick={() => eventBus.emit("FORCE_REFRESH")}
          disabled={isRefreshing}
        >
          Refresh Now
        </button>
        <small>
          Last updated:{" "}
          {lastUpdated
            ? new Date(lastUpdated).toLocaleTimeString()
            : "Waiting..."}
        </small>
      </div>
    </section>
  );
}

function SectionNav({ activeSection, onSectionChange, theme }) {
  const sections = [
    { id: "home", label: "Home" },
    { id: "quiz", label: "Quiz" },
    { id: "game", label: "Game" },
    { id: "community", label: "Community" },
    { id: "history", label: "History" },
    { id: "Commute", label: "Commute" },
  ];
  const isDark = theme === "dark";

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 768px)").matches
      : false,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handler = (e) => setIsMobile(e.matches);

    // Add compatibility for older browsers if needed, though addEventListener is widely supported
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleSectionClick = (id) => {
    onSectionChange(id);
    setIsMenuOpen(false);
  };

  const themeToggleNode = (
    <button
      type="button"
      className={`theme-toggle-inline ${theme === "dark" ? "dark" : ""}`}
      onClick={() => eventBus.emit("TOGGLE_THEME")}
      aria-label="Toggle Theme"
    >
      <span className="toggle-thumb">
        {theme === "dark" ? (
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
  );

  if (!isMobile) {
    return (
      <nav className="section-nav" aria-label="Main sections" ref={menuRef}>
        <div className="nav-sections">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={activeSection === section.id ? "active" : ""}
              onClick={() => handleSectionClick(section.id)}
            >
              {section.label}
            </button>
          ))}
          <div className="nav-divider"></div>
          {themeToggleNode}
        </div>
      </nav>
    );
  }

  return (
    <header
      className="section-nav"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
      }}
    >
      <nav
        aria-label="Main sections"
        ref={menuRef}
        style={{ display: "flex", alignItems: "center" }}
      >
        <button
          className="hamburger-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-expanded={isMenuOpen}
          aria-label="Toggle navigation"
          aria-controls="mobile-navigation"
          style={{
            border: "1px solid var(--line)",
            background: "var(--card)",
            color: "var(--ink)",
            borderRadius: "50%",
            width: "44px",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "var(--shadow-sm)",
            padding: 0,
          }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            {isMenuOpen ? (
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
            ) : (
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            )}
          </svg>
        </button>

        {isMenuOpen && (
          <nav
            id="mobile-navigation"
            style={{
              position: "absolute",
              top: "100%",
              left: "1rem",
              right: "1rem",
              marginTop: "0.5rem",
              background: "var(--card)",
              boxShadow: "var(--shadow-lg)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              padding: "0.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              zIndex: 50,
            }}
          >
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={activeSection === section.id ? "active" : ""}
                onClick={() => handleSectionClick(section.id)}
                style={{
                  width: "100%",
                  textAlign: "center",
                  padding: "0.75rem 1rem",
                  border: "none",
                  background:
                    activeSection === section.id
                      ? "linear-gradient(120deg, var(--brand), var(--sky))"
                      : "transparent",
                  color: activeSection === section.id ? "#fff" : "var(--muted)",
                  borderRadius: "999px",
                  fontWeight: "700",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                {section.label}
              </button>
            ))}
          </nav>
        )}
      </nav>

      {themeToggleNode}
    </header>
  );
}

export default function App() {
  const [activeSection, setActiveSection] = useState(
    () => localStorage.getItem("activeSection") || "home",
  );

  // --- Helper: read city info from the URL hash (e.g. #city=Mumbai&lat=19.07&lon=72.87) ---
  function getCityFromHash() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const name = params.get("city");
    const lat = parseFloat(params.get("lat"));
    const lon = parseFloat(params.get("lon"));
    // Only use hash values if all three are present and valid
    if (name && !isNaN(lat) && !isNaN(lon)) {
      return { name, lat, lon };
    }
    return null;
  }

  // --- Helper: write city info into the URL hash so Back/Forward works ---
  function setCityInHash(name, lat, lon) {
    const params = new URLSearchParams();
    params.set("city", name);
    params.set("lat", lat);
    params.set("lon", lon);
    // pushState so browser Back button can restore the previous city
    window.history.pushState(null, "", "#" + params.toString());
  }

  // On first load: prefer URL hash → then localStorage → then 'auto'
  const [selectedCity, setSelectedCity] = useState(() => {
    const fromHash = getCityFromHash();
    if (fromHash) return fromHash.name;
    return localStorage.getItem("selectedCity") || "auto";
  });

  // On first load: prefer URL hash → then localStorage → then DEFAULT_POSITION
  const [position, setPosition] = useState(() => {
    const fromHash = getCityFromHash();
    if (fromHash)
      return { lat: fromHash.lat, lon: fromHash.lon, cityName: fromHash.name };
    const saved = localStorage.getItem("position");
    return saved ? JSON.parse(saved) : DEFAULT_POSITION;
  });
  const aqiKey =
    position.lat && position.lon ? `aqi_${position.lat}_${position.lon}` : null;
  const {
    data: aqiData,
    error: aqiError,
    isValidating: isAqiValidating,
    mutate: mutateAqi,
  } = useSWR(aqiKey, () => fetchAirQualityByCoords(position.lat, position.lon));

  const cityKey = "city_comparisons";
  const {
    data: cityComparisons,
    error: citiesError,
    isValidating: isCitiesValidating,
    mutate: mutateCities,
  } = useSWR(cityKey, () => fetchCityComparisons());

  const windKey =
    position.lat && position.lon
      ? `wind_${position.lat}_${position.lon}`
      : null;
  const {
    data: windData,
    error: windError,
    isValidating: isWindValidating,
    mutate: mutateWind,
  } = useSWR(windKey, () => fetchWindData(position.lat, position.lon));

  const current = aqiData?.current;
  const trend = aqiData?.trend || [];
  const nearbyPoints = aqiData?.nearbyPoints || [];
  const confidenceScore = aqiData?.confidenceScore || "High";
  const dataCompleteness = aqiData?.dataCompleteness || 100;

  const loading =
    (!aqiData && isAqiValidating) || (!cityComparisons && isCitiesValidating);
  const isRefreshing =
    (isAqiValidating || isCitiesValidating || isWindValidating) && !!aqiData;
  const error = (aqiError || citiesError || windError)?.message || "";

  const [lastUpdated, setLastUpdated] = useState("");
  const [refreshCountdown, setRefreshCountdown] =
    useState(AUTO_REFRESH_SECONDS);
  const [locationNotice, setLocationNotice] = useState("");
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme) return savedTheme;

    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const [timeRange, setTimeRange] = useState(() => {
    const saved = localStorage.getItem("timeRange");
    return saved ? Number(saved) : 24;
  });

  const debounceRef = useRef(null);
  const geoRequestId = useRef(0);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("activeSection", activeSection);
  }, [activeSection]);

  useEffect(() => {
    localStorage.setItem("selectedCity", selectedCity);
  }, [selectedCity]);

  useEffect(() => {
    localStorage.setItem("position", JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    localStorage.setItem("timeRange", timeRange.toString());
  }, [timeRange]);

  // Update lastUpdated when data changes
  useEffect(() => {
    if (aqiData) setLastUpdated(new Date().toISOString());
  }, [aqiData]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const startGeolocation = useCallback(() => {
    const requestId = ++geoRequestId.current;

    if (!navigator.geolocation) {
      setLocationNotice(
        "Your browser can't detect location, so we're showing Delhi.",
      );
      setPosition(DEFAULT_POSITION);
      setDetecting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (coords) => {
        if (requestId !== geoRequestId.current) return;
        setLocationNotice("");
        setPosition({
          lat: Number(coords.coords.latitude.toFixed(4)),
          lon: Number(coords.coords.longitude.toFixed(4)),
          cityName: "Your Current Location",
        });
        setDetecting(false);
      },
      (error) => {
        if (requestId !== geoRequestId.current) return;
        console.warn("Geolocation fallback active:", error);
        setLocationNotice(
          "Couldn't detect your location — showing Delhi for now.",
        );
        setPosition(DEFAULT_POSITION);
        setDetecting(false);
      },
      { timeout: 8000 },
    );
  }, []);

  // Initial mount geolocation if selectedCity is auto
  useEffect(() => {
    if (selectedCity === "auto") {
      setDetecting(true);
      startGeolocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAutoDetect = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setDetecting(true);
    debounceRef.current = setTimeout(() => {
      setSelectedCity("auto");
      startGeolocation();
    }, 500);
  }, [startGeolocation]);

  const handleLocationSelected = useCallback((location) => {
    if (location === "auto") {
      handleAutoDetect();
    } else {
      setSelectedCity(location.name);
      setPosition({
        lat: location.lat,
        lon: location.lon,
        cityName: location.name,
      });
      setCityInHash(location.name, location.lat, location.lon);
      setLocationNotice("");
    }
  }, [handleAutoDetect]);

  // Listen for browser Back/Forward (popstate) and restore the city from the URL hash
  useEffect(() => {
    function handlePopState() {
      const fromHash = getCityFromHash();
      if (fromHash) {
        // Restore the city that was in the URL before Back was pressed
        setSelectedCity(fromHash.name);
        setPosition({
          lat: fromHash.lat,
          lon: fromHash.lon,
          cityName: fromHash.name,
        });
      } else {
        // No hash → fall back to auto-detect
        setSelectedCity("auto");
        setDetecting(true);
        startGeolocation();
      }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [startGeolocation]);

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
      setRefreshCountdown((prev) =>
        prev <= 1 ? AUTO_REFRESH_SECONDS : prev - 1,
      );
    }, 1000);

    return () => {
      clearInterval(refreshTimer);
      clearInterval(countdownTimer);
    };
  }, [mutateAqi, mutateCities, mutateWind]);

  const analytics = useMemo(
    () => estimateWeeklyMonthlyAverages(trend),
    [trend],
  );
  const exposureEstimate = useMemo(
    () => estimateExposureTime(trend, current?.us_aqi),
    [trend, current],
  );

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
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

  useEffect(() => {
    eventBus.on("TOGGLE_THEME", toggleTheme);
    eventBus.on("FORCE_REFRESH", refreshNow);

    return () => {
      eventBus.off("TOGGLE_THEME", toggleTheme);
      eventBus.off("FORCE_REFRESH", refreshNow);
    };
  }, [toggleTheme, refreshNow]);

  return (
    <main className="app-shell">
      {/* 1. Structural fix: Renders the navigation element at the very top */}
      <SectionNav
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        theme={theme}
      />

      {loading && !error ? (
        <>
          <div className="loading-spinner" aria-hidden="true"></div>
          <h1 className="loading-title text-3xl">
            Preparing live pollution intelligence...
          </h1>

          <Hero cityName={position.cityName} />
          {activeSection === "home" && (
            <div
              key="skeleton-grid"
              className="content-grid"
              style={{ marginTop: "var(--sp-4)" }}
            >
              <SkeletonDashboard />
            </div>
          )}
        </>
      ) : (
        <>
          <Hero cityName={position.cityName} />

          {activeSection === "home" && (
            <AppControls
              selectedCity={selectedCity}
              onCityChange={handleLocationSelected}
              isRefreshing={isRefreshing}
              refreshCountdown={refreshCountdown}
              lastUpdated={lastUpdated}
              detecting={detecting}
            />
          )}

          {locationNotice && selectedCity === "auto" && (
            <div className="location-notice" role="status">
              <p>{locationNotice}</p>
              <button type="button" onClick={() => setLocationNotice("")}>
                Dismiss
              </button>
            </div>
          )}

          {error && <p className="error-banner">{error}</p>}

          {activeSection === "home" && current && (
            <div key="dashboard-grid" className="content-grid">
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

          {activeSection === "community" && (
            <div className="content-grid community-layout">
              <CommunityHub />
            </div>
          )}

          {activeSection === "history" && (
            <div className="content-grid history-layout">
              <HistoricalAnalysis position={position} />
            </div>
          )}

          {activeSection === "quiz" && (
            <div className="content-grid quiz-layout">
              <QuizSection />
            </div>
          )}

          {activeSection === "game" && (
            <div className="content-grid game-layout">
              <AqiMissionGame current={current} />
              <HotspotScoutGame nearbyPoints={nearbyPoints} />
            </div>
          )}

          {activeSection === "Commute" && <Commute />}
          <Footer />
        </>
      )}
    </main>
  );
}
