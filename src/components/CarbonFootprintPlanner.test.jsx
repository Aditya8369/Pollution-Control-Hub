import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Cover for #1072 — what the form shows is what it submits, every category has
 * activities, and the date field means the visitor's day.
 */

const logActivity = vi.fn();
const fetchFootprintSummary = vi.fn();
const updateReductionStep = vi.fn();

vi.mock('../services/footprintPlannerService', () => ({
  logActivity: (...args) => logActivity(...args),
  fetchFootprintSummary: (...args) => fetchFootprintSummary(...args),
  updateReductionStep: (...args) => updateReductionStep(...args),
}));

const CarbonFootprintPlanner = (await import('./CarbonFootprintPlanner')).default;
const { EMISSION_CATEGORIES, activitiesFor } = await import('../constants/emissionActivities');

/** @param {Partial<any>} [overrides] */
function summary(overrides = {}) {
  return {
    totalEmissions: 120,
    projectedAnnualSavings: 40,
    monthlyBreakdown: [],
    categoryBreakdown: [],
    activeReductionSteps: [
      {
        id: 'step-1',
        title: 'Swap two car commutes for the metro',
        description: 'Two of your five weekly car trips are on a metro corridor.',
        category: 'COMMUTE',
        potentialSavingsKg: 18,
        difficulty: 'EASY',
        isCompleted: false,
      },
    ],
    ...overrides,
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

/**
 * `getByLabelText` is typed as `HTMLElement`; these read `.options`/`.value`.
 *
 * @param {RegExp|string} label
 * @returns {HTMLSelectElement}
 */
function selectByLabel(label) {
  return /** @type {HTMLSelectElement} */ (screen.getByLabelText(label));
}

/**
 * @param {RegExp|string} label
 * @returns {HTMLInputElement}
 */
function inputByLabel(label) {
  return /** @type {HTMLInputElement} */ (screen.getByLabelText(label));
}

/** Render and wait for the first summary to land. */
async function renderPlanner(data = summary()) {
  fetchFootprintSummary.mockResolvedValue(data);
  render(<CarbonFootprintPlanner />);
  await screen.findByLabelText(/^category$/i);
}

beforeEach(() => {
  logActivity.mockReset().mockResolvedValue({});
  updateReductionStep.mockReset().mockResolvedValue({});
  fetchFootprintSummary.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CarbonFootprintPlanner — the activity catalogue (#1072)', () => {
  it('offers activities for every category it offers', async () => {
    await renderPlanner();

    const categorySelect = selectByLabel(/^category$/i);
    const offered = Array.from(categorySelect.options).map((option) => option.value);

    expect(offered).toEqual(EMISSION_CATEGORIES);
    for (const category of offered) {
      expect(activitiesFor(category).length).toBeGreaterThan(0);
    }
  });

  it('renders activities for SHOPPING, which had none at all', async () => {
    await renderPlanner();

    fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: 'SHOPPING' } });

    const activitySelect = selectByLabel(/specific activity/i);
    expect(activitySelect.options.length).toBeGreaterThan(0);
  });
});

