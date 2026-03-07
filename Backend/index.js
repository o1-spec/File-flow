import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import {
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { s3 } from "./src/s3.js";
import { enqueueUpload, imageQueue, pdfQueue, videoQueue } from "./src/queue.js";
import { dlqQueue } from "./src/dlq.js";
import { logger } from "./src/logger.js";
import Redis from "ioredis";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const redis = new Redis(process.env.REDIS_URL);

// ---- Auth middleware ----
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { userId, email }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ---- Admin middleware ----
// ADMIN_EMAILS is a comma-separated list of email addresses in .env.
// Any authenticated user whose email appears in that list is an admin.
// Example:  ADMIN_EMAILS=alice@example.com,bob@example.com
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

function requireAdmin(req, res, next) {
  // Must be called after requireAuth so req.user is populated
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (!ADMIN_EMAILS.has(req.user.email?.toLowerCase())) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// ---- Utils ----
const MAX_BYTES = 100 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "application/pdf",
  "video/mp4",
  "video/quicktime",
]);

// ---- Routes ----
app.get("/health", (req, res) => res.json({ ok: true }));

// ---------- AUTH ----------
app.post("/auth/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password || password.length < 6) {
    return res
      .status(400)
      .json({ error: "email and password(>=6 chars) are required" });
  }

  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await pool.query(
      `INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)`,
      [userId, email.toLowerCase(), passwordHash]
    );
  } catch {
    return res.status(409).json({ error: "Email already registered" });
  }

  res.json({ userId });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const result = await pool.query(
    `SELECT id, email, password_hash FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );

  if (result.rowCount === 0) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const user = result.rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);

  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const isAdmin = ADMIN_EMAILS.has(user.email.toLowerCase());

  const token = jwt.sign(
    { userId: user.id, email: user.email, isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({ token, isAdmin });
});

// ---------- UPLOADS ----------

// Start upload session: returns presigned PUT URL
app.post("/uploads/start", requireAuth, async (req, res) => {
  const { filename, mimeType, size } = req.body;

  if (!filename || !mimeType || typeof size !== "number") {
    return res
      .status(400)
      .json({ error: "filename, mimeType, size are required" });
  }

  if (size > MAX_BYTES) {
    return res.status(400).json({ error: "Max file size is 20MB" });
  }

  if (!ALLOWED_MIME.has(mimeType)) {
    return res.status(400).json({
      error: "Unsupported file type",
      allowed: Array.from(ALLOWED_MIME),
    });
  }

  const userId = req.user.userId;
  const uploadId = uuidv4();

  // deterministic-ish key (based on uploadId)
  const rawKey = `raw/${uploadId}/${filename}`;

  await pool.query(
    `INSERT INTO uploads (id, user_id, original_filename, mime_type, size_bytes, status, raw_key)
     VALUES ($1, $2, $3, $4, $5, 'CREATED', $6)`,
    [uploadId, userId, filename, mimeType, size, rawKey]
  );

  const cmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: rawKey,
    ContentType: mimeType,
  });

  const presignedUrl = await getSignedUrl(s3, cmd, { expiresIn: 600 });

  return res.json({
    uploadId,
    rawKey,
    presignedUrl,
    expiresInSeconds: 600,
  });
});

// Get upload status (owner-only)
app.get("/uploads/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `SELECT id, original_filename, mime_type, size_bytes, status, raw_key, processed_key,
            error_message, created_at, updated_at
     FROM uploads
     WHERE id = $1 AND user_id = $2`,
    [id, req.user.userId]
  );

  if (result.rowCount === 0) {
    // don't leak whether it exists
    return res.status(404).json({ error: "Upload not found" });
  }

  res.json(result.rows[0]);
});

// SSE status stream — client subscribes once and receives push events until terminal
// GET /uploads/:id/stream
// Auth via ?token=<jwt> because EventSource cannot set custom headers.
app.get("/uploads/:id/stream", async (req, res) => {
  // ── Auth via query param ──────────────────────────────────────────────────
  const token = req.query.token;
  if (!token) return res.status(401).json({ error: "token query param required" });

  let userId;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    userId = payload.userId;
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const { id } = req.params;

  // ── SSE headers ───────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
  res.flushHeaders();

  const TERMINAL = new Set(["PROCESSED", "FAILED"]);
  const INTERVAL_MS = 1500;

  function send(data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  // ── Poll Postgres and push changes ────────────────────────────────────────
  let lastStatus = null;
  let timer = null;

  async function tick() {
    try {
      const result = await pool.query(
        `SELECT id, original_filename, mime_type, size_bytes, status,
                raw_key, processed_key, error_message, created_at, updated_at
         FROM uploads
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (result.rowCount === 0) {
        send({ error: "Upload not found" });
        return cleanup();
      }

      const row = result.rows[0];

      // Only push when status actually changes (or on first tick)
      if (row.status !== lastStatus) {
        lastStatus = row.status;
        send({ upload: row });
      }

      if (TERMINAL.has(row.status)) {
        send({ done: true });
        return cleanup();
      }
    } catch (err) {
      logger.error("sse.tick_error", { uploadId: id, error: err.message });
      send({ error: "Internal error" });
      cleanup();
    }
  }

  function cleanup() {
    if (timer) { clearInterval(timer); timer = null; }
    res.end();
  }

  // Run first tick immediately, then on interval
  await tick();
  if (!res.writableEnded) {
    timer = setInterval(tick, INTERVAL_MS);
  }

  // Clean up when the client disconnects
  req.on("close", cleanup);
});

