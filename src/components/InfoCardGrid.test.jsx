import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InfoCardGrid } from './InfoCardGrid';

describe('InfoCardGrid Component', () => {
  const sampleItems = [
    {
      id: 'item-1',
      title: 'Solar Energy Adoption',
      description: 'Switch to rooftop photovoltaic cells to reduce fossil grid dependence.',
      category: 'Energy',
      url: 'https://example.com/solar',
    },
    {
      id: 'item-2',
      title: 'Mass Transit Support',
      description: 'Utilize electric buses and metro rail networks for daily commutes.',
      category: 'Mobility',
    },
  ];

  it('renders cards with title, category, and description', () => {
    render(<InfoCardGrid items={sampleItems} />);

    expect(screen.getByText('Solar Energy Adoption')).toBeInTheDocument();
    expect(screen.getByText('Energy')).toBeInTheDocument();
    expect(screen.getByText(/Switch to rooftop photovoltaic cells/i)).toBeInTheDocument();

    expect(screen.getByText('Mass Transit Support')).toBeInTheDocument();
    expect(screen.getByText('Mobility')).toBeInTheDocument();
  });

  it('renders external links when url is provided', () => {
    render(<InfoCardGrid items={sampleItems} />);
    const link = screen.getByRole('link', { name: /Learn More/i });
    expect(link).toHaveAttribute('href', 'https://example.com/solar');
  });
});
