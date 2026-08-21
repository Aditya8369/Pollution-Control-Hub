// src/services/ingestionService.js
const sensorPool = require('./workers/sensorPool');

async function handleIncomingBatch(sensorMessages) {
  console.time('IngestionBatch');

  // Distribute incoming messages across the worker pool in parallel
  const promises = sensorMessages.map((msg) => sensorPool.runTask(msg));
  const results = await Promise.all(promises);

  console.timeEnd('IngestionBatch');
  return results;
}

module.exports = { handleIncomingBatch };
