import React, { createContext, useContext, useState, useEffect } from 'react';

const THEME_STORAGE_KEY = 'pollution-hub-theme';
const ACCENT_COLOR_KEY = 'pollution-hub-accent-color';
const VALID_THEMES = ['dark', 'light', 'high-contrast', 'ocean', 'sunset', 'forest'];
const DEFAULT_THEME = 'dark';
const DEFAULT_ACCENT_COLOR = '#2dd4bf'; // Default teal accent for dark theme

// Predefined theme palettes with their own default accent colors
const THEME_PALETTES = {
  dark: {
    label: 'Dark',
    icon: '🌙',
    accentOptions: ['#2dd4bf', '#fb923c', '#f87171', '#60a5fa', '#a78bfa'],
  },
  light: {
    label: 'Light',
    icon: '☀️',
    accentOptions: ['#0d9488', '#f97316', '#b91c1c', '#0284c7', '#7c3aed'],
  },
  'high-contrast': {
    label: 'High Contrast',
    icon: '◻',
    accentOptions: ['#003d36', '#7a3000', '#7a0000', '#003d78', '#4c1d95'],
  },
  ocean: {
    label: 'Ocean',
    icon: '🌊',
    accentOptions: ['#0369a1', '#0284c7', '#06b6d4', '#0891b2', '#00d9ff'],
  },
  sunset: {
    label: 'Sunset',
    icon: '🌅',
    accentOptions: ['#ea580c', '#f97316', '#fb923c', '#fbbf24', '#fcd34d'],
  },
  forest: {
    label: 'Forest',
    icon: '🌲',
    accentOptions: ['#15803d', '#22c55e', '#16a34a', '#4ade80', '#86efac'],
  },
};

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  changeTheme: () => {},
  accentColor: DEFAULT_ACCENT_COLOR,
  setAccentColor: () => {},
  themeOptions: THEME_PALETTES,
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved && VALID_THEMES.includes(saved)) {
        return saved;
      }
    } catch {
      // Fallback on localStorage error
    }
    return DEFAULT_THEME;
  });

  const [accentColor, setAccentColor] = useState(() => {
    try {
      const saved = localStorage.getItem(ACCENT_COLOR_KEY);
      if (saved && /^#[0-9A-Fa-f]{6}$/.test(saved)) {
        return saved;
      }
    } catch {
      // Fallback on localStorage error
    }
    return DEFAULT_ACCENT_COLOR;
  });

  useEffect(() => {
    try {
      document.documentElement.dataset.theme = theme;
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.style.setProperty('--user-accent', accentColor);
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.setItem(ACCENT_COLOR_KEY, accentColor);
    } catch {
      // Handle localStorage quota or permission errors silently
    }
  }, [theme, accentColor]);

  const changeTheme = (newTheme) => {
    if (VALID_THEMES.includes(newTheme)) {
      setTheme(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      changeTheme,
      accentColor,
      setAccentColor,
      themeOptions: THEME_PALETTES,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
