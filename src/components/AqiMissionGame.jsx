import { useEffect, useState } from 'react';
import {
  Gamepad2,
  Target,
  Footprints,
  Timer,
  Building2,
  Map,
  Rocket,
  Lightbulb,
  Check,
  X,
  AlertTriangle,
  BarChart3,
  PartyPopper,
  CloudFog,
  RotateCcw,
  ClipboardList
} from 'lucide-react';
import { ACTIONS, MISSIONS } from './aqiGameData';
import { estimateAQI, getAQIBand } from '../services/airQualityService';

export default function AqiMissionGame({ current }) {
  const [gameState, setGameState] = useState('idle'); // 'idle' | 'playing' | 'completed'
  const [selectedMission, setSelectedMission] = useState(MISSIONS[0]);
  const [playMode, setPlayMode] = useState('simulated'); // 'simulated' | 'live'
  
  // Game states
  const [currentPollutants, setCurrentPollutants] = useState(null);
  const [startingAqi, setStartingAqi] = useState(0);
  const [deployedActions, setDeployedActions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isScaled, setIsScaled] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [finalStats, setFinalStats] = useState(null);

  // Initialize mission starting data
  const initializeMission = () => {
    let startPollutants = {};
    let scaled = false;
    let factor = 1;

    if (playMode === 'live' && current) {
      // Use live data from current city
      if (current.us_aqi < 120) {
        // Scale up to make game playable/challenging (target starting AQI ~ 160)
        factor = parseFloat((160 / Math.max(10, current.us_aqi)).toFixed(2));
        scaled = true;
      }
      startPollutants = {
        pm2_5: Math.round(current.pm2_5 * factor),
        pm10: Math.round(current.pm10 * factor),
        nitrogen_dioxide: Math.round(current.nitrogen_dioxide * factor),
        ozone: Math.round(current.ozone * factor),
        carbon_monoxide: Math.round(current.carbon_monoxide * factor),
      };
    } else {
      // Use mission preset
      startPollutants = { ...selectedMission.simulatedCurrent };
    }

    const calculatedStartAqi = estimateAQI(
      startPollutants.pm2_5,
      startPollutants.pm10,
      startPollutants.nitrogen_dioxide,
      startPollutants.ozone,
      startPollutants.carbon_monoxide
    );

    startPollutants.us_aqi = calculatedStartAqi;

    setCurrentPollutants(startPollutants);
    setStartingAqi(calculatedStartAqi);
    setIsScaled(scaled);
    setScaleFactor(factor);
    setDeployedActions([]);
    setTimeLeft(selectedMission.timerDuration);
  };

  // Start the mission
  const handleStartMission = () => {
    initializeMission();
    setGameState('playing');
  };

  // Countdown timer effect
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          evaluateMission(true); // End mission on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, currentPollutants, deployedActions]);

  // Toggle deployment of a policy/action
  const handleToggleAction = (actionId) => {
    if (gameState !== 'playing') return;

    setDeployedActions((prev) => {
      if (prev.includes(actionId)) {
        return prev.filter((id) => id !== actionId);
      }
      
      // Enforce step/action limit
      if (prev.length >= selectedMission.allowedSteps) {
        return prev; // Cannot add more than allowed
      }
      return [...prev, actionId];
    });
  };

  // Calculate live results based on selected actions
  const getSimulatedResults = () => {
    if (!currentPollutants) return { pollutants: {}, aqi: 0, improvement: 0 };

    let pm2_5 = currentPollutants.pm2_5;
    let pm10 = currentPollutants.pm10;
    let nitrogen_dioxide = currentPollutants.nitrogen_dioxide;
    let ozone = currentPollutants.ozone;
    let carbon_monoxide = currentPollutants.carbon_monoxide;

    deployedActions.forEach((actionId) => {
      const action = ACTIONS.find((a) => a.id === actionId);
      if (!action) return;
      if (action.reductions.pm2_5) pm2_5 *= (1 - action.reductions.pm2_5 / 100);
      if (action.reductions.pm10) pm10 *= (1 - action.reductions.pm10 / 100);
      if (action.reductions.nitrogen_dioxide) nitrogen_dioxide *= (1 - action.reductions.nitrogen_dioxide / 100);
      if (action.reductions.ozone) ozone *= (1 - action.reductions.ozone / 100);
      if (action.reductions.carbon_monoxide) carbon_monoxide *= (1 - action.reductions.carbon_monoxide / 100);
    });

    const finalPm25 = Math.round(pm2_5);
    const finalPm10 = Math.round(pm10);
    const finalNo2 = Math.round(nitrogen_dioxide);
    const finalO3 = Math.round(ozone);
    const finalCO = Math.round(carbon_monoxide);

    const finalAqi = estimateAQI(finalPm25, finalPm10, finalNo2, finalO3, finalCO);
    
    const improvement = startingAqi > 0 
      ? Math.round(((startingAqi - finalAqi) / startingAqi) * 100) 
      : 0;

    return {
      pollutants: {
        pm2_5: finalPm25,
        pm10: finalPm10,
        nitrogen_dioxide: finalNo2,
        ozone: finalO3,
        carbon_monoxide: finalCO,
      },
      aqi: finalAqi,
      improvement,
    };
  };

  const currentSimResults = getSimulatedResults();
  const stepsRemaining = selectedMission.allowedSteps - deployedActions.length;
  const isTargetAchieved = currentSimResults.improvement >= selectedMission.targetImprovement;

  // Complete and evaluate the mission
  const evaluateMission = (isTimeout = false) => {
    const results = getSimulatedResults();
    const success = results.improvement >= selectedMission.targetImprovement;

    setFinalStats({
      success,
      improvement: results.improvement,
      finalAqi: results.aqi,
      startingAqi,
      isTimeout,
      deployedActions: [...deployedActions]
    });
    setGameState('completed');
  };

  return (
    <section className="panel game-section" aria-labelledby="game-heading">
      <div className="panel-head">
        <h2 id="game-heading"><Gamepad2 className="inline-icon" size={22} aria-hidden="true" /> AQI Mission Control</h2>
        <p>Take charge as City Commissioner. Deploy clean-air policies within steps and time limits to beat the smog!</p>
      </div>

      {/* ─── IDLE / INTRO STATE ─── */}
      {gameState === 'idle' && (
        <div className="game-intro-layout">
          <div className="intro-card-primary">
            <h3>Choose Your Mission</h3>
            <div className="mission-grid">
              {MISSIONS.map((mission) => {
                const MissionIcon = mission.icon;
                return (
                  <button
                    key={mission.id}
                    type="button"
                    className={`mission-select-card ${selectedMission.id === mission.id ? 'active' : ''}`}
                    onClick={() => setSelectedMission(mission)}
                  >
                    <span className="mission-icon-lg"><MissionIcon size={36} aria-hidden="true" /></span>
                    <div className="mission-select-info">
                      <div className="mission-title-row">
                        <span className="mission-name">{mission.name}</span>
                        <span className={`difficulty-badge ${mission.difficulty.toLowerCase()}`}>
                          {mission.difficulty}
                        </span>
                      </div>
                      <p className="mission-desc">{mission.description}</p>
                      <div className="mission-meta-row">
                        <span><Target className="inline-icon" size={14} aria-hidden="true" /> Target: <strong>−{mission.targetImprovement}% AQI</strong></span>
                        <span><Footprints className="inline-icon" size={14} aria-hidden="true" /> Limit: <strong>{mission.allowedSteps} Policies</strong></span>
                        <span><Timer className="inline-icon" size={14} aria-hidden="true" /> Time: <strong>{mission.timerDuration}s</strong></span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mode-toggle-section">
              <h4>Play Mode Baseline</h4>
              <div className="mode-toggle-buttons">
                <button
                  type="button"
                  className={`mode-btn ${playMode === 'simulated' ? 'active' : ''}`}
                  onClick={() => setPlayMode('simulated')}
                >
                  <Building2 className="inline-icon" size={16} aria-hidden="true" /> Simulated Preset Data
                </button>
                <button
                  type="button"
                  className={`mode-btn ${playMode === 'live' ? 'active' : ''}`}
                  onClick={() => setPlayMode('live')}
                  disabled={!current}
                >
                  <Map className="inline-icon" size={16} aria-hidden="true" /> Live City Data ({current?.us_aqi ? `AQI ${current.us_aqi}` : 'Offline'})
                </button>
              </div>
              <p className="mode-description-hint">
                {playMode === 'simulated'
                  ? 'Play using pre-configured crisis scenarios. Highly balanced for all difficulties.'
                  : `Play using live pollution data from your selected city. If air is clean, a smog inversion is simulated!`}
              </p>
            </div>

            <button type="button" className="btn-primary start-mission-btn" onClick={handleStartMission}>
              <Rocket className="inline-icon" size={18} aria-hidden="true" /> Launch Mission
            </button>
          </div>

          <div className="intro-sidebar">
            <div className="rules-card">
              <h3>How to Play</h3>
              <ol className="rules-list">
                <li>
                  <strong>Choose policy mix:</strong> Click cards to deploy clean-air policies.
                </li>
                <li>
                  <strong>Respect your limits:</strong> You have a maximum number of policies (steps) you can deploy.
                </li>
                <li>
                  <strong>Watch the clock:</strong> Evaluate your choices before the timer hits 0.
                </li>
                <li>
                  <strong>Win target:</strong> Reduce the starting AQI by the target percentage.
                </li>
              </ol>
              <div className="fun-tip-box">
                <Lightbulb className="inline-icon" size={16} aria-hidden="true" /> <em>Tip: Pay attention to which pollutants are highest. Choose policies that target those specific pollutants!</em>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PLAYING STATE ─── */}
      {gameState === 'playing' && currentPollutants && (
        <div className="game-playing-layout">
          {/* Header HUD info */}
          <div className="game-hud">
            <div className="hud-metric timer-box">
              <span className="hud-label">Time Remaining</span>
              <span className={`hud-val countdown ${timeLeft <= 10 ? 'critical' : ''}`}>
                <Timer className="inline-icon" size={16} aria-hidden="true" /> {timeLeft}s
              </span>
            </div>

            <div className="hud-metric steps-box">
              <span className="hud-label">Policies Allowed</span>
              <span className="hud-val">
                <Footprints className="inline-icon" size={16} aria-hidden="true" /> {stepsRemaining} / {selectedMission.allowedSteps} left
              </span>
            </div>

            <div className="hud-metric target-box">
              <span className="hud-label">Target Improvement</span>
              <span className="hud-val"><Target className="inline-icon" size={16} aria-hidden="true" /> −{selectedMission.targetImprovement}%</span>
            </div>

            <div className="hud-metric status-box">
              <span className="hud-label">Current Reduction</span>
              <span className={`hud-val ${isTargetAchieved ? 'success-text' : 'danger-text'}`}>
                {currentSimResults.improvement}% {isTargetAchieved ? <Check className="inline-icon" size={16} aria-hidden="true" /> : <X className="inline-icon" size={16} aria-hidden="true" />}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="game-progress-wrapper">
            <div className="progress-bar-container">
              <div
                className={`progress-bar ${isTargetAchieved ? 'target-met' : ''}`}
                style={{ width: `${Math.min(100, (currentSimResults.improvement / selectedMission.targetImprovement) * 100)}%` }}
              />
              <span className="progress-bar-label">
                {currentSimResults.improvement}% of {selectedMission.targetImprovement}% target reduced
              </span>
            </div>
          </div>

          {/* Warnings about scaling */}
          {playMode === 'live' && isScaled && (
            <div className="game-notice-banner">
              <AlertTriangle className="inline-icon" size={16} aria-hidden="true" /> Live city air is clean today. Simulated winter smog inversion active (Pollutants scaled up {scaleFactor}x).
            </div>
          )}

          {/* Main workspace */}
          <div className="game-workspace">
            {/* Left: Available actions list */}
            <div className="actions-section">
              <h3>Available Environmental Policies</h3>
              <div className="actions-grid">
                {ACTIONS.map((action) => {
                  const isDeployed = deployedActions.includes(action.id);
                  const isDisabled = !isDeployed && stepsRemaining === 0;
                  const PolicyIcon = action.icon;

                  return (
                    <button
                      key={action.id}
                      type="button"
                      className={`policy-card ${isDeployed ? 'deployed' : ''}`}
                      disabled={isDisabled}
                      onClick={() => handleToggleAction(action.id)}
                    >
                      <div className="policy-header">
                        <span className="policy-icon"><PolicyIcon size={22} aria-hidden="true" /></span>
                        <span className="policy-name">{action.name}</span>
                      </div>
                      <p className="policy-desc">{action.description}</p>
                      <div className="policy-reductions-taglist">
                        {Object.entries(action.reductions).map(([pollutant, val]) => (
                          <span key={pollutant} className="reduction-tag">
                            {pollutant === 'pm2_5' && 'PM2.5'}
                            {pollutant === 'pm10' && 'PM10'}
                            {pollutant === 'nitrogen_dioxide' && 'NO₂'}
                            {pollutant === 'ozone' && 'O₃'}
                            {pollutant === 'carbon_monoxide' && 'CO'}
                            {` −${val}%`}
                          </span>
                        ))}
                      </div>
                      {isDeployed && <span className="policy-deployed-stamp">ACTIVE</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Simulation dashboard */}
            <div className="dashboard-section">
              <h3>Simulation Screen</h3>
              
              <div className="sim-aqi-comparison">
                <div className="sim-aqi-card baseline">
                  <span className="aqi-label">Baseline AQI</span>
                  <span className="aqi-val" style={{ color: getAQIBand(startingAqi).color }}>
                    {startingAqi}
                  </span>
                  <span className="aqi-band" style={{ color: getAQIBand(startingAqi).color }}>
                    {getAQIBand(startingAqi).label}
                  </span>
                </div>

                <div className="sim-aqi-arrow">
                  <span>→</span>
                  <span className="arrow-reduction-percentage">
                    −{currentSimResults.improvement}%
                  </span>
                </div>

                <div className="sim-aqi-card projected">
                  <span className="aqi-label">Projected AQI</span>
                  <span className="aqi-val" style={{ color: getAQIBand(currentSimResults.aqi).color }}>
                    {currentSimResults.aqi}
                  </span>
                  <span className="aqi-band" style={{ color: getAQIBand(currentSimResults.aqi).color }}>
                    {getAQIBand(currentSimResults.aqi).label}
                  </span>
                </div>
              </div>

              {/* Pollutant table breakdown */}
              <div className="pollutants-breakdown-card">
                <h4>Target Pollutant Concentrations</h4>
                <table className="game-table">
                  <thead>
                    <tr>
                      <th>Pollutant</th>
                      <th>Starting</th>
                      <th></th>
                      <th>Projected</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="game-row">
                      <td>PM2.5</td>
                      <td>{currentPollutants.pm2_5} <small>µg/m³</small></td>
                      <td>→</td>
                      <td className={currentSimResults.pollutants.pm2_5 < currentPollutants.pm2_5 ? 'better' : ''}>
                        {currentSimResults.pollutants.pm2_5} <small>µg/m³</small>
                      </td>
                    </tr>
                    <tr className="game-row">
                      <td>PM10</td>
                      <td>{currentPollutants.pm10} <small>µg/m³</small></td>
                      <td>→</td>
                      <td className={currentSimResults.pollutants.pm10 < currentPollutants.pm10 ? 'better' : ''}>
                        {currentSimResults.pollutants.pm10} <small>µg/m³</small>
                      </td>
                    </tr>
                    <tr className="game-row">
                      <td>NO₂</td>
                      <td>{currentPollutants.nitrogen_dioxide} <small>µg/m³</small></td>
                      <td>→</td>
                      <td className={currentSimResults.pollutants.nitrogen_dioxide < currentPollutants.nitrogen_dioxide ? 'better' : ''}>
                        {currentSimResults.pollutants.nitrogen_dioxide} <small>µg/m³</small>
                      </td>
                    </tr>
                    <tr className="game-row">
                      <td>Ozone</td>
                      <td>{currentPollutants.ozone} <small>µg/m³</small></td>
                      <td>→</td>
                      <td className={currentSimResults.pollutants.ozone < currentPollutants.ozone ? 'better' : ''}>
                        {currentSimResults.pollutants.ozone} <small>µg/m³</small>
                      </td>
                    </tr>
                    <tr className="game-row">
                      <td>CO</td>
                      <td>{currentPollutants.carbon_monoxide} <small>ppb</small></td>
                      <td>→</td>
                      <td className={currentSimResults.pollutants.carbon_monoxide < currentPollutants.carbon_monoxide ? 'better' : ''}>
                        {currentSimResults.pollutants.carbon_monoxide} <small>ppb</small>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Submit panel */}
              <div className="submit-panel-card">
                <button
                  type="button"
                  className="btn-success submit-plan-btn"
                  onClick={() => evaluateMission(false)}
                >
                  <BarChart3 className="inline-icon" size={16} aria-hidden="true" /> Finalize Policy Plan
                </button>
                <button
                  type="button"
                  className="btn-link abort-btn"
                  onClick={() => setGameState('idle')}
                >
                  Quit Mission
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── COMPLETED STATE ─── */}
      {gameState === 'completed' && finalStats && (
        <div className="game-completed-layout">
          <div className={`results-banner ${finalStats.success ? 'success' : 'failure'}`}>
            <span className="results-emoji">
              {finalStats.success
                ? <PartyPopper size={56} aria-hidden="true" />
                : <CloudFog size={56} aria-hidden="true" />}
            </span>
            <h2>{finalStats.success ? 'Mission Accomplished!' : 'Mission Failed'}</h2>
            <p className="results-subheading">
              {finalStats.success
                ? `Sensational leadership! You successfully reduced the air pollution by ${finalStats.improvement}% (Target: −${selectedMission.targetImprovement}%).`
                : finalStats.isTimeout
                ? `Time ran out! You couldn't implement policies fast enough. The smog remains thick.`
                : `The policies deployed were insufficient. You reduced air pollution by ${finalStats.improvement}%, failing to meet the −${selectedMission.targetImprovement}% target.`}
            </p>
          </div>

          <div className="results-comparison-grid">
            <div className="results-card-metric">
              <span className="results-label">Starting AQI</span>
              <span className="results-value" style={{ color: getAQIBand(finalStats.startingAqi).color }}>
                {finalStats.startingAqi}
              </span>
              <span className="results-band" style={{ color: getAQIBand(finalStats.startingAqi).color }}>
                {getAQIBand(finalStats.startingAqi).label}
              </span>
            </div>

            <div className="results-card-metric-arrow">
              <span>→</span>
              <span className="final-reduction">−{finalStats.improvement}%</span>
            </div>

            <div className="results-card-metric">
              <span className="results-label">Final AQI</span>
              <span className="results-value" style={{ color: getAQIBand(finalStats.finalAqi).color }}>
                {finalStats.finalAqi}
              </span>
              <span className="results-band" style={{ color: getAQIBand(finalStats.finalAqi).color }}>
                {getAQIBand(finalStats.finalAqi).label}
              </span>
            </div>
          </div>

          <div className="results-debriefing">
            <h3>Debriefing & Deployed Policies</h3>
            {finalStats.deployedActions.length === 0 ? (
              <p className="no-policies">No policies were deployed during this mission.</p>
            ) : (
              <div className="deployed-policies-list">
                {finalStats.deployedActions.map((actionId) => {
                  const action = ACTIONS.find((a) => a.id === actionId);
                  if (!action) return null;
                  const PolicyIcon = action.icon;
                  return (
                    <div key={actionId} className="deployed-policy-item">
                      <span className="policy-item-icon"><PolicyIcon size={28} aria-hidden="true" /></span>
                      <div className="policy-item-info">
                        <h4>{action.name}</h4>
                        <p>{action.description}</p>
                      </div>
                      <div className="policy-item-reductions">
                        {Object.entries(action.reductions).map(([pollutant, val]) => (
                          <span key={pollutant} className="reduct-badge">
                            {pollutant === 'pm2_5' && 'PM2.5'}
                            {pollutant === 'pm10' && 'PM10'}
                            {pollutant === 'nitrogen_dioxide' && 'NO₂'}
                            {pollutant === 'ozone' && 'O₃'}
                            {pollutant === 'carbon_monoxide' && 'CO'}
                            {` −${val}%`}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="results-actions">
            <button type="button" className="btn-primary" onClick={handleStartMission}>
              <RotateCcw className="inline-icon" size={16} aria-hidden="true" /> Try Again
            </button>
            <button type="button" className="btn-secondary" onClick={() => setGameState('idle')}>
              <ClipboardList className="inline-icon" size={16} aria-hidden="true" /> Choose Another Mission
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
