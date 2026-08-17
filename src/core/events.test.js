import { describe, it, expect } from 'vitest';
import EventBus from './events.js';

describe('EventBus', () => {
  it('should trigger the callback once and pass payload', () => {
    const bus = new EventBus();
    let counter = 0;
    
    bus.on('INCREMENT', (payload) => {
      counter += payload || 1;
    });
    
    bus.emit('INCREMENT');
    expect(counter).toBe(1);
    
    bus.emit('INCREMENT', 5);
    expect(counter).toBe(6);
  });

  it('should support multiple listeners', () => {
    const bus = new EventBus();
    let a = 0;
    let b = 0;
    
    bus.on('MULTI', () => a++);
    bus.on('MULTI', () => b++);
    bus.emit('MULTI');
    
    expect(a).toBe(1);
    expect(b).toBe(1);
  });

  it('should support off() to unsubscribe', () => {
    const bus = new EventBus();
    let a = 0;
    const cb = () => a++;
    
    bus.on('TOGGLE', cb);
    bus.emit('TOGGLE');
    expect(a).toBe(1);
    
    bus.off('TOGGLE', cb);
    bus.emit('TOGGLE');
    expect(a).toBe(1);
  });

  it('should clear all listeners for an event', () => {
    const bus = new EventBus();
    let c = 0;
    
    bus.on('CLEAR_TEST', () => c++);
    bus.clear('CLEAR_TEST');
    bus.emit('CLEAR_TEST');
    
    expect(c).toBe(0);
  });
});
