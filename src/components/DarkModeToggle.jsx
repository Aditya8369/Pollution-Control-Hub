import React from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * DarkModeToggle — a quick binary UI switch for dark ↔ light mode.
 *
 * All non-"light" themes are treated as "dark mode on", so the toggle
 * always snaps to either 'dark' or 'light'. The full ThemeSwitcher
 * remains available for users who want ocean, sunset, forest, etc.
 *
 * Preference is automatically persisted in localStorage by ThemeContext.
 */
export default function DarkModeToggle() {
  const { theme, changeTheme } = useTheme();
  const isDark = theme !== 'light';

  function handleToggle() {
    changeTheme(isDark ? 'light' : 'dark');
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`dark-mode-toggle${isDark ? ' dark-mode-toggle--dark' : ''}`}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
    >
      <span className="dark-mode-toggle__track" aria-hidden="true">
        <span className="dark-mode-toggle__thumb">
          <span className="dark-mode-toggle__icon">
            {isDark ? '🌙' : '☀️'}
          </span>
        </span>
      </span>
      <span className="dark-mode-toggle__label">
        {isDark ? 'Dark' : 'Light'}
      </span>
    </button>
  );
}
