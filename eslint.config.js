// eslint.config.js — ESLint flat config (ESLint v9+)
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',

      // TypeScript sources are not linted yet, and this is deliberate rather than an
      // oversight. Linting them needs a TypeScript-aware parser, and `typescript-eslint`
      // peer-requires `typescript >=4.8.4 <6.1.0` while this project is on 7.0.2, so it
      // cannot be installed without --legacy-peer-deps. Leaving them in the lint target
      // produced a parse error per file, which is what "Unexpected token interface" was.
      //
      // Removing these two lines and adding the parser is a small change once
      // typescript-eslint supports TypeScript 7. Four files are waiting on it:
      // lib/eventBus.ts, services/airQualityService.ts, services/geocodingService.ts,
      // types/airQuality.ts.
      'src/**/*.ts',
      'src/**/*.tsx',
    ],
  },

  js.configs.recommended,

  // ── Application source ─────────────────────────────────────────────────────
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      // The browser set replaces a hand-written list of fourteen names. Anything not on
      // that list read as an undefined identifier, which is why `Notification`, `Blob`,
      // `File`, `FileReader`, `Image`, `Worker`, `AbortController`, `DOMException`,
      // `indexedDB` and `IDBKeyRange` were all reported as errors.
      globals: {
        ...globals.browser,
        ...globals.es2025,
        // Vite statically replaces `process.env.NODE_ENV`, and useSWR reads it behind a
        // `typeof process !== 'undefined'` guard to skip retry backoff under test.
        process: 'readonly',
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // Parsing JSX is not the same as knowing that `<Dashboard />` references
      // `Dashboard`. Without this rule, core `no-unused-vars` flagged every component,
      // icon and chart import in the project — about 190 of the 333 errors.
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',

      // Three files carry `eslint-disable-next-line react-hooks/exhaustive-deps`
      // comments for a rule that was never installed, so the comments were themselves
      // errors and the rules of hooks went unchecked across 60+ components.
      //
      // Only the two classic rules are enabled. eslint-plugin-react-hooks 7 ships the
      // React Compiler rule set in its `recommended` config, which is a much larger
      // change than fixing the lint setup and should be its own decision.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      ...jsxA11y.configs.recommended.rules,

      // A horizontal scroll container has to be reachable by keyboard, or its overflow
      // is unreadable without a mouse or a trackpad gesture. The WAI-ARIA authoring
      // practice for that is exactly `role="region"` with an accessible name and
      // `tabindex="0"` — the rule's own `roles` option exists for this case and already
      // ships `tabpanel` in it for the same reason. Adding `region` rather than
      // scattering eslint-disable comments, because the next scrollable panel will hit
      // this too.
      'jsx-a11y/no-noninteractive-tabindex': [
        'error',
        { tags: [], roles: ['tabpanel', 'region'], allowExpressionValues: true },
      ],

      // `catch (_e)` is the established convention in this codebase for an error that is
      // deliberately swallowed. ESLint 9 defaults `caughtErrors` to 'all', which turned
      // every one of them into an error.
      'no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // ── Web workers ────────────────────────────────────────────────────────────
  // `self` is not defined in the browser set, so both workers were nothing but
  // no-undef errors.
  {
    files: ['src/workers/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.worker,
      },
    },
  },

  // ── Tests, setup and request mocks ─────────────────────────────────────────
  // `globals: true` is set in vite.config.js, so the suite calls describe/it/expect/vi
  // without importing them. The previous config listed `process` and a few DOM
  // constructors here but not the test framework's own globals, leaving 60 errors.
  {
    files: [
      'src/**/*.{test,spec}.{js,jsx}',
      'src/setupTests.js',
      'src/mocks/**/*.js',
    ],
    languageOptions: {
      globals: {
        ...globals.vitest,
        ...globals.node,
      },
    },
    rules: {
      // A component imported purely to be rendered inside `vi.mock` factory JSX reads as
      // unused to the core rule, and test files legitimately declare fixtures they only
      // pass around.
      'no-unused-vars': [
        'error',
        {
          args: 'none',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];
