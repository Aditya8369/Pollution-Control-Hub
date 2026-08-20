/**
 * Versioned sensor calibration parameters, stored in IndexedDB.
 *
 * The previous version of this module opened a fresh connection on every call and never
 * closed any of them. `CalibrationHistory` is mounted from `HistoricalAnalysis`, and
 * every interaction goes through one of the three exported functions — loading the panel
 * is one connection, saving is two, viewing ten revisions is ten more. An `IDBDatabase`
 * is only collected once closed, so those accumulated for as long as the tab was open.
 *
 * That mattered because `openDB` also had no `onblocked` handler. `indexedDB.open()`
 * fires `blocked` — not `error`, not `success` — when another connection is still open
 * at a lower version, and with no handler the promise never settles. `await openDB()`
 * hung, `loadHistory()`'s `finally` never ran, and the panel sat on "Loading calibration
 * history..." forever with nothing to retry and no error to show. The two ways to reach
 * that were a second tab and the next `DB_VERSION` bump, which is not hypothetical for a
 * store that already has three indexes. See #898.
 */

const DB_NAME = 'PollutionHubCalibrationDB';
const DB_VERSION = 1;
const STORE_NAME = 'sensor_calibration_versions';

/**
 * The one connection, shared by every caller.
 *
 * @type {Promise<IDBDatabase>|null}
 */
let connection = null;

/**
 * Builds the schema. Runs only on a version change.
 *
 * @param {IDBDatabase} db
 */
function upgrade(db) {
  if (db.objectStoreNames.contains(STORE_NAME)) return;

  const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
  store.createIndex('sensorId', 'sensorId', { unique: false });
  store.createIndex('version', 'version', { unique: false });
  store.createIndex('createdAt', 'createdAt', { unique: false });
}

/**
 * Opens the database, once.
 *
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  if (connection) return connection;

  connection = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser has no IndexedDB, so calibration history cannot be stored.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => upgrade(request.result);

    request.onblocked = () => {
      // Another connection is holding the old version open. Previously this left the
      // promise pending forever, which the UI could not distinguish from a slow read.
      reject(
        new Error(
          'Another tab has the calibration database open. Close it and reload to continue.'
        )
      );
    };

    request.onerror = () => reject(request.error ?? new Error('Could not open the calibration database.'));

    request.onsuccess = () => {
      const db = request.result;

      // Be the tab that yields. If another tab needs to upgrade the schema, holding this
      // connection open is what blocks it — the failure this module used to cause for
      // itself. Dropping the cache means the next call reopens rather than reusing a
      // handle that is on its way out.
      db.onversionchange = () => {
        db.close();
        connection = null;
      };
      db.onclose = () => {
        connection = null;
      };

      resolve(db);
    };
  }).catch((error) => {
    // A failed open must not be cached, or one blocked attempt poisons the module for
    // the rest of the session.
    connection = null;
    throw error;
  });

  return connection;
}

/**
 * Drops the cached connection without closing it. Tests only.
 */
export function resetConnection() {
  connection = null;
}

/**
 * Rejects a sensor id that would widen a lookup instead of narrowing it.
 *
 * `IDBIndex.getAll(undefined)` is not "no results" — an undefined query is an unbounded
 * key range, so it returns every record in the store. Without this guard,
 * `saveCalibrationVersion({ sensorId: undefined })` numbered its version from the highest
 * across all sensors and wrote it under the key `"undefined-v7"`, and
 * `getCalibrationHistory(undefined)` handed back another sensor's revisions.
 *
 * @param {unknown} sensorId
 * @returns {string}
 */
function requireSensorId(sensorId) {
  if (typeof sensorId !== 'string' || sensorId.trim() === '') {
    throw new Error('A sensor id is required.');
  }
  return sensorId;
}

