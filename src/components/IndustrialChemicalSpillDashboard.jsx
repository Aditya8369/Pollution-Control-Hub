/**
 * Industrial Chemical Spill Emergency Response Dashboard Component
 * Provides live telemetry monitoring, airborne plume evacuation radius maps, and multi-agency dispatch workflows.
 */

import React, { useState } from 'react';
import {
  evaluateSpillSeverity,
  calculateEvacuationRadiusKm,
  generateEmergencyDispatchPlan,
  SPILL_HAZARD_CLASSES,
} from '../services/industrialChemicalSpillService';

export default function IndustrialChemicalSpillDashboard() {
  const [selectedIncident, setSelectedIncident] = useState({
    incidentId: 'SPILL-2026-881',
    facilityName: 'Surat Industrial Chemical Zone',
    chemicalName: 'Sulfuric Acid (Concentrated 98%)',
    hazardClass: SPILL_HAZARD_CLASSES.CORROSIVE_ACID,
    quantityGallons: 1800,
    windSpeedKph: 14.0,
    airTemperatureC: 30.0,
    proximityToWaterBodyKm: 0.6,
    reportedAt: new Date().toISOString(),
  });

  const severity = evaluateSpillSeverity(selectedIncident);
  const evacuationRadius = calculateEvacuationRadiusKm(
    selectedIncident.hazardClass,
    selectedIncident.quantityGallons,
    selectedIncident.windSpeedKph
  );
  const dispatchPlan = generateEmergencyDispatchPlan(selectedIncident);

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#F8F9FA' }}>
      <header style={{ marginBottom: '24px', borderBottom: '2px solid #E9ECEF', paddingBottom: '16px' }}>
        <h1 style={{ color: '#D32F2F', margin: 0 }}>🚨 Industrial Chemical Spill Emergency Response Command</h1>
        <p style={{ color: '#6C757D', marginTop: '6px' }}>
          Real-time hazardous chemical leak surveillance, airborne plume dispersion modeling, and automated dispatch protocols.
        </p>
      </header>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #D32F2F' }}>
          <span style={{ color: '#6C757D', fontSize: '0.85rem' }}>Severity Level</span>
          <h2 style={{ color: '#D32F2F', margin: '4px 0 0 0' }}>{severity.level}</h2>
          <small style={{ color: '#6C757D' }}>Score: {severity.severityScore} / 100</small>
        </div>

        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #E65100' }}>
          <span style={{ color: '#6C757D', fontSize: '0.85rem' }}>Evacuation Radius</span>
          <h2 style={{ color: '#E65100', margin: '4px 0 0 0' }}>{evacuationRadius} km</h2>
          <small style={{ color: '#6C757D' }}>Wind Speed: {selectedIncident.windSpeedKph} km/h</small>
        </div>

        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #0288D1' }}>
          <span style={{ color: '#6C757D', fontSize: '0.85rem' }}>Spill Volume</span>
          <h2 style={{ color: '#0288D1', margin: '4px 0 0 0' }}>{selectedIncident.quantityGallons.toLocaleString()} Gal</h2>
          <small style={{ color: '#6C757D' }}>Chemical: {selectedIncident.chemicalName}</small>
        </div>

        <div style={{ background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #388E3C' }}>
          <span style={{ color: '#6C757D', fontSize: '0.85rem' }}>Water Body Risk</span>
          <h2 style={{ color: severity.waterContaminationRisk ? '#D32F2F' : '#388E3C', margin: '4px 0 0 0' }}>
            {severity.waterContaminationRisk ? '⚠️ High Risk' : '✅ Low Risk'}
          </h2>
          <small style={{ color: '#6C757D' }}>Proximity: {selectedIncident.proximityToWaterBodyKm} km</small>
        </div>
      </div>

      {/* Emergency Dispatch Plan Details */}
      <div style={{ background: '#FFF', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#212529' }}>📋 Multi-Agency Emergency Dispatch Protocol</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h4 style={{ color: '#D32F2F', marginBottom: '8px' }}>🚒 Authorized Dispatch Units</h4>
            <ul>
              {dispatchPlan.dispatchUnits.map((unit, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>{unit}</li>
              ))}
            </ul>

            <h4 style={{ color: '#E65100', marginTop: '16px', marginBottom: '8px' }}>🛡️ Required Protective Equipment (PPE)</h4>
            <ul>
              {dispatchPlan.protectiveEquipmentRequired.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#0288D1', marginBottom: '8px' }}>🚧 Containment & Isolation Protocol</h4>
            <ol>
              {dispatchPlan.containmentSteps.map((step, idx) => (
                <li key={idx} style={{ marginBottom: '6px' }}>{step}</li>
              ))}
            </ol>

            <h4 style={{ color: '#388E3C', marginTop: '16px', marginBottom: '8px' }}>📢 Regulatory Bodies Notified</h4>
            <ul>
              {dispatchPlan.regulatoryNotificationRequired.map((reg, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>{reg}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
