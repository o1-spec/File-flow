"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import api from "../../lib/api";
import { useRouter } from "next/navigation";

/* ── Constants ───────────────────────────────────────────── */
const ACCEPTED = ["image/png", "image/jpeg", "application/pdf", "video/mp4", "video/quicktime"];
const ACCEPTED_EXT = ".png, .jpg, .jpeg, .pdf, .mp4, .mov";
const STEPS = ["Start", "Transfer", "Processing", "Complete"];
const BASE = "http://localhost:4000";

/* ── Types ───────────────────────────────────────────────── */
type UploadStatus =
  | "queued"
  | "uploading"
  | "uploaded"
  | "processing"
  | "PROCESSED"
  | "FAILED"
  | "error";

interface FileEntry {
  localId: string;
  file: File;
  status: UploadStatus;
  uploadId: string | null;
  error: string | null;
  progress: number;
  record: Record<string, unknown> | null;
}

/* ── Helpers ─────────────────────────────────────────────── */
function uid() {
  return Math.random().toString(36).slice(2);
}

/* SVG file-type icons — no emojis */
function FileIcon({ type }: { type: string }) {
  if (type.startsWith("image/")) {
    return (
      <svg className="fq-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    );
  }
  if (type === "application/pdf") {
    return (
      <svg className="fq-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
      </svg>
    );
  }
  if (type.startsWith("video/")) {
    return (
      <svg className="fq-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" />
      </svg>
    );
  }
  return (
    <svg className="fq-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const statusToStep: Record<string, number> = {
  queued: -1,
  uploading: 0,
  uploaded: 1,
  processing: 2,
  PROCESSED: 3,
  FAILED: 2,
  error: 0,
};

function badgeClass(s: UploadStatus) {
  return `badge badge-${s.toLowerCase()}`;
}

function badgeLabel(s: UploadStatus) {
  const map: Record<UploadStatus, string> = {
    queued: "Queued",
    uploading: "Uploading",
    uploaded: "Uploaded",
    processing: "Processing",
    PROCESSED: "Processed",
    FAILED: "Failed",
    error: "Error",
  };
  return map[s] ?? s;
}

function isTerminal(s: UploadStatus) {
  return s === "PROCESSED" || s === "FAILED" || s === "error";
}

/* ── Per-file row ────────────────────────────────────────── */
function FileRow({
  entry,
  onRemove,
  onDownload,
}: {
  entry: FileEntry;
  onRemove: (localId: string) => void;
  onDownload: (uploadId: string, localId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const currentStep = statusToStep[entry.status] ?? -1;
  const terminal = isTerminal(entry.status);

  const hasRecord = entry.record !== null && typeof entry.record === "object";
  const recordEntries = hasRecord
    ? Object.entries(entry.record as Record<string, unknown>).filter(([, v]) => v !== null && v !== undefined && v !== "")
    : [];

  return (
    <div className={`fq-item${terminal ? (entry.status === "PROCESSED" ? " fq-done" : " fq-failed") : ""}`}>
      {/* ── Row header ── */}
      <div className="fq-header">
        <span className="fq-icon"><FileIcon type={entry.file.type} /></span>
        <div className="fq-meta">
          <span className="fq-name" title={entry.file.name}>{entry.file.name}</span>
          <span className="fq-size">{formatSize(entry.file.size)}</span>
        </div>
        <span className={badgeClass(entry.status)}>{badgeLabel(entry.status)}</span>
        {hasRecord && (
          <button
            className="btn btn-ghost btn-sm fq-toggle"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Hide details" : "Show details"}
          >
            {expanded ? "▲" : "▼"}
          </button>
        )}
        {(entry.status === "queued" || terminal) && (
          <button
            className="btn btn-ghost btn-sm fq-remove"
            onClick={() => onRemove(entry.localId)}
            title="Remove"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Progress bar (uploading only) ── */}
      {entry.status === "uploading" && (
        <div className="fq-progress-track">
          <div className="fq-progress-bar" style={{ width: `${entry.progress}%` }} />
          <span className="fq-progress-pct">{entry.progress}%</span>
        </div>
      )}

      {/* ── Steps tracker ── */}
      {entry.status !== "queued" && (
        <div className="steps fq-steps-full" style={{ marginTop: 16 }}>
          {STEPS.map((label, i) => {
            const isDone = entry.status === "PROCESSED" ? true : currentStep > i;
            const isActive = !isDone && currentStep === i;
            const isFail = entry.status === "FAILED" && i === 2;
            return (
              <React.Fragment key={label}>
                {i > 0 && (
                  <div className={`step-connector${entry.status === "PROCESSED" || currentStep > i - 1 ? " done" : ""}`} />
                )}
                <div className={`step${isActive ? " active" : ""}${isDone ? " done" : ""}${isFail ? " failed" : ""}`}>
                  <div className="step-circle">{isFail ? "✕" : isDone ? "✓" : i + 1}</div>
                  <span className="step-label">{label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* ── SSE live indicator ── */}
      {!terminal && entry.status !== "queued" && entry.status !== "uploading" && (
        <div className="fq-polling-hint">
          <span className="sse-dot" /> Live updates via SSE
        </div>
      )}

      {/* ── Error message ── */}
      {entry.error && (
        <div className="alert alert-error fq-alert">✕ {entry.error}</div>
      )}

      {/* ── Download button ── */}
      {entry.status === "PROCESSED" && entry.uploadId && (
        <button
          className="btn btn-success btn-sm fq-download"
          onClick={() => onDownload(entry.uploadId!, entry.localId)}
        >
          Download Processed File
        </button>
      )}

      {/* ── Collapsible record details ── */}
      {hasRecord && expanded && (
        <div className="fq-record">
          <div className="fq-record-title">Upload Record</div>
          {recordEntries.map(([k, v]) => (
            <div key={k} className="record-row">
              <span className="rr-key">{k}</span>
              <span className="rr-val">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */
export default function UploadPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** map localId → EventSource */
  const sseRefs = useRef<Map<string, EventSource>>(new Map());

  /* Auth guard */
  useEffect(() => {
    if (!localStorage.getItem("token")) router.push("/login");
    return () => sseRefs.current.forEach((es) => es.close());
  }, [router]);

  /* ── Entry state helpers ──────────────────────────────── */
  function patch(localId: string, update: Partial<FileEntry>) {
    setEntries((prev) =>
      prev.map((e) => (e.localId === localId ? { ...e, ...update } : e))
    );
  }

  /* ── Add files ────────────────────────────────────────── */
  function addFiles(files: FileList | File[]) {
    const valid: FileEntry[] = [];
    const rejected: string[] = [];

    Array.from(files).forEach((f) => {
      if (ACCEPTED.includes(f.type)) {
        valid.push({ localId: uid(), file: f, status: "queued", uploadId: null, error: null, progress: 0, record: null });
      } else {
        rejected.push(f.name);
      }
    });

    if (rejected.length) {
      setGlobalError(`Skipped unsupported file(s): ${rejected.join(", ")}`);
    } else {
      setGlobalError(null);
    }

    if (valid.length) setEntries((prev) => [...prev, ...valid]);
  }

  /* ── Drag & Drop ──────────────────────────────────────── */
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  };

  /* ── SSE: subscribe for one upload ───────────────────── */
  function startSSE(localId: string, uploadId: string) {
    if (sseRefs.current.has(localId)) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const url = `${BASE}/uploads/${encodeURIComponent(uploadId)}/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as {
          upload?: Record<string, unknown>;
          done?: boolean;
          error?: string;
        };

        if (msg.error) {
          patch(localId, { status: "error", error: msg.error });
          es.close();
          sseRefs.current.delete(localId);
          return;
        }

        if (msg.upload) {
          const row = msg.upload;
          const s = (row.status as UploadStatus) ?? "processing";
          patch(localId, { status: s, record: row });
          if (s === "FAILED") {
            patch(localId, { error: (row.error_message as string) || "Processing failed" });
          }
        }

        if (msg.done) {
          es.close();
          sseRefs.current.delete(localId);
        }
      } catch { /* malformed frame — ignore */ }
    };

    es.onerror = () => {
      // SSE reconnects automatically; only close on terminal status
      // If already terminal, clean up
      setEntries((prev) => {
        const e = prev.find((x) => x.localId === localId);
        if (e && isTerminal(e.status)) {
          es.close();
          sseRefs.current.delete(localId);
        }
        return prev;
      });
    };

    sseRefs.current.set(localId, es);
  }

  /* ── Upload one file ──────────────────────────────────── */
  async function uploadEntry(entry: FileEntry) {
    const { localId, file } = entry;
    patch(localId, { status: "uploading", error: null, progress: 0 });

    try {
      // 1 — start
      const start = await api.startUpload({ filename: file.name, mimeType: file.type, size: file.size });
      const presignedUrl = (start.presignedUrl || start.presigned_url || start.url) as string;
      const newId = (start.uploadId || start.upload_id || start.id) as string;
      if (!presignedUrl || !newId) throw new Error("startUpload missing presignedUrl or uploadId");

      patch(localId, { uploadId: newId });

      // 2 — PUT to S3 with XHR for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            patch(localId, { progress: Math.round((ev.loaded / ev.total) * 100) });
          }
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`S3 PUT failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("S3 network error"));
        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      });

      patch(localId, { status: "uploaded", progress: 100 });

      // 3 — complete
      await api.completeUpload(newId);
      patch(localId, { status: "processing" });

      // 4 — open SSE stream (replaces polling)
      startSSE(localId, newId);
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      patch(localId, {
        status: "error",
        error: (err?.error as string) || (err?.message as string) || "Upload failed",
      });
    }
  }

  /* ── Upload all queued files ──────────────────────────── */
  function handleUploadAll() {
    entries.filter((e) => e.status === "queued").forEach((e) => uploadEntry(e));
  }

  /* ── Remove entry ─────────────────────────────────────── */
  function handleRemove(localId: string) {
    sseRefs.current.get(localId)?.close();
    sseRefs.current.delete(localId);
    setEntries((prev) => prev.filter((e) => e.localId !== localId));
  }

  /* ── Download ─────────────────────────────────────────── */
  async function handleDownload(uploadId: string, localId: string) {
    try {
      const res = await api.getDownload(uploadId);
      const url = res.downloadUrl as string;
      if (!url) throw new Error("No downloadUrl returned");
      window.open(url, "_blank");
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      patch(localId, { error: (err?.error as string) || (err?.message as string) || "Download failed" });
    }
  }

  /* ── Clear completed ──────────────────────────────────── */
  function handleClearDone() {
    setEntries((prev) => {
      prev.filter((e) => isTerminal(e.status)).forEach((e) => {
        sseRefs.current.get(e.localId)?.close();
        sseRefs.current.delete(e.localId);
      });
      return prev.filter((e) => !isTerminal(e.status));
    });
  }

  const queuedCount = entries.filter((e) => e.status === "queued").length;
  const doneCount = entries.filter((e) => isTerminal(e.status)).length;
  const activeCount = entries.filter((e) => !isTerminal(e.status) && e.status !== "queued").length;

  return (
    <div className="upload-page">
      {/* ── Header ── */}
      <div className="up-header">
        <div>
          <h2>Upload Files</h2>
          <p className="subtitle">
            Drag &amp; drop any mix of images, PDFs, and videos — each processes independently.
          </p>
        </div>
        {entries.length > 0 && (
          <div className="up-header-actions">
            {queuedCount > 0 && (
              <button className="btn btn-primary btn-sm" onClick={handleUploadAll}>
                Upload {queuedCount} file{queuedCount !== 1 ? "s" : ""}
              </button>
            )}
            {doneCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={handleClearDone}>
                Clear done
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Global error ── */}
      {globalError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          ✕ {globalError}
        </div>
      )}

      {/* ── Drop zone ── */}
      <div
        className={`drop-zone${dragging ? " dragging" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        aria-label="File drop zone"
      >
        <svg className="dz-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span className="dz-label">
          {entries.length > 0 ? "Add more files" : "Drop files here"}
        </span>
        <span className="dz-sub">
          or click to browse · {ACCEPTED_EXT} · multiple allowed
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          onChange={onFileChange}
          style={{ display: "none" }}
        />
      </div>

      {/* ── File queue ── */}
      {entries.length > 0 && (
        <div className="fq-list" style={{ marginTop: 24 }}>
          <div className="fq-summary">
            <span>{entries.length} file{entries.length !== 1 ? "s" : ""}</span>
            {activeCount > 0 && <span className="badge badge-processing">{activeCount} active</span>}
            {queuedCount > 0 && <span className="badge badge-idle">{queuedCount} queued</span>}
            {doneCount > 0 && <span className="badge badge-processed">{doneCount} done</span>}
          </div>

          {entries.map((entry) => (
            <FileRow
              key={entry.localId}
              entry={entry}
              onRemove={handleRemove}
              onDownload={handleDownload}
            />
          ))}
        </div>
      )}
    </div>
  );
}
