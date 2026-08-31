import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { searchLocations } from '../services/geocodingService';

export default function RouteForm({
  origin,
  setOrigin,
  destination,
  setDestination,
  mode,
  setMode,
  isCalculating,
  isLocating,
  locationSuccess,
  handleGetLocation,
  handleRouteSearch,
  newLocationLabel,
  setNewLocationLabel,
  saveLocation,
}) {
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingDestination, setIsSearchingDestination] = useState(false);
  const [originActiveIndex, setOriginActiveIndex] = useState(-1);
  const [destinationActiveIndex, setDestinationActiveIndex] = useState(-1);

  const originDebounceRef = useRef(null);
  const destinationDebounceRef = useRef(null);
  const selectedOriginRef = useRef(null);
  const selectedDestinationRef = useRef(null);
  const containerRef = useRef(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowOriginSuggestions(false);
        setShowDestinationSuggestions(false);
        setOriginActiveIndex(-1);
        setDestinationActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Scroll active origin option into view
  useEffect(() => {
    if (showOriginSuggestions && originActiveIndex >= 0) {
      const el = document.getElementById(`origin-option-${originActiveIndex}`);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [originActiveIndex, showOriginSuggestions]);

  // Scroll active destination option into view
  useEffect(() => {
    if (showDestinationSuggestions && destinationActiveIndex >= 0) {
      const el = document.getElementById(`destination-option-${destinationActiveIndex}`);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [destinationActiveIndex, showDestinationSuggestions]);

  // Debounced geocoding search for origin (300ms)
  useEffect(() => {
    if (originDebounceRef.current) {
      clearTimeout(originDebounceRef.current);
    }

    if (!origin.trim()) {
      setOriginSuggestions([]);
      setShowOriginSuggestions(false);
      setOriginActiveIndex(-1);
      return;
    }

    // Don't search if the query matches the selected suggestion or external update
    if (selectedOriginRef.current !== null && selectedOriginRef.current === origin) {
      return;
    }

    originDebounceRef.current = setTimeout(async () => {
      setIsSearchingOrigin(true);
      try {
        const results = await searchLocations(origin, 5);
        setOriginSuggestions(results);
        setShowOriginSuggestions(true);
        setOriginActiveIndex(-1);
      } catch (err) {
        setOriginSuggestions([]);
      } finally {
        setIsSearchingOrigin(false);
      }
    }, 300);

    return () => {
      if (originDebounceRef.current) {
        clearTimeout(originDebounceRef.current);
      }
    };
  }, [origin]);

  // Debounced geocoding search for destination (300ms)
  useEffect(() => {
    if (destinationDebounceRef.current) {
      clearTimeout(destinationDebounceRef.current);
    }

    if (!destination.trim()) {
      setDestinationSuggestions([]);
      setShowDestinationSuggestions(false);
      setDestinationActiveIndex(-1);
      return;
    }

    if (selectedDestinationRef.current !== null && selectedDestinationRef.current === destination) {
      return;
    }

    destinationDebounceRef.current = setTimeout(async () => {
      setIsSearchingDestination(true);
      try {
        const results = await searchLocations(destination, 5);
        setDestinationSuggestions(results);
        setShowDestinationSuggestions(true);
        setDestinationActiveIndex(-1);
      } catch (err) {
        setDestinationSuggestions([]);
      } finally {
        setIsSearchingDestination(false);
      }
    }, 300);

    return () => {
      if (destinationDebounceRef.current) {
        clearTimeout(destinationDebounceRef.current);
      }
    };
  }, [destination]);

  const handleSelectOrigin = (loc) => {
    const val = loc.displayName || loc.name;
    selectedOriginRef.current = val;
    setOrigin(val);
    setOriginSuggestions([]);
    setShowOriginSuggestions(false);
    setOriginActiveIndex(-1);
  };

  const handleSelectDestination = (loc) => {
    const val = loc.displayName || loc.name;
    selectedDestinationRef.current = val;
    setDestination(val);
    setDestinationSuggestions([]);
    setShowDestinationSuggestions(false);
    setDestinationActiveIndex(-1);
  };

  const handleSwap = () => {
    const tempOrigin = origin;
    const tempDest = destination;
    
    // Update refs to prevent search on swap
    selectedOriginRef.current = tempDest;
    selectedDestinationRef.current = tempOrigin;

    setOrigin(tempDest);
    setDestination(tempOrigin);
    setOriginSuggestions([]);
    setDestinationSuggestions([]);
    setShowOriginSuggestions(false);
    setShowDestinationSuggestions(false);
    setOriginActiveIndex(-1);
    setDestinationActiveIndex(-1);
  };

  const handleOriginKeyDown = (e) => {
    if (!showOriginSuggestions || originSuggestions.length === 0) {
      if (e.key === 'ArrowDown' && originSuggestions.length > 0) {
        e.preventDefault();
        setShowOriginSuggestions(true);
        setOriginActiveIndex(0);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOriginActiveIndex((prev) => (prev < originSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOriginActiveIndex((prev) => (prev > 0 ? prev - 1 : originSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (originActiveIndex >= 0 && originActiveIndex < originSuggestions.length) {
        e.preventDefault();
        handleSelectOrigin(originSuggestions[originActiveIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowOriginSuggestions(false);
      setOriginActiveIndex(-1);
    } else if (e.key === 'Tab') {
      setShowOriginSuggestions(false);
      setOriginActiveIndex(-1);
    }
  };

  const handleDestinationKeyDown = (e) => {
    if (!showDestinationSuggestions || destinationSuggestions.length === 0) {
      if (e.key === 'ArrowDown' && destinationSuggestions.length > 0) {
        e.preventDefault();
        setShowDestinationSuggestions(true);
        setDestinationActiveIndex(0);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDestinationActiveIndex((prev) => (prev < destinationSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDestinationActiveIndex((prev) => (prev > 0 ? prev - 1 : destinationSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (destinationActiveIndex >= 0 && destinationActiveIndex < destinationSuggestions.length) {
        e.preventDefault();
        handleSelectDestination(destinationSuggestions[destinationActiveIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDestinationSuggestions(false);
      setDestinationActiveIndex(-1);
    } else if (e.key === 'Tab') {
      setShowDestinationSuggestions(false);
      setDestinationActiveIndex(-1);
    }
  };

  return (
    <form ref={containerRef} onSubmit={handleRouteSearch} className="commute-form">
      <div className="form-group">
        <div className="commute-origin-head">
          <label htmlFor="commute-origin">Starting Point</label>
          <button
            type="button"
            className="commute-locate-btn"
            onClick={handleGetLocation}
            disabled={isLocating}
          >
            {isLocating ? "Locating..." : locationSuccess ? "✅ Location set!" : "📍 Use My Location"}
          </button>
        </div>

        <div className="commute-input-wrapper">
          <input
            id="commute-origin"
            type="text"
            role="combobox"
            aria-expanded={showOriginSuggestions && originSuggestions.length > 0}
            aria-autocomplete="list"
            aria-controls="origin-listbox"
            aria-activedescendant={
              showOriginSuggestions && originActiveIndex >= 0
                ? `origin-option-${originActiveIndex}`
                : undefined
            }
            value={origin}
            onChange={(e) => {
              setOrigin(e.target.value);
              setOriginActiveIndex(-1);
            }}
            onKeyDown={handleOriginKeyDown}
            onFocus={() => {
              if (originSuggestions.length > 0) setShowOriginSuggestions(true);
            }}
            placeholder="e.g. Connaught Place"
            required
            autoComplete="off"
          />
          {origin && (
            <button
              type="button"
              className="commute-input-clear"
              onClick={() => {
                setOrigin("");
                setOriginSuggestions([]);
                setShowOriginSuggestions(false);
                setOriginActiveIndex(-1);
              }}
              aria-label="Clear starting point"
            >
              ×
            </button>
          )}

          {isSearchingOrigin && (
            <span className="sr-only" aria-live="polite">
              Searching starting points...
            </span>
          )}

          {showOriginSuggestions && originSuggestions.length > 0 && (
            <ul
              id="origin-listbox"
              className="location-search-dropdown"
              role="listbox"
              data-testid="origin-suggestions"
            >
              {originSuggestions.map((item, index) => (
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <li
                  key={`suggest-origin-${item.id || index}`}
                  id={`origin-option-${index}`}
                  className={`location-search-item ${originActiveIndex === index ? 'active' : ''}`}
                  onClick={() => handleSelectOrigin(item)}
                  role="option"
                  aria-selected={originActiveIndex === index}
                  data-testid="location-suggestion"
                >
                  <svg
                    className="location-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>{item.displayName || item.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="commute-swap-row">
        <button
          type="button"
          className="commute-swap-btn"
          onClick={handleSwap}
          aria-label="Swap starting point and destination"
          title="Swap starting point and destination"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 10l-4-4 4-4" />
            <path d="M3 6h13a4 4 0 0 1 4 4v1" />
            <path d="M17 14l4 4-4 4" />
            <path d="M21 18H8a4 4 0 0 1-4-4v-1" />
          </svg>
        </button>
      </div>

      <div className="form-group">
        <label htmlFor="commute-destination">Destination</label>
        <div className="commute-input-wrapper">
          <input
            id="commute-destination"
            type="text"
            role="combobox"
            aria-expanded={showDestinationSuggestions && destinationSuggestions.length > 0}
            aria-autocomplete="list"
            aria-controls="destination-listbox"
            aria-activedescendant={
              showDestinationSuggestions && destinationActiveIndex >= 0
                ? `destination-option-${destinationActiveIndex}`
                : undefined
            }
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setDestinationActiveIndex(-1);
            }}
            onKeyDown={handleDestinationKeyDown}
            onFocus={() => {
              if (destinationSuggestions.length > 0) setShowDestinationSuggestions(true);
            }}
            placeholder="e.g. India Gate"
            required
            autoComplete="off"
          />
          {destination && (
            <button
              type="button"
              className="commute-input-clear"
              onClick={() => {
                setDestination("");
                setDestinationSuggestions([]);
                setShowDestinationSuggestions(false);
                setDestinationActiveIndex(-1);
              }}
              aria-label="Clear destination"
            >
              ×
            </button>
          )}

          {isSearchingDestination && (
            <span className="sr-only" aria-live="polite">
              Searching destinations...
            </span>
          )}

          {showDestinationSuggestions && destinationSuggestions.length > 0 && (
            <ul
              id="destination-listbox"
              className="location-search-dropdown"
              role="listbox"
              data-testid="destination-suggestions"
            >
              {destinationSuggestions.map((item, index) => (
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <li
                  key={`suggest-dest-${item.id || index}`}
                  id={`destination-option-${index}`}
                  className={`location-search-item ${destinationActiveIndex === index ? 'active' : ''}`}
                  onClick={() => handleSelectDestination(item)}
                  role="option"
                  aria-selected={destinationActiveIndex === index}
                  data-testid="location-suggestion"
                >
                  <svg
                    className="location-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>{item.displayName || item.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="form-group">
        {/* Names the button group, not an input — the group carries its own
            accessible name via aria-labelledby. */}
        <span className="form-group-label" id="commute-mode-label">Transport Mode</span>
        <div className="mode-selector-group" role="group" aria-labelledby="commute-mode-label">
          <button
            type="button"
            className={`mode-chip-btn ${mode === "driving" ? "active" : ""}`}
            onClick={() => setMode("driving")}
            aria-pressed={mode === "driving"}
          >
            Driving
          </button>
          <button
            type="button"
            className={`mode-chip-btn ${mode === "biking" ? "active" : ""}`}
            onClick={() => setMode("biking")}
            aria-pressed={mode === "biking"}
          >
            Cycling
          </button>
          <button
            type="button"
            className={`mode-chip-btn ${mode === "foot" ? "active" : ""}`}
            onClick={() => setMode("foot")}
            aria-pressed={mode === "foot"}
          >
            Walking
          </button>
        </div>
      </div>

      <div className="form-group commute-save-location">
        <label htmlFor="commute-location-label">Save current locations for quick access</label>
        <div className="commute-save-row">
          <input
            id="commute-location-label"
            type="text"
            value={newLocationLabel}
            onChange={(e) => setNewLocationLabel(e.target.value)}
            placeholder='Label (e.g. "Home")'
          />
          <button
            type="button"
            className="commute-save-btn"
            onClick={() => saveLocation(origin)}
            disabled={!origin.trim() || !newLocationLabel.trim()}
          >
            Save Start
          </button>
          <button
            type="button"
            className="commute-save-btn"
            onClick={() => saveLocation(destination)}
            disabled={!destination.trim() || !newLocationLabel.trim()}
          >
            Save Destination
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isCalculating}
        className="commute-btn"
      >
        {isCalculating ? "Analyzing PM2.5..." : "Find Cleanest Route"}
      </button>
    </form>
  );
}

RouteForm.propTypes = {
  origin: PropTypes.string.isRequired,
  setOrigin: PropTypes.func.isRequired,
  destination: PropTypes.string.isRequired,
  setDestination: PropTypes.func.isRequired,
  mode: PropTypes.string.isRequired,
  setMode: PropTypes.func.isRequired,
  isCalculating: PropTypes.bool.isRequired,
  isLocating: PropTypes.bool.isRequired,
  locationSuccess: PropTypes.bool,
  handleGetLocation: PropTypes.func.isRequired,
  handleRouteSearch: PropTypes.func.isRequired,
  newLocationLabel: PropTypes.string.isRequired,
  setNewLocationLabel: PropTypes.func.isRequired,
  saveLocation: PropTypes.func.isRequired,
};
