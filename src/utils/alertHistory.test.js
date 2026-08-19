import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ALERT_HISTORY_KEY,
  MAX_HISTORY,
  RECORD_COOLDOWN_MS,
  alertEntryKey,
  alertSignature,
  buildWarnings,
  clearAlertHistory,
  formatAlertTimestamp,
  isAlreadyRecorded,
  readAlertHistory,
  recordAlerts,
  writeAlertHistory,
} from './alertHistory';

/**
 * The logging rules behind the Alert History panel (#694).
 *
 * The de-duplication key used to be a `useRef`, so it reset on every mount and each
 * page load appended the same warnings again.
 */

const T0 = Date.parse('2026-08-12T09:00:00.000Z');

/** A reading that trips every threshold. */
const BAD_AIR = {
  pm2_5: 90,
  pm10: 150,
  nitrogen_dioxide: 60,
  ozone: 140,
  us_aqi: 212,
};

/** A reading that trips none of them. */
const CLEAN_AIR = {
  pm2_5: 5,
  pm10: 20,
  nitrogen_dioxide: 10,
  ozone: 40,
  us_aqi: 30,
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('buildWarnings', () => {
  it('returns nothing for air inside every limit', () => {
    expect(buildWarnings(CLEAN_AIR)).toEqual([]);
  });

  it('returns one warning per breached threshold', () => {
    expect(buildWarnings(BAD_AIR)).toHaveLength(5);
  });

  it('warns only about the pollutant that is actually high', () => {
    const warnings = buildWarnings({ ...CLEAN_AIR, pm2_5: 90 });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/PM2\.5/);
  });

  it('treats the limit itself as acceptable', () => {
    expect(buildWarnings({ ...CLEAN_AIR, pm2_5: 15 })).toEqual([]);
    expect(buildWarnings({ ...CLEAN_AIR, pm2_5: 15.1 })).toHaveLength(1);
  });

  it('returns nothing rather than throwing when there is no reading', () => {
    expect(buildWarnings(null)).toEqual([]);
    expect(buildWarnings(undefined)).toEqual([]);
  });
});

describe('recordAlerts', () => {
  const alert = (overrides = {}) => ({
    cityName: 'Delhi',
    aqi: 212,
    warnings: buildWarnings(BAD_AIR),
    now: T0,
    ...overrides,
  });

  it('records one row per warning', () => {
    const { history, changed } = recordAlerts([], alert());

    expect(changed).toBe(true);
    expect(history).toHaveLength(5);
    expect(history[0]).toMatchObject({ city: 'Delhi', aqi: 212 });
  });

  it('does not record the same warning set twice', () => {
    const first = recordAlerts([], alert());
    const second = recordAlerts(first.history, alert({ now: T0 + 60_000 }));

    expect(second.changed).toBe(false);
    expect(second.history).toBe(first.history);
  });

  it('survives the reload that used to duplicate everything', () => {
    // The ref that held the signature reset on mount, so this second call — the same
    // conditions after a page refresh — appended five more identical rows.
    const afterFirstLoad = recordAlerts([], alert()).history;
    const afterReload = recordAlerts(afterFirstLoad, alert({ now: T0 + 45_000 }));

    expect(afterReload.changed).toBe(false);
    expect(afterReload.history).toHaveLength(5);
  });

  it('records the same warning set again once the cooldown has passed', () => {
    const first = recordAlerts([], alert()).history;
    const later = recordAlerts(first, alert({ now: T0 + RECORD_COOLDOWN_MS + 1 }));

    expect(later.changed).toBe(true);
    expect(later.history).toHaveLength(10);
  });

  it('records a different city separately', () => {
    const delhi = recordAlerts([], alert()).history;
    const mumbai = recordAlerts(delhi, alert({ cityName: 'Mumbai', now: T0 + 1000 }));

    expect(mumbai.changed).toBe(true);
    expect(mumbai.history[0].city).toBe('Mumbai');
  });

  it('does not re-record a city switched away from and back to', () => {
    const delhi = recordAlerts([], alert()).history;
    const mumbai = recordAlerts(delhi, alert({ cityName: 'Mumbai', now: T0 + 1000 })).history;
    const back = recordAlerts(mumbai, alert({ now: T0 + 2000 }));

    expect(back.changed).toBe(false);
  });

  it('records a changed warning set for the same city', () => {
    const first = recordAlerts([], alert()).history;
    const narrower = recordAlerts(first, alert({
      warnings: buildWarnings({ ...CLEAN_AIR, pm2_5: 90 }),
      now: T0 + 1000,
    }));

    expect(narrower.changed).toBe(true);
    expect(narrower.history[0].warning).toMatch(/PM2\.5/);
  });

  it('records nothing when there are no warnings', () => {
    const { history, changed } = recordAlerts([], alert({ warnings: [] }));

    expect(changed).toBe(false);
    expect(history).toEqual([]);
  });

  it('newest first, capped at MAX_HISTORY', () => {
    let history = [];
    for (let i = 0; i < 20; i++) {
      history = recordAlerts(history, alert({
        cityName: `City ${i}`,
        warnings: buildWarnings(BAD_AIR),
        now: T0 + i * 1000,
      })).history;
    }

    expect(history).toHaveLength(MAX_HISTORY);
    expect(history[0].city).toBe('City 19');
  });

  it('stores an ISO timestamp, not a locale string', () => {
    const { history } = recordAlerts([], alert());

    expect(history[0].at).toBe('2026-08-12T09:00:00.000Z');
  });

  it('gives every row a distinct, stable id', () => {
    const { history } = recordAlerts([], alert());
    const ids = new Set(history.map((entry) => entry.id));

    expect(ids.size).toBe(history.length);
  });

  it('stores a missing AQI as null rather than as a number', () => {
    const { history } = recordAlerts([], alert({ aqi: undefined }));

    expect(history[0].aqi).toBeNull();
  });

  it('tolerates a corrupt history being passed in', () => {
    // @ts-ignore — deliberately wrong shape
    const { history, changed } = recordAlerts('not an array', alert());

    expect(changed).toBe(true);
    expect(history).toHaveLength(5);
  });

  it('does not mutate the list it was given', () => {
    const original = recordAlerts([], alert()).history;
    const copy = [...original];

    recordAlerts(original, alert({ cityName: 'Mumbai', now: T0 + 1000 }));

    expect(original).toEqual(copy);
  });
});

