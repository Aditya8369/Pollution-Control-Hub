import { Queue, Worker } from 'bullmq';
import { SensorBatcher } from '../utils/SensorBatcher.js';

// Setup Redis connection (update with your actual Redis config)
const connection = { host: 'localhost', port: 6379 };

// 1. Create the Queue for incoming sensor pushes
export const sensorQueue = new Queue('sensor-data-queue', { connection });

// Instantiate the batcher (pass your actual DB client here)
const mockDbClient = {}; 
const batcher = new SensorBatcher(mockDbClient);

// 2. Create the Worker to process incoming jobs and feed the batcher
const sensorWorker = new Worker(
  'sensor-data-queue',
  async (job) => {
    // Extract sensor data from the job and add it to our in-memory batcher
    await batcher.addRecord(job.data);
  },
  { 
    connection,
    concurrency: 50 // Process multiple jobs concurrently to keep up with high-frequency pushes
  }
);

// 3. Monitor BullMQ Lag & Events
sensorWorker.on('completed', (_job) => {
  // Optional debug logging
});

// `job` is undefined when a job fails before BullMQ could load it — a malformed
// payload, or a stalled job reclaimed after the lock expired. Reading `job.id`
// unguarded turns that into a TypeError inside the error handler itself, which
// loses the original failure.
sensorWorker.on('failed', (job, err) => {
  console.error(`[Monitor] Job ${job?.id ?? 'unknown'} failed:`, err?.message);
});

// Periodic logging of BullMQ waiting count (Queue Lag)
setInterval(async () => {
  const waitingCount = await sensorQueue.getWaitingCount();
  if (waitingCount > 500) {
    console.warn(`[⚠️ Warning] Queue Lag Detected: ${waitingCount} sensor events waiting to be processed!`);
  }
}, 5000);
