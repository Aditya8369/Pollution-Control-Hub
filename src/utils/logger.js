/**
 * Structured application logger.
 *
 * A `logger` has existed here for a while, exporting a tidy `warn`/`error`/`info` API,
 * and exactly one module imported it. Everywhere else calls `console.*` directly — 59
 * such calls in non-test source. So the abstraction was there and was not doing anything.
 *
 * It also could not do very much. There was a `LOG_LEVELS` map that nothing ever
 * consulted, so every call printed unconditionally: `logger.info()` in a hot path printed
 * on every call, in production, on a user's phone. There was no debug level, so anyone
 * wanting a temporary trace reached for `console.log` and shipped it. `data` was spread
 * into the entry as-is, so coordinates and search queries went out verbatim. And nothing
 * was retained, so a bug report carried no record of anything.
 *
 * The consequence is visible in the deployed app's console: MSW notices, Recharts
 * container warnings, IndexedDB failures and geocoding errors, all at the same volume.
 * `cacheStore`'s "IndexedDB read failed" genuinely matters — it means the persistence
 * tier is degraded and the app is running memory-only — and it is indistinguishable from
 * the rest.
 *
 * The public API is unchanged and backward compatible: `logger.warn(message, data)`,
 * `.error(...)` and `.info(...)` behave as before for existing callers.
 */

/**
 * Severity order. A call is emitted when its level is at or above the threshold.
 *
 * `silent` has no matching method — it exists only as a threshold, so setting it
 * suppresses everything including errors. That is what a test run wants.
 *
 * @readonly
 */
export const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

/** Console method used for each level. */
const CONSOLE_METHOD = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

/** Uppercase label written into each entry, preserving the previous format. */
const LEVEL_LABEL = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
};

/**
 * Keys whose values are replaced before an entry is emitted.
 *
 * Matched on the key name rather than the value, because a value-based heuristic either
 * misses things or mangles legitimate data. The list is coarse on purpose: the cost of
 * redacting something harmless is a `[redacted]` in a log line, and the cost of missing
 * something is a user's home coordinates in a console someone else can read.
 */
const REDACTED_KEYS = [
  'lat',
  'latitude',
  'lon',
  'lng',
  'longitude',
  'coords',
  'coordinates',
  'address',
  'email',
  'token',
  'apikey',
  'api_key',
  'password',
  'secret',
  'authorization',
];

/** What a redacted value is replaced with. */
const REDACTED = '[redacted]';

/** How deep into a nested object redaction walks before giving up. */
const MAX_REDACT_DEPTH = 6;

/** How many recent entries are retained for a bug report. */
export const BUFFER_SIZE = 50;

/**
 * The default threshold for the current environment.
 *
 * Silent under test so the suite stops printing, quiet in production so only things
 * worth acting on reach a user's console, verbose in development.
 *
 * Read defensively: `process` is a Node construct and is not guaranteed to exist
 * wherever this module is loaded.
 *
 * @returns {string} A key of `LEVELS`.
 */
function defaultLevel() {
  let mode;

  try {
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
      mode = process.env.NODE_ENV;
    }
  } catch {
    // Ignore, and fall through to the conservative default below.
  }

  if (mode === 'test') return 'silent';
  if (mode === 'development') return 'debug';
  if (mode === 'production') return 'warn';

  // Unknown environment. `warn` is the conservative choice: an over-quiet log is a
  // nuisance, an over-loud one on someone's device is a bug.
  return 'warn';
}

let currentLevel = defaultLevel();

/** @type {object[]} Ring buffer of recent entries, oldest first. */
let buffer = [];

/**
 * Whether a key should have its value redacted.
 *
 * @param {string} key
 * @returns {boolean}
 */
function isSensitiveKey(key) {
  const lower = String(key).toLowerCase();
  return REDACTED_KEYS.some((candidate) => lower === candidate);
}

/**
 * Copies a value with sensitive fields replaced.
 *
 * Guards against depth and cycles because logging must never be the thing that throws.
 * A logger that can crash its caller is worse than no logger: it turns a diagnostic into
 * an outage, at exactly the moment something is already going wrong.
 *
 * @param {any} value - The value to copy.
 * @param {number} [depth] - Current recursion depth.
 * @param {WeakSet} [seen] - Objects already visited on this path.
 * @returns {any} A redacted copy.
 */
function redact(value, depth = 0, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return value;

  if (depth >= MAX_REDACT_DEPTH) return '[max depth]';

  // A circular reference would otherwise recurse until the stack ran out.
  if (seen.has(value)) return '[circular]';
  seen.add(value);

  // Errors do not enumerate their own message and stack, so a plain property copy
  // loses exactly the fields worth logging.
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redact(entry, depth + 1, seen));
  }

  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    output[key] = isSensitiveKey(key)
      ? REDACTED
      : redact(entry, depth + 1, seen);
  }
  return output;
}

/**
 * Envelope fields a caller's `data` must not be able to overwrite.
 *
 * The previous implementation spread `...data` last, so any of these in a caller's data
 * bag silently replaced the envelope's own value. That was not hypothetical:
 * `ErrorBoundary` logs `{ message: error.message, ... }`, so every entry it produced
 * recorded the message as "Boom" rather than "ErrorBoundary caught an error" — the one
 * field identifying what had happened was overwritten by the thing it happened to.
 */
const RESERVED_KEYS = ['level', 'message', 'timestamp', 'context'];

