import { fetchHistoricalData } from './historicalDataService';

function calculateMean(arr) {
  if (!arr || !arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calculateStdDev(arr, mean) {
  if (!arr || !arr.length) return 0;
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Generate AI insights based on historical pollution data.
 * @param {number} lat
 * @param {number} lon
 * @param {string} cityName
 * @returns {Promise<{insights: Array<any>, error: string|null}>}
 */
export async function generateAIInsights(lat, lon, cityName) {
  try {
    const data = await fetchHistoricalData(lat, lon, 1);
    if (!data || !data.hourly || !data.hourly.time || data.hourly.time.length === 0) {
      return { insights: [], error: 'No historical data available to generate insights.' };
    }

    const { time, pm2_5, pm10, nitrogen_dioxide, ozone, carbon_monoxide, us_aqi, sulphur_dioxide } = data.hourly;
    const insights = [];

    // Filter valid AQI readings
    const validAqi = [];
    for (let i = 0; i < us_aqi.length; i++) {
      if (us_aqi[i] != null) {
        validAqi.push({ val: us_aqi[i], time: time[i] });
      }
    }

    if (validAqi.length > 0) {
      // 1. Seasonal / Period Extremes
      const monthly = {};
      validAqi.forEach(item => {
        const date = new Date(item.time);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthly[monthKey]) monthly[monthKey] = [];
        monthly[monthKey].push(item.val);
      });

      let highestMonth = null;
      let highestMonthAvg = -1;
      let lowestMonth = null;
      let lowestMonthAvg = 9999;

      for (const [m, vals] of Object.entries(monthly)) {
        const avg = calculateMean(vals);
        if (avg > highestMonthAvg) { highestMonthAvg = avg; highestMonth = m; }
        if (avg < lowestMonthAvg) { lowestMonthAvg = avg; lowestMonth = m; }
      }

      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const formatMonth = (mKey) => {
        const [y, m] = mKey.split('-');
        return `${monthNames[parseInt(m, 10) - 1]} ${y}`;
      };

      if (highestMonth && lowestMonth && highestMonth !== lowestMonth) {
        insights.push({
          id: 'seasonal-extremes',
          type: 'period',
          icon: '📅',
          title: 'Seasonal Extremes',
          description: `Based on the past year in ${cityName || 'this location'}, **${formatMonth(highestMonth)}** had the highest average pollution (AQI ~${Math.round(highestMonthAvg)}), while **${formatMonth(lowestMonth)}** was the cleanest (AQI ~${Math.round(lowestMonthAvg)}).`,
          confidence: 'High',
          source: 'Historical Data Aggregation'
        });
      }

      // 2. Anomaly Detection
      const aqiVals = validAqi.map(a => a.val);
      const meanAqi = calculateMean(aqiVals);
      const stdDevAqi = calculateStdDev(aqiVals, meanAqi);
      const anomalyThreshold = meanAqi + (2.5 * stdDevAqi);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentAnomalies = validAqi.filter(a => new Date(a.time) > thirtyDaysAgo && a.val > anomalyThreshold);

      if (recentAnomalies.length > 0) {
        insights.push({
          id: 'recent-anomalies',
          type: 'anomaly',
          icon: '⚠️',
          title: 'Recent Pollution Spikes',
          description: `Detected **${recentAnomalies.length} unusual pollution spikes** in the last 30 days where AQI exceeded ${Math.round(anomalyThreshold)}. This is significantly higher than the yearly average of ${Math.round(meanAqi)}.`,
          confidence: 'Medium',
          source: 'Statistical Anomaly Detection'
        });
      } else {
        insights.push({
          id: 'stable-quality',
          type: 'anomaly',
          icon: '✅',
          title: 'Stable Air Quality',
          description: `No significant unusual pollution spikes detected in the last 30 days. Air quality has remained within expected statistical ranges compared to the yearly average of ${Math.round(meanAqi)}.`,
          confidence: 'High',
          source: 'Statistical Anomaly Detection'
        });
      }
    }

    // 3. Pollutant Trends (Last 30 days vs Previous 30 days)
    const compareTrend = (dataArr, timeArr) => {
      if (!dataArr || !timeArr) return null;
      let recentVals = [];
      let prevVals = [];
      const now = new Date();
      const t30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const t60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      for (let i = 0; i < timeArr.length; i++) {
        const t = new Date(timeArr[i]);
        const v = dataArr[i];
        if (v != null) {
          if (t > t30) recentVals.push(v);
          else if (t > t60) prevVals.push(v);
        }
      }
      if (recentVals.length > 50 && prevVals.length > 50) {
        const recentMean = calculateMean(recentVals);
        const prevMean = calculateMean(prevVals);
        const percentChange = prevMean === 0 ? 0 : ((recentMean - prevMean) / prevMean) * 100;
        return { recentMean, prevMean, percentChange };
      }
      return null;
    };

    const pollutants = [
      { key: 'PM2.5', arr: pm2_5 },
      { key: 'PM10', arr: pm10 },
      { key: 'NO2', arr: nitrogen_dioxide },
      { key: 'O3', arr: ozone },
      { key: 'CO', arr: carbon_monoxide },
      { key: 'SO2', arr: sulphur_dioxide }
    ];

    let trendDescriptions = [];
    pollutants.forEach(p => {
      const trend = compareTrend(p.arr, time);
      if (trend && Math.abs(trend.percentChange) > 5) {
        const dir = trend.percentChange > 0 ? 'increased' : 'decreased';
        trendDescriptions.push(`**${p.key}** ${dir} by ${Math.abs(trend.percentChange).toFixed(1)}%`);
      }
    });

    if (trendDescriptions.length > 0) {
      insights.push({
        id: 'pollutant-trends',
        type: 'trend',
        icon: '📈',
        title: '30-Day Pollutant Trends',
        description: `Over the last 30 days compared to the prior month: ${trendDescriptions.join(', ')}.`,
        confidence: 'High',
        source: 'Rolling Average Comparison'
      });
    }

    return { insights, error: null };
  } catch (error) {
    console.error('Failed to generate AI insights:', error);
    return { insights: [], error: error.message || 'Failed to generate AI insights.' };
  }
}
