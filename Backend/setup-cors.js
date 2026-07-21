import dotenv from "dotenv";
dotenv.config();

import { s3 } from "./src/s3.js";
import { PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

async function setupCors() {
  const bucket = process.env.S3_BUCKET || "fileflow-data";
  console.log(`🔍 Configuring CORS for S3 / Cloudflare R2 bucket '${bucket}'...`);

  const corsRule = {
    CORSRules: [
      {
        AllowedOrigins: ["*"],
        AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
        AllowedHeaders: ["*"],
        ExposeHeaders: ["ETag", "Content-Type", "Content-Length"],
        MaxAgeSeconds: 3600,
      },
    ],
  };

  try {
    console.log("Applying CORS policy...");
    await s3.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: corsRule,
      })
    );
    console.log("✅ CORS policy successfully applied to bucket!");

    try {
      const currentCors = await s3.send(new GetBucketCorsCommand({ Bucket: bucket }));
      console.log("Current Bucket CORS Configuration:", JSON.stringify(currentCors.CORSRules, null, 2));
    } catch (e) {
      // ignore read error if not supported
    }

    console.log("\n🎉 Direct browser uploads to Cloudflare R2 are now enabled!");
  } catch (err) {
    console.error("\n❌ Automatic CORS setup via API returned:", err.message);
    console.log("\n📋 Manual Setup Instructions for Cloudflare R2:");
    console.log("1. Open Cloudflare Dashboard -> R2 -> 'fileflow-data' bucket.");
    console.log("2. Click 'Settings' tab -> scroll down to 'CORS Policy'.");
    console.log("3. Click 'Edit CORS Policy' and paste:");
    console.log(JSON.stringify(corsRule.CORSRules, null, 2));
  }
}

setupCors();
