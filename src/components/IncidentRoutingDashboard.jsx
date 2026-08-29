import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { fetchRoutedIncidents, updateIncidentStatus } from '../services/incidentRoutingService';

/**
 * @component IncidentRoutingDashboard
 * @description Administrative UI for viewing routed incidents, updating verification status, and adding official notes.
 */

/** Statuses the operator can move an incident to, in lifecycle order. */
const UPDATABLE_STATUSES = ['VERIFIED', 'DISPATCHED', 'RESOLVED'];

/** A closed modal, and the value the Cancel button resets to. */
const CLOSED_MODAL = { open: false, incidentId: null, status: '', notes: '' };

/**
 * The status an operator would move `current` to next.
 *
 * Anything already past DISPATCHED, or with a status the server invented after
 * this component was written, falls through to RESOLVED — the terminal state,
 * and the one an operator can always reach.
 *
 * @param {string} current
 * @returns {string}
 */
function nextStatusAfter(current) {
  if (current === 'ROUTED') return 'VERIFIED';
  if (current === 'VERIFIED') return 'DISPATCHED';
  return 'RESOLVED';
}

/**
 * `INDUSTRIAL_EMISSION` as `INDUSTRIAL EMISSION`.
 *
 * `.replace('_', ' ')` rewrites the first underscore only, so a three-word
 * category kept its second one. Every category in `IncidentCategory` happens to
 * have at most one today; the ones a later rule adds will not.
 *
 * @param {string} value
 * @returns {string}
 */
function humaniseCategory(value) {
  return typeof value === 'string' ? value.split('_').join(' ') : '';
}

