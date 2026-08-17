import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ConnectivityStatus from './ConnectivityStatus';
import { cacheStore } from '../utils/cacheStore';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

function setNavigatorOnline(value) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
}

function fireConnectivity(type) {
  setNavigatorOnline(type === 'online');
  window.dispatchEvent(new Event(type));
}

describe('ConnectivityStatus', () => {
  beforeEach(() => {
    setNavigatorOnline(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    setNavigatorOnline(true);
  });

  it('renders nothing when online with a live reading', () => {
    // The whole point: a banner on every load is a banner nobody reads.
    const { container } = render(
      <ConnectivityStatus dataTimestamp={Date.now()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when online with no timestamp to judge', () => {
    const { container } = render(<ConnectivityStatus />);
    expect(container).toBeEmptyDOMElement();
  });

  it('announces going offline', () => {
    render(<ConnectivityStatus dataTimestamp={Date.now()} />);

    act(() => fireConnectivity('offline'));

    expect(screen.getByText('You are offline')).toBeInTheDocument();
  });

  it('says how old the reading on screen is while offline', () => {
    render(<ConnectivityStatus dataTimestamp={Date.now() - 3 * HOUR} />);

    act(() => fireConnectivity('offline'));

    expect(screen.getByText(/3 hours ago/)).toBeInTheDocument();
    expect(screen.getByText(/may have changed/)).toBeInTheDocument();
  });

  it('falls back to a generic message when there is no timestamp', () => {
    render(<ConnectivityStatus />);

    act(() => fireConnectivity('offline'));

    expect(screen.getByText('You are offline')).toBeInTheDocument();
    expect(screen.getByText(/cannot refresh/)).toBeInTheDocument();
  });

  it('labels a stale reading while still online', () => {
    render(<ConnectivityStatus dataTimestamp={Date.now() - 90 * MINUTE} />);

    expect(screen.getByText('Updated 1 hour ago')).toBeInTheDocument();
    expect(screen.getByText(/not a live reading/)).toBeInTheDocument();
  });

  it('shows only the offline banner when the data is also stale', () => {
    // Stacking "you are offline" on "this data is old" says the same thing twice and
    // pushes the actual content further down the page.
    render(<ConnectivityStatus dataTimestamp={Date.now() - 3 * HOUR} />);

    act(() => fireConnectivity('offline'));

    expect(screen.getByText('You are offline')).toBeInTheDocument();
    expect(screen.queryByText(/not a live reading/)).not.toBeInTheDocument();
  });

  it('confirms reconnection and then dismisses itself', () => {
    vi.useFakeTimers();
    render(<ConnectivityStatus dataTimestamp={Date.now()} />);

    act(() => fireConnectivity('offline'));
    act(() => fireConnectivity('online'));

    expect(screen.getByText('Back online')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // A banner that vanishes the instant the connection returns leaves people unsure
    // whether it is fixed or the app gave up; one that never leaves is clutter.
    expect(screen.queryByText('Back online')).not.toBeInTheDocument();
  });

  it('is announced politely rather than assertively', () => {
    render(<ConnectivityStatus dataTimestamp={Date.now()} />);
    act(() => fireConnectivity('offline'));

    const banner = screen.getByRole('status');
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });

  it('hides its icon from assistive technology', () => {
    render(<ConnectivityStatus dataTimestamp={Date.now()} />);
    act(() => fireConnectivity('offline'));

    // The icon repeats the text that follows it. Announcing "warning warning you are
    // offline" is worse than announcing the sentence.
    const icon = screen.getByRole('status').querySelector('[aria-hidden="true"]');
    expect(icon).not.toBeNull();
  });
});

describe('ConnectivityStatus — retry control', () => {
  beforeEach(() => {
    setNavigatorOnline(true);
  });

  afterEach(() => {
    setNavigatorOnline(true);
  });

  it('offers a refresh when online and stale', () => {
    const onRetry = vi.fn();
    render(
      <ConnectivityStatus dataTimestamp={Date.now() - 3 * HOUR} onRetry={onRetry} />
    );

    screen.getByRole('button', { name: /refresh/i }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides the refresh control while offline', () => {
    render(
      <ConnectivityStatus dataTimestamp={Date.now() - 3 * HOUR} onRetry={() => {}} />
    );

    act(() => fireConnectivity('offline'));

    // Offering a retry that cannot possibly work is worse than offering nothing.
    expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
  });

  it('renders no control when no handler is supplied', () => {
    render(<ConnectivityStatus dataTimestamp={Date.now() - 3 * HOUR} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('ConnectivityStatus — degraded persistence', () => {
  beforeEach(() => {
    setNavigatorOnline(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports that offline storage is unavailable', () => {
    // cacheStore has exposed onPersistenceError since it was written and nothing has
    // ever listened. It fires in Safari private browsing and under storage pressure,
    // which means the app is running memory-only.
    let emit;
    vi.spyOn(cacheStore, 'onPersistenceError').mockImplementation((cb) => {
      emit = cb;
      return () => true;
    });

    render(<ConnectivityStatus dataTimestamp={Date.now()} />);

    act(() => emit(new Error('QuotaExceededError')));

    expect(screen.getByText('Offline storage unavailable')).toBeInTheDocument();
  });

  it('picks up a failure that happened before it mounted', () => {
    vi.spyOn(cacheStore, 'isPersistenceDegraded').mockReturnValue(true);

    render(<ConnectivityStatus dataTimestamp={Date.now()} />);

    expect(screen.getByText('Offline storage unavailable')).toBeInTheDocument();
  });

  it('unsubscribes on unmount', () => {
    const unsubscribe = vi.fn(() => true);
    vi.spyOn(cacheStore, 'onPersistenceError').mockReturnValue(unsubscribe);

    const { unmount } = render(<ConnectivityStatus />);
    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it('lets the offline banner take priority over a storage warning', () => {
    vi.spyOn(cacheStore, 'isPersistenceDegraded').mockReturnValue(true);

    render(<ConnectivityStatus dataTimestamp={Date.now()} />);
    act(() => fireConnectivity('offline'));

    expect(screen.getByText('You are offline')).toBeInTheDocument();
    expect(
      screen.queryByText('Offline storage unavailable')
    ).not.toBeInTheDocument();
  });
});
