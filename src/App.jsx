import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AIPollutionCopilot from "./components/AIPollutionCopilot";
import AnomalyAlert from "./components/AnomalyAlert";
import CityCompare from "./components/CityCompare";
import CommunityHub from "./components/CommunityHub";
import Commute from "./components/Commute";
import ConnectivityStatus from "./components/ConnectivityStatus";
import Dashboard from "./components/Dashboard";
import EmergencyMode from "./components/EmergencyMode";
import ErrorBoundary from "./components/ErrorBoundary";
import ExposureCalculator from "./components/ExposureCalculator";
import ExposureTracker from "./components/ExposureTracker";
import Factoid from "./components/Factoid";
import Footer from "./components/Footer";
import GettingStarted from "./components/GettingStarted";
import HeatmapTimeline from "./components/HeatmapTimeline";
import HistoricalAnalysis from "./components/HistoricalAnalysis";
import HistoricalData from "./components/HistoricalData";
import IndoorTracker from "./components/IndoorTracker";
import LocationSearch from "./components/LocationSearch";
import QuizSection from "./components/QuizSection";
import ScrollToTopButton from "./components/ScrollToTopButton";
import SkeletonDashboard from "./components/SkeletonDashboard";
import { eventBus } from "./core/events";
import { useSWR } from "./hooks/useSWR";
  estimateExposureTime,
  estimateWeeklyMonthlyAverages,
  fetchAirQualityByCoords,
  fetchCityComparisons,
  fetchWindData,
} from "./services/airQualityService";
import { cacheStore } from "./utils/cacheStore";
import { getPrecomputedAverages } from "./services/aqiPrecomputationService";
// Imported for its side effect: it subscribes to QUIZ_COMPLETED so the count is
// recorded whether or not the leaderboard has ever been mounted.
import { useTranslation } from "react-i18next";
import CarbonFootprintCalculator from "./components/CarbonFootprintCalculator";
import LanguageSwitcher from "./components/LanguageSwitcher";
import ThemeSwitcher from "./components/ThemeSwitcher";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import i18n from "./i18n";
import "./utils/contributionStats";
// Default import, matching Leaderboard.jsx's `export default`. The comment that
// used to sit here claimed this was a named import, which is the confusion that
// produced the shadow Leaderboard.tsx (#990) - that file exported a named
// `Leaderboard` and nothing else, so tsc reported "no default export" against a
// module the bundler never resolved.
import Achievements from "./components/Achievements";
import BadgeNotification from "./components/BadgeNotification";
import CityPollutionLeaderboard from "./components/CityPollutionLeaderboard";
import EcoImpactDashboard from "./components/EcoImpactDashboard";
import EmbeddableWidgetGenerator from "./components/EmbeddableWidgetGenerator";
import Glossary from "./components/Glossary";
import Leaderboard from "./components/Leaderboard";
import SmartAlertsDashboard from "./components/SmartAlertsDashboard";
import NoisePollutionTracker from "./components/NoisePollutionTracker";
import OceanAcidificationMonitor from "./components/OceanAcidificationMonitor";
import HealthImpactDashboard from "./components/HealthImpactDashboard";
const AqiMissionGame = lazy(() => import("./components/AqiMissionGame"));
const HotspotScoutGame = lazy(() => import("./components/HotspotScoutGame"));
const RiverOriginGame = lazy(() => import("./components/RiverOriginGame"));
const MarineWaterQualitySuite = lazy(() => import("./components/MarineWaterQualitySuite"));
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
/** @returns {boolean} True when the user has explicitly picked a theme in the app. */
function hasManualThemePreference() {
  return localStorage.getItem(THEME_SOURCE_KEY) === "manual";
/** @returns {any[]} The locations the user pinned, or an empty list if none are readable. */
function readSavedLocations() {
    const raw = localStorage.getItem(SAVED_LOCATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
    return [];
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
  lastGeocodeRequestAt = Date.now();
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
  );
  if (!response.ok) {
    throw new Error(`Reverse geocoding failed with status: ${response.status}`);
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
/** @param {any} params */
function Hero({ cityName }) {
  const { t } = useTranslation();
  return (
    <header className="hero flex *:flex-col items-center justify-center text-center">
      <div className="hero-overlay" />
      <div className="hero-content ">
        <p className="eyebrow">{t("hero.eyebrow", "Pollution Control Hub")}</p>
        <h1>{t("hero.title", "Monitor. Understand. Act.")}</h1>
        <p>{t("hero.description", "A single digital platform to track air quality in {{cityName}}, protect health, and mobilize community-driven climate action.", { cityName })}</p>
      </div>
    </header>
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
        <label htmlFor="city-selector">{t("controls.trackCity", "Track city:")}</label>
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
          {detecting ? t("controls.detecting", "Detecting...") : t("controls.autoDetect", "Auto Detect")}
        </button>
          onClick={onSaveLocation}
          disabled={isCurrentCitySaved}
          {isCurrentCitySaved ? "Saved" : "Save Location"}
      {savedLocations.length > 0 && (
        <div
          className="control-group saved-locations"
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flexWrap: "wrap",
          {/* Introduces the chips below, not a form control — <label> claimed a
              relationship with an input that does not exist. */}
          <span>Saved:</span>
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
                style={{ padding: "0.3rem 0.5rem" }}
                onClick={() => onRemoveSavedLocation(location.name)}
                aria-label={`Remove ${location.name} from saved locations`}
                ×
            </span>
          ))}
        </div>
      )}
      <div className="control-group status">
        <span className={`live-dot ${isRefreshing ? "active" : ""}`} />
        <p>
          {isRefreshing
            ? t("controls.refreshing", "Refreshing live feed...")
            : autoRefreshSeconds === 0
              ? "Auto refresh off"
              : t("controls.autoRefresh", "Auto refresh in {{seconds}}s", { seconds: refreshCountdown })}
        </p>
        <label htmlFor="auto-refresh-interval" style={{ marginLeft: "0.5rem" }}>
          Interval:
        </label>
        <select
          id="auto-refresh-interval"
          value={autoRefreshSeconds}
          onChange={(event) => onAutoRefreshChange(Number(event.target.value))}
          style={{ padding: "0.3rem 0.5rem" }}
          {AUTO_REFRESH_OPTIONS.map((option) => (
            <option key={option.seconds} value={option.seconds}>
              {option.label}
            </option>
        </select>
      <div className="control-group actions">
          onClick={() => eventBus.emit("FORCE_REFRESH")}
          disabled={isRefreshing}
          {t("controls.refreshNow", "Refresh Now")}
        <small>
          {lastUpdated
            ? t("controls.lastUpdated", "Last updated: {{time}}", { time: new Date(lastUpdated).toLocaleTimeString() })
            : t("controls.waiting", "Waiting...")}
        </small>
    </section>
export function SectionNav({ activeSection, onSectionChange }) {
  const sections = [
    { id: "home", label: "Home" },
    { id: "copilot", label: "AI Copilot" },
    { id: "getting-started", label: "Getting Started" },
    { id: "Compare", label: "Compare" },
    { id: "exposure", label: "Exposure Calculator" },
    { id: "quiz", label: "Quiz" },
    { id: "widget", label: "AQI Widget" },
    { id: "game", label: "Game" },
    { id: "community", label: "Community" },
    // 2. FIXED: Added the Leaderboard to the navigation menu so you can click it!
    { id: "leaderboard", label: "Leaderboard" },
    { id: "indoor", label: "Indoor Air" },
    { id: "exposure-tracker", label: "Exposure Score" },
    { id: "heatmap-timeline", label: "Pollution Timeline" },
    { id: "anomaly-alert", label: "Anomaly Detection" },
    { id: "history", label: "History" },
    { id: "historical-data", label: "Data Explorer" },
    { id: "Commute", label: "Commute" },
    { id: "CarbonCalculator", label: "Carbon Calculator" },
    { id: "glossary", label: "Glossary" },
    { id: "achievements", label: "Achievements" },
    { id: "eco-impact", label: "Eco Impact" },
    { id: "city-leaderboard", label: "City Leaderboard" },
    { id: "marine", label: "Marine Water Quality" },
import AlertsPanel from "./components/AlertsPanel";
import HealthAdvisory from "./components/HealthAdvisory";
import PollenAllergenForecast from "./components/PollenAllergenForecast";
import LocationMap from "./components/LocationMap";
import SolutionsAwareness from "./components/SolutionsAwareness";
import ScenarioSimulator from "./components/ScenarioSimulator";
import SunSafetyDashboard from "./components/SunSafetyDashboard";
import PollutionForecastDashboard from "./components/PollutionForecastDashboard";
    { id: "smart-alerts", label: "Smart Alerts" },
    { id: "noise-pollution", label: "Noise Pollution" },
    { id: "ocean-acid", label: "Ocean Acidification" },
    { id: "smart-alerts", label: "Smart Alerts" },
    { id: "ocean-acid", label: "Ocean Acidification" },
    { id: "health-impact", label: "Health Impact" },
  ];
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const mobileNavRef = useRef(null);
  const hamburgerBtnRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        hamburgerBtnRef.current?.focus();
        return;
      // Trap focus inside the open mobile menu so Tab/Shift+Tab can't
      // escape onto the content sitting behind the overlay.
      if (event.key === "Tab" && mobileNavRef.current) {
        const focusableElements = mobileNavRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusableElements.length) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
        }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);
  // While the mobile menu is open: prevent the page underneath from
  // scrolling, and move focus onto the first menu item so keyboard/screen
  // reader users land inside the trapped region right away.
    if (!isMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = setTimeout(() => {
      const firstFocusable = mobileNavRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    }, 50);
      document.body.style.overflow = previousOverflow;
      clearTimeout(focusTimer);
  /** @param {any} id */
  const handleSectionClick = (id) => {
    onSectionChange(id);
    setIsMenuOpen(false);
  };
  return (
    <>
      {isMenuOpen && (
        <div
          className="mobile-nav-overlay"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <nav
        className={`section-nav ${isMenuOpen ? "menu-open" : ""}`}
        aria-label="Main sections"
        ref={menuRef}
      >
        {/* Desktop Section Navigation */}
        <div className="nav-sections section-nav-desktop">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={activeSection === section.id ? "active" : ""}
              onClick={() => handleSectionClick(section.id)}
            >
              {t(`nav.${section.id}`, section.label)}
            </button>
          ))}
          <div className="nav-divider"></div>
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
        {/* Mobile Section Navigation */}
        <div className="section-nav-mobile">
          <div className="mobile-nav-toggle-wrap">
              ref={hamburgerBtnRef}
              className="hamburger-btn"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
              aria-label={t("nav.toggleNavigation", "Toggle navigation")}
              aria-controls="mobile-navigation"
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                {isMenuOpen ? (
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                ) : (
                  <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
                )}
              </svg>
            {isMenuOpen && (
              <div
                id="mobile-navigation"
                ref={mobileNavRef}
                className="mobile-nav-dropdown"
              >
                {sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={activeSection === section.id ? "active" : ""}
                    onClick={() => handleSectionClick(section.id)}
                  >
                    {t(`nav.${section.id}`, section.label)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mobile-nav-controls">
            <LanguageSwitcher />
            <ThemeSwitcher />
      </nav>
    </>
  );
}
function AppContent() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState(
    () => localStorage.getItem("activeSection") || "home",
  // --- Helper: read city info from the URL hash (e.g. #city=Mumbai&lat=19.07&lon=72.87) ---
  function getCityFromHash() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const name = params.get("city");
    const lat = parseFloat(params.get("lat"));
    const lon = parseFloat(params.get("lon"));
    // Only use hash values if all three are present and valid
    if (name && !isNaN(lat) && !isNaN(lon)) {
      return { name, lat, lon };
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
  // On first load: prefer URL hash → then localStorage → then 'auto'
  const [selectedCity, setSelectedCity] = useState(() => {
    const fromHash = getCityFromHash();
    if (fromHash) return fromHash.name;
    return localStorage.getItem("selectedCity") || "auto";
  });
  // On first load: prefer URL hash → then localStorage → then DEFAULT_POSITION
  const [position, setPosition] = useState(() => {
    if (fromHash)
      return { lat: fromHash.lat, lon: fromHash.lon, cityName: fromHash.name };
    const saved = localStorage.getItem("position");
    return saved ? JSON.parse(saved) : DEFAULT_POSITION;
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
    data: cityComparisons,
    error: citiesError,
    isValidating: isCitiesValidating,
    mutate: mutateCities,
  } = useSWR(cityKey, () => fetchCityComparisons());
  const windKey =
    position.lat && position.lon
      ? `wind_${position.lat}_${position.lon}`
      : null;
    data: windData,
    error: windError,
    isValidating: isWindValidating,
    mutate: mutateWind,
  } = useSWR(windKey, () => fetchWindData(position.lat, position.lon));
  const precomputedKey =
      ? `precomputed_${position.lat.toFixed(4)}_${position.lon.toFixed(4)}`
    data: precomputedData,
    mutate: mutatePrecomputed,
  } = useSWR(precomputedKey, () => getPrecomputedAverages(position.lat, position.lon));
  const current = aqiData?.current;
  const trend = aqiData?.trend || [];
  const nearbyPoints = aqiData?.nearbyPoints || [];
  const confidenceScore = aqiData?.confidenceScore || "High";
  const dataCompleteness = aqiData?.dataCompleteness || 100;
  const loading =
    (!aqiData && isAqiValidating) || (!cityComparisons && isCitiesValidating);
  const isRefreshing =
    (isAqiValidating || isCitiesValidating || isWindValidating) && !!aqiData;
  const error = (aqiError || citiesError)?.message || "";
  const [lastUpdated, setLastUpdated] = useState("");
  const [autoRefreshSeconds, setAutoRefreshSeconds] = useState(
    () => readAutoRefreshSeconds(),
  const [refreshCountdown, setRefreshCountdown] = useState(
  const [savedLocations, setSavedLocations] = useState(() => readSavedLocations());
  const [locationNotice, setLocationNotice] = useState("");
  const [persistenceWarning, setPersistenceWarning] = useState("");
  const { theme, setTheme } = useTheme();
  const [timeRange, setTimeRange] = useState(() => {
    const saved = localStorage.getItem("timeRange");
    return saved ? Number(saved) : 24;
  const [osThemeSuggestion, setOsThemeSuggestion] = useState(null);
  // Mirrors `theme` for the media-query listener, which is registered once on mount.
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const debounceRef = useRef(null);
  const geoRequestId = useRef(0);
  const scrollAnchorRef = useRef(null);
    if (activeSection === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeSection]);
  const [detecting, setDetecting] = useState(false);
    const unsubscribe = cacheStore.onPersistenceError(() => {
      setPersistenceWarning(
        i18n.t("status.offlineWarning", "Offline caching is unavailable — your data may not persist between sessions.")
    });
    return () => { unsubscribe(); };
  }, []);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
    localStorage.setItem("activeSection", activeSection);
    localStorage.setItem("selectedCity", selectedCity);
  }, [selectedCity]);
    localStorage.setItem("position", JSON.stringify(position));
  }, [position]);
    try {
      localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(savedLocations));
    } catch {
      // Pinned locations are a convenience, so a full quota must not break the dashboard.
  }, [savedLocations]);
    localStorage.setItem("timeRange", timeRange.toString());
  }, [timeRange]);
  // Update lastUpdated when data changes
    if (aqiData)  setLastUpdated(aqiData?.readingTimeUTC);
  }, [aqiData]);
  // Persist the theme value so the next load paints without a flash. This runs on mount
  // too, which is why "has the user chosen a theme?" is tracked under a separate key
  // rather than inferred from this one existing.
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);
  // Sync theme with OS dark-mode changes (only when user has no manual preference)
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleOsThemeChange = (e) => {
      const newSystemTheme = e.matches ? "dark" : "light";
      if (!hasManualThemePreference()) {
        // No in-app choice has been made — follow the OS silently.
        // @ts-ignore
        setTheme(newSystemTheme);
      // Compare against the live theme via the ref: this listener is registered once, so
      // reading `theme` from the closure would compare against the first render's value
      // and prompt even when the requested theme is already active.
      if (newSystemTheme !== themeRef.current) {
        setOsThemeSuggestion(newSystemTheme);
    mediaQuery.addEventListener("change", handleOsThemeChange);
    return () => mediaQuery.removeEventListener("change", handleOsThemeChange);
  const startGeolocation = useCallback(() => {
    const requestId = ++geoRequestId.current;
    if (!navigator.geolocation) {
      setLocationNotice(
        i18n.t("status.geolocationUnavailable", "Your browser can't detect location, so we're showing Delhi."),
      setPosition(DEFAULT_POSITION);
      setDetecting(false);
      return;
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
        catch (err) {
          console.warn("Reverse geocoding failed, keeping generic label.", err);
            setLocationNotice(
              "Couldn't retrieve your city name. Using your current coordinates instead."
            );
            setPosition({
              lat,
              lon,
              cityName: "Your Current Location",
            });
      }, (error) => {
        console.warn("Geolocation is unavailable. Using the fallback location.");
        if (import.meta.env.DEV) {
          console.debug("Geolocation fallback diagnostics:", error);
        setLocationNotice(
          i18n.t("status.geolocationError", "Couldn't detect your location — showing Delhi for now."),
        setPosition(DEFAULT_POSITION);
      },
      { timeout: 8000 },
    );
  // Initial mount geolocation if selectedCity is auto
    if (selectedCity === "auto") {
      setDetecting(true);
      startGeolocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleAutoDetect = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    setDetecting(true);
    debounceRef.current = setTimeout(() => {
      setSelectedCity("auto");
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
  }, [handleAutoDetect]);
  const handleSaveLocation = useCallback(() => {
    setSavedLocations((prev) =>
      prev.some((item) => item.name === position.cityName)
        ? prev
        : [
          ...prev,
          { name: position.cityName, lat: position.lat, lon: position.lon },
        ],
  /** @param {string} name */
  const handleRemoveSavedLocation = useCallback((name) => {
    setSavedLocations((prev) => prev.filter((item) => item.name !== name));
  // Listen for browser Back/Forward (popstate) and restore the city from the URL hash
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
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  const mutateAqiRef = useRef(mutateAqi);
  const mutateCitiesRef = useRef(mutateCities);
  const mutateWindRef = useRef(mutateWind);
  const mutatePrecomputedRef = useRef(mutatePrecomputed);
    mutateAqiRef.current = mutateAqi;
    mutateCitiesRef.current = mutateCities;
    mutateWindRef.current = mutateWind;
    mutatePrecomputedRef.current = mutatePrecomputed;
      localStorage.setItem(
        AUTO_REFRESH_STORAGE_KEY,
        String(autoRefreshSeconds),
      // Preference is optional — a full quota shouldn't break the dashboard.
    setRefreshCountdown(autoRefreshSeconds);
  }, [autoRefreshSeconds]);
    if (autoRefreshSeconds === 0) {
      return undefined;
    const refreshTimer = setInterval(() => {
      if (navigator.onLine) {
        mutateAqiRef.current();
        mutateCitiesRef.current();
        mutateWindRef.current();
        mutatePrecomputedRef.current();
        setRefreshCountdown(autoRefreshSeconds);
    }, autoRefreshSeconds * 1000);
    const countdownTimer = setInterval(() => {
      setRefreshCountdown((prev) =>
        prev <= 1 ? autoRefreshSeconds : prev - 1,
    }, 1000);
      clearInterval(refreshTimer);
      clearInterval(countdownTimer);
  const analytics = useMemo(() => {
    if (precomputedData) {
      return precomputedData;
    return estimateWeeklyMonthlyAverages(trend);
  }, [precomputedData, trend]);
  const exposureEstimate = useMemo(
    () => estimateExposureTime(trend, current?.us_aqi),
    [trend, current],
  // Using the in-app toggle is the one action that counts as choosing a theme.
  const toggleTheme = useCallback(() => {
    localStorage.setItem(THEME_SOURCE_KEY, "manual");
    setTheme((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'high-contrast';
      return 'light';
  const acceptOsThemeSuggestion = () => {
    setTheme(osThemeSuggestion);
    setOsThemeSuggestion(null);
  const dismissOsThemeSuggestion = () => {
  const refreshNow = useCallback(async () => {
    if (isRefreshing) return;
    await cacheStore.invalidate();
    mutateAqi();
    mutateCities();
    mutateWind();
    mutatePrecomputed();
    if (autoRefreshSeconds > 0) {
      setRefreshCountdown(autoRefreshSeconds);
  }, [isRefreshing, mutateAqi, mutateCities, mutateWind, mutatePrecomputed, autoRefreshSeconds]);
    const handleOnline = () => {
      // Wipe any cached AQI/city/wind data so refreshNow() below is forced
      // to fetch fresh data instead of serving stale results that were
      // cached before we went offline.
      cacheStore.invalidate(undefined);
      refreshNow();
    window.addEventListener("online", handleOnline);
      window.removeEventListener("online", handleOnline);
    eventBus.on("TOGGLE_THEME", toggleTheme);
    eventBus.on("FORCE_REFRESH", refreshNow);
      eventBus.off("TOGGLE_THEME", toggleTheme);
      eventBus.off("FORCE_REFRESH", refreshNow);
  }, [toggleTheme, refreshNow]);
    <main className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <EmergencyMode
        lat={position.lat}
        lon={position.lon}
        current={current}
        nearbyPoints={nearbyPoints}
        cityName={position.cityName}
      />
      {/* 1. Structural fix: Renders the navigation element at the very top */}
      <SectionNav
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      <BadgeNotification />
      <div id="main-content">
        {/*
          Above the readings rather than beside them. Someone who has just been told
          the air is fine needs to know the answer is four hours old before they read
          it, not after. `lastUpdated` is already tracked for the header clock; this
          is the first thing to act on it.
        */}
        <ConnectivityStatus
          dataTimestamp={lastUpdated ? Date.parse(lastUpdated) : null}
          onRetry={refreshNow}
        {loading && !error ? (
          <>
            <div role="status" aria-live="polite" aria-label={t("status.loading", "Loading")}>
              <div className="loading-spinner"></div>
              <span className="sr-only">{t("status.loading", "Loading")}…</span>
            </div>
            <h1 className="loading-title text-3xl">
              {t("status.preparing", "Preparing live pollution intelligence...")}
            </h1>
            <Factoid />
            <Hero cityName={position.cityName} />
            <div ref={scrollAnchorRef} aria-hidden="true" />
            {activeSection === "home" && (
                key="skeleton-grid"
                className="content-grid"
                style={{ marginTop: "var(--sp-4)" }}
                <SkeletonDashboard />
          </>
        ) : (
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
            {locationNotice && selectedCity === "auto" && (
              <div className="location-notice" role="status">
                <p>{locationNotice}</p>
                <button type="button" onClick={() => setLocationNotice("")}>
                  {t("status.dismiss", "Dismiss")}
                </button>
            {error && <p className="error-banner">{error}</p>}
            {persistenceWarning && <p className="error-banner">{persistenceWarning}</p>}
            {osThemeSuggestion && (
                <p>System theme changed. Switch to match?</p>
                <button type="button" onClick={acceptOsThemeSuggestion}>
                  Yes
                <button type="button" onClick={dismissOsThemeSuggestion}>
                  No
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
                  analytics={analytics}
                  nearbyPoints={nearbyPoints}
                  windData={windData}
                  windError={windError?.message}
                  exposureEstimate={exposureEstimate}
                />
            {activeSection === "exposure" && (
                className="content-grid exposure-layout"
                style={{
                  maxWidth: "1100px",
                  margin: "2rem auto",
                  width: "100%",
                  display: "block"
                }}
                <ExposureCalculator currentAqi={current?.us_aqi || 100} />
            {activeSection === "copilot" && (
                className="content-grid copilot-layout"
                  maxWidth: "900px",
                <AIPollutionCopilot
            {activeSection === "community" && (
              <div className="content-grid community-layout">
                <CommunityHub />
            {activeSection === "indoor" && (
                className="content-grid indoor-layout"
                style={{ maxWidth: "1100px", margin: "2rem auto", width: "100%", display: "block" }}
                <IndoorTracker current={current} cityName={position.cityName} />
            {activeSection === "exposure-tracker" && (
                className="content-grid exposure-tracker-layout"
                <ExposureTracker current={current} cityName={position.cityName} />
            {activeSection === "heatmap-timeline" && (
                className="content-grid heatmap-timeline-layout"
                <HeatmapTimeline lat={position.lat} lon={position.lon} cityName={position.cityName} />
            {activeSection === "anomaly-alert" && (
                className="content-grid anomaly-alert-layout"
                <AnomalyAlert lat={position.lat} lon={position.lon} current={current} cityName={position.cityName} />
            {activeSection === "history" && (
              <div className="content-grid history-layout">
                <HistoricalAnalysis position={position} />
            {activeSection === "historical-data" && (
                <HistoricalData position={position} />
            {activeSection === "quiz" && (
              <div className="content-grid quiz-layout">
                <QuizSection />
            {activeSection === "leaderboard" && (
                className="content-grid leaderboard-layout"
                  gridColumn: "1 / -1"
                <Leaderboard />
            {activeSection === "widget" && (
                className="content-grid widget-layout"
                <EmbeddableWidgetGenerator
                  currentAqi={current?.us_aqi ?? null}
                  pm25={current?.pm2_5 ?? null}
                  no2={current?.nitrogen_dioxide ?? null}
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
                    <div role="status" aria-live="polite">
                      <div className="loading-spinner" />
                      <p style={{ marginTop: "1rem" }}>Loading games...</p>
                    </div>
                  </div>
                }
                <div className="content-grid game-layout">
                  <AqiMissionGame current={current} />
                  <HotspotScoutGame nearbyPoints={nearbyPoints} />
                  <RiverOriginGame />
                </div>
              </Suspense>
            {activeSection === "getting-started" && (
              <div className="content-grid getting-started-layout">
                <GettingStarted />
            {activeSection === "Commute" && <Commute />}
            {activeSection === "Compare" && <CityCompare />}
            {activeSection === "city-leaderboard" && <CityPollutionLeaderboard />}
            {activeSection === "marine" && (
              <Suspense fallback={<div className="loading-spinner" role="status" aria-label="Loading marine suite" />}>
                <MarineWaterQualitySuite />
    { id: "forecast", label: "Pollution Forecast" },
    if (aqiData) setLastUpdated(new Date().toISOString());
            {activeSection === "smart-alerts" && <SmartAlertsDashboard position={position} />}
            {activeSection === "noise-pollution" && <NoisePollutionTracker />}
            {activeSection === "ocean-acid" && <OceanAcidificationMonitor />}
            {activeSection === "health-impact" && <HealthImpactDashboard />}
            {activeSection === "CarbonCalculator" && (
              <div
                className="content-grid carbon-calculator-layout"
                style={{
                  maxWidth: "1200px",
                  margin: "2rem auto",
                  width: "100%",
                  display: "block",
                }}
              >
                <CarbonFootprintCalculator />
              </div>
            )}
            {activeSection === "glossary" && (
                className="content-grid glossary-layout"
                style={{ maxWidth: "1100px", margin: "2rem auto", width: "100%", display: "block" }}
                <Glossary />
            {activeSection === "achievements" && (
                className="content-grid achievements-layout"
                <Achievements />
            {activeSection === "eco-impact" && (
                className="content-grid eco-impact-layout"
                style={{ maxWidth: "900px", margin: "2rem auto", width: "100%", display: "block" }}
                <EcoImpactDashboard />
            <Footer />
            <ScrollToTopButton />
          </>
        )}
      </div>
    </main>
  );
}
export default function App() {
  return (
    <ThemeProvider>
      {/*
        ErrorBoundary was imported here and never rendered, so nothing in the app was
        behind one: any render error anywhere took the page to a blank white screen.
        The lint noise is what hid it — the import sat among ~190 identical
        "defined but never used" reports on components that *are* used in JSX.
        It wraps AppContent rather than ThemeProvider so the fallback still renders
        in the visitor's chosen theme.
      */}
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </ThemeProvider>
            {activeSection === "forecast" && <PollutionForecastDashboard />}