const IncidentRoutingDashboard = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  // Whether a load has ever completed. The full-page spinner is for the first
  // one only: a refetch after a filter change used to unmount the table, which
  // took the status dropdown with it — the operator lost the control they had
  // just used, mid-interaction.
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [noteModal, setNoteModal] = useState(CLOSED_MODAL);
  const [actionLoading, setActionLoading] = useState(false);

  // Which load is allowed to write to state. Selecting a filter and then another
  // fires two requests, and nothing guarantees they come back in order: if the
  // first resolves last it would overwrite the second's incidents while the
  // dropdown still reads the second filter. `fetchRoutedIncidents` takes no
  // AbortSignal to cancel with (#1075), so the stale response is discarded on
  // arrival instead. The same counter covers unmount — the cleanup bumps it, so
  // an in-flight load has no sequence to match and sets nothing.
  const loadSequence = useRef(0);

  const dialogRef = useRef(null);
  // The control that opened the modal, so focus can go back where it came from.
  const openerRef = useRef(null);
  const dialogTitleId = useId();

  const loadIncidents = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    try {
      const data = await fetchRoutedIncidents(filterStatus === 'ALL' ? undefined : filterStatus);
      if (sequence !== loadSequence.current) return;
      setIncidents(Array.isArray(data) ? data : []);
      // A load that succeeds clears the previous failure. Without this the red
      // panel below renders ahead of the table for the rest of the session: the
      // incidents were fetched and stored, and none of them were ever shown.
      setError(null);
    } catch (err) {
      if (sequence !== loadSequence.current) return;
      setError(err?.message || 'Failed to fetch routed incidents.');
    } finally {
      if (sequence === loadSequence.current) {
        setLoading(false);
        setHasLoaded(true);
      }
    }
  }, [filterStatus]);

  useEffect(() => {
    loadIncidents();
    return () => {
      loadSequence.current += 1;
    };
  }, [loadIncidents]);

  const closeModal = useCallback(() => {
    setNoteModal(CLOSED_MODAL);
    const opener = openerRef.current;
    openerRef.current = null;
    // Returning focus to the row's Update button leaves a keyboard operator
    // where they were in the table, rather than back at the top of the document.
    if (opener && typeof opener.focus === 'function') opener.focus();
  }, []);

  const openModal = (incident, event) => {
    openerRef.current = event?.currentTarget ?? null;
    setNoteModal({
      open: true,
      incidentId: incident.id,
      status: nextStatusAfter(incident.status),
      notes: incident.verificationNotes || '',
    });
  };

  // Move focus into the dialog when it opens, and close it on Escape. Without
  // the first, Tab from the still-focused Update button walks the table sitting
  // underneath the overlay; without the second, Cancel is the only way out and
  // it has to be found by tabbing.
  useEffect(() => {
    if (!noteModal.open) return undefined;

    const dialog = dialogRef.current;
    if (dialog) {
      const first = dialog.querySelector('select, textarea, button');
      if (first) first.focus();
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !actionLoading) {
        event.stopPropagation();
        closeModal();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [noteModal.open, actionLoading, closeModal]);

  const handleStatusUpdate = async () => {
    if (!noteModal.incidentId || !noteModal.status) return;

    setActionLoading(true);
    try {
      await updateIncidentStatus(noteModal.incidentId, noteModal.status, noteModal.notes);
      closeModal();
      await loadIncidents();
    } catch (err) {
      setError(err?.message || 'Failed to update incident status.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      ROUTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      VERIFIED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      DISPATCHED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      RESOLVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    };
    return colors[status] || colors.PENDING;
  };

  const getSeverityColor = (severity) => {
    const colors = {
      LOW: 'text-green-600 dark:text-green-400',
      MODERATE: 'text-yellow-600 dark:text-yellow-400',
      HIGH: 'text-orange-600 dark:text-orange-400',
      CRITICAL: 'text-red-600 dark:text-red-400',
    };
    return colors[severity] || 'text-gray-600 dark:text-gray-400';
  };

  if (loading && !hasLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" role="status" aria-live="polite">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="sr-only">Loading routed incidents…</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6" aria-busy={loading}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Incident Verification &amp; Routing</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review, verify, and update the lifecycle status of community-reported pollution incidents.
          </p>
        </div>

        <div>
          <label htmlFor="incident-status-filter" className="sr-only">Filter incidents by status</label>
          <select
            id="incident-status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ROUTED">Routed</option>
            <option value="VERIFIED">Verified</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/*
        The error sits above the table rather than replacing it. A failed refetch
        after a successful one still has incidents worth showing, and replacing
        the whole view meant the only way back was a page reload.
      */}
      {error && (
        <div
          role="alert"
          className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 flex flex-wrap items-center justify-between gap-3"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={loadIncidents}
            className="px-3 py-1.5 border border-red-300 dark:border-red-700 rounded-md font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-opacity ${loading ? 'opacity-60' : ''}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <caption className="sr-only">
              Community-reported pollution incidents, their routing category, severity, and lifecycle status.
            </caption>
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Severity</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Department</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {incidents.length > 0 ? (
                incidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {new Date(incident.reportedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {humaniseCategory(incident.category)}
                      <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal">
                        {incident.routingConfidence}% confidence
                      </span>
                    </td>
                    {/*
                      This cell used to read
                        className="… font-bold {getSeverityColor(incident.severity)}"
                      — braces inside a quoted string, so `getSeverityColor` was
                      never called and the call itself was emitted as a class
                      token. CRITICAL and LOW rendered identically (#1071).
                    */}
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${getSeverityColor(incident.severity)}`}>
                      {incident.severity}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={incident.description}>
                      {incident.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {incident.assignedDepartment || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(incident.status)}`}>
                        {incident.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {incident.status !== 'RESOLVED' && (
                        <button
                          type="button"
                          onClick={(event) => openModal(incident, event)}
                          /*
                            Seven rows of a button that all read "Update" are
                            seven identical entries in a screen reader's control
                            list. The visible word is kept as the first word of
                            the label so the two still match.
                          */
                          aria-label={`Update status of ${humaniseCategory(incident.category)} incident reported ${new Date(incident.reportedAt).toLocaleDateString()}`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                        >
                          Update
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No incidents found matching the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Status Modal */}
      {noteModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700"
          >
            <h3 id={dialogTitleId} className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Update Incident Status</h3>

            <div className="mb-4">
              <label htmlFor="incident-new-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Status</label>
              <select
                id="incident-new-status"
                value={noteModal.status}
                onChange={(e) => setNoteModal((current) => ({ ...current, status: e.target.value }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              >
                {UPDATABLE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label htmlFor="incident-verification-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Verification Notes</label>
              <textarea
                id="incident-verification-notes"
                value={noteModal.notes}
                onChange={(e) => setNoteModal((current) => ({ ...current, notes: e.target.value }))}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                rows={4}
                placeholder="Add details about verification, actions taken, or resolution..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusUpdate}
                disabled={actionLoading}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Save Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentRoutingDashboard;
