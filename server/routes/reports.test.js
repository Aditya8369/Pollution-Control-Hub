import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Point the db module at a fresh temp file per test run, before importing it,
// so tests never touch (or depend on) the real server/data/community.db.
const tmpDbPath = path.join(os.tmpdir(), `community-test-${Date.now()}-${Math.random()}.db`);
process.env.COMMUNITY_DB_PATH = tmpDbPath;

const { createApp } = await import("../app.js");
const { db } = await import("../db.js");

function resetDb() {
  db.exec("DELETE FROM reports");
}

describe("community reports API", () => {
  const app = createApp();

  beforeEach(() => {
    resetDb();
  });

  it("creates a report and returns it with a 201", async () => {
    const res = await request(app)
      .post("/api/community/reports")
      .send({ title: "Garbage burning", description: "Near the market", lat: 28.6, lon: 77.2 });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Garbage burning");
    expect(res.body.votes).toBe(0);
    expect(res.body.status).toBe("Pending");
  });

  it("rejects a report with no title", async () => {
    const res = await request(app)
      .post("/api/community/reports")
      .send({ description: "no title here" });
    expect(res.status).toBe(400);
  });

  it("lists created reports newest first", async () => {
    await request(app)
      .post("/api/community/reports")
      .send({ id: "r1", title: "First", description: "d", createdAt: "2026-07-01T00:00:00Z" });
    await request(app)
      .post("/api/community/reports")
      .send({ id: "r2", title: "Second", description: "d", createdAt: "2026-07-02T00:00:00Z" });

    const res = await request(app).get("/api/community/reports");
    expect(res.status).toBe(200);
    expect(res.body.map((r) => r.id)).toEqual(["r2", "r1"]);
  });

  it("is idempotent: re-POSTing the same id does not create a duplicate (migration replay)", async () => {
    const report = {
      id: "legacy-1",
      title: "Legacy report",
      description: "From before the backend existed",
      votes: 3,
      createdAt: "2026-06-01T00:00:00Z",
    };

    const first = await request(app).post("/api/community/reports").send(report);
    const second = await request(app).post("/api/community/reports").send(report);
    const third = await request(app).post("/api/community/reports").send(report);

    expect(first.status).toBe(201); // genuinely new
    expect(second.status).toBe(200); // already existed
    expect(third.status).toBe(200);

    const all = await request(app).get("/api/community/reports");
    expect(all.body).toHaveLength(1);
    expect(all.body[0].votes).toBe(3); // preserved from the original migrated payload
  });

  it("increments votes and auto-verifies once the threshold is crossed", async () => {
    const created = await request(app)
      .post("/api/community/reports")
      .send({ id: "vote-me", title: "T", description: "d", votes: 4, createdAt: new Date().toISOString() });
    expect(created.body.status).toBe("Pending");

    const voted = await request(app).patch("/api/community/reports/vote-me/vote");
    expect(voted.status).toBe(200);
    expect(voted.body.votes).toBe(5);
    expect(voted.body.status).toBe("Verified (community)");
    expect(voted.body.verifiedAt).not.toBe("");
  });

  it("does not auto-verify a report older than the verification window", async () => {
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await request(app)
      .post("/api/community/reports")
      .send({ id: "stale", title: "T", description: "d", votes: 4, createdAt: oldDate });

    const voted = await request(app).patch("/api/community/reports/stale/vote");
    expect(voted.body.votes).toBe(5);
    expect(voted.body.status).toBe("Pending");
  });

  it("404s when voting on a report that doesn't exist", async () => {
    const res = await request(app).patch("/api/community/reports/does-not-exist/vote");
    expect(res.status).toBe(404);
  });

  it("allows marking a verified report as addressed", async () => {
    await request(app).post("/api/community/reports").send({
      id: "verified-1",
      title: "T",
      description: "d",
      status: "Verified (community)",
      createdAt: new Date().toISOString(),
    });

    const res = await request(app)
      .patch("/api/community/reports/verified-1/status")
      .send({ status: "Addressed" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Addressed");
  });

  it("refuses to mark a pending (unverified) report as addressed", async () => {
    await request(app).post("/api/community/reports").send({
      id: "pending-1",
      title: "T",
      description: "d",
      createdAt: new Date().toISOString(),
    });

    const res = await request(app)
      .patch("/api/community/reports/pending-1/status")
      .send({ status: "Addressed" });

    expect(res.status).toBe(409);
  });
});
