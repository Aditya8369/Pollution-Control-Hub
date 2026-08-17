import { Queue, Worker } from 'bullmq';
import axios from 'axios';
import crypto from 'crypto';

// Setup Redis connection (update with your config)
const connection = { host: 'localhost', port: 6379 };

// 1. Create the Queue
export const webhookQueue = new Queue('webhook-dispatch', { connection });

// 2. Create the Worker
const webhookWorker = new Worker(
  'webhook-dispatch',
  async (job) => {
    const { url, secret, payload } = job.data;

    // Generate HMAC SHA-256 Signature for security verification
    const timestamp = Date.now().toString();
    const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex');

    // Dispatch the webhook
    await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Timestamp': timestamp,
        'X-Webhook-Signature': `sha256=${signature}`,
      },
      timeout: 5000, // 5-second timeout
    });
  },
  { connection, concurrency: 10 }
);

webhookWorker.on('failed', (job, err) => {
  console.error(`[Webhook] Failed to deliver to ${job.data.url}: ${err.message}`);
});
