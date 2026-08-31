import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import HealthAdvisory from './HealthAdvisory';
import { SYMPTOM_REPORTS_STORAGE_KEY } from './SymptomReportButton';
import { eventBus } from '../core/events';

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
    addPage() { return this; }
    save(...args) { mockPdfSave(...args); return this; }
  },
}));

describe('HealthAdvisory - Personalized Health Recommendations', () => {
  beforeEach(() => {
    localStorage.clear();
    mockPdfSave.mockClear();
    mockPdfText.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the base health profile checklist and main layout', () => {
    render(<HealthAdvisory />);

    expect(screen.getByTestId('health-advisory')).toBeInTheDocument();
    expect(screen.getByTestId('health-profile-section')).toBeInTheDocument();
    expect(screen.getByText(/conditions\.asthma/i)).toBeInTheDocument();
    expect(screen.getByText(/conditions\.heartDisease/i)).toBeInTheDocument();
  });

  it('renders current AQI badge when currentAqi prop is passed', () => {
    render(<HealthAdvisory currentAqi={120} />);

    expect(screen.getByTestId('advisory-aqi')).toHaveTextContent('Current AQI: 120');
  });

  it('shows personalized guidance section and prepends caution warning under moderate/sensitive AQI', () => {
    // 120 AQI is Unhealthy for Sensitive Groups (sensitive AQI level)
    render(<HealthAdvisory currentAqi={120} />);

    const asthmaLabel = screen.getByText(/conditions\.asthma/i);
    const checkbox = asthmaLabel.querySelector('input[type="checkbox"]');
    fireEvent.click(checkbox);

    // Personalized guidance section is shown
    expect(screen.getByTestId('personalized-advisory-banner')).toBeInTheDocument();
    
    // Warning contains Caution indicator
    const personalizedItems = screen.getAllByTestId('personalized-condition-item');
    expect(personalizedItems[0]).toHaveTextContent(/🟡 CAUTION:/i);
    expect(personalizedItems[0]).toHaveTextContent(/Keep your rescue inhaler within reach/i);
  });

  it('prepends critical hazard warning when AQI is hazardous', () => {
    render(<HealthAdvisory currentAqi={350} />);

    const heartLabel = screen.getByText(/conditions\.heartDisease/i);
    const checkbox = heartLabel.querySelector('input[type="checkbox"]');
    fireEvent.click(checkbox);

    const personalizedItems = screen.getAllByTestId('personalized-condition-item');
    expect(personalizedItems[0]).toHaveTextContent(/🔴 CRITICAL HAZARD:/i);
    expect(personalizedItems[0]).toHaveTextContent(/Avoid all outdoor activities/i);
  });

  it('reorders and highlights highly relevant tips to the top when conditions match', () => {
    // When asthma is checked and AQI is high, the "inhaler" tip gets high relevance score
    render(<HealthAdvisory currentAqi={180} />);

    // Check Asthma
    const asthmaLabel = screen.getByText(/conditions\.asthma/i);
    const checkbox = asthmaLabel.querySelector('input[type="checkbox"]');
    fireEvent.click(checkbox);

    // Switch to sensitive tab
    const sensitiveTab = screen.getByRole('tab', { name: /sensitive/i });
    fireEvent.click(sensitiveTab);

    const tips = screen.getAllByTestId('tip-action-card');
    
    // The top tip should be highlighted with the Critical badge
    expect(tips[0]).toHaveTextContent(/🚨 Critical/i);
    expect(screen.getAllByTestId('relevance-badge').length).toBeGreaterThan(0);
  });

  describe('Issue #1120 - Download Personalized Health Advisory PDF', () => {
    it('renders the Download My Health Advisory button', () => {
      render(<HealthAdvisory currentAqi={120} />);

      const downloadBtn = screen.getByRole('button', { name: /download/i });
      expect(downloadBtn).toBeInTheDocument();
    });

    it('triggers PDF download using current component state (selected conditions & active tab tips)', () => {
      render(<HealthAdvisory currentAqi={150} />);

      // Select Asthma condition
      const asthmaLabel = screen.getByText(/conditions\.asthma/i);
      const checkbox = asthmaLabel.querySelector('input[type="checkbox"]');
      fireEvent.click(checkbox);

      const downloadBtn = screen.getByRole('button', { name: /download/i });
      fireEvent.click(downloadBtn);

      expect(mockPdfSave).toHaveBeenCalledWith('personalized_health_advisory.pdf');

      // Verify text calls included AQI, Asthma condition, and advisory content
      const pdfTextCalls = mockPdfText.mock.calls.map(call => call[0]);
      expect(pdfTextCalls.some(t => String(t).includes('Current AQI: 150'))).toBe(true);
      expect(pdfTextCalls.some(t => String(t).includes('Asthma'))).toBe(true);
    });

    it('handles empty health-condition case safely by providing general guidance in PDF', () => {
      render(<HealthAdvisory currentAqi={50} />);

      const downloadBtn = screen.getByRole('button', { name: /download/i });
      fireEvent.click(downloadBtn);

      expect(mockPdfSave).toHaveBeenCalledWith('personalized_health_advisory.pdf');

      const pdfTextCalls = mockPdfText.mock.calls.map(call => call[0]);
      expect(pdfTextCalls.some(t => String(t).includes('No specific pre-existing health conditions selected'))).toBe(true);
    });
  });

  describe('Community Health Insight (Issue #1154)', () => {
    it('correctly counts reports from today vs yesterday and ignores invalid/older timestamps', () => {
      const now = new Date();
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const threeDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3);

      const sampleReports = [
        { id: '1', timestamp: now.toISOString(), symptoms: ['Headache'] },
        { id: '2', timestamp: now.toISOString(), symptoms: ['Coughing'] },
        { id: '3', timestamp: yesterday.toISOString(), symptoms: ['Eye irritation'] },
        { id: '4', timestamp: threeDaysAgo.toISOString(), symptoms: ['Dizziness'] }, // Older, ignore
        { id: '5', timestamp: 'invalid-date-string', symptoms: ['Fatigue'] }, // Invalid, ignore
        { id: '6', symptoms: ['Shortness of breath'] }, // Missing timestamp, ignore
      ];

      localStorage.setItem(SYMPTOM_REPORTS_STORAGE_KEY, JSON.stringify(sampleReports));

      render(<HealthAdvisory currentAqi={187} />);

      const insight = screen.getByTestId('community-health-insight');
      expect(insight).toBeInTheDocument();
      expect(insight).toHaveTextContent('2 symptom reports today vs. 1 yesterday');
      expect(insight).toHaveTextContent('Current AQI: 187');
    });

    it('handles zero reports safely with non-causational observational wording', () => {
      render(<HealthAdvisory currentAqi={45} />);

      const insight = screen.getByTestId('community-health-insight');
      expect(insight).toBeInTheDocument();
      expect(insight).toHaveTextContent('0 symptom reports today vs. 0 yesterday');
      expect(insight).toHaveTextContent('Current AQI: 45');

      // Verify no causational language is present
      const text = insight.textContent;
      expect(text).not.toMatch(/caused/i);
      expect(text).not.toMatch(/because/i);
    });

    it('updates dynamically when SYMPTOM_REPORT_SUBMITTED event is emitted', () => {
      render(<HealthAdvisory currentAqi={95} />);

      const insight = screen.getByTestId('community-health-insight');
      expect(insight).toHaveTextContent('0 symptom reports today vs. 0 yesterday');

      const now = new Date();
      const newReports = [
        { id: '1', timestamp: now.toISOString(), symptoms: ['Headache'] },
      ];
      localStorage.setItem(SYMPTOM_REPORTS_STORAGE_KEY, JSON.stringify(newReports));

      act(() => {
        eventBus.emit('SYMPTOM_REPORT_SUBMITTED');
      });

      expect(insight).toHaveTextContent('1 symptom report today vs. 0 yesterday');
    });
  });
});

