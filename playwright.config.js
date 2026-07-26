// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration
 * Cross-browser matrix: Chromium, Firefox, WebKit
 * Runs against the local Vite dev server (started automatically).
 */
export default defineConfig({
  // Root directory for all test specs
  testDir: './e2e/specs',

  // Maximum time one test can run before it is considered failed
  timeout: 30_000,

  // Expect timeout for individual assertions
  expect: {
    timeout: 8_000,
  },

  // Fail the build on CI if you accidentally left test.only in the source
  forbidOnly: !!process.env.CI,

  // Retry failed tests once on CI (network flakes happen)
  retries: process.env.CI ? 1 : 0,

  // Parallelism: use all CPUs locally, 1 worker per shard on CI
  workers: process.env.CI ? 2 : undefined,

  // Reporter: GitHub Actions-aware on CI, human-readable locally
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report', open: 'on-failure' }]],

  // Shared settings for all projects (browsers)
  use: {
    // Base URL for page.goto('/') calls
    baseURL: 'http://localhost:5173',

    // Capture trace on first retry — invaluable for debugging CI failures
    trace: 'on-first-retry',

    // Screenshot only on failure
    screenshot: 'only-on-failure',

    // Realistic viewport
    viewport: { width: 1280, height: 720 },
  },

  // ── Browser matrix ──────────────────────────────────────────────────────────
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile smoke tests (Chromium engine) to catch responsive-layout regressions
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // ── Local dev server ────────────────────────────────────────────────────────
  // Playwright will start `vite` automatically before running tests and shut it
  // down afterwards.  On CI the server is started the same way.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // Suppress Vite's noisy output in CI logs
    stdout: process.env.CI ? 'ignore' : 'pipe',
    stderr: 'pipe',
  },
});
