import React, { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceArea } from "recharts";
import { fetchAQIForecast } from "../services/forecastService";

export function AQIForecastChart({ locationId }) {
  const [forecastData, setForecastData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const data = await fetchAQIForecast(locationId);
      setForecastData(data.predictions || []);
      setLoading(false);
    }
    loadData();
  }, [locationId]);

  if (loading) return <div>Loading 72-hour AQI forecast...</div>;

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-bold mb-4">24–72 Hour AQI Forecast</h3>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={forecastData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={[0, 400]} />
            <Tooltip />
            {/* Highlight hazardous periods where AQI > 150 */}
            <ReferenceArea y1={150} y2={400} stroke="red" strokeOpacity={0.3} fill="red" fillOpacity={0.1} />
            <Line type="monotone" dataKey="aqi" stroke="#2563eb" strokeWidth={2} name="Predicted AQI" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
