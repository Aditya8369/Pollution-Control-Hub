import { describe, it, expect } from 'vitest';
import { formatHistoricalCSV } from './historicalDataService';

describe('formatHistoricalCSV', () => {
  const mockDailyData = [
    { date: '2026-07-02', maxAqi: 120, pm25: 45, pm10: 80, no2: 15, ozone: 25, co: 5 },
    { date: '2026-07-01', maxAqi: 100, pm25: 35, pm10: 70, no2: 10, ozone: 20, co: 4 },
    { date: '2026-07-03', maxAqi: 90, pm25: 30, pm10: 60, no2: 8, ozone: 18, co: 3 },
  ];

  it('formats daily entries into chronologically ordered CSV with column headers', () => {
    const csv = formatHistoricalCSV(mockDailyData);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('Date,AQI,PM2.5,PM10,NO2,Ozone,CO');
    expect(lines[1]).toBe('2026-07-01,100,35,70,10,20,4');
    expect(lines[2]).toBe('2026-07-02,120,45,80,15,25,5');
    expect(lines[3]).toBe('2026-07-03,90,30,60,8,18,3');
  });

  it('filters data correctly by startDate and endDate', () => {
    const csv = formatHistoricalCSV(mockDailyData, '2026-07-02', '2026-07-03');
    const lines = csv.split('\n');

    expect(lines.length).toBe(3); // Header + 2 data rows
    expect(lines[1]).toContain('2026-07-02');
    expect(lines[2]).toContain('2026-07-03');
  });

  it('handles empty or non-array daily data gracefully', () => {
    const csv = formatHistoricalCSV([]);
    expect(csv).toBe('Date,AQI,PM2.5,PM10,NO2,Ozone,CO');
  });
});
