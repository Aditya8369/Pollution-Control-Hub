import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ExposureCalculator from './ExposureCalculator';

/**
 * Component-level cover for #548.
 *
 * The panel used to show a red "HIGH EXPOSURE RISK" pill and a pinned-full progress bar
 * for essentially every input, because the AQI-scaled score was compared against a fixed
 * 360-point benchmark.
 */

describe('ExposureCalculator - severity reflects real air quality (#548)', () => {
  it('does not alarm on a clean-air day', () => {
    // AQI 50 is the top of the "Good" band. The old model reported 214% here.
    render(<ExposureCalculator currentAqi={50} />);

    expect(screen.getByTestId('exposure-percent')).toHaveTextContent(/^\d+%$/);
    const percent = Number(
      screen.getByTestId('exposure-percent').textContent.replace('%', '')
    );

    expect(percent).toBeLessThan(100);
    expect(screen.getByText('WITHIN GUIDELINE')).toBeInTheDocument();
    expect(screen.queryByText(/HIGH EXPOSURE/)).not.toBeInTheDocument();
  });

  it('does alarm on a genuinely polluted day', () => {
    render(<ExposureCalculator currentAqi={300} />);

    const percent = Number(
      screen.getByTestId('exposure-percent').textContent.replace('%', '')
    );

    expect(percent).toBeGreaterThan(100);
    expect(screen.getByText(/HIGH EXPOSURE/)).toBeInTheDocument();
  });

  it('reports the score in a stated unit rather than bare points', () => {
    render(<ExposureCalculator currentAqi={100} />);

    expect(screen.getByTestId('exposure-score')).toHaveTextContent('µg/m³·h inhaled');
    expect(screen.getByText(/WHO 24h guideline/)).toBeInTheDocument();
  });

  it('shows the concentration behind the AQI so the maths is checkable', () => {
    render(<ExposureCalculator currentAqi={100} />);

    // AQI 100 is the top of the Moderate band: 35.4 µg/m³.
    expect(screen.getByText('35.4 µg/m³')).toBeInTheDocument();
  });
});

describe('ExposureCalculator - day coverage', () => {
  it('logs a full day by default', () => {
    render(<ExposureCalculator currentAqi={100} />);

    expect(screen.getByText('24 / 24 hrs')).toBeInTheDocument();
    expect(screen.queryByTestId('exposure-day-coverage')).not.toBeInTheDocument();
  });

  it('flags a routine that exceeds 24 hours', () => {
    render(<ExposureCalculator currentAqi={100} />);

    fireEvent.change(screen.getByLabelText('Duration (Hours)'), {
      target: { value: '10' },
    });
    fireEvent.click(screen.getByText('+ Add to Day Routine'));

    expect(screen.getByTestId('exposure-day-coverage')).toHaveTextContent(
      /more than 24 hours/i
    );
  });

  it('flags a routine shorter than a day', () => {
    render(<ExposureCalculator currentAqi={100} />);

    // Remove one block so the routine no longer covers the day.
    fireEvent.click(screen.getAllByLabelText('Remove activity')[0]);

    expect(screen.getByTestId('exposure-day-coverage')).toHaveTextContent(
      /less than a full day/i
    );
  });
});

describe('ExposureCalculator - adding activities', () => {
  it('keeps keys unique for activities added in quick succession', () => {
    render(<ExposureCalculator currentAqi={100} />);

    const before = screen.getAllByLabelText('Remove activity').length;

    // Date.now() was the id source, so same-millisecond adds collided.
    fireEvent.click(screen.getByText('+ Add to Day Routine'));
    fireEvent.click(screen.getByText('+ Add to Day Routine'));

    expect(screen.getAllByLabelText('Remove activity').length).toBe(before + 2);
  });

  it('ignores a non-positive duration', () => {
    render(<ExposureCalculator currentAqi={100} />);

    const before = screen.getAllByLabelText('Remove activity').length;

    fireEvent.change(screen.getByLabelText('Duration (Hours)'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByText('+ Add to Day Routine'));

    expect(screen.getAllByLabelText('Remove activity').length).toBe(before);
  });
});
