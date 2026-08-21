-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule nightly refresh at 00:00 UTC
SELECT cron.schedule(
    'refresh-aqi-aggregates-nightly',
    '0 0 * * *',
    'SELECT refresh_mv_aqi_daily_aggregates();'
);
