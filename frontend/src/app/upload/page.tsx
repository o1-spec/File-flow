"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import api from "../../lib/api";
import { useRouter } from "next/navigation";

/* ── Types ──────────────────────────────────────────────── */
type UploadStatus =
  | "idle"
  | "uploading"
  | "uploaded"
  | "processing"
  | "PROCESSED"
  | "FAILED"
  | "error";

type UploadRecord = { id?: string; status?: string; raw_key?: string; processed_key?: string; [k: string]: unknown };

const ACCEPTED = ["image/png", "image/jpeg", "application/pdf", "video/mp4"];
const ACCEPTED_EXT = ".png, .jpg, .jpeg, .pdf, .mp4";

/* ── Helpers ─────────────────────────────────────────────── */
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

const STEPS = ["Start Upload", "Transfer to S3", "Queue Worker", "Complete"];
const statusToStep: Record<string, number> = {
  idle: -1,
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
    idle: "Idle",
    uploading: "Uploading",
    uploaded: "Uploaded",
    processing: "Processing",
    PROCESSED: "Processed",
    FAILED: "Failed",
    error: "Error",
  };
  return map[s] ?? s;
}

/* ── Page ─────────────────────────────────────────────────── */
export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [record, setRecord] = useState<UploadRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Redirect if not logged in */
  useEffect(() => {
    if (!localStorage.getItem("token")) router.push("/login");
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [router]);

  /* Polling effect */
  useEffect(() => {
    if (!uploadId) return;
    if (pollRef.current) clearInterval(pollRef.current);

    const tick = async () => {
      try {
        const r: UploadRecord = await api.getUpload(uploadId);
        setRecord(r);
        const s = (r.status as UploadStatus) ?? "processing";
        setUploadStatus(s);
        if (s === "PROCESSED" || s === "FAILED") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
        }
      } catch (e: unknown) {
        const err = e as Record<string, unknown>;
        setError((err?.message as string) || "Polling error");
      }
    };

    tick(); // immediate first tick
    pollRef.current = setInterval(tick, 2000);
  }, [uploadId]);

  /* ── Drag & Drop ──────────────────────────────────────── */
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && ACCEPTED.includes(f.type)) { setFile(f); setError(null); }
    else setError("Unsupported file type. Please use PNG, JPG, PDF, or MP4.");
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
  };

  /* ── Upload flow ─────────────────────────────────────── */
  async function handleUpload() {
    if (!file) { setError("Please select a file first."); return; }
    setError(null);
    setBusy(true);

    try {
      // 1 — /uploads/start
      setUploadStatus("uploading");
      const start = await api.startUpload({ filename: file.name, mimeType: file.type, size: file.size });
      const presignedUrl: string = start.presignedUrl || start.presigned_url || start.url;
      const newId: string = start.uploadId || start.upload_id || start.id;
      if (!presignedUrl || !newId) throw new Error("startUpload did not return presignedUrl or uploadId");
      setUploadId(newId);

      // 2 — PUT to S3
      const putRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) throw new Error(`S3 upload failed: ${putRes.status} ${putRes.statusText}`);
      setUploadStatus("uploaded");

      // 3 — /uploads/complete
      await api.completeUpload(newId);
      setUploadStatus("processing");
      // polling effect starts from here
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      setError((err?.message as string) || JSON.stringify(e));
      setUploadStatus("error");
    } finally {
      setBusy(false);
    }
  }

  /* ── Download ────────────────────────────────────────── */
  async function handleDownload() {
    if (!uploadId) return;
    try {
      const res = await api.getDownload(uploadId);
      const url: string = res.downloadUrl || res.url || res.download_url;
      if (!url) throw new Error("No download URL returned");
      window.open(url, "_blank");
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      setError((err?.message as string) || "Download failed");
    }
  }

  /* ── Reset ───────────────────────────────────────────── */
  function handleReset() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setFile(null);
    setUploadId(null);
    setUploadStatus("idle");
    setRecord(null);
    setError(null);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  /* ── Current step index ──────────────────────────────── */
  const currentStep = statusToStep[uploadStatus] ?? -1;
  const isTerminal = uploadStatus === "PROCESSED" || uploadStatus === "FAILED" || uploadStatus === "error";

  return (
    <div className="upload-page">
      {/* Header */}
      <h2>Upload a File</h2>
      <p className="subtitle">Supported formats: PNG, JPG, PDF, MP4 — direct to S3 via pre-signed URL.</p>

      {/* ── Drop zone ── */}
      {uploadStatus === "idle" && (
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
          <span className="dz-label">Drop your file here</span>
          <span className="dz-sub">or click to browse · {ACCEPTED_EXT}</span>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            onChange={onFileChange}
            style={{ display: "none" }}
          />
        </div>
      )}

      {/* ── Selected file bar ── */}
      {file && uploadStatus === "idle" && (
        <div className="file-info-bar">
          <span className="fi-icon">{fileIcon(file.type)}</span>
          <div>
            <div className="fi-name">{file.name}</div>
            <div className="fi-size">{formatSize(file.size)}</div>
          </div>
          <button
            className="btn btn-ghost btn-sm fi-remove"
            onClick={handleReset}
            title="Remove file"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Start Upload button ── */}
      {uploadStatus === "idle" && (
        <button
          className="btn btn-primary"
          onClick={handleUpload}
          disabled={!file || busy}
          style={{ marginTop: 16 }}
        >
          {busy ? <><span className="spinner" /> Working…</> : "Start Upload"}
        </button>
      )}

      {/* ── Steps tracker ── */}
      {uploadStatus !== "idle" && (
        <>
          <div className="steps" style={{ marginTop: 28 }}>
            {STEPS.map((label, i) => {
              const isDone = uploadStatus === "PROCESSED"
                ? true                // all steps green when fully processed
                : currentStep > i;
              const isActive = !isDone && currentStep === i;
              return (
                <React.Fragment key={label}>
                  {i > 0 && (
                    <div className={`step-connector${(uploadStatus === "PROCESSED" || currentStep > i - 1) ? " done" : ""}`} />
                  )}
                  <div className={`step${isActive ? " active" : ""}${isDone ? " done" : ""}`}>
                    <div className="step-circle">
                      {isDone ? "✓" : i + 1}
                    </div>
                    <span className="step-label">{label}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Current status badge */}
          <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
            <span className={badgeClass(uploadStatus)}>{badgeLabel(uploadStatus)}</span>
            {!isTerminal && <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Polling every 2 s…</span>}
          </div>
        </>
      )}

      {/* ── Record card ── */}
      {record && (
        <div className="record-card">
          <div className="rc-header">
            <span className="rc-title">Upload Record</span>
            <span className={badgeClass(uploadStatus)}>{badgeLabel(uploadStatus)}</span>
          </div>
          {Object.entries(record)
            .filter(([, v]) => v !== null && v !== undefined && v !== "")
            .map(([k, v]) => (
              <div key={k} className="record-row">
                <span className="rr-key">{k}</span>
                <span className="rr-val">{String(v)}</span>
              </div>
            ))}
        </div>
      )}

      {/* ── Actions ── */}
      {uploadStatus === "PROCESSED" && (
        <button
          className="btn btn-success"
          onClick={handleDownload}
          style={{ marginTop: 16 }}
        >
          📥 Download Processed File
        </button>
      )}

      {isTerminal && (
        <button
          className="btn btn-ghost"
          onClick={handleReset}
          style={{ marginTop: 12 }}
        >
          ↩ Upload another file
        </button>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="alert alert-error" style={{ marginTop: 16 }}>
          ✕ {error}
        </div>
      )}
    </div>
  );
}

