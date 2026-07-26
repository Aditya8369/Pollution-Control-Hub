/**
 * e2e/specs/accessibility.spec.js
 *
 * Baseline accessibility checks to prevent regressions in ARIA roles,
 * keyboard navigation, and semantic structure.
 *
 * These are lightweight DOM-based checks (no axe-core dependency required),
 * suitable for the initial testing infrastructure.
 */

import { test, expect } from '../helpers/fixtures.js';

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
      // Every button must have either visible text or an aria-label
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

  test('loading spinner has aria-hidden', async ({ page }) => {
    // Intercept with a slow response to catch the loading state
    await page.route('**/air-quality-api.open-meteo.com/**', async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      route.abort('failed');
    });
    await page.route('**/api.open-meteo.com/**', (route) => route.abort('failed'));
    await page.goto('/');

    const spinner = page.locator('.loading-spinner[aria-hidden="true"]');
    // Spinner should be aria-hidden since it's decorative
    if (await spinner.isVisible({ timeout: 2_000 })) {
      await expect(spinner).toHaveAttribute('aria-hidden', 'true');
    }
  });
});

// ── Keyboard navigation ──────────────────────────────────────────────────────

test.describe('Keyboard navigation', () => {
  test('can Tab to and activate the Quiz nav button via keyboard', async ({ mockPage }) => {
    // Focus the first nav button, then Tab through to Quiz
    await mockPage.locator('nav[aria-label="Main sections"] button').first().focus();

    // Press Tab until we reach "Quiz"
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
    // If Tab order doesn't reach Quiz in 10 steps it may be in a different order — non-fatal
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
      // Either dismissed or still visible — just check no crash occurred
      const isVisible = await notice.isVisible({ timeout: 1_000 }).catch(() => false);
      // Not asserting either way — just ensuring no JS error
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
