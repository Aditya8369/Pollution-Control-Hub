/**
 * Thermal Power Plant Fly Ash Utilization Dashboard Component
 */

import React, { useState } from 'react';
import {
  evaluateFlyAshUtilizationCompliance,
  calculatePondLeachateContaminationRisk,
  generateFlyAshDisposalDispatchPlan,
  FLY_ASH_GRADES,
} from '../services/flyAshManagementService';

export default function FlyAshManagementDashboard() {
  const [selectedPlant, setSelectedPlant] = useState({
    plantId: 'TPP-2026-502',
    plantName: 'Singrauli Thermal Power Station',
    dailyAshGenerationTons: 5200,
    currentUtilizationPercent: 74.2,
    ashPondCapacityTons: 600000,
    currentPondStorageTons: 495000,
    primaryAshGrade: FLY_ASH_GRADES.CLASS_F,
    distanceToCementPlantKm: 35.0,
    reportedAt: new Date().toISOString(),
  });

  const compliance = evaluateFlyAshUtilizationCompliance(selectedPlant);
  const pondRisk = calculatePondLeachateContaminationRisk(
    selectedPlant.currentPondStorageTons,
    selectedPlant.ashPondCapacityTons
  );
  const dispatchPlan = generateFlyAshDisposalDispatchPlan(selectedPlant);

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#F9FAFB' }}>
      <header style={{ marginBottom: '24px', borderBottom: '2px solid #E5E7EB', paddingBottom: '16px' }}>
        <h1 style={{ color: '#D97706', margin: 0 }}>🏭 Thermal Power Plant Fly Ash Utilization Command Center</h1>
        <p style={{ color: '#4B5563', marginTop: '6px' }}>
          CPCB 100% Fly Ash utilization mandate compliance tracking, ash dyke breach risk alerts, and logistics dispatch.
        </p>
      </header>

      {/* Summary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #D97706' }}>
          <span style={{ color: '#6B7280', fontSize: '0.85rem' }}>Utilization Rate</span>
          <h2 style={{ color: '#D97706', margin: '4px 0 0 0' }}>{selectedPlant.currentUtilizationPercent}%</h2>
          <small style={{ color: compliance.isFullyCompliant ? '#059669' : '#DC2626' }}>
            Deficit: {compliance.mandateDeficitPercent}% ({compliance.dailyDeficitTons.toLocaleString()} T/day)
          </small>
        </div>

        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #DC2626' }}>
          <span style={{ color: '#6B7280', fontSize: '0.85rem' }}>Ash Pond Storage</span>
          <h2 style={{ color: '#DC2626', margin: '4px 0 0 0' }}>{pondRisk.capacityUtilizationPercent}%</h2>
          <small style={{ color: '#6B7280' }}>Risk: {pondRisk.overflowRiskCategory}</small>
        </div>

        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #2563EB' }}>
          <span style={{ color: '#6B7280', fontSize: '0.85rem' }}>Daily Ash Generation</span>
          <h2 style={{ color: '#2563EB', margin: '4px 0 0 0' }}>{selectedPlant.dailyAshGenerationTons.toLocaleString()} Tons</h2>
          <small style={{ color: '#6B7280' }}>Grade: {selectedPlant.primaryAshGrade}</small>
        </div>

        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #059669' }}>
          <span style={{ color: '#6B7280', fontSize: '0.85rem' }}>Bulk Tankers Required</span>
          <h2 style={{ color: '#059669', margin: '4px 0 0 0' }}>{dispatchPlan.pneumaticBulkTankersDispatched} Tankers</h2>
          <small style={{ color: '#6B7280' }}>Capacity: 30 Tons/Tanker</small>
        </div>
      </div>

      {/* Off-take Allocation & Action Plan */}
      <div style={{ background: '#FFF', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#111827' }}>🚛 Multi-Sector Fly Ash Allocation & Off-Take Plan</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h4 style={{ color: '#2563EB', marginBottom: '8px' }}>🏗️ Target Sector Distribution</h4>
            <ul>
              <li><strong>Cement Industry (50%):</strong> {dispatchPlan.cementIndustryOffTakeTons.toLocaleString()} Tons/day</li>
              <li><strong>NHAI Highways (30%):</strong> {dispatchPlan.highwayEmbankmentOffTakeTons.toLocaleString()} Tons/day</li>
              <li><strong>Fly-Ash Bricks (20%):</strong> {dispatchPlan.brickManufacturingOffTakeTons.toLocaleString()} Tons/day</li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#D97706', marginBottom: '8px' }}>📜 Regulatory Compliance Directives</h4>
            <ol>
              {dispatchPlan.recommendedActions.map((action, idx) => (
                <li key={idx} style={{ marginBottom: '6px' }}>{action}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
