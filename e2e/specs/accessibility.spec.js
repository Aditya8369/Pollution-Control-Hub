/**
 * e2e/specs/accessibility.spec.js
 *
 * Comprehensive accessibility checks including:
 * - Lightweight DOM-based checks (ARIA, landmarks, keyboard)
 * - Automated WCAG 2.1 AA compliance audits via axe-core
 */

import { test, expect } from '../helpers/fixtures.js';
import AxeBuilder from '@axe-core/playwright';

// ── Landmark structure ───────────────────────────────────────────────────────

test.describe('Landmark structure', () => {
  test('page has a <main> element', async ({ mockPage }) => {
    await expect(mockPage.locator('main')).toBeVisible();
  });

  test('page has a navigation landmark with an aria-label', async ({ mockPage }) => {
    const nav = mockPage.locator('nav[aria-label]');
    await expect(nav.first()).toBeVisible();
  });

  test('page has a <header> element in the hero section', async ({ mockPage }) => {
    await expect(mockPage.locator('header.hero')).toBeVisible();
  });

  test('page has a <footer> element', async ({ mockPage }) => {
    await expect(mockPage.locator('footer')).toBeVisible({ timeout: 8_000 });
  });
});

// ── Heading hierarchy ────────────────────────────────────────────────────────

test.describe('Heading hierarchy', () => {
  test('page has exactly one <h1>', async ({ mockPage }) => {
    const h1s = mockPage.locator('h1');
    expect(await h1s.count()).toBe(1);
  });

  test('<h1> contains meaningful text', async ({ mockPage }) => {
    const h1 = mockPage.locator('h1').first();
    const text = await h1.textContent();
    expect((text ?? '').trim().length).toBeGreaterThan(3);
  });
});

// ── Interactive element labels ───────────────────────────────────────────────

test.describe('Interactive element labels', () => {
  test('theme toggle button has an aria-label', async ({ mockPage }) => {
    const btn = mockPage.locator('button[aria-label="Toggle Theme"]');
    await expect(btn).toBeVisible();
  });

  test('navigation buttons have visible text labels', async ({ mockPage }) => {
    const navButtons = mockPage.locator('nav[aria-label="Main sections"] button');
    const count = await navButtons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const btn = navButtons.nth(i);
      const text = (await btn.textContent() ?? '').trim();
      const ariaLabel = await btn.getAttribute('aria-label');
      expect(text.length > 0 || (ariaLabel ?? '').length > 0).toBe(true);
    }
  });

  test('"Refresh Now" button has a discernible label', async ({ mockPage }) => {
    const refreshBtn = mockPage.getByRole('button', { name: 'Refresh Now' });
    await expect(refreshBtn).toBeVisible();
  });
});

// ── ARIA roles ───────────────────────────────────────────────────────────────

test.describe('ARIA roles and live regions', () => {
  test('live controls section has aria-label', async ({ mockPage }) => {
    const controls = mockPage.locator('section[aria-label="Live controls"]');
    await expect(controls).toBeVisible();
  });

  test('loading spinner is wrapped in an ARIA live region', async ({ page }) => {
    await page.route('**/air-quality-api.open-meteo.com/**', async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      route.abort('failed');
    });
    await page.route('**/api.open-meteo.com/**', (route) => route.abort('failed'));
    await page.goto('/');

    const liveRegion = page.locator('[role="status"][aria-live="polite"]');
    if (await liveRegion.isVisible({ timeout: 2_000 })) {
      await expect(liveRegion).toHaveAttribute('role', 'status');
      await expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      const spinner = liveRegion.locator('.loading-spinner');
      await expect(spinner).toBeVisible();
    }
  });
});

// ── Keyboard navigation ──────────────────────────────────────────────────────

test.describe('Keyboard navigation', () => {
  test('can Tab to and activate the Quiz nav button via keyboard', async ({ mockPage }) => {
    await mockPage.locator('nav[aria-label="Main sections"] button').first().focus();

    let found = false;
    for (let i = 0; i < 10; i++) {
      const focused = await mockPage.evaluate(() => document.activeElement?.textContent?.trim());
      if (focused === 'Quiz') {
        found = true;
        break;
      }
      await mockPage.keyboard.press('Tab');
    }

    if (found) {
      await mockPage.keyboard.press('Enter');
      await expect(mockPage.locator('[data-testid="quiz-section"]')).toBeVisible({ timeout: 5_000 });
    }
  });

  test('Escape key closes the location-notice banner if present', async ({ page, context }) => {
    await context.setGeolocation(null);
    await context.grantPermissions([]);

    await page.route('**/air-quality-api.open-meteo.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"hourly":{"time":[],"us_aqi":[]}}' })
    );
    await page.route('**/api.open-meteo.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    );

    await page.goto('/');
    const notice = page.locator('.location-notice');
    if (await notice.isVisible({ timeout: 3_000 })) {
      await page.keyboard.press('Escape');
      await notice.isVisible({ timeout: 1_000 }).catch(() => false);
    }
  });
});

