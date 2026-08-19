import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tracks whether the browser currently has a network connection.
 *
 * `navigator.onLine` was already read in two places — once in App's refresh path and
 * once as an early bail-out in `airQualityService` — but never subscribed to. A value
 * read at mount and never corrected is worse than no value: it is confidently wrong for
 * the whole session after the first change.
 *
 * ## What `navigator.onLine` actually means
 *
 * It means "a network interface is attached", and nothing more. It is `true` on a
 * captive-portal Wi-Fi that has intercepted every request, on a connection that is up
 * but unusable, and on a phone showing one bar that will time out. The `offline` event
 * does not fire for any of those.
 *
 * So the flag is treated here as sufficient evidence of *offline* and insufficient
 * evidence of *online*. `isOffline` being true is reliable; a caller wanting more
 * certainty than that reports a failed request via `reportFailure()`, which is direct
 * evidence that the connection did not work regardless of what the flag says.
 *
 * ## Absent API
 *
 * `navigator` is absent under SSR and in some test environments, and `navigator.onLine`
 * is absent in a few older browsers. Both are treated as online: assuming a working
 * connection when the browser will not say degrades to normal behaviour, whereas
 * assuming offline would show a false warning to everyone whose browser lacks the API.
 *
 * @returns {{
 *   isOnline: boolean,
 *   isOffline: boolean,
 *   offlineSince: number|null,
 *   lastChangeAt: number|null,
 *   wasOffline: boolean,
 *   reportSuccess: () => void,
 *   reportFailure: () => void,
 * }}
 *   `offlineSince` is the epoch ms the connection dropped, or null while online.
 *   `wasOffline` stays true after reconnecting, so a caller can say "back online"
 *   rather than silently removing a banner.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(readOnlineFlag);
  const [offlineSince, setOfflineSince] = useState(() =>
    readOnlineFlag() ? null : Date.now()
  );
  const [lastChangeAt, setLastChangeAt] = useState(null);
  const [wasOffline, setWasOffline] = useState(() => !readOnlineFlag());

  // Read inside the state updaters rather than captured, so the listeners registered
  // below never need re-registering when the value changes.
  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;

  const goOffline = useCallback(() => {
    if (!isOnlineRef.current) return;
    isOnlineRef.current = false;
    setIsOnline(false);
    setWasOffline(true);
    setOfflineSince(Date.now());
    setLastChangeAt(Date.now());
  }, []);

  const goOnline = useCallback(() => {
    if (isOnlineRef.current) return;
    isOnlineRef.current = true;
    setIsOnline(true);
    setOfflineSince(null);
    setLastChangeAt(Date.now());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.addEventListener) return undefined;

    // Re-read on subscribe. The connection can change between the initial render and
    // this effect running, and that transition would otherwise be missed entirely.
    if (readOnlineFlag()) {
      goOnline();
    } else {
      goOffline();
    }

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [goOnline, goOffline]);

  /**
   * Records that a request failed in a way consistent with being offline.
   *
   * This is the corroboration the flag cannot provide. A caller passes a network-level
   * failure — not an HTTP 500, which proves the connection works fine.
   */
  const reportFailure = useCallback(() => {
    goOffline();
  }, [goOffline]);

  /**
   * Records that a request succeeded, which is proof the connection works.
   */
  const reportSuccess = useCallback(() => {
    goOnline();
  }, [goOnline]);

  return {
    isOnline,
    isOffline: !isOnline,
    offlineSince,
    lastChangeAt,
    wasOffline,
    reportSuccess,
    reportFailure,
  };
}

/**
 * Reads `navigator.onLine` defensively.
 *
 * @returns {boolean} True when the browser reports a connection, or cannot say.
 */
function readOnlineFlag() {
  if (typeof navigator === 'undefined') return true;
  if (typeof navigator.onLine !== 'boolean') return true;
  return navigator.onLine;
}

export default useOnlineStatus;
