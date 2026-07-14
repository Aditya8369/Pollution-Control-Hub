import React from 'react';
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

export default function CalendarHeatmap({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="calendar-heatmap-empty">
        No historical data available.
      </div>
    );
  }

  // Assuming data is sorted by date ascending
  // We want to group by week. For simplicity, just chunk by 7 days.
  // In a real robust calendar, we'd align with Sunday/Monday start.

  // Align to first day of the week (Sunday)
  const firstDate = new Date(data[0].date);
  const startDay = firstDate.getDay();

  const paddedData = [];

  // Add empty slots for the first week
  for (let i = 0; i < startDay; i++) {
    paddedData.push(null);
  }

  paddedData.push(...data);

  const weeks = [];
  for (let i = 0; i < paddedData.length; i += 7) {
    weeks.push(paddedData.slice(i, i + 7));
  }

  return (
    <div className="calendar-heatmap-container">
      <div className="calendar-heatmap-scroll">
        <div className="calendar-heatmap">
          {weeks.map((week, wIndex) => (
            <div key={`week-${wIndex}`} className="calendar-heatmap-week">
              {week.map((day, dIndex) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${wIndex}-${dIndex}`}
                      className="calendar-day empty"
                    />
                  );
                }

                const aqiBand = getAQIBand(day.maxAqi);

                return (
                  <div
                    key={day.date}
                    className="calendar-day"
                    title={`${day.date}: AQI ${day.maxAqi} (${aqiBand.label})`}
                    style={{ backgroundColor: aqiBand.color }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

  <div className="calendar-legend mt-4 w-fit ml-auto">
  <div className="text-xs font-semibold mb-2">AQI Legend</div>

  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
    {AQI_LEGEND_BANDS.map((band) => (
      <div key={band.label} className="flex items-center gap-1">
        <div
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: band.color }}
          aria-hidden="true"
        ></div>
        <span>{band.label}</span>
      </div>
    ))}
  </div>
  </div>
</div>
  );
}