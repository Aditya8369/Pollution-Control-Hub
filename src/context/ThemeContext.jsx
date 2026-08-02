import React, { createContext, useContext, useState, useEffect } from 'react';

const THEME_STORAGE_KEY = 'pollution-hub-theme';
const VALID_THEMES = ['dark', 'light', 'high-contrast'];
const DEFAULT_THEME = 'dark';

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  changeTheme: () => {},
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

  useEffect(() => {
    try {
      document.documentElement.dataset.theme = theme;
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Handle localStorage quota or permission errors silently
    }
  }, [theme]);

  const changeTheme = (newTheme) => {
    if (VALID_THEMES.includes(newTheme)) {
      setTheme(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, 
// @ts-ignore
    setTheme, changeTheme }}>
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
