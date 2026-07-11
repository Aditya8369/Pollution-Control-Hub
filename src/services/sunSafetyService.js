
export async function fetchSunSafety(lat, lon) {
  const response = await fetch(
       'https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&daily=uv_index_max&timezone=auto'
  );

  if (!response.ok) {
    throw new Error("Unable to fetch Sun Safety data.");
  }

  const data = await response.json();
  console.log("Sun Safety API Response:", data);
  const temperature = Math.round(data.current.temperature_2m);
  
  let status = "Safe";
  let level = "Low";

  if (uvIndex >= 8) {
    status = "Dangerous";
    level = "Very High";
  } else if (uvIndex >= 6) {
    status = "High";
    level = "High";
  } else if (uvIndex >= 3) {
    status = "Moderate";
    level = "Moderate";
  }

  return {
    temperature,
    uvIndex,
    status,
    level,
  };
}