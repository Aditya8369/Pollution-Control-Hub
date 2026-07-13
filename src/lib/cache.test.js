import { strict as assert } from 'assert';
import { MultiLevelCache } from './cache.js';

// Mock localStorage for Node.js environment
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = value.toString(); },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; },
  get length() { return Object.keys(this.store).length; },
  key(i) { return Object.keys(this.store)[i] || null; }
};

async function runTests() {
  console.log("Running MultiLevelCache LRU tests...");

  // Test 1: Set and Get
  let cache = new MultiLevelCache('test', 1000, 2);
  cache.set('a', 1);
  assert.strictEqual(cache.get('a'), 1, "Cache should return 1 for key 'a'");
  assert.strictEqual(cache.get('b'), null, "Cache should return null for missing key 'b'");

  // Test 2: LRU Eviction Capacity
  cache = new MultiLevelCache('test2', 1000, 2);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3); // Should evict 'a'
  
  assert.strictEqual(cache.get('a'), null, "Cache should have evicted 'a'");
  assert.strictEqual(cache.get('b'), 2);
  assert.strictEqual(cache.get('c'), 3);

  // Test 3: LRU Refresh Position
  cache = new MultiLevelCache('test3', 1000, 2);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.get('a'); // refresh 'a'
  cache.set('c', 3); // should evict 'b' instead of 'a'

  assert.strictEqual(cache.get('b'), null, "Cache should have evicted 'b' instead of 'a'");
  assert.strictEqual(cache.get('a'), 1);
  assert.strictEqual(cache.get('c'), 3);

  // Test 4: TTL Expiration
  cache = new MultiLevelCache('test4', 100, 2); // 100ms TTL
  cache.set('a', 1);
  assert.strictEqual(cache.get('a'), 1);
  
  await new Promise(res => setTimeout(res, 150)); // wait 150ms
  assert.strictEqual(cache.get('a'), null, "Cache should return null for expired key");

  // Test 5: Invalidate
  cache = new MultiLevelCache('test5', 1000, 2);
  cache.set('a', 1);
  cache.invalidate('a');
  assert.strictEqual(cache.get('a'), null, "Cache should return null after invalidation");

  console.log("All cache tests passed successfully! ✅");
}

runTests().catch(err => {
  console.error("Test failed!", err);
  process.exit(1);
});
