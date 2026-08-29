import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';

import { DisclosureButton, RESET_BUTTON_STYLE, SelectionButton } from './PressableCard';

/** A minimal disclosure, the shape the dashboard cards use. */
function Disclosure({ label = 'PM2.5 health details' }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <div>
            <DisclosureButton
                expanded={expanded}
                onToggle={() => setExpanded(!expanded)}
                controls="panel-1"
                label={label}
            >
                <span>PM2.5</span>
            </DisclosureButton>
            {expanded && <div id="panel-1">Short-term effects</div>}
        </div>
    );
}

/** A single-choice set of cards, the shape the selector panels use. */
function Selector({ options = ['Arctic Ocean', 'Pacific Ocean', 'Indian Ocean'] }) {
    const [selected, setSelected] = useState(0);
    return (
        <div>
            {options.map((name, i) => (
                <SelectionButton
                    key={name}
                    selected={selected === i}
                    onSelect={() => setSelected(i)}
                    label={`Ocean region: ${name}`}
                >
                    <span>{name}</span>
                </SelectionButton>
            ))}
        </div>
    );
}

describe('DisclosureButton', () => {
    it('is a real button, so it is reachable and operable without a mouse', () => {
        render(<Disclosure />);
        const button = screen.getByRole('button', { name: 'PM2.5 health details' });

        expect(button.tagName).toBe('BUTTON');
        // type="button" matters: these cards sit inside forms elsewhere in the app, and a
        // bare <button> defaults to type="submit".
        expect(button).toHaveAttribute('type', 'button');
    });

    it('is in the tab order', () => {
        render(<Disclosure />);
        const button = screen.getByRole('button');

        button.focus();
        expect(button).toHaveFocus();
    });

    it('reports whether the detail is open', () => {
        render(<Disclosure />);
        const button = screen.getByRole('button');

        expect(button).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(button);
        expect(button).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Short-term effects')).toBeInTheDocument();
    });

    it('points at the panel it controls', () => {
        render(<Disclosure />);
        expect(screen.getByRole('button')).toHaveAttribute('aria-controls', 'panel-1');
    });

    it('toggles back closed', () => {
        render(<Disclosure />);
        const button = screen.getByRole('button');

        fireEvent.click(button);
        fireEvent.click(button);

        expect(button).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText('Short-term effects')).not.toBeInTheDocument();
    });

    it('activates on Enter and on Space', () => {
        // A native button fires click for both. A div with onClick fires for neither,
        // which is the whole of #1140.
        const onToggle = vi.fn();
        render(<DisclosureButton expanded={false} onToggle={onToggle} label="Details">x</DisclosureButton>);
        const button = screen.getByRole('button');

        fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
        fireEvent.click(button); // the click a browser synthesises from Enter
        fireEvent.keyDown(button, { key: ' ', code: 'Space' });
        fireEvent.keyUp(button, { key: ' ', code: 'Space' });
        fireEvent.click(button); // and from Space

        expect(onToggle).toHaveBeenCalledTimes(2);
    });

    it('carries an accessible name that does not change when it opens', () => {
        render(<Disclosure label="PM2.5 health details" />);
        const button = screen.getByRole('button');

        fireEvent.click(button);
        expect(screen.getByRole('button', { name: 'PM2.5 health details' })).toBe(button);
    });

    it("lets the caller's style win over the reset", () => {
        render(
            <DisclosureButton expanded={false} onToggle={() => { }} label="x" style={{ textAlign: 'center', padding: '12px' }}>
                y
            </DisclosureButton>
        );
        const button = screen.getByRole('button');

        expect(button).toHaveStyle({ textAlign: 'center', padding: '12px' });
        // and the reset still supplies what the caller did not set
        expect(button).toHaveStyle({ width: RESET_BUTTON_STYLE.width });
    });

    it('passes a className through', () => {
        render(<DisclosureButton expanded={false} onToggle={() => { }} label="x" className="flex items-center">y</DisclosureButton>);
        expect(screen.getByRole('button')).toHaveClass('flex', 'items-center');
    });
});

describe('SelectionButton', () => {
    it('renders one button per option, each with its own name', () => {
        render(<Selector />);

        expect(screen.getByRole('button', { name: 'Ocean region: Arctic Ocean' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Ocean region: Pacific Ocean' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Ocean region: Indian Ocean' })).toBeInTheDocument();
    });

    it('marks exactly one option as chosen', () => {
        render(<Selector />);
        const buttons = screen.getAllByRole('button');

        expect(buttons.filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
        expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    });

    it('moves the chosen state on selection', () => {
        render(<Selector />);
        const buttons = screen.getAllByRole('button');

        fireEvent.click(buttons[2]);

        expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
        expect(buttons[2]).toHaveAttribute('aria-pressed', 'true');
    });

    it('puts every option in the tab order', () => {
        render(<Selector />);
        const buttons = screen.getAllByRole('button');

        for (const button of buttons) {
            button.focus();
            expect(button).toHaveFocus();
        }
    });

    it('does not claim listbox semantics it cannot keep', () => {
        // role="option" obliges the parent to be a listbox with arrow-key navigation and
        // aria-activedescendant. These are buttons that stay pressed; aria-pressed is the
        // honest description.
        render(<Selector />);
        expect(screen.queryAllByRole('option')).toHaveLength(0);
        expect(screen.queryAllByRole('listbox')).toHaveLength(0);
    });

    it('is a button element with an explicit type', () => {
        render(<Selector />);
        for (const button of screen.getAllByRole('button')) {
            expect(button.tagName).toBe('BUTTON');
            expect(button).toHaveAttribute('type', 'button');
        }
    });
});
