import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { eventBus } from '../core/events';
import { localDayKey } from '../utils/localDay';
import { nextStreak } from '../utils/checkInStreak';
import './MorningBriefing.css';

const STREAK_KEY = 'appStreak';
const LAST_CHECK_IN_KEY = 'lastCheckIn';
const DISMISSED_KEY = 'briefingDismissed';

/** @param {string} key */
function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * @param {string} key
 * @param {string} value
 */
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or a full quota — the streak still shows for this session.
  }
}

/** @param {any} params */
export default function MorningBriefing({ current, trend, showTrigger, onDismiss }) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (showTrigger) {
      try {
        localStorage.removeItem(DISMISSED_KEY);
      } catch {
        // Nothing to clear if storage is unavailable.
      }
      setIsVisible(true);
    }
  }, [showTrigger]);

  // Held in a ref so checkIn stays referentially stable. The visibility listener
  // below is registered once, and a checkIn that changed identity would leave it
  // calling a stale closure.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const checkIn = useCallback(() => {
    const todayKey = localDayKey();

    if (readStorage(DISMISSED_KEY) === todayKey) {
      setIsVisible(false);
      onDismissRef.current?.();
    }

    const { streak: currentStreak, changed } = nextStreak(
      readStorage(LAST_CHECK_IN_KEY),
      todayKey,
      readStorage(STREAK_KEY)
    );

    if (changed) {
      writeStorage(STREAK_KEY, String(currentStreak));
      writeStorage(LAST_CHECK_IN_KEY, todayKey);
    }

    setStreak(currentStreak);
    eventBus.emit('STREAK_UPDATED', { streak: currentStreak });
  }, []);

  useEffect(() => {
    checkIn();

    // A tab left open across local midnight would otherwise keep showing
    // yesterday's streak until reloaded. Re-checking when the tab is brought back
    // to the foreground ties the update to the user actually returning, rather
    // than to a timer that would advance a streak for an unattended tab.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkIn();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // Mount-only on purpose: checkIn is stable via useCallback, so re-running this
    // would only tear the listener down and re-add it.
  }, []);

  if (!isVisible || !current) return null;

  const handleDismiss = () => {
    writeStorage(DISMISSED_KEY, localDayKey());
    setIsVisible(false);
    if (onDismiss) onDismiss();
  };

  const currentHour = new Date().getHours();
  let greeting = t('briefing.greetings.lateNight');
  if (currentHour >= 5 && currentHour < 12) greeting = t('briefing.greetings.morning');
  else if (currentHour >= 12 && currentHour < 17) greeting = t('briefing.greetings.afternoon');
  else if (currentHour >= 17 && currentHour < 21) greeting = t('briefing.greetings.evening');

  // Yesterday's summary proxy
  let yesterdayAvg = current.us_aqi;
  if (trend && trend.length > 0) {
    const olderHalf = trend.slice(0, Math.floor(trend.length / 2));
    if (olderHalf.length > 0) {
      yesterdayAvg = Math.round(olderHalf.reduce((sum, item) => sum + item.us_aqi, 0) / olderHalf.length);
    }
  }

  const diff = current.us_aqi - yesterdayAvg;
  let summaryText = t('briefing.summaries.same');
  let summaryIcon = "⚪";
  if (diff > 5) {
    summaryText = t('briefing.summaries.worse', { avg: yesterdayAvg });
    summaryIcon = "🔴 ↑";
  } else if (diff < -5) {
    summaryText = t('briefing.summaries.better', { avg: yesterdayAvg });
    summaryIcon = "🟢 ↓";
  }

  // Today's Outlook (Slope)
  let outlook = t('briefing.outlooks.stable');
  if (trend && trend.length >= 2) {
    const firstAQI = trend[0].us_aqi;
    const lastAQI = trend[trend.length - 1].us_aqi;
    const slope = (lastAQI - firstAQI) / (trend.length - 1);
    if (slope < -0.5) {
      outlook = t('briefing.outlooks.downward');
    } else if (slope > 0.5) {
      outlook = t('briefing.outlooks.upward');
    }
  }

  // Health tip
  let healthTip = t('briefing.tips.enjoy');
  if (current.us_aqi <= 50) healthTip = t('briefing.tips.good');
  else if (current.us_aqi <= 100) healthTip = t('briefing.tips.moderate');
  else if (current.us_aqi <= 150) healthTip = t('briefing.tips.sensitive');
  else if (current.us_aqi <= 200) healthTip = t('briefing.tips.unhealthy');
  else healthTip = t('briefing.tips.hazardous');

  return (
    <article className="morning-briefing slide-up-animation">
      <div className="briefing-header">
        <div className="greeting-container">
          <h3>{greeting}</h3>
          {streak > 0 && <span className="streak-badge">{t('briefing.streak', { streak })}</span>}
        </div>
        <button className="dismiss-btn" onClick={handleDismiss} aria-label="Dismiss briefing">
          ✕
        </button>
      </div>

      <div className="briefing-content">
        <div className="briefing-item">
          <span className="icon">{summaryIcon}</span>
          <div>
            <strong>{t('briefing.yesterdaySummary')}</strong>
            <p>{summaryText}</p>
          </div>
        </div>

        <div className="briefing-item">
          <span className="icon">📈</span>
          <div>
            <strong>{t('briefing.todayOutlook')}</strong>
            <p>{outlook}</p>
          </div>
        </div>

        <div className="briefing-item">
          <span className="icon">💡</span>
          <div>
            <strong>{t('briefing.healthTip')}</strong>
            <p>{healthTip}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
