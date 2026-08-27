/**
 * Electronic Waste (E-Waste) Circular Recycling Dashboard Component
 */

import React, { useState } from 'react';
import {
  evaluateEprRecyclingCompliance,
  calculatePreciousMetalRecoveryYieldGram,
  generateEwasteCollectionDispatchPlan,
  EWASTE_CATEGORIES,
} from '../services/ewasteRecyclingService';

export default function EwasteRecyclingDashboard() {
  const [selectedProducer, setSelectedProducer] = useState({
    producerId: 'EPR-2026-441',
    companyName: 'Apex Electronics Mobility',
    annualSalesVolumeUnits: 220000,
    category: EWASTE_CATEGORIES.SMARTPHONES_TABLETS,
    collectedEwasteTons: 180.0,
    recycledEwasteTons: 165.0,
    targetEprRecyclingRatePercent: 85.0,
    reportedAt: new Date().toISOString(),
  });

  const compliance = evaluateEprRecyclingCompliance(selectedProducer);
  const metalYield = calculatePreciousMetalRecoveryYieldGram(
    selectedProducer.category,
    selectedProducer.recycledEwasteTons
  );
  const dispatchPlan = generateEwasteCollectionDispatchPlan(selectedProducer);

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#F4F6F8' }}>
      <header style={{ marginBottom: '24px', borderBottom: '2px solid #E2E8F0', paddingBottom: '16px' }}>
        <h1 style={{ color: '#0D9488', margin: 0 }}>♻️ E-Waste Circular Recycling & EPR Compliance Suite</h1>
        <p style={{ color: '#64748B', marginTop: '6px' }}>
          Urban mining precious metal recovery telemetry, CPCB Extended Producer Responsibility (EPR) target tracking, and authorized dismantler logistics.
        </p>
      </header>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #0D9488' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem' }}>EPR Recycling Rate</span>
          <h2 style={{ color: '#0D9488', margin: '4px 0 0 0' }}>{compliance.achievedRecyclingRatePercent}%</h2>
          <small style={{ color: compliance.isCompliant ? '#16A34A' : '#DC2626' }}>
            Status: {compliance.eprStatus}
          </small>
        </div>

        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #D97706' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Gold Recovery Yield</span>
          <h2 style={{ color: '#D97706', margin: '4px 0 0 0' }}>{metalYield.goldRecoveryGrams.toLocaleString()} Grams</h2>
          <small style={{ color: '#64748B' }}>Silver: {metalYield.silverRecoveryGrams.toLocaleString()} g</small>
        </div>

        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #2563EB' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Copper & Lithium</span>
          <h2 style={{ color: '#2563EB', margin: '4px 0 0 0' }}>{metalYield.copperRecoveryKg.toLocaleString()} kg Cu</h2>
          <small style={{ color: '#64748B' }}>Lithium: {metalYield.lithiumRecoveryKg.toLocaleString()} kg Li</small>
        </div>

        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #16A34A' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Recovered Material Value</span>
          <h2 style={{ color: '#16A34A', margin: '4px 0 0 0' }}>₹{metalYield.estimatedMetalValueINR.toLocaleString()}</h2>
          <small style={{ color: '#64748B' }}>Recycled: {selectedProducer.recycledEwasteTons} Tons</small>
        </div>
      </div>

      {/* Dismantling Directives & Supply Chain */}
      <div style={{ background: '#FFF', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1E293B' }}>🚚 Authorized Dismantler & Refurbisher Logistics</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h4 style={{ color: '#0D9488', marginBottom: '8px' }}>🏢 Certified Recycling Partners</h4>
            <ul>
              {dispatchPlan.authorizedRecyclers.map((rec, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>{rec}</li>
              ))}
            </ul>
            <p style={{ marginTop: '12px', fontSize: '0.9rem', color: '#475569' }}>
              <strong>Logistics Fleet Dispatched:</strong> {dispatchPlan.logisticsVehiclesDispatched} Covered Electric Cargo Vans
            </p>
          </div>

          <div>
            <h4 style={{ color: '#2563EB', marginBottom: '8px' }}>🛡️ Safe Hydrometallurgical Dismantling Protocols</h4>
            <ol>
              {dispatchPlan.safeDismantlingDirectives.map((dir, idx) => (
                <li key={idx} style={{ marginBottom: '6px' }}>{dir}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
