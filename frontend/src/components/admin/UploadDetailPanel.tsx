import { AdminUpload, AdminUploadDetail } from "@/types/admin";
import { fmtBytes, fmtDate } from "@/lib/formatters";
import { StatusBadge } from "@/components/StatusBadge";

interface UploadDetailPanelProps {
  upload: AdminUploadDetail | null;
  rawUrl: string | null;
  processedUrl: string | null;
  loading: boolean;
  onClose: () => void;
  onDelete: (upload: AdminUpload) => void;
}

export function UploadDetailPanel({
  upload,
  rawUrl,
  processedUrl,
  loading,
  onClose,
  onDelete,
}: UploadDetailPanelProps) {
  if (!upload && !loading) return null;

  return (
    <div className="detail-backdrop" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="detail-header">
          <span className="detail-title">Upload Detail</span>
          <button className="detail-close" onClick={onClose} aria-label="Close">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="18"
              height="18"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

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
                <span className="detail-label">Uploader</span>
                <span className="detail-val">
                  {upload.user_email ?? upload.email}
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
                  <StatusBadge status={upload.status} />
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
                  <span className="detail-val red">{upload.error_message}</span>
                </div>
              )}
            </div>

            {/* Image previews */}
            {rawUrl && upload.mime_type.startsWith("image/") && (
              <div className="detail-preview-section">
                <div className="detail-preview-label">Raw file preview</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={rawUrl} alt="raw preview" className="detail-img-preview" />
              </div>
            )}
            {processedUrl && upload.mime_type.startsWith("image/") && (
              <div className="detail-preview-section">
                <div className="detail-preview-label">Processed file preview</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={processedUrl}
                  alt="processed preview"
                  className="detail-img-preview"
                />
              </div>
            )}

            {/* Video preview */}
            {processedUrl && upload.mime_type.startsWith("video/") && (
              <div className="detail-preview-section">
                <div className="detail-preview-label">Processed video</div>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  src={processedUrl}
                  controls
                  className="detail-video-preview"
                />
              </div>
            )}

            {/* Actions */}
            <div className="detail-actions">
              {rawUrl && (
                <a
                  href={rawUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost btn-sm"
                >
                  ↓ Raw file
                </a>
              )}
              {processedUrl && (
                <a
                  href={processedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost btn-sm"
                >
                  ↓ Processed file
                </a>
              )}
              <button
                className="btn btn-danger btn-sm"
                style={{ marginLeft: "auto" }}
                onClick={() => {
                  onDelete(upload as unknown as AdminUpload);
                  onClose();
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
