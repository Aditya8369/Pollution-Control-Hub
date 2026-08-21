import { describe, it, expect, vi, beforeEach } from 'vitest';
import DatabaseService from '../../databaseService';

describe('DatabaseService Integration', () => {
  let db;
  let mockPool;

  beforeEach(() => {
    mockPool = {
      query: vi.fn(),
    };
    db = new DatabaseService(mockPool);
  });

  it('should invalidate cache on DB write and return fresh results', async () => {
    // Mock the first read
    mockPool.query.mockResolvedValueOnce([{ id: 1, name: 'old_data' }]);
    
    // First read should hit the database and cache the result
    const result1 = await db.readData('SELECT * FROM data');
    expect(result1).toEqual([{ id: 1, name: 'old_data' }]);
    expect(mockPool.query).toHaveBeenCalledTimes(1);

    // Second read should return from cache
    const result2 = await db.readData('SELECT * FROM data');
    expect(result2).toEqual([{ id: 1, name: 'old_data' }]);
    expect(mockPool.query).toHaveBeenCalledTimes(1); // Still 1

    // Simulate a delay so Date.now() changes for the cache timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    // Perform an insert/write operation which should invalidate the cache
    mockPool.query.mockResolvedValueOnce({ inserted: true });
    await db.insertData('INSERT INTO data (name) VALUES ($1)', ['new_data']);
    expect(mockPool.query).toHaveBeenCalledTimes(2);

    // Mock the new read data
    mockPool.query.mockResolvedValueOnce([{ id: 1, name: 'old_data' }, { id: 2, name: 'new_data' }]);

    // Third read should hit the database again because cache was invalidated
    const result3 = await db.readData('SELECT * FROM data');
    expect(result3).toEqual([{ id: 1, name: 'old_data' }, { id: 2, name: 'new_data' }]);
    expect(mockPool.query).toHaveBeenCalledTimes(3);
  });
});
