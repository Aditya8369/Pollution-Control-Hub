import React from 'react';
import PropTypes from 'prop-types';

export default function SavedLocations({
  savedLocations,
  applySavedLocation,
  deleteSavedLocation,
}) {
  if (savedLocations.length === 0) return null;

  return (
    <div className="commute-saved-locations">
      {/* Heads the chip list; there is no control here for a <label> to point at. */}
      <h3 className="commute-saved-locations-title" id="commute-saved-locations-title">
        Saved Locations
      </h3>
      <div className="commute-chip-row" role="group" aria-labelledby="commute-saved-locations-title">
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
  );
}

SavedLocations.propTypes = {
  savedLocations: PropTypes.array.isRequired,
  applySavedLocation: PropTypes.func.isRequired,
  deleteSavedLocation: PropTypes.func.isRequired,
};
