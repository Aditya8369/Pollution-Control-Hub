import { describe, it, expect, vi } from 'vitest';
import { Pool } from 'pg';
import http from 'http';

// Mock pg module
vi.mock('pg', () => {
  const mockQuery = vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });
  const MockPool = vi.fn().mockImplementation(() => ({
    query: mockQuery,
    on: vi.fn(),
  }));
  return { Pool: MockPool };
});

describe('DatabaseService and Connection Pool', () => {
  it('calculates max connections based on server CPU', async () => {
    // Import databaseService which initializes the pool
    const { pool } = await import('../databaseService');
    
    // Verify that Pool was instantiated
    expect(Pool).toHaveBeenCalled();
    const poolConfig = vi.mocked(Pool).mock.calls[0][0];
    expect(poolConfig).toBeDefined();
    expect(poolConfig?.max).toBeGreaterThanOrEqual(2);
  });

  it('delegates readData and insertData queries to the pool', async () => {
    const { databaseService, pool } = await import('../databaseService');
    
    await databaseService.readData('SELECT * FROM sensor_readings');
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM sensor_readings');

    await databaseService.insertData('INSERT INTO sensor_readings (pm25) VALUES ($1)', [12.5]);
    expect(pool.query).toHaveBeenCalledWith('INSERT INTO sensor_readings (pm25) VALUES ($1)', [12.5]);
  });

  it('health check server returns UP when db query succeeds', async () => {
    const { startHealthCheckServer, pool } = await import('../databaseService');
    
    // Mock successful query
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] });

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
    const { startHealthCheckServer, pool } = await import('../databaseService');
    
    // Mock failed query
    vi.mocked(pool.query).mockRejectedValueOnce(new Error('Connection failure'));

    const port = 8090;
    const server = startHealthCheckServer(port);

    const getHealth = () => new Promise<{statusCode?: number, body: string}>((resolve, reject) => {
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
});
