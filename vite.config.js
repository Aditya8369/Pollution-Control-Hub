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
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
    include: ["src/**/*.{test,spec}.{js,jsx}"],
    exclude: ["e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      // `text` for the CI log, `html` to browse locally, `lcov` so an external
      // coverage service can pick a run up later without a config change.
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      // Report on every source file, not only the ones some test happened to
      // import. Without this a module with no test at all is simply absent from
      // the report, which reads as full coverage rather than none.
      all: true,
      include: ["src/**/*.{js,jsx,ts}"],
      exclude: [
        "src/**/*.{test,spec}.{js,jsx}",
        "src/setupTests.js",
        "src/mocks/**",
        "src/tests/**",
        // Server-side deployables that happen to live under src/. They import
        // bullmq and axios, neither of which is a dependency of this package, so
        // they are unreachable from a browser test run and would only ever
        // report 0% — noise that makes the real number harder to read.
        "src/workers/**",
        "src/controllers/**",
      ],
      // No thresholds, deliberately. A number that fails the build gets worked
      // around; a number a reviewer can open gets talked about. Thresholds are
      // worth adding once there is a baseline worth defending.
    },
  },
});
