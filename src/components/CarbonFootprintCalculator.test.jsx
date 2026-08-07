import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import CarbonFootprintCalculator from './CarbonFootprintCalculator';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_, defaultValue) => defaultValue }),
}));

describe('CarbonFootprintCalculator Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders correctly and handles slider input updates', () => {
    render(<CarbonFootprintCalculator />);

    expect(screen.getByText('Personal Carbon Footprint Calculator')).toBeInTheDocument();

    const vehicleKmInput = screen.getByLabelText(/Distance Travelled/i);
    fireEvent.change(vehicleKmInput, { target: { value: '500' } });
    expect(screen.getByText(/500 km \/ month/i)).toBeInTheDocument();
  });

  it('saves calculation to history and resets inputs', () => {
    render(<CarbonFootprintCalculator />);

    const vehicleKmInput = screen.getByLabelText(/Distance Travelled/i);
    fireEvent.change(vehicleKmInput, { target: { value: '800' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Calculation/i }));
    expect(screen.getByText(/Calculation saved to history!/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Reset Inputs/i }));
    expect(vehicleKmInput.value).toBe('0');
  });
});
