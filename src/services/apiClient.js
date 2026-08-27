/**
 * One `fetch` wrapper for the five feature services that were each carrying
 * their own copy of it.
 *
 * `challengeService`, `incidentRoutingService`, `footprintPlannerService`,
 * `forecastAttributionService` and `microclimateService` arrived within a week
 * of each other, all built from the same twenty lines, and the copies had
 * drifted apart in four ways (#1075):
 *
 *   - every authenticated call sent `Bearer ${localStorage.getItem('token')}`,
 *     which stringifies a missing token into the header `Authorization: Bearer
 *     null`. That is a *present* credential, not an absent one: a server
 *     distinguishing "no credentials, redirect to sign-in" from "bad
 *     credentials, this is an attack" sees the second, and every signed-out
 *     visitor writes the string "null" into the access log.
 *
 *   - ids and query values were interpolated into URLs raw. One containing `/`,
 *     `?`, `#` or `&` changes which endpoint is called, not just which record.
 *
 *   - nothing took an `AbortSignal`, and all five are called from `useEffect`.
 *
 *   - six of the eleven functions threw a fixed string and discarded the
 *     server's `message`, which `challengeRoutes.js` fills in with the reason
 *     ("Already participating in this challenge.", "Reward already claimed.")
 *     and `EcoChallengeDashboard` shows the visitor.
 *
 * Only the transport lives here. The five services keep their names, their
 * signatures and their JSDoc — this is the body they all shared.
 */

/** @type {string} */
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/** Where the access token is kept. */
const TOKEN_KEY = 'token';

/**
 * The stored access token, or null when there is not one.
 *
 * `localStorage` throws rather than returning null in a browser with site data
 * blocked, and in a Safari private window — `TenantContext` hit exactly this in
 * #843. A request without a token is a request the server can answer with a
 * 401; a `SecurityError` thrown from a service module is not.
 *
 * The empty string is treated as absent: it is what a signed-out session that
 * cleared its token by assignment rather than `removeItem` leaves behind, and
 * `Bearer ` is no more meaningful than `Bearer null`.
 *
 * @returns {string|null}
 */
export function readToken() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

/**
 * Joins `segments` onto the API base, encoding each one.
 *
 * `buildPath(['challenges', id, 'join'])` — an `id` of `../admin` or `a/b`
 * cannot leave the path segment it was given.
 *
 * @param {Array<string|number>} segments
 * @returns {string}
 */
export function buildPath(segments) {
  const encoded = segments
    .filter((segment) => segment !== undefined && segment !== null && segment !== '')
    .map((segment) => encodeURIComponent(String(segment)))
    .join('/');
  return `${API_BASE}/${encoded}`;
}

/**
 * `?a=1&b=2`, or the empty string when there is nothing to add.
 *
 * Entries whose value is `undefined` or `null` are dropped rather than sent as
 * the strings "undefined" and "null" — `fetchRoutedIncidents(undefined)` used to
 * build `?status=undefined` if the caller passed the argument explicitly.
 *
 * @param {Record<string, unknown>} [params]
 * @returns {string}
 */
export function buildQuery(params) {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.append(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

/**
 * The request headers, with `Authorization` only when there is a token.
 *
 * @param {object} [options]
 * @param {boolean} [options.auth] Attach the token when there is one.
 * @param {boolean} [options.hasBody] Declare a JSON body.
 * @returns {Record<string, string>}
 */
function buildHeaders({ auth = false, hasBody = false } = {}) {
  /** @type {Record<string, string>} */
  const headers = { Accept: 'application/json' };
  // Only when there is something to describe. A GET with `Content-Type:
  // application/json` and no body is a claim about a body that is not there,
  // and some proxies treat it as one.
  if (hasBody) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = readToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/**
 * The most useful message available for a failed response.
 *
 * Prefers the server's `message`, which is what the route handlers actually
 * send, and falls back to `fallback` when the body is empty, is not JSON, or is
 * an HTML error page from a proxy. `response.json()` on the last of those
 * throws a `SyntaxError` about an unexpected `<`, which tells the visitor
 * nothing about their request.
 *
 * @param {Response} response
 * @param {string} fallback
 * @returns {Promise<string>}
 */
async function errorMessageFor(response, fallback) {
  try {
    const contentType = response.headers?.get?.('content-type') || '';
    if (!contentType.includes('json')) return fallback;
    const body = await response.json();
    const message = body?.message ?? body?.error;
    return typeof message === 'string' && message.length > 0 ? message : fallback;
  } catch {
    return fallback;
  }
}

/**
 * An error carrying the response status, so a caller can tell 401 from 500.
 */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   */
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * One request.
 *
 * An `AbortError` is rethrown untouched rather than being reported as a failed
 * request: a component that aborted in its effect cleanup asked for this, and
 * showing "Failed to fetch challenges" because the visitor navigated away is a
 * lie about the server.
 *
 * @param {object} options
 * @param {Array<string|number>} options.path      Path segments, encoded individually.
 * @param {string} [options.method]                Defaults to GET.
 * @param {Record<string, unknown>} [options.query]
 * @param {unknown} [options.body]                 Serialised as JSON when present.
 * @param {boolean} [options.auth]                 Attach the token when there is one.
 * @param {string} options.errorMessage            Used when the server sends no message.
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<any>} The parsed body, or null for an empty one.
 */
export async function apiRequest({
  path,
  method = 'GET',
  query,
  body,
  auth = false,
  errorMessage,
  signal,
}) {
  const hasBody = body !== undefined;
  const response = await fetch(`${buildPath(path)}${buildQuery(query)}`, {
    method,
    headers: buildHeaders({ auth, hasBody }),
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    throw new ApiError(await errorMessageFor(response, errorMessage), response.status);
  }

  return parseBody(response);
}

/**
 * The response body, or null when there is not one.
 *
 * A 204 and a 200 with an empty body both make `response.json()` throw. Several
 * of these endpoints are `PATCH`es whose useful answer is the status code.
 *
 * @param {Response} response
 * @returns {Promise<any>}
 */
async function parseBody(response) {
  if (response.status === 204) return null;
  const contentType = response.headers?.get?.('content-type') || '';
  if (!contentType.includes('json')) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}
