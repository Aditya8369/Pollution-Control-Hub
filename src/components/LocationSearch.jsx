import { useState, useEffect, useRef, useCallback } from 'react';
import { searchLocations } from '../services/geocodingService';

const RECENT_SEARCHES_KEY = 'pollution_hub_recent_searches';
const MAX_RECENT_SEARCHES = 5;

export default function LocationSearch({ onLocationSelected, initialCityName }) {
  const [query, setQuery] = useState(initialCityName || '');
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  
  const wrapperRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const latestQueryRef = useRef('');   // ← new

  useEffect(() => {
    // Load recent searches on mount
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse recent searches', e);
    }
  }, []);

  useEffect(() => {
    // Update local query if external initialCityName changes (like auto-detect)
    if (initialCityName && initialCityName !== 'auto' && initialCityName !== 'Your Current Location') {
      setQuery(initialCityName);
    }
  }, [initialCityName]);

  useEffect(() => {
    // Click outside handler to close dropdown
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveRecentSearch = (location) => {
  const newRecent = [location, ...recentSearches.filter(s => s.id !== location.id)].slice(0, MAX_RECENT_SEARCHES);
  setRecentSearches(newRecent);
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newRecent));
  } catch (e) {
    console.error('Failed to save recent searches', e);
  }
};

  const handleSelect = (location) => {
    setQuery(location.name); // Just show the city name in input
    setIsOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
    saveRecentSearch(location);
    onLocationSelected(location);
  };

const handleInputChange = (e) => {
  const val = e.target.value;
  setQuery(val);
  setActiveIndex(-1);

  if (val.trim() === '') {
    setSuggestions([]);
    setIsOpen(true);
    return;
  }

  setIsLoading(true);
  setIsOpen(true);

  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
  }

  debounceTimerRef.current = setTimeout(async () => {
    latestQueryRef.current = val;          // ← mark this as the latest requested query
    const results = await searchLocations(val);

    // Ignore this result if a newer search has started since this one fired
    if (latestQueryRef.current !== val) return;   // ← the key guard

    setSuggestions(results);
    setIsLoading(false);
  }, 500);
};

  const handleKeyDown = (e) => {
    const items = query.trim() === '' ? recentSearches : suggestions;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < items.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) {
        handleSelect(items[activeIndex]);
      } else if (items.length > 0) {
        // Default to first if none active but hit enter
        handleSelect(items[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const showRecent = query.trim() === '' && recentSearches.length > 0;
  const showSuggestions = query.trim() !== '' && suggestions.length > 0;
  const showNoResults = query.trim() !== '' && !isLoading && suggestions.length === 0;

  return (
    <div className="location-search-wrapper" ref={wrapperRef}>
      <input
        type="text"
        className="location-search-input"
        placeholder="Search any city or location..."
        value={query}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls="location-search-listbox"
        role="combobox"
      />
      {isLoading && <span className="location-search-spinner" />}

      {isOpen && (showRecent || showSuggestions || showNoResults) && (
        <ul className="location-search-dropdown" id="location-search-listbox" role="listbox">
          {showRecent && (
            <>
              <li className="location-search-header" role="presentation">Recent Searches</li>
              {recentSearches.map((item, index) => (
                <li
                  key={`recent-${item.id}`}
                  className={`location-search-item ${activeIndex === index ? 'active' : ''}`}
                  onClick={() => handleSelect(item)}
                  role="option"
                  aria-selected={activeIndex === index}
                >
                  <svg className="recent-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span>{item.displayName}</span>
                </li>
              ))}
            </>
          )}

          {showSuggestions && (
            <>
              {suggestions.map((item, index) => (
                <li
                  key={`suggest-${item.id}`}
                  className={`location-search-item ${activeIndex === index ? 'active' : ''}`}
                  onClick={() => handleSelect(item)}
                  role="option"
                  aria-selected={activeIndex === index}
                >
                  <svg className="location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>{item.displayName}</span>
                </li>
              ))}
            </>
          )}

          {showNoResults && (
            <li className="location-search-empty" role="presentation">
              No locations found for "{query}"
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
