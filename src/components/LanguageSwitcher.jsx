import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const languages = [
        { id: 'en', label: 'English', icon: '🇬🇧' },
        { id: 'hi', label: 'हिन्दी', icon: '🇮🇳' },
        { id: 'bn', label: 'বাংলা', icon: '🇧🇩' },
    ];

    const currentLanguage =
        languages.find((l) => l.id === i18n.language) || languages[0];

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

    const handleSelectLanguage = (languageId) => {
        i18n.changeLanguage(languageId);
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
                aria-label="Language menu"
                title={`Language: ${currentLanguage.label}`}
            >
                <span className="theme-btn-icon" aria-hidden="true">
                    {currentLanguage.icon}
                </span>
                <span className="theme-btn-label">{currentLanguage.label}</span>
                <span className="theme-btn-arrow" aria-hidden="true">
                    ▾
                </span>
            </button>

            {isOpen && (
                <div className="theme-popover-menu" role="menu" aria-label="Languages">
                    {languages.map((l) => {
                        const isActive = i18n.language === l.id;
                        return (
                            <button
                                key={l.id}
                                type="button"
                                role="menuitemradio"
                                aria-checked={isActive}
                                className={`theme-menu-item ${isActive ? 'active' : ''}`}
                                onClick={() => handleSelectLanguage(l.id)}
                            >
                                <span className="theme-item-icon" aria-hidden="true">
                                    {l.icon}
                                </span>
                                <span className="theme-item-label">{l.label}</span>
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