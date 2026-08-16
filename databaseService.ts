class DatabaseService {
  constructor(pool) {
    this.pool = pool;
  }

  async readData(query) {
    return await this.pool.query(query);
  }

  async insertData(query, values) {
    return await this.pool.query(query, values);
  }
}

export default DatabaseService;
