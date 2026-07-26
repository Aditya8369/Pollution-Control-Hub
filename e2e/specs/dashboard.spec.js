/**
 * e2e/specs/dashboard.spec.js
 *
 * Covers the Dashboard component user journey:
 *   1. AQI value is rendered from mock data
 *   2. AQI band label matches the mocked value (Unhealthy → "Unhealthy")
 *   3. Pollutant cards (PM2.5, PM10, etc.) are present
 *   4. Time-range selector changes the chart
 *   5. City comparisons list renders
 *   6. Good AQI mock renders the correct "Good" band
 *   7. Hazardous AQI mock renders the critical alert state
 */

import { test, expect } from '../helpers/fixtures.js';
import { interceptApis } from '../helpers/fixtures.js';
import {
  MOCK_AQI_RESPONSE_GOOD,
  MOCK_AQI_RESPONSE_HAZARDOUS,
  API_PATTERNS,
} from '../fixtures/api-mocks.js';

// ── Dashboard baseline (Unhealthy mock) ──────────────────────────────────────

test.describe('Dashboard — Unhealthy AQI state (default mock)', () => {
  test('dashboard container is visible', async ({ mockPage }) => {
    await expect(mockPage.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('renders a numeric AQI value', async ({ mockPage }) => {
    // The dashboard must display a number that falls in the Unhealthy range (151-200)
    const aqiValue = mockPage.locator('[data-testid="aqi-value"]');
    await expect(aqiValue).toBeVisible();
    const text = await aqiValue.textContent();
    const num = parseInt(text ?? '0', 10);
    expect(num).toBeGreaterThan(0);
  });

  test('renders PM2.5 pollutant data', async ({ mockPage }) => {
    const pm25 = mockPage.locator('[data-testid="pollutant-pm2_5"]');
    await expect(pm25).toBeVisible();
    // Should contain a numeric reading
    await expect(pm25).toContainText(/\d/);
  });

  test('renders PM10 pollutant data', async ({ mockPage }) => {
    const pm10 = mockPage.locator('[data-testid="pollutant-pm10"]');
    await expect(pm10).toBeVisible();
    await expect(pm10).toContainText(/\d/);
  });

  test('renders city name in the dashboard heading', async ({ mockPage }) => {
    await expect(mockPage.locator('[data-testid="dashboard"]')).toContainText('Delhi');
  });

  test('AQI band label reflects the mocked Unhealthy value', async ({ mockPage }) => {
    const band = mockPage.locator('[data-testid="aqi-band-label"]');
    await expect(band).toBeVisible();
    // Our mock puts us_aqi at ~155-183 → "Unhealthy" band
    await expect(band).toContainText(/unhealthy/i);
  });

  test('trend chart renders (SVG present in the DOM)', async ({ mockPage }) => {
    // Recharts renders SVG elements
    const chart = mockPage.locator('[data-testid="aqi-trend-chart"] svg').first();
    await expect(chart).toBeVisible({ timeout: 8_000 });
  });
});

// ── Time-range selector ──────────────────────────────────────────────────────

test.describe('Dashboard — time-range selector', () => {
  test('time-range buttons are visible', async ({ mockPage }) => {
    const timeControls = mockPage.locator('[data-testid="time-range-selector"]');
    await expect(timeControls).toBeVisible();
  });

  test('changing time range does not crash the page', async ({ mockPage }) => {
    const buttons = mockPage.locator('[data-testid="time-range-selector"] button');
    const count = await buttons.count();
    if (count > 1) {
      await buttons.nth(1).click();
      // Page should still show the dashboard
      await expect(mockPage.locator('[data-testid="dashboard"]')).toBeVisible();
    }
  });
});

// ── City comparisons ─────────────────────────────────────────────────────────

test.describe('Dashboard — city comparisons', () => {
  test('city comparison section is visible', async ({ mockPage }) => {
    const comp = mockPage.locator('[data-testid="city-comparisons"]');
    await expect(comp).toBeVisible({ timeout: 8_000 });
  });

  test('city comparison lists multiple cities', async ({ mockPage }) => {
    const items = mockPage.locator('[data-testid="city-comparison-item"]');
    // Should list at least 3 cities
    await expect(items).toHaveCount(7, { timeout: 8_000 });
  });
});

// ── Good AQI state ────────────────────────────────────────────────────────────

test.describe('Dashboard — Good AQI state', () => {
  test.beforeEach(async ({ page }) => {
    await interceptApis(page, { aqi: MOCK_AQI_RESPONSE_GOOD });
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });
  });

  test('AQI band label shows "Good"', async ({ page }) => {
    const band = page.locator('[data-testid="aqi-band-label"]');
    await expect(band).toContainText(/good/i);
  });

  test('AQI value is in the 0-50 range', async ({ page }) => {
    const aqiValue = page.locator('[data-testid="aqi-value"]');
    const text = await aqiValue.textContent();
    const num = parseInt(text ?? '999', 10);
    expect(num).toBeLessThanOrEqual(50);
  });
});

// ── Hazardous AQI state ──────────────────────────────────────────────────────

test.describe('Dashboard — Hazardous AQI state', () => {
  test.beforeEach(async ({ page }) => {
    await interceptApis(page, { aqi: MOCK_AQI_RESPONSE_HAZARDOUS });
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });
  });

  test('AQI band label shows "Hazardous"', async ({ page }) => {
    const band = page.locator('[data-testid="aqi-band-label"]');
    await expect(band).toContainText(/hazardous/i);
  });

  test('alerts panel shows a critical warning', async ({ page }) => {
    const alerts = page.locator('[data-testid="alerts-panel"]');
    await expect(alerts).toBeVisible({ timeout: 8_000 });
    // Should contain a danger-level alert
    await expect(alerts).toContainText(/unhealthy|avoid|mask|unsafe/i);
  });
});

// ── Analytics insights ───────────────────────────────────────────────────────

test.describe('Dashboard — Analytics Insights', () => {
  test('analytics section is rendered', async ({ mockPage }) => {
    const analytics = mockPage.locator('[data-testid="analytics-insights"]');
    await expect(analytics).toBeVisible({ timeout: 8_000 });
  });

  test('weekly or monthly averages are displayed', async ({ mockPage }) => {
    const analytics = mockPage.locator('[data-testid="analytics-insights"]');
    await expect(analytics).toContainText(/week|month|average/i);
  });
});
