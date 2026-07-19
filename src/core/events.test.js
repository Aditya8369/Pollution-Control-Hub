import { strict as assert } from 'assert';
import EventBus from './events.js';

function runTests() {
  console.log('Running EventBus tests...');
  const bus = new EventBus();

  // Test 1: Basic Emit and Listen
  let counter = 0;
  bus.on('INCREMENT', (payload) => {
    counter += payload || 1;
  });
  
  bus.emit('INCREMENT');
  assert.strictEqual(counter, 1, 'EventBus should trigger the callback once');
  
  bus.emit('INCREMENT', 5);
  assert.strictEqual(counter, 6, 'EventBus should pass the payload correctly');

  // Test 2: Multiple Listeners
  let a = 0;
  let b = 0;
  bus.on('MULTI', () => a++);
  bus.on('MULTI', () => b++);
  bus.emit('MULTI');
  
  assert.strictEqual(a, 1);
  assert.strictEqual(b, 1);

  // Test 3: Unsubscribe (off)
  const cb = () => a++;
  bus.on('TOGGLE', cb);
  bus.emit('TOGGLE');
  assert.strictEqual(a, 2);
  
  bus.off('TOGGLE', cb);
  bus.emit('TOGGLE');
  assert.strictEqual(a, 2, 'Callback should not run after being removed');

  // Test 4: Clear all
  let c = 0;
  bus.on('CLEAR_TEST', () => c++);
  bus.clear('CLEAR_TEST');
  bus.emit('CLEAR_TEST');
  assert.strictEqual(c, 0, 'Callback should not run after clear()');

  console.log('All EventBus tests passed successfully! ✅');
}

runTests();
