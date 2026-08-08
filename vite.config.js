import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false,
      injectRegister: "auto",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // The main bundle is larger than workbox's 2 MiB default; raise the
        // precache limit so the service worker can cache it.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/air-quality-api\.open-meteo\.com\/.*$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "open-meteo-aq-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 6 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "open-meteo-forecast-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 6 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\/.*$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "nominatim-geocode-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    // es2022 supports top-level await, which @axe-core/react uses behind the
    // DEV-only dynamic import in main.jsx. Without this the production build
    // fails with "Top-level await is not available in the configured target".
    target: "es2022",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
    include: ["src/**/*.{test,spec}.{js,jsx}"],
    exclude: ["e2e/**", "node_modules/**"],
  },
});
