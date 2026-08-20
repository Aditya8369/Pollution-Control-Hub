import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { fetchAQIForecast, HAZARDOUS_AQI } from '../services/forecastService';
import { getAQIBand } from '../services/airQualityService';
import { logger } from '../utils/logger';

/**
 * The 24-72 hour AQI forecast.
 *
 * There used to be two of these — this file and an `AQIForecastChart.tsx` beside it,
 * same exported name, different endpoints, different props — and nothing imported
 * either. Which one a contributor got was decided by Vite's `resolve.extensions` order
 * rather than by intent. The `.tsx` copy is gone; this is the one component (#897).
 *
 * Neither had an error state, because neither needed one: `fetchAQIForecast` could not
 * fail, it fabricated a forecast instead. Now that it throws, the three states below are
 * the whole point of the component.
 *
 * @param {{lat: number, lon: number, cityName?: string}} props
 */
export default function AQIForecastChart({ lat, lon, cityName }) {
  const [forecast, setForecast] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setLoading(false);
      setError('No location selected.');
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchAQIForecast(lat, lon, { signal: controller.signal })
      .then((result) => {
        if (cancelled) return;
        setForecast(result);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled || err?.name === 'AbortError') return;
        // The message is for the log, not the panel — an upstream status code is not
        // something a visitor can act on.
        logger.warn('AQI forecast unavailable', err);
        setForecast(null);
        setError('Forecast unavailable right now.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [lat, lon]);

  const predictions = forecast?.predictions ?? [];
  const peak = predictions.reduce(
    (worst, point) => (worst === null || point.aqi > worst.aqi ? point : worst),
    /** @type {null | {aqi: number, time: string}} */(null)
  );

  return (
    <section data-testid="aqi-forecast-chart" className="panel">
      <div className="panel-head">
        <h2>
          {forecast ? `${forecast.horizonHours}-hour AQI forecast` : '24–72 hour AQI forecast'}
          {cityName ? ` — ${cityName}` : ''}
        </h2>
        <p>
          {/* Said once, plainly, at the top. A projection presented without the word
              "projection" is read as a measurement. */}
          A projection from Open-Meteo, not a measurement. Shaded hours are above AQI{' '}
          {HAZARDOUS_AQI}.
        </p>
      </div>

      {loading && (
        <p role="status" data-testid="forecast-loading" style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>
          Loading the AQI forecast…
        </p>
      )}

      {!loading && error && (
        <p role="alert" data-testid="forecast-error" style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger, #ef4444)' }}>
          {error}
        </p>
      )}

      {!loading && !error && predictions.length > 0 && (
        <>
          <p data-testid="forecast-peak" style={{ margin: '0 0 0.75rem' }}>
            Peak <strong>{peak.aqi}</strong> ({getAQIBand(peak.aqi).label}) at{' '}
            <strong>{peak.time}</strong>.
          </p>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={predictions}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7e6e1" />
                <XAxis dataKey="time" />
                {/* Bounded to the data rather than a fixed 0–400. A flat 400 ceiling
                    flattened every ordinary day into a line along the bottom. */}
                <YAxis domain={[0, (max) => Math.max(HAZARDOUS_AQI + 50, Math.ceil(max * 1.1))]} />
                <Tooltip
                  formatter={(value, _name, entry) => [
                    // recharts types the value as string|number|array; the band lookup
                    // wants a number, and returns Unknown for anything it cannot read.
                    `${value} (${getAQIBand(Number(value)).label})`,
                    `AQI · projected range ${entry?.payload?.lower}–${entry?.payload?.upper}`,
                  ]}
                />
                <ReferenceLine
                  y={HAZARDOUS_AQI}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: `AQI ${HAZARDOUS_AQI}`, position: 'right', fill: '#ef4444', fontSize: 11 }}
                />
                <Line type="monotone" dataKey="aqi" stroke="#2563eb" strokeWidth={2} dot={false} name="Projected AQI" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}

AQIForecastChart.propTypes = {
  lat: PropTypes.number,
  lon: PropTypes.number,
  cityName: PropTypes.string,
};
