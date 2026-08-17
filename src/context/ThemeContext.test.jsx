import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';
import ThemeSwitcher from '../components/ThemeSwitcher';

const THEME_STORAGE_KEY = 'pollution-hub-theme';

function TestConsumer() {
  const { theme, changeTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button onClick={() => changeTheme('light')}>Set Light</button>
      <button onClick={() => changeTheme('high-contrast')}>Set High Contrast</button>
      <button onClick={() => changeTheme('dark')}>Set Dark</button>
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

  it('renders compact ThemeSwitcher utility button and opens popover menu to select theme', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    );

    const triggerBtn = screen.getByRole('button', { name: /color theme menu/i });
    expect(triggerBtn).toBeInTheDocument();

    fireEvent.click(triggerBtn);
    expect(triggerBtn).toHaveAttribute('aria-expanded', 'true');

    const hcOption = screen.getByRole('menuitemradio', { name: /high contrast/i });
    fireEvent.click(hcOption);

    expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('high-contrast');
  });
});
