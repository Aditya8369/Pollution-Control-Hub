import { describe, it, expect } from 'vitest';
import { POLLUTANTS, getPollutantBand, aggregateData, getPollutantValue } from './dataAggregation';

describe('dataAggregation Utility', () => {
  it('defines correct pollutant metadata', () => {
    expect(POLLUTANTS.us_aqi.name).toBe('AQI');
    expect(POLLUTANTS.pm2_5.name).toBe('PM2.5');
    expect(POLLUTANTS.pm10.name).toBe('PM10');
    expect(POLLUTANTS.nitrogen_dioxide.name).toBe('NO₂');
  });

  it('returns proper pollutant bands for US AQI', () => {
    expect(getPollutantBand(30, 'us_aqi').label).toBe('Good');
    expect(getPollutantBand(75, 'us_aqi').label).toBe('Moderate');
    expect(getPollutantBand(120, 'us_aqi').label).toBe('Unhealthy (Sensitive)');
    expect(getPollutantBand(180, 'us_aqi').label).toBe('Unhealthy');
    expect(getPollutantBand(250, 'us_aqi').label).toBe('Very Unhealthy');
    expect(getPollutantBand(350, 'us_aqi').label).toBe('Hazardous');
    expect(getPollutantBand(null, 'us_aqi').label).toBe('No Data');
  });

  it('returns proper pollutant bands for PM2.5 and PM10', () => {
    expect(getPollutantBand(10, 'pm2_5').label).toBe('Good');
    expect(getPollutantBand(25, 'pm2_5').label).toBe('Moderate');
    expect(getPollutantBand(50, 'pm2_5').label).toBe('Unhealthy (Sensitive)');
    expect(getPollutantBand(100, 'pm2_5').label).toBe('Unhealthy');
    expect(getPollutantBand(200, 'pm2_5').label).toBe('Hazardous');

    expect(getPollutantBand(40, 'pm10').label).toBe('Good');
    expect(getPollutantBand(80, 'pm10').label).toBe('Moderate');
    expect(getPollutantBand(150, 'pm10').label).toBe('Unhealthy');
    expect(getPollutantBand(200, 'pm10').label).toBe('Hazardous');
  });

  it('resolves field aliases correctly via getPollutantValue', () => {
    expect(getPollutantValue({ maxAqi: 85 }, 'us_aqi')).toBe(85);
    expect(getPollutantValue({ aqi: 90 }, 'us_aqi')).toBe(90);
    expect(getPollutantValue({ AQI: 95 }, 'us_aqi')).toBe(95);

    expect(getPollutantValue({ pm25: 18 }, 'pm2_5')).toBe(18);
    expect(getPollutantValue({ 'PM2.5': 22 }, 'pm2_5')).toBe(22);

    expect(getPollutantValue({ no2: 35 }, 'nitrogen_dioxide')).toBe(35);
    expect(getPollutantValue({ NO2: 40 }, 'nitrogen_dioxide')).toBe(40);

    expect(getPollutantValue({ co: 1200 }, 'carbon_monoxide')).toBe(1200);
    expect(getPollutantValue({ CO: 1500 }, 'carbon_monoxide')).toBe(1500);
  });

  it('aggregates hourly trend points correctly and handles field aliases', () => {
    const items = [
      { time: '2026-08-22T10:00:00Z', maxAqi: 100, pm25: 20, no2: 15 },
      { time: '2026-08-22T11:00:00Z', aqi: 120, 'PM2.5': 30, NO2: 25 },
    ];

    const result = aggregateData(items, 'hourly', ['us_aqi', 'pm2_5', 'nitrogen_dioxide']);
    expect(result).toHaveLength(2);
    expect(result[0].us_aqi).toBe(100);
    expect(result[0].pm2_5).toBe(20);
    expect(result[0].nitrogen_dioxide).toBe(15);
    expect(result[1].us_aqi).toBe(120);
    expect(result[1].pm2_5).toBe(30);
    expect(result[1].nitrogen_dioxide).toBe(25);
  });

  it('aggregates daily trend points correctly', () => {
    const items = [
      { time: '2026-08-22T08:00:00Z', us_aqi: 100, pm2_5: 20 },
      { time: '2026-08-22T14:00:00Z', us_aqi: 140, pm2_5: 40 },
      { time: '2026-08-23T10:00:00Z', us_aqi: 80, pm2_5: 10 },
    ];

    const result = aggregateData(items, 'daily', ['us_aqi', 'pm2_5']);
    expect(result).toHaveLength(2);
    expect(result[0].us_aqi).toBe(120); // (100+140)/2
    expect(result[0].pm2_5).toBe(30);   // (20+40)/2
    expect(result[1].us_aqi).toBe(80);
    expect(result[1].pm2_5).toBe(10);
  });

  it('keeps weekly buckets unique across different months instead of merging into W1', () => {
    const items = [
      { time: '2026-01-06T10:00:00Z', us_aqi: 50 },  // Mon Jan 5 week
      { time: '2026-02-03T10:00:00Z', us_aqi: 150 }, // Mon Feb 2 week
      { time: '2026-03-03T10:00:00Z', us_aqi: 250 }, // Mon Mar 2 week
    ];

    const result = aggregateData(items, 'weekly', ['us_aqi']);

    // Must be 3 distinct weekly bars, NOT merged into a single 2026-W1 bar
    expect(result).toHaveLength(3);
    expect(result[0].rawTime).toBe('2026-01-05');
    expect(result[0].us_aqi).toBe(50);
    expect(result[1].rawTime).toBe('2026-02-02');
    expect(result[1].us_aqi).toBe(150);
    expect(result[2].rawTime).toBe('2026-03-02');
    expect(result[2].us_aqi).toBe(250);
  });
});
