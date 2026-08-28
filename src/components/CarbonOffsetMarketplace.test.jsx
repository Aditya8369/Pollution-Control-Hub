import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import CarbonOffsetMarketplace from './CarbonOffsetMarketplace';
import { fetchOffsetProjects, purchaseCarbonOffset, fetchUserPortfolio } from '../services/carbonOffsetService';

vi.mock('../services/carbonOffsetService', () => ({
    fetchOffsetProjects: vi.fn(),
    purchaseCarbonOffset: vi.fn(),
    fetchUserPortfolio: vi.fn(),
}));

function project(overrides = {}) {
    return {
        id: 'proj-1',
        name: 'Western Ghats Reforestation',
        description: 'Native canopy restoration across 400 hectares.',
        location: 'Karnataka, India',
        certification: 'GOLD_STANDARD_VER',
        pricePerTon: 15,
        availableTons: 500,
        ...overrides,
    };
}

async function renderLoaded(projects = [project()], portfolio = { totalOffsetTons: 12 }) {
    fetchOffsetProjects.mockResolvedValue(projects);
    fetchUserPortfolio.mockResolvedValue(portfolio);
    render(<CarbonOffsetMarketplace />);
    await waitFor(() => expect(screen.queryByTestId('marketplace-loading')).not.toBeInTheDocument());
}

/** Opens the purchase modal for the first project and sets the quantity field. */
function openModalWith(tons) {
    fireEvent.click(screen.getByRole('button', { name: /offset now/i }));
    if (tons !== undefined) {
        fireEvent.change(screen.getByLabelText(/tons of co/i), { target: { value: tons } });
    }
}

