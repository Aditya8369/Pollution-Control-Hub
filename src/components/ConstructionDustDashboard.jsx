/**
 * Urban Construction Dust Suppression Dashboard Component
 */

import React, { useState } from 'react';
import {
  evaluateConstructionSiteDustCompliance,
  calculateAntiSmogGunEfficiency,
  generateConstructionDustDispatchPlan,
  CONSTRUCTION_SITE_TYPES,
} from '../services/constructionDustService';

export default function ConstructionDustDashboard() {
  const [selectedSite, setSelectedSite] = useState({
    siteId: 'SITE-2026-881',
    siteName: 'Mumbai Coastal Road Extension',
    siteType: CONSTRUCTION_SITE_TYPES.HIGHWAY_FLYOVER,
    plotAreaSqMeters: 65000,
    pm25ConcentrationUgM3: 185.0,
    pm10ConcentrationUgM3: 420.0,
    activeAntiSmogGuns: 4,
    windSpeedKph: 14.0,
    reportedAt: new Date().toISOString(),
  });

  const compliance = evaluateConstructionSiteDustCompliance(selectedSite);
  const gunMetrics = calculateAntiSmogGunEfficiency(
    selectedSite.activeAntiSmogGuns,
    selectedSite.plotAreaSqMeters,
    selectedSite.windSpeedKph
  );
  const dispatchPlan = generateConstructionDustDispatchPlan(selectedSite);

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#F8FAFC' }}>
      <header style={{ marginBottom: '24px', borderBottom: '2px solid #E2E8F0', paddingBottom: '16px' }}>
        <h1 style={{ color: '#EA580C', margin: 0 }}>🏗️ Urban Construction Dust & Anti-Smog Gun Command Center</h1>
        <p style={{ color: '#64748B', marginTop: '6px' }}>
          Real-time PM2.5 / PM10 telemetry monitoring at construction sites, CPCB compliance enforcement, and anti-smog cannon logistics.
        </p>
      </header>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #EA580C' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem' }}>PM10 Ambient Telemetry</span>
          <h2 style={{ color: '#EA580C', margin: '4px 0 0 0' }}>{selectedSite.pm10ConcentrationUgM3} µg/m³</h2>
          <small style={{ color: compliance.isCompliant ? '#16A34A' : '#DC2626' }}>
            Exceedance: {compliance.pm10ExceedanceRatio}x CPCB limit (100 µg/m³)
          </small>
        </div>

        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #DC2626' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Compliance Status</span>
          <h2 style={{ color: '#DC2626', margin: '4px 0 0 0' }}>{compliance.status}</h2>
          <small style={{ color: '#64748B' }}>
            Penalty: ₹{compliance.dailyPenaltyINR.toLocaleString()}/day
          </small>
        </div>

        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #0284C7' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Anti-Smog Gun Coverage</span>
          <h2 style={{ color: '#0284C7', margin: '4px 0 0 0' }}>{selectedSite.activeAntiSmogGuns} / {gunMetrics.requiredAntiSmogGunsCount} Guns</h2>
          <small style={{ color: '#64748B' }}>Efficiency: {gunMetrics.suppressionEfficiencyPercent}%</small>
        </div>

        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #16A34A' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Green Netting Required</span>
          <h2 style={{ color: '#16A34A', margin: '4px 0 0 0' }}>{dispatchPlan.greenNettingRequiredSqMeters.toLocaleString()} m²</h2>
          <small style={{ color: '#64748B' }}>Site Area: {selectedSite.plotAreaSqMeters.toLocaleString()} m²</small>
        </div>
      </div>

      {/* Mitigation Action Plan */}
      <div style={{ background: '#FFF', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#0F172A' }}>📋 CPCB Mandatory Dust Suppression Directives</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h4 style={{ color: '#EA580C', marginBottom: '8px' }}>🔫 Anti-Smog Cannon & Water Tanker Deployment</h4>
            <ul>
              <li><strong>Additional Guns Required:</strong> {dispatchPlan.additionalAntiSmogGunsRequired} Units</li>
              <li><strong>Water Sprinkling Tankers:</strong> {dispatchPlan.waterSprinklingTankersDispatched} Mobile Trucks</li>
              <li><strong>Water Consumption:</strong> {gunMetrics.waterConsumptionLitersPerHour.toLocaleString()} L/hour</li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#DC2626', marginBottom: '8px' }}>📜 Enforceable Site Directives</h4>
            <ol>
              {dispatchPlan.mitigationDirectives.map((dir, idx) => (
                <li key={idx} style={{ marginBottom: '6px' }}>{dir}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
