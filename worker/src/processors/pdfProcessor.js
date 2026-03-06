import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../s3.js";
import { streamToBuffer } from "../utils/streamToBuffer.js";

export async function processPdf(upload, uploadId) {
  const rawObject = await s3.send(
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: upload.raw_key,
    })
  );

  const rawBuffer = await streamToBuffer(rawObject.Body);

  const processedKey = `processed/${uploadId}/output.pdf`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: processedKey,
      Body: rawBuffer,
      ContentType: "application/pdf",
    })
  );

  return {
    processedKey,
    outputMimeType: "application/pdf",
  };
}