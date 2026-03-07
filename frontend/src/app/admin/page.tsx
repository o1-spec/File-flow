"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface JobCounts {
  waiting: number;
  active: number;
  failed: number;
  completed: number;
  delayed?: number;
}

interface MetricBucket {
  jobs_started: number;
  jobs_completed: number;
  jobs_failed: number;
  jobs_retried: number;
  dlq_moved: number;
  avg_duration_ms: number;
  avg_size_bytes: number;
}

interface AdminMetrics {
  queues: {
    image: JobCounts;
    pdf: JobCounts;
    video: JobCounts;
    dlq: JobCounts;
  };
  worker: {
    alive: boolean;
    lastSeen: string | null;
    metrics: {
      capturedAt: string;
      buckets: Record<string, MetricBucket>;
    } | null;
  };
}

interface FailedUpload {
  id: string;
  user_id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  error_message: string;
  created_at: string;
  updated_at: string;
}

interface DLQJob {
  dlqJobId: string;
  originalQueue: string;
  uploadId: string;
  mimeType: string;
  failedAt: string;
  errorMessage: string;
  attemptsMade: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number | undefined) {
  return n ?? 0;
}

function fmtMs(ms: number) {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function ago(iso: string | null) {
  if (!iso) return "never";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function QueueCard({ name, counts, completedFromMetrics, color }: {
  name: string;
  counts: JobCounts;
  completedFromMetrics?: number;
  color: string;
}) {
  return (
    <div className="admin-queue-card" style={{ borderTopColor: color }}>
      <div className="aqc-name">{name}</div>
      <div className="aqc-stats">
        <Stat label="waiting"   value={fmt(counts?.waiting)}   />
        <Stat label="active"    value={fmt(counts?.active)}    accent />
        <Stat label="done"      value={completedFromMetrics ?? 0} />
        <Stat label="failed"    value={fmt(counts?.failed)}    danger={counts?.failed > 0} />
      </div>
    </div>
  );
}

function Stat({ label, value, accent, danger }: { label: string; value: number; accent?: boolean; danger?: boolean }) {
  return (
    <div className={`aqc-stat${accent ? " accent" : ""}${danger ? " danger" : ""}`}>
      <span className="aqc-stat-val">{value}</span>
      <span className="aqc-stat-lbl">{label}</span>
    </div>
  );
}

function WorkerHealth({ worker }: { worker: AdminMetrics["worker"] }) {
  return (
    <div className={`admin-worker-health${worker.alive ? " alive" : " dead"}`}>
      <span className="awh-dot" />
      <div>
        <span className="awh-status">{worker.alive ? "Worker Online" : "Worker Offline"}</span>
        <span className="awh-seen">Last heartbeat: {ago(worker.lastSeen)}</span>
      </div>
    </div>
  );
}

function MetricTable({ buckets }: { buckets: Record<string, MetricBucket> }) {
  const rows = Object.entries(buckets);
  if (rows.length === 0) return <p className="admin-empty">No metrics yet — process a file first.</p>;

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Type</th>
          <th>Started</th>
          <th>Completed</th>
          <th>Failed</th>
          <th>Retried</th>
          <th>DLQ</th>
          <th>Avg Duration</th>
          <th>Avg File Size</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([type, b]) => (
          <tr key={type}>
            <td><span className="admin-type-badge">{type}</span></td>
            <td>{b.jobs_started}</td>
            <td className="green">{b.jobs_completed}</td>
            <td className={b.jobs_failed > 0 ? "red" : ""}>{b.jobs_failed}</td>
            <td className={b.jobs_retried > 0 ? "yellow" : ""}>{b.jobs_retried}</td>
            <td className={b.dlq_moved > 0 ? "red" : ""}>{b.dlq_moved}</td>
            <td>{fmtMs(b.avg_duration_ms)}</td>
            <td>{fmtBytes(b.avg_size_bytes)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const [metrics, setMetrics]       = useState<AdminMetrics | null>(null);
  const [failed, setFailed]         = useState<FailedUpload[]>([]);
  const [dlq, setDlq]               = useState<DLQJob[]>([]);
  const [tab, setTab]               = useState<"overview" | "failed" | "dlq">("overview");
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [replayMsg, setReplayMsg]   = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("token")) router.push("/login");
  }, [router]);

  const fetchMetrics = useCallback(async () => {
    try {
      const m = await api.getAdminMetrics();
      setMetrics(m as unknown as AdminMetrics);
      setLastRefresh(new Date());
      setError(null);
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      setError((err?.error as string) || (err?.message as string) || "Failed to load metrics");
    }
  }, []);

  const fetchFailed = useCallback(async () => {
    try {
      const r = await api.getAdminFailed(50);
      setFailed((r as Record<string, unknown>).failed as FailedUpload[]);
    } catch { /* non-fatal */ }
  }, []);

  const fetchDLQ = useCallback(async () => {
    try {
      const r = await api.getAdminDLQ();
      setDlq((r as Record<string, unknown>).dlq as DLQJob[]);
    } catch { /* non-fatal */ }
  }, []);

  // Initial load + poll every 5 s
  useEffect(() => {
    fetchMetrics();
    fetchFailed();
    fetchDLQ();
    const id = setInterval(() => { fetchMetrics(); }, 5000);
    return () => clearInterval(id);
  }, [fetchMetrics, fetchFailed, fetchDLQ]);

  async function handleReplay(jobId: string) {
    setReplayingId(jobId);
    setReplayMsg(null);
    try {
      await api.replayDLQJob(jobId);
      setReplayMsg("Re-enqueued successfully ✓");
      fetchDLQ();
      fetchMetrics();
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      setReplayMsg((err?.error as string) || "Replay failed");
    } finally {
      setReplayingId(null);
    }
  }

  const q = metrics?.queues;
  const w = metrics?.worker;
  const buckets = w?.metrics?.buckets ?? {};

  return (
    <div className="admin-page">
      {/* ── Page header ── */}
      <div className="admin-header">
        <div>
          <h2>System Dashboard</h2>
          <p className="subtitle">
            Queue depths · Worker health · Processing metrics · DLQ
            {lastRefresh && (
              <span className="admin-refresh-hint"> · refreshed {ago(lastRefresh.toISOString())}</span>
            )}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => { fetchMetrics(); fetchFailed(); fetchDLQ(); }}>
          ↺ Refresh
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Tabs ── */}
      <div className="admin-tabs">
        {(["overview", "failed", "dlq"] as const).map((t) => (
          <button
            key={t}
            className={`admin-tab${tab === t ? " active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "overview" && "📊 Overview"}
            {t === "failed"   && `⚠️ Failed Uploads ${failed.length > 0 ? `(${failed.length})` : ""}`}
            {t === "dlq"      && `☠️ Dead-Letter Queue ${dlq.length > 0 ? `(${dlq.length})` : ""}`}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW tab ── */}
      {tab === "overview" && (
        <>
          {/* Worker health */}
          {w && <WorkerHealth worker={w} />}

          {/* Queue depth cards */}
          <div className="admin-section-title">Queue Depths</div>
          <div className="admin-queue-grid">
            <QueueCard name="🖼 Image"  counts={q?.image!} completedFromMetrics={metrics?.worker.metrics?.buckets?.image?.jobs_completed}  color="var(--accent)" />
            <QueueCard name="📄 PDF"    counts={q?.pdf!}   completedFromMetrics={metrics?.worker.metrics?.buckets?.pdf?.jobs_completed}    color="#f59e0b" />
            <QueueCard name="🎬 Video"  counts={q?.video!} completedFromMetrics={metrics?.worker.metrics?.buckets?.video?.jobs_completed}   color="#8b5cf6" />
            <QueueCard name="☠️ DLQ"    counts={q?.dlq!}                                                                                   color="var(--red)" />
          </div>

          {/* Processing metrics */}
          <div className="admin-section-title" style={{ marginTop: 32 }}>
            Processing Metrics
            {w?.metrics?.capturedAt && (
              <span className="admin-section-hint"> · snapshot from {ago(w.metrics.capturedAt)}</span>
            )}
          </div>
          <MetricTable buckets={buckets} />
        </>
      )}

      {/* ── FAILED tab ── */}
      {tab === "failed" && (
        <>
          <div className="admin-section-title">{failed.length} failed upload{failed.length !== 1 ? "s" : ""}</div>
          {failed.length === 0 ? (
            <p className="admin-empty">No failed uploads 🎉</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Error</th>
                  <th>Failed At</th>
                </tr>
              </thead>
              <tbody>
                {failed.map((f) => (
                  <tr key={f.id}>
                    <td className="admin-filename" title={f.id}>{f.original_filename}</td>
                    <td><span className="admin-type-badge">{f.mime_type.split("/")[1]}</span></td>
                    <td>{fmtBytes(f.size_bytes)}</td>
                    <td className="red admin-error-cell" title={f.error_message}>{f.error_message ?? "—"}</td>
                    <td className="admin-ts">{fmtDate(f.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* ── DLQ tab ── */}
      {tab === "dlq" && (
        <>
          <div className="admin-section-title">
            {dlq.length} job{dlq.length !== 1 ? "s" : ""} in the dead-letter queue
          </div>
          {replayMsg && (
            <div className={`alert ${replayMsg.includes("✓") ? "alert-success" : "alert-error"}`} style={{ marginBottom: 12 }}>
              {replayMsg}
            </div>
          )}
          {dlq.length === 0 ? (
            <p className="admin-empty">DLQ is empty 🎉</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Upload ID</th>
                  <th>Queue</th>
                  <th>Type</th>
                  <th>Attempts</th>
                  <th>Error</th>
                  <th>Failed At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dlq.map((j) => (
                  <tr key={j.dlqJobId}>
                    <td className="admin-id" title={j.uploadId}>{j.uploadId?.slice(0, 8)}…</td>
                    <td>{j.originalQueue}</td>
                    <td><span className="admin-type-badge">{j.mimeType?.split("/")[1] ?? "?"}</span></td>
                    <td>{j.attemptsMade}</td>
                    <td className="red admin-error-cell" title={j.errorMessage}>{j.errorMessage}</td>
                    <td className="admin-ts">{j.failedAt ? fmtDate(j.failedAt) : "—"}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={replayingId === j.dlqJobId}
                        onClick={() => handleReplay(j.dlqJobId)}
                      >
                        {replayingId === j.dlqJobId ? "…" : "↺ Replay"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
