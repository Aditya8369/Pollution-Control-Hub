import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RouteHistory from './RouteHistory';

const historyEntries = [
  { origin: 'Connaught Place', destination: 'India Gate', timestamp: '2026-08-10T09:00:00.000Z' },
  { origin: 'Hauz Khas', destination: 'Saket', timestamp: '2026-08-09T09:00:00.000Z' },
];

describe('RouteHistory', () => {
  it('lists history entries', () => {
    render(
      <RouteHistory entries={historyEntries} onSelect={vi.fn()} />
    );

    expect(screen.getByText('Recent Routes')).toBeInTheDocument();
    expect(screen.getByText('Connaught Place → India Gate')).toBeInTheDocument();
    expect(screen.getByText('Hauz Khas → Saket')).toBeInTheDocument();
  });

  it('hands the clicked entry back to onSelect', () => {
    const onSelect = vi.fn();
    render(
      <RouteHistory
        entries={historyEntries}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByText('Hauz Khas → Saket'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(historyEntries[1]);
  });

  it('renders nothing at all when there is no history', () => {
    const { container } = render(<RouteHistory entries={[]} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
