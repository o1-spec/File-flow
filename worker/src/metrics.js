/**
 * In-process metrics store for the worker.
 *
 * Intentionally zero-dependency: no Prometheus client, no external push.
 * The backend's /admin/metrics endpoint reads these values via the shared
 * Redis key "worker:metrics" that we publish every 10 s.
 *
 * Counters tracked per mimeType bucket:
 *   jobs_started       - incremented when the lock is acquired
 *   jobs_completed     - incremented on PROCESSED
 *   jobs_failed        - incremented on final failure (retries exhausted)
 *   jobs_retried       - incremented on each non-final failure attempt
 *   dlq_moved          - incremented when a job is sent to the DLQ
 *
 * Histograms tracked per mimeType bucket:
 *   duration_ms_total  - sum of all processing durations (ms)
 *   duration_ms_count  - number of completed jobs (for avg = total/count)
 *   size_bytes_total   - sum of file sizes processed
 *   size_bytes_count   - number of files counted
 */

function newBucket() {
  return {
    jobs_started:       0,
    jobs_completed:     0,
    jobs_failed:        0,
    jobs_retried:       0,
    dlq_moved:          0,
    duration_ms_total:  0,
    duration_ms_count:  0,
    size_bytes_total:   0,
    size_bytes_count:   0,
  };
}

/** @type {Map<string, ReturnType<typeof newBucket>>} */
const buckets = new Map();

const MIME_LABELS = {
  "image/png":       "image",
  "image/jpeg":      "image",
  "application/pdf": "pdf",
  "video/mp4":       "video",
  "video/quicktime": "video",
};

function label(mimeType) {
  return MIME_LABELS[mimeType] ?? "other";
}

function bucket(mimeType) {
  const key = label(mimeType);
  if (!buckets.has(key)) buckets.set(key, newBucket());
  return buckets.get(key);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function recordStart(mimeType) {
  bucket(mimeType).jobs_started++;
}

export function recordComplete(mimeType, durationMs, sizeBytes = 0) {
  const b = bucket(mimeType);
  b.jobs_completed++;
  b.duration_ms_total  += durationMs;
  b.duration_ms_count++;
  b.size_bytes_total   += sizeBytes;
  b.size_bytes_count++;
}

export function recordFailed(mimeType) {
  bucket(mimeType).jobs_failed++;
}

export function recordRetry(mimeType) {
  bucket(mimeType).jobs_retried++;
}

export function recordDLQ(mimeType) {
  bucket(mimeType).dlq_moved++;
}

/** Returns a plain object snapshot safe to JSON.serialize and push to Redis */
export function getSnapshot() {
  const out = { capturedAt: new Date().toISOString(), buckets: {} };
  for (const [key, b] of buckets.entries()) {
    out.buckets[key] = {
      ...b,
      avg_duration_ms:
        b.duration_ms_count > 0
          ? Math.round(b.duration_ms_total / b.duration_ms_count)
          : 0,
      avg_size_bytes:
        b.size_bytes_count > 0
          ? Math.round(b.size_bytes_total / b.size_bytes_count)
          : 0,
    };
  }
  return out;
}
