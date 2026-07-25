const LOG_LEVELS = {
  warn: 'WARN',
  error: 'ERROR',
  info: 'INFO'
};

/**
 * @param {any} level
 * @param {any} message
 * @param {any} data
 */
function createEntry(level, message, data = {}) {
  return {
    level: LOG_LEVELS[level],
    message,
    timestamp: new Date().toISOString(),
    context: 'pollution-control-hub',
    ...data
  };
}

export const logger = {
  /**
     * @param {any} message
     * @param {any} data
     */
    warn(message, data = {}) {
    const entry = createEntry('warn', message, data);
    console.warn(JSON.stringify(entry));
  },
  /**
     * @param {any} message
     * @param {any} data
     */
    error(message, data = {}) {
    const entry = createEntry('error', message, data);
    console.error(JSON.stringify(entry));
  },
  /**
     * @param {any} message
     * @param {any} data
     */
    info(message, data = {}) {
    const entry = createEntry('info', message, data);
    console.info(JSON.stringify(entry));
  }
};