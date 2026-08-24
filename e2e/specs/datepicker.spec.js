import { test, expect } from '../helpers/fixtures.js';
import { API_PATTERNS } from '../fixtures/api-mocks.js';

test.describe('DatePicker Localization', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept API calls to prevent real network requests
    await page.route(API_PATTERNS.airQuality, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          latitude: 28.6,
          longitude: 77.2,
          current: { us_aqi: 42 },
        }),
      })
    );
    await page.route(API_PATTERNS.forecast, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{}',
      })
    );
  });

  test('DatePicker switches calendar headers and text formats when switching locales', async ({ page, isMobile }) => {
    await page.goto('/');
    
    // Wait for the app to finish loading the dashboard
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });

    // 1. Navigate to Data Explorer
    if (isMobile) {
      await page.locator('.hamburger-btn').click();
    }
    await page.getByRole('button', { name: 'Data Explorer', exact: true }).click();

    // 2. Open the datepicker calendar in English
    const startDateInput = page.locator('#historical-start-date');
    await expect(startDateInput).toBeVisible();
    await startDateInput.click();

    // Verify calendar month is in English (contains Latin letters)
    const calendarHeader = page.locator('.react-datepicker__current-month');
    await expect(calendarHeader).toBeVisible();
    const englishMonthText = await calendarHeader.textContent();
    expect(englishMonthText).toMatch(/[A-Za-z]/);

    // Close calendar by clicking title
    await page.locator('.historical-data-explorer h2').click();
    await expect(calendarHeader).not.toBeVisible();

    // 3. Switch language to Hindi
    const langBtn = page.locator('button[aria-label="Language menu"]');
    await langBtn.click();
    const hindiOption = page.locator('role=menuitemradio').filter({ hasText: 'हिन्दी' });
    await hindiOption.click();

    // 4. In Hindi view, open the datepicker calendar
    // In Hindi, "Data Explorer" nav button changes label to "डेटा एक्सप्लोरर"
    if (isMobile) {
      await page.locator('.hamburger-btn').click();
    }
    await page.getByRole('button', { name: 'डेटा एक्सप्लोरर', exact: true }).click();
    await startDateInput.click();

    // Verify calendar header is in Hindi characters
    await expect(calendarHeader).toBeVisible();
    const hindiMonthText = await calendarHeader.textContent();
    expect(hindiMonthText).toMatch(/[\u0900-\u097F]/);

    // Close calendar
    await page.locator('.historical-data-explorer h2').click();
  });
});
