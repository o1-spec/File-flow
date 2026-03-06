import sharp from "sharp";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../s3.js";
import { streamToBuffer } from "../utils/streamToBuffer.js";

export async function processImage(upload, uploadId) {
  const rawObject = await s3.send(
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: upload.raw_key,
    })
  );

  const rawBuffer = await streamToBuffer(rawObject.Body);

  const processedBuffer = await sharp(rawBuffer)
    .resize({ width: 800 })
    .png()
    .toBuffer();

  const processedKey = `processed/${uploadId}/output.png`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: processedKey,
      Body: processedBuffer,
      ContentType: "image/png",
    })
  );

  return {
    processedKey,
    outputMimeType: "image/png",
  };
}