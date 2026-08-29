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
    const selects = document.querySelectorAll('.community-form select');
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

    const useLocationBtn = screen.getByRole('button', { name: /Use (GPS for|Current) Location/i });
    fireEvent.click(useLocationBtn);

    expect(screen.getByText(/Location attached/i)).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText(/Issue title/i);
    const descInput = screen.getByPlaceholderText(/Describe location/i);
    const selects = document.querySelectorAll('.community-form select');
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

    const useLocationBtn = screen.getByRole('button', { name: /Use (GPS for|Current) Location/i });
    fireEvent.click(useLocationBtn);

    expect(screen.getByText(/Unable to retrieve location/i)).toBeInTheDocument();

    // Can still submit report
    const titleInput = screen.getByPlaceholderText(/Issue title/i);
    const descInput = screen.getByPlaceholderText(/Describe location/i);
    const selects = document.querySelectorAll('.community-form select');
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
    const selects = document.querySelectorAll('.community-form select');
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

  describe('Issue #1118 Export Filtered Reports', () => {
    let createObjectURLMock;
    let revokeObjectURLMock;

    const sampleReports = [
      {
        id: 'r1',
        title: 'Garbage Dump, Main Street',
        description: 'Smoke & dust, "bad smells"',
        hashtag: '#CleanAir',
        status: 'New',
        votes: 3,
        createdAt: '2026-08-20T10:00:00.000Z',
        comments: [{ id: 'c1', text: 'Agreed, terrible' }],
      },
      {
        id: 'r2',
        title: 'Factory Emissions',
        description: 'Black smoke in the morning',
        hashtag: '#StubbleBurning',
        status: 'Verified',
        votes: 10,
        createdAt: '2026-08-21T12:00:00.000Z',
        comments: [],
      },
      {
        id: 'r3',
        title: 'Construction Dust',
        description: 'Uncovered sand piles',
        hashtag: '#CleanAir',
        status: 'Resolved',
        votes: 6,
        createdAt: '2026-08-22T14:00:00.000Z',
        comments: [],
      },
    ];

    beforeEach(() => {
      createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
      revokeObjectURLMock = vi.fn();
      globalThis.URL.createObjectURL = createObjectURLMock;
      globalThis.URL.revokeObjectURL = revokeObjectURLMock;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleReports));
    });

    it('exports CSV containing only currently filtered reports (respecting active status filter)', async () => {
      render(<CommunityHub />);

      // Filter by "Verified" status
      const verifiedFilterBtn = screen.getByRole('button', { name: 'Verified' });
      fireEvent.click(verifiedFilterBtn);

      const exportCsvBtn = screen.getByRole('button', { name: 'Export CSV' });
      fireEvent.click(exportCsvBtn);

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      const blobArg = createObjectURLMock.mock.calls[0][0];
      expect(blobArg.type).toBe('text/csv;charset=utf-8;');

      const text = await blobArg.text();
      expect(text).toContain('Factory Emissions');
      expect(text).not.toContain('Garbage Dump, Main Street');
      expect(text).not.toContain('Construction Dust');
    });

    it('exports JSON containing only currently filtered reports', async () => {
      render(<CommunityHub />);

      // Filter by "Resolved" status
      const resolvedFilterBtn = screen.getByRole('button', { name: 'Resolved' });
      fireEvent.click(resolvedFilterBtn);

      const exportJsonBtn = screen.getByRole('button', { name: 'Export JSON' });
      fireEvent.click(exportJsonBtn);

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      const blobArg = createObjectURLMock.mock.calls[0][0];
      expect(blobArg.type).toBe('application/json;charset=utf-8;');

      const text = await blobArg.text();
      const parsed = JSON.parse(text);
      expect(parsed.length).toBe(1);
      expect(parsed[0].Title).toBe('Construction Dust');
    });

    it('escapes CSV values containing commas and quotes properly', async () => {
      render(<CommunityHub />);

      // Filter "All"
      const exportCsvBtn = screen.getByRole('button', { name: 'Export CSV' });
      fireEvent.click(exportCsvBtn);

      const blobArg = createObjectURLMock.mock.calls[0][0];
      const text = await blobArg.text();

      // "Garbage Dump, Main Street" has a comma -> quoted as "Garbage Dump, Main Street"
      expect(text).toContain('"Garbage Dump, Main Street"');
      // 'Smoke & dust, "bad smells"' has quotes & comma -> quoted with "" double quotes
      expect(text).toContain('"Smoke & dust, ""bad smells"""');
    });

    it('displays user-facing message and suppresses download when filtered results are empty', () => {
      render(<CommunityHub />);

      // Filter by "Rejected" (no reports have Rejected status)
      const rejectedFilterBtn = screen.getByRole('button', { name: 'Rejected' });
      fireEvent.click(rejectedFilterBtn);

      const exportCsvBtn = screen.getByRole('button', { name: 'Export CSV' });
      fireEvent.click(exportCsvBtn);

      expect(createObjectURLMock).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent(/No reports available to export/i);
    });
  });
});