/**
 * Runs `work` inside a transaction and settles on the transaction, not on the request.
 *
 * The old code resolved on `put.onsuccess`. A `put` can succeed and its transaction can
 * still abort afterwards — a quota failure on flush, or another write in the same
 * transaction failing — in which case nothing was written and the caller was told it
 * was. Waiting for `oncomplete` is the difference between "the request was accepted" and
 * "the data is on disk".
 *
 * @template T
 * @param {IDBDatabase} db
 * @param {IDBTransactionMode} mode
 * @param {(store: IDBObjectStore) => Promise<T>|T} work
 * @returns {Promise<T>}
 */
function runTransaction(db, mode, work) {
  return new Promise((resolve, reject) => {
    let transaction;
    try {
      transaction = db.transaction(STORE_NAME, mode);
    } catch (error) {
      reject(error);
      return;
    }

    let result;
    let settled = false;

    transaction.oncomplete = () => {
      settled = true;
      resolve(result);
    };
    transaction.onabort = () => {
      if (settled) return;
      settled = true;
      reject(transaction.error ?? new Error('The calibration transaction was aborted.'));
    };
    transaction.onerror = () => {
      if (settled) return;
      settled = true;
      reject(transaction.error ?? new Error('The calibration transaction failed.'));
    };

    Promise.resolve(work(transaction.objectStore(STORE_NAME)))
      .then((value) => {
        result = value;
      })
      .catch((error) => {
        if (settled) return;
        settled = true;
        try {
          transaction.abort();
        } catch {
          // Already finished; the reject below is what matters.
        }
        reject(error);
      });
  });
}

/**
 * Promisifies a single IDBRequest.
 *
 * @template T
 * @param {IDBRequest<T>} request
 * @returns {Promise<T>}
 */
function fromRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

/**
 * The next version number for a sensor.
 *
 * Coerced through `Number`, because a record written by an older build could hold a
 * string, and `Math.max(1, "2")` is 2 while `Math.max("10", 9)` is 10 — the coercion is
 * inconsistent enough to skip a version silently.
 *
 * @param {Array<{version?: unknown}>} records
 * @returns {number}
 */
export function nextVersionNumber(records) {
  const highest = (records ?? []).reduce((max, record) => {
    const value = Number(record?.version);
    return Number.isFinite(value) && value > max ? value : max;
  }, 0);

  return highest + 1;
}

/**
 * Stores a new calibration revision for a sensor.
 *
 * @param {{sensorId: string, calibrationParameters: object, createdBy?: string}} input
 * @returns {Promise<object>} The stored record.
 */
export async function saveCalibrationVersion({ sensorId, calibrationParameters, createdBy = 'system' }) {
  const id = requireSensorId(sensorId);
  const db = await openDB();

  return runTransaction(db, 'readwrite', async (store) => {
    // Read and write in one transaction, so the version number cannot be read by a
    // second save between the read and the write.
    const existing = await fromRequest(store.index('sensorId').getAll(id));
    const version = nextVersionNumber(existing);

    const record = {
      id: `${id}-v${version}`,
      sensorId: id,
      version,
      calibrationParameters,
      createdBy,
      createdAt: new Date().toISOString(),
    };

    // `add`, not `put`. This is a version history; overwriting a revision that already
    // exists is the one thing it must never do. A collision now surfaces as an error
    // rather than as silently missing history.
    await fromRequest(store.add(record));
    return record;
  });
}

/**
 * Fetches one revision.
 *
 * @param {string} sensorId
 * @param {number|string} version
 * @returns {Promise<object|null>}
 */
export async function getCalibrationVersion(sensorId, version) {
  const id = requireSensorId(sensorId);
  const db = await openDB();

  return runTransaction(db, 'readonly', (store) =>
    fromRequest(store.get(`${id}-v${version}`)).then((record) => record ?? null)
  );
}

/**
 * Fetches every revision for a sensor, newest first.
 *
 * @param {string} sensorId
 * @returns {Promise<Array<object>>}
 */
export async function getCalibrationHistory(sensorId) {
  const id = requireSensorId(sensorId);
  const db = await openDB();

  return runTransaction(db, 'readonly', (store) =>
    fromRequest(store.index('sensorId').getAll(id)).then((records) =>
      (records ?? []).slice().sort((a, b) => Number(b.version) - Number(a.version))
    )
  );
}
