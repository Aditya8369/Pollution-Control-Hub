import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HistoricalData from './HistoricalData';
import React from 'react';

vi.mock('react-datepicker', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: vi.fn().mockImplementation((props) => {
      return <input data-testid="mock-datepicker" data-locale={props.locale} data-format={props.dateFormat} readOnly />;
    }),
  };
});

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('HistoricalData Component - Controls (#828)', () => {
  const defaultProps = {
    position: { lat: 28.6139, lon: 77.209, cityName: 'Delhi' }
  };

  it('renders granularity controls and pollutant comparison controls', () => {
    render(<HistoricalData {...defaultProps} />);

    expect(screen.getByTestId('historical-granularity-controls')).toBeInTheDocument();
    expect(screen.getByTestId('historical-pollutant-controls')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Hourly' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Daily Avg' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Weekly Avg' })).toBeInTheDocument();
  });

  it('allows toggling pollutant overlays and switching granularity', () => {
    render(<HistoricalData {...defaultProps} />);

    const weeklyBtn = screen.getByRole('button', { name: 'Weekly Avg' });
    act(() => {
      fireEvent.click(weeklyBtn);
    });

    const no2Btn = screen.getByRole('button', { name: 'NO₂' });
    expect(no2Btn).toHaveAttribute('aria-pressed', 'false');

    act(() => {
      fireEvent.click(no2Btn);
    });
    expect(no2Btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('passes active locale and date format to DatePicker', () => {
    render(<HistoricalData {...defaultProps} />);

    const datepickers = screen.getAllByTestId('mock-datepicker');
    expect(datepickers.length).toBe(2);
    expect(datepickers[0]).toHaveAttribute('data-locale', 'en');
    expect(datepickers[0]).toHaveAttribute('data-format');
  });
});
