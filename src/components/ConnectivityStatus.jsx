import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { cacheStore } from '../utils/cacheStore';
import { describeAge } from '../utils/dataAge';
import styles from './ConnectivityStatus.module.css';

/** How long the "back online" confirmation stays up before dismissing itself. */
const RESTORED_VISIBLE_MS = 4000;

/**
 * Tells the visitor when what they are looking at is not live.
 *
 * The app is a PWA with a service worker, a NetworkFirst runtime cache, and an
 * IndexedDB tier that holds entries for a full day. All of that is built to keep working
 * without a connection, and none of it says when it is doing so. Go offline in a
 * basement car park and the dashboard keeps showing an AQI that looks current and may be
 * hours old.
 *
 * Three states, in priority order:
 *
 * 1. **Offline.** No connection, so nothing can refresh.
 * 2. **Reconnected.** Shown briefly, then dismissed. A banner that vanishes silently
 *    leaves people unsure whether the problem is fixed or the app gave up.
 * 3. **Stale.** Online, but the reading on screen predates the refresh window.
 *
 * Only one renders. Stacking "you are offline" on "this data is old" says the same thing
 * twice and pushes the actual content further down the page.
 *
 * @param {object} props
 * @param {number|null} [props.dataTimestamp] - Epoch ms the displayed reading was taken.
 *   Omit it and the component reports connectivity only.
 * @param {() => void} [props.onRetry] - Invoked by the retry control. Omit to hide it.
 */
export default function ConnectivityStatus({ dataTimestamp = null, onRetry = null }) {
  const { isOffline, wasOffline, offlineSince } = useOnlineStatus();
  const [showRestored, setShowRestored] = useState(false);
  const [persistenceFailed, setPersistenceFailed] = useState(() =>
    cacheStore.isPersistenceDegraded()
  );

  // Announce the recovery, then take it away. `wasOffline` alone would keep the banner
  // up for the rest of the session.
  useEffect(() => {
    if (isOffline || !wasOffline) return undefined;

    setShowRestored(true);
    const timer = setTimeout(() => setShowRestored(false), RESTORED_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [isOffline, wasOffline]);

  // cacheStore has exposed this since the persistence tier was written and nothing has
  // ever listened. It fires when IndexedDB refuses a read or write — Safari private
  // browsing, or storage pressure — which means the app is running memory-only and
  // everything is lost on reload.
  useEffect(() => {
    const unsubscribe = cacheStore.onPersistenceError(() => {
      setPersistenceFailed(true);
    });
    return unsubscribe;
  }, []);

  const age = dataTimestamp === null ? null : describeAge(dataTimestamp);

  let variant = null;
  let title = '';
  let detail = '';
  let icon = '';

  if (isOffline) {
    variant = styles.offline;
    icon = '⚠';
    title = 'You are offline';
    detail = age
      ? `Showing the last reading from ${age.label.replace('Updated ', '')}. Air quality may have changed since.`
      : 'Readings cannot refresh until the connection returns.';
  } else if (showRestored) {
    variant = styles.restored;
    icon = '✓';
    title = 'Back online';
    detail = offlineSince
      ? 'Refreshing with live readings.'
      : 'Connection restored.';
  } else if (age && age.needsCaveat) {
    variant = styles.stale;
    icon = '⏱';
    title = age.label;
    detail =
      'This is not a live reading. Air quality can cross two bands between morning and evening.';
  } else if (persistenceFailed) {
    variant = styles.stale;
    icon = '⏱';
    title = 'Offline storage unavailable';
    detail =
      'Readings are held in memory only and will be lost when this page reloads.';
  }

  if (!variant) return null;

  return (
    <div
      className={`${styles.banner} ${variant}`}
      // polite rather than assertive: this is worth knowing, not worth interrupting
      // whatever a screen reader is in the middle of saying.
      role="status"
      aria-live="polite"
    >
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.message}>
        <span className={styles.title}>{title}</span>
        {detail ? <span className={styles.detail}>{detail}</span> : null}
      </span>
      {onRetry && !isOffline ? (
        <button type="button" onClick={onRetry}>
          Refresh
        </button>
      ) : null}
    </div>
  );
}

ConnectivityStatus.propTypes = {
  dataTimestamp: PropTypes.number,
  onRetry: PropTypes.func,
};
