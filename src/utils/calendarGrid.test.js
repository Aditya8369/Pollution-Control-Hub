import { describe, it, expect } from 'vitest';
import { buildCalendarGrid, parseDate, formatDate, computeMonthMarkers } from './calendarGrid';

/** Finds the cell for a given date and returns [weekIndex, dayIndex]. */
function locate(weeks, dateStr) {
  for (let w = 0; w < weeks.length; w++) {
    const d = weeks[w].findIndex((cell) => cell.date === dateStr);
    if (d !== -1) return [w, d];
  }
  return [-1, -1];
}

/** The weekday row a date actually falls on, from the Date API. */
function trueWeekday(dateStr) {
  return parseDate(dateStr).getDay();
}

function days(dateStrings, aqi = 50) {
  return dateStrings.map((date) => ({ date, maxAqi: aqi }));
}

describe('buildCalendarGrid - weekday alignment (regression for #646)', () => {
  it('places every day in its true weekday row when the run is contiguous', () => {
    const data = days(
      Array.from({ length: 40 }, (_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`)
        .filter((d) => d <= '2024-01-31')
    );

    const { weeks } = buildCalendarGrid(data);

    for (const { date } of data) {
      const [, dayIndex] = locate(weeks, date);
      expect(dayIndex).toBe(trueWeekday(date));
    }
  });

  it('keeps every later day in its true weekday row when one day is missing', () => {
    // 2024-01-01 is a Monday. The old implementation padded one leading cell, then
    // sliced by 7 -- so dropping the 10th shifted everything after it up a row.
    const dates = [];
    for (let d = 1; d <= 28; d++) {
      if (d === 10) continue;
      dates.push(`2024-01-${String(d).padStart(2, '0')}`);
    }

    const { weeks } = buildCalendarGrid(days(dates));

    for (const date of dates) {
      const [, dayIndex] = locate(weeks, date);
      expect(dayIndex).toBe(trueWeekday(date));
    }
  });

  it('survives many scattered gaps without drifting', () => {
    const dates = [];
    for (let d = 1; d <= 28; d++) {
      if (d % 3 === 0) continue; // drop roughly a third of the month
      dates.push(`2024-02-${String(d).padStart(2, '0')}`);
    }

    const { weeks } = buildCalendarGrid(days(dates));

    for (const date of dates) {
      const [, dayIndex] = locate(weeks, date);
      expect(dayIndex).toBe(trueWeekday(date));
    }
  });

  it('reinstates a missing day as an explicit no-reading cell', () => {
    const dates = ['2024-01-01', '2024-01-02', '2024-01-04'];

    const { weeks, missingDays, daysWithReadings } = buildCalendarGrid(days(dates));

    const [w, d] = locate(weeks, '2024-01-03');
    expect(w).not.toBe(-1); // the gap is represented, not skipped
    expect(weeks[w][d].kind).toBe('day');
    expect(weeks[w][d].hasReading).toBe(false);
    expect(weeks[w][d].maxAqi).toBeNull();

    expect(missingDays).toBe(1);
    expect(daysWithReadings).toBe(3);
  });

  it('sorts unordered input rather than trusting array order', () => {
    const { weeks } = buildCalendarGrid(
      days(['2024-01-05', '2024-01-01', '2024-01-03'])
    );

    for (const date of ['2024-01-01', '2024-01-03', '2024-01-05']) {
      const [, dayIndex] = locate(weeks, date);
      expect(dayIndex).toBe(trueWeekday(date));
    }
  });
});

describe('buildCalendarGrid - grid shape', () => {
  it('starts on a Sunday and ends on a Saturday', () => {
    const { weeks } = buildCalendarGrid(days(['2024-01-03', '2024-01-17']));

    expect(weeks[0]).toHaveLength(7);
    expect(weeks[weeks.length - 1]).toHaveLength(7);
  });

  it('pads every column to a full 7 cells', () => {
    // The old slice(i, i + 7) left the final column short whenever the total was not
    // a multiple of 7, so the grid lost its bottom edge.
    const { weeks } = buildCalendarGrid(days(['2024-01-01', '2024-01-02', '2024-01-03']));

    for (const week of weeks) {
      expect(week).toHaveLength(7);
    }
  });

  it('marks cells outside the data range as padding, not as missing days', () => {
    // 2024-01-03 is a Wednesday, so Sun-Tue before it are structural padding and must
    // not be counted as days the archive failed to cover.
    const { weeks, daysInRange, missingDays } = buildCalendarGrid(days(['2024-01-03']));

    expect(weeks[0].slice(0, 3).every((c) => c.kind === 'pad')).toBe(true);
    expect(daysInRange).toBe(1);
    expect(missingDays).toBe(0);
  });

  it('reports the range bounds it was given', () => {
    const grid = buildCalendarGrid(days(['2024-01-10', '2024-03-05']));

    expect(grid.firstDate).toBe('2024-01-10');
    expect(grid.lastDate).toBe('2024-03-05');
  });

  it('counts a day present but unmeasured as missing', () => {
    const grid = buildCalendarGrid([
      { date: '2024-01-01', maxAqi: 40 },
      { date: '2024-01-02', maxAqi: null },
    ]);

    expect(grid.daysWithReadings).toBe(1);
    expect(grid.missingDays).toBe(1);
  });

  it('treats a measured zero as a reading', () => {
    const grid = buildCalendarGrid([{ date: '2024-01-01', maxAqi: 0 }]);

    expect(grid.daysWithReadings).toBe(1);
    expect(grid.missingDays).toBe(0);
    const [w, d] = locate(grid.weeks, '2024-01-01');
    expect(grid.weeks[w][d].maxAqi).toBe(0);
  });

  it('rejects NaN as a reading', () => {
    const grid = buildCalendarGrid([{ date: '2024-01-01', maxAqi: NaN }]);

    expect(grid.daysWithReadings).toBe(0);
    expect(grid.missingDays).toBe(1);
  });
});

describe('buildCalendarGrid - long ranges and boundaries', () => {
  it('spans a leap day correctly', () => {
    const { weeks } = buildCalendarGrid(days(['2024-02-27', '2024-02-28', '2024-02-29', '2024-03-01']));

    for (const date of ['2024-02-28', '2024-02-29', '2024-03-01']) {
      const [, dayIndex] = locate(weeks, date);
      expect(dayIndex).toBe(trueWeekday(date));
    }
  });

  it('stays aligned across a 3-year window with gaps', () => {
    const data = [];
    const cursor = new Date(2021, 0, 1, 12);
    const end = new Date(2023, 11, 31, 12);
    let n = 0;
    while (cursor <= end) {
      n++;
      if (n % 7 !== 0) {
        data.push({ date: formatDate(cursor), maxAqi: 50 });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    const { weeks } = buildCalendarGrid(data);

    // Spot-check the tail, where cumulative drift would be worst.
    for (const { date } of data.slice(-30)) {
      const [, dayIndex] = locate(weeks, date);
      expect(dayIndex).toBe(trueWeekday(date));
    }
  });

  it('crosses a year boundary without misplacing days', () => {
    const { weeks } = buildCalendarGrid(days(['2023-12-30', '2023-12-31', '2024-01-01', '2024-01-02']));

    for (const date of ['2023-12-30', '2023-12-31', '2024-01-01', '2024-01-02']) {
      const [, dayIndex] = locate(weeks, date);
      expect(dayIndex).toBe(trueWeekday(date));
    }
  });
});

describe('buildCalendarGrid - bad input', () => {
  it('returns an empty grid for empty or non-array input', () => {
    for (const input of [[], null, undefined, 'nope', 42]) {
      const grid = buildCalendarGrid(input);
      expect(grid.weeks).toEqual([]);
      expect(grid.firstDate).toBeNull();
    }
  });

  it('drops entries with unparseable dates', () => {
    const grid = buildCalendarGrid([
      { date: '2024-01-01', maxAqi: 50 },
      { date: 'not-a-date', maxAqi: 50 },
      { date: '2024-13-01', maxAqi: 50 },
      { date: '2024-02-31', maxAqi: 50 },
      null,
    ]);

    expect(grid.firstDate).toBe('2024-01-01');
    expect(grid.lastDate).toBe('2024-01-01');
    expect(grid.daysInRange).toBe(1);
  });

  it('returns an empty grid when nothing parses', () => {
    expect(buildCalendarGrid([{ date: 'junk' }]).weeks).toEqual([]);
  });

  it('keeps the last entry for a duplicated date', () => {
    const grid = buildCalendarGrid([
      { date: '2024-01-01', maxAqi: 10 },
      { date: '2024-01-01', maxAqi: 90 },
    ]);

    const [w, d] = locate(grid.weeks, '2024-01-01');
    expect(grid.weeks[w][d].maxAqi).toBe(90);
    expect(grid.daysInRange).toBe(1);
  });
});

describe('parseDate / formatDate', () => {
  it('round-trips a date without a timezone shift', () => {
    // toISOString() would report the previous day for any zone behind UTC.
    expect(formatDate(parseDate('2024-01-01'))).toBe('2024-01-01');
    expect(formatDate(parseDate('2024-12-31'))).toBe('2024-12-31');
    expect(formatDate(parseDate('2024-02-29'))).toBe('2024-02-29');
  });

  it('rejects malformed and impossible dates', () => {
    expect(parseDate('2024-02-31')).toBeNull();
    expect(parseDate('2023-02-29')).toBeNull(); // 2023 is not a leap year
    expect(parseDate('2024-13-01')).toBeNull();
    expect(parseDate('2024-1-1')).toBeNull();
    expect(parseDate('')).toBeNull();
    expect(parseDate(null)).toBeNull();
    expect(parseDate(20240101)).toBeNull();
  });

  it('anchors at midday so a DST shift cannot move the date', () => {
    expect(parseDate('2024-03-10').getHours()).toBe(12);
  });
});

describe('computeMonthMarkers', () => {
  it('labels the first column of each month', () => {
    const { weeks, markers } = buildCalendarGrid(
      days(
        Array.from({ length: 90 }, (_, i) => {
          const d = new Date(2024, 0, 1 + i, 12);
          return formatDate(d);
        })
      )
    );

    expect(markers.length).toBeGreaterThanOrEqual(3);
    expect(markers.map((m) => m.label).slice(0, 3)).toEqual(['Jan', 'Feb', 'Mar']);
    for (const marker of markers) {
      expect(marker.weekIndex).toBeLessThan(weeks.length);
    }
  });

  it('does not suppress a month label when the same month recurs a year later', () => {
    const weeks = [
      [{ kind: 'day', date: '2023-03-05' }],
      [{ kind: 'day', date: '2024-03-03' }],
    ];

    const markers = computeMonthMarkers(weeks);

    // Comparing the month alone would have collapsed these into one marker.
    expect(markers).toHaveLength(2);
    expect(markers[0].year).toBe(2023);
    expect(markers[1].year).toBe(2024);
  });

  it('skips columns made entirely of padding', () => {
    const markers = computeMonthMarkers([
      [{ kind: 'pad', date: null }],
      [{ kind: 'day', date: '2024-01-07' }],
    ]);

    expect(markers).toHaveLength(1);
    expect(markers[0].weekIndex).toBe(1);
  });
});
