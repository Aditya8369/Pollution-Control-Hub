import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  checkThresholdBreaches, 
  filterRecentAlerts, 
  generateAlertId, 
  getSeverity,
  formatPollutantName,
  getAlertHistory,
  saveAlertHistory,
  clearAlertHistory,
  SMART_ALERTS_STORAGE_KEY
} from './smartAlertService';

describe('smartAlertService', () => {
  
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-10-10T12:00:00Z')); // Mock fixed time
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Storage Functions', () => {
    it('returns empty array when no history exists', () => {
      expect(getAlertHistory()).toEqual([]);
    });

    it('saves and retrieves alert history', () => {
      const mockHistory = [{ id: '1', message: 'Test' }];
      saveAlertHistory(mockHistory);
      
      const raw = localStorage.getItem(SMART_ALERTS_STORAGE_KEY);
      expect(JSON.parse(raw)).toEqual(mockHistory);
      expect(getAlertHistory()).toEqual(mockHistory);
    });

    it('clears alert history', () => {
      localStorage.setItem(SMART_ALERTS_STORAGE_KEY, JSON.stringify([{ id: '1' }]));
      clearAlertHistory();
      expect(getAlertHistory()).toEqual([]);
    });
    
    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem(SMART_ALERTS_STORAGE_KEY, '{ invalid json');
      expect(getAlertHistory()).toEqual([]);
    });
  });

  describe('generateAlertId', () => {
    it('generates a stable identifier', () => {
      const id = generateAlertId('Delhi', 'AQI', 'current', 1696939200000);
      expect(id).toBe('Delhi-AQI-current-1696939200000');
    });
  });

  describe('getSeverity', () => {
    it('returns informational for ratio < 1.5', () => {
      expect(getSeverity(100, 100)).toBe('informational');
      expect(getSeverity(140, 100)).toBe('informational');
    });

    it('returns warning for ratio >= 1.5 and < 2', () => {
      expect(getSeverity(150, 100)).toBe('warning');
      expect(getSeverity(199, 100)).toBe('warning');
    });

    it('returns critical for ratio >= 2', () => {
      expect(getSeverity(200, 100)).toBe('critical');
      expect(getSeverity(500, 100)).toBe('critical');
    });
    
    it('handles zero threshold gracefully', () => {
      expect(getSeverity(50, 0)).toBe('informational');
    });
  });

  describe('formatPollutantName', () => {
    it('formats known pollutants correctly', () => {
      expect(formatPollutantName('pm2_5')).toBe('PM2.5');
      expect(formatPollutantName('nitrogen_dioxide')).toBe('NO2');
    });

    it('returns original key for unknown pollutants', () => {
      expect(formatPollutantName('unknown_gas')).toBe('unknown_gas');
    });
  });

  describe('checkThresholdBreaches', () => {
    const mockSettings = {
      alertsEnabled: true,
      aqiThreshold: 150,
      pollutantThresholds: {
        pm2_5: 35,
        pm10: 50,
      },
      activePollutants: ['pm2_5', 'pm10']
    };

    it('returns empty if disabled', () => {
      const disabledSettings = { ...mockSettings, alertsEnabled: false };
      const current = { us_aqi: 200, pm2_5: 100 };
      const breaches = checkThresholdBreaches(current, [], disabledSettings, 'Paris');
      expect(breaches).toEqual([]);
    });

    it('detects current AQI breaches', () => {
      const current = { us_aqi: 160 };
      const breaches = checkThresholdBreaches(current, [], mockSettings, 'Paris');
      
      expect(breaches).toHaveLength(1);
      expect(breaches[0].pollutant).toBe('AQI');
      expect(breaches[0].type).toBe('current');
      expect(breaches[0].severity).toBe('informational');
      expect(breaches[0].message).toContain('Current AQI (160) exceeds');
    });

    it('detects current pollutant breaches for active pollutants only', () => {
      const settings = {
        ...mockSettings,
        activePollutants: ['pm2_5']
      };
      // both pm2.5 and pm10 are high
      const current = { us_aqi: 100, pm2_5: 50, pm10: 100 };
      const breaches = checkThresholdBreaches(current, [], settings, 'Paris');
      
      expect(breaches).toHaveLength(1);
      expect(breaches[0].pollutant).toBe('pm2_5');
    });

    it('detects forecasted AQI and pollutant breaches', () => {
      const current = { us_aqi: 50, pm2_5: 10, pm10: 20 };
      const forecast = [
        { us_aqi: 160, pm2_5: 40, pm10: 20 }
      ];
      const breaches = checkThresholdBreaches(current, forecast, mockSettings, 'Paris');
      
      expect(breaches).toHaveLength(2); // AQI and PM2.5
      expect(breaches[0].type).toBe('forecast');
      expect(breaches[0].pollutant).toBe('AQI');
      expect(breaches[1].type).toBe('forecast');
      expect(breaches[1].pollutant).toBe('pm2_5');
    });

    it('ignores empty current data or settings', () => {
      expect(checkThresholdBreaches(null, [], mockSettings, 'Paris')).toEqual([]);
      expect(checkThresholdBreaches({ us_aqi: 100 }, [], null, 'Paris')).toEqual([]);
    });
  });

  describe('filterRecentAlerts (Cooldown)', () => {
    const now = new Date('2023-10-10T12:00:00Z').getTime();

    it('allows new alerts if history is empty', () => {
      const newBreach = { location: 'Delhi', pollutant: 'AQI', type: 'current', timestamp: now };
      const result = filterRecentAlerts([newBreach], []);
      expect(result).toHaveLength(1);
    });

    it('blocks alerts that occurred within cooldown period', () => {
      const history = [
        { location: 'Delhi', pollutant: 'AQI', type: 'current', timestamp: now - 30 * 60 * 1000 } // 30 mins ago
      ];
      const newBreach = { location: 'Delhi', pollutant: 'AQI', type: 'current', timestamp: now };
      
      const result = filterRecentAlerts([newBreach], history, 60); // 60 mins cooldown
      expect(result).toHaveLength(0); // blocked
    });

    it('allows alerts if cooldown period has passed', () => {
      const history = [
        { location: 'Delhi', pollutant: 'AQI', type: 'current', timestamp: now - 61 * 60 * 1000 } // 61 mins ago
      ];
      const newBreach = { location: 'Delhi', pollutant: 'AQI', type: 'current', timestamp: now };
      
      const result = filterRecentAlerts([newBreach], history, 60);
      expect(result).toHaveLength(1); // allowed
    });

    it('allows alerts for different pollutants or locations or types', () => {
      const history = [
        { location: 'Delhi', pollutant: 'AQI', type: 'current', timestamp: now - 10 * 60 * 1000 }
      ];
      
      const diffLocation = { location: 'Mumbai', pollutant: 'AQI', type: 'current', timestamp: now };
      const diffPollutant = { location: 'Delhi', pollutant: 'pm2_5', type: 'current', timestamp: now };
      const diffType = { location: 'Delhi', pollutant: 'AQI', type: 'forecast', timestamp: now };
      
      const result = filterRecentAlerts([diffLocation, diffPollutant, diffType], history, 60);
      expect(result).toHaveLength(3); // All allowed
    });
  });
});
