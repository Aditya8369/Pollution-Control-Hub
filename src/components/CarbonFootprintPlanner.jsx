import React, { useCallback, useEffect, useRef, useState } from 'react';
import { logActivity, fetchFootprintSummary, updateReductionStep } from '../services/footprintPlannerService';
import {
  EMISSION_ACTIVITIES,
  EMISSION_CATEGORIES,
  activitiesFor,
  defaultActivityFor,
  isActivityInCategory,
  unitFor,
} from '../constants/emissionActivities';
import { localDayKey } from '../utils/localDay';

/**
 * @component CarbonFootprintPlanner
 * @description Comprehensive UI for activity logging, footprint trend charts, and interactive reduction plan checklists.
 */

/** The category the form opens on. */
const INITIAL_CATEGORY = 'COMMUTE';

/** A pristine form, evaluated fresh so `date` is today rather than mount day. */
function emptyForm() {
  return {
    category: INITIAL_CATEGORY,
    subcategory: defaultActivityFor(INITIAL_CATEGORY),
    quantity: '',
    // `new Date().toISOString().split('T')[0]` converts to UTC first, so it
    // pre-filled yesterday for anyone east of UTC in the small hours and
    // tomorrow for anyone west of it in the evening — and `<input type="date">`
    // accepts both. Fixed here for the fourth time in this repo (#669, #583,
    // #1015, #1072); `localDayKey` exists so it is the last.
    date: localDayKey(),
  };
}

