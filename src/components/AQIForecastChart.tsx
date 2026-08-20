import React, { useEffect, useState } from 'react'

export const AQIForecastChart: React.FC = () => {
  const [forecast, setForecast] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    async function fetchForecast() {
      try {
        const response = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ historical_values: [120, 125, 130, 135] }),
        })
        const data = await response.json()
        setForecast(data.predicted_aqi)
      } catch (error) {
        console.error('Failed to fetch AQI prediction', error)
      } finally {
        setLoading(false)
      }
    }
    fetchForecast()
  }, [])

  if (loading) return <div>Loading AQI forecast model...</div>

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="text-lg font-bold">24-Hour Predictive AQI Forecast</h3>
      <p className="text-2xl mt-2 text-blue-600">{forecast ? `${forecast} AQI` : 'Unavailable'}</p>
    </div>
  )
}
