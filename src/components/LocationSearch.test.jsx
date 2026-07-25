import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LocationSearch from './LocationSearch';
import { searchLocations } from '../services/geocodingService';

// Mock the geocoding service
vi.mock('../services/geocodingService', () => ({
  searchLocations: vi.fn()
}));

describe('LocationSearch recent searches handling', () => {
  beforeEach(() => {
    vi.spyOn(Storage.prototype, "getItem");
    vi.spyOn(Storage.prototype, "setItem");
    vi.spyOn(Storage.prototype, "removeItem");
    vi.clearAllMocks();
    
    searchLocations.mockResolvedValue([
      { id: '1', name: 'Mock City', displayName: 'Mock City, MC' }
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads recent searches from localStorage", () => {
    Storage.prototype.getItem.mockReturnValue(
      JSON.stringify([
        { id: '101', displayName: 'New York' },
        { id: '102', displayName: 'London' }
      ])
    );

    render(<LocationSearch onLocationSelected={() => {}} />);
    
    // Focus the input to show the dropdown
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);

    expect(Storage.prototype.getItem).toHaveBeenCalled();
    expect(screen.getByText("New York")).toBeInTheDocument();
    expect(screen.getByText("London")).toBeInTheDocument();
  });

  it("handles malformed JSON gracefully", () => {
    Storage.prototype.getItem.mockReturnValue("{invalid json");

    expect(() => {
      render(<LocationSearch onLocationSelected={() => {}} />);
    }).not.toThrow();
    
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    
    // Fallback to empty list, meaning "Recent Searches" header shouldn't show if empty
    expect(screen.queryByText("Recent Searches")).not.toBeInTheDocument();
  });

  it("handles localStorage quota exceeded", async () => {
    Storage.prototype.getItem.mockReturnValue(null);
    
    Storage.prototype.setItem.mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    const handleLocationSelected = vi.fn();
    render(<LocationSearch onLocationSelected={handleLocationSelected} />);
    
    const input = screen.getByRole("combobox");
    // Type something to get suggestions
    fireEvent.change(input, { target: { value: 'Mock' } });
    
    await waitFor(() => {
      expect(screen.getByText("Mock City, MC")).toBeInTheDocument();
    });
    
    // Select the suggestion
    expect(() => {
      fireEvent.click(screen.getByText("Mock City, MC"));
    }).not.toThrow();
    
    expect(Storage.prototype.setItem).toHaveBeenCalled();
    expect(handleLocationSelected).toHaveBeenCalled();
  });

  it("saves a new recent search, removes duplicates, keeps newest first, limits to max", async () => {
    Storage.prototype.getItem.mockReturnValue(
      JSON.stringify([
        { id: '1', displayName: 'City 1' }, // Will be duplicated by our mock returning id: '1'
        { id: '2', displayName: 'City 2' },
        { id: '3', displayName: 'City 3' },
        { id: '4', displayName: 'City 4' },
        { id: '5', displayName: 'City 5' }
      ])
    );
    
    render(<LocationSearch onLocationSelected={() => {}} />);
    
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: 'Mock' } });
    
    await waitFor(() => {
      expect(screen.getByText("Mock City, MC")).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText("Mock City, MC"));
    
    expect(Storage.prototype.setItem).toHaveBeenCalled();
    const setItemCall = Storage.prototype.setItem.mock.calls[0];
    const savedData = JSON.parse(setItemCall[1]);
    
    // It should limit to 5
    expect(savedData).toHaveLength(5);
    
    // It should keep newest first
    expect(savedData[0].displayName).toBe('Mock City, MC');
    
    // Because id: 1 was overwritten/removed as a duplicate, the rest should shift up
    expect(savedData[1].displayName).toBe('City 2');
    expect(savedData[4].displayName).toBe('City 5');
  });
});
