import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import RouteForm from './RouteForm';
import SavedLocations from './SavedLocations';
import SolutionsAwareness from './SolutionsAwareness';

/**
 * #807. ESLint reported these as rule violations; what they cost in practice is that a
 * screen reader announces "edit text, blank" for the route inputs, and that the article
 * dialog handled clicks on a role it should not have. Asserting the outcome rather than
 * the lint rule, so a future edit that drops an htmlFor fails here too.
 */

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

function renderRouteForm(overrides = {}) {
    const props = {
        origin: '',
        setOrigin: vi.fn(),
        destination: '',
        setDestination: vi.fn(),
        mode: 'driving',
        setMode: vi.fn(),
        isCalculating: false,
        isLocating: false,
        locationSuccess: false,
        handleGetLocation: vi.fn(),
        handleRouteSearch: vi.fn(),
        newLocationLabel: '',
        setNewLocationLabel: vi.fn(),
        saveLocation: vi.fn(),
        ...overrides,
    };
    render(<RouteForm {...props} />);
    return props;
}

describe('RouteForm - label associations', () => {
    it('finds the starting point by its label', () => {
        renderRouteForm();

        expect(screen.getByLabelText('Starting Point')).toBeInTheDocument();
    });

    it('finds the destination by its label', () => {
        renderRouteForm();

        expect(screen.getByLabelText('Destination')).toBeInTheDocument();
    });

    it('finds the save-location field by its label', () => {
        renderRouteForm();

        expect(
            screen.getByLabelText('Save current locations for quick access')
        ).toBeInTheDocument();
    });

    it('types into the field the label points at', () => {
        const props = renderRouteForm();

        fireEvent.change(screen.getByLabelText('Starting Point'), {
            target: { value: 'Hauz Khas' },
        });

        expect(props.setOrigin).toHaveBeenCalledWith('Hauz Khas');
    });

    it('names the transport mode group without claiming to label an input', () => {
        renderRouteForm();

        // The <label> here pointed at nothing; the group carries the name itself.
        expect(screen.getByRole('group', { name: 'Transport Mode' })).toBeInTheDocument();
    });

    it('keeps the mode buttons reachable and pressed-state accurate', () => {
        renderRouteForm({ mode: 'foot' });

        expect(screen.getByRole('button', { name: 'Walking' })).toHaveAttribute(
            'aria-pressed',
            'true'
        );
        expect(screen.getByRole('button', { name: 'Driving' })).toHaveAttribute(
            'aria-pressed',
            'false'
        );
    });
});

describe('SavedLocations - heading instead of a label', () => {
    const locations = [{ id: 'a1', label: 'Home', value: 'Hauz Khas' }];

    it('heads the chip list with a heading', () => {
        render(
            <SavedLocations
                savedLocations={locations}
                applySavedLocation={vi.fn()}
                deleteSavedLocation={vi.fn()}
            />
        );

        expect(screen.getByRole('heading', { name: 'Saved Locations' })).toBeInTheDocument();
    });

    it('groups the chips under that heading', () => {
        render(
            <SavedLocations
                savedLocations={locations}
                applySavedLocation={vi.fn()}
                deleteSavedLocation={vi.fn()}
            />
        );

        expect(screen.getByRole('group', { name: 'Saved Locations' })).toBeInTheDocument();
    });

    it('still renders nothing when there is nothing saved', () => {
        const { container } = render(
            <SavedLocations
                savedLocations={[]}
                applySavedLocation={vi.fn()}
                deleteSavedLocation={vi.fn()}
            />
        );

        expect(container).toBeEmptyDOMElement();
    });
});

describe('SolutionsAwareness - article dialog', () => {
    const openFirstArticle = () => {
        render(<SolutionsAwareness />);
        const card = screen.getAllByRole('button', { name: /Read Article Summary/i })[0];
        fireEvent.click(card);
        return card;
    };

    it('announces the reads as buttons, not list items', () => {
        render(<SolutionsAwareness />);

        // role="listitem" on the button overrode its native role, so it was never
        // announced as something that could be activated.
        const reads = screen.getAllByRole('button', { name: /Read Article Summary/i });
        expect(reads.length).toBeGreaterThan(0);
        expect(reads[0]).toHaveAttribute('aria-haspopup', 'dialog');
    });

    it('opens the dialog', () => {
        openFirstArticle();

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not close when the dialog itself is clicked', () => {
        openFirstArticle();
        const dialog = screen.getByRole('dialog');

        fireEvent.click(dialog);

        // Previously guaranteed by an onClick/stopPropagation on the dialog; now by the
        // backdrop only acting on clicks that landed on the backdrop itself.
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not close when content inside the dialog is clicked', () => {
        openFirstArticle();
        const dialog = screen.getByRole('dialog');

        fireEvent.click(within(dialog).getByRole('heading', { level: 3 }));

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes on Escape', () => {
        openFirstArticle();

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes from the close button', () => {
        openFirstArticle();

        fireEvent.click(screen.getByLabelText('Close educational article modal'));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
