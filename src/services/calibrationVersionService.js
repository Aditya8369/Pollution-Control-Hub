const DB_NAME = 'PollutionHubCalibrationDB';
const DB_VERSION = 1;
const STORE_NAME = 'sensor_calibration_versions';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
        });

        store.createIndex('sensorId', 'sensorId', { unique: false });
        store.createIndex('version', 'version', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCalibrationVersion({
  sensorId,
  calibrationParameters,
  createdBy = 'system',
}) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('sensorId');

    const request = index.getAll(sensorId);

    request.onsuccess = () => {
      const versions = request.result || [];

      const nextVersion =
        versions.reduce(
          (maxVersion, record) => Math.max(maxVersion, record.version),
          0
        ) + 1;

      const record = {
        id: `${sensorId}-v${nextVersion}`,
        sensorId,
        version: nextVersion,
        calibrationParameters,
        createdBy,
        createdAt: new Date().toISOString(),
      };

      const putRequest = store.put(record);

      putRequest.onsuccess = () => resolve(record);
      putRequest.onerror = () => reject(putRequest.error);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getCalibrationVersion(sensorId, version) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.get(`${sensorId}-v${version}`);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getCalibrationHistory(sensorId) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.index('sensorId').getAll(sensorId);

    request.onsuccess = () => {
      const versions = request.result || [];
      versions.sort((a, b) => b.version - a.version);
      resolve(versions);
    };

    request.onerror = () => reject(request.error);
  });
}
