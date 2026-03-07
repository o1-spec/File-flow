/**
 * Structured JSON logger for the API/backend process.
 *
 * Same shape as the worker logger so both streams can be parsed uniformly
 * by any log aggregator.
 *
 * Typical usage:
 *   logger.info("upload.started", { uploadId, userId, mimeType, sizeBytes });
 *   logger.info("upload.completed", { uploadId, status: "PROCESSED" });
 *   logger.error("upload.enqueue_failed", { uploadId, error: err.message });
 */

const SERVICE_ID = `api-${process.pid}`;

function log(level, msg, ctx = {}) {
  const line = {
    ts:      new Date().toISOString(),
    level,
    msg,
    service: SERVICE_ID,
    ...ctx,
  };
  const clean = Object.fromEntries(
    Object.entries(line).filter(([, v]) => v !== undefined && v !== null)
  );
  process.stdout.write(JSON.stringify(clean) + "\n");
}

export const logger = {
  info:  (msg, ctx) => log("info",  msg, ctx),
  warn:  (msg, ctx) => log("warn",  msg, ctx),
  error: (msg, ctx) => log("error", msg, ctx),
};
