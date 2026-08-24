import { Pool } from 'pg';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';
import os from 'os';
import http from 'http';

/** How long a cached read stays fresh, in milliseconds. */
const DEFAULT_CACHE_TTL_MS = 30000;

/** Upper bound on distinct cached queries, so a parameter sweep cannot grow without limit. */
const DEFAULT_CACHE_MAX_ENTRIES = 200;

/** How long the health check waits for the database before declaring it down. */
const DEFAULT_HEALTH_TIMEOUT_MS = 3000;

interface CacheEntry<T> {
  rows: T[];
  storedAt: number;
}

export interface DatabaseServiceOptions {
  /** Freshness window for cached reads. Set to 0 to disable caching entirely. */
  cacheTtlMs?: number;
  /** Maximum number of distinct queries held in the cache. */
  cacheMaxEntries?: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  invalidations: number;
  lastUpdated: number;
}

/**
 * A thin wrapper over a `pg` pool with a short-lived read cache.
 *
 * The cache used to exist in name only: the constructor allocated
 * `this.cache = new Map()` and `this.lastUpdated = Date.now()`, and no method
 * ever read either one. `readData` went straight to the pool on every call and
 * `insertData` invalidated nothing, so the class advertised caching in its shape
 * and delivered none of it. Neither field was declared, so `tsc` rejected the
 * file outright.
 */
class DatabaseService {
  public pool: Pool;

  private cache: Map<string, CacheEntry<any>>;
  private cacheTtlMs: number;
  private cacheMaxEntries: number;

  /** When the cache was last invalidated by a write. */
  public lastUpdated: number;

  private hits = 0;
  private misses = 0;
  private invalidations = 0;

  constructor(pool: Pool, options: DatabaseServiceOptions = {}) {
    this.pool = pool;
    this.cache = new Map();
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.cacheMaxEntries = options.cacheMaxEntries ?? DEFAULT_CACHE_MAX_ENTRIES;
    this.lastUpdated = Date.now();
  }

  /**
   * Runs a read query, serving it from the cache when a fresh copy is held.
   *
   * Returns rows rather than pg's `QueryResult` envelope. Every caller wanted
   * the rows and had to reach into `.rows` to get them, which is also what the
   * integration test was asserting when it failed.
   *
   * Rows handed back are to be treated as read-only. The array is the caller's
   * own, but the row objects inside it are shared with the cache entry -
   * deep-cloning every row on every read would cost more than the cache saves.
   *
   * @param query SQL text.
   * @param values Bound parameters. Part of the cache key, so two different
   *   parameter sets never share an entry.
   */
  async readData<T extends QueryResultRow = any>(query: string, values?: any[]): Promise<T[]> {
    const key = DatabaseService.cacheKey(query, values);

    const cached = this.cache.get(key);
    if (cached && !this.isExpired(cached)) {
      this.hits += 1;
      // A copy of the array, so a caller that pushes or sorts what it got back
      // cannot reshape the entry the next caller will be handed. The row objects
      // themselves are shared - see the note on this method.
      return [...cached.rows] as T[];
    }

    this.misses += 1;
    const result = (await this.pool.query(query, values)) as QueryResult<T> | undefined;
    const rows = result?.rows ?? [];

    if (this.cacheTtlMs > 0) {
      this.store(key, rows);
    }

    return [...rows];
  }

  /**
   * Runs a write query and invalidates the read cache.
   *
   * Invalidation is wholesale rather than per-table. Working out which cached
   * SELECTs a given INSERT affects means parsing SQL, and a cache that is
   * occasionally too eager is a performance question; one that is occasionally
   * not eager enough is a correctness one.
   */
  async insertData(query: string, values?: any[]): Promise<QueryResult | undefined> {
    const result = (await this.pool.query(query, values)) as QueryResult | undefined;
    this.invalidateCache();
    return result;
  }

