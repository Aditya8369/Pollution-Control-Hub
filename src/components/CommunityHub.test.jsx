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

    fireEvent.click(screen.getByRole('button', { name: /Report Pollution/i }));

    const titleInput = screen.getByPlaceholderText(/Issue title/i);
    const descInput = screen.getByPlaceholderText(/Describe location/i);
    const categorySelect = screen.getByRole('combobox', { name: '' }); // We might need to query by text
    // actually, let's use document.querySelector
    const selects = document.querySelectorAll('select');
    const categorySelectEl = selects[0];
    const severitySelectEl = selects[1];

    const submitBtn = screen.getByRole('button', { name: /Submit Report/i });

    fireEvent.change(titleInput, { target: { value: 'Illegal Burning' } });
    fireEvent.change(descInput, { target: { value: 'Smoke near main park' } });
    fireEvent.change(categorySelectEl, { target: { value: 'Garbage burning' } });
    fireEvent.change(severitySelectEl, { target: { value: 'High' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      expect(stored.length).toBe(1);
      expect(stored[0].title).toBe('Illegal Burning');
      expect(stored[0].description).toBe('Smoke near main park');
      expect(stored[0].category).toBe('Garbage burning');
      expect(stored[0].severity).toBe('High');
      expect(stored[0].latitude).toBeNull();
      expect(stored[0].longitude).toBeNull();
    });
  });

  it('submits a report with location attached when Use GPS for Location is clicked', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: /Report Pollution/i }));

    const useLocationBtn = screen.getByRole('button', { name: /Use GPS for Location/i });
    fireEvent.click(useLocationBtn);

    expect(screen.getByText(/GPS Location attached/i)).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText(/Issue title/i);
    const descInput = screen.getByPlaceholderText(/Describe location/i);
    const selects = document.querySelectorAll('select');
    const categorySelectEl = selects[0];
    const severitySelectEl = selects[1];
    const submitBtn = screen.getByRole('button', { name: /Submit Report/i });

    fireEvent.change(titleInput, { target: { value: 'Factory Smoke' } });
    fireEvent.change(descInput, { target: { value: 'Dark emissions observed' } });
    fireEvent.change(categorySelectEl, { target: { value: 'Industrial smoke' } });
    fireEvent.change(severitySelectEl, { target: { value: 'Medium' } });
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
    fireEvent.click(screen.getByRole('button', { name: /Report Pollution/i }));

    const useLocationBtn = screen.getByRole('button', { name: /Use GPS for Location/i });
    fireEvent.click(useLocationBtn);

    expect(screen.getByText(/Unable to retrieve location/i)).toBeInTheDocument();

    // Can still submit report
    const titleInput = screen.getByPlaceholderText(/Issue title/i);
    const descInput = screen.getByPlaceholderText(/Describe location/i);
    const selects = document.querySelectorAll('select');
    const categorySelectEl = selects[0];
    const submitBtn = screen.getByRole('button', { name: /Submit Report/i });

    fireEvent.change(titleInput, { target: { value: 'Dust Storm' } });
    fireEvent.change(descInput, { target: { value: 'High dust' } });
    fireEvent.change(categorySelectEl, { target: { value: 'Construction dust' } });
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

  it('renders HTML in report text as inert literal text, without injecting elements', async () => {
    render(<CommunityHub />);
    fireEvent.click(screen.getByRole('button', { name: /Report Pollution/i }));

    const titleInput = screen.getByPlaceholderText(/Issue title/i);
    const descInput = screen.getByPlaceholderText(/Describe location/i);
    const selects = document.querySelectorAll('select');
    const categorySelectEl = selects[0];
    const submitBtn = screen.getByRole('button', { name: /Submit Report/i });

    const maliciousTitle = '<script>alert("XSS-Title")</script>';
    const maliciousDesc = '<img src=x onerror="alert(1)"> & "quotes"';

    fireEvent.change(titleInput, { target: { value: maliciousTitle } });
    fireEvent.change(descInput, { target: { value: maliciousDesc } });
    fireEvent.change(categorySelectEl, { target: { value: 'Waste dumping' } });
    fireEvent.click(submitBtn);

    const card = await screen.findByText(maliciousDesc);

    // The markup is never parsed: React escapes text children, so no element is created.
    expect(document.querySelector('.report-card script')).toBeNull();
    expect(document.querySelector('.report-card img[src="x"]')).toBeNull();

    // And the reader sees exactly what the author typed — not HTML entity names.
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(maliciousTitle);
    expect(card).toBeInTheDocument();
    expect(card.textContent).not.toMatch(/&(amp|lt|gt|quot|#x27);/);
  });

  it('rejects non-image files or invalid file extensions during upload', async () => {
    render(<CommunityHub />);
    fireEvent.click(screen.getByRole('button', { name: /Report Pollution/i }));

    // Create a fake SVG file (disallowed MIME type)
    const file = new File(['<svg></svg>'], 'malicious.svg', { type: 'image/svg+xml' });
    const fileInput = document.querySelector('input[type="file"]');

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Only JPEG, PNG, and WebP images are allowed/i)).toBeInTheDocument();
    });
  });
});
