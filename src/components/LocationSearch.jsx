import { useReducer, useEffect, useRef } from 'react';
import { searchLocations } from '../services/geocodingService';
import PropTypes from "prop-types";

const RECENT_SEARCHES_KEY = 'pollution_hub_recent_searches';
const MAX_RECENT_SEARCHES = 5;

const initialState = {
  query: '',
  suggestions: [],
  recentSearches: [],
  isOpen: false,
  isLoading: false,
  activeIndex: -1,
  historyError: '',
  searchError: null,
};

function searchReducer(state, action) {
  switch (action.type) {
    case 'SET_QUERY':
      return { ...state, query: action.payload };
    case 'SET_SUGGESTIONS':
      return { ...state, suggestions: action.payload };
    case 'SET_RECENT_SEARCHES':
      return { ...state, recentSearches: action.payload };
    case 'SET_IS_OPEN':
      return { ...state, isOpen: action.payload };
    case 'SET_IS_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ACTIVE_INDEX':
      return { ...state, activeIndex: action.payload };
    case 'SET_HISTORY_ERROR':
      return { ...state, historyError: action.payload };
    case 'SET_SEARCH_ERROR':
      return { ...state, searchError: action.payload };
    case 'RESET_SEARCH':
      return {
        ...state,
        query: '',
        suggestions: [],
        searchError: null,
        activeIndex: -1,
        isOpen: false,
      };
    case 'UPDATE_INPUT':
      return {
        ...state,
        query: action.payload,
        activeIndex: -1,
        searchError: null,
        suggestions: action.payload.trim() === '' ? [] : state.suggestions,
        isOpen: true,
        isLoading: action.payload.trim() !== '',
      };
    case 'HANDLE_SUCCESS_RESULTS':
      return {
        ...state,
        suggestions: action.payload,
        isLoading: false,
      };
    case 'HANDLE_ERROR_RESULTS':
      return {
        ...state,
        suggestions: [],
        searchError: action.payload,
        isLoading: false,
      };
    case 'SELECT_LOCATION':
      return {
        ...state,
        query: action.payload.name,
        isOpen: false,
        suggestions: [],
        activeIndex: -1,
      };
    default:
      return state;
  }
}

/** 
 * Search input with autocomplete and recent-search history managed via useReducer.
 *
 * @param {Object} props Component props.
 * @param {(location: Object) => void} props.onLocationSelected Callback invoked
 * when a location is selected.
 * @param {string} [props.initialCityName] Initial city name shown in the input.
 */

