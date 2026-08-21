// server/workers/sensorPool.js
const { Worker } = require('worker_threads');
const path = require('path');
const os = require('os');

class SensorWorkerPool {
  constructor(size = os.cpus().length) {
    this.size = size;
    this.workers = [];
    this.freeWorkers = [];
    this.queue = [];

    for (let i = 0; i < size; i++) {
      const worker = new Worker(path.resolve(__dirname, 'sensorWorker.js'));
      
      worker.on('message', (message) => {
        // Return worker to pool and handle task callback
        const { task, resolve, reject } = worker.currentTask;
        worker.currentTask = null;
        
        if (message.success) resolve(message.data);
        else reject(new Error(message.error));

        this.freeWorkers.push(worker);
        this.processNext();
      });

      worker.on('error', (err) => {
        console.error('Sensor worker error:', err);
      });

      this.workers.push(worker);
      this.freeWorkers.push(worker);
    }
  }

  runTask(taskData) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task: taskData, resolve, reject });
      this.processNext();
    });
  }

  processNext() {
    if (this.queue.length === 0 || this.freeWorkers.length === 0) return;

    const worker = this.freeWorkers.pop();
    const taskItem = this.queue.shift();

    worker.currentTask = taskItem;
    worker.postMessage(taskItem.task);
  }

  async terminate() {
    await Promise.all(this.workers.map((worker) => worker.terminate()));
  }
}

// Export a singleton instance based on CPU cores
const poolInstance = new SensorWorkerPool();
module.exports = poolInstance;
