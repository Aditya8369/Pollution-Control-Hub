import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import IndoorTracker from './IndoorTracker';

// Mock Recharts to avoid DOM measuring issues in JSDOM
vi.mock('recharts', async () => {
  const OriginalRecharts = await vi.importActual('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }) => (
      <div data-testid="mock-responsive-container" style={{ width: 800, height: 600 }}>
        {children}
      </div>
    ),
  };
});

describe('IndoorTracker', () => {
  const mockOutdoor = {
    pm2_5: 25.5
  };

  beforeEach(() => {
    localStorage.clear();
    // Suppress console.warn for intentional errors in tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders form and allows input', () => {
    render(<IndoorTracker currentOutdoor={mockOutdoor} />);
    
    expect(screen.getByText('🏠 Indoor vs. Outdoor Air Quality')).toBeInTheDocument();
    expect(screen.getByTestId('pm25-input')).toBeInTheDocument();
    
    // Type a value
    fireEvent.change(screen.getByTestId('pm25-input'), { target: { value: '12.5' } });
    expect(screen.getByTestId('pm25-input')).toHaveValue(12.5);
  });

  it('validates PM2.5 input', () => {
    render(<IndoorTracker currentOutdoor={mockOutdoor} />);
    
    fireEvent.change(screen.getByTestId('pm25-input'), { target: { value: '600' } });
    fireEvent.submit(screen.getByRole('button', { name: /save indoor data/i }).closest('form'));
    
    expect(window.alert).toHaveBeenCalledWith('PM2.5 must be between 0 and 500');
    expect(localStorage.getItem('pollution_hub_indoor_aqi')).toBeNull();
  });

  it('validates CO2 input', () => {
    render(<IndoorTracker currentOutdoor={mockOutdoor} />);
    
    fireEvent.change(screen.getByTestId('co2-input'), { target: { value: '6000' } });
    fireEvent.submit(screen.getByRole('button', { name: /save indoor data/i }).closest('form'));
    
    expect(window.alert).toHaveBeenCalledWith('CO₂ must be between 0 and 5000');
    expect(localStorage.getItem('pollution_hub_indoor_aqi')).toBeNull();
  });

  it('saves valid data to localStorage and shows comparison', () => {
    render(<IndoorTracker currentOutdoor={mockOutdoor} />);
    
    fireEvent.change(screen.getByTestId('pm25-input'), { target: { value: '30' } });
    fireEvent.change(screen.getByTestId('co2-input'), { target: { value: '1200' } });
    fireEvent.submit(screen.getByRole('button', { name: /save indoor data/i }).closest('form'));
    
    const savedData = JSON.parse(localStorage.getItem('pollution_hub_indoor_aqi'));
    expect(savedData.pm25).toBe(30);
    expect(savedData.co2).toBe(1200);
    
    // Should render chart container
    expect(screen.getByTestId('indoor-comparison-chart')).toBeInTheDocument();
  });

  it('displays contextual tips correctly', () => {
    // Indoor PM2.5 > Outdoor PM2.5
    render(<IndoorTracker currentOutdoor={mockOutdoor} />); // outdoor is 25.5
    
    fireEvent.change(screen.getByTestId('pm25-input'), { target: { value: '40' } });
    fireEvent.change(screen.getByTestId('co2-input'), { target: { value: '1500' } }); // High CO2
    fireEvent.change(screen.getByTestId('voc-input'), { target: { value: '800' } }); // High VOC
    fireEvent.submit(screen.getByRole('button', { name: /save indoor data/i }).closest('form'));
    
    expect(screen.getByText(/Your indoor air is currently worse than outside/i)).toBeInTheDocument();
    expect(screen.getByText(/Improve ventilation by opening windows or doors/i)).toBeInTheDocument();
    expect(screen.getByText(/Reduce use of chemical cleaners and improve airflow/i)).toBeInTheDocument();
  });

  it('displays better air quality tip', () => {
    render(<IndoorTracker currentOutdoor={mockOutdoor} />); // outdoor is 25.5
    
    fireEvent.change(screen.getByTestId('pm25-input'), { target: { value: '10' } });
    fireEvent.submit(screen.getByRole('button', { name: /save indoor data/i }).closest('form'));
    
    expect(screen.getByText(/Indoor air quality is currently better than outside/i)).toBeInTheDocument();
  });

  it('loads previously saved data from localStorage', () => {
    localStorage.setItem('pollution_hub_indoor_aqi', JSON.stringify({
      pm25: 15,
      co2: 800,
      voc: 100,
      lastUpdated: new Date().toISOString()
    }));
    
    render(<IndoorTracker currentOutdoor={mockOutdoor} />);
    
    expect(screen.getByTestId('pm25-input')).toHaveValue(15);
    expect(screen.getByTestId('co2-input')).toHaveValue(800);
    expect(screen.getByTestId('indoor-comparison-chart')).toBeInTheDocument();
  });
});