beforeEach(() => {
    purchaseCarbonOffset.mockResolvedValue({ ok: true });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('CarbonOffsetMarketplace — the total is never NaN', () => {
    it('prices a valid quantity', async () => {
        await renderLoaded();
        openModalWith('4');

        expect(screen.getByTestId('purchase-total')).toHaveTextContent('$60.00');
        expect(screen.getByRole('button', { name: /confirm purchase/i })).toBeEnabled();
    });

    it('shows a dash, not $NaN, for a half-typed number', async () => {
        await renderLoaded();
        openModalWith('-');

        expect(screen.getByTestId('purchase-total')).toHaveTextContent('—');
        expect(screen.getByTestId('purchase-total')).not.toHaveTextContent('NaN');
    });

    it('shows a dash, not a negative charge', async () => {
        await renderLoaded();
        openModalWith('-5');

        expect(screen.getByTestId('purchase-total')).toHaveTextContent('—');
        expect(screen.getByTestId('purchase-total')).not.toHaveTextContent('-75');
    });

    it('shows a dash for a cleared field rather than $0.00', async () => {
        await renderLoaded();
        openModalWith('');

        expect(screen.getByTestId('purchase-total')).toHaveTextContent('—');
    });
});

describe('CarbonOffsetMarketplace — Confirm is gated on a valid quantity', () => {
    const invalid = [
        ['a cleared field', '', /enter how many tons/i],
        ['zero', '0', /at least 1 ton/i],
        ['a negative quantity', '-5', /at least 1 ton/i],
        // A number input reports '' for content it cannot parse, so a half-typed
        // '1e' or '-' reaches the component as an empty field. `validateQuantity`
        // covers the raw-string cases directly in offsetQuantity.test.js; what
        // matters here is that neither path reaches the API or prints $NaN.
        ['a half-typed number', '1e', /enter how many tons/i],
        ['a fractional ton', '0.5', /whole tons/i],
        ['more than the project has', '501', /only 500 tons are available/i],
    ];

    it.each(invalid)('disables Confirm and explains why for %s', async (_label, value, message) => {
        await renderLoaded();
        openModalWith(value);

        expect(screen.getByRole('button', { name: /confirm purchase/i })).toBeDisabled();
        expect(screen.getByTestId('quantity-error')).toHaveTextContent(message);
        expect(screen.getByLabelText(/tons of co/i)).toHaveAttribute('aria-invalid', 'true');
    });

    it.each(invalid)('never posts %s to the API', async (_label, value) => {
        await renderLoaded();
        openModalWith(value);

        fireEvent.click(screen.getByRole('button', { name: /confirm purchase/i }));

        expect(purchaseCarbonOffset).not.toHaveBeenCalled();
    });

    it('re-enables Confirm once the quantity is corrected', async () => {
        await renderLoaded();
        openModalWith('0');
        expect(screen.getByRole('button', { name: /confirm purchase/i })).toBeDisabled();

        fireEvent.change(screen.getByLabelText(/tons of co/i), { target: { value: '3' } });

        expect(screen.getByRole('button', { name: /confirm purchase/i })).toBeEnabled();
        expect(screen.queryByTestId('quantity-error')).not.toBeInTheDocument();
        expect(screen.getByTestId('purchase-total')).toHaveTextContent('$45.00');
    });

    it('sends the parsed number, not the raw string', async () => {
        await renderLoaded();
        openModalWith('7');

        fireEvent.click(screen.getByRole('button', { name: /confirm purchase/i }));

        await waitFor(() => expect(purchaseCarbonOffset).toHaveBeenCalledWith('proj-1', 7));
    });
});

describe('CarbonOffsetMarketplace — after a purchase', () => {
    it('refreshes the project list so availability is not stale', async () => {
        await renderLoaded();
        expect(screen.getByTestId('available-proj-1')).toHaveTextContent('500 tons');

        fetchOffsetProjects.mockResolvedValue([project({ availableTons: 200 })]);
        fetchUserPortfolio.mockResolvedValue({ totalOffsetTons: 312 });

        openModalWith('300');
        fireEvent.click(screen.getByRole('button', { name: /confirm purchase/i }));

        // Only the portfolio used to be re-read, so every card kept advertising its
        // pre-purchase stock — and the modal's max stayed at the old figure.
        await waitFor(() => expect(screen.getByTestId('available-proj-1')).toHaveTextContent('200 tons'));
        expect(screen.getByTestId('portfolio-total')).toHaveTextContent('312 tons');
    });

    it('confirms in the page rather than through window.alert', async () => {
        const windowAlert = vi.spyOn(window, 'alert').mockImplementation(() => { });
        await renderLoaded();

        openModalWith('2');
        fireEvent.click(screen.getByRole('button', { name: /confirm purchase/i }));

        await waitFor(() => expect(screen.getByTestId('purchase-confirmation')).toBeInTheDocument());
        expect(screen.getByTestId('purchase-confirmation')).toHaveTextContent('2 tons');
        expect(windowAlert).not.toHaveBeenCalled();
    });

    it('keeps the modal open and reports the reason when the purchase is rejected', async () => {
        purchaseCarbonOffset.mockRejectedValue(new Error('Project sold out'));
        await renderLoaded();

        openModalWith('2');
        fireEvent.click(screen.getByRole('button', { name: /confirm purchase/i }));

        await waitFor(() => expect(screen.getByTestId('purchase-error')).toHaveTextContent('Project sold out'));
        expect(screen.getByTestId('purchase-modal')).toBeInTheDocument();
    });
});

describe('CarbonOffsetMarketplace — malformed project records', () => {
    it('renders the other cards when one project has no certification', async () => {
        await renderLoaded([
            project({ id: 'proj-1', certification: undefined }),
            project({ id: 'proj-2', name: 'Mangrove Restoration' }),
        ]);

        // One bad record used to throw inside projects.map and blank the marketplace.
        expect(screen.getByText('Western Ghats Reforestation')).toBeInTheDocument();
        expect(screen.getByText('Mangrove Restoration')).toBeInTheDocument();
    });

    it('renders a project with no price without crashing, and does not offer to sell it', async () => {
        await renderLoaded([project({ pricePerTon: undefined })]);

        expect(screen.getByText('Western Ghats Reforestation')).toBeInTheDocument();
        expect(screen.getByTestId('price-proj-1')).toHaveTextContent('—');
        expect(screen.getByRole('button', { name: /price unavailable/i })).toBeDisabled();
    });

    it('expands every underscore in the certification label', async () => {
        await renderLoaded();
        expect(screen.getByText('GOLD STANDARD VER')).toBeInTheDocument();
    });
});

describe('CarbonOffsetMarketplace — loading failure', () => {
    it('offers a retry and recovers', async () => {
        fetchOffsetProjects.mockRejectedValueOnce(new Error('offline'));
        fetchUserPortfolio.mockResolvedValue({ totalOffsetTons: 0 });
        vi.spyOn(console, 'error').mockImplementation(() => { });

        render(<CarbonOffsetMarketplace />);
        await screen.findByTestId('marketplace-error');

        fetchOffsetProjects.mockResolvedValue([project()]);
        fireEvent.click(screen.getByRole('button', { name: /try again/i }));

        await waitFor(() => expect(screen.getByText('Western Ghats Reforestation')).toBeInTheDocument());
        expect(screen.queryByTestId('marketplace-error')).not.toBeInTheDocument();
    });
});
