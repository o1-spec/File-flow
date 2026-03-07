"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";

function IconImage() {
  return (
    <svg className="queue-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}
function IconPDF() {
  return (
    <svg className="queue-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}
function IconVideo() {
  return (
    <svg className="queue-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  );
}
function IconSkull() {
  return (
    <svg className="queue-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="11" r="8" />
      <path d="M8 16v1a2 2 0 0 0 4 0v-1M16 16v1a2 2 0 0 0-4 0v-1" />
      <line x1="9.5" y1="10" x2="9.5" y2="10" strokeWidth="3" />
      <line x1="14.5" y1="10" x2="14.5" y2="10" strokeWidth="3" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function IconWarning() {
  return (
    <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function IconDLQ() {
  return (
    <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
function IconAllUploads() {
  return (
    <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge badge-${status.toLowerCase()}`}>{status}</span>;
}

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

interface AdminUpload {
  id: string;
  email: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminUploadDetail extends AdminUpload {
  raw_key: string | null;
  processed_key: string | null;
  user_email: string;
}

interface AdminUser {
  id: string;
  email: string;
  joined_at: string;
  total_uploads: number;
  processed_uploads: number;
  failed_uploads: number;
  storage_bytes: number;
  last_upload_at: string | null;
}

const ALL_STATUSES = ["CREATED", "UPLOADED", "PROCESSING", "PROCESSED", "FAILED"] as const;

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

function QueueCard({ icon, name, counts, completedFromMetrics, color }: {
  icon: React.ReactNode;
  name: string;
  counts: JobCounts;
  completedFromMetrics?: number;
  color: string;
}) {
  return (
    <div className="admin-queue-card" style={{ borderTopColor: color }}>
      <div className="aqc-name">{icon}{name}</div>
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

export default function AdminPage() {
  const router = useRouter();
  const [metrics, setMetrics]       = useState<AdminMetrics | null>(null);
  const [failed, setFailed]         = useState<FailedUpload[]>([]);
  const [dlq, setDlq]               = useState<DLQJob[]>([]);
  const [tab, setTab]               = useState<"overview" | "failed" | "dlq" | "uploads" | "users">("overview");
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [replayMsg, setReplayMsg]   = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const [adminUploads, setAdminUploads]         = useState<AdminUpload[]>([]);
  const [adminUploadsTotal, setAdminUploadsTotal] = useState(0);
  const [adminUploadsPage, setAdminUploadsPage]   = useState(1);
  const [adminUploadsStatus, setAdminUploadsStatus] = useState<string>("");
  const [adminUploadsLoading, setAdminUploadsLoading] = useState(false);
  const ADMIN_UPLOADS_LIMIT = 50;

  // Users tab state
  const [adminUsers, setAdminUsers]         = useState<AdminUser[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);

  // Upload detail slide-over
  const [detailUpload, setDetailUpload]     = useState<AdminUploadDetail | null>(null);
  const [detailRawUrl, setDetailRawUrl]     = useState<string | null>(null);
  const [detailProcessedUrl, setDetailProcessedUrl] = useState<string | null>(null);
  const [detailLoading, setDetailLoading]   = useState(false);

  // Admin delete confirm
  const [adminDeleteTarget, setAdminDeleteTarget] = useState<AdminUpload | null>(null);
  const [adminDeleting, setAdminDeleting]         = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.push("/login"); return; }
    if (localStorage.getItem("isAdmin") !== "1") router.push("/upload");
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

  const fetchAdminUploads = useCallback(async (page: number, status: string) => {
    setAdminUploadsLoading(true);
    try {
      const r = await api.getAdminUploads(page, ADMIN_UPLOADS_LIMIT, status || undefined);
      const res = r as Record<string, unknown>;
      setAdminUploads(res.uploads as AdminUpload[]);
      setAdminUploadsTotal(res.total as number);
    } catch { /* non-fatal */ }
    finally { setAdminUploadsLoading(false); }
  }, []);

  const fetchAdminUsers = useCallback(async () => {
    setAdminUsersLoading(true);
    try {
      const r = await api.getAdminUsers();
      setAdminUsers((r as Record<string, unknown>).users as AdminUser[]);
    } catch { /* non-fatal */ }
    finally { setAdminUsersLoading(false); }
  }, []);

  async function openDetail(upload: AdminUpload) {
    setDetailLoading(true);
    setDetailUpload(null);
    setDetailRawUrl(null);
    setDetailProcessedUrl(null);
    try {
      const r = await api.getAdminUploadDetail(upload.id);
      const res = r as Record<string, unknown>;
      setDetailUpload(res.upload as AdminUploadDetail);
      setDetailRawUrl(res.rawUrl as string | null);
      setDetailProcessedUrl(res.processedUrl as string | null);
    } catch { /* show empty modal */ }
    finally { setDetailLoading(false); }
  }

  async function handleAdminDelete() {
    if (!adminDeleteTarget) return;
    setAdminDeleting(true);
    try {
      await api.deleteAdminUpload(adminDeleteTarget.id);
      setAdminUploads((prev) => prev.filter((u) => u.id !== adminDeleteTarget.id));
      setAdminUploadsTotal((t) => Math.max(0, t - 1));
      // If the deleted upload was open in the detail pane, close it
      if (detailUpload?.id === adminDeleteTarget.id) setDetailUpload(null);
    } catch { /* non-fatal */ }
    finally {
      setAdminDeleting(false);
      setAdminDeleteTarget(null);
    }
  }

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
        <button className="btn btn-ghost btn-sm" onClick={() => { fetchMetrics(); fetchFailed(); fetchDLQ(); if (tab === "uploads") fetchAdminUploads(adminUploadsPage, adminUploadsStatus); }}>
          ↺ Refresh
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Tabs ── */}
      <div className="admin-tabs">
        {(["overview", "failed", "dlq", "uploads", "users"] as const).map((t) => (
          <button
            key={t}
            className={`admin-tab${tab === t ? " active" : ""}`}
            onClick={() => {
              setTab(t);
              if (t === "uploads") fetchAdminUploads(adminUploadsPage, adminUploadsStatus);
              if (t === "users") fetchAdminUsers();
            }}
          >
            {t === "overview" && <><IconChart />Overview</>}
            {t === "failed"   && <><IconWarning />{`Failed Uploads${failed.length > 0 ? ` (${failed.length})` : ""}`}</>}
            {t === "dlq"      && <><IconDLQ />{`Dead-Letter Queue${dlq.length > 0 ? ` (${dlq.length})` : ""}`}</>}
            {t === "uploads"  && <><IconAllUploads />{`All Uploads${adminUploadsTotal > 0 ? ` (${adminUploadsTotal})` : ""}`}</>}
            {t === "users"    && <><IconUsers />{`Users${adminUsers.length > 0 ? ` (${adminUsers.length})` : ""}`}</>}
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
            <QueueCard icon={<IconImage />}  name="Image"  counts={q?.image!} completedFromMetrics={metrics?.worker.metrics?.buckets?.image?.jobs_completed}  color="var(--accent)" />
            <QueueCard icon={<IconPDF />}    name="PDF"    counts={q?.pdf!}   completedFromMetrics={metrics?.worker.metrics?.buckets?.pdf?.jobs_completed}    color="#f59e0b" />
            <QueueCard icon={<IconVideo />}  name="Video"  counts={q?.video!} completedFromMetrics={metrics?.worker.metrics?.buckets?.video?.jobs_completed}   color="#8b5cf6" />
            <QueueCard icon={<IconSkull />}  name="DLQ"    counts={q?.dlq!}                                                                                    color="var(--red)" />
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
            <p className="admin-empty">No failed uploads — all clear.</p>
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
            <p className="admin-empty">Dead-letter queue is empty — all clear.</p>
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

      {/* ── ALL UPLOADS tab ── */}
      {tab === "uploads" && (
        <>
          {/* Toolbar: status filter */}
          <div className="admin-uploads-toolbar">
            <div className="admin-section-title" style={{ margin: 0 }}>
              {adminUploadsLoading ? "Loading…" : `${adminUploadsTotal} total upload${adminUploadsTotal !== 1 ? "s" : ""}`}
            </div>
            <div className="admin-uploads-filters">
              <label className="admin-filter-label">Status</label>
              <select
                className="admin-filter-select"
                value={adminUploadsStatus}
                onChange={(e) => {
                  const s = e.target.value;
                  setAdminUploadsStatus(s);
                  setAdminUploadsPage(1);
                  fetchAdminUploads(1, s);
                }}
              >
                <option value="">All</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {adminUploads.length === 0 && !adminUploadsLoading ? (
            <p className="admin-empty">No uploads match the current filter.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User</th>
                  <th>File</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminUploads.map((u) => (
                  <tr key={u.id}>
                    <td className="admin-id" title={u.id}>{u.id.slice(0, 8)}…</td>
                    <td className="admin-email" title={u.email}>{u.email}</td>
                    <td className="admin-filename" title={u.original_filename}>{u.original_filename}</td>
                    <td><span className="admin-type-badge">{u.mime_type.split("/")[1] ?? u.mime_type}</span></td>
                    <td className="admin-ts">{fmtBytes(u.size_bytes)}</td>
                    <td><StatusBadge status={u.status} /></td>
                    <td className="admin-ts">{fmtDate(u.created_at)}</td>
                    <td>
                      <div className="uploads-actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openDetail(u)}
                          title="View details"
                        >
                          View
                        </button>
                        <button
                          className="btn btn-ghost btn-sm uploads-delete-btn"
                          onClick={() => setAdminDeleteTarget(u)}
                          title="Delete upload"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {adminUploadsTotal > ADMIN_UPLOADS_LIMIT && (
            <div className="admin-uploads-pagination">
              <button
                className="btn btn-ghost btn-sm"
                disabled={adminUploadsPage <= 1}
                onClick={() => {
                  const p = adminUploadsPage - 1;
                  setAdminUploadsPage(p);
                  fetchAdminUploads(p, adminUploadsStatus);
                }}
              >
                ← Prev
              </button>
              <span className="admin-pagination-info">
                Page {adminUploadsPage} of {Math.ceil(adminUploadsTotal / ADMIN_UPLOADS_LIMIT)}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={adminUploadsPage >= Math.ceil(adminUploadsTotal / ADMIN_UPLOADS_LIMIT)}
                onClick={() => {
                  const p = adminUploadsPage + 1;
                  setAdminUploadsPage(p);
                  fetchAdminUploads(p, adminUploadsStatus);
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* ── USERS tab ── */}
      {tab === "users" && (
        <>
          <div className="admin-uploads-toolbar">
            <div className="admin-section-title" style={{ margin: 0 }}>
              {adminUsersLoading ? "Loading…" : `${adminUsers.length} registered user${adminUsers.length !== 1 ? "s" : ""}`}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={fetchAdminUsers}>↺ Refresh</button>
          </div>

          {adminUsers.length === 0 && !adminUsersLoading ? (
            <p className="admin-empty">No users yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Total</th>
                  <th>Processed</th>
                  <th>Failed</th>
                  <th>Storage Used</th>
                  <th>Last Upload</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500 }}>{u.email}</td>
                    <td className="admin-ts">{fmtDate(u.joined_at)}</td>
                    <td>{u.total_uploads}</td>
                    <td className="green">{u.processed_uploads}</td>
                    <td className={u.failed_uploads > 0 ? "red" : ""}>{u.failed_uploads}</td>
                    <td className="admin-ts">{fmtBytes(u.storage_bytes)}</td>
                    <td className="admin-ts">{u.last_upload_at ? ago(u.last_upload_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* ── UPLOAD DETAIL slide-over ── */}
      {(detailUpload || detailLoading) && (
        <div className="detail-backdrop" onClick={() => setDetailUpload(null)}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="detail-header">
              <span className="detail-title">Upload Detail</span>
              <button className="detail-close" onClick={() => setDetailUpload(null)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {detailLoading ? (
              <div className="detail-loading">Loading…</div>
            ) : detailUpload ? (
              <div className="detail-body">
                {/* Meta grid */}
                <div className="detail-meta">
                  <div className="detail-row"><span className="detail-label">File</span><span className="detail-val" title={detailUpload.original_filename}>{detailUpload.original_filename}</span></div>
                  <div className="detail-row"><span className="detail-label">Uploader</span><span className="detail-val">{detailUpload.user_email ?? detailUpload.email}</span></div>
                  <div className="detail-row"><span className="detail-label">Type</span><span className="detail-val"><span className="admin-type-badge">{detailUpload.mime_type}</span></span></div>
                  <div className="detail-row"><span className="detail-label">Size</span><span className="detail-val">{fmtBytes(detailUpload.size_bytes)}</span></div>
                  <div className="detail-row"><span className="detail-label">Status</span><span className="detail-val"><StatusBadge status={detailUpload.status} /></span></div>
                  <div className="detail-row"><span className="detail-label">Uploaded</span><span className="detail-val">{fmtDate(detailUpload.created_at)}</span></div>
                  <div className="detail-row"><span className="detail-label">Updated</span><span className="detail-val">{fmtDate(detailUpload.updated_at)}</span></div>
                  {detailUpload.error_message && (
                    <div className="detail-row detail-error-row">
                      <span className="detail-label">Error</span>
                      <span className="detail-val red">{detailUpload.error_message}</span>
                    </div>
                  )}
                </div>

                {/* Preview area */}
                {detailRawUrl && detailUpload.mime_type.startsWith("image/") && (
                  <div className="detail-preview-section">
                    <div className="detail-preview-label">Raw file preview</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={detailRawUrl} alt="raw preview" className="detail-img-preview" />
                  </div>
                )}
                {detailProcessedUrl && detailUpload.mime_type.startsWith("image/") && (
                  <div className="detail-preview-section">
                    <div className="detail-preview-label">Processed file preview</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={detailProcessedUrl} alt="processed preview" className="detail-img-preview" />
                  </div>
                )}
                {detailProcessedUrl && detailUpload.mime_type.startsWith("video/") && (
                  <div className="detail-preview-section">
                    <div className="detail-preview-label">Processed video</div>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video src={detailProcessedUrl} controls className="detail-video-preview" />
                  </div>
                )}

                {/* Action buttons */}
                <div className="detail-actions">
                  {detailRawUrl && (
                    <a href={detailRawUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                      ↓ Raw file
                    </a>
                  )}
                  {detailProcessedUrl && (
                    <a href={detailProcessedUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                      ↓ Processed file
                    </a>
                  )}
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ marginLeft: "auto" }}
                    onClick={() => {
                      setAdminDeleteTarget(detailUpload as unknown as AdminUpload);
                      setDetailUpload(null);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── ADMIN DELETE confirm modal ── */}
      {adminDeleteTarget && (
        <div className="modal-backdrop" onClick={() => setAdminDeleteTarget(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon" style={{ color: "var(--red)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </div>
            <h3 className="modal-title">Delete upload?</h3>
            <p className="modal-body">
              <strong style={{ color: "var(--text-primary)" }}>{adminDeleteTarget.original_filename}</strong>
              {" "}will be permanently removed from storage and the database. This cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setAdminDeleteTarget(null)} disabled={adminDeleting}>Cancel</button>
              <button className="btn btn-danger" onClick={handleAdminDelete} disabled={adminDeleting}>
                {adminDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
