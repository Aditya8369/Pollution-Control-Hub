import { useEffect, useState } from "react";
import "./SunSafetyWidget.css";
import { fetchSunSafety } from "../services/sunSafetyService";


export default function SunSafetyWidget({ lat, lon ,city}){
    const [open,setOpen]=useState(false);
    const [sunData, setSunData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
  async function loadSunData() {
    try {
    const data = await fetchSunSafety(lat, lon);
    setSunData(data);
    } catch (error) {
      console.error("Failed to load Sun Safety data:", error);
    } finally {
      setLoading(false);
    }
  }
  
  loadSunData();
}, [lat, lon]);
  const getHealthRecommendations = () => {

  const tips = [];

  if (sunData.temperature >= 35) {
    tips.push("🌡️ Extreme heat detected. Avoid unnecessary outdoor activities.");
    tips.push("💧 Drink plenty of water to stay hydrated.");
  } 
  else if (sunData.temperature >= 30) {
    tips.push("🌤️ Warm weather detected. Carry water while going outside.");
  }
  else {
    tips.push("✅ Temperature is comfortable for outdoor activities.");
  }


  if (sunData.uvIndex >= 8) {
    tips.push("☀️ Very high UV levels. Use sunscreen and protective clothing.");
    tips.push("🕶️ Avoid direct sunlight during peak hours.");
  }
  else if (sunData.uvIndex >= 5) {
    tips.push("🧴 Apply sunscreen before prolonged outdoor exposure.");
  }
  else {
    tips.push("🌿 UV level is safe for normal outdoor activities.");
  }


  return tips;

};
  if (loading || !sunData) {
  return (
    <div className="sun-widget">
      Loading Sun Safety...
    </div>
  );
}

    return (
  <div className="sun-widget-wrapper">

    <section 
      className="sun-widget"
      onClick={()=>setOpen(true)}
    >

        <div className="sun-header">
                <div className="title">
                    <span className="sun-icon">☀️</span>
                    <div>
    <h3>Sun Safety Today</h3>
    <p>Live Health Snapshot • {city}</p>
</div>
                </div>
                <span className="live-badge">
                    <span className="live-dot"></span>
                    LIVE
                </span>
            </div>
            <div className="sun-stats">
                <div className="stat-card">
                    <span>🌡</span>
                    <div>
                        <h4>{sunData.temperature}°C</h4>
                        <p>Temperature</p>
                    </div>
                </div>
                <div className="stat-card">
                    <span>☀️</span>
                    <div>
                        <h4>UV {sunData.uvIndex}</h4>
                        <p>{sunData.level}</p>

                    </div>
                </div>
                <div className="stat-card">
                    <span>🚶</span>
                    <div>
                        <h4>{sunData.status}</h4>
                        <p>Outdoor Activity</p>
                    </div>
                </div>
            </div>
            <div className="widget-footer">
                <button type="button">
                    Know Today's Health Advice →
                </button>
            </div>
          {open && (
  <div 
    className="health-modal-overlay"
    onClick={() => setOpen(false)}
  >

    <div 
      className="health-modal"
      onClick={(e) => e.stopPropagation()}
    >  

      <button 
        className="close-modal"
        onClick={() => setOpen(false)}
      >
        ✕
      </button>


      <div className="modal-header">
        <span>☀️</span>
        <div>
          <h2>Today's Sun Safety Advice</h2>
          <p>Based on current UV and temperature</p>
        </div>
      </div>


      <div className="health-details">

        <div>
          🌡️
          <strong> Temperature</strong>
          <p>{sunData.temperature}°C</p>
        </div>


        <div>
          ☀️
          <strong> UV Index</strong>
          <p>{sunData.uvIndex} - {sunData.level}</p>
        </div>


        <div>
          ⚠️
          <strong> Risk Level</strong>
          <p>{sunData.status}</p>
        </div>

      </div>


      <div className="tips-box">

        <h3>Health Recommendations</h3>

       <ul>
{
 getHealthRecommendations().map((tip,index)=>(
   <li key={index}>
      {tip}
   </li>
 ))
}
</ul>

      </div>

    </div>

  </div>
)}
</section>
        
</div>
    )
}
