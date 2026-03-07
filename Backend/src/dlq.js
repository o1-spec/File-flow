/**
 * Dead-Letter Queue (DLQ)
 *
 * When a job exhausts all BullMQ retry attempts the worker calls moveToDLQ().
 * This adds a lightweight copy of the job to a dedicated "dlq" queue so that:
 *
 *   1. Ops can inspect failures without losing the payload.
 *   2. Individual jobs can be replayed via the /admin/dlq/:jobId/replay endpoint.
 *   3. Queue depth is visible on the admin dashboard.
 *
 * DLQ jobs are kept indefinitely (removeOnFail: false, removeOnComplete: false).
 */

import { Queue } from "bullmq";

const connection = { url: process.env.REDIS_URL };

export const dlqQueue = new Queue("dlq", {
  connection,
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false,
    attempts: 1, // DLQ jobs should not auto-retry
  },
});

/**
 * Move a failed job's data into the DLQ for later inspection / replay.
 *
 * @param {import("bullmq").Job} job  - The failed BullMQ job
 * @param {Error}                err  - The final error
 */
export async function moveToDLQ(job, err) {
  await dlqQueue.add(
    "dead-letter",
    {
      originalQueue: job.queueName,
      originalJobId: job.id,
      payload:       job.data,
      failedAt:      new Date().toISOString(),
      errorMessage:  String(err?.message ?? err),
      errorStack:    err?.stack ?? null,
      attemptsMade:  job.attemptsMade,
    },
    {
      // Stable job id so replaying the same upload won't double-insert
      jobId: `dlq-${job.id}`,
    }
  );
}
