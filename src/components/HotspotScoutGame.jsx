import { useState, useEffect } from "react";
import { shuffleArray, getHighestAQI, getHighScore, saveHighScore } from "./hotspotGameUtils";

/** @param {any} params */
function HotspotScoutGame({ nearbyPoints }) {

  const TOTAL_ROUNDS = 5;

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selected, setSelected] = useState(null);
  const [round, setRound] = useState([]);
  const [roundNumber, setRoundNumber] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() => getHighScore());

  const generateRound = () => {
    const shuffled = shuffleArray(nearbyPoints);

    setRound(shuffled.slice(0, 4));
    setSelected(null);
  };

  useEffect(() => {
    if (nearbyPoints.length >= 4) {
      setScore(0);
      setStreak(0);
      setRoundNumber(1);
      setGameOver(false);
      generateRound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearbyPoints]);

  /** @param {any} spot */
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

  const handleNextRound = () => {
    if (roundNumber >= TOTAL_ROUNDS) {
      const updatedHighScore = saveHighScore(score);
      setHighScore(updatedHighScore);
      setGameOver(true);
      return;
    }
    setRoundNumber(prev => prev + 1);
    generateRound();
  };

  const handlePlayAgain = () => {
    setScore(0);
    setStreak(0);
    setRoundNumber(1);
    setGameOver(false);
    generateRound();
  };


  return (
    <div className="hotspot-game">
      <h2>Hotspot Scout Game</h2>

      <div className="rules-card hotspot-rules-card">
        <h3>How to Play</h3>
        <ol className="rules-list">
          <li>
            <strong>Identify the hotspot:</strong> Select the zone with the highest pollution level.
          </li>
          <li>
            <strong>Earn points:</strong> Gain points for every correct selection.
          </li>
          <li>
            <strong>Build your streak:</strong> Consecutive correct answers increase your streak.
          </li>
          <li>
            <strong>Complete all rounds:</strong> Finish all rounds to achieve the highest possible score.
          </li>
          <li>
            <strong>Reset anytime:</strong> Use the Reset button to start a new game.
          </li>
        </ol>
      </div>

      <div className="score-board">
        <span>Score: {score}</span>
        <span>Streak: {streak}</span>
        <span>Round: {roundNumber}/{TOTAL_ROUNDS}</span>
        <span>High Score: {highScore}</span>
        <button
          type="button"
          className="hotspot-reset-btn"
          onClick={handlePlayAgain}
        >
          Reset
        </button>
      </div>

      <div className="hotspot-options">
        {round.map((spot) => (
          <button
            key={spot.areaName}
            className="hotspot-option"
            onClick={() => handleSelect(spot)}
            disabled={!!selected}
          >
            {spot.areaName}
          </button>
        ))}
      </div>

      {selected && (
        <>
          <div style={{ marginTop: "20px" }}>
            Highest AQI: <strong>{selected.areaName}</strong> ({selected.aqi})
          </div>
          <button
            type="button"
            className="hotspot-next-btn"
            onClick={handleNextRound}
          >
            {roundNumber >= TOTAL_ROUNDS ? "See Results" : "Next Round"}
          </button>
        </>
      )}

      {gameOver && (
        <div className="hotspot-modal-overlay">
          <div className="hotspot-modal">
            <h3>Game Over!</h3>
            <p>Final Score: <strong>{score}</strong> / {TOTAL_ROUNDS}</p>
            <p>High Score: <strong>{highScore}</strong></p>
            <div className="hotspot-modal-actions">
              <button type="button" className="btn-primary" onClick={handlePlayAgain}>
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default HotspotScoutGame;
