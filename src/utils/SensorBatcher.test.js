import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SensorBatcher } from './SensorBatcher';

describe('SensorBatcher deduplication integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('stores normal unique readings correctly', async () => {
    const mockDbClient = {};
    const batcher = new SensorBatcher(mockDbClient);
    
    // Spy on the bulkInsert method to verify what gets inserted
    const bulkInsertSpy = vi.spyOn(batcher, 'bulkInsert').mockResolvedValue(true);

    const record1 = { sensor_id: 's1', timestamp: '2023-10-01T12:00:00Z', value: 10 };
    const record2 = { sensor_id: 's2', timestamp: '2023-10-01T12:00:00Z', value: 12 };
    const record3 = { sensorId: 's1', timestamp: '2023-10-01T12:05:00Z', value: 15 };

    await batcher.addRecord(record1);
    await batcher.addRecord(record2);
    await batcher.addRecord(record3);

    // Fast-forward to trigger the 500ms flush
    await vi.advanceTimersByTimeAsync(600);

    expect(bulkInsertSpy).toHaveBeenCalledTimes(1);
    
    // Verify all 3 unique records were included
    const insertedBatch = bulkInsertSpy.mock.calls[0][0];
    expect(insertedBatch).toHaveLength(3);
    expect(insertedBatch).toContain(record1);
    expect(insertedBatch).toContain(record2);
    expect(insertedBatch).toContain(record3);
  });

  it('deduplicates identical sensor readings submitted multiple times in the same batch', async () => {
    const mockDbClient = {};
    const batcher = new SensorBatcher(mockDbClient);
    
    const bulkInsertSpy = vi.spyOn(batcher, 'bulkInsert').mockResolvedValue(true);

    const originalRecord = { sensor_id: 's1', timestamp: '2023-10-01T12:00:00Z', value: 10 };
    const duplicateRecord = { sensor_id: 's1', timestamp: '2023-10-01T12:00:00Z', value: 10 };
    const anotherDuplicate = { sensorId: 's1', timestamp: '2023-10-01T12:00:00Z', value: 10 }; // Using sensorId instead of sensor_id
    
    const differentRecord = { sensor_id: 's2', timestamp: '2023-10-01T12:00:00Z', value: 12 };

    await batcher.addRecord(originalRecord);
    await batcher.addRecord(duplicateRecord);
    await batcher.addRecord(differentRecord);
    await batcher.addRecord(anotherDuplicate);

    // Fast-forward to trigger flush
    await vi.advanceTimersByTimeAsync(600);

    expect(bulkInsertSpy).toHaveBeenCalledTimes(1);
    
    const insertedBatch = bulkInsertSpy.mock.calls[0][0];
    // Should only have 2 records: the deduplicated s1 and the unique s2
    expect(insertedBatch).toHaveLength(2);
    expect(insertedBatch).toContain(originalRecord);
    expect(insertedBatch).toContain(differentRecord);
  });
  
  it('handles duplicate insert attempts gracefully without crashing', async () => {
    const mockDbClient = {};
    const batcher = new SensorBatcher(mockDbClient);
    
    // Simulate a database constraint violation error
    const bulkInsertSpy = vi.spyOn(batcher, 'bulkInsert').mockRejectedValue(new Error('Unique constraint failed'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const record = { sensor_id: 's1', timestamp: '2023-10-01T12:00:00Z', value: 10 };

    await batcher.addRecord(record);
    
    // This should NOT throw an error, as it's handled gracefully in the flush method
    await vi.advanceTimersByTimeAsync(600);

    expect(bulkInsertSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to flush sensor batch to DB'),
      expect.any(Error)
    );
  });
});
