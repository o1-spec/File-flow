/**
 * Structured JSON logger for the worker process.
 *
 * Every log line is a single JSON object written to stdout so it can be
 * ingested by any log aggregator (Datadog, Loki, CloudWatch, etc.).
 *
 * Shape:
 * {
 *   ts:        ISO-8601 timestamp
 *   level:     "info" | "warn" | "error"
 *   msg:       human-readable message
 *   workerId:  process identifier
 *   uploadId?  string
 *   mimeType?  string
 *   queueName? string
 *   durationMs? number
 *   attempt?   number
 *   error?     string
 *   [extra]:   any extra fields passed in ctx
 * }
 */

const WORKER_ID = `worker-${process.pid}`;

function log(level, msg, ctx = {}) {
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    workerId: WORKER_ID,
    ...ctx,
  };
  // Remove undefined values so the JSON stays clean
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
