import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    fetchAQIForecast,
    buildPredictions,
    uncertaintyBand,
    formatForecastHour,
    HAZARDOUS_AQI,
    MAX_FORECAST_DAYS,
} from './forecastService';

/**
 * #897. The old service fetched `/api/forecast` — an endpoint that does not exist in this
 * repository — and on failure returned a hardcoded forecast peaking at AQI 178 with
 * `hazardous: true`. Same shape as a real response, no flag distinguishing them, so
 * nothing downstream could tell. Since the `try` branch could never succeed, the
 * fabricated branch was not a fallback; it was the implementation.
 *
 * The rule these tests exist to hold: no reading is ever invented. If the service cannot
 * answer, it throws, and the UI says so.
 */

const NOW = new Date('2026-08-20T15:30:00Z').getTime();

/** An Open-Meteo hourly block starting at the current hour. */
function hourlyFrom(values, startHour = 15) {
    return {
        time: values.map((_, i) => {
            const total = startHour + i;
            const day = 20 + Math.floor(total / 24);
            return `2026-08-${String(day).padStart(2, '0')}T${String(total % 24).padStart(2, '0')}:00`;
        }),
        us_aqi: values,
    };
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('uncertaintyBand', () => {
    it('widens with the horizon', () => {
        const nearTerm = uncertaintyBand(200, 6);
        const farTerm = uncertaintyBand(200, 60);

        expect(farTerm.upper - farTerm.lower).toBeGreaterThan(nearTerm.upper - nearTerm.lower);
    });

    it('never goes below zero', () => {
        // The old fallback published ±5 around every value, including "Now" — a
        // confidence interval nobody measured.
        expect(uncertaintyBand(3, 48).lower).toBe(0);
    });

    it('keeps a visible band on a low reading', () => {
        const band = uncertaintyBand(10, 1);
        expect(band.upper - band.lower).toBeGreaterThanOrEqual(10);
    });
});

describe('formatForecastHour', () => {
    it('calls the first hour "Now"', () => {
        expect(formatForecastHour('2026-08-20T15:00', 0)).toBe('Now');
    });

    it('uses a bare clock time within the same day', () => {
        expect(formatForecastHour('2026-08-20T20:00', 5)).toBe('8pm');
    });

    it('crosses midnight into "Tomorrow"', () => {
        expect(formatForecastHour('2026-08-21T00:00', 9)).toBe('Tomorrow 12am');
        expect(formatForecastHour('2026-08-21T17:00', 26)).toBe('Tomorrow 5pm');
    });

    it('counts further days from the first forecast hour', () => {
        expect(formatForecastHour('2026-08-22T17:00', 50)).toBe('In 2 days, 5pm');
        expect(formatForecastHour('2026-08-23T09:00', 66)).toBe('In 3 days, 9am');
    });

    it('degrades to an offset on an unparseable timestamp', () => {
        expect(formatForecastHour('rubbish', 7)).toBe('+7h');
    });
});

describe('buildPredictions', () => {
    it('starts at the current hour, not at the start of the response', () => {
        // The response opens at 00:00 local; "Now" is 15:00.
        const hourly = hourlyFrom([50, 60, 70, 80], 0);
        hourly.time = ['2026-08-20T13:00', '2026-08-20T14:00', '2026-08-20T15:00', '2026-08-20T16:00'];

        const predictions = buildPredictions(hourly, 0);

        expect(predictions[0].time).toBe('Now');
        expect(predictions[0].aqi).toBe(70);
        expect(predictions).toHaveLength(2);
    });

    it('flags an hour above the threshold as hazardous', () => {
        const predictions = buildPredictions(hourlyFrom([80, HAZARDOUS_AQI + 1]));

        expect(predictions[0].hazardous).toBe(false);
        expect(predictions[1].hazardous).toBe(true);
    });

    it('labels each hour with its band', () => {
        const predictions = buildPredictions(hourlyFrom([40, 180]));

        expect(predictions[0].band).toBe('Good');
        expect(predictions[1].band).toBe('Unhealthy');
    });

    it('skips an hour the model could not produce rather than plotting it at zero', () => {
        // Plotting a null as 0 draws a dip into "Good", which is the #546 defect.
        const predictions = buildPredictions(hourlyFrom([120, null, 130, undefined, 140]));

        expect(predictions.map((p) => p.aqi)).toEqual([120, 130, 140]);
    });

    it('returns nothing for an empty or malformed block', () => {
        expect(buildPredictions(undefined)).toEqual([]);
        expect(buildPredictions({})).toEqual([]);
        expect(buildPredictions({ time: [], us_aqi: [] })).toEqual([]);
        expect(buildPredictions({ time: 'nope', us_aqi: 'nope' })).toEqual([]);
    });
});

describe('fetchAQIForecast', () => {
    it('asks Open-Meteo, the source the rest of the app already uses', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ utc_offset_seconds: 0, hourly: hourlyFrom([120, 130, 140]) }),
        });

        const result = await fetchAQIForecast(28.6139, 77.209);

        const url = fetchSpy.mock.calls[0][0];
        expect(url).toContain('air-quality-api.open-meteo.com');
        expect(url).toContain('latitude=28.6139');
        expect(url).toContain('hourly=us_aqi');
        expect(url).toContain('timezone=auto');
        expect(result.source).toBe('open-meteo');
        expect(result.predictions).toHaveLength(3);
    });

    it('caps the horizon at what the upstream actually serves', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ hourly: hourlyFrom([100]) }),
        });

        await fetchAQIForecast(28.6, 77.2, { days: 30 });

        expect(fetchSpy.mock.calls[0][0]).toContain(`forecast_days=${MAX_FORECAST_DAYS}`);
    });

    it('throws on a non-200 instead of inventing a forecast', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 503 });

        // This is the whole point. The old code answered a 503 with
        // "Tomorrow 5 PM: AQI 178, hazardous".
        await expect(fetchAQIForecast(28.6, 77.2)).rejects.toThrow(/503/);
    });

    it('propagates a network failure', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

        await expect(fetchAQIForecast(28.6, 77.2)).rejects.toThrow('network down');
    });

    it('throws when a 200 carries no usable hours', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ hourly: { time: [], us_aqi: [] } }),
        });

        // An empty result would render as a blank chart with no explanation.
        await expect(fetchAQIForecast(28.6, 77.2)).rejects.toThrow(/no usable hours/);
    });

    it('throws when every modelled hour is null', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ hourly: hourlyFrom([null, null, null]) }),
        });

        await expect(fetchAQIForecast(28.6, 77.2)).rejects.toThrow(/no usable hours/);
    });

    it('refuses a request with no coordinates', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');

        await expect(fetchAQIForecast(undefined, 77.2)).rejects.toThrow(/latitude and a longitude/);
        await expect(fetchAQIForecast(28.6, NaN)).rejects.toThrow(/latitude and a longitude/);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('reports the horizon it actually got, not the one it asked for', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ hourly: hourlyFrom([100, 110, 120, 130]) }),
        });

        const result = await fetchAQIForecast(28.6, 77.2);

        expect(result.horizonHours).toBe(3);
    });
});
