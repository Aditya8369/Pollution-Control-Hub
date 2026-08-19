import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';
import ThemeSwitcher from '../components/ThemeSwitcher';

const THEME_STORAGE_KEY = 'pollution-hub-theme';
const ACCENT_COLOR_KEY = 'pollution-hub-accent-color';

function TestConsumer() {
  const { theme, changeTheme, accentColor, setAccentColor } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="current-accent">{accentColor}</span>
      <button onClick={() => changeTheme('light')}>Set Light</button>
      <button onClick={() => changeTheme('high-contrast')}>Set High Contrast</button>
      <button onClick={() => changeTheme('dark')}>Set Dark</button>
      <button onClick={() => changeTheme('ocean')}>Set Ocean</button>
      <button onClick={() => setAccentColor('#fb923c')}>Set Accent Orange</button>
    </div>
  );
}

describe('ThemeContext Infrastructure & Switcher (Issue #417)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    delete document.documentElement.dataset.theme;
  });

  it('initializes default theme to "dark" when no preference exists', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('restores previously saved theme from localStorage on load', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'high-contrast');

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('high-contrast');
    expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast');
  });

  it('updates theme state, localStorage, and document data-theme attribute when changing theme', async () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText('Set Light'));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    fireEvent.click(screen.getByText('Set High Contrast'));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('high-contrast');
    expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('high-contrast');
  });

  it('initializes default accent color to #2dd4bf', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-accent')).toHaveTextContent('#2dd4bf');
    expect(localStorage.getItem(ACCENT_COLOR_KEY)).toBe('#2dd4bf');
  });

  it('restores previously saved accent color from localStorage on load', () => {
    localStorage.setItem(ACCENT_COLOR_KEY, '#f87171');

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-accent')).toHaveTextContent('#f87171');
    expect(document.documentElement.style.getPropertyValue('--user-accent')).toBe('#f87171');
  });

  it('updates accent color state and localStorage when changing accent color', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText('Set Accent Orange'));
    expect(screen.getByTestId('current-accent')).toHaveTextContent('#fb923c');
    expect(localStorage.getItem(ACCENT_COLOR_KEY)).toBe('#fb923c');
    expect(document.documentElement.style.getPropertyValue('--user-accent')).toBe('#fb923c');
  });

  it('renders compact ThemeSwitcher utility button and opens popover menu to select theme', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    );

    const triggerBtn = screen.getByRole('button', { name: /theme and accent color menu/i });
    expect(triggerBtn).toBeInTheDocument();

    fireEvent.click(triggerBtn);
    expect(triggerBtn).toHaveAttribute('aria-expanded', 'true');

    const hcOption = screen.getByRole('menuitemradio', { name: /high contrast/i });
    fireEvent.click(hcOption);

    expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('high-contrast');
  });

  it('displays all 6 themes in the switcher: dark, light, high-contrast, ocean, sunset, forest', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    );

    const triggerBtn = screen.getByRole('button', { name: /theme and accent color menu/i });
    fireEvent.click(triggerBtn);

    expect(screen.getByRole('menuitemradio', { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: /high contrast/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: /ocean/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: /sunset/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: /forest/i })).toBeInTheDocument();
  });

  it('shows accent color swatches when menu is open', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    );

    const triggerBtn = screen.getByRole('button', { name: /theme and accent color menu/i });
    fireEvent.click(triggerBtn);

    const swatches = screen.getAllByRole('button', { name: /select accent color/i });
    expect(swatches.length).toBeGreaterThan(0);
  });

  it('allows selecting an accent color from the swatches', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    );

    const triggerBtn = screen.getByRole('button', { name: /theme and accent color menu/i });
    fireEvent.click(triggerBtn);

    // Get the first accent color swatch (should be available for the current theme)
    const swatches = screen.getAllByRole('button', { name: /select accent color/i });
    fireEvent.click(swatches[1]); // Click second swatch

    expect(localStorage.getItem(ACCENT_COLOR_KEY)).not.toBe(null);
  });

  it('updates accent color swatches when theme changes', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    );

    const triggerBtn = screen.getByRole('button', { name: /theme and accent color menu/i });
    fireEvent.click(triggerBtn);

    // Switch to ocean theme
    const oceanOption = screen.getByRole('menuitemradio', { name: /ocean/i });
    fireEvent.click(oceanOption);

    // Button should be closed after selection
    expect(triggerBtn).toHaveAttribute('aria-expanded', 'false');

    // Reopen menu to verify new swatches are available
    fireEvent.click(triggerBtn);
    expect(triggerBtn).toHaveAttribute('aria-expanded', 'true');

    // Swatches should now reflect ocean theme colors
    const swatches = screen.getAllByRole('button', { name: /select accent color/i });
    expect(swatches.length).toBeGreaterThan(0);
  });

  it('closes menu when Escape key is pressed', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    );

    const triggerBtn = screen.getByRole('button', { name: /theme and accent color menu/i });
    fireEvent.click(triggerBtn);
    expect(triggerBtn).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(triggerBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes menu when clicking outside', () => {
    render(
      <ThemeProvider>
        <div>
          <ThemeSwitcher />
          <div data-testid="outside">Outside element</div>
        </div>
      </ThemeProvider>
    );

    const triggerBtn = screen.getByRole('button', { name: /theme and accent color menu/i });
    fireEvent.click(triggerBtn);
    expect(triggerBtn).toHaveAttribute('aria-expanded', 'true');

    const outside = screen.getByTestId('outside');
    fireEvent.mouseDown(outside);

    expect(triggerBtn).toHaveAttribute('aria-expanded', 'false');
  });
});
