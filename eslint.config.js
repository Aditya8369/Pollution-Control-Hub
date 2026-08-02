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
];
