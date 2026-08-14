import React from 'react';
import PropTypes from 'prop-types';

export default function CommuteForm({
  origin,
  setOrigin,
  destination,
  setDestination,
  mode,
  setMode,
  isCalculating,
  isLocating,
  handleGetLocation,
  handleRouteSearch,
  savedLocations,
  applySavedLocation,
  deleteSavedLocation,
  newLocationLabel,
  setNewLocationLabel,
  saveLocation,
}) {
  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  return (
    <>
      {savedLocations.length > 0 && (
        <div className="commute-saved-locations">
          <label>Saved Locations</label>
          <div className="commute-chip-row">
            {savedLocations.map((loc) => (
              <span key={loc.id} className="commute-chip-group">
                <button
                  type="button"
                  className="saved-location-chip"
                  onClick={() => applySavedLocation(loc.value, "origin")}
                  title={`Set as Starting Point: ${loc.value}`}
                >
                  {loc.label}
                </button>
                <button
                  type="button"
                  className="saved-location-chip saved-location-chip--dest"
                  onClick={() => applySavedLocation(loc.value, "destination")}
                  title={`Set as Destination: ${loc.value}`}
                >
                  → Dest
                </button>
                <button
                  type="button"
                  className="saved-location-remove"
                  onClick={() => deleteSavedLocation(loc.id)}
                  aria-label={`Remove saved location ${loc.label}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleRouteSearch} className="commute-form">
        <div className="form-group">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <label style={{ marginBottom: 0 }}>Starting Point</label>
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={isLocating}
              style={{
                background: "none",
                border: "none",
                color: "#0d9488",
                fontSize: "0.85rem",
                fontWeight: "600",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {isLocating ? "Locating..." : "📍 Use My Location"}
            </button>
          </div>

          <div className="commute-input-wrapper">
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g. Connaught Place"
              required
            />
            {origin && (
              <button
                type="button"
                className="commute-input-clear"
                onClick={() => setOrigin("")}
                aria-label="Clear starting point"
              >
                ×
              </button>
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
          <label>Destination</label>
          <div className="commute-input-wrapper">
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. India Gate"
              required
            />
            {destination && (
              <button
                type="button"
                className="commute-input-clear"
                onClick={() => setDestination("")}
                aria-label="Clear destination"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Transport Mode</label>
          <div className="mode-selector-group" role="group" aria-label="Transport Mode">
            <button
              type="button"
              className={`mode-chip-btn ${mode === "driving" ? "active" : ""}`}
              onClick={() => setMode("driving")}
            >
              Driving
            </button>
            <button
              type="button"
              className={`mode-chip-btn ${mode === "biking" ? "active" : ""}`}
              onClick={() => setMode("biking")}
            >
              Cycling
            </button>
            <button
              type="button"
              className={`mode-chip-btn ${mode === "foot" ? "active" : ""}`}
              onClick={() => setMode("foot")}
            >
              Walking
            </button>
          </div>
        </div>

        <div className="form-group commute-save-location">
          <label>Save current locations for quick access</label>
          <div className="commute-save-row">
            <input
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
    </>
  );
}

CommuteForm.propTypes = {
  origin: PropTypes.string.isRequired,
  setOrigin: PropTypes.func.isRequired,
  destination: PropTypes.string.isRequired,
  setDestination: PropTypes.func.isRequired,
  mode: PropTypes.string.isRequired,
  setMode: PropTypes.func.isRequired,
  isCalculating: PropTypes.bool.isRequired,
  isLocating: PropTypes.bool.isRequired,
  handleGetLocation: PropTypes.func.isRequired,
  handleRouteSearch: PropTypes.func.isRequired,
  savedLocations: PropTypes.array.isRequired,
  applySavedLocation: PropTypes.func.isRequired,
  deleteSavedLocation: PropTypes.func.isRequired,
  newLocationLabel: PropTypes.string.isRequired,
  setNewLocationLabel: PropTypes.func.isRequired,
  saveLocation: PropTypes.func.isRequired,
};
