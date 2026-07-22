import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      // Forwards /api/* to the Express backend (see server/index.js) during
      // `npm run dev`, so the frontend can just call fetch('/api/...').
      "/api": {
        target: "http://localhost:5175",
        changeOrigin: true
      }
    }
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
    include: ["src/**/*.{test,spec}.{js,jsx}"],
    exclude: ["e2e/**", "node_modules/**"]
  }
});