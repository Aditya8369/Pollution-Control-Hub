import { useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense } from "react";
import { useSWR } from "./hooks/useSWR";
import { cacheStore } from "./utils/cacheStore";
import AlertsPanel from "./components/AlertsPanel";
import AnalyticsInsights from "./components/AnalyticsInsights";
import CommunityHub from "./components/CommunityHub";
import Dashboard from "./components/Dashboard";
import Footer from "./components/Footer";
import HealthAdvisory from "./components/HealthAdvisory";
import PollenAllergenForecast from "./components/PollenAllergenForecast";
import ExposureCalculator from "./components/ExposureCalculator";
import LocationMap from "./components/LocationMap";
import QuizSection from "./components/QuizSection";
import SolutionsAwareness from "./components/SolutionsAwareness";
import ScenarioSimulator from "./components/ScenarioSimulator";
import HistoricalAnalysis from "./components/HistoricalAnalysis";
import Factoid from "./components/Factoid";
import HistoricalData from "./components/HistoricalData";
import LocationSearch from "./components/LocationSearch";
import SkeletonDashboard from "./components/SkeletonDashboard";
// @ts-ignore
import { CITY_COORDINATES } from "./constants/cities";
// @ts-ignore
import ErrorBoundary from "./components/ErrorBoundary";
import Commute from "./components/Commute";
import GettingStarted from "./components/GettingStarted";
import CityCompare from "./components/CityCompare";
import SunSafetyDashboard from "./components/SunSafetyDashboard";
import {
  estimateWeeklyMonthlyAverages,
  fetchAirQualityByCoords,
  fetchCityComparisons,
  estimateExposureTime,
  fetchWindData,
} from "./services/airQualityService";
import { eventBus } from "./core/events";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import ThemeSwitcher from "./components/ThemeSwitcher";
import CarbonFootprintCalculator from "./components/CarbonFootprintCalculator";
import Leaderboard from "./components/Leaderboard";
import EmbeddableWidgetGenerator from "./components/EmbeddableWidgetGenerator";
import Glossary from "./components/Glossary";

const AqiMissionGame = lazy(() => import("./components/AqiMissionGame"));
const HotspotScoutGame = lazy(() => import("./components/HotspotScoutGame"));
const RiverOriginGame = lazy(() => import("./components/RiverOriginGame"));

const DEFAULT_POSITION = {
  lat: 28.6139,
  lon: 77.209,
  cityName: "Delhi",
};

const SAVED_LOCATIONS_KEY = "pollution-hub-saved-locations";

const THEME_STORAGE_KEY = "pollution-hub-theme";
const THEME_SOURCE_KEY = "pollution-hub-theme-source";
const AUTO_REFRESH_STORAGE_KEY = "pollution-hub-auto-refresh-seconds";
const DEFAULT_AUTO_REFRESH_SECONDS = 180;
const AUTO_REFRESH_OPTIONS = [
  { label: "Off", seconds: 0 },
  { label: "1 min", seconds: 60 },
  { label: "3 min", seconds: 180 },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
];

/** @returns {number} Saved auto-refresh interval in seconds, or the default. */
function readAutoRefreshSeconds() {
  try {
    const raw = localStorage.getItem(AUTO_REFRESH_STORAGE_KEY);
    if (raw == null) return DEFAULT_AUTO_REFRESH_SECONDS;
    const value = Number(raw);
    if (!AUTO_REFRESH_OPTIONS.some((option) => option.seconds === value)) {
      return DEFAULT_AUTO_REFRESH_SECONDS;
    }
    return value;
  } catch {
    return DEFAULT_AUTO_REFRESH_SECONDS;
  }
}

