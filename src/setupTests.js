import "@testing-library/jest-dom";
import { vi } from "vitest";
import { server } from './mocks/server.js';
import enTranslations from './locales/en/translation.json';

// Start MSW before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers after each test for isolation
afterEach(() => server.resetHandlers());

// Close server after all tests
afterAll(() => server.close());

// Resolves a dot-separated path ("footer.brandTitle") against the real English
// translation tree, so tests see the same text end users do instead of a
// hand-maintained subset that silently falls out of sync with translation.json.
function resolveKey(key) {
  return key.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), enTranslations);
}

// Minimal {{var}} interpolation matching i18next's default syntax, enough for
// the translation strings used in this app.
function interpolate(template, options) {
  if (typeof template !== "string" || !options) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, varName) =>
    Object.prototype.hasOwnProperty.call(options, varName) ? String(options[varName]) : match
  );
}

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => { } },
  useTranslation: () => ({
    t: (key, optionsOrDefault, maybeOptions) => {
      // useTranslation()'s t supports both t(key, options) and
      // t(key, defaultValue, options) call shapes.
      const hasDefault = typeof optionsOrDefault === "string";
      const defaultValue = hasDefault ? optionsOrDefault : undefined;
      const options = hasDefault ? maybeOptions : optionsOrDefault;

      const resolved = resolveKey(key);
      const text = typeof resolved === "string" ? resolved : (defaultValue ?? key);
      return interpolate(text, options);
    },
    i18n: {
      changeLanguage: () => new Promise(() => { }),
      language: "en",
      t: (key, defaultValue, options) => {
        const resolved = resolveKey(key);
        const text = typeof resolved === "string" ? resolved : (defaultValue ?? key);
        return interpolate(text, options);
      },
    },
  }),
}));