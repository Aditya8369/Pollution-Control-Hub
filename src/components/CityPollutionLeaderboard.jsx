import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { fetchCityComparisons } from '../services/airQualityService';
import { CITY_COORDINATES } from '../constants/cities';
import './CityPollutionLeaderboard.css';

const CityPollutionLeaderboard = () => {
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filterRegion, setFilterRegion] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterState, setFilterState] = useState('');

  useEffect(() => {
    const loadComparisons = async () => {
      try {
        setLoading(true);
        const data = await fetchCityComparisons();
        setComparisons(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadComparisons();
  }, []);

  const calculatePollutionScore = (aqi, pm25, pm10) => {
    if (aqi === null && pm25 === null && pm10 === null) return null;
    return Math.round((aqi || 0) * 0.5 + (pm25 || 0) * 0.3 + (pm10 || 0) * 0.2);
  };

  const processedData = useMemo(() => {
    return comparisons.map(c => {
      const cityDetails = CITY_COORDINATES.find(coord => coord.name === c.city) || {};
      const score = calculatePollutionScore(c.aqi, c.pm2_5, c.pm10);
      return { ...c, ...cityDetails, pollutionScore: score };
    }).filter(c => !c.unavailable && c.pollutionScore !== null)
      .sort((a, b) => b.pollutionScore - a.pollutionScore); // Descending (higher score = more polluted)
  }, [comparisons]);

  const filteredData = useMemo(() => {
    return processedData.filter(c => {
      if (filterRegion && c.region !== filterRegion) return false;
      if (filterCountry && c.country !== filterCountry) return false;
      if (filterState && c.state !== filterState) return false;
      return true;
    }).map((c, idx) => ({ ...c, rank: idx + 1 }));
  }, [processedData, filterRegion, filterCountry, filterState]);

  const mostPollutedCity = filteredData[0];
  const cleanestCity = filteredData[filteredData.length - 1];
  
  if (loading) return <div className="loading" style={{textAlign: "center", padding: "2rem"}}>Loading Leaderboard...</div>;
  if (error) return <div className="error" style={{textAlign: "center", padding: "2rem"}}>Error loading leaderboard: {error}</div>;

  return (
    <div className="city-leaderboard">
      <h2>City Pollution Leaderboard</h2>
      
      <div className="filters">
        <select onChange={e => setFilterRegion(e.target.value)} value={filterRegion}>
          <option value="">All Regions</option>
          {Array.from(new Set(CITY_COORDINATES.map(c => c.region).filter(Boolean))).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select onChange={e => setFilterCountry(e.target.value)} value={filterCountry}>
          <option value="">All Countries</option>
          {Array.from(new Set(CITY_COORDINATES.map(c => c.country).filter(Boolean))).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select onChange={e => setFilterState(e.target.value)} value={filterState}>
          <option value="">All States</option>
          {Array.from(new Set(CITY_COORDINATES.map(c => c.state).filter(Boolean))).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="highlights">
        {cleanestCity && (
          <div className="highlight-card cleanest">
            <h3>Cleanest City</h3>
            <p>{cleanestCity.name}, {cleanestCity.country}</p>
            <span>Score: {cleanestCity.pollutionScore}</span>
          </div>
        )}
        {mostPollutedCity && (
          <div className="highlight-card polluted">
            <h3>Most Polluted City</h3>
            <p>{mostPollutedCity.name}, {mostPollutedCity.country}</p>
            <span>Score: {mostPollutedCity.pollutionScore}</span>
          </div>
        )}
      </div>

      <div className="leaderboard-table-container">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>City</th>
              <th>Region</th>
              <th>AQI</th>
              <th>Pollution Score</th>
              <th>Trend (24h)</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(city => (
              <tr key={city.name}>
                <td>#{city.rank}</td>
                <td>{city.name}, {city.country}</td>
                <td>{city.region}</td>
                <td>{city.aqi}</td>
                <td>{city.pollutionScore}</td>
                <td className="trend-cell">
                  {city.trend && city.trend.length > 0 ? (
                    <ResponsiveContainer width={120} height={40}>
                      <LineChart data={city.trend}>
                        <Line type="monotone" dataKey="us_aqi" stroke="#8884d8" strokeWidth={2} dot={false} />
                        <YAxis hide domain={['dataMin', 'dataMax']} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CityPollutionLeaderboard;