export default function LocationSearch({ onLocationSelected, initialCityName }) {
  const [state, dispatch] = useReducer(searchReducer, {
    ...initialState,
    query: initialCityName || '',
  });

  const {
    query,
    suggestions,
    recentSearches,
    isOpen,
    isLoading,
    activeIndex,
    historyError,
    searchError,
  } = state;

  const wrapperRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const latestQueryRef = useRef('');
  const abortControllerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Load recent searches on mount.
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);

      if (stored) {
        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          dispatch({ type: 'SET_RECENT_SEARCHES', payload: parsed });
        } else {
          dispatch({ type: 'SET_RECENT_SEARCHES', payload: [] });
          dispatch({
            type: 'SET_HISTORY_ERROR',
            payload: 'Recent searches could not be loaded. Starting with an empty search history.',
          });
        }
      }
    } catch (error) {
      dispatch({ type: 'SET_RECENT_SEARCHES', payload: [] });
      dispatch({
        type: 'SET_HISTORY_ERROR',
        payload: 'Recent searches could not be loaded. Starting with an empty search history.',
      });

      if (import.meta.env.DEV) {
        console.error('Failed to parse recent searches:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Update local query if external initialCityName changes (like auto-detect).
    if (
      initialCityName &&
      initialCityName !== 'auto' &&
      initialCityName !== 'Your Current Location'
    ) {
      dispatch({ type: 'SET_QUERY', payload: initialCityName });
    }
  }, [initialCityName]);

  useEffect(() => {
    // Click outside handler to close dropdown.
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        dispatch({ type: 'SET_IS_OPEN', payload: false });
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /** 
   * @param {{
   *  id: string|number,
   *  name: string,
   *  displayName: string
   * }} location
   */
  const saveRecentSearch = (location) => {
    const newRecent = [
      location,
      ...recentSearches.filter((search) => search.id !== location.id),
    ].slice(0, MAX_RECENT_SEARCHES);

    dispatch({ type: 'SET_RECENT_SEARCHES', payload: newRecent });

    try {
      localStorage.setItem(
        RECENT_SEARCHES_KEY,
        JSON.stringify(newRecent)
      );
      dispatch({ type: 'SET_HISTORY_ERROR', payload: '' });
    } catch (error) {
      dispatch({
        type: 'SET_HISTORY_ERROR',
        payload: 'Recent searches could not be saved. Your location selection still works normally.',
      });

      if (import.meta.env.DEV) {
        console.error('Failed to save recent searches:', error);
      }
    }
  };

  /** 
   * @param {{
   *  id: string|number,
   *  name: string,
   *  displayName: string
   * }} location
   */
  const handleSelect = (location) => {
    dispatch({ type: 'SELECT_LOCATION', payload: location });
    saveRecentSearch(location);
    onLocationSelected(location);
  };

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleClear = () => {
    dispatch({ type: 'RESET_SEARCH' });
    abortControllerRef.current?.abort();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;

    dispatch({ type: 'UPDATE_INPUT', payload: val });

    if (val.trim() === '') {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      latestQueryRef.current = val;
      dispatch({ type: 'SET_SEARCH_ERROR', payload: null });

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        const results = await searchLocations(val, 5, abortControllerRef.current.signal);

        // Ignore this result if a newer search has started since this one fired.
        if (latestQueryRef.current !== val) {
          return;
        }

        dispatch({ type: 'HANDLE_SUCCESS_RESULTS', payload: results });
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        if (latestQueryRef.current !== val) {
          return;
        }

        dispatch({
          type: 'HANDLE_ERROR_RESULTS',
          payload: "Failed to fetch locations. Please check your network connection.",
        });
      }
    }, 300);
  };

  /**
    * @param {React.KeyboardEvent<HTMLInputElement>} e
    */
  const handleKeyDown = (e) => {
    const items = query.trim() === '' ? recentSearches : suggestions;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      dispatch({
        type: 'SET_ACTIVE_INDEX',
        payload: activeIndex < items.length - 1 ? activeIndex + 1 : activeIndex,
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      dispatch({
        type: 'SET_ACTIVE_INDEX',
        payload: activeIndex > 0 ? activeIndex - 1 : 0,
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();

      if (activeIndex >= 0 && items[activeIndex]) {
        handleSelect(items[activeIndex]);
      } else if (items.length > 0) {
        // Default to first if none active but hit enter.
        handleSelect(items[0]);
      }
    } else if (e.key === 'Escape') {
      dispatch({ type: 'SET_IS_OPEN', payload: false });
    }
  };

  const showRecent =
    query.trim() === '' && recentSearches.length > 0;

  const showSuggestions =
    query.trim() !== '' && suggestions.length > 0;

  const showNoResults =
    query.trim() !== '' &&
    !isLoading &&
    !searchError &&
    suggestions.length === 0;

  return (
    <div className="location-search-wrapper" ref={wrapperRef}>
      <div className="location-search-input-container" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          className="location-search-input"
          placeholder="Search any city or location..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => dispatch({ type: 'SET_IS_OPEN', payload: true })}
          onKeyDown={handleKeyDown}
          aria-label="Search for a city or location"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="location-search-listbox"
          aria-describedby={historyError ? 'location-search-history-error' : undefined}
          role="combobox"
        />

        {query.length > 0 && (
          <button
            type="button"
            className="location-search-clear-btn"
            onClick={handleClear}
            aria-label="Clear search"
            style={{
              position: 'absolute',
              right: '12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#666',
              padding: '0 4px'
            }}
          >
            ✕
          </button>
        )}
      </div>

      {isLoading && <span className="location-search-spinner" />}

      {historyError && (
        <div
          id="location-search-history-error"
          className="location-search-error"
          role="alert"
        >
          {historyError}
        </div>
      )}

      {isOpen && (showRecent || showSuggestions || showNoResults || searchError) && (
        <ul
          className="location-search-dropdown"
          id="location-search-listbox"
          role="listbox"
        >
          {showRecent && (
            <>
              <li
                className="location-search-header"
                role="presentation"
              >
                Recent Searches
              </li>

              {recentSearches.map((item, index) => (
                <li
                  key={`recent-${item.id}`}
                  className={`location-search-item ${
                    activeIndex === index ? 'active' : ''
                  }`}
                  onClick={() => handleSelect(item)}
                  role="option"
                  aria-selected={activeIndex === index}
                  data-testid="location-suggestion"
                >
                  <svg
                    className="recent-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
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
                  className={`location-search-item ${
                    activeIndex === index ? 'active' : ''
                  }`}
                  onClick={() => handleSelect(item)}
                  role="option"
                  aria-selected={activeIndex === index}
                  data-testid="location-suggestion"
                >
                  <svg
                    className="location-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>

                  <span>{item.displayName}</span>
                </li>
              ))}
            </>
          )}

          {showNoResults && (
            <li
              className="location-search-empty"
              role="presentation"
            >
              No locations found for "{query}"
            </li>
          )}

          {searchError && (
            <li
              className="location-search-error-item"
              role="presentation"
            >
              <span className="error-message">⚠️ {searchError}</span>
              <button
                type="button"
                className="location-search-retry-btn"
                onClick={() => {
                  handleInputChange({ target: { value: query } });
                }}
              >
                Retry
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

LocationSearch.propTypes = {
  /**
    * Called when the user selects a location.
    */
  onLocationSelected: PropTypes.func.isRequired,

  /**
    * Initial city displayed in the search input.
    */
  initialCityName: PropTypes.string,
};

LocationSearch.defaultProps = {
  initialCityName: "",
};
