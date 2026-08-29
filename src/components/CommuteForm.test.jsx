import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CommuteForm from './CommuteForm';

describe('CommuteForm — Issue #1113 whitespace validation', () => {
  it('rejects whitespace-only start location', () => {
    const onSearch = vi.fn();
    render(<CommuteForm onSearch={onSearch} />);

    fireEvent.change(screen.getByPlaceholderText('Enter start location'), {
      target: { value: '   ' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter destination'), {
      target: { value: 'India Gate' },
    });
    fireEvent.click(screen.getByRole('button', { name: /search routes/i }));

    expect(onSearch).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only destination', () => {
    const onSearch = vi.fn();
    render(<CommuteForm onSearch={onSearch} />);

    fireEvent.change(screen.getByPlaceholderText('Enter start location'), {
      target: { value: 'Connaught Place' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter destination'), {
      target: { value: '  \t \n  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /search routes/i }));

    expect(onSearch).not.toHaveBeenCalled();
  });

  it('rejects when both fields are whitespace-only', () => {
    const onSearch = vi.fn();
    render(<CommuteForm onSearch={onSearch} />);

    fireEvent.change(screen.getByPlaceholderText('Enter start location'), {
      target: { value: '   ' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter destination'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /search routes/i }));

    expect(onSearch).not.toHaveBeenCalled();
  });

  it('submits valid locations successfully', () => {
    const onSearch = vi.fn();
    render(<CommuteForm onSearch={onSearch} />);

    fireEvent.change(screen.getByPlaceholderText('Enter start location'), {
      target: { value: 'Connaught Place' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter destination'), {
      target: { value: 'India Gate' },
    });
    fireEvent.click(screen.getByRole('button', { name: /search routes/i }));

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('Connaught Place', 'India Gate');
  });

  it('trims leading and trailing whitespace around valid locations before onSearch', () => {
    const onSearch = vi.fn();
    render(<CommuteForm onSearch={onSearch} />);

    fireEvent.change(screen.getByPlaceholderText('Enter start location'), {
      target: { value: '  Connaught Place  ' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter destination'), {
      target: { value: '  India Gate\t' },
    });
    fireEvent.click(screen.getByRole('button', { name: /search routes/i }));

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('Connaught Place', 'India Gate');
  });

  it('does not trigger onSearch when fields are empty', () => {
    const onSearch = vi.fn();
    render(<CommuteForm onSearch={onSearch} />);

    fireEvent.click(screen.getByRole('button', { name: /search routes/i }));

    expect(onSearch).not.toHaveBeenCalled();
  });
});