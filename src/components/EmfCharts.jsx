/**
 * Enterprise Architectural Specification:
 * Module: Urban Ambient EMF Visual Charts Tier
 * File: src/components/EmfCharts.jsx
 * Domain: Recharts Visualizations, Hourly Power Density Trends & Frequency Spectra
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

export function HourlyEmfChart({ data }) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fontSize: 12 }} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} domain={[0, 15]} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          <Line type="monotone" dataKey="avgPowerDensityWm2" name="Avg Power Density (W/m²)" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="maxPeakWm2" name="Peak Power Density (W/m²)" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StationEmfChart({ data }) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="stationName" stroke="#94a3b8" tick={{ fontSize: 9 }} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} domain={[0, 15]} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          <Bar dataKey="avgPowerDensity" name="Avg W/m²" fill="#06b6d4" radius={[4, 4, 0, 0]} />
          <Bar dataKey="limitViolationCount" name="ICNIRP Limit Exceedance Count" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SourcePowerDensityChart({ data }) {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis type="number" domain={[0, 15]} stroke="#94a3b8" tick={{ fontSize: 12 }} />
          <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fontSize: 10 }} width={120} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
          />
          <Legend />
          <Bar dataKey="avgPowerDensityWm2" name="Power Density (W/m²)" fill="#06b6d4" radius={[0, 4, 4, 0]} />
          <Bar dataKey="magneticFieldUt" name="Magnetic Field (µT)" fill="#a855f7" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
