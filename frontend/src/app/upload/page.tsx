"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import api from "../../lib/api";
import { useRouter } from "next/navigation";

/* ── Constants ───────────────────────────────────────────── */
const ACCEPTED = ["image/png", "image/jpeg", "application/pdf", "video/mp4", "video/quicktime"];
const ACCEPTED_EXT = ".png, .jpg, .jpeg, .pdf, .mp4, .mov";
const STEPS = ["Start", "Transfer", "Processing", "Complete"];

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
  /** stable local id */
  localId: string;
  file: File;
  status: UploadStatus;
  uploadId: string | null;
  error: string | null;
  /** upload progress 0–100 */
  progress: number;
  /** last record returned by GET /uploads/:id */
  record: Record<string, unknown> | null;
}

/* ── Helpers ─────────────────────────────────────────────── */
function uid() {
  return Math.random().toString(36).slice(2);
}

function fileIcon(type: string) {
  if (type.startsWith("image/")) return "🖼️";
  if (type === "application/pdf") return "📄";
  if (type.startsWith("video/")) return "🎬";
  return "📁";
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

  // Show record details only once we have data from the API
  const hasRecord = entry.record !== null && typeof entry.record === "object";
  const recordEntries = hasRecord
    ? Object.entries(entry.record as Record<string, unknown>).filter(([, v]) => v !== null && v !== undefined && v !== "")
    : [];

  return (
    <div className={`fq-item${terminal ? (entry.status === "PROCESSED" ? " fq-done" : " fq-failed") : ""}`}>
      {/* ── Row header ── */}
      <div className="fq-header">
        <span className="fq-icon">{fileIcon(entry.file.type)}</span>
        <div className="fq-meta">
          <span className="fq-name" title={entry.file.name}>{entry.file.name}</span>
          <span className="fq-size">{formatSize(entry.file.size)}</span>
        </div>
        <span className={badgeClass(entry.status)}>{badgeLabel(entry.status)}</span>
        {/* Expand/collapse details toggle — visible once upload has started */}
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

      {/* ── Steps tracker — full labels ── */}
      {entry.status !== "queued" && (
        <div className="steps fq-steps-full" style={{ marginTop: 16 }}>
          {STEPS.map((label, i) => {
            const isDone = entry.status === "PROCESSED" ? true : currentStep > i;
            const isActive = !isDone && currentStep === i;
            const isFail = entry.status === "FAILED" && i === 2;
            return (
              <React.Fragment key={label}>
                {i > 0 && (
                  <div
                    className={`step-connector${
                      entry.status === "PROCESSED" || currentStep > i - 1 ? " done" : ""
                    }`}
                  />
                )}
                <div
                  className={`step${isActive ? " active" : ""}${isDone ? " done" : ""}${
                    isFail ? " failed" : ""
                  }`}
                >
                  <div className="step-circle">{isFail ? "✕" : isDone ? "✓" : i + 1}</div>
                  <span className="step-label">{label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* ── Polling indicator ── */}
      {!terminal && entry.status !== "queued" && entry.status !== "uploading" && (
        <div className="fq-polling-hint">Polling every 2 s…</div>
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
          📥 Download Processed File
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
  /** map localId → poll interval id */
  const pollRefs = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  /* Auth guard */
  useEffect(() => {
    if (!localStorage.getItem("token")) router.push("/login");
    return () => pollRefs.current.forEach((id) => clearInterval(id));
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
    e.target.value = ""; // reset so same file can be added again
  };

  /* ── Start polling for one entry ──────────────────────── */
  function startPolling(localId: string, uploadId: string) {
    if (pollRefs.current.has(localId)) return;

    const tick = async () => {
      try {
        const r = await api.getUpload(uploadId);
        const s = (r.status as UploadStatus) ?? "processing";
        const rec = r && typeof r === "object" ? (r as Record<string, unknown>) : null;
        patch(localId, { status: s, record: rec });
        if (s === "PROCESSED" || s === "FAILED") {
          clearInterval(pollRefs.current.get(localId));
          pollRefs.current.delete(localId);
          if (s === "FAILED") {
            patch(localId, { error: (r.error_message as string) || "Processing failed" });
          }
        }
      } catch {
        // transient — keep polling
      }
    };

    tick();
    pollRefs.current.set(localId, setInterval(tick, 2000));
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

      // 4 — start polling
      startPolling(localId, newId);
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
    const queued = entries.filter((e) => e.status === "queued");
    queued.forEach((e) => uploadEntry(e));
  }

  /* ── Remove entry ─────────────────────────────────────── */
  function handleRemove(localId: string) {
    clearInterval(pollRefs.current.get(localId));
    pollRefs.current.delete(localId);
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
    setEntries((prev) => prev.filter((e) => !isTerminal(e.status)));
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
                ⬆ Upload {queuedCount} file{queuedCount !== 1 ? "s" : ""}
              </button>
            )}
            {doneCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={handleClearDone}>
                🗑 Clear done
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

      {/* ── Drop zone — always visible ── */}
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
        <span className="dz-icon">📤</span>
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
          {/* Summary bar */}
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

