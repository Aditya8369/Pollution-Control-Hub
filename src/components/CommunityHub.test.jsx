import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CommunityHub from './CommunityHub';

describe('CommunityHub security & sanitization', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('sanitizes special HTML characters in title and description to prevent stored XSS', async () => {
    render(<CommunityHub />);

    const titleInput = screen.getByPlaceholderText(/Issue title/i);
    const descInput = screen.getByPlaceholderText(/Describe location/i);
    const submitBtn = screen.getByRole('button', { name: /Submit Report/i });

    const maliciousTitle = '<script>alert("XSS-Title")</script>';
    const maliciousDesc = '<img src=x onerror="alert(1)"> & "quotes"';

    fireEvent.change(titleInput, { target: { value: maliciousTitle } });
    fireEvent.change(descInput, { target: { value: maliciousDesc } });
    fireEvent.click(submitBtn);

    // Verify report card renders sanitized text rather than raw HTML tags
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('&lt;script&gt;alert("XSS-Title")&lt;/script&gt;');
    expect(screen.getByText(/&lt;img src=x onerror="alert\(1\)"&gt; &amp; &quot;quotes&quot;/i)).toBeInTheDocument();
  });

  it('rejects non-image files or invalid file extensions during upload', async () => {
    render(<CommunityHub />);

    // Create a fake SVG file (disallowed MIME type)
    const file = new File(['<svg></svg>'], 'malicious.svg', { type: 'image/svg+xml' });
    const fileInput = document.querySelector('input[type="file"]');

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Only JPEG, PNG, and WebP images are allowed/i)).toBeInTheDocument();
    });
  });
});
