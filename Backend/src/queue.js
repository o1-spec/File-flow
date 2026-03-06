import dotenv from "dotenv";
dotenv.config();

import { Queue } from "bullmq";

const connection = { url: process.env.REDIS_URL };

const JOB_DEFAULTS = {
  attempts: 5,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: true,
  removeOnFail: false,
};

export const imageQueue = new Queue("image-processing", { connection });
export const pdfQueue = new Queue("pdf-processing", { connection });
export const videoQueue = new Queue("video-processing", { connection });

export async function enqueueUpload({ uploadId, rawKey, mimeType }) {
  const jobData = { uploadId, rawKey, mimeType };

  if (mimeType?.startsWith("image/")) {
    return imageQueue.add("process-image", jobData, JOB_DEFAULTS);
  }

  if (mimeType === "application/pdf") {
    return pdfQueue.add("process-pdf", jobData, JOB_DEFAULTS);
  }

  if (mimeType?.startsWith("video/")) {
    return videoQueue.add("process-video", jobData, JOB_DEFAULTS);
  }

  throw new Error(`No queue for mime type: ${mimeType}`);
}