import React, { useState, useEffect } from 'react';
import { getAQIBand } from '../services/airQualityService';
import { useTranslation } from 'react-i18next';
import './MorningBriefing.css';

/** @param {any} params */
export default function MorningBriefing({ current, trend, showTrigger, onDismiss }) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);
  const [streak, setStreak] = useState(0);
  
  useEffect(() => {
    if (showTrigger) {
      localStorage.removeItem('briefingDismissed');
      setIsVisible(true);
    }
  }, [showTrigger]);

  useEffect(() => {
    // Check dismissal
    const todayStr = new Date().toISOString().split('T')[0];
    const dismissedOn = localStorage.getItem('briefingDismissed');
    if (dismissedOn === todayStr) {
      setIsVisible(false);
      if (onDismiss) onDismiss();
    }

    // Check streak
    const lastCheckIn = localStorage.getItem('lastCheckIn');
    let currentStreak = parseInt(localStorage.getItem('appStreak') || '0', 10);
    
    if (lastCheckIn !== todayStr) {
      if (lastCheckIn) {
        const lastDate = new Date(lastCheckIn);
        const today = new Date(todayStr);
      // @ts-ignore
        const diffTime = Math.abs(today - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentStreak += 1;
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      localStorage.setItem('appStreak', currentStreak.toString());
      localStorage.setItem('lastCheckIn', todayStr);
    }
    setStreak(currentStreak);
  }, []);

  if (!isVisible || !current) return null;

  const handleDismiss = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem('briefingDismissed', todayStr);
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
  const aqiBand = getAQIBand(current.us_aqi);
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
