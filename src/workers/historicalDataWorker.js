import { aggregateHourlyToDaily } from '../utils/historicalAggregate';

// The aggregation itself lives in ../utils/historicalAggregate.js so it can be unit
// tested without a Worker. This file is the transport around it.
self.onmessage = function (e) {
  const { data } = e;

  if (!data || !data.hourly) {
    self.postMessage({ error: 'Invalid data format' });
    return;
  }

  try {
    self.postMessage(aggregateHourlyToDaily(data));
  } catch (err) {
    self.postMessage({ error: err?.message || 'Failed to process historical data' });
  }
};
