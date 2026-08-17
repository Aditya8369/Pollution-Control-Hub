import React from 'react';
import PropTypes from 'prop-types';

export default function RouteHistory({ entries, onSelect }) {
  if (entries.length === 0) return null;

  return (
    <div className="commute-history" data-testid="commute-history">
      <h3>Recent Routes</h3>
      <ul className="commute-history-list">
        {entries.map((entry) => (
          <li key={entry.timestamp}>
            <button
              type="button"
              className="commute-history-item"
              onClick={() => onSelect(entry)}
            >
              {entry.origin} → {entry.destination}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

RouteHistory.propTypes = {
  entries: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired,
};
