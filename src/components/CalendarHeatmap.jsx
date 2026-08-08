import React, { useMemo, useState } from 'react';
import { usePopper } from 'react-popper';
import { getAQIBand, UNKNOWN_AQI_BAND } from '../services/airQualityService';
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

/**
 * Displays a calendar heatmap of historical AQI values.
 *
 * Cell placement comes from each record's date, not from its index in `data` --
 * see buildCalendarGrid(). Days the archive has no reading for are rendered as an
 * explicit "no data" cell rather than being coloured, so a gap in coverage cannot
 * read as a clean day.
 *
 * @param {Object} props Component props.
 * @param {Array<{
 *   date: string,
 *   maxAqi: number|null
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

  // A 3-year window is ~1100 cells; rebuilding the grid on every tooltip hover was
  // wasted work now that the build walks the calendar rather than slicing an array.
  const grid = useMemo(() => buildCalendarGrid(data), [data]);

  const { weeks, markers, missingDays, daysWithReadings } = grid;

  const markerByWeek = useMemo(
    () => new Map(markers.map((m) => [m.weekIndex, m])),
    [markers]
  );

  const handleCellMouseEnter = (e, cell, aqiBand) => {
    setReferenceElement(e.currentTarget);
    setActiveTooltip({
      date: cell.date,
      maxAqi: cell.maxAqi,
      hasReading: cell.hasReading,
      label: aqiBand.label,
      color: aqiBand.color,
    });
  };

  const handleCellMouseLeave = () => {
    setActiveTooltip(null);
    setReferenceElement(null);
  };

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

                  // Inside the range but with no reading. Deliberately not passed
                  // through the AQI colour scale: an unmeasured day is not a clean day.
                  if (!cell.hasReading) {
                    return (
                      <div
                        key={cell.date}
                        className="calendar-day calendar-day-nodata"
                        style={{ backgroundColor: UNKNOWN_AQI_BAND.color }}
                        title={`${cell.date}: no reading`}
                        onMouseEnter={(e) => handleCellMouseEnter(e, cell, UNKNOWN_AQI_BAND)}
                        onMouseLeave={handleCellMouseLeave}
                        role="img"
                        aria-label={`${cell.date}: no reading available`}
                      />
                    );
                  }

                  const aqiBand = getAQIBand(cell.maxAqi);

                  return (
                    <div
                      key={cell.date}
                      className="calendar-day"
                      style={{ backgroundColor: aqiBand.color }}
                      // Native tooltip as accessible fallback
                      title={`${cell.date}: AQI ${cell.maxAqi} — ${aqiBand.label}`}
                      onMouseEnter={(e) => handleCellMouseEnter(e, cell, aqiBand)}
                      onMouseLeave={handleCellMouseLeave}
                      role="img"
                      aria-label={`${cell.date}: AQI ${cell.maxAqi}, ${aqiBand.label}`}
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
                  AQI {activeTooltip.maxAqi}
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
