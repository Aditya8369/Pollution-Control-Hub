import express from "express";
import cors from "cors";
import { reportsRouter } from "./routes/reports.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" })); // photo evidence is base64, needs more than the 100kb default

  app.get("/api/health", (req, res) => res.json({ ok: true }));
  app.use("/api/community/reports", reportsRouter);

  return app;
}

export default createApp;
