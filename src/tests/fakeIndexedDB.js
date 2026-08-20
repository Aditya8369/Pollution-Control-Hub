/**
 * A small in-memory IndexedDB double.
 *
 * `fake-indexeddb` is not a dependency of this project and jsdom ships no IndexedDB at
 * all, so the calibration service had no way to be tested. This covers only what
 * `calibrationVersionService` uses — open with an upgrade, a keyPath store, one index,
 * `getAll`, `get`, `add`, and the transaction lifecycle — plus the two behaviours that
 * are the reason #898 exists and which a naive stub would paper over:
 *
 * - `open()` fires `blocked` (not `error`, not `success`) while an older connection is
 *   still open at a lower version.
 * - `getAll(undefined)` is an unbounded query and returns every record, rather than none.
 *
 * Callbacks fire on a macrotask, as the real implementation does, so ordering bugs that
 * only appear asynchronously are still reachable.
 */

/** Runs `fn` after the current task, mimicking IndexedDB's own event dispatch. */
function later(fn) {
    setTimeout(fn, 0);
}

class FakeRequest {
    constructor() {
        this.result = undefined;
        this.error = null;
        this.onsuccess = null;
        this.onerror = null;
    }

    _succeed(result) {
        this.result = result;
        later(() => this.onsuccess?.({ target: this }));
    }

    _fail(error) {
        this.error = error;
        later(() => this.onerror?.({ target: this }));
    }
}

class FakeIndex {
    constructor(store, keyPath) {
        this.store = store;
        this.keyPath = keyPath;
    }

    getAll(query) {
        const request = new FakeRequest();
        const all = [...this.store.data.values()];
        // An undefined query is an unbounded key range, not an empty result set. This is
        // the behaviour that let `getCalibrationHistory(undefined)` return another
        // sensor's revisions.
        const matches = query === undefined ? all : all.filter((r) => r[this.keyPath] === query);
        this.store.transaction._track(request);
        request._succeed(matches);
        return request;
    }
}

class FakeObjectStore {
    constructor(name, keyPath, data, transaction) {
        this.name = name;
        this.keyPath = keyPath;
        this.data = data;
        this.transaction = transaction;
        this.indexNames = new Set();
    }

    createIndex(name) {
        this.indexNames.add(name);
    }

    index(name) {
        return new FakeIndex(this, name);
    }

    get(key) {
        const request = new FakeRequest();
        this.transaction._track(request);
        request._succeed(this.data.get(key));
        return request;
    }

    add(record) {
        const request = new FakeRequest();
        this.transaction._track(request);

        if (this.transaction.mode !== 'readwrite') {
            request._fail(new Error('ReadOnlyError'));
            return request;
        }
        if (this.data.has(record[this.keyPath])) {
            // A version history must never silently overwrite a revision.
            request._fail(new Error('ConstraintError: key already exists'));
            return request;
        }
        if (this.transaction.db._failWrites) {
            request._fail(new Error('QuotaExceededError'));
            return request;
        }

        this.data.set(record[this.keyPath], record);
        request._succeed(record[this.keyPath]);
        return request;
    }

    put(record) {
        const request = new FakeRequest();
        this.transaction._track(request);
        this.data.set(record[this.keyPath], record);
        request._succeed(record[this.keyPath]);
        return request;
    }
}

class FakeTransaction {
    constructor(db, storeName, mode) {
        this.db = db;
        this.mode = mode;
        this.error = null;
        this.oncomplete = null;
        this.onabort = null;
        this.onerror = null;
        this._pending = 0;
        this._finished = false;
        this._store = new FakeObjectStore(storeName, 'id', db._stores.get(storeName), this);

        // The real thing completes once no request is outstanding and control returns to
        // the event loop. Two ticks is enough for the service's read-then-write pair.
        later(() => later(() => this._maybeComplete()));
    }

    objectStore() {
        return this._store;
    }

    _track(request) {
        this._pending += 1;
        const settle = () => {
            this._pending -= 1;
            later(() => this._maybeComplete());
        };
        const originalSuccess = () => settle();
        const originalError = () => settle();
        later(() => {
            if (request.error) originalError();
            else originalSuccess();
        });
    }

    _maybeComplete() {
        if (this._finished || this._pending > 0) return;
        this._finished = true;
        this.oncomplete?.();
    }

    abort() {
        if (this._finished) return;
        this._finished = true;
        later(() => this.onabort?.());
    }
}

class FakeDatabase {
    constructor(name, version, stores) {
        this.name = name;
        this.version = version;
        this._stores = stores;
        this._closed = false;
        this._failWrites = false;
        this.onversionchange = null;
        this.onclose = null;
        this.objectStoreNames = {
            contains: (storeName) => stores.has(storeName),
        };
    }

    createObjectStore(storeName) {
        this._stores.set(storeName, new Map());
        const transaction = { mode: 'versionchange', db: this, _track: () => { } };
        return new FakeObjectStore(storeName, 'id', this._stores.get(storeName), transaction);
    }

    transaction(storeName, mode = 'readonly') {
        if (this._closed) throw new Error('InvalidStateError: the connection is closed');
        return new FakeTransaction(this, storeName, mode);
    }

    close() {
        this._closed = true;
        this.onclose?.();
    }
}

/**
 * Builds an `indexedDB` stand-in.
 *
 * @param {{blockUpgrade?: boolean, failOpen?: Error}} [options]
 * @returns {{factory: object, stores: Map<string, Map<string, object>>, connections: FakeDatabase[]}}
 */
export function createFakeIndexedDB(options = {}) {
    const stores = new Map();
    const connections = [];

    const factory = {
        open(name, version) {
            const request = new FakeRequest();
            request.onupgradeneeded = null;
            request.onblocked = null;

            later(() => {
                if (options.failOpen) {
                    request.error = options.failOpen;
                    request.onerror?.({ target: request });
                    return;
                }
                if (options.blockUpgrade) {
                    // Another connection is holding an older version open. The real API
                    // fires `blocked` and then simply waits; with no handler the caller's
                    // promise never settles at all.
                    request.onblocked?.({ target: request });
                    return;
                }

                const db = new FakeDatabase(name, version, stores);
                request.result = db;
                connections.push(db);

                if (stores.size === 0) {
                    request.onupgradeneeded?.({ target: request });
                }
                request.onsuccess?.({ target: request });
            });

            return request;
        },
    };

    return { factory, stores, connections };
}
