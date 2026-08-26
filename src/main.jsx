import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./i18n";
import App from "./App";
import "./styles.css";
import "leaflet/dist/leaflet.css";
import "leaflet/dist/leaflet.css";
import { scheduleDataPurge } from "./utils/dataPurge";

// The returned update function is not used: onNeedRefresh only logs, and nothing
// offers the visitor a "reload to update" control yet.
registerSW({
  onNeedRefresh() {
    console.log("[PWA] New content available — reload to update.");
  },
  onOfflineReady() {
    console.log("[PWA] App is ready to work offline.");
  },
  onRegistered(r) {
    if (r) {
      console.log("[PWA] Service Worker registered:", r.scope);
    }
  },
  onRegisterError(error) {
    console.error("[PWA] Service Worker registration failed:", error);
  },
});

scheduleDataPurge();

if (import.meta.env.DEV) {
  const axe = await import("@axe-core/react");
  axe.default(React, ReactDOM, 1000);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[Service Worker] Registered successfully with scope:', registration.scope);
      })
      .catch((error) => {
        console.error('[Service Worker] Registration failed:', error);
      });
  });
}
