import React, { useState } from 'react';
import { usePopper } from 'react-popper';
import { getAQIBand } from '../services/airQualityService';
import PropTypes from "prop-types";

// Matches the bands defined in getAQIBand() in airQualityService.js
const AQI_LEGEND_BANDS = [
  { label: 'Good', color: '#1f9d55' },
  { label: 'Moderate', color: '#f59e0b' },
  { label: 'Unhealthy (Sensitive)', color: '#f97316' },
  { label: 'Unhealthy', color: '#ef4444' },
  { label: 'Very Unhealthy', color: '#b91c1c' },
  { label: 'Hazardous', color: '#7f1d1d' },
];

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];


function computeTemporalMarkers(weeks) {
  const markers = [];
  let lastMonth = -1;

  for (let wIdx = 0; wIdx < weeks.length; wIdx++) {
    const week = weeks[wIdx];

    // Find the first real (non-null) day in this column
    const firstDay = week.find((d) => d !== null);
    if (!firstDay) continue;

    const [yearStr, monthStr] = firstDay.date.split('-');
    const month = parseInt(monthStr, 10) - 1; // 0-based
    const year = parseInt(yearStr, 10);

    if (month !== lastMonth) {
      markers.push({
        weekIndex: wIdx,
        label: MONTH_NAMES[month],
        isFirstOfYear: month === 0,
        year,
      });
      lastMonth = month;
    }
  }

  return markers;
}

/** 
 * Displays a calendar heatmap of historical AQI values.
 *
 * @param {Object} props Component props.
 * @param {Array<{
 *   date: string,
 *   maxAqi: number
 * }>} props.data Daily AQI records used to render the heatmap.
 */
 
export default function CalendarHeatmap({ data }) {
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [referenceElement, setReferenceElement] = useState(null);
  const [popperElement, setPopperElement] = useState(null);
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: 'top',
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [0, 8],
        },
      },
      {
        name: 'preventOverflow',
        options: {
          padding: 8,
        },
      },
    ],
  });

  if (!data || data.length === 0) {
    return (
      <div className="calendar-heatmap-empty">
        No historical data available.
      </div>
    );
  }

  // Align to first day of the week (Sunday)
  const [year0, month0, day0] = data[0].date.split('-').map(Number);
  const firstDate = new Date(year0, month0 - 1, day0);
  const startDay = firstDate.getDay(); // 0 = Sunday

  // Pad the beginning so week-columns start on Sunday
  const paddedData = [];
  for (let i = 0; i < startDay; i++) {
    paddedData.push(null);
  }
  paddedData.push(...data);

  // Chunk into 7-day columns
  const weeks = [];
  for (let i = 0; i < paddedData.length; i += 7) {
    weeks.push(paddedData.slice(i, i + 7));
  }

  // Compute month-label and year-separator positions dynamically
  const markers = computeTemporalMarkers(weeks);

  // Build a lookup: weekIndex → marker (for O(1) access while rendering)
  const markerByWeek = new Map(markers.map((m) => [m.weekIndex, m]));

  /**
    
   * Displays the tooltip for a heatmap cell.
   *
   * @param {React.MouseEvent<HTMLDivElement>} e
   * @param {{date: string, maxAqi: number}} day
   * @param {{label: string, color: string}} aqiBand
   
     */
  const handleCellMouseEnter = (e, day, aqiBand) => {
    setReferenceElement(e.currentTarget);
    setActiveTooltip({
      date: day.date,
      maxAqi: day.maxAqi,
      label: aqiBand.label,
      color: aqiBand.color,
    });
  };

  const handleCellMouseLeave = () => {
    setActiveTooltip(null);
    setReferenceElement(null);
  };

  return (
    <div className="calendar-heatmap-container">
      <div className="calendar-heatmap-scroll">
        {/* ── Month / Year label row ─────────────────────────────── */}
        <div className="calendar-heatmap-labels" aria-hidden="true">
          {weeks.map((_, wIdx) => {
            const marker = markerByWeek.get(wIdx);
            return (
              <div
                key={`label-${wIdx}`}
                className="calendar-heatmap-label-cell"
              >
                {marker ? (
                  <span
                    className={
                      marker.isFirstOfYear
                        ? 'calendar-month-label calendar-year-label'
                        : 'calendar-month-label'
                    }
                    title={marker.isFirstOfYear ? String(marker.year) : undefined}
                  >
                    {marker.isFirstOfYear ? marker.year : marker.label}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* ── Heatmap grid ──────────────────────────────────────── */}
        <div className="calendar-heatmap">
          {weeks.map((week, wIdx) => {
            const marker = markerByWeek.get(wIdx);
            return (
              <div
                key={`week-${wIdx}`}
                className={
                  marker?.isFirstOfYear
                    ? 'calendar-heatmap-week calendar-year-start'
                    : 'calendar-heatmap-week'
                }
              >
                {week.map((day, dIndex) => {
                  if (!day) {
                    return (
                      <div
                        key={`empty-${wIdx}-${dIndex}`}
                        className="calendar-day empty"
                      />
                    );
                  }

                  const aqiBand = getAQIBand(day.maxAqi);

                  return (
                    <div
                      key={day.date}
                      className="calendar-day"
                      style={{ backgroundColor: aqiBand.color }}
                      // Native tooltip as accessible fallback
                      title={`${day.date}: AQI ${day.maxAqi} — ${aqiBand.label}`}
                      onMouseEnter={(e) => handleCellMouseEnter(e, day, aqiBand)}
                      onMouseLeave={handleCellMouseLeave}
                      role="img"
                      aria-label={`${day.date}: AQI ${day.maxAqi}, ${aqiBand.label}`}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Adaptive Floating Portal Tooltip (Escapes all overflow clipping) ── */}
      {activeTooltip && (
        <div
          ref={setPopperElement}
          className="calendar-floating-tooltip"
          style={{
            ...styles.popper,
            zIndex: 99999,
            pointerEvents: 'none',
          }}
          {...attributes.popper}
        >
          <div className="calendar-tooltip-date">{activeTooltip.date}</div>
          <div className="calendar-tooltip-body">
            <span
              className="calendar-tooltip-badge"
              style={{ backgroundColor: activeTooltip.color }}
            >
              AQI {activeTooltip.maxAqi}
            </span>
            <span className="calendar-tooltip-label">{activeTooltip.label}</span>
          </div>
        </div>
      )}

      {/* ── Legend ─────────────────────────────────────────────── */}
      <div className="calendar-legend">
        <div className="calendar-legend-title">
          AQI Legend
        </div>

        <div className="calendar-legend-grid">
          {AQI_LEGEND_BANDS.map((band) => (
            <div
              key={band.label}
              className="calendar-legend-item"
            >
              <div
                className="calendar-legend-color"
                style={{ backgroundColor: band.color }}
              />
              <span>{band.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

CalendarHeatmap.propTypes = {
  /**
   * Historical AQI records displayed in the calendar.
   */
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      maxAqi: PropTypes.number.isRequired,
    })
  ).isRequired,
};