// Mark upload complete (owner-only): verifies object exists, marks UPLOADED, enqueues job
app.post("/uploads/complete", requireAuth, async (req, res) => {
  const { uploadId } = req.body;

  if (!uploadId) {
    return res.status(400).json({ error: "uploadId is required" });
  }

  const existing = await pool.query(
    `SELECT id, user_id, status, raw_key, mime_type, processed_key, error_message
     FROM uploads
     WHERE id = $1`,
    [uploadId]
  );

  if (existing.rowCount === 0) {
    return res.status(404).json({ error: "Upload not found" });
  }

  const record = existing.rows[0];

  // ownership check
  if (record.user_id !== req.user.userId) {
    // don't leak existence
    return res.status(404).json({ error: "Upload not found" });
  }

  // Idempotency: already moved forward
  if (record.status !== "CREATED") {
    return res.json({
      id: record.id,
      status: record.status,
      raw_key: record.raw_key,
      processed_key: record.processed_key,
      error_message: record.error_message,
    });
  }

  // Verify object exists in storage
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: record.raw_key,
      })
    );
  } catch {
    return res.status(400).json({
      error: "File not found in storage yet. Upload may not be complete.",
      rawKey: record.raw_key,
    });
  }

  // Transition CREATED -> UPLOADED
  const updated = await pool.query(
    `UPDATE uploads
     SET status = 'UPLOADED',
         updated_at = NOW()
     WHERE id = $1 AND status = 'CREATED'
     RETURNING id, status, raw_key, processed_key, error_message`,
    [uploadId]
  );

  // Enqueue if we transitioned
  if (updated.rowCount > 0) {
    await enqueueUpload({
      uploadId,
      rawKey: record.raw_key,
      mimeType: record.mime_type,
    });
    logger.info("upload.enqueued", { uploadId, mimeType: record.mime_type, userId: req.user.userId });
    return res.json(updated.rows[0]);
  }

  // Fallback: return current state
  const again = await pool.query(
    `SELECT id, status, raw_key, processed_key, error_message
     FROM uploads
     WHERE id = $1`,
    [uploadId]
  );

  return res.json(again.rows[0]);
});

// Download processed output (owner-only): presigned GET URL
app.get("/uploads/:id/download", requireAuth, async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `SELECT id, status, processed_key
     FROM uploads
     WHERE id = $1 AND user_id = $2`,
    [id, req.user.userId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Upload not found" });
  }

  const upload = result.rows[0];

  if (upload.status !== "PROCESSED") {
    return res.status(400).json({
      error: "File is not processed yet",
      status: upload.status,
    });
  }

  if (!upload.processed_key) {
    return res.status(500).json({
      error: "processed_key missing for a PROCESSED upload",
    });
  }

  const cmd = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: upload.processed_key,
  });

  const downloadUrl = await getSignedUrl(s3, cmd, { expiresIn: 600 });

  return res.json({
    uploadId: upload.id,
    downloadUrl,
    expiresInSeconds: 600,
  });
});

// ── Admin routes ─────────────────────────────────────────────────────────────

// GET /uploads — all uploads for the logged-in user
app.get("/uploads", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, original_filename, mime_type, size_bytes,
              status, processed_key, error_message, created_at, updated_at
       FROM uploads
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.userId]
    );
    res.json({ uploads: result.rows });
  } catch (err) {
    logger.error("uploads.list_failed", { error: err.message, userId: req.user.userId });
    res.status(500).json({ error: "Failed to fetch uploads" });
  }
});