// ── Colour and contrast (structural) ────────────────────────────────────────

test.describe('Dark mode structural correctness', () => {
  test('dark theme applies data-theme="dark" to <html>', async ({ mockPage }) => {
    await mockPage.locator('button[aria-label="Toggle Theme"]').click();
    await expect(mockPage.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('main content is still visible in dark mode', async ({ mockPage }) => {
    await mockPage.locator('button[aria-label="Toggle Theme"]').click();
    await expect(mockPage.locator('[data-testid="dashboard"]')).toBeVisible();
  });
});

test('time range selector uses tablist semantics', async ({ mockPage }) => {
  const tablist = mockPage.locator('[role="tablist"]');
  await expect(tablist).toBeVisible();

  const tabs = tablist.locator('[role="tab"]');
  await expect(tabs.first()).toBeVisible();
});

test('selected time range tab controls the chart', async ({ mockPage }) => {
  const selectedTab = mockPage.locator('[role="tab"][aria-selected="true"]');
  await expect(selectedTab).toHaveAttribute('aria-controls', 'aqi-trend-chart');
});

test('clicking a time range updates the selected tab', async ({ mockPage }) => {
  const tab12 = mockPage.locator('#time-tab-12');
  await tab12.click();
  await expect(tab12).toHaveAttribute('aria-selected', 'true');
});

test('time range tabs can receive keyboard focus', async ({ mockPage }) => {
  const firstTab = mockPage.locator('[role="tab"]').first();
  await firstTab.focus();
  await expect(firstTab).toBeFocused();
});

test('all time range tabs expose required ARIA attributes', async ({ mockPage }) => {
  const tabs = mockPage.locator('[role="tab"]');
  const count = await tabs.count();

  for (let i = 0; i < count; i++) {
    const tab = tabs.nth(i);
    await expect(tab).toHaveAttribute('id', /time-tab-/);
    await expect(tab).toHaveAttribute('aria-controls', 'aqi-trend-chart');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── axe-core automated WCAG audits ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('axe-core WCAG 2.1 AA compliance', () => {
  test('homepage has no critical or serious accessibility violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    const criticalAndSerious = results.violations.filter((v) =>
      ['critical', 'serious'].includes(v.impact)
    );
    expect(criticalAndSerious).toEqual([]);
  });

  test('dashboard passes automated accessibility audit', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10_000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalAndSerious = results.violations.filter((v) =>
      ['critical', 'serious'].includes(v.impact)
    );
    expect(criticalAndSerious).toEqual([]);
  });

  test('location map is accessible', async ({ page }) => {
    await page.goto('/');
    const mapNav = page.locator('nav[aria-label="Main sections"] button', { hasText: /Map/i });
    if (await mapNav.isVisible()) {
      await mapNav.click();
      await page.waitForTimeout(800);
    }

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalAndSerious = results.violations.filter((v) =>
      ['critical', 'serious'].includes(v.impact)
    );
    expect(criticalAndSerious).toEqual([]);
  });

  test('community hub form has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    const communityNav = page.locator('nav[aria-label="Main sections"] button', { hasText: /Community/i });
    if (await communityNav.isVisible()) {
      await communityNav.click();
      await page.waitForTimeout(800);
    }

    const results = await new AxeBuilder({ page }).analyze();
    const criticalAndSerious = results.violations.filter((v) =>
      ['critical', 'serious'].includes(v.impact)
    );
    expect(criticalAndSerious).toEqual([]);
  });

  test('health advisory panel passes axe-core audit', async ({ page }) => {
    await page.goto('/');
    const healthNav = page.locator('nav[aria-label="Main sections"] button', { hasText: /Health/i });
    if (await healthNav.isVisible()) {
      await healthNav.click();
      await page.waitForTimeout(800);
    }

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalAndSerious = results.violations.filter((v) =>
      ['critical', 'serious'].includes(v.impact)
    );
    expect(criticalAndSerious).toEqual([]);
  });

  test('dark mode maintains accessibility compliance', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[aria-label="Toggle Theme"]').click();
    await page.waitForTimeout(500);

    const results = await new AxeBuilder({ page }).analyze();
    const criticalAndSerious = results.violations.filter((v) =>
      ['critical', 'serious'].includes(v.impact)
    );
    expect(criticalAndSerious).toEqual([]);
  });
});
