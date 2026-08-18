-- Create composite index on sensor_id and timestamp to optimize time-series data queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sensor_readings_sensor_timestamp 
ON public.sensor_readings (sensor_id, timestamp DESC);
