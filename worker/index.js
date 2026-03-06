import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import { Pool } from "pg";

import { processImage } from "./src/processors/imageProcessor.js";
import { processPdf }   from "./src/processors/pdfProcessor.js";
import { processVideo } from "./src/processors/videoProcessor.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Shared job handler factory ────────────────────────────────────────────────
// Each queue gets its own Worker instance but shares the same DB logic and
// error-handling pattern.

function makeHandler(processor) {
  return async (job) => {
    const { uploadId } = job.data;

    const rec = await pool.query(
      `SELECT id, status, raw_key, mime_type
       FROM uploads WHERE id = $1`,
      [uploadId]
    );

    if (rec.rowCount === 0) return;
    const upload = rec.rows[0];

    if (upload.status === "PROCESSED") return;

    const locked = await pool.query(
      `UPDATE uploads
       SET status = 'PROCESSING', updated_at = NOW()
       WHERE id = $1 AND status = 'UPLOADED'
       RETURNING id`,
      [uploadId]
    );

    if (locked.rowCount === 0) return;

    try {
      const result = await processor(upload, uploadId);

      await pool.query(
        `UPDATE uploads
         SET status = 'PROCESSED',
             processed_key = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [uploadId, result.processedKey]
      );
    } catch (err) {
      throw err;
    }
  };
}

// ── Shared failure handler ─────────────────────────────────────────────────────
function onFailed(workerName) {
  return async (job, err) => {
    console.error(`❌ [${workerName}] Failed job ${job?.id}:`, err?.message ?? err);

    const maxAttempts = job?.opts?.attempts ?? 1;
    if (job && job.attemptsMade >= maxAttempts) {
      await pool.query(
        `UPDATE uploads
         SET status = 'FAILED',
             error_message = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [job.data.uploadId, String(err?.message || err)]
      );
    }
  };
}

const REDIS = { url: process.env.REDIS_URL };

// ── image-processing Worker ───────────────────────────────────────────────────
// High concurrency: images are cheap to process
new Worker("image-processing", makeHandler(processImage), {
  connection: REDIS,
  concurrency: 10,
})
  .on("completed", (job) => console.log(`✅ [image] job ${job.id} done`))
  .on("failed", onFailed("image"));

// ── pdf-processing Worker ─────────────────────────────────────────────────────
// Medium concurrency: PDFs can be large but not as heavy as video
new Worker("pdf-processing", makeHandler(processPdf), {
  connection: REDIS,
  concurrency: 5,
})
  .on("completed", (job) => console.log(`✅ [pdf] job ${job.id} done`))
  .on("failed", onFailed("pdf"));

// ── video-processing Worker ───────────────────────────────────────────────────
// Low concurrency: transcoding is CPU-intensive
new Worker("video-processing", makeHandler(processVideo), {
  connection: REDIS,
  concurrency: 2,
})
  .on("completed", (job) => console.log(`✅ [video] job ${job.id} done`))
  .on("failed", onFailed("video"));

console.log("👷 Workers running: image-processing | pdf-processing | video-processing");
