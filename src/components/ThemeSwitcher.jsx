import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeSwitcher() {
  const { theme, changeTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const themes = [
    { id: 'dark', label: 'Dark', icon: '🌙' },
    { id: 'light', label: 'Light', icon: '☀️' },
    { id: 'high-contrast', label: 'High Contrast', icon: '◻' },
  ];

  const currentTheme = themes.find((t) => t.id === theme) || themes[0];

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
    setIsOpen(false);
  };

  return (
    <div className="theme-switcher-utility" ref={containerRef}>
      <button
        type="button"
        className="theme-utility-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Color theme menu"
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
        <div className="theme-popover-menu" role="menu" aria-label="Color themes">
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
      )}
    </div>
  );
}
