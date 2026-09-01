import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import AIPollutionForecast from './AIPollutionForecast';
import HealthImpactDashboard from './HealthImpactDashboard';
import OceanAcidificationMonitor from './OceanAcidificationMonitor';

/**
 * Every card and tile control on these dashboards used to be a `<div onClick>`: no tab
 * stop, no Enter or Space, no role. These assert the controls are reachable and operable
 * without a mouse, at the components rather than at the shared button — a `<div>` that
 * merely imports `PressableCard` would still fail them. See #1140.
 *
 * HealthRiskCards and ReportCards get the same fix but are not rendered here: both import
 * `framer-motion`, which is not in package.json and not installed, so they cannot be
 * mounted at all in this repo today. That is a separate problem from #1140 and not one
 * this change takes on. Their controls are covered by PressableCard.test.jsx and by the
 * jsx-a11y rules, which no longer flag either file.
 */

/** Opens a tab on one of the tabbed dashboards. */
function openTab(name) {
    fireEvent.click(screen.getByRole('button', { name }));
}

describe('HealthImpactDashboard — pollutant cards (#1140)', () => {
    it('gives every pollutant card a keyboard-operable header', () => {
        render(<HealthImpactDashboard currentAQI={165} cityName="Delhi" />);
        openTab(/Health Effects/);

        const buttons = screen.getAllByRole('button', { name: /health effects, exposure risk/i });
        expect(buttons.length).toBeGreaterThan(0);
        for (const button of buttons) {
            expect(button.tagName).toBe('BUTTON');
            expect(button).toHaveAttribute('aria-expanded', 'false');
        }
    });

    it('opens one card without opening the rest', () => {
        render(<HealthImpactDashboard currentAQI={165} cityName="Delhi" />);
        openTab(/Health Effects/);
        const buttons = screen.getAllByRole('button', { name: /health effects, exposure risk/i });

        fireEvent.click(buttons[0]);

        expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
        expect(buttons[1]).toHaveAttribute('aria-expanded', 'false');
        expect(screen.getByText('Short-term Effects')).toBeInTheDocument();
    });

    it('keeps the accessible name to the pollutant once the card is open', () => {
        // The panel sits beside the button rather than inside it, so opening the card does
        // not fold the whole expanded body into the button's name.
        render(<HealthImpactDashboard currentAQI={165} cityName="Delhi" />);
        openTab(/Health Effects/);
        const [button] = screen.getAllByRole('button', { name: /health effects, exposure risk/i });
        const nameBefore = button.getAttribute('aria-label');

        fireEvent.click(button);
        expect(button.getAttribute('aria-label')).toBe(nameBefore);
    });
});

describe('AIPollutionForecast — weather condition tiles (#1140)', () => {
    it('makes each weather tile a pressable button', () => {
        render(<AIPollutionForecast />);
        openTab(/Weather/);

        const tiles = screen.getAllByRole('button', { name: /^Weather condition:/ });
        expect(tiles.length).toBeGreaterThan(0);
        for (const tile of tiles) {
            expect(tile).toHaveAttribute('aria-pressed');
        }
    });

    it('presses the chosen tile and releases it when chosen again', () => {
        render(<AIPollutionForecast />);
        openTab(/Weather/);
        const [tile] = screen.getAllByRole('button', { name: /^Weather condition:/ });

        expect(tile).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(tile);
        expect(tile).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(tile);
        expect(tile).toHaveAttribute('aria-pressed', 'false');
    });
});

describe('OceanAcidificationMonitor — region and scenario selectors (#1140)', () => {
    it('makes each ocean region a pressable button, one chosen at a time', () => {
        render(<OceanAcidificationMonitor />);
        openTab(/Regions/);

        const regions = screen.getAllByRole('button', { name: /^Ocean region:/ });
        expect(regions.length).toBeGreaterThan(1);
        expect(regions.filter((r) => r.getAttribute('aria-pressed') === 'true')).toHaveLength(1);

        fireEvent.click(regions[1]);

        expect(regions[0]).toHaveAttribute('aria-pressed', 'false');
        expect(regions[1]).toHaveAttribute('aria-pressed', 'true');
    });

    it('names each region rather than announcing it as plain text', () => {
        render(<OceanAcidificationMonitor />);
        openTab(/Regions/);
        const regions = screen.getAllByRole('button', { name: /^Ocean region:/ });

        for (const region of regions) {
            expect(region.getAttribute('aria-label')).toMatch(/average pH/);
        }
    });

    it('puts every region in the tab order', () => {
        render(<OceanAcidificationMonitor />);
        openTab(/Regions/);
        for (const region of screen.getAllByRole('button', { name: /^Ocean region:/ })) {
            region.focus();
            expect(region).toHaveFocus();
        }
    });
});
