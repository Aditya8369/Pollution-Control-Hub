import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import App from './App';
import './styles.css';
import 'leaflet/dist/leaflet.css';

// ── Development-only: axe-core/react accessibility overlay ──────────────────
// Logs violations to the browser console in real time during local development.
// Vite's tree-shaking ensures this is fully excluded from production bundles.
if (import.meta.env.DEV) {
  const axe = await import('@axe-core/react');
  axe.default(React, ReactDOM, 1000);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);