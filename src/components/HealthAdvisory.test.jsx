import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import HealthAdvisory from './HealthAdvisory';

describe('HealthAdvisory - Personalized Health Recommendations', () => {
  beforeEach(() => {
    localStorage.clear();
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
});
