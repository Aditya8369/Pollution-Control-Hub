class DatabaseService {
  private cache: Map<string, { data: any; timestamp: number }>;
  private lastUpdated: number;
  private pool: any;

  constructor(pool: any) {
    this.pool = pool;
    this.cache = new Map();
    this.lastUpdated = Date.now();
  }

  async readData(query: string) {
    const cached = this.cache.get(query);
    if (cached && cached.timestamp >= this.lastUpdated) {
      return cached.data;
    }
    const data = await this.pool.query(query);
    this.cache.set(query, { data, timestamp: Date.now() });
    return data;
  }

  async insertData(query: string, values: any[]) {
    const result = await this.pool.query(query, values);
    this.lastUpdated = Date.now();
    return result;
  }
}

export default DatabaseService;
