import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import CommunityHub from './CommunityHub';

const STORAGE_KEY = 'pollution-community-reports';

describe('CommunityHub Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('submits a report without location attached by default', async () => {
    render(<CommunityHub />);

    const titleInput = screen.getByPlaceholderText(/Issue title/i);
    const descInput = screen.getByPlaceholderText(/Describe location/i);
    const submitBtn = screen.getByRole('button', { name: /Submit Report/i });

    fireEvent.change(titleInput, { target: { value: 'Illegal Burning' } });
    fireEvent.change(descInput, { target: { value: 'Smoke near main park' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      expect(stored.length).toBe(1);
      expect(stored[0].title).toBe('Illegal Burning');
      expect(stored[0].description).toBe('Smoke near main park');
      expect(stored[0].latitude).toBeNull();
      expect(stored[0].longitude).toBeNull();
    });
  });

  it('submits a report with location attached when Use Current Location is clicked', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((success) =>
        success({
          coords: {
            latitude: 28.6139,
            longitude: 77.209,
          },
        })
      ),
    };
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      geolocation: mockGeolocation,
    });

    render(<CommunityHub />);

    const useLocationBtn = screen.getByRole('button', { name: /Use Current Location/i });
    fireEvent.click(useLocationBtn);

    expect(screen.getByText(/Location attached/i)).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText(/Issue title/i);
    const descInput = screen.getByPlaceholderText(/Describe location/i);
    const submitBtn = screen.getByRole('button', { name: /Submit Report/i });

    fireEvent.change(titleInput, { target: { value: 'Factory Smoke' } });
    fireEvent.change(descInput, { target: { value: 'Dark emissions observed' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      expect(stored.length).toBe(1);
      expect(stored[0].title).toBe('Factory Smoke');
      expect(stored[0].latitude).toBe(28.6139);
      expect(stored[0].longitude).toBe(77.209);
    });
  });

  it('handles geolocation denial/error gracefully', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((_, error) =>
        error(new Error('Permission denied'))
      ),
    };
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      geolocation: mockGeolocation,
    });

    render(<CommunityHub />);

    const useLocationBtn = screen.getByRole('button', { name: /Use Current Location/i });
    fireEvent.click(useLocationBtn);

    expect(screen.getByText(/Unable to retrieve location/i)).toBeInTheDocument();

    // Can still submit report
    const titleInput = screen.getByPlaceholderText(/Issue title/i);
    const descInput = screen.getByPlaceholderText(/Describe location/i);
    const submitBtn = screen.getByRole('button', { name: /Submit Report/i });

    fireEvent.change(titleInput, { target: { value: 'Dust Storm' } });
    fireEvent.change(descInput, { target: { value: 'High dust' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      expect(stored.length).toBe(1);
      expect(stored[0].title).toBe('Dust Storm');
      expect(stored[0].latitude).toBeNull();
      expect(stored[0].longitude).toBeNull();
    });
  });

  it('maintains backward compatibility with legacy reports without coordinates', () => {
    const legacyReports = [
      {
        id: '123',
        title: 'Old Report',
        description: 'No coordinates here',
        votes: 2,
        createdAt: '2026-01-01T00:00:00.000Z',
        status: 'Pending',
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyReports));

    render(<CommunityHub />);

    expect(screen.getByText('Old Report')).toBeInTheDocument();
  });
});
