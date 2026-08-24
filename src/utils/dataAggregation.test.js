import { describe, it, expect } from 'vitest';
import { POLLUTANTS, getPollutantBand, aggregateData } from './dataAggregation';

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

  it('aggregates hourly trend points correctly', () => {
    const items = [
      { time: '2026-08-22T10:00:00Z', us_aqi: 100, pm2_5: 20 },
      { time: '2026-08-22T11:00:00Z', us_aqi: 120, pm2_5: 30 },
    ];

    const result = aggregateData(items, 'hourly', ['us_aqi', 'pm2_5']);
    expect(result).toHaveLength(2);
    expect(result[0].us_aqi).toBe(100);
    expect(result[0].pm2_5).toBe(20);
    expect(result[1].us_aqi).toBe(120);
    expect(result[1].pm2_5).toBe(30);
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
});
