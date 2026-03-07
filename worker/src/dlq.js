/**
 * Worker-side DLQ helper.
 *
 * Shares the same queue name and options as Backend/src/dlq.js so that
 * the backend's /admin/dlq endpoint sees the jobs the worker puts here.
 * We keep this as a separate file (rather than importing Backend/src/dlq.js)
 * because the worker and backend are separate processes with separate
 * node_modules trees.
 */
import { Queue } from "bullmq";

const connection = { url: process.env.REDIS_URL };

const dlqQueue = new Queue("dlq", {
  connection,
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail:     false,
    attempts:         1, // DLQ jobs must not auto-retry
  },
});

/**
 * Move a failed job's data into the DLQ for later inspection / replay.
 *
 * @param {import("bullmq").Job} job
 * @param {Error|unknown} err
 */
export async function moveToDLQ(job, err) {
  await dlqQueue.add("dead-letter", {
    originalQueue: job.queueName,
    originalJobId: job.id,
    payload:       job.data,
    failedAt:      new Date().toISOString(),
    errorMessage:  String(err?.message ?? err),
    errorStack:    err?.stack ?? null,
    attemptsMade:  job.attemptsMade,
  }, { jobId: `dlq-${job.id}` });
}
