import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Cover for #1049.
 *
 * `historicalDataService` calls `getTenantScopedDbName()` and
 * `getTenantScopedStoreName()` at module scope:
 *
 *   const SCOPED_DB_NAME = getTenantScopedDbName(DB_NAME);
 *
 * so when `./tenantService` resolved to a module without those exports, the
 * import threw `TypeError: getTenantScopedDbName is not a function` before any
 * of the module's own code ran. Every other test in this directory failed at
 * collection, which reads as "the suite is broken" rather than "this one import
 * is wrong" — hence a test whose subject is the import itself.
 */
describe('historicalDataService — tenant-scoped storage (#1049)', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('imports without throwing', async () => {
    await expect(import('./historicalDataService')).resolves.toBeDefined();
  });

  it('exports the functions its consumers import', async () => {
    const module = await import('./historicalDataService');

    for (const name of [
      'openDB',
      'getCachedData',
      'setCachedData',
      'pruneCache',
      'fetchHistoricalData',
      'formatHistoricalCSV',
      'getDelimiterForLocale',
      'HISTORY_CACHE_TTL',
    ]) {
      expect(module[name], `expected historicalDataService to export ${name}`).toBeDefined();
    }
  });

  it('opens a database name scoped to the default tenant', async () => {
    const opened = [];
    vi.stubGlobal('indexedDB', {
      open: (name) => {
        opened.push(name);
        const request = { onsuccess: null, onerror: null, onupgradeneeded: null, result: null, error: new Error('stub') };
        setTimeout(() => request.onerror?.({ target: request }), 0);
        return request;
      },
    });

    const { openDB } = await import('./historicalDataService');
    await expect(openDB()).rejects.toBeTruthy();

    expect(opened).toEqual(['PollutionHubDB__default']);
    vi.unstubAllGlobals();
  });

  it('opens a database name scoped to the selected tenant', async () => {
    localStorage.setItem('pch_tenant_id', 'mumbai-municipal');

    const opened = [];
    vi.stubGlobal('indexedDB', {
      open: (name) => {
        opened.push(name);
        const request = { onsuccess: null, onerror: null, onupgradeneeded: null, result: null, error: new Error('stub') };
        setTimeout(() => request.onerror?.({ target: request }), 0);
        return request;
      },
    });

    const { openDB } = await import('./historicalDataService');
    await expect(openDB()).rejects.toBeTruthy();

    // The whole point of #759: two organisations on one browser profile must not
    // share a cache. A shared database name is the failure that scoping prevents.
    expect(opened).toEqual(['PollutionHubDB__mumbai-municipal']);
    vi.unstubAllGlobals();
  });
});
