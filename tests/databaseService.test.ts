import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Pool } from 'pg';
import http from 'http';

// Mock pg module
vi.mock('pg', () => {
  const mockQuery = vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });
  const MockPool = vi.fn().mockImplementation(() => ({
    query: mockQuery,
    connect: vi.fn(),
    end: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  }));
  return { Pool: MockPool };
});

describe('DatabaseService and Connection Pool', () => {
  beforeEach(() => {
    vi.mocked(Pool).mockClear();
  });

  afterEach(async () => {
    const { closePool } = await import('../databaseService');
    await closePool();
  });

  it('does not open a pool merely because the module was imported', async () => {
    // The pool used to be a module-level `new Pool(...)`, so importing this file
    // for a type or for startHealthCheckServer opened connections as a side
    // effect. It is now created on first use.
    await import('../databaseService');
    expect(Pool).not.toHaveBeenCalled();
  });

  it('calculates max connections based on server CPU', async () => {
    const { getPool } = await import('../databaseService');

    getPool();

    expect(Pool).toHaveBeenCalled();
    const poolConfig = vi.mocked(Pool).mock.calls[0][0];
    expect(poolConfig).toBeDefined();
    expect(poolConfig?.max).toBeGreaterThanOrEqual(2);
  });

  it('creates the pool once and reuses it', async () => {
    const { getPool } = await import('../databaseService');

    const first = getPool();
    const second = getPool();

    expect(first).toBe(second);
    expect(Pool).toHaveBeenCalledTimes(1);
  });

  it('attaches an error handler, so an idle client failure does not kill the process', async () => {
    // pg emits `error` on the pool when a client dies while idle. An `error`
    // event with no listener is an unhandled exception in Node.
    const { getPool } = await import('../databaseService');

    const pool = getPool();

    expect(pool.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('delegates readData and insertData queries to the pool', async () => {
    const { getDatabaseService, getPool } = await import('../databaseService');
    const service = getDatabaseService();
    const pool = getPool();

    await service.readData('SELECT * FROM sensor_readings');
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM sensor_readings', undefined);

    await service.insertData('INSERT INTO sensor_readings (pm25) VALUES ($1)', [12.5]);
    expect(pool.query).toHaveBeenCalledWith('INSERT INTO sensor_readings (pm25) VALUES ($1)', [12.5]);
  });

  it('health check server returns UP when db query succeeds', async () => {
    const { startHealthCheckServer, getPool } = await import('../databaseService');

    vi.mocked(getPool().query).mockResolvedValueOnce({ rows: [] } as any);

    const port = 8089;
    const server = startHealthCheckServer(port);

    const getHealth = () => new Promise<string>((resolve, reject) => {
      http.get(`http://localhost:${port}/health`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });

    try {
      const response = await getHealth();
      const status = JSON.parse(response);
      expect(status.status).toBe('UP');
      expect(status.database).toBe('HEALTHY');
    } finally {
      server.close();
    }
  });

  it('health check server returns DOWN when db query fails', async () => {
    const { startHealthCheckServer, getPool } = await import('../databaseService');

    vi.mocked(getPool().query).mockRejectedValueOnce(new Error('Connection failure'));

    const port = 8090;
    const server = startHealthCheckServer(port);

    const getHealth = () => new Promise<{ statusCode?: number, body: string }>((resolve, reject) => {
      http.get(`http://localhost:${port}/health`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
      }).on('error', reject);
    });

    try {
      const response = await getHealth();
      expect(response.statusCode).toBe(500);
      const status = JSON.parse(response.body);
      expect(status.status).toBe('DOWN');
      expect(status.database).toBe('UNHEALTHY');
      expect(status.error).toBe('Connection failure');
    } finally {
      server.close();
    }
  });

  it('health check server returns DOWN when the db hangs rather than failing', async () => {
    // Without a timeout the query never settles, the response is never written,
    // and the health check hangs - the opposite of what a health check is for.
    // connectionTimeoutMillis does not cover this: it bounds acquiring a client,
    // not running a query on one.
    const { startHealthCheckServer, getPool } = await import('../databaseService');

    vi.mocked(getPool().query).mockImplementationOnce(() => new Promise(() => {}) as any);

    const port = 8091;
    const server = startHealthCheckServer(port, 100);

    const getHealth = () => new Promise<{ statusCode?: number, body: string }>((resolve, reject) => {
      http.get(`http://localhost:${port}/health`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
      }).on('error', reject);
    });

    try {
      const response = await getHealth();
      expect(response.statusCode).toBe(500);
      const status = JSON.parse(response.body);
      expect(status.status).toBe('DOWN');
      expect(status.error).toMatch(/timed out/i);
    } finally {
      server.close();
    }
  });

  it('health check server 404s anything that is not a health path', async () => {
    const { startHealthCheckServer } = await import('../databaseService');

    const port = 8092;
    const server = startHealthCheckServer(port);

    const get = (path: string) => new Promise<number | undefined>((resolve, reject) => {
      http.get(`http://localhost:${port}${path}`, (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      }).on('error', reject);
    });

    try {
      expect(await get('/nope')).toBe(404);
      expect(await get('/healthz')).toBe(200);
    } finally {
      server.close();
    }
  });
});
