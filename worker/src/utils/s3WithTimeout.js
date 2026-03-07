/**
 * Wraps any @aws-sdk/client-s3 command with an AbortController timeout.
 *
 * If MinIO / S3 hangs, the promise rejects after `timeoutMs` (default 30 s)
 * instead of hanging until BullMQ's lockDuration reclaims the job.
 *
 * Usage:
 *   import { s3Send } from "../utils/s3WithTimeout.js";
 *   const result = await s3Send(new GetObjectCommand({ ... }));
 */

import { s3 } from "../s3.js";

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * @param {import("@aws-sdk/client-s3").S3Command} command
 * @param {number} [timeoutMs]
 */
export async function s3Send(command, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error(`S3 operation timed out after ${timeoutMs} ms`));
  }, timeoutMs);

  try {
    return await s3.send(command, { abortSignal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