describe('isAlreadyRecorded', () => {
  it('ignores legacy rows that carry no signature', () => {
    const legacy = [{ timestamp: '12/08/2026, 21:04:11', city: 'Delhi', warning: 'PM2.5 is high.' }];

    expect(isAlreadyRecorded(legacy, alertSignature('Delhi', ['PM2.5 is high.']), T0)).toBe(false);
  });

  it('ignores a row whose timestamp cannot be parsed', () => {
    const broken = [{ signature: 'Delhi:x', at: 'not a date' }];

    expect(isAlreadyRecorded(broken, 'Delhi:x', T0)).toBe(false);
  });

  it('tolerates null entries', () => {
    expect(isAlreadyRecorded([null, undefined], 'Delhi:x', T0)).toBe(false);
  });
});

describe('storage', () => {
  it('reads back what it wrote', () => {
    const { history } = recordAlerts([], {
      cityName: 'Delhi',
      aqi: 212,
      warnings: buildWarnings(BAD_AIR),
      now: T0,
    });

    expect(writeAlertHistory(history)).toBe(true);
    expect(readAlertHistory()).toHaveLength(5);
  });

  it('returns an empty log for missing, corrupt or non-array storage', () => {
    expect(readAlertHistory()).toEqual([]);

    localStorage.setItem(ALERT_HISTORY_KEY, 'not json');
    expect(readAlertHistory()).toEqual([]);

    localStorage.setItem(ALERT_HISTORY_KEY, '{"a":1}');
    expect(readAlertHistory()).toEqual([]);
  });

  it('reports a refused write instead of throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });

    expect(writeAlertHistory([{ id: 1 }])).toBe(false);
  });

  it('clears the log', () => {
    writeAlertHistory([{ id: 1 }]);
    clearAlertHistory();

    expect(readAlertHistory()).toEqual([]);
  });
});

describe('formatAlertTimestamp', () => {
  it('formats an ISO timestamp for display', () => {
    const formatted = formatAlertTimestamp({ at: '2026-08-12T09:00:00.000Z' });

    expect(formatted).toBe(new Date('2026-08-12T09:00:00.000Z').toLocaleString());
  });

  it('passes a legacy pre-formatted string through unchanged', () => {
    expect(formatAlertTimestamp({ timestamp: '12/08/2026, 21:04:11' })).toBe('12/08/2026, 21:04:11');
  });

  it('prefers the ISO field when a row somehow has both', () => {
    const formatted = formatAlertTimestamp({
      at: '2026-08-12T09:00:00.000Z',
      timestamp: 'whatever',
    });

    expect(formatted).not.toBe('whatever');
  });

  it('returns an empty string for an unusable entry', () => {
    expect(formatAlertTimestamp(null)).toBe('');
    expect(formatAlertTimestamp({})).toBe('');
    expect(formatAlertTimestamp({ at: 'not a date' })).toBe('');
  });
});

describe('alertEntryKey', () => {
  it('uses the row id when there is one', () => {
    expect(alertEntryKey({ id: 'abc' }, 3)).toBe('abc');
  });

  it('builds a key for a legacy row from its own fields', () => {
    const key = alertEntryKey({ timestamp: 't', city: 'Delhi', warning: 'w' }, 0);

    expect(key).toContain('Delhi');
    expect(key).toContain('w');
  });

  it('keeps legacy rows distinguishable from each other', () => {
    const a = alertEntryKey({ timestamp: 't', city: 'Delhi', warning: 'one' }, 0);
    const b = alertEntryKey({ timestamp: 't', city: 'Delhi', warning: 'two' }, 1);

    expect(a).not.toBe(b);
  });
});
