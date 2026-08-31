import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

  /** Renders the hub and opens the collapsible report form. */
  function renderWithFormOpen() {
    render(<CommunityHub />);
    fireEvent.click(screen.getByRole('button', { name: /Report Pollution/i }));
  }

  /**
   * The report form's controls, queried by accessible name.
   *
   * These used to be pulled out of `document.querySelectorAll('select')` by
   * index, because the selects had no accessible name to query by — three
   * unnamed combo boxes in a row. Reaching past Testing Library like that was a
   * fair signal the markup was wrong rather than the query.
   */
  function formControls() {
    return {
      title: screen.getByRole('textbox', { name: 'Issue title' }),
      description: screen.getByRole('textbox', { name: 'Issue description' }),
      category: screen.getByRole('combobox', { name: 'Incident category' }),
      severity: screen.getByRole('combobox', { name: 'Incident severity' }),
      hashtag: screen.getByRole('combobox', { name: 'Hashtag (optional)' }),
      submit: screen.getByRole('button', { name: /Submit Report/i }),
    };
  }

  /**
   * Installs a geolocation stub.
   *
   * `vi.stubGlobal('navigator', { ...globalThis.navigator, geolocation })` does
   * not work: `navigator`'s properties live on its prototype, so the spread
   * copies nothing and every other consumer of `navigator` is handed an empty
   * object. Defining the one property on the real navigator is what was meant.
   */
  function stubGeolocation(getCurrentPosition) {
    const original = Object.getOwnPropertyDescriptor(globalThis.navigator, 'geolocation');
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });
    return () => {
      if (original) Object.defineProperty(globalThis.navigator, 'geolocation', original);
      else delete globalThis.navigator.geolocation;
    };
  }

  it('submits a report without location attached by default', async () => {
    renderWithFormOpen();

    const form = formControls();

    fireEvent.change(form.title, { target: { value: 'Illegal Burning' } });
    fireEvent.change(form.description, { target: { value: 'Smoke near main park' } });
    fireEvent.change(form.category, { target: { value: 'Garbage burning' } });
    fireEvent.change(form.severity, { target: { value: 'High' } });
    fireEvent.click(form.submit);

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
    const restore = stubGeolocation(mockGeolocation.getCurrentPosition);

    try {
      renderWithFormOpen();

      // The English translation reads "Use Current Location" / "Location
      // attached". These queries were written against the inline defaults in the
      // JSX, which translation.json overrides, so they were looking for text
      // that never reaches the screen.
      fireEvent.click(screen.getByRole('button', { name: /Use Current Location/i }));
      expect(screen.getByText(/Location attached/i)).toBeInTheDocument();

      const form = formControls();
      fireEvent.change(form.title, { target: { value: 'Factory Smoke' } });
      fireEvent.change(form.description, { target: { value: 'Dark emissions observed' } });
      fireEvent.change(form.category, { target: { value: 'Industrial smoke' } });
      fireEvent.change(form.severity, { target: { value: 'Medium' } });
      fireEvent.click(form.submit);

      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        expect(stored.length).toBe(1);
        expect(stored[0].title).toBe('Factory Smoke');
        expect(stored[0].latitude).toBe(28.6139);
        expect(stored[0].longitude).toBe(77.209);
      });
    } finally {
      restore();
    }
  });

  it('handles geolocation denial/error gracefully', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((_, error) =>
        error(new Error('Permission denied'))
      ),
    };
    const restore = stubGeolocation(mockGeolocation.getCurrentPosition);

    try {
      renderWithFormOpen();

      fireEvent.click(screen.getByRole('button', { name: /Use Current Location/i }));
      expect(screen.getByText(/Unable to retrieve location/i)).toBeInTheDocument();

      // Can still submit report
      const form = formControls();
      fireEvent.change(form.title, { target: { value: 'Dust Storm' } });
      fireEvent.change(form.description, { target: { value: 'High dust' } });
      fireEvent.change(form.category, { target: { value: 'Construction dust' } });
      fireEvent.click(form.submit);

      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        expect(stored.length).toBe(1);
        expect(stored[0].title).toBe('Dust Storm');
        expect(stored[0].latitude).toBeNull();
        expect(stored[0].longitude).toBeNull();
      });
    } finally {
      restore();
    }
  });

  it('gives every control in the report form an accessible name', () => {
    // Regression for #994. Three of the four selects had no label, no
    // aria-label and no aria-labelledby, so a screen reader announced three
    // unnamed combo boxes and Testing Library could not tell them apart:
    // "Found multiple elements with the role combobox and name ''".
    renderWithFormOpen();

    const form = document.querySelector('form.community-form');
    const controls = within(form).getAllByRole('combobox')
      .concat(within(form).getAllByRole('textbox'));

    expect(controls.length).toBeGreaterThanOrEqual(6);
    for (const control of controls) {
      expect(control).toHaveAccessibleName();
    }

    // ...and the names are distinct, so nothing is ambiguous to a reader
    // navigating the form by control.
    const names = controls.map((control) => control.getAttribute('aria-label'));
    expect(new Set(names).size).toBe(names.length);
  });

  it('does not rewrite storage when a render finds nothing to migrate', () => {
    // readReports() used to write the whole list back on every call, images
    // included, and it is called from the useState initialiser as well as on
    // mount. Two tabs open on the hub meant each one rewriting storage from
    // whatever snapshot it read.
    const current = [
      {
        id: '1',
        title: 'Nothing to migrate',
        description: 'Already in the current shape',
        votes: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        status: 'New',
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));

    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(<CommunityHub />);

    // The persistence effect writes on mount; what must not happen is the read
    // path writing a second, identical copy on top of it.
    const reportWrites = setItem.mock.calls.filter(([key]) => key === STORAGE_KEY);
    expect(reportWrites.length).toBeLessThanOrEqual(1);
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
    renderWithFormOpen();

    const form = formControls();

    const maliciousTitle = '<script>alert("XSS-Title")</script>';
    const maliciousDesc = '<img src=x onerror="alert(1)"> & "quotes"';

    fireEvent.change(form.title, { target: { value: maliciousTitle } });
    fireEvent.change(form.description, { target: { value: maliciousDesc } });
    fireEvent.change(form.category, { target: { value: 'Waste dumping' } });
    fireEvent.click(form.submit);

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
    renderWithFormOpen();

    // Create a fake SVG file (disallowed MIME type)
    const file = new File(['<svg></svg>'], 'malicious.svg', { type: 'image/svg+xml' });
    const fileInput = screen.getByLabelText('Photo evidence (optional)');

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
