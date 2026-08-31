import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Achievements from './Achievements';
import { ACHIEVEMENTS_STORAGE_KEY, BADGES } from '../utils/achievementsStore';
import html2canvas from 'html2canvas';

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

describe('Achievements Component - Shareable Achievements Card (Issue #1155)', () => {
  let mockCanvas;
  let mockLink;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    mockCanvas = {
      toDataURL: vi.fn(() => 'data:image/png;base64,mockdata'),
      toBlob: vi.fn((callback) => callback(new Blob(['mock-image-bytes'], { type: 'image/png' }))),
    };

    vi.mocked(html2canvas).mockResolvedValue(mockCanvas);

    mockLink = {
      click: vi.fn(),
      download: '',
      href: '',
    };

    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return mockLink;
      }
      return origCreateElement(tagName);
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    delete global.navigator.share;
    delete global.navigator.canShare;
  });

  it('renders the Share Achievements button and achievements grid', () => {
    render(<Achievements />);

    expect(screen.getByRole('heading', { name: /achievements/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share achievements/i })).toBeInTheDocument();
  });

  it('renders 0 earned badges message in share card template when no badges are unlocked', () => {
    render(<Achievements />);

    const shareCard = screen.getByTestId('achievements-share-card');
    expect(shareCard).toBeInTheDocument();
    expect(shareCard).toHaveTextContent(`0 / ${BADGES.length}`);
    expect(shareCard).toHaveTextContent('No badges earned yet. Start completing activities');
  });

  it('renders earned badges in share card template when badges are unlocked in localStorage', () => {
    const saved = {
      'first-report': '2026-08-30T10:00:00.000Z',
      'streak-master': '2026-08-30T11:00:00.000Z',
    };
    localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(saved));

    render(<Achievements />);

    const shareCard = screen.getByTestId('achievements-share-card');
    expect(shareCard).toHaveTextContent(`2 / ${BADGES.length}`);
    expect(shareCard).toHaveTextContent('First Report');
    expect(shareCard).toHaveTextContent('Streak Master');
  });

  it('captures share card with html2canvas and triggers file download when Web Share API is absent', async () => {
    render(<Achievements />);

    const shareBtn = screen.getByRole('button', { name: /share achievements/i });
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(html2canvas).toHaveBeenCalledWith(
        screen.getByTestId('achievements-share-card'),
        expect.objectContaining({ scale: 2, useCORS: true, backgroundColor: '#0f172a' })
      );
    });

    await waitFor(() => {
      expect(mockLink.download).toBe('my-achievements.png');
      expect(mockLink.href).toBe('data:image/png;base64,mockdata');
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  it('uses Web Share API when navigator.share and navigator.canShare are supported', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    const mockCanShare = vi.fn().mockReturnValue(true);
    global.navigator.share = mockShare;
    global.navigator.canShare = mockCanShare;

    render(<Achievements />);

    const shareBtn = screen.getByRole('button', { name: /share achievements/i });
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(html2canvas).toHaveBeenCalled();
      expect(mockCanvas.toBlob).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockCanShare).toHaveBeenCalled();
      expect(mockShare).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My Achievements',
          text: expect.stringContaining('Pollution Control Hub'),
          files: expect.any(Array),
        })
      );
    });
  });
});
