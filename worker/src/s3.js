import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

function getCleanEndpoint(endpoint, bucket) {
  if (!endpoint) return undefined;
  let clean = endpoint.trim().replace(/\/+$/, "");
  if (bucket && clean.endsWith(`/${bucket}`)) {
    clean = clean.slice(0, -(bucket.length + 1));
  }
  return clean;
}

export const s3 = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: getCleanEndpoint(process.env.S3_ENDPOINT, process.env.S3_BUCKET),
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true, 
});