  /**
   * Runs several statements inside one transaction, then invalidates the cache.
   *
   * Without this, a caller doing multi-statement work has to reach past the
   * service to `pool.connect()` and the cache never learns anything changed.
   */
  async withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      this.invalidateCache();
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // A rollback can fail if the connection already died. The original
        // error is the one worth surfacing, so it is not masked here.
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /** Drops every cached read. */
  invalidateCache(): void {
    if (this.cache.size > 0) {
      this.invalidations += 1;
    }
    this.cache.clear();
    this.lastUpdated = Date.now();
  }

  /** Counters for the cache, so its usefulness can be observed rather than assumed. */
  getCacheStats(): CacheStats {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      invalidations: this.invalidations,
      lastUpdated: this.lastUpdated,
    };
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.storedAt >= this.cacheTtlMs;
  }

  private store(key: string, rows: any[]): void {
    // Evict the oldest insertion first. A Map iterates in insertion order, so
    // the first key is the least recently stored.
    if (this.cache.size >= this.cacheMaxEntries) {
      const oldest = this.cache.keys().next();
      if (!oldest.done) {
        this.cache.delete(oldest.value);
      }
    }
    this.cache.set(key, { rows: [...rows], storedAt: Date.now() });
  }

  private static cacheKey(query: string, values?: any[]): string {
    return values && values.length > 0 ? `${query} ${JSON.stringify(values)}` : query;
  }
}

// Calculate the optimal maximum connections based on CPU cores (typically 4 per core)
const cpuCount = os.cpus().length || 1;
export const maxConnections = Math.max(2, cpuCount * 4);

let poolInstance: Pool | null = null;
let serviceInstance: DatabaseService | null = null;

/**
 * The shared connection pool, created on first use.
 *
 * This used to be a module-level `export const pool = new Pool(...)`, so
 * importing this file for any reason at all - a type, the health check, a unit
 * test - opened a pool. `tests/databaseService.test.ts` only got away with it by
 * mocking `pg` wholesale.
 */
export function getPool(): Pool {
  if (poolInstance) return poolInstance;

  poolInstance = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: maxConnections,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Required, not optional. `pg` emits `error` on the pool when a client dies
  // while idle - a server restart, a connection reaper, a failover. An `error`
  // event with no listener is an unhandled exception in Node, which takes the
  // whole process down.
  if (typeof poolInstance.on === 'function') {
    poolInstance.on('error', (err: Error) => {
      console.error('[databaseService] idle client error:', err.message);
    });
  }

  return poolInstance;
}

/** The shared service, created on first use. */
export function getDatabaseService(): DatabaseService {
  if (!serviceInstance) {
    serviceInstance = new DatabaseService(getPool());
  }
  return serviceInstance;
}

/** Closes the pool and drops both singletons. Intended for shutdown and for tests. */
export async function closePool(): Promise<void> {
  const existing = poolInstance;
  poolInstance = null;
  serviceInstance = null;
  if (existing && typeof existing.end === 'function') {
    await existing.end();
  }
}

/**
 * Health-check endpoint server to validate DB health.
 *
 * The probe is raced against a timeout. Without one, a database that hangs
 * rather than failing leaves `pool.query` unsettled, the response never written
 * and the check hanging - the opposite of what a health check is for.
 * `connectionTimeoutMillis` does not help here: it bounds acquiring a client,
 * not running a query on one.
 */
export function startHealthCheckServer(
  port: number = 8082,
  timeoutMs: number = DEFAULT_HEALTH_TIMEOUT_MS,
): http.Server {
  const server = http.createServer(async (req, res) => {
    if (req.url === '/health' || req.url === '/healthz') {
      try {
        await withTimeout(getPool().query('SELECT 1'), timeoutMs);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'UP',
          database: 'HEALTHY',
          maxConnections
        }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'DOWN',
          database: 'UNHEALTHY',
          error: err?.message ?? String(err)
        }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  server.listen(port, () => {
    console.log(`Database health-check server listening on http://localhost:${port}/health`);
  });

  return server;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Health check timed out after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer)) as Promise<T>;
}

export default DatabaseService;
