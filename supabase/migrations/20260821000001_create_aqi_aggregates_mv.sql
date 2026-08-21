-- Create Materialized View for Daily & Weekly AQI Aggregates
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_aqi_daily_aggregates AS
SELECT 
    station_id,
    date_trunc('day', recorded_at) AS aggregate_date,
    ROUND(AVG(aqi_value), 2) AS avg_aqi,
    MAX(aqi_value) AS max_aqi,
    MIN(aqi_value) AS min_aqi,
    COUNT(*) AS total_readings
FROM 
    aqi_readings
GROUP BY 
    station_id, 
    date_trunc('day', recorded_at);

-- Create a unique index for fast lookups and concurrent refreshing
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_aqi_daily_station_date 
ON mv_aqi_daily_aggregates (station_id, aggregate_date);

-- Function to refresh the materialized view safely
CREATE OR REPLACE FUNCTION refresh_mv_aqi_daily_aggregates()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_aqi_daily_aggregates;
END;
$$ LANGUAGE plpgsql;
