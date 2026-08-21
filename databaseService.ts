import { Pool } from 'pg';
import os from 'os';
import http from 'http';

class DatabaseService {
  public pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async readData(query: string) {
    return await this.pool.query(query);
  }

  async insertData(query: string, values?: any[]) {
    return await this.pool.query(query, values);
  }
}

// Calculate the optimal maximum connections based on CPU cores (typically 4 per core)
const cpuCount = os.cpus().length || 1;
const maxConnections = Math.max(2, cpuCount * 4);

// Initialize a connection Pool instance using environment variables
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: maxConnections,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Instantiate the singleton DatabaseService
export const databaseService = new DatabaseService(pool);

// Health-check endpoint server to validate DB health
export function startHealthCheckServer(port: number = 8082): http.Server {
  const server = http.createServer(async (req, res) => {
    if (req.url === '/health' || req.url === '/healthz') {
      try {
        // Run a simple query to verify database connectivity
        await pool.query('SELECT 1');
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
          error: err.message 
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

export default DatabaseService;
