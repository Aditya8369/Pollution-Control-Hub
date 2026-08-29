import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Glossary from './Glossary';

describe('Glossary Component - Pagination & Off-by-one verification (#738)', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
  });

  it('renders page 1 initially and matches snapshot', () => {
    const { asFragment } = render(<Glossary />);
    expect(screen.getByText(/Page 1 of/i)).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  it('navigates to next page without showing empty cards or exceeding slice boundaries', () => {
    render(<Glossary />);
    const nextBtn = screen.getByRole('button', { name: /next page/i });
    expect(nextBtn).toBeInTheDocument();
    expect(nextBtn).not.toBeDisabled();

    fireEvent.click(nextBtn);
    expect(screen.getByText(/Page 2 of/i)).toBeInTheDocument();

    const cards = document.querySelectorAll('.glossary-card');
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThanOrEqual(20);
  });

  it('navigates to the last page and verifies no extra empty row exists', () => {
    const { asFragment } = render(<Glossary />);
    const pageButtons = screen.getAllByRole('button', { name: /go to page/i });
    const lastPageBtn = pageButtons[pageButtons.length - 1];
    
    fireEvent.click(lastPageBtn);

    const cards = document.querySelectorAll('.glossary-card');
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThanOrEqual(20);

    const nextBtn = screen.getByRole('button', { name: /next page/i });
    expect(nextBtn).toBeDisabled();

    // Verify snapshot of the last page
    expect(asFragment()).toMatchSnapshot();
  });
});
