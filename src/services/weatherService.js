/**
 * OpenWeather integration — fetches hourly forecasted weather data (temperature,
 * humidity, wind speed, conditions) to enrich AQI analysis alongside pollutant trends.
 *
 * Requires VITE_OPENWEATHER_API_KEY to be set (see .env.example). Register a free
 * key at https://openweathermap.org/api before using this service.
 */

/**
 * @typedef {Object} HourlyWeatherPoint
 * @property {string} time - Forecast timestamp (OpenWeather's `dt_txt`, e.g. "2026-08-16 15:00:00").
 * @property {number|null} temperature - Temperature in °C.
 * @property {number|null} humidity - Relative humidity, percent.
 * @property {number|null} windSpeed - Wind speed in m/s.
 * @property {string} weatherLabel - Human-readable condition (e.g. "light rain").
 * @property {string} weatherIcon - OpenWeather icon code (e.g. "10d").
 */

const OPENWEATHER_FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

/**
 * Fetches the OpenWeather 3-hourly forecast for the given coordinates and returns
 * the next 24h (8 entries) mapped to a simplified shape for storing alongside
 * sensor/AQI data.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {AbortSignal} [signal]
 * @returns {Promise<HourlyWeatherPoint[]>}
 */
export async function fetchHourlyWeather(lat, lon, signal) {
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    if (!apiKey) {
        console.warn(
            "VITE_OPENWEATHER_API_KEY is not set — skipping OpenWeather forecast fetch. See .env.example."
        );
        return [];
    }

    const url = `${OPENWEATHER_FORECAST_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    const response = await fetch(url, { signal });
    if (!response.ok) {
        throw new Error(`OpenWeather request failed: ${response.status}`);
    }
    const data = await response.json();

    const list = Array.isArray(data.list) ? data.list.slice(0, 8) : []; // next 24h, 3h steps
    return list.map((entry) => ({
        time: entry.dt_txt,
        temperature: entry.main?.temp ?? null,
        humidity: entry.main?.humidity ?? null,
        windSpeed: entry.wind?.speed ?? null,
        weatherLabel: entry.weather?.[0]?.description ?? "Unknown",
        weatherIcon: entry.weather?.[0]?.icon ?? "01d",
    }));
}