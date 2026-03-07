"use client";

interface UserUpload {
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

interface UserFileDetailPanelProps {
  upload: UserUpload | null;
  previewUrl: string | null;
  loading: boolean;
  onClose: () => void;
  onDownload: (upload: UserUpload) => void;
  downloadingId: string | null;
}

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

export function UserFileDetailPanel({
  upload,
  previewUrl,
  loading,
  onClose,
  onDownload,
  downloadingId,
}: UserFileDetailPanelProps) {
  if (!upload && !loading) return null;

  const isImage = upload?.mime_type.startsWith("image/");
  const isVideo = upload?.mime_type.startsWith("video/");
  const isPdf   = upload?.mime_type === "application/pdf";

  return (
    <div className="detail-backdrop" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="detail-header">
          <span className="detail-title">File Detail</span>
          <button className="detail-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        {loading ? (
          <div className="detail-loading">Loading…</div>
        ) : upload ? (
          <div className="detail-body">

            {/* Meta grid */}
            <div className="detail-meta">
              <div className="detail-row">
                <span className="detail-label">File</span>
                <span className="detail-val" title={upload.original_filename}>
                  {upload.original_filename}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Type</span>
                <span className="detail-val">
                  <span className="admin-type-badge">{upload.mime_type}</span>
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Size</span>
                <span className="detail-val">{fmtBytes(upload.size_bytes)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-val">
                  <span className={`status-badge badge-${upload.status.toLowerCase()}`}>
                    {upload.status}
                  </span>
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Uploaded</span>
                <span className="detail-val">{fmtDate(upload.created_at)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Updated</span>
                <span className="detail-val">{fmtDate(upload.updated_at)}</span>
              </div>
              {upload.error_message && (
                <div className="detail-row detail-error-row">
                  <span className="detail-label">Error</span>
                  <span className="detail-val" style={{ color: "#fca5a5" }}>
                    {upload.error_message}
                  </span>
                </div>
              )}
            </div>

            {/* ── Image preview ── */}
            {previewUrl && isImage && (
              <div className="detail-preview-section">
                <div className="detail-preview-label">Processed preview</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="processed preview" className="detail-img-preview" />
              </div>
            )}

            {/* ── Video preview ── */}
            {previewUrl && isVideo && (
              <div className="detail-preview-section">
                <div className="detail-preview-label">Processed video</div>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video src={previewUrl} controls className="detail-video-preview" />
              </div>
            )}

            {/* ── PDF notice ── */}
            {isPdf && upload.status === "PROCESSED" && (
              <div className="detail-preview-section">
                <div className="detail-preview-label">PDF file</div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                  Download the file to view it in your PDF reader.
                </p>
              </div>
            )}

            {/* ── Not processed yet ── */}
            {!previewUrl && upload.status !== "PROCESSED" && (
              <div className="detail-preview-section">
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                  Preview is available once the file has been processed.
                </p>
              </div>
            )}

            {/* ── Actions ── */}
            <div className="detail-actions">
              {upload.status === "PROCESSED" && (
                <button
                  className="btn btn-primary btn-sm"
                  disabled={downloadingId === upload.id}
                  onClick={() => onDownload(upload)}
                >
                  {downloadingId === upload.id ? "Downloading…" : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round" width="13" height="13"
                        style={{ marginRight: 4 }} aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
}