describe('CarbonFootprintPlanner — category switching (#1072)', () => {
  it('selects an activity from the new category rather than leaving state empty', async () => {
    await renderPlanner();

    fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: 'ENERGY' } });

    const activitySelect = selectByLabel(/specific activity/i);
    // Before the fix the select displayed the first option while state held ''.
    expect(activitySelect.value).toBe('electricity_grid');
    expect(activitySelect.value).not.toBe('');
  });

  it('submits the activity the form is showing', async () => {
    await renderPlanner();

    fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: 'ENERGY' } });
    fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: '40' } });
    fireEvent.submit(screen.getByRole('button', { name: /log activity/i }));

    await waitFor(() => expect(logActivity).toHaveBeenCalled());
    const sent = logActivity.mock.calls[0][0];
    expect(sent.category).toBe('ENERGY');
    // The exact defect: `{ category: 'ENERGY', subcategory: '' }` was posted
    // while the form read "Grid Electricity".
    expect(sent.subcategory).toBe('electricity_grid');
  });

  it('submits every category with a matching activity', async () => {
    await renderPlanner();

    for (const category of EMISSION_CATEGORIES) {
      logActivity.mockClear();
      fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: category } });
      fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: '5' } });
      fireEvent.submit(screen.getByRole('button', { name: /log activity/i }));

      await waitFor(() => expect(logActivity).toHaveBeenCalled());
      const sent = logActivity.mock.calls[0][0];
      expect(sent.category).toBe(category);
      expect(activitiesFor(category).map((a) => a.value)).toContain(sent.subcategory);
    }
  });

  it('sends quantity as a number, not the input string', async () => {
    await renderPlanner();

    fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: '12.5' } });
    fireEvent.submit(screen.getByRole('button', { name: /log activity/i }));

    await waitFor(() => expect(logActivity).toHaveBeenCalled());
    expect(logActivity.mock.calls[0][0].quantity).toBe(12.5);
  });

  it('refuses a quantity of zero without calling the API', async () => {
    await renderPlanner();

    fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: '0' } });
    fireEvent.submit(screen.getByRole('button', { name: /log activity/i }));

    expect(await screen.findByText(/greater than zero/i)).toBeInTheDocument();
    expect(logActivity).not.toHaveBeenCalled();
  });
});

describe('CarbonFootprintPlanner — the date default (#1072)', () => {
  it('pre-fills the local calendar day, not the UTC one', async () => {
    // 2026-03-15T20:30 in a UTC-5 zone is already 2026-03-16 in UTC. The old
    // `new Date().toISOString().split('T')[0]` filed this as the 16th.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 15, 20, 30, 0));

    await renderPlanner();

    const expected = `${2026}-03-15`;
    expect(screen.getByLabelText(/^date$/i)).toHaveValue(expected);
  });

  it('agrees with localDayKey for an early-morning time too', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 6, 4, 2, 15, 0));

    await renderPlanner();

    expect(screen.getByLabelText(/^date$/i)).toHaveValue('2026-07-04');
  });
});

describe('CarbonFootprintPlanner — a summary with no plan (#1072)', () => {
  it('renders an empty plan instead of throwing on .map', async () => {
    // `summary?.activeReductionSteps.map` guarded `summary` and not the array.
    await renderPlanner(summary({ activeReductionSteps: undefined }));

    expect(await screen.findByText(/a reduction plan will be built/i)).toBeInTheDocument();
  });

  it('still shows the totals it does have', async () => {
    await renderPlanner(summary({ activeReductionSteps: undefined }));

    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('shows a zero total rather than blanking it', async () => {
    await renderPlanner(summary({ totalEmissions: 0 }));

    expect(screen.getByText('0')).toBeInTheDocument();
  });
});

describe('CarbonFootprintPlanner — errors and double-clicks (#1072)', () => {
  it('clears the error once a load succeeds', async () => {
    fetchFootprintSummary
      .mockRejectedValueOnce(new Error('Summary service is down.'))
      .mockResolvedValueOnce(summary());

    render(<CarbonFootprintPlanner />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Summary service is down.');
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await screen.findByLabelText(/^category$/i);
    await waitFor(() => expect(screen.queryByText('Summary service is down.')).not.toBeInTheDocument());
  });

  it('ignores a second click on a reduction step while the first is in flight', async () => {
    await renderPlanner();

    const pending = deferred();
    updateReductionStep.mockReturnValue(pending.promise);

    const checkbox = screen.getByLabelText(/swap two car commutes/i);
    fireEvent.click(checkbox);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(checkbox);

    expect(updateReductionStep).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve({});
      await pending.promise;
    });
  });

  it('associates each checkbox with its step title', async () => {
    await renderPlanner();

    expect(inputByLabel(/swap two car commutes/i).type).toBe('checkbox');
  });

  it('reports a failed step toggle instead of a blocking alert', async () => {
    await renderPlanner();
    updateReductionStep.mockRejectedValue(new Error('Step no longer exists.'));

    fireEvent.click(screen.getByLabelText(/swap two car commutes/i));

    expect(await screen.findByRole('alert')).toHaveTextContent('Step no longer exists.');
  });
});
