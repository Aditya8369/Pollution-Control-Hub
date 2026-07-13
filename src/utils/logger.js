const LOG_LEVELS = {
  warn: 'WARN',
  error: 'ERROR',
  info: 'INFO'
};

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
  warn(message, data = {}) {
    const entry = createEntry('warn', message, data);
    console.warn(JSON.stringify(entry));
  },
  error(message, data = {}) {
    const entry = createEntry('error', message, data);
    console.error(JSON.stringify(entry));
  },
  info(message, data = {}) {
    const entry = createEntry('info', message, data);
    console.info(JSON.stringify(entry));
  }
};