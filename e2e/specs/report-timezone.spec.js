/**
 * e2e/specs/report-timezone.spec.js
 *
 * Regression spec for #745 — reports always showed UTC, ignoring the user's timezone.
 *
 * Strategy
 * --------
 * We use Playwright's `page.emulateTimezone(tz)` to set the browser's
 * Intl timezone, then intercept the air-quality API with a mock whose
 * `utc_offset_seconds` matches that timezone. We assert that the
 * [data-testid="reading-time"] element shows a local-time label rather
 * than the raw UTC timestamp or the literal string "00:00".
 *
 * The mock anchor is fixed in the past so resolveCurrentIndex's fallback
 * always lands on the same last sample regardless of which real day this
 * test executes on. Expected display text is computed from that resolved
 * instant with Intl.DateTimeFormat rather than hardcoded.
 */

import { expect, test } from '@playwright/test';
import { API_PATTERNS } from '../fixtures/api-mocks.js';

// -- Helper -------------------------------------------------------------------

const ANCHOR_ISO = '2024-01-01T00:00:00Z';
const HOURS = 48;

/** Builds a 48-hour array of ISO-8601 hourly local timestamps for Open-Meteo. */
function buildHourlyTimes(anchorISO, hours = HOURS) {
  return Array.from({ length: hours }, (_, i) => {
    const d = new Date(anchorISO);
    d.setUTCHours(d.getUTCHours() + i);
    return d.toISOString().slice(0, 16);
  });
}

/**
 * Returns an AQI mock response anchored in the past, with a `utc_offset_seconds`
 * appropriate for the supplied IANA timezone.
 */
function buildMockForTZ(tzName, utcOffsetSeconds) {
  const times = buildHourlyTimes(ANCHOR_ISO, HOURS);
  return {
    latitude: 28.6139,
    longitude: 77.209,
    generationtime_ms: 0.42,
    utc_offset_seconds: utcOffsetSeconds,
    timezone: tzName,
    timezone_abbreviation: 'LOCAL',
    hourly_units: {
      time: 'iso8601', us_aqi: 'us_aqi', pm2_5: 'mu_g/m3', pm10: 'mu_g/m3',
      carbon_monoxide: 'mu_g/m3', nitrogen_dioxide: 'mu_g/m3', ozone: 'mu_g/m3',
    },
    hourly: {
      time:             times,
      us_aqi:           Array(HOURS).fill(155),
      pm2_5:            Array(HOURS).fill(58),
      pm10:             Array(HOURS).fill(90),
      carbon_monoxide:  Array(HOURS).fill(800),
      nitrogen_dioxide: Array(HOURS).fill(42),
      ozone:            Array(HOURS).fill(35),
    },
  };
}

/**
 * The absolute UTC instant the service resolves to for this mock: the last sample,
 * reinterpreted as location-local and converted to UTC the same way the service does.
 */
function expectedUTCInstant(utcOffsetSeconds) {
  const lastLocalStamp = buildHourlyTimes(ANCHOR_ISO, HOURS)[HOURS - 1];
  return new Date(Date.parse(`${lastLocalStamp}Z`) - utcOffsetSeconds * 1000);
}

/** What the UI should show once that instant is rendered in `tzName`. */
function expectedDisplay(tzName, utcOffsetSeconds) {
  const instant = expectedUTCInstant(utcOffsetSeconds);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tzName,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(instant);
}

// -- Test matrix --------------------------------------------------------------

const TZ_CASES = [
  {
    label:        'IST (UTC+5:30)',
    tzName:       'Asia/Kolkata',
    utcOffsetSec: 5.5 * 3600,
  },
  {
    label:        'New York summer (UTC-4)',
    tzName:       'America/New_York',
    utcOffsetSec: -4 * 3600,
  },
  {
    label:        'Tokyo (UTC+9)',
    tzName:       'Asia/Tokyo',
    utcOffsetSec: 9 * 3600,
  },
];

// -- Specs --------------------------------------------------------------------

for (const { label, tzName, utcOffsetSec } of TZ_CASES) {
  test.describe(`Report timezone - ${label}`, () => {
    test.use({ timezoneId: tzName });

    test.beforeEach(async ({ page }) => {
      const mockPayload = buildMockForTZ(tzName, utcOffsetSec);
      await page.route(API_PATTERNS.airQuality, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPayload),
        });
      });

      await page.route(API_PATTERNS.forecast, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            hourly: { time: [], windspeed_10m: [], winddirection_10m: [] },
          }),
        });
      });

      await page.goto('/');
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 20_000 });
    });

    test(`reading-time reflects this browser's local timezone [${label}]`, async ({ page }) => {
      const readingTime = page.locator('[data-testid="reading-time"]');
      await expect(readingTime).toBeVisible({ timeout: 10_000 });
      const expected = expectedDisplay(tzName, utcOffsetSec);
      const escaped = expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await expect(readingTime).toHaveText(new RegExp(escaped));
    });

    test(`dashboard renders correctly after timezone emulation [${label}]`, async ({ page }) => {
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="aqi-value"]')).toBeVisible();
    });
  });
}

// -- UTC baseline sanity ------------------------------------------------------

test.describe('Report timezone - UTC baseline sanity', () => {
  test.use({ timezoneId: 'UTC' });

  test.beforeEach(async ({ page }) => {
    const mockPayload = buildMockForTZ('UTC', 0);
    await page.route(API_PATTERNS.airQuality, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPayload),
      });
    });
    await page.route(API_PATTERNS.forecast, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hourly: { time: [], windspeed_10m: [], winddirection_10m: [] },
        }),
      });
    });
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 20_000 });
  });

  test('reading-time label is a non-empty string in UTC mode', async ({ page }) => {
    const readingTime = page.locator('[data-testid="reading-time"]');
    await expect(readingTime).toBeVisible({ timeout: 10_000 });
    const text = await readingTime.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });
});