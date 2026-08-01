import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSWR } from "./hooks/useSWR";
import { cacheStore } from "./utils/cacheStore";
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
import RiverOriginGame from "./components/RiverOriginGame";

const DEFAULT_POSITION = {
  lat: 28.6139,
  lon: 77.209,
  cityName: "Delhi",
};

const SAVED_LOCATIONS_KEY = "pollution-hub-saved-locations";

const THEME_STORAGE_KEY = "pollution-hub-theme";
// Whether the stored theme reflects a deliberate choice ("manual") or just mirrors what
// the OS was set to when the app last rendered ("system"). The theme value alone cannot
// answer that — it is written on every render — so intent needs its own key.
const THEME_SOURCE_KEY = "pollution-hub-theme-source";
const AUTO_REFRESH_SECONDS = 180;

/** @returns {"dark"|"light"} The OS colour-scheme preference, defaulting to light. */
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

// Nominatim's usage policy allows at most 1 request per second, so we track
// the last call time here and space out requests if needed.
let lastGeocodeRequestAt = 0;

async function reverseGeocodeCity(lat, lon) {
  // Round coordinates so tiny GPS jitter reuses the same cache entry
  // instead of triggering a new network request every time.
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

/** @param {any} params */
function SectionNav({ activeSection, onSectionChange, theme }) {
  const sections = [
    { id: "home", label: "Home" },
    { id: "getting-started", label: "Getting Started" },
    { id: "Compare", label: "Compare" },
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
    /** @param {any} e */
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

  /** @param {any} id */
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
  const [refreshCountdown, setRefreshCountdown] =
    useState(AUTO_REFRESH_SECONDS);
  const [savedLocations, setSavedLocations] = useState(() => readSavedLocations());
  const [locationNotice, setLocationNotice] = useState("");
  const [persistenceWarning, setPersistenceWarning] = useState("");
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    // Only a deliberate in-app choice outranks the OS. A theme left over from a previous
    // session that merely mirrored the OS should not pin the app to a stale value.
    if (savedTheme && hasManualThemePreference()) return savedTheme;

    return getSystemTheme();
  });
  const [timeRange, setTimeRange] = useState(() => {
    const saved = localStorage.getItem("timeRange");
    return saved ? Number(saved) : 24;
  });
  const [osThemeSuggestion, setOsThemeSuggestion] = useState(null);
  // Mirrors `theme` for the media-query listener, which is registered once on mount.
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
      // Pinned locations are a convenience, so a full quota must not break the dashboard.
    }
  }, [savedLocations]);

  useEffect(() => {
    localStorage.setItem("timeRange", timeRange.toString());
  }, [timeRange]);

  // Update lastUpdated when data changes
  useEffect(() => {
    if (aqiData) setLastUpdated(new Date().toISOString());
  }, [aqiData]);

  // Persist the theme value so the next load paints without a flash. This runs on mount
  // too, which is why "has the user chosen a theme?" is tracked under a separate key
  // rather than inferred from this one existing.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // Sync theme with OS dark-mode changes (only when user has no manual preference)
  useEffect(() => {
    if (!window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleOsThemeChange = (e) => {
      const newSystemTheme = e.matches ? "dark" : "light";

      if (!hasManualThemePreference()) {
        // No in-app choice has been made — follow the OS silently.
        setTheme(newSystemTheme);
        return;
      }

      // Compare against the live theme via the ref: this listener is registered once, so
      // reading `theme` from the closure would compare against the first render's value
      // and prompt even when the requested theme is already active.
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

  // Using the in-app toggle is the one action that counts as choosing a theme.
  const toggleTheme = useCallback(() => {
    localStorage.setItem(THEME_SOURCE_KEY, "manual");
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const acceptOsThemeSuggestion = () => {
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
    setRefreshCountdown(AUTO_REFRESH_SECONDS);
  }, [isRefreshing, mutateAqi, mutateCities, mutateWind]);

  useEffect(() => {
    const handleOnline = () => {
      // Wipe any cached AQI/city/wind data so refreshNow() below is forced
      // to fetch fresh data instead of serving stale results that were
      // cached before we went offline.
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
      {/* 1. Structural fix: Renders the navigation element at the very top */}
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

                <HealthAdvisory />
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
                <RiverOriginGame />
              </div>
            )}

            {activeSection === "getting-started" && (
              <div className="content-grid getting-started-layout">
                <GettingStarted />
              </div>
            )}

            {activeSection === "Commute" && <Commute />}
            {activeSection === "Compare" && <CityCompare />}
            <Footer />
          </>
        )}
      </div>
    </main>
  );
}
