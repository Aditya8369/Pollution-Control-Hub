self.onmessage = function (e) {
  const { data } = e;
  
  if (!data || !data.hourly) {
    self.postMessage({ error: 'Invalid data format' });
    return;
  }

  const times = data.hourly.time || [];
  const aqiValues = data.hourly.us_aqi || [];
  const pm25Values = data.hourly.pm2_5 || [];
  const pm10Values = data.hourly.pm10 || [];
  const coValues = data.hourly.carbon_monoxide || [];
  const no2Values = data.hourly.nitrogen_dioxide || [];
  const o3Values = data.hourly.ozone || [];
  
  const dailyData = new Map();

  for (let i = 0; i < times.length; i++) {
    const time = times[i];
    if (!time) continue;
    
    // YYYY-MM-DD
    const dateStr = time.split('T')[0];
    
    if (!dailyData.has(dateStr)) {
      dailyData.set(dateStr, {
        sum: 0,
        count: 0,
        max: -Infinity,
        pm25Sum: 0,
        pm25Count: 0,
        pm10Sum: 0,
        pm10Count: 0,
        coSum: 0,
        coCount: 0,
        no2Sum: 0,
        no2Count: 0,
        o3Sum: 0,
        o3Count: 0
      });
    }
    
    const stats = dailyData.get(dateStr);
    
    const aqi = aqiValues[i];
    if (aqi != null) {
      stats.sum += aqi;
      stats.count += 1;
      if (aqi > stats.max) stats.max = aqi;
    }
    
    const pm25 = pm25Values[i];
    if (pm25 != null) {
      stats.pm25Sum += pm25;
      stats.pm25Count += 1;
    }
    
    const pm10 = pm10Values[i];
    if (pm10 != null) {
      stats.pm10Sum += pm10;
      stats.pm10Count += 1;
    }
    
    const co = coValues[i];
    if (co != null) {
      stats.coSum += co;
      stats.coCount += 1;
    }
    
    const no2 = no2Values[i];
    if (no2 != null) {
      stats.no2Sum += no2;
      stats.no2Count += 1;
    }
    
    const o3 = o3Values[i];
    if (o3 != null) {
      stats.o3Sum += o3;
      stats.o3Count += 1;
    }
  }

  /** @type {any[]} */
  const processedDays = [];
  let totalAqi = 0;
  let totalDays = 0;
  
  dailyData.forEach((stats, dateStr) => {
    const avgAqi = stats.count > 0 ? Math.round(stats.sum / stats.count) : 0;
    const maxAqi = stats.max !== -Infinity ? Math.round(stats.max) : 0;
    processedDays.push({
      date: dateStr,
      avgAqi,
      maxAqi,
      pm25: stats.pm25Count > 0 ? Math.round((stats.pm25Sum / stats.pm25Count) * 10) / 10 : null,
      pm10: stats.pm10Count > 0 ? Math.round((stats.pm10Sum / stats.pm10Count) * 10) / 10 : null,
      co: stats.coCount > 0 ? Math.round((stats.coSum / stats.coCount) * 10) / 10 : null,
      no2: stats.no2Count > 0 ? Math.round((stats.no2Sum / stats.no2Count) * 10) / 10 : null,
      ozone: stats.o3Count > 0 ? Math.round((stats.o3Sum / stats.o3Count) * 10) / 10 : null,
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