/** @returns {"dark"|"light"} The OS colour-scheme preference, defaulting to light. */
// @ts-ignore
function getSystemTheme() {
  return typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** @returns {boolean} True when the user has explicitly picked a theme in the app. */
function hasManualThemePreference() {
  return localStorage.getItem(THEME_SOURCE_KEY) === "manual";
}

/** @returns {any[]} The locations the user pinned, or an empty list if none are readable. */
function readSavedLocations() {
  try {
    const raw = localStorage.getItem(SAVED_LOCATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let lastGeocodeRequestAt = 0;

async function reverseGeocodeCity(lat, lon) {
  const cacheKey = `geocode-${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = await cacheStore.get(cacheKey);
  if (cached && cached.data) return cached.data;

  const elapsed = Date.now() - lastGeocodeRequestAt;
  if (elapsed < 1100) {
    await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed));
  }
  lastGeocodeRequestAt = Date.now();

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
  );
  if (!response.ok) {
    throw new Error(`Reverse geocoding failed with status: ${response.status}`);
  }
  const data = await response.json();
  const address = data?.address || {};
  const cityName =
    address.city ||
    address.town ||
    address.village ||
    address.suburb ||
    data?.display_name?.split(",")[0] ||
    "Your Current Location";

  cacheStore.set(cacheKey, cityName);
  return cityName;
}

/** @param {any} params */
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

/** @param {any} params */
function AppControls({
  selectedCity,
  onCityChange,
  isRefreshing,
  refreshCountdown,
  lastUpdated,
  detecting,
  currentCity,
  savedLocations,
  onSaveLocation,
  onRemoveSavedLocation,
  autoRefreshSeconds,
  onAutoRefreshChange,
}) {
  const isCurrentCitySaved = savedLocations.some(
    (item) => item.name === currentCity,
  );

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
        <button
          type="button"
          className="btn-secondary text-sm"
          style={{
            padding: "0.4rem 0.8rem",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
          onClick={onSaveLocation}
          disabled={isCurrentCitySaved}
        >
          {isCurrentCitySaved ? "Saved" : "Save Location"}
        </button>
      </div>

      {savedLocations.length > 0 && (
        <div
          className="control-group saved-locations"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          <label>Saved:</label>
          {savedLocations.map((location) => (
            <span
              key={location.name}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <button
                type="button"
                className="btn-secondary text-sm"
                style={{ padding: "0.3rem 0.7rem", whiteSpace: "nowrap" }}
                onClick={() => onCityChange(location)}
              >
                {location.name}
              </button>
              <button
                type="button"
                className="btn-secondary text-sm"
                style={{ padding: "0.3rem 0.5rem" }}
                onClick={() => onRemoveSavedLocation(location.name)}
                aria-label={`Remove ${location.name} from saved locations`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="control-group status">
        <span className={`live-dot ${isRefreshing ? "active" : ""}`} />
        <p>
          {isRefreshing
            ? "Refreshing live feed..."
            : autoRefreshSeconds === 0
              ? "Auto refresh off"
              : `Auto refresh in ${refreshCountdown}s`}
        </p>
        <label htmlFor="auto-refresh-interval" style={{ marginLeft: "0.5rem" }}>
          Interval:
        </label>
        <select
          id="auto-refresh-interval"
          value={autoRefreshSeconds}
          onChange={(event) => onAutoRefreshChange(Number(event.target.value))}
          style={{ padding: "0.3rem 0.5rem" }}
        >
          {AUTO_REFRESH_OPTIONS.map((option) => (
            <option key={option.seconds} value={option.seconds}>
              {option.label}
            </option>
          ))}
        </select>
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

/** @param {any} params */
function SectionNav({ activeSection, onSectionChange, theme }) {
  const sections = [
    { id: "home", label: "Home" },
    { id: "getting-started", label: "Getting Started" },
    { id: "Compare", label: "Compare" },
    { id: "exposure", label: "Exposure Calculator" },
    { id: "quiz", label: "Quiz" },
    { id: "widget", label: "AQI Widget" },
    { id: "game", label: "Game" },
    { id: "community", label: "Community" },
    { id: "history", label: "History" },
    { id: "historical-data", label: "Data Explorer" },
    { id: "Commute", label: "Commute" },
    { id: "CarbonCalculator", label: "Carbon Calculator" },
    { id: "glossary", label: "Glossary" },
  ];

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

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

  return (
    <header
      className="section-nav"
      ref={menuRef}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
      }}
    >
      {/* 
        Refactored: CSS-based responsive logic directly embedded to prevent re-renders.
      */}
      <style>{`
        .nav-desktop {
          display: flex;
          align-items: center;
        }
        .nav-mobile, .mobile-theme-switcher {
          display: none !important;
        }
        
        @media (max-width: 768px) {
          .nav-desktop {
            display: none !important;
          }
          .nav-mobile {
            display: flex !important;
            align-items: center;
          }
          .mobile-theme-switcher {
            display: block !important;
          }
          .hamburger-btn {
            border: 1px solid var(--line, #334155);
            background: var(--card, #1e293b);
            color: var(--ink, #fff);
            border-radius: 50%;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: var(--shadow-sm);
            padding: 0;
          }
          .mobile-dropdown {
            display: none;
          }
          .mobile-dropdown.open {
            display: flex;
            position: absolute;
            top: 100%;
            left: 1rem;
            right: 1rem;
            margin-top: 0.5rem;
            background: var(--card, #1e293b);
            box-shadow: var(--shadow-lg);
            border: 1px solid var(--line, #334155);
            border-radius: var(--r-md, 8px);
            padding: 0.5rem;
            flex-direction: column;
            gap: 0.5rem;
            z-index: 50;
          }
          .mobile-dropdown button {
            width: 100%;
            text-align: center;
            padding: 0.75rem 1rem;
            border: none;
            background: transparent;
            color: var(--muted, #94a3b8);
            border-radius: 999px;
            font-weight: 700;
            font-size: 0.9rem;
            cursor: pointer;
          }
          .mobile-dropdown button.active {
            background: linear-gradient(120deg, var(--brand, #0d9488), var(--sky, #0ea5e9));
            color: #fff;
          }
        }
      `}</style>

      {/* --- DESKTOP LAYOUT --- */}
      <nav className="nav-sections nav-desktop" aria-label="Main sections">
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
        <ThemeSwitcher />
      </nav>

      {/* --- MOBILE LAYOUT --- */}
      <nav className="nav-mobile" aria-label="Mobile navigation">
        <button
          className="hamburger-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-expanded={isMenuOpen}
          aria-label="Toggle navigation"
          aria-controls="mobile-navigation"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            {isMenuOpen ? (
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
            ) : (
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            )}
          </svg>
        </button>

        <div id="mobile-navigation" className={`mobile-dropdown ${isMenuOpen ? "open" : ""}`}>
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
        </div>
      </nav>

      <div className="mobile-theme-switcher">
        <ThemeSwitcher />
      </div>
    </header>
  );
}

function AppContent() {
  const [activeSection, setActiveSection] = useState(
    () => localStorage.getItem("activeSection") || "home",
  );

  function getCityFromHash() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const name = params.get("city");
    const lat = parseFloat(params.get("lat"));
    const lon = parseFloat(params.get("lon"));
    if (name && !isNaN(lat) && !isNaN(lon)) {
      return { name, lat, lon };
    }
    return null;
  }

  function setCityInHash(name, lat, lon) {
    const params = new URLSearchParams();
    params.set("city", name);
    params.set("lat", lat);
    params.set("lon", lon);
    window.history.pushState(null, "", "#" + params.toString());
  }

  const [selectedCity, setSelectedCity] = useState(() => {
    const fromHash = getCityFromHash();
    if (fromHash) return fromHash.name;
    return localStorage.getItem("selectedCity") || "auto";
  });

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
    // @ts-ignore
  } = useSWR(aqiKey, () => fetchAirQualityByCoords(position.lat, position.lon));

  const cityKey = "city_comparisons";
  const {
    data: cityComparisons,
    error: citiesError,
    isValidating: isCitiesValidating,
    mutate: mutateCities,
    // @ts-ignore
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
    // @ts-ignore
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
  const [autoRefreshSeconds, setAutoRefreshSeconds] = useState(
    () => readAutoRefreshSeconds(),
  );
  const [refreshCountdown, setRefreshCountdown] = useState(
    () => readAutoRefreshSeconds(),
  );
  const [savedLocations, setSavedLocations] = useState(() => readSavedLocations());
  const [locationNotice, setLocationNotice] = useState("");
  const [persistenceWarning, setPersistenceWarning] = useState("");
  // @ts-ignore
  const { theme, setTheme, changeTheme } = useTheme();
  const [timeRange, setTimeRange] = useState(() => {
    const saved = localStorage.getItem("timeRange");
    return saved ? Number(saved) : 24;
  });
  const [osThemeSuggestion, setOsThemeSuggestion] = useState(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const debounceRef = useRef(null);
  const geoRequestId = useRef(0);
  const scrollAnchorRef = useRef(null);

  useEffect(() => {
    if (activeSection === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeSection]);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    const unsubscribe = cacheStore.onPersistenceError(() => {
      setPersistenceWarning(
        "Offline caching is unavailable — your data may not persist between sessions."
      );
    });
    return () => { unsubscribe(); };
  }, []);

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
    try {
      localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(savedLocations));
    } catch {
    }
  }, [savedLocations]);

  useEffect(() => {
    localStorage.setItem("timeRange", timeRange.toString());
  }, [timeRange]);

  useEffect(() => {
    if (aqiData) setLastUpdated(new Date().toISOString());
  }, [aqiData]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleOsThemeChange = (e) => {
      const newSystemTheme = e.matches ? "dark" : "light";

      if (!hasManualThemePreference()) {
        // @ts-ignore
        setTheme(newSystemTheme);
        return;
      }

      if (newSystemTheme !== themeRef.current) {
        setOsThemeSuggestion(newSystemTheme);
      }
    };
    mediaQuery.addEventListener("change", handleOsThemeChange);
    return () => mediaQuery.removeEventListener("change", handleOsThemeChange);
  }, []);

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
      async (coords) => {
        if (requestId !== geoRequestId.current) return;
        const lat = Number(coords.coords.latitude.toFixed(4));
        const lon = Number(coords.coords.longitude.toFixed(4));

        setLocationNotice("");
        setPosition({ lat, lon, cityName: "Your Current Location" });
        setDetecting(false);

        try {
          const cityName = await reverseGeocodeCity(lat, lon);
          if (requestId === geoRequestId.current) {
            setPosition({ lat, lon, cityName });
          }
        } catch (err) {
          console.warn("Reverse geocoding failed, keeping generic label.", err);
        }
      }, (error) => {
        if (requestId !== geoRequestId.current) return;
        console.warn("Geolocation is unavailable. Using the fallback location.");

        if (import.meta.env.DEV) {
          console.debug("Geolocation fallback diagnostics:", error);
        }
        setLocationNotice(
          "Couldn't detect your location — showing Delhi for now.",
        );
        setPosition(DEFAULT_POSITION);
        setDetecting(false);
      },
      { timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    if (selectedCity === "auto") {
      setDetecting(true);
      startGeolocation();
    }
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

  /** @param {any} location */
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

  const handleSaveLocation = useCallback(() => {
    setSavedLocations((prev) =>
      prev.some((item) => item.name === position.cityName)
        ? prev
        : [
          ...prev,
          { name: position.cityName, lat: position.lat, lon: position.lon },
        ],
    );
  }, [position]);

  /** @param {string} name */
  const handleRemoveSavedLocation = useCallback((name) => {
    setSavedLocations((prev) => prev.filter((item) => item.name !== name));
  }, []);

  useEffect(() => {
    function handlePopState() {
      const fromHash = getCityFromHash();
      if (fromHash) {
        setSelectedCity(fromHash.name);
        setPosition({
          lat: fromHash.lat,
          lon: fromHash.lon,
          cityName: fromHash.name,
        });
      } else {
        setSelectedCity("auto");
        setDetecting(true);
        startGeolocation();
      }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [startGeolocation]);

  const mutateAqiRef = useRef(mutateAqi);
  const mutateCitiesRef = useRef(mutateCities);
  const mutateWindRef = useRef(mutateWind);

  useEffect(() => {
    mutateAqiRef.current = mutateAqi;
    mutateCitiesRef.current = mutateCities;
    mutateWindRef.current = mutateWind;
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        AUTO_REFRESH_STORAGE_KEY,
        String(autoRefreshSeconds),
      );
    } catch {
    }
    setRefreshCountdown(autoRefreshSeconds);
  }, [autoRefreshSeconds]);

  useEffect(() => {
    if (autoRefreshSeconds === 0) {
      return undefined;
    }

    const refreshTimer = setInterval(() => {
      if (navigator.onLine) {
        mutateAqiRef.current();
        mutateCitiesRef.current();
        mutateWindRef.current();
        setRefreshCountdown(autoRefreshSeconds);
      }
    }, autoRefreshSeconds * 1000);

    const countdownTimer = setInterval(() => {
      setRefreshCountdown((prev) =>
        prev <= 1 ? autoRefreshSeconds : prev - 1,
      );
    }, 1000);

    return () => {
      clearInterval(refreshTimer);
      clearInterval(countdownTimer);
    };
  }, [autoRefreshSeconds]);

  const analytics = useMemo(
    () => estimateWeeklyMonthlyAverages(trend),
    [trend],
  );
  const exposureEstimate = useMemo(
    () => estimateExposureTime(trend, current?.us_aqi),
    [trend, current],
  );

  const toggleTheme = useCallback(() => {
    localStorage.setItem(THEME_SOURCE_KEY, "manual");
    // @ts-ignore
    setTheme((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'high-contrast';
      return 'light';
    });
  }, []);

  const acceptOsThemeSuggestion = () => {
    // @ts-ignore
    setTheme(osThemeSuggestion);
    setOsThemeSuggestion(null);
  };

  const dismissOsThemeSuggestion = () => {
    setOsThemeSuggestion(null);
  };
  const refreshNow = useCallback(async () => {
    if (isRefreshing) return;
    await cacheStore.invalidate();
    mutateAqi();
    mutateCities();
    mutateWind();
    if (autoRefreshSeconds > 0) {
      setRefreshCountdown(autoRefreshSeconds);
    }
  }, [isRefreshing, mutateAqi, mutateCities, mutateWind, autoRefreshSeconds]);

  useEffect(() => {
    const handleOnline = () => {
      cacheStore.invalidate(undefined);
      refreshNow();
    };

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
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <SectionNav
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        theme={theme}
      />
      <div id="main-content">

        {loading && !error ? (
          <>
            <div role="status" aria-live="polite" aria-label="Loading">
              <div className="loading-spinner"></div>
              <span className="sr-only">Loading…</span>
            </div>
            <h1 className="loading-title text-3xl">
              Preparing live pollution intelligence...
            </h1>

            <Factoid />

            <Hero cityName={position.cityName} />
            <div ref={scrollAnchorRef} aria-hidden="true" />
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
            <div ref={scrollAnchorRef} aria-hidden="true" />

            {activeSection === "home" && (
              <AppControls
                selectedCity={selectedCity}
                onCityChange={handleLocationSelected}
                isRefreshing={isRefreshing}
                refreshCountdown={refreshCountdown}
                lastUpdated={lastUpdated}
                detecting={detecting}
                currentCity={position.cityName}
                savedLocations={savedLocations}
                onSaveLocation={handleSaveLocation}
                onRemoveSavedLocation={handleRemoveSavedLocation}
                autoRefreshSeconds={autoRefreshSeconds}
                onAutoRefreshChange={setAutoRefreshSeconds}
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
            {persistenceWarning && <p className="error-banner">{persistenceWarning}</p>}
            {osThemeSuggestion && (
              <div className="location-notice" role="status">
                <p>System theme changed. Switch to match?</p>
                <button type="button" onClick={acceptOsThemeSuggestion}>
                  Yes
                </button>
                <button type="button" onClick={dismissOsThemeSuggestion}>
                  No
                </button>
              </div>
            )}          {activeSection === "home" && current && (
              <div key="dashboard-grid" className="content-grid">
                <Dashboard
                  cityName={position.cityName}
                  lat={position.lat}
                  lon={position.lon}
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

                <HealthAdvisory
                  // @ts-ignore
                  lat={position.lat} lon={position.lon} />
                <PollenAllergenForecast lat={position.lat} lon={position.lon} />
                <SunSafetyDashboard lat={position.lat} lon={position.lon} />
                <SolutionsAwareness />

                <AnalyticsInsights
                  analytics={analytics}
                  trend={trend}
                  timeRange={timeRange}
                />

                <ScenarioSimulator current={current} />
              </div>
            )}

            {activeSection === "exposure" && (
              <div
                className="content-grid exposure-layout"
                style={{
                  maxWidth: "1100px",
                  margin: "2rem auto",
                  width: "100%",
                  display: "block"
                }}
              >
                <ExposureCalculator currentAqi={current?.us_aqi || 100} />
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
            {activeSection === "historical-data" && (
              <div className="content-grid history-layout">
                <HistoricalData position={position} />
              </div>
            )}

            {activeSection === "quiz" && (
              <div className="content-grid quiz-layout">
                <QuizSection />
              </div>
            )}

            {activeSection === "leaderboard" && (
              <div
                className="content-grid leaderboard-layout"
                style={{
                  maxWidth: "1100px",
                  margin: "2rem auto",
                  width: "100%",
                  gridColumn: "1 / -1"
                }}
              >
                <Leaderboard />
              </div>
            )}

            {activeSection === "widget" && (
              <div
                className="content-grid widget-layout"
                style={{
                  maxWidth: "1100px",
                  margin: "2rem auto",
                  width: "100%",
                  display: "block"
                }}
              >
                <EmbeddableWidgetGenerator
                  cityName={position.cityName}
                  lat={position.lat}
                  lon={position.lon}
                  currentAqi={current?.us_aqi || 113}
                />
              </div>
            )}

            {activeSection === "game" && (
              <Suspense
                fallback={
                  <div className="content-grid game-layout"
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      minHeight: "300px",
                    }}
                  >
                    <div role="status" aria-live="polite">
                      <div className="loading-spinner" />
                      <p style={{ marginTop: "1rem" }}>Loading games...</p>
                    </div>
                  </div>
                }
              >
                <div className="content-grid game-layout">
                  <AqiMissionGame current={current} />
                  <HotspotScoutGame nearbyPoints={nearbyPoints} />
                  <RiverOriginGame />
                </div>
              </Suspense>
            )}

            {activeSection === "getting-started" && (
              <div className="content-grid getting-started-layout">
                <GettingStarted />
              </div>
            )}

            {activeSection === "Commute" && <Commute />}
            {activeSection === "Compare" && <CityCompare />}
            {activeSection === "CarbonCalculator" && (
              <div className="content-grid carbon-calculator-layout">
                <CarbonFootprintCalculator />
              </div>
            )}
            {activeSection === "glossary" && (
              <div
                className="content-grid glossary-layout"
                style={{ maxWidth: "1100px", margin: "2rem auto", width: "100%", display: "block" }}
              >
                <Glossary />
              </div>
            )}
            <Footer />
          </>
        )}
      </div>
    </main>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
