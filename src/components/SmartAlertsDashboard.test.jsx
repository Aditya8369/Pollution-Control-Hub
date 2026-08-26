import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SmartAlertsDashboard from './SmartAlertsDashboard';
import { fetchAirQualityByCoords } from '../services/airQualityService';
import { useNotificationSettings, parseThreshold } from '../hooks/useNotificationSettings';
import * as smartAlertService from '../services/smartAlertService';

vi.mock('../services/airQualityService');
vi.mock('../hooks/useNotificationSettings', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNotificationSettings: vi.fn(),
  };
});

describe('SmartAlertsDashboard', () => {
  let mockUpdateSettings;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSettings = vi.fn();
    
    useNotificationSettings.mockReturnValue({
      settings: {
        alertsEnabled: true,
        aqiThreshold: 100,
        pollutantThresholds: { pm2_5: 35, pm10: 50 },
        activePollutants: ['pm2_5', 'pm10'],
        quietHours: { enabled: false }
      },
      updateSettings: mockUpdateSettings,
    });
    
    vi.spyOn(smartAlertService, 'getAlertHistory').mockReturnValue([]);
    vi.spyOn(smartAlertService, 'saveAlertHistory').mockImplementation(() => {});
    vi.spyOn(smartAlertService, 'notifyBrowser').mockImplementation(() => {});
    vi.spyOn(smartAlertService, 'clearAlertHistory').mockImplementation(() => {});
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    fetchAirQualityByCoords.mockResolvedValue(new Promise(() => {})); // Never resolves
    render(<SmartAlertsDashboard position={{ lat: 10, lon: 20, cityName: 'Test City' }} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Loading Smart Alerts/i)).toBeInTheDocument();
  });

  it('renders current location and AQI data after loading', async () => {
    fetchAirQualityByCoords.mockResolvedValue({
      current: { us_aqi: 45, pm2_5: 12, pm10: 20 },
      trend: []
    });

    render(<SmartAlertsDashboard position={{ lat: 10, lon: 20, cityName: 'Test City' }} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Monitoring Location: Test City/i)).toBeInTheDocument();
      // Current AQI Value
      expect(screen.getByText('45')).toBeInTheDocument();
      // Current PM2.5 Value
      expect(screen.getByText('12')).toBeInTheDocument();
    });
  });

  it('renders an error message when API fails and allows retry', async () => {
    fetchAirQualityByCoords.mockRejectedValueOnce(new Error('API Down'));
    render(<SmartAlertsDashboard position={{ lat: 10, lon: 20, cityName: 'Test City' }} />);
    
    await waitFor(() => {
      expect(screen.getByText(/API Down/i)).toBeInTheDocument();
    });
    
    fetchAirQualityByCoords.mockResolvedValueOnce({
      current: { us_aqi: 45, pm2_5: 12, pm10: 20 },
      trend: []
    });
    
    const retryBtn = screen.getByText(/Retry/i);
    fireEvent.click(retryBtn);
    
    await waitFor(() => {
      expect(screen.getByText(/Monitoring Location: Test City/i)).toBeInTheDocument();
    });
  });

  it('displays forecast summary if there are predictive breaches', async () => {
    fetchAirQualityByCoords.mockResolvedValue({
      current: { us_aqi: 45, pm2_5: 12, pm10: 20 },
      trend: [
        { us_aqi: 120, pm2_5: 10, pm10: 10 } // breach AQI
      ]
    });

    render(<SmartAlertsDashboard position={{ lat: 10, lon: 20, cityName: 'Test City' }} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Forecast Outlook/i)).toBeInTheDocument();
      expect(screen.getByText(/AQI expected to exceed 100/i)).toBeInTheDocument();
    });
  });

  it('disables inputs when alerts are globally disabled', async () => {
    useNotificationSettings.mockReturnValue({
      settings: {
        alertsEnabled: false,
        aqiThreshold: 100,
        pollutantThresholds: { pm2_5: 35, pm10: 50 },
        activePollutants: ['pm2_5'],
      },
      updateSettings: mockUpdateSettings,
    });
    
    fetchAirQualityByCoords.mockResolvedValue({
      current: { us_aqi: 45, pm2_5: 12, pm10: 20 },
      trend: []
    });

    render(<SmartAlertsDashboard position={{ lat: 10, lon: 20, cityName: 'Test City' }} />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/AQI Threshold value/i)).toBeDisabled();
      expect(screen.getByLabelText(/Monitor PM2.5/i)).toBeDisabled();
    });
  });

  it('calls updateSettings when AQI threshold changes', async () => {
    fetchAirQualityByCoords.mockResolvedValue({
      current: { us_aqi: 45, pm2_5: 12, pm10: 20 },
      trend: []
    });

    render(<SmartAlertsDashboard position={{ lat: 10, lon: 20, cityName: 'Test City' }} />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/AQI Threshold value/i)).toBeInTheDocument();
    });
    
    const input = screen.getByLabelText(/AQI Threshold value/i);
    fireEvent.change(input, { target: { value: '150' } });
    
    expect(mockUpdateSettings).toHaveBeenCalledWith({ aqiThreshold: 150 });
  });

  it('calls updateSettings when pollutant toggled', async () => {
    fetchAirQualityByCoords.mockResolvedValue({
      current: { us_aqi: 45, pm2_5: 12, pm10: 20 },
      trend: []
    });

    render(<SmartAlertsDashboard position={{ lat: 10, lon: 20, cityName: 'Test City' }} />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Monitor NO₂/i)).toBeInTheDocument();
    });
    
    const input = screen.getByLabelText(/Monitor NO₂/i);
    fireEvent.click(input);
    
    expect(mockUpdateSettings).toHaveBeenCalledWith({ activePollutants: ['pm2_5', 'pm10', 'nitrogen_dioxide'] });
  });
  
  it('saves history and triggers browser notification upon breach', async () => {
    // Current AQI is 150 which breaches threshold of 100
    fetchAirQualityByCoords.mockResolvedValue({
      current: { us_aqi: 150, pm2_5: 12, pm10: 20 },
      trend: []
    });
    
    // We don't mock checkThresholdBreaches and filterRecentAlerts, we let the real ones do the work.
    // They will detect the AQI breach and trigger the notification.

    render(<SmartAlertsDashboard position={{ lat: 10, lon: 20, cityName: 'Test City' }} />);
    
    await waitFor(() => {
      expect(smartAlertService.saveAlertHistory).toHaveBeenCalled();
      expect(smartAlertService.notifyBrowser).toHaveBeenCalled();
      // It should display the alert in history
      expect(screen.getByText(/Current AQI \(150\) exceeds your threshold of 100/i)).toBeInTheDocument();
    });
  });
});
