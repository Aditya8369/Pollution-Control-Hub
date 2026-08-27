import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Cover for #1075, at the level of the five services rather than the client.
 *
 * These assert the request each public function actually produces: the URL, the
 * method, the headers, and whether the signal got through. `fetch` is stubbed;
 * nothing here needs a server.
 */

import * as challenges from './challengeService';
import * as incidents from './incidentRoutingService';
import * as footprint from './footprintPlannerService';
import * as forecast from './forecastAttributionService';
import * as microclimate from './microclimateService';

/**
 * The stub standing in for `fetch`, typed loosely for the same reason as in
 * `apiClient.test.js`.
 *
 * @type {any}
 */
let fetchMock;

/**
 * @param {any} [body]
 * @param {number} [status]
 * @returns {any}
 */
function jsonResponse(body = {}, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  };
}

function lastCall() {
  const [url, init] = fetchMock.mock.calls.at(-1);
  return { url, init };
}

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(jsonResponse());
  globalThis.fetch = fetchMock;
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Every authenticated function, so none of them can be missed.
 *
 * Typed as `any[]` because `it.each` over an array of tuples does not resolve to
 * a callable overload under `checkJs`.
 *
 * @type {any[]}
 */
const AUTHENTICATED = [
  ['fetchActiveChallenges', () => challenges.fetchActiveChallenges()],
  ['joinChallenge', () => challenges.joinChallenge('c1')],
  ['claimChallengeReward', () => challenges.claimChallengeReward('c1')],
  ['fetchRoutedIncidents', () => incidents.fetchRoutedIncidents()],
  ['updateIncidentStatus', () => incidents.updateIncidentStatus('i1', 'VERIFIED', 'ok')],
  ['logActivity', () => footprint.logActivity({ quantity: 3 })],
  ['fetchFootprintSummary', () => footprint.fetchFootprintSummary()],
  ['updateReductionStep', () => footprint.updateReductionStep('s1', true)],
  ['fetchAqiForecast', () => forecast.fetchAqiForecast(28.6, 77.2)],
  ['saveMicroclimateZone', () => microclimate.saveMicroclimateZone({ name: 'z' })],
];

/**
 * Every function, authenticated or not, with a signal in its last position.
 *
 * @type {any[]}
 */
const ALL_WITH_SIGNAL = [
  ['fetchActiveChallenges', (s) => challenges.fetchActiveChallenges(s)],
  ['joinChallenge', (s) => challenges.joinChallenge('c1', s)],
  ['claimChallengeReward', (s) => challenges.claimChallengeReward('c1', s)],
  ['fetchRoutedIncidents', (s) => incidents.fetchRoutedIncidents('ROUTED', s)],
  ['updateIncidentStatus', (s) => incidents.updateIncidentStatus('i1', 'VERIFIED', 'ok', s)],
  ['logActivity', (s) => footprint.logActivity({ quantity: 3 }, s)],
  ['fetchFootprintSummary', (s) => footprint.fetchFootprintSummary(s)],
  ['updateReductionStep', (s) => footprint.updateReductionStep('s1', true, s)],
  ['fetchAqiForecast', (s) => forecast.fetchAqiForecast(28.6, 77.2, 3, s)],
  ['fetchHistoricalAttribution', (s) => forecast.fetchHistoricalAttribution('delhi', s)],
  ['fetchMicroclimateData', (s) => microclimate.fetchMicroclimateData(28.7, 28.5, 77.3, 77.1, s)],
  ['saveMicroclimateZone', (s) => microclimate.saveMicroclimateZone({ name: 'z' }, s)],
];

describe('no signed-out request carries a credential (#1075)', () => {
  it.each(AUTHENTICATED)('%s sends no Authorization header with no token', async (_name, call) => {
    await call();
    expect(lastCall().init.headers.Authorization).toBeUndefined();
  });

  it.each(AUTHENTICATED)('%s sends the token when there is one', async (_name, call) => {
    localStorage.setItem('token', 'abc123');
    await call();
    expect(lastCall().init.headers.Authorization).toBe('Bearer abc123');
  });
});

describe('every function accepts a signal (#1075)', () => {
  it.each(ALL_WITH_SIGNAL)('%s passes it to fetch', async (_name, call) => {
    const controller = new AbortController();
    await call(controller.signal);
    expect(lastCall().init.signal).toBe(controller.signal);
  });
});

