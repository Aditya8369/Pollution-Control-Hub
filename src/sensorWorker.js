// server/workers/sensorWorker.js
const { parentPort, workerData } = require('worker_threads');

// Function to process/parse incoming raw sensor payload
function processSensorPayload(payload) {
  // Perform heavy calculations, normalization, or database-prepping here
  const processed = {
    ...payload,
    processedAt: Date.now(),
    status: 'optimized'
  };
  return processed;
}

if (parentPort) {
  parentPort.on('message', (message) => {
    try {
      const result = processSensorPayload(message);
      parentPort.postMessage({ success: true, data: result });
    } catch (error) {
      parentPort.postMessage({ success: false, error: error.message });
    }
  });
}
