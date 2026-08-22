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

    // Deduplicate within the batch to prevent useless DB constraint failures
    const uniqueRecordsMap = new Map();
    for (const record of batchToProcess) {
      const sId = record.sensor_id || record.sensorId;
      const tStamp = record.timestamp;
      
      // Only deduplicate if both fields exist (fallback to pushing normally if malformed)
      if (sId && tStamp) {
        const key = `${sId}_${tStamp}`;
        if (!uniqueRecordsMap.has(key)) {
          uniqueRecordsMap.set(key, record);
        }
      } else {
        // Use a unique symbol/object as key if fields are missing so it doesn't get squashed
        uniqueRecordsMap.set(record, record);
      }
    }
    
    const deduplicatedBatch = Array.from(uniqueRecordsMap.values());

    if (deduplicatedBatch.length === 0) return;

    try {
      // TODO: Replace with your actual database bulk insert method
      // e.g., await this.dbClient.sensorData.insertMany(deduplicatedBatch);
      await this.bulkInsert(deduplicatedBatch);
      
      // Calculate and monitor queue lag
      const flushDuration = Date.now() - flushStartTime;
      const timeSinceLastFlush = Date.now() - this.lastFlushTime;
      
      console.log(
        `[Monitor] Flushed ${deduplicatedBatch.length} records. ` +
        `DB Write Time: ${flushDuration}ms | Time since last flush: ${timeSinceLastFlush}ms`
      );
      
      this.lastFlushTime = Date.now();

    } catch (error) {
      console.error('[Error] Failed to flush sensor batch to DB:', error);
      // Depending on strictness, you could push failed records to a Dead Letter Queue (DLQ) here
    }
  }

  /**
   * Placeholder for the real bulk insert.
   *
   * The parameter is prefixed because it is deliberately unused until a database
   * client is wired in — the eslint config treats a leading underscore as "declared
   * to document the contract, not yet consumed". Keeping the name in the signature
   * is what tells the next person what to pass.
   *
   * @param {object[]} _records - The batch that would be written.
   * @returns {Promise<void>}
   */
  async bulkInsert(_records) {
    return new Promise((resolve) => setTimeout(resolve, 50));
  }
}