// DELETE /uploads/:id — owner deletes their upload (raw + processed files + DB row)
app.delete("/uploads/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `SELECT id, user_id, raw_key, processed_key FROM uploads WHERE id = $1`,
    [id]
  );

  if (result.rowCount === 0) return res.status(404).json({ error: "Upload not found" });

  const upload = result.rows[0];
  if (upload.user_id !== req.user.userId) {
    return res.status(404).json({ error: "Upload not found" }); // don't leak existence
  }

  // Delete files from MinIO — non-fatal if already gone
  const keysToDelete = [upload.raw_key, upload.processed_key].filter(Boolean);
  await Promise.allSettled(
    keysToDelete.map((key) =>
      s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }))
    )
  );

  await pool.query(`DELETE FROM uploads WHERE id = $1`, [id]);

  logger.info("upload.deleted", { uploadId: id, userId: req.user.userId });
  res.json({ ok: true });
});

// GET /admin/uploads — all uploads across all users (admin only)
app.get("/admin/uploads", requireAuth, requireAdmin, async (req, res) => {
  try {
    const page  = Math.max(1, Number(req.query.page  ?? 1));
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = (page - 1) * limit;
    const status = req.query.status ?? null; // optional filter

    const values = status
      ? [limit, offset, status]
      : [limit, offset];

    const whereClause = status ? `WHERE u.status = $3` : "";

    const result = await pool.query(
      `SELECT u.id,
              usr.email        AS user_email,
              u.original_filename,
              u.mime_type,
              u.size_bytes,
              u.status,
              u.error_message,
              u.created_at,
              u.updated_at
       FROM uploads u
       JOIN users usr ON u.user_id = usr.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $1 OFFSET $2`,
      values
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM uploads u ${whereClause}`,
      status ? [status] : []
    );

    res.json({
      uploads: result.rows,
      total: Number(countResult.rows[0].count),
      page,
      limit,
    });
  } catch (err) {
    logger.error("admin.uploads_failed", { error: err.message });
    res.status(500).json({ error: "Failed to fetch uploads" });
  }
});

// GET /admin/metrics — queue depths + worker metrics snapshot from Redis
app.get("/admin/metrics", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Only count "live" states — completed jobs are removed immediately so
    // asking for "completed" would always return 0 and be misleading.
    const LIVE_STATES = ["waiting", "active", "failed", "delayed", "paused"];

    const [imgCounts, pdfCounts, vidCounts, dlqCounts] = await Promise.all([
      imageQueue.getJobCounts(...LIVE_STATES),
      pdfQueue.getJobCounts(...LIVE_STATES),
      videoQueue.getJobCounts(...LIVE_STATES),
      dlqQueue.getJobCounts("waiting", "active", "failed"),
    ]);

    // Worker metrics published by worker process every 10 s
    const workerMetricsRaw = await redis.get("worker:metrics");
    const workerMetrics = workerMetricsRaw ? JSON.parse(workerMetricsRaw) : null;

    // Worker heartbeat — if older than 30 s, worker is likely down
    const heartbeatRaw = await redis.get("worker:heartbeat");
    const workerAlive = heartbeatRaw
      ? Date.now() - Number(heartbeatRaw) < 30_000
      : false;

    res.json({
      queues: {
        image: imgCounts,
        pdf:   pdfCounts,
        video: vidCounts,
        dlq:   dlqCounts,
      },
      worker: {
        alive:     workerAlive,
        lastSeen:  heartbeatRaw ? new Date(Number(heartbeatRaw)).toISOString() : null,
        metrics:   workerMetrics,
      },
    });
  } catch (err) {
    logger.error("admin.metrics_failed", { error: err.message });
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

// GET /admin/failed — last 50 failed uploads from the DB
app.get("/admin/failed", requireAuth, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const result = await pool.query(
      `SELECT id, user_id, original_filename, mime_type, size_bytes,
              status, error_message, created_at, updated_at
       FROM uploads
       WHERE status = 'FAILED'
       ORDER BY updated_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ failed: result.rows, total: result.rowCount });
  } catch (err) {
    logger.error("admin.failed_query_failed", { error: err.message });
    res.status(500).json({ error: "Failed to fetch failed uploads" });
  }
});

// GET /admin/dlq — inspect DLQ jobs (last 50)
app.get("/admin/dlq", requireAuth, requireAdmin, async (req, res) => {
  try {
    const jobs = await dlqQueue.getJobs(["waiting"], 0, 49);
    res.json({
      dlq: jobs.map((j) => ({
        dlqJobId:      j.id,
        originalQueue: j.data.originalQueue,
        originalJobId: j.data.originalJobId,
        uploadId:      j.data.payload?.uploadId,
        mimeType:      j.data.payload?.mimeType,
        failedAt:      j.data.failedAt,
        errorMessage:  j.data.errorMessage,
        attemptsMade:  j.data.attemptsMade,
      })),
    });
  } catch (err) {
    logger.error("admin.dlq_query_failed", { error: err.message });
    res.status(500).json({ error: "Failed to fetch DLQ" });
  }
});

