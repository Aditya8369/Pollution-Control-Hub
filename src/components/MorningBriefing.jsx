import React, { useState, useEffect } from 'react';
import { getAQIBand } from '../services/airQualityService';
import './MorningBriefing.css';

export default function MorningBriefing({ current, trend }) {
  const [isVisible, setIsVisible] = useState(true);
  const [streak, setStreak] = useState(0);
  
  useEffect(() => {
    // Check dismissal
    const todayStr = new Date().toISOString().split('T')[0];
    const dismissedOn = localStorage.getItem('briefingDismissed');
    if (dismissedOn === todayStr) {
      setIsVisible(false);
    }

    // Check streak
    const lastCheckIn = localStorage.getItem('lastCheckIn');
    let currentStreak = parseInt(localStorage.getItem('appStreak') || '0', 10);
    
    if (lastCheckIn !== todayStr) {
      if (lastCheckIn) {
        const lastDate = new Date(lastCheckIn);
        const today = new Date(todayStr);
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
  };

  const currentHour = new Date().getHours();
  let greeting = "Late Night Check-in";
  if (currentHour >= 5 && currentHour < 12) greeting = "Good Morning, here's your air quality briefing";
  else if (currentHour >= 12 && currentHour < 17) greeting = "Good Afternoon, here's your air quality briefing";
  else if (currentHour >= 17 && currentHour < 21) greeting = "Good Evening, here's your air quality briefing";

  // Yesterday's summary proxy
  let yesterdayAvg = current.us_aqi;
  if (trend && trend.length > 0) {
    const olderHalf = trend.slice(0, Math.floor(trend.length / 2));
    if (olderHalf.length > 0) {
      yesterdayAvg = Math.round(olderHalf.reduce((sum, item) => sum + item.us_aqi, 0) / olderHalf.length);
    }
  }

  const diff = current.us_aqi - yesterdayAvg;
  let summaryText = "Same as yesterday's average.";
  let summaryIcon = "⚪";
  if (diff > 5) {
    summaryText = `Worse than yesterday's average (${yesterdayAvg}).`;
    summaryIcon = "🔴 ↑";
  } else if (diff < -5) {
    summaryText = `Better than yesterday's average (${yesterdayAvg}).`;
    summaryIcon = "🟢 ↓";
  }

  // Today's Outlook (Slope)
  let outlook = "AQI is relatively stable today.";
  if (trend && trend.length >= 2) {
    const firstAQI = trend[0].us_aqi;
    const lastAQI = trend[trend.length - 1].us_aqi;
    const slope = (lastAQI - firstAQI) / (trend.length - 1);
    if (slope < -0.5) {
      outlook = "AQI is trending downward — expect improvement this afternoon.";
    } else if (slope > 0.5) {
      outlook = "AQI is trending upward — it may get worse.";
    }
  }

  // Health tip
  const aqiBand = getAQIBand(current.us_aqi);
  let healthTip = "Enjoy the day!";
  if (current.us_aqi <= 50) healthTip = "Great day for outdoor exercise!";
  else if (current.us_aqi <= 100) healthTip = "Acceptable air quality. Unusually sensitive individuals should consider limiting prolonged outdoor exertion.";
  else if (current.us_aqi <= 150) healthTip = "Members of sensitive groups may experience health effects. General public is less likely to be affected.";
  else if (current.us_aqi <= 200) healthTip = "Consider wearing an N95 mask outdoors. Everyone may begin to experience health effects.";
  else healthTip = "Avoid prolonged or heavy exertion outdoors. Consider wearing an N95 mask.";

  return (
    <article className="morning-briefing slide-up-animation">
      <div className="briefing-header">
        <div className="greeting-container">
          <h3>{greeting}</h3>
          {streak > 0 && <span className="streak-badge">🔥 {streak}-day streak</span>}
        </div>
        <button className="dismiss-btn" onClick={handleDismiss} aria-label="Dismiss briefing">
          ✕
        </button>
      </div>
      
      <div className="briefing-content">
        <div className="briefing-item">
          <span className="icon">{summaryIcon}</span>
          <div>
            <strong>Yesterday's Summary:</strong>
            <p>{summaryText}</p>
          </div>
        </div>
        
        <div className="briefing-item">
          <span className="icon">📈</span>
          <div>
            <strong>Today's Outlook:</strong>
            <p>{outlook}</p>
          </div>
        </div>
        
        <div className="briefing-item">
          <span className="icon">💡</span>
          <div>
            <strong>Health Tip:</strong>
            <p>{healthTip}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
