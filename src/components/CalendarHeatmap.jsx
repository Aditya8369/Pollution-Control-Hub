import React from 'react';
import { getAQIBand } from '../services/airQualityService';

export default function CalendarHeatmap({ data }) {
  if (!data || data.length === 0) {
    return <div className="calendar-heatmap-empty">No historical data available.</div>;
  }

  // Assuming data is sorted by date ascending
  // We want to group by week. For simplicity, just chunk by 7 days.
  // In a real robust calendar, we'd align with Sunday/Monday start.
  
  // Align to first day of the week (Sunday)
  const firstDate = new Date(data[0].date);
  const startDay = firstDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
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
                  return <div key={`empty-${wIndex}-${dIndex}`} className="calendar-day empty" />;
                }
                
                const aqiBand = getAQIBand(day.maxAqi);
                return (
                  <div 
                    key={day.date} 
                    className="calendar-day" 
                    title={`${day.date}: AQI ${day.maxAqi} (${aqiBand.label})`}
                    style={{ backgroundColor: aqiBand.color }}
                  ></div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="calendar-legend flex items-center justify-end gap-2 text-sm mt-4">
        <span>Good</span>
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#1f9d55' }}></div>
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }}></div>
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f97316' }}></div>
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#ef4444' }}></div>
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#b91c1c' }}></div>
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#7f1d1d' }}></div>
        <span>Hazardous</span>
      </div>
    </div>
  );
}
