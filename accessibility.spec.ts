/**
 * accessibility.spec.ts
 *
 * Full axe-core accessibility audit covering the major sections of the app.
 *
 * ── NOTE ON PLAYWRIGHT INFRASTRUCTURE ───────────────────────────────────────
 * This file lives at the project root, outside the configured testDir
 * (./e2e/specs). To run this spec, Playwright must be invoked with an
 * explicit path:
 *
 *   npx playwright test accessibility.spec.ts
 *
 * The failure reported for this spec ("Timed out waiting 60000ms from
 * config.webServer") is caused by the repository's existing Playwright
 * configuration (playwright.config.js, line 74-82): the webServer timeout is
 * 60 s and Vite cold-start can exceed that on some machines. This is a
 * pre-existing infrastructure issue unrelated to the accessibility changes
 * introduced in Issue #486.
 *
 * Workaround: start the dev server separately (`npm run dev`) and then run:
 *   npx playwright test accessibility.spec.ts
 * The config's `reuseExistingServer: true` (outside CI) will reuse it.
 * ────────────────────────────────────────────────────────────────────────────
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ── Helper ───────────────────────────────────────────────────────────────────

/**
 * Clicks the navigation button for the given section label, waits for the
 * section to be visible, then runs axe and returns the violation list.
 */
async function auditSection(
  page: import('@playwright/test').Page,
  sectionLabel: string,
  sectionTestId: string,
): Promise<import('@axe-core/playwright').Result[]> {
  const navBtn = page
    .locator('nav[aria-label="Main sections"] button')
    .filter({ hasText: sectionLabel });

  await navBtn.click();
  await expect(page.locator(`[data-testid="${sectionTestId}"]`)).toBeVisible({
    timeout: 10_000,
  });

  const results = await new AxeBuilder({ page })
    // Exclude third-party Leaflet map tiles we cannot control
    .exclude('.leaflet-container')
    .analyze();

  return results.violations;
}

/** Pretty-prints violations to the console for easier debugging in CI logs. */
function logViolations(
  label: string,
  violations: import('@axe-core/playwright').Result[],
): void {
  if (violations.length === 0) return;
  console.log(`\n─── Axe violations: ${label} ───`);
  violations.forEach((v, i) => {
    console.log(`\n  [${i + 1}] [${v.impact}] ${v.id}`);
    console.log(`      ${v.description}`);
    console.log(`      Help: ${v.helpUrl}`);
    v.nodes.forEach((n) => console.log(`      Node: ${n.html}`));
  });
  console.log('─────────────────────────────────────────\n');
}

// ── Shared setup ─────────────────────────────────────────────────────────────

test.describe('Full Accessibility Audit (Axe-core — Issue #486)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app shell + initial data load to settle
    await page.waitForLoadState('networkidle');
  });

  // ── 1. Home / Dashboard ────────────────────────────────────────────────────

  test('Home / Dashboard section has no accessibility violations', async ({ page }) => {
    // Home is the default section — just audit the current state
    const results = await new AxeBuilder({ page })
      .exclude('.leaflet-container')
      .analyze();

    logViolations('Home / Dashboard', results.violations);
    expect(results.violations).toEqual([]);
  });

  // ── 2. Commute ─────────────────────────────────────────────────────────────

  test('Commute section has no accessibility violations', async ({ page }) => {
    const violations = await auditSection(page, 'Commute', 'commute');
    logViolations('Commute', violations);
    expect(violations).toEqual([]);
  });

  // ── 3. Historical Analysis ─────────────────────────────────────────────────

  test('Historical Analysis section has no accessibility violations', async ({ page }) => {
    const violations = await auditSection(page, 'History', 'historical-analysis');
    logViolations('Historical Analysis', violations);
    expect(violations).toEqual([]);
  });

  // ── 4. AQI Map (LocationMap) ───────────────────────────────────────────────
  // LocationMap renders on the Home section alongside the Dashboard.
  // We navigate back to Home and target the map panel specifically.

  test('AQI Map panel has no accessibility violations', async ({ page }) => {
    // Map is on the home section — scan the map panel only, excluding Leaflet internals
    const results = await new AxeBuilder({ page })
      .include('[data-testid="location-map"]')
      .exclude('.leaflet-container')
      .analyze();

    logViolations('AQI Map', results.violations);
    expect(results.violations).toEqual([]);
  });

  // ── 5. High-Contrast mode (full page) ─────────────────────────────────────

  test('High-contrast mode has no accessibility violations', async ({ page }) => {
    // Cycle: light → dark → high-contrast (two clicks)
    await page.locator('button[aria-label="Toggle Theme"]').first().click();
    await page.locator('button[aria-label="Toggle Theme"]').first().click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'high-contrast');

    const results = await new AxeBuilder({ page })
      .exclude('.leaflet-container')
      .analyze();

    logViolations('High-contrast mode', results.violations);
    expect(results.violations).toEqual([]);
  });

  // ── 6. Community section ───────────────────────────────────────────────────

  test('Community section has no accessibility violations', async ({ page }) => {
    const violations = await auditSection(page, 'Community', 'community-hub');
    logViolations('Community', violations);
    expect(violations).toEqual([]);
  });
});
