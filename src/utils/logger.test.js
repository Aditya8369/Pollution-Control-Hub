import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BUFFER_SIZE, LEVELS, logger } from './logger';

/**
 * The suite runs with the threshold defaulted to `silent`, which is the point of the
 * default — the test output stops being a wall of application logging. Tests that care
 * about emission set the level they need explicitly.
 */

let spies;

beforeEach(() => {
  logger.clearBuffer();
  logger.resetLevel();
  spies = {
    debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  logger.resetLevel();
  logger.clearBuffer();
});

describe('logger — the existing contract', () => {
  it('keeps warn/error/info taking (message, data)', () => {
    logger.setLevel('debug');

    logger.warn('a warning', { detail: 1 });
    logger.error('an error', { detail: 2 });
    logger.info('a note', { detail: 3 });

    expect(spies.warn).toHaveBeenCalledTimes(1);
    expect(spies.error).toHaveBeenCalledTimes(1);
    expect(spies.info).toHaveBeenCalledTimes(1);
  });

  it('keeps the entry shape ErrorBoundary depends on', () => {
    logger.setLevel('debug');
    logger.error('ErrorBoundary caught an error', { componentStack: 'at Bomb' });

    const [entry] = spies.error.mock.calls[0];
    expect(entry.level).toBe('ERROR');
    expect(entry.message).toBe('ErrorBoundary caught an error');
    expect(entry.context).toBe('pollution-control-hub');
    expect(typeof entry.timestamp).toBe('string');
    expect(entry.componentStack).toBe('at Bomb');
  });

  it('does not let caller data overwrite the envelope', () => {
    logger.setLevel('debug');
    // ErrorBoundary really does pass `message`. Spreading data last meant every entry
    // it produced recorded "Boom" as the message — the one field saying what had
    // happened, replaced by the thing it happened to.
    logger.error('ErrorBoundary caught an error', {
      message: 'Boom',
      componentStack: 'at Bomb',
    });

    const [entry] = spies.error.mock.calls[0];
    expect(entry.message).toBe('ErrorBoundary caught an error');
    // Namespaced rather than dropped: data.message is usually the most informative
    // field in the bag, so protecting the envelope must not cost it.
    expect(entry['data.message']).toBe('Boom');
    expect(entry.componentStack).toBe('at Bomb');
  });

  it('protects every reserved envelope field', () => {
    logger.setLevel('debug');
    logger.warn('real message', {
      level: 'FAKE',
      timestamp: 'not-a-time',
      context: 'somewhere-else',
    });

    const [entry] = spies.warn.mock.calls[0];
    expect(entry.level).toBe('WARN');
    expect(entry.context).toBe('pollution-control-hub');
    expect(entry.timestamp).not.toBe('not-a-time');
    expect(entry['data.level']).toBe('FAKE');
    expect(entry['data.context']).toBe('somewhere-else');
  });

  it('works with no data argument at all', () => {
    logger.setLevel('debug');
    expect(() => logger.warn('bare')).not.toThrow();
    expect(spies.warn).toHaveBeenCalledTimes(1);
  });
});

describe('logger — level gating', () => {
  it('defaults to silent under test so the suite stops printing', () => {
    expect(logger.getLevel()).toBe('silent');

    logger.debug('quiet');
    logger.info('quiet');
    logger.warn('quiet');
    logger.error('quiet');

    for (const spy of Object.values(spies)) {
      expect(spy).not.toHaveBeenCalled();
    }
  });

  it('suppresses everything below the threshold', () => {
    logger.setLevel('warn');

    logger.debug('dropped');
    logger.info('dropped');
    logger.warn('kept');
    logger.error('kept');

    expect(spies.debug).not.toHaveBeenCalled();
    expect(spies.info).not.toHaveBeenCalled();
    expect(spies.warn).toHaveBeenCalledTimes(1);
    expect(spies.error).toHaveBeenCalledTimes(1);
  });

  it('emits everything at debug', () => {
    logger.setLevel('debug');

    logger.debug('a');
    logger.info('b');
    logger.warn('c');
    logger.error('d');

    for (const spy of Object.values(spies)) {
      expect(spy).toHaveBeenCalledTimes(1);
    }
  });

  it('suppresses even errors at silent', () => {
    logger.setLevel('silent');
    logger.error('nothing');
    expect(spies.error).not.toHaveBeenCalled();
  });

  it('ignores an unrecognised level rather than throwing', () => {
    logger.setLevel('warn');
    // A logger that can crash its caller is worse than no logger.
    expect(logger.setLevel('verbose')).toBe('warn');
    expect(logger.getLevel()).toBe('warn');
  });

  it('answers whether a level would be emitted', () => {
    logger.setLevel('warn');

    expect(logger.isLevelEnabled('debug')).toBe(false);
    expect(logger.isLevelEnabled('info')).toBe(false);
    expect(logger.isLevelEnabled('warn')).toBe(true);
    expect(logger.isLevelEnabled('error')).toBe(true);
    expect(logger.isLevelEnabled('nonsense')).toBe(false);
  });

  it('does no work for a suppressed call', () => {
    logger.setLevel('error');
    const timestamp = vi.spyOn(Date.prototype, 'toISOString');

    logger.debug('dropped', { a: 1 });
    logger.info('dropped', { a: 1 });

    // Formatting and redaction happen after the threshold check, which is what makes a
    // debug call in a hot path acceptable to leave in the code.
    expect(timestamp).not.toHaveBeenCalled();
  });

  it('orders the levels by severity', () => {
    expect(LEVELS.debug).toBeLessThan(LEVELS.info);
    expect(LEVELS.info).toBeLessThan(LEVELS.warn);
    expect(LEVELS.warn).toBeLessThan(LEVELS.error);
    expect(LEVELS.error).toBeLessThan(LEVELS.silent);
  });
});

describe('logger — scoped children', () => {
  it('tags every entry with the child bindings', () => {
    logger.setLevel('debug');
    const scoped = logger.child({ module: 'cacheStore' });

    scoped.warn('IndexedDB read failed');

    const [entry] = spies.warn.mock.calls[0];
    expect(entry.module).toBe('cacheStore');
  });

  it('inherits the parent threshold, including later changes', () => {
    const scoped = logger.child({ module: 'x' });

    logger.setLevel('silent');
    scoped.error('dropped');
    expect(spies.error).not.toHaveBeenCalled();

    logger.setLevel('debug');
    scoped.error('kept');
    expect(spies.error).toHaveBeenCalledTimes(1);
  });

  it('merges bindings when children are nested', () => {
    logger.setLevel('debug');
    logger.child({ module: 'a' }).child({ operation: 'read' }).info('nested');

    const [entry] = spies.info.mock.calls[0];
    expect(entry.module).toBe('a');
    expect(entry.operation).toBe('read');
  });

  it('does not let a child leak bindings back to the parent', () => {
    logger.setLevel('debug');
    logger.child({ module: 'a' }).info('child');
    logger.info('parent');

    const [childEntry] = spies.info.mock.calls[0];
    const [parentEntry] = spies.info.mock.calls[1];
    expect(childEntry.module).toBe('a');
    expect(parentEntry.module).toBeUndefined();
  });

  it('lets per-call data override a binding', () => {
    logger.setLevel('debug');
    logger.child({ module: 'a' }).info('override', { module: 'b' });

    const [entry] = spies.info.mock.calls[0];
    expect(entry.module).toBe('b');
  });
});

describe('logger — redaction', () => {
  beforeEach(() => {
    logger.setLevel('debug');
  });

  it('redacts coordinates', () => {
    logger.info('located', { lat: 28.6139, lon: 77.209, city: 'Delhi' });

    const [entry] = spies.info.mock.calls[0];
    expect(entry.lat).toBe('[redacted]');
    expect(entry.lon).toBe('[redacted]');
    // Only the sensitive keys — redacting everything would make the log useless.
    expect(entry.city).toBe('Delhi');
  });

  it('matches key names case-insensitively', () => {
    logger.info('mixed', { Latitude: 1, API_KEY: 'k', Token: 't' });

    const [entry] = spies.info.mock.calls[0];
    expect(entry.Latitude).toBe('[redacted]');
    expect(entry.API_KEY).toBe('[redacted]');
    expect(entry.Token).toBe('[redacted]');
  });

  it('redacts inside nested objects and arrays', () => {
    logger.info('nested', {
      request: { params: { latitude: 12.9 } },
      results: [{ longitude: 77.5, name: 'ok' }],
    });

    const [entry] = spies.info.mock.calls[0];
    expect(entry.request.params.latitude).toBe('[redacted]');
    expect(entry.results[0].longitude).toBe('[redacted]');
    expect(entry.results[0].name).toBe('ok');
  });

  it('does not mutate the caller data', () => {
    const data = { lat: 28.6139, nested: { token: 'abc' } };
    logger.info('copy', data);

    // Logging must be observation, never modification.
    expect(data.lat).toBe(28.6139);
    expect(data.nested.token).toBe('abc');
  });

  it('survives a circular reference', () => {
    const data = { name: 'root' };
    data.self = data;

    expect(() => logger.info('cycle', data)).not.toThrow();
    const [entry] = spies.info.mock.calls[0];
    expect(entry.self).toBe('[circular]');
  });

  it('stops at a depth limit rather than recursing forever', () => {
    let deep = { value: 'bottom' };
    for (let i = 0; i < 20; i++) deep = { nested: deep };

    expect(() => logger.info('deep', deep)).not.toThrow();
    expect(JSON.stringify(spies.info.mock.calls[0][0])).toContain('[max depth]');
  });

  it('keeps an Error usable instead of copying it to an empty object', () => {
    // message and stack are non-enumerable, so a plain property copy loses exactly the
    // fields worth logging.
    logger.error('failed', { error: new TypeError('bad input') });

    const [entry] = spies.error.mock.calls[0];
    expect(entry.error.name).toBe('TypeError');
    expect(entry.error.message).toBe('bad input');
    expect(typeof entry.error.stack).toBe('string');
  });

  it('tolerates a non-object data argument', () => {
    expect(() => logger.warn('scalar', 'not an object')).not.toThrow();
    expect(() => logger.warn('nullish', null)).not.toThrow();
    expect(spies.warn).toHaveBeenCalledTimes(2);
  });
});

describe('logger — retained entries', () => {
  it('retains what it emits', () => {
    logger.setLevel('debug');

    logger.info('first');
    logger.warn('second');

    const entries = logger.getRecentEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0].message).toBe('first');
    expect(entries[1].message).toBe('second');
  });

  it('does not retain what it suppresses', () => {
    logger.setLevel('error');

    logger.debug('dropped');
    logger.error('kept');

    const entries = logger.getRecentEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe('kept');
  });

  it('keeps only the most recent entries', () => {
    logger.setLevel('debug');

    for (let i = 0; i < BUFFER_SIZE + 10; i++) {
      logger.info(`entry-${i}`);
    }

    const entries = logger.getRecentEntries();
    expect(entries).toHaveLength(BUFFER_SIZE);
    // Oldest dropped first — the run-up to a failure is what a bug report needs.
    expect(entries[0].message).toBe('entry-10');
    expect(entries[BUFFER_SIZE - 1].message).toBe(`entry-${BUFFER_SIZE + 9}`);
  });

  it('retains redacted entries, not raw ones', () => {
    logger.setLevel('debug');
    logger.info('located', { lat: 28.6139 });

    expect(logger.getRecentEntries()[0].lat).toBe('[redacted]');
  });

  it('hands back a copy so the buffer cannot be mutated from outside', () => {
    logger.setLevel('debug');
    logger.info('one');

    logger.getRecentEntries().push({ message: 'injected' });
    expect(logger.getRecentEntries()).toHaveLength(1);
  });

  it('can be emptied', () => {
    logger.setLevel('debug');
    logger.info('one');
    logger.clearBuffer();

    expect(logger.getRecentEntries()).toEqual([]);
  });
});

describe('logger — resilience', () => {
  it('does not throw when a console method is missing', () => {
    logger.setLevel('debug');
    const original = console.debug;
    // Some embedded and older environments do not implement every method.
    // @ts-expect-error — deliberately removing it.
    console.debug = undefined;

    try {
      expect(() => logger.debug('no console.debug here')).not.toThrow();
      // Still retained, so the entry is not lost just because it could not be printed.
      expect(logger.getRecentEntries()).toHaveLength(1);
    } finally {
      console.debug = original;
    }
  });

  it('restores the environment default', () => {
    logger.setLevel('debug');
    expect(logger.resetLevel()).toBe('silent');
  });
});