/**
 * Renames any reserved key so caller-supplied fields cannot shadow the envelope.
 *
 * Renamed rather than dropped: `data.message` is usually the most informative field in
 * the bag, and discarding it to protect the envelope would trade one lost field for
 * another. Prefixing keeps both.
 *
 * @param {object} fields
 * @returns {object}
 */
function namespaceReserved(fields) {
  const output = {};
  for (const [key, value] of Object.entries(fields)) {
    output[RESERVED_KEYS.includes(key) ? `data.${key}` : key] = value;
  }
  return output;
}

/**
 * Builds a log entry.
 *
 * @param {string} level - A key of `LEVELS`.
 * @param {string} message
 * @param {object} data - Structured context.
 * @param {object} bindings - Fields inherited from a child logger.
 * @returns {object}
 */
function createEntry(level, message, data, bindings) {
  return {
    level: LEVEL_LABEL[level],
    message,
    timestamp: new Date().toISOString(),
    context: 'pollution-control-hub',
    ...namespaceReserved(bindings),
    // Per-call data wins over a child's bindings: the more specific of the two.
    ...namespaceReserved(redact(data && typeof data === 'object' ? data : {})),
  };
}

/**
 * Appends an entry to the ring buffer, dropping the oldest when full.
 *
 * @param {object} entry
 */
function remember(entry) {
  buffer.push(entry);
  if (buffer.length > BUFFER_SIZE) {
    buffer = buffer.slice(buffer.length - BUFFER_SIZE);
  }
}

/**
 * Emits an entry if its level clears the threshold.
 *
 * The threshold is checked before the entry is built, so a suppressed call pays for
 * neither timestamp formatting nor redaction. That is what makes a `logger.debug()` in a
 * hot path acceptable to leave in the code.
 *
 * @param {string} level
 * @param {string} message
 * @param {object} data
 * @param {object} bindings
 */
function emit(level, message, data, bindings) {
  if (LEVELS[level] < LEVELS[currentLevel]) return;

  const entry = createEntry(level, message, data, bindings);
  remember(entry);

  const method = CONSOLE_METHOD[level];
  const target =
    typeof console !== 'undefined' && typeof console[method] === 'function'
      ? console[method]
      : null;

  if (target) target.call(console, entry);
}

/**
 * Builds a logger bound to a set of fields.
 *
 * @param {object} bindings - Merged into every entry this logger emits.
 * @returns {object} A logger.
 */
function buildLogger(bindings) {
  return {
    /**
     * Detail useful while developing. Suppressed outside development.
     *
     * @param {string} message
     * @param {object} [data]
     */
    debug(message, data = {}) {
      emit('debug', message, data, bindings);
    },

    /**
     * Something noteworthy that is not a problem.
     *
     * @param {string} message
     * @param {object} [data]
     */
    info(message, data = {}) {
      emit('info', message, data, bindings);
    },

    /**
     * Something degraded but recoverable.
     *
     * @param {string} message
     * @param {object} [data]
     */
    warn(message, data = {}) {
      emit('warn', message, data, bindings);
    },

    /**
     * Something failed.
     *
     * @param {string} message
     * @param {object} [data]
     */
    error(message, data = {}) {
      emit('error', message, data, bindings);
    },

    /**
     * A logger that tags every entry with additional fields.
     *
     * Every entry previously carried the same `context: 'pollution-control-hub'`, so
     * nothing identified which module had logged. A child adds that without every call
     * site having to remember to.
     *
     * @param {object} extra - Fields merged into every entry.
     * @returns {object} A logger sharing this one's threshold.
     *
     * @example
     * const log = logger.child({ module: 'cacheStore' });
     * log.warn('IndexedDB read failed', { error });
     */
    child(extra = {}) {
      return buildLogger({
        ...bindings,
        ...(extra && typeof extra === 'object' ? extra : {}),
      });
    },
  };
}

export const logger = {
  ...buildLogger({}),

  /**
   * Raises or lowers the threshold at runtime.
   *
   * Lets detail be turned on against a live problem without a redeploy. An unrecognised
   * level is ignored rather than throwing — a logger that can crash its caller is worse
   * than no logger.
   *
   * @param {string} level - A key of `LEVELS`.
   * @returns {string} The level in effect afterwards.
   */
  setLevel(level) {
    if (Object.prototype.hasOwnProperty.call(LEVELS, level)) {
      currentLevel = level;
    }
    return currentLevel;
  },

  /**
   * @returns {string} The threshold currently in effect.
   */
  getLevel() {
    return currentLevel;
  },

  /**
   * Restores the environment's default threshold.
   *
   * @returns {string} The level in effect afterwards.
   */
  resetLevel() {
    currentLevel = defaultLevel();
    return currentLevel;
  },

  /**
   * Whether a call at `level` would currently be emitted.
   *
   * Lets a caller skip assembling expensive context for a call that would be dropped.
   *
   * @param {string} level - A key of `LEVELS`.
   * @returns {boolean}
   */
  isLevelEnabled(level) {
    if (!Object.prototype.hasOwnProperty.call(LEVELS, level)) return false;
    return LEVELS[level] >= LEVELS[currentLevel];
  },

  /**
   * The retained entries, oldest first.
   *
   * Entries are buffered whenever they clear the threshold, so a bug report can carry
   * the run-up to a failure rather than only the failure. Previously the sole durable
   * record in the app was whatever `ErrorBoundary` happened to catch.
   *
   * @returns {object[]} A copy, so a caller cannot mutate the buffer.
   */
  getRecentEntries() {
    return [...buffer];
  },

  /**
   * Empties the retained entries.
   */
  clearBuffer() {
    buffer = [];
  },
};

export default logger;
