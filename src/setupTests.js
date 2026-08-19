import "@testing-library/jest-dom";
import { vi } from "vitest";
import { server } from './mocks/server.js';

// Mock localStorage globally to fix Node.js 25+ conflicts with JSDOM
try {
  const StorageConstructor = typeof global.Storage !== 'undefined' ? global.Storage : (typeof window !== 'undefined' ? window.Storage : null);
  if (StorageConstructor) {
    const store = new Map();
    
    StorageConstructor.prototype.getItem = function(key) {
      return store.get(key) ?? null;
    };
    StorageConstructor.prototype.setItem = function(key, value) {
      store.set(key, String(value));
    };
    StorageConstructor.prototype.removeItem = function(key) {
      store.delete(key);
    };
    StorageConstructor.prototype.clear = function() {
      store.clear();
    };
    Object.defineProperty(StorageConstructor.prototype, 'length', {
      get: function() { return store.size; },
      configurable: true
    });
    StorageConstructor.prototype.key = function(index) {
      return Array.from(store.keys())[index] || null;
    };

    const mockLocalStorage = Object.create(StorageConstructor.prototype);

    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true
    });
  }
} catch (e) {
  console.error("Failed to redirect global.localStorage:", e);
}

// Start MSW before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers after each test for isolation
afterEach(() => server.resetHandlers());

// Close server after all tests
afterAll(() => server.close());

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options) => {
      const translations = {
        "footer.brandTitle": "Pollution Control Hub",
        "footer.github": "GitHub Repository",
        "footer.reportIssue": "Report an Issue",
        "footer.contributing": "Contributing Guide",
        "footer.copyright": `© ${options?.year || new Date().getFullYear()} Pollution Control Hub.`,
      };
      return translations[key] || key;
    },
    i18n: {
      changeLanguage: () => new Promise(() => {}),
      language: "en",
    },
  }),
}));
