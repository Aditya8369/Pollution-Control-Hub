import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import DarkModeToggle from './DarkModeToggle';

const THEME_STORAGE_KEY = 'pollution-hub-theme';

/** Wraps DarkModeToggle in the required ThemeProvider. */
function renderToggle(initialTheme) {
  if (initialTheme) {
    localStorage.setItem(THEME_STORAGE_KEY, initialTheme);
  }
  return render(
    <ThemeProvider>
      <DarkModeToggle />
    </ThemeProvider>
  );
}

describe('DarkModeToggle (Issue #748)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    delete document.documentElement.dataset.theme;
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders a button with role="switch"', () => {
    renderToggle();
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('has an accessible label mentioning "dark mode" or "light mode"', () => {
    renderToggle();
    const btn = screen.getByRole('switch');
    expect(btn.getAttribute('aria-label')).toMatch(/dark mode|light mode/i);
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('is aria-checked=true when the theme is "dark" (default)', () => {
    renderToggle('dark');
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('is aria-checked=false when the theme is "light"', () => {
    renderToggle('light');
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('shows the 🌙 icon in dark mode', () => {
    renderToggle('dark');
    expect(screen.getByRole('switch').textContent).toContain('🌙');
  });

  it('shows the ☀️ icon in light mode', () => {
    renderToggle('light');
    expect(screen.getByRole('switch').textContent).toContain('☀️');
  });

  // ── Non-light themes treated as "dark" ─────────────────────────────────────

  it.each(['ocean', 'sunset', 'forest', 'high-contrast'])(
    'treats "%s" as dark mode (aria-checked=true)',
    (theme) => {
      renderToggle(theme);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    }
  );

  // ── Toggle interaction ─────────────────────────────────────────────────────

  it('clicking in dark mode switches to light: aria-checked becomes false', () => {
    renderToggle('dark');
    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking in light mode switches to dark: aria-checked becomes true', () => {
    renderToggle('light');
    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('clicking dark→light updates data-theme on <html> to "light"', () => {
    renderToggle('dark');
    fireEvent.click(screen.getByRole('switch'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('clicking light→dark updates data-theme on <html> to "dark"', () => {
    renderToggle('light');
    fireEvent.click(screen.getByRole('switch'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  // ── localStorage persistence ───────────────────────────────────────────────

  it('persists "light" in localStorage after toggling from dark', () => {
    renderToggle('dark');
    fireEvent.click(screen.getByRole('switch'));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('persists "dark" in localStorage after toggling from light', () => {
    renderToggle('light');
    fireEvent.click(screen.getByRole('switch'));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('double-click returns to original theme in localStorage', () => {
    renderToggle('dark');
    const btn = screen.getByRole('switch');
    fireEvent.click(btn); // dark → light
    fireEvent.click(btn); // light → dark
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  // ── Keyboard accessibility ─────────────────────────────────────────────────

  it('activates with Enter key', () => {
    renderToggle('dark');
    const btn = screen.getByRole('switch');
    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('activates with Space key', () => {
    renderToggle('dark');
    const btn = screen.getByRole('switch');
    fireEvent.keyDown(btn, { key: ' ' });
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('does NOT activate with unrelated keys (e.g. Tab)', () => {
    renderToggle('dark');
    const btn = screen.getByRole('switch');
    fireEvent.keyDown(btn, { key: 'Tab' });
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });
});
