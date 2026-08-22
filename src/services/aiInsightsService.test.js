import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAIInsights } from './aiInsightsService';
import { fetchHistoricalData } from './historicalDataService';

vi.mock('./historicalDataService', () => ({
  fetchHistoricalData: vi.fn(),
}));

describe('aiInsightsService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('handles missing data gracefully', async () => {
    fetchHistoricalData.mockResolvedValue(null);
    const result = await generateAIInsights(40, -70, 'TestCity');
    expect(result.insights).toEqual([]);
    expect(result.error).toMatch(/No historical data available/);
  });

  it('handles empty hourly data gracefully', async () => {
    fetchHistoricalData.mockResolvedValue({ hourly: { time: [] } });
    const result = await generateAIInsights(40, -70, 'TestCity');
    expect(result.insights).toEqual([]);
    expect(result.error).toMatch(/No historical data available/);
  });

  it('generates seasonal extremes insight', async () => {
    // Generate 12 months of fake data
    const times = [];
    const aqis = [];
    
    // Month 1 (low)
    for (let i = 0; i < 30; i++) { times.push(`2023-01-${String(i+1).padStart(2, '0')}T12:00:00Z`); aqis.push(20); }
    // Month 2 (high)
    for (let i = 0; i < 28; i++) { times.push(`2023-02-${String(i+1).padStart(2, '0')}T12:00:00Z`); aqis.push(150); }
    
    fetchHistoricalData.mockResolvedValue({
      hourly: {
        time: times,
        us_aqi: aqis,
        pm2_5: [], pm10: [], nitrogen_dioxide: [], ozone: [], carbon_monoxide: [], sulphur_dioxide: []
      }
    });

    const result = await generateAIInsights(40, -70, 'TestCity');
    expect(result.error).toBeNull();
    const extremeInsight = result.insights.find(i => i.id === 'seasonal-extremes');
    expect(extremeInsight).toBeDefined();
    expect(extremeInsight.description).toContain('February 2023');
    expect(extremeInsight.description).toContain('January 2023');
  });

  it('detects recent anomalies', async () => {
    const times = [];
    const aqis = [];
    
    const now = new Date();
    // 60 days of normal data
    for (let i = 0; i < 60; i++) {
       const d = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
       times.push(d.toISOString());
       aqis.push(30);
    }
    // 1 anomaly today
    times.push(now.toISOString());
    aqis.push(200); // mean is ~30, stddev is small, 200 is a huge anomaly

    fetchHistoricalData.mockResolvedValue({
      hourly: {
        time: times,
        us_aqi: aqis,
        pm2_5: [], pm10: [], nitrogen_dioxide: [], ozone: [], carbon_monoxide: [], sulphur_dioxide: []
      }
    });

    const result = await generateAIInsights(40, -70, 'TestCity');
    expect(result.error).toBeNull();
    const anomalyInsight = result.insights.find(i => i.type === 'anomaly');
    expect(anomalyInsight.title).toContain('Spike');
  });

  it('detects 30-day pollutant trends', async () => {
     const times = [];
     const pm25 = [];
     
     const now = new Date();
     // 45 days ago (previous period): PM2.5 = 10
     for (let i = 0; i < 60; i++) {
        const d = new Date(now.getTime() - (60 - i) * 24 * 60 * 60 * 1000);
        times.push(d.toISOString());
        // First 30 elements (60-31 days ago)
        if (i < 30) {
           pm25.push(10);
        } else {
           // Last 30 elements (30-0 days ago)
           pm25.push(20); // 100% increase
        }
     }
     
     // duplicate time arrays to pad out enough data points
     let timePadded = [];
     let pm25Padded = [];
     for(let i=0; i<100; i++) {
       timePadded = timePadded.concat(times);
       pm25Padded = pm25Padded.concat(pm25);
     }

     fetchHistoricalData.mockResolvedValue({
      hourly: {
        time: timePadded,
        pm2_5: pm25Padded,
        us_aqi: pm25Padded,
        pm10: [], nitrogen_dioxide: [], ozone: [], carbon_monoxide: [], sulphur_dioxide: []
      }
    });
    
    const result = await generateAIInsights(40, -70, 'TestCity');
    expect(result.error).toBeNull();
    const trendInsight = result.insights.find(i => i.id === 'pollutant-trends');
    expect(trendInsight).toBeDefined();
    expect(trendInsight.description).toContain('PM2.5');
    expect(trendInsight.description).toContain('increased');
  });
});
