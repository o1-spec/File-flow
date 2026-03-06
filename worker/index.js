import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import { Pool } from "pg";
import sharp from "sharp";

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "./src/s3.js";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/*
Convert S3 stream → Buffer
*/
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const worker = new Worker(
  "file-processing",
  async (job) => {
    const { uploadId } = job.data;

    console.log(`📦 Processing upload ${uploadId}`);

    // 1️⃣ Load upload record
    const rec = await pool.query(
      `SELECT id, status, raw_key, mime_type
       FROM uploads
       WHERE id = $1`,
      [uploadId]
    );

    if (rec.rowCount === 0) {
      console.log("Upload not found");
      return;
    }

    const upload = rec.rows[0];

    // 2️⃣ Idempotency check
    if (upload.status === "PROCESSED") {
      console.log("Already processed, skipping");
      return;
    }

    // 3️⃣ Lock transition
    const locked = await pool.query(
      `UPDATE uploads
       SET status = 'PROCESSING',
           updated_at = NOW()
       WHERE id = $1 AND status = 'UPLOADED'
       RETURNING id`,
      [uploadId]
    );

    if (locked.rowCount === 0) {
      console.log("Job already processing or invalid state");
      return;
    }

    try {
      // 4️⃣ Download raw file from MinIO
      const rawObject = await s3.send(
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: upload.raw_key,
        })
      );

      const rawBuffer = await streamToBuffer(rawObject.Body);

      /*
      Decide processor based on file type
      */
      const isImage = upload.mime_type?.startsWith("image/");

      if (!isImage) {
        throw new Error(`Unsupported file type for image processor: ${upload.mime_type}`);
      }

      // 5️⃣ Process image (resize)
      const processedBuffer = await sharp(rawBuffer)
        .resize({ width: 800 })
        .png()
        .toBuffer();

      // 6️⃣ Deterministic processed key
      const processedKey = `processed/${uploadId}/output.png`;

      // 7️⃣ Upload processed file
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: processedKey,
          Body: processedBuffer,
          ContentType: "image/png",
        })
      );

      // 8️⃣ Update DB
      await pool.query(
        `UPDATE uploads
         SET status = 'PROCESSED',
             processed_key = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [uploadId, processedKey]
      );

      console.log(`✅ Upload ${uploadId} processed successfully`);
    } catch (err) {
      console.error(`❌ Processing failed for ${uploadId}`, err);
      throw err;
    }
  },
  {
    connection: { url: process.env.REDIS_URL },
    concurrency: 2, // backpressure control
  }
);

/*
Job success
*/
worker.on("completed", (job) => {
  console.log(`🎉 Completed job ${job.id}`);
});

/*
Job failure
*/
worker.on("failed", async (job, err) => {
  console.error(`💥 Failed job ${job?.id}`, err);

  const maxAttempts = job?.opts?.attempts ?? 1;

  if (job && job.attemptsMade >= maxAttempts) {
    const uploadId = job.data.uploadId;

    await pool.query(
      `UPDATE uploads
       SET status = 'FAILED',
           error_message = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [uploadId, String(err?.message || err)]
    );
  }
});

console.log("👷 Worker running: file-processing queue");