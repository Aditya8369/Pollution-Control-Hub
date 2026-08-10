/**
 * Turning a thrown routing error into something a user can act on.
 *
 * The planner used to answer every failure with one fixed line — "Ensure the
 * locations are spelled correctly" — which is wrong advice for most of the ways
 * it actually fails. A routing engine that returns no path, or a lookup service
 * that is briefly down, has nothing to do with spelling, and telling someone to
 * re-check a name they typed correctly sends them round in circles.
 *
 * `calculateCleanRoute` throws a small, known set of errors, so they can be
 * distinguished and answered individually.
 */

/** Shown when the error doesn't match anything more specific. */
export const ROUTE_ERROR_FALLBACK =
  "Something went wrong working out the route. Please try again.";

/**
 * A network-layer failure rather than a routing one.
 *
 * `fetch` rejects with a TypeError when the request never reaches the server —
 * offline, DNS failure, CORS. The message text differs between browsers, so match
 * on the constructor as well as the common phrasings.
 *
 * @param {any} error
 * @returns {boolean}
 */
function isNetworkFailure(error) {
  if (error instanceof TypeError) return true;
  const message = String(error?.message || "");
  return /failed to fetch|networkerror|network request failed|load failed/i.test(
    message
  );
}

/**
 * A user-facing sentence describing why the route search failed.
 *
 * @param {any} error - Whatever `calculateCleanRoute` rejected with.
 * @returns {string}
 */
export function describeRouteError(error) {
  if (isNetworkFailure(error)) {
    return "Couldn't reach the routing service. Check your connection and try again.";
  }

  const message = String(error?.message || "");

  // geocodeLocation names the place it could not resolve, so the message can too.
  const notFound = message.match(/^Location not found:\s*(.+)$/);
  if (notFound) {
    return `We couldn't find "${notFound[1].trim()}". Try adding a city or area — for example "Hauz Khas, Delhi".`;
  }
  if (/^Location not found/.test(message)) {
    return "We couldn't find one of those locations. Try adding a city or area to make it more specific.";
  }

  if (/^Failed to geocode/.test(message)) {
    return "The location lookup service didn't respond. Please try again in a moment.";
  }

  if (/Could not calculate routes/.test(message)) {
    return "No route could be found between those two places for the selected mode.";
  }

  return ROUTE_ERROR_FALLBACK;
}
