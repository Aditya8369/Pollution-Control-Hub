import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest, buildPath, buildQuery, readToken, ApiError } from './apiClient';

/** Cover for #1075. */

/**
 * The stub standing in for `fetch`. Typed loosely: `globalThis.fetch` is typed
 * as the real thing, and `tsc` runs over this file with `checkJs`.
 *
 * @type {any}
 */
let fetchMock;

/**
 * A `Response`-alike, so these do not depend on jsdom's fetch implementation.
 *
 * @param {{status?: number, body?: any, contentType?: string}} [options]
 * @returns {any}
 */
function jsonResponse({ status = 200, body = {}, contentType = 'application/json' } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (name.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
  };
}

/** The options `fetch` was called with. */
function lastInit() {
  return fetchMock.mock.calls.at(-1)[1];
}

/** The URL `fetch` was called with. */
function lastUrl() {
  return fetchMock.mock.calls.at(-1)[0];
}

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(jsonResponse());
  globalThis.fetch = fetchMock;
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('readToken (#1075)', () => {
  it('reads a stored token', () => {
    localStorage.setItem('token', 'abc123');
    expect(readToken()).toBe('abc123');
  });

  it('reports a missing token as absent, not as the string "null"', () => {
    expect(readToken()).toBeNull();
  });

  it('treats an empty token as absent', () => {
    localStorage.setItem('token', '');
    expect(readToken()).toBeNull();
  });

  it('survives storage that throws', () => {
    // A Safari private window and a browser with site data blocked both do
    // this; TenantContext hit it in #843.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    expect(readToken()).toBeNull();
  });
});

describe('Authorization header (#1075)', () => {
  it('does not send "Bearer null" when nobody is signed in', async () => {
    await apiRequest({ path: ['challenges', 'active'], auth: true, errorMessage: 'x' });

    // The exact defect: `Bearer ${localStorage.getItem('token')}` stringifies a
    // missing token, and the server sees a present-but-bad credential.
    expect(lastInit().headers.Authorization).toBeUndefined();
  });

  it('sends the token when there is one', async () => {
    localStorage.setItem('token', 'abc123');

    await apiRequest({ path: ['challenges', 'active'], auth: true, errorMessage: 'x' });

    expect(lastInit().headers.Authorization).toBe('Bearer abc123');
  });

  it('sends no Authorization header for an unauthenticated call', async () => {
    localStorage.setItem('token', 'abc123');

    await apiRequest({ path: ['forecast', 'attribution', 'history'], errorMessage: 'x' });

    expect(lastInit().headers.Authorization).toBeUndefined();
  });

  it('does not declare a JSON body on a request that has none', async () => {
    await apiRequest({ path: ['challenges', 'active'], errorMessage: 'x' });

    expect(lastInit().headers['Content-Type']).toBeUndefined();
  });

  it('declares a JSON body on a request that has one', async () => {
    await apiRequest({ path: ['footprint', 'activities'], method: 'POST', body: { quantity: 3 }, errorMessage: 'x' });

    expect(lastInit().headers['Content-Type']).toBe('application/json');
    expect(lastInit().body).toBe(JSON.stringify({ quantity: 3 }));
  });
});

describe('buildPath (#1075)', () => {
  it('joins segments onto the API base', () => {
    expect(buildPath(['challenges', 'abc', 'join'])).toBe('/api/challenges/abc/join');
  });

  it('encodes a segment so it cannot change which endpoint is called', () => {
    // `${API_BASE}/challenges/${challengeId}/join` with an id of `a/b` reached
    // /api/challenges/a/b/join.
    expect(buildPath(['challenges', 'a/b', 'join'])).toBe('/api/challenges/a%2Fb/join');
  });

  it('encodes a segment that would otherwise start a query string', () => {
    expect(buildPath(['incidents', 'x?admin=1', 'status'])).toBe('/api/incidents/x%3Fadmin%3D1/status');
  });

  it('encodes a traversal attempt', () => {
    expect(buildPath(['challenges', '../admin'])).toBe('/api/challenges/..%2Fadmin');
  });

  it('drops an empty segment rather than producing a double slash', () => {
    expect(buildPath(['footprint', 'steps', ''])).toBe('/api/footprint/steps');
  });
});

