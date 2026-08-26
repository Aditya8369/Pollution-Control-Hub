/**
 * Builds the week-column grid behind CalendarHeatmap.
 *
 * The component used to derive each cell's weekday from its index in the data array:
 * pad the front to Sunday, then slice into sevens. That is only correct while the
 * input is a gapless run of calendar days. The data comes from a Map keyed by date
 * string, so any date the archive omits is simply absent -- not a null placeholder --
 * and the array is one element shorter. From that point every later cell rendered one
 * row too high, under the wrong weekday, with its tooltip still reporting the true
 * date. Over a 3-year window with scattered gaps the grid stopped corresponding to
 * the calendar at all.
 *
 * This walks the calendar day by day and looks each date up instead, so a cell's
 * position is a function of its date and nothing else.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses 'YYYY-MM-DD' to a local Date fixed at midday.
 *
 * Midday, not midnight: in zones where DST springs forward at 00:00 the local midnight
 * of that date does not exist, and Date rolls it to the previous day -- which would
 * shift a column by one. Midday is never affected by a one-hour shift.
 *
 * @param {string} dateStr
 * @returns {Date|null} null when the string is not a valid calendar date.
 */
export function parseDate(dateStr) {
  if (typeof dateStr !== 'string' || !DATE_PATTERN.test(dateStr)) return null;

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  // Rejects impossible dates that Date would silently roll over (2024-02-31 -> Mar 2).
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Formats a Date back to 'YYYY-MM-DD' in local time.
 *
 * toISOString() is not usable here -- it converts to UTC first, so any zone behind
 * UTC reports the previous day.
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** @param {Date} date @param {number} days */
function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * A day is only a reading if it carries a finite number.
 *
 * The worker emits null for days the archive has no measurement for. Treating null as
 * a value would put it through getAQIBand(), and a bare `null <= 50` comparison would
 * band it as "Good".
 *
 * @param {unknown} value
 */
function hasReading(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * @typedef {Object} CalendarCell
 * @property {'pad'|'day'} kind  'pad' is outside the data range entirely; 'day' is a
 *   real calendar day within it, which may or may not carry a reading.
 * @property {string|null} date
 * @property {number|null} maxAqi
 * @property {boolean} hasReading
 * @property {object|null} entry The original record, for tooltips.
 */

/**
 * @param {Array<{date: string, maxAqi: number|null}>} data
 * @returns {{
 *   weeks: CalendarCell[][],
 *   markers: Array<{weekIndex: number, label: string, month: number, year: number, isFirstOfYear: boolean}>,
 *   firstDate: string|null,
 *   lastDate: string|null,
 *   daysInRange: number,
 *   daysWithReadings: number,
 *   missingDays: number,
 * }}
 */
export function buildCalendarGrid(data) {
  const empty = {
    weeks: [],
    markers: [],
    firstDate: null,
    lastDate: null,
    daysInRange: 0,
    daysWithReadings: 0,
    missingDays: 0,
  };

  if (!Array.isArray(data) || data.length === 0) return empty;

  // Index by date rather than trusting order. A duplicate date keeps the last entry,
  // which is what a Map-derived source would have produced anyway.
  // Track first/last date as we insert instead of sorting all keys afterward --
  // that turns the range lookup from O(n log n) into O(n), which matters once
  // `data` spans a multi-year window with thousands of entries.
  /** @type {Map<string, any>} */
  const byDate = new Map();
  let firstDate = null;
  let lastDate = null;
  for (const entry of data) {
    if (!entry || !parseDate(entry.date)) continue;
    byDate.set(entry.date, entry);
    if (firstDate === null || entry.date < firstDate) firstDate = entry.date;
    if (lastDate === null || entry.date > lastDate) lastDate = entry.date;
  }

  if (byDate.size === 0) return empty;

  const first = parseDate(firstDate);
  const last = parseDate(lastDate);

  // Expand outward to whole weeks: back to the Sunday on or before the first date,
  // forward to the Saturday on or after the last. The old code padded the front but
  // not the back, so the final column rendered short and the grid lost its bottom edge.
  const gridStart = addDays(first, -first.getDay());
  const gridEnd = addDays(last, 6 - last.getDay());

  const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / MS_PER_DAY) + 1;

  /** @type {CalendarCell[][]} */
  const weeks = [];
  /** @type {CalendarCell[]} */
  let week = [];

  let daysInRange = 0;
  let daysWithReadings = 0;
  let missingDays = 0;

  let cursor = gridStart;
  for (let i = 0; i < totalDays; i++) {
    const dateStr = formatDate(cursor);
    const withinRange = dateStr >= firstDate && dateStr <= lastDate;

    if (!withinRange) {
      week.push({ kind: 'pad', date: null, maxAqi: null, hasReading: false, entry: null });
    } else {
      const entry = byDate.get(dateStr) || null;
      const value = entry ? entry.maxAqi : null;
      const measured = hasReading(value);

      daysInRange++;
      if (measured) daysWithReadings++;
      else missingDays++;

      week.push({
        kind: 'day',
        date: dateStr,
        maxAqi: measured ? value : null,
        hasReading: measured,
        entry,
      });
    }

    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }

    cursor = addDays(cursor, 1);
  }

  // The loop spans whole weeks, so this should never fire -- kept so a future change to
  // the bounds cannot silently drop a partial column.
  if (week.length > 0) {
    while (week.length < 7) {
      week.push({ kind: 'pad', date: null, maxAqi: null, hasReading: false, entry: null });
    }
    weeks.push(week);
  }

  return {
    weeks,
    markers: computeMonthMarkers(weeks),
    firstDate,
    lastDate,
    daysInRange,
    daysWithReadings,
    missingDays,
  };
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Labels the first column of each month.
 *
 * Reads the month off the first real day in a column. Now that every column spans a
 * known 7-day range this is stable; previously it inherited the array-position drift
 * and the headings sat over the wrong columns.
 *
 * @param {CalendarCell[][]} weeks
 */
export function computeMonthMarkers(weeks) {
  const markers = [];
  let lastMonth = -1;
  let lastYear = -1;

  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex++) {
    const firstDay = weeks[weekIndex].find((cell) => cell.kind === 'day');
    if (!firstDay || !firstDay.date) continue;

    const [yearStr, monthStr] = firstDay.date.split('-');
    const month = parseInt(monthStr, 10) - 1;
    const year = parseInt(yearStr, 10);

    // Compare the year too. A 3-year window revisits every month, and comparing the
    // month alone would suppress the label whenever a year rolled over into the same
    // month the data started in.
    if (month !== lastMonth || year !== lastYear) {
      markers.push({
        weekIndex,
        label: MONTH_NAMES[month],
        month,
        year,
        isFirstOfYear: month === 0,
      });
      lastMonth = month;
      lastYear = year;
    }
  }

  return markers;
}

export { MONTH_NAMES };
