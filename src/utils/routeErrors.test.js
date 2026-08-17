import { describe, it, expect } from 'vitest';
import { describeRouteError, ROUTE_ERROR_FALLBACK } from './routeErrors';

/**
 * The planner answered every failure with the same line — "Ensure the locations
 * are spelled correctly" — which is wrong advice for most of the ways it fails.
 * These pin each branch to the error `calculateCleanRoute` actually throws.
 */
describe('describeRouteError', () => {
  it('names the location that could not be resolved', () => {
    const message = describeRouteError(new Error('Location not found: Hauz Khas'));
    expect(message).toContain('Hauz Khas');
    expect(message).toMatch(/couldn't find/i);
  });

  it('trims whitespace around the location name', () => {
    expect(describeRouteError(new Error('Location not found:   India Gate  '))).toContain(
      '"India Gate"'
    );
  });

  it('falls back to an unnamed message for the older un-suffixed error', () => {
    const message = describeRouteError(new Error('Location not found'));
    expect(message).toMatch(/one of those locations/i);
    expect(message).not.toContain('undefined');
  });

  it('distinguishes a geocoder outage from a bad location name', () => {
    const message = describeRouteError(new Error('Failed to geocode: Delhi'));
    expect(message).toMatch(/didn't respond/i);
    // The whole point: this failure is not the user's spelling.
    expect(message).not.toMatch(/spell/i);
  });

  it('explains that no path exists when the routing engine returns none', () => {
    expect(describeRouteError(new Error('Could not calculate routes'))).toMatch(
      /no route could be found/i
    );
  });

  it('reports a connection problem for a fetch-level TypeError', () => {
    expect(describeRouteError(new TypeError('Failed to fetch'))).toMatch(
      /check your connection/i
    );
  });

  it.each([
    'NetworkError when attempting to fetch resource',
    'Network request failed',
    'Load failed',
  ])('recognises %s as a connection problem', (message) => {
    expect(describeRouteError(new Error(message))).toMatch(/check your connection/i);
  });

  it('falls back for an unrecognised error', () => {
    expect(describeRouteError(new Error('kaboom'))).toBe(ROUTE_ERROR_FALLBACK);
  });

  it('does not throw on a null, string or message-less rejection', () => {
    expect(describeRouteError(null)).toBe(ROUTE_ERROR_FALLBACK);
    expect(describeRouteError(undefined)).toBe(ROUTE_ERROR_FALLBACK);
    expect(describeRouteError({})).toBe(ROUTE_ERROR_FALLBACK);
    expect(describeRouteError('Could not calculate routes')).toBe(ROUTE_ERROR_FALLBACK);
  });

  it('never tells the user to check their spelling', () => {
    const errors = [
      new Error('Location not found: Delhi'),
      new Error('Failed to geocode: Delhi'),
      new Error('Could not calculate routes'),
      new TypeError('Failed to fetch'),
      new Error('kaboom'),
    ];
    for (const error of errors) {
      expect(describeRouteError(error)).not.toMatch(/spelled|spelling/i);
    }
  });
});
