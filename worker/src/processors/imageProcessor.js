import sharp from "sharp";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Send } from "../utils/s3WithTimeout.js";
import { streamToBuffer } from "../utils/streamToBuffer.js";

export async function processImage(upload, uploadId) {
  const rawObject = await s3Send(
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

  await s3Send(
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
