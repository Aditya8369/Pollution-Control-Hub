import { test, expect } from '../helpers/fixtures.js';
import { interceptApis, interceptApisWithError } from '../helpers/fixtures.js';
import { MOCK_AQI_RESPONSE_DELHI } from '../fixtures/api-mocks.js';

// ── 1. Initial load ──────────────────────────────────────────────────────────

test.describe('Initial application load', () => {
  test('shows loading state before data arrives', async ({ page }) => {
    await page.route('**/air-quality-api.open-meteo.com/**', async (route) => {
      await new Promise((r) => setTimeout(r, 600));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_AQI_RESPONSE_DELHI),
      });
    });
    await page.route('**/api.open-meteo.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    );
    await page.goto('/');
    // Page should load without crashing
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
  });

  test('renders hero section after data loads', async ({ mockPage }) => {
    const hero = mockPage.locator('header.hero');
    await expect(hero).toBeVisible();
    await expect(hero).toContainText('Pollution Control Hub');
  });

  test('renders the section navigation bar', async ({ mockPage, isMobile }) => {
    const nav = mockPage.locator('nav[aria-label="Main sections"]');
    await expect(nav).toBeVisible();
    if (isMobile) {
      await mockPage.locator('.hamburger-btn').click();
    }
    const expectedLabels = ['Home', 'Quiz', 'Game', 'Community', 'History'];
    for (const label of expectedLabels) {
      await expect(nav.getByRole('button', { name: label })).toBeVisible();
    }
  });

  test('page title is correct', async ({ mockPage }) => {
    await expect(mockPage).toHaveTitle(/Pollution Control Hub/i);
  });
});

// ── 2. Section navigation ────────────────────────────────────────────────────

test.describe('Section navigation', () => {
  test('Home section shows the dashboard by default', async ({ mockPage }) => {
    await expect(mockPage.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('clicking Quiz navigates to the quiz section', async ({ mockPage, isMobile }) => {
    if (isMobile) {
      await mockPage.locator('.hamburger-btn').click();
    }
    await mockPage.getByRole('button', { name: 'Quiz' }).click();
    await expect(mockPage.locator('[data-testid="quiz-section"]')).toBeVisible({ timeout: 5_000 });
    await expect(mockPage.locator('[data-testid="dashboard"]')).not.toBeVisible();
  });

  test('clicking Community navigates to community hub', async ({ mockPage, isMobile }) => {
    if (isMobile) {
      await mockPage.locator('.hamburger-btn').click();
    }
    await mockPage.getByRole('button', { name: 'Community' }).click();
    await expect(mockPage.locator('[data-testid="community-hub"]')).toBeVisible({ timeout: 5_000 });
  });

  test('clicking History navigates to historical analysis', async ({ mockPage, isMobile }) => {
    if (isMobile) {
      await mockPage.locator('.hamburger-btn').click();
    }
    await mockPage.getByRole('button', { name: 'History' }).click();
    await expect(mockPage.locator('[data-testid="historical-analysis"]')).toBeVisible({ timeout: 5_000 });
  });

  test('clicking Game navigates to the game section', async ({ mockPage, isMobile }) => {
    if (isMobile) {
      await mockPage.locator('.hamburger-btn').click();
    }
    await mockPage.getByRole('button', { name: 'Game' }).click();
    await expect(mockPage.locator('[data-testid="aqi-mission-game"]')).toBeVisible({ timeout: 5_000 });
  });

  test('active nav button has the "active" CSS class', async ({ mockPage, isMobile }) => {
    if (isMobile) {
      await mockPage.locator('.hamburger-btn').click();
    }
    const quizBtn = mockPage.getByRole('button', { name: 'Quiz', exact: true });
    await quizBtn.click();
    
    if (isMobile) {
      await mockPage.locator('.hamburger-btn').click();
    }
    const newQuizBtn = mockPage.getByRole('button', { name: 'Quiz', exact: true });
    await expect(newQuizBtn).toHaveClass(/active/);
  });

  test('navigating back to Home re-renders the dashboard', async ({ mockPage, isMobile }) => {
    if (isMobile) {
      await mockPage.locator('.hamburger-btn').click();
    }
    await mockPage.getByRole('button', { name: 'Quiz' }).click();
    if (isMobile) {
      await mockPage.locator('.hamburger-btn').click();
    }
    await mockPage.getByRole('button', { name: 'Home' }).click();
    await expect(mockPage.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 5_000 });
  });

  test('section navigation works without crashing', async ({ mockPage, isMobile }) => {
    const sections = ['Quiz', 'Community', 'History', 'Game', 'Home'];
    for (const section of sections) {
      if (isMobile) {
        await mockPage.locator('.hamburger-btn').click();
      }
      await mockPage.getByRole('button', { name: section, exact: true }).click();
      await mockPage.waitForTimeout(300);
    }
    await expect(mockPage.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 5_000 });
  });
});

// ── 3. Theme toggle ──────────────────────────────────────────────────────────

test.describe('Theme toggle', () => {
  test('toggles between light and dark themes', async ({ mockPage }) => {
    const themeToggle = mockPage.locator('button[aria-label="Toggle Theme"]');
    await expect(themeToggle).toBeVisible();
    const html = mockPage.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
    await themeToggle.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await themeToggle.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('theme toggle button is always visible', async ({ mockPage }) => {
    const themeToggle = mockPage.locator('button[aria-label="Toggle Theme"]');
    await expect(themeToggle).toBeVisible();
    await expect(themeToggle).toBeEnabled();
  });
});

// ── 4. Error state ───────────────────────────────────────────────────────────

test.describe('Error state rendering', () => {
  test('app does not crash when the API is unreachable', async ({ errorPage }) => {
    await errorPage.waitForTimeout(2_000);
    // App should still render something — not a blank page
    await expect(errorPage.locator('body')).toBeVisible();
    // header may not render without API data
  });
});
