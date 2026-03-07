import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Send } from "../utils/s3WithTimeout.js";
import { streamToBuffer } from "../utils/streamToBuffer.js";
import fs from "fs";
import os from "os";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegPath.path);

export async function processVideo(upload, uploadId) {
  const rawObject = await s3Send(
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: upload.raw_key,
    })
  );

  const rawBuffer = await streamToBuffer(rawObject.Body);

  const tmpDir   = os.tmpdir();
  const inputPath  = path.join(tmpDir, `${uploadId}_input${path.extname(upload.raw_key)}`);
  const outputPath = path.join(tmpDir, `${uploadId}_output.mp4`);
  const thumbPath  = path.join(tmpDir, `${uploadId}_thumb.jpg`);

  fs.writeFileSync(inputPath, rawBuffer);

  // ── Transcode to 720p H.264 ───────────────────────────────────────────────
  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-c:v libx264",
        "-preset fast",      // speed / compression tradeoff
        "-crf 23",           // constant-rate factor: 18=HQ, 28=small
        "-vf scale=-2:720",  // max 720p, keep aspect ratio
        "-c:a aac",
        "-b:a 128k",
        "-movflags +faststart", // move MOOV atom to front for streaming
        "-y",                // overwrite
      ])
      .on("end", resolve)
      .on("error", reject)
      .save(outputPath);
  });

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: ["1"],
        filename: path.basename(thumbPath),
        folder: tmpDir,
        size: "640x?",
      })
      .on("end", resolve)
      .on("error", reject);
  });

  const processedKey = `processed/${uploadId}/output.mp4`;
  const thumbKey     = `processed/${uploadId}/thumbnail.jpg`;

  await s3Send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: processedKey,
      Body: fs.readFileSync(outputPath),
      ContentType: "video/mp4",
    })
  );

  await s3Send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: thumbKey,
      Body: fs.readFileSync(thumbPath),
      ContentType: "image/jpeg",
    })
  );

  for (const f of [inputPath, outputPath, thumbPath]) {
    try { fs.unlinkSync(f); } catch { /* non-fatal */ }
  }

  return {
    processedKey,
    thumbnailKey: thumbKey,
    outputMimeType: "video/mp4",
  };
}
