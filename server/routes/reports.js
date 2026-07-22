import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export const reportsRouter = Router();

const VOTE_THRESHOLD = 5;
const X_DAYS = 7;

function rowToReport(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    image: row.image || "",
    lat: row.lat,
    lon: row.lon,
    votes: row.votes,
    status: row.status,
    createdAt: row.created_at,
    verifiedAt: row.verified_at || "",
    moderationNotes: row.moderation_notes || "",
  };
}

// GET /api/community/reports — list every report, newest first.
reportsRouter.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM reports ORDER BY created_at DESC")
    .all();
  res.json(rows.map(rowToReport));
});

// POST /api/community/reports — create a report.
//
// Accepts a client-supplied id/createdAt/votes/status so that (a) the existing
// CommunityHub submission flow doesn't need to change its object shape, and
// (b) the one-time localStorage migration can safely re-POST the same report
// multiple times without duplicating it (INSERT OR IGNORE on the primary key).
reportsRouter.post("/", (req, res) => {
  const body = req.body || {};

  if (!body.title || !String(body.title).trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  if (!body.description || !String(body.description).trim()) {
    return res.status(400).json({ error: "description is required" });
  }

  const id = body.id || randomUUID();
  const createdAt = body.createdAt || new Date().toISOString();
  const lat = typeof body.lat === "number" ? body.lat : null;
  const lon = typeof body.lon === "number" ? body.lon : null;

  const result = db
    .prepare(
      `INSERT OR IGNORE INTO reports
        (id, title, description, image, lat, lon, votes, status, created_at, verified_at, moderation_notes)
       VALUES (@id, @title, @description, @image, @lat, @lon, @votes, @status, @createdAt, @verifiedAt, @moderationNotes)`
    )
    .run({
      id,
      title: String(body.title).trim(),
      description: String(body.description).trim(),
      image: body.image || "",
      lat,
      lon,
      votes: Number.isInteger(body.votes) ? body.votes : 0,
      status: body.status || "Pending",
      createdAt,
      verifiedAt: body.verifiedAt || null,
      moderationNotes: body.moderationNotes || null,
    });

  const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(id);

  // 201 for a genuinely new insert, 200 when it was already present (idempotent
  // migration replay) — same response body either way.
  res.status(result.changes > 0 ? 201 : 200).json(rowToReport(row));
});

// PATCH /api/community/reports/:id/vote — cast one upvote and recompute the
// community-verification status server-side (same threshold logic that used
// to live only in the browser).
reportsRouter.patch("/:id/vote", (req, res) => {
  const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "report not found" });

  const nextVotes = row.votes + 1;
  const ageInDays = (Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24);

  let status = row.status;
  let verifiedAt = row.verified_at;
  let moderationNotes = row.moderation_notes;

  if (nextVotes >= VOTE_THRESHOLD && ageInDays <= X_DAYS && row.status === "Pending") {
    status = "Verified (community)";
    verifiedAt = new Date().toISOString();
    moderationNotes = "Automatically verified via community consensus upvotes.";
  }

  db.prepare(
    `UPDATE reports SET votes = @votes, status = @status, verified_at = @verifiedAt, moderation_notes = @moderationNotes WHERE id = @id`
  ).run({ id: row.id, votes: nextVotes, status, verifiedAt, moderationNotes });

  const updated = db.prepare("SELECT * FROM reports WHERE id = ?").get(row.id);
  res.json(rowToReport(updated));
});

// PATCH /api/community/reports/:id/status — used for the "Mark addressed"
// transition (Verified -> Addressed).
reportsRouter.patch("/:id/status", (req, res) => {
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: "status is required" });

  const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "report not found" });

  if (status === "Addressed" && !row.status.startsWith("Verified")) {
    return res.status(409).json({ error: "only verified reports can be marked addressed" });
  }

  db.prepare("UPDATE reports SET status = @status WHERE id = @id").run({
    id: row.id,
    status,
  });

  const updated = db.prepare("SELECT * FROM reports WHERE id = ?").get(row.id);
  res.json(rowToReport(updated));
});

export default reportsRouter;
