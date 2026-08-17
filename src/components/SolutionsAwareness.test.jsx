import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, beforeEach } from 'vitest';
import SolutionsAwareness from './SolutionsAwareness';

describe('SolutionsAwareness Component', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('renders Section title and column headers', () => {
    render(<SolutionsAwareness />);

    expect(screen.getByText('Solutions & Awareness')).toBeInTheDocument();
    expect(screen.getByText('Ways to Reduce Pollution')).toBeInTheDocument();
    expect(screen.getByText('Government Policies')).toBeInTheDocument();
    expect(screen.getByText('Educational Reads')).toBeInTheDocument();
  });

  test('Government Policy cards expand and collapse as accordion (single card open)', () => {
    render(<SolutionsAwareness />);

    const policy1Btn = screen.getByRole('button', {
      name: /National Clean Air Programme \(NCAP\)/i,
    });

    const policy2Btn = screen.getByRole('button', {
      name: /Bharat Stage VI \(BS6\) Emission Standards/i,
    });

    // Initially collapsed
    expect(policy1Btn).toHaveAttribute('aria-expanded', 'false');
    expect(policy2Btn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/Target 20%–40% reduction/i)).not.toBeInTheDocument();

    // Expand Policy 1
    fireEvent.click(policy1Btn);
    expect(policy1Btn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Target 20%–40% reduction/i)).toBeInTheDocument();

    // Expand Policy 2 -> Policy 1 automatically collapses
    fireEvent.click(policy2Btn);
    expect(policy2Btn).toHaveAttribute('aria-expanded', 'true');
    expect(policy1Btn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/Target 20%–40% reduction/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Reduce vehicular nitrogen oxides/i)).toBeInTheDocument();
  });

  test('Toggles tip bookmarks and persists to localStorage', () => {
    render(<SolutionsAwareness />);

    const bookmarkBtn = screen.getByRole('button', {
      name: /Bookmark Choose Clean Transportation/i,
    });

    // Click to bookmark
    fireEvent.click(bookmarkBtn);
    expect(screen.getByRole('button', { name: /Remove bookmark for Choose Clean Transportation/i })).toBeInTheDocument();

    const storedBookmarks = JSON.parse(window.localStorage.getItem('pollutionHub.bookmarkedTips'));
    expect(storedBookmarks).toContain('tip-1');

    // Click again to unbookmark
    fireEvent.click(screen.getByRole('button', { name: /Remove bookmark for Choose Clean Transportation/i }));
    const updatedBookmarks = JSON.parse(window.localStorage.getItem('pollutionHub.bookmarkedTips'));
    expect(updatedBookmarks).not.toContain('tip-1');
  });

  test('Opens Educational Read modal and closes via close button or Escape key', () => {
    render(<SolutionsAwareness />);

    const articleBtn = screen.getByText('How AQI Impacts Daily Lifestyle Decisions').closest('button');

    // Open modal
    fireEvent.click(articleBtn);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/Key Takeaway/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Read Full Article/i })).toHaveAttribute(
      'href',
      'https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health'
    );

    // Close via Close button
    const closeBtn = screen.getByRole('button', { name: /Close educational article modal/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Reopen and close via Escape key
    fireEvent.click(articleBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
