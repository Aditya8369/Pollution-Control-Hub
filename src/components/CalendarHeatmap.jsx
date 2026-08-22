import React, { useMemo, useState } from 'react';
import { usePopper } from 'react-popper';
import { UNKNOWN_AQI_BAND } from '../services/airQualityService';
import { getPollutantBand, POLLUTANTS } from '../utils/dataAggregation';
import { buildCalendarGrid } from '../utils/calendarGrid';
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

function getCellPollutantValue(cell, pollutantKey) {
  if (!cell) return null;
  const target = cell.entry || cell;
  if (pollutantKey === 'pm2_5' || pollutantKey === 'pm25') return target.pm25 ?? target.pm2_5;
  if (pollutantKey === 'pm10') return target.pm10;
  if (pollutantKey === 'nitrogen_dioxide' || pollutantKey === 'no2') return target.no2 ?? target.nitrogen_dioxide;
  if (pollutantKey === 'ozone') return target.ozone;
  if (pollutantKey === 'carbon_monoxide' || pollutantKey === 'co') return target.co ?? target.carbon_monoxide;
  return target.maxAqi ?? target.us_aqi ?? target.aqi ?? cell.maxAqi;
}

function hasCellReading(cell, pollutantKey) {
  if (!cell || cell.kind === 'pad') return false;
  const val = getCellPollutantValue(cell, pollutantKey);
  return typeof val === 'number' && Number.isFinite(val);
}

/**
 * Displays a calendar heatmap of historical pollutant values.
 *
 * @param {Object} props Component props.
 * @param {Array<Object>} props.data Daily AQI/pollutant records used to render the heatmap.
 * @param {string} [props.pollutant='us_aqi'] Active pollutant key ('us_aqi', 'pm2_5', 'pm10', 'nitrogen_dioxide', 'ozone', 'carbon_monoxide').
 */
export default function CalendarHeatmap({ data, pollutant = 'us_aqi' }) {
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

  // A 3-year window is ~1100 cells; rebuilding the grid on every tooltip hover was
  // wasted work now that the build walks the calendar rather than slicing an array.
  const grid = useMemo(() => buildCalendarGrid(data), [data]);

  const { weeks, markers, missingDays, daysWithReadings } = grid;

  const markerByWeek = useMemo(
    () => new Map(markers.map((m) => [m.weekIndex, m])),
    [markers]
  );

  const handleCellMouseEnter = (e, cell, band, value) => {
    setReferenceElement(e.currentTarget);
    setActiveTooltip({
      date: cell.date,
      value: value ?? cell.maxAqi,
      hasReading: cell.hasReading,
      label: band.label,
      color: band.color,
    });
  };

  const handleCellMouseLeave = () => {
    setActiveTooltip(null);
    setReferenceElement(null);
  };

  const pollutantConfig = POLLUTANTS[pollutant] || POLLUTANTS.us_aqi;

  if (weeks.length === 0) {
    return (
      <div className="calendar-heatmap-empty">
        No historical data available.
      </div>
    );
  }

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
                {week.map((cell, dIndex) => {
                  // Outside the data range entirely -- structural padding so the
                  // column starts on Sunday and ends on Saturday.
                  if (cell.kind === 'pad') {
                    return (
                      <div
                        key={`empty-${wIdx}-${dIndex}`}
                        className="calendar-day empty"
                      />
                    );
                  }

                  const val = getCellPollutantValue(cell, pollutant);
                  const isMeasured = hasCellReading(cell, pollutant);

                  if (!isMeasured) {
                    return (
                      <div
                        key={cell.date}
                        className="calendar-day calendar-day-nodata"
                        style={{ backgroundColor: UNKNOWN_AQI_BAND.color }}
                        title={`${cell.date}: no reading`}
                        onMouseEnter={(e) => handleCellMouseEnter(e, cell, UNKNOWN_AQI_BAND, null)}
                        onMouseLeave={handleCellMouseLeave}
                        role="img"
                        aria-label={`${cell.date}: no reading available`}
                      />
                    );
                  }

                  const band = getPollutantBand(val, pollutant);

                  return (
                    <div
                      key={cell.date}
                      className="calendar-day"
                      style={{ backgroundColor: band.color }}
                      // Native tooltip as accessible fallback
                      title={`${cell.date}: ${pollutantConfig.name} ${val ?? '—'} ${pollutantConfig.unit} — ${band.label}`}
                      onMouseEnter={(e) => handleCellMouseEnter(e, cell, band, val)}
                      onMouseLeave={handleCellMouseLeave}
                      role="img"
                      aria-label={`${cell.date}: ${pollutantConfig.name} ${val ?? '—'}, ${band.label}`}
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
            {activeTooltip.hasReading ? (
              <>
                <span
                  className="calendar-tooltip-badge"
                  style={{ backgroundColor: activeTooltip.color }}
                >
                  {pollutantConfig.name} {activeTooltip.value} {pollutantConfig.unit}
                </span>
                <span className="calendar-tooltip-label">{activeTooltip.label}</span>
              </>
            ) : (
              <span className="calendar-tooltip-label">No reading for this day</span>
            )}
          </div>
        </div>
      )}

      {/* ── Legend ─────────────────────────────────────────────── */}
      <div className="calendar-legend">
        <div className="calendar-legend-title">
          {pollutantConfig.name} Severity Legend
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
          <div className="calendar-legend-item">
            <div
              className="calendar-legend-color"
              style={{ backgroundColor: UNKNOWN_AQI_BAND.color }}
            />
            <span>No reading</span>
          </div>
        </div>

        {missingDays > 0 && (
          <p className="calendar-legend-coverage" data-testid="calendar-coverage">
            {daysWithReadings} of {daysWithReadings + missingDays} days in this range have a
            reading; {missingDays} have none.
          </p>
        )}
      </div>
    </div>
  );
}

CalendarHeatmap.propTypes = {
  /**
   * Historical AQI records displayed in the calendar. `maxAqi` is null for a day the
   * archive holds no reading for.
   */
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      maxAqi: PropTypes.number,
    })
  ).isRequired,
};