const CarbonFootprintPlanner = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Which reduction steps have a PATCH in flight, so a second click on the same
  // checkbox is ignored rather than sending a second request and a second
  // refetch. Keyed by step id — toggling two different steps at once is fine.
  const [pendingSteps, setPendingSteps] = useState(() => new Set());

  const loadSequence = useRef(0);

  const loadSummary = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    try {
      const data = await fetchFootprintSummary();
      if (sequence !== loadSequence.current) return;
      setSummary(data);
      // A load that succeeds clears the previous failure; without this one bad
      // request pinned the red panel for the rest of the session.
      setError(null);
    } catch (err) {
      if (sequence !== loadSequence.current) return;
      setError(err?.message || 'Failed to fetch footprint summary.');
    } finally {
      if (sequence === loadSequence.current) {
        setLoading(false);
        setHasLoaded(true);
      }
    }
  }, []);

  useEffect(() => {
    loadSummary();
    return () => {
      loadSequence.current += 1;
    };
  }, [loadSummary]);

  /**
   * Switching category used to set `subcategory` to `''`. No option carries
   * that value, so the browser fell back to displaying the first option of the
   * new list while state stayed empty: the form showed "Grid Electricity" and
   * submitted `subcategory: ''`. Selecting the category's first activity keeps
   * the two in step.
   */
  const handleCategoryChange = (category) => {
    setFormError(null);
    setFormData((current) => ({
      ...current,
      category,
      subcategory: defaultActivityFor(category),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const quantity = Number(formData.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setFormError('Enter a quantity greater than zero.');
      return;
    }
    // Nothing checked this before. It could not be reached from the dropdown
    // once the category handler above is in place, but it is the guard that
    // makes that true rather than incidental.
    if (!isActivityInCategory(formData.category, formData.subcategory)) {
      setFormError('Choose an activity for this category.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await logActivity({ ...formData, quantity });
      setFormData((current) => ({ ...current, quantity: '' }));
      await loadSummary();
    } catch (err) {
      setFormError(err?.message || 'Failed to log activity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStepToggle = async (stepId, currentStatus) => {
    if (pendingSteps.has(stepId)) return;

    setPendingSteps((current) => new Set(current).add(stepId));
    try {
      await updateReductionStep(stepId, !currentStatus);
      await loadSummary();
    } catch (err) {
      setError(err?.message || 'Failed to update step status.');
    } finally {
      setPendingSteps((current) => {
        const next = new Set(current);
        next.delete(stepId);
        return next;
      });
    }
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      EASY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      MODERATE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      HARD: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[difficulty] || colors.EASY;
  };

  if (loading && !hasLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" role="status" aria-live="polite">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        <span className="sr-only">Loading your footprint summary…</span>
      </div>
    );
  }

  const activities = activitiesFor(formData.category);
  const quantityUnit = unitFor(formData.category, formData.subcategory);
  // `summary?.activeReductionSteps` guarded `summary` and not the array, so a
  // summary that came back without a plan — a new account is the obvious case —
  // threw on `.map`. The two stat cards below already handled the same shape.
  const reductionSteps = Array.isArray(summary?.activeReductionSteps)
    ? summary.activeReductionSteps
    : [];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8" aria-busy={loading}>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Carbon Footprint Tracker</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Log your daily activities, track your impact, and follow your personalized reduction plan.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 flex flex-wrap items-center justify-between gap-3"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={loadSummary}
            className="px-3 py-1.5 border border-red-300 dark:border-red-700 rounded-md font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Logging Form */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Log Activity</h3>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="footprint-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                id="footprint-category"
                value={formData.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              >
                {/*
                  Driven by the catalogue rather than written out, so the list of
                  categories and the list of activities cannot fall out of step
                  the way SHOPPING did.
                */}
                {EMISSION_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {EMISSION_ACTIVITIES[category].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="footprint-activity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Specific Activity</label>
              <select
                id="footprint-activity"
                value={formData.subcategory}
                onChange={(e) => {
                  setFormError(null);
                  setFormData((current) => ({ ...current, subcategory: e.target.value }));
                }}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              >
                {activities.map((activity) => (
                  <option key={activity.value} value={activity.value}>
                    {activity.label} (per {activity.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="footprint-quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity <span className="text-gray-500 dark:text-gray-400 font-normal">({quantityUnit})</span>
              </label>
              <input
                id="footprint-quantity"
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={formData.quantity}
                onChange={(e) => {
                  setFormError(null);
                  setFormData((current) => ({ ...current, quantity: e.target.value }));
                }}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                placeholder="e.g., 15"
                required
              />
            </div>

            <div>
              <label htmlFor="footprint-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input
                id="footprint-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((current) => ({ ...current, date: e.target.value }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            {formError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">{formError}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Logging...' : 'Log Activity'}
            </button>
          </form>
        </div>

        {/* Summary and Reduction Plan */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Emissions</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {summary?.totalEmissions ?? 0} <span className="text-lg font-normal text-gray-500">kg CO₂</span>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Projected Annual Savings</div>
              <div className="text-3xl font-bold text-green-600 mt-1">
                {summary?.projectedAnnualSavings ?? 0} <span className="text-lg font-normal text-gray-500">kg CO₂</span>
              </div>
            </div>
          </div>

          {/* Reduction Plan Checklist */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Your Personalized Reduction Plan</h3>
            {reductionSteps.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Log a few activities and a reduction plan will be built from them.
              </p>
            ) : (
              <div className="space-y-3">
                {reductionSteps.map((step) => (
                  <div
                    key={step.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${step.isCompleted
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
                      }`}
                  >
                    <input
                      id={`reduction-step-${step.id}`}
                      type="checkbox"
                      checked={Boolean(step.isCompleted)}
                      disabled={pendingSteps.has(step.id)}
                      onChange={() => handleStepToggle(step.id, step.isCompleted)}
                      className="mt-1 w-5 h-5 text-green-600 rounded focus:ring-green-500 border-gray-300 disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        {/*
                          The heading was not associated with the checkbox, so
                          the control announced as an unlabelled checkbox and the
                          step title was only reachable by reading around it.
                        */}
                        <label
                          htmlFor={`reduction-step-${step.id}`}
                          className={`font-semibold cursor-pointer ${step.isCompleted ? 'text-green-800 dark:text-green-300 line-through' : 'text-gray-900 dark:text-white'}`}
                        >
                          {step.title}
                        </label>
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getDifficultyColor(step.difficulty)}`}>
                          {step.difficulty}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{step.description}</p>
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium mt-2">
                        Potential savings: {step.potentialSavingsKg} kg CO₂/month
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarbonFootprintPlanner;
