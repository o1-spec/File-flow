import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import { Pool } from "pg";
import Redis from "ioredis";

import { processImage } from "./src/processors/imageProcessor.js";
import { processPdf }   from "./src/processors/pdfProcessor.js";
import { processVideo } from "./src/processors/videoProcessor.js";

import { logger }                                         from "./src/logger.js";
import { recordStart, recordComplete, recordFailed,
         recordRetry, recordDLQ, getSnapshot }            from "./src/metrics.js";

// DLQ helper — inline here so the worker doesn't depend on the Backend package.
// The worker connects to the same Redis so it can push to the "dlq" queue directly.
import { Queue } from "bullmq";

const _dlqQueue = new Queue("dlq", {
  connection: { url: process.env.REDIS_URL },
  defaultJobOptions: { removeOnComplete: false, removeOnFail: false, attempts: 1 },
});

async function moveToDLQ(job, err) {
  await _dlqQueue.add("dead-letter", {
    originalQueue: job.queueName,
    originalJobId: job.id,
    payload:       job.data,
    failedAt:      new Date().toISOString(),
    errorMessage:  String(err?.message ?? err),
    errorStack:    err?.stack ?? null,
    attemptsMade:  job.attemptsMade,
  }, { jobId: `dlq-${job.id}` });
}

// ── Infrastructure ────────────────────────────────────────────────────────────
const pool  = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL);

const WORKER_ID = `worker-${process.pid}`;
const REDIS     = { url: process.env.REDIS_URL };

// Publish in-process metrics snapshot to Redis every 10 s so the API can
// serve them without coupling the two processes.
async function publishHeartbeat() {
  try {
    await redis.set("worker:metrics", JSON.stringify(getSnapshot()), "EX", 60);
    await redis.set("worker:heartbeat", Date.now(), "EX", 30);
  } catch { /* non-fatal */ }
}

// Fire immediately on startup so the dashboard shows "online" right away,
// then refresh every 10 s.
publishHeartbeat();
setInterval(publishHeartbeat, 10_000);

// ── Shared job handler factory ────────────────────────────────────────────────
function makeHandler(processor) {
  return async (job) => {
    const { uploadId, mimeType } = job.data;
    const startedAt = Date.now();

    // ── Fetch record ──────────────────────────────────────────────────────────
    const rec = await pool.query(
      `SELECT id, status, raw_key, mime_type, size_bytes, user_id
       FROM uploads WHERE id = $1`,
      [uploadId]
    );

    if (rec.rowCount === 0) {
      logger.warn("job.upload_not_found", { uploadId, jobId: job.id, queueName: job.queueName, workerId: WORKER_ID });
      return;
    }

    const upload = rec.rows[0];

    logger.info("job.started", {
      uploadId,
      userId:    upload.user_id,
      mimeType:  upload.mime_type,
      sizeBytes: upload.size_bytes,
      jobId:     job.id,
      attempt:   job.attemptsMade + 1,
      maxAttempts: job.opts?.attempts ?? 5,
      queueName: job.queueName,
      workerId:  WORKER_ID,
    });

    // ── Idempotency guard ─────────────────────────────────────────────────────
    if (upload.status === "PROCESSED") {
      logger.info("job.already_processed", { uploadId, workerId: WORKER_ID });
      return;
    }

    // ── Optimistic lock ───────────────────────────────────────────────────────
    const locked = await pool.query(
      `UPDATE uploads
       SET status = 'PROCESSING', updated_at = NOW()
       WHERE id = $1 AND status = 'UPLOADED'
       RETURNING id`,
      [uploadId]
    );

    if (locked.rowCount === 0) {
      logger.warn("job.lock_failed", { uploadId, currentStatus: upload.status, workerId: WORKER_ID });
      return;
    }

    recordStart(upload.mime_type);

    // ── Process ───────────────────────────────────────────────────────────────
    const result = await processor(upload, uploadId);
    const durationMs = Date.now() - startedAt;

    await pool.query(
      `UPDATE uploads
       SET status = 'PROCESSED',
           processed_key = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [uploadId, result.processedKey]
    );

    recordComplete(upload.mime_type, durationMs, upload.size_bytes ?? 0);

    logger.info("job.completed", {
      uploadId,
      userId:      upload.user_id,
      mimeType:    upload.mime_type,
      durationMs,
      processedKey: result.processedKey,
      jobId:       job.id,
      queueName:   job.queueName,
      workerId:    WORKER_ID,
    });
  };
}

// ── Shared failure handler ────────────────────────────────────────────────────
function onFailed(queueName) {
  return async (job, err) => {
    if (!job) return;

    const { uploadId, mimeType } = job.data;
    const maxAttempts = job.opts?.attempts ?? 5;
    const isFinal = job.attemptsMade >= maxAttempts;

    logger.error("job.failed", {
      uploadId,
      mimeType,
      jobId:       job.id,
      queueName,
      attempt:     job.attemptsMade,
      maxAttempts,
      isFinal,
      error:       err?.message ?? String(err),
      workerId:    WORKER_ID,
    });

    if (isFinal) {
      // ── Mark DB as FAILED ─────────────────────────────────────────────────
      await pool.query(
        `UPDATE uploads
         SET status = 'FAILED',
             error_message = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [uploadId, String(err?.message || err)]
      );

      // ── Move to DLQ ───────────────────────────────────────────────────────
      try {
        await moveToDLQ(job, err);
        recordDLQ(mimeType);
        logger.info("job.moved_to_dlq", { uploadId, mimeType, originalJobId: job.id, workerId: WORKER_ID });
      } catch (dlqErr) {
        logger.error("job.dlq_failed", { uploadId, error: dlqErr?.message, workerId: WORKER_ID });
      }

      recordFailed(mimeType);
    } else {
      // ── Non-final — will be retried ───────────────────────────────────────
      recordRetry(mimeType);
      logger.warn("job.retrying", {
        uploadId,
        mimeType,
        attempt:  job.attemptsMade,
        nextIn:   `~${Math.pow(2, job.attemptsMade) * 2}s`,
        workerId: WORKER_ID,
      });
    }
  };
}

// ── Workers ───────────────────────────────────────────────────────────────────

new Worker("image-processing", makeHandler(processImage), { connection: REDIS, concurrency: 10 })
  .on("completed", (job) => logger.info("queue.completed", { jobId: job.id, queueName: "image-processing", workerId: WORKER_ID }))
  .on("failed",    onFailed("image-processing"));

new Worker("pdf-processing", makeHandler(processPdf), { connection: REDIS, concurrency: 5 })
  .on("completed", (job) => logger.info("queue.completed", { jobId: job.id, queueName: "pdf-processing", workerId: WORKER_ID }))
  .on("failed",    onFailed("pdf-processing"));

new Worker("video-processing", makeHandler(processVideo), { connection: REDIS, concurrency: 2 })
  .on("completed", (job) => logger.info("queue.completed", { jobId: job.id, queueName: "video-processing", workerId: WORKER_ID }))
  .on("failed",    onFailed("video-processing"));

logger.info("worker.started", {
  queues: ["image-processing", "pdf-processing", "video-processing"],
  workerId: WORKER_ID,
  pid: process.pid,
});
