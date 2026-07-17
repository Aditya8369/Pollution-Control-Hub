/**
 * e2e/helpers/fixtures.js
 *
 * Extends Playwright's `test` with two custom fixtures:
 *
 *   mockPage  — a Page with all external API calls intercepted by deterministic
 *               mocks.  Use this for the vast majority of tests.
 *
 *   livePage  — a plain Page with no interception for the rare smoke-test that
 *               intentionally hits real endpoints.
 */

import { test as base, expect } from '@playwright/test';
import {
  MOCK_AQI_RESPONSE_DELHI,
  MOCK_WIND_RESPONSE,
  MOCK_GEOCODING_RESPONSE_MUMBAI,
  MOCK_GEOCODING_RESPONSE_EMPTY,
  API_PATTERNS,
} from '../fixtures/api-mocks.js';

// ── Intercept helpers ─────────────────────────────────────────────────────────

/**
 * Register all API route intercepts on a Playwright Page.
 * Call this inside a fixture or beforeEach hook.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} [overrides]  — partial overrides for specific mock payloads
 */
export async function interceptApis(page, overrides = {}) {
  const aqiPayload    = overrides.aqi      ?? MOCK_AQI_RESPONSE_DELHI;
  const windPayload   = overrides.wind     ?? MOCK_WIND_RESPONSE;
  const geoPayload    = overrides.geocoding ?? null; // null = let it pass through

  // Air-quality API (primary data source)
  await page.route(API_PATTERNS.airQuality, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(aqiPayload),
    });
  });

  // Main forecast API (wind data fetched via Open-Meteo forecast endpoint)
  await page.route(API_PATTERNS.forecast, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(windPayload),
    });
  });

  // Geocoding API
  if (geoPayload !== null) {
    await page.route(API_PATTERNS.geocoding, (route) => {
      const url = route.request().url();
      // Return empty results for searches that don't match "mumbai"
      const payload = url.toLowerCase().includes('mumbai')
        ? MOCK_GEOCODING_RESPONSE_MUMBAI
        : MOCK_GEOCODING_RESPONSE_EMPTY;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });
  }
}

/**
 * Intercept API calls to simulate a network error (offline / server down).
 * @param {import('@playwright/test').Page} page
 */
export async function interceptApisWithError(page) {
  await page.route(API_PATTERNS.airQuality, (route) => route.abort('failed'));
  await page.route(API_PATTERNS.forecast,   (route) => route.abort('failed'));
}

// ── Custom fixture definitions ────────────────────────────────────────────────

export const test = base.extend({
  /**
   * mockPage — Page with deterministic API intercepts already registered.
   * Navigates to '/' and waits for the Dashboard to be visible.
   */
  mockPage: async ({ page }, use) => {
    await interceptApis(page);
    await page.goto('/');
    // Wait for loading spinner to disappear first
    await page.waitForSelector('.loading-spinner', { state: 'detached', timeout: 15_000 });
    // Then wait for dashboard to appear
    await page.waitForSelector('[data-testid="dashboard"]', { state: 'visible', timeout: 10_000 });
    await use(page);
  },
  /**
   * errorPage — Page where API calls fail, exercising error-state rendering.
   */
  errorPage: async ({ page }, use) => {
    await interceptApisWithError(page);
    await page.goto('/');
    await use(page);
  },
});

export { expect };
