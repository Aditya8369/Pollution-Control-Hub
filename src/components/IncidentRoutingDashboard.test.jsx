import { render, screen, waitFor, within, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Cover for #1071.
 *
 * The service is mocked throughout: these are about what the table renders and
 * which response it believes, not about the transport.
 */

const fetchRoutedIncidents = vi.fn();
const updateIncidentStatus = vi.fn();

vi.mock('../services/incidentRoutingService', () => ({
  fetchRoutedIncidents: (...args) => fetchRoutedIncidents(...args),
  updateIncidentStatus: (...args) => updateIncidentStatus(...args),
}));

const IncidentRoutingDashboard = (await import('./IncidentRoutingDashboard')).default;

/** @param {Partial<any>} [overrides] */
function incident(overrides = {}) {
  return {
    id: 'incident-1',
    category: 'INDUSTRIAL_EMISSION',
    status: 'ROUTED',
    severity: 'CRITICAL',
    description: 'Thick black smoke from the chimney since 6am.',
    assignedDepartment: 'Pollution Control Board',
    routingConfidence: 66,
    reportedAt: '2026-08-20T09:00:00.000Z',
    ...overrides,
  };
}

/** A promise plus the functions that settle it, for ordering tests. */
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

/** Settle whatever the mocks resolved, inside act, so React commits it. */
async function flush() {
  await act(async () => { await Promise.resolve(); });
}

beforeEach(() => {
  fetchRoutedIncidents.mockReset();
  updateIncidentStatus.mockReset();
});

describe('IncidentRoutingDashboard — severity colour (#1071)', () => {
  it('colours the severity cell instead of emitting the call as a class name', async () => {
    fetchRoutedIncidents.mockResolvedValue([
      incident({ id: 'a', severity: 'CRITICAL' }),
      incident({ id: 'b', severity: 'LOW', category: 'CONSTRUCTION_DUST' }),
    ]);

    render(<IncidentRoutingDashboard />);

    const critical = await screen.findByText('CRITICAL');
    const low = screen.getByText('LOW');

    expect(critical.className).toContain('text-red-600');
    expect(low.className).toContain('text-green-600');

    // The specific breakage: the whole call arrived in the DOM as a class token.
    expect(critical.className).not.toContain('getSeverityColor');
    expect(critical.className).not.toContain('{');
  });

  it('gives two different severities two different colours', async () => {
    fetchRoutedIncidents.mockResolvedValue([
      incident({ id: 'a', severity: 'CRITICAL' }),
      incident({ id: 'b', severity: 'LOW' }),
    ]);

    render(<IncidentRoutingDashboard />);

    await screen.findByText('CRITICAL');
    expect(screen.getByText('CRITICAL').className).not.toBe(screen.getByText('LOW').className);
  });

  it('falls back to a neutral colour for a severity it does not know', async () => {
    fetchRoutedIncidents.mockResolvedValue([incident({ severity: 'CATASTROPHIC' })]);

    render(<IncidentRoutingDashboard />);

    const cell = await screen.findByText('CATASTROPHIC');
    expect(cell.className).toContain('text-gray-600');
  });
});

describe('IncidentRoutingDashboard — category names (#1071)', () => {
  it('replaces every underscore, not only the first', async () => {
    fetchRoutedIncidents.mockResolvedValue([
      incident({ category: 'INDUSTRIAL_EMISSION_STACK' }),
    ]);

    render(<IncidentRoutingDashboard />);

    expect(await screen.findByText('INDUSTRIAL EMISSION STACK')).toBeInTheDocument();
  });
});

describe('IncidentRoutingDashboard — a failed load (#1071)', () => {
  it('shows the error with a retry rather than replacing the table for good', async () => {
    fetchRoutedIncidents.mockRejectedValueOnce(new Error('Network is down.'));

    render(<IncidentRoutingDashboard />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Network is down.');
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    // The table is still on screen, empty, rather than swapped out entirely.
    expect(screen.getByText(/no incidents found/i)).toBeInTheDocument();
  });

  it('clears the error once a load succeeds', async () => {
    fetchRoutedIncidents
      .mockRejectedValueOnce(new Error('Network is down.'))
      .mockResolvedValueOnce([incident()]);

    render(<IncidentRoutingDashboard />);

    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    // Before the fix the incidents were fetched and stored, and the red panel
    // rendered ahead of the table for the rest of the session.
    expect(await screen.findByText('CRITICAL')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('does not treat a non-array response as a list', async () => {
    fetchRoutedIncidents.mockResolvedValue({ message: 'Internal server error' });

    render(<IncidentRoutingDashboard />);

    expect(await screen.findByText(/no incidents found/i)).toBeInTheDocument();
  });
});

describe('IncidentRoutingDashboard — overlapping loads (#1071)', () => {
  it('renders the response for the filter that is selected, not the one that arrives last', async () => {
    const routed = deferred();
    const resolved = deferred();

    fetchRoutedIncidents
      .mockReturnValueOnce(Promise.resolve([incident({ id: 'initial', severity: 'MODERATE' })]))
      .mockReturnValueOnce(routed.promise)
      .mockReturnValueOnce(resolved.promise);

    render(<IncidentRoutingDashboard />);
    await screen.findByText('MODERATE');

    const filter = screen.getByLabelText(/filter incidents by status/i);
    fireEvent.change(filter, { target: { value: 'ROUTED' } });
    await flush();
    fireEvent.change(filter, { target: { value: 'RESOLVED' } });
    await flush();

    // The RESOLVED request comes back first, then the stale ROUTED one.
    await act(async () => {
      resolved.resolve([incident({ id: 'resolved-1', severity: 'LOW', status: 'RESOLVED' })]);
      await resolved.promise;
    });
    expect(await screen.findByText('LOW')).toBeInTheDocument();

    await act(async () => {
      routed.resolve([incident({ id: 'routed-1', severity: 'HIGH', status: 'ROUTED' })]);
      await routed.promise;
    });

    expect(screen.getByText('LOW')).toBeInTheDocument();
    expect(screen.queryByText('HIGH')).not.toBeInTheDocument();
  });

  it('does not set state after unmount', async () => {
    const pending = deferred();
    fetchRoutedIncidents.mockReturnValue(pending.promise);

    const { unmount } = render(<IncidentRoutingDashboard />);
    unmount();

    await act(async () => {
      pending.resolve([incident()]);
      await pending.promise;
    });

    // Reaching here without React warning about an update on an unmounted
    // component is the assertion.
    expect(screen.queryByText('CRITICAL')).not.toBeInTheDocument();
  });
});

describe('IncidentRoutingDashboard — the update dialog (#1071)', () => {
  async function openDialog() {
    fetchRoutedIncidents.mockResolvedValue([incident()]);
    render(<IncidentRoutingDashboard />);
    await screen.findByText('CRITICAL');
    fireEvent.click(screen.getByRole('button', { name: /update status of/i }));
    return await screen.findByRole('dialog');
  }

  it('is a labelled modal dialog', async () => {
    const dialog = await openDialog();

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Update Incident Status');
  });

  it('moves focus into the dialog when it opens', async () => {
    const dialog = await openDialog();

    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });

  it('closes on Escape and puts focus back on the row control', async () => {
    await openDialog();
    const opener = screen.getByRole('button', { name: /update status of/i });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.activeElement).toBe(opener);
  });

  it('preselects the next status in the lifecycle', async () => {
    const dialog = await openDialog();

    // The incident is ROUTED, so the operator's next move is VERIFIED.
    expect(within(dialog).getByLabelText(/new status/i)).toHaveValue('VERIFIED');
  });

  it('reports a failed update in the page rather than a blocking alert', async () => {
    const dialog = await openDialog();
    updateIncidentStatus.mockRejectedValue(new Error('Not authorised to dispatch.'));

    fireEvent.click(within(dialog).getByRole('button', { name: /save update/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Not authorised to dispatch.');
  });

  it('sends the incident id, the chosen status and the notes', async () => {
    const dialog = await openDialog();
    updateIncidentStatus.mockResolvedValue({});

    fireEvent.change(within(dialog).getByLabelText(/verification notes/i), {
      target: { value: 'Site visited.' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /save update/i }));

    await waitFor(() =>
      expect(updateIncidentStatus).toHaveBeenCalledWith('incident-1', 'VERIFIED', 'Site visited.')
    );
  });
});
