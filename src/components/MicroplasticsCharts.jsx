/**
 * Enterprise Architectural Specification:
 * Module: Ocean & Coastal Microplastics Visual Charts Tier
 * File: src/components/MicroplasticsCharts.jsx
 * Domain: Recharts Visualizations, Hourly Microplastic Drift Trends & Station Compliance
 */

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

export function HourlyMicroplasticsChart({ data }) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fontSize: 12 }} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} domain={[0, 1500]} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          <Line type="monotone" dataKey="avgParticlesPerM3" name="Particle Density (Particles/m³)" stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="totalTonsDrift" name="Estimated Drift Tonnage" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StationMicroplasticsChart({ data }) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="stationName" stroke="#94a3b8" tick={{ fontSize: 9 }} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} domain={[0, 1500]} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          <Bar dataKey="avgParticlesPerM3" name="Avg Particles/m³" fill="#14b8a6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="criticalAlertCount" name="NOAA Critical Violations" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SourceParticleSizeChart({ data }) {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis type="number" domain={[0, 2500]} stroke="#94a3b8" tick={{ fontSize: 12 }} />
          <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fontSize: 10 }} width={120} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
          />
          <Legend />
          <Bar dataKey="avgParticlesPerM3" name="Particle Concentration (/m³)" fill="#14b8a6" radius={[0, 4, 4, 0]} />
          <Bar dataKey="avgSizeMicrons" name="Average Size (Microns)" fill="#06b6d4" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
