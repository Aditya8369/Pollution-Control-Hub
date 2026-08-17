import { webhookQueue } from '../workers/webhookWorker.js';

/**
 * Call this function whenever an AQI or sensor threshold is breached.
 */
export const triggerBreachAlerts = async (breachEventData) => {
  // TODO: Replace with actual DB query to fetch active webhooks
  const registeredWebhooks = await mockDb.getWebhooksByEventType('threshold_breach');

  const jobs = registeredWebhooks.map((webhook) => ({
    name: 'dispatch-alert',
    data: {
      url: webhook.url,
      secret: webhook.secret, // The secret generated during registration
      payload: breachEventData,
    },
    opts: {
      attempts: 5, // Retry up to 5 times
      backoff: {
        type: 'exponential',
        delay: 2000, // 2s, 4s, 8s, 16s...
      },
      removeOnComplete: true,
    },
  }));

  // Batch add to queue for performance
  await webhookQueue.addBulk(jobs);
};
