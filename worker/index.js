import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import { Pool } from "pg";

import { processImage } from "./src/processors/imageProcessor.js";
import { processPdf } from "./src/processors/pdfProcessor.js";
import { processVideo } from "./src/processors/videoProcessor.js";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function selectProcessor(mimeType) {
  if (mimeType?.startsWith("image/")) return processImage;
  if (mimeType === "application/pdf") return processPdf;
  if (mimeType?.startsWith("video/")) return processVideo;
  return null;
}

new Worker(
  "file-processing",
  async (job) => {
    const { uploadId } = job.data;

    const rec = await pool.query(
      `SELECT id, status, raw_key, mime_type
       FROM uploads
       WHERE id = $1`,
      [uploadId]
    );

    if (rec.rowCount === 0) return;

    const upload = rec.rows[0];

    if (upload.status === "PROCESSED") return;

    const locked = await pool.query(
      `UPDATE uploads
       SET status = 'PROCESSING',
           updated_at = NOW()
       WHERE id = $1 AND status = 'UPLOADED'
       RETURNING id`,
      [uploadId]
    );

    if (locked.rowCount === 0) return;

    try {
      const processor = selectProcessor(upload.mime_type);

      if (!processor) {
        throw new Error(`Unsupported mime type: ${upload.mime_type}`);
      }

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
  },
  {
    connection: { url: process.env.REDIS_URL },
    concurrency: 2,
  }
).on("completed", (job) => {
  console.log(`✅ Completed job ${job.id}`);
}).on("failed", async (job, err) => {
  console.error(`❌ Failed job ${job?.id}`, err);

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
});

console.log("👷 Worker running: file-processing queue");