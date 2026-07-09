self.onmessage = function (e) {
  const { data } = e;
  
  if (!data || !data.hourly) {
    self.postMessage({ error: 'Invalid data format' });
    return;
  }

  const times = data.hourly.time;
  const aqiValues = data.hourly.us_aqi;
  
  const dailyData = new Map();

  for (let i = 0; i < times.length; i++) {
    const time = times[i];
    const aqi = aqiValues[i];
    
    if (aqi == null) continue;
    
    // YYYY-MM-DD
    const dateStr = time.split('T')[0];
    
    if (!dailyData.has(dateStr)) {
      dailyData.set(dateStr, { sum: 0, count: 0, max: -Infinity });
    }
    
    const stats = dailyData.get(dateStr);
    stats.sum += aqi;
    stats.count += 1;
    if (aqi > stats.max) stats.max = aqi;
  }

  const processedDays = [];
  let totalAqi = 0;
  let totalDays = 0;
  
  dailyData.forEach((stats, dateStr) => {
    const avgAqi = Math.round(stats.sum / stats.count);
    processedDays.push({
      date: dateStr,
      avgAqi,
      maxAqi: Math.round(stats.max)
    });
    totalAqi += avgAqi;
    totalDays += 1;
  });

  // Calculate monthly averages for chart or trend analysis
  const monthlyAverages = {};
  processedDays.forEach(day => {
    const month = day.date.substring(0, 7); // YYYY-MM
    if (!monthlyAverages[month]) monthlyAverages[month] = { sum: 0, count: 0, max: -Infinity };
    monthlyAverages[month].sum += day.avgAqi;
    monthlyAverages[month].count += 1;
    if (day.maxAqi > monthlyAverages[month].max) monthlyAverages[month].max = day.maxAqi;
  });
  
  const formattedMonthly = Object.keys(monthlyAverages).sort().map(month => ({
    month,
    avgAqi: Math.round(monthlyAverages[month].sum / monthlyAverages[month].count),
    maxAqi: Math.round(monthlyAverages[month].max)
  }));

  const overallAvg = totalDays > 0 ? Math.round(totalAqi / totalDays) : 0;

  self.postMessage({
    daily: processedDays,
    monthly: formattedMonthly,
    overallAvg
  });
};
