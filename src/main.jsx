import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./i18n";
import App from "./App";
import "./styles.css";
import "leaflet/dist/leaflet.css";

const updateSW = registerSW({
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

if (import.meta.env.DEV) {
  const axe = await import("@axe-core/react");
  axe.default(React, ReactDOM, 1000);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
