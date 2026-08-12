// eslint.config.js — ESLint flat config (ESLint v9+)
import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  js.configs.recommended,

  // Apply jsx-a11y rules to all JSX/TSX source files
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        crypto: 'readonly',
        fetch: 'readonly',
        alert: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
  },

  // Test files reach for a few globals the app itself does not: `process` to pin a
  // timezone, and the DOM constructors needed to dispatch events and stub storage.
  // Without these they read as undefined identifiers rather than as real problems.
  {
    files: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}', 'src/setupTests.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
        globalThis: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        Storage: 'readonly',
        HTMLElement: 'readonly',
      },
    },
  },
];
