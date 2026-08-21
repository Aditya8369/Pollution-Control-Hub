import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CityPollutionLeaderboard from './CityPollutionLeaderboard';
import { fetchCityComparisons } from '../services/airQualityService';

jest.mock('../services/airQualityService');

describe('CityPollutionLeaderboard', () => {
  it('renders loading state initially', () => {
    fetchCityComparisons.mockResolvedValue([]);
    render(<CityPollutionLeaderboard />);
    expect(screen.getByText(/Loading Leaderboard.../i)).toBeInTheDocument();
  });

  it('renders leaderboard data correctly', async () => {
    fetchCityComparisons.mockResolvedValue([
      { city: 'Tokyo', aqi: 40, pm2_5: 10, pm10: 15, unavailable: false, trend: [] },
      { city: 'Delhi', aqi: 300, pm2_5: 150, pm10: 200, unavailable: false, trend: [] }
    ]);

    render(<CityPollutionLeaderboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Tokyo, Japan')).toBeInTheDocument();
      expect(screen.getByText('Delhi, India')).toBeInTheDocument();
    });
    
    const row = screen.getByText('Delhi, India').closest('tr');
    expect(row).toHaveTextContent('#1');
  });
});
