import dotenv from "dotenv";
dotenv.config();

import { s3 } from "./src/s3.js";
import { PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

async function testS3() {
  const bucket = process.env.S3_BUCKET || "filepipeline";
  let endpoint = process.env.S3_ENDPOINT || "http://localhost:9000";

  let cleanEndpoint = endpoint.trim().replace(/\/+$/, "");
  if (bucket && cleanEndpoint.endsWith(`/${bucket}`)) {
    cleanEndpoint = cleanEndpoint.slice(0, -(bucket.length + 1));
  }

  console.log("🔍 Testing S3 / Storage Connection...");
  console.log("----------------------------------------");
  console.log("Endpoint: ", cleanEndpoint);
  console.log("Bucket:   ", bucket);
  console.log("Region:   ", process.env.S3_REGION || "us-east-1");
  console.log("AccessKey:", process.env.S3_ACCESS_KEY ? `${process.env.S3_ACCESS_KEY.slice(0, 5)}...` : "(none)");

  const testKey = `test-${Date.now()}.txt`;
  const content = "FileFlow Storage Test Connection Successful!";

  try {
    console.log(`\n1. Uploading test file '${testKey}'...`);
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: testKey,
        Body: content,
        ContentType: "text/plain",
      })
    );
    console.log("   ✅ Upload succeeded!");

    console.log(`\n2. Verifying object metadata in bucket...`);
    const head = await s3.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: testKey,
      })
    );
    console.log(`   ✅ Object found! Size: ${head.ContentLength} bytes`);

    console.log(`\n3. Cleaning up test file...`);
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: testKey,
      })
    );
    console.log("   ✅ Cleanup succeeded!");

    console.log("\n🎉 All S3 / Storage tests passed successfully!");
  } catch (err) {
    console.error("\n❌ S3 Connection Failed:", err.message);
    if (err.name) console.error("Error Code:", err.name);
    console.error("\nPlease check your S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, and S3_BUCKET settings.");
  }
}

testS3();
