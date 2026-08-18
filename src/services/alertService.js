import { webhookQueue } from '../workers/webhookWorker.js';

/**
 * Where the list of subscribed webhooks comes from.
 *
 * This used to be a bare `mockDb` reference that is not imported or declared
 * anywhere in the repository, so the first call to `triggerBreachAlerts` threw
 * `ReferenceError: mockDb is not defined` before it could queue anything. ESLint
 * has been reporting it as `no-undef` the whole time; nothing in CI was reading
 * the report.
 *
 * An injectable provider keeps the placeholder honest. The default returns an
 * empty list rather than pretending a database is there, and wiring in the real
 * query later is one call to `setWebhookProvider` rather than a rewrite.
 *
 * @type {(eventType: string) => Promise<Array<{url: string, secret: string}>>}
 */
let getWebhooksByEventType = async () => [];

/**
 * Supplies the real webhook lookup.
 *
 * Call once during server start-up with a function that queries the webhook
 * registration table.
 *
 * @param {(eventType: string) => Promise<Array<{url: string, secret: string}>>} provider
 */
export function setWebhookProvider(provider) {
  if (typeof provider !== 'function') {
    throw new TypeError('setWebhookProvider expects a function');
  }
  getWebhooksByEventType = provider;
}

/**
 * Queues an outbound alert to every webhook subscribed to threshold breaches.
 *
 * Call this whenever an AQI or sensor threshold is breached.
 *
 * @param {object} breachEventData - The breach payload delivered to subscribers.
 * @returns {Promise<void>}
 */
export const triggerBreachAlerts = async (breachEventData) => {
  const registeredWebhooks = await getWebhooksByEventType('threshold_breach');

  // `addBulk([])` is a wasted round-trip to Redis, and "nobody has registered a
  // webhook yet" is the normal state of a fresh deployment rather than an edge case.
  if (!Array.isArray(registeredWebhooks) || registeredWebhooks.length === 0) {
    return;
  }

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
