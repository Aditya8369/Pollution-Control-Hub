import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ScenarioSimulator from './ScenarioSimulator';

// jsdom measures every element as 0x0, so recharts' ResponsiveContainer renders
// nothing at all. Swapping it for a plain div keeps the chart subtree mounted;
// the assertions below read the accompanying data table rather than the SVG.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  };
});

function readTable() {
  const table = screen.getByTestId('scenario-comparison-table');
  return [...table.querySelectorAll('tbody tr')].map((row) =>
    [...row.querySelectorAll('th, td')].map((cell) => cell.textContent.replace(/\s+/g, ' ').trim())
  );
}

describe('ScenarioSimulator - missing readings (regression)', () => {
  it('does not chart a baseline when there is no reading', () => {
    render(<ScenarioSimulator current={{ pm2_5: null, nitrogen_dioxide: null }} />);

    // The old build drew a "Current Baseline" of 35 µg/m³ PM2.5 and 28 NO₂ here.
    expect(screen.queryByTestId('scenario-comparison-table')).not.toBeInTheDocument();
    expect(screen.getByTestId('scenario-no-readings')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('35');
    expect(document.body.textContent).not.toContain('28');
  });

  it('names the pollutant it has no reading for', () => {
    render(<ScenarioSimulator current={{ pm2_5: null, nitrogen_dioxide: 22 }} cityName="Bhopal" />);

    const notice = screen.getByTestId('scenario-missing-notice');
    expect(notice).toHaveTextContent('PM2.5');
    expect(notice).toHaveTextContent('Bhopal');
  });

  it('still simulates the pollutant it does have', () => {
    render(<ScenarioSimulator current={{ pm2_5: null, nitrogen_dioxide: 20 }} />);

    // 25% NO₂ reduction at the default 30% EV adoption.
    expect(readTable()).toEqual([['NO₂', '20 µg/m³', '15 µg/m³']]);
  });

  it('omits the missing-reading notice when both pollutants are present', () => {
    render(<ScenarioSimulator current={{ pm2_5: 40, nitrogen_dioxide: 20 }} />);
    expect(screen.queryByTestId('scenario-missing-notice')).not.toBeInTheDocument();
  });

  it('renders without a `current` prop at all', () => {
    render(<ScenarioSimulator />);
    expect(screen.getByTestId('scenario-no-readings')).toBeInTheDocument();
  });

  it('does not throw when a reading arrives as a string', () => {
    render(<ScenarioSimulator current={{ pm2_5: '40', nitrogen_dioxide: 20 }} />);

    // `'40'.toFixed` is undefined — the old code threw here and took the tile down.
    expect(screen.getByTestId('scenario-simulator')).toBeInTheDocument();
    expect(screen.getByTestId('scenario-missing-notice')).toHaveTextContent('PM2.5');
  });
});

describe('ScenarioSimulator - readings of zero', () => {
  it('charts a zero NO₂ reading instead of replacing it', () => {
    render(<ScenarioSimulator current={{ pm2_5: 12, nitrogen_dioxide: 0 }} />);

    const rows = readTable();
    expect(rows).toContainEqual(['NO₂', '0 µg/m³', '0 µg/m³']);
    expect(screen.queryByTestId('scenario-missing-notice')).not.toBeInTheDocument();
  });
});

describe('ScenarioSimulator - scenario selection', () => {
  it('marks the active preset with aria-pressed', () => {
    render(<ScenarioSimulator current={{ pm2_5: 40, nitrogen_dioxide: 20 }} />);

    const ev = screen.getByRole('button', { pressed: true });
    expect(ev).toHaveTextContent('EV Adoption');

    const canopy = screen.getByRole('button', { name: /Green Canopy/ });
    fireEvent.click(canopy);

    expect(canopy).toHaveAttribute('aria-pressed', 'true');
    expect(ev).toHaveAttribute('aria-pressed', 'false');
  });

  it('recomputes the simulated values when the scenario changes', () => {
    render(<ScenarioSimulator current={{ pm2_5: 40, nitrogen_dioxide: 20 }} />);

    // EV transition at 30%: PM2.5 -15% -> 34
    expect(readTable()).toContainEqual(['PM2.5', '40 µg/m³', '34 µg/m³']);

    fireEvent.click(screen.getByRole('button', { name: /Emission Controls/ }));

    // Industrial scrubbers: PM2.5 -40% -> 24
    expect(readTable()).toContainEqual(['PM2.5', '40 µg/m³', '24 µg/m³']);
  });
});

describe('ScenarioSimulator - EV slider accessibility', () => {
  it('gives the slider an accessible name', () => {
    render(<ScenarioSimulator current={{ pm2_5: 40, nitrogen_dioxide: 20 }} />);

    const slider = screen.getByRole('slider', { name: /EV Fleet Adoption/i });
    expect(slider).toHaveValue('30');
  });

  it('announces the adoption share as a percentage, not a raw number', () => {
    render(<ScenarioSimulator current={{ pm2_5: 40, nitrogen_dioxide: 20 }} />);

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '30% EVs');
  });

  it('only offers the slider for the adjustable scenario', () => {
    render(<ScenarioSimulator current={{ pm2_5: 40, nitrogen_dioxide: 20 }} />);

    expect(screen.getByRole('slider')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Clean Energy/ }));
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });
});
