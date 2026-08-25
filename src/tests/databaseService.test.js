import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DatabaseService from '../../databaseService';

/** A pg-shaped result envelope, which is what the real driver hands back. */
const result = (rows) => ({ rows, rowCount: rows.length, command: 'SELECT', fields: [], oid: 0 });

describe('DatabaseService Integration', () => {
  let db;
  let mockPool;

  beforeEach(() => {
    mockPool = {
      query: vi.fn(),
      connect: vi.fn(),
    };
    db = new DatabaseService(mockPool);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should invalidate cache on DB write and return fresh results', async () => {
    mockPool.query.mockResolvedValueOnce(result([{ id: 1, name: 'old_data' }]));

    // First read should hit the database and cache the result
    const result1 = await db.readData('SELECT * FROM data');
    expect(result1).toEqual([{ id: 1, name: 'old_data' }]);
    expect(mockPool.query).toHaveBeenCalledTimes(1);

    // Second read should return from cache
    const result2 = await db.readData('SELECT * FROM data');
    expect(result2).toEqual([{ id: 1, name: 'old_data' }]);
    expect(mockPool.query).toHaveBeenCalledTimes(1); // Still 1

    // Perform an insert/write operation which should invalidate the cache
    mockPool.query.mockResolvedValueOnce(result([]));
    await db.insertData('INSERT INTO data (name) VALUES ($1)', ['new_data']);
    expect(mockPool.query).toHaveBeenCalledTimes(2);

    mockPool.query.mockResolvedValueOnce(
      result([{ id: 1, name: 'old_data' }, { id: 2, name: 'new_data' }])
    );

    // Third read should hit the database again because cache was invalidated
    const result3 = await db.readData('SELECT * FROM data');
    expect(result3).toEqual([{ id: 1, name: 'old_data' }, { id: 2, name: 'new_data' }]);
    expect(mockPool.query).toHaveBeenCalledTimes(3);
  });

  describe('read cache', () => {
    it('returns rows rather than the pg result envelope', async () => {
      mockPool.query.mockResolvedValueOnce(result([{ id: 7 }]));
      const rows = await db.readData('SELECT 1');
      expect(Array.isArray(rows)).toBe(true);
      expect(rows).toEqual([{ id: 7 }]);
    });

    it('keys the cache on the bound parameters, not just the SQL text', async () => {
      // Two reads of the same prepared statement with different parameters must
      // not share an entry. Keying on the query text alone would serve Delhi's
      // rows for a Mumbai request.
      mockPool.query.mockResolvedValueOnce(result([{ city: 'Delhi' }]));
      mockPool.query.mockResolvedValueOnce(result([{ city: 'Mumbai' }]));

      const delhi = await db.readData('SELECT * FROM readings WHERE city = $1', ['Delhi']);
      const mumbai = await db.readData('SELECT * FROM readings WHERE city = $1', ['Mumbai']);

      expect(delhi).toEqual([{ city: 'Delhi' }]);
      expect(mumbai).toEqual([{ city: 'Mumbai' }]);
      expect(mockPool.query).toHaveBeenCalledTimes(2);

      // ...and each is independently cached from there.
      expect(await db.readData('SELECT * FROM readings WHERE city = $1', ['Delhi']))
        .toEqual([{ city: 'Delhi' }]);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('expires an entry once the TTL has passed', async () => {
      vi.useFakeTimers();
      const shortLived = new DatabaseService(mockPool, { cacheTtlMs: 1000 });

      mockPool.query.mockResolvedValue(result([{ id: 1 }]));
      await shortLived.readData('SELECT 1');
      expect(mockPool.query).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(999);
      await shortLived.readData('SELECT 1');
      expect(mockPool.query).toHaveBeenCalledTimes(1); // still fresh

      vi.advanceTimersByTime(2);
      await shortLived.readData('SELECT 1');
      expect(mockPool.query).toHaveBeenCalledTimes(2); // expired, refetched
    });

    it('bypasses the cache entirely when the TTL is zero', async () => {
      const uncached = new DatabaseService(mockPool, { cacheTtlMs: 0 });
      mockPool.query.mockResolvedValue(result([{ id: 1 }]));

      await uncached.readData('SELECT 1');
      await uncached.readData('SELECT 1');

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(uncached.getCacheStats().size).toBe(0);
    });

    it('evicts the oldest entry rather than growing without limit', async () => {
      const tiny = new DatabaseService(mockPool, { cacheMaxEntries: 2 });
      mockPool.query.mockResolvedValue(result([{ id: 1 }]));

      await tiny.readData('SELECT 1');
      await tiny.readData('SELECT 2');
      await tiny.readData('SELECT 3');

      expect(tiny.getCacheStats().size).toBe(2);

      // 'SELECT 1' was evicted, so it goes back to the pool.
      const before = mockPool.query.mock.calls.length;
      await tiny.readData('SELECT 1');
      expect(mockPool.query.mock.calls.length).toBe(before + 1);
    });

    it('hands out its own array, so a caller reshaping the result cannot poison the cache', async () => {
      // Array-level isolation only. Deep-cloning every row on every read would
      // cost more than the cache saves; the contract is that rows are read-only,
      // and it is documented on readData.
      mockPool.query.mockResolvedValueOnce(result([{ id: 1, name: 'original' }]));

      const first = await db.readData('SELECT * FROM data');
      first.push({ id: 2, name: 'injected' });
      first.sort(() => -1);

      const second = await db.readData('SELECT * FROM data');
      expect(second).toEqual([{ id: 1, name: 'original' }]);
      expect(second).toHaveLength(1);
    });

    it('caches an empty result set instead of refetching it every time', async () => {
      mockPool.query.mockResolvedValueOnce(result([]));

      expect(await db.readData('SELECT * FROM empty')).toEqual([]);
      expect(await db.readData('SELECT * FROM empty')).toEqual([]);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('survives a driver that resolves without a rows property', async () => {
      mockPool.query.mockResolvedValueOnce(undefined);
      expect(await db.readData('SELECT 1')).toEqual([]);
    });

    it('does not cache a failed query', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('connection reset'));
      await expect(db.readData('SELECT 1')).rejects.toThrow('connection reset');

      mockPool.query.mockResolvedValueOnce(result([{ id: 1 }]));
      expect(await db.readData('SELECT 1')).toEqual([{ id: 1 }]);
    });

    it('reports hit, miss and invalidation counts', async () => {
      mockPool.query.mockResolvedValue(result([{ id: 1 }]));

      await db.readData('SELECT 1');   // miss
      await db.readData('SELECT 1');   // hit
      await db.readData('SELECT 1');   // hit
      await db.insertData('INSERT INTO data DEFAULT VALUES');

      const stats = db.getCacheStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.invalidations).toBe(1);
      expect(stats.size).toBe(0);
    });

    it('moves lastUpdated forward on a write', async () => {
      vi.useFakeTimers();
      const fresh = new DatabaseService(mockPool);
      const before = fresh.getCacheStats().lastUpdated;

      vi.advanceTimersByTime(5000);
      mockPool.query.mockResolvedValueOnce(result([]));
      await fresh.insertData('INSERT INTO data DEFAULT VALUES');

      expect(fresh.getCacheStats().lastUpdated).toBeGreaterThan(before);
    });

    it('can be invalidated by hand', async () => {
      mockPool.query.mockResolvedValue(result([{ id: 1 }]));
      await db.readData('SELECT 1');
      expect(db.getCacheStats().size).toBe(1);

      db.invalidateCache();
      expect(db.getCacheStats().size).toBe(0);
    });
  });

  describe('withTransaction', () => {
    let client;

    beforeEach(() => {
      client = { query: vi.fn().mockResolvedValue(result([])), release: vi.fn() };
      mockPool.connect.mockResolvedValue(client);
    });

    it('wraps the work in BEGIN/COMMIT and releases the client', async () => {
      const returned = await db.withTransaction(async (c) => {
        await c.query('INSERT INTO data (name) VALUES ($1)', ['a']);
        return 'done';
      });

      expect(returned).toBe('done');
      expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(client.query).toHaveBeenLastCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('rolls back and rethrows when the work fails', async () => {
      await expect(
        db.withTransaction(async () => { throw new Error('constraint violation'); })
      ).rejects.toThrow('constraint violation');

      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.query).not.toHaveBeenCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('surfaces the original error even when the rollback itself fails', async () => {
      client.query.mockImplementation((sql) => {
        if (sql === 'ROLLBACK') return Promise.reject(new Error('connection already gone'));
        return Promise.resolve(result([]));
      });

      await expect(
        db.withTransaction(async () => { throw new Error('the real problem'); })
      ).rejects.toThrow('the real problem');

      expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('invalidates the cache once the transaction commits', async () => {
      mockPool.query.mockResolvedValue(result([{ id: 1 }]));
      await db.readData('SELECT 1');
      expect(db.getCacheStats().size).toBe(1);

      await db.withTransaction(async (c) => { await c.query('UPDATE data SET name = $1', ['x']); });

      expect(db.getCacheStats().size).toBe(0);
    });

    it('leaves the cache alone when the transaction rolls back', async () => {
      mockPool.query.mockResolvedValue(result([{ id: 1 }]));
      await db.readData('SELECT 1');

      await expect(db.withTransaction(async () => { throw new Error('nope'); })).rejects.toThrow();

      expect(db.getCacheStats().size).toBe(1);
    });
  });
});