describe('buildQuery (#1075)', () => {
  it('builds nothing when there is nothing to add', () => {
    expect(buildQuery()).toBe('');
    expect(buildQuery({})).toBe('');
  });

  it('encodes values', () => {
    expect(buildQuery({ locationId: 'delhi & ncr' })).toBe('?locationId=delhi+%26+ncr');
  });

  it('drops undefined instead of sending the string "undefined"', () => {
    // `?status=${status}` with an explicit undefined produced ?status=undefined.
    expect(buildQuery({ status: undefined })).toBe('');
  });

  it('drops null and the empty string', () => {
    expect(buildQuery({ status: null, category: '' })).toBe('');
  });

  it('keeps a zero, which is a value', () => {
    expect(buildQuery({ days: 0 })).toBe('?days=0');
  });
});

describe('error handling (#1075)', () => {
  it('uses the message the server sent', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      status: 400,
      body: { message: 'Already participating in this challenge.' },
    }));

    await expect(apiRequest({ path: ['challenges', 'a', 'join'], errorMessage: 'Failed to join challenge.' }))
      .rejects.toThrow('Already participating in this challenge.');
  });

  it('falls back when the server sent no message', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 500, body: {} }));

    await expect(apiRequest({ path: ['challenges', 'active'], errorMessage: 'Failed to fetch active challenges.' }))
      .rejects.toThrow('Failed to fetch active challenges.');
  });

  it('does not report an HTML error page as a JSON syntax error', async () => {
    // `response.json()` on a proxy's HTML page throws a SyntaxError about an
    // unexpected `<`, which says nothing about the request.
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      headers: { get: () => 'text/html' },
      json: async () => { throw new SyntaxError('Unexpected token <'); },
    });

    await expect(apiRequest({ path: ['challenges', 'active'], errorMessage: 'Failed to fetch active challenges.' }))
      .rejects.toThrow('Failed to fetch active challenges.');
  });

  it('carries the status so a caller can tell 401 from 500', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 401, body: { message: 'Sign in required.' } }));

    await expect(apiRequest({ path: ['challenges', 'active'], errorMessage: 'x' }))
      .rejects.toMatchObject({ name: 'ApiError', status: 401 });
  });

  it('is an Error, so err.message still reads', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 400, body: { message: 'Nope.' } }));

    await apiRequest({ path: ['x'], errorMessage: 'y' }).catch((err) => {
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.message).toBe('Nope.');
    });
  });
});

describe('response bodies (#1075)', () => {
  it('returns the parsed body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ body: { challenges: [] } }));

    await expect(apiRequest({ path: ['challenges', 'active'], errorMessage: 'x' }))
      .resolves.toEqual({ challenges: [] });
  });

  it('returns null for a 204 rather than throwing inside json()', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      headers: { get: () => null },
      json: async () => { throw new SyntaxError('Unexpected end of JSON input'); },
    });

    await expect(apiRequest({ path: ['footprint', 'steps', 'a'], method: 'PATCH', errorMessage: 'x' }))
      .resolves.toBeNull();
  });

  it('returns null for an empty 200', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'text/plain' },
      json: async () => { throw new SyntaxError('Unexpected end of JSON input'); },
    });

    await expect(apiRequest({ path: ['x'], errorMessage: 'y' })).resolves.toBeNull();
  });
});

describe('cancellation (#1075)', () => {
  it('passes the signal through to fetch', async () => {
    const controller = new AbortController();

    await apiRequest({ path: ['challenges', 'active'], errorMessage: 'x', signal: controller.signal });

    expect(lastInit().signal).toBe(controller.signal);
  });

  it('omits the signal key when none was given', async () => {
    await apiRequest({ path: ['challenges', 'active'], errorMessage: 'x' });

    expect(lastInit().signal).toBeUndefined();
  });

  it('rethrows an abort as an abort, not as a failed request', async () => {
    // Reporting "Failed to fetch challenges" because the visitor navigated away
    // is a lie about the server.
    const abort = new DOMException('The operation was aborted.', 'AbortError');
    fetchMock.mockRejectedValue(abort);

    await expect(apiRequest({ path: ['challenges', 'active'], errorMessage: 'Failed to fetch active challenges.' }))
      .rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('the URL that gets built (#1075)', () => {
  it('puts the path and the query together', async () => {
    await apiRequest({ path: ['forecast', 'aqi'], query: { lat: 28.6, lng: 77.2, days: 3 }, errorMessage: 'x' });

    expect(lastUrl()).toBe('/api/forecast/aqi?lat=28.6&lng=77.2&days=3');
  });
});
