import { describe, it, expect } from 'vitest';
import { formatHistoricalCSV, getDelimiterForLocale } from './historicalDataService';

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

  it('handles unsorted input by sorting chronologically', () => {
    const unsorted = [
      { date: '2026-07-05', maxAqi: 150, pm25: 55, pm10: 90, no2: 20, ozone: 30, co: 6 },
      { date: '2026-07-01', maxAqi: 100, pm25: 35, pm10: 70, no2: 10, ozone: 20, co: 4 },
      { date: '2026-07-03', maxAqi: 90, pm25: 30, pm10: 60, no2: 8, ozone: 18, co: 3 },
    ];
    const csv = formatHistoricalCSV(unsorted);
    const lines = csv.split('\n');

    expect(lines[1]).toBe('2026-07-01,100,35,70,10,20,4');
    expect(lines[2]).toBe('2026-07-03,90,30,60,8,18,3');
    expect(lines[3]).toBe('2026-07-05,150,55,90,20,30,6');
  });

  it('handles null and missing pollutant values gracefully', () => {
    const dataWithNulls = [
      { date: '2026-07-01', maxAqi: null, pm25: 35, pm10: undefined, no2: 10, ozone: null, co: 4 },
      { date: '2026-07-02', pm25: 30 }, // missing most fields
      { date: '2026-07-03', maxAqi: 0, pm25: 0, pm10: 0, no2: 0, ozone: 0, co: 0 },
    ];
    const csv = formatHistoricalCSV(dataWithNulls);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('Date,AQI,PM2.5,PM10,NO2,Ozone,CO');
    // null/undefined should render as empty string, not 'null' or 'undefined'
    expect(lines[1]).toBe('2026-07-01,,35,,10,,4');
    expect(lines[2]).toBe('2026-07-02,,30,,,,');
    expect(lines[3]).toBe('2026-07-03,0,0,0,0,0,0');
    expect(csv).not.toContain('null');
    expect(csv).not.toContain('undefined');
  });

  it('handles single record input', () => {
    const single = [
      { date: '2026-07-01', maxAqi: 85, pm25: 25, pm10: 50, no2: 12, ozone: 22, co: 3 },
    ];
    const csv = formatHistoricalCSV(single);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('2026-07-01,85,25,50,12,22,3');
  });

  it('ignores extra fields beyond expected columns', () => {
    const withExtras = [
      { date: '2026-07-01', maxAqi: 100, pm25: 35, pm10: 70, no2: 10, ozone: 20, co: 4, temperature: 32, humidity: 65 },
    ];
    const csv = formatHistoricalCSV(withExtras);
    expect(csv).toContain('2026-07-01,100,35,70,10,20,4');
    expect(csv).not.toContain('temperature');
    expect(csv).not.toContain('humidity');
  });

  it('filters out entries with missing date', () => {
    const withMissingDate = [
      { date: '2026-07-01', maxAqi: 100, pm25: 35 },
      { maxAqi: 90, pm25: 30 }, // no date
      { date: null, maxAqi: 80, pm25: 25 },
      { date: '2026-07-04', maxAqi: 110, pm25: 40 },
    ];
    const csv = formatHistoricalCSV(withMissingDate);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 valid rows
    expect(lines[1]).toContain('2026-07-01');
    expect(lines[2]).toContain('2026-07-04');
  });

  describe('getDelimiterForLocale', () => {
    it('returns comma for locales that format numbers with dot decimal separator', () => {
      expect(getDelimiterForLocale('en-US')).toBe(',');
      expect(getDelimiterForLocale('en-GB')).toBe(',');
      expect(getDelimiterForLocale('hi-IN')).toBe(',');
      expect(getDelimiterForLocale('bn-IN')).toBe(',');
    });

    it('returns semicolon for locales that format numbers with comma decimal separator', () => {
      expect(getDelimiterForLocale('de-DE')).toBe(';');
      expect(getDelimiterForLocale('fr-FR')).toBe(';');
      expect(getDelimiterForLocale('it-IT')).toBe(';');
    });

    it('falls back to comma for invalid or undefined locales', () => {
      expect(getDelimiterForLocale('invalid-locale')).toBe(',');
      expect(getDelimiterForLocale(undefined)).toBe(',');
    });
  });

  describe('formatHistoricalCSV with specific delimiters', () => {
    const mockDailyDataForDelimiter = [
      { date: '2026-07-01', maxAqi: 100, pm25: 35, pm10: 70, no2: 10, ozone: 20, co: 4 },
      { date: '2026-07-02', maxAqi: 120, pm25: 45, pm10: 80, no2: 15, ozone: 25, co: 5 },
    ];

    it('uses semicolon delimiter when explicitly provided', () => {
      const csv = formatHistoricalCSV(mockDailyDataForDelimiter, undefined, undefined, ';');
      const lines = csv.split('\n');
      expect(lines[0]).toBe('Date;AQI;PM2.5;PM10;NO2;Ozone;CO');
      expect(lines[1]).toBe('2026-07-01;100;35;70;10;20;4');
      expect(lines[2]).toBe('2026-07-02;120;45;80;15;25;5');
    });

    it('uses comma delimiter when explicitly provided', () => {
      const csv = formatHistoricalCSV(mockDailyDataForDelimiter, undefined, undefined, ',');
      const lines = csv.split('\n');
      expect(lines[0]).toBe('Date,AQI,PM2.5,PM10,NO2,Ozone,CO');
      expect(lines[1]).toBe('2026-07-01,100,35,70,10,20,4');
      expect(lines[2]).toBe('2026-07-02,120,45,80,15,25,5');
    });

    it('uses custom delimiter when empty dataset is formatted', () => {
      const csv = formatHistoricalCSV([], undefined, undefined, ';');
      expect(csv).toBe('Date;AQI;PM2.5;PM10;NO2;Ozone;CO');
    });

    it('escapes embedded delimiters and neutralizes formula injection in values', () => {
      const complexData = [
        { date: '2026-07-01', maxAqi: '=SUM(1,2)', pm25: '35,5', pm10: 70, no2: 10, ozone: 20, co: 4 },
      ];
      const csv = formatHistoricalCSV(complexData, undefined, undefined, ',');
      const lines = csv.split('\n');
      expect(lines[1]).toBe('2026-07-01,"\'=SUM(1,2)","35,5",70,10,20,4');
    });
  });
});

