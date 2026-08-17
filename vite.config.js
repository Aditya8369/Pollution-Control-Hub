import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

function httpCachingHeaders() {
  return {
    name: "http-caching-headers",
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = decodeURIComponent(req.url?.split("?")[0] || "/");

        if (pathname === "/" || pathname.includes("..")) {
          next();
          return;
        }

        const filePath = path.join(process.cwd(), "dist", pathname);

        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          next();
          return;
        }

        const content = fs.readFileSync(filePath);
        const etag = `"${crypto
          .createHash("sha1")
          .update(content)
          .digest("hex")}"`;

        res.setHeader("ETag", etag);
        res.setHeader("Cache-Control", "public, max-age=86400");

        if (req.headers["if-none-match"] === etag) {
          res.statusCode = 304;
          res.end();
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), httpCachingHeaders()],

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
    include: ["src/**/*.{test,spec}.{js,jsx}"],
    exclude: ["e2e/**", "node_modules/**"],
  },
});
