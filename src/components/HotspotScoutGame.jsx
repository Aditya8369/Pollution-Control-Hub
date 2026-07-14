import { useState, useEffect } from "react";
import { shuffleArray, getHighestAQI } from "./hotspotGameUtils";

function HotspotScoutGame({ nearbyPoints }) {

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selected, setSelected] = useState(null);
  const [round, setRound] = useState([]);

  const generateRound = () => {
    const shuffled = shuffleArray(nearbyPoints);

    setRound(shuffled.slice(0, 4));
  };

  useEffect(() => {
    if (nearbyPoints.length >= 4) {
      generateRound();
    }
  }, [nearbyPoints]);

  const handleSelect = (spot) => {
    if (round.length === 0) return;

    const winner = getHighestAQI(round);

    if (spot.aqi === winner.aqi) {
      setScore(prev => prev + 1);
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }

    setSelected(winner);
  };


  return (
    <div className="hotspot-game">
      <h2>Hotspot Scout Game</h2>

      <p>Score: {score}</p>
      <p>Streak: {streak}</p>

      <div className="hotspot-options">
        {round.map((spot, index) => (
          <button
            key={index}
            className="hotspot-option"
            onClick={() => handleSelect(spot)}
          >
            {spot.areaName}
          </button>
        ))}
      </div>

      {selected && (
        <div style={{ marginTop: "20px" }}>
          Highest AQI: <strong>{selected.name}</strong> ({selected.aqi})
        </div>
      )}
    </div>
  );
}
export default HotspotScoutGame;
