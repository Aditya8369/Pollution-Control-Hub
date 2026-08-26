import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AqiMissionGame from './AqiMissionGame';
import { eventBus } from '../core/events';
import * as airQualityService from '../services/airQualityService';

vi.mock('../services/airQualityService', () => ({
  estimateAQI: vi.fn((pm25, pm10, no2, o3, co) => {
    // Simple mock AQI for test predictability
    return Math.max(pm25, pm10, no2, o3, co / 10);
  }),
  getAQIBand: vi.fn(() => ({ label: 'Moderate', color: '#ff0' })),
}));

describe('AqiMissionGame Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders all missions including the new Extreme and Hard ones', () => {
    render(<AqiMissionGame current={null} />);
    
    // Check new missions are present
    expect(screen.getByText('Wildfire Smoke Drift')).toBeInTheDocument();
    expect(screen.getByText('Lethal Summer Heatwave')).toBeInTheDocument();
    expect(screen.getByText('Winter Temperature Inversion')).toBeInTheDocument();
    
    // Check difficulties
    expect(screen.getByText('Extreme')).toBeInTheDocument();
  });

  it('applies environmental modifiers properly when mission starts', () => {
    render(<AqiMissionGame current={null} />);
    
    const heatwaveBtn = screen.getByRole('button', { name: /Lethal Summer Heatwave/i });
    fireEvent.click(heatwaveBtn);
    fireEvent.click(screen.getByRole('button', { name: /Launch Mission/i }));
    
    // Ozone baseline was 120. Modifier is 1.8. 120 * 1.8 = 216.
    // The estimateAQI mock returns the max value. The AQI should be at least 216.
    expect(screen.getAllByText('216').length).toBeGreaterThan(0);
  });

  it('applies policy effectiveness and cascading effects when an action is selected', () => {
    render(<AqiMissionGame current={null} />);
    
    const inversionBtn = screen.getByRole('button', { name: /Winter Temperature Inversion/i });
    fireEvent.click(inversionBtn);
    fireEvent.click(screen.getByRole('button', { name: /Launch Mission/i }));
    
    const cloudSeedingBtn = screen.getByText(/Cloud Seeding/i);
    fireEvent.click(cloudSeedingBtn);
    
    act(() => {
      vi.advanceTimersByTime(40000); // 40 seconds
    });
    
    expect(screen.getByText(/Mission Failed/i)).toBeInTheDocument();
  });

  it('triggers time-sensitive cascading spikes halfway through the mission', () => {
    render(<AqiMissionGame current={null} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Wildfire Smoke Drift/i }));
    fireEvent.click(screen.getByRole('button', { name: /Launch Mission/i }));
    
    expect(screen.getAllByText('300').length).toBeGreaterThan(0);
    
    act(() => {
      vi.advanceTimersByTime(11000);
    });
    
    expect(screen.getAllByText('420').length).toBeGreaterThan(0);
  });

  it('respects action budget limits', () => {
    render(<AqiMissionGame current={null} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Lethal Summer Heatwave/i }));
    fireEvent.click(screen.getByRole('button', { name: /Launch Mission/i }));
    
    const actions = screen.getAllByRole('button').filter(b => b.className.includes('policy-card'));
    
    fireEvent.click(actions[0]);
    fireEvent.click(actions[1]);
    fireEvent.click(actions[2]); // Should not be deployed
    
    const activeActions = screen.getAllByRole('button').filter(b => b.className.includes('policy-card deployed'));
    expect(activeActions.length).toBe(2);
  });
  
  it('handles negative reductions as cascading effects properly', () => {
      render(<AqiMissionGame current={null} />);
      
      fireEvent.click(screen.getByRole('button', { name: /City Green Start/i }));
      fireEvent.click(screen.getByRole('button', { name: /Launch Mission/i }));
      
      const lockdownBtn = screen.getByText(/Traffic & Industry Lockdown/i);
      fireEvent.click(lockdownBtn);
      
      expect(screen.getAllByText('96').length).toBeGreaterThan(0);
  });
});
