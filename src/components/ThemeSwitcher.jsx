import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeSwitcher() {
  const { theme, changeTheme, accentColor, setAccentColor, themeOptions } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedThemeForAccent, setSelectedThemeForAccent] = useState(theme);
  const containerRef = useRef(null);

  const themes = [
    { id: 'dark', label: 'Dark', icon: '🌙' },
    { id: 'light', label: 'Light', icon: '☀️' },
    { id: 'high-contrast', label: 'High Contrast', icon: '◻' },
    { id: 'ocean', label: 'Ocean', icon: '🌊' },
    { id: 'sunset', label: 'Sunset', icon: '🌅' },
    { id: 'forest', label: 'Forest', icon: '🌲' },
  ];

  const currentTheme = themes.find((t) => t.id === theme) || themes[0];
  const currentThemeOptions = themeOptions[selectedThemeForAccent];

  useEffect(() => {
    setSelectedThemeForAccent(theme);
  }, [theme]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectTheme = (themeId) => {
    changeTheme(themeId);
    setSelectedThemeForAccent(themeId);
    setIsOpen(false);
  };

  const handleSelectAccentColor = (color) => {
    setAccentColor(color);
  };

  return (
    <div className="theme-switcher-utility" ref={containerRef}>
      <button
        type="button"
        className="theme-utility-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Theme and accent color menu"
        title={`Theme: ${currentTheme.label}`}
      >
        <span className="theme-btn-icon" aria-hidden="true">
          {currentTheme.icon}
        </span>
        <span className="theme-btn-label">{currentTheme.label}</span>
        <span className="theme-btn-arrow" aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <div className="theme-popover-menu" role="menu" aria-label="Theme and accent color options">
          <div className="theme-menu-section">
            <div className="theme-menu-section-title" id="theme-selector-label">
              Theme
            </div>
            <div role="group" aria-labelledby="theme-selector-label">
              {themes.map((t) => {
                const isActive = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    className={`theme-menu-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectTheme(t.id)}
                  >
                    <span className="theme-item-icon" aria-hidden="true">
                      {t.icon}
                    </span>
                    <span className="theme-item-label">{t.label}</span>
                    {isActive && (
                      <span className="theme-item-check" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {currentThemeOptions && currentThemeOptions.accentOptions && (
            <div className="theme-menu-section">
              <div className="theme-menu-section-title" id="accent-selector-label">
                Accent Color
              </div>
              <div
                className="accent-color-swatches"
                role="group"
                aria-labelledby="accent-selector-label"
              >
                {currentThemeOptions.accentOptions.map((color) => {
                  const isSelected = accentColor === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      className={`accent-color-swatch ${isSelected ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleSelectAccentColor(color)}
                      aria-label={`Select accent color ${color}`}
                      aria-pressed={isSelected}
                      title={`Accent: ${color}`}
                    >
                      {isSelected && (
                        <span className="accent-swatch-check" aria-hidden="true">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
