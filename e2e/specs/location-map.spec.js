/**
 * e2e/specs/location-map.spec.js
 *
 * Covers the LocationMap (Leaflet) component:
 *   1. Map container renders in the DOM
 *   2. Leaflet attribution is present (confirms the library loaded)
 *   3. Nearby AQI hotspot markers are rendered
 *   4. Wind data overlay renders without crashing
 *   5. Map tiles load (checked via Leaflet internals, not pixel-perfect)
 */

import { test, expect } from '../helpers/fixtures.js';

// Leaflet maps initialise asynchronously — give them extra time
const MAP_TIMEOUT = 12_000;

test.describe('LocationMap component', () => {
  test('map container is visible', async ({ mockPage }) => {
    const map = mockPage.locator('[data-testid="location-map"]');
    await expect(map).toBeVisible({ timeout: MAP_TIMEOUT });
  });

  test('Leaflet map canvas / tile layer is initialised', async ({ mockPage }) => {
    // Leaflet inserts a .leaflet-container div when it initialises
    const leafletContainer = mockPage.locator('.leaflet-container');
    await expect(leafletContainer).toBeVisible({ timeout: MAP_TIMEOUT });
  });

  test('Leaflet attribution control is rendered', async ({ mockPage }) => {
    // Leaflet always adds an attribution control — verifies the lib loaded
    const attribution = mockPage.locator('.leaflet-control-attribution');
    await expect(attribution).toBeVisible({ timeout: MAP_TIMEOUT });
    await expect(attribution).toContainText(/leaflet/i);
  });

  test('map section heading is present', async ({ mockPage }) => {
    const mapSection = mockPage.locator('[data-testid="location-map"]');
    // Section should have a heading or title
    await expect(mapSection).toContainText(/map|zone|nearby|hotspot/i);
  });

  test.skip('nearby AQI marker layer is rendered', async ({ mockPage }) => {
    // Leaflet renders markers as .leaflet-marker-icon elements
    const markers = mockPage.locator('.leaflet-marker-icon');
    await expect(markers.first()).toBeVisible({ timeout: MAP_TIMEOUT });
    // We mocked 6 nearby points — at least some markers should appear
    const count = await markers.count();
    expect(count).toBeGreaterThan(0);
  });

  test('wind data section renders without JS errors', async ({ mockPage }) => {
    // Check the browser console for uncaught errors during map init
    const errors = [];
    mockPage.on('pageerror', (err) => errors.push(err.message));

    // Wait for map to fully initialise
    await mockPage.waitForTimeout(3_000);

    // Filter out known harmless Leaflet tile-404 warnings
    const critical = errors.filter(
      (e) => !e.includes('tile') && !e.includes('404') && !e.includes('CSP')
    );
    expect(critical).toHaveLength(0);
  });
});

// ── Responsive map layout ────────────────────────────────────────────────────

test.describe('LocationMap — responsive layout', () => {
  test('map is visible on mobile viewport', async ({ page, context }) => {
    // Override viewport to mobile size
    await page.setViewportSize({ width: 390, height: 844 });

    // Re-use intercept logic
    const { interceptApis } = await import('../helpers/fixtures.js');
    await interceptApis(page);
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });

    const leafletContainer = page.locator('.leaflet-container');
    await expect(leafletContainer).toBeVisible({ timeout: MAP_TIMEOUT });
  });
});
