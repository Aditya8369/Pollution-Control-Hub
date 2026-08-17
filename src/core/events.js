class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Register a callback for a specific event
   * @param {string} event - The name of the event
   * @param {function} callback - The function to call when the event is emitted
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  /**
   * Remove a callback for a specific event
   * @param {string} event - The name of the event
   * @param {function} callback - The function to remove
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event, calling all registered callbacks with the payload
   * @param {string} event - The name of the event to emit
   * @param {any} [payload] - Optional data to pass to the callbacks
   */
  emit(event, payload) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      for (const callback of callbacks) {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error executing event listener for ${event}:`, error);
        }
      }
    }
  }

  /**
   * Clear all listeners for a specific event or all events
   * @param {string} [event] - The name of the event to clear
   */
  clear(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Export a singleton instance for global app usage
export const eventBus = new EventBus();

// Export the class for testing or instances where isolated buses are needed
export default EventBus;
