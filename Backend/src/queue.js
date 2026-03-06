import { Queue } from "bullmq";

export const processingQueue = new Queue("file-processing", {
  connection: {
    url: process.env.REDIS_URL,
  },
});