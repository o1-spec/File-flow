"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Upload {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  status: "CREATED" | "UPLOADED" | "PROCESSING" | "PROCESSED" | "FAILED";
  processed_key: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mimeLabel(mime: string) {
  const sub = mime.split("/")[1] ?? mime;
  if (sub === "jpeg") return "jpg";
  if (sub === "quicktime") return "mov";
  if (sub === "x-matroska") return "mkv";
  return sub.slice(0, 8);
}

function StatusBadge({ status }: { status: Upload["status"] }) {
  const cls = `status-badge badge-${status.toLowerCase()}`;
  return <span className={cls}>{status}</span>;
}

function FileTypeIcon({ mime }: { mime: string }) {
  const type = mime.split("/")[0];
  if (type === "image") {
    return (
      <svg className="fq-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    );
  }
  if (type === "video") {
    return (
      <svg className="fq-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" />
      </svg>
    );
  }
  // PDF / generic doc
  return (
    <svg className="fq-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}

// ── Delete confirmation modal ─────────────────────────────────────────────────
function DeleteModal({
  filename,
  onConfirm,
  onCancel,
  loading,
}: {
  filename: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon" style={{ color: "var(--red)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </div>
        <h3 className="modal-title">Delete file?</h3>
        <p className="modal-body">
          <strong style={{ color: "var(--text-primary)" }}>{filename}</strong>
          {" "}will be permanently deleted from storage. This cannot be undone.
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UploadsPage() {
  const router = useRouter();
  const [uploads, setUploads]         = useState<Upload[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Upload | null>(null);
  const [deleting, setDeleting]       = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);

  // Auth guard
  useEffect(() => {
    if (!localStorage.getItem("token")) router.push("/login");
  }, [router]);

  const fetchUploads = useCallback(async () => {
    try {
      setError(null);
      const res = await api.getMyUploads();
      setUploads((res as Record<string, unknown>).uploads as Upload[]);
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      setError((err?.error as string) || (err?.message as string) || "Failed to load uploads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUploads(); }, [fetchUploads]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleDownload(upload: Upload) {
    setDownloadingId(upload.id);
    try {
      const res = await api.getDownload(upload.id);
      const url = (res as Record<string, unknown>).url as string;
      window.open(url, "_blank");
    } catch {
      showToast("Download failed", false);
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteUpload(deleteTarget.id);
      setUploads((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      showToast(`"${deleteTarget.original_filename}" deleted`, true);
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      showToast((err?.error as string) || "Delete failed", false);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="uploads-page">
      {/* ── Header ── */}
      <div className="admin-header">
        <div>
          <h2>My Files</h2>
          <p className="subtitle">All files you&apos;ve uploaded — download or delete anytime.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchUploads}>
          ↺ Refresh
        </button>
      </div>

      {/* ── Error ── */}
      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="uploads-loading">
          {[1, 2, 3].map((i) => (
            <div key={i} className="uploads-skeleton-row" />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && uploads.length === 0 && !error && (
        <div className="uploads-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p>No files yet.</p>
          <a href="/upload" className="btn btn-primary" style={{ width: "auto", padding: "8px 20px", textDecoration: "none" }}>
            Upload your first file
          </a>
        </div>
      )}

      {/* ── Table ── */}
      {!loading && uploads.length > 0 && (
        <div className="uploads-table-wrap">
          <table className="admin-table uploads-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Type</th>
                <th>Size</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((u) => (
                <tr key={u.id}>
                  {/* File name + icon */}
                  <td>
                    <div className="uploads-filename-cell">
                      <FileTypeIcon mime={u.mime_type} />
                      <span className="admin-filename" title={u.original_filename}>
                        {u.original_filename}
                      </span>
                    </div>
                  </td>

                  {/* MIME type badge */}
                  <td>
                    <span className="admin-type-badge">{mimeLabel(u.mime_type)}</span>
                  </td>

                  {/* Size */}
                  <td className="admin-ts">{fmtBytes(u.size_bytes)}</td>

                  {/* Status */}
                  <td><StatusBadge status={u.status} /></td>

                  {/* Date */}
                  <td className="admin-ts">{fmtDate(u.created_at)}</td>

                  {/* Actions */}
                  <td>
                    <div className="uploads-actions">
                      {u.status === "PROCESSED" && (
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={downloadingId === u.id}
                          onClick={() => handleDownload(u)}
                          title="Download processed file"
                        >
                          {downloadingId === u.id ? "…" : (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" aria-hidden="true" style={{ marginRight: 4 }}>
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                              Download
                            </>
                          )}
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm uploads-delete-btn"
                        onClick={() => setDeleteTarget(u)}
                        title="Delete file"
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
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <DeleteModal
          filename={deleteTarget.original_filename}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`uploads-toast${toast.ok ? " ok" : " err"}`}>
          {toast.ok ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
