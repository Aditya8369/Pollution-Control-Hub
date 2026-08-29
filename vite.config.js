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
  server: {
    https: false,
  },
  preview: {
    https: false,
  },
  build: {
    rollupOptions: {
      output: {
        // Everything that is not lazy-loaded landed in one entry chunk, and that
        // chunk had grown to 2.11 MB — past Workbox's 2 MiB precache ceiling, which
        // fails `vite build` outright rather than warning. Raising
        // `maximumFileSizeToCacheInBytes` would silence the message and leave the
        // real problem: one 2 MB file the browser re-downloads in full every time
        // any line of app code changes.
        //
        // Splitting on the libraries instead means a normal app change invalidates
        // only the app chunk, and every chunk stays under the limit so the service
        // worker can precache all of them.
        //
        // Matched on the module path rather than declared as `{ name: [pkg] }`.
        // The array form only names a package's entry module, so react-dom's real
        // payload — `react-dom/cjs/react-dom.production.min.js`, reached through a
        // re-export — is a different module and lands somewhere else. Matching the
        // path catches a package and everything under it.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          // Grouped by what changes together, not one chunk per package. A chunk
          // per package costs a request each and buys nothing, since these always
          // ship as a set.
          const groups = {
            "vendor-react": ["/react/", "/react-dom/", "/scheduler/"],
            "vendor-charts": ["/recharts/", "/d3-", "/victory-vendor/"],
            "vendor-maps": ["/leaflet/", "/react-leaflet/", "/@react-leaflet/"],
            "vendor-export": ["/jspdf/", "/html2canvas/", "/canvg/", "/dompurify/"],
            "vendor-i18n": ["/i18next/", "/react-i18next/", "/i18next-browser-languagedetector/"],
          };

          const normalised = id.replace(/\\/g, "/");
          for (const [chunk, prefixes] of Object.entries(groups)) {
            if (prefixes.some((p) => normalised.includes(`node_modules${p}`))) {
              return chunk;
            }
          }
          return undefined;
        },
      },
    },
  },
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
