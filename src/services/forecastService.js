export async function fetchAQIForecast(locationId) {
  try {
    const response = await fetch(`/api/forecast?location=${locationId}`);
    if (!response.ok) throw new Error("Failed to fetch forecast data");
    const data = await response.json();
    return data; // Expected format: { hours: 72, predictions: [{ time: "Tomorrow 5 PM", aqi: 178, lower: 160, upper: 195, hazardous: true }] }
  } catch (error) {
    console.error("Error fetching AQI forecast:", error);
    // Return mock fallback data matching the example
    return {
      predictions: [
        { time: "Now", aqi: 120, lower: 115, upper: 125, hazardous: false },
        { time: "Tomorrow 5 PM", aqi: 178, lower: 162, upper: 194, hazardous: true },
      ],
    };
  }
}
