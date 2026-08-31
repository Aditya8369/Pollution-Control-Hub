import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RouteForm from './RouteForm';
import { searchLocations } from '../services/geocodingService';

// Mock the geocoding service
vi.mock('../services/geocodingService', () => ({
  searchLocations: vi.fn(),
}));

describe('RouteForm Component', () => {
  const defaultProps = {
    origin: '',
    setOrigin: vi.fn(),
    destination: '',
    setDestination: vi.fn(),
    mode: 'driving',
    setMode: vi.fn(),
    isCalculating: false,
    isLocating: false,
    locationSuccess: false,
    handleGetLocation: vi.fn(),
    handleRouteSearch: vi.fn(),
    newLocationLabel: '',
    setNewLocationLabel: vi.fn(),
    saveLocation: vi.fn(),
  };

  const mockLocations = [
    { id: 1, name: 'Connaught Place', displayName: 'Connaught Place, Delhi, India' },
    { id: 2, name: 'India Gate', displayName: 'India Gate, Delhi, India' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders correctly with default values', () => {
    render(<RouteForm {...defaultProps} />);
    expect(screen.getByRole('combobox', { name: 'Starting Point' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Destination' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Find Cleanest Route/i })).toBeInTheDocument();
  });

  it('triggers autocomplete search with 300ms debounce delay when user types in Origin', async () => {
    vi.mocked(searchLocations).mockResolvedValue(mockLocations);
    const setOrigin = vi.fn();
    
    render(<RouteForm {...defaultProps} origin="Conn" setOrigin={setOrigin} />);

    // Fast-forward 100ms - searchLocations should not be called yet
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(searchLocations).not.toHaveBeenCalled();

    // Fast-forward another 200ms (total 300ms)
    await act(async () => {
      await vi.advanceTimersByTime(200);
    });

    expect(searchLocations).toHaveBeenCalledWith('Conn', 5);
    
    // Verify suggestions dropdown is shown
    const suggestionsList = screen.getByTestId('origin-suggestions');
    expect(suggestionsList).toBeInTheDocument();
    expect(screen.getByText('Connaught Place, Delhi, India')).toBeInTheDocument();
  });

  it('calls setOrigin and hides suggestions when a suggestion is selected', async () => {
    vi.mocked(searchLocations).mockResolvedValue(mockLocations);
    const setOrigin = vi.fn();
    
    render(<RouteForm {...defaultProps} origin="Conn" setOrigin={setOrigin} />);

    // Fast-forward debounce
    await act(async () => {
      await vi.advanceTimersByTime(300);
    });

    // Click on the first suggestion
    const suggestionItem = screen.getByText('Connaught Place, Delhi, India');
    fireEvent.click(suggestionItem);

    expect(setOrigin).toHaveBeenCalledWith('Connaught Place, Delhi, India');
  });

  it('closes suggestions when clear button is clicked', async () => {
    vi.mocked(searchLocations).mockResolvedValue(mockLocations);
    const setOrigin = vi.fn();

    render(<RouteForm {...defaultProps} origin="Conn" setOrigin={setOrigin} />);

    await act(async () => {
      await vi.advanceTimersByTime(300);
    });

    const clearBtn = screen.getByLabelText(/Clear starting point/i);
    fireEvent.click(clearBtn);

    expect(setOrigin).toHaveBeenCalledWith('');
    expect(screen.queryByTestId('origin-suggestions')).not.toBeInTheDocument();
  });

  it('supports keyboard navigation and ARIA combobox attributes for suggestions', async () => {
    vi.mocked(searchLocations).mockResolvedValue(mockLocations);
    const setOrigin = vi.fn();

    render(<RouteForm {...defaultProps} origin="Conn" setOrigin={setOrigin} />);

    await act(async () => {
      await vi.advanceTimersByTime(300);
    });

    const originInput = screen.getByRole('combobox', { name: 'Starting Point' });
    expect(originInput).toHaveAttribute('role', 'combobox');
    expect(originInput).toHaveAttribute('aria-expanded', 'true');
    expect(originInput).toHaveAttribute('aria-controls', 'origin-listbox');

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveAttribute('aria-selected', 'false');

    // Navigate down with ArrowDown
    fireEvent.keyDown(originInput, { key: 'ArrowDown' });
    expect(originInput).toHaveAttribute('aria-activedescendant', 'origin-option-0');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    // Navigate down again to second option
    fireEvent.keyDown(originInput, { key: 'ArrowDown' });
    expect(originInput).toHaveAttribute('aria-activedescendant', 'origin-option-1');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');

    // Press Enter to select second option
    fireEvent.keyDown(originInput, { key: 'Enter' });
    expect(setOrigin).toHaveBeenCalledWith('India Gate, Delhi, India');
  });

  it('closes suggestions when Escape key is pressed', async () => {
    vi.mocked(searchLocations).mockResolvedValue(mockLocations);
    render(<RouteForm {...defaultProps} origin="Conn" setOrigin={vi.fn()} />);

    await act(async () => {
      await vi.advanceTimersByTime(300);
    });

    const originInput = screen.getByRole('combobox', { name: 'Starting Point' });
    expect(screen.getByTestId('origin-suggestions')).toBeInTheDocument();

    fireEvent.keyDown(originInput, { key: 'Escape' });
    expect(screen.queryByTestId('origin-suggestions')).not.toBeInTheDocument();
  });
});