describe('challengeService (#1075)', () => {
  it('fetches the active challenges', async () => {
    await challenges.fetchActiveChallenges();
    expect(lastCall().url).toBe('/api/challenges/active');
  });

  it('POSTs a join to an encoded id', async () => {
    await challenges.joinChallenge('weekly/2026-08');
    expect(lastCall().url).toBe('/api/challenges/weekly%2F2026-08/join');
    expect(lastCall().init.method).toBe('POST');
  });

  it('POSTs a claim to an encoded id', async () => {
    await challenges.claimChallengeReward('weekly 08');
    expect(lastCall().url).toBe('/api/challenges/weekly%2008/claim');
  });

  it('surfaces the reason the server gave for refusing a claim', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Reward already claimed.' }, 400));

    // This function used to throw a fixed string and drop the body, so the
    // visitor saw "Failed to claim reward." whatever the actual reason.
    await expect(challenges.claimChallengeReward('c1')).rejects.toThrow('Reward already claimed.');
  });
});

describe('incidentRoutingService (#1075)', () => {
  it('omits the filter when no status is given', async () => {
    await incidents.fetchRoutedIncidents();
    expect(lastCall().url).toBe('/api/incidents/routed');
  });

  it('does not send the string "undefined" for an explicit undefined', async () => {
    await incidents.fetchRoutedIncidents(undefined);
    expect(lastCall().url).not.toContain('undefined');
  });

  it('encodes the status filter', async () => {
    await incidents.fetchRoutedIncidents('ROUTED&admin=1');
    expect(lastCall().url).toBe('/api/incidents/routed?status=ROUTED%26admin%3D1');
  });

  it('PATCHes the status with a JSON body', async () => {
    await incidents.updateIncidentStatus('i1', 'DISPATCHED', 'Team en route.');

    const { url, init } = lastCall();
    expect(url).toBe('/api/incidents/i1/status');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ status: 'DISPATCHED', notes: 'Team en route.' });
  });
});

describe('footprintPlannerService (#1075)', () => {
  it('POSTs an activity', async () => {
    await footprint.logActivity({ category: 'COMMUTE', quantity: 12 });

    const { url, init } = lastCall();
    expect(url).toBe('/api/footprint/activities');
    expect(JSON.parse(init.body)).toEqual({ category: 'COMMUTE', quantity: 12 });
  });

  it('fetches the summary', async () => {
    await footprint.fetchFootprintSummary();
    expect(lastCall().url).toBe('/api/footprint/summary');
  });

  it('PATCHes a step by its encoded id', async () => {
    await footprint.updateReductionStep('step/1', true);

    const { url, init } = lastCall();
    expect(url).toBe('/api/footprint/steps/step%2F1');
    expect(JSON.parse(init.body)).toEqual({ isCompleted: true });
  });
});

describe('forecastAttributionService (#1075)', () => {
  it('builds the forecast query', async () => {
    await forecast.fetchAqiForecast(28.6139, 77.209, 5);
    expect(lastCall().url).toBe('/api/forecast/aqi?lat=28.6139&lng=77.209&days=5');
  });

  it('defaults to three days', async () => {
    await forecast.fetchAqiForecast(28.6139, 77.209);
    expect(lastCall().url).toContain('days=3');
  });

  it('encodes a free-form location id', async () => {
    await forecast.fetchHistoricalAttribution('delhi&admin=1');
    expect(lastCall().url).toBe('/api/forecast/attribution/history?locationId=delhi%26admin%3D1');
  });

  it('sends no credential on the unauthenticated history call', async () => {
    localStorage.setItem('token', 'abc123');
    await forecast.fetchHistoricalAttribution('delhi');
    expect(lastCall().init.headers.Authorization).toBeUndefined();
  });
});

describe('microclimateService (#1075)', () => {
  it('builds the grid query from the bounding box', async () => {
    await microclimate.fetchMicroclimateData(28.7, 28.5, 77.3, 77.1);
    expect(lastCall().url).toBe('/api/microclimate/grid?north=28.7&south=28.5&east=77.3&west=77.1');
  });

  it('POSTs a saved zone', async () => {
    await microclimate.saveMicroclimateZone({ name: 'Sector 12' });

    const { url, init } = lastCall();
    expect(url).toBe('/api/microclimate/zones');
    expect(JSON.parse(init.body)).toEqual({ name: 'Sector 12' });
  });
});
