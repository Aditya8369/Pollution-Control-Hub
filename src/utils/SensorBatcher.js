export class SensorBatcher {
  constructor(dbClient) {
    this.dbClient = dbClient;
    this.buffer = [];
    this.batchSize = 100;
    this.flushIntervalMs = 500;
    this.timer = null;
    this.lastFlushTime = Date.now();
  }

  async addRecord(record) {
    this.buffer.push(record);

    // Flush immediately if we hit the max batch size
    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    } else if (!this.timer) {
      // Otherwise, start the 500ms countdown if not already running
      this.timer = setTimeout(() => this.flush(), this.flushIntervalMs);
    }
  }

  async flush() {
    // Clear the timer so we don't double-flush
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.buffer.length === 0) return;

    const batchToProcess = [...this.buffer];
    this.buffer = []; // Reset buffer immediately to accept new records

    const flushStartTime = Date.now();

    try {
      // TODO: Replace with your actual database bulk insert method
      // e.g., await this.dbClient.sensorData.insertMany(batchToProcess);
      await this.bulkInsert(batchToProcess);
      
      // Calculate and monitor queue lag
      const flushDuration = Date.now() - flushStartTime;
      const timeSinceLastFlush = Date.now() - this.lastFlushTime;
      
      console.log(
        `[Monitor] Flushed ${batchToProcess.length} records. ` +
        `DB Write Time: ${flushDuration}ms | Time since last flush: ${timeSinceLastFlush}ms`
      );
      
      this.lastFlushTime = Date.now();

    } catch (error) {
      console.error('[Error] Failed to flush sensor batch to DB:', error);
      // Depending on strictness, you could push failed records to a Dead Letter Queue (DLQ) here
    }
  }

  // Mock DB bulk insert function
  async bulkInsert(records) {
    return new Promise((resolve) => setTimeout(resolve, 50)); 
  }
}
