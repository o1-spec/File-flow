import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../s3.js";
import { streamToBuffer } from "../utils/streamToBuffer.js";

export async function processVideo(upload, uploadId) {
  const rawObject = await s3.send(
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: upload.raw_key,
    })
  );

  const rawBuffer = await streamToBuffer(rawObject.Body);

  const processedKey = `processed/${uploadId}/output.mp4`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: processedKey,
      Body: rawBuffer,
      ContentType: "video/mp4",
    })
  );

  return {
    processedKey,
    outputMimeType: "video/mp4",
  };
}