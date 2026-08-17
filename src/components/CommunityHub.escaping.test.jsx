import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CommunityHub, { decodeStoredEntities, readReports } from './CommunityHub';

const STORAGE_KEY = 'pollution-community-reports';

/** @param {any[]} reports */
function seed(reports) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

/** @param {Partial<any>} overrides */
function makeReport(overrides = {}) {
  return {
    id: 'r1',
    title: 'A title',
    description: 'A description',
    image: '',
    votes: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'Pending',
    verifiedAt: '',
    moderationNotes: '',
    latitude: null,
    longitude: null,
    ...overrides,
  };
}

describe('decodeStoredEntities', () => {
  it('restores the five entities the old sanitizer produced', () => {
    expect(decodeStoredEntities('Smoke &amp; dust')).toBe('Smoke & dust');
    expect(decodeStoredEntities('St. Mary&#x27;s')).toBe("St. Mary's");
    expect(decodeStoredEntities('&quot;unbearable&quot;')).toBe('"unbearable"');
    expect(decodeStoredEntities('AQI &gt; 300')).toBe('AQI > 300');
    expect(decodeStoredEntities('&lt;script&gt;')).toBe('<script>');
  });

  it('decodes &amp; last so double-escaped markup unwinds one level only', () => {
    // The old sanitizer turned "<b>" into "&lt;b&gt;"; escaping that again gives
    // "&amp;lt;b&amp;gt;", which must decode back to "&lt;b&gt;", not to "<b>".
    expect(decodeStoredEntities('&amp;lt;b&amp;gt;')).toBe('&lt;b&gt;');
  });

  it('leaves text without entities untouched', () => {
    expect(decodeStoredEntities('Garbage burning near the depot')).toBe(
      'Garbage burning near the depot'
    );
    expect(decodeStoredEntities('')).toBe('');
  });

  it('passes non-string values through unchanged', () => {
    // @ts-ignore - deliberately wrong type
    expect(decodeStoredEntities(null)).toBeNull();
    // @ts-ignore - deliberately wrong type
    expect(decodeStoredEntities(42)).toBe(42);
  });
});

describe('readReports migration (regression for #497)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('decodes reports that were persisted in the escaped form', () => {
    seed([
      makeReport({
        id: 'legacy',
        title: 'Smoke &amp; dust near St. Mary&#x27;s',
        description: 'Residents said &quot;it&#x27;s unbearable&quot; — AQI &gt; 300',
      }),
    ]);

    const reports = readReports();

    expect(reports[0].title).toBe("Smoke & dust near St. Mary's");
    expect(reports[0].description).toBe(
      'Residents said "it\'s unbearable" — AQI > 300'
    );
  });

  it('writes the decoded reports back so the repair is permanent', () => {
    seed([makeReport({ id: 'legacy', title: 'A &amp; B' })]);

    readReports();

    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    expect(persisted[0].title).toBe('A & B');
  });

  it('does not rewrite storage when nothing needs migrating', () => {
    seed([makeReport({ title: 'Clean title' })]);
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    readReports();

    expect(setItem).not.toHaveBeenCalledWith(STORAGE_KEY, expect.anything());
    setItem.mockRestore();
  });

  it('preserves every other field on a migrated report', () => {
    seed([
      makeReport({
        id: 'legacy',
        title: 'A &amp; B',
        votes: 7,
        status: 'Verified (community)',
        latitude: 28.61,
        longitude: 77.21,
      }),
    ]);

    const [report] = readReports();

    expect(report.id).toBe('legacy');
    expect(report.votes).toBe(7);
    expect(report.status).toBe('Verified (community)');
    expect(report.latitude).toBe(28.61);
    expect(report.longitude).toBe(77.21);
  });

  it('returns an empty list for malformed or non-array storage', () => {
    localStorage.setItem(STORAGE_KEY, 'not json');
    expect(readReports()).toEqual([]);

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: 'an array' }));
    expect(readReports()).toEqual([]);
  });
});

describe('CommunityHub report text round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });
  afterEach(() => localStorage.clear());

  it('stores and displays punctuation exactly as the author typed it', async () => {
    render(<CommunityHub />);

    const title = "Smoke & dust near St. Mary's";
    const description = 'Residents said "it\'s unbearable" — AQI > 300';

    fireEvent.change(screen.getByPlaceholderText(/Issue title/i), {
      target: { value: title },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe location/i), {
      target: { value: description },
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit Report/i }));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0].title).toBe(title);
      expect(stored[0].description).toBe(description);
    });

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(title);
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it('uses the unmangled title as the evidence image alt text', async () => {
    seed([
      makeReport({
        title: "Smoke & dust at St. Mary's",
        image:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      }),
    ]);

    render(<CommunityHub />);

    expect(screen.getByAltText("Smoke & dust at St. Mary's")).toBeInTheDocument();
  });

  it('caps stored title and description length', async () => {
    render(<CommunityHub />);

    fireEvent.change(screen.getByPlaceholderText(/Issue title/i), {
      target: { value: 'T'.repeat(400) },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe location/i), {
      target: { value: 'D'.repeat(5000) },
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit Report/i }));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0].title.length).toBeLessThanOrEqual(120);
      expect(stored[0].description.length).toBeLessThanOrEqual(2000);
    });
  });
});