// DELETE /admin/uploads/:id — admin hard-deletes any upload (MinIO + DB)
app.delete("/admin/uploads/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, user_id, raw_key, processed_key, original_filename FROM uploads WHERE id = $1`,
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Upload not found" });

    const upload = result.rows[0];
    const keysToDelete = [upload.raw_key, upload.processed_key].filter(Boolean);
    await Promise.allSettled(
      keysToDelete.map((key) =>
        s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }))
      )
    );
    await pool.query(`DELETE FROM uploads WHERE id = $1`, [id]);
    logger.info("admin.upload_deleted", {
      uploadId: id,
      filename: upload.original_filename,
      deletedBy: req.user.email,
    });
    res.json({ ok: true });
  } catch (err) {
    logger.error("admin.delete_failed", { uploadId: id, error: err.message });
    res.status(500).json({ error: "Delete failed" });
  }
});

// GET /admin/uploads/:id — full detail + presigned raw & processed URLs
app.get("/admin/uploads/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT u.id, usr.email AS user_email, u.original_filename, u.mime_type,
              u.size_bytes, u.status, u.error_message,
              u.raw_key, u.processed_key, u.created_at, u.updated_at
       FROM uploads u
       JOIN users usr ON u.user_id = usr.id
       WHERE u.id = $1`,
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Upload not found" });

    const upload = result.rows[0];

    // Generate presigned URLs valid for 15 min each (best-effort — key may not exist yet)
    async function presign(key) {
      if (!key) return null;
      try {
        return await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
          { expiresIn: 900 }
        );
      } catch { return null; }
    }

    const [rawUrl, processedUrl] = await Promise.all([
      presign(upload.raw_key),
      presign(upload.processed_key),
    ]);

    res.json({ upload, rawUrl, processedUrl });
  } catch (err) {
    logger.error("admin.upload_detail_failed", { uploadId: id, error: err.message });
    res.status(500).json({ error: "Failed to fetch upload detail" });
  }
});

// GET /admin/users — all users with upload stats
app.get("/admin/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         u.id,
         u.email,
         u.created_at AS joined_at,
         COUNT(up.id)::int                                          AS total_uploads,
         COUNT(up.id) FILTER (WHERE up.status = 'PROCESSED')::int  AS processed_uploads,
         COUNT(up.id) FILTER (WHERE up.status = 'FAILED')::int     AS failed_uploads,
         COALESCE(SUM(up.size_bytes) FILTER (WHERE up.size_bytes IS NOT NULL), 0)::bigint AS storage_bytes,
         MAX(up.created_at)                                         AS last_upload_at
       FROM users u
       LEFT JOIN uploads up ON up.user_id = u.id
       GROUP BY u.id, u.email, u.created_at
       ORDER BY u.created_at DESC`
    );
    res.json({ users: result.rows, total: result.rowCount });
  } catch (err) {
    logger.error("admin.users_failed", { error: err.message });
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST /admin/dlq/:jobId/replay — re-enqueue a DLQ job
app.post("/admin/dlq/:jobId/replay", requireAuth, requireAdmin, async (req, res) => {
  const { jobId } = req.params;
  try {
    const job = await dlqQueue.getJob(jobId);
    if (!job) return res.status(404).json({ error: "DLQ job not found" });

    const { uploadId, rawKey, mimeType } = job.data.payload ?? {};
    if (!uploadId || !mimeType) {
      return res.status(400).json({ error: "DLQ job payload is incomplete" });
    }

    // Reset the upload status back to UPLOADED so the worker will pick it up
    await pool.query(
      `UPDATE uploads SET status = 'UPLOADED', error_message = NULL, updated_at = NOW()
       WHERE id = $1`,
      [uploadId]
    );

    await enqueueUpload({ uploadId, rawKey, mimeType });

    // Remove from DLQ
    await job.remove();

    logger.info("admin.replay", { uploadId, mimeType, replayedBy: req.user.userId });
    res.json({ ok: true, uploadId, message: "Re-enqueued for processing" });
  } catch (err) {
    logger.error("admin.replay_failed", { jobId, error: err.message });
    res.status(500).json({ error: "Replay failed" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info("api.started", { port: PORT, pid: process.pid });
});