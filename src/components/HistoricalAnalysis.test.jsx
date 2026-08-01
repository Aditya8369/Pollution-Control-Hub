import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import HistoricalAnalysis from './HistoricalAnalysis';
import * as historicalDataService from '../services/historicalDataService';

vi.mock('../services/historicalDataService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchHistoricalData: vi.fn(),
  };
});

// Mock html2canvas and jspdf
vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => 'data:image/png;base64,mock',
    width: 800,
    height: 600,
  }),
}));

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
    splitTextToSize(text) { return [text]; }
    text(...args) { mockPdfText(...args); return this; }
    line() { return this; }
    addImage() { return this; }
    save(...args) { mockPdfSave(...args); return this; }
  },
}));

describe('HistoricalAnalysis Component - Export PDF & CSV', () => {
  const defaultProps = {
    position: { lat: 28.6139, lon: 77.209, cityName: 'New Delhi' },
  };

  const mockData = {
    overallAvg: 110,
    daily: [
      { date: '2026-07-01', maxAqi: 100, pm25: 35, pm10: 70, no2: 10, ozone: 20, co: 4 },
      { date: '2026-07-02', maxAqi: 120, pm25: 45, pm10: 80, no2: 15, ozone: 25, co: 5 },
    ],
  };

  beforeEach(() => {
    mockPdfSave.mockClear();
    mockPdfText.mockClear();

    // Mock web worker
    globalThis.Worker = class MockWorker {
      constructor() {
        setTimeout(() => {
          if (this.onmessage) {
            this.onmessage({ data: mockData });
          }
        }, 10);
      }
      postMessage() {}
      terminate() {}
    };
  });

  it('renders Export PDF and Export CSV action buttons', async () => {
    vi.mocked(historicalDataService.fetchHistoricalData).mockResolvedValue(mockData);

    render(<HistoricalAnalysis {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });
  });

  it('triggers PDF export handler when Export PDF button is clicked', async () => {
    vi.mocked(historicalDataService.fetchHistoricalData).mockResolvedValue(mockData);

    render(<HistoricalAnalysis {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
    });

    const pdfBtn = screen.getByText('Export PDF');
    fireEvent.click(pdfBtn);

    await waitFor(() => {
      expect(mockPdfSave).toHaveBeenCalled();
    });
  });

  it('triggers CSV download when Export CSV button is clicked', async () => {
    vi.mocked(historicalDataService.fetchHistoricalData).mockResolvedValue(mockData);
    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock');
    const revokeObjectURLMock = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLMock;
    globalThis.URL.revokeObjectURL = revokeObjectURLMock;

    render(<HistoricalAnalysis {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });

    const csvBtn = screen.getByText('Export CSV');
    fireEvent.click(csvBtn);

    expect(createObjectURLMock).toHaveBeenCalled();
  });

  it('displays date range validation error when startDate > endDate', async () => {
    vi.mocked(historicalDataService.fetchHistoricalData).mockResolvedValue(mockData);

    render(<HistoricalAnalysis {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
    });

    const startDateInput = screen.getByLabelText('Start Date');
    const endDateInput = screen.getByLabelText('End Date');

    fireEvent.change(startDateInput, { target: { value: '2026-07-05' } });
    fireEvent.change(endDateInput, { target: { value: '2026-07-01' } });

    fireEvent.click(screen.getByText('Export CSV'));

    expect(screen.getByText('Start date cannot be after end date.')).toBeInTheDocument();
  });
});
