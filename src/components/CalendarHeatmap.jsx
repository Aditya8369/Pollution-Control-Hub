import React, { useState } from 'react';
import { getAQIBand } from '../services/airQualityService';

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

/**
 * Given the array of week-columns (each column is an array of up to 7 day
 * entries or nulls), compute which week index is the first column that
 * contains any day belonging to each calendar month.
 *
 * Returns an array of objects: { weekIndex, label, isFirstOfYear, year }
 */
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

export default function CalendarHeatmap({ data }) {
  const [activeTooltip, setActiveTooltip] = useState(null);

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

  const handleCellMouseEnter = (e, day, aqiBand) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveTooltip({
      date: day.date,
      maxAqi: day.maxAqi,
      label: aqiBand.label,
      color: aqiBand.color,
      rect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
    });
  };

  const handleCellMouseLeave = () => {
    setActiveTooltip(null);
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
          className="calendar-floating-tooltip"
          style={{
            position: 'fixed',
            top:
              activeTooltip.rect.top < 85
                ? `${activeTooltip.rect.top + activeTooltip.rect.height + 8}px`
                : `${activeTooltip.rect.top - 8}px`,
            left: `${Math.max(
              90,
              Math.min(
                (typeof window !== 'undefined' ? window.innerWidth : 1200) - 90,
                activeTooltip.rect.left + activeTooltip.rect.width / 2
              )
            )}px`,
            transform:
              activeTooltip.rect.top < 85
                ? 'translate(-50%, 0)'
                : 'translate(-50%, -100%)',
            zIndex: 99999,
            pointerEvents: 'none',
          }}
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