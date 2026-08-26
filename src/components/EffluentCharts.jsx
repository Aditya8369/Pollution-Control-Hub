/**
 * Enterprise Architectural Specification:
 * Module: Industrial Wastewater Effluent Visual Charts Tier
 * File: src/components/EffluentCharts.jsx
 * Domain: Recharts Visualizations, BOD/COD Hourly Discharge Trends & Plant Compliance
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

export function HourlyEffluentChart({ data }) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fontSize: 12 }} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} domain={[0, 800]} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          <Line type="monotone" dataKey="avgBodMgL" name="Avg BOD (mg/L)" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="avgCodMgL" name="Avg COD (mg/L)" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PlantEffluentChart({ data }) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="plantName" stroke="#94a3b8" tick={{ fontSize: 9 }} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} domain={[0, 400]} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          <Bar dataKey="avgBod" name="Avg BOD mg/L" fill="#f97316" radius={[4, 4, 0, 0]} />
          <Bar dataKey="violationCount" name="CPCB Exceedance Count" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SourceBodCodChart({ data }) {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis type="number" domain={[0, 1000]} stroke="#94a3b8" tick={{ fontSize: 12 }} />
          <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fontSize: 10 }} width={120} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
          />
          <Legend />
          <Bar dataKey="avgBodMgL" name="BOD (5-Day mg/L)" fill="#f97316" radius={[0, 4, 4, 0]} />
          <Bar dataKey="avgCodMgL" name="COD (Chemical mg/L)" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
