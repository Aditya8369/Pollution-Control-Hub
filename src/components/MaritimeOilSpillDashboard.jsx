/**
 * Maritime Oil Spill & Coastal Vulnerability Dashboard Component
 */

import React, { useState } from 'react';
import {
  assessCoastalVulnerabilityIndex,
  calculateOilSlickDriftTrajectory,
  generateMaritimeResponsePlan,
  OIL_SPILL_TYPES,
} from '../services/maritimeOilSpillService';

export default function MaritimeOilSpillDashboard() {
  const [selectedIncident, setSelectedIncident] = useState({
    spillId: 'OIL-2026-771',
    vesselName: 'MT Gulf Trader',
    oilType: OIL_SPILL_TYPES.HEAVY_CRUDE,
    volumeBarrels: 12500,
    currentSpeedKnots: 2.2,
    windSpeedKnots: 16.5,
    windDirectionDegrees: 220,
    distanceToShoreKm: 9.5,
    coastalEcosystemType: 'Mangrove Sanctuary & Estuary',
  });

  const vulnerability = assessCoastalVulnerabilityIndex(selectedIncident);
  const trajectory = calculateOilSlickDriftTrajectory(
    selectedIncident.currentSpeedKnots,
    selectedIncident.windSpeedKnots,
    selectedIncident.windDirectionDegrees
  );
  const responsePlan = generateMaritimeResponsePlan(selectedIncident);

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#F0F4F8' }}>
      <header style={{ marginBottom: '24px', borderBottom: '2px solid #BEE3F8', paddingBottom: '16px' }}>
        <h1 style={{ color: '#0056B3', margin: 0 }}>🌊 Maritime Oil Spill & Coastal Vulnerability Command Center</h1>
        <p style={{ color: '#4A5568', marginTop: '6px' }}>
          Offshore oil slick trajectory drift modeling, Coastal Vulnerability Index (CVI), and containment skimmer dispatch.
        </p>
      </header>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #C53030' }}>
          <span style={{ color: '#718096', fontSize: '0.85rem' }}>Coastal Vulnerability (CVI)</span>
          <h2 style={{ color: '#C53030', margin: '4px 0 0 0' }}>{vulnerability.cviScore} / 100</h2>
          <small style={{ color: '#718096' }}>Risk: {vulnerability.riskCategory}</small>
        </div>

        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #DD6B20' }}>
          <span style={{ color: '#718096', fontSize: '0.85rem' }}>Estimated Landfall</span>
          <h2 style={{ color: '#DD6B20', margin: '4px 0 0 0' }}>{vulnerability.estimatedLandfallHours} Hours</h2>
          <small style={{ color: '#718096' }}>Shoreline Dist: {selectedIncident.distanceToShoreKm} km</small>
        </div>

        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #3182CE' }}>
          <span style={{ color: '#718096', fontSize: '0.85rem' }}>Spill Volume</span>
          <h2 style={{ color: '#3182CE', margin: '4px 0 0 0' }}>{selectedIncident.volumeBarrels.toLocaleString()} Barrels</h2>
          <small style={{ color: '#718096' }}>Vessel: {selectedIncident.vesselName}</small>
        </div>

        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #319795' }}>
          <span style={{ color: '#718096', fontSize: '0.85rem' }}>Drift Velocity</span>
          <h2 style={{ color: '#319795', margin: '4px 0 0 0' }}>{trajectory.driftSpeedKnots} Knots</h2>
          <small style={{ color: '#718096' }}>Bearing: {trajectory.driftBearingDegrees}°</small>
        </div>
      </div>

      {/* Containment Strategy */}
      <div style={{ background: '#FFF', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1A202C' }}>⚓ Maritime Response & Containment Plan</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h4 style={{ color: '#0056B3', marginBottom: '8px' }}>🛳️ Dispatched Offshore Assets</h4>
            <ul>
              <li><strong>Containment Booms:</strong> {responsePlan.containmentBoomsRequiredMeters.toLocaleString()} Meters</li>
              <li><strong>Skimmer Vessels:</strong> {responsePlan.skimmerVesselsDispatched} Heavy Drum Units</li>
              <li><strong>Chemical Dispersant:</strong> {responsePlan.dispersantVolumeLiters.toLocaleString()} Liters</li>
            </ul>

            <h4 style={{ color: '#2B6CB0', marginTop: '16px', marginBottom: '8px' }}>🏖️ Shoreline Protection Units</h4>
            <ul>
              {responsePlan.shorelineProtectionTeams.map((team, idx) => (
                <li key={idx}>{team}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#C53030', marginBottom: '8px' }}>🎯 Containment Strategy Steps</h4>
            <ol>
              {responsePlan.responseStrategy.map((step, idx) => (
                <li key={idx} style={{ marginBottom: '6px' }}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
