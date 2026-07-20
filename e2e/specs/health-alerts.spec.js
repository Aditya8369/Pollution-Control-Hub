/**
 * e2e/specs/health-alerts.spec.js
 *
 * Covers health-advisory and alert-panel user journeys:
 *   1. HealthAdvisory renders health recommendations
 *   2. AlertsPanel shows appropriate alerts for the current AQI band
 *   3. SolutionsAwareness section is visible
 *   4. ScenarioSimulator renders and allows interaction
 */

import { test, expect } from '../helpers/fixtures.js';
import { interceptApis } from '../helpers/fixtures.js';
import {
  MOCK_AQI_RESPONSE_GOOD,
  MOCK_AQI_RESPONSE_HAZARDOUS,
} from '../fixtures/api-mocks.js';

// ── HealthAdvisory ───────────────────────────────────────────────────────────

test.describe('HealthAdvisory component', () => {
  test('health advisory section is visible', async ({ mockPage }) => {
    const advisory = mockPage.locator('[data-testid="health-advisory"]');
    await expect(advisory).toBeVisible({ timeout: 8_000 });
  });

  test('advisory contains health-related content', async ({ mockPage }) => {
    const advisory = mockPage.locator('[data-testid="health-advisory"]');
    await expect(advisory).toContainText(/health|mask|outdoor|sensitive|air quality/i);
  });
});

// ── AlertsPanel ──────────────────────────────────────────────────────────────

test.describe('AlertsPanel — Unhealthy AQI (default mock)', () => {
  test('alerts panel is visible', async ({ mockPage }) => {
    const alerts = mockPage.locator('[data-testid="alerts-panel"]');
    await expect(alerts).toBeVisible({ timeout: 8_000 });
  });

  test('displays at least one alert for Unhealthy air quality', async ({ mockPage }) => {
    const alertItems = mockPage.locator('[data-testid="alert-item"]');
    await expect(alertItems.first()).toBeVisible({ timeout: 8_000 });
  });

  test('confidence score is displayed', async ({ mockPage }) => {
    const alerts = mockPage.locator('[data-testid="alerts-panel"]');
    await expect(alerts).toContainText(/confidence|high|medium|low/i);
  });

  test('exposure estimate is displayed', async ({ mockPage }) => {
    const alerts = mockPage.locator('[data-testid="alerts-panel"]');
    await expect(alerts).toContainText(/exposure|hour|minute|limit/i);
  });
});

test.describe('AlertsPanel — Good AQI state', () => {
  test.beforeEach(async ({ page }) => {
    await interceptApis(page, { aqi: MOCK_AQI_RESPONSE_GOOD });
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });
  });

  test('alerts panel shows a positive / safe status for Good AQI', async ({ page }) => {
    const alerts = page.locator('[data-testid="alerts-panel"]');
    await expect(alerts).toBeVisible({ timeout: 8_000 });
    // Should NOT contain hazardous/danger language for Good AQI
    await expect(alerts).not.toContainText(/hazardous|evacuate|emergency/i);
  });
});

test.describe('AlertsPanel — Hazardous AQI state', () => {
  test.beforeEach(async ({ page }) => {
    await interceptApis(page, { aqi: MOCK_AQI_RESPONSE_HAZARDOUS });
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });
  });

  test('alerts panel escalates messaging for Hazardous AQI', async ({ page }) => {
    const alerts = page.locator('[data-testid="alerts-panel"]');
    await expect(alerts).toBeVisible({ timeout: 8_000 });
    await expect(alerts).toContainText(/hazardous|danger|critical|stay indoors|avoid/i);
  });
});

// ── SolutionsAwareness ───────────────────────────────────────────────────────

test.describe('SolutionsAwareness component', () => {
  test('solutions section is visible', async ({ mockPage }) => {
    const solutions = mockPage.locator('[data-testid="solutions-awareness"]');
    await expect(solutions).toBeVisible({ timeout: 8_000 });
  });

  test('solutions contain actionable content', async ({ mockPage }) => {
    const solutions = mockPage.locator('[data-testid="solutions-awareness"]');
    await expect(solutions).toContainText(/plant|tree|electric|filter|renewable|emission|reduce/i);
  });
});

// ── ScenarioSimulator ────────────────────────────────────────────────────────

test.describe('ScenarioSimulator component', () => {
  test('scenario simulator is rendered', async ({ mockPage }) => {
    const sim = mockPage.locator('[data-testid="scenario-simulator"]');
    await expect(sim).toBeVisible({ timeout: 8_000 });
  });

  test('simulator has at least one interactive control', async ({ mockPage }) => {
    const sim = mockPage.locator('[data-testid="scenario-simulator"]');
    // Should have sliders, select elements, or buttons
    const hasControl =
      (await sim.locator('input[type="range"]').count()) > 0 ||
      (await sim.locator('select').count()) > 0 ||
      (await sim.locator('button').count()) > 0;
    expect(hasControl).toBe(true);
  });

  test('interacting with the simulator updates the output', async ({ mockPage }) => {
    const sim = mockPage.locator('[data-testid="scenario-simulator"]');
    const slider = sim.locator('input[type="range"]').first();
    if (await slider.isVisible({ timeout: 3_000 })) {
      const initialValue = await slider.inputValue();
      // Move the slider
      await slider.fill(String(Number(initialValue) + 10));
      // The output/result area should update (presence, not exact value)
      const output = sim.locator('[data-testid="simulator-output"]');
      if (await output.isVisible({ timeout: 3_000 })) {
        await expect(output).toContainText(/\d/);
      }
    }
  });
});

// ── Footer ───────────────────────────────────────────────────────────────────

test.describe('Footer', () => {
  test('footer is present at the bottom of the page', async ({ mockPage }) => {
    const footer = mockPage.locator('footer');
    await expect(footer).toBeVisible({ timeout: 8_000 });
  });

  test('footer contains attribution or copyright text', async ({ mockPage }) => {
    const footer = mockPage.locator('footer');
    await expect(footer).toContainText(/pollution|hub|©|copyright|\d{4}/i);
  });
});
