-- Query plan verification script for sensor time-series ranges
EXPLAIN ANALYZE
SELECT id, sensor_id, timestamp, pm25, pm10, co2
FROM public.sensor_readings
WHERE sensor_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND timestamp >= NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;
