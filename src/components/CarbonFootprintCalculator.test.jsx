import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CarbonFootprintCalculator from './CarbonFootprintCalculator';

const mockPdfSave = vi.fn();
const mockPdfText = vi.fn();

vi.mock('jspdf', () => ({
  default: class MockjsPDF {
    constructor() {
      this.internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    }
    setFont() { return this; }
    setFontSize() { return this; }
    setTextColor() { return this; }
    setDrawColor() { return this; }
    setLineWidth() { return this; }
    text(...args) { mockPdfText(...args); return this; }
    line() { return this; }
    addPage() { return this; }
    save(...args) { mockPdfSave(...args); return this; }
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_, defaultValue) => defaultValue }),
}));

describe('CarbonFootprintCalculator Component', () => {
  beforeEach(() => {
    localStorage.clear();
    mockPdfSave.mockClear();
    mockPdfText.mockClear();
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

  describe('Issue #1116 Export Saved History', () => {
    let createObjectURLMock;
    let revokeObjectURLMock;

    beforeEach(() => {
      createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
      revokeObjectURLMock = vi.fn();
      globalThis.URL.createObjectURL = createObjectURLMock;
      globalThis.URL.revokeObjectURL = revokeObjectURLMock;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('exports history as CSV with correct structure and escaping', async () => {
      render(<CarbonFootprintCalculator />);

      const vehicleKmInput = screen.getByLabelText(/Distance Travelled/i);
      fireEvent.change(vehicleKmInput, { target: { value: '600' } });
      fireEvent.click(screen.getByRole('button', { name: /Save Calculation/i }));

      const csvBtn = screen.getByRole('button', { name: 'CSV' });
      expect(csvBtn).toBeInTheDocument();
      fireEvent.click(csvBtn);

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      const blobArg = createObjectURLMock.mock.calls[0][0];
      expect(blobArg).toBeInstanceOf(Blob);
      expect(blobArg.type).toBe('text/csv;charset=utf-8;');

      const text = await blobArg.text();
      expect(text).toContain('Date,Monthly Footprint (kg CO2e)');
      expect(text).toContain('petrol');
      expect(text).toContain('600');
    });

    it('exports history as valid JSON', async () => {
      render(<CarbonFootprintCalculator />);

      const vehicleKmInput = screen.getByLabelText(/Distance Travelled/i);
      fireEvent.change(vehicleKmInput, { target: { value: '400' } });
      fireEvent.click(screen.getByRole('button', { name: /Save Calculation/i }));

      const jsonBtn = screen.getByRole('button', { name: 'JSON' });
      expect(jsonBtn).toBeInTheDocument();
      fireEvent.click(jsonBtn);

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      const blobArg = createObjectURLMock.mock.calls[0][0];
      expect(blobArg.type).toBe('application/json;charset=utf-8;');

      const text = await blobArg.text();
      const parsed = JSON.parse(text);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].inputs.vehicleKm).toBe(400);
    });

    it('exports history as PDF via jsPDF', () => {
      render(<CarbonFootprintCalculator />);

      const vehicleKmInput = screen.getByLabelText(/Distance Travelled/i);
      fireEvent.change(vehicleKmInput, { target: { value: '700' } });
      fireEvent.click(screen.getByRole('button', { name: /Save Calculation/i }));

      const pdfBtn = screen.getByRole('button', { name: 'PDF' });
      expect(pdfBtn).toBeInTheDocument();
      fireEvent.click(pdfBtn);

      expect(mockPdfSave).toHaveBeenCalledWith('carbon_footprint_history.pdf');
    });

    it('escapes CSV values containing commas and quotes properly', async () => {
      const mockHistory = [
        {
          id: '1',
          date: 'Aug 29, 2026',
          monthlyKg: 200,
          annualTonnes: 2.4,
          impactLevel: 'Low "Moderate", Green',
          inputs: { vehicleType: 'petrol, hybrid', vehicleKm: 100 }
        }
      ];
      localStorage.setItem('carbon_calculator_history', JSON.stringify(mockHistory));

      render(<CarbonFootprintCalculator />);

      const csvBtn = screen.getByRole('button', { name: 'CSV' });
      fireEvent.click(csvBtn);

      const blobArg = createObjectURLMock.mock.calls[0][0];
      const text = await blobArg.text();
      expect(text).toContain('"Aug 29, 2026"');
      expect(text).toContain('"Low ""Moderate"", Green"');
      expect(text).toContain('"petrol, hybrid"');
    });

    it('does not crash or export if history is cleared or empty', () => {
      render(<CarbonFootprintCalculator />);
      expect(screen.queryByRole('button', { name: 'CSV' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'JSON' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'PDF' })).not.toBeInTheDocument();
    });
  });
